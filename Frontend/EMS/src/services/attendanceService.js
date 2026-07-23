import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  getStoredJwtPayload,
  getStoredJwtRole,
  getStoredRole,
  getStoredRoleName,
  getStoredToken,
} from "../utils/authStorage";

const extractFirstNonEmptyValue = (values = []) =>
  values.find((value) => {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === "object") {
      return Object.keys(value).length > 0;
    }

    return true;
  });

const extractValidationMessage = (data) => {
  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data.trim();
  }

  const directMessage = extractFirstNonEmptyValue([
    data.message,
    data.Message,
    data.error,
    data.Error,
    data.title,
    data.Title,
    data.detail,
    data.Detail,
    data.exceptionMessage,
    data.ExceptionMessage,
  ]);

  if (typeof directMessage === "string") {
    return directMessage.trim();
  }

  const errorCollection = data.errors || data.Errors;

  if (errorCollection && typeof errorCollection === "object") {
    const collectedMessages = Object.values(errorCollection)
      .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);

    if (collectedMessages.length > 0) {
      return collectedMessages.join(", ");
    }
  }

  return "";
};

const buildAttendanceDashboardHeaders = (token) => ({
  Accept: "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const getTokenClaims = () => {
  const payload = getStoredJwtPayload() || {};

  return {
    employeeId:
      payload.employeeId ||
      payload.employee_Id ||
      payload.EmployeeId ||
      payload.Employee_Id ||
      "",
    userId:
      payload.userId ||
      payload.user_Id ||
      payload.UserId ||
      payload.nameid ||
      payload.sub ||
      "",
    organizationId:
      payload.organizationId ||
      payload.organization_Id ||
      payload.organizationID ||
      payload.orgId ||
      payload.OrganizationId ||
      payload.Organization_Id ||
      payload.OrganizationID ||
      "",
    branchId:
      payload.branchId ||
      payload.branch_Id ||
      payload.branchID ||
      payload.BranchId ||
      payload.Branch_Id ||
      payload.BranchID ||
      "",
    role:
      payload.role ||
      payload.roleName ||
      payload.Role ||
      payload.RoleName ||
      "",
  };
};

export const getAttendanceDashboardErrorMessage = (
  error,
  fallbackMessage = "Unable to load attendance overview right now."
) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const validationMessage = extractValidationMessage(data);

  if (status === 400) {
    return validationMessage || fallbackMessage;
  }

  if (status === 401) {
    return "Session expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to access attendance.";
  }

  if (status === 404) {
    return "Attendance endpoint not found.";
  }

  if (typeof status === "number" && status >= 500) {
    return "Internal Server Error.";
  }

  if (validationMessage) {
    return validationMessage;
  }

  return fallbackMessage;
};

export const getAttendanceDashboardOverview = async ({
  signal,
} = {}) => {
  const url = API_ENDPOINTS.attendance.dashboardAttendance;
  const token = getStoredToken();
  const userRole =
    getStoredJwtRole() ||
    getStoredRoleName() ||
    getStoredRole();
  const params = {};
  const headers = buildAttendanceDashboardHeaders(token);
  const claims = getTokenClaims();

  console.log("Dashboard Attendance Request");
  console.log("URL:", url);
  console.log("Method:", "GET");
  console.log("Params:", params);
  console.log("Headers:", headers);
  console.log("JWT Token:", token);
  console.log("User Role:", userRole);
  console.log("Claims:", claims);

  try {
    return await api.get(url, {
      signal,
      headers,
      dedupe: false,
    });
  } catch (error) {
    if (error?.response?.data) {
      console.error(error.response.data);
    }

    throw error;
  }
};
