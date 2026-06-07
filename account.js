// ===== Auto Glow — Customer accounts (sign-in + my details) =====
import {
  auth, db, sendLink, completeLinkSignIn, onAuthStateChanged, signOut,
  collection, addDoc, getDocs, getDoc, doc, query, where, orderBy, serverTimestamp,
  fmtWhen, isUpcoming, STATUS_LABEL, escapeText,
} from "./fb.js";

const navBtn = document.getElementById("navAccount");
const modal = document.getElementById("agAuth");
const panel = document.getElementById("agPanel");
let user = null;

onAuthStateChanged(auth, (u) => {
  user = u;
  if (navBtn) navBtn.textContent = u ? "My Details" : "Sign In";
});

// finish sign-in if we arrived from an email link
completeLinkSignIn().then((done) => { if (done) openPanel(); });

// ---------- modal helpers ----------
const open = (el) => { el.classList.add("open"); el.setAttribute("aria-hidden", "false"); };
const close = (el) => { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); };
document.querySelectorAll("[data-ag-close]").forEach((b) =>
  b.addEventListener("click", () => close(b.closest(".ag-overlay")))
);
[modal, panel].forEach((el) => el?.addEventListener("click", (e) => { if (e.target === el) close(el); }));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") [modal, panel].forEach((el) => el?.classList.contains("open") && close(el));
});

// ---------- sign-in (passwordless email link) ----------
const emailIn = document.getElementById("agEmail");
const sendBtn = document.getElementById("agSend");
const authMsg = document.getElementById("agAuthMsg");
const msg = (t, bad = false) => { if (authMsg) { authMsg.textContent = t; authMsg.classList.toggle("bad", bad); } };

sendBtn?.addEventListener("click", async () => {
  const email = emailIn.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("Enter a valid email.", true);
  sendBtn.disabled = true;
  msg("Sending your sign-in link…");
  try {
    await sendLink(email);
    msg(`Done! Check ${email} and tap the sign-in link. You can close this.`);
  } catch (err) {
    msg(err.message, true);
  }
  sendBtn.disabled = false;
});
emailIn?.addEventListener("keydown", (e) => e.key === "Enter" && sendBtn.click());

// ---------- my details ----------
const listEl = document.getElementById("agBookings");
const whoEl = document.getElementById("agWho");
const adminLink = document.getElementById("agAdminLink");
const statusChip = (s) => `<span class="ag-status ag-${s}">${STATUS_LABEL[s] || s}</span>`;

async function openPanel() {
  if (!user) return;
  open(panel);
  whoEl.textContent = user.email;
  listEl.innerHTML = `<p class="ag-empty">Loading your details…</p>`;

  try {
    // bookings linked by account id OR by the email used at booking time
    const [byUid, byEmail, adminSnap] = await Promise.all([
      getDocs(query(collection(db, "bookings"), where("userId", "==", user.uid))),
      getDocs(query(collection(db, "bookings"), where("email", "==", user.email))),
      getDoc(doc(db, "admins", user.email)),
    ]);
    adminLink.hidden = !adminSnap.exists();
    const map = new Map();
    [...byUid.docs, ...byEmail.docs].forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
    const bookings = [...map.values()].sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));

    if (!bookings.length) {
      listEl.innerHTML = `<p class="ag-empty">No details booked yet — your next shine is one tap away. <a href="#book">Book now</a>.</p>`;
      return;
    }
    const card = (b) => `
      <article class="ag-bk">
        <div class="ag-bk-head"><strong>${fmtWhen(b)}</strong>${statusChip(b.status)}</div>
        <p>${escapeText(b.service)} · ${escapeText(b.size)} · ${escapeText(b.car)}</p>
        <p class="ag-bk-sub">${escapeText(b.address)}</p>
        <p class="ag-bk-price">$${b.price}</p>
      </article>`;
    const upcoming = bookings.filter(isUpcoming);
    const past = bookings.filter((b) => !isUpcoming(b)).reverse();
    listEl.innerHTML =
      (upcoming.length ? `<h4>Upcoming</h4>` + upcoming.map(card).join("") : "") +
      (past.length ? `<h4>Past details</h4>` + past.map(card).join("") : "");
  } catch (err) {
    listEl.innerHTML = `<p class="ag-empty">Couldn't load bookings — ${escapeText(err.message)}</p>`;
  }
}

document.getElementById("agSignOut")?.addEventListener("click", async () => {
  await signOut(auth);
  close(panel);
});

navBtn?.addEventListener("click", () => {
  if (user) openPanel();
  else { msg(""); open(modal); emailIn.focus(); }
});

// ---------- save bookings from the wizard ----------
window.addEventListener("ag:booking", async (e) => {
  const s = e.detail;
  const saveEl = document.getElementById("bwSaveState");
  const row = {
    userId: user?.uid || null,
    email: s.email || user?.email || null,
    name: s.name, phone: s.phone, pref: s.pref, address: s.address,
    service: s.service, price: s.price, size: s.size, car: s.car,
    cond: s.cond || null, notes: s.notes || null,
    date: `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}-${String(s.date.getDate()).padStart(2, "0")}`,
    time: s.time, status: "requested", createdAt: serverTimestamp(),
  };
  try {
    await addDoc(collection(db, "bookings"), row);
    if (saveEl) saveEl.textContent = "Booking saved ✓";
  } catch (err) {
    if (saveEl) saveEl.textContent = "We couldn't sync this booking — call us to confirm.";
  }
});
