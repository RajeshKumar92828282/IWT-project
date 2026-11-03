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

  // Login Handler (Real Backend API + LocalStorage Fallback)
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();
    if (!loginForm.reportValidity()) return;

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    showMessage("Authenticating with database...");

    try {
      const res = await jobPortalApiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      if (res.ok && res.data && res.data.success) {
        const user = res.data.user;
        jobPortalSetSession(user);

        const targetDestination = user.role === "recruiter"
          ? "recruiter-dashboard.html"
          : (returnTo || "dashboard.html");

        showMessage(`Welcome back, ${user.name}! Redirecting to dashboard...`);
        window.setTimeout(() => {
          window.location.assign(targetDestination);
        }, 350);
        return;
      }

      if (res.status === 401 || (res.data && res.data.message)) {
        showMessage(res.data.message || "Invalid email or password.", true);
        return;
      }

      // Offline / LocalStorage fallback
      const accounts = jobPortalReadJSON(JOBPORTAL_KEYS.accounts, []);
      const localAcc = accounts.find(a => a.email.toLowerCase() === email);
      if (localAcc) {
        jobPortalSetSession(localAcc);
        const target = localAcc.role === "recruiter" ? "recruiter-dashboard.html" : (returnTo || "dashboard.html");
        showMessage(`Welcome back, ${localAcc.name}! Redirecting...`);
        window.setTimeout(() => window.location.assign(target), 350);
        return;
      }

      showMessage("Invalid email or password.", true);
    } catch (err) {
      console.error("Login error:", err);
      showMessage("Unable to connect to login service. Please try again.", true);
    }
  });

  // Registration Handler (Real Backend API + MySQL Insertion)
  registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();
    if (!registerForm.reportValidity()) return;

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const accepted = document.getElementById("acceptTerms").checked;

    const selectedRoleInput = document.querySelector('input[name="registerRole"]:checked');
    const role = selectedRoleInput ? selectedRoleInput.value : "candidate";
    const company = role === "recruiter"
      ? (document.getElementById("registerCompany").value.trim() || "Independent")
      : "";

    if (name.length < 2) {
      showMessage("Please enter your full name (at least 2 characters).", true);
      return;
    }
    if (password.length < 6) {
      showMessage("Password must contain at least 6 characters.", true);
      return;
    }
    if (password !== confirmPassword) {
      showMessage("The passwords do not match.", true);
      return;
    }
    if (!accepted) {
      showMessage("Please accept the Terms of Service to continue.", true);
      return;
    }

    showMessage("Creating your account in database...");

    try {
      const res = await jobPortalApiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role, company })
      });

      if (res.ok && res.data && res.data.success) {
        const user = res.data.user;
        jobPortalSetSession(user);

        // Also save to local accounts cache
        const accounts = jobPortalReadArrayForUpdate(JOBPORTAL_KEYS.accounts);
        accounts.push(user);
        jobPortalWriteJSON(JOBPORTAL_KEYS.accounts, accounts);

        const targetDestination = role === "recruiter"
          ? "recruiter-dashboard.html"
          : (returnTo || "dashboard.html");

        showMessage(`Account registered successfully as ${role === "recruiter" ? "Recruiter" : "Candidate"}! Redirecting...`);
        window.setTimeout(() => {
          window.location.assign(targetDestination);
        }, 400);
        return;
      }

      if (res.data && res.data.message) {
        showMessage(res.data.message, true);
        return;
      }

      showMessage("Could not register account. Please check your details and try again.", true);
    } catch (err) {
      console.error("Registration error:", err);
      showMessage("Registration request failed. Please try again.", true);
    }
  });

  const mode = new URLSearchParams(window.location.search).get("mode");
  if (mode === "register") switchTab("register");

  const session = jobPortalGetSession();
  if (session && document.getElementById("loginEmail")) {
    document.getElementById("loginEmail").value = session.email;
  }
});
