import { getAppConfig, isSupabasePersistenceEnabled } from "../config/appConfig.js";
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  upsertAuthUserProfile,
} from "./storageService.js";

function getSupabaseAuthConfig() {
  if (!isSupabasePersistenceEnabled()) {
    throw new Error("Supabase persistence is not enabled.");
  }

  const {
    persistence: { supabaseUrl, supabaseAnonKey },
  } = getAppConfig();

  return { supabaseUrl, supabaseAnonKey };
}

function buildAuthHeaders(anonKey, accessToken = "") {
  const headers = {
    apikey: anonKey,
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function readErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload?.msg || payload?.message || payload?.error_description || payload?.error;
  } catch (error) {
    return "";
  }
}

async function assertOk(response) {
  if (response.ok) {
    return;
  }

  const message = await readErrorMessage(response);
  throw new Error(message || `Supabase auth request failed with status ${response.status}`);
}

function normalizeSessionFromAuthResponse(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (typeof payload.access_token !== "string" || payload.access_token.length === 0) {
    return null;
  }

  return {
    access_token: payload.access_token,
    refresh_token: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    token_type: typeof payload.token_type === "string" ? payload.token_type : "bearer",
    expires_in: typeof payload.expires_in === "number" ? payload.expires_in : null,
    expires_at: typeof payload.expires_at === "number" ? payload.expires_at : null,
    user: payload.user && typeof payload.user === "object" ? payload.user : null,
  };
}

export async function signUp(email, password) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (normalizedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseAuthConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: buildAuthHeaders(supabaseAnonKey),
    body: JSON.stringify({
      email: normalizedEmail,
      password: normalizedPassword,
    }),
  });

  await assertOk(response);
  const payload = await response.json();

  if (!payload?.user?.id) {
    throw new Error("Sign up succeeded, but no user id was returned.");
  }

  await upsertAuthUserProfile(payload.user.id, normalizedEmail);

  const session = normalizeSessionFromAuthResponse(payload);
  if (session) {
    saveAuthSession(session);
  }

  return {
    user: payload.user,
    session,
  };
}

export async function signIn(email, password) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!normalizedPassword) {
    throw new Error("Password is required.");
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseAuthConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: buildAuthHeaders(supabaseAnonKey),
    body: JSON.stringify({
      email: normalizedEmail,
      password: normalizedPassword,
    }),
  });

  await assertOk(response);
  const payload = await response.json();
  const session = normalizeSessionFromAuthResponse(payload);

  if (!session) {
    throw new Error("Sign in succeeded, but no session was returned.");
  }

  saveAuthSession(session);
  await upsertAuthUserProfile(payload?.user?.id || "", payload?.user?.email || normalizedEmail).catch(
    () => {}
  );

  return {
    user: payload.user || null,
    session,
  };
}

export async function signOut() {
  const session = loadAuthSession();
  clearAuthSession();

  if (!session?.access_token) {
    return;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseAuthConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: "POST",
    headers: buildAuthHeaders(supabaseAnonKey, session.access_token),
  });

  await assertOk(response);
}

export async function restoreSession() {
  const session = loadAuthSession();
  if (!session?.access_token) {
    return {
      user: null,
      session: null,
    };
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseAuthConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: buildAuthHeaders(supabaseAnonKey, session.access_token),
  });

  if (!response.ok) {
    clearAuthSession();
    return {
      user: null,
      session: null,
    };
  }

  const user = await response.json();
  const restoredSession = {
    ...session,
    user,
  };

  saveAuthSession(restoredSession);
  await upsertAuthUserProfile(user?.id || "", user?.email || "").catch(() => {});

  return {
    user,
    session: restoredSession,
  };
}
