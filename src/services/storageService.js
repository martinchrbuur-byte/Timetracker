import { isTimeEntryRecord } from "../models/timeEntry.js";

export const STORAGE_KEY = "workHours.entries.v1";

export function loadEntriesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTimeEntryRecord);
  } catch (error) {
    return [];
  }
}

export function saveEntriesToStorage(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
