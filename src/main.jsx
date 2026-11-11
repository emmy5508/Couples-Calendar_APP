import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  reload,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import {
  CalendarDays,
  Leaf,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Check,
  Copy,
  Flower2,
  List,
  Calendar,
  MapPin,
  Clock,
  WifiOff,
  ArrowRight,
  Heart,
  Search,
} from "lucide-react";
import { auth, db } from "./firebase";
import { today, monthDays, shiftMonth, onDate, addDays } from "./dates";
import "./style.css";
const palette = [
  "#b4c9a8",
  "#e5b7b1",
  "#b8bce0",
  "#e5cd91",
  "#a5cbd2",
  "#d9b7d5",
];
const roleNames = { owner: "擁有者", editor: "編輯者", viewer: "檢視者" };
const errText = (e) =>
  ({
    "auth/invalid-credential": "信箱或密碼不正確",
    "auth/email-already-in-use": "這個信箱已註冊，請登入",
    "auth/weak-password": "密碼至少需要 6 個字元",
    "auth/invalid-email": "請填寫有效的電子信箱",
    "auth/too-many-requests": "操作太頻繁，請稍後再試",
    "auth/network-request-failed": "連線失敗，請確認網路",
    "permission-denied":
      "沒有操作權限，請確認信箱已驗證，並已部署資料庫安全規則。",
    unavailable: "目前無法連線，請稍後重試",
  })[e.code] ||
  "操作未完成，請稍後再試。" + (e.code ? "（" + e.code + "）" : "");
const logout = async () => {
  await signOut(auth);
  location.reload();
};
const demoCategories = [
  { id: "c1", name: "家庭時光", color: palette[0], kind: "activity" },
  { id: "c2", name: "工作日常", color: palette[2], kind: "activity" },
  { id: "c3", name: "生活小事", color: palette[1], kind: "activity" },
  { id: "f1", name: "媽媽", color: palette[1], kind: "family" },
  { id: "f2", name: "爸爸", color: palette[4], kind: "family" },
];
function demoEvents() {
  let d = today();
  return [
    {
      id: "demo1",
      title: "一起吃頓晚餐",
      start: d + "T18:30",
      end: d + "T20:00",
      allDay: false,
      category: "c1",
      family: ["f1", "f2"],
      participants: [],
      location: "我們的家",
      notes: "把今天的小事，慢慢說給彼此聽。",
      repeat: "none",
      until: "",
      exceptions: {},
      createdBy: "demo",
    },
    {
      id: "demo2",
      title: "週末花市散步",
      start: addDays(d, 2) + "T10:00",
      end: addDays(d, 2) + "T11:30",
      allDay: false,
      category: "c3",
      family: [],
      participants: [],
      location: "花市",
      notes: "",
      repeat: "none",
      until: "",
      exceptions: {},
      createdBy: "demo",
    },
  ];
}
function Modal({ title, children, close }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    const getItems = () =>
      [
        ...node.querySelectorAll("button,input,select,textarea,[tabindex]"),
      ].filter((el) => !el.disabled && el.offsetParent !== null);
    getItems()[0]?.focus();
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        const items = getItems(),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    node.addEventListener("keydown", handler);
    return () => {
      node.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={close}>
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon" onClick={close} aria-label="關閉">
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function App() {
  const [user, setUser] = useState(null),
    [authReady, setAuthReady] = useState(false),
    [demo, setDemo] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [side, setSide] = useState(false);
  const [subs, setSubs] = useState([]),
    [calendars, setCalendars] = useState([]),
    [active, setActive] = useState(""),
    [cal, setCal] = useState(null),
    [members, setMembers] = useState([]),
    [cats, setCats] = useState([]),
    [events, setEvents] = useState([]),
    [month, setMonth] = useState(today().slice(0, 7)),
    [selected, setSelected] = useState(today()),
    [view, setView] = useState("month"),
    [modal, setModal] = useState(""),
    [editing, setEditing] = useState(null),
    [filter, setFilter] = useState(""),
    [query, setQuery] = useState(""),
    [inviteLink, setInviteLink] = useState(""),
    [loading, setLoading] = useState(false),
    [serverReady, setServerReady] = useState(false);
  const uid = demo ? "demo" : user?.uid,
    role = demo ? "owner" : members.find((m) => m.id === uid)?.role,
    canEdit = role === "owner" || role === "editor";
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
        if (!u) {
          setSubs([]);
          setCalendars([]);
          setActive("");
          setCal(null);
          setMembers([]);
          setEvents([]);
          setCats([]);
        }
      }),
    [],
  );
  useEffect(() => {
    let f = () => setOnline(navigator.onLine);
    window.addEventListener("online", f);
    window.addEventListener("offline", f);
    return () => {
      window.removeEventListener("online", f);
      window.removeEventListener("offline", f);
    };
  }, []);
  useEffect(() => {
    if (notice) {
      let id = setTimeout(() => setNotice(""), 7000);
      return () => clearTimeout(id);
    }
  }, [notice]);
  const run = async (fn) => {
    if (!online) {
      setNotice("目前離線，只能查看已載入的行程。");
      return;
    }
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setNotice(errText(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!user?.emailVerified || demo) return;
    return onSnapshot(
      collection(db, "users", user.uid, "subscriptions"),
      (s) => setSubs(s.docs.map((d) => d.id)),
      (e) => setNotice(errText(e)),
    );
  }, [user, demo]);
  useEffect(() => {
    if (demo) return;
    setCalendars([]);
    let unsubs = subs.map((id) =>
      onSnapshot(
        doc(db, "calendars", id),
        (s) => {
          if (s.exists())
            setCalendars((old) => [
              ...old.filter((c) => c.id !== id),
              { id, ...s.data() },
            ]);
          else setCalendars((old) => old.filter((c) => c.id !== id));
        },
        () => {
          setCalendars((old) => old.filter((c) => c.id !== id));
        },
      ),
    );
    return () => unsubs.forEach((f) => f());
  }, [subs, demo]);
  useEffect(() => {
    if (!demo && !calendars.some((c) => c.id === active))
      setActive(calendars[0]?.id || "");
  }, [calendars, demo]);
  useEffect(() => {
    if (demo) return;
    setCal(calendars.find((c) => c.id === active) || null);
  }, [active, calendars, demo]);
  useEffect(() => {
    if (!active || demo) {
      if (!demo) {
        setEvents([]);
        setCats([]);
        setMembers([]);
      }
      return;
    }
    setLoading(true);
    setServerReady(false);
    setEvents([]);
    setCats([]);
    setMembers([]);
    const listen = (name, setter) =>
      onSnapshot(
        collection(db, "calendars", active, name),
        { includeMetadataChanges: true },
        (s) => {
          setter(s.docs.map((d) => ({ id: d.id, ...d.data() })));
          if (name === "events") {
            setLoading(false);
            setServerReady(
              !s.metadata.fromCache && !s.metadata.hasPendingWrites,
            );
          }
        },
        (e) => {
          setNotice(errText(e));
          setLoading(false);
          setServerReady(false);
        },
      );
    let stops = [
      listen("events", setEvents),
      listen("categories", setCats),
      listen("members", setMembers),
    ];
    return () => stops.forEach((f) => f());
  }, [active, demo]);
  const startDemo = () => {
    setDemo(true);
    setActive("demo");
    let c = { id: "demo", name: "我們的小日子", owner: "demo" };
    setCal(c);
    setCalendars([c]);
    setCats(demoCategories);
    setEvents(demoEvents());
    setMembers([{ id: "demo", email: "體驗中的你", role: "owner" }]);
  };
  const createCalendar = async (name) => {
    if (demo) {
      setNotice("體驗模式不會儲存資料，請先登入。");
      return;
    }
    let ref = doc(collection(db, "calendars")),
      b = writeBatch(db);
    b.set(ref, { name, owner: uid, invite: "", createdAt: Date.now() });
    b.set(doc(ref, "members", uid), {
      email: user.email,
      role: "owner",
      token: "",
    });
    b.set(doc(db, "users", uid, "subscriptions", ref.id), {
      calendarId: ref.id,
    });
    await b.commit();
    setActive(ref.id);
    setModal("");
    setNotice("新的日曆已建立 🌱");
  };
  const join = async () => {
    const token = new URLSearchParams(location.search).get("invite");
    if (!token) return;
    let s = await getDoc(doc(db, "invites", token));
    if (!s.exists()) throw { code: "invite-invalid" };
    let id = s.data().calendarId;
    let joined = false;
    try {
      joined = (await getDoc(doc(db, "calendars", id))).exists();
    } catch (e) {
      if (e.code !== "permission-denied") throw e;
    }
    if (!joined) {
      let b = writeBatch(db);
      b.set(doc(db, "calendars", id, "members", uid), {
        email: user.email,
        role: "viewer",
        token,
      });
      b.set(doc(db, "users", uid, "subscriptions", id), { calendarId: id });
      await b.commit();
    }
    setActive(id);
    history.replaceState({}, "", location.pathname);
    setNotice("已加入日曆，歡迎一起記錄生活！");
  };
  const share = () =>
    run(async () => {
      if (demo) {
        setNotice("登入後即可分享真正的邀請連結。");
        return;
      }
      let token = cal.invite;
      if (!token) {
        token = crypto.randomUUID().replaceAll("-", "");
        let b = writeBatch(db);
        b.set(doc(db, "invites", token), { calendarId: active });
        b.update(doc(db, "calendars", active), { invite: token });
        await b.commit();
      }
      setInviteLink(location.origin + "/?invite=" + token);
      setModal("share");
    });
  const visible = events.filter(
    (e) =>
      (!filter || e.category === filter || e.family.includes(filter)) &&
      (!query || e.title.includes(query) || e.location.includes(query)),
  );
  const dayEvents = onDate(visible, selected),
    activities = cats.filter((c) => c.kind === "activity"),
    family = cats.filter((c) => c.kind === "family");
  const openEvent = (event = null) => {
    setEditing(event);
    setModal("event");
  };
  const saveEvent = async (input, scope) => {
    const { id, occurrence, ...data } = input;
    if (demo) {
      setEvents((old) =>
        editing
          ? old.map((e) =>
              e.id !== editing.id
                ? e
                : scope === "one"
                  ? {
                      ...e,
                      exceptions: {
                        ...e.exceptions,
                        [editing.occurrence]: data,
                      },
                    }
                  : { ...data, id: e.id },
            )
          : [...old, { ...data, id: crypto.randomUUID() }],
      );
      setModal("");
      return;
    }
    let ref = editing
      ? doc(db, "calendars", active, "events", editing.id)
      : doc(collection(db, "calendars", active, "events"));
    if (editing && scope === "one")
      await updateDoc(ref, { ["exceptions." + editing.occurrence]: data });
    else await setDoc(ref, data);
    setModal("");
  };
  const removeEvent = async (scope) => {
    if (
      !confirm(
        scope === "one"
          ? "刪除這一次活動？"
          : "確定刪除此活動及其所有重複行程？",
      )
    )
      return;
    if (demo)
      setEvents((old) =>
        scope === "one"
          ? old.map((e) =>
              e.id === editing.id
                ? {
                    ...e,
                    exceptions: {
                      ...e.exceptions,
                      [editing.occurrence]: { deleted: true },
                    },
                  }
                : e,
            )
          : old.filter((e) => e.id !== editing.id),
      );
    else if (scope === "one")
      await updateDoc(doc(db, "calendars", active, "events", editing.id), {
        ["exceptions." + editing.occurrence]: { deleted: true },
      });
    else await deleteDoc(doc(db, "calendars", active, "events", editing.id));
    setModal("");
  };
  const leave = async (target = uid) => {
    if (demo) return;
    if (
      !confirm(
        target === uid
          ? "確定退出這個日曆？"
          : "確定移除此成員？邀請連結仍有效，對方持有連結可以再次加入。",
      )
    )
      return;
    await deleteDoc(doc(db, "calendars", active, "members", target));
    if (target === uid) {
      await deleteDoc(doc(db, "users", uid, "subscriptions", active));
      setActive("");
      setModal("");
    }
  };
  const transfer = async (target) => {
    if (!confirm("確定轉移所有權？你會成為編輯者。")) return;
    let b = writeBatch(db);
    b.update(doc(db, "calendars", active), { owner: target });
    b.update(doc(db, "calendars", active, "members", target), {
      role: "owner",
    });
    b.update(doc(db, "calendars", active, "members", uid), { role: "editor" });
    await b.commit();
    setNotice("所有權已轉移");
  };
  const deleteCalendar = async () => {
    if (demo) {
      setNotice("體驗日曆無法刪除");
      return;
    }
    if (prompt("此操作會永久刪除所有活動。請輸入日曆名稱確認：") !== cal.name)
      return;
    for (let sub of ["events", "categories"]) {
      let s = await getDocs(collection(db, "calendars", active, sub));
      for (let i = 0; i < s.docs.length; i += 400) {
        let b = writeBatch(db);
        s.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
        await b.commit();
      }
    }
    let ms = await getDocs(collection(db, "calendars", active, "members"));
    for (let m of ms.docs.filter((d) => d.id !== uid)) await deleteDoc(m.ref);
    if (cal.invite) await deleteDoc(doc(db, "invites", cal.invite));
    let finalBatch = writeBatch(db);
    finalBatch.delete(doc(db, "calendars", active, "members", uid));
    finalBatch.delete(doc(db, "calendars", active));
    await finalBatch.commit();
    await deleteDoc(doc(db, "users", uid, "subscriptions", active));
    setModal("");
    setNotice("日曆已刪除");
  };
  if (!authReady)
    return (
      <div className="splash">
        <Flower2 />
        正在翻開日曆…
      </div>
    );
  if (!user && !demo)
    return (
      <>
        <Auth run={run} busy={busy} notice={notice} startDemo={startDemo} />
      </>
    );
  if (user && !user.emailVerified && !demo)
    return (
      <main className="auth">
        <div className="auth-card">
          <Flower2 size={40} />
          <h1>先讓我們認識你 ✉️</h1>
          <p>
            請前往 {user.email}，點擊驗證信裡的連結。驗證後就能建立或加入日曆。
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await reload(auth.currentUser);
                await auth.currentUser.getIdToken(true);
                setUser({ ...auth.currentUser });
                if (!auth.currentUser.emailVerified)
                  setNotice("尚未完成驗證，請先查看信箱。");
              })
            }
          >
            我已完成驗證
          </button>
          <button
            onClick={() =>
              run(async () => {
                await sendEmailVerification(auth.currentUser);
                setNotice("驗證信已寄出，請也查看垃圾郵件。");
              })
            }
          >
            重新寄送驗證信
          </button>
          <button onClick={logout}>登出</button>
          <p role="status">{notice}</p>
        </div>
      </main>
    );
  return (
    <div className="app">
      <aside className={side ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-icon">
            <Flower2 />
          </span>
          <div>
            共享日曆<small>把日子，種在一起</small>
          </div>
          <button
            className="icon mobile"
            onClick={() => setSide(false)}
            aria-label="關閉選單"
          >
            <X />
          </button>
        </div>
        <button
          className="create primary"
          disabled={!active || !canEdit || !online}
          onClick={() => openEvent()}
        >
          <Plus size={19} />
          新增行程
        </button>
        <div className="nav-title">
          我的日曆{" "}
          <button
            className="icon"
            onClick={() => setModal("create")}
            aria-label="新增日曆"
          >
            <Plus size={17} />
          </button>
        </div>
        <nav>
          {calendars.map((c) => (
            <button
              key={c.id}
              className={"calendar-nav " + (c.id === active ? "chosen" : "")}
              onClick={() => {
                setActive(c.id);
                setFilter("");
                setSide(false);
              }}
            >
              <CalendarDays size={18} />
              {c.name}
              <span className="tiny-dot" />
            </button>
          ))}
        </nav>
        <button className="text-button" onClick={() => setModal("create")}>
          <Plus size={15} />
          建立新日曆
        </button>
        <div className="nav-title spaced">
          活動分類{" "}
          <button
            className="icon"
            disabled={!canEdit || !active}
            onClick={() => setModal("categories")}
            aria-label="管理分類"
          >
            <Settings size={15} />
          </button>
        </div>
        <button
          className={"filter-row " + (!filter ? "active-filter" : "")}
          onClick={() => setFilter("")}
        >
          <span className="color-dot all-dot" />
          全部行程
        </button>
        {activities.map((c) => (
          <button
            className={"filter-row " + (filter === c.id ? "active-filter" : "")}
            key={c.id}
            onClick={() => setFilter(filter === c.id ? "" : c.id)}
          >
            <span className="color-dot" style={{ background: c.color }} />
            {c.name}
            {filter === c.id && <Check size={14} />}
          </button>
        ))}
        <div className="nav-title spaced">家庭成員標籤</div>
        <div className="family-tags">
          {family.map((c) => (
            <button
              className={"family-tag " + (filter === c.id ? "selected" : "")}
              key={c.id}
              style={{ "--tag": c.color }}
              onClick={() => setFilter(filter === c.id ? "" : c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="sidebar-garden">
          <Flower2 size={32} />
          <Leaf size={25} />
          <p>
            平凡的日子，
            <br />
            也值得一起收藏。
          </p>
        </div>
        <div className="profile">
          <span className="avatar">
            {(user?.email || "你")[0].toUpperCase()}
          </span>
          <div>
            <strong>{demo ? "體驗模式" : user?.email?.split("@")[0]}</strong>
            <small>
              {demo ? "資料僅供體驗" : roleNames[role] || "我的帳號"}
            </small>
          </div>
          <button
            className="icon"
            aria-label="登出"
            onClick={() => {
              if (demo) {
                setDemo(false);
                setCal(null);
                setCalendars([]);
                setActive("");
                setEvents([]);
                setCats([]);
                setMembers([]);
              } else logout();
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon mobile"
              onClick={() => setSide(true)}
              aria-label="開啟選單"
            >
              <Menu />
            </button>
            <Leaf size={17} />
            <span>我的生活</span>
            <span className="slash">/</span>
            <strong>{cal?.name || "歡迎回來"}</strong>
          </div>
          <div className="top-actions">
            <span className={"sync " + (!online ? "offline" : "")}>
              <span />
              {!online
                ? "離線 · 僅供查看"
                : demo
                  ? "體驗模式"
                  : !active
                    ? "線上"
                    : serverReady
                      ? "已同步"
                      : "連線中"}
            </span>
            {active && (
              <>
                <button
                  className="icon"
                  aria-label="日曆設定"
                  onClick={() => setModal("settings")}
                >
                  <Settings size={19} />
                </button>
                <button
                  className="share"
                  disabled={busy || !online || role !== "owner"}
                  onClick={share}
                >
                  <Users size={16} />
                  <span>邀請家人</span>
                </button>
              </>
            )}
          </div>
        </header>
        <main className="main">
          <section className="greeting">
            <div>
              <div className="eyebrow">A LITTLE SPACE FOR OUR DAYS</div>
              <h1>
                {cal?.name || "讓生活，多一點相聚"}
                <span className="flower">✿</span>
              </h1>
              <p>把重要的小事記下來，讓每一次相聚都有期待。</p>
            </div>
            <div className="greeting-art" aria-hidden="true">
              <span>✿</span>
              <Leaf size={48} />
              <span>✧</span>
            </div>
          </section>
          {demo && (
            <div className="banner">
              這是體驗日曆，資料不會同步或永久儲存。
              <button
                onClick={() => {
                  setDemo(false);
                  setCal(null);
                  setCalendars([]);
                  setActive("");
                }}
              >
                登入自己的日曆 <ArrowRight size={14} />
              </button>
            </div>
          )}
          {new URLSearchParams(location.search).has("invite") && !demo && (
            <div className="banner">
              你收到一份日曆邀請 🌷
              <button disabled={busy || !online} onClick={() => run(join)}>
                加入日曆 <ArrowRight size={15} />
              </button>
            </div>
          )}
          {!active ? (
            <section className="empty welcome">
              <Flower2 size={52} />
              <h2>從一本日曆，開始我們的日常</h2>
              <p>建立私人日曆，再邀請想一起分享生活的人。</p>
              <button className="primary" onClick={() => setModal("create")}>
                <Plus size={17} />
                建立第一本日曆
              </button>
            </section>
          ) : (
            <>
              <section className="calendar-card">
                <div className="calendar-toolbar">
                  <div className="month-controls">
                    <h2>
                      {+month.slice(0, 4)}
                      <span>年</span> {+month.slice(5)}
                      <span>月</span>
                    </h2>
                    <div className="arrows">
                      <button
                        className="icon"
                        onClick={() => {
                          const m = shiftMonth(month, -1);
                          setMonth(m);
                          setSelected(m + "-01");
                        }}
                        aria-label="上個月"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        className="icon"
                        onClick={() => {
                          const m = shiftMonth(month, 1);
                          setMonth(m);
                          setSelected(m + "-01");
                        }}
                        aria-label="下個月"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <button
                      className="today"
                      onClick={() => {
                        setMonth(today().slice(0, 7));
                        setSelected(today());
                      }}
                    >
                      今天
                    </button>
                  </div>
                  <div className="view-toggle">
                    <button
                      className={view === "month" ? "active" : ""}
                      onClick={() => setView("month")}
                    >
                      <Calendar size={15} />
                      月曆
                    </button>
                    <button
                      className={view === "list" ? "active" : ""}
                      onClick={() => setView("list")}
                    >
                      <List size={15} />
                      行程
                    </button>
                  </div>
                </div>
                <div className="search-line">
                  <Search size={15} />
                  <input
                    aria-label="搜尋行程"
                    placeholder="找找行程、地點…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <span>台灣時間 GMT+8</span>
                </div>
                {view === "month" ? (
                  <>
                    <div className="weekdays">
                      {["一", "二", "三", "四", "五", "六", "日"].map(
                        (d, i) => (
                          <span className={i > 4 ? "weekend" : ""} key={d}>
                            {d}
                          </span>
                        ),
                      )}
                    </div>
                    <div className="month-grid">
                      {monthDays(month).map((date) => {
                        let es = onDate(visible, date);
                        return (
                          <button
                            key={date}
                            className={
                              "day " +
                              (date.slice(0, 7) !== month ? "muted " : "") +
                              (date === selected ? "selected-day " : "") +
                              (date === today() ? "is-today" : "")
                            }
                            onClick={() => setSelected(date)}
                            aria-label={date + "，" + es.length + "個行程"}
                          >
                            <span className="day-number">{+date.slice(8)}</span>
                            <div className="day-events">
                              {es.slice(0, 2).map((e) => (
                                <span
                                  className="mini-event"
                                  key={`${e.id}-${e.occurrence}`}
                                  style={{
                                    "--event-color":
                                      cats.find((c) => c.id === e.category)
                                        ?.color || palette[0],
                                  }}
                                >
                                  <i />
                                  {e.title}
                                </span>
                              ))}
                              {es.length > 2 && (
                                <small>還有 {es.length - 2} 項</small>
                              )}
                            </div>
                            <div className="event-dots">
                              {es.slice(0, 3).map((e) => (
                                <i
                                  key={`${e.id}-${e.occurrence}`}
                                  style={{
                                    background:
                                      cats.find((c) => c.id === e.category)
                                        ?.color || palette[0],
                                  }}
                                />
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="agenda">
                    {Array.from({ length: 31 }, (_, i) =>
                      addDays(month + "-01", i),
                    )
                      .filter((d) => d.slice(0, 7) === month)
                      .map((d) => {
                        let es = onDate(visible, d);
                        return es.length ? (
                          <section key={d}>
                            <h3>
                              {+d.slice(5, 7)} 月 {+d.slice(8)} 日{" "}
                              <small>
                                {
                                  ["日", "一", "二", "三", "四", "五", "六"][
                                    new Date(d + "T00:00:00Z").getUTCDay()
                                  ]
                                }
                              </small>
                            </h3>
                            {es.map((e) => (
                              <EventRow
                                key={`${e.id}-${e.occurrence}`}
                                event={e}
                                cats={cats}
                                open={() => openEvent(e)}
                              />
                            ))}
                          </section>
                        ) : null;
                      })}
                    {!Array.from({ length: 31 }, (_, i) =>
                      addDays(month + "-01", i),
                    ).some(
                      (d) =>
                        d.slice(0, 7) === month &&
                        onDate(visible, d).length > 0,
                    ) && (
                      <div className="empty">
                        <Leaf />
                        <p>這個月還沒有行程，留些空白給美好發生。</p>
                      </div>
                    )}
                  </div>
                )}
                <footer className="calendar-footer">
                  <span>
                    <span className="legend-dot" />
                    今天
                  </span>
                  <span>
                    <Heart size={13} />
                    一起記錄，好好生活
                  </span>
                </footer>
              </section>
              <section className="daily">
                <div className="section-heading">
                  <h2>
                    {+selected.slice(5, 7)} 月 {+selected.slice(8)} 日{" "}
                    <small>
                      星期
                      {
                        ["日", "一", "二", "三", "四", "五", "六"][
                          new Date(selected + "T00:00:00Z").getUTCDay()
                        ]
                      }
                    </small>
                    {selected === today() && <span className="pill">今天</span>}
                  </h2>
                  <span>{dayEvents.length} 個行程</span>
                </div>
                {loading ? (
                  <p className="empty">正在同步行程…</p>
                ) : dayEvents.length ? (
                  dayEvents.map((e) => (
                    <EventRow
                      key={`${e.id}-${e.occurrence}`}
                      event={e}
                      cats={cats}
                      open={() => openEvent(e)}
                    />
                  ))
                ) : (
                  <div className="daily-empty">
                    <span>🌱</span>
                    <div>
                      <strong>今天，留一點時間給自己</strong>
                      <p>
                        {query || filter
                          ? "沒有符合篩選的行程。"
                          : "還沒有安排，新增一個值得期待的小日子吧。"}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        className="icon"
                        disabled={!online}
                        onClick={() => openEvent()}
                        aria-label="新增當日行程"
                      >
                        <Plus />
                      </button>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
          <p className="bottom-note">
            Made for the little moments <span>✿</span> 每個小日子，都有你的位子
          </p>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            className="icon"
            aria-label="關閉提示"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {active && canEdit && (
        <button
          className="fab"
          disabled={!online}
          onClick={() => openEvent()}
          aria-label="新增行程"
        >
          <Plus size={27} />
        </button>
      )}
      {modal === "create" && (
        <Modal title="種下一本新日曆 🌱" close={() => setModal("")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                createCalendar(new FormData(e.target).get("name").trim()),
              );
            }}
          >
            <label>
              日曆名稱
              <input
                name="name"
                required
                maxLength={60}
                placeholder="例如：我們的小日子"
                autoFocus
              />
            </label>
            <p className="help">只有你與受邀加入的人能看見這本日曆。</p>
            <button className="primary full" disabled={busy || !online}>
              建立日曆
            </button>
          </form>
        </Modal>
      )}
      {modal === "event" && (
        <EventForm
          key={editing?.id || "new"}
          event={editing}
          original={events.find((e) => e.id === editing?.id)}
          date={selected}
          cats={cats}
          members={members}
          uid={uid}
          canEdit={canEdit && online}
          busy={busy}
          close={() => setModal("")}
          save={(d, s) => run(() => saveEvent(d, s))}
          remove={(s) => run(() => removeEvent(s))}
        />
      )}
      {modal === "share" && (
        <Modal title="邀請家人，一起收藏日常" close={() => setModal("")}>
          <p>
            把連結傳給想邀請的人。對方註冊、驗證信箱並登入後，即可加入成為檢視者。
          </p>
          <label>
            邀請連結
            <input readOnly value={inviteLink} />
          </label>
          <button
            className="primary full"
            onClick={() =>
              run(async () => {
                await navigator.clipboard.writeText(inviteLink);
                setNotice("連結已複製");
              })
            }
          >
            <Copy size={16} />
            複製邀請連結
          </button>
          <p className="help">
            持有連結的人都能加入，請只分享給信任的人。成員權限可在日曆設定調整。
          </p>
        </Modal>
      )}
      {modal === "categories" && (
        <CategoryManager
          cats={cats}
          active={active}
          demo={demo}
          setCats={setCats}
          run={run}
          busy={busy || !online}
          close={() => setModal("")}
        />
      )}
      {modal === "settings" && (
        <Modal title="日曆與成員設定" close={() => setModal("")}>
          <div className="settings-name">
            <h3>{cal?.name}</h3>
            <span className="pill">{roleNames[role]}</span>
          </div>
          {role === "owner" && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                let name = new FormData(e.target).get("name").trim();
                if (!name) return;
                run(async () => {
                  if (demo) {
                    setCal({ ...cal, name });
                    setCalendars([{ ...cal, name }]);
                  } else
                    await updateDoc(doc(db, "calendars", active), { name });
                  setNotice("日曆名稱已更新");
                });
              }}
            >
              <input
                name="name"
                aria-label="日曆名稱"
                defaultValue={cal?.name}
                required
                maxLength={60}
              />
              <button disabled={busy || !online}>改名</button>
            </form>
          )}
          {canEdit && (
            <button className="full" onClick={() => setModal("categories")}>
              <Settings size={15} />
              管理活動分類與家庭標籤
            </button>
          )}
          <h3>一起使用的人</h3>
          {members.map((m) => (
            <div className="member-row" key={m.id}>
              <span className="avatar">{m.email[0].toUpperCase()}</span>
              <div>
                <strong>
                  {m.email}
                  {m.id === uid ? "（你）" : ""}
                </strong>
                <small>{roleNames[m.role]}</small>
              </div>
              {role === "owner" && m.id !== uid && !demo && (
                <div className="member-actions">
                  <select
                    aria-label={"設定" + m.email + "的權限"}
                    value={m.role}
                    disabled={busy || !online}
                    onChange={(e) =>
                      run(() =>
                        updateDoc(
                          doc(db, "calendars", active, "members", m.id),
                          { role: e.target.value },
                        ),
                      )
                    }
                  >
                    <option value="viewer">檢視者</option>
                    <option value="editor">編輯者</option>
                  </select>
                  <button
                    disabled={busy || !online}
                    onClick={() => run(() => transfer(m.id))}
                  >
                    轉移所有權
                  </button>
                  <button
                    className="danger"
                    disabled={busy || !online}
                    onClick={() => run(() => leave(m.id))}
                  >
                    移除
                  </button>
                </div>
              )}
            </div>
          ))}
          <p className="help">
            擁有者管理成員與日曆；編輯者可管理全部活動與分類；檢視者只能查看。
          </p>
          {role !== "owner" && (
            <button
              className="danger full"
              disabled={busy || !online}
              onClick={() => run(() => leave())}
            >
              退出此日曆
            </button>
          )}
          {role === "owner" && (
            <>
              <p className="help">退出前請先將所有權轉移給另一位成員。</p>
              <button
                className="danger full"
                disabled={busy || !online}
                onClick={() => run(deleteCalendar)}
              >
                刪除整本日曆
              </button>
            </>
          )}
          <details>
            <summary>加入手機桌面</summary>
            <p>
              iPhone：使用 Safari 開啟，點分享 → 加入主畫面。Android：使用
              Chrome 選單 → 安裝應用程式／加到主畫面。
            </p>
          </details>
        </Modal>
      )}
    </div>
  );
}
function Auth({ run, busy, notice, startDemo }) {
  const [mode, setMode] = useState("login");
  return (
    <main className="auth">
      <div className="auth-intro">
        <div className="brand">
          <span className="brand-icon">
            <Flower2 />
          </span>
          共享日曆
        </div>
        <span className="auth-flower">✿</span>
        <h1>
          把日子，
          <br />
          種在一起。
        </h1>
        <p>
          一家人的大小事，都有一個溫柔的位置。
          <br />
          一起安排、一起期待，收藏每一天。
        </p>
        <div className="auth-decoration">
          <Leaf size={65} />
          <Flower2 size={95} />
          <Leaf size={50} />
        </div>
        <span className="eyebrow">OUR DAYS, GROWING TOGETHER</span>
      </div>
      <section className="auth-card">
        <span className="pill">給我們的小日常</span>
        <h2>
          {mode === "login"
            ? "歡迎回家 🌷"
            : mode === "register"
              ? "開始收藏好日子"
              : "找回你的密碼"}
        </h2>
        <p>
          {mode === "login"
            ? "登入，看看接下來有哪些小期待。"
            : mode === "register"
              ? "建立帳號，邀請家人一起記錄生活。"
              : "我們會寄一封密碼重設信給你。"}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            let f = new FormData(e.target);
            run(async () => {
              if (mode === "reset") {
                await sendPasswordResetEmail(auth, f.get("email"));
                alert("若信箱已註冊，你將收到密碼重設信。");
                setMode("login");
              } else if (mode === "register") {
                let c = await createUserWithEmailAndPassword(
                  auth,
                  f.get("email"),
                  f.get("password"),
                );
                await sendEmailVerification(c.user);
              } else
                await signInWithEmailAndPassword(
                  auth,
                  f.get("email"),
                  f.get("password"),
                );
            });
          }}
        >
          <label>
            電子信箱
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="hello@example.com"
              required
            />
          </label>
          {mode !== "reset" && (
            <label>
              密碼
              <input
                type="password"
                name="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                placeholder="至少 6 個字元"
                minLength={6}
                required
              />
            </label>
          )}
          <button className="primary full" disabled={busy}>
            {busy
              ? "處理中…"
              : mode === "login"
                ? "登入日曆"
                : mode === "register"
                  ? "建立帳號"
                  : "寄送重設信"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="auth-links">
          <button
            onClick={() => setMode(mode === "register" ? "login" : "register")}
          >
            {mode === "register" ? "已有帳號？登入" : "還沒有帳號？免費註冊"}
          </button>
          <button onClick={() => setMode(mode === "reset" ? "login" : "reset")}>
            {mode === "reset" ? "返回登入" : "忘記密碼"}
          </button>
        </div>
        <div className="divider">或先走走看看</div>
        <button className="full demo-button" onClick={startDemo}>
          探索體驗日曆 <Leaf size={16} />
        </button>
        <p className="auth-privacy">
          <Heart size={13} />
          私人日曆，只和你邀請的人分享
        </p>
        {notice && (
          <p className="error" role="alert">
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}
function EventRow({ event: e, cats, open }) {
  let c = cats.find((c) => c.id === e.category);
  return (
    <button
      className="event-row"
      onClick={open}
      style={{ "--event-color": c?.color || palette[0] }}
    >
      <div className="event-time">
        {e.allDay ? "全天" : e.start.slice(11, 16)}
        <small>{e.allDay ? "" : e.end.slice(11, 16)}</small>
      </div>
      <div className="event-body">
        <strong>{e.title}</strong>
        <div>
          {e.location && (
            <span>
              <MapPin size={12} />
              {e.location}
            </span>
          )}
          {e.repeat !== "none" && <span>↻ 重複行程</span>}
        </div>
      </div>
      <div className="event-labels">
        {c && <span style={{ background: c.color + "40" }}>{c.name}</span>}
        {e.family
          .map((id) => cats.find((c) => c.id === id))
          .filter(Boolean)
          .map((f) => (
            <small key={f.id}>{f.name}</small>
          ))}
      </div>
      <ChevronRight size={16} />
    </button>
  );
}
function EventForm({
  event,
  original,
  date,
  cats,
  members,
  uid,
  canEdit,
  busy,
  close,
  save,
  remove,
}) {
  let base = event || {
    title: "",
    start: date + "T09:00",
    end: date + "T10:00",
    allDay: false,
    category: "",
    family: [],
    participants: [],
    location: "",
    notes: "",
    repeat: "none",
    until: "",
    exceptions: {},
    createdBy: uid,
  };
  const [scope, setScope] = useState("all"),
    [data, setData] = useState(
      original?.repeat && original.repeat !== "none" ? original : base,
    );
  const change = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const recurring = event && original?.repeat !== "none";
  return (
    <Modal
      title={event ? (canEdit ? "編輯行程" : "行程詳情") : "新增一個小期待"}
      close={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!data.title.trim()) return;
          if (data.end < data.start) {
            alert("結束時間不能早於開始時間");
            return;
          }
          if (data.until && data.until < data.start.slice(0, 10)) {
            alert("重複結束日期不能早於開始日期");
            return;
          }
          save(
            {
              ...data,
              title: data.title.trim(),
              exceptions: scope === "one" ? {} : data.exceptions,
              createdBy: original?.createdBy || uid,
            },
            scope,
          );
        }}
      >
        {recurring && canEdit && (
          <label>
            變更範圍
            <select
              value={scope}
              onChange={(e) => {
                let v = e.target.value;
                setScope(v);
                setData(
                  v === "all"
                    ? original
                    : {
                        ...event,
                        start: event.occurrence + event.start.slice(10),
                        end:
                          addDays(
                            event.occurrence,
                            Math.round(
                              (new Date(event.end.slice(0, 10)) -
                                new Date(event.start.slice(0, 10))) /
                                86400000,
                            ),
                          ) + event.end.slice(10),
                      },
                );
              }}
            >
              <option value="all">整個系列</option>
              <option value="one">僅這一次（{event.occurrence}）</option>
            </select>
          </label>
        )}
        <fieldset disabled={!canEdit || busy}>
          <label>
            活動名稱
            <input
              value={data.title}
              maxLength={100}
              required
              onChange={(e) => change("title", e.target.value)}
              placeholder="為這一天，留一個小期待"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={data.allDay}
              onChange={(e) => {
                change("allDay", e.target.checked);
                if (e.target.checked) {
                  change("start", data.start.slice(0, 10) + "T00:00");
                  change("end", data.end.slice(0, 10) + "T23:59");
                }
              }}
            />
            全天活動
          </label>
          <div className="form-grid">
            <label>
              開始
              <input
                type={data.allDay ? "date" : "datetime-local"}
                value={data.allDay ? data.start.slice(0, 10) : data.start}
                required
                onChange={(e) =>
                  change(
                    "start",
                    e.target.value + (data.allDay ? "T00:00" : ""),
                  )
                }
              />
            </label>
            <label>
              結束
              <input
                type={data.allDay ? "date" : "datetime-local"}
                value={data.allDay ? data.end.slice(0, 10) : data.end}
                required
                onChange={(e) =>
                  change("end", e.target.value + (data.allDay ? "T23:59" : ""))
                }
              />
            </label>
          </div>
          <p className="help">所有時間皆為台灣時間（GMT+8）</p>
          <label>
            活動分類
            <select
              value={data.category}
              onChange={(e) => change("category", e.target.value)}
            >
              <option value="">未分類</option>
              {cats
                .filter((c) => c.kind === "activity")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label>家庭成員標籤</label>
          <div className="choices">
            {cats
              .filter((c) => c.kind === "family")
              .map((c) => (
                <label className="checkbox" key={c.id}>
                  <input
                    type="checkbox"
                    checked={data.family.includes(c.id)}
                    onChange={(e) =>
                      change(
                        "family",
                        e.target.checked
                          ? [...data.family, c.id]
                          : data.family.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.name}
                </label>
              ))}
            {!cats.some((c) => c.kind === "family") && (
              <p className="help">可在分類設定中新增家庭成員標籤。</p>
            )}
          </div>
          <label>參與成員</label>
          <div className="choices">
            {members.map((m) => (
              <label className="checkbox" key={m.id}>
                <input
                  type="checkbox"
                  checked={data.participants.includes(m.id)}
                  onChange={(e) =>
                    change(
                      "participants",
                      e.target.checked
                        ? [...data.participants, m.id]
                        : data.participants.filter((id) => id !== m.id),
                    )
                  }
                />
                {m.email}
              </label>
            ))}
          </div>
          <label>
            地點
            <input
              value={data.location}
              maxLength={200}
              onChange={(e) => change("location", e.target.value)}
              placeholder="在哪裡相聚？"
            />
          </label>
          <label>
            備註
            <textarea
              value={data.notes}
              maxLength={3000}
              onChange={(e) => change("notes", e.target.value)}
              placeholder="想記住的小細節…"
            />
          </label>
          {scope !== "one" && (
            <div className="form-grid">
              <label>
                重複
                <select
                  aria-label="重複頻率"
                  value={data.repeat}
                  onChange={(e) => change("repeat", e.target.value)}
                >
                  <option value="none">不重複</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每週</option>
                  <option value="monthly">每月</option>
                </select>
              </label>
              {data.repeat !== "none" && (
                <label>
                  重複至（可不填）
                  <input
                    type="date"
                    value={data.until}
                    min={data.start.slice(0, 10)}
                    onChange={(e) => change("until", e.target.value)}
                  />
                </label>
              )}
            </div>
          )}
          {data.repeat === "monthly" && (
            <p className="help">若該月沒有指定日期，會在當月最後一天發生。</p>
          )}
        </fieldset>
        {canEdit && (
          <div className="modal-actions">
            {event && (
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => remove(scope)}
              >
                刪除{scope === "one" ? "這一次" : "活動"}
              </button>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "儲存中…" : "儲存行程"}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
function CategoryManager({ cats, active, demo, setCats, run, busy, close }) {
  const [edit, setEdit] = useState(null),
    [name, setName] = useState(""),
    [color, setColor] = useState(palette[0]),
    [kind, setKind] = useState("activity");
  return (
    <Modal title="分類與家庭標籤" close={close}>
      <p className="help">分類由日曆共用，擁有者與編輯者皆可管理。</p>
      {["activity", "family"].map((k) => (
        <section key={k}>
          <h3>{k === "activity" ? "活動分類" : "家庭成員標籤"}</h3>
          {cats
            .filter((c) => c.kind === k)
            .map((c) => (
              <div className="category-row" key={c.id}>
                <span className="color-dot" style={{ background: c.color }} />
                {c.name}
                <button
                  onClick={() => {
                    setEdit(c.id);
                    setName(c.name);
                    setColor(c.color);
                    setKind(c.kind);
                  }}
                >
                  編輯
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (!confirm("刪除此分類？原有活動會保留。")) return;
                      if (demo)
                        setCats((old) => old.filter((x) => x.id !== c.id));
                      else
                        await deleteDoc(
                          doc(db, "calendars", active, "categories", c.id),
                        );
                    })
                  }
                >
                  刪除
                </button>
              </div>
            ))}
        </section>
      ))}
      <form
        className="category-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            let data = { name: name.trim(), color, kind };
            if (!data.name) return;
            if (demo)
              setCats((old) =>
                edit
                  ? old.map((c) => (c.id === edit ? { ...data, id: edit } : c))
                  : [...old, { ...data, id: crypto.randomUUID() }],
              );
            else if (edit)
              await setDoc(
                doc(db, "calendars", active, "categories", edit),
                data,
              );
            else
              await addDoc(
                collection(db, "calendars", active, "categories"),
                data,
              );
            setEdit(null);
            setName("");
          });
        }}
      >
        <h3>{edit ? "編輯分類" : "新增分類"}</h3>
        <label>
          類型
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="activity">活動分類</option>
            <option value="family">家庭成員標籤</option>
          </select>
        </label>
        <label>
          名稱
          <input
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：家庭聚餐、爸爸"
          />
        </label>
        <label>分類顏色</label>
        <div className="color-picker">
          {palette.map((c) => (
            <button
              type="button"
              aria-label={c}
              key={c}
              style={{ background: c }}
              className={color === c ? "picked" : ""}
              onClick={() => setColor(c)}
            >
              {color === c && <Check size={17} />}
            </button>
          ))}
          <input
            type="color"
            aria-label="自訂顏色"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <button className="primary full" disabled={busy}>
          {edit ? "儲存變更" : "新增分類"}
        </button>
        {edit && (
          <button
            type="button"
            onClick={() => {
              setEdit(null);
              setName("");
            }}
          >
            取消編輯
          </button>
        )}
      </form>
    </Modal>
  );
}
createRoot(document.getElementById("root")).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register("/sw.js");
