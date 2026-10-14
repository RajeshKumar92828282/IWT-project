
"use strict";

const contactForm = document.getElementById("contactForm");
const contactFeedback = document.getElementById("contactFeedback");
const contactMessage = document.getElementById("contactMessage");
const messageCount = document.getElementById("messageCount");

const contactFields = {
  name: document.getElementById("contactName"),
  email: document.getElementById("contactEmail"),
  subject: document.getElementById("contactSubject"),
  message: contactMessage,
  consent: document.getElementById("contactConsent")
};

const contactErrors = {
  name: document.getElementById("nameError"),
  email: document.getElementById("emailError"),
  subject: document.getElementById("subjectError"),
  message: document.getElementById("messageError"),
  consent: document.getElementById("consentError")
};

function setFieldError(fieldName, message) {
  const field = contactFields[fieldName];
  const errorElement = contactErrors[fieldName];

  errorElement.textContent = message;

  if (fieldName !== "consent") {
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }
}

function clearContactErrors() {
  Object.keys(contactErrors).forEach((fieldName) => {
    setFieldError(fieldName, "");
  });
}

function validateContactForm() {
  clearContactErrors();

  let isValid = true;

  const name = contactFields.name.value.trim();
  const email = contactFields.email.value.trim();
  const subject = contactFields.subject.value;
  const message = contactFields.message.value.trim();
  const consent = contactFields.consent.checked;

  if (name.length < 2) {
    setFieldError("name", "Please enter at least 2 characters.");
    isValid = false;
  } else if (name.length > 80) {
    setFieldError("name", "Name must be 80 characters or fewer.");
    isValid = false;
  } else if (!/^[\p{L}\p{M} .'-]+$/u.test(name)) {
    setFieldError(
      "name",
      "Use letters, spaces, apostrophes, dots, or hyphens."
    );
    isValid = false;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email) || email.length > 254) {
    setFieldError("email", "Please enter a valid email address.");
    isValid = false;
  }

  if (!subject) {
    setFieldError("subject", "Please select a subject.");
    isValid = false;
  }

  if (message.length < 10) {
    setFieldError("message", "Message must contain at least 10 characters.");
    isValid = false;
  } else if (message.length > 1000) {
    setFieldError("message", "Message must be 1000 characters or fewer.");
    isValid = false;
  }

  if (!consent) {
    setFieldError(
      "consent",
      "Please confirm that you understand this is a demo form."
    );
    isValid = false;
  }

  return isValid;
}

function updateMessageCount() {
  messageCount.textContent = contactMessage.value.length;
}

function showContactFeedback(message, type = "success") {
  contactFeedback.textContent = message;
  contactFeedback.className = "contact-feedback visible";

  if (type === "error") {
    contactFeedback.classList.add("error");
  }
}

contactMessage.addEventListener("input", updateMessageCount);

Object.entries(contactFields).forEach(([fieldName, field]) => {
  if (fieldName === "consent") {
    field.addEventListener("change", () => {
      setFieldError("consent", "");
    });
    return;
  }

  field.addEventListener("input", () => {
    setFieldError(fieldName, "");
  });

  field.addEventListener("change", () => {
    setFieldError(fieldName, "");
  });
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  contactFeedback.className = "contact-feedback";
  contactFeedback.textContent = "";

  if (!validateContactForm()) {
    showContactFeedback(
      "Please correct the highlighted fields and try again.",
      "error"
    );

    const firstInvalidField = contactForm.querySelector(
      '[aria-invalid="true"]'
    );

    if (firstInvalidField) {
      firstInvalidField.focus();
    } else if (!contactFields.consent.checked) {
      contactFields.consent.focus();
    }

    return;
  }

  const firstName = contactFields.name.value.trim().split(/\s+/)[0];

  // Demonstration only: do not send or save this message.
  contactForm.reset();
  clearContactErrors();
  updateMessageCount();

  showContactFeedback(
    `Thank you, ${firstName}! The form passed validation. ` +
    "This is a demo confirmation only; your message was not sent."
  );
});

const yearElement = document.getElementById("currentYear");

if (yearElement && !yearElement.textContent.trim()) {
  yearElement.textContent = new Date().getFullYear();
}

updateMessageCount();
