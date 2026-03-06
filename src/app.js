import { buildMainView } from "./ui/mainView.js";
import { renderTrackerState } from "./ui/checkView.js";
import {
  adjustEntryMinutes,
  buildHistoricAnalytics,
  buildHistoricStartEndOverview,
  checkIn,
  checkOut,
  deleteEntry,
  evaluateIntegrity,
  getInitialState,
  updateEntryTimes,
} from "./services/timeEntryService.js";
import {
  changePassword,
  restoreSession,
  signIn,
  signOut,
  signUp,
} from "./services/authService.js";
import {
  localDateTimeInputToIso,
  toLocalDateInputValue,
  toLocalDateTimeInputValue,
} from "./shared/dateTime.js";
import {
  getSyncStatus,
  processQueuedOperations,
  subscribeToSyncStatus,
} from "./services/storageService.js";

const READY_MESSAGE = "Ready.";
const THEME_STORAGE_KEY = "workHours.theme.v1";
const AUTH_ROUTES = {
  LANDING: "landing",
  SIGN_UP: "signup",
  SIGN_IN: "signin",
  CONFIRMATION: "confirmation",
};
const CONFIRMATION_REDIRECT_DELAY_MS = 2200;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES = {
  minLength: 8,
  hasLetter: /[A-Za-z]/,
  hasDigit: /\d/,
};

let confirmationRedirectTimerId = null;

function normalizeAuthRoute(routeValue) {
  if (
    routeValue === AUTH_ROUTES.LANDING ||
    routeValue === AUTH_ROUTES.SIGN_UP ||
    routeValue === AUTH_ROUTES.SIGN_IN ||
    routeValue === AUTH_ROUTES.CONFIRMATION
  ) {
    return routeValue;
  }

  return AUTH_ROUTES.LANDING;
}

function readAuthRouteFromHash() {
  if (typeof window === "undefined") {
    return AUTH_ROUTES.LANDING;
  }

  const hash = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
  if (!hash || hash === "app") {
    return AUTH_ROUTES.LANDING;
  }

  return normalizeAuthRoute(hash);
}

function syncHashRoute({ isAuthenticated, authRoute, replace = false }) {
  if (typeof window === "undefined") {
    return;
  }

  const targetHash = isAuthenticated ? "#app" : `#${normalizeAuthRoute(authRoute)}`;
  if (window.location.hash === targetHash) {
    return;
  }

  if (replace && window.history && typeof window.history.replaceState === "function") {
    window.history.replaceState(null, "", targetHash);
    return;
  }

  window.location.hash = targetHash;
}

function clearConfirmationRedirectTimer() {
  if (confirmationRedirectTimerId !== null) {
    clearTimeout(confirmationRedirectTimerId);
    confirmationRedirectTimerId = null;
  }
}

function mapSignUpErrorMessage(error) {
  const message = error?.message || "";

  if (/already registered|already exists|user already registered|email.*exists/i.test(message)) {
    return "This email is already in use. Try signing in instead.";
  }

  if (/network|failed to fetch|fetch/i.test(message)) {
    return "Network error. Check your connection and try again.";
  }

  if (/password/i.test(message) && /weak|least|length|digit|letter/i.test(message)) {
    return "Password is too weak. Use at least 8 characters with one letter and one number.";
  }

  return message || "Unable to sign up right now.";
}

function validateSignUpInput(email, password, confirmPassword) {
  if (!email) {
    return "Email is required.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address.";
  }

  if (!password) {
    return "Password is required.";
  }

  if (password.length < PASSWORD_RULES.minLength) {
    return "Password must be at least 8 characters.";
  }

  if (!PASSWORD_RULES.hasLetter.test(password) || !PASSWORD_RULES.hasDigit.test(password)) {
    return "Password must include at least one letter and one number.";
  }

  if (password !== confirmPassword) {
    return "Password and confirm password do not match.";
  }

  return "";
}

function validateSignInInput(email, password) {
  if (!email) {
    return "Email is required.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address.";
  }

  if (!password) {
    return "Password is required.";
  }

  return "";
}

function getPreferredThemeMode() {
  try {
    const persisted = localStorage.getItem(THEME_STORAGE_KEY);
    if (persisted === "dark" || persisted === "light") {
      return persisted;
    }
  } catch (error) {
    // Ignore localStorage errors and continue with system/default fallback.
  }

  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "light";
}

function saveThemeMode(themeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  } catch (error) {
    // Ignore localStorage errors; theme still applies for current session.
  }
}

function applyThemeMode(themeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme = themeMode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", resolvedTheme);
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
  themeMode: getPreferredThemeMode(),
  syncStatus: getSyncStatus(),
  authRoute: AUTH_ROUTES.LANDING,
  authUi: {
    isSubmitting: false,
    validationMessage: "",
    successMessage: "",
    loadingLabel: "",
  },
  confirmationTitle: "Check your email",
  confirmationMessage: "",
  message: READY_MESSAGE,
  dayOverviewMode: "today",
  dayOverviewDateISO: toLocalDateInputValue(),
  dayOverviewHistoricRange: "week",
  historicOverview: {
    range: "week",
    rows: [],
    periodStartLabel: "--",
    periodEndLabel: "--",
  },
  integrityFeedback: {
    level: "valid",
    label: "Integrity: Valid",
    detail: "No time conflicts detected.",
  },
  historicAnalytics: {
    range: "week",
    rows: [],
    totalMinutes: 0,
    activeDays: 0,
    averageMinutesPerActiveDay: 0,
    peakDay: null,
    trend: {
      direction: "stable",
      deltaMinutes: 0,
      firstHalfAverageMinutes: 0,
      secondHalfAverageMinutes: 0,
    },
    periodStartLabel: "--",
    periodEndLabel: "--",
  },
};

function patchState(nextState) {
  if (Object.prototype.hasOwnProperty.call(nextState || {}, "themeMode")) {
    applyThemeMode(nextState.themeMode);
  }

  appState = {
    ...appState,
    ...nextState,
  };
}

function setAuthRoute(nextRoute, { replaceHash = false } = {}) {
  const normalizedRoute = normalizeAuthRoute(nextRoute);

  patchState({
    authRoute: normalizedRoute,
    authUi: {
      ...appState.authUi,
      validationMessage: "",
      successMessage: "",
      loadingLabel: "",
      isSubmitting: false,
    },
  });

  syncHashRoute({
    isAuthenticated: appState.isAuthenticated,
    authRoute: normalizedRoute,
    replace: replaceHash,
  });
}

function patchStateAndRender(nextState) {
  patchState(nextState);
  render();
}

function requireAuth(message) {
  if (appState.isAuthenticated && appState.currentUserId) {
    return true;
  }

  patchStateAndRender({ message });
  return false;
}

function render() {
  appState = {
    ...appState,
    historicOverview: buildHistoricStartEndOverview(
      appState.entries,
      appState.dayOverviewDateISO,
      appState.dayOverviewHistoricRange
    ),
    historicAnalytics: buildHistoricAnalytics(
      appState.entries,
      appState.dayOverviewDateISO,
      appState.dayOverviewHistoricRange
    ),
    integrityFeedback: evaluateIntegrity(appState.entries, appState.activeEntry),
  };
  renderTrackerState(viewRefs, appState);
}

function applyResult(result) {
  patchState({
    entries: result.entries,
    activeEntry: result.activeEntry,
    message: result.message,
    syncStatus: getSyncStatus(),
  });
  render();
}

async function syncPendingOperations() {
  await processQueuedOperations();
  patchStateAndRender({
    syncStatus: getSyncStatus(),
  });
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

function openPasswordSheet() {
  viewRefs.passwordCurrentInput.value = "";
  viewRefs.passwordNewInput.value = "";
  viewRefs.passwordConfirmInput.value = "";
  viewRefs.passwordSheet.hidden = false;
  viewRefs.passwordCurrentInput.focus();
}

function closePasswordSheet() {
  viewRefs.passwordSheet.hidden = true;
  viewRefs.passwordCurrentInput.value = "";
  viewRefs.passwordNewInput.value = "";
  viewRefs.passwordConfirmInput.value = "";
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
      syncStatus: getSyncStatus(),
    };
    render();
  } catch (error) {
    appState = {
      ...appState,
      entries: [],
      activeEntry: null,
      syncStatus: getSyncStatus(),
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
    const initialThemeMode = getPreferredThemeMode();
    const initialAuthRoute = restoredUserId ? AUTH_ROUTES.LANDING : readAuthRouteFromHash();

    appState = {
      isAuthenticated: Boolean(restoredUserId),
      authUserId: restoredUserId,
      authEmail: restoredEmail,
      currentUserId: restoredUserId || "default",
      entries: initialState.entries,
      activeEntry: initialState.activeEntry,
      themeMode: initialThemeMode,
      syncStatus: getSyncStatus(),
      authRoute: normalizeAuthRoute(initialAuthRoute),
      authUi: {
        isSubmitting: false,
        validationMessage: "",
        successMessage: "",
        loadingLabel: "",
      },
      confirmationTitle: "Check your email",
      confirmationMessage: "",
      message: startupMessage,
      dayOverviewMode: "today",
      dayOverviewDateISO: todayDateISO,
      dayOverviewHistoricRange: "week",
    };

    viewRefs.dayOverviewHistoricDate.value = todayDateISO;
    viewRefs.dayOverviewHistoricDate.max = todayDateISO;
    applyThemeMode(initialThemeMode);

    syncHashRoute({
      isAuthenticated: Boolean(restoredUserId),
      authRoute: initialAuthRoute,
      replace: true,
    });

    render();
    await syncPendingOperations();
  } catch (error) {
    appState = {
      ...appState,
      syncStatus: getSyncStatus(),
      message: `Initialization failed: ${error.message}`,
    };
    render();
  }
}

async function handleCheckIn() {
  if (!requireAuth("You must be signed in to check in.")) {
    return;
  }

  applyResult(await checkIn(appState.currentUserId));
}

async function handleCheckOut() {
  if (!requireAuth("You must be signed in to check out.")) {
    return;
  }

  applyResult(await checkOut(appState.currentUserId));
}

async function handleEditSave() {
  if (!requireAuth("You must be signed in to edit entries.")) {
    return;
  }

  const entryId = viewRefs.editEntryIdInput.value;
  const checkInIso = localDateTimeInputToIso(viewRefs.editCheckInInput.value);
  const checkOutIso = localDateTimeInputToIso(viewRefs.editCheckOutInput.value);

  if (!checkInIso) {
    patchStateAndRender({
      message: "Check-in is required and must be valid.",
    });
    return;
  }

  const result = await updateEntryTimes(entryId, checkInIso, checkOutIso, appState.currentUserId);
  applyResult(result);

  if (result.message === "Session times updated successfully.") {
    closeEditSheet();
  }
}

async function handleEditDelete() {
  if (!requireAuth("You must be signed in to edit entries.")) {
    return;
  }

  const entryId = viewRefs.editEntryIdInput.value;
  if (!entryId) {
    return;
  }

  const result = await deleteEntry(entryId, appState.currentUserId);
  applyResult(result);

  if (result.message === "Session deleted successfully.") {
    closeEditSheet();
  }
}

async function handleHistoryActionClick(event) {
  const quickButton = event.target.closest("[data-quick-minutes][data-entry-id]");
  if (quickButton) {
    if (!requireAuth("You must be signed in to edit entries.")) {
      return;
    }

    const entryId = quickButton.dataset.entryId;
    const quickMinutes = Number.parseInt(quickButton.dataset.quickMinutes || "0", 10);

    if (!entryId || !Number.isFinite(quickMinutes) || quickMinutes === 0) {
      return;
    }

    const result = await adjustEntryMinutes(entryId, 0, quickMinutes, appState.currentUserId);
    applyResult(result);
    return;
  }

  const editButton = event.target.closest("[data-edit-entry-id]");
  if (!editButton) {
    return;
  }

  const entryId = editButton.dataset.editEntryId;
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
    return;
  }

  if (event.key === "Escape" && !viewRefs.passwordSheet.hidden) {
    closePasswordSheet();
  }
}

async function handleChangePasswordSave() {
  if (!requireAuth("You must be signed in to change password.")) {
    return;
  }

  const currentPassword = viewRefs.passwordCurrentInput.value;
  const nextPassword = viewRefs.passwordNewInput.value;
  const confirmPassword = viewRefs.passwordConfirmInput.value;

  try {
    const result = await changePassword(currentPassword, nextPassword, confirmPassword);

    patchState({
      message: result.message,
    });

    closePasswordSheet();
    render();
  } catch (error) {
    patchState({
      message: `Password change failed: ${error.message}`,
    });
    render();
  }
}

function setDayOverviewMode(mode) {
  patchState({
    dayOverviewMode: mode,
  });
  render();
}

function handleThemeToggleClick() {
  const nextThemeMode = appState.themeMode === "dark" ? "light" : "dark";
  saveThemeMode(nextThemeMode);
  patchStateAndRender({ themeMode: nextThemeMode });
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

  patchState({
    dayOverviewDateISO: nextDate,
    dayOverviewMode: "historic",
  });
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

  patchState({
    dayOverviewMode: "historic",
    dayOverviewHistoricRange: range,
  });
  render();
}

function buildHistoricOverviewClipboardText(historicOverview) {
  const rows = historicOverview?.rows || [];
  if (rows.length === 0) {
    return "";
  }

  const lines = ["Date\tStart\tEnd"];
  rows.forEach((row) => {
    lines.push(`${row.dateLabel}\t${row.startLabel}\t${row.endLabel}`);
  });

  return lines.join("\n");
}

async function handleOverviewCopyClick() {
  const clipboardText = buildHistoricOverviewClipboardText(appState.historicOverview);

  if (!clipboardText) {
    patchState({
      message: "Nothing to copy for this period.",
    });
    render();
    return;
  }

  try {
    await navigator.clipboard.writeText(clipboardText);
    patchState({
      message: "Historic overview copied.",
    });
    render();
  } catch (error) {
    patchState({
      message: "Copy failed. Select and copy manually.",
    });
    render();
  }
}

function readAuthFormValues() {
  return {
    email: viewRefs.authEmailInput.value.trim().toLowerCase(),
    password: viewRefs.authPasswordInput.value,
    confirmPassword: viewRefs.authConfirmPasswordInput.value,
  };
}

async function applyAuthenticatedUser(user, message) {
  clearConfirmationRedirectTimer();

  const userId = user?.id || null;
  const email = user?.email || "";

  appState = {
    ...appState,
    isAuthenticated: Boolean(userId),
    authUserId: userId,
    authEmail: email,
    currentUserId: userId || "default",
    authRoute: AUTH_ROUTES.LANDING,
    authUi: {
      isSubmitting: false,
      validationMessage: "",
      successMessage: "",
      loadingLabel: "",
    },
    confirmationMessage: "",
    message,
  };

  viewRefs.authPasswordInput.value = "";
  viewRefs.authConfirmPasswordInput.value = "";
  syncHashRoute({ isAuthenticated: true, authRoute: AUTH_ROUTES.LANDING, replace: true });
  await refreshEntriesForCurrentUser();
}

function scheduleConfirmationRedirectToSignIn() {
  clearConfirmationRedirectTimer();
  confirmationRedirectTimerId = setTimeout(() => {
    setAuthRoute(AUTH_ROUTES.SIGN_IN, { replaceHash: true });
    render();
    viewRefs.authEmailInput.focus();
  }, CONFIRMATION_REDIRECT_DELAY_MS);
}

function setAuthSubmittingState(isSubmitting, loadingLabel = "") {
  patchState({
    authUi: {
      ...appState.authUi,
      isSubmitting,
      loadingLabel,
      validationMessage: isSubmitting ? "" : appState.authUi.validationMessage,
    },
  });
  render();
}

function handleOpenSignUp() {
  clearConfirmationRedirectTimer();
  setAuthRoute(AUTH_ROUTES.SIGN_UP);
  render();
  viewRefs.authEmailInput.focus();
}

function handleOpenSignIn() {
  clearConfirmationRedirectTimer();
  setAuthRoute(AUTH_ROUTES.SIGN_IN);
  render();
  viewRefs.authEmailInput.focus();
}

function handleBackToLanding() {
  clearConfirmationRedirectTimer();
  setAuthRoute(AUTH_ROUTES.LANDING);
  render();
  viewRefs.landingCreateAccountButton.focus();
}

function handleConfirmationContinue() {
  clearConfirmationRedirectTimer();
  setAuthRoute(AUTH_ROUTES.SIGN_IN);
  render();
  viewRefs.authEmailInput.focus();
}

async function handleSignUp() {
  const { email, password, confirmPassword } = readAuthFormValues();
  const validationMessage = validateSignUpInput(email, password, confirmPassword);
  if (validationMessage) {
    patchState({
      authUi: {
        ...appState.authUi,
        validationMessage,
        successMessage: "",
        loadingLabel: "",
      },
      message: `Sign-up failed: ${validationMessage}`,
    });
    render();
    return;
  }

  try {
    setAuthSubmittingState(true, "Creating account…");
    const result = await signUp(email, password);

    if (!result.session || !result.user?.id) {
      setAuthRoute(AUTH_ROUTES.CONFIRMATION);
      patchState({
        confirmationTitle: "Confirm your email",
        confirmationMessage:
          "Your account was created. Open the verification email, then continue to sign in.",
        authUi: {
          isSubmitting: false,
          validationMessage: "",
          successMessage: "Account created. Awaiting email confirmation.",
          loadingLabel: "",
        },
        message: "Sign-up successful. Verify your email, then sign in.",
      });
      viewRefs.authPasswordInput.value = "";
      viewRefs.authConfirmPasswordInput.value = "";
      render();
      scheduleConfirmationRedirectToSignIn();
      return;
    }

    await applyAuthenticatedUser(result.user, "Signed up successfully. Redirected to app home.");
  } catch (error) {
    const mappedMessage = mapSignUpErrorMessage(error);
    patchState({
      authUi: {
        ...appState.authUi,
        isSubmitting: false,
        validationMessage: mappedMessage,
        successMessage: "",
        loadingLabel: "",
      },
      message: `Sign-up failed: ${mappedMessage}`,
    });
    render();
    return;
  }

  patchState({
    authUi: {
      ...appState.authUi,
      isSubmitting: false,
      loadingLabel: "",
    },
  });
  render();
}

function mapSignInErrorMessage(error) {
  const message = error?.message || "";

  if (/network|failed to fetch|fetch/i.test(message)) {
    return "Network error. Check your connection and try again.";
  }

  return message || "Unable to sign in right now.";
}

async function handleSignIn() {
  const { email, password } = readAuthFormValues();
  const validationMessage = validateSignInInput(email, password);
  if (validationMessage) {
    patchState({
      authUi: {
        ...appState.authUi,
        validationMessage,
        successMessage: "",
        loadingLabel: "",
      },
      message: `Sign-in failed: ${validationMessage}`,
    });
    render();
    return;
  }

  try {
    setAuthSubmittingState(true, "Signing in…");
    const result = await signIn(email, password);

    await applyAuthenticatedUser(result.user, "Signed in successfully.");
  } catch (error) {
    const mappedMessage = mapSignInErrorMessage(error);
    patchState({
      authUi: {
        ...appState.authUi,
        isSubmitting: false,
        validationMessage: mappedMessage,
        successMessage: "",
        loadingLabel: "",
      },
      message: `Sign-in failed: ${mappedMessage}`,
    });
    render();
    return;
  }

  patchState({
    authUi: {
      ...appState.authUi,
      isSubmitting: false,
      loadingLabel: "",
    },
  });
  render();
}

function handleAuthRouteFromHash() {
  if (appState.isAuthenticated) {
    syncHashRoute({ isAuthenticated: true, authRoute: appState.authRoute, replace: true });
    return;
  }

  const hashRoute = readAuthRouteFromHash();
  setAuthRoute(hashRoute, { replaceHash: true });
  render();
}

async function handleSignOut() {
  try {
    await signOut();
    clearConfirmationRedirectTimer();

    appState = {
      ...appState,
      isAuthenticated: false,
      authUserId: null,
      authEmail: "",
      currentUserId: "default",
      entries: [],
      activeEntry: null,
      authRoute: AUTH_ROUTES.LANDING,
      authUi: {
        isSubmitting: false,
        validationMessage: "",
        successMessage: "",
        loadingLabel: "",
      },
      confirmationMessage: "",
      syncStatus: getSyncStatus(),
      message: "Signed out.",
    };
    closeEditSheet();
    closePasswordSheet();
    syncHashRoute({ isAuthenticated: false, authRoute: AUTH_ROUTES.LANDING, replace: true });
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
viewRefs.landingCreateAccountButton.addEventListener("click", handleOpenSignUp);
viewRefs.landingSignInButton.addEventListener("click", handleOpenSignIn);
viewRefs.authBackToLandingButton.addEventListener("click", handleBackToLanding);
viewRefs.confirmationContinueButton.addEventListener("click", handleConfirmationContinue);
viewRefs.confirmationBackToLandingButton.addEventListener("click", handleBackToLanding);
viewRefs.historyBody.addEventListener("click", handleHistoryActionClick);
viewRefs.editActiveButton.addEventListener("click", handleActiveEditClick);
viewRefs.editCancelButton.addEventListener("click", closeEditSheet);
viewRefs.editSheetBackdrop.addEventListener("click", closeEditSheet);
viewRefs.editDeleteButton.addEventListener("click", handleEditDelete);
viewRefs.editSaveButton.addEventListener("click", handleEditSave);
viewRefs.accountSettingsButton.addEventListener("click", openPasswordSheet);
viewRefs.passwordCancelButton.addEventListener("click", closePasswordSheet);
viewRefs.passwordSheetBackdrop.addEventListener("click", closePasswordSheet);
viewRefs.passwordSaveButton.addEventListener("click", handleChangePasswordSave);
viewRefs.dayOverviewTodayButton.addEventListener("click", handleOverviewTodayClick);
viewRefs.dayOverviewHistoricButton.addEventListener("click", handleOverviewHistoricClick);
viewRefs.dayOverviewHistoricDate.addEventListener("change", handleOverviewHistoricDateChange);
viewRefs.dayOverviewRangeGroup.addEventListener("click", handleOverviewRangeClick);
viewRefs.dayOverviewCopyButton.addEventListener("click", handleOverviewCopyClick);
viewRefs.themeToggleButton.addEventListener("click", handleThemeToggleClick);
viewRefs.authSignInButton.addEventListener("click", handleSignIn);
viewRefs.authSignUpButton.addEventListener("click", handleSignUp);
viewRefs.authSignOutButton.addEventListener("click", handleSignOut);
viewRefs.quickSignOutButton.addEventListener("click", handleSignOut);
document.addEventListener("keydown", handleSheetKeydown);

subscribeToSyncStatus((syncStatus) => {
  patchStateAndRender({ syncStatus });
});

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void syncPendingOperations();
  });
  window.addEventListener("hashchange", handleAuthRouteFromHash);
}

initialize();
