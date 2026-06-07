# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Auto Glow — a single-page car detailing booking website. Plain HTML/CSS/JS with no build step, no dependencies, no package manager, and no tests.

## Running

```bash
open index.html              # or
python3 -m http.server 8000  # then visit http://localhost:8000
```

## Deployment

`.github/workflows/deploy-pages.yml` deploys the repo root to GitHub Pages on every push to the `claude/auto-glow-booking-site-itx8e` branch (the working branch for this repo).

## Architecture

Core files, each with a single responsibility:

- `index.html` — all page structure and content. Sections in order: navbar, hero (`#home`, with a tilting 3D phone mockup playing a mini booking loop), services (`#services`), why-us (`#why`), booking wizard (`#book`, 3-step flow + live summary rail + ticket confirmation), confirmation modal (`#modal`), sticky mobile CTA (`#mobileCta`), footer. JS hooks into elements by `id`; styling uses classes.
- `styles.css` — theme, layout, and all animations. Design tokens (royal blue/black palette, radii, shadows, easing) are CSS custom properties on `:root` at the top of the file; use them rather than hard-coding values. Includes a `prefers-reduced-motion` block that must keep covering any new animations.
- `script.js` — all behavior, in one `DOMContentLoaded` handler: navbar scroll state, mobile menu, IntersectionObserver scroll reveals (`.reveal` → `.visible`), sticky mobile CTA show/hide, booking form validation, the confirmation modal.
- `references/` — gitignored local car reference library kept from an earlier 3D experiment; not used by the site.

## Conventions

- Scroll-reveal animation on a new element: add the `reveal` class; `script.js` handles the rest (with a non-IntersectionObserver fallback).
- The booking wizard (`bw-*` classes) keeps all state in one `state` object in `script.js` — backend-ready JSON; submission is a function swap from show-ticket to POST. Steps gate on `validateStep(n)`; errors write into `[data-err]` slots. Chips are buttons with `aria-pressed`.
- No backend yet: submission renders the confirmation ticket (with client-generated .ics calendar file). User text rendered via `textContent` only — keep it that way.
- The site is fully responsive. Mobile nav is a right-side push drawer (`#navDrawer` + `#navScrim`): the hamburger toggles `body.drawer-open`, which slides `#page` (the wrapper around all content) left and reveals the drawer. The drawer's account button proxies clicks to the real `#navAccount`. Keep new top-level content inside `#page`.
