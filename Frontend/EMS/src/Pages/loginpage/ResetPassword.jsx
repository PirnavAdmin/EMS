import React, { useMemo, useState } from "react";
import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS, getAuthRoleForEmail } from "../../api/endpoints";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";
import LoginRight from "./LoginRight";
import "./login.css";
import {
  getPasswordRuleState,
  getPasswordStrength,
  getPasswordValidationMessage,
} from "./authUtils";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const otp = location.state?.otp;
  const role = location.state?.role || getAuthRoleForEmail(email);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );
  const passwordRules = useMemo(
    () => getPasswordRuleState(formData.password),
    [formData.password]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const validatePassword = (password) => {
    const passwordRegex = /^[A-Z](?=.*[0-9])(?=.*[!@#$%^&*]).{7,}$/;
    return passwordRegex.test(password);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email || !otp) {
      setError("Please restart the forgot password flow.");
      navigate("/forgot-password", { replace: true });
      return;
    }

    const passwordMessage = getPasswordValidationMessage(formData.password);
    if (passwordMessage || !validatePassword(formData.password)) {
      setError(passwordMessage || "Enter a stronger password.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post(
        API_ENDPOINTS.auth.resetPasswordByRole(role),
        {
          email,
          otp: parseInt(otp, 10),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        },
        {
          skipAuth: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      navigate("/login");
    } catch (requestError) {
      const responseData = requestError.response?.data;

      if (responseData?.errors) {
        const firstError = Object.values(responseData.errors).flat().find(Boolean);
        setError(firstError || "Unable to update the password.");
      } else {
        setError(responseData?.title || "Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout hero={<LoginRight variant="recovery" />}>
      <div className="auth-card-head">
        <p className="auth-eyebrow">Create New Password</p>
        <h2 className="auth-card-title">Reset Password</h2>
        <p className="auth-card-subtitle">
          Set a strong new password with uppercase, numeric, and special
          character protection.
        </p>
      </div>

      {error ? <div className="auth-status auth-status-error">{error}</div> : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          label="New Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Enter your new password"
          icon={FaLock}
          required
          action={{
            label: showPassword ? "Hide password" : "Show password",
            icon: showPassword ? <FaEyeSlash /> : <FaEye />,
            onClick: () => setShowPassword((prev) => !prev),
          }}
        />

        <div className="auth-strength-card">
          <div className="auth-strength-head">
            <span>Password Strength</span>
            <span className={`auth-strength-pill ${passwordStrength.tone}`}>
              {passwordStrength.label}
            </span>
          </div>

          <div className="auth-strength-bars" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className={`auth-strength-bar ${
                  index < passwordStrength.score
                    ? `auth-strength-bar-${passwordStrength.tone}`
                    : ""
                }`}
              />
            ))}
          </div>

          <div className="auth-rule-list">
            {passwordRules.map((rule) => (
              <span
                key={rule.id}
                className={`auth-rule-item ${rule.passed ? "passed" : ""}`}
              >
                {rule.label}
              </span>
            ))}
          </div>
        </div>

        <AuthField
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          icon={FaLock}
          required
          action={{
            label: showConfirmPassword
              ? "Hide confirm password"
              : "Show confirm password",
            icon: showConfirmPassword ? <FaEyeSlash /> : <FaEye />,
            onClick: () => setShowConfirmPassword((prev) => !prev),
          }}
        />

        <div className="auth-button-row">
          <button
            type="button"
            className="auth-secondary-button"
            onClick={() => navigate("/login")}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="auth-primary-button"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
