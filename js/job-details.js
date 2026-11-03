"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("id") || "frontend";
  let job = null;

  // 1. Fetch single job from MySQL backend
  try {
    const res = await jobPortalApiFetch(`/api/jobs/${jobId}`);
    if (res.ok && res.data && res.data.job) {
      const j = res.data.job;
      job = {
        id: j.id,
        title: j.title,
        company: j.company,
        logo: j.logo || (j.company ? j.company.charAt(0).toUpperCase() : "J"),
        category: j.category,
        type: j.type,
        work: j.work_mode || "On-site",
        location: j.location,
        salary: j.salary,
        experience: j.experience || "1-3 years",
        vacancies: j.vacancies || 1,
        education: j.education || "Bachelor Degree",
        deadline: j.deadline || "",
        description: j.description,
        responsibilities: Array.isArray(j.responsibilities) ? j.responsibilities : [],
        requirements: Array.isArray(j.requirements) ? j.requirements : [],
        skills: Array.isArray(j.skills) ? j.skills : []
      };
    }
  } catch (err) {
    console.warn("API request for job details failed, checking XML fallback.", err);
  }

  // 2. Fallback to XML
  if (!job && window.JobPortalData) {
    const xmlJobs = await window.JobPortalData.loadJobsData();
    job = xmlJobs.find(item => item.id === jobId);
  }

  const content = document.getElementById("jobDetailContent");
  const notFound = document.getElementById("jobNotFound");

  if (!job) {
    if (content) content.hidden = true;
    if (notFound) notFound.hidden = false;
    document.title = "Job Not Found | JobPortal";
    return;
  }

  document.title = `${job.title} | JobPortal`;

  const detailLogo = document.getElementById("detailLogo");
  if (detailLogo) detailLogo.textContent = job.logo || job.company.charAt(0);

  const detailTitle = document.getElementById("detailTitle");
  if (detailTitle) detailTitle.textContent = job.title;

  const detailCompany = document.getElementById("detailCompany");
  if (detailCompany) detailCompany.textContent = `${job.company} • ${job.location}`;

  const detailDesc = document.getElementById("detailDescription");
  if (detailDesc) detailDesc.textContent = job.description;

  const detailSalary = document.getElementById("detailSalary");
  if (detailSalary) detailSalary.textContent = job.salary;

  const companyMiniName = document.getElementById("companyMiniName");
  if (companyMiniName) companyMiniName.textContent = job.company;

  const companyMiniLogo = document.getElementById("companyMiniLogo");
  if (companyMiniLogo) companyMiniLogo.textContent = job.logo || job.company.charAt(0);

  const detailTags = document.getElementById("detailTags");
  if (detailTags) {
    detailTags.innerHTML = [
      job.type,
      job.work,
      job.location,
      job.category,
      job.experience ? `Experience: ${job.experience}` : null
    ].filter(Boolean).map((tag, index) =>
      `<span class="detail-tag ${index === 0 ? "tag-blue" : ""}">${tag}</span>`
    ).join("");
  }

  function renderList(elementId, items) {
    const el = document.getElementById(elementId);
    if (!el || !items) return;
    el.replaceChildren(
      ...items.map(item => {
        const li = document.createElement("li");
        li.textContent = item;
        return li;
      })
    );
  }

  renderList("detailResponsibilities", job.responsibilities || []);
  renderList("detailRequirements", job.requirements || []);

  const detailSkills = document.getElementById("detailSkills");
  if (detailSkills && job.skills) {
    detailSkills.replaceChildren(
      ...job.skills.map(skill => {
        const span = document.createElement("span");
        span.textContent = skill;
        return span;
      })
    );
  }

  const applyNowBtn = document.getElementById("applyNow");
  if (applyNowBtn) {
    const session = jobPortalGetSession();
    if (session) {
      // Check if user already applied
      const userApps = jobPortalGetUserApplications(session);
      const hasApplied = userApps.some(app => (app.job_id || app.jobId) === job.id);
      if (hasApplied) {
        applyNowBtn.textContent = "Already Applied ✓";
        applyNowBtn.href = "applications.html";
        applyNowBtn.title = "View your submitted application in My Applications";
        applyNowBtn.style.background = "#059669";
        applyNowBtn.style.borderColor = "#059669";
      } else {
        applyNowBtn.href = `apply.html?job=${encodeURIComponent(job.id)}`;
      }
    } else {
      applyNowBtn.href = `apply.html?job=${encodeURIComponent(job.id)}`;
      applyNowBtn.addEventListener("click", (e) => {
        e.preventDefault();
        jobPortalRequireLogin(`apply.html?job=${encodeURIComponent(job.id)}`);
      });
    }
  }

  const saveButton = document.getElementById("saveDetailJob");

  function readSavedJobs() {
    return jobPortalGetSavedJobs();
  }

  function updateSaveButton() {
    if (!saveButton) return;
    const isSaved = readSavedJobs().includes(job.id);
    saveButton.textContent = isSaved ? "★ Saved job" : "☆ Save this job";
    saveButton.setAttribute("aria-pressed", String(isSaved));
    saveButton.classList.toggle("is-saved", isSaved);
  }

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      if (!jobPortalGetSession()) {
        jobPortalRequireLogin(
          `job-details.html?id=${encodeURIComponent(job.id)}`
        );
        return;
      }
      const saved = readSavedJobs();
      const next = saved.includes(job.id)
        ? saved.filter(id => id !== job.id)
        : [...saved, job.id];

      if (jobPortalSetSavedJobs(next)) {
        updateSaveButton();
      }
    });

    updateSaveButton();
  }
});
