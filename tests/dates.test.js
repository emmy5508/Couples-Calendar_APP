import { test } from "node:test";
import assert from "node:assert/strict";
import {
  occurs,
  onDate,
  monthDays,
  shiftMonth,
  addDays,
  today,
} from "../src/dates.js";
const monthly = {
  id: "a",
  start: "2028-01-31T09:00",
  end: "2028-01-31T10:00",
  repeat: "monthly",
  until: "",
  exceptions: {},
};
test("monthly clamps to month end and returns to original day", () => {
  for (let d of ["2028-02-29", "2028-03-31", "2028-04-30"])
    assert.equal(occurs(monthly, d), true);
  assert.equal(occurs(monthly, "2028-03-30"), false);
  assert.equal(
    occurs({ ...monthly, start: "2027-01-31T09:00" }, "2027-02-28"),
    true,
  );
});
test("recurrence respects start, end and weekday", () => {
  assert.equal(occurs(monthly, "2027-12-31"), false);
  assert.equal(
    occurs({ ...monthly, until: "2028-02-29" }, "2028-03-31"),
    false,
  );
  let e = { ...monthly, repeat: "weekly" };
  assert.equal(occurs(e, "2028-02-07"), true);
  assert.equal(occurs(e, "2028-02-08"), false);
});
test("single occurrence edit and deletion do not alter series", () => {
  let e = {
    ...monthly,
    exceptions: {
      "2028-02-29": {
        title: "Changed",
        start: "2028-02-29T12:00",
        end: "2028-02-29T13:00",
      },
      "2028-03-31": { deleted: true },
    },
  };
  assert.equal(onDate([e], "2028-02-29")[0].title, "Changed");
  assert.equal(onDate([e], "2028-03-31").length, 0);
  assert.equal(onDate([e], "2028-04-30").length, 1);
});
test("Monday grid and date math cross years", () => {
  let days = monthDays("2026-11");
  assert.equal(days.length, 42);
  assert.equal(new Date(days[0]).getUTCDay(), 1);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});
test("nonrecurring multi-day events include both endpoints", () => {
  let e = {
    ...monthly,
    repeat: "none",
    start: "2026-11-11T12:00",
    end: "2026-11-13T10:00",
  };
  assert.equal(occurs(e, "2026-11-12"), true);
  assert.equal(occurs(e, "2026-11-14"), false);
});

test("moving a single occurrence removes old date and shows new date", () => {
  const e = {
    ...monthly,
    exceptions: {
      "2028-02-29": {
        title: "Moved",
        start: "2028-03-01T12:00",
        end: "2028-03-01T13:00",
      },
    },
  };
  assert.equal(onDate([e], "2028-02-29").length, 0);
  assert.equal(onDate([e], "2028-03-01")[0].occurrence, "2028-02-29");
  assert.equal(onDate([e], "2028-03-31")[0].start, "2028-03-31T09:00");
});

test("multi-day recurring occurrence includes continuation and respects exceptions", () => {
  const e = {
    ...monthly,
    repeat: "weekly",
    start: "2028-01-31T22:00",
    end: "2028-02-02T08:00",
  };
  assert.equal(onDate([e], "2028-02-01")[0].occurrence, "2028-01-31");
  assert.equal(onDate([e], "2028-02-03").length, 0);
  assert.equal(
    onDate(
      [{ ...e, exceptions: { "2028-01-31": { deleted: true } } }],
      "2028-02-01",
    ).length,
    0,
  );
});
