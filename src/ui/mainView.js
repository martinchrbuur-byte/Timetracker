const VIEW_SELECTORS = {
  trackerPanel: "#tracker-panel",
  landingPanel: "#landing-panel",
  landingCreateAccountButton: "#landing-create-account-btn",
  landingSignInButton: "#landing-signin-btn",
  authPanel: "#auth-panel",
  authFormTitle: "#auth-form-title",
  authFormSubtitle: "#auth-form-subtitle",
  authEmailInput: "#auth-email",
  authPasswordInput: "#auth-password",
  authConfirmPasswordInput: "#auth-confirm-password",
  authValidationMessage: "#auth-validation-message",
  authPasswordRules: "#auth-password-rules",
  authLoadingLabel: "#auth-loading-label",
  authSignInButton: "#auth-signin-btn",
  authSignUpButton: "#auth-signup-btn",
  authBackToLandingButton: "#auth-back-to-landing-btn",
  authSignOutButton: "#auth-signout-btn",
  quickSignOutButton: "#quick-signout-btn",
  accountSettingsButton: "#account-settings-btn",
  authStatus: "#auth-status",
  confirmationPanel: "#confirmation-panel",
  confirmationContinueButton: "#confirmation-continue-btn",
  confirmationBackToLandingButton: "#confirmation-back-btn",
  confirmationTitle: "#confirmation-title",
  confirmationMessage: "#confirmation-message",
  statusPanel: "#status-panel",
  dayOverviewPanel: "#day-overview-panel",
  historyPanel: "#history-panel",
  statusLabel: "#status-label",
  statusMeta: "#status-meta",
  syncStatus: "#sync-status",
  themeToggleButton: "#theme-toggle-btn",
  editActiveButton: "#edit-active-btn",
  dayOverviewTitle: "#day-overview-title",
  dayOverviewDate: "#day-overview-date",
  dayOverviewTodayButton: "#day-overview-today-btn",
  dayOverviewHistoricButton: "#day-overview-historic-btn",
  dayOverviewHistoricDate: "#day-overview-historic-date",
  dayOverviewHistoricTools: "#day-overview-historic-tools",
  dayOverviewRangeGroup: "#day-overview-range-group",
  dayOverviewRangeWeekButton: "#day-overview-range-week",
  dayOverviewRangeMonthButton: "#day-overview-range-month",
  dayOverviewRangeYearButton: "#day-overview-range-year",
  dayOverviewPeriodLabel: "#day-overview-period-label",
  dayOverviewCopyButton: "#day-overview-copy-btn",
  dayOverviewRows: "#day-overview-rows",
  dayOverviewAnalytics: "#day-overview-analytics",
  dayOverviewAnalyticsTotal: "#day-overview-analytics-total",
  dayOverviewAnalyticsActiveDays: "#day-overview-analytics-active-days",
  dayOverviewAnalyticsAverage: "#day-overview-analytics-average",
  dayOverviewAnalyticsTrend: "#day-overview-analytics-trend",
  dayOverviewAnalyticsPeak: "#day-overview-analytics-peak",
  dayOverviewAnalyticsRows: "#day-overview-analytics-rows",
  dayOverviewTotal: "#day-overview-total",
  dayOverviewTotalLabel: "#day-overview-total-label",
  dayOverviewSessions: "#day-overview-sessions",
  dayOverviewAverage: "#day-overview-average",
  dayOverviewInsight: "#day-overview-insight",
  message: "#message",
  checkInButton: "#check-in-btn",
  checkOutButton: "#check-out-btn",
  historyBody: "#history-body",
  editSheet: "#edit-sheet",
  editSheetBackdrop: "#edit-sheet-backdrop",
  editEntryIdInput: "#edit-entry-id",
  editCheckInInput: "#edit-check-in",
  editCheckOutInput: "#edit-check-out",
  editDeleteButton: "#edit-delete-btn",
  editCancelButton: "#edit-cancel-btn",
  editSaveButton: "#edit-save-btn",
  passwordSheet: "#password-sheet",
  passwordSheetBackdrop: "#password-sheet-backdrop",
  passwordCurrentInput: "#password-current",
  passwordNewInput: "#password-new",
  passwordConfirmInput: "#password-confirm",
  passwordCancelButton: "#password-cancel-btn",
  passwordSaveButton: "#password-save-btn",
};

function queryViewRefs(rootElement) {
  return Object.fromEntries(
    Object.entries(VIEW_SELECTORS).map(([key, selector]) => [key, rootElement.querySelector(selector)])
  );
}

export function buildMainView(rootElement) {
  // This file only owns static structure and element lookup.
  // Dynamic values are injected by checkView.
  rootElement.innerHTML = `
    <section id="tracker-panel" class="panel" aria-labelledby="app-title">
      <h1 id="app-title">Work Hours Tracker</h1>
      <p class="subtitle">Track check-in/check-out timestamps locally in your browser.</p>
    </section>

    <section id="landing-panel" class="panel" aria-labelledby="landing-title">
      <h2 id="landing-title">Welcome</h2>
      <p class="subtitle">Create an account to sync your tracked sessions across devices.</p>
      <div class="actions actions--auth">
        <button id="landing-create-account-btn" class="btn btn-primary" type="button">
          Create account
        </button>
        <button id="landing-signin-btn" class="btn btn-secondary" type="button">
          I already have an account
        </button>
      </div>
    </section>

    <section id="auth-panel" class="panel" aria-labelledby="auth-form-title">
      <h2 id="auth-form-title">Create account</h2>
      <p id="auth-form-subtitle" class="subtitle">Use a valid email and a strong password.</p>
      <label class="field-label" for="auth-email">Email</label>
      <input id="auth-email" class="field-input" type="email" autocomplete="email" />

      <label class="field-label" for="auth-password">Password</label>
      <input id="auth-password" class="field-input" type="password" autocomplete="new-password" />

      <label class="field-label" for="auth-confirm-password">Confirm password</label>
      <input
        id="auth-confirm-password"
        class="field-input"
        type="password"
        autocomplete="new-password"
      />

      <p id="auth-password-rules" class="field-help">
        Minimum 8 characters, including at least one letter and one number.
      </p>
      <p id="auth-validation-message" class="status-meta" role="alert" aria-live="assertive"></p>
      <p id="auth-loading-label" class="status-meta" role="status" aria-live="polite"></p>

      <div class="actions actions--auth">
        <button id="auth-signin-btn" class="btn btn-primary" type="button">Sign In</button>
        <button id="auth-signup-btn" class="btn btn-primary" type="button">Sign Up</button>
        <button id="auth-back-to-landing-btn" class="btn btn-secondary" type="button">Back</button>
        <button id="auth-signout-btn" class="btn btn-secondary" type="button">Sign Out</button>
      </div>

      <p id="auth-status" class="status-meta" role="status" aria-live="polite">Signed out.</p>
    </section>

    <section id="confirmation-panel" class="panel" aria-labelledby="confirmation-title">
      <h2 id="confirmation-title">Check your email</h2>
      <p id="confirmation-message" class="subtitle">
        We sent a confirmation link. After verifying your email, continue to sign in.
      </p>
      <div class="actions actions--auth">
        <button id="confirmation-continue-btn" class="btn btn-primary" type="button">Continue to sign in</button>
        <button id="confirmation-back-btn" class="btn btn-secondary" type="button">Back to landing</button>
      </div>
    </section>

    <section id="status-panel" class="panel" aria-labelledby="status-title">
      <div class="status-panel__header">
        <h2 id="status-title">Current Status</h2>
        <div class="status-panel__actions">
          <button id="theme-toggle-btn" class="btn btn-secondary btn-compact" type="button" aria-pressed="false">
            Dark mode
          </button>
          <p id="sync-status" class="sync-status" role="status" aria-live="polite">Synced</p>
          <button id="account-settings-btn" class="btn btn-secondary btn-compact" type="button">Account</button>
          <button id="quick-signout-btn" class="btn btn-secondary btn-compact" type="button">Sign Out</button>
        </div>
      </div>
      <div id="status-label" class="status-label inactive">Checked Out</div>
      <p id="status-meta" class="status-meta">No active session.</p>
      <button id="edit-active-btn" class="btn btn-secondary" type="button">Edit time</button>
      <p id="message" class="message" role="status" aria-live="polite">Ready.</p>

      <div class="actions">
        <button id="check-in-btn" class="btn btn-primary" type="button">Check In</button>
        <button id="check-out-btn" class="btn btn-secondary" type="button">Check Out</button>
      </div>
    </section>

    <section id="day-overview-panel" class="panel day-overview" aria-labelledby="day-overview-title">
      <div class="day-overview__header">
        <h2 id="day-overview-title">Day Overview</h2>
        <div class="day-overview__mode" role="tablist" aria-label="Day overview mode">
          <button
            id="day-overview-today-btn"
            class="overview-tab is-active"
            type="button"
            role="tab"
            aria-selected="true"
          >
            Today
          </button>
          <button
            id="day-overview-historic-btn"
            class="overview-tab"
            type="button"
            role="tab"
            aria-selected="false"
          >
            Historic
          </button>
        </div>
      </div>

      <div class="day-overview__filters">
        <span id="day-overview-date" class="day-overview__date">Today</span>
        <label class="day-overview__date-wrap" for="day-overview-historic-date">
          <span class="sr-only">Select historic date</span>
          <input id="day-overview-historic-date" class="day-overview__date-input" type="date" />
        </label>
      </div>

      <div class="day-overview__total">
        <p id="day-overview-total" class="day-overview__total-value">0h 0m</p>
        <p id="day-overview-total-label" class="day-overview__total-label">Total worked today</p>
      </div>

      <div class="day-overview__metrics">
        <article class="metric-card" aria-label="Session count">
          <p id="day-overview-sessions" class="metric-value">0</p>
          <p class="metric-label">Sessions</p>
        </article>
        <article class="metric-card" aria-label="Average session duration">
          <p id="day-overview-average" class="metric-value">--</p>
          <p class="metric-label">Avg Session</p>
        </article>
      </div>

      <div id="day-overview-historic-tools" class="day-overview__historic-tools" hidden>
        <div id="day-overview-range-group" class="day-overview__mode" role="tablist" aria-label="Historic overview range">
          <button
            id="day-overview-range-week"
            class="overview-tab is-active"
            type="button"
            role="tab"
            aria-selected="true"
            data-range="week"
          >
            Week
          </button>
          <button
            id="day-overview-range-month"
            class="overview-tab"
            type="button"
            role="tab"
            aria-selected="false"
            data-range="month"
          >
            Month
          </button>
          <button
            id="day-overview-range-year"
            class="overview-tab"
            type="button"
            role="tab"
            aria-selected="false"
            data-range="year"
          >
            Year
          </button>
        </div>

        <div class="day-overview__period">
          <div class="day-overview__period-header">
            <p id="day-overview-period-label" class="day-overview__period-label">Period overview</p>
            <button id="day-overview-copy-btn" class="btn btn-secondary btn-compact" type="button">
              Copy
            </button>
          </div>
          <div id="day-overview-rows" class="day-overview__rows" role="list" aria-label="Historic start and end times"></div>
        </div>

        <div id="day-overview-analytics" class="day-overview__analytics" hidden>
          <p class="day-overview__analytics-title">Trend analytics</p>
          <div class="day-overview__analytics-metrics">
            <article class="metric-card" aria-label="Total worked in selected range">
              <p id="day-overview-analytics-total" class="metric-value">0h 0m</p>
              <p class="metric-label">Total</p>
            </article>
            <article class="metric-card" aria-label="Days with tracked work">
              <p id="day-overview-analytics-active-days" class="metric-value">0</p>
              <p class="metric-label">Active Days</p>
            </article>
            <article class="metric-card" aria-label="Average worked time for active days">
              <p id="day-overview-analytics-average" class="metric-value">0h 0m</p>
              <p class="metric-label">Avg Active Day</p>
            </article>
            <article class="metric-card" aria-label="Trend direction across selected range">
              <p id="day-overview-analytics-trend" class="metric-value">Stable</p>
              <p class="metric-label">Trend</p>
            </article>
          </div>

          <div class="day-overview__analytics-peak">
            <p id="day-overview-analytics-peak" class="day-overview__period-label">Peak day --</p>
          </div>

          <div id="day-overview-analytics-rows" class="day-overview__analytics-rows" role="list" aria-label="Daily work trend"></div>
        </div>
      </div>

      <p id="day-overview-insight" class="day-overview__insight">No sessions logged today yet.</p>
    </section>

    <section id="history-panel" class="panel" aria-labelledby="history-title">
      <h2 id="history-title">Recent Sessions</h2>
      <div
        id="history-body"
        class="session-list"
        role="list"
        aria-label="Recent work sessions"
      ></div>
    </section>

    <div id="edit-sheet" class="edit-sheet" hidden>
      <div id="edit-sheet-backdrop" class="edit-sheet-backdrop" aria-hidden="true"></div>
      <section
        class="edit-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-sheet-title"
      >
        <h2 id="edit-sheet-title">Edit Session</h2>
        <input id="edit-entry-id" type="hidden" />

        <label class="field-label" for="edit-check-in">Check In</label>
        <input id="edit-check-in" class="field-input" type="datetime-local" />

        <label class="field-label" for="edit-check-out">Check Out</label>
        <input id="edit-check-out" class="field-input" type="datetime-local" />

        <p class="field-help">Leave check-out empty to keep session active.</p>

        <div class="sheet-actions">
          <button id="edit-delete-btn" class="btn btn-secondary" type="button">Delete</button>
          <button id="edit-cancel-btn" class="btn btn-secondary" type="button">Cancel</button>
          <button id="edit-save-btn" class="btn btn-primary" type="button">Save</button>
        </div>
      </section>
    </div>

    <div id="password-sheet" class="edit-sheet" hidden>
      <div id="password-sheet-backdrop" class="edit-sheet-backdrop" aria-hidden="true"></div>
      <section
        class="edit-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-sheet-title"
      >
        <h2 id="password-sheet-title">Change Password</h2>

        <label class="field-label" for="password-current">Current Password</label>
        <input
          id="password-current"
          class="field-input"
          type="password"
          autocomplete="current-password"
        />

        <label class="field-label" for="password-new">New Password</label>
        <input
          id="password-new"
          class="field-input"
          type="password"
          autocomplete="new-password"
        />

        <label class="field-label" for="password-confirm">Confirm New Password</label>
        <input
          id="password-confirm"
          class="field-input"
          type="password"
          autocomplete="new-password"
        />

        <p class="field-help">Use at least 8 characters with at least one letter and one number.</p>

        <div class="sheet-actions sheet-actions--two">
          <button id="password-cancel-btn" class="btn btn-secondary" type="button">Cancel</button>
          <button id="password-save-btn" class="btn btn-primary" type="button">Save Password</button>
        </div>
      </section>
    </div>
  `;

  return queryViewRefs(rootElement);
}
