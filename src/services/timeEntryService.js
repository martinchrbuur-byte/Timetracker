import { createTimeEntry } from "../models/timeEntry.js";
import {
  loadEntriesFromStorage,
  saveEntriesToStorage,
} from "./storageService.js";

// Most recent sessions appear first in the UI.
function sortByLatest(entries) {
  return [...entries].sort(
    (left, right) =>
      new Date(right.checkInAt).getTime() - new Date(left.checkInAt).getTime()
  );
}

// V1 supports at most one active session at a time.
function findActiveEntry(entries) {
  return entries.find((entry) => entry.checkOutAt === null) || null;
}

// Shared helper to persist and return consistent result payloads.
function persistAndBuildResult(entries, message) {
  const sorted = sortByLatest(entries);
  saveEntriesToStorage(sorted);

  return {
    entries: sorted,
    activeEntry: findActiveEntry(sorted),
    message,
  };
}

export function getInitialState() {
  const entries = sortByLatest(loadEntriesFromStorage());
  return {
    entries,
    activeEntry: findActiveEntry(entries),
  };
}

export function getViewState(entries, message) {
  const sorted = sortByLatest(entries);
  return {
    entries: sorted,
    activeEntry: findActiveEntry(sorted),
    message,
  };
}

export function checkIn() {
  try {
    // Read latest data and enforce no-overlap rule.
    const entries = sortByLatest(loadEntriesFromStorage());
    const activeEntry = findActiveEntry(entries);

    if (activeEntry) {
      return {
        entries,
        activeEntry,
        message: "Cannot check in: an active session already exists.",
      };
    }

    const newEntry = createTimeEntry();
    return persistAndBuildResult([newEntry, ...entries], "Checked in successfully.");
  } catch (error) {
    return {
      entries: sortByLatest(loadEntriesFromStorage()),
      activeEntry: findActiveEntry(loadEntriesFromStorage()),
      message: "Check-in failed due to a storage error.",
    };
  }
}

export function checkOut() {
  try {
    // Read latest data and require an active session to close.
    const entries = sortByLatest(loadEntriesFromStorage());
    const activeEntry = findActiveEntry(entries);

    if (!activeEntry) {
      return {
        entries,
        activeEntry: null,
        message: "Cannot check out: no active session.",
      };
    }

    const updatedEntries = entries.map((entry) => {
      if (entry.id !== activeEntry.id) {
        return entry;
      }

      return {
        ...entry,
        checkOutAt: new Date().toISOString(),
      };
    });

    return persistAndBuildResult(updatedEntries, "Checked out successfully.");
  } catch (error) {
    return {
      entries: sortByLatest(loadEntriesFromStorage()),
      activeEntry: findActiveEntry(loadEntriesFromStorage()),
      message: "Check-out failed due to a storage error.",
    };
  }
}
