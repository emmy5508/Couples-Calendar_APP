export function normalizeNickname(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 30) {
    throw Object.assign(new Error("Invalid nickname"), {
      code: "profile/invalid-nickname",
    });
  }
  return name;
}
export function memberName(member) {
  return typeof member?.nickname === "string" && member.nickname.trim()
    ? member.nickname.trim()
    : "尚未設定暱稱";
}
