import { buildMainView } from "./ui/mainView.js";
import { renderTrackerState } from "./ui/checkView.js";
import {
  checkIn,
  checkOut,
  getInitialState,
  getViewState,
} from "./services/timeEntryService.js";

// Bootstrap root view and cache element references.
const rootElement = document.getElementById("app");
const viewRefs = buildMainView(rootElement);

let appState = {
  entries: [],
  activeEntry: null,
  message: "Ready.",
};

// Render always derives active status from the latest entries state.
function render() {
  const stateForView = getViewState(appState.entries, appState.message);
  renderTrackerState(viewRefs, stateForView);
}

// Initial load reads persisted entries from localStorage.
function initialize() {
  const initialState = getInitialState();
  appState = {
    entries: initialState.entries,
    activeEntry: initialState.activeEntry,
    message: "Ready.",
  };
  render();
}

// Check-in action handler delegates business rules to the service layer.
function handleCheckIn() {
  const result = checkIn();
  appState = {
    entries: result.entries,
    activeEntry: result.activeEntry,
    message: result.message,
  };
  render();
}

// Check-out action handler delegates business rules to the service layer.
function handleCheckOut() {
  const result = checkOut();
  appState = {
    entries: result.entries,
    activeEntry: result.activeEntry,
    message: result.message,
  };
  render();
}

viewRefs.checkInButton.addEventListener("click", handleCheckIn);
viewRefs.checkOutButton.addEventListener("click", handleCheckOut);

initialize();
