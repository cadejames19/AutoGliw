// ===== Auto Glow — Customer accounts (sign-in + my details) =====
import { supa, fmtWhen, isUpcoming, STATUS_LABEL } from "./supa.js";

const navBtn = document.getElementById("navAccount");
const modal = document.getElementById("agAuth");
const panel = document.getElementById("agPanel");

let user = null;

// ---------- auth state ----------
const refreshUser = async () => {
  const { data } = await supa.auth.getSession();
  user = data.session?.user || null;
  if (navBtn) navBtn.textContent = user ? "My Details" : "Sign In";
};
supa.auth.onAuthStateChange(() => refreshUser());
refreshUser();

// ---------- modal helpers ----------
const open = (el) => {
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
};
const close = (el) => {
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
};
document.querySelectorAll("[data-ag-close]").forEach((b) =>
  b.addEventListener("click", () => close(b.closest(".ag-overlay")))
);
[modal, panel].forEach((el) => {
  el?.addEventListener("click", (e) => {
    if (e.target === el) close(el);
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") [modal, panel].forEach((el) => el?.classList.contains("open") && close(el));
});

// ---------- sign-in flow (email code / magic link) ----------
const emailIn = document.getElementById("agEmail");
const codeIn = document.getElementById("agCode");
const sendBtn = document.getElementById("agSend");
const verifyBtn = document.getElementById("agVerify");
const authMsg = document.getElementById("agAuthMsg");
const stepEmail = document.getElementById("agStepEmail");
const stepCode = document.getElementById("agStepCode");

const msg = (t, bad = false) => {
  if (authMsg) {
    authMsg.textContent = t;
    authMsg.classList.toggle("bad", bad);
  }
};

sendBtn?.addEventListener("click", async () => {
  const email = emailIn.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("Enter a valid email.", true);
  sendBtn.disabled = true;
  msg("Sending…");
  const { error } = await supa.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  sendBtn.disabled = false;
  if (error) return msg(error.message, true);
  stepEmail.hidden = true;
  stepCode.hidden = false;
  msg(`We emailed ${email}. Enter the code, or tap the link in the email.`);
  codeIn.focus();
});

verifyBtn?.addEventListener("click", async () => {
  const token = codeIn.value.trim();
  if (token.length < 6) return msg("Enter the 6-digit code from the email.", true);
  verifyBtn.disabled = true;
  msg("Checking…");
  const { error } = await supa.auth.verifyOtp({ email: emailIn.value.trim(), token, type: "email" });
  verifyBtn.disabled = false;
  if (error) return msg(error.message, true);
  close(modal);
  openPanel();
});

codeIn?.addEventListener("keydown", (e) => e.key === "Enter" && verifyBtn.click());
emailIn?.addEventListener("keydown", (e) => e.key === "Enter" && sendBtn.click());

// ---------- my details panel ----------
const listEl = document.getElementById("agBookings");
const whoEl = document.getElementById("agWho");
const adminLink = document.getElementById("agAdminLink");

const statusChip = (s) => `<span class="ag-status ag-${s}">${STATUS_LABEL[s] || s}</span>`;

async function openPanel() {
  await refreshUser();
  if (!user) return;
  open(panel);
  whoEl.textContent = user.email;
  listEl.innerHTML = `<p class="ag-empty">Loading your details…</p>`;

  const [{ data: bookings, error }, { data: adminRow }] = await Promise.all([
    supa.from("bookings").select("*").order("date", { ascending: true }),
    supa.from("admins").select("email").maybeSingle(),
  ]);
  adminLink.hidden = !adminRow;
  if (error) {
    listEl.innerHTML = `<p class="ag-empty">Couldn't load bookings — try again shortly.</p>`;
    return;
  }
  if (!bookings.length) {
    listEl.innerHTML = `<p class="ag-empty">No details booked yet — your next shine is one tap away. <a href="#book">Book now</a>.</p>`;
    return;
  }
  const upcoming = bookings.filter(isUpcoming);
  const past = bookings.filter((b) => !isUpcoming(b)).reverse();
  const card = (b) => `
    <article class="ag-bk">
      <div class="ag-bk-head"><strong>${fmtWhen(b)}</strong>${statusChip(b.status)}</div>
      <p>${b.service} · ${b.size} · ${escapeText(b.car)}</p>
      <p class="ag-bk-sub">${escapeText(b.address)}</p>
      <p class="ag-bk-price">$${b.price}</p>
    </article>`;
  listEl.innerHTML =
    (upcoming.length ? `<h4>Upcoming</h4>` + upcoming.map(card).join("") : "") +
    (past.length ? `<h4>Past details</h4>` + past.map(card).join("") : "");
}

const escapeText = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

document.getElementById("agSignOut")?.addEventListener("click", async () => {
  await supa.auth.signOut();
  close(panel);
});

// ---------- navbar button ----------
navBtn?.addEventListener("click", async () => {
  await refreshUser();
  if (user) openPanel();
  else {
    stepEmail.hidden = false;
    stepCode.hidden = true;
    msg("");
    open(modal);
    emailIn.focus();
  }
});

// ---------- save bookings from the wizard ----------
window.addEventListener("ag:booking", async (e) => {
  const s = e.detail;
  const saveEl = document.getElementById("bwSaveState");
  const row = {
    user_id: user?.id || null,
    email: s.email || user?.email || null,
    name: s.name,
    phone: s.phone,
    pref: s.pref,
    address: s.address,
    service: s.service,
    price: s.price,
    size: s.size,
    car: s.car,
    cond: s.cond || null,
    notes: s.notes || null,
    date: `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}-${String(s.date.getDate()).padStart(2, "0")}`,
    time: s.time,
  };
  const { error } = await supa.from("bookings").insert(row);
  if (saveEl) saveEl.textContent = error ? "We couldn't sync this booking — call us to confirm." : "Booking saved ✓";
});
