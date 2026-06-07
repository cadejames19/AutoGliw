# Auto Glow — Car Detailing Booking Site

A vibrant, animated single-page website where customers can book a car
detailing appointment with **Auto Glow**.

## Brand
- **Colors:** Royal Blue (`#2f6bff` / `#1d4ed8`) & Black (`#06080f`)
- **Service:** Express Detail — **$80**

## Features
- Animated hero with shimmering text, floating car, sparkles, and a glowing price tag
- Animated gradient background orbs
- Services section with featured Express Detail card and supporting highlights
- "Why Us" grid and scroll-reveal animations throughout
- Full booking form (name, contact, car make/model, date, time, address, notes)
  with inline validation and an animated confirmation modal
- Fully responsive with a mobile nav menu
- Respects `prefers-reduced-motion`

## Run it
No build step required — it's plain HTML/CSS/JS. Just open the file:

```bash
open index.html        # macOS
# or simply double-click index.html
```

Or serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files
| File | Purpose |
|------|---------|
| `index.html` | Page structure & content |
| `styles.css` | Theme, layout & animations |
| `script.js`  | Nav, scroll reveals, form validation & modal |
