export function createTimeEntry(checkInAt = new Date().toISOString()) {
  // Creates a new active work session entry.
  return {
    id: crypto.randomUUID(),
    checkInAt,
    checkOutAt: null,
  };
}
