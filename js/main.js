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

      const keyword = document.getElementById("homeKeyword") ? document.getElementById("homeKeyword").value.trim() : "";
      const location = document.getElementById("homeLocation") ? document.getElementById("homeLocation").value.trim() : "";

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

  // Load featured jobs dynamically from XML catalog & custom jobs
  const featuredJobsContainer = document.getElementById("featuredJobs");
  if (featuredJobsContainer) {
    (async () => {
      let jobs = [];
      try {
        if (typeof jobPortalGetAllJobs === "function") {
          jobs = await jobPortalGetAllJobs();
        } else if (window.JobPortalData) {
          jobs = await window.JobPortalData.loadJobsData();
        }
      } catch (e) {
        if (window.JobPortalData) {
          jobs = await window.JobPortalData.loadJobsData();
        }
      }
      renderFeatured((jobs || []).slice(0, 3));
    })();

    function renderFeatured(jobs) {
      if (!jobs || !jobs.length) return;
      featuredJobsContainer.innerHTML = jobs.map(job => `
        <article class="job-card">
          <div class="job-card-top">
            <div class="company-logo">${job.logo || (job.company ? job.company.charAt(0).toUpperCase() : "J")}</div>
            <span class="job-type ${job.type === 'Internship' ? 'job-type-intern' : ''}">${job.type || 'Full-time'}</span>
          </div>
          <h3>${job.title}</h3>
          <p class="company-name">${job.company} • ${job.location}</p>
          <div class="job-tags">
            ${(job.skills || []).slice(0, 2).map(s => `<span>${s}</span>`).join("")}
          </div>
          <div class="job-card-bottom">
            <div><strong>${job.salary}</strong><small>Compensation</small></div>
            <a href="job-details.html?id=${encodeURIComponent(job.id)}" class="apply-arrow" aria-label="View ${job.title}">→</a>
          </div>
        </article>
      `).join("");
    }
  }
});
