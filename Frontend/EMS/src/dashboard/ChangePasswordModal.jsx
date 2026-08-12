import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaTimes,
} from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import "./ChangePasswordModal.css";

const INITIAL_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const PASSWORD_RULES = [
  {
    test: (value) => value.length >= 8,
    message: "Use at least 8 characters.",
  },
  {
    test: (value) => /[A-Z]/.test(value),
    message: "Include at least one uppercase letter.",
  },
  {
    test: (value) => /[0-9]/.test(value),
    message: "Include at least one number.",
  },
  {
    test: (value) => /[^A-Za-z0-9]/.test(value),
    message: "Include at least one special character.",
  },
];

const getPasswordStrength = (password) => {
  if (!password) {
    return {
      filled: 0,
      label: "Start typing to check strength",
      tone: "idle",
    };
  }

  const score = PASSWORD_RULES.reduce(
    (count, rule) => count + Number(rule.test(password)),
    0
  );

  if (score <= 1) {
    return {
      filled: 1,
      label: "Weak password",
      tone: "weak",
    };
  }

  if (score <= 3) {
    return {
      filled: 3,
      label: "Medium password",
      tone: "medium",
    };
  }

  return {
    filled: 4,
    label: "Strong password",
    tone: "strong",
  };
};

const validateForm = (form) => {
  const nextErrors = {};

  if (!form.currentPassword.trim()) {
    nextErrors.currentPassword = "Current password is required.";
  }

  if (!form.newPassword) {
    nextErrors.newPassword = "New password is required.";
  } else {
    const failedRule = PASSWORD_RULES.find(
      (rule) => !rule.test(form.newPassword)
    );

    if (failedRule) {
      nextErrors.newPassword = failedRule.message;
    } else if (form.newPassword === form.currentPassword) {
      nextErrors.newPassword =
        "New password must be different from the current password.";
    }
  }

  if (!form.confirmPassword) {
    nextErrors.confirmPassword = "Please confirm the new password.";
  } else if (form.confirmPassword !== form.newPassword) {
    nextErrors.confirmPassword = "Passwords do not match.";
  }

  return nextErrors;
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (error?.response?.status === 404 || error?.response?.status === 405) {
    return "The server change-password route is not available yet. Update the backend route and this form will work automatically.";
  }

  if (data?.errors && typeof data.errors === "object") {
    const firstError = Object.values(data.errors)
      .flat()
      .find(Boolean);

    if (firstError) {
      return firstError;
    }
  }

  return (
    data?.message ||
    data?.title ||
    "Unable to update the password right now. Please try again."
  );
};

function ChangePasswordModal({ open, onClose, role, email }) {
  const closeTimerRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({
    tone: "",
    message: "",
  });

  const errors = useMemo(() => validateForm(form), [form]);
  const strength = useMemo(
    () => getPasswordStrength(form.newPassword),
    [form.newPassword]
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [isSubmitting, onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(INITIAL_FORM);
    setTouched({});
    setShowPassword({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
    setIsSubmitting(false);
    setStatus({
      tone: "",
      message: "",
    });
  }, [open]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });
    setStatus({
      tone: "",
      message: "",
    });

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint =
        role?.toLowerCase() === "admin"
          ? "/Admin/change-password"
          : "/Employees/change-password";

      await api.post(endpoint,
        {
          email: email,
          oldPassword: form.currentPassword,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        }
      );

      setStatus({
        tone: "success",
        message: "Password updated successfully.",
      });

      // REMOVE SUCCESS MESSAGE AFTER 3 SECONDS
      window.setTimeout(() => {
        setStatus({
          tone: "",
          message: "",
        });
      }, 3000);

      // CLOSE MODAL AFTER 3 SECONDS
      closeTimerRef.current = window.setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.log("API ERROR =>", error.response?.data);

      setStatus({
        tone: "error",
        message:
          error.response?.data?.message ||
          JSON.stringify(error.response?.data) ||
          "Password update failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="change-password-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="change-password-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
      >
        <button
          type="button"
          className="change-password-close"
          onClick={onClose}
          aria-label="Close change password modal"
          disabled={isSubmitting}
        >
          <FaTimes />
        </button>

        <div className="change-password-intro">
          <span className="change-password-symbol">
            <FaKey />
          </span>

          <div>
            <p className="change-password-kicker">Security Settings</p>
            <h2 id="change-password-title">Change Password</h2>
            {/* <p className="change-password-copy">
              Update your credentials with a stronger password that matches the
              PIRNAV security theme.
            </p> */}
          </div>
        </div>

        <form className="change-password-form" onSubmit={handleSubmit}>
          <label className="change-password-field">
            <span className="change-password-label">Current Password</span>

            <span className="change-password-input-shell">
              <span className="change-password-leading">
                <FaLock />
              </span>

              <input
                type={showPassword.currentPassword ? "text" : "password"}
                value={form.currentPassword}
                onChange={(event) =>
                  updateField("currentPassword", event.target.value)
                }
                onBlur={() =>
                  setTouched((prev) => ({
                    ...prev,
                    currentPassword: true,
                  }))
                }
                className="change-password-input"
                placeholder="Enter current password"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="change-password-toggle"
                onClick={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    currentPassword: !prev.currentPassword,
                  }))
                }
                aria-label={
                  showPassword.currentPassword
                    ? "Hide current password"
                    : "Show current password"
                }
              >
                {showPassword.currentPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </span>

            {touched.currentPassword && errors.currentPassword ? (
              <span className="change-password-field-error">
                {errors.currentPassword}
              </span>
            ) : null}
          </label>

          <label className="change-password-field">
            <span className="change-password-label">New Password</span>

            <span className="change-password-input-shell">
              <span className="change-password-leading">
                <FaKey />
              </span>

              <input
                type={showPassword.newPassword ? "text" : "password"}
                value={form.newPassword}
                onChange={(event) =>
                  updateField("newPassword", event.target.value)
                }
                onBlur={() =>
                  setTouched((prev) => ({
                    ...prev,
                    newPassword: true,
                  }))
                }
                className="change-password-input"
                placeholder="Create a new password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="change-password-toggle"
                onClick={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    newPassword: !prev.newPassword,
                  }))
                }
                aria-label={
                  showPassword.newPassword
                    ? "Hide new password"
                    : "Show new password"
                }
              >
                {showPassword.newPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </span>

            <div className="change-password-strength">
              <div className="change-password-strength-meta">
                <span>Password Strength</span>
                <span className={`strength-pill ${strength.tone}`}>
                  {strength.label}
                </span>
              </div>

              <div className="change-password-strength-bars" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <span
                    key={index}
                    className={`change-password-strength-bar ${index < strength.filled ? `is-${strength.tone}` : ""
                      }`}
                  />
                ))}
              </div>
            </div>

            {touched.newPassword && errors.newPassword ? (
              <span className="change-password-field-error">
                {errors.newPassword}
              </span>
            ) : (
              <span className="change-password-helper">
                Use 8+ characters, 1 uppercase letter, 1 number, and 1 special
                character.
              </span>
            )}
          </label>

          <label className="change-password-field">
            <span className="change-password-label">Confirm New Password</span>

            <span className="change-password-input-shell">
              <span className="change-password-leading">
                <FaLock />
              </span>

              <input
                type={showPassword.confirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
                }
                onBlur={() =>
                  setTouched((prev) => ({
                    ...prev,
                    confirmPassword: true,
                  }))
                }
                className="change-password-input"
                placeholder="Confirm the new password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="change-password-toggle"
                onClick={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    confirmPassword: !prev.confirmPassword,
                  }))
                }
                aria-label={
                  showPassword.confirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showPassword.confirmPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </span>

            {touched.confirmPassword && errors.confirmPassword ? (
              <span className="change-password-field-error">
                {errors.confirmPassword}
              </span>
            ) : null}
          </label>

          {status.message ? (
            <div className={`change-password-status ${status.tone}`}>
              {status.message}
            </div>
          ) : null}

          <div className="change-password-actions">
            <button
              type="button"
              className="app-button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="app-button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
