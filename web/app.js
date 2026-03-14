const statusText = document.getElementById("statusText");
const todayTotal = document.getElementById("todayTotal");
const feedbackText = document.getElementById("feedbackText");
const historyBody = document.getElementById("historyBody");

const checkInBtn = document.getElementById("checkInBtn");
const checkOutBtn = document.getElementById("checkOutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const reloadHistoryBtn = document.getElementById("reloadHistoryBtn");

const apiBase = (new URLSearchParams(window.location.search).get("apiBase") || "http://localhost:8080").replace(/\/$/, "");

function findEmailInput() {
  return (
    document.querySelector("input[type='email']") ||
    document.querySelector("input[name='email']") ||
    document.getElementById("email")
  );
}

function findExistingAccountButton() {
  const directMatch =
    document.getElementById("haveAccountBtn") ||
    document.querySelector("[data-action='existing-account']") ||
    document.querySelector("[data-action='login-existing']");

  if (directMatch) {
    return directMatch;
  }

  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((button) =>
    /already\s+have\s+an\s+account/i.test(button.textContent || "")
  );
}

function focusEmailOnLoad() {
  let emailInput = findEmailInput();

  if (!emailInput) {
    const existingAccountButton = findExistingAccountButton();
    if (existingAccountButton) {
      existingAccountButton.click();
    }
  }

  requestAnimationFrame(() => {
    emailInput = findEmailInput();
    if (!emailInput) {
      return;
    }

    emailInput.focus();
    if (typeof emailInput.setSelectionRange === "function") {
      const length = emailInput.value?.length || 0;
      emailInput.setSelectionRange(length, length);
    }
  });
}

async function apiGet(path) {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

async function apiPost(path) {
  const response = await fetch(`${apiBase}${path}`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function setFeedback(message, isSuccess) {
  feedbackText.textContent = `${isSuccess ? "OK" : "ERROR"}: ${message}`;
}

async function loadStatus() {
  const result = await apiGet("/api/status");
  statusText.textContent = result.status;
}

async function loadTodayTotal() {
  const result = await apiGet("/api/today-total");
  todayTotal.textContent = `Today total: ${result.total}`;
}

async function loadHistory() {
  const entries = await apiGet("/api/history");
  historyBody.innerHTML = "";

  if (!entries.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No entries found.";
    row.appendChild(cell);
    historyBody.appendChild(row);
    return;
  }

  for (const entry of entries) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.checkIn}</td>
      <td>${entry.checkOut}</td>
      <td>${entry.duration}</td>
    `;
    historyBody.appendChild(row);
  }
}

async function refreshAll() {
  try {
    await Promise.all([loadStatus(), loadTodayTotal(), loadHistory()]);
  } catch (error) {
    setFeedback(error.message, false);
  }
}

checkInBtn.addEventListener("click", async () => {
  try {
    const result = await apiPost("/api/check-in");
    setFeedback(result.message, result.success);
    await refreshAll();
  } catch (error) {
    setFeedback(error.message, false);
  }
});

checkOutBtn.addEventListener("click", async () => {
  try {
    const result = await apiPost("/api/check-out");
    setFeedback(result.message, result.success);
    await refreshAll();
  } catch (error) {
    setFeedback(error.message, false);
  }
});

refreshBtn.addEventListener("click", () => {
  refreshAll();
});

reloadHistoryBtn.addEventListener("click", () => {
  loadHistory().catch((error) => setFeedback(error.message, false));
});

focusEmailOnLoad();
refreshAll();
