
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("applicationForm");
  const notice = document.getElementById("applyNotice");
  const resumeInput = document.getElementById("resumeFile");
  const resumeFileName = document.getElementById("resumeFileName");

  const jobs = [
    { id: "frontend", title: "Frontend Developer", company: "Google", logo: "G", location: "Bengaluru", salary: "₹8–14 LPA" },
    { id: "designer", title: "UI/UX Designer", company: "Design Studio", logo: "D", location: "Remote", salary: "₹6–10 LPA" },
    { id: "intern", title: "Software Engineer Intern", company: "Amazon", logo: "a", location: "Hyderabad", salary: "₹30–50K/mo" },
    { id: "marketing", title: "Digital Marketing Associate", company: "Growth Labs", logo: "G", location: "Mumbai", salary: "₹4–7 LPA" },
    { id: "business", title: "Business Operations Intern", company: "NextStep", logo: "N", location: "Remote", salary: "₹15–25K/mo" },
    { id: "backend", title: "Junior Backend Developer", company: "CloudWorks", logo: "C", location: "Pune", salary: "₹5–9 LPA" },
    { id: "content", title: "Content Design Intern", company: "Creative House", logo: "C", location: "Remote", salary: "₹12–20K/mo" },
    { id: "analyst", title: "Business Analyst", company: "BrightPath", logo: "B", location: "Delhi", salary: "₹6–9 LPA" }
  ];

  function showNotice(text, isError = false) {
    notice.textContent = text;
    notice.classList.toggle("error", isError);
    notice.hidden = false;
  }

  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("job") || "frontend";
  const job = jobs.find(item => item.id === jobId);
  const session = jobPortalGetSession();

  if (!session) return;

  if (!job) {
    form.hidden = true;
    showNotice("This job could not be found. Please choose a job from the listings.", true);
    return;
  }

  document.title = `Apply for ${job.title} | JobPortal`;

  document.getElementById("selectedJobLogo").textContent = job.logo;
  document.getElementById("selectedJobTitle").textContent = job.title;
  document.getElementById("selectedJobCompany").textContent =
    `${job.company} · ${job.location}`;

  document.getElementById("summaryPosition").textContent = job.title;
  document.getElementById("summaryCompany").textContent = job.company;

  const today = new Date();
  document.getElementById("submissionDate").textContent =
    today.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  // Prefill from the signed-in demo account, if available.
  document.getElementById("applicantEmail").value = session.email;
  document.getElementById("applicantName").value = session.name || "";

  const profile = jobPortalGetProfile(session);
  document.getElementById("applicantName").value =
    profile.fullName || session.name || "";
  document.getElementById("applicantPhone").value = profile.phone || "";
  document.getElementById("applicantLocation").value = profile.location || "";

  resumeInput.addEventListener("change", () => {
    const file = resumeInput.files[0];
    resumeFileName.textContent = file ? `Selected: ${file.name}` : "";
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    notice.hidden = true;

    const currentUser = jobPortalGetSession();
    if (!currentUser) {
      jobPortalRequireLogin(`apply.html?job=${encodeURIComponent(job.id)}`);
      return;
    }

    if (!form.reportValidity()) return;

    const name = document.getElementById("applicantName").value.trim();
    const email = document.getElementById("applicantEmail").value.trim().toLowerCase();
    const phone = document.getElementById("applicantPhone").value.trim();
    const location = document.getElementById("applicantLocation").value.trim();
    const coverLetter = document.getElementById("coverLetter").value.trim();
    const file = resumeInput.files[0];

    if (name.length < 2) {
      showNotice("Please enter your full name.", true);
      return;
    }

    if (!/^[+()\d\s-]{7,20}$/.test(phone)) {
      showNotice("Please enter a valid phone number.", true);
      return;
    }

    if (coverLetter.length < 30) {
      showNotice("Please write at least 30 characters in your cover letter.", true);
      return;
    }

    if (!file) {
      showNotice("Please select a resume file.", true);
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();

    if (!["pdf", "doc", "docx"].includes(extension)) {
      showNotice("Please select a PDF, DOC, or DOCX resume.", true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotice("The selected resume must be 5 MB or smaller.", true);
      return;
    }

    const application = {
      id: `APP-${Date.now()}`,
      userId: currentUser.id,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      applicantName: name,
      email,
      phone,
      location,
      resumeName: file.name,
      coverLetter,
      status: "Applied",
      submittedAt: new Date().toISOString()
    };

    const saveResult = jobPortalSaveApplication(application, currentUser);
    if (!saveResult.ok) {
      if (saveResult.reason === "duplicate") {
        showNotice("You have already submitted a demo application for this job using this account.", true);
      } else {
        showNotice("Unable to save your application in browser storage. Check your browser storage settings.", true);
      }
      return;
    }
    window.location.href =
      `applications.html?success=${encodeURIComponent(application.id)}`;
  });
});
