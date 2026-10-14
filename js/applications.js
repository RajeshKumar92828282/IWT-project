
"use strict";

const APPLICATIONS_KEY = JOBPORTAL_KEYS.applications;

const applicationList = document.getElementById("applicationList");
const applicationSearch = document.getElementById("applicationSearch");
const statusFilter = document.getElementById("statusFilter");
const applicationNotice = document.getElementById("applicationNotice");

const jobCatalog = {
  frontend: {
    title: "Frontend Developer",
    company: "Google"
  },
  designer: {
    title: "UI/UX Designer",
    company: "Design Studio"
  },
  intern: {
    title: "Software Engineer Intern",
    company: "Amazon"
  },
  marketing: {
    title: "Digital Marketing Associate",
    company: "Growth Labs"
  },
  business: {
    title: "Business Operations Intern",
    company: "NextStep"
  },
  backend: {
    title: "Junior Backend Developer",
    company: "CloudWorks"
  },
  content: {
    title: "Content Design Intern",
    company: "Creative House"
  },
  analyst: {
    title: "Business Analyst",
    company: "BrightPath"
  }
};

function getAllApplications() {
  const records = jobPortalReadJSON(APPLICATIONS_KEY, []);
  return Array.isArray(records) ? records : [];
}

function getSavedJobs() {
  return jobPortalGetSavedJobs();
}

function getSession() {
  return jobPortalGetSession();
}

function getVisibleApplications() {
  const session = getSession();
  return session ? jobPortalGetUserApplications(session) : [];
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
  if (!dateString) {
    return "Date not available";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

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
    "Rejected"
  ];

  return allowedStatuses.includes(application.status)
    ? application.status
    : "Applied";
}

function getStatusClass(status) {
  const statusClasses = {
    "Applied": "applied",
    "Under Review": "under-review",
    "Shortlisted": "shortlisted",
    "Rejected": "rejected"
  };

  return statusClasses[status] || "applied";
}

function showNotice(message, type = "success") {
  applicationNotice.textContent = message;
  applicationNotice.className = "application-notice visible";

  if (type === "error") {
    applicationNotice.classList.add("error");
  }
}

function showSuccessFromURL() {
  const params = new URLSearchParams(window.location.search);
  const successId = params.get("success");

  if (!successId) {
    return;
  }

  const exists = getVisibleApplications().some((application) => {
    return application.id === successId;
  });

  if (exists) {
    showNotice(
      "Your demo application was saved successfully in this browser. " +
      "This is not a real submission to an employer."
    );
  } else {
    showNotice(
      "The application reference could not be found in this browser. " +
      "Check whether browser data was cleared.",
      "error"
    );
  }

  // Remove the success parameter so refreshing the page does not
  // repeatedly show the submission message.
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );
}

function updateStatistics(applications) {
  const inProgress = applications.filter((application) => {
    const status = getApplicationStatus(application);
    return status === "Applied" || status === "Under Review";
  }).length;

  document.getElementById("totalApplications").textContent =
    applications.length;

  document.getElementById("activeApplications").textContent =
    inProgress;

  document.getElementById("savedJobsCount").textContent =
    getSavedJobs().length;

  document.getElementById("applicationCountText").textContent =
    applications.length === 1
      ? "1 application saved in this browser"
      : `${applications.length} applications saved in this browser`;
}

function renderEmptyState(message, description) {
  applicationList.innerHTML = `
    <div class="applications-empty">
      <div class="applications-empty-icon" aria-hidden="true">▤</div>
      <h3>${escapeHTML(message)}</h3>
      <p>${escapeHTML(description)}</p>
      <a href="jobs.html">Explore available demo jobs &rarr;</a>
    </div>
  `;
}

function renderApplicationCard(application) {
  const status = getApplicationStatus(application);
  const catalogJob = jobCatalog[application.jobId] || {};

  const title = application.jobTitle || catalogJob.title || "Job position";
  const company = application.company || catalogJob.company || "Company";
  const location = application.location || "Location not provided";
  const resumeName = application.resumeName || "No filename recorded";
  const submittedAt = formatDate(application.submittedAt);
  const reference = application.id || "Local demo record";
  const jobId = application.jobId || "";

  return `
    <article class="application-card">
      <div class="application-card-top">
        <div class="application-job">
          <div class="application-company-icon" aria-hidden="true">
            ${escapeHTML(company.trim().charAt(0).toUpperCase() || "J")}
          </div>

          <div>
            <h3>${escapeHTML(title)}</h3>
            <p class="application-company">${escapeHTML(company)}</p>
          </div>
        </div>

        <span class="application-status ${getStatusClass(status)}">
          ${escapeHTML(status)}
        </span>
      </div>

      <div class="application-meta">
        <span>Location: ${escapeHTML(location)}</span>
        <span>Submitted: ${escapeHTML(submittedAt)}</span>
        <span>Resume: ${escapeHTML(resumeName)}</span>
      </div>

      <div class="application-card-footer">
        <span class="application-reference">
          Reference: ${escapeHTML(reference)}
        </span>

        <div class="application-actions">
          <a href="job-details.html?id=${encodeURIComponent(jobId)}">
            View Job
          </a>
          <button
            type="button"
            class="withdraw-application"
            data-application-id="${escapeHTML(application.id || "")}"
            aria-label="Withdraw application for ${escapeHTML(title)}">
            Withdraw
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderApplications() {
  const applications = getVisibleApplications();

  updateStatistics(applications);

  const searchTerm = applicationSearch.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredApplications = applications
    .filter((application) => {
      const title = String(application.jobTitle || "").toLowerCase();
      const company = String(application.company || "").toLowerCase();

      const matchesSearch =
        title.includes(searchTerm) || company.includes(searchTerm);

      const matchesStatus =
        selectedStatus === "all" ||
        getApplicationStatus(application) === selectedStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((first, second) => {
      const firstDate = new Date(first.submittedAt || 0).getTime() || 0;
      const secondDate = new Date(second.submittedAt || 0).getTime() || 0;

      return secondDate - firstDate;
    });

  if (applications.length === 0) {
    renderEmptyState(
      "No applications yet",
      "When you apply for a demo job, your application record will appear here."
    );
    return;
  }

  if (filteredApplications.length === 0) {
    renderEmptyState(
      "No matching applications",
      "Try another search term or select a different status filter."
    );
    return;
  }

  applicationList.innerHTML = filteredApplications
    .map(renderApplicationCard)
    .join("");
}

function withdrawApplication(applicationId) {
  if (!applicationId) {
    showNotice("This record has no application ID and cannot be removed.", "error");
    return;
  }

  const confirmed = window.confirm(
    "Remove this application from your local demo history? " +
    "This action cannot be undone."
  );

  if (!confirmed) {
    return;
  }

  const user = getSession();
  if (!user) {
    jobPortalRequireLogin("applications.html");
    return;
  }
  getVisibleApplications();
  const allApplications = getAllApplications();
  const updatedApplications = allApplications.filter(application =>
    !(application && application.userId === user.id &&
      application.id === applicationId)
  );

  if (updatedApplications.length === allApplications.length) {
    showNotice("Application not found in local browser storage.", "error");
    return;
  }

  if (!jobPortalWriteJSON(APPLICATIONS_KEY, updatedApplications)) {
    showNotice("Unable to remove the application from browser storage.", "error");
    return;
  }

  showNotice("Application removed from your local demo history.");
  renderApplications();
}

applicationSearch.addEventListener("input", renderApplications);
statusFilter.addEventListener("change", renderApplications);

applicationList.addEventListener("click", (event) => {
  const button = event.target.closest(".withdraw-application");

  if (!button) {
    return;
  }

  withdrawApplication(button.dataset.applicationId);
});

// Update the footer year if the shared script has not already done so.
const yearElement = document.getElementById("currentYear");

if (yearElement && !yearElement.textContent.trim()) {
  yearElement.textContent = new Date().getFullYear();
}

showSuccessFromURL();
renderApplications();
