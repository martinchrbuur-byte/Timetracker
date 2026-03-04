import { getAppConfig, isSupabasePersistenceEnabled } from "../config/appConfig.js";

const AUTH_SESSION_STORAGE_KEY = "workHours.supabase.auth.v1";

function buildAuthHeaders() {
  const {
    persistence: { supabaseAnonKey },
  } = getAppConfig();

  return {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json",
  };
}

function buildAuthenticatedHeaders(accessToken) {
  return {
    ...buildAuthHeaders(),
    Authorization: `Bearer ${accessToken}`,
  };
}

function normalizeSession(session) {
  if (!session || typeof session !== "object") {
    return null;
  }

  const accessToken = session.access_token || session.accessToken;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: session.refresh_token || null,
    token_type: session.token_type || "bearer",
    expires_in: typeof session.expires_in === "number" ? session.expires_in : null,
    expires_at: typeof session.expires_at === "number" ? session.expires_at : null,
    user: session.user || null,
  };
}

function persistSession(session) {
  if (typeof localStorage === "undefined") {
    return;
  }

  const normalized = normalizeSession(session);
  if (!normalized) {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalized));
}

function readStoredSession() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeSession(JSON.parse(raw));
  } catch (error) {
    return null;
  }
}

function clearStoredSession() {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

async function readErrorMessage(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  const explicitMessage =
    payload?.msg || payload?.message || payload?.error_description || payload?.error;

  return explicitMessage || `Supabase auth request failed with status ${response.status}`;
}

export async function signUpWithEmailPassword(email, password, metadata = {}) {
  if (!isSupabasePersistenceEnabled()) {
    throw new Error("Supabase persistence is not enabled.");
  }

  const {
    persistence: { supabaseUrl },
  } = getAppConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      email,
      password,
      data: metadata,
    }),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);
    throw new Error(errorMessage);
  }

  const payload = await response.json();
  if (payload.session) {
    persistSession(payload.session);
  }

  return {
    user: payload.user || null,
    session: payload.session || null,
  };
}

export async function signInWithEmailPassword(email, password) {
  if (!isSupabasePersistenceEnabled()) {
    throw new Error("Supabase persistence is not enabled.");
  }

  const {
    persistence: { supabaseUrl },
  } = getAppConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);
    throw new Error(errorMessage);
  }

  const payload = await response.json();
  persistSession(payload);

  return {
    user: payload.user || null,
    session: normalizeSession(payload),
  };
}

export async function signOutCurrentSession() {
  if (!isSupabasePersistenceEnabled()) {
    return;
  }

  const {
    persistence: { supabaseUrl },
  } = getAppConfig();

  const session = readStoredSession();
  const accessToken = session?.access_token;

  if (accessToken) {
    const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: buildAuthenticatedHeaders(accessToken),
    });

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      throw new Error(errorMessage);
    }
  }

  clearStoredSession();
}

export async function restoreSignedInUserFromSession() {
  if (!isSupabasePersistenceEnabled()) {
    return null;
  }

  const {
    persistence: { supabaseUrl },
  } = getAppConfig();

  const session = readStoredSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: buildAuthenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    clearStoredSession();
    return null;
  }

  const user = await response.json();
  const nextSession = {
    ...session,
    user,
  };

  persistSession(nextSession);

  return {
    user,
    session: nextSession,
  };
}