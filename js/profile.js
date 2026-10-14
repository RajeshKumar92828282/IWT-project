
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profileForm");
  const notice = document.getElementById("profileNotice");

  const session = jobPortalGetSession();

  if (!session) return;

  const fields = [
    "fullName",
    "phone",
    "location",
    "headline",
    "bio",
    "skills",
    "degree",
    "institution",
    "graduationYear",
    "portfolio"
  ];

  function storageKey() {
    return jobPortalProfileKey(session);
  }

  function showNotice(text, isError = false) {
    notice.textContent = text;
    notice.classList.toggle("error", isError);
    notice.hidden = false;
  }

  function hideNotice() {
    notice.hidden = true;
    notice.textContent = "";
    notice.classList.remove("error");
  }

  function loadProfile() {
    const saved = jobPortalGetProfile(session);

    document.getElementById("fullName").value =
      saved.fullName || session.name || "";

    document.getElementById("email").value = session.email;

    fields.filter(id => id !== "fullName").forEach(id => {
      document.getElementById(id).value = saved[id] || "";
    });

    updatePreview();
  }

  function getFormData() {
    const data = {};

    fields.forEach(id => {
      data[id] = document.getElementById(id).value.trim();
    });

    data.fullName = data.fullName.trim();
    data.email = session.email;

    return data;
  }

  function updatePreview() {
    const data = getFormData();
    const name = data.fullName || "Your Name";
    const headline = data.headline || "Job seeker";

    document.getElementById("summaryName").textContent = name;
    document.getElementById("summaryHeadline").textContent = headline;
    document.getElementById("summaryEmail").textContent = session.email;
    document.getElementById("summaryLocation").textContent =
      data.location || "Location not set";

    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join("");

    document.getElementById("profileAvatar").textContent = initials || "JD";

    const skills = [...new Set(
      data.skills.split(",").map(skill => skill.trim()).filter(Boolean)
    )];

    const preview = document.getElementById("skillPreview");
    preview.replaceChildren();

    skills.forEach(skill => {
      const tag = document.createElement("span");
      tag.textContent = skill;
      preview.appendChild(tag);
    });

    // Completion is a simple project-demo metric, not an employer score.
    const checks = [
      Boolean(data.fullName),
      Boolean(data.phone),
      Boolean(data.location),
      Boolean(data.headline),
      Boolean(data.bio),
      skills.length > 0,
      Boolean(data.degree),
      Boolean(data.institution),
      Boolean(data.graduationYear),
      Boolean(data.portfolio)
    ];

    const percentage = Math.round(
      checks.filter(Boolean).length / checks.length * 100
    );

    document.getElementById("completionPercent").textContent =
      `${percentage}%`;

    document.getElementById("completionBar").style.width =
      `${percentage}%`;
  }

  // Update the profile preview while editing.
  form.addEventListener("input", updatePreview);

  form.addEventListener("submit", event => {
    event.preventDefault();
    hideNotice();

    if (!form.reportValidity()) return;

    const data = getFormData();

    if (data.phone && !/^[+()\d\s-]{7,20}$/.test(data.phone)) {
      showNotice("Please enter a valid phone number.", true);
      return;
    }

    if (data.portfolio) {
      try {
        const url = new URL(data.portfolio);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid URL protocol");
        }
      } catch {
        showNotice("Enter a valid portfolio URL starting with https:// or http://.", true);
        return;
      }
    }

    try {
      if (!jobPortalWriteJSON(storageKey(), data)) {
        showNotice("Unable to save changes. Check your browser storage settings.", true);
        return;
      }

      // Keep the current demo session name in sync with the profile.
      if (!jobPortalSetSession({ ...session, name: data.fullName })) {
        showNotice("Profile saved, but the active demo session could not be updated.", true);
        return;
      }

      // Keep the registered demo account's display name in sync too.
      const accounts = jobPortalReadJSON(JOBPORTAL_KEYS.accounts, []);

      if (!Array.isArray(accounts)) {
        showNotice("Profile saved, but your account display name could not be synchronized.", true);
        return;
      }
      const updatedAccounts = accounts.map(account =>
        account && typeof account.email === "string" &&
        account.email.toLowerCase() === session.email.toLowerCase()
          ? { ...account, name: data.fullName }
          : account
      );

      if (!jobPortalWriteJSON(JOBPORTAL_KEYS.accounts, updatedAccounts)) {
        showNotice("Profile saved, but your account display name could not be saved.", true);
        return;
      }

      jobPortalUpdateNavigation();
      showNotice("Your profile has been saved successfully.");
    } catch (error) {
      console.error("JobPortal could not save the profile.", error);
      showNotice("Unable to save changes. Check your browser storage settings.", true);
    }
  });

  form.addEventListener("reset", () => {
    // Allow the browser reset to finish before restoring saved values.
    window.setTimeout(() => {
      loadProfile();
      hideNotice();
    }, 0);
  });

  document.getElementById("logoutButton").addEventListener("click", jobPortalLogout);

  loadProfile();
});
