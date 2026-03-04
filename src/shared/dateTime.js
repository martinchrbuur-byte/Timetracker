// Central date-time helpers used across UI and services.
// Keep all conversions here so future changes remain consistent.

export function toTimestamp(value) {
  return new Date(value).getTime();
}

export function isValidDateTimeString(value) {
  if (typeof value !== "string") {
    return false;
  }

  return Number.isFinite(toTimestamp(value));
}

export function toLocalDateTimeInputValue(isoValue) {
  if (!isoValue) {
    return "";
  }

  const timestamp = toTimestamp(isoValue);
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const localDate = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function localDateTimeInputToIso(localValue) {
  if (!localValue) {
    return null;
  }

  const timestamp = toTimestamp(localValue);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

export function formatDateTime(isoValue) {
  if (!isoValue) {
    return "--";
  }

  const timestamp = toTimestamp(isoValue);
  if (!Number.isFinite(timestamp)) {
    return "--";
  }

  return new Date(timestamp).toLocaleString();
}

export function formatDateOnly(isoValue) {
  if (!isoValue) {
    return "--";
  }

  const timestamp = toTimestamp(isoValue);
  if (!Number.isFinite(timestamp)) {
    return "--";
  }

  return new Date(timestamp).toLocaleDateString();
}

export function formatDuration(checkInAt, checkOutAt) {
  if (!checkInAt || !checkOutAt) {
    return "In progress";
  }

  const diffMs = toTimestamp(checkOutAt) - toTimestamp(checkInAt);
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "--";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}