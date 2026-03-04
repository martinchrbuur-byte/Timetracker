import { isTimeEntryRecord } from "../models/timeEntry.js";
import { getAppConfig, isSupabasePersistenceEnabled } from "../config/appConfig.js";

export const STORAGE_KEY = "workHours.entries.v1";
const SUPABASE_TABLE = "time_entries";

function mapSupabaseRowToEntry(row) {
  return {
    id: row.id,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
  };
}

function mapEntryToSupabaseRow(entry) {
  return {
    id: entry.id,
    check_in_at: entry.checkInAt,
    check_out_at: entry.checkOutAt,
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
  const query = `${SUPABASE_TABLE}?select=id,check_in_at,check_out_at&order=check_in_at.desc`;
  const response = await supabaseRequest(query, { method: "GET" });
  const rows = await response.json();

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(mapSupabaseRowToEntry).filter(isTimeEntryRecord);
}

async function saveEntriesToSupabase(entries) {
  const payload = entries.filter(isTimeEntryRecord).map(mapEntryToSupabaseRow);

  await supabaseRequest(`${SUPABASE_TABLE}?on_conflict=id`, {
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

    return parsed.filter(isTimeEntryRecord);
  } catch (error) {
    return [];
  }
}

function saveEntriesToLocalStorage(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
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
