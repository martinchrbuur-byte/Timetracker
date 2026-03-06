import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { webcrypto } from "node:crypto";
import { changePassword } from "../../src/services/authService.js";
import {
  saveAuthSession,
  savePasswordCredential,
  verifyPasswordCredential,
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

function createJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();
  globalThis.window = {
    TRACKER_CONFIG: {
      persistence: {
        provider: "local",
      },
    },
  };

  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      configurable: true,
    });
  }

  saveAuthSession({
    access_token: "session-token",
    user: {
      id: "user-1",
      email: "user@example.com",
    },
  });
});

test("changePassword rejects confirmation mismatch", async () => {
  await savePasswordCredential("user-1", "Oldpass123");

  await assert.rejects(
    () => changePassword("Oldpass123", "Newpass123", "Otherpass123"),
    /do not match/i
  );
});

test("changePassword rejects weak new password", async () => {
  await savePasswordCredential("user-1", "Oldpass123");

  await assert.rejects(() => changePassword("Oldpass123", "short", "short"), /at least 8/i);
});

test("changePassword rejects invalid current password", async () => {
  await savePasswordCredential("user-1", "Oldpass123");

  await assert.rejects(
    () => changePassword("Wrongpass1", "Newpass123", "Newpass123"),
    /current password is incorrect/i
  );
});

test("changePassword updates hashed password on success", async () => {
  await savePasswordCredential("user-1", "Oldpass123");

  const result = await changePassword("Oldpass123", "Newpass123", "Newpass123");

  assert.equal(result.message, "Password changed successfully.");
  assert.equal(await verifyPasswordCredential("user-1", "Newpass123"), true);
  assert.equal(await verifyPasswordCredential("user-1", "Oldpass123"), false);
});

test("changePassword in supabase mode calls token and update endpoints", async () => {
  globalThis.window.TRACKER_CONFIG.persistence = {
    provider: "supabase",
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
  };

  const fetchCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    if (String(url).includes("/auth/v1/token?grant_type=password")) {
      return createJsonResponse(200, {
        access_token: "reauth-token",
        refresh_token: "refresh-token",
        token_type: "bearer",
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      });
    }

    if (String(url).includes("/auth/v1/user")) {
      return createJsonResponse(200, {
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      });
    }

    return createJsonResponse(404, {
      message: "Not found",
    });
  };

  const result = await changePassword("Oldpass123", "Newpass123", "Newpass123");

  assert.equal(result.message, "Password changed successfully.");
  assert.equal(fetchCalls.length, 2);
  assert.ok(fetchCalls[0].url.includes("/auth/v1/token?grant_type=password"));
  assert.ok(fetchCalls[1].url.includes("/auth/v1/user"));
});

test("changePassword in supabase mode surfaces reauthentication requirement", async () => {
  globalThis.window.TRACKER_CONFIG.persistence = {
    provider: "supabase",
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
  };

  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/token?grant_type=password")) {
      return createJsonResponse(200, {
        access_token: "reauth-token",
        refresh_token: "refresh-token",
        token_type: "bearer",
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      });
    }

    return createJsonResponse(400, {
      message: "Secure password change requires reauthentication nonce",
    });
  };

  await assert.rejects(
    () => changePassword("Oldpass123", "Newpass123", "Newpass123"),
    /requires reauthentication/i
  );
});
