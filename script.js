// ===== Auto Glow — Interactions =====
document.addEventListener("DOMContentLoaded", () => {
  // Year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Navbar scroll state
  const navbar = document.getElementById("navbar");
  const onScroll = () => navbar.classList.toggle("scrolled", window.scrollY > 30);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile drawer (slides in from the right; the page pushes left)
  const navToggle = document.getElementById("navToggle");
  const drawer = document.getElementById("navDrawer");
  const scrim = document.getElementById("navScrim");
  const drawerAccount = document.getElementById("drawerAccount");
  const navAccount = document.getElementById("navAccount");

  const setDrawer = (open) => {
    document.body.classList.toggle("drawer-open", open);
    navToggle.classList.toggle("active", open);
    navToggle.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
    if (scrim) scrim.hidden = !open;
    if (open && drawerAccount && navAccount) drawerAccount.textContent = navAccount.textContent;
  };
  navToggle.addEventListener("click", () =>
    setDrawer(!document.body.classList.contains("drawer-open"))
  );
  scrim?.addEventListener("click", () => setDrawer(false));
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setDrawer(false)));
  drawerAccount?.addEventListener("click", () => {
    setDrawer(false);
    navAccount?.click();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("drawer-open")) setDrawer(false);
  });

  // Scroll reveal
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("visible"), i * 90);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  // Sticky mobile CTA: show after hero, hide while booking section is visible
  const mobileCta = document.getElementById("mobileCta");
  const bookSection = document.getElementById("book");
  if (mobileCta && bookSection) {
    let pastHero = false;
    let bookingVisible = false;
    const updateCta = () =>
      mobileCta.classList.toggle("show", pastHero && !bookingVisible);

    const heroEl = document.getElementById("home");
    if ("IntersectionObserver" in window && heroEl) {
      new IntersectionObserver(
        ([e]) => {
          pastHero = !e.isIntersecting;
          updateCta();
        },
        { threshold: 0.35 }
      ).observe(heroEl);
      new IntersectionObserver(
        ([e]) => {
          bookingVisible = e.isIntersecting;
          updateCta();
        },
        { threshold: 0.18 }
      ).observe(bookSection);
    }
  }

  // ===== Booking wizard =====
  const bwForm = document.getElementById("bwForm");
  if (bwForm) {
    const state = {
      service: "Express Detail", price: 80,
      size: "", car: "", cond: "",
      date: null, dateLabel: "", time: "",
      name: "", phone: "", pref: "Text", address: "", notes: "", email: "",
    };
    const steps = [...bwForm.querySelectorAll(".bw-step")];
    const fill = document.getElementById("bwFill");
    const labels = [...document.querySelectorAll("#bwLabels li")];
    let current = 1;

    // On mobile, move the live order summary out of the top rail to the end of
    // the wizard (a review block right before "Confirm Booking").
    if (window.matchMedia("(max-width: 900px)").matches) {
      const summary = document.querySelector(".bw-summary");
      const step3 = bwForm.querySelector('.bw-step[data-step="3"]');
      const step3Nav = step3?.querySelector(".bw-nav");
      if (summary && step3 && step3Nav) {
        const review = document.createElement("p");
        review.className = "bw-label bw-review-label";
        review.textContent = "Review your booking";
        summary.classList.add("bw-summary-review");
        step3.insertBefore(review, step3Nav);
        step3.insertBefore(summary, step3Nav);
      }
    }

    // --- error helpers
    const setErr = (key, msg) => {
      const el = bwForm.querySelector(`[data-err="${key}"]`);
      if (el) el.textContent = msg || "";
    };

    // --- chip groups
    const wireChips = (id, key, { required = false, toggle = false } = {}) => {
      const wrap = document.getElementById(id);
      if (!wrap) return;
      wrap.addEventListener("click", (e) => {
        const chip = e.target.closest(".bw-chip");
        if (!chip) return;
        const selected = chip.classList.contains("selected");
        wrap.querySelectorAll(".bw-chip").forEach((c) => {
          c.classList.remove("selected");
          c.setAttribute("aria-pressed", "false");
        });
        if (!(toggle && selected)) {
          chip.classList.add("selected");
          chip.setAttribute("aria-pressed", "true");
          state[key] = chip.dataset.val;
        } else {
          state[key] = "";
        }
        if (required) setErr(key === "size" ? "size" : key, "");
        syncSummary();
      });
    };
    wireChips("bwSize", "size", { required: true });
    wireChips("bwCond", "cond", { toggle: true });
    wireChips("bwPref", "pref");

    // --- date strip: next 7 days
    const datesEl = document.getElementById("bwDates");
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    datesEl.innerHTML = days
      .map((d, i) => {
        const small = i === 0 ? "Today" : i === 1 ? "Tmrw" : dayNames[d.getDay()];
        return `<button type="button" class="bw-date" data-i="${i}" aria-pressed="false"><small>${small}</small><b>${d.getDate()}</b></button>`;
      })
      .join("");
    datesEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".bw-date");
      if (!btn) return;
      datesEl.querySelectorAll(".bw-date").forEach((b) => { b.classList.remove("selected"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("selected");
      btn.setAttribute("aria-pressed", "true");
      const d = days[+btn.dataset.i];
      state.date = d;
      state.dateLabel = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      setErr("date", "");
      syncSummary();
    });

    // --- time chips
    const timesEl = document.getElementById("bwTimes");
    const slots = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM"];
    timesEl.innerHTML = slots
      .map((t) => `<button type="button" class="bw-chip" data-val="${t}" aria-pressed="false">${t}</button>`)
      .join("");
    timesEl.addEventListener("click", (e) => {
      const chip = e.target.closest(".bw-chip");
      if (!chip) return;
      timesEl.querySelectorAll(".bw-chip").forEach((c) => { c.classList.remove("selected"); c.setAttribute("aria-pressed", "false"); });
      chip.classList.add("selected");
      chip.setAttribute("aria-pressed", "true");
      state.time = chip.dataset.val;
      setErr("time", "");
      syncSummary();
    });

    // --- text inputs
    const carIn = document.getElementById("bwCar");
    const nameIn = document.getElementById("bwName");
    const phoneIn = document.getElementById("bwPhone");
    const addrIn = document.getElementById("bwAddress");
    const emailIn2 = document.getElementById("bwEmail");
    const notesIn = document.getElementById("bwNotes");
    carIn.addEventListener("input", () => { state.car = carIn.value.trim(); setErr("car", ""); syncSummary(); });
    nameIn.addEventListener("input", () => { state.name = nameIn.value.trim(); setErr("name", ""); });
    addrIn.addEventListener("input", () => { state.address = addrIn.value.trim(); setErr("address", ""); syncSummary(); });
    notesIn.addEventListener("input", () => (state.notes = notesIn.value.trim()));
    emailIn2.addEventListener("input", () => {
      state.email = emailIn2.value.trim();
      setErr("email", "");
    });
    // phone formats as you type
    phoneIn.addEventListener("input", () => {
      const digits = phoneIn.value.replace(/\D/g, "").slice(0, 10);
      let out = digits;
      if (digits.length > 6) out = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      else if (digits.length > 3) out = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      else if (digits.length > 0) out = `(${digits}`;
      phoneIn.value = out;
      state.phone = out;
      setErr("phone", "");
    });

    // --- service tier selection (Express $80 / Full Detail $150)
    const tiersEl = document.getElementById("bwTiers");
    tiersEl?.addEventListener("click", (e) => {
      const tier = e.target.closest(".bw-tier");
      if (!tier) return;
      tiersEl.querySelectorAll(".bw-tier").forEach((t) => {
        t.classList.remove("selected");
        t.setAttribute("aria-pressed", "false");
      });
      tier.classList.add("selected");
      tier.setAttribute("aria-pressed", "true");
      state.service = tier.dataset.service;
      state.price = Number(tier.dataset.price);
      syncSummary();
    });

    // --- live summary
    const sum = {
      service: document.getElementById("sumService"),
      vehicle: document.getElementById("sumVehicle"),
      when: document.getElementById("sumWhen"),
      where: document.getElementById("sumWhere"),
      price: document.getElementById("sumPrice"),
    };
    function syncSummary() {
      if (sum.service) sum.service.textContent = state.service;
      sum.vehicle.textContent = [state.size, state.car].filter(Boolean).join(" · ") || "—";
      sum.when.textContent = state.dateLabel && state.time ? `${state.dateLabel} · ${state.time}` : state.dateLabel || "—";
      sum.where.textContent = state.address || "—";
      if (sum.price) sum.price.textContent = `$${state.price}`;
    }

    // --- step engine
    const goStep = (n) => {
      current = n;
      steps.forEach((st) => st.classList.toggle("active", +st.dataset.step === n));
      labels.forEach((l) => {
        const i = +l.dataset.step;
        l.classList.toggle("active", i === n);
        l.classList.toggle("done", i < n);
      });
      fill.style.width = `${(n / 3) * 100}%`;
      const q = steps[n - 1].querySelector(".bw-q");
      q && q.focus({ preventScroll: false });
    };
    const validateStep = (n) => {
      let ok = true;
      if (n === 1) {
        if (!state.size) { setErr("size", "Pick your vehicle size."); ok = false; }
        if (!state.car) { setErr("car", "What are we detailing?"); ok = false; }
      } else if (n === 2) {
        if (!state.date) { setErr("date", "Pick a day."); ok = false; }
        if (!state.time) { setErr("time", "Pick a time."); ok = false; }
      } else if (n === 3) {
        if (!state.name) { setErr("name", "We need a name."); ok = false; }
        if (state.phone.replace(/\D/g, "").length < 10) { setErr("phone", "Enter a valid phone number."); ok = false; }
        if (!state.address) { setErr("address", "Where's the car?"); ok = false; }
        if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) { setErr("email", "That email doesn't look right."); ok = false; }
      }
      return ok;
    };
    bwForm.addEventListener("click", (e) => {
      if (e.target.closest(".bw-next")) {
        if (validateStep(current)) goStep(current + 1);
      } else if (e.target.closest(".bw-back")) {
        goStep(current - 1);
      }
    });

    // --- confirm → ticket
    const ticket = document.getElementById("bwTicket");
    const progress = document.querySelector(".bw-progress");
    bwForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateStep(3)) return;

      document.getElementById("tkTitle").textContent = `You're booked, ${state.name.split(" ")[0]}!`;
      document.getElementById("tkService").textContent = state.service;
      document.getElementById("tkWhen").textContent = `${state.dateLabel} · ${state.time}`;
      document.getElementById("tkVehicle").textContent = [state.size, state.car].filter(Boolean).join(" · ");
      document.getElementById("tkWhere").textContent = state.address;
      document.getElementById("tkPrice").textContent = `$${state.price}`;
      document.getElementById("bwIcs").href = makeIcs();

      bwForm.hidden = true;
      progress.hidden = true;
      ticket.hidden = false;

      // sparkle burst
      if (!reduceMotion) {
        const card = ticket.querySelector(".bw-ticket-card");
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            const sp = document.createElement("span");
            sp.className = "bw-spark";
            sp.textContent = i % 2 ? "✧" : "✦";
            sp.style.left = `${8 + Math.random() * 84}%`;
            sp.style.top = `${10 + Math.random() * 70}%`;
            card.appendChild(sp);
            setTimeout(() => sp.remove(), 950);
          }, 200 + i * 90);
        }
      }
      // hand off to account.js → Supabase
      window.dispatchEvent(new CustomEvent("ag:booking", { detail: { ...state } }));
    });

    function makeIcs() {
      const [hm, ap] = state.time.split(" ");
      let [h, m] = hm.split(":").map(Number);
      if (ap === "PM" && h !== 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      const d = new Date(state.date);
      d.setHours(h, m, 0, 0);
      const endD = new Date(d.getTime() + 60 * 60 * 1000);
      const fmt = (x) =>
        `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}T${String(x.getHours()).padStart(2, "0")}${String(x.getMinutes()).padStart(2, "0")}00`;
      const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Auto Glow//Booking//EN",
        "BEGIN:VEVENT",
        `UID:${Date.now()}@autoglow`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(d)}`,
        `DTEND:${fmt(endD)}`,
        `SUMMARY:Auto Glow — ${state.service} (${state.size})`,
        `DESCRIPTION:${state.car} · We'll text ${state.phone} to confirm.`,
        `LOCATION:${state.address.replace(/,/g, "\\,")}`,
        "END:VEVENT", "END:VCALENDAR",
      ].join("\r\n");
      return URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    }
  }

  // ===== Hero phone: clamped tilt + mini booking loop =====
  const scene = document.getElementById("phoneScene");
  const tiltEl = document.getElementById("phoneTilt");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (scene && tiltEl) {
    // --- Tilt: follows the cursor, draggable, but clamped so the screen always faces you
    const MAX_RY = 16; // deg, left/right
    const MAX_RX = 10; // deg, up/down
    const clampRot = (v, max) => Math.max(-max, Math.min(max, v));

    let hovering = false;
    let dragging = false;
    let hoverRY = 0, hoverRX = 0;
    let dragRY = 0, dragRX = 0;
    let curRY = 0, curRX = 0;
    let lastX = 0, lastY = 0;

    if (!reduceMotion) {
      scene.addEventListener("pointermove", (e) => {
        if (dragging || e.pointerType !== "mouse") return;
        const r = scene.getBoundingClientRect();
        hoverRY = clampRot(((e.clientX - r.left) / r.width - 0.5) * 2 * MAX_RY, MAX_RY);
        hoverRX = clampRot(-((e.clientY - r.top) / r.height - 0.5) * 2 * MAX_RX, MAX_RX);
        hovering = true;
      });
      scene.addEventListener("pointerleave", () => (hovering = false));

      tiltEl.addEventListener("pointerdown", (e) => {
        dragging = true;
        dragRY = curRY;
        dragRX = curRX;
        lastX = e.clientX;
        lastY = e.clientY;
        tiltEl.setPointerCapture(e.pointerId);
        if (e.pointerType === "mouse") e.preventDefault();
      });
      tiltEl.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        dragRY = clampRot(dragRY + (e.clientX - lastX) * 0.4, MAX_RY);
        if (e.pointerType === "mouse") dragRX = clampRot(dragRX - (e.clientY - lastY) * 0.3, MAX_RX);
        lastX = e.clientX;
        lastY = e.clientY;
      });
      const endDrag = () => (dragging = false);
      tiltEl.addEventListener("pointerup", endDrag);
      tiltEl.addEventListener("pointercancel", endDrag);

      const frame = (now) => {
        let tRY, tRX;
        if (dragging) {
          tRY = dragRY;
          tRX = dragRX;
        } else if (hovering) {
          tRY = hoverRY;
          tRX = hoverRX;
        } else {
          // Gentle idle sway
          const t = now / 1000;
          tRY = Math.sin(t * 0.55) * 4;
          tRX = Math.sin(t * 0.4 + 1.2) * 2.5;
        }
        curRY += (tRY - curRY) * 0.07;
        curRX += (tRX - curRX) * 0.07;
        tiltEl.style.transform = `rotateX(${curRX.toFixed(2)}deg) rotateY(${curRY.toFixed(2)}deg)`;
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    // --- Mini booking loop on the phone screen
    const screenEl = document.getElementById("phoneScreen");
    const bookBtn = document.getElementById("miniBookBtn");
    const confirmBtn = document.getElementById("miniConfirmBtn");
    const miniModal = document.getElementById("miniModal");
    const modalSub = document.getElementById("miniModalSub");
    const fields = {
      name: document.getElementById("mfName"),
      car: document.getElementById("mfCar"),
      date: document.getElementById("mfDate"),
      time: document.getElementById("mfTime"),
    };
    const ready =
      screenEl && bookBtn && confirmBtn && miniModal && modalSub &&
      Object.values(fields).every(Boolean);

    if (ready && !reduceMotion) {
      // Next Saturday, e.g. "Sat, Jun 13"
      const next = new Date();
      next.setDate(next.getDate() + (((6 - next.getDay() + 7) % 7) || 7));
      const niceDay = next.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      modalSub.textContent = `${niceDay} · 10:00 AM`;

      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const press = async (btn) => {
        btn.classList.add("pressed");
        await delay(220);
        btn.classList.remove("pressed");
      };
      const typeInto = async (el, text) => {
        el.classList.add("typing");
        for (const ch of text) {
          el.textContent += ch;
          await delay(34);
        }
        await delay(120);
        el.classList.remove("typing");
      };

      // Only animate while the phone is on screen and the tab is visible
      let phoneVisible = true;
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(([e]) => (phoneVisible = e.isIntersecting), { threshold: 0.1 }).observe(scene);
      }

      (async () => {
        for (;;) {
          while (!phoneVisible || document.hidden || !screenEl.offsetParent) await delay(600);
          // Reset to the mini home page
          miniModal.classList.remove("open");
          screenEl.classList.remove("show-book");
          Object.values(fields).forEach((f) => {
            f.textContent = "";
            f.classList.remove("typing");
          });
          await delay(1600);
          await press(bookBtn);
          await delay(150);
          screenEl.classList.add("show-book");
          await delay(950);
          await typeInto(fields.name, "Jane Doe");
          await typeInto(fields.car, "Toyota Camry");
          await typeInto(fields.date, niceDay);
          await typeInto(fields.time, "10:00 AM");
          await delay(350);
          await press(confirmBtn);
          await delay(250);
          miniModal.classList.add("open");
          await delay(2400);
          miniModal.classList.remove("open");
          await delay(400);
        }
      })();
    }

    // --- Driving supercar: drives in once, parks, then it's an interactive showpiece
    const carDrive = document.getElementById("carDrive");
    const superCar = document.getElementById("superCar");
    if (carDrive && superCar) {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));

      // -- Synthesized sound (enabled by first user gesture, mutable)
      let actx = null;
      let muted = false;
      const ensureAudio = () => {
        if (!actx) {
          try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }
        }
        if (actx && actx.state === "suspended") actx.resume();
      };
      const tone = (type, f0, f1, dur, vol = 0.15) => {
        if (!actx || muted) return;
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, actx.currentTime);
        if (f1) o.frequency.exponentialRampToValueAtTime(f1, actx.currentTime + dur);
        g.gain.setValueAtTime(vol, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
        o.connect(g).connect(actx.destination);
        o.start();
        o.stop(actx.currentTime + dur);
      };
      const noiseBurst = (dur, vol, freq) => {
        if (!actx || muted) return;
        const n = Math.floor(actx.sampleRate * dur);
        const buf = actx.createBuffer(1, n, actx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        const src = actx.createBufferSource();
        src.buffer = buf;
        const f = actx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = freq;
        const g = actx.createGain();
        g.gain.setValueAtTime(vol, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
        src.connect(f).connect(g).connect(actx.destination);
        src.start();
      };
      const sfx = {
        doorOpen: () => { noiseBurst(0.4, 0.07, 500); tone("sine", 140, 90, 0.35, 0.12); },
        doorClose: () => { tone("sine", 95, 55, 0.16, 0.3); noiseBurst(0.08, 0.2, 250); },
        window: () => noiseBurst(0.55, 0.05, 1200),
        wheel: () => noiseBurst(0.3, 0.08, 800),
        lights: () => tone("sine", 880, 1320, 0.08, 0.06),
        rev: () => {
          tone("sawtooth", 75, 190, 0.55, 0.22);
          noiseBurst(0.5, 0.05, 300);
          setTimeout(() => tone("sawtooth", 185, 65, 0.8, 0.18), 520);
        },
        horn: () => {
          const blast = () => { tone("square", 466, 0, 0.18, 0.1); tone("square", 554, 0, 0.18, 0.1); };
          blast();
          setTimeout(blast, 260);
        },
        backfire: () => { noiseBurst(0.18, 0.5, 180); tone("square", 160, 40, 0.22, 0.25); },
      };

      // -- Hint caption: fades after first interaction
      const hint = document.getElementById("carHint");
      const firstTouch = () => {
        ensureAudio();
        if (hint) hint.classList.add("hide");
      };

      // -- Interactions
      const doorEl = superCar.querySelector(".sc-door");
      const lightsEl = superCar.querySelector(".headlight");
      const bodyEl = superCar.querySelector("#scBodyPath");
      const sparksEl = superCar.querySelector(".wipe-sparks");
      const wipeEl = superCar.querySelector(".wipe");

      const toggleDoor = () => {
        firstTouch();
        const opening = !carDrive.classList.contains("door-open");
        carDrive.classList.toggle("door-open", opening);
        carDrive.classList.toggle("win-down", opening); // frameless glass drops with the door
        opening ? sfx.doorOpen() : sfx.doorClose();
      };
      const toggleWin = () => {
        firstTouch();
        carDrive.classList.toggle("win-down");
        sfx.window();
      };
      const toggleLights = () => {
        firstTouch();
        carDrive.classList.toggle("lights-on");
        sfx.lights();
      };
      const spinWheel = (wheel) => {
        firstTouch();
        wheel.classList.remove("spin-burst");
        void wheel.getBoundingClientRect();
        wheel.classList.add("spin-burst");
        setTimeout(() => wheel.classList.remove("spin-burst"), 750);
        sfx.wheel();
      };
      const bounceCar = () => {
        firstTouch();
        carDrive.classList.remove("bounce");
        void carDrive.offsetWidth;
        carDrive.classList.add("bounce");
        setTimeout(() => carDrive.classList.remove("bounce"), 850);
      };

      const spawnSpark = (x, y) => {
        if (!sparksEl) return;
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", x);
        c.setAttribute("cy", y);
        c.setAttribute("r", 2.6);
        c.setAttribute("fill", "#ffffff");
        c.setAttribute("class", "spark");
        sparksEl.appendChild(c);
        setTimeout(() => c.remove(), 700);
      };

      // Rev + 3x-fast-rev backfire easter egg
      let revving = false;
      const revTimes = [];
      const rev = () => {
        firstTouch();
        if (revving) return;
        revving = true;
        carDrive.classList.add("revving");
        sfx.rev();
        revTimes.push(Date.now());
        while (revTimes.length > 3) revTimes.shift();
        const combo = revTimes.length === 3 && Date.now() - revTimes[0] < 5200;
        setTimeout(() => {
          carDrive.classList.remove("revving");
          revving = false;
          if (combo) {
            revTimes.length = 0;
            carDrive.classList.add("backfire", "bounce");
            sfx.backfire();
            for (let i = 0; i < 14; i++) {
              setTimeout(() => spawnSpark(80 + Math.random() * 560, 95 + Math.random() * 130), i * 55);
            }
            setTimeout(() => carDrive.classList.remove("backfire", "bounce"), 900);
          }
        }, 1400);
      };
      const horn = () => {
        firstTouch();
        carDrive.classList.add("honk");
        sfx.horn();
        setTimeout(() => carDrive.classList.remove("honk"), 750);
      };

      doorEl.addEventListener("click", (e) => { e.stopPropagation(); toggleDoor(); });
      lightsEl.addEventListener("click", (e) => { e.stopPropagation(); toggleLights(); });
      superCar.querySelectorAll(".wheel").forEach((w) =>
        w.addEventListener("click", (e) => { e.stopPropagation(); spinWheel(w); })
      );
      bodyEl.addEventListener("click", bounceCar);

      // Polish wipe: sweep + sparkles follow the cursor across the body
      let wipeTimer = null;
      let lastSparkX = null;
      bodyEl.addEventListener("pointermove", (e) => {
        if (!wipeEl) return;
        const pt = superCar.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(superCar.getScreenCTM().inverse());
        wipeEl.style.transform = `translateX(${(p.x - 45).toFixed(1)}px)`;
        wipeEl.style.opacity = "0.9";
        clearTimeout(wipeTimer);
        wipeTimer = setTimeout(() => (wipeEl.style.opacity = "0"), 220);
        if (lastSparkX === null || Math.abs(p.x - lastSparkX) > 70) {
          lastSparkX = p.x;
          spawnSpark(p.x, p.y - 10);
        }
      });

      // Control pill
      const panel = document.getElementById("carPanel");
      const muteBtn = document.getElementById("muteBtn");
      if (panel) {
        panel.addEventListener("click", (e) => {
          const btn = e.target.closest("button");
          if (!btn) return;
          switch (btn.dataset.act) {
            case "door": toggleDoor(); break;
            case "win": toggleWin(); break;
            case "lights": toggleLights(); break;
            case "rev": rev(); break;
            case "horn": horn(); break;
            case "mute":
              firstTouch();
              muted = !muted;
              muteBtn.classList.toggle("muted", muted);
              break;
          }
        });
      }

      // Drive in once and park for good
      if (reduceMotion) {
        carDrive.classList.add("snap", "in", "parked");
      } else {
        let carVisible = true;
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(([e]) => (carVisible = e.isIntersecting), { threshold: 0.1 }).observe(scene);
        }
        (async () => {
          while (!carVisible || document.hidden) await wait(600);
          carDrive.classList.add("moving", "in");
          await wait(1950);
          carDrive.classList.remove("moving");
          carDrive.classList.add("parked");
          await wait(900);
          carDrive.classList.add("shining");
          await wait(1600);
          carDrive.classList.remove("shining");
        })();
      }
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }
});
