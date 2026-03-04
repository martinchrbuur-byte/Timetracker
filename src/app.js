import { buildMainView } from "./ui/mainView.js";
import { renderTrackerState } from "./ui/checkView.js";
import {
  checkIn,
  checkOut,
  getInitialState,
  updateEntryTimes,
} from "./services/timeEntryService.js";
import {
  localDateTimeInputToIso,
  toLocalDateTimeInputValue,
} from "./shared/dateTime.js";

const READY_MESSAGE = "Ready.";

function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const rootElement = document.getElementById("app");
const viewRefs = buildMainView(rootElement);

let appState = {
  currentUserId: "default",
  entries: [],
  activeEntry: null,
  message: READY_MESSAGE,
  dayOverviewMode: "today",
  dayOverviewDateISO: toLocalDateInputValue(),
  dayOverviewHistoricRange: "week",
};

function render() {
  renderTrackerState(viewRefs, appState);
}

function applyResult(result) {
  appState = {
    ...appState,
    entries: result.entries,
    activeEntry: result.activeEntry,
    message: result.message,
  };
  render();
}

function openEditSheet(entryId) {
  const entry = appState.entries.find((entryItem) => entryItem.id === entryId);
  if (!entry) {
    return;
  }

  viewRefs.editEntryIdInput.value = entry.id;
  viewRefs.editCheckInInput.value = toLocalDateTimeInputValue(entry.checkInAt);
  viewRefs.editCheckOutInput.value = toLocalDateTimeInputValue(entry.checkOutAt);
  viewRefs.editSheet.hidden = false;
  viewRefs.editCheckInInput.focus();
}

function closeEditSheet() {
  viewRefs.editSheet.hidden = true;
  viewRefs.editEntryIdInput.value = "";
  viewRefs.editCheckInInput.value = "";
  viewRefs.editCheckOutInput.value = "";
}

async function refreshEntriesForCurrentUser() {
  const initialState = await getInitialState(appState.currentUserId);
  appState = {
    ...appState,
    entries: initialState.entries,
    activeEntry: initialState.activeEntry,
  };
  render();
}

async function initialize() {
  try {
    const initialState = await getInitialState("default");
    const todayDateISO = toLocalDateInputValue();

    appState = {
      currentUserId: "default",
      entries: initialState.entries,
      activeEntry: initialState.activeEntry,
      message: READY_MESSAGE,
      dayOverviewMode: "today",
      dayOverviewDateISO: todayDateISO,
      dayOverviewHistoricRange: "week",
    };

    viewRefs.dayOverviewHistoricDate.value = todayDateISO;
    viewRefs.dayOverviewHistoricDate.max = todayDateISO;

    render();
  } catch (error) {
    appState = {
      ...appState,
      message: `Initialization failed: ${error.message}`,
    };
    render();
  }
}

async function handleCheckIn() {
  applyResult(await checkIn(appState.currentUserId));
}

async function handleCheckOut() {
  applyResult(await checkOut(appState.currentUserId));
}

async function handleEditSave() {
  const entryId = viewRefs.editEntryIdInput.value;
  const checkInIso = localDateTimeInputToIso(viewRefs.editCheckInInput.value);
  const checkOutIso = localDateTimeInputToIso(viewRefs.editCheckOutInput.value);

  if (!checkInIso) {
    appState = {
      ...appState,
      message: "Check-in is required and must be valid.",
    };
    render();
    return;
  }

  applyResult(
    await updateEntryTimes(entryId, checkInIso, checkOutIso, appState.currentUserId)
  );
  closeEditSheet();
}

function handleHistoryActionClick(event) {
  const editButton = event.target.closest("[data-entry-id]");
  if (!editButton) {
    return;
  }

  const entryId = editButton.dataset.entryId;
  if (!entryId) {
    return;
  }

  openEditSheet(entryId);
}

function handleActiveEditClick() {
  const entryId = viewRefs.editActiveButton.dataset.entryId;
  if (!entryId) {
    return;
  }

  openEditSheet(entryId);
}

function handleSheetKeydown(event) {
  if (event.key === "Escape" && !viewRefs.editSheet.hidden) {
    closeEditSheet();
  }
}

function setDayOverviewMode(mode) {
  appState = {
    ...appState,
    dayOverviewMode: mode,
  };
  render();
}

function handleOverviewTodayClick() {
  setDayOverviewMode("today");
}

function handleOverviewHistoricClick() {
  setDayOverviewMode("historic");
}

function handleOverviewHistoricDateChange(event) {
  const nextDate = event.target.value;
  if (!nextDate) {
    return;
  }

  appState = {
    ...appState,
    dayOverviewDateISO: nextDate,
    dayOverviewMode: "historic",
  };
  render();
}

function handleOverviewRangeClick(event) {
  const rangeButton = event.target.closest("[data-range]");
  if (!rangeButton) {
    return;
  }

  const range = rangeButton.dataset.range;
  if (!range || !["week", "month", "year"].includes(range)) {
    return;
  }

  appState = {
    ...appState,
    dayOverviewMode: "historic",
    dayOverviewHistoricRange: range,
  };
  render();
}

viewRefs.checkInButton.addEventListener("click", handleCheckIn);
viewRefs.checkOutButton.addEventListener("click", handleCheckOut);
viewRefs.historyBody.addEventListener("click", handleHistoryActionClick);
viewRefs.editActiveButton.addEventListener("click", handleActiveEditClick);
viewRefs.editCancelButton.addEventListener("click", closeEditSheet);
viewRefs.editSheetBackdrop.addEventListener("click", closeEditSheet);
viewRefs.editSaveButton.addEventListener("click", handleEditSave);
viewRefs.dayOverviewTodayButton.addEventListener("click", handleOverviewTodayClick);
viewRefs.dayOverviewHistoricButton.addEventListener("click", handleOverviewHistoricClick);
viewRefs.dayOverviewHistoricDate.addEventListener("change", handleOverviewHistoricDateChange);
viewRefs.dayOverviewRangeGroup.addEventListener("click", handleOverviewRangeClick);
document.addEventListener("keydown", handleSheetKeydown);

initialize();
