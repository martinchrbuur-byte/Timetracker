import { isTimeEntryRecord, normalizeTimeEntry } from "../models/timeEntry.js";
import {
  isUserProfileRecord,
  normalizeUserProfiles,
  DEFAULT_USER,
} from "../models/userProfile.js";
import { getAppConfig, isSupabasePersistenceEnabled } from "../config/appConfig.js";

export const STORAGE_KEY = "workHours.entries.v1";
export const USERS_STORAGE_KEY = "workHours.users.v1";
export const AUTH_SESSION_STORAGE_KEY = "workHours.auth.session.v1";
const SUPABASE_TABLE = "time_entries";
const SUPABASE_USERS_TABLE = "tracker_users";

const ERROR_CODES = {
  COLUMN_UNDEFINED: "42703",
  TABLE_NOT_FOUND: "PGRST205",
};

function mapSupabaseRowToEntry(row) {
  return {
    id: row.id,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    userId: typeof row.user_id === "string" ? row.user_id : "default",
  };
}

function mapEntryToSupabaseRow(entry) {
  return {
    id: entry.id,
    check_in_at: entry.checkInAt,
    check_out_at: entry.checkOutAt,
    user_id: entry.userId,
  };
}

function mapSupabaseRowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function mapUserToSupabaseRow(user) {
  return {
    id: user.id,
    name: user.name,
    created_at: user.createdAt,
  };
}

async function supabaseRequest(path, options = {}) {
  const {
    persistence: { supabaseUrl, supabaseAnonKey },
  } = getAppConfig();

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorBody = null;

    try {
      errorBody = await response.json();
    } catch (error) {
      errorBody = null;
    }

    const messageFromBody =
      errorBody?.message || errorBody?.msg || errorBody?.error_description || errorBody?.error;

    const error = new Error(
      messageFromBody || `Supabase request failed with status ${response.status}`
    );

    error.status = response.status;
    error.code = typeof errorBody?.code === "string" ? errorBody.code : null;
    error.details = errorBody?.details || null;
    throw error;
  }

  return response;
}

function isMissingTimeEntryUserIdError(error) {
  if (!error || error.code !== ERROR_CODES.COLUMN_UNDEFINED) {
    return false;
  }

  return typeof error.message === "string" && error.message.includes("time_entries.user_id");
}

function isMissingTrackerUsersTableError(error) {
  if (!error || error.code !== ERROR_CODES.TABLE_NOT_FOUND) {
    return false;
  }

  return (
    typeof error.message === "string" &&
    error.message.includes(`public.${SUPABASE_USERS_TABLE}`)
  );
}

async function loadEntriesFromSupabase() {
  let rows = [];

  try {
    const query = `${SUPABASE_TABLE}?select=id,check_in_at,check_out_at,user_id&order=check_in_at.desc`;
    const response = await supabaseRequest(query, { method: "GET" });
    rows = await response.json();
  } catch (error) {
    if (!isMissingTimeEntryUserIdError(error)) {
      throw error;
    }

    const legacyQuery = `${SUPABASE_TABLE}?select=id,check_in_at,check_out_at&order=check_in_at.desc`;
    const response = await supabaseRequest(legacyQuery, { method: "GET" });
    rows = await response.json();
  }

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(mapSupabaseRowToEntry).filter(isTimeEntryRecord).map(normalizeTimeEntry);
}

async function saveEntriesToSupabase(entries) {
  const payload = entries
    .filter(isTimeEntryRecord)
    .map(normalizeTimeEntry)
    .map(mapEntryToSupabaseRow);

  try {
    await supabaseRequest(`${SUPABASE_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!isMissingTimeEntryUserIdError(error)) {
      throw error;
    }

    const legacyPayload = payload.map(({ user_id, ...rowWithoutUserId }) => rowWithoutUserId);

    await supabaseRequest(`${SUPABASE_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(legacyPayload),
    });
  }
}

async function loadUsersFromSupabase() {
  let rows = [];

  try {
    const query = `${SUPABASE_USERS_TABLE}?select=id,name,created_at&order=created_at.asc`;
    const response = await supabaseRequest(query, { method: "GET" });
    rows = await response.json();
  } catch (error) {
    if (isMissingTrackerUsersTableError(error)) {
      return [DEFAULT_USER];
    }

    throw error;
  }

  if (!Array.isArray(rows)) {
    return [DEFAULT_USER];
  }

  const users = rows.map(mapSupabaseRowToUser).filter(isUserProfileRecord);
  return normalizeUserProfiles(users);
}

async function saveUsersToSupabase(users) {
  const payload = normalizeUserProfiles(users)
    .filter(isUserProfileRecord)
    .map(mapUserToSupabaseRow);

  try {
    await supabaseRequest(`${SUPABASE_USERS_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (isMissingTrackerUsersTableError(error)) {
      return;
    }

    throw error;
  }
}

function loadEntriesFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTimeEntryRecord).map(normalizeTimeEntry);
  } catch (error) {
    return [];
  }
}

function saveEntriesToLocalStorage(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadUsersFromLocalStorage() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      return [DEFAULT_USER];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [DEFAULT_USER];
    }

    return normalizeUserProfiles(parsed.filter(isUserProfileRecord));
  } catch (error) {
    return [DEFAULT_USER];
  }
}

function saveUsersToLocalStorage(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalizeUserProfiles(users)));
}

function normalizeAuthSession(session) {
  if (!session || typeof session !== "object") {
    return null;
  }

  const accessToken = session.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return null;
  }

  return {
    access_token: session.access_token,
    refresh_token: typeof session.refresh_token === "string" ? session.refresh_token : null,
    token_type: typeof session.token_type === "string" ? session.token_type : "bearer",
    expires_in: typeof session.expires_in === "number" ? session.expires_in : null,
    expires_at: typeof session.expires_at === "number" ? session.expires_at : null,
    user: session.user && typeof session.user === "object" ? session.user : null,
  };
}

function saveAuthSessionToLocalStorage(session) {
  const normalized = normalizeAuthSession(session);

  if (!normalized) {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalized));
}

function loadAuthSessionFromLocalStorage() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeAuthSession(JSON.parse(raw));
  } catch (error) {
    return null;
  }
}

function clearAuthSessionFromLocalStorage() {
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export async function loadEntriesFromStorage() {
  if (isSupabasePersistenceEnabled()) {
    return loadEntriesFromSupabase();
  }

  return loadEntriesFromLocalStorage();
}

export async function saveEntriesToStorage(entries) {
  if (isSupabasePersistenceEnabled()) {
    await saveEntriesToSupabase(entries);
    return;
  }

  saveEntriesToLocalStorage(entries);
}

export async function loadUsersFromStorage() {
  if (isSupabasePersistenceEnabled()) {
    return loadUsersFromSupabase();
  }

  return loadUsersFromLocalStorage();
}

export async function saveUsersToStorage(users) {
  if (isSupabasePersistenceEnabled()) {
    await saveUsersToSupabase(users);
    return;
  }

  saveUsersToLocalStorage(users);
}

export function saveAuthSession(session) {
  saveAuthSessionToLocalStorage(session);
}

export function loadAuthSession() {
  return loadAuthSessionFromLocalStorage();
}

export function clearAuthSession() {
  clearAuthSessionFromLocalStorage();
}

export async function upsertAuthUserProfile(userId, email) {
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim() : "";

  if (!normalizedUserId || !normalizedEmail) {
    return;
  }

  const profile = {
    id: normalizedUserId,
    name: normalizedEmail,
    createdAt: new Date().toISOString(),
  };

  const users = normalizeUserProfiles(await loadUsersFromStorage());
  const existing = users.find((user) => user.id === normalizedUserId);
  if (existing) {
    return;
  }

  await saveUsersToStorage([...users, profile]);
}
