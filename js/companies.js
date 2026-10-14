
"use strict";

const companies = [
  {
    name: "Google",
    industry: "Technology",
    initials: "G",
    location: "Bengaluru, India",
    openings: 1,
    description:
      "Explore a sample frontend development opportunity focused on modern web interfaces and user experience."
  },
  {
    name: "Amazon",
    industry: "Technology",
    initials: "A",
    location: "Hyderabad, India",
    openings: 1,
    description:
      "Discover a sample software engineering internship for students interested in programming and software development."
  },
  {
    name: "CloudWorks",
    industry: "Technology",
    initials: "C",
    location: "Pune, India",
    openings: 1,
    description:
      "Explore a junior backend development role involving APIs, server-side programming, and databases."
  },
  {
    name: "Design Studio",
    industry: "Design",
    initials: "D",
    location: "Remote",
    openings: 1,
    description:
      "Discover a sample UI/UX design opportunity focused on wireframes, visual design, and digital experiences."
  },
  {
    name: "Creative House",
    industry: "Design",
    initials: "C",
    location: "Remote",
    openings: 1,
    description:
      "Explore a content design internship involving clear communication and engaging digital content."
  },
  {
    name: "Growth Labs",
    industry: "Marketing",
    initials: "G",
    location: "Mumbai, India",
    openings: 1,
    description:
      "Discover a sample digital marketing role covering campaigns, online engagement, and content strategy."
  },
  {
    name: "NextStep",
    industry: "Business",
    initials: "N",
    location: "Remote",
    openings: 1,
    description:
      "Explore a business operations internship focused on organization, research, and process improvement."
  },
  {
    name: "BrightPath",
    industry: "Business",
    initials: "B",
    location: "Delhi, India",
    openings: 1,
    description:
      "Discover a sample business analyst role focused on data interpretation and business problem-solving."
  }
];

const companiesGrid = document.getElementById("companiesGrid");
const companySearch = document.getElementById("companySearch");
const industryFilter = document.getElementById("industryFilter");
const companyResultCount = document.getElementById("companyResultCount");

function escapeCompanyHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function createCompanyCard(company) {
  const companyName = escapeCompanyHTML(company.name);
  const industry = escapeCompanyHTML(company.industry);
  const initials = escapeCompanyHTML(company.initials);
  const location = escapeCompanyHTML(company.location);
  const description = escapeCompanyHTML(company.description);
  const jobSearchURL = `jobs.html?keyword=${encodeURIComponent(company.name)}`;

  return `
    <article class="company-card">
      <div class="company-card-top">
        <div class="company-logo" aria-hidden="true">${initials}</div>
        <span class="company-industry">${industry}</span>
      </div>

      <h3>${companyName}</h3>
      <p class="company-description">${description}</p>

      <div class="company-card-meta">
        <span>Location: <strong>${location}</strong></span>
        <span>Sample openings: <strong>${company.openings}</strong></span>
      </div>

      <div class="company-card-actions">
        <a href="${jobSearchURL}" class="company-jobs-link">
          Explore Jobs &rarr;
        </a>
      </div>
    </article>
  `;
}

function renderCompanies() {
  const searchTerm = companySearch.value.trim().toLowerCase();
  const selectedIndustry = industryFilter.value;

  const filteredCompanies = companies.filter((company) => {
    const searchableText = [
      company.name,
      company.industry,
      company.location,
      company.description
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    const matchesIndustry =
      selectedIndustry === "all" ||
      company.industry === selectedIndustry;

    return matchesSearch && matchesIndustry;
  });

  companyResultCount.textContent =
    `${filteredCompanies.length} ${
      filteredCompanies.length === 1 ? "company" : "companies"
    }`;

  if (filteredCompanies.length === 0) {
    companiesGrid.innerHTML = `
      <div class="companies-empty">
        <h3>No companies found</h3>
        <p>Try a different keyword or select another industry.</p>
      </div>
    `;
    return;
  }

  companiesGrid.innerHTML = filteredCompanies
    .map(createCompanyCard)
    .join("");
}

companySearch.addEventListener("input", renderCompanies);
industryFilter.addEventListener("change", renderCompanies);

const yearElement = document.getElementById("currentYear");

if (yearElement && !yearElement.textContent.trim()) {
  yearElement.textContent = new Date().getFullYear();
}

renderCompanies();
