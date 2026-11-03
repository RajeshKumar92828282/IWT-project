/**
 * JobPortal Recruiter Dashboard Controller
 * Full MySQL Backend Integration with LocalStorage Fallback
 */
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const session = jobPortalGetSession();

  if (!session) {
    jobPortalRequireLogin("recruiter-dashboard.html");
    return;
  }

  const toast = document.getElementById("recruiterToast");
  const toastMessage = document.getElementById("toastMessage");
  const searchInput = document.getElementById("recruiterSearch");
  const jobFilter = document.getElementById("recruiterJobFilter");
  const statusFilter = document.getElementById("recruiterStatusFilter");
  const applicationsTableBody = document.getElementById("applicationsTableBody");
  const assignedJobsGrid = document.getElementById("assignedJobsGrid");
  const assignedJobsCount = document.getElementById("assignedJobsCount");
  const recruiterEmailBadge = document.getElementById("recruiterEmailBadge");

  // Post Job Modal elements
  const postJobModal = document.getElementById("postJobModal");
  const postJobForm = document.getElementById("postJobForm");
  const btnOpenPostJob = document.getElementById("btnOpenPostJob");
  const sidebarPostJobBtn = document.getElementById("sidebarPostJobBtn");
  const postJobCloseBtn = document.getElementById("postJobCloseBtn");
  const postJobCancelBtn = document.getElementById("postJobCancelBtn");
  const postJobModalTitle = document.getElementById("postJobModalTitle");
  const postJobSubmitBtn = document.getElementById("postJobSubmitBtn");
  const editJobIdInput = document.getElementById("editJobId");

  // Profile Header
  const recruiterNameEl = document.getElementById("recruiterName");
  const recruiterCompanyEl = document.getElementById("recruiterCompany");
  if (recruiterNameEl) recruiterNameEl.textContent = session.name;
  if (recruiterCompanyEl) recruiterCompanyEl.textContent = session.company || "Company";
  if (recruiterEmailBadge) recruiterEmailBadge.textContent = session.email;

  let managedJobsCache = [];
  let applicationsCache = [];

  function showToast(msg) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    toast.classList.add("active");
    window.setTimeout(() => {
      toast.classList.remove("active");
    }, 3500);
  }

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatDate(isoString) {
    if (!isoString) return "Recent";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recent";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function getStatusClass(status) {
    const map = {
      "Applied": "applied",
      "Pending": "pending",
      "Under Review": "under-review",
      "Shortlisted": "shortlisted",
      "Interview": "shortlisted",
      "Hired": "hired",
      "Rejected": "rejected"
    };
    return map[status] || "applied";
  }

  function updateKPIs(applications, activeJobsCount) {
    const totalCount = applications.length;
    const reviewCount = activeJobsCount;
    const shortCount = applications.filter(a => a.status === "Shortlisted" || a.status === "Interview").length;
    const hiredCount = applications.filter(a => a.status === "Hired").length;
    const rejectedCount = applications.filter(a => a.status === "Rejected").length;

    const totalEl = document.getElementById("kpiTotal");
    const reviewEl = document.getElementById("kpiReview");
    const shortEl = document.getElementById("kpiShortlisted");
    const hiredEl = document.getElementById("kpiHired");
    const rejectedEl = document.getElementById("kpiRejected");

    if (totalEl) totalEl.textContent = totalCount;
    if (reviewEl) reviewEl.textContent = reviewCount;
    if (shortEl) shortEl.textContent = shortCount;
    if (hiredEl) hiredEl.textContent = hiredCount;
    if (rejectedEl) rejectedEl.textContent = rejectedCount;
  }

  // Load Recruiter's Jobs from MySQL
  async function loadRecruiterJobs() {
    try {
      const res = await jobPortalApiFetch("/api/recruiter/jobs");
      if (res.ok && res.data && res.data.jobs) {
        managedJobsCache = res.data.jobs;
      } else {
        // Fallback to local jobs
        const defaultJobs = window.JobPortalData ? await window.JobPortalData.loadJobsData() : [];
        managedJobsCache = defaultJobs.filter(j => 
          !j.recruiterId || j.recruiterId.toLowerCase() === session.email.toLowerCase() ||
          (session.company && j.company && j.company.toLowerCase() === session.company.toLowerCase())
        );
      }
    } catch (e) {
      console.warn("Could not load jobs from API, using local fallback.", e);
    }

    renderManagedJobs();
    populateJobFilter();
  }

  // Load Applications from MySQL
  async function loadRecruiterApplications() {
    try {
      const res = await jobPortalApiFetch("/api/recruiter/applications");
      if (res.ok && res.data && res.data.applications) {
        applicationsCache = res.data.applications;
      } else {
        applicationsCache = jobPortalGetRecruiterApplications(session);
      }
    } catch (e) {
      applicationsCache = jobPortalGetRecruiterApplications(session);
    }

    renderTable();
  }

  function populateJobFilter() {
    if (!jobFilter) return;
    const currentVal = jobFilter.value;
    jobFilter.innerHTML = `<option value="all">All Managed Jobs</option>` +
      managedJobsCache.map(j => `<option value="${escapeHTML(j.id)}">${escapeHTML(j.title)} (${escapeHTML(j.company)})</option>`).join("");
    if (currentVal) jobFilter.value = currentVal;
  }

  function renderManagedJobs() {
    if (!assignedJobsGrid) return;
    const activeJobs = managedJobsCache.filter(j => j.is_active !== 0);

    if (assignedJobsCount) {
      assignedJobsCount.textContent = `${managedJobsCache.length} Positions (${activeJobs.length} Active)`;
    }

    if (managedJobsCache.length === 0) {
      assignedJobsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 36px; text-align: center; background: #FFFFFF; border-radius: 14px; border: 1.5px dashed #E5E7F0;">
          <h3 style="font-size: 16px; font-weight: 700; color: #10152E; margin-bottom: 6px;">No Job Openings Posted Yet</h3>
          <p style="font-size: 13px; color: #6B7280; margin-bottom: 16px;">Create your first job listing to start receiving candidate applications in MySQL.</p>
          <button type="button" class="btn btn-primary" onclick="document.getElementById('btnOpenPostJob').click();" style="font-size: 13px;">+ Post New Job Now</button>
        </div>
      `;
      return;
    }

    assignedJobsGrid.innerHTML = managedJobsCache.map(job => {
      const appCount = job.applicants_count !== undefined 
        ? job.applicants_count 
        : applicationsCache.filter(a => a.job_id === job.id || a.jobId === job.id).length;
      const isActive = job.is_active !== 0;

      return `
        <article class="recruiter-job-card" style="${!isActive ? 'opacity: 0.7; background: #F8F8FC;' : ''}">
          <div>
            <div class="recruiter-job-top">
              <div>
                <h3 class="recruiter-job-title">${escapeHTML(job.title)}</h3>
                <span class="recruiter-job-company">${escapeHTML(job.company)} • ${escapeHTML(job.location)}</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span class="r-badge ${isActive ? 'shortlisted' : 'rejected'}" style="font-size: 10px;">
                  ${isActive ? 'Active' : 'Closed'}
                </span>
                <span class="r-badge ${appCount > 0 ? 'under-review' : 'applied'}">
                  ${appCount} ${appCount === 1 ? 'Applicant' : 'Applicants'}
                </span>
              </div>
            </div>
            <div class="recruiter-job-meta">
              <span>${escapeHTML(job.type || 'Full-time')}</span>
              <span>${escapeHTML(job.work_mode || job.work || 'On-site')}</span>
              <span>${escapeHTML(job.category || 'Technology')}</span>
              <span>${escapeHTML(job.salary || 'Competitive')}</span>
            </div>
          </div>
          <div class="recruiter-job-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid #F1F3F9;">
            <button type="button" class="btn-filter-applicants" data-filter-job="${escapeHTML(job.id)}">
              Applicants (${appCount})
            </button>
            <button type="button" class="btn btn-outline" data-edit-job="${escapeHTML(job.id)}" style="padding: 6px 12px; font-size: 12px; height: 32px;">
              Edit
            </button>
            <button type="button" class="btn btn-outline" data-toggle-job="${escapeHTML(job.id)}" data-active="${isActive ? '1' : '0'}" style="padding: 6px 12px; font-size: 12px; height: 32px;">
              ${isActive ? 'Close' : 'Reopen'}
            </button>
            <button type="button" class="btn btn-outline" data-delete-job="${escapeHTML(job.id)}" style="padding: 6px 10px; font-size: 12px; height: 32px; color: #EF4444; border-color: #FCA5A5;">
              Delete
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderTable() {
    const activeJobsCount = managedJobsCache.filter(j => j.is_active !== 0).length;
    updateKPIs(applicationsCache, activeJobsCount);

    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const selectedJob = jobFilter ? jobFilter.value : "all";
    const selectedStatus = statusFilter ? statusFilter.value : "all";

    const filtered = applicationsCache.filter(app => {
      const appId = app.job_id || app.jobId;
      const matchJob = selectedJob === "all" || appId === selectedJob;
      const matchStatus = selectedStatus === "all" || app.status === selectedStatus;
      const matchQuery = !query ||
        String(app.applicant_name || app.applicantName || "").toLowerCase().includes(query) ||
        String(app.email || "").toLowerCase().includes(query) ||
        String(app.job_title || app.jobTitle || "").toLowerCase().includes(query) ||
        String(app.id || "").toLowerCase().includes(query);

      return matchJob && matchStatus && matchQuery;
    });

    if (!applicationsTableBody) return;

    if (filtered.length === 0) {
      applicationsTableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-table-state" style="padding: 40px 20px; text-align: center; color: #6B7280;">
              <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
              <h3 style="font-size: 15px; font-weight: 700; color: #10152E; margin-bottom: 4px;">No Applications Found</h3>
              <p style="font-size: 13px;">Candidates who apply for your active job listings will appear here with live MySQL status tracking.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    applicationsTableBody.innerHTML = filtered.map(app => {
      const applicantName = app.applicant_name || app.applicantName || "Candidate";
      const applicantEmail = app.email || "Email unavailable";
      const applicantAvatar = applicantName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const appliedDate = formatDate(app.submitted_at || app.submittedAt);
      const statusClass = getStatusClass(app.status);
      const jobTitle = app.job_title || app.jobTitle || "Job Position";

      return `
        <tr data-app-id="${escapeHTML(app.id)}">
          <td>
            <div class="candidate-cell" style="display: flex; align-items: center; gap: 12px;">
              <div class="candidate-avatar" style="width: 36px; height: 36px; border-radius: 50%; background: #4F20E8; color: white; display: grid; place-items: center; font-size: 12px; font-weight: 700;">
                ${applicantAvatar}
              </div>
              <div class="candidate-info">
                <strong style="color: #10152E; font-size: 13.5px;">${escapeHTML(applicantName)}</strong>
                <small style="color: #6B7280; font-size: 11.5px; display: block;">${escapeHTML(applicantEmail)}</small>
              </div>
            </div>
          </td>
          <td>
            <strong style="color: #10152E; font-size: 13.5px;">${escapeHTML(jobTitle)}</strong>
          </td>
          <td>
            <span style="color: #6B7280; font-size: 13px;">${appliedDate}</span>
          </td>
          <td>
            <span class="r-badge ${statusClass}">
              ${escapeHTML(app.status || "Pending")}
            </span>
          </td>
          <td>
            <select class="status-changer" data-action="status" data-app="${escapeHTML(app.id)}" aria-label="Update status for ${escapeHTML(applicantName)}">
              <option value="Pending" ${app.status === "Pending" ? "selected" : ""}>Pending</option>
              <option value="Under Review" ${app.status === "Under Review" ? "selected" : ""}>Under Review</option>
              <option value="Shortlisted" ${app.status === "Shortlisted" ? "selected" : ""}>Shortlisted</option>
              <option value="Interview" ${app.status === "Interview" ? "selected" : ""}>Interview</option>
              <option value="Hired" ${app.status === "Hired" ? "selected" : ""}>Hired</option>
              <option value="Rejected" ${app.status === "Rejected" ? "selected" : ""}>Rejected</option>
            </select>
          </td>
          <td>
            <button type="button" class="btn-table-action" data-action="view" data-app="${escapeHTML(app.id)}" title="Inspect Candidate & Resume" aria-label="View applicant details">
              👁
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Handle Status Change via Dropdown
  if (applicationsTableBody) {
    applicationsTableBody.addEventListener("change", async (e) => {
      const target = e.target;
      if (!target || target.dataset.action !== "status") return;

      const appId = target.dataset.app;
      const newStatus = target.value;
      target.disabled = true;

      // Update in MySQL
      const res = await jobPortalApiFetch(`/api/applications/${appId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, note: `Status updated to ${newStatus} by ${session.name}` })
      });

      // Update in local cache and LocalStorage
      jobPortalUpdateApplicationStatus(appId, newStatus, `Status updated to ${newStatus}`);
      const app = applicationsCache.find(a => a.id === appId);
      if (app) app.status = newStatus;

      target.disabled = false;
      showToast(`Candidate status updated to "${newStatus}" in MySQL.`);
      renderTable();
    });

    // View Modal Detail
    applicationsTableBody.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-action="view"]');
      if (!btn) return;
      const appId = btn.dataset.app;
      const app = applicationsCache.find(a => a.id === appId) ||
        jobPortalGetAllApplications().find(a => a.id === appId);
      if (!app) return;

      const modal = document.getElementById("appDetailModal");
      const modalBody = document.getElementById("modalBody");
      if (!modal || !modalBody) return;

      const applicantName = app.applicant_name || app.applicantName || "Candidate";
      const applicantEmail = app.email || "Not specified";
      const applicantPhone = app.phone || "Not specified";
      const applicantLoc = app.location || "Not specified";
      const resumeName = app.resume_name || app.resumeName || "Resume.pdf";
      const coverLetter = app.cover_letter || app.coverLetter || "No cover letter provided.";
      const jobTitle = app.job_title || app.jobTitle || "Job Position";

      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid #E5E7F0;">
            <div>
              <h2 style="font-size: 20px; font-weight: 800; color: #10152E; margin: 0;">${escapeHTML(applicantName)}</h2>
              <p style="font-size: 13.5px; color: #4F20E8; font-weight: 600; margin-top: 2px;">Applied for: ${escapeHTML(jobTitle)}</p>
            </div>
            <span class="r-badge ${getStatusClass(app.status)}">${escapeHTML(app.status)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <span style="font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700;">Email Address</span>
              <p style="font-size: 14px; font-weight: 600; color: #10152E; margin-top: 2px;">${escapeHTML(applicantEmail)}</p>
            </div>
            <div>
              <span style="font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700;">Phone Number</span>
              <p style="font-size: 14px; font-weight: 600; color: #10152E; margin-top: 2px;">${escapeHTML(applicantPhone)}</p>
            </div>
            <div>
              <span style="font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700;">Location</span>
              <p style="font-size: 14px; font-weight: 600; color: #10152E; margin-top: 2px;">${escapeHTML(applicantLoc)}</p>
            </div>
            <div>
              <span style="font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700;">Resume Document</span>
              <p style="font-size: 14px; font-weight: 600; color: #4F20E8; margin-top: 2px;">📎 ${escapeHTML(resumeName)}</p>
            </div>
          </div>

          <div>
            <span style="font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700;">Cover Letter / Introduction</span>
            <div style="margin-top: 6px; padding: 14px; background: #F8F8FC; border-radius: 8px; border: 1px solid #E5E7F0; font-size: 13.5px; line-height: 1.6; color: #10152E; max-height: 180px; overflow-y: auto;">
              ${escapeHTML(coverLetter).replace(/\n/g, "<br>")}
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn btn-primary" onclick="document.getElementById('modalCloseBtn').click();">Close Inspection</button>
          </div>
        </div>
      `;
      modal.classList.add("active");
    });
  }

  // Close Applicant Detail Modal
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      const modal = document.getElementById("appDetailModal");
      if (modal) modal.classList.remove("active");
    });
  }

  // POST A JOB MODAL CONTROLLER
  function openPostJobModal(jobToEdit = null) {
    if (!postJobModal || !postJobForm) return;

    if (jobToEdit) {
      if (postJobModalTitle) postJobModalTitle.textContent = "Edit Job Opening";
      if (postJobSubmitBtn) postJobSubmitBtn.textContent = "Save Changes →";
      if (editJobIdInput) editJobIdInput.value = jobToEdit.id;

      document.getElementById("jobTitle").value = jobToEdit.title || "";
      document.getElementById("jobCompany").value = jobToEdit.company || session.company || "";
      document.getElementById("jobCategory").value = jobToEdit.category || "Technology";
      document.getElementById("jobWorkMode").value = jobToEdit.work_mode || jobToEdit.work || "On-site";
      document.getElementById("jobType").value = jobToEdit.type || "Full-time";
      document.getElementById("jobLocation").value = jobToEdit.location || "";
      document.getElementById("jobSalary").value = jobToEdit.salary || "";
      document.getElementById("jobExperience").value = jobToEdit.experience || "1-3 years";
      document.getElementById("jobVacancies").value = jobToEdit.vacancies || 1;
      document.getElementById("jobDeadline").value = jobToEdit.deadline || "";
      document.getElementById("jobEducation").value = jobToEdit.education || "Bachelor Degree";
      document.getElementById("jobDescription").value = jobToEdit.description || "";
      document.getElementById("jobResponsibilities").value = Array.isArray(jobToEdit.responsibilities) ? jobToEdit.responsibilities.join("\n") : (jobToEdit.responsibilities || "");
      document.getElementById("jobSkills").value = Array.isArray(jobToEdit.skills) ? jobToEdit.skills.join(", ") : (jobToEdit.skills || "");
    } else {
      if (postJobModalTitle) postJobModalTitle.textContent = "Post a New Job Opening";
      if (postJobSubmitBtn) postJobSubmitBtn.textContent = "Publish Job Opening →";
      if (editJobIdInput) editJobIdInput.value = "";
      postJobForm.reset();
      document.getElementById("jobCompany").value = session.company || "Google";
    }

    postJobModal.style.display = "flex";
    postJobModal.classList.add("active");
  }

  function closePostJobModal() {
    if (!postJobModal) return;
    postJobModal.style.display = "none";
    postJobModal.classList.remove("active");
  }

  if (btnOpenPostJob) btnOpenPostJob.addEventListener("click", (e) => { e.preventDefault(); openPostJobModal(); });
  if (sidebarPostJobBtn) sidebarPostJobBtn.addEventListener("click", (e) => { e.preventDefault(); openPostJobModal(); });
  if (postJobCloseBtn) postJobCloseBtn.addEventListener("click", closePostJobModal);
  if (postJobCancelBtn) postJobCancelBtn.addEventListener("click", closePostJobModal);

  // Post / Edit Job Form Submit
  if (postJobForm) {
    postJobForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!postJobForm.reportValidity()) return;

      const editId = editJobIdInput ? editJobIdInput.value : "";
      const jobData = {
        title: document.getElementById("jobTitle").value.trim(),
        company: document.getElementById("jobCompany").value.trim() || session.company,
        category: document.getElementById("jobCategory").value,
        work_mode: document.getElementById("jobWorkMode").value,
        type: document.getElementById("jobType").value,
        location: document.getElementById("jobLocation").value.trim(),
        salary: document.getElementById("jobSalary").value.trim(),
        experience: document.getElementById("jobExperience").value.trim(),
        vacancies: parseInt(document.getElementById("jobVacancies").value, 10) || 1,
        deadline: document.getElementById("jobDeadline").value || null,
        education: document.getElementById("jobEducation").value.trim(),
        description: document.getElementById("jobDescription").value.trim(),
        responsibilities: document.getElementById("jobResponsibilities").value.trim(),
        skills: document.getElementById("jobSkills").value.trim()
      };

      postJobSubmitBtn.disabled = true;
      postJobSubmitBtn.textContent = "Saving to MySQL...";

      if (editId) {
        // Edit existing job in MySQL
        const res = await jobPortalApiFetch(`/api/jobs/${editId}`, {
          method: "PUT",
          body: JSON.stringify(jobData)
        });
        showToast(res.ok ? "Job updated successfully in MySQL!" : "Could not update job.");
      } else {
        // Create new job in MySQL
        const res = await jobPortalApiFetch("/api/jobs", {
          method: "POST",
          body: JSON.stringify(jobData)
        });
        showToast(res.ok ? "Job published successfully in MySQL!" : "Could not post job.");
      }

      postJobSubmitBtn.disabled = false;
      closePostJobModal();
      await loadRecruiterJobs();
    });
  }

  // Manage Assigned Jobs Grid Actions (Edit, Close/Reopen, Delete, Filter)
  if (assignedJobsGrid) {
    assignedJobsGrid.addEventListener("click", async (e) => {
      // 1. Filter Applicants
      const filterBtn = e.target.closest("[data-filter-job]");
      if (filterBtn) {
        const jobId = filterBtn.dataset.filterJob;
        if (jobFilter) {
          jobFilter.value = jobId;
          renderTable();
          const target = document.getElementById("applicationsSection");
          if (target) target.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }

      // 2. Edit Job
      const editBtn = e.target.closest("[data-edit-job]");
      if (editBtn) {
        const jobId = editBtn.dataset.editJob;
        const job = managedJobsCache.find(j => j.id === jobId);
        if (job) openPostJobModal(job);
        return;
      }

      // 3. Toggle Job Status (Close / Reopen)
      const toggleBtn = e.target.closest("[data-toggle-job]");
      if (toggleBtn) {
        const jobId = toggleBtn.dataset.toggleJob;
        const currentlyActive = toggleBtn.dataset.active === "1";
        const newActiveState = currentlyActive ? 0 : 1;

        toggleBtn.disabled = true;
        const res = await jobPortalApiFetch(`/api/jobs/${jobId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: newActiveState })
        });

        showToast(res.ok 
          ? `Job status changed to ${newActiveState ? 'Active' : 'Closed'}.`
          : "Could not update job status."
        );
        await loadRecruiterJobs();
        return;
      }

      // 4. Delete Job
      const deleteBtn = e.target.closest("[data-delete-job]");
      if (deleteBtn) {
        const jobId = deleteBtn.dataset.deleteJob;
        if (!confirm("Are you sure you want to delete this job posting? This action cannot be undone.")) {
          return;
        }

        deleteBtn.disabled = true;
        const res = await jobPortalApiFetch(`/api/jobs/${jobId}`, {
          method: "DELETE"
        });

        showToast(res.ok ? "Job listing deleted from MySQL." : "Could not delete job.");
        await loadRecruiterJobs();
        return;
      }
    });
  }

  if (searchInput) searchInput.addEventListener("input", renderTable);
  if (jobFilter) jobFilter.addEventListener("change", renderTable);
  if (statusFilter) statusFilter.addEventListener("change", renderTable);

  // Initialize
  await loadRecruiterJobs();
  await loadRecruiterApplications();
});
