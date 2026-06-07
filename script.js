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

  // Mobile menu
  const navToggle = document.getElementById("navToggle");
  navToggle.addEventListener("click", () => {
    const open = navbar.classList.toggle("menu-open");
    navToggle.classList.toggle("active", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navbar.querySelectorAll(".nav-links a, .nav-cta").forEach((link) =>
    link.addEventListener("click", () => {
      navbar.classList.remove("menu-open");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );

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

  // Booking form
  const form = document.getElementById("bookForm");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");

  // Set date min to today
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  const showError = (field, msg) => {
    const wrap = field.closest(".field");
    wrap.classList.add("invalid");
    const err = wrap.querySelector(".error");
    if (err) err.textContent = msg;
  };
  const clearError = (field) => {
    const wrap = field.closest(".field");
    wrap.classList.remove("invalid");
    const err = wrap.querySelector(".error");
    if (err) err.textContent = "";
  };

  const validators = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email.",
    phone: (v) => v.replace(/\D/g, "").length >= 7 || "Enter a valid phone number.",
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    let firstInvalid = null;

    form.querySelectorAll("input[required], select[required]").forEach((field) => {
      clearError(field);
      const val = field.value.trim();
      if (!val) {
        showError(field, "This field is required.");
        valid = false;
        firstInvalid = firstInvalid || field;
        return;
      }
      if (validators[field.name]) {
        const res = validators[field.name](val);
        if (res !== true) {
          showError(field, res);
          valid = false;
          firstInvalid = firstInvalid || field;
        }
      }
    });

    if (!valid) {
      firstInvalid?.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const niceDate = data.date
      ? new Date(data.date + "T00:00:00").toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      : "";

    modalBody.innerHTML =
      `Thanks, <strong>${escapeHtml(data.name.split(" ")[0])}</strong>! Your ` +
      `<strong>Express Detail</strong> for the ${escapeHtml(data.carMake)} ${escapeHtml(data.carModel)} ` +
      `is requested for <strong>${escapeHtml(niceDate)}</strong> at <strong>${escapeHtml(data.time)}</strong>. ` +
      `We'll text you at ${escapeHtml(data.phone)} to confirm.`;

    openModal();
    form.reset();
    if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];
  });

  // Clear errors as the user types
  form.querySelectorAll("input, select").forEach((field) =>
    field.addEventListener("input", () => clearError(field))
  );

  const openModal = () => {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modalClose.focus();
  };
  const closeModal = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  };
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

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
