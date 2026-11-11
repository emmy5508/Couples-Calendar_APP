import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.accept());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("button", { name: "探索體驗日曆" }).click();
  await page.screenshot({
    path: "/workspace/mobile-calendar.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator(".fab").click();
  await page.getByLabel("活動名稱").fill("手機測試聚餐");
  await page.getByRole("button", { name: "儲存行程" }).click();
  await page.getByRole("button", { name: /09:00.*手機測試聚餐/ }).click();
  await page.getByLabel("活動名稱").fill("改名後聚餐");
  await page.getByRole("button", { name: "儲存行程" }).click();
  assert.equal(
    (await page.getByText("改名後聚餐", { exact: true }).count()) > 0,
    true,
  );
  await page.getByRole("button", { name: "行程", exact: true }).click();
  await page.getByRole("button", { name: "開啟選單" }).click();
  await page.getByRole("button", { name: "管理分類" }).click();
  await page.getByLabel("名稱", { exact: true }).fill("小孩");
  await page.getByRole("button", { name: "新增分類", exact: true }).click();
  await page.locator(".category-row").filter({ hasText: "小孩" }).waitFor();
  await page.getByRole("button", { name: "關閉", exact: true }).click();
  await page.getByRole("button", { name: "關閉選單" }).click();
  await page.getByRole("button", { name: "月曆", exact: true }).click();
  await page.locator(".fab").click();
  await page.getByLabel("活動名稱").fill("每月家庭日");
  await page.getByLabel("重複頻率").selectOption("monthly");
  await page.getByRole("button", { name: "儲存行程" }).click();
  await page.getByRole("button", { name: /09:00.*每月家庭日/ }).click();
  await page.getByLabel("變更範圍").selectOption("one");
  await page.getByLabel("活動名稱").fill("這次特別聚會");
  await page.getByRole("button", { name: "儲存行程" }).click();
  await page.getByRole("button", { name: /09:00.*這次特別聚會/ }).click();
  await page.getByLabel("變更範圍").selectOption("one");
  await page.getByRole("button", { name: "刪除這一次" }).click();
  assert.equal(
    await page.getByText("這次特別聚會", { exact: true }).count(),
    0,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "月曆", exact: true }).click();
  await page.screenshot({
    path: "/workspace/desktop-calendar.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Mobile/desktop layout, event create/edit, view switch, category create and recurring single edit/delete passed",
  );
} finally {
  await browser.close();
}
