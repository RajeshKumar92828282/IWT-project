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

function jobPortalReadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`JobPortal could not read ${key}; using empty demo data.`, error);
    return fallback;
  }
}

function jobPortalWriteJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`JobPortal could not save ${key}.`, error);
    return false;
  }
}

function jobPortalReadArrayForUpdate(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const records = JSON.parse(raw);
    if (Array.isArray(records)) return records;
    console.warn(`JobPortal ${key} data is not a list; changes were not saved.`);
  } catch (error) {
    console.warn(`JobPortal ${key} data is invalid; changes were not saved.`, error);
  }
  return null;
}

function jobPortalUserId(email) {
  return `user:${String(email || "").trim().toLowerCase()}`;
}

function jobPortalGetSession() {
  const stored = jobPortalReadJSON(JOBPORTAL_KEYS.session, null);
  if (!stored || typeof stored.email !== "string" || !stored.email.trim()) {
    return null;
  }

  const email = stored.email.trim().toLowerCase();
  const user = {
    id: typeof stored.id === "string" && stored.id ? stored.id : jobPortalUserId(email),
    email,
    name: typeof stored.name === "string" && stored.name.trim()
      ? stored.name.trim()
      : email.split("@")[0]
  };

  if (stored.id !== user.id || stored.email !== email || stored.name !== user.name) {
    jobPortalWriteJSON(JOBPORTAL_KEYS.session, user);
  }
  return user;
}

function jobPortalSetSession(value) {
  if (!value || typeof value.email !== "string" || !value.email.trim()) return false;
  const email = value.email.trim().toLowerCase();
  return jobPortalWriteJSON(JOBPORTAL_KEYS.session, {
    id: jobPortalUserId(email),
    email,
    name: typeof value.name === "string" && value.name.trim()
      ? value.name.trim()
      : email.split("@")[0]
  });
}

function jobPortalClearSession() {
  try {
    localStorage.removeItem(JOBPORTAL_KEYS.session);
    return true;
  } catch (error) {
    console.error("JobPortal could not clear the active demo session.", error);
    return false;
  }
}

function jobPortalProfileKey(user) {
  return `jobportal_profile_${user.email.toLowerCase()}`;
}

function jobPortalGetProfile(user = jobPortalGetSession()) {
  if (!user) return {};
  const profile = jobPortalReadJSON(jobPortalProfileKey(user), {});
  return profile && typeof profile === "object" && !Array.isArray(profile)
    ? profile
    : {};
}

function jobPortalGetUserApplications(user = jobPortalGetSession()) {
  if (!user) return [];
  const records = jobPortalReadJSON(JOBPORTAL_KEYS.applications, []);
  if (!Array.isArray(records)) {
    console.warn("JobPortal application storage is not a list; showing no application records.");
    return [];
  }

  const validRecords = records.filter(record =>
    record && typeof record === "object" && !Array.isArray(record)
  );
  return validRecords.filter(record => record.userId === user.id);
}

function jobPortalGetSavedJobs(user = jobPortalGetSession()) {
  if (!user) return [];
  const records = jobPortalReadJSON(JOBPORTAL_KEYS.savedJobs, []);
  if (!Array.isArray(records)) {
    console.warn("JobPortal saved-job storage is not a list; showing no saved jobs.");
    return [];
  }
  const userRecord = records.find(record =>
    record && record.userId === user.id && Array.isArray(record.jobIds)
  );
  return userRecord
    ? [...new Set(userRecord.jobIds.filter(id => JOBPORTAL_JOB_IDS.includes(id)))]
    : [];
}

function jobPortalSetSavedJobs(jobIds, user = jobPortalGetSession()) {
  if (!user) return false;
  const records = jobPortalReadArrayForUpdate(JOBPORTAL_KEYS.savedJobs);
  if (!records) return false;
  const normalizedIds = [...new Set(
    jobIds.filter(id => JOBPORTAL_JOB_IDS.includes(id))
  )];
  const others = records.filter(record =>
    !(record && record.userId === user.id && Array.isArray(record.jobIds))
  );
  if (normalizedIds.length) {
    others.push({ userId: user.id, jobIds: normalizedIds });
  }
  return jobPortalWriteJSON(JOBPORTAL_KEYS.savedJobs, others);
}

function jobPortalSaveApplication(application, user = jobPortalGetSession()) {
  if (!user) return { ok: false, reason: "login" };
  const storedRecords = jobPortalReadArrayForUpdate(JOBPORTAL_KEYS.applications);
  if (!storedRecords) return { ok: false, reason: "storage" };
  const duplicate = storedRecords.some(record =>
    record && typeof record === "object" &&
    record.userId === user.id && record.jobId === application.jobId
  );
  if (duplicate) return { ok: false, reason: "duplicate" };
  storedRecords.push({ ...application, userId: user.id });
  return jobPortalWriteJSON(JOBPORTAL_KEYS.applications, storedRecords)
    ? { ok: true }
    : { ok: false, reason: "storage" };
}

function jobPortalReturnTo(value) {
  if (typeof value !== "string" || value.length > 500) return null;
  const match = value.match(/^([a-z0-9-]+\.html)(?:\?([^#]*))?$/i);
  if (!match) return null;

  const page = match[1].toLowerCase();
  const allowedPages = new Set([
    "index.html", "about.html", "jobs.html", "job-details.html",
    "companies.html", "contact.html", "profile.html",
    "applications.html", "dashboard.html", "apply.html"
  ]);
  if (!allowedPages.has(page)) return null;

  const params = new URLSearchParams(match[2] || "");
  const permitted = {
    "jobs.html": new Set(["keyword", "location", "category"]),
    "job-details.html": new Set(["id"]),
    "apply.html": new Set(["job"])
  }[page] || new Set();
  const safeParams = new URLSearchParams();
  for (const [key, entry] of params) {
    if (permitted.has(key) && entry.length <= 120) {
      if (key === "id" || key === "job") {
        if (!JOBPORTAL_JOB_IDS.includes(entry)) continue;
      }
      safeParams.set(key, entry);
    }
  }
  const query = safeParams.toString();
  return `${page}${query ? `?${query}` : ""}`;
}

function jobPortalRequireLogin(returnTo) {
  if (jobPortalGetSession()) return true;
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const requested = returnTo || `${currentPath}${window.location.search}`;
  const safeReturn = jobPortalReturnTo(requested);
  const loginURL = safeReturn
    ? `login.html?returnTo=${encodeURIComponent(safeReturn)}`
    : "login.html";
  window.location.replace(loginURL);
  return false;
}

function jobPortalLogout() {
  if (!jobPortalClearSession()) {
    window.alert("Unable to clear the demo session from browser storage.");
    return;
  }
  window.location.replace("index.html");
}

function jobPortalCreateLink(label, href, className) {
  const link = document.createElement("a");
  link.textContent = label;
  link.href = href;
  if (className) link.className = className;
  return link;
}

function jobPortalUpdateNavigation() {
  const navLinks = document.getElementById("navLinks");
  const navActions = document.querySelector(".nav-actions");
  if (!navLinks || !navActions) return;

  const user = jobPortalGetSession();
  const mobileAuth = navLinks.querySelector(".mobile-auth");
  if (mobileAuth) mobileAuth.replaceChildren();

  navLinks.querySelectorAll(":scope > a").forEach(link => {
    const href = link.getAttribute("href") || "";
    if (/^(dashboard|applications|profile)\.html(?:\?|$)/i.test(href)) {
      link.hidden = !user;
    }
  });

  const oldDashboard = navLinks.querySelector('[data-session-link="dashboard"]');
  if (oldDashboard) oldDashboard.remove();

  if (!user) {
    navActions.replaceChildren(
      jobPortalCreateLink("Log in", "login.html", "nav-login"),
      jobPortalCreateLink("Get Started", "login.html?mode=register", "btn btn-primary nav-cta")
    );
    if (mobileAuth) {
      mobileAuth.append(
        jobPortalCreateLink("Log in", "login.html", "btn btn-outline"),
        jobPortalCreateLink("Get Started", "login.html?mode=register", "btn btn-primary")
      );
    }
  } else {
    const aboutLink = [...navLinks.querySelectorAll(":scope > a")]
      .find(link => /about\.html$/i.test(link.getAttribute("href") || ""));
    const dashboardLink = jobPortalCreateLink("Dashboard", "dashboard.html");
    dashboardLink.dataset.sessionLink = "dashboard";
    if (aboutLink) aboutLink.after(dashboardLink);
    else navLinks.prepend(dashboardLink);

    const nameLink = jobPortalCreateLink(`Hi, ${user.name}`, "profile.html", "nav-login");
    nameLink.setAttribute("aria-label", `My profile: ${user.name}`);
    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "nav-login";
    logout.dataset.logout = "true";
    logout.textContent = "Logout";
    navActions.replaceChildren(
      nameLink,
      jobPortalCreateLink("My Profile", "profile.html", "btn btn-primary nav-cta"),
      logout
    );
    if (mobileAuth) {
      const mobileLogout = document.createElement("button");
      mobileLogout.type = "button";
      mobileLogout.className = "nav-login";
      mobileLogout.dataset.logout = "true";
      mobileLogout.textContent = "Logout";
      mobileAuth.append(
        jobPortalCreateLink(`Hi, ${user.name}`, "profile.html"),
        jobPortalCreateLink("My Profile", "profile.html"),
        jobPortalCreateLink("My Applications", "applications.html"),
        mobileLogout
      );
    }
  }
}

document.addEventListener("click", event => {
  if (event.target.closest("[data-logout]")) jobPortalLogout();
});

document.addEventListener("DOMContentLoaded", () => {
  jobPortalUpdateNavigation();

  const page = window.location.pathname.split("/").pop().toLowerCase();
  if (["apply.html", "applications.html", "profile.html", "dashboard.html"].includes(page)) {
    jobPortalRequireLogin();
  }
});
