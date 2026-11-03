"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  let jobs = [];

  // 1. Fetch real active jobs from MySQL backend
  try {
    const res = await jobPortalApiFetch("/api/jobs");
    if (res.ok && res.data && Array.isArray(res.data.jobs) && res.data.jobs.length > 0) {
      jobs = res.data.jobs.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        category: j.category,
        type: j.type,
        work: j.work_mode || "On-site",
        location: j.location,
        salary: j.salary,
        experience: j.experience || "1-3 years",
        vacancies: j.vacancies || 1,
        skills: Array.isArray(j.skills) ? j.skills : [],
        logo: j.logo || (j.company ? j.company.charAt(0).toUpperCase() : "J"),
        description: j.description
      }));
    }
  } catch (err) {
    console.warn("Could not fetch jobs from MySQL API, falling back to XML data.", err);
  }

  // 2. Fallback to XML jobs loader if API failed
  if (jobs.length === 0 && window.JobPortalData) {
    jobs = await window.JobPortalData.loadJobsData();
  }

  const list = document.getElementById("jobsList");
  if (!list) return;

  const form = document.getElementById("jobsSearch");
  const keywordInput = document.getElementById("jobKeyword");
  const locationInput = document.getElementById("jobLocation");
  const sortSelect = document.getElementById("sortJobs");
  const count = document.getElementById("resultsCount");
  const empty = document.getElementById("emptyState");
  const chips = document.getElementById("activeFilters");

  const params = new URLSearchParams(window.location.search);
  if (keywordInput) keywordInput.value = params.get("keyword") || "";
  if (locationInput) locationInput.value = params.get("location") || "";

  const categoryParam = params.get("category");
  if (categoryParam) {
    document.querySelectorAll('input[name="category"]').forEach(input => {
      input.checked = input.value.toLowerCase() === categoryParam.toLowerCase();
    });
  }

  const getChecked = name =>
    [...document.querySelectorAll(`input[name="${name}"]:checked`)]
      .map(input => input.value);

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function render() {
    const keyword = keywordInput ? keywordInput.value.trim().toLowerCase() : "";
    const location = locationInput ? locationInput.value.trim().toLowerCase() : "";
    const categories = getChecked("category");
    const types = getChecked("type");
    const workModes = getChecked("work");

    let filtered = jobs.filter(job => {
      const searchable = [
        job.title, job.company, job.category, ...(job.skills || [])
      ].join(" ").toLowerCase();

      const keywordMatch = !keyword || searchable.includes(keyword);
      const locationMatch =
        !location ||
        job.location.toLowerCase().includes(location) ||
        (job.work && job.work.toLowerCase().includes(location));

      return keywordMatch && locationMatch &&
        (!categories.length || categories.includes(job.category)) &&
        (!types.length || types.includes(job.type)) &&
        (!workModes.length || workModes.includes(job.work));
    });

    if (sortSelect && sortSelect.value === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortSelect && sortSelect.value === "company") {
      filtered.sort((a, b) => a.company.localeCompare(b.company));
    }

    list.innerHTML = filtered.map(job => `
      <article class="listing-card">
        <div class="listing-top" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="listing-logo">${escapeHTML(job.logo || "J")}</div>
            <div class="listing-info">
              <h3 style="font-size: 17px; font-weight: 700; color: #10152E; margin: 0;">${escapeHTML(job.title)}</h3>
              <p style="font-size: 13.5px; color: #6B7280; margin: 2px 0 0;">${escapeHTML(job.company)} • ${escapeHTML(job.location)}</p>
            </div>
          </div>
          <span class="listing-badge">${escapeHTML(job.type || "Full-time")}</span>
        </div>

        <div class="listing-meta" style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
          <span>📍 ${escapeHTML(job.location)}</span>
          <span>🏢 ${escapeHTML(job.work || "On-site")}</span>
          <span>📁 ${escapeHTML(job.category)}</span>
          ${job.experience ? `<span>⏳ ${escapeHTML(job.experience)}</span>` : ''}
        </div>

        <p class="listing-description" style="margin-top: 10px; font-size: 13.5px; color: #4B5563; line-height: 1.6;">${escapeHTML(job.description)}</p>

        <div class="job-tags" style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
          ${(job.skills || []).map(skill => `<span style="background: #F8F8FC; border: 1px solid #E5E7F0; padding: 4px 10px; border-radius: 6px; font-size: 11px; color: #4F20E8; font-weight: 600;">${escapeHTML(skill)}</span>`).join("")}
        </div>

        <div class="listing-bottom" style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #F1F3F9; display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div>
            <strong style="font-size: 15px; color: #10152E;">${escapeHTML(job.salary)}</strong>
            <small style="display: block; font-size: 11px; color: #9CA3AF;">Compensation</small>
          </div>
          <div class="listing-actions" style="display: flex; align-items: center; gap: 10px;">
            <button type="button" class="save-job" data-save="${escapeHTML(job.id)}"
              aria-label="Save ${escapeHTML(job.title)}" aria-pressed="false">☆</button>
            <a class="btn btn-primary" href="job-details.html?id=${encodeURIComponent(job.id)}" style="font-size: 13px; padding: 8px 18px;">View Details →</a>
          </div>
        </div>
      </article>
    `).join("");

    if (count) {
      count.textContent = `${filtered.length} ${filtered.length === 1 ? "position" : "positions"} found in database`;
    }
    if (empty) empty.hidden = filtered.length !== 0;
    list.hidden = filtered.length === 0;

    renderChips();
    updateSavedButtons();
  }

  function renderChips() {
    if (!chips) return;
    const filters = [
      ...getChecked("category"),
      ...getChecked("type"),
      ...getChecked("work")
    ];

    chips.innerHTML = filters.map(value => `
      <span class="filter-chip">
        ${escapeHTML(value)}
        <button type="button" data-remove="${escapeHTML(value)}" aria-label="Remove ${escapeHTML(value)} filter">✕</button>
      </span>
    `).join("");
  }

  function getSavedJobs() {
    return jobPortalGetSavedJobs();
  }

  function updateSavedButtons() {
    const saved = getSavedJobs();

    document.querySelectorAll("[data-save]").forEach(button => {
      const isSaved = saved.includes(button.dataset.save);
      button.classList.toggle("is-saved", isSaved);
      button.textContent = isSaved ? "★" : "☆";
      button.setAttribute("aria-pressed", String(isSaved));
    });
  }

  if (form) {
    form.addEventListener("submit", event => {
      event.preventDefault();
      render();
    });
  }

  document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(input => {
    input.addEventListener("change", render);
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", render);
  }

  function resetFilters() {
    if (keywordInput) keywordInput.value = "";
    if (locationInput) locationInput.value = "";
    document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
    if (sortSelect) sortSelect.value = "recommended";
    render();
  }

  const resetBtn = document.getElementById("resetFilters");
  if (resetBtn) resetBtn.addEventListener("click", resetFilters);

  const emptyResetBtn = document.getElementById("emptyReset");
  if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetFilters);

  if (chips) {
    chips.addEventListener("click", event => {
      const button = event.target.closest("[data-remove]");
      if (!button) return;

      document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(input => {
        if (input.value === button.dataset.remove) input.checked = false;
      });
      render();
    });
  }

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-save]");
    if (!button) return;

    if (!jobPortalGetSession()) {
      jobPortalRequireLogin(`${window.location.pathname.split("/").pop()}${window.location.search}`);
      return;
    }

    const saved = getSavedJobs();
    const id = button.dataset.save;
    const next = saved.includes(id)
      ? saved.filter(savedId => savedId !== id)
      : [...saved, id];

    if (jobPortalSetSavedJobs(next)) {
      updateSavedButtons();
    }
  });

  render();
});
