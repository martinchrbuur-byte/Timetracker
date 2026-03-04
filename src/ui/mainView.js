const VIEW_SELECTORS = {
  userSelect: "#user-select",
  statusLabel: "#status-label",
  statusMeta: "#status-meta",
  editActiveButton: "#edit-active-btn",
  dayOverviewDate: "#day-overview-date",
  dayOverviewTodayButton: "#day-overview-today-btn",
  dayOverviewHistoricButton: "#day-overview-historic-btn",
  dayOverviewHistoricDate: "#day-overview-historic-date",
  dayOverviewHistoricTools: "#day-overview-historic-tools",
  dayOverviewRangeGroup: "#day-overview-range-group",
  dayOverviewRangeWeekButton: "#day-overview-range-week",
  dayOverviewRangeMonthButton: "#day-overview-range-month",
  dayOverviewRangeYearButton: "#day-overview-range-year",
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
  editCancelButton: "#edit-cancel-btn",
  editSaveButton: "#edit-save-btn",
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
    <section class="panel" aria-labelledby="app-title">
      <h1 id="app-title">Work Hours Tracker</h1>
      <p class="subtitle">Track check-in/check-out timestamps locally in your browser.</p>
      <div class="user-toolbar">
        <label class="user-toolbar__label" for="user-select">User</label>
        <div class="user-toolbar__actions">
          <select id="user-select" class="user-select" aria-label="Select user"></select>
        </div>
      </div>
    </section>

    <section class="panel" aria-labelledby="status-title">
      <h2 id="status-title">Current Status</h2>
      <div id="status-label" class="status-label inactive">Checked Out</div>
      <p id="status-meta" class="status-meta">No active session.</p>
      <button id="edit-active-btn" class="btn btn-secondary" type="button">Edit time</button>
      <p id="message" class="message" role="status" aria-live="polite">Ready.</p>

      <div class="actions">
        <button id="check-in-btn" class="btn btn-primary" type="button">Check In</button>
        <button id="check-out-btn" class="btn btn-secondary" type="button">Check Out</button>
      </div>
    </section>

    <section class="panel day-overview" aria-labelledby="day-overview-title">
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
      </div>

      <p id="day-overview-insight" class="day-overview__insight">No sessions logged today yet.</p>
    </section>

    <section class="panel" aria-labelledby="history-title">
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
          <button id="edit-cancel-btn" class="btn btn-secondary" type="button">Cancel</button>
          <button id="edit-save-btn" class="btn btn-primary" type="button">Save</button>
        </div>
      </section>
    </div>
  `;

  return queryViewRefs(rootElement);
}
