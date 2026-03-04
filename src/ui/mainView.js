export function buildMainView(rootElement) {
  // Static shell markup; dynamic values are injected by checkView renderer.
  rootElement.innerHTML = `
    <section class="panel" aria-labelledby="app-title">
      <h1 id="app-title">Work Hours Tracker</h1>
      <p class="subtitle">Track check-in/check-out timestamps locally in your browser.</p>
    </section>

    <section class="panel" aria-labelledby="status-title">
      <h2 id="status-title">Current Status</h2>
      <div id="status-label" class="status-label inactive">Checked Out</div>
      <p id="status-meta" class="status-meta">No active session.</p>
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
            </tr>
          </thead>
          <tbody id="history-body"></tbody>
        </table>
      </div>
    </section>
  `;

  // Expose elements required by app event binding and re-rendering.
  return {
    statusLabel: rootElement.querySelector("#status-label"),
    statusMeta: rootElement.querySelector("#status-meta"),
    message: rootElement.querySelector("#message"),
    checkInButton: rootElement.querySelector("#check-in-btn"),
    checkOutButton: rootElement.querySelector("#check-out-btn"),
    historyBody: rootElement.querySelector("#history-body"),
  };
}
