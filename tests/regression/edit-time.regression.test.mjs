import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { checkIn, checkOut, updateEntryTimes } from "../../src/services/timeEntryService.js";
import { STORAGE_KEY } from "../../src/services/storageService.js";

const FIXTURE_TIMES = {
  DAY_START: "2026-03-04T08:00:00.000Z",
  DAY_END: "2026-03-04T12:00:00.000Z",
  INVALID_START: "2026-03-04T13:00:00.000Z",
  INVALID_END: "2026-03-04T11:00:00.000Z",
};

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function seedEntries(entries) {
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();
});

test("1) checkIn creates active session", async () => {
  const result = await checkIn();

  assert.ok(result.activeEntry);
  assert.equal(result.message, "Checked in successfully.");
});

test("2) checkOut clears active session", async () => {
  await checkIn();
  const result = await checkOut();

  assert.equal(result.activeEntry, null);
  assert.equal(result.message, "Checked out successfully.");
});

test("3) valid edit updates session times", async () => {
  const checkedIn = await checkIn();
  const entryId = checkedIn.activeEntry.id;

  const result = await updateEntryTimes(
    entryId,
    FIXTURE_TIMES.DAY_START,
    FIXTURE_TIMES.DAY_END
  );

  const updated = result.entries.find((entry) => entry.id === entryId);
  assert.equal(result.message, "Session times updated successfully.");
  assert.equal(updated.checkInAt, FIXTURE_TIMES.DAY_START);
  assert.equal(updated.checkOutAt, FIXTURE_TIMES.DAY_END);
});

test("4) rejects checkOut earlier than checkIn", async () => {
  const checkedIn = await checkIn();
  const entryId = checkedIn.activeEntry.id;

  const result = await updateEntryTimes(
    entryId,
    FIXTURE_TIMES.INVALID_START,
    FIXTURE_TIMES.INVALID_END
  );

  assert.equal(result.message, "Check-out cannot be earlier than check-in.");
});

test("5) rejects overlapping edited interval", async () => {
  seedEntries([
    {
      id: "a",
      checkInAt: "2026-03-04T08:00:00.000Z",
      checkOutAt: "2026-03-04T10:00:00.000Z",
    },
    {
      id: "b",
      checkInAt: "2026-03-04T11:00:00.000Z",
      checkOutAt: "2026-03-04T13:00:00.000Z",
    },
  ]);

  const result = await updateEntryTimes(
    "b",
    "2026-03-04T09:30:00.000Z",
    "2026-03-04T12:00:00.000Z"
  );

  assert.equal(result.message, "Cannot save: session overlaps another entry.");
});

test("6) allows setting one entry active when no other active exists", async () => {
  seedEntries([
    {
      id: "a",
      checkInAt: "2026-03-04T08:00:00.000Z",
      checkOutAt: "2026-03-04T10:00:00.000Z",
    },
    {
      id: "b",
      checkInAt: "2026-03-04T11:00:00.000Z",
      checkOutAt: "2026-03-04T13:00:00.000Z",
    },
  ]);

  const result = await updateEntryTimes("b", "2026-03-04T13:30:00.000Z", null);

  assert.equal(result.message, "Session times updated successfully.");
  assert.ok(result.activeEntry);
  assert.equal(result.activeEntry.id, "b");
});

test("7) rejects second active session", async () => {
  seedEntries([
    {
      id: "a",
      checkInAt: "2026-03-04T08:00:00.000Z",
      checkOutAt: "2026-03-04T10:00:00.000Z",
    },
    {
      id: "b",
      checkInAt: "2026-03-04T11:00:00.000Z",
      checkOutAt: null,
    },
  ]);

  const result = await updateEntryTimes("a", "2026-03-04T07:30:00.000Z", null);

  assert.equal(
    result.message,
    "Cannot set active session: another active session already exists."
  );
});