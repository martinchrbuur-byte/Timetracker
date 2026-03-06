import { createTimeEntry } from "../models/timeEntry.js";
import {
  deleteEntryFromStorage,
  loadEntriesFromStorage,
  saveEntriesToStorage,
} from "./storageService.js";
import {
  formatDateOnly,
  formatTimeOnly,
  getRangeBounds,
  isValidDateTimeString,
  toLocalDateKey,
  toTimestamp,
} from "../shared/dateTime.js";

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
  DELETE_SUCCESS: "Session deleted successfully.",
  DELETE_ERROR: "Delete failed due to a storage error.",
  DELETE_NOT_FOUND: "Cannot delete: session not found.",
  INVALID_CHECK_IN: "Invalid check-in date/time.",
  INVALID_CHECK_OUT: "Invalid check-out date/time.",
  CHECK_OUT_EARLY: "Check-out cannot be earlier than check-in.",
  ACTIVE_CONFLICT: "Cannot set active session: another active session already exists.",
  OVERLAP_CONFLICT: "Cannot save: session overlaps another entry.",
};

const HISTORIC_RANGES = ["week", "month", "year"];

function sortEntriesByLatestCheckIn(entries) {
  return [...entries].sort(
    (leftEntry, rightEntry) =>
      toTimestamp(rightEntry.checkInAt) - toTimestamp(leftEntry.checkInAt)
  );
}

function findActiveEntry(entries) {
  return entries.find((entry) => entry.checkOutAt === null) || null;
}

function filterEntriesByUser(entries, userId) {
  return entries.filter((entry) => entry.userId === userId);
}

function getEndTimestamp(checkOutAt) {
  return checkOutAt === null ? Number.POSITIVE_INFINITY : toTimestamp(checkOutAt);
}

async function readEntries() {
  const entries = await loadEntriesFromStorage();
  return sortEntriesByLatestCheckIn(entries);
}

async function buildResult(allEntries, userId, message, shouldPersist = false) {
  const sortedAllEntries = sortEntriesByLatestCheckIn(allEntries);

  if (shouldPersist) {
    await saveEntriesToStorage(sortedAllEntries);
  }

  const userEntries = sortEntriesByLatestCheckIn(filterEntriesByUser(sortedAllEntries, userId));

  return {
    entries: userEntries,
    activeEntry: findActiveEntry(userEntries),
    message,
  };
}

async function runWithFallback(userId, fallbackMessage, operation) {
  try {
    const allEntries = await readEntries();
    return await operation(allEntries);
  } catch (error) {
    const allEntries = await readEntries().catch(() => []);
    return buildResult(allEntries, userId, fallbackMessage);
  }
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

export async function getInitialState(userId = "default") {
  const allEntries = await readEntries();
  const entries = sortEntriesByLatestCheckIn(filterEntriesByUser(allEntries, userId));
  return {
    entries,
    activeEntry: findActiveEntry(entries),
  };
}

export async function getViewState(entries, userId, message) {
  return buildResult(entries, userId, message || MESSAGES.READY);
}

export async function checkIn(userId = "default") {
  return runWithFallback(userId, MESSAGES.CHECK_IN_ERROR, (allEntries) => {
    const userEntries = filterEntriesByUser(allEntries, userId);
    const activeEntry = findActiveEntry(userEntries);

    if (activeEntry) {
      return buildResult(allEntries, userId, MESSAGES.CHECK_IN_BLOCKED);
    }

    const newEntry = createTimeEntry(new Date().toISOString(), userId);
    return buildResult([newEntry, ...allEntries], userId, MESSAGES.CHECKED_IN, true);
  });
}

export async function checkOut(userId = "default") {
  return runWithFallback(userId, MESSAGES.CHECK_OUT_ERROR, (allEntries) => {
    const userEntries = filterEntriesByUser(allEntries, userId);
    const activeEntry = findActiveEntry(userEntries);

    if (!activeEntry) {
      return buildResult(allEntries, userId, MESSAGES.CHECK_OUT_BLOCKED);
    }

    const updatedEntries = allEntries.map((entry) =>
      entry.id === activeEntry.id
        ? {
            ...entry,
            checkOutAt: new Date().toISOString(),
          }
        : entry
    );

    return buildResult(updatedEntries, userId, MESSAGES.CHECKED_OUT, true);
  });
}

export async function updateEntryTimes(entryId, nextCheckInAt, nextCheckOutAt, userId = "default") {
  return runWithFallback(userId, MESSAGES.UPDATE_ERROR, (allEntries) => {
    const userEntries = filterEntriesByUser(allEntries, userId);
    const targetEntry = userEntries.find((entry) => entry.id === entryId);

    if (!targetEntry) {
      return buildResult(allEntries, userId, MESSAGES.UPDATE_NOT_FOUND);
    }

    const validationMessage = validateEditTimes(
      userEntries,
      entryId,
      nextCheckInAt,
      nextCheckOutAt
    );

    if (validationMessage) {
      return buildResult(allEntries, userId, validationMessage);
    }

    const updatedEntries = allEntries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            checkInAt: nextCheckInAt,
            checkOutAt: nextCheckOutAt,
          }
        : entry
    );

    return buildResult(updatedEntries, userId, MESSAGES.UPDATE_SUCCESS, true);
  });
}

export async function deleteEntry(entryId, userId = "default") {
  return runWithFallback(userId, MESSAGES.DELETE_ERROR, async (allEntries) => {
    const userEntries = filterEntriesByUser(allEntries, userId);
    const targetEntry = userEntries.find((entry) => entry.id === entryId);

    if (!targetEntry) {
      return buildResult(allEntries, userId, MESSAGES.DELETE_NOT_FOUND);
    }

    await deleteEntryFromStorage(entryId);
    const updatedEntries = allEntries.filter((entry) => entry.id !== entryId);
    return buildResult(updatedEntries, userId, MESSAGES.DELETE_SUCCESS);
  });
}

function normalizeHistoricRange(range) {
  return HISTORIC_RANGES.includes(range) ? range : "week";
}

function toStartOfLocalDayTimestamp(localDate) {
  return new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    0,
    0,
    0,
    0
  ).getTime();
}

function toEndOfLocalDayTimestamp(localDate) {
  return new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
}

function getResolvedEndTimestamp(entry, nowTimestamp, nowDateKey) {
  if (entry.checkOutAt) {
    return toTimestamp(entry.checkOutAt);
  }

  const entryDateKey = toLocalDateKey(entry.checkInAt);
  if (entryDateKey === nowDateKey) {
    return nowTimestamp;
  }

  const entryDate = new Date(toTimestamp(entry.checkInAt));
  return toEndOfLocalDayTimestamp(entryDate);
}

function toDurationMinutes(startTimestamp, endTimestamp) {
  if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
    return 0;
  }

  if (endTimestamp <= startTimestamp) {
    return 0;
  }

  return Math.max(0, Math.floor((endTimestamp - startTimestamp) / 60000));
}

function averageMinutes(rows) {
  if (rows.length === 0) {
    return 0;
  }

  const total = rows.reduce((sum, row) => sum + row.totalMinutes, 0);
  return Math.floor(total / rows.length);
}

function buildTrendSummary(rows) {
  if (rows.length < 2) {
    return {
      direction: "stable",
      deltaMinutes: 0,
      firstHalfAverageMinutes: rows.length === 1 ? rows[0].totalMinutes : 0,
      secondHalfAverageMinutes: rows.length === 1 ? rows[0].totalMinutes : 0,
    };
  }

  const midpoint = Math.floor(rows.length / 2);
  const firstHalfRows = rows.slice(0, midpoint);
  const secondHalfRows = rows.slice(midpoint);

  const firstHalfAverageMinutes = averageMinutes(firstHalfRows);
  const secondHalfAverageMinutes = averageMinutes(secondHalfRows);
  const deltaMinutes = secondHalfAverageMinutes - firstHalfAverageMinutes;

  const direction =
    deltaMinutes > 20 ? "increasing" : deltaMinutes < -20 ? "decreasing" : "stable";

  return {
    direction,
    deltaMinutes,
    firstHalfAverageMinutes,
    secondHalfAverageMinutes,
  };
}

export function buildHistoricStartEndOverview(entries, dateKey, range, nowIso = new Date().toISOString()) {
  const normalizedRange = normalizeHistoricRange(range);
  const bounds = getRangeBounds(dateKey, normalizedRange);

  if (!bounds) {
    return {
      range: normalizedRange,
      rows: [],
      periodStartLabel: "--",
      periodEndLabel: "--",
    };
  }

  const nowTimestamp = toTimestamp(nowIso);
  const nowDateKey = toLocalDateKey(nowIso);
  const rangeStartTimestamp = toStartOfLocalDayTimestamp(bounds.start);
  const rangeEndTimestamp = toEndOfLocalDayTimestamp(bounds.end);
  const rowsByDate = new Map();

  entries.forEach((entry) => {
    const startTimestamp = toTimestamp(entry.checkInAt);
    if (!Number.isFinite(startTimestamp)) {
      return;
    }

    const startDateKey = toLocalDateKey(entry.checkInAt);
    const startDate = new Date(startTimestamp);
    const dayStartTimestamp = toStartOfLocalDayTimestamp(startDate);

    if (dayStartTimestamp < rangeStartTimestamp || dayStartTimestamp > rangeEndTimestamp) {
      return;
    }

    const endTimestamp = getResolvedEndTimestamp(entry, nowTimestamp, nowDateKey);
    if (!Number.isFinite(endTimestamp)) {
      return;
    }

    const existing = rowsByDate.get(startDateKey) || {
      dateKey: startDateKey,
      firstStartTimestamp: startTimestamp,
      lastEndTimestamp: endTimestamp,
      sessionCount: 0,
    };

    existing.firstStartTimestamp = Math.min(existing.firstStartTimestamp, startTimestamp);
    existing.lastEndTimestamp = Math.max(existing.lastEndTimestamp, endTimestamp);
    existing.sessionCount += 1;

    rowsByDate.set(startDateKey, existing);
  });

  const sortedRows = Array.from(rowsByDate.values())
    .sort((leftRow, rightRow) => toTimestamp(leftRow.dateKey) - toTimestamp(rightRow.dateKey))
    .map((row) => ({
      dateKey: row.dateKey,
      dateLabel: formatDateOnly(row.firstStartTimestamp),
      startAt: new Date(row.firstStartTimestamp).toISOString(),
      endAt: new Date(row.lastEndTimestamp).toISOString(),
      startLabel: formatTimeOnly(row.firstStartTimestamp),
      endLabel: formatTimeOnly(row.lastEndTimestamp),
      sessionCount: row.sessionCount,
    }));

  const periodStartLabel = formatDateOnly(bounds.start.toISOString());
  const periodEndLabel = formatDateOnly(bounds.end.toISOString());

  return {
    range: normalizedRange,
    rows: sortedRows,
    periodStartLabel,
    periodEndLabel,
  };
}

export function buildHistoricAnalytics(entries, dateKey, range, nowIso = new Date().toISOString()) {
  const normalizedRange = normalizeHistoricRange(range);
  const bounds = getRangeBounds(dateKey, normalizedRange);

  if (!bounds) {
    return {
      range: normalizedRange,
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
    };
  }

  const nowTimestamp = toTimestamp(nowIso);
  const nowDateKey = toLocalDateKey(nowIso);
  const rangeStartTimestamp = toStartOfLocalDayTimestamp(bounds.start);
  const rangeEndTimestamp = toEndOfLocalDayTimestamp(bounds.end);
  const rowsByDate = new Map();

  entries.forEach((entry) => {
    const startTimestamp = toTimestamp(entry.checkInAt);
    if (!Number.isFinite(startTimestamp)) {
      return;
    }

    const startDate = new Date(startTimestamp);
    const dayStartTimestamp = toStartOfLocalDayTimestamp(startDate);
    if (dayStartTimestamp < rangeStartTimestamp || dayStartTimestamp > rangeEndTimestamp) {
      return;
    }

    const endTimestamp = getResolvedEndTimestamp(entry, nowTimestamp, nowDateKey);
    if (!Number.isFinite(endTimestamp)) {
      return;
    }

    const dateKeyForRow = toLocalDateKey(entry.checkInAt);
    const existing = rowsByDate.get(dateKeyForRow) || {
      dateKey: dateKeyForRow,
      dateLabel: formatDateOnly(entry.checkInAt),
      sessionCount: 0,
      totalMinutes: 0,
    };

    existing.totalMinutes += toDurationMinutes(startTimestamp, endTimestamp);
    existing.sessionCount += 1;
    rowsByDate.set(dateKeyForRow, existing);
  });

  const rows = Array.from(rowsByDate.values()).sort(
    (leftRow, rightRow) => toTimestamp(leftRow.dateKey) - toTimestamp(rightRow.dateKey)
  );

  const totalMinutes = rows.reduce((sum, row) => sum + row.totalMinutes, 0);
  const activeDays = rows.filter((row) => row.totalMinutes > 0).length;
  const averageMinutesPerActiveDay = activeDays > 0 ? Math.floor(totalMinutes / activeDays) : 0;
  const peakDay =
    rows.length === 0
      ? null
      : rows.reduce((peak, row) => (row.totalMinutes > peak.totalMinutes ? row : peak), rows[0]);

  return {
    range: normalizedRange,
    rows,
    totalMinutes,
    activeDays,
    averageMinutesPerActiveDay,
    peakDay,
    trend: buildTrendSummary(rows),
    periodStartLabel: formatDateOnly(bounds.start.toISOString()),
    periodEndLabel: formatDateOnly(bounds.end.toISOString()),
  };
}
