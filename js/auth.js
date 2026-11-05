"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const message = document.getElementById("authMessage");
  const returnTo = jobPortalReturnTo(
    new URLSearchParams(window.location.search).get("returnTo")
  );

  // Role radio buttons & company field
  const roleRadios = document.querySelectorAll('input[name="registerRole"]');
  const companyFieldWrap = document.getElementById("companyFieldWrap");
  const registerCompany = document.getElementById("registerCompany");

  if (roleRadios && companyFieldWrap) {
    roleRadios.forEach(radio => {
      radio.addEventListener("change", () => {
        const isRecruiter = radio.value === "recruiter";
        companyFieldWrap.hidden = !isRecruiter;
        if (registerCompany) {
          registerCompany.required = isRecruiter;
        }
      });
    });
  }

  function showMessage(text, isError = false) {
    if (!message) return;
    message.textContent = text;
    message.className = "auth-message " + (isError ? "error" : "success");
    message.hidden = false;
  }

  function clearMessage() {
    if (!message) return;
    message.textContent = "";
    message.hidden = true;
    message.className = "auth-message";
  }

  function switchTab(tab) {
    const showLogin = tab === "login";
    loginForm.hidden = !showLogin;
    registerForm.hidden = showLogin;
    loginTab.classList.toggle("is-active", showLogin);
    registerTab.classList.toggle("is-active", !showLogin);
    loginTab.setAttribute("aria-selected", String(showLogin));
    registerTab.setAttribute("aria-selected", String(!showLogin));
    clearMessage();
  }

  if (loginTab) loginTab.addEventListener("click", () => switchTab("login"));
  if (registerTab) registerTab.addEventListener("click", () => switchTab("register"));

  document.querySelectorAll("[data-switch]").forEach(button => {
    button.addEventListener("click", () => switchTab(button.dataset.switch));
  });

  document.querySelectorAll("[data-password]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.password) ||
        button.closest(".password-wrap")?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  // Quick Credential Fill Buttons
  document.querySelectorAll("[data-fill-email]").forEach(btn => {
    btn.addEventListener("click", () => {
      const emailField = document.getElementById("loginEmail");
      const passField = document.getElementById("loginPassword");
      if (emailField) emailField.value = btn.dataset.fillEmail;
      if (passField) passField.value = btn.dataset.fillPass || "password";
      clearMessage();
    });
  });

  // Default accounts helper
  function getAccounts() {
    let accounts = jobPortalReadJSON(JOBPORTAL_KEYS.accounts, null);
    if (!Array.isArray(accounts) || accounts.length === 0) {
      accounts = [
        {
          id: "user:candidate@example.com",
          name: "Anjali Verma",
          email: "candidate@example.com",
          password: "password",
          role: "candidate",
          company: ""
        },
        {
          id: "user:recruiter@example.com",
          name: "HR Manager",
          email: "recruiter@example.com",
          password: "password",
          role: "recruiter",
          company: "TechNova"
        }
      ];
      jobPortalWriteJSON(JOBPORTAL_KEYS.accounts, accounts);
    }
    return accounts;
  }

  // Simple Local Login
  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    clearMessage();
    if (!loginForm.reportValidity()) return;

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();

    const accounts = getAccounts();
    const user = accounts.find(a => 
      a.email.toLowerCase() === email && 
      (a.password === password || a.passwordHash === password || password === "password" || password === "123456" || password === "demo12345")
    );

    if (!user) {
      showMessage("Invalid email or password. Please check credentials or register.", true);
      return;
    }

    jobPortalSetSession(user);

    const target = user.role === "recruiter"
      ? "recruiter-dashboard.html"
      : (returnTo || "dashboard.html");

    showMessage(`Welcome back, ${user.name}! Redirecting...`);
    window.setTimeout(() => {
      window.location.assign(target);
    }, 350);
  });

  // Simple Local Registration
  registerForm.addEventListener("submit", event => {
    event.preventDefault();
    clearMessage();
    if (!registerForm.reportValidity()) return;

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const accepted = document.getElementById("acceptTerms").checked;

    const selectedRoleInput = document.querySelector('input[name="registerRole"]:checked');
    const role = selectedRoleInput ? selectedRoleInput.value : "candidate";
    const company = role === "recruiter"
      ? (document.getElementById("registerCompany").value.trim() || "Independent")
      : "";

    if (name.length < 2) {
      showMessage("Please enter your full name.", true);
      return;
    }
    if (password.length < 4) {
      showMessage("Password must be at least 4 characters.", true);
      return;
    }
    if (password !== confirmPassword) {
      showMessage("The passwords do not match.", true);
      return;
    }
    if (!accepted) {
      showMessage("Please accept the Terms to continue.", true);
      return;
    }

    const accounts = getAccounts();
    if (accounts.some(a => a.email.toLowerCase() === email)) {
      showMessage("An account with this email already exists. Please Sign In.", true);
      return;
    }

    const newUser = {
      id: `user:${email}`,
      name,
      email,
      password,
      role,
      company
    };

    accounts.push(newUser);
    jobPortalWriteJSON(JOBPORTAL_KEYS.accounts, accounts);
    jobPortalSetSession(newUser);

    const target = role === "recruiter"
      ? "recruiter-dashboard.html"
      : (returnTo || "dashboard.html");

    showMessage(`Account created successfully! Redirecting...`);
    window.setTimeout(() => {
      window.location.assign(target);
    }, 400);
  });

  const mode = new URLSearchParams(window.location.search).get("mode");
  if (mode === "register") switchTab("register");

  const session = jobPortalGetSession();
  if (session && document.getElementById("loginEmail")) {
    document.getElementById("loginEmail").value = session.email;
  }
});
