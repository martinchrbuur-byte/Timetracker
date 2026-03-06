import {
  formatDateOnly,
  formatDateTime,
  formatDuration,
  formatTimeOnly,
  getRangeBounds,
  isSameLocalDay,
  parseLocalDateKey,
  toTimestamp,
} from "../shared/dateTime.js";

function formatMinutesToLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatTrendLabel(trend) {
  if (!trend) {
    return "Stable";
  }

  const directionLabel =
    trend.direction === "increasing"
      ? "Increasing"
      : trend.direction === "decreasing"
        ? "Decreasing"
        : "Stable";

  const deltaLabel = formatMinutesToLabel(Math.abs(trend.deltaMinutes || 0));
  if (!trend.deltaMinutes) {
    return directionLabel;
  }

  const sign = trend.deltaMinutes > 0 ? "+" : "-";
  return `${directionLabel} (${sign}${deltaLabel})`;
}

function getSyncStatusPresentation(syncStatus) {
  const pendingCount = syncStatus?.pendingCount || 0;
  const state = syncStatus?.state || "idle";

  if (state === "syncing") {
    return {
      label: pendingCount > 0 ? `Syncing ${pendingCount}` : "Syncing",
      className: "sync-status--syncing",
    };
  }

  if (state === "offline-pending") {
    return {
      label: `Pending ${pendingCount}`,
      className: "sync-status--pending",
    };
  }

  if (state === "sync-error") {
    return {
      label: "Sync error",
      className: "sync-status--error",
    };
  }

  if (state === "offline") {
    return {
      label: "Offline",
      className: "sync-status--offline",
    };
  }

  return {
    label: "Synced",
    className: "sync-status--online",
  };
}

function buildDayOverview(entries, activeEntry, mode, dayOverviewDateISO, dayOverviewHistoricRange) {
  const now = new Date();
  const targetDate = mode === "historic" ? parseLocalDateKey(dayOverviewDateISO) || now : now;
  const range = mode === "historic" ? dayOverviewHistoricRange : "day";
  const rangeBounds = mode === "historic" ? getRangeBounds(dayOverviewDateISO, range) : null;

  const dayEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.checkInAt);
    if (mode === "today") {
      return isSameLocalDay(entryDate, targetDate);
    }

    if (!rangeBounds) {
      return false;
    }

    return entryDate >= rangeBounds.start && entryDate <= rangeBounds.end;
  });

  const sessionCount = dayEntries.length;
  const durationMinutes = dayEntries.map((entry) => {
    const start = toTimestamp(entry.checkInAt);
    const end = entry.checkOutAt
      ? toTimestamp(entry.checkOutAt)
      : isSameLocalDay(targetDate, now)
        ? now.getTime()
        : start;
    const diff = Math.max(0, Math.floor((end - start) / 60000));
    return Number.isFinite(diff) ? diff : 0;
  });

  const totalMinutes = durationMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const averageMinutes = sessionCount > 0 ? Math.floor(totalMinutes / sessionCount) : null;
  const longestMinutes = durationMinutes.length > 0 ? Math.max(...durationMinutes) : null;

  let insight = "No sessions logged today yet.";
  let insightState = "idle";

  if (sessionCount > 0) {
    insight = `Longest session: ${formatMinutesToLabel(longestMinutes)}`;
  }

  if (activeEntry && mode === "today" && isSameLocalDay(new Date(activeEntry.checkInAt), now)) {
    insight = "You’re currently checked in.";
    insightState = "active";
  }

  const isTodayMode = mode === "today";
  const totalWorkedLabel = isTodayMode
    ? "Total worked today"
    : range === "year"
      ? "Total worked this year"
      : range === "month"
        ? "Total worked this month"
        : "Total worked this week";

  const historicLabel =
    range === "year"
      ? `${targetDate.getFullYear()}`
      : range === "month"
        ? targetDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })
        : `${(rangeBounds?.start || targetDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })} - ${(rangeBounds?.end || targetDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}`;

  const dateLabel = isTodayMode
    ? `Today · ${now.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`
    : historicLabel;

  return {
    dateLabel,
    totalWorkedLabel,
    totalLabel: formatMinutesToLabel(totalMinutes),
    sessionsLabel: String(sessionCount),
    averageLabel: averageMinutes === null ? "--" : formatMinutesToLabel(averageMinutes),
    insight,
    insightState,
    isEmpty: sessionCount === 0,
    isTodayMode,
    historicRange: range,
  };
}

// History is rendered as cards (not table rows) to optimize readability and touch targets on iPhone widths.
function buildHistoryRow(entry) {
  const canQuickAdjustCheckout = Boolean(entry.checkOutAt);

  return `
      <article class="session-card" role="listitem">
        <div class="session-row">
          <span class="session-label">Date</span>
          <span class="session-value">${formatDateOnly(entry.checkInAt)}</span>
        </div>
        <div class="session-row">
          <span class="session-label">Check In</span>
          <span class="session-value">${formatTimeOnly(entry.checkInAt)}</span>
        </div>
        <div class="session-row">
          <span class="session-label">Check Out</span>
          <span class="session-value">${formatTimeOnly(entry.checkOutAt)}</span>
        </div>
        <div class="session-row">
          <span class="session-label">Duration</span>
          <span class="session-value session-duration">${formatDuration(entry.checkInAt, entry.checkOutAt)}</span>
        </div>
        <div class="session-actions">
          <button
            class="btn btn-secondary btn-compact btn-inline-quick"
            type="button"
            data-entry-id="${entry.id}"
            data-quick-minutes="-15"
            aria-label="Subtract 15 minutes from checkout"
            ${canQuickAdjustCheckout ? "" : "disabled"}
          >
            Quick -15m
          </button>
          <button
            class="btn btn-secondary btn-compact btn-inline-quick"
            type="button"
            data-entry-id="${entry.id}"
            data-quick-minutes="15"
            aria-label="Add 15 minutes to checkout"
            ${canQuickAdjustCheckout ? "" : "disabled"}
          >
            Quick +15m
          </button>
          <button
            class="btn btn-secondary btn-inline-edit"
            type="button"
            data-edit-entry-id="${entry.id}"
          >
            Full edit
          </button>
        </div>
      </article>
    `;
}

// Keep the same historyBody container ID so app-level click delegation keeps working without controller changes.
function renderHistory(historyBody, entries) {
  if (entries.length === 0) {
    historyBody.innerHTML = `<p class="empty-history">No sessions yet.</p>`;
    return;
  }

  historyBody.innerHTML = entries.map(buildHistoryRow).join("");
}

function buildHistoricOverviewRow(row) {
  return `
    <article class="day-overview__row" role="listitem">
      <span class="day-overview__row-date">${row.dateLabel}</span>
      <span class="day-overview__row-time">${row.startLabel} - ${row.endLabel}</span>
    </article>
  `;
}

function renderHistoricOverview(refs, historicOverview, isTodayMode) {
  if (isTodayMode) {
    refs.dayOverviewRows.innerHTML = "";
    refs.dayOverviewCopyButton.disabled = true;
    refs.dayOverviewPeriodLabel.textContent = "Period overview";
    return;
  }

  const rows = historicOverview?.rows || [];
  const periodStartLabel = historicOverview?.periodStartLabel || "--";
  const periodEndLabel = historicOverview?.periodEndLabel || "--";

  refs.dayOverviewPeriodLabel.textContent = `${periodStartLabel} - ${periodEndLabel}`;

  if (rows.length === 0) {
    refs.dayOverviewRows.innerHTML = `<p class="day-overview__rows-empty">No sessions in this period.</p>`;
    refs.dayOverviewCopyButton.disabled = true;
    return;
  }

  refs.dayOverviewRows.innerHTML = rows.map(buildHistoricOverviewRow).join("");
  refs.dayOverviewCopyButton.disabled = false;
}

function buildHistoricAnalyticsRow(row) {
  return `
    <article class="day-overview__row" role="listitem">
      <span class="day-overview__row-date">${row.dateLabel}</span>
      <span class="day-overview__row-time">${formatMinutesToLabel(row.totalMinutes)}</span>
    </article>
  `;
}

function renderHistoricAnalytics(refs, historicAnalytics, isTodayMode) {
  if (isTodayMode) {
    refs.dayOverviewAnalytics.hidden = true;
    refs.dayOverviewAnalyticsRows.innerHTML = "";
    return;
  }

  refs.dayOverviewAnalytics.hidden = false;

  const rows = historicAnalytics?.rows || [];
  const totalMinutes = historicAnalytics?.totalMinutes || 0;
  const activeDays = historicAnalytics?.activeDays || 0;
  const averageMinutesPerActiveDay = historicAnalytics?.averageMinutesPerActiveDay || 0;
  const trendLabel = formatTrendLabel(historicAnalytics?.trend);
  const peakDay = historicAnalytics?.peakDay || null;

  refs.dayOverviewAnalyticsTotal.textContent = formatMinutesToLabel(totalMinutes);
  refs.dayOverviewAnalyticsActiveDays.textContent = String(activeDays);
  refs.dayOverviewAnalyticsAverage.textContent = formatMinutesToLabel(averageMinutesPerActiveDay);
  refs.dayOverviewAnalyticsTrend.textContent = trendLabel;
  refs.dayOverviewAnalyticsPeak.textContent = peakDay
    ? `Peak day ${peakDay.dateLabel} · ${formatMinutesToLabel(peakDay.totalMinutes)}`
    : "Peak day --";

  if (rows.length === 0) {
    refs.dayOverviewAnalyticsRows.innerHTML = `<p class="day-overview__rows-empty">No trend data for this period.</p>`;
    return;
  }

  refs.dayOverviewAnalyticsRows.innerHTML = rows.map(buildHistoricAnalyticsRow).join("");
}

export function renderTrackerState(refs, state) {
  const isAuthenticated = Boolean(state.isAuthenticated);
  const isDarkTheme = state.themeMode === "dark";
  const authRoute =
    state.authRoute === "signup" || state.authRoute === "signin" || state.authRoute === "confirmation"
      ? state.authRoute
      : "landing";
  const isSignUpRoute = authRoute === "signup";
  const isSignInRoute = authRoute === "signin";
  const isConfirmationRoute = authRoute === "confirmation";
  const authUi = state.authUi || {};
  const isAuthSubmitting = Boolean(authUi.isSubmitting);

  refs.trackerPanel.hidden = isAuthenticated || authRoute !== "landing";
  refs.landingPanel.hidden = isAuthenticated || authRoute !== "landing";
  refs.authPanel.hidden = isAuthenticated || (!isSignUpRoute && !isSignInRoute);
  refs.confirmationPanel.hidden = isAuthenticated || !isConfirmationRoute;

  refs.authFormTitle.textContent = isSignUpRoute ? "Create account" : "Sign in";
  refs.authFormSubtitle.textContent = isSignUpRoute
    ? "Use a valid email and a strong password."
    : "Enter your account email and password.";
  refs.authConfirmPasswordInput.hidden = !isSignUpRoute;
  refs.authConfirmPasswordInput.disabled = isAuthenticated || !isSignUpRoute || isAuthSubmitting;
  refs.authPasswordInput.setAttribute("autocomplete", isSignUpRoute ? "new-password" : "current-password");
  refs.authPasswordRules.hidden = !isSignUpRoute;
  refs.authSignInButton.hidden = isAuthenticated || !isSignInRoute;
  refs.authSignUpButton.hidden = isAuthenticated || !isSignUpRoute;
  refs.authValidationMessage.textContent = authUi.validationMessage || "";
  refs.authLoadingLabel.textContent = isAuthSubmitting
    ? authUi.loadingLabel || "Working…"
    : authUi.successMessage || "";
  refs.authLoadingLabel.hidden = !refs.authLoadingLabel.textContent;
  refs.authValidationMessage.hidden = !refs.authValidationMessage.textContent;
  refs.confirmationTitle.textContent = state.confirmationTitle || "Check your email";
  refs.confirmationMessage.textContent = state.confirmationMessage || "";

  refs.themeToggleButton.textContent = isDarkTheme ? "Light mode" : "Dark mode";
  refs.themeToggleButton.setAttribute("aria-pressed", String(isDarkTheme));
  refs.themeToggleButton.setAttribute(
    "aria-label",
    isDarkTheme ? "Switch to light mode" : "Switch to dark mode"
  );

  refs.authEmailInput.disabled = isAuthenticated || isAuthSubmitting;
  refs.authPasswordInput.disabled = isAuthenticated || isAuthSubmitting;
  refs.authSignInButton.disabled = isAuthSubmitting;
  refs.authSignUpButton.disabled = isAuthSubmitting;
  refs.authBackToLandingButton.disabled = isAuthSubmitting;
  refs.confirmationContinueButton.disabled = isAuthSubmitting;
  refs.authSignOutButton.hidden = !isAuthenticated;
  refs.quickSignOutButton.hidden = !isAuthenticated;
  refs.accountSettingsButton.hidden = !isAuthenticated;
  refs.authStatus.textContent = isAuthenticated
    ? state.message || `Signed in as ${state.authEmail || "user"}.`
    : state.message || "Signed out.";

  const syncStatus = getSyncStatusPresentation(state.syncStatus);
  refs.syncStatus.textContent = syncStatus.label;
  refs.syncStatus.classList.remove(
    "sync-status--online",
    "sync-status--syncing",
    "sync-status--pending",
    "sync-status--offline",
    "sync-status--error"
  );
  refs.syncStatus.classList.add(syncStatus.className);
  refs.syncStatus.title = state.syncStatus?.lastError || "";

  refs.statusPanel.hidden = !isAuthenticated;
  refs.dayOverviewPanel.hidden = !isAuthenticated;
  refs.historyPanel.hidden = !isAuthenticated;

  if (!isAuthenticated) {
    refs.editSheet.hidden = true;
    refs.passwordSheet.hidden = true;
    return;
  }

  const isActive = Boolean(state.activeEntry);
  const dayOverview = buildDayOverview(
    state.entries,
    state.activeEntry,
    state.dayOverviewMode,
    state.dayOverviewDateISO,
    state.dayOverviewHistoricRange
  );

  refs.statusLabel.textContent = isActive ? "Checked In" : "Checked Out";
  refs.statusLabel.classList.toggle("active", isActive);
  refs.statusLabel.classList.toggle("inactive", !isActive);

  const integrityFeedback = state.integrityFeedback || {
    level: "valid",
    label: "Integrity: Valid",
    detail: "No time conflicts detected.",
  };

  refs.integrityChip.textContent = integrityFeedback.label;
  refs.integrityDetail.textContent = integrityFeedback.detail;
  refs.integrityChip.classList.remove(
    "integrity-chip--valid",
    "integrity-chip--warning",
    "integrity-chip--blocked"
  );
  refs.integrityChip.classList.add(
    integrityFeedback.level === "blocked"
      ? "integrity-chip--blocked"
      : integrityFeedback.level === "warning"
        ? "integrity-chip--warning"
        : "integrity-chip--valid"
  );

  refs.statusMeta.textContent = isActive
    ? `Started at: ${formatDateTime(state.activeEntry.checkInAt)}`
    : "No active session.";

  refs.editActiveButton.disabled = !isActive;
  refs.editActiveButton.dataset.entryId = isActive ? state.activeEntry.id : "";

  refs.dayOverviewTitle.textContent = dayOverview.isTodayMode ? "Day overview" : "Historic overview";
  refs.dayOverviewDate.textContent = dayOverview.dateLabel;
  refs.dayOverviewTotal.textContent = dayOverview.totalLabel;
  refs.dayOverviewTotalLabel.textContent = dayOverview.totalWorkedLabel;
  refs.dayOverviewSessions.textContent = dayOverview.sessionsLabel;
  refs.dayOverviewAverage.textContent = dayOverview.averageLabel;
  refs.dayOverviewInsight.textContent = dayOverview.insight;
  refs.dayOverviewInsight.classList.toggle("day-overview__insight--active", dayOverview.insightState === "active");
  refs.dayOverviewInsight.classList.toggle("day-overview__insight--empty", dayOverview.isEmpty);

  refs.dayOverviewTodayButton.classList.toggle("is-active", dayOverview.isTodayMode);
  refs.dayOverviewHistoricButton.classList.toggle("is-active", !dayOverview.isTodayMode);
  refs.dayOverviewTodayButton.setAttribute("aria-selected", String(dayOverview.isTodayMode));
  refs.dayOverviewHistoricButton.setAttribute("aria-selected", String(!dayOverview.isTodayMode));
  refs.dayOverviewHistoricTools.hidden = dayOverview.isTodayMode;
  refs.dayOverviewRangeWeekButton.classList.toggle("is-active", dayOverview.historicRange === "week");
  refs.dayOverviewRangeMonthButton.classList.toggle("is-active", dayOverview.historicRange === "month");
  refs.dayOverviewRangeYearButton.classList.toggle("is-active", dayOverview.historicRange === "year");
  refs.dayOverviewRangeWeekButton.setAttribute("aria-selected", String(dayOverview.historicRange === "week"));
  refs.dayOverviewRangeMonthButton.setAttribute("aria-selected", String(dayOverview.historicRange === "month"));
  refs.dayOverviewRangeYearButton.setAttribute("aria-selected", String(dayOverview.historicRange === "year"));
  refs.dayOverviewHistoricDate.hidden = dayOverview.isTodayMode;
  refs.dayOverviewHistoricDate.value = state.dayOverviewDateISO;

  renderHistoricOverview(refs, state.historicOverview, dayOverview.isTodayMode);
  renderHistoricAnalytics(refs, state.historicAnalytics, dayOverview.isTodayMode);

  refs.message.textContent = state.message;

  refs.checkInButton.disabled = isActive;
  refs.checkOutButton.disabled = !isActive;

  renderHistory(refs.historyBody, state.entries);
}
