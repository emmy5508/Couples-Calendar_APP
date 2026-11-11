import { test } from "node:test";
import assert from "node:assert/strict";
import { memberName, normalizeNickname } from "../src/nicknames.js";
test("member labels use nickname and never fall back to email", () => {
  assert.equal(
    memberName({ nickname: "小花", email: "private@example.test" }),
    "小花",
  );
  assert.equal(memberName({ email: "private@example.test" }), "尚未設定暱稱");
  assert.equal(
    memberName({ nickname: "  ", email: "private@example.test" }),
    "尚未設定暱稱",
  );
  assert.equal(memberName(null), "尚未設定暱稱");
});
test("nickname validation trims whitespace and enforces length", () => {
  assert.equal(normalizeNickname(" 小花 "), "小花");
  for (const value of ["", "  ", "\t\n", "a".repeat(31), null])
    assert.throws(() => normalizeNickname(value), {
      code: "profile/invalid-nickname",
    });
  assert.equal(normalizeNickname("a".repeat(30)).length, 30);
});
