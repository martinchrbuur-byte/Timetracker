import { buildMainView } from "./ui/mainView.js";
import { renderTrackerState } from "./ui/checkView.js";
import {
  checkIn,
  checkOut,
  getInitialState,
  updateEntryTimes,
} from "./services/timeEntryService.js";
import { restoreSession, signIn, signOut, signUp } from "./services/authService.js";
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
  isAuthenticated: false,
  authUserId: null,
  authEmail: "",
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
  if (!appState.isAuthenticated || !appState.currentUserId) {
    appState = {
      ...appState,
      entries: [],
      activeEntry: null,
    };
    render();
    return;
  }

  try {
    const initialState = await getInitialState(appState.currentUserId);
    appState = {
      ...appState,
      entries: initialState.entries,
      activeEntry: initialState.activeEntry,
    };
    render();
  } catch (error) {
    appState = {
      ...appState,
      entries: [],
      activeEntry: null,
      message: `Data load failed: ${error.message}`,
    };
    render();
  }
}

async function initialize() {
  try {
    const restored = await restoreSession();
    const restoredUserId = restored.user?.id || null;
    const restoredEmail = restored.user?.email || "";
    let initialState = { entries: [], activeEntry: null };
    let startupMessage = restoredUserId
      ? READY_MESSAGE
      : "Sign in or sign up to start tracking time.";

    if (restoredUserId) {
      try {
        initialState = await getInitialState(restoredUserId);
      } catch (error) {
        startupMessage = `Signed in, but data table setup is missing: ${error.message}`;
      }
    }

    const todayDateISO = toLocalDateInputValue();

    appState = {
      isAuthenticated: Boolean(restoredUserId),
      authUserId: restoredUserId,
      authEmail: restoredEmail,
      currentUserId: restoredUserId || "default",
      entries: initialState.entries,
      activeEntry: initialState.activeEntry,
      message: startupMessage,
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
  if (!appState.isAuthenticated || !appState.currentUserId) {
    appState = {
      ...appState,
      message: "You must be signed in to check in.",
    };
    render();
    return;
  }

  applyResult(await checkIn(appState.currentUserId));
}

async function handleCheckOut() {
  if (!appState.isAuthenticated || !appState.currentUserId) {
    appState = {
      ...appState,
      message: "You must be signed in to check out.",
    };
    render();
    return;
  }

  applyResult(await checkOut(appState.currentUserId));
}

async function handleEditSave() {
  if (!appState.isAuthenticated || !appState.currentUserId) {
    appState = {
      ...appState,
      message: "You must be signed in to edit entries.",
    };
    render();
    return;
  }

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

function readAuthFormValues() {
  return {
    email: viewRefs.authEmailInput.value.trim().toLowerCase(),
    password: viewRefs.authPasswordInput.value,
  };
}

async function applyAuthenticatedUser(user, message) {
  const userId = user?.id || null;
  const email = user?.email || "";

  appState = {
    ...appState,
    isAuthenticated: Boolean(userId),
    authUserId: userId,
    authEmail: email,
    currentUserId: userId || "default",
    message,
  };

  viewRefs.authPasswordInput.value = "";
  await refreshEntriesForCurrentUser();
}

async function handleSignUp() {
  try {
    const { email, password } = readAuthFormValues();
    const result = await signUp(email, password);

    if (!result.session || !result.user?.id) {
      appState = {
        ...appState,
        message: "Sign-up successful. Verify your email, then sign in.",
      };
      viewRefs.authPasswordInput.value = "";
      render();
      return;
    }

    await applyAuthenticatedUser(result.user, "Signed up successfully.");
  } catch (error) {
    appState = {
      ...appState,
      message: `Sign-up failed: ${error.message}`,
    };
    render();
  }
}

async function handleSignIn() {
  try {
    const { email, password } = readAuthFormValues();
    const result = await signIn(email, password);

    await applyAuthenticatedUser(result.user, "Signed in successfully.");
  } catch (error) {
    appState = {
      ...appState,
      message: `Sign-in failed: ${error.message}`,
    };
    render();
  }
}

async function handleSignOut() {
  try {
    await signOut();

    appState = {
      ...appState,
      isAuthenticated: false,
      authUserId: null,
      authEmail: "",
      currentUserId: "default",
      entries: [],
      activeEntry: null,
      message: "Signed out.",
    };
    closeEditSheet();
    render();
  } catch (error) {
    appState = {
      ...appState,
      message: `Sign-out failed: ${error.message}`,
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
viewRefs.authSignInButton.addEventListener("click", handleSignIn);
viewRefs.authSignUpButton.addEventListener("click", handleSignUp);
viewRefs.authSignOutButton.addEventListener("click", handleSignOut);
viewRefs.quickSignOutButton.addEventListener("click", handleSignOut);
document.addEventListener("keydown", handleSheetKeydown);

initialize();
