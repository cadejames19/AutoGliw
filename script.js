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
