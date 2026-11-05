"use strict";

const APPLICATIONS_KEY = JOBPORTAL_KEYS.applications;

const applicationList = document.getElementById("applicationList");
const applicationSearch = document.getElementById("applicationSearch");
const statusFilter = document.getElementById("statusFilter");
const applicationNotice = document.getElementById("applicationNotice");

let candidateApplicationsCache = [];

function getSavedJobs() {
  return jobPortalGetSavedJobs();
}

function getSession() {
  return jobPortalGetSession();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}

function formatDate(dateString) {
  if (!dateString) return "Date not available";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date not available";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getApplicationStatus(application) {
  const allowedStatuses = [
    "Applied",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Hired",
    "Rejected",
    "Pending"
  ];

  return allowedStatuses.includes(application.status)
    ? application.status
    : "Pending";
}

function getStatusClass(status) {
  const statusClasses = {
    "Applied": "applied",
    "Pending": "pending",
    "Under Review": "under-review",
    "Shortlisted": "shortlisted",
    "Interview": "shortlisted",
    "Hired": "hired",
    "Rejected": "rejected"
  };

  return statusClasses[status] || "applied";
}

function showNotice(message, type = "success") {
  if (!applicationNotice) return;
  applicationNotice.textContent = message;
  applicationNotice.className = "application-notice visible";

  if (type === "error") {
    applicationNotice.classList.add("error");
  }
}

function showSuccessFromURL() {
  const params = new URLSearchParams(window.location.search);
  const successId = params.get("success");
  if (!successId) return;

  showNotice(
    "Your application was saved to the database successfully! Recruiters can now review your profile and update your hiring status in real time."
  );

  window.history.replaceState({}, document.title, window.location.pathname);
}

function updateStatistics(applications) {
  const inProgress = applications.filter(application => {
    const status = getApplicationStatus(application);
    return status === "Applied" || status === "Under Review" || status === "Pending" || status === "Interview";
  }).length;

  const totalEl = document.getElementById("totalApplications");
  if (totalEl) totalEl.textContent = applications.length;

  const activeEl = document.getElementById("activeApplications");
  if (activeEl) activeEl.textContent = inProgress;

  const savedEl = document.getElementById("savedJobsCount");
  if (savedEl) savedEl.textContent = getSavedJobs().length;

  const countTextEl = document.getElementById("applicationCountText");
  if (countTextEl) {
    countTextEl.textContent = applications.length === 1
      ? "1 application tracked in database"
      : `${applications.length} applications tracked in database`;
  }
}

function renderEmptyState(message, description) {
  if (!applicationList) return;
  applicationList.innerHTML = `
    <div class="applications-empty" style="text-align: center; padding: 48px 20px; background: #FFFFFF; border-radius: 14px; border: 1.5px dashed #E5E7F0;">
      <div class="applications-empty-icon" aria-hidden="true" style="font-size: 36px; margin-bottom: 10px;">📋</div>
      <h3 style="font-size: 17px; font-weight: 700; color: #10152E; margin-bottom: 6px;">${escapeHTML(message)}</h3>
      <p style="font-size: 13.5px; color: #6B7280; margin-bottom: 16px;">${escapeHTML(description)}</p>
      <a href="jobs.html" class="btn btn-primary" style="font-size: 13px;">Explore Available Jobs →</a>
    </div>
  `;
}

function renderApplicationCard(application) {
  const status = getApplicationStatus(application);
  const title = application.job_title || application.jobTitle || "Job Position";
  const company = application.company || application.job_company || "Company";
  const location = application.location || application.job_location || "Location not set";
  const submittedAt = formatDate(application.submitted_at || application.submittedAt);
  const resumeName = application.resume_name || application.resumeName || "Resume.pdf";
  const reference = application.id || "APP-REF";
  const jobId = application.job_id || application.jobId || "frontend";

  let statusNoteHtml = "";
  if (Array.isArray(application.status_history) && application.status_history.length > 0) {
    const latestHistory = application.status_history[application.status_history.length - 1];
    if (latestHistory && latestHistory.note) {
      statusNoteHtml = `
        <div style="margin-top: 10px; padding: 10px 14px; background: #F8F8FC; border-radius: 6px; font-size: 12.5px; color: #4B5563; border-left: 3px solid #4F20E8;">
          <strong>Latest update:</strong> ${escapeHTML(latestHistory.note)}
        </div>
      `;
    }
  }

  return `
    <article class="application-card" style="padding: 22px; background: #FFFFFF; border: 1px solid #E5E7F0; border-radius: 14px; margin-bottom: 16px;">
      <div class="application-card-top" style="display: flex; align-items: center; justify-content: space-between; gap: 14px;">
        <div class="application-job" style="display: flex; align-items: center; gap: 14px;">
          <div class="application-company-icon" aria-hidden="true" style="width: 44px; height: 44px; border-radius: 10px; background: #4F20E8; color: white; display: grid; place-items: center; font-size: 18px; font-weight: 800;">
            ${escapeHTML(company.trim().charAt(0).toUpperCase() || "J")}
          </div>

          <div>
            <h3 style="font-size: 17px; font-weight: 700; color: #10152E; margin: 0;">${escapeHTML(title)}</h3>
            <p class="application-company" style="font-size: 13.5px; color: #6B7280; margin: 2px 0 0;">${escapeHTML(company)}</p>
          </div>
        </div>

        <span class="application-status ${getStatusClass(status)}">
          ${escapeHTML(status)}
        </span>
      </div>

      <div class="application-meta" style="margin-top: 14px; display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; color: #6B7280;">
        <span>📍 ${escapeHTML(location)}</span>
        <span>📅 Submitted: ${escapeHTML(submittedAt)}</span>
        <span>📎 Resume: ${escapeHTML(resumeName)}</span>
      </div>

      ${statusNoteHtml}

      <div class="application-card-footer" style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #F1F3F9; display: flex; align-items: center; justify-content: space-between;">
        <span class="application-reference" style="font-size: 12px; color: #9CA3AF;">
          Ref ID: <strong style="color: #10152E;">${escapeHTML(reference)}</strong>
        </span>

        <div class="application-actions" style="display: flex; gap: 10px; align-items: center;">
          <a href="job-details.html?id=${encodeURIComponent(jobId)}" class="btn btn-outline" style="font-size: 12.5px; padding: 6px 14px;">
            View Job Details
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderApplications() {
  if (!applicationList) return;
  const applications = candidateApplicationsCache;

  updateStatistics(applications);

  const searchTerm = applicationSearch ? applicationSearch.value.trim().toLowerCase() : "";
  const selectedStatus = statusFilter ? statusFilter.value : "all";

  const filteredApplications = applications
    .filter((application) => {
      const title = String(application.job_title || application.jobTitle || "").toLowerCase();
      const company = String(application.company || application.job_company || "").toLowerCase();

      const matchesSearch =
        title.includes(searchTerm) || company.includes(searchTerm);

      const matchesStatus =
        selectedStatus === "all" ||
        getApplicationStatus(application) === selectedStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((first, second) => {
      const firstDate = new Date(first.submitted_at || first.submittedAt || 0).getTime() || 0;
      const secondDate = new Date(second.submitted_at || second.submittedAt || 0).getTime() || 0;
      return secondDate - firstDate;
    });

  if (applications.length === 0) {
    renderEmptyState(
      "No applications submitted yet",
      "When you apply for a job opportunity, your application and live recruiter status updates will appear here."
    );
    return;
  }

  if (filteredApplications.length === 0) {
    renderEmptyState(
      "No matching applications",
      "Try another search term or clear the status filter to see all your applications."
    );
    return;
  }

  applicationList.innerHTML = filteredApplications
    .map(renderApplicationCard)
    .join("");
}

// Load applications for current candidate
function loadCandidateApplications() {
  const session = getSession();
  if (!session) return;

  candidateApplicationsCache = jobPortalGetUserApplications(session);
  renderApplications();
}

if (applicationSearch) applicationSearch.addEventListener("input", renderApplications);
if (statusFilter) statusFilter.addEventListener("change", renderApplications);

// Update the footer year if not already set
const yearElement = document.getElementById("currentYear");
if (yearElement && !yearElement.textContent.trim()) {
  yearElement.textContent = new Date().getFullYear();
}

showSuccessFromURL();
loadCandidateApplications();
