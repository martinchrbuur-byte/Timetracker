import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateIntegrity } from "../../src/services/timeEntryService.js";

function entry(id, checkInAt, checkOutAt = null) {
  return {
    id,
    userId: "default",
    checkInAt,
    checkOutAt,
  };
}

test("integrity is valid when there are no entries", () => {
  const result = evaluateIntegrity([], null, "2026-03-06T12:00:00.000Z");

  assert.equal(result.level, "valid");
  assert.match(result.label, /valid/i);
});

test("integrity is blocked for overlapping sessions", () => {
  const result = evaluateIntegrity(
    [
      entry("a", "2026-03-06T08:00:00.000Z", "2026-03-06T10:00:00.000Z"),
      entry("b", "2026-03-06T09:30:00.000Z", "2026-03-06T11:00:00.000Z"),
    ],
    null,
    "2026-03-06T12:00:00.000Z"
  );

  assert.equal(result.level, "blocked");
  assert.match(result.detail, /overlapping sessions/i);
});

test("integrity is blocked when multiple active sessions exist", () => {
  const result = evaluateIntegrity(
    [
      entry("a", "2026-03-06T08:00:00.000Z", null),
      entry("b", "2026-03-06T09:30:00.000Z", null),
    ],
    null,
    "2026-03-06T12:00:00.000Z"
  );

  assert.equal(result.level, "blocked");
  assert.match(result.detail, /multiple active sessions/i);
});

test("integrity is warning for stale active session", () => {
  const activeSession = entry("a", "2026-03-05T16:00:00.000Z", null);
  const result = evaluateIntegrity([activeSession], activeSession, "2026-03-06T12:00:00.000Z");

  assert.equal(result.level, "warning");
  assert.match(result.detail, /open for a long time/i);
});

test("integrity is warning for long completed session", () => {
  const result = evaluateIntegrity(
    [entry("a", "2026-03-06T06:00:00.000Z", "2026-03-06T20:30:00.000Z")],
    null,
    "2026-03-06T22:00:00.000Z"
  );

  assert.equal(result.level, "warning");
  assert.match(result.detail, /exceed 12 hours/i);
});

test("integrity is valid for clean non-overlapping sessions", () => {
  const result = evaluateIntegrity(
    [
      entry("a", "2026-03-06T08:00:00.000Z", "2026-03-06T12:00:00.000Z"),
      entry("b", "2026-03-06T13:00:00.000Z", "2026-03-06T17:00:00.000Z"),
    ],
    null,
    "2026-03-06T18:00:00.000Z"
  );

  assert.equal(result.level, "valid");
  assert.match(result.detail, /no time conflicts/i);
});
