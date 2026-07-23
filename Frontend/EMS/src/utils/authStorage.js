const AUTH_KEYS = [
  "token",
  "authToken",
  "jwtToken",
  "refreshToken",
  "loginTime",
  "role",
  "roleName",
  "roleId",
  "email",
  "employeeId",
  "userId",
  "attendanceId",
  "organizationId",
  "organization_Id",
  "organizationID",
  "orgId",
  "orgID",
  "branchId",
  "branch_Id",
  "branchID",
  "companyId",
  "company_Id",
  "companyID",
  "tenantId",
  "tenant_Id",
  "tenantID",
  "modules",
  "permissions",
  "userData",
  "user",
  "userInfo",
  "authUser",
];

const JSON_STORAGE_KEYS = ["userData", "user", "userInfo", "authUser"];

const EMPLOYEE_ID_KEYS = [
  "employeeId",
  "employee_Id",
  "employeeID",
  "EmployeeId",
  "Employee_Id",
  "empId",
  "employeeCode",
];

const USER_ID_KEYS = [
  "userId",
  "user_Id",
  "UserId",
  "User_Id",
  "id",
  "Id",
  "nameid",
  "sub",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier",
];

const ATTENDANCE_ID_KEYS = [
  "attendanceId",
  "attendance_Id",
  "AttendanceId",
  "Attendance_Id",
];

const ORGANIZATION_ID_KEYS = [
  "organizationId",
  "organization_Id",
  "organizationID",
  "orgId",
  "orgID",
  "OrganizationId",
  "Organization_Id",
  "OrganizationID",
];

const BRANCH_ID_KEYS = [
  "branchId",
  "branch_Id",
  "branchID",
  "BranchId",
  "Branch_Id",
  "BranchID",
];

const COMPANY_ID_KEYS = [
  "companyId",
  "company_Id",
  "companyID",
  "CompanyId",
  "Company_Id",
  "CompanyID",
];

const TENANT_ID_KEYS = [
  "tenantId",
  "tenant_Id",
  "tenantID",
  "TenantId",
  "Tenant_Id",
  "TenantID",
];

const JWT_ROLE_KEYS = [
  "role",
  "roleName",
  "Role",
  "RoleName",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/name",
];

const tryParseJson = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  if (typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  try {
    const payloadPart = token.split(".")[1];
    const normalizedPayload = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");

    const decoded =
      typeof atob === "function"
        ? atob(normalizedPayload)
        : "";

    return decoded ? JSON.parse(decoded) : null;
  } catch {
    return null;
  }
};

const getValueFromRecord = (record, keys) => {
  if (!record || typeof record !== "object") {
    return "";
  }

  for (const key of keys) {
    const value = record[key];

    if (value === undefined || value === null) {
      continue;
    }

    const normalizedValue = String(value).trim();

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
};

const getStoredValueFromSources = (keys) => {
  for (const key of keys) {
    const directValue = getStoredAuthValue(key).trim();

    if (directValue) {
      return directValue;
    }
  }

  for (const key of JSON_STORAGE_KEYS) {
    const parsedRecord = tryParseJson(getStoredAuthValue(key));
    const parsedValue = getValueFromRecord(parsedRecord, keys);

    if (parsedValue) {
      return parsedValue;
    }
  }

  const tokenPayload = decodeJwtPayload(getStoredToken());
  return getValueFromRecord(tokenPayload, keys);
};

export const getStoredJwtPayload = () => decodeJwtPayload(getStoredToken());

export const getStoredJwtRole = () =>
  getValueFromRecord(getStoredJwtPayload(), JWT_ROLE_KEYS);

export const getAuthStorage = (rememberMe) =>
  rememberMe ? localStorage : sessionStorage;

export const getActiveAuthStorage = () => {
  if (sessionStorage.getItem("token")) {
    return sessionStorage;
  }

  if (localStorage.getItem("token")) {
    return localStorage;
  }

  return sessionStorage;
};

export const clearAuthData = () => {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  sessionStorage.clear();
};

export const getStoredAuthValue = (key, fallback = "") =>
  sessionStorage.getItem(key) || localStorage.getItem(key) || fallback;

export const getStoredToken = () =>
  getStoredAuthValue("token") ||
  getStoredAuthValue("authToken") ||
  getStoredAuthValue("jwtToken");

export const getStoredRole = () =>
  String(getStoredAuthValue("role") || getStoredJwtRole() || "user").toLowerCase();

export const getStoredRoleName = () =>
  getStoredAuthValue("roleName") || getStoredJwtRole();

export const getStoredPermissions = () => {
  const storage = getActiveAuthStorage();
  const otherStorage = storage === sessionStorage ? localStorage : sessionStorage;
  const keys = ["modules", "permissions"];

  for (const store of [storage, otherStorage]) {
    for (const key of keys) {
      try {
        const value = JSON.parse(store.getItem(key));

        if (Array.isArray(value) && value.length > 0) {
          return value;
        }
      } catch {
        // Keep looking in the next storage/key pair.
      }
    }
  }

  return [];
};

export const getStoredEmployeeId = () =>
  getStoredValueFromSources(EMPLOYEE_ID_KEYS) ||
  getStoredUserId() ||
  getStoredAttendanceId();

export const getStoredUserId = () =>
  getStoredValueFromSources(USER_ID_KEYS);

export const getStoredAttendanceId = () =>
  getStoredValueFromSources(ATTENDANCE_ID_KEYS);

export const getStoredOrganizationId = () =>
  getStoredValueFromSources(ORGANIZATION_ID_KEYS);

export const getStoredBranchId = () =>
  getStoredValueFromSources(BRANCH_ID_KEYS);

export const getStoredCompanyId = () =>
  getStoredValueFromSources(COMPANY_ID_KEYS);

export const getStoredTenantId = () =>
  getStoredValueFromSources(TENANT_ID_KEYS);

export const getStoredIdentityParams = () => {
  const employeeId = getStoredEmployeeId();
  const userId = getStoredUserId();
  const attendanceId = getStoredAttendanceId();

  return {
    ...(employeeId ? { employeeId } : {}),
    ...(userId ? { userId } : {}),
    ...(attendanceId ? { attendanceId } : {}),
  };
};

export const getStoredTenantContextParams = () => {
  const organizationId = getStoredOrganizationId();
  const branchId = getStoredBranchId();
  const companyId = getStoredCompanyId();
  const tenantId = getStoredTenantId();

  return {
    ...(organizationId ? { organizationId } : {}),
    ...(branchId ? { branchId } : {}),
    ...(companyId ? { companyId } : {}),
    ...(tenantId ? { tenantId } : {}),
  };
};
