// ===== Auto Glow — Master dashboard (owner) =====
import {
  auth, db, sendLink, completeLinkSignIn, onAuthStateChanged, signOut,
  collection, getDocs, getDoc, doc, updateDoc, query, orderBy,
  fmtWhen, isUpcoming, STATUS_LABEL, escapeText,
} from "./fb.js";

const gate = document.getElementById("admGate");
const dash = document.getElementById("admDash");
const denied = document.getElementById("admDenied");
const whoEl = document.getElementById("admWho");
const signOutBtn = document.getElementById("admSignOut");
const listEl = document.getElementById("admList");
const msgEl = document.getElementById("gateMsg");

let bookings = [];
let filter = "active";
const esc = escapeText;
const msg = (t, bad = false) => { msgEl.textContent = t; msgEl.classList.toggle("bad", bad); };

// ---------- auth gate (passwordless link) ----------
const emailIn = document.getElementById("gateEmail");
document.getElementById("gateSend").addEventListener("click", async () => {
  const email = emailIn.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("Enter a valid email.", true);
  msg("Sending your sign-in link…");
  try {
    await sendLink(email);
    msg("Link sent — check your email and tap it to open the dashboard.");
  } catch (err) {
    msg(err.message, true);
  }
});
emailIn.addEventListener("keydown", (e) => e.key === "Enter" && document.getElementById("gateSend").click());
signOutBtn.addEventListener("click", async () => { await signOut(auth); location.reload(); });

// ---------- boot ----------
completeLinkSignIn().catch((e) => msg(e.message, true));
onAuthStateChanged(auth, (u) => boot(u));

async function boot(user) {
  if (!user) { gate.hidden = false; dash.hidden = true; denied.hidden = true; return; }
  whoEl.textContent = user.email;
  signOutBtn.hidden = false;
  const adminSnap = await getDoc(doc(db, "admins", user.email));
  gate.hidden = true;
  if (!adminSnap.exists()) { denied.hidden = false; dash.hidden = true; return; }
  denied.hidden = true;
  dash.hidden = false;
  await load();
}

async function load() {
  listEl.innerHTML = `<p class="ag-empty">Loading bookings…</p>`;
  try {
    const snap = await getDocs(query(collection(db, "bookings"), orderBy("date"), orderBy("time")));
    bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    stats();
    render();
  } catch (err) {
    listEl.innerHTML = `<p class="ag-empty">Couldn't load: ${esc(err.message)}</p>`;
  }
}

function stats() {
  const todayStr = new Date().toISOString().slice(0, 10);
  document.getElementById("stToday").textContent = bookings.filter((b) => b.date === todayStr && b.status !== "cancelled").length;
  document.getElementById("stUpcoming").textContent = bookings.filter(isUpcoming).length;
  const done = bookings.filter((b) => b.status === "completed");
  document.getElementById("stDone").textContent = done.length;
  document.getElementById("stRevenue").textContent = "$" + done.reduce((a, b) => a + Number(b.price), 0);
}

function render() {
  const shown = bookings.filter((b) => {
    if (filter === "all") return true;
    if (filter === "active") return b.status === "requested" || b.status === "confirmed";
    return b.status === filter;
  });
  if (!shown.length) { listEl.innerHTML = `<p class="ag-empty">Nothing here.</p>`; return; }
  listEl.innerHTML = shown.map((b) => `
    <article class="adm-bk" data-id="${b.id}">
      <div class="adm-bk-main">
        <div class="adm-bk-when"><strong>${fmtWhen(b)}</strong><span class="ag-status ag-${b.status}">${STATUS_LABEL[b.status]}</span></div>
        <p class="adm-bk-who">${esc(b.name)} · <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a> <em>(${esc(b.pref)})</em>${b.email ? " · " + esc(b.email) : ""}</p>
        <p>${esc(b.service)} · ${esc(b.size)} · ${esc(b.car)}${b.cond ? " · " + esc(b.cond) : ""} · <strong>$${b.price}</strong></p>
        <p class="adm-bk-sub">${esc(b.address)}${b.notes ? ` — “${esc(b.notes)}”` : ""}</p>
      </div>
      <div class="adm-bk-actions">
        ${b.status === "requested" ? `<button class="btn btn-primary" data-set="confirmed">Confirm</button>` : ""}
        ${b.status !== "completed" && b.status !== "cancelled" ? `<button class="btn btn-primary" data-set="completed">✓ Done</button>` : ""}
        ${b.status === "requested" || b.status === "confirmed" ? `<button class="btn btn-ghost" data-set="cancelled">Cancel</button>` : ""}
        ${b.status === "completed" || b.status === "cancelled" ? `<button class="btn btn-ghost" data-set="requested">Reopen</button>` : ""}
      </div>
    </article>`).join("");
}

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-set]");
  if (!btn) return;
  const id = btn.closest(".adm-bk").dataset.id;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "bookings", id), { status: btn.dataset.set });
    const bk = bookings.find((b) => b.id === id);
    if (bk) bk.status = btn.dataset.set;
    stats();
    render();
  } catch (err) {
    btn.disabled = false;
    alert("Update failed: " + err.message);
  }
});

document.getElementById("admFilters").addEventListener("click", (e) => {
  const chip = e.target.closest(".bw-chip");
  if (!chip) return;
  document.querySelectorAll("#admFilters .bw-chip").forEach((c) => c.classList.remove("selected"));
  chip.classList.add("selected");
  filter = chip.dataset.f;
  render();
});
document.getElementById("admRefresh").addEventListener("click", load);
