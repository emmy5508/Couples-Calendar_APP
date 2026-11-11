import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = "http://127.0.0.1:5174";
async function register(context, url, name) {
  const page = await context.newPage();
  await page.goto(url);
  await page.getByRole("button", { name: "還沒有帳號？免費註冊" }).click();
  const email = name + "-" + Date.now() + "@example.test";
  await page.getByLabel("電子信箱").fill(email);
  await page.getByLabel("密碼", { exact: true }).fill("invite-test-123");
  await page.getByRole("button", { name: "建立帳號", exact: true }).click();
  await page.getByText("先讓我們認識你").waitFor();
  let code;
  await expect
    .poll(async () => {
      const r = await fetch(
        "http://127.0.0.1:9099/emulator/v1/projects/demo-shared-calendar/oobCodes",
      ).then((r) => r.json());
      code = r.oobCodes?.find(
        (c) => c.email === email && c.requestType === "VERIFY_EMAIL",
      );
      return !!code;
    })
    .toBe(true);
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=fake",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode: code.oobCode }),
    },
  );
  assert.ok(r.ok);
  await page.getByRole("button", { name: "我已完成驗證" }).click();
  await page.getByRole("button", { name: "建立第一本日曆" }).waitFor();
  return page;
}
try {
  const ownerContext = await browser.newContext();
  // Simulate browsers without randomUUID, while preserving secure random bytes.
  await ownerContext.addInitScript(() =>
    Object.defineProperty(Crypto.prototype, "randomUUID", {
      value: undefined,
      configurable: true,
    }),
  );
  const owner = await register(ownerContext, base, "owner");
  await owner.getByRole("button", { name: "建立第一本日曆" }).click();
  await owner.getByLabel("日曆名稱", { exact: true }).fill("邀請測試家庭");
  await owner.getByRole("button", { name: "建立日曆", exact: true }).click();
  await expect(
    owner.getByRole("button", { name: "邀請家人", exact: true }),
  ).toBeEnabled();
  await owner.locator(".share").click();
  await owner
    .getByRole("dialog", { name: "邀請家人，一起收藏日常" })
    .waitFor({ timeout: 8000 });
  const link = await owner.getByLabel("邀請連結", { exact: true }).inputValue();
  assert.match(new URL(link).searchParams.get("invite"), /^[a-f0-9]{32,}$/);
  const familyContext = await browser.newContext();
  const family = await register(familyContext, link, "family");
  await family.getByRole("button", { name: "加入日曆", exact: true }).click();
  await family
    .locator(".greeting h1")
    .filter({ hasText: "邀請測試家庭" })
    .waitFor();
  await expect(
    family.getByRole("button", { name: "邀請家人", exact: true }),
  ).toBeDisabled();
  console.log(
    "Invitation works without randomUUID; verified family joins with viewer role",
  );
} catch (error) {
  for (const context of browser.contexts())
    for (const page of context.pages()) {
      console.log("UI at failure:", await page.locator("body").innerText());
      await page.screenshot({
        path: "/workspace/invite-debug.png",
        fullPage: true,
      });
    }
  throw error;
} finally {
  await browser.close();
}
