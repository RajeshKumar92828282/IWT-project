
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const jobs = [
    {
      id: "frontend",
      title: "Frontend Developer",
      company: "Google",
      logo: "G",
      category: "Technology",
      type: "Full-time",
      work: "Hybrid",
      location: "Bengaluru",
      salary: "₹8–14 LPA",
      description:
        "Build responsive web interfaces, create accessible user experiences, and collaborate with a product team to improve web applications. This is an illustrative role for the JobPortal student project.",
      responsibilities: [
        "Build responsive pages using HTML, CSS and JavaScript.",
        "Work with reusable UI components and frontend best practices.",
        "Collaborate with designers and developers.",
        "Test interfaces across screen sizes and browsers."
      ],
      requirements: [
        "Understanding of HTML5, CSS3 and JavaScript.",
        "Basic knowledge of responsive web design.",
        "Familiarity with Git and version control.",
        "Willingness to learn and solve problems."
      ],
      skills: ["HTML5", "CSS3", "JavaScript", "React", "Git"]
    },
    {
      id: "designer",
      title: "UI/UX Designer",
      company: "Design Studio",
      logo: "D",
      category: "Design",
      type: "Full-time",
      work: "Remote",
      location: "Remote",
      salary: "₹6–10 LPA",
      description:
        "Create intuitive digital experiences by researching user needs, developing wireframes, and refining interface designs. This sample role is designed for demonstration.",
      responsibilities: [
        "Create wireframes and interactive prototypes.",
        "Design clear and consistent user interfaces.",
        "Collect feedback and improve usability.",
        "Collaborate with developers on implementation."
      ],
      requirements: [
        "Basic understanding of design principles.",
        "Familiarity with Figma or similar design tools.",
        "Interest in accessibility and usability.",
        "A portfolio of practice or academic work."
      ],
      skills: ["Figma", "Wireframing", "Prototyping", "UI Design"]
    },
    {
      id: "intern",
      title: "Software Engineer Intern",
      company: "Amazon",
      logo: "a",
      category: "Technology",
      type: "Internship",
      work: "On-site",
      location: "Hyderabad",
      salary: "₹30–50K/mo",
      description:
        "Learn software development by working through programming tasks, collaborating with teammates, and understanding practical engineering workflows. This is an illustrative internship listing.",
      responsibilities: [
        "Write readable and maintainable code.",
        "Practice data structures and algorithms.",
        "Test and debug software features.",
        "Document work and communicate progress."
      ],
      requirements: [
        "Knowledge of one programming language.",
        "Understanding of basic data structures.",
        "Problem-solving and communication skills.",
        "Interest in learning software engineering."
      ],
      skills: ["Java", "C++", "DSA", "Git", "Problem Solving"]
    },
    {
      id: "marketing",
      title: "Digital Marketing Associate",
      company: "Growth Labs",
      logo: "G",
      category: "Marketing",
      type: "Full-time",
      work: "Hybrid",
      location: "Mumbai",
      salary: "₹4–7 LPA",
      description:
        "Support digital campaigns, study engagement metrics, and help teams improve their online communication.",
      responsibilities: [
        "Assist with campaign planning.",
        "Review engagement and traffic reports.",
        "Prepare content for digital channels."
      ],
      requirements: [
        "Interest in digital marketing.",
        "Basic analytical and writing skills.",
        "Willingness to learn marketing tools."
      ],
      skills: ["SEO", "Content", "Analytics", "Communication"]
    },
    {
      id: "business",
      title: "Business Operations Intern",
      company: "NextStep",
      logo: "N",
      category: "Business",
      type: "Internship",
      work: "Remote",
      location: "Remote",
      salary: "₹15–25K/mo",
      description:
        "Help organize business processes, prepare reports, and support operational projects.",
      responsibilities: [
        "Organize reports and project documentation.",
        "Help track routine operational tasks.",
        "Communicate progress with team members."
      ],
      requirements: [
        "Basic spreadsheet skills.",
        "Attention to detail.",
        "Good written communication."
      ],
      skills: ["Excel", "Analysis", "Documentation"]
    },
    {
      id: "backend",
      title: "Junior Backend Developer",
      company: "CloudWorks",
      logo: "C",
      category: "Technology",
      type: "Full-time",
      work: "On-site",
      location: "Pune",
      salary: "₹5–9 LPA",
      description:
        "Work on sample server-side application features, API development, and data handling.",
      responsibilities: [
        "Develop and test API endpoints.",
        "Work with databases and application data.",
        "Debug and document backend features."
      ],
      requirements: [
        "Basic programming knowledge.",
        "Understanding of HTTP and APIs.",
        "Interest in databases and server-side development."
      ],
      skills: ["Node.js", "SQL", "APIs", "Git"]
    },
    {
      id: "content",
      title: "Content Design Intern",
      company: "Creative House",
      logo: "C",
      category: "Design",
      type: "Internship",
      work: "Remote",
      location: "Remote",
      salary: "₹12–20K/mo",
      description:
        "Help create clear digital content and support the design team with content planning.",
      responsibilities: [
        "Draft and edit digital content.",
        "Organize content assets.",
        "Collaborate with design teammates."
      ],
      requirements: [
        "Good writing skills.",
        "Attention to detail.",
        "Interest in digital design."
      ],
      skills: ["Writing", "Editing", "Design", "Research"]
    },
    {
      id: "analyst",
      title: "Business Analyst",
      company: "BrightPath",
      logo: "B",
      category: "Business",
      type: "Full-time",
      work: "Hybrid",
      location: "Delhi",
      salary: "₹6–9 LPA",
      description:
        "Review business requirements, organize information, and turn data into useful recommendations.",
      responsibilities: [
        "Document business requirements.",
        "Prepare reports and summaries.",
        "Communicate findings to stakeholders."
      ],
      requirements: [
        "Analytical thinking.",
        "Basic spreadsheet knowledge.",
        "Clear communication skills."
      ],
      skills: ["Excel", "SQL", "Analysis", "Reporting"]
    }
  ];

  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("id") || "frontend";
  const job = jobs.find(item => item.id === jobId);

  const content = document.getElementById("jobDetailContent");
  const notFound = document.getElementById("jobNotFound");

  if (!job) {
    content.hidden = true;
    notFound.hidden = false;
    document.title = "Job Not Found | JobPortal";
    return;
  }

  document.title = `${job.title} | JobPortal`;

  document.getElementById("detailLogo").textContent = job.logo;
  document.getElementById("detailTitle").textContent = job.title;
  document.getElementById("detailCompany").textContent =
    `${job.company} · ${job.location}`;

  document.getElementById("detailDescription").textContent =
    job.description;

  document.getElementById("detailSalary").textContent = job.salary;
  document.getElementById("companyMiniName").textContent = job.company;
  document.getElementById("companyMiniLogo").textContent = job.logo;

  document.getElementById("detailTags").innerHTML = [
    job.type,
    job.work,
    job.location,
    job.category
  ].map((tag, index) =>
    `<span class="detail-tag ${index === 0 ? "tag-blue" : ""}">${tag}</span>`
  ).join("");

  function renderList(elementId, items) {
    document.getElementById(elementId).replaceChildren(
      ...items.map(item => {
        const li = document.createElement("li");
        li.textContent = item;
        return li;
      })
    );
  }

  renderList("detailResponsibilities", job.responsibilities);
  renderList("detailRequirements", job.requirements);

  document.getElementById("detailSkills").replaceChildren(
    ...job.skills.map(skill => {
      const span = document.createElement("span");
      span.textContent = skill;
      return span;
    })
  );

  document.getElementById("applyNow").href =
    `apply.html?job=${encodeURIComponent(job.id)}`;

  const saveButton = document.getElementById("saveDetailJob");

  function readSavedJobs() {
    return jobPortalGetSavedJobs();
  }

  function updateSaveButton() {
    const isSaved = readSavedJobs().includes(job.id);
    saveButton.textContent = isSaved ? "♥ Saved job" : "♡ Save this job";
    saveButton.setAttribute("aria-pressed", String(isSaved));
    saveButton.classList.toggle("is-saved", isSaved);
  }

  saveButton.addEventListener("click", () => {
    if (!jobPortalGetSession()) {
      jobPortalRequireLogin(
        `job-details.html?id=${encodeURIComponent(job.id)}`
      );
      return;
    }
    const saved = readSavedJobs();
    const next = saved.includes(job.id)
      ? saved.filter(id => id !== job.id)
      : [...saved, job.id];

    if (jobPortalSetSavedJobs(next)) {
      updateSaveButton();
    } else {
      alert("Unable to save this job in browser storage.");
    }
  });

  updateSaveButton();
});
