export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function addDays(s, n) {
  let d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function monthDays(month) {
  let first = month + "-01",
    d = new Date(first + "T00:00:00Z"),
    offset = (d.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
}
export function shiftMonth(month, n) {
  let d = new Date(month + "-01T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}
export function occurs(e, date) {
  if (date < e.start.slice(0, 10) || (e.until && date > e.until)) return false;
  let start = e.start.slice(0, 10);
  if (e.repeat === "none" || !e.repeat)
    return date >= start && date <= e.end.slice(0, 10);
  if (e.repeat === "daily") return true;
  if (e.repeat === "weekly")
    return ((new Date(date) - new Date(start)) / 86400000) % 7 === 0;
  let day = +start.slice(8),
    last = new Date(
      Date.UTC(+date.slice(0, 4), +date.slice(5, 7), 0),
    ).getUTCDate();
  return +date.slice(8) === Math.min(day, last);
}
export function onDate(events, date) {
  return events
    .flatMap((e) => {
      const exceptions = e.exceptions || {},
        result = [];
      const duration = Math.max(
        0,
        Math.round(
          (new Date(e.end.slice(0, 10)) - new Date(e.start.slice(0, 10))) /
            86400000,
        ),
      );
      if (e.repeat && e.repeat !== "none") {
        // A repeated event can span midnight or several days. Keep its original
        // occurrence date so editing a continuation edits the same occurrence.
        let first = addDays(date, -duration);
        if (first < e.start.slice(0, 10)) first = e.start.slice(0, 10);
        for (let anchor = first; anchor <= date; anchor = addDays(anchor, 1)) {
          if (occurs(e, anchor) && !exceptions[anchor])
            result.push({
              ...e,
              start: anchor + e.start.slice(10),
              end: addDays(anchor, duration) + e.end.slice(10),
              occurrence: anchor,
            });
        }
      } else if (occurs(e, date))
        result.push({ ...e, occurrence: e.start.slice(0, 10) });
      for (const [anchor, ex] of Object.entries(exceptions)) {
        if (
          !ex.deleted &&
          ex.start &&
          date >= ex.start.slice(0, 10) &&
          date <= ex.end.slice(0, 10)
        )
          result.push({ ...e, ...ex, occurrence: anchor });
      }
      return result;
    })
    .sort(
      (a, b) =>
        Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start),
    );
}
