// Platy Pirates | FRC 9181 — shared site behavior

document.addEventListener("DOMContentLoaded", () => {
  // Mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  // Join/contact form: no backend yet, so just confirm locally.
  // See README.md "Connect the Join form" for how to wire this to
  // Formspree (or Google Forms) so submissions actually reach you.
  const joinForm = document.querySelector("#join-form");
  if (joinForm) {
    joinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const status = document.querySelector("#join-form-status");
      if (status) {
        status.textContent =
          "Thanks! This form isn't connected to email yet — see the README to hook it up. For now, please also reach out on Instagram @frc_platypirates.";
        status.hidden = false;
      }
      joinForm.reset();
    });
  }
});
