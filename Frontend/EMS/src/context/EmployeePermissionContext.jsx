import React, { useEffect, useState } from "react";
import { FaEnvelope, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  clearAuthData,
  getAuthStorage } from
"../utils/authStorage";
import { normalizeRole } from "../utils/authorization";
import { useAdminPermissions } from "../context/AdminPermissionContext";
import { useEmployeePermissions } from "../context/EmployeePermissionContext";
import { startSessionTimer } from "../utils/sessionManager";
import AuthField from "./AuthField";
import { isValidEmail } from "./authUtils";
 
const ROLE_NAME_CLAIM =
"http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
 
const toDisplayRoleName = (value) => {
  const normalized = String(value ?? "").trim();
 
  if (!normalized) {
    return "";
  }
 
  const lowered = normalized.toLowerCase();
 
  if (lowered === "admin") return "Admin";
  if (["superadmin", "super admin", "super_admin"].includes(lowered)) return "SuperAdmin";
  if (lowered === "user") return "User";
  if (lowered === "employee") return "Employee";
  if (lowered === "onboarding" || lowered === "candidate") return "Onboarding";
 
  return normalized;
};
 
const resolveLoginType = (value = "", endpoint = "") => {
  const normalized = String(value ?? "").
  trim().
  toLowerCase().
  replace(/[\s_-]+/g, "");
 
  if (endpoint === API_ENDPOINTS.auth.superAdminLogin) {
    return "super-admin";
  }
 
  if (endpoint === API_ENDPOINTS.auth.adminLogin) {
    return "admin";
  }
 
  if (endpoint === API_ENDPOINTS.auth.userLogin) {
    return "user";
  }
 
  if (["superadmin", "superadministrator"].includes(normalized)) {
    return "super-admin";
  }
 
  if (["admin", "administrator"].includes(normalized)) {
    return "admin";
  }
 
  if (["onboarding", "candidate"].includes(normalized)) {
    return "onboarding";
  }
 
  return normalized ? "user" : "";
};
 
export default function LoginLeft() {
  const navigate = useNavigate();
  const { refreshPermissions: refreshAdminPermissions } = useAdminPermissions();
  const { refreshPermissions: refreshEmployeePermissions } = useEmployeePermissions();
  const [form, setForm] = useState({
    email: "",
    password: ""
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
        atob(base64).
        split("").
        map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`).
        join("")
      );
 
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };
 
  const resolveIdentityValue = (...values) => {
    for (const value of values) {
      const normalizedValue = String(value ?? "").trim();
 
      if (normalizedValue) {
        return normalizedValue;
      }
    }
 
    return "";
  };
 
  const authRequestOptions = {
    skipAuth: true,
    headers: {
      "Content-Type": "application/json"
    }
  };
 
  const shouldFallbackToUserLogin = (error) => {
    const status = error?.response?.status;
 
    if ([400, 401, 403, 404].includes(status)) {
      return true;
    }
 
    const message = String(
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      ""
    ).toLowerCase();
 
    return /invalid|unauthori[sz]ed|role|credential|account|not found|does not exist/.test(
      message
    );
  };
 
  const submitLoginRequest = async () => {
    const payload = {
      email: form.email,
      password: form.password
    };
 
    const endpoints = [
    API_ENDPOINTS.auth.superAdminLogin,
    API_ENDPOINTS.auth.adminLogin,
    API_ENDPOINTS.auth.userLogin];
 
    let lastError = null;
 
    for (const endpoint of endpoints) {
      try {
        if (endpoint === API_ENDPOINTS.auth.userLogin) {
          console.log("[LOGIN] Calling:", endpoint);
        }
 
        const response = await api.post(endpoint, payload, authRequestOptions);
 
        return { response, endpoint };
      } catch (error) {
        lastError = error;
 
        if (endpoint === API_ENDPOINTS.auth.userLogin) {
          console.error("[LOGIN ERROR]", error?.response?.data);
        }
 
        if (
        endpoint !== API_ENDPOINTS.auth.userLogin &&
        shouldFallbackToUserLogin(error))
        {
          continue;
        }
 
        throw error;
      }
    }
 
    throw lastError;
  };
 
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    const savedPassword = localStorage.getItem("rememberPassword");
 
    if (savedEmail && savedPassword) {
      setForm({
        email: savedEmail,
        password: savedPassword
      });
      setRememberMe(true);
    }
  }, []);
 
  const handleChange = (event) => {
    const { name, value } = event.target;
 
    setForm((prev) => ({
      ...prev,
      [name]: name === "email" ? value.toLowerCase() : value
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
      const loginResult = await submitLoginRequest();
      const response = loginResult?.response;
      const loginEndpoint = loginResult?.endpoint || "";
 
      if (response.status !== 200 || !response.data?.token) {
        if (loginEndpoint === API_ENDPOINTS.auth.userLogin) {
          console.error("[LOGIN ERROR]", response?.data);
        }
 
        throw new Error(response.data?.message || `Login failed (${response.status})`);
      }
 
      const token = response.data.token;
      const decoded = parseJwt(token);
      const decodedRoleName =
      decoded?.roleName ||
      decoded?.[ROLE_NAME_CLAIM] ||
      decoded?.role ||
      "";
 
      const roleId =
      response.data.roleId ||
      decoded?.RoleId ||
      decoded?.roleId ||
      null;
 
      const employeeId = resolveIdentityValue(
        response.data.employeeId,
        response.data.employee_Id,
        response.data.employeeID,
        decoded?.employeeId,
        decoded?.employee_Id,
        decoded?.EmployeeId,
        decoded?.Employee_Id,
        decoded?.employeeID,
        decoded?.empId
      );
 
      const userId = resolveIdentityValue(
        response.data.userId,
        response.data.user_Id,
        response.data.UserId,
        decoded?.userId,
        decoded?.user_Id,
        decoded?.UserId,
        decoded?.nameid,
        decoded?.sub,
        decoded?.[
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier"]
 
      );
 
      const attendanceId = resolveIdentityValue(
        response.data.attendanceId,
        response.data.attendance_Id,
        decoded?.attendanceId,
        decoded?.attendance_Id,
        decoded?.AttendanceId,
        decoded?.Attendance_Id
      );
 
      const onboardingId = resolveIdentityValue(
        response.data.onboardingId,
        response.data.onboarding_Id,
        response.data.onboardingID,
        response.data.OnboardingId,
        response.data.Onboarding_Id,
        decoded?.onboardingId,
        decoded?.onboarding_Id,
        decoded?.onboardingID,
        decoded?.OnboardingId,
        decoded?.Onboarding_Id,
        decoded?.candidateOnboardingId,
        decoded?.CandidateOnboardingId
      );
 
      const organizationId = resolveIdentityValue(
        response.data.organizationId,
        response.data.organization_Id,
        response.data.organizationID,
        response.data.orgId,
        decoded?.organizationId,
        decoded?.organization_Id,
        decoded?.organizationID,
        decoded?.orgId
      );
 
      const branchId = resolveIdentityValue(
        response.data.branchId,
        response.data.branch_Id,
        response.data.branchID,
        decoded?.branchId,
        decoded?.branch_Id,
        decoded?.branchID
      );
 
      const companyId = resolveIdentityValue(
        response.data.companyId,
        response.data.company_Id,
        response.data.companyID,
        decoded?.companyId,
        decoded?.company_Id,
        decoded?.companyID
      );
 
      const tenantId = resolveIdentityValue(
        response.data.tenantId,
        response.data.tenant_Id,
        response.data.tenantID,
        decoded?.tenantId,
        decoded?.tenant_Id,
        decoded?.tenantID
      );
 
      const resolvedEmployeeId =
      employeeId || userId || attendanceId;
 
      const authenticatedRole = normalizeRole(
        response.data.role ||
        decoded?.role ||
        decoded?.[
        ROLE_NAME_CLAIM] ||
 
        decodedRoleName ||
        ""
      );
 
      const roleName = authenticatedRole ?
      toDisplayRoleName(authenticatedRole) :
      toDisplayRoleName(
        response.data.roleName ||
        decodedRoleName ||
        response.data.role ||
        decoded?.role ||
        ""
      );
 
      const loginType = resolveLoginType(
        response.data.userType ||
        response.data.loginType ||
        response.data.accountType ||
        response.data.type ||
        decoded?.userType ||
        decoded?.loginType ||
        decoded?.accountType ||
        "",
        loginEndpoint
      );
 
      const isOnboardingLogin =
      Boolean(onboardingId) && (
 
      authenticatedRole === "onboarding" ||
      authenticatedRole === "candidate" ||
      normalizeRole(roleName) === "onboarding" ||
      normalizeRole(roleName) === "candidate" ||
      loginType.includes("onboarding") ||
      loginType.includes("candidate") ||
      response.data.isOnboardingUser === true ||
      response.data.isOnboarding === true ||
      decoded?.isOnboardingUser === true ||
      decoded?.isOnboarding === true);
 
      if (!token) {
        throw new Error(
          "Login failed: Login response is missing required authentication data."
        );
      }
 
      if (!authenticatedRole && !isOnboardingLogin) {
        if (loginEndpoint === API_ENDPOINTS.auth.userLogin) {
          console.error("[LOGIN ERROR]", response?.data);
        }
 
        throw new Error(
          "Login failed: Role information is missing from the authentication response."
        );
      }
 
      if (!roleName && !isOnboardingLogin) {
        if (loginEndpoint === API_ENDPOINTS.auth.userLogin) {
          console.error("[LOGIN ERROR]", response?.data);
        }
 
        throw new Error(
          "Login failed: Role name is missing from the authentication response."
        );
      }
 
      if (loginEndpoint === API_ENDPOINTS.auth.userLogin) {
        console.log("[LOGIN] Success:", response?.data);
        console.log("[LOGIN] User ID:", response?.data?.userId);
        console.log("[LOGIN] Role:", response?.data?.role);
      }
 
      const isSuperAdminLogin = loginType === "super-admin";
      const shouldUseAdminPermissions =
      loginType === "admin" || loginType === "super-admin";
 
      clearAuthData();
 
      storage.setItem("token", token);
      localStorage.setItem("loginTime", String(Date.now()));
      storage.setItem(
        "role",
        isOnboardingLogin ? "onboarding" : authenticatedRole
      );
      storage.setItem("roleName", isOnboardingLogin ? "Onboarding" : roleName);
      storage.setItem("roleId", roleId || "");
      storage.setItem("email", form.email);
      storage.setItem(
        "loginType",
        isOnboardingLogin ? "onboarding" : loginType || ""
      );
      storage.setItem(
        "userType",
        isOnboardingLogin ? "onboarding" : loginType || ""
      );
      storage.setItem(
        "userData",
        JSON.stringify(response.data)
      );
      storage.setItem(
        "user",
        JSON.stringify(
          response.data.superAdmin ||
          response.data.admin ||
          response.data.user ||
          response.data
        )
      );
 
      if (isSuperAdminLogin) {
        storage.setItem("role", "superadmin");
        storage.setItem("roleName", "SuperAdmin");
        storage.setItem("loginType", "super-admin");
        storage.setItem("userType", "super-admin");
        storage.setItem("isSuperAdmin", "true");
      } else {
        storage.removeItem("isSuperAdmin");
      }
 
      if (isOnboardingLogin) {
        storage.setItem("onboardingId", onboardingId);
        storage.setItem("isOnboardingUser", "true");
      }
 
      if (!isOnboardingLogin && resolvedEmployeeId) {
        storage.setItem("employeeId", resolvedEmployeeId);
      }
 
      if (!isOnboardingLogin && userId) {
        storage.setItem("userId", userId);
      }
 
      if (!isOnboardingLogin && attendanceId) {
        storage.setItem("attendanceId", attendanceId);
      }
 
      if (organizationId) {
        storage.setItem("organizationId", organizationId);
      }
 
      if (branchId) {
        storage.setItem("branchId", branchId);
      }
 
      if (companyId) {
        storage.setItem("companyId", companyId);
      }
 
      if (tenantId) {
        storage.setItem("tenantId", tenantId);
      }
 
      if (rememberMe) {
        localStorage.setItem("rememberEmail", form.email);
        localStorage.setItem("rememberPassword", form.password);
      }
 
      if (!isOnboardingLogin) {
        if (shouldUseAdminPermissions) {
          await refreshAdminPermissions({ force: true });
        } else {
          await refreshEmployeePermissions({ force: true });
        }
      }
 
      startSessionTimer();
 
      navigate(isOnboardingLogin ? "/onboarding" : "/dashboard", {
        replace: true
      });
    } catch (requestError) {
      const message =
      requestError.response?.data?.message ||
      requestError.response?.data?.error ||
      requestError.message ||
      "";
 
      if (message.includes("Email does not exist")) {
        setError("No employee record was found for this email address.");
      } else if (message.includes("company")) {
        setError("This account is not assigned to a company yet.");
      } else if (requestError.response?.status === 401) {
        setError("Invalid email or password.");
      } else if (requestError.response?.status === 403) {
        setError("Your account does not have permission to access this application.");
      } else {
        setError(message || "Unable to sign in right now.");
      }
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <>
      <div className="auth-card-top">
        {/* <button
           type="button"
           className="auth-back-home-button"
           onClick={() => navigate("/")}
          >
           <span className="auth-back-home-icon" aria-hidden="true">
             <FaChevronLeft />
           </span>
           <span>Back to Home</span>
          </button> */}
 
        <div className="auth-card-head">
          <p className="auth-eyebrow">Welcome Back</p>
          <h2 className="auth-card-title">Sign in to PIRNAV HRMS</h2>
          {/* <p className="auth-card-subtitle">
             Access your secure workspace for people operations, approvals,
             payroll, and reporting.
            </p> */}
        </div>
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
          required />
       
 
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
            onClick: () => setShowPassword((prev) => !prev)
          }} />
       
 
        <div className="auth-inline-row">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={handleRememberMe} />
           
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
    </>);
 
}
 

