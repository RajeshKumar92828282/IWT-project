"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const user = jobPortalGetSession();
  if (!user) return;

  const profile = jobPortalGetProfile(user);
  const displayName = profile.fullName || user.name;
  const applications = jobPortalGetUserApplications(user).sort((first, second) => {
    const firstDate = new Date(first.submittedAt || 0).getTime() || 0;
    const secondDate = new Date(second.submittedAt || 0).getTime() || 0;
    return secondDate - firstDate;
  });
  const savedJobIds = jobPortalGetSavedJobs(user);
  const validStatuses = ["Applied", "Under Review", "Shortlisted", "Rejected"];
  const inProgress = applications.filter(application =>
    ["Applied", "Under Review"].includes(
      validStatuses.includes(application.status) ? application.status : "Applied"
    )
  ).length;

  const profileFields = [
    profile.fullName || user.name,
    profile.phone,
    profile.location,
    profile.headline,
    profile.bio,
    profile.skills,
    profile.degree,
    profile.institution,
    profile.graduationYear,
    profile.portfolio
  ];
  const completion = Math.round(
    profileFields.filter(value => String(value || "").trim()).length /
    profileFields.length * 100
  );

  document.getElementById("welcomeName").textContent =
    (displayName.split(/\s+/)[0] || "there");
  document.getElementById("dashboardName").textContent = displayName;
  document.getElementById("dashboardEmail").textContent = user.email;
  document.getElementById("dashboardAvatar").textContent = displayName
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(part => part.charAt(0).toUpperCase()).join("") || "J";
  document.getElementById("totalApplications").textContent = applications.length;
  document.getElementById("savedJobsCount").textContent = savedJobIds.length;
  document.getElementById("inProgressApplications").textContent = inProgress;
  document.getElementById("profileCompletion").textContent = `${completion}%`;

  const catalog = {
    frontend: ["Frontend Developer", "Google"],
    designer: ["UI/UX Designer", "Design Studio"],
    intern: ["Software Engineer Intern", "Amazon"],
    marketing: ["Digital Marketing Associate", "Growth Labs"],
    business: ["Business Operations Intern", "NextStep"],
    backend: ["Junior Backend Developer", "CloudWorks"],
    content: ["Content Design Intern", "Creative House"],
    analyst: ["Business Analyst", "BrightPath"]
  };

  function addEmptyState(container, message, linkLabel, href) {
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
    detail.textContent = `${company} · ${subtitle}`;
    main.append(heading, detail);
    entry.append(logo, main);

    if (status) {
      const badge = document.createElement("span");
      badge.className = `dashboard-status ${
        status === "Shortlisted" ? "shortlisted" :
        status === "Rejected" ? "rejected" : ""
      }`;
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
  if (!applications.length) {
    addEmptyState(
      recentElement,
      "No demo applications yet. Applications you submit will appear here.",
      "Browse jobs",
      "jobs.html"
    );
  } else {
    recentElement.replaceChildren(...applications.slice(0, 3).map(application => {
      const fallback = catalog[application.jobId] || ["Job position", "Company"];
      const title = typeof application.jobTitle === "string"
        ? application.jobTitle : fallback[0];
      const company = typeof application.company === "string"
        ? application.company : fallback[1];
      const date = application.submittedAt
        ? new Date(application.submittedAt).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric"
        })
        : "Date not available";
      const status = validStatuses.includes(application.status)
        ? application.status : "Applied";
      return makeEntry(
        application.jobId,
        title,
        company,
        date,
        `job-details.html?id=${encodeURIComponent(application.jobId || "")}`,
        status
      );
    }));
  }

  const savedElement = document.getElementById("savedJobsList");
  if (!savedJobIds.length) {
    addEmptyState(
      savedElement,
      "You have not saved any jobs yet.",
      "Explore sample jobs",
      "jobs.html"
    );
  } else {
    savedElement.replaceChildren(...savedJobIds.slice(0, 5).map(jobId => {
      const job = catalog[jobId];
      if (!job) return null;
      return makeEntry(jobId, job[0], job[1], "Saved job", `job-details.html?id=${encodeURIComponent(jobId)}`);
    }).filter(Boolean));
  }

  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();
});
