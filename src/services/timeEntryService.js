import { createTimeEntry } from "../models/timeEntry.js";
import {
  loadEntriesFromStorage,
  saveEntriesToStorage,
} from "./storageService.js";
import { isValidDateTimeString, toTimestamp } from "../shared/dateTime.js";

const MESSAGES = {
  READY: "Ready.",
  CHECKED_IN: "Checked in successfully.",
  CHECKED_OUT: "Checked out successfully.",
  CHECK_IN_BLOCKED: "Cannot check in: an active session already exists.",
  CHECK_OUT_BLOCKED: "Cannot check out: no active session.",
  CHECK_IN_ERROR: "Check-in failed due to a storage error.",
  CHECK_OUT_ERROR: "Check-out failed due to a storage error.",
  UPDATE_SUCCESS: "Session times updated successfully.",
  UPDATE_ERROR: "Update failed due to a storage error.",
  UPDATE_NOT_FOUND: "Cannot edit: session not found.",
  INVALID_CHECK_IN: "Invalid check-in date/time.",
  INVALID_CHECK_OUT: "Invalid check-out date/time.",
  CHECK_OUT_EARLY: "Check-out cannot be earlier than check-in.",
  ACTIVE_CONFLICT: "Cannot set active session: another active session already exists.",
  OVERLAP_CONFLICT: "Cannot save: session overlaps another entry.",
};

function sortEntriesByLatestCheckIn(entries) {
  return [...entries].sort(
    (leftEntry, rightEntry) =>
      toTimestamp(rightEntry.checkInAt) - toTimestamp(leftEntry.checkInAt)
  );
}

function findActiveEntry(entries) {
  return entries.find((entry) => entry.checkOutAt === null) || null;
}

function getEndTimestamp(checkOutAt) {
  return checkOutAt === null ? Number.POSITIVE_INFINITY : toTimestamp(checkOutAt);
}

async function readEntries() {
  const entries = await loadEntriesFromStorage();
  return sortEntriesByLatestCheckIn(entries);
}

async function buildResult(entries, message, shouldPersist = false) {
  const sortedEntries = sortEntriesByLatestCheckIn(entries);

  if (shouldPersist) {
    await saveEntriesToStorage(sortedEntries);
  }

  return {
    entries: sortedEntries,
    activeEntry: findActiveEntry(sortedEntries),
    message,
  };
}

function intervalsOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function validateEditTimes(entries, targetEntryId, nextCheckInAt, nextCheckOutAt) {
  if (!isValidDateTimeString(nextCheckInAt)) {
    return MESSAGES.INVALID_CHECK_IN;
  }

  if (nextCheckOutAt !== null && !isValidDateTimeString(nextCheckOutAt)) {
    return MESSAGES.INVALID_CHECK_OUT;
  }

  const nextStart = toTimestamp(nextCheckInAt);
  const nextEnd = getEndTimestamp(nextCheckOutAt);

  if (nextEnd !== Number.POSITIVE_INFINITY && nextEnd < nextStart) {
    return MESSAGES.CHECK_OUT_EARLY;
  }

  const hasOtherActiveEntry = entries.some(
    (entry) => entry.id !== targetEntryId && entry.checkOutAt === null
  );

  if (nextCheckOutAt === null && hasOtherActiveEntry) {
    return MESSAGES.ACTIVE_CONFLICT;
  }

  const overlapsAnotherEntry = entries.some((entry) => {
    if (entry.id === targetEntryId) {
      return false;
    }

    const otherStart = toTimestamp(entry.checkInAt);
    const otherEnd = getEndTimestamp(entry.checkOutAt);

    return intervalsOverlap(nextStart, nextEnd, otherStart, otherEnd);
  });

  if (overlapsAnotherEntry) {
    return MESSAGES.OVERLAP_CONFLICT;
  }

  return null;
}

export async function getInitialState() {
  const entries = await readEntries();
  return {
    entries,
    activeEntry: findActiveEntry(entries),
  };
}

export async function getViewState(entries, message) {
  return buildResult(entries, message || MESSAGES.READY);
}

export async function checkIn() {
  try {
    const entries = await readEntries();
    const activeEntry = findActiveEntry(entries);

    if (activeEntry) {
      return buildResult(entries, MESSAGES.CHECK_IN_BLOCKED);
    }

    const newEntry = createTimeEntry();
    return buildResult([newEntry, ...entries], MESSAGES.CHECKED_IN, true);
  } catch (error) {
    const entries = await readEntries().catch(() => []);
    return buildResult(entries, MESSAGES.CHECK_IN_ERROR);
  }
}

export async function checkOut() {
  try {
    const entries = await readEntries();
    const activeEntry = findActiveEntry(entries);

    if (!activeEntry) {
      return buildResult(entries, MESSAGES.CHECK_OUT_BLOCKED);
    }

    const updatedEntries = entries.map((entry) =>
      entry.id === activeEntry.id
        ? {
            ...entry,
            checkOutAt: new Date().toISOString(),
          }
        : entry
    );

    return buildResult(updatedEntries, MESSAGES.CHECKED_OUT, true);
  } catch (error) {
    const entries = await readEntries().catch(() => []);
    return buildResult(entries, MESSAGES.CHECK_OUT_ERROR);
  }
}

export async function updateEntryTimes(entryId, nextCheckInAt, nextCheckOutAt) {
  try {
    const entries = await readEntries();
    const targetEntry = entries.find((entry) => entry.id === entryId);

    if (!targetEntry) {
      return buildResult(entries, MESSAGES.UPDATE_NOT_FOUND);
    }

    const validationMessage = validateEditTimes(
      entries,
      entryId,
      nextCheckInAt,
      nextCheckOutAt
    );

    if (validationMessage) {
      return buildResult(entries, validationMessage);
    }

    const updatedEntries = entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            checkInAt: nextCheckInAt,
            checkOutAt: nextCheckOutAt,
          }
        : entry
    );

    return buildResult(updatedEntries, MESSAGES.UPDATE_SUCCESS, true);
  } catch (error) {
    const entries = await readEntries().catch(() => []);
    return buildResult(entries, MESSAGES.UPDATE_ERROR);
  }
}
