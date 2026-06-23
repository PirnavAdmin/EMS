import React, { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS, getAuthRoleForEmail } from "../../api/endpoints";

const OTP_LENGTH = 6;

export default function OtpLeft() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef([]);
  const email = location.state?.email;
  const role = location.state?.role || getAuthRoleForEmail(email);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const otpValue = useMemo(() => otp.join(""), [otp]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (error) {
      setError("");
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();

    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH)
      .split("");

    if (pastedDigits.length === 0) {
      return;
    }

    setOtp((prev) => prev.map((_, index) => pastedDigits[index] || ""));
    inputRefs.current[Math.min(pastedDigits.length, OTP_LENGTH) - 1]?.focus();

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!otpValue) {
      setError("Enter the OTP sent to your email.");
      return;
    }

    if (otpValue.length < OTP_LENGTH) {
      setError("Enter the complete 6-digit OTP.");
      return;
    }

    if (!email) {
      setError("Please restart the forgot password flow.");
      navigate("/forgot-password", { replace: true });
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.post(
        API_ENDPOINTS.auth.verifyOtpByRole(role),
        {
          email,
          otp: otpValue,
        },
        {
          skipAuth: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      navigate("/reset-password", { state: { email, otp: otpValue, role } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to verify the OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-card-head">
        <p className="auth-eyebrow">Secure Verification</p>
        <h2 className="auth-card-title">OTP Verification</h2>
        <p className="auth-card-subtitle">
          Enter the 6-digit code sent to your registered email to continue.
        </p>
      </div>

      {error ? <div className="auth-status auth-status-error">{error}</div> : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field-group">
          <span className="auth-field-label">Enter OTP</span>

          <div className="auth-otp-grid" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className="auth-otp-input"
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <p className="auth-helper-text">
          Use the one-time verification code we sent to your email address.
        </p>

        <button type="submit" className="auth-primary-button" disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>
    </>
  );
}
