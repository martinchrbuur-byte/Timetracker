import { isTimeEntryRecord, normalizeTimeEntry } from "../models/timeEntry.js";
import {
  isUserProfileRecord,
  normalizeUserProfiles,
  DEFAULT_USER,
} from "../models/userProfile.js";
import { getAppConfig, isSupabasePersistenceEnabled } from "../config/appConfig.js";

export const STORAGE_KEY = "workHours.entries.v1";
export const USERS_STORAGE_KEY = "workHours.users.v1";
const SUPABASE_TABLE = "time_entries";
const SUPABASE_USERS_TABLE = "tracker_users";

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
    throw new Error(`Supabase request failed with status ${response.status}`);
  }

  return response;
}

async function loadEntriesFromSupabase() {
  const query = `${SUPABASE_TABLE}?select=id,check_in_at,check_out_at,user_id&order=check_in_at.desc`;
  const response = await supabaseRequest(query, { method: "GET" });
  const rows = await response.json();

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

  await supabaseRequest(`${SUPABASE_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });
}

async function loadUsersFromSupabase() {
  const query = `${SUPABASE_USERS_TABLE}?select=id,name,created_at&order=created_at.asc`;
  const response = await supabaseRequest(query, { method: "GET" });
  const rows = await response.json();

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

  await supabaseRequest(`${SUPABASE_USERS_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });
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
