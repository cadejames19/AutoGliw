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

Three files, each with a single responsibility:

- `index.html` — all page structure and content. Sections in order: navbar, hero (`#home`, with a tilting 3D phone mockup playing a mini booking loop, inline SVG cartoon car behind it), services (`#services`), why-us (`#why`), booking form (`#book`), confirmation modal (`#modal`), sticky mobile CTA (`#mobileCta`), footer. JS hooks into elements by `id`; styling uses classes.
- `styles.css` — theme, layout, and all animations. Design tokens (royal blue/black palette, radii, shadows, easing) are CSS custom properties on `:root` at the top of the file; use them rather than hard-coding values. Includes a `prefers-reduced-motion` block that must keep covering any new animations.
- `script.js` — all behavior, in one `DOMContentLoaded` handler: navbar scroll state, mobile menu, IntersectionObserver scroll reveals (`.reveal` → `.visible`), sticky mobile CTA show/hide, booking form validation, and the confirmation modal.

## Conventions

- Scroll-reveal animation on a new element: add the `reveal` class; `script.js` handles the rest (with a non-IntersectionObserver fallback).
- Form fields live in a `.field` wrapper containing an `.error` span — validation toggles `.invalid` on the wrapper and writes the message into the span. Field-specific rules go in the `validators` object in `script.js`, keyed by the input's `name`.
- The form has no backend: submission is intercepted, validated client-side, and shown in the modal. Any user-provided text inserted into the DOM must go through `escapeHtml()` in `script.js`.
- The site is fully responsive with mobile-specific UI (hamburger nav, sticky CTA) — check both breakpoints when changing layout.
