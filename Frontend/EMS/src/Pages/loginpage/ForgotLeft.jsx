import React, { useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS, getAuthRoleForEmail } from "../../api/endpoints";
import AuthField from "./AuthField";
import { isValidEmail } from "./authUtils";

export default function ForgotLeft() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const value = event.target.value.toLowerCase();

    if (value.length <= 50) {
      setEmail(value);
    }

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter your registered email address.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const role = getAuthRoleForEmail(email);

      await api.post(
        API_ENDPOINTS.auth.forgotPasswordByRole(role),
        { email },
        {
          skipAuth: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess("OTP sent successfully. Redirecting to verification...");

      window.setTimeout(() => {
        navigate("/otp", { state: { email, role } });
      }, 1200);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-card-head">
        <p className="auth-eyebrow">Password Recovery</p>
        <h2 className="auth-card-title">Forgot Password?</h2>
        <p className="auth-card-subtitle">
          Enter your registered email address and we&apos;ll send a secure OTP to
          continue.
        </p>
      </div>

      {error ? <div className="auth-status auth-status-error">{error}</div> : null}
      {success ? (
        <div className="auth-status auth-status-success">{success}</div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={handleChange}
          autoComplete="email"
          placeholder="Enter your email address"
          icon={FaEnvelope}
          required
        />

        <button type="submit" className="auth-primary-button" disabled={loading}>
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>

      <p className="auth-footer">
        <Link to="/login" className="auth-link">
          Back to Login
        </Link>
      </p>
    </>
  );
}
