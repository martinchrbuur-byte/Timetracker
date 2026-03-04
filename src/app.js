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

const rootElement = document.getElementById("app");
const viewRefs = buildMainView(rootElement);

let appState = {
  entries: [],
  activeEntry: null,
  message: READY_MESSAGE,
};

function render() {
  renderTrackerState(viewRefs, appState);
}

function applyResult(result) {
  appState = {
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

async function initialize() {
  const initialState = await getInitialState();
  appState = {
    entries: initialState.entries,
    activeEntry: initialState.activeEntry,
    message: READY_MESSAGE,
  };
  render();
}

async function handleCheckIn() {
  applyResult(await checkIn());
}

async function handleCheckOut() {
  applyResult(await checkOut());
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

  applyResult(await updateEntryTimes(entryId, checkInIso, checkOutIso));
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

viewRefs.checkInButton.addEventListener("click", handleCheckIn);
viewRefs.checkOutButton.addEventListener("click", handleCheckOut);
viewRefs.historyBody.addEventListener("click", handleHistoryActionClick);
viewRefs.editActiveButton.addEventListener("click", handleActiveEditClick);
viewRefs.editCancelButton.addEventListener("click", closeEditSheet);
viewRefs.editSheetBackdrop.addEventListener("click", closeEditSheet);
viewRefs.editSaveButton.addEventListener("click", handleEditSave);
document.addEventListener("keydown", handleSheetKeydown);

initialize();
