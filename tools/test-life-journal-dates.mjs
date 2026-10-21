import assert from "node:assert/strict";
import { transform } from "esbuild";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../shared/game/lifeJournalDates.ts", import.meta.url),
  "utf8",
);
const compiled = await transform(source, { loader: "ts", format: "esm" });
const { calendarDays, lifeDate, moveDay, moveMonth, dailyQuota } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled.code).toString("base64")
);
assert.equal(lifeDate(Date.parse("2026-10-14T15:59:59Z") / 1000), "2026-10-14");
assert.equal(lifeDate(Date.parse("2026-10-14T16:00:00Z") / 1000), "2026-10-15");
assert.deepEqual(calendarDays("2026-10").slice(0, 7), [
  null,
  null,
  null,
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
]);
assert.equal(calendarDays("2024-02").filter(Boolean).length, 29);
assert.equal(calendarDays("2026-02").filter(Boolean).length, 28);
assert.equal(calendarDays("2026-03").length, 42);
assert.equal(moveDay("2026-12-31", 1), "2027-01-01");
assert.equal(moveDay("2024-03-01", -1), "2024-02-29");
assert.equal(moveMonth("2026-12-31", 1), "2027-01");
const tasks = [
  { date: "2026-10-14", status: "active", hours: 5 },
  { date: "2026-10-15", status: "claimed", hours: 2 },
  { date: "2026-10-15", status: "cancelled", hours: 3 },
];
assert.deepEqual(dailyQuota(tasks, "2026-10-15", 5), {
  claimed: 2,
  reserved: 0,
  remaining: 3,
});
assert.deepEqual(dailyQuota(tasks, "2026-10-14", 5), {
  claimed: 0,
  reserved: 5,
  remaining: 0,
});
console.log(
  "PASS date alignment, leap years, month/year boundaries, CST midnight, acceptance-day quota and cancellation",
);
