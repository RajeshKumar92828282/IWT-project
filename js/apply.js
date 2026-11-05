"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("applicationForm");
  const notice = document.getElementById("applyNotice");
  const resumeInput = document.getElementById("resumeFile");
  const resumeFileName = document.getElementById("resumeFileName");

  function showNotice(text, isError = false) {
    if (!notice) return;
    notice.textContent = text;
    notice.className = "apply-notice visible " + (isError ? "error" : "success");
    notice.hidden = false;
  }

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("job") || "frontend";
  const session = jobPortalGetSession();

  if (!session) {
    jobPortalRequireLogin(`apply.html?job=${encodeURIComponent(jobId)}`);
    return;
  }

  // Load job details
  let job = null;
  try {
    const allJobs = await jobPortalGetAllJobs();
    job = allJobs.find(item => item.id === jobId);
  } catch (e) {}

  if (!job && window.JobPortalData) {
    const xmlJobs = await window.JobPortalData.loadJobsData();
    job = xmlJobs.find(item => item.id === jobId);
  }

  if (!job) {
    if (form) form.hidden = true;
    showNotice("This job listing could not be found. Please select a valid job opportunity.", true);
    return;
  }

  // Check for existing/duplicate application
  const localApps = jobPortalGetUserApplications(session);
  const alreadyApplied = localApps.find(a => (a.job_id || a.jobId) === job.id);

  if (alreadyApplied) {
    const formattedDate = new Date(alreadyApplied.submitted_at || alreadyApplied.submittedAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
    if (notice) {
      notice.innerHTML = `
        <strong>Application Already Submitted</strong><br>
        You have already applied for <strong>${escapeHTML(job.title)}</strong> at <strong>${escapeHTML(job.company)}</strong> on ${formattedDate}.<br>
        Current status in database: <strong style="color: #4F20E8;">${escapeHTML(alreadyApplied.status || "Pending")}</strong>. Duplicate applications are prevented.<br>
        <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="applications.html" class="btn btn-primary" style="font-size: 13px; padding: 6px 14px; text-decoration: none;">Track in My Applications →</a>
          <a href="jobs.html" class="btn btn-outline" style="font-size: 13px; padding: 6px 14px; text-decoration: none;">Explore Other Openings</a>
        </div>
      `;
      notice.className = "apply-notice visible";
      notice.hidden = false;
    }

    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Already Applied ✓";
      submitBtn.style.opacity = "0.75";
      submitBtn.style.cursor = "not-allowed";
    }
  }

  document.title = `Apply for ${job.title} | JobPortal`;

  const logoEl = document.getElementById("selectedJobLogo");
  if (logoEl) logoEl.textContent = job.logo || job.company.charAt(0).toUpperCase();

  const titleEl = document.getElementById("selectedJobTitle");
  if (titleEl) titleEl.textContent = job.title;

  const compEl = document.getElementById("selectedJobCompany");
  if (compEl) compEl.textContent = `${job.company} • ${job.location}`;

  const posEl = document.getElementById("summaryPosition");
  if (posEl) posEl.textContent = job.title;

  const sumCompEl = document.getElementById("summaryCompany");
  if (sumCompEl) sumCompEl.textContent = job.company;

  const today = new Date();
  const dateEl = document.getElementById("submissionDate");
  if (dateEl) {
    dateEl.textContent = today.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  // Prefill applicant data from profile and session
  const emailInput = document.getElementById("applicantEmail");
  const nameInput = document.getElementById("applicantName");
  const phoneInput = document.getElementById("applicantPhone");
  const locationInput = document.getElementById("applicantLocation");

  if (emailInput) emailInput.value = session.email;
  if (nameInput) nameInput.value = session.name || "";

  // Prefill candidate profile
  const p = jobPortalGetProfile(session);
  if (p) {
    if (p.phone && phoneInput && !phoneInput.value) phoneInput.value = p.phone;
    if (p.location && locationInput && !locationInput.value) locationInput.value = p.location;
  }

  let selectedFileValidation = null;

  if (resumeInput) {
    resumeInput.addEventListener("change", () => {
      const file = resumeInput.files[0];
      if (!file) {
        if (resumeFileName) resumeFileName.textContent = "";
        selectedFileValidation = null;
        return;
      }

      selectedFileValidation = window.JobPortalValidator
        ? window.JobPortalValidator.validateResumeFile(file)
        : { valid: true, sizeMB: `${(file.size / (1024 * 1024)).toFixed(1)} MB` };

      if (!selectedFileValidation.valid) {
        showNotice(selectedFileValidation.error, true);
        if (resumeFileName) resumeFileName.textContent = `✕ ${file.name} (Invalid)`;
      } else {
        if (notice) notice.hidden = true;
        if (resumeFileName) {
          resumeFileName.textContent = `✓ Selected: ${file.name} (${selectedFileValidation.sizeMB})`;
        }
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (notice) notice.hidden = true;

      const currentUser = jobPortalGetSession();
      if (!currentUser) {
        jobPortalRequireLogin(`apply.html?job=${encodeURIComponent(job.id)}`);
        return;
      }

      if (!form.reportValidity()) return;

      const name = nameInput ? nameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";
      const location = locationInput ? locationInput.value.trim() : "";
      const coverLetter = document.getElementById("coverLetter")
        ? document.getElementById("coverLetter").value.trim()
        : "";
      const file = resumeInput ? resumeInput.files[0] : null;

      if (name.length < 2) {
        showNotice("Please enter your full name.", true);
        return;
      }

      if (window.JobPortalValidator && !window.JobPortalValidator.isValidPhone(phone)) {
        showNotice("Please enter a valid phone number (at least 7 digits).", true);
        return;
      }

      if (coverLetter.length < 30) {
        showNotice("Please write at least 30 characters in your cover letter to explain your interest.", true);
        return;
      }

      if (!file) {
        showNotice("Please select your resume file (.pdf, .doc, or .docx).", true);
        return;
      }

      const fileValidation = window.JobPortalValidator
        ? window.JobPortalValidator.validateResumeFile(file)
        : { valid: true, sizeMB: "1.0 MB" };

      if (!fileValidation.valid) {
        showNotice(fileValidation.error, true);
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting application...";
      }

      const saveRes = jobPortalSaveApplication({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        recruiterId: job.recruiterId || job.recruiter_id || "recruiter@example.com",
        applicantName: name,
        phone,
        location,
        resumeName: file.name,
        resumeSize: fileValidation.sizeMB || "1.0 MB",
        coverLetter
      }, currentUser);

      if (saveRes && saveRes.ok) {
        window.location.href = `applications.html?success=${encodeURIComponent(saveRes.application.id)}`;
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit application →";
      }

      showNotice(saveRes?.message || "Unable to submit your application. Please try again.", true);
    });
  }
});
