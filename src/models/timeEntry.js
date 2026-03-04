// Canonical time entry contract for storage and service layers.
export function isTimeEntryRecord(value) {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.checkInAt === "string" &&
      (typeof value.checkOutAt === "string" || value.checkOutAt === null) &&
      (typeof value.userId === "string" || typeof value.userId === "undefined")
  );
}

export function normalizeTimeEntry(entry) {
  return {
    ...entry,
    userId: typeof entry.userId === "string" ? entry.userId : "default",
  };
}

export function createTimeEntry(checkInAt = new Date().toISOString(), userId = "default") {
  return {
    id: crypto.randomUUID(),
    checkInAt,
    checkOutAt: null,
    userId,
  };
}
