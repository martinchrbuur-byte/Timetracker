const VIEW_SELECTORS = {
  statusLabel: "#status-label",
  statusMeta: "#status-meta",
  editActiveButton: "#edit-active-btn",
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

    <section class="panel" aria-labelledby="history-title">
      <h2 id="history-title">Recent Sessions</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Check In</th>
              <th scope="col">Check Out</th>
              <th scope="col">Duration</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody id="history-body"></tbody>
        </table>
      </div>
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
