import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHistoricStartEndOverview } from "../../src/services/timeEntryService.js";

function localIso(year, month, day, hour, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

test("historic overview groups by local day with earliest start and latest end", () => {
  const entries = [
    {
      id: "1",
      checkInAt: localIso(2026, 3, 3, 9, 30),
      checkOutAt: localIso(2026, 3, 3, 12, 0),
    },
    {
      id: "2",
      checkInAt: localIso(2026, 3, 3, 8, 0),
      checkOutAt: localIso(2026, 3, 3, 17, 45),
    },
    {
      id: "3",
      checkInAt: localIso(2026, 3, 4, 10, 0),
      checkOutAt: localIso(2026, 3, 4, 12, 15),
    },
  ];

  const result = buildHistoricStartEndOverview(entries, "2026-03-04", "week", localIso(2026, 3, 4, 18, 0));

  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].dateKey, "2026-03-03");
  assert.equal(result.rows[0].sessionCount, 2);
  assert.equal(result.rows[1].dateKey, "2026-03-04");
  assert.equal(result.rows[1].sessionCount, 1);

  assert.equal(result.rows[0].startAt, localIso(2026, 3, 3, 8, 0));
  assert.equal(result.rows[0].endAt, localIso(2026, 3, 3, 17, 45));
});

test("historic overview respects week month year ranges", () => {
  const entries = [
    { id: "1", checkInAt: localIso(2026, 3, 2, 9, 0), checkOutAt: localIso(2026, 3, 2, 17, 0) },
    { id: "2", checkInAt: localIso(2026, 3, 28, 9, 0), checkOutAt: localIso(2026, 3, 28, 17, 0) },
    { id: "3", checkInAt: localIso(2026, 4, 2, 9, 0), checkOutAt: localIso(2026, 4, 2, 17, 0) },
    { id: "4", checkInAt: localIso(2025, 12, 30, 9, 0), checkOutAt: localIso(2025, 12, 30, 17, 0) },
  ];

  const weekResult = buildHistoricStartEndOverview(entries, "2026-03-04", "week");
  const monthResult = buildHistoricStartEndOverview(entries, "2026-03-04", "month");
  const yearResult = buildHistoricStartEndOverview(entries, "2026-03-04", "year");

  assert.equal(weekResult.rows.length, 1);
  assert.equal(monthResult.rows.length, 2);
  assert.equal(yearResult.rows.length, 3);
});

test("historic overview uses current time for active session on current day", () => {
  const nowIso = localIso(2026, 3, 6, 15, 30);
  const entries = [
    {
      id: "active",
      checkInAt: localIso(2026, 3, 6, 9, 0),
      checkOutAt: null,
    },
  ];

  const result = buildHistoricStartEndOverview(entries, "2026-03-06", "week", nowIso);

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].endAt, new Date(nowIso).toISOString());
});
