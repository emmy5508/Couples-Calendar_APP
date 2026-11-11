import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
  });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:4173");
  await page.evaluate(async () => {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SW readiness timeout")), 15000),
      ),
    ]);
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const manifest = await page.evaluate(async () =>
    fetch("/manifest.webmanifest").then((r) => r.json()),
  );
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length, 2);
  await page.getByRole("button", { name: "探索體驗日曆" }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await context.setOffline(true);
  await page.getByText("離線 · 僅供查看", { exact: true }).waitFor();
  assert.equal(await page.locator(".fab").isDisabled(), true);
  assert.ok(
    (await page.getByText("一起吃頓晚餐", { exact: true }).count()) > 0,
  );
  await page.reload();

  await page.getByRole("button", { name: "探索體驗日曆" }).waitFor();
  await context.setOffline(false);
  console.log(
    "Production PWA manifest, service worker, 360px layout, offline read-only and offline shell reload passed",
  );
} finally {
  await browser.close();
}
