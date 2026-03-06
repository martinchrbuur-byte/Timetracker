import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { webcrypto } from "node:crypto";
import { signUp } from "../../src/services/authService.js";
import { loadAuthSession } from "../../src/services/storageService.js";

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

function createSupabaseFetchMock(signupPayload, signupStatus = 200) {
  return async (url, options = {}) => {
    const requestUrl = String(url);

    if (requestUrl.includes("/auth/v1/signup")) {
      return createJsonResponse(signupStatus, signupPayload);
    }

    if (requestUrl.includes("/rest/v1/tracker_users") && options.method === "GET") {
      return createJsonResponse(200, []);
    }

    if (requestUrl.includes("/rest/v1/tracker_users") && options.method === "POST") {
      return createJsonResponse(201, []);
    }

    return createJsonResponse(404, {
      message: "Not found",
    });
  };
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();
  globalThis.window = {
    TRACKER_CONFIG: {
      persistence: {
        provider: "supabase",
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key",
      },
    },
  };

  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      configurable: true,
    });
  }
});

test("signUp creates supabase user and stores session when access token is returned", async () => {
  globalThis.fetch = createSupabaseFetchMock({
    access_token: "access-token",
    refresh_token: "refresh-token",
    token_type: "bearer",
    user: {
      id: "user-1",
      email: "new@example.com",
    },
  });

  const result = await signUp("new@example.com", "Strongpass1");

  assert.equal(result.user?.id, "user-1");
  assert.equal(result.session?.access_token, "access-token");
  assert.equal(loadAuthSession()?.user?.id, "user-1");
});

test("signUp succeeds without session when email confirmation is required", async () => {
  globalThis.fetch = createSupabaseFetchMock({
    user: {
      id: "user-2",
      email: "confirm@example.com",
    },
  });

  const result = await signUp("confirm@example.com", "Strongpass1");

  assert.equal(result.user?.id, "user-2");
  assert.equal(result.session, null);
});

test("signUp maps duplicate email error", async () => {
  globalThis.fetch = async () =>
    createJsonResponse(422, {
      message: "User already registered",
    });

  await assert.rejects(() => signUp("existing@example.com", "Strongpass1"), /already in use/i);
});

test("signUp rejects weak passwords before network request", async () => {
  let wasFetchCalled = false;
  globalThis.fetch = async () => {
    wasFetchCalled = true;
    return createJsonResponse(200, {});
  };

  await assert.rejects(() => signUp("new@example.com", "short1"), /at least 8 characters/i);
  assert.equal(wasFetchCalled, false);
});

test("signUp maps network failures", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(
    () => signUp("new@example.com", "Strongpass1"),
    /network error/i
  );
});
