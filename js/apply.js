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

  // Load job details from MySQL
  let job = null;
  try {
    const res = await jobPortalApiFetch(`/api/jobs/${jobId}`);
    if (res.ok && res.data && res.data.job) {
      job = res.data.job;
    }
  } catch (e) {
    console.warn("Could not fetch job from API.", e);
  }

  if (!job && window.JobPortalData) {
    const xmlJobs = await window.JobPortalData.loadJobsData();
    job = xmlJobs.find(item => item.id === jobId);
  }

  if (!job) {
    if (form) form.hidden = true;
    showNotice("This job listing could not be found. Please select a valid job opportunity.", true);
    return;
  }

  // Check for existing/duplicate application in MySQL
  let alreadyApplied = false;
  try {
    const appRes = await jobPortalApiFetch("/api/candidate/applications");
    if (appRes.ok && appRes.data && Array.isArray(appRes.data.applications)) {
      const existing = appRes.data.applications.find(a => (a.job_id || a.jobId) === job.id);
      if (existing) {
        alreadyApplied = existing;
      }
    }
  } catch (e) {}

  if (!alreadyApplied) {
    const localApps = jobPortalGetUserApplications(session);
    alreadyApplied = localApps.find(a => (a.job_id || a.jobId) === job.id);
  }

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

  // Fetch candidate profile from MySQL
  try {
    const profRes = await jobPortalApiFetch("/api/candidate/profile");
    if (profRes.ok && profRes.data && profRes.data.profile) {
      const p = profRes.data.profile;
      if (p.phone && phoneInput) phoneInput.value = p.phone;
      if (p.location && locationInput) locationInput.value = p.location;
    }
  } catch (e) {}

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
        submitBtn.textContent = "Submitting to MySQL...";
      }

      // Submit to MySQL API
      const appPayload = {
        job_id: job.id,
        applicant_name: name,
        email: email,
        phone: phone,
        location: location,
        resume_name: file.name,
        resume_size: fileValidation.sizeMB || "1.0 MB",
        cover_letter: coverLetter
      };

      const res = await jobPortalApiFetch("/api/applications", {
        method: "POST",
        body: JSON.stringify(appPayload)
      });

      if (res.ok && res.data && res.data.success) {
        // Also save to local storage cache
        jobPortalSaveApplication({
          id: res.data.application_id,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          recruiterId: job.recruiter_id || "recruiter@example.com",
          applicantName: name,
          phone,
          location,
          resumeName: file.name,
          resumeSize: fileValidation.sizeMB || "1.0 MB",
          coverLetter
        }, currentUser);

        window.location.href = `applications.html?success=${encodeURIComponent(res.data.application_id)}`;
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit application →";
      }

      showNotice(res.data?.message || "Unable to submit your application to database.", true);
    });
  }
});
