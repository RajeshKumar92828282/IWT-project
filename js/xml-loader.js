/**
 * JobPortal XML Data Loader
 * Loads structured job listings from assets/data/jobs.xml using fetch() and DOMParser.
 * Provides a resilient fallback to embedded dataset if fetch() is blocked
 * (e.g. when opening files directly via file:// protocol without a local web server).
 */
"use strict";

const DEFAULT_JOBS_CATALOG = [
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
    recruiterId: "recruiter@example.com",
    postedDate: "2026-10-15",
    description: "Build responsive web interfaces, create accessible user experiences, and collaborate with product teams to deliver high-performance web applications.",
    responsibilities: [
      "Build responsive pages using modern HTML5, CSS3, and JavaScript.",
      "Develop reusable, accessible UI components adhering to web standards.",
      "Collaborate with designers, backend engineers, and product managers.",
      "Conduct performance profiling and cross-browser compatibility testing."
    ],
    requirements: [
      "Solid proficiency in HTML5, CSS3, JavaScript (ES6+), and responsive layout design.",
      "Understanding of DOM manipulation, asynchronous programming, and web APIs.",
      "Familiarity with Git version control and collaborative workflows.",
      "Strong problem-solving skills and passion for high-quality user experience."
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
    recruiterId: "recruiter@example.com",
    postedDate: "2026-10-18",
    description: "Create intuitive, user-centered digital experiences by conducting user research, crafting wireframes, and designing polished interface systems.",
    responsibilities: [
      "Create interactive prototypes, wireframes, and high-fidelity mockups in Figma.",
      "Design cohesive typography, color scales, and component libraries.",
      "Gather user feedback to iterate on visual hierarchy and workflow clarity.",
      "Collaborate with developers during the design handoff and implementation phase."
    ],
    requirements: [
      "Proficiency with industry standard tools like Figma or Adobe XD.",
      "Strong portfolio demonstrating UX thinking, wireframes, and visual craft.",
      "Understanding of WCAG accessibility standards and responsive UI patterns.",
      "Effective verbal and visual communication skills."
    ],
    skills: ["Figma", "UI/UX", "Wireframing", "Prototyping"]
  },
  {
    id: "intern",
    title: "Software Engineer Intern",
    company: "Amazon",
    logo: "A",
    category: "Technology",
    type: "Internship",
    work: "On-site",
    location: "Hyderabad",
    salary: "₹30–50K/mo",
    recruiterId: "recruiter@example.com",
    postedDate: "2026-10-20",
    description: "Learn industry software development practices while contributing to real engineering services, writing tests, and collaborating with mentors.",
    responsibilities: [
      "Write clean, maintainable, and well-tested code in Java or C++.",
      "Apply core data structures and algorithmic problem solving.",
      "Debug system issues and write automated test suites.",
      "Participate in agile sprint ceremonies, standups, and code reviews."
    ],
    requirements: [
      "Enrolled in or graduate of BCA, B.Tech, MCA, or related computer science discipline.",
      "Strong grounding in Object-Oriented Programming (OOP) and Algorithms.",
      "Knowledge of relational databases and basic SQL queries.",
      "Eagerness to learn in a collaborative environment."
    ],
    skills: ["DSA", "Java", "OOP", "SQL", "Git"]
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
    recruiterId: "recruiter@example.com",
    postedDate: "2026-10-21",
    description: "Lead multi-channel campaigns, analyze marketing metrics, optimize digital visibility, and drive audience growth across web and social platforms.",
    responsibilities: [
      "Manage organic search optimization (SEO) and search marketing initiatives.",
      "Create content calendars and draft engaging social media campaigns.",
      "Analyze traffic and campaign conversion metrics with Google Analytics.",
      "Collaborate with design and engineering teams on landing page optimization."
    ],
    requirements: [
      "Bachelor's degree in Marketing, Communications, or relevant field.",
      "Familiarity with SEO concepts, keyword research, and marketing analytics.",
      "Excellent written English communication and copywriting skills.",
      "Experience running email marketing or social media campaigns."
    ],
    skills: ["SEO", "Content", "Analytics", "Social Media"]
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
    recruiterId: "recruiter@example.com",
    postedDate: "2026-10-22",
    description: "Assist operational leads with workflow documentation, spreadsheet reporting, process optimization, and day-to-day organizational tasks.",
    responsibilities: [
      "Compile, clean, and organize operational dataset spreadsheets.",
      "Document standard operating procedures and internal process manuals.",
      "Coordinate scheduling and cross-functional team deliverables.",
      "Prepare weekly summary decks and operational metric dashboards."
    ],
    requirements: [
      "Pursuing or completed degree in Commerce, Business Administration, or IT.",
      "Advanced proficiency in Microsoft Excel / Google Sheets (vlookup, pivot tables).",
      "Detail-oriented mindset with strong organizational capabilities.",
      "Ability to summarize complex information into concise reports."
    ],
    skills: ["Excel", "Analysis", "Operations", "Reporting"]
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
    recruiterId: "recruiter@example.com",
    postedDate: "2026-10-23",
    description: "Design, develop, and maintain server-side RESTful APIs, optimize database schemas, and ensure robust backend security and performance.",
    responsibilities: [
      "Develop secure, performant RESTful APIs for web and mobile frontends.",
      "Design relational database schemas and write optimized SQL queries.",
      "Implement user authentication, session security, and role-based access.",
      "Monitor server logs and troubleshoot backend performance bottlenecks."
    ],
    requirements: [
      "Knowledge of server-side programming and web fundamentals.",
      "Working understanding of relational databases such as MySQL or PostgreSQL.",
      "Understanding of API security, HTTP methods, and status codes.",
      "Experience using Git and command-line developer tools."
    ],
    skills: ["Node.js", "SQL", "APIs", "Database", "Security"]
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
    recruiterId: "recruiter@example.com",
    postedDate: "2026-10-24",
    description: "Craft clear UX copy, informative microcopy, and engaging product narratives to help users navigate web and mobile interfaces smoothly.",
    responsibilities: [
      "Write clear UI labels, tooltips, error messages, and onboarding copy.",
      "Collaborate with UX designers to align verbal and visual communication.",
      "Conduct content audits and maintain an editorial style guide.",
      "Perform A/B testing on copy variants to measure user comprehension."
    ],
    requirements: [
      "Enthusiasm for UX writing, technical communication, or copywriting.",
      "Excellent grammatical skills and sensitivity to tone of voice.",
      "Ability to explain technical workflows simply and concisely.",
      "Portfolio or writing samples demonstrating clarity and empathy."
    ],
    skills: ["Writing", "UX Copy", "Design", "Communication"]
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
    recruiterId: "recruiter@example.com",
    postedDate: "2026-10-25",
    description: "Bridge the gap between business objectives and technical teams through data analysis, requirement gathering, and process documentation.",
    responsibilities: [
      "Gather and document business requirements and functional specifications.",
      "Analyze operational metrics and present data-backed recommendations.",
      "Build reports and interactive visualization dashboards for leadership.",
      "Facilitate stakeholder meetings and validate product acceptance criteria."
    ],
    requirements: [
      "Degree in Computer Applications, Business Administration, or related field.",
      "Hands-on experience with SQL queries, Excel, and BI reporting tools.",
      "Strong analytical thinking and stakeholder management abilities.",
      "Ability to create clear flowcharts and process diagrams."
    ],
    skills: ["Excel", "SQL", "Analysis", "Reporting", "Documentation"]
  }
];

let _cachedJobs = null;

/**
 * Parses an XML document into JavaScript job objects.
 */
function parseJobsFromXMLDoc(xmlDoc) {
  const jobNodes = xmlDoc.querySelectorAll("jobs > job");
  if (!jobNodes || jobNodes.length === 0) {
    return null;
  }

  const parsedJobs = [];
  jobNodes.forEach(node => {
    const getText = (selector, fallback = "") => {
      const el = node.querySelector(selector);
      return el ? el.textContent.trim() : fallback;
    };

    const getList = (parentSelector, itemSelector) => {
      const parent = node.querySelector(parentSelector);
      if (!parent) return [];
      return Array.from(parent.querySelectorAll(itemSelector))
        .map(el => el.textContent.trim())
        .filter(Boolean);
    };

    parsedJobs.push({
      id: getText("id"),
      title: getText("title"),
      company: getText("company"),
      logo: getText("logo", getText("company").charAt(0).toUpperCase()),
      category: getText("category", "Technology"),
      type: getText("type", "Full-time"),
      work: getText("work", "On-site"),
      location: getText("location", "Bengaluru"),
      salary: getText("salary", "Competitive"),
      recruiterId: getText("recruiterId", "recruiter@example.com"),
      postedDate: getText("postedDate", "2026-10-20"),
      description: getText("description"),
      responsibilities: getList("responsibilities", "item"),
      requirements: getList("requirements", "item"),
      skills: getList("skills", "skill")
    });
  });

  return parsedJobs.length > 0 ? parsedJobs : null;
}

/**
 * Asynchronously loads jobs from assets/data/jobs.xml.
 * Gracefully falls back to DEFAULT_JOBS_CATALOG if XML fetch is restricted
 * (e.g. running via file:// protocol).
 */
async function loadJobsData() {
  if (_cachedJobs && _cachedJobs.length > 0) {
    return _cachedJobs;
  }

  try {
    const response = await fetch("assets/data/jobs.xml");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch jobs.xml`);
    }
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Check for XML parsing error
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("XML Parsing Error: " + parserError.textContent);
    }

    const xmlJobs = parseJobsFromXMLDoc(xmlDoc);
    if (xmlJobs && xmlJobs.length > 0) {
      console.info(`[JobPortal] Successfully loaded ${xmlJobs.length} jobs from assets/data/jobs.xml using DOMParser.`);
      _cachedJobs = xmlJobs;
      return _cachedJobs;
    }
  } catch (error) {
    console.warn(
      "[JobPortal] Could not load assets/data/jobs.xml via fetch(). " +
      "If opening directly as a file:// URL, browser security restricts local AJAX. " +
      "Falling back to embedded jobs data. Run via a local static web server (e.g., Live Server) to see live XML parsing.",
      error.message
    );
  }

  _cachedJobs = DEFAULT_JOBS_CATALOG;
  return _cachedJobs;
}

/**
 * Synchronous getter returning cached jobs or default catalog.
 */
function getJobsCatalogSync() {
  return _cachedJobs || DEFAULT_JOBS_CATALOG;
}

// Expose globally
window.JobPortalData = {
  loadJobsData,
  getJobsCatalogSync,
  defaultJobs: DEFAULT_JOBS_CATALOG
};
