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
          while (!phoneVisible || document.hidden) await delay(600);
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
