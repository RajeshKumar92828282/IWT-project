
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const jobs = [
    {
      id: "frontend", title: "Frontend Developer", company: "Google",
      category: "Technology", type: "Full-time", work: "Hybrid",
      location: "Bengaluru", salary: "₹8–14 LPA",
      skills: ["React", "JavaScript"], logo: "G",
      description: "Build responsive interfaces and improve the experience of web applications."
    },
    {
      id: "designer", title: "UI/UX Designer", company: "Design Studio",
      category: "Design", type: "Full-time", work: "Remote",
      location: "Remote", salary: "₹6–10 LPA",
      skills: ["Figma", "UI/UX"], logo: "D",
      description: "Design clear user journeys, wireframes and accessible digital experiences."
    },
    {
      id: "intern", title: "Software Engineer Intern", company: "Amazon",
      category: "Technology", type: "Internship", work: "On-site",
      location: "Hyderabad", salary: "₹30–50K/mo",
      skills: ["DSA", "Java"], logo: "a",
      description: "Learn software development while collaborating on practical engineering tasks."
    },
    {
      id: "marketing", title: "Digital Marketing Associate", company: "Growth Labs",
      category: "Marketing", type: "Full-time", work: "Hybrid",
      location: "Mumbai", salary: "₹4–7 LPA",
      skills: ["SEO", "Content"], logo: "G",
      description: "Support campaigns, review engagement data and help improve digital reach."
    },
    {
      id: "business", title: "Business Operations Intern", company: "NextStep",
      category: "Business", type: "Internship", work: "Remote",
      location: "Remote", salary: "₹15–25K/mo",
      skills: ["Excel", "Analysis"], logo: "N",
      description: "Help document processes, organize reports and support operational projects."
    },
    {
      id: "backend", title: "Junior Backend Developer", company: "CloudWorks",
      category: "Technology", type: "Full-time", work: "On-site",
      location: "Pune", salary: "₹5–9 LPA",
      skills: ["Node.js", "SQL"], logo: "C",
      description: "Work on APIs, data handling and server-side application features."
    },
    {
      id: "content", title: "Content Design Intern", company: "Creative House",
      category: "Design", type: "Internship", work: "Remote",
      location: "Remote", salary: "₹12–20K/mo",
      skills: ["Writing", "Design"], logo: "C",
      description: "Create helpful content and collaborate with design teams on digital products."
    },
    {
      id: "analyst", title: "Business Analyst", company: "BrightPath",
      category: "Business", type: "Full-time", work: "Hybrid",
      location: "Delhi", salary: "₹6–9 LPA",
      skills: ["Excel", "SQL"], logo: "B",
      description: "Translate business requirements into insights, reports and recommendations."
    }
  ];

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
  keywordInput.value = params.get("keyword") || "";
  locationInput.value = params.get("location") || "";

  const categoryParam = params.get("category");
  if (categoryParam) {
    document.querySelectorAll('input[name="category"]').forEach(input => {
      input.checked = input.value.toLowerCase() === categoryParam.toLowerCase();
    });
  }

  const getChecked = name =>
    [...document.querySelectorAll(`input[name="${name}"]:checked`)]
      .map(input => input.value);

  function render() {
    const keyword = keywordInput.value.trim().toLowerCase();
    const location = locationInput.value.trim().toLowerCase();
    const categories = getChecked("category");
    const types = getChecked("type");
    const workModes = getChecked("work");

    let filtered = jobs.filter(job => {
      const searchable = [
        job.title, job.company, job.category, ...job.skills
      ].join(" ").toLowerCase();

      const keywordMatch = !keyword || searchable.includes(keyword);
      const locationMatch =
        !location ||
        job.location.toLowerCase().includes(location) ||
        job.work.toLowerCase().includes(location);

      return keywordMatch && locationMatch &&
        (!categories.length || categories.includes(job.category)) &&
        (!types.length || types.includes(job.type)) &&
        (!workModes.length || workModes.includes(job.work));
    });

    if (sortSelect.value === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortSelect.value === "company") {
      filtered.sort((a, b) => a.company.localeCompare(b.company));
    }

    list.innerHTML = filtered.map(job => `
      <article class="listing-card">
        <div class="listing-top">
          <div class="listing-logo">${job.logo}</div>
          <div class="listing-info">
            <h3>${job.title}</h3>
            <p>${job.company}</p>
          </div>
          <span class="listing-badge">${job.type}</span>
        </div>

        <div class="listing-meta">
          <span>⌖ ${job.location}</span>
          <span>◷ ${job.work}</span>
          <span>▦ ${job.category}</span>
        </div>

        <p class="listing-description">${job.description}</p>

        <div class="job-tags">
          ${job.skills.map(skill => `<span>${skill}</span>`).join("")}
        </div>

        <div class="listing-bottom">
          <div>
            <strong>${job.salary}</strong>
            <small>Illustrative compensation</small>
          </div>
          <div class="listing-actions">
            <button type="button" class="save-job" data-save="${job.id}"
              aria-label="Save ${job.title}" aria-pressed="false">♡</button>
            <a class="btn btn-primary" href="job-details.html?id=${encodeURIComponent(job.id)}">View details ↗</a>
          </div>
        </div>
      </article>
    `).join("");

    count.textContent = `${filtered.length} sample ${filtered.length === 1 ? "opportunity" : "opportunities"} found`;
    empty.hidden = filtered.length !== 0;
    list.hidden = filtered.length === 0;

    renderChips();
    updateSavedButtons();
  }

  function renderChips() {
    const filters = [
      ...getChecked("category"),
      ...getChecked("type"),
      ...getChecked("work")
    ];

    chips.innerHTML = filters.map(value => `
      <span class="filter-chip">
        ${value}
        <button type="button" data-remove="${value}" aria-label="Remove ${value} filter">×</button>
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
      button.textContent = isSaved ? "♥" : "♡";
      button.setAttribute("aria-pressed", String(isSaved));
    });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    render();
  });

  document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(input => {
    input.addEventListener("change", render);
  });

  sortSelect.addEventListener("change", render);

  function resetFilters() {
    keywordInput.value = "";
    locationInput.value = "";
    document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
    sortSelect.value = "recommended";
    render();
  }

  document.getElementById("resetFilters").addEventListener("click", resetFilters);
  document.getElementById("emptyReset").addEventListener("click", resetFilters);

  chips.addEventListener("click", event => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;

    document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(input => {
      if (input.value === button.dataset.remove) input.checked = false;
    });
    render();
  });

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
    } else {
      alert("Unable to save this job in browser storage.");
    }
  });

  render();
});
