import {
  formatDateOnly,
  formatDateTime,
  formatDuration,
} from "../shared/dateTime.js";

function buildHistoryRow(entry) {
  return `
      <tr>
        <td>${formatDateOnly(entry.checkInAt)}</td>
        <td>${formatDateTime(entry.checkInAt)}</td>
        <td>${formatDateTime(entry.checkOutAt)}</td>
        <td>${formatDuration(entry.checkInAt, entry.checkOutAt)}</td>
        <td>
          <button
            class="btn btn-secondary btn-inline-edit"
            type="button"
            data-entry-id="${entry.id}"
          >
            Edit time
          </button>
        </td>
      </tr>
    `;
}

function renderHistory(historyBody, entries) {
  if (entries.length === 0) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="5">No sessions yet.</td>
      </tr>
    `;
    return;
  }

  historyBody.innerHTML = entries.map(buildHistoryRow).join("");
}

export function renderTrackerState(refs, state) {
  const isActive = Boolean(state.activeEntry);

  refs.statusLabel.textContent = isActive ? "Checked In" : "Checked Out";
  refs.statusLabel.classList.toggle("active", isActive);
  refs.statusLabel.classList.toggle("inactive", !isActive);

  refs.statusMeta.textContent = isActive
    ? `Started at: ${formatDateTime(state.activeEntry.checkInAt)}`
    : "No active session.";

  refs.editActiveButton.disabled = !isActive;
  refs.editActiveButton.dataset.entryId = isActive ? state.activeEntry.id : "";

  refs.message.textContent = state.message;

  refs.checkInButton.disabled = isActive;
  refs.checkOutButton.disabled = !isActive;

  renderHistory(refs.historyBody, state.entries);
}
