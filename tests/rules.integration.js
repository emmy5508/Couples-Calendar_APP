import { readFileSync } from "node:fs";
import { test, after } from "node:test";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
const env = await initializeTestEnvironment({
  projectId: "demo-shared-calendar",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
});
after(() => env.cleanup());
const db = (uid, verified = true) =>
  env
    .authenticatedContext(uid, {
      email: uid + "@test.example",
      email_verified: verified,
    })
    .firestore();
const owner = db("owner"),
  viewer = db("viewer"),
  editor = db("editor"),
  stranger = db("stranger");
const c = "private",
  token = "12345678901234567890123456789012";
test("calendar isolation, invitations, roles and transfer", async () => {
  let b = writeBatch(owner);
  b.set(doc(owner, "calendars", c), {
    name: "Private",
    owner: "owner",
    invite: "",
    createdAt: 1,
  });
  b.set(doc(owner, "calendars", c, "members", "owner"), {
    role: "owner",
    email: "owner@test.example",
    token: "",
  });
  b.set(doc(owner, "users", "owner", "subscriptions", c), { calendarId: c });
  await assertSucceeds(b.commit());
  await assertFails(getDoc(doc(stranger, "calendars", c)));
  await assertFails(getDocs(collection(stranger, "calendars", c, "events")));
  await assertFails(getDoc(doc(db("owner", false), "calendars", c)));
  await assertSucceeds(setDoc(doc(owner, "invites", token), { calendarId: c }));
  for (let [user, conn] of [
    ["viewer", viewer],
    ["editor", editor],
  ]) {
    let join = writeBatch(conn);
    join.set(doc(conn, "calendars", c, "members", user), {
      role: "viewer",
      email: user + "@test.example",
      token,
    });
    join.set(doc(conn, "users", user, "subscriptions", c), { calendarId: c });
    await assertSucceeds(join.commit());
    await assertSucceeds(getDoc(doc(conn, "calendars", c)));
  }
  await assertFails(
    updateDoc(doc(viewer, "calendars", c, "members", "viewer"), {
      role: "owner",
    }),
  );
  const category = { name: "Family", color: "#b4c9a8", kind: "activity" };
  await assertFails(
    setDoc(doc(viewer, "calendars", c, "categories", "a"), category),
  );
  await assertSucceeds(
    updateDoc(doc(owner, "calendars", c, "members", "editor"), {
      role: "editor",
    }),
  );
  await assertSucceeds(
    setDoc(doc(editor, "calendars", c, "categories", "a"), category),
  );
  const event = {
    title: "Dinner",
    start: "2026-11-11T18:00",
    end: "2026-11-11T19:00",
    allDay: false,
    category: "a",
    family: [],
    participants: [],
    location: "",
    notes: "",
    repeat: "none",
    until: "",
    exceptions: {},
    createdBy: "owner",
  };
  await assertSucceeds(
    setDoc(doc(owner, "calendars", c, "events", "e"), event),
  );
  await assertSucceeds(
    updateDoc(doc(editor, "calendars", c, "events", "e"), {
      title: "Changed by editor",
    }),
  );
  await assertFails(deleteDoc(doc(viewer, "calendars", c, "events", "e")));
  await assertFails(
    setDoc(doc(stranger, "calendars", c, "members", "stranger"), {
      role: "owner",
      email: "stranger@test.example",
      token,
    }),
  );
  await assertFails(
    setDoc(doc(stranger, "calendars", c, "members", "stranger"), {
      role: "viewer",
      email: "stranger@test.example",
      token: "invalid",
    }),
  );
  await assertFails(updateDoc(doc(owner, "calendars", c), { owner: "editor" }));
  b = writeBatch(owner);
  b.update(doc(owner, "calendars", c), { owner: "editor" });
  b.update(doc(owner, "calendars", c, "members", "editor"), { role: "owner" });
  b.update(doc(owner, "calendars", c, "members", "owner"), { role: "editor" });
  await assertSucceeds(b.commit());
  await assertFails(
    deleteDoc(doc(editor, "calendars", c, "members", "editor")),
  );
  await assertSucceeds(
    deleteDoc(doc(editor, "calendars", c, "members", "viewer")),
  );
  await assertFails(getDoc(doc(viewer, "calendars", c)));
  await assertSucceeds(
    deleteDoc(doc(owner, "calendars", c, "members", "owner")),
  );
  await assertFails(getDoc(doc(owner, "calendars", c)));
  await assertSucceeds(deleteDoc(doc(editor, "calendars", c, "events", "e")));
  await assertSucceeds(
    deleteDoc(doc(editor, "calendars", c, "categories", "a")),
  );
  await assertSucceeds(deleteDoc(doc(editor, "invites", token)));
  await assertSucceeds(deleteDoc(doc(editor, "calendars", c)));
});

test("nickname privacy, legacy members and self-only nickname updates", async () => {
  const calendar = "nickname-calendar";
  const invite = "abcdef1234567890abcdef1234567890";
  let batch = writeBatch(owner);
  batch.set(doc(owner, "users", "owner"), { nickname: "小花" });
  batch.set(doc(owner, "calendars", calendar), {
    name: "暱稱測試",
    owner: "owner",
    invite: "",
    createdAt: 2,
  });
  batch.set(doc(owner, "calendars", calendar, "members", "owner"), {
    role: "owner",
    email: "owner@test.example",
    token: "",
    nickname: "小花",
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(
    setDoc(doc(owner, "invites", invite), { calendarId: calendar }),
  );
  await assertSucceeds(
    setDoc(doc(viewer, "calendars", calendar, "members", "viewer"), {
      role: "viewer",
      email: "viewer@test.example",
      token: invite,
    }),
  );
  // A legacy membership without nickname can adopt its owner's private nickname.
  batch = writeBatch(viewer);
  batch.set(doc(viewer, "users", "viewer"), { nickname: "阿明" });
  batch.update(doc(viewer, "calendars", calendar, "members", "viewer"), {
    nickname: "阿明",
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(viewer, "users", "viewer")));
  await assertFails(getDoc(doc(owner, "users", "viewer")));
  await assertFails(getDoc(doc(stranger, "users", "viewer")));
  await assertFails(
    setDoc(doc(db("viewer", false), "users", "viewer"), { nickname: "未驗證" }),
  );
  await assertFails(
    setDoc(doc(viewer, "users", "viewer"), { nickname: " ".repeat(5) }),
  );
  await assertFails(
    setDoc(doc(viewer, "users", "viewer"), { nickname: "\t\n" }),
  );
  await assertFails(
    setDoc(doc(viewer, "users", "viewer"), { nickname: "a".repeat(31) }),
  );
  await assertFails(
    setDoc(doc(viewer, "users", "viewer"), { nickname: "阿明", admin: true }),
  );
  await assertFails(
    updateDoc(doc(viewer, "calendars", calendar, "members", "viewer"), {
      nickname: "冒用其他暱稱",
    }),
  );
  await assertFails(
    updateDoc(doc(owner, "calendars", calendar, "members", "viewer"), {
      nickname: "替別人改名",
    }),
  );
  await assertFails(
    updateDoc(doc(viewer, "calendars", calendar, "members", "viewer"), {
      nickname: "阿明",
      role: "owner",
    }),
  );
  await assertFails(
    updateDoc(doc(viewer, "calendars", calendar, "members", "viewer"), {
      nickname: "阿明",
      email: "someone@test.example",
    }),
  );
  batch = writeBatch(viewer);
  batch.set(doc(viewer, "users", "viewer"), { nickname: "新的阿明" });
  batch.update(doc(viewer, "calendars", calendar, "members", "viewer"), {
    nickname: "新的阿明",
  });
  await assertSucceeds(batch.commit());
  const member = await assertSucceeds(
    getDoc(doc(owner, "calendars", calendar, "members", "viewer")),
  );
  if (member.data().nickname !== "新的阿明")
    throw new Error("Nickname did not sync");
});
