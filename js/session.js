"use strict";

const JOBPORTAL_KEYS = Object.freeze({
  session: "jobportal_user",
  accounts: "jobportal_demo_accounts",
  applications: "jobportal_applications",
  savedJobs: "jobportal_saved_jobs"
});

const JOBPORTAL_JOB_IDS = Object.freeze([
  "frontend", "designer", "intern", "marketing",
  "business", "backend", "content", "analyst"
]);

// API Endpoint Helper
const API_BASE = window.location.origin;

async function jobPortalApiFetch(endpoint, options = {}) {
  try {
    const session = jobPortalGetSession();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (session && session.email) {
      headers["X-User-Email"] = session.email;
      headers["X-User-Role"] = session.role || "candidate";
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

function jobPortalReadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`JobPortal failed to read "${key}".`, error);
    return fallback;
  }
}

function jobPortalWriteJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`JobPortal failed to write "${key}".`, error);
    return false;
  }
}

function jobPortalReadArrayForUpdate(key) {
  const current = jobPortalReadJSON(key, []);
  return Array.isArray(current) ? current.slice() : [];
}

function jobPortalUserId(email) {
  return "user:" + encodeURIComponent(email.trim().toLowerCase());
}

function jobPortalGetSession() {
  const session = jobPortalReadJSON(JOBPORTAL_KEYS.session, null);
  if (
    session &&
    typeof session === "object" &&
    typeof session.name === "string" &&
    typeof session.email === "string"
  ) {
    return session;
  }
  return null;
}

function jobPortalSetSession(value) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.name !== "string" ||
    typeof value.email !== "string"
  ) {
    return false;
  }
  return jobPortalWriteJSON(JOBPORTAL_KEYS.session, {
    id: value.id || jobPortalUserId(value.email),
    name: value.name.trim(),
    email: value.email.trim().toLowerCase(),
    role: value.role === "recruiter" ? "recruiter" : "candidate",
    company: value.company ? value.company.trim() : ""
  });
}

function jobPortalClearSession() {
  try {
    localStorage.removeItem(JOBPORTAL_KEYS.session);
    return true;
  } catch (e) {
    return false;
  }
}

function jobPortalIsRecruiter() {
  const s = jobPortalGetSession();
  return Boolean(s && s.role === "recruiter");
}

function jobPortalProfileKey(user) {
  if (!user || !user.email) return null;
  return `jobportal_profile_${user.email.trim().toLowerCase()}`;
}

function jobPortalGetProfile(user = jobPortalGetSession()) {
  const key = jobPortalProfileKey(user);
  if (!key) return null;
  const stored = jobPortalReadJSON(key, null);
  if (stored && typeof stored === "object") return stored;

  const defaultHeadline = (user.role === "recruiter")
    ? `Talent Acquisition Specialist at ${user.company || "Leading Tech Co."}`
    : "Job Seeker";

  return {
    fullName: user.name || "",
    phone: "",
    location: "",
    headline: defaultHeadline,
    bio: "",
    skills: "",
    degree: "",
    institution: "",
    graduationYear: "",
    portfolio: ""
  };
}

function jobPortalGetAllApplications() {
  const apps = jobPortalReadJSON(JOBPORTAL_KEYS.applications, []);
  return Array.isArray(apps) ? apps : [];
}

function jobPortalGetUserApplications(user = jobPortalGetSession()) {
  if (!user || !user.email) return [];
  const all = jobPortalGetAllApplications();
  const normalizedUserEmail = user.email.trim().toLowerCase();
  const uid = user.id || jobPortalUserId(user.email);

  return all.filter(app => {
    if (!app) return false;
    const appUserEmail = (app.email || "").trim().toLowerCase();
    return appUserEmail === normalizedUserEmail || app.userId === uid;
  });
}

function jobPortalGetRecruiterApplications(recruiter = jobPortalGetSession()) {
  if (!recruiter || !recruiter.email) return [];
  const all = jobPortalGetAllApplications();
  const recruiterEmail = recruiter.email.trim().toLowerCase();

  return all.filter(app => {
    if (!app) return false;
    if (app.recruiterId && app.recruiterId.toLowerCase() === recruiterEmail) {
      return true;
    }
    if (recruiter.company && app.company) {
      return app.company.toLowerCase() === recruiter.company.toLowerCase();
    }
    return false;
  });
}

function jobPortalUpdateApplicationStatus(applicationId, newStatus, note = "") {
  const records = jobPortalReadArrayForUpdate(JOBPORTAL_KEYS.applications);
  if (!records) return { ok: false, reason: "storage" };

  const appIndex = records.findIndex(app => app && app.id === applicationId);
  if (appIndex === -1) return { ok: false, reason: "not_found" };

  const validStatuses = ["Applied", "Under Review", "Shortlisted", "Interview", "Hired", "Rejected", "Pending"];
  const sanitizedStatus = validStatuses.includes(newStatus) ? newStatus : "Applied";

  const app = records[appIndex];
  app.status = sanitizedStatus;
  app.updatedAt = new Date().toISOString();

  if (!Array.isArray(app.statusHistory)) {
    app.statusHistory = [];
  }
  app.statusHistory.push({
    status: sanitizedStatus,
    date: new Date().toISOString(),
    note: note || `Status updated to ${sanitizedStatus} by Recruiter`
  });

  records[appIndex] = app;
  const saved = jobPortalWriteJSON(JOBPORTAL_KEYS.applications, records);

  // Async sync with MySQL backend if connected
  jobPortalApiFetch(`/api/applications/${applicationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: sanitizedStatus, note })
  }).catch(() => {});

  return saved ? { ok: true, application: app } : { ok: false, reason: "save_failed" };
}

function jobPortalGetSavedJobs(user = jobPortalGetSession()) {
  if (!user || !user.email) return [];
  const store = jobPortalReadJSON(JOBPORTAL_KEYS.savedJobs, {});
  const userKey = user.email.trim().toLowerCase();
  const list = store[userKey];
  return Array.isArray(list) ? list : [];
}

function jobPortalSetSavedJobs(jobIds, user = jobPortalGetSession()) {
  if (!user || !user.email) return false;
  const store = jobPortalReadJSON(JOBPORTAL_KEYS.savedJobs, {});
  const userKey = user.email.trim().toLowerCase();
  store[userKey] = Array.isArray(jobIds) ? [...new Set(jobIds)] : [];
  return jobPortalWriteJSON(JOBPORTAL_KEYS.savedJobs, store);
}

function jobPortalSaveApplication(application, user = jobPortalGetSession()) {
  if (!user) return { ok: false, reason: "not_authenticated" };
  if (!application || !application.jobId) return { ok: false, reason: "invalid_payload" };

  const userApps = jobPortalGetUserApplications(user);
  const alreadyApplied = userApps.some(app => app.jobId === application.jobId);
  if (alreadyApplied) {
    return { ok: false, reason: "duplicate", message: "You have already applied for this job." };
  }

  const records = jobPortalReadArrayForUpdate(JOBPORTAL_KEYS.applications);
  const newApp = {
    id: application.id || `APP-${Date.now().toString().slice(-6)}`,
    userId: user.id || jobPortalUserId(user.email),
    jobId: application.jobId,
    jobTitle: application.jobTitle || "Job Position",
    company: application.company || "Company",
    recruiterId: application.recruiterId || "",
    applicantName: application.applicantName || user.name,
    email: user.email,
    phone: application.phone || "",
    location: application.location || "",
    resumeName: application.resumeName || "Resume.pdf",
    resumeSize: application.resumeSize || "1.0 MB",
    coverLetter: application.coverLetter || "",
    status: "Pending",
    submittedAt: new Date().toISOString(),
    statusHistory: [
      {
        status: "Pending",
        date: new Date().toISOString(),
        note: "Application submitted by candidate"
      }
    ]
  };

  records.unshift(newApp);
  const saved = jobPortalWriteJSON(JOBPORTAL_KEYS.applications, records);

  // Sync to MySQL backend asynchronously
  jobPortalApiFetch("/api/applications", {
    method: "POST",
    body: JSON.stringify(newApp)
  }).catch(() => {});

  return saved
    ? { ok: true, application: newApp }
    : { ok: false, reason: "storage_failed" };
}

function jobPortalReturnTo(value) {
  if (!value || typeof value !== "string") return "";
  const clean = value.replace(/^[/\\]+/, "");
  const allowed = [
    "index.html", "jobs.html", "job-details.html", "apply.html",
    "applications.html", "profile.html", "dashboard.html",
    "companies.html", "about.html", "contact.html", "recruiter-dashboard.html"
  ];
  const page = clean.split("?")[0].toLowerCase();
  return allowed.includes(page) ? clean : "";
}

function jobPortalRequireLogin(returnTo) {
  const session = jobPortalGetSession();
  if (session) return true;
  const current = returnTo || window.location.pathname.split("/").pop() + window.location.search;
  const safeTarget = jobPortalReturnTo(current) || "index.html";
  window.location.assign(`login.html?returnTo=${encodeURIComponent(safeTarget)}`);
  return false;
}

function jobPortalLogout() {
  jobPortalClearSession();
  window.location.assign("login.html");
}

function jobPortalCreateLink(label, href, className, attributes = {}) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = href;
  if (className) a.className = className;
  Object.entries(attributes).forEach(([k, v]) => a.setAttribute(k, v));
  return a;
}

function jobPortalUpdateNavigation() {
  const navLinks = document.getElementById("navLinks");
  const navActions = document.querySelector(".nav-actions");
  const mobileAuth = document.querySelector(".mobile-auth");
  if (!navLinks || !navActions) return;

  const user = jobPortalGetSession();
  const currentPath = window.location.pathname.split("/").pop().toLowerCase() || "index.html";

  // Clean dynamic session links
  navLinks.querySelectorAll('[data-session-link]').forEach(el => el.remove());

  if (mobileAuth) {
    mobileAuth.innerHTML = "";
  }

  if (!user) {
    navActions.innerHTML = `
      <a href="login.html" class="login-link">Sign In</a>
      <a href="login.html?mode=register" class="btn btn-primary">Register</a>
    `;
    if (mobileAuth) {
      mobileAuth.innerHTML = `
        <a href="login.html" class="btn btn-outline">Sign In</a>
        <a href="login.html?mode=register" class="btn btn-primary">Register</a>
      `;
    }
    return;
  }

  if (user.role === "recruiter") {
    // RECRUITER NAVIGATION
    let recruiterDashboardLink = jobPortalCreateLink("Recruiter Portal", "recruiter-dashboard.html");
    recruiterDashboardLink.dataset.sessionLink = "recruiter-dashboard";
    if (currentPath === "recruiter-dashboard.html") {
      recruiterDashboardLink.classList.add("active");
    }

    const contactLink = navLinks.querySelector('a[href^="contact.html"]');
    if (contactLink) contactLink.after(recruiterDashboardLink);
    else navLinks.append(recruiterDashboardLink);

    const nameBadge = jobPortalCreateLink(`Hi, ${user.name} (${user.company || 'HR'})`, "recruiter-dashboard.html", "login-link");
    const portalBtn = jobPortalCreateLink("Recruiter Portal ⚡", "recruiter-dashboard.html", "btn btn-primary");
    
    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "login-link";
    logoutBtn.dataset.logout = "true";
    logoutBtn.textContent = "Logout";

    navActions.replaceChildren(nameBadge, portalBtn, logoutBtn);

    if (mobileAuth) {
      const mobileLogout = document.createElement("button");
      mobileLogout.type = "button";
      mobileLogout.className = "btn btn-outline";
      mobileLogout.dataset.logout = "true";
      mobileLogout.textContent = "Logout";

      mobileAuth.append(
        jobPortalCreateLink(`Hi, ${user.name}`, "recruiter-dashboard.html"),
        jobPortalCreateLink("Recruiter Portal", "recruiter-dashboard.html", "btn btn-primary"),
        mobileLogout
      );
    }
  } else {
    // CANDIDATE NAVIGATION
    const dashboardLink = jobPortalCreateLink("Dashboard", "dashboard.html");
    dashboardLink.dataset.sessionLink = "dashboard";
    if (currentPath === "dashboard.html") dashboardLink.classList.add("active");

    const applicationsLink = jobPortalCreateLink("My Applications", "applications.html");
    applicationsLink.dataset.sessionLink = "applications";
    if (currentPath === "applications.html") applicationsLink.classList.add("active");

    const contactLink = navLinks.querySelector('a[href^="contact.html"]');
    if (contactLink) {
      contactLink.after(applicationsLink);
      contactLink.after(dashboardLink);
    } else {
      navLinks.append(dashboardLink, applicationsLink);
    }

    const nameLink = jobPortalCreateLink(`Hi, ${user.name}`, "profile.html", "login-link");
    nameLink.setAttribute("aria-label", `My profile: ${user.name}`);

    const profileBtn = jobPortalCreateLink("My Profile", "profile.html", "btn btn-primary");

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "login-link";
    logout.dataset.logout = "true";
    logout.textContent = "Logout";

    navActions.replaceChildren(nameLink, profileBtn, logout);

    if (mobileAuth) {
      const mobileLogout = document.createElement("button");
      mobileLogout.type = "button";
      mobileLogout.className = "btn btn-outline";
      mobileLogout.dataset.logout = "true";
      mobileLogout.textContent = "Logout";

      mobileAuth.append(
        jobPortalCreateLink(`Hi, ${user.name}`, "profile.html"),
        jobPortalCreateLink("Dashboard", "dashboard.html"),
        jobPortalCreateLink("My Applications", "applications.html"),
        jobPortalCreateLink("My Profile", "profile.html"),
        mobileLogout
      );
    }
  }
}

// Global click delegation for logout buttons
document.addEventListener("click", event => {
  if (event.target.closest("[data-logout]")) {
    jobPortalLogout();
  }
});

// Setup navigation on DOM load
document.addEventListener("DOMContentLoaded", () => {
  jobPortalUpdateNavigation();

  const page = window.location.pathname.split("/").pop().toLowerCase();
  if (["apply.html", "applications.html", "profile.html", "dashboard.html"].includes(page)) {
    jobPortalRequireLogin();
  }
  if (page === "recruiter-dashboard.html") {
    if (!jobPortalGetSession()) {
      jobPortalRequireLogin("recruiter-dashboard.html");
    }
  }
});
