import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.accept());
  const email = "test-" + Date.now() + "@example.test",
    password = "calendar-test-123";
  await page.goto("http://127.0.0.1:5174");
  await page.getByRole("button", { name: "還沒有帳號？免費註冊" }).click();
  await page.getByLabel("電子信箱").fill(email);
  await page.getByLabel("密碼", { exact: true }).fill(password);
  await page.getByRole("button", { name: "建立帳號", exact: true }).click();
  await page.getByText("先讓我們認識你").waitFor();
  await expect
    .poll(async () => {
      const r = await fetch(
        "http://127.0.0.1:9099/emulator/v1/projects/demo-shared-calendar/oobCodes",
      ).then((r) => r.json());
      return r.oobCodes?.some(
        (c) => c.email === email && c.requestType === "VERIFY_EMAIL",
      );
    })
    .toBe(true);
  const codes = await fetch(
    "http://127.0.0.1:9099/emulator/v1/projects/demo-shared-calendar/oobCodes",
  ).then((r) => r.json());
  const verify = codes.oobCodes.find(
    (c) => c.email === email && c.requestType === "VERIFY_EMAIL",
  );
  assert.ok(verify);
  const verifyResult = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=fake",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode: verify.oobCode }),
    },
  );
  assert.equal(verifyResult.ok, true);
  await page.getByRole("button", { name: "我已完成驗證" }).click();
  await page.getByLabel("暱稱", { exact: true }).fill("測試家人");
  await page.getByRole("button", { name: "儲存暱稱", exact: true }).click();
  await page.getByRole("button", { name: "建立第一本日曆" }).waitFor();
  await page.getByRole("button", { name: "開啟選單" }).click();
  await page.getByRole("button", { name: "登出", exact: true }).click();
  await page.getByRole("button", { name: "登入日曆" }).waitFor();
  await page.getByLabel("電子信箱").fill(email);
  await page.getByLabel("密碼", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登入日曆" }).click();
  await page.getByRole("button", { name: "建立第一本日曆" }).waitFor();
  await page.getByRole("button", { name: "開啟選單" }).click();
  await page.getByRole("button", { name: "登出", exact: true }).click();
  await page.getByRole("button", { name: "忘記密碼", exact: true }).click();
  await page.getByLabel("電子信箱").fill(email);
  await page.getByRole("button", { name: "寄送重設信" }).click();
  await page.getByRole("button", { name: "登入日曆" }).waitFor();
  const resets = await fetch(
    "http://127.0.0.1:9099/emulator/v1/projects/demo-shared-calendar/oobCodes",
  ).then((r) => r.json());
  assert.ok(
    resets.oobCodes.some(
      (c) => c.email === email && c.requestType === "PASSWORD_RESET",
    ),
  );
  console.log(
    "Auth emulator: registration, verification gate, email verification, logout, login and password reset passed",
  );
} finally {
  await browser.close();
}
