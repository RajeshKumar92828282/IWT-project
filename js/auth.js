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

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
    message.hidden = false;
  }

  function clearMessage() {
    message.textContent = "";
    message.hidden = true;
    message.classList.remove("error");
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

  loginTab.addEventListener("click", () => switchTab("login"));
  registerTab.addEventListener("click", () => switchTab("register"));

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

  function readAccounts() {
    const accounts = jobPortalReadJSON(JOBPORTAL_KEYS.accounts, []);
    return Array.isArray(accounts)
      ? accounts.filter(account =>
        account && typeof account.email === "string" &&
        typeof account.passwordHash === "string"
      )
      : [];
  }

  async function hashPassword(password) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error(
        "Browser cryptography is unavailable. Open the project on localhost using Live Server."
      );
    }
    const bytes = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();
    if (!registerForm.reportValidity()) return;

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const accepted = document.getElementById("acceptTerms").checked;

    if (name.length < 2) {
      showMessage("Please enter your full name.", true);
      return;
    }
    if (password.length < 8) {
      showMessage("Your demo password must contain at least 8 characters.", true);
      return;
    }
    if (password !== confirmPassword) {
      showMessage("The passwords do not match.", true);
      return;
    }
    if (!accepted) {
      showMessage("Please confirm that you understand this is a demo account.", true);
      return;
    }

    try {
      const accounts = readAccounts();
      if (accounts.some(account => account.email.trim().toLowerCase() === email)) {
        showMessage("An account with this email already exists. Please sign in.", true);
        return;
      }

      accounts.push({
        id: jobPortalUserId(email),
        name,
        email,
        passwordHash: await hashPassword(password)
      });
      if (!jobPortalWriteJSON(JOBPORTAL_KEYS.accounts, accounts) ||
          !jobPortalSetSession({ name, email })) {
        showMessage("Unable to create your demo account in browser storage.", true);
        return;
      }

      showMessage("Demo account created. Opening your account...");
      window.setTimeout(() => {
        window.location.assign(returnTo || "dashboard.html");
      }, 250);
    } catch (error) {
      console.error("JobPortal registration failed.", error);
      showMessage(
        error.message || "Unable to create your demo account in browser storage.",
        true
      );
    }
  });

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();
    if (!loginForm.reportValidity()) return;

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    try {
      const account = readAccounts().find(item =>
        item.email.trim().toLowerCase() === email
      );
      if (!account) {
        showMessage("No demo account found. Create an account first.", true);
        return;
      }
      if (account.passwordHash !== await hashPassword(password)) {
        showMessage("Incorrect email or password.", true);
        return;
      }
      if (!jobPortalSetSession({ id: account.id, name: account.name, email: account.email })) {
        showMessage("Unable to start your demo session in browser storage.", true);
        return;
      }

      showMessage("Signed in successfully. Returning to your page...");
      window.setTimeout(() => {
        window.location.assign(returnTo || "dashboard.html");
      }, 250);
    } catch (error) {
      console.error("JobPortal sign-in failed.", error);
      showMessage(
        error.message || "Unable to sign in using browser storage.",
        true
      );
    }
  });

  const mode = new URLSearchParams(window.location.search).get("mode");
  if (mode === "register") switchTab("register");

  const session = jobPortalGetSession();
  if (session) document.getElementById("loginEmail").value = session.email;
});
