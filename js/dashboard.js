"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const user = jobPortalGetSession();
  if (!user) return;

  // If user is a recruiter, redirect or provide banner
  if (user.role === "recruiter") {
    const welcomeSection = document.querySelector(".dashboard-welcome");
    if (welcomeSection) {
      const banner = document.createElement("div");
      banner.style.cssText = "background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 12px 18px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;";
      banner.innerHTML = `
        <div>
          <strong>Recruiter Account Active (${user.name})</strong>
          <p style="margin: 2px 0 0; font-size: 13px; color: #3b82f6;">You are viewing the candidate perspective. Open your recruiter dashboard to manage applicants.</p>
        </div>
        <a href="recruiter-dashboard.html" class="btn btn-primary" style="font-size: 13px; padding: 8px 14px;">Open Recruiter Portal ⚡</a>
      `;
      welcomeSection.before(banner);
    }
  }

  // Load candidate applications from MySQL backend
  let applications = [];
  try {
    const res = await jobPortalApiFetch("/api/candidate/applications");
    if (res.ok && res.data && Array.isArray(res.data.applications)) {
      applications = res.data.applications;
    } else {
      applications = jobPortalGetUserApplications(user);
    }
  } catch (e) {
    applications = jobPortalGetUserApplications(user);
  }

  // Load candidate profile from MySQL
  let profile = jobPortalGetProfile(user);
  try {
    const profRes = await jobPortalApiFetch("/api/candidate/profile");
    if (profRes.ok && profRes.data && profRes.data.profile) {
      profile = { ...profile, ...profRes.data.profile };
    }
  } catch (e) {}

  const displayName = profile.fullName || user.name;
  const savedJobIds = jobPortalGetSavedJobs(user);
  const inProgress = applications.filter(application =>
    ["Applied", "Under Review", "Pending", "Interview"].includes(application.status || "Pending")
  ).length;

  const profileFields = [
    displayName,
    profile.phone,
    profile.location,
    profile.headline,
    profile.bio,
    profile.skills,
    profile.degree,
    profile.institution,
    profile.graduation_year || profile.graduationYear,
    profile.portfolio_url || profile.portfolio
  ];
  const completion = Math.round(
    profileFields.filter(value => String(value || "").trim()).length /
    profileFields.length * 100
  );

  const welcomeName = document.getElementById("welcomeName");
  if (welcomeName) welcomeName.textContent = (displayName.split(/\s+/)[0] || "there");

  const dashboardName = document.getElementById("dashboardName");
  if (dashboardName) dashboardName.textContent = displayName;

  const dashboardEmail = document.getElementById("dashboardEmail");
  if (dashboardEmail) dashboardEmail.textContent = user.email;

  const dashboardAvatar = document.getElementById("dashboardAvatar");
  if (dashboardAvatar) {
    dashboardAvatar.textContent = displayName
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part.charAt(0).toUpperCase()).join("") || "J";
  }

  const totalAppsEl = document.getElementById("totalApplications");
  if (totalAppsEl) totalAppsEl.textContent = applications.length;

  const savedJobsEl = document.getElementById("savedJobsCount");
  if (savedJobsEl) savedJobsEl.textContent = savedJobIds.length;

  const inProgEl = document.getElementById("inProgressApplications");
  if (inProgEl) inProgEl.textContent = inProgress;

  const compEl = document.getElementById("profileCompletion");
  if (compEl) compEl.textContent = `${completion}%`;

  function addEmptyState(container, message, linkLabel, href) {
    if (!container) return;
    const empty = document.createElement("p");
    empty.className = "dashboard-empty";
    empty.textContent = message;
    if (linkLabel && href) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = linkLabel;
      empty.append(document.createElement("br"), link);
    }
    container.replaceChildren(empty);
  }

  function makeEntry(jobId, title, company, subtitle, href, status) {
    const entry = document.createElement("article");
    entry.className = "dashboard-entry";

    const logo = document.createElement("span");
    logo.className = "dashboard-entry-logo";
    logo.textContent = company.trim().charAt(0).toUpperCase() || "J";

    const main = document.createElement("div");
    main.className = "dashboard-entry-main";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const detail = document.createElement("p");
    detail.textContent = `${company} • ${subtitle}`;
    main.append(heading, detail);
    entry.append(logo, main);

    if (status) {
      const badge = document.createElement("span");
      let statusClass = "applied";
      if (status === "Shortlisted" || status === "Interview") statusClass = "shortlisted";
      else if (status === "Hired") statusClass = "hired";
      else if (status === "Under Review") statusClass = "under-review";
      else if (status === "Pending") statusClass = "pending";
      else if (status === "Rejected") statusClass = "rejected";

      badge.className = `dashboard-status ${statusClass}`;
      badge.textContent = status;
      entry.append(badge);
    }

    const link = document.createElement("a");
    link.href = href || `job-details.html?id=${encodeURIComponent(jobId)}`;
    link.textContent = "View";
    link.setAttribute("aria-label", `View ${title}`);
    entry.append(link);
    return entry;
  }

  const recentElement = document.getElementById("recentApplications");
  if (recentElement) {
    if (!applications.length) {
      addEmptyState(
        recentElement,
        "No applications submitted yet. Jobs you apply for will appear here.",
        "Browse Openings",
        "jobs.html"
      );
    } else {
      recentElement.replaceChildren(...applications.slice(0, 3).map(application => {
        const title = application.job_title || application.jobTitle || "Job Position";
        const company = application.company || application.job_company || "Company";
        const date = application.submitted_at || application.submittedAt
          ? new Date(application.submitted_at || application.submittedAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
          })
          : "Recent";
        const status = application.status || "Pending";
        const jId = application.job_id || application.jobId || "frontend";

        return makeEntry(
          jId,
          title,
          company,
          date,
          `job-details.html?id=${encodeURIComponent(jId)}`,
          status
        );
      }));
    }
  }

  const savedElement = document.getElementById("savedJobsList");
  if (savedElement) {
    if (!savedJobIds.length) {
      addEmptyState(
        savedElement,
        "You have not saved any jobs yet.",
        "Explore Openings",
        "jobs.html"
      );
    } else {
      savedElement.replaceChildren(...savedJobIds.slice(0, 5).map(jobId => {
        return makeEntry(jobId, "Saved Position", "Company", "Saved job", `job-details.html?id=${encodeURIComponent(jobId)}`);
      }));
    }
  }

  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();
});
