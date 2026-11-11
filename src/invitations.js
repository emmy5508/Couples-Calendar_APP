// Web Crypto random bytes are supported on browsers that lack randomUUID.
// Invite tokens must never fall back to Math.random.
export function createInviteToken(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues) {
    throw Object.assign(new Error("Secure random generator unavailable"), {
      code: "invite/unsupported-browser",
    });
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
