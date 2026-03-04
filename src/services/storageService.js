const STORAGE_KEY = "workHours.entries.v1";

export function loadEntriesFromStorage() {
  try {
    // Parse stored JSON and validate shape to avoid runtime failures.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.checkInAt === "string" &&
        (typeof entry.checkOutAt === "string" || entry.checkOutAt === null)
    );
  } catch (error) {
    return [];
  }
}

export function saveEntriesToStorage(entries) {
  // Persist whole list as a single versioned payload.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
