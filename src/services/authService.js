import { getAppConfig, isSupabasePersistenceEnabled } from "../config/appConfig.js";
import {
  clearPasswordCredential,
  clearAuthSession,
  loadAuthSession,
  savePasswordCredential,
  saveAuthSession,
  upsertAuthUserProfile,
  verifyPasswordCredential,
} from "./storageService.js";

const PASSWORD_RULES = {
  minLength: 8,
  letter: /[A-Za-z]/,
  digit: /\d/,
};

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePassword(value) {
  return typeof value === "string" ? value : "";
}

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

async function authFetch(path, options = {}, accessToken = "") {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseAuthConfig();

  return fetch(`${supabaseUrl}/auth/v1/${path}`, {
    ...options,
    headers: buildAuthHeaders(supabaseAnonKey, accessToken),
  });
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

function normalizeAuthError(error, fallbackMessage) {
  const message = error?.message || "";

  if (/invalid login credentials|invalid credentials|invalid grant/i.test(message)) {
    return fallbackMessage;
  }

  return message || fallbackMessage;
}

function isSupabaseReauthenticationRequiredError(error) {
  const message = error?.message || "";
  return /reauth|nonce|otp|secure password change/i.test(message);
}

function validateNewPassword(newPassword, confirmPassword, currentPassword) {
  if (!currentPassword) {
    throw new Error("Current password is required.");
  }

  if (!newPassword) {
    throw new Error("New password is required.");
  }

  if (newPassword.length < PASSWORD_RULES.minLength) {
    throw new Error("New password must be at least 8 characters.");
  }

  if (!PASSWORD_RULES.letter.test(newPassword) || !PASSWORD_RULES.digit.test(newPassword)) {
    throw new Error("New password must contain at least one letter and one number.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirmation do not match.");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from current password.");
  }
}

async function verifyCurrentPasswordForSupabase(email, currentPassword) {
  const normalizedEmail = normalizeEmail(email);

  const response = await authFetch("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({
      email: normalizedEmail,
      password: currentPassword,
    }),
  });

  await assertOk(response);
  const payload = await response.json();
  const session = normalizeSessionFromAuthResponse(payload);

  if (!session) {
    throw new Error("Current password is incorrect.");
  }

  return {
    session,
    user: payload.user || null,
  };
}

async function updateSupabasePassword(accessToken, newPassword) {
  const response = await authFetch(
    "user",
    {
      method: "PUT",
      body: JSON.stringify({
        password: newPassword,
      }),
    },
    accessToken
  );

  await assertOk(response);
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
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (normalizedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const response = await authFetch("signup", {
    method: "POST",
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
  await savePasswordCredential(payload.user.id, normalizedPassword).catch(() => {});

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
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!normalizedPassword) {
    throw new Error("Password is required.");
  }

  const response = await authFetch("token?grant_type=password", {
    method: "POST",
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
  if (payload?.user?.id) {
    await savePasswordCredential(payload.user.id, normalizedPassword).catch(() => {});
  }
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
  const userId = session?.user?.id || "";
  clearAuthSession();
  if (userId) {
    clearPasswordCredential(userId);
  }

  if (!session?.access_token) {
    return;
  }

  const response = await authFetch(
    "logout",
    {
      method: "POST",
    },
    session.access_token
  );

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

  const response = await authFetch(
    "user",
    {
      method: "GET",
    },
    session.access_token
  );

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

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  const normalizedCurrentPassword = normalizePassword(currentPassword);
  const normalizedNewPassword = normalizePassword(newPassword);
  const normalizedConfirmPassword = normalizePassword(confirmPassword);

  validateNewPassword(
    normalizedNewPassword,
    normalizedConfirmPassword,
    normalizedCurrentPassword
  );

  const currentSession = loadAuthSession();
  const userId = currentSession?.user?.id || "";
  const authEmail = currentSession?.user?.email || "";

  if (!userId) {
    throw new Error("You must be signed in to change password.");
  }

  if (isSupabasePersistenceEnabled()) {
    if (!authEmail) {
      throw new Error("Cannot change password: account email is missing.");
    }

    try {
      const { session: reauthSession, user } = await verifyCurrentPasswordForSupabase(
        authEmail,
        normalizedCurrentPassword
      );
      await updateSupabasePassword(reauthSession.access_token, normalizedNewPassword);

      saveAuthSession({
        ...reauthSession,
        user: user || currentSession.user,
      });
      await savePasswordCredential(userId, normalizedNewPassword).catch(() => {});

      return {
        message: "Password changed successfully.",
      };
    } catch (error) {
      if (isSupabaseReauthenticationRequiredError(error)) {
        throw new Error(
          "Supabase requires reauthentication for password change. Sign out and sign in again, then retry."
        );
      }

      throw new Error(normalizeAuthError(error, "Current password is incorrect."));
    }
  }

  const hasValidCurrentPassword = await verifyPasswordCredential(userId, normalizedCurrentPassword);
  if (!hasValidCurrentPassword) {
    throw new Error("Current password is incorrect.");
  }

  await savePasswordCredential(userId, normalizedNewPassword);

  return {
    message: "Password changed successfully.",
  };
}
