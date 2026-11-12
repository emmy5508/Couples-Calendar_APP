import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-02-17T04:00:00Z"));
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("button", { name: "探索體驗日曆" }).click();
  const day = (date) => page.locator(`.day[data-date="${date}"]`);
  const style = async (date, selector, property) =>
    day(date)
      .locator(selector)
      .evaluate((node, p) => getComputedStyle(node)[p], property);
  await page.mouse.move(0, 0);
  const backgrounds = await Promise.all(
    ["2026-02-21", "2026-02-22", "2026-02-23"].map((date) =>
      day(date).evaluate((node) => getComputedStyle(node).backgroundColor),
    ),
  );
  assert.equal(new Set(backgrounds).size, 1);
  const colors = await Promise.all(
    ["2026-02-21", "2026-02-22", "2026-02-23"].map((date) =>
      style(date, ".day-number", "color"),
    ),
  );
  assert.equal(colors[0], colors[1]);
  assert.notEqual(colors[0], colors[2]);
  await expect(day("2026-02-17").locator(".holiday-name")).toHaveText("春節");
  await expect(page.locator(".daily .holiday-row")).toContainText("春節");
  await day("2026-02-20").click();
  await expect(page.locator(".daily .holiday-row")).toContainText("補假");
  await page.getByRole("button", { name: "行程", exact: true }).click();
  await expect(page.locator(".agenda .holiday-row").first()).toBeVisible();
  await page.getByRole("button", { name: "月曆", exact: true }).click();
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "下個月", exact: true }).click();
  await day("2026-04-04").click();
  await expect(page.locator(".daily .holiday-row")).toContainText("兒童節");
  await page.screenshot({
    path: "/workspace/holidays-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "/workspace/holidays-desktop.png",
    fullPage: true,
  });
  for (let i = 0; i < 20; i++)
    await page.getByRole("button", { name: "下個月", exact: true }).click();
  await expect(day("2027-12-31").locator(".holiday-name")).toHaveText("補假");
  await day("2027-12-25").click();
  await expect(page.locator(".daily .holiday-row")).toContainText("行憲紀念日");
  await page.setViewportSize({ width: 320, height: 780 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "2026–2027 國定假日說明" }).click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: /行政院人事行政總處/ }),
  ).toHaveAttribute("href", "https://data.gov.tw/dataset/14718");
  assert.deepEqual(errors, []);
  console.log(
    "Weekend text colors and equal backgrounds, 2026/2027 holidays, substitute days, agenda/day details, source links and mobile layout passed",
  );
} finally {
  await browser.close();
}
