// Canonical time entry contract for storage and service layers.
export function isTimeEntryRecord(value) {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.checkInAt === "string" &&
      (typeof value.checkOutAt === "string" || value.checkOutAt === null)
  );
}

export function createTimeEntry(checkInAt = new Date().toISOString()) {
  return {
    id: crypto.randomUUID(),
    checkInAt,
    checkOutAt: null,
  };
}
