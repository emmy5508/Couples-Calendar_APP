import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createInviteToken } from "../src/invitations.js";
test("invite token generation works without randomUUID and preserves 128-bit entropy", () => {
  const token = createInviteToken({
    getRandomValues: (buffer) =>
      buffer.set(Array.from({ length: 16 }, (_, i) => i)),
  });
  assert.equal(token, "000102030405060708090a0b0c0d0e0f");
  const tokens = new Set(
    Array.from({ length: 100 }, () => createInviteToken(webcrypto)),
  );
  assert.equal(tokens.size, 100);
  for (const value of tokens) assert.match(value, /^[a-f0-9]{32}$/);
});
test("missing secure randomness fails explicitly rather than issuing weak invites", () => {
  assert.throws(() => createInviteToken({}), {
    code: "invite/unsupported-browser",
  });
});
