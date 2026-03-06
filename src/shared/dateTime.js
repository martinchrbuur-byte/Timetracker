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

  const normalizedValue = String(localValue).trim();

  const isoLikeMatch = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (isoLikeMatch) {
    const [, year, month, day, hour, minute, second = "00"] = isoLikeMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );

    if (Number.isFinite(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const localizedMatch = normalizedValue.match(
    /^(\d{2})[./-](\d{2})[./-](\d{4})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (localizedMatch) {
    const [, day, month, year, hour, minute, second = "00"] = localizedMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );

    if (Number.isFinite(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const timestamp = toTimestamp(normalizedValue);
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

export function formatTimeOnly(isoValue) {
  if (!isoValue) {
    return "--";
  }

  const timestamp = toTimestamp(isoValue);
  if (!Number.isFinite(timestamp)) {
    return "--";
  }

  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
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

export function toLocalDateKey(value) {
  const timestamp = toTimestamp(value);
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const localDate = new Date(timestamp);
  const year = String(localDate.getFullYear());
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

export function getRangeBounds(dateKey, range) {
  const anchorDate = parseLocalDateKey(dateKey);
  if (!anchorDate) {
    return null;
  }

  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
  const end = new Date(start);

  if (range === "year") {
    start.setMonth(0, 1);
    end.setFullYear(start.getFullYear() + 1, 0, 0);
    return { start, end };
  }

  if (range === "month") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
    return { start, end };
  }

  const dayOfWeek = start.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diffToMonday);
  end.setTime(start.getTime());
  end.setDate(start.getDate() + 6);
  return { start, end };
}