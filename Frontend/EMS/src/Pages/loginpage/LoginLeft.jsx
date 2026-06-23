import React, { useEffect, useState } from "react";
import { FaEnvelope, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import { clearAuthData, getAuthStorage } from "../../utils/authStorage";
import { startSessionTimer } from "../../utils/sessionManager";
import AuthField from "./AuthField";
import { isValidEmail } from "./authUtils";

export default function LoginLeft() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const parseJwt = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    const savedPassword = localStorage.getItem("rememberPassword");

    if (savedEmail && savedPassword) {
      setForm({
        email: savedEmail,
        password: savedPassword,
      });
      setRememberMe(true);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "email" ? value.toLowerCase() : value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleRememberMe = (event) => {
    const checked = event.target.checked;
    setRememberMe(checked);

    if (!checked) {
      localStorage.removeItem("rememberEmail");
      localStorage.removeItem("rememberPassword");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email.trim() || !form.password) {
      setError("Please enter your email address and password.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    const storage = getAuthStorage(rememberMe);

    try {
      let response;

      if (form.email === "admin@ems.com") {
        response = await api.post(
          API_ENDPOINTS.auth.adminLogin,
          {
            email: form.email,
            password: form.password,
          },
          {
            skipAuth: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        response = await api.post(
          API_ENDPOINTS.auth.userLogin,
          {
            email: form.email,
            password: form.password,
          },
          {
            skipAuth: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (response.status !== 200 || !response.data?.token) {
        throw new Error(response.data?.message || `Login failed (${response.status})`);
      }

      const token = response.data.token;
      const decoded = parseJwt(token);

      const roleId =
        response.data.roleId ||
        decoded?.RoleId ||
        decoded?.roleId ||
        null;

      const roleName =
        response.data.roleName ||
        decoded?.[
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        ] ||
        "User";

      let role = response.data.role || decoded?.role || "user";

      if (form.email === "admin@ems.com") {
        role = "admin";
      } else {
        role = role.trim().toLowerCase();
      }

      clearAuthData();

      storage.setItem("token", token);
      localStorage.setItem("loginTime", Date.now());
      storage.setItem("role", role);
      storage.setItem("roleName", roleName || "");
      storage.setItem("roleId", roleId || "");
      storage.setItem("email", form.email);

      let modules = [];

      if (role === "admin") {
        modules = [{ moduleName: "all", canAccess: true }];
      } else {
        try {
          const modulesResponse = await api.get(
            API_ENDPOINTS.rolePermission.allowedModules,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const moduleData =
            modulesResponse.data?.data?.$values ||
            modulesResponse.data?.data ||
            modulesResponse.data?.$values ||
            modulesResponse.data ||
            [];

          if (Array.isArray(moduleData)) {
            modules = moduleData.map((module) => ({
              moduleId: module.moduleId ?? module.ModuleId,
              moduleName: module.moduleName ?? module.ModuleName,
              canAccess: true,
            })).filter((module) => module.moduleName);
          }
        } catch (moduleError) {
          console.error("Modules API Error:", moduleError.message);
        }
      }

      storage.setItem("modules", JSON.stringify(modules));
      storage.setItem("permissions", JSON.stringify(modules));

      if (rememberMe) {
        localStorage.setItem("rememberEmail", form.email);
        localStorage.setItem("rememberPassword", form.password);
      }

      startSessionTimer();

      navigate(role === "admin" ? "/dashboard" : "/user-dashboard", {
        replace: true,
      });
    } catch (requestError) {
      const message = requestError.response?.data?.message || "";

      if (message.includes("Email does not exist")) {
        setError("No employee record was found for this email address.");
      } else if (message.includes("company")) {
        setError("This account is not assigned to a company yet.");
      } else if (requestError.response?.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError(message || "Unable to sign in right now.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-card-head">
        <p className="auth-eyebrow">Welcome Back</p>
        <h2 className="auth-card-title">Sign in to PIRNAV HRMS</h2>
        {/* <p className="auth-card-subtitle">
          Access your secure workspace for people operations, approvals,
          payroll, and reporting.
        </p> */}
      </div>

      {error ? <div className="auth-status auth-status-error">{error}</div> : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          label="Email Address"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          placeholder="Enter your email address"
          icon={FaEnvelope}
          required
        />

        <AuthField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          placeholder="Enter your password"
          icon={FaLock}
          required
          action={{
            label: showPassword ? "Hide password" : "Show password",
            icon: showPassword ? <FaEye /> : <FaEyeSlash />,
            onClick: () => setShowPassword((prev) => !prev),
          }}
        />

        <div className="auth-inline-row">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={handleRememberMe}
            />
            <span>Remember me</span>
          </label>

          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="auth-primary-button" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="auth-footer">
        Don&apos;t have an account?
        <Link to="/register" className="auth-link">
          Create account
        </Link>
      </p>
    </>
  );
}
