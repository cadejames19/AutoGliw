# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Auto Glow — a car-detailing booking site for a real small business. Plain static HTML/CSS/JS, **no build step, no bundler, no package manager, no tests.** Libraries (Firebase, and previously Three.js) load from CDNs via ES-module `import`. Two services: **Express Detail $80** and **Full Detail $150**.

There are **two separate sites/repos**:
- **Customer site** — this repo. GitHub Pages at `https://cadejames19.github.io/AutoGlow/`.
- **Owner dashboard** — the `admin-site/` folder, which is its **own public repo** (`cadejames19/autoglow-admin`) deployed to GitHub Pages at `https://cadejames19.github.io/autoglow-admin/`. It is gitignored from this repo and has its own `.git`. See "Owner dashboard" below.

## Running

```bash
python3 -m http.server 8000        # customer site → http://localhost:8000
python3 -m http.server 8001 --directory admin-site   # dashboard
```
`localhost` is an authorized Firebase auth domain, so sign-in/Firestore work locally.

## Deployment & cache-busting

- Customer site: `.github/workflows/deploy-pages.yml` deploys the repo root to GitHub Pages on push to `claude/auto-glow-booking-site-itx8e` (the working branch).
- Dashboard: pushing the `admin-site/` repo's `main` auto-builds GitHub Pages. (It was briefly on Vercel — abandoned because drag-drop deploys never auto-update.)
- **GitHub Pages caches aggressively.** Every asset reference carries a `?v=N` query (e.g. `styles.css?v=17`). When you change `styles.css`/`script.js`, bump the `?v=` in `index.html`, or a stale copy will be served. The dashboard also uses a service worker (`admin-site/sw.js`, `CACHE = "ag-admin-vN"`) — bump that constant too when changing dashboard files.

## Architecture — customer site

- `index.html` — all structure. Everything except the mobile drawer/scrim lives inside `<div id="page">` (the drawer slides this wrapper left). Sections: navbar, hero (`#home`, tilting phone mockup running a mini booking loop), services (`#services`, two service cards + benefits row), why-us (`#why`), booking wizard (`#book`), confirmation ticket, sticky mobile CTA (`#mobileCta`), footer, plus the account sign-in modal (`#agAuth`) and "My Details" panel (`#agPanel`).
- `styles.css` — theme, layout, animations. Design tokens (royal-blue/black palette, radii, shadows, easing) are CSS custom properties on `:root`; use them. Has a `prefers-reduced-motion` block (keep it covering new animations) and a global `[hidden] { display: none !important; }` because several `.btn`/`.bw-*` elements set an explicit `display` that would otherwise override the `hidden` attribute.
- `script.js` — one `DOMContentLoaded` handler: navbar scroll state, the mobile push-drawer, scroll reveals (`.reveal`→`.visible`), sticky CTA, the hero phone (tilt + mini booking loop), and the **booking wizard**.
- `account.js` (ES module) — customer accounts via Firebase: passwordless email-link sign-in, the "My Details" panel (own bookings by uid or booking email), and it listens for the `ag:booking` CustomEvent to write each booking to Firestore.
- `fb.js` (ES module) — shared Firebase client (`app`/`auth`/`db`) + auth helpers + formatters (`fmtWhen`, `isUpcoming`, `STATUS_LABEL`, `escapeText`). Imports `firebase-config.js` (public web config — safe to commit; security is enforced by Firestore rules + the auth-domain allowlist, not by hiding the key).
- `assets/` — circular brand logo + favicon/apple-touch icons. `references/` — gitignored leftover reference library, unused by the site.

## Backend — Firebase (project `auto-glow-6a634`)

- **Firestore `bookings`** — one doc per booking. Anyone (incl. guests) can create; a customer reads only their own (by `userId` or `email`); only admins update status. Statuses: `requested → confirmed → completed | cancelled`.
- **Firestore `admins`** — doc IDs are admin emails (the allowlist). Current admins: `autoglowsupport@gmail.com` (client/owner), `cadejames193@gmail.com`, `cadejames19@icloud.com`.
- **Rules** in `firestore.rules`; deploy with `firebase deploy --only firestore:rules --project auto-glow-6a634` (firebase CLI is logged in as `cadejames193@gmail.com`).
- The dashboard query avoids composite indexes by fetching `bookings` unordered and sorting client-side.
- Backend admin ops (seed admins, set passwords, edit authorized domains) were done via the Identity Toolkit / Firestore REST APIs using an access token minted from the firebase CLI's stored refresh token.

## Owner dashboard — `admin-site/`

Self-contained copy: `index.html`, `admin.js`, `fb.js`, `firebase-config.js`, `styles.css` (shared with the customer site), `manifest.webmanifest`, `sw.js`, `assets/`. It's a **PWA** (installable, app-shell cached). Auth is **email + password** (`signInWithEmailAndPassword`, with first-time create + forgot-password); the gate checks the `admins` collection. Shows stats (today/upcoming/completed/revenue), filter chips, and per-booking Confirm / ✓ Done / Cancel / Reopen.

Because `admin-site/` duplicates `fb.js`/`firebase-config.js`/`styles.css`, **changes to those in the main repo must be copied into `admin-site/` and pushed to its own repo** to take effect on the dashboard.

## Conventions

- Scroll-reveal: add the `reveal` class; `script.js` handles it (with a non-IntersectionObserver fallback).
- Booking wizard (`bw-*`): all state in one `state` object in `script.js`; steps gate on `validateStep(n)` and errors write into `[data-err]` slots. Chips/tiers are buttons with `aria-pressed`. Service tier selection sets `state.service`/`state.price`, which flows live into the summary, the mobile "Review your booking" block, and the ticket. On mobile the summary box is moved out of the top rail to the end of the wizard.
- Submitting fires `window.dispatchEvent(new CustomEvent("ag:booking", { detail: {...state} }))`; `account.js` writes it to Firestore. Any user text put in the DOM goes through `escapeText`/`textContent` — keep it that way.
- Mobile (`<=900px`) is a deliberate **app-like card stack** (each section is its own rounded card); the hero is a text-left / phone-right row. Nav is a right-side push drawer (`#navDrawer` + `#navScrim`): the hamburger toggles `body.drawer-open`, sliding `#page` left. The drawer's account button proxies to the real `#navAccount`. Keep new top-level content inside `#page`.
