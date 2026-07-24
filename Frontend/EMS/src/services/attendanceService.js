import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  getStoredIdentityParams,
  getStoredTenantContextParams,
  getStoredJwtPayload,
  getStoredJwtRole,
  getStoredRole,
  getStoredRoleName,
  getStoredToken,
} from "../utils/authStorage";
import { getInputDateValue } from "../utils/date";

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

const getClientTimezone = () => {
  try {
    if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
      return "";
    }

    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

const getCurrentAttendanceWindow = () => {
  const today = new Date();

  return {
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    fromDate: getInputDateValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    toDate: getInputDateValue(today),
  };
};

const resolveAttendanceRole = () =>
  getStoredJwtRole() ||
  getStoredRoleName() ||
  getStoredRole();

const buildAttendanceWindowParams = () => {
  const { month, year, fromDate, toDate } = getCurrentAttendanceWindow();
  const timezone = getClientTimezone();
  const role = resolveAttendanceRole();

  return {
    ...(role ? { role } : {}),
    ...(timezone ? { timezone } : {}),
    month,
    year,
    fromDate,
    toDate,
  };
};

const buildUserAttendanceDashboardParams = () => ({
  ...getStoredIdentityParams(),
  ...getStoredTenantContextParams(),
  ...buildAttendanceWindowParams(),
});

const buildAdminAttendanceOverviewParams = () => ({
  ...getStoredTenantContextParams(),
  ...buildAttendanceWindowParams(),
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
    companyId:
      payload.companyId ||
      payload.company_Id ||
      payload.companyID ||
      payload.CompanyId ||
      payload.Company_Id ||
      payload.CompanyID ||
      "",
    tenantId:
      payload.tenantId ||
      payload.tenant_Id ||
      payload.tenantID ||
      payload.TenantId ||
      payload.Tenant_Id ||
      payload.TenantID ||
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

const logAttendanceDashboardRequest = ({
  label,
  url,
  params,
  headers,
  token,
  userRole,
  claims,
}) => {
  console.log(label, {
    url,
    method: "GET",
    baseURL: api.defaults.baseURL,
    params,
    headers,
    token,
    body: undefined,
    userRole,
    claims,
  });
};

export const getUserAttendanceDashboard = async ({
  signal,
} = {}) => {
  const url = API_ENDPOINTS.attendance.userDashboardOverview;
  const token = getStoredToken();
  const userRole = resolveAttendanceRole();
  const params = buildUserAttendanceDashboardParams();
  const headers = buildAttendanceDashboardHeaders(token);
  const claims = getTokenClaims();

  logAttendanceDashboardRequest({
    label: "User Attendance Dashboard Request",
    url,
    params,
    headers,
    token,
    userRole,
    claims,
  });

  return api.get(url, {
    signal,
    params,
    headers,
    dedupe: false,
  });
};

export const getAdminAttendanceOverview = async ({
  signal,
} = {}) => {
  const url = API_ENDPOINTS.attendance.adminDashboardOverview;
  const token = getStoredToken();
  const userRole = resolveAttendanceRole();
  const params = buildAdminAttendanceOverviewParams();
  const headers = buildAttendanceDashboardHeaders(token);
  const claims = getTokenClaims();

  logAttendanceDashboardRequest({
    label: "Admin Attendance Overview Request",
    url,
    params,
    headers,
    token,
    userRole,
    claims,
  });

  return api.get(url, {
    signal,
    params,
    headers,
    dedupe: false,
  });
};
