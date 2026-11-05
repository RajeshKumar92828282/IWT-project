"use strict";

document.addEventListener("DOMContentLoaded", async () => {
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
    if (!notice) return;
    notice.textContent = text;
    notice.className = "profile-notice " + (isError ? "error" : "success");
    notice.hidden = false;
  }

  function hideNotice() {
    if (!notice) return;
    notice.hidden = true;
    notice.textContent = "";
  }

  function loadProfile() {
    const saved = jobPortalGetProfile(session) || {};

    const fn = document.getElementById("fullName");
    if (fn) fn.value = saved.fullName || session.name || "";

    const em = document.getElementById("email");
    if (em) em.value = session.email;

    fields.filter(id => id !== "fullName").forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = saved[id] || "";
    });

    updatePreview();
  }

  function getFormData() {
    const data = {};

    fields.forEach(id => {
      const el = document.getElementById(id);
      data[id] = el ? el.value.trim() : "";
    });

    data.fullName = data.fullName.trim();
    data.email = session.email;

    return data;
  }

  function updatePreview() {
    const data = getFormData();
    const name = data.fullName || session.name || "Your Name";
    const headline = data.headline || "Job seeker";

    const sName = document.getElementById("summaryName");
    const sHead = document.getElementById("summaryHeadline");
    const sEmail = document.getElementById("summaryEmail");
    const sLoc = document.getElementById("summaryLocation");
    const sAvatar = document.getElementById("profileAvatar");

    if (sName) sName.textContent = name;
    if (sHead) sHead.textContent = headline;
    if (sEmail) sEmail.textContent = session.email;
    if (sLoc) sLoc.textContent = data.location || "Location not set";

    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join("");

    if (sAvatar) sAvatar.textContent = initials || "J";

    const skills = [...new Set(
      data.skills.split(",").map(skill => skill.trim()).filter(Boolean)
    )];

    const preview = document.getElementById("skillPreview");
    if (preview) {
      preview.replaceChildren();
      skills.forEach(skill => {
        const tag = document.createElement("span");
        tag.textContent = skill;
        preview.appendChild(tag);
      });
    }

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

    const cP = document.getElementById("completionPercent");
    const cB = document.getElementById("completionBar");

    if (cP) cP.textContent = `${percentage}%`;
    if (cB) cB.style.width = `${percentage}%`;
  }

  if (form) {
    form.addEventListener("input", updatePreview);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      hideNotice();

      if (!form.reportValidity()) return;

      const data = getFormData();

      if (data.phone && !/^[+()\d\s-]{7,20}$/.test(data.phone)) {
        showNotice("Please enter a valid phone number (at least 7 digits).", true);
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

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving to Database...";
      }

      // Save profile to LocalStorage
      jobPortalWriteJSON(storageKey(), data);
      jobPortalSetSession({ ...session, name: data.fullName });

      jobPortalUpdateNavigation();
      showNotice("Your profile has been saved successfully.");

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Changes →";
      }
    });

    form.addEventListener("reset", () => {
      window.setTimeout(() => {
        loadProfile();
        hideNotice();
      }, 0);
    });
  }

  const logoutBtn = document.getElementById("logoutButton");
  if (logoutBtn) logoutBtn.addEventListener("click", jobPortalLogout);

  await loadProfile();
});
