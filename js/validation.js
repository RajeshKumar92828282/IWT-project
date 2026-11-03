/**
 * JobPortal Form Validation Module
 * Centralized, reusable client-side validation utilities for authentication,
 * application submission, and profile editing.
 */
"use strict";

const JobPortalValidator = {
  /**
   * Validates email format using standard regex
   */
  isValidEmail(email) {
    if (typeof email !== "string") return false;
    const trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && trimmed.length <= 100;
  },

  /**
   * Validates phone numbers (supports international and domestic formats)
   */
  isValidPhone(phone) {
    if (typeof phone !== "string") return false;
    const trimmed = phone.trim();
    return /^[+()\d\s-]{7,20}$/.test(trimmed);
  },

  /**
   * Validates full name
   */
  isValidName(name) {
    if (typeof name !== "string") return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 80;
  },

  /**
   * Validates password strength (minimum 8 characters for demo security)
   */
  isValidPassword(password) {
    return typeof password === "string" && password.length >= 8;
  },

  /**
   * Validates uploaded resume file
   * @param {File} file
   * @returns {{ valid: boolean, error?: string, extension?: string, sizeMB?: string }}
   */
  validateResumeFile(file) {
    if (!file) {
      return { valid: false, error: "Please select a resume file." };
    }

    const parts = file.name.split(".");
    if (parts.length < 2) {
      return { valid: false, error: "The file must have a valid extension (.pdf, .doc, or .docx)." };
    }

    const extension = parts.pop().toLowerCase();
    const allowed = ["pdf", "doc", "docx"];

    if (!allowed.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file format (.${extension}). Only PDF, DOC, or DOCX files are allowed.`
      };
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${sizeMB} MB) exceeds the 5 MB limit. Please upload a smaller file.`
      };
    }

    const formattedSize = file.size < 1024 * 1024
      ? `${Math.round(file.size / 1024)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    return {
      valid: true,
      extension,
      sizeMB: formattedSize
    };
  },

  /**
   * Escapes HTML special characters to prevent XSS vulnerabilities
   */
  escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return entities[char];
    });
  }
};

// Expose globally
window.JobPortalValidator = JobPortalValidator;
