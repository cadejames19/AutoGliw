// ===== Auto Glow — Master dashboard (owner) =====
import { supa, fmtWhen, isUpcoming, STATUS_LABEL } from "./supa.js";

const gate = document.getElementById("admGate");
const dash = document.getElementById("admDash");
const denied = document.getElementById("admDenied");
const whoEl = document.getElementById("admWho");
const signOut = document.getElementById("admSignOut");
const listEl = document.getElementById("admList");
const msgEl = document.getElementById("gateMsg");

let bookings = [];
let filter = "active";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const msg = (t, bad = false) => {
  msgEl.textContent = t;
  msgEl.classList.toggle("bad", bad);
};

// ---------- auth gate ----------
const emailIn = document.getElementById("gateEmail");
const codeIn = document.getElementById("gateCode");
document.getElementById("gateSend").addEventListener("click", async () => {
  const email = emailIn.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("Enter a valid email.", true);
  msg("Sending…");
  const { error } = await supa.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) return msg(error.message, true);
  document.getElementById("gateStepEmail").hidden = true;
  document.getElementById("gateStepCode").hidden = false;
  msg("Code sent — check your email (or tap its link).");
  codeIn.focus();
});
document.getElementById("gateVerify").addEventListener("click", async () => {
  const { error } = await supa.auth.verifyOtp({ email: emailIn.value.trim(), token: codeIn.value.trim(), type: "email" });
  if (error) return msg(error.message, true);
  boot();
});
codeIn.addEventListener("keydown", (e) => e.key === "Enter" && document.getElementById("gateVerify").click());
emailIn.addEventListener("keydown", (e) => e.key === "Enter" && document.getElementById("gateSend").click());
signOut.addEventListener("click", async () => {
  await supa.auth.signOut();
  location.reload();
});

// ---------- dashboard ----------
async function boot() {
  const { data } = await supa.auth.getSession();
  const user = data.session?.user;
  if (!user) return; // stay on gate
  whoEl.textContent = user.email;
  signOut.hidden = false;
  const { data: adminRow } = await supa.from("admins").select("email").maybeSingle();
  gate.hidden = true;
  if (!adminRow) {
    denied.hidden = false;
    return;
  }
  dash.hidden = false;
  await load();
}

async function load() {
  listEl.innerHTML = `<p class="ag-empty">Loading bookings…</p>`;
  const { data, error } = await supa
    .from("bookings")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) {
    listEl.innerHTML = `<p class="ag-empty">Couldn't load: ${esc(error.message)}</p>`;
    return;
  }
  bookings = data;
  stats();
  render();
}

function stats() {
  const todayStr = new Date().toISOString().slice(0, 10);
  document.getElementById("stToday").textContent = bookings.filter(
    (b) => b.date === todayStr && b.status !== "cancelled"
  ).length;
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
  if (!shown.length) {
    listEl.innerHTML = `<p class="ag-empty">Nothing here.</p>`;
    return;
  }
  listEl.innerHTML = shown
    .map(
      (b) => `
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
    </article>`
    )
    .join("");
}

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-set]");
  if (!btn) return;
  const id = btn.closest(".adm-bk").dataset.id;
  btn.disabled = true;
  const { error } = await supa.from("bookings").update({ status: btn.dataset.set }).eq("id", id);
  if (error) {
    btn.disabled = false;
    alert("Update failed: " + error.message);
    return;
  }
  const bk = bookings.find((b) => b.id === id);
  if (bk) bk.status = btn.dataset.set;
  stats();
  render();
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

supa.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN") boot();
});
boot();
