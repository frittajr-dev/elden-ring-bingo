import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, onValue, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

import { firebaseConfig } from "./firebase-config.js";
import { TASKS } from "./tasks.js";

const $ = (s) => document.querySelector(s);
const PLAYER_COLORS = ["#6cbcff", "#ff7cc8", "#80df92"];

let app = null;
let auth = null;
let db = null;
let user = null;
let roomCode = "";
let meName = "";
let roomData = null;
let unsubscribe = null;
let timerHandle = null;
let ready = false;

const params = new URLSearchParams(location.search);

if (params.get("overlay") === "1") {
  document.body.classList.add("overlay", "compact");
}

$("#playerName").value = params.get("name") || localStorage.getItem("erb_name") || "";
$("#roomCode").value = cleanCode(params.get("room") || "");

function cleanCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function shuffle(input) {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function setStatus(message, type = "wait") {
  const el = $("#status");
  el.textContent = message;
  el.className = `status status-${type}`;
}

function esc(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
}

function configLooksReady() {
  const required = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
  return required.every((key) => {
    const value = firebaseConfig[key];
    return typeof value === "string" && value.trim() && !value.includes("HIER_EINTRAGEN");
  });
}

function firebaseErrorText(error) {
  const code = error?.code || "unbekannter-fehler";
  const msg = error?.message || String(error);
  if (code.includes("auth/operation-not-allowed")) {
    return "Anonymous Login ist noch AUS.\nFirebase → Authentication → Sign-in method → Anonymous → Aktivieren.";
  }
  if (code.includes("auth/unauthorized-domain")) {
    return "Diese Domain ist in Firebase Authentication nicht erlaubt.\nFirebase → Authentication → Settings → Authorized domains → deine github.io-Domain hinzufügen.";
  }
  if (code.includes("PERMISSION_DENIED") || msg.includes("PERMISSION_DENIED")) {
    return "Realtime-Database-Regeln blockieren den Zugriff.\nFirebase → Realtime Database → Rules → Inhalt aus database.rules.json einfügen → Publish.";
  }
  return `Firebase-Fehler: ${code}\n${msg}`;
}

async function init() {
  try {
    if (TASKS.length !== 100) {
      throw new Error(`tasks.js enthält ${TASKS.length} Aufgaben statt exakt 100.`);
    }

    if (!configLooksReady()) {
      setStatus(
        "Noch nicht eingerichtet: Öffne firebase-config.js und ersetze ALLE HIER_EINTRAGEN-Werte mit deiner Firebase-Web-Konfiguration.",
        "error"
      );
      return;
    }

    setStatus("Verbinde mit Firebase …", "wait");

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getDatabase(app);

    const credential = await signInAnonymously(auth);
    user = credential.user;
    ready = true;

    $("#createBtn").disabled = false;
    $("#joinBtn").disabled = false;

    setStatus("✓ Firebase verbunden. Du kannst jetzt einen Raum erstellen oder beitreten.", "ok");

    if (params.get("room") && params.get("name")) {
      await joinRoom(true);
    }
  } catch (error) {
    console.error(error);
    setStatus(firebaseErrorText(error), "error");
  }
}

async function createRoom() {
  try {
    if (!ready || !user) return toast("Firebase ist noch nicht bereit.");

    meName = $("#playerName").value.trim();
    if (!meName) return toast("Bitte zuerst deinen Namen eingeben.");

    const hours = Math.max(1, Math.min(12, Number($("#duration").value) || 12));
    roomCode = cleanCode($("#roomCode").value) || randomCode();

    const roomRef = ref(db, `rooms/${roomCode}`);
    if ((await get(roomRef)).exists()) {
      return toast("Dieser Raumcode existiert bereits. Feld leeren oder einen anderen Code wählen.");
    }

    const order = shuffle([...Array(TASKS.length).keys()]);

    await set(roomRef, {
      version: 2,
      createdAt: serverTimestamp(),
      hostUid: user.uid,
      durationMs: hours * 60 * 60 * 1000,
      startedAt: null,
      order,
      players: {
        [user.uid]: {
          name: meName,
          joinedAt: serverTimestamp()
        }
      }
    });

    $("#roomCode").value = roomCode;
    localStorage.setItem("erb_name", meName);

    subscribeRoom();
    toast(`Raum ${roomCode} erstellt.`);
  } catch (error) {
    console.error(error);
    toast(firebaseErrorText(error));
    setStatus(firebaseErrorText(error), "error");
  }
}

async function joinRoom(auto = false) {
  try {
    if (!ready || !user) {
      if (!auto) toast("Firebase ist noch nicht bereit.");
      return;
    }

    meName = (params.get("name") || $("#playerName").value).trim();
    roomCode = cleanCode(params.get("room") || $("#roomCode").value);

    if (!meName || !roomCode) {
      if (!auto) toast("Bitte Name und Raumcode eingeben.");
      return;
    }

    const roomRef = ref(db, `rooms/${roomCode}`);
    const snap = await get(roomRef);

    if (!snap.exists()) {
      return toast("Raum nicht gefunden. Prüfe den Code.");
    }

    const data = snap.val();
    const players = data.players || {};

    if (!players[user.uid] && Object.keys(players).length >= 3) {
      return toast("Dieser Raum hat bereits 3 Spieler.");
    }

    await set(ref(db, `rooms/${roomCode}/players/${user.uid}`), {
      name: meName,
      joinedAt: serverTimestamp()
    });

    localStorage.setItem("erb_name", meName);
    subscribeRoom();

    if (!auto) toast(`Raum ${roomCode} beigetreten.`);
  } catch (error) {
    console.error(error);
    toast(firebaseErrorText(error));
  }
}

function subscribeRoom() {
  if (unsubscribe) unsubscribe();

  unsubscribe = onValue(
    ref(db, `rooms/${roomCode}`),
    (snap) => {
      if (!snap.exists()) return;
      roomData = snap.val();
      render();
    },
    (error) => {
      console.error(error);
      toast(firebaseErrorText(error));
    }
  );

  $("#setup").hidden = true;
  $("#game").hidden = false;
  $("#roomLabel").textContent = roomCode;
  $("#meLabel").textContent = meName;

  const u = new URL(location.href);
  u.searchParams.set("room", roomCode);
  u.searchParams.delete("overlay");
  u.searchParams.delete("name");
  history.replaceState(null, "", u);
}

async function startGame() {
  try {
    if (!roomData || roomData.hostUid !== user.uid) return toast("Nur der Host kann starten.");
    if (roomData.startedAt) return toast("Das Bingo läuft bereits.");

    await update(ref(db, `rooms/${roomCode}`), {
      startedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    toast(firebaseErrorText(error));
  }
}

async function claimCell(boardIndex) {
  try {
    if (!roomData?.startedAt) return toast("Der Host muss das Bingo zuerst starten.");
    if (isEnded()) return toast("Das Bingo ist bereits beendet.");

    const taskId = roomData.order[boardIndex];
    const cellRef = ref(db, `rooms/${roomCode}/cells/${boardIndex}`);

    const result = await runTransaction(cellRef, (current) => {
      if (current !== null) return;
      return {
        ownerUid: user.uid,
        ownerName: meName,
        taskId,
        difficulty: TASKS[taskId].d,
        claimedAt: Date.now()
      };
    });

    if (result.committed) {
      toast(`Feld #${boardIndex + 1} geclaimt.`);
    } else {
      toast("Zu spät – dieses Feld gehört bereits jemand anderem.");
    }
  } catch (error) {
    console.error(error);
    toast(firebaseErrorText(error));
  }
}

function isEnded() {
  if (!roomData) return false;

  const full = Object.keys(roomData.cells || {}).length >= TASKS.length;
  const timeOver =
    roomData.startedAt &&
    Date.now() >= Number(roomData.startedAt) + Number(roomData.durationMs);

  return Boolean(full || timeOver);
}

function linesFor(uid, cells) {
  let lines = 0;
  const own = (i) => cells?.[i]?.ownerUid === uid;

  for (let r = 0; r < 10; r++) {
    if ([...Array(10)].every((_, c) => own(r * 10 + c))) lines++;
  }

  for (let c = 0; c < 10; c++) {
    if ([...Array(10)].every((_, r) => own(r * 10 + c))) lines++;
  }

  if ([...Array(10)].every((_, i) => own(i * 10 + i))) lines++;
  if ([...Array(10)].every((_, i) => own(i * 10 + (9 - i)))) lines++;

  return lines;
}

function scoreFor(uid) {
  const cells = roomData.cells || {};
  let base = 0;
  let extreme = 0;
  let count = 0;

  Object.values(cells).forEach((cell) => {
    if (cell.ownerUid === uid) {
      base += Number(cell.difficulty) || 0;
      count++;
      if (Number(cell.difficulty) === 3) extreme++;
    }
  });

  const bingos = linesFor(uid, cells);

  return {
    base,
    bingos,
    total: base + bingos * 5,
    extreme,
    count
  };
}

function playerColor(uid) {
  const ids = Object.keys(roomData.players || {});
  const idx = Math.max(0, ids.indexOf(uid));
  return PLAYER_COLORS[idx % PLAYER_COLORS.length];
}

function render() {
  if (!roomData || !Array.isArray(roomData.order)) return;

  const players = roomData.players || {};
  const cells = roomData.cells || {};
  const started = Boolean(roomData.startedAt);
  const ended = isEnded();

  $("#startBtn").hidden = !(roomData.hostUid === user?.uid && !started);
  $("#waitingNotice").hidden = started;
  $("#claimedLabel").textContent = `${Object.keys(cells).length} / ${TASKS.length}`;

  document.body.classList.toggle("ended", ended);

  const rows = Object.entries(players)
    .map(([uid, p]) => ({ uid, name: p.name, ...scoreFor(uid) }))
    .sort((a, b) =>
      b.total - a.total ||
      b.extreme - a.extreme ||
      b.bingos - a.bingos
    );

  $("#scores").innerHTML = rows.map((s, i) => `
    <div class="score-card" style="--player:${playerColor(s.uid)}">
      <div class="name">${i === 0 && started ? "♛ " : ""}${esc(s.name)}</div>
      <div class="pts">${s.total} P</div>
      <div class="meta">
        Felder ${s.count} · Basis ${s.base} · Bingos ${s.bingos} (+${s.bingos * 5}) · Rot ${s.extreme}
      </div>
    </div>
  `).join("");

  const board = $("#board");
  board.innerHTML = "";

  roomData.order.forEach((taskId, boardIndex) => {
    const task = TASKS[taskId];
    if (!task) return;

    const claim = cells[boardIndex];
    const el = document.createElement("div");

    el.className = `cell d${task.d}${claim ? " claimed" : ""}`;
    el.style.setProperty("--owner", claim ? playerColor(claim.ownerUid) : "#777");
    el.dataset.owner = claim?.ownerName || "";

    el.innerHTML = `
      <div class="points">${task.d}P</div>
      <div class="task">${esc(task.t)}</div>
      <div class="num">#${boardIndex + 1}</div>
    `;

    if (!claim && !ended) {
      el.addEventListener("click", () => claimCell(boardIndex));
    }

    board.appendChild(el);
  });

  updateTimer();
}

function updateTimer() {
  clearInterval(timerHandle);

  const draw = () => {
    if (!roomData?.startedAt) {
      $("#timer").textContent = "WARTET";
      return;
    }

    const endAt = Number(roomData.startedAt) + Number(roomData.durationMs);
    const left = Math.max(0, endAt - Date.now());

    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    const s = Math.floor((left % 60_000) / 1_000);

    $("#timer").textContent =
      `${String(h).padStart(2, "0")}:` +
      `${String(m).padStart(2, "0")}:` +
      `${String(s).padStart(2, "0")}`;

    if (left === 0) {
      document.body.classList.add("ended");
    }
  };

  draw();
  timerHandle = setInterval(draw, 1000);
}

async function copyText(text, success) {
  try {
    await navigator.clipboard.writeText(text);
    toast(success);
  } catch {
    prompt("Link kopieren:", text);
  }
}

$("#createBtn").addEventListener("click", createRoom);
$("#joinBtn").addEventListener("click", () => joinRoom(false));
$("#startBtn").addEventListener("click", startGame);

$("#compactBtn").addEventListener("click", () => {
  document.body.classList.toggle("compact");
});

$("#inviteBtn").addEventListener("click", async () => {
  if (!roomCode) return;
  const url = new URL(location.href);
  url.searchParams.set("room", roomCode);
  url.searchParams.delete("name");
  url.searchParams.delete("overlay");
  await copyText(url.toString(), "Einladungslink kopiert.");
});

$("#overlayBtn").addEventListener("click", async () => {
  if (!roomCode) return;
  const url = new URL(location.href);
  url.searchParams.set("room", roomCode);
  url.searchParams.set("name", meName);
  url.searchParams.set("overlay", "1");
  await copyText(url.toString(), "Overlay-Link kopiert.");
});

$("#roomCode").addEventListener("input", (e) => {
  e.target.value = cleanCode(e.target.value);
});

init();
