import holidays from "./data/taiwan-holidays.json" with { type: "json" };
export const holidayYears = [2026, 2027];
export const holidaySources = {
  official: "https://data.gov.tw/dataset/14718",
  mirror:
    "https://github.com/ruyut/TaiwanCalendar/tree/73d814e768c94f2426af0787c96658d69068c3ff",
};
export function holidayFor(date) {
  return holidays[date] || null;
}
export function calendarDayClass(date) {
  const weekday = new Date(date + "T00:00:00Z").getUTCDay();
  return [
    weekday === 6 ? "saturday" : "",
    weekday === 0 ? "sunday" : "",
    holidayFor(date) ? "public-holiday" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
