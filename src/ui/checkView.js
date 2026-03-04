import {
  formatDateOnly,
  formatDateTime,
  formatDuration,
  toTimestamp,
} from "../shared/dateTime.js";

function isSameLocalDay(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function formatMinutesToLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function buildDayOverview(entries, activeEntry) {
  const now = new Date();
  const todayEntries = entries.filter((entry) =>
    isSameLocalDay(new Date(entry.checkInAt), now)
  );

  const sessionCount = todayEntries.length;
  const durationMinutes = todayEntries.map((entry) => {
    const start = toTimestamp(entry.checkInAt);
    const end = entry.checkOutAt ? toTimestamp(entry.checkOutAt) : now.getTime();
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

  if (activeEntry && isSameLocalDay(new Date(activeEntry.checkInAt), now)) {
    insight = "You’re currently checked in.";
    insightState = "active";
  }

  return {
    dateLabel: `Today · ${now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`,
    totalLabel: formatMinutesToLabel(totalMinutes),
    sessionsLabel: String(sessionCount),
    averageLabel: averageMinutes === null ? "--" : formatMinutesToLabel(averageMinutes),
    insight,
    insightState,
    isEmpty: sessionCount === 0,
  };
}

// History is rendered as cards (not table rows) to optimize readability and touch targets on iPhone widths.
function buildHistoryRow(entry) {
  return `
      <article class="session-card" role="listitem">
        <div class="session-row">
          <span class="session-label">Date</span>
          <span class="session-value">${formatDateOnly(entry.checkInAt)}</span>
        </div>
        <div class="session-row">
          <span class="session-label">Check In</span>
          <span class="session-value">${formatDateTime(entry.checkInAt)}</span>
        </div>
        <div class="session-row">
          <span class="session-label">Check Out</span>
          <span class="session-value">${formatDateTime(entry.checkOutAt)}</span>
        </div>
        <div class="session-row">
          <span class="session-label">Duration</span>
          <span class="session-value session-duration">${formatDuration(entry.checkInAt, entry.checkOutAt)}</span>
        </div>
        <div class="session-actions">
          <button
            class="btn btn-secondary btn-inline-edit"
            type="button"
            data-entry-id="${entry.id}"
          >
            Edit time
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

export function renderTrackerState(refs, state) {
  const isActive = Boolean(state.activeEntry);
  const dayOverview = buildDayOverview(state.entries, state.activeEntry);

  refs.statusLabel.textContent = isActive ? "Checked In" : "Checked Out";
  refs.statusLabel.classList.toggle("active", isActive);
  refs.statusLabel.classList.toggle("inactive", !isActive);

  refs.statusMeta.textContent = isActive
    ? `Started at: ${formatDateTime(state.activeEntry.checkInAt)}`
    : "No active session.";

  refs.editActiveButton.disabled = !isActive;
  refs.editActiveButton.dataset.entryId = isActive ? state.activeEntry.id : "";

  refs.dayOverviewDate.textContent = dayOverview.dateLabel;
  refs.dayOverviewTotal.textContent = dayOverview.totalLabel;
  refs.dayOverviewSessions.textContent = dayOverview.sessionsLabel;
  refs.dayOverviewAverage.textContent = dayOverview.averageLabel;
  refs.dayOverviewInsight.textContent = dayOverview.insight;
  refs.dayOverviewInsight.classList.toggle("day-overview__insight--active", dayOverview.insightState === "active");
  refs.dayOverviewInsight.classList.toggle("day-overview__insight--empty", dayOverview.isEmpty);

  refs.message.textContent = state.message;

  refs.checkInButton.disabled = isActive;
  refs.checkOutButton.disabled = !isActive;

  renderHistory(refs.historyBody, state.entries);
}
