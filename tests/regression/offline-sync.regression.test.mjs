import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  OFFLINE_SYNC_QUEUE_STORAGE_KEY,
  getSyncStatus,
  loadEntriesFromStorage,
  processQueuedOperations,
  saveEntriesToStorage,
} from "../../src/services/storageService.js";

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

function buildEntry(id, checkInAt, checkOutAt = null) {
  return {
    id,
    userId: "default",
    checkInAt,
    checkOutAt,
  };
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      TRACKER_CONFIG: {
        persistence: {
          provider: "supabase",
          supabaseUrl: "https://example.supabase.co",
          supabaseAnonKey: "anon-key",
        },
      },
    },
  });

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      onLine: true,
    },
  });
});

test("offline save queues operation and serves cached entries", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Network unavailable");
  };

  const entries = [buildEntry("e1", "2026-03-06T08:00:00.000Z", "2026-03-06T10:00:00.000Z")];

  await saveEntriesToStorage(entries);

  const queueRaw = globalThis.localStorage.getItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY);
  assert.ok(queueRaw);

  const loadedEntries = await loadEntriesFromStorage();
  assert.equal(loadedEntries.length, 1);
  assert.equal(loadedEntries[0].id, "e1");

  const syncStatus = getSyncStatus();
  assert.equal(syncStatus.state, "offline-pending");
  assert.equal(syncStatus.pendingCount, 1);
});

test("queued operations flush when connectivity recovers", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Network unavailable");
  };

  const entries = [buildEntry("e2", "2026-03-06T11:00:00.000Z", "2026-03-06T12:00:00.000Z")];

  await saveEntriesToStorage(entries);
  assert.equal(getSyncStatus().pendingCount, 1);

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => [],
  });

  const finalStatus = await processQueuedOperations();

  assert.equal(finalStatus.pendingCount, 0);
  assert.equal(finalStatus.state, "online");
});
