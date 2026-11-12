import { test } from "node:test";
import assert from "node:assert/strict";
import holidays from "../src/data/taiwan-holidays.json" with { type: "json" };
import { holidayFor, calendarDayClass, holidayYears } from "../src/holidays.js";
test("2026 new statutory holidays and substitutes are included", () => {
  for (const [date, name] of Object.entries({
    "2026-01-01": "開國紀念日",
    "2026-02-15": "小年夜",
    "2026-02-16": "農曆除夕",
    "2026-02-17": "春節",
    "2026-02-28": "和平紀念日",
    "2026-04-04": "兒童節",
    "2026-04-05": "清明節",
    "2026-05-01": "勞動節",
    "2026-06-19": "端午節",
    "2026-09-25": "中秋節",
    "2026-09-28": "孔子誕辰紀念日/教師節",
    "2026-10-10": "國慶日",
    "2026-10-25": "臺灣光復暨金門古寧頭大捷紀念日",
    "2026-12-25": "行憲紀念日",
  }))
    assert.equal(holidayFor(date)?.name, name);
  for (const date of [
    "2026-02-20",
    "2026-02-27",
    "2026-04-03",
    "2026-04-06",
    "2026-10-09",
    "2026-10-26",
  ])
    assert.equal(holidayFor(date)?.kind, "substitute");
});
test("2027 lunar holidays, weekend substitutes and cross-year substitute are included", () => {
  for (const [date, name] of Object.entries({
    "2027-02-04": "小年夜",
    "2027-02-05": "農曆除夕",
    "2027-02-06": "春節",
    "2027-02-07": "春節",
    "2027-02-08": "春節",
    "2027-06-09": "端午節",
    "2027-09-15": "中秋節",
    "2027-09-28": "孔子誕辰紀念日/教師節",
    "2027-10-25": "臺灣光復暨金門古寧頭大捷紀念日",
    "2027-12-25": "行憲紀念日",
  }))
    assert.equal(holidayFor(date)?.name, name);
  for (const date of [
    "2027-02-09",
    "2027-02-10",
    "2027-03-01",
    "2027-04-06",
    "2027-04-30",
    "2027-10-11",
    "2027-12-24",
    "2027-12-31",
  ])
    assert.equal(holidayFor(date)?.kind, "substitute");
});
test("dataset covers only supported years and does not turn every weekend into a named holiday", () => {
  assert.deepEqual(holidayYears, [2026, 2027]);
  assert.equal(
    Object.keys(holidays).filter((d) => d.startsWith("2026")).length,
    22,
  );
  assert.equal(
    Object.keys(holidays).filter((d) => d.startsWith("2027")).length,
    24,
  );
  for (const [date, holiday] of Object.entries(holidays)) {
    assert.equal(
      new Date(date + "T00:00:00Z").toISOString().slice(0, 10),
      date,
    );
    assert.ok(holiday.name);
    assert.ok(["holiday", "substitute"].includes(holiday.kind));
  }
  assert.equal(holidayFor("2026-02-14"), null);
  assert.equal(holidayFor("2028-01-01"), null);
  assert.equal(calendarDayClass("2026-02-21"), "saturday");
  assert.equal(calendarDayClass("2026-02-22"), "sunday");
  assert.equal(calendarDayClass("2026-04-04"), "saturday public-holiday");
});
