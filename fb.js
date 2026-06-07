// ===== Auto Glow — Firebase client (shared by site + dashboard) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  onAuthStateChanged, signOut,
  collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where, orderBy, serverTimestamp,
};

// passwordless email-link helpers ----------------------------------------
export const sendLink = (email) =>
  sendSignInLinkToEmail(auth, email, {
    url: location.href.split("#")[0],
    handleCodeInApp: true,
  }).then(() => localStorage.setItem("ag_email", email));

// Call on every page load: completes sign-in if the user arrived via an email link.
export async function completeLinkSignIn() {
  if (!isSignInWithEmailLink(auth, location.href)) return false;
  let email = localStorage.getItem("ag_email");
  if (!email) email = window.prompt("Confirm the email you used to sign in:");
  if (!email) return false;
  await signInWithEmailLink(auth, email, location.href);
  localStorage.removeItem("ag_email");
  // strip the auth params from the URL
  history.replaceState({}, "", location.pathname + location.hash);
  return true;
}

// shared formatting -------------------------------------------------------
export const fmtWhen = (b) => {
  const d = new Date(b.date + "T00:00:00");
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${b.time}`;
};
export const isUpcoming = (b) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(b.date + "T00:00:00") >= today && b.status !== "completed" && b.status !== "cancelled";
};
export const STATUS_LABEL = {
  requested: "Requested", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled",
};
export const escapeText = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
