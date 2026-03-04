import { buildMainView } from "./ui/mainView.js";
import { renderTrackerState } from "./ui/checkView.js";
import {
  checkIn,
  checkOut,
  getInitialState,
  updateEntryTimes,
} from "./services/timeEntryService.js";
import {
  addUser,
  getUsersState,
  restoreSignedInUser,
  signInUser,
  signOutUser,
} from "./services/userService.js";
import {
  localDateTimeInputToIso,
  toLocalDateTimeInputValue,
} from "./shared/dateTime.js";
import { isSupabasePersistenceEnabled } from "./config/appConfig.js";

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
  users: [],
  currentUserId: "default",
  isAuthenticated: false,
  entries: [],
  activeEntry: null,
  message: READY_MESSAGE,
  dayOverviewMode: "today",
  dayOverviewDateISO: toLocalDateInputValue(),
  dayOverviewHistoricRange: "week",
};

function renderUserSelect() {
  viewRefs.userSelect.innerHTML = appState.users
    .map(
      (user) =>
        `<option value="${user.id}" ${user.id === appState.currentUserId ? "selected" : ""}>${user.name}</option>`
    )
    .join("");
}

function renderAuthButton() {
  if (!isSupabasePersistenceEnabled()) {
    viewRefs.addUserButton.textContent = "Add user";
    viewRefs.authFields.hidden = true;
    viewRefs.authEmailInput.hidden = true;
    viewRefs.authPasswordInput.hidden = true;
    viewRefs.authNameInput.hidden = true;
    viewRefs.authActionButton.hidden = true;
    return;
  }

  viewRefs.addUserButton.textContent = "Sign up";
  viewRefs.authFields.hidden = false;
  viewRefs.authEmailInput.hidden = false;
  viewRefs.authPasswordInput.hidden = false;
  viewRefs.authNameInput.hidden = appState.isAuthenticated;
  viewRefs.authActionButton.hidden = false;
  viewRefs.authActionButton.textContent = appState.isAuthenticated ? "Sign out" : "Sign in";
  viewRefs.authEmailInput.disabled = appState.isAuthenticated;
  viewRefs.authPasswordInput.disabled = appState.isAuthenticated;
  viewRefs.authNameInput.disabled = appState.isAuthenticated;
}

function render() {
  renderUserSelect();
  renderAuthButton();
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
    const usersState = await getUsersState();
    const restoredAuth = await restoreSignedInUser();
    const users = restoredAuth.users?.length ? restoredAuth.users : usersState.users;
    const currentUserId = restoredAuth.currentUserId || users[0]?.id || "default";
    const initialState = await getInitialState(currentUserId);
    const todayDateISO = toLocalDateInputValue();

    appState = {
      users,
      currentUserId,
      isAuthenticated: restoredAuth.isAuthenticated,
      entries: initialState.entries,
      activeEntry: initialState.activeEntry,
      message: restoredAuth.message || READY_MESSAGE,
      dayOverviewMode: "today",
      dayOverviewDateISO: todayDateISO,
      dayOverviewHistoricRange: "week",
    };

    viewRefs.dayOverviewHistoricDate.value = todayDateISO;
    viewRefs.dayOverviewHistoricDate.max = todayDateISO;
    if (isSupabasePersistenceEnabled()) {
      viewRefs.authEmailInput.value = "";
      viewRefs.authPasswordInput.value = "";
      viewRefs.authNameInput.value = "";
    }

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

async function handleUserChange(event) {
  const userId = event.target.value;
  if (!userId) {
    return;
  }

  appState = {
    ...appState,
    currentUserId: userId,
    message: READY_MESSAGE,
  };
  await refreshEntriesForCurrentUser();
}

async function handleAddUser() {
  try {
    let result;

    if (isSupabasePersistenceEnabled()) {
      const email = viewRefs.authEmailInput.value;
      const password = viewRefs.authPasswordInput.value;
      const name = viewRefs.authNameInput.value;

      result = await addUser({
        email,
        password,
        name,
      });
    } else {
      const name = window.prompt("Enter new user name:");
      if (name === null) {
        return;
      }

      result = await addUser(name);
    }

    appState = {
      ...appState,
      users: result.users,
      currentUserId: result.newUserId || appState.currentUserId,
      isAuthenticated: appState.isAuthenticated || Boolean(result.newUserId),
      message: result.message,
    };

    if (isSupabasePersistenceEnabled() && result.newUserId) {
      viewRefs.authPasswordInput.value = "";
    }

    await refreshEntriesForCurrentUser();
  } catch (error) {
    appState = {
      ...appState,
      message: `Sign up failed: ${error.message}`,
    };
    render();
  }
}

async function handleAuthAction() {
  if (!isSupabasePersistenceEnabled()) {
    return;
  }

  try {
    if (appState.isAuthenticated) {
      const result = await signOutUser();
      const fallbackUserId = result.users[0]?.id || "default";

      appState = {
        ...appState,
        users: result.users,
        currentUserId: fallbackUserId,
        isAuthenticated: false,
        message: result.message,
      };

      await refreshEntriesForCurrentUser();
      return;
    }

    const email = viewRefs.authEmailInput.value;
    const password = viewRefs.authPasswordInput.value;

    const result = await signInUser({ email, password });
    appState = {
      ...appState,
      users: result.users,
      currentUserId: result.currentUserId || appState.currentUserId,
      isAuthenticated: Boolean(result.currentUserId),
      message: result.message,
    };

    if (result.currentUserId) {
      viewRefs.authPasswordInput.value = "";
    }

    await refreshEntriesForCurrentUser();
  } catch (error) {
    appState = {
      ...appState,
      message: `Sign in failed: ${error.message}`,
    };
    render();
  }
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
viewRefs.userSelect.addEventListener("change", handleUserChange);
viewRefs.addUserButton.addEventListener("click", handleAddUser);
viewRefs.authActionButton.addEventListener("click", handleAuthAction);
document.addEventListener("keydown", handleSheetKeydown);

initialize();
