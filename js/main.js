
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // Mobile navigation
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    navLinks.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      navLinks.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "☰";
    });
  }

  // Homepage job search
  const homeSearch = document.getElementById("homeSearch");

  if (homeSearch) {
    homeSearch.addEventListener("submit", (event) => {
      event.preventDefault();

      const keyword = document.getElementById("homeKeyword").value.trim();
      const location = document.getElementById("homeLocation").value.trim();

      const params = new URLSearchParams();

      if (keyword) params.set("keyword", keyword);
      if (location) params.set("location", location);

      window.location.href = `jobs.html?${params.toString()}`;
    });
  }

  // Automatically display the current year
  const yearElement = document.getElementById("currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});
