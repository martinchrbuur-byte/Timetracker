function formatDateTime(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  return date.toLocaleString();
}

// Formats a date-only cell for quick scanning in history.
function formatDateOnly(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  return date.toLocaleDateString();
}

// Computes duration for completed sessions.
function getDurationLabel(checkInAt, checkOutAt) {
  if (!checkInAt || !checkOutAt) {
    return "In progress";
  }

  const diffMs = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) {
    return "--";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

// Renders history rows in descending check-in order.
function renderHistory(historyBody, entries) {
  if (entries.length === 0) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="4">No sessions yet.</td>
      </tr>
    `;
    return;
  }

  historyBody.innerHTML = entries
    .map(
      (entry) => `
      <tr>
        <td>${formatDateOnly(entry.checkInAt)}</td>
        <td>${formatDateTime(entry.checkInAt)}</td>
        <td>${formatDateTime(entry.checkOutAt)}</td>
        <td>${getDurationLabel(entry.checkInAt, entry.checkOutAt)}</td>
      </tr>
    `
    )
    .join("");
}

// Updates all dynamic UI parts from a single state object.
export function renderTrackerState(refs, state) {
  const isActive = Boolean(state.activeEntry);

  refs.statusLabel.textContent = isActive ? "Checked In" : "Checked Out";
  refs.statusLabel.classList.toggle("active", isActive);
  refs.statusLabel.classList.toggle("inactive", !isActive);

  refs.statusMeta.textContent = isActive
    ? `Started at: ${formatDateTime(state.activeEntry.checkInAt)}`
    : "No active session.";

  refs.message.textContent = state.message;

  refs.checkInButton.disabled = isActive;
  refs.checkOutButton.disabled = !isActive;

  renderHistory(refs.historyBody, state.entries);
}
