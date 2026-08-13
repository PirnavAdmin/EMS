import { clearCurrentAdminAllowedModules } from "./adminPermissionState";

const AUTH_KEYS = [
  "token",
  "authToken",
  "jwtToken",
  "refreshToken",
  "loginTime",
  "role",
  "roleName",
  "roles",
  "roleId",
  "userType",
  "isSuperAdmin",
  "email",
  "adminEmail",
  "displayName",
  "name",
  "userName",
  "fullName",
  "adminId",
  "onboardingId",
  "isOnboardingUser",
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
  "allowedModules",
  "permissions",
  "adminPermissions",
  "employeePermissions",
  "employeeAllowedModules",
  "employeeModules",
  "employeePermissionModules",
  "superAdminId",
  "employeeEmail",
  "userEmail",
  "userData",
  "user",
  "userInfo",
  "authUser",
];

const JSON_STORAGE_KEYS = ["user", "userData", "userInfo", "authUser"];

const pickFirstNonEmptyValue = (...values) => {
  for (const value of values) {
    const normalizedValue = String(value ?? "").trim();

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
};

const normalizeRoleValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const ROLE_ALIASES = new Map([
  ["superadmin", "superadmin"],
  ["superadministrator", "superadmin"],
  ["admin", "admin"],
  ["administrator", "admin"],
  ["employee", "employee"],
  ["user", "employee"],
  ["manager", "employee"],
  ["onboarding", "onboarding"],
  ["candidate", "onboarding"],
]);

const normalizeStoredRole = (value) => {
  const normalizedRole = normalizeRoleValue(value);

  if (!normalizedRole) {
    return "";
  }

  return ROLE_ALIASES.get(normalizedRole) || normalizedRole;
};

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

const ROLE_KEYS = [
  "role",
  "Role",
  "roleName",
  "RoleName",
  "UserRole",
  "userRole",
  "UserType",
  "userType",
  "Permission",
  "permission",
  "AccountType",
  "accountType",
  "Type",
  "type",
];

const ATTENDANCE_ID_KEYS = [
  "attendanceId",
  "attendance_Id",
  "AttendanceId",
  "Attendance_Id",
];

const ONBOARDING_ID_KEYS = [
  "onboardingId",
  "onboarding_Id",
  "onboardingID",
  "OnboardingId",
  "Onboarding_Id",
  "OnboardingID",
  "candidateOnboardingId",
  "CandidateOnboardingId",
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

const ADMIN_ID_KEYS = [
  "adminId",
  "admin_Id",
  "adminID",
  "AdminId",
  "Admin_Id",
  "AdminID",
  "superAdminId",
  "superAdmin_Id",
  "superAdminID",
  "SuperAdminId",
  "SuperAdmin_Id",
  "SuperAdminID",
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
  "UserRole",
  "userRole",
  "user_type",
  "UserType",
  "userType",
  "Permission",
  "permission",
  "AccountType",
  "accountType",
  "Type",
  "type",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/name",
];

const JWT_EMAIL_KEYS = [
  "email",
  "Email",
  "emailAddress",
  "EmailAddress",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/emailaddress",
];

const AUTH_TOKEN_KEYS = [
  "token",
  "Token",
  "accessToken",
  "AccessToken",
  "jwtToken",
  "JwtToken",
  "authToken",
  "AuthToken",
  "bearerToken",
  "BearerToken",
];

const REFRESH_TOKEN_KEYS = [
  "refreshToken",
  "RefreshToken",
  "refresh_token",
  "Refresh_Token",
  "refreshtoken",
];

const JWT_DISPLAY_NAME_KEYS = [
  "displayName",
  "DisplayName",
  "name",
  "Name",
  "fullName",
  "FullName",
  "userName",
  "UserName",
  "username",
  "Username",
  "preferred_username",
  "preferredUsername",
];

const JWT_USER_ID_KEYS = [
  "userId",
  "user_Id",
  "userID",
  "UserId",
  "User_Id",
  "UserID",
  "id",
  "Id",
  "sub",
  "nameid",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier",
  "adminId",
  "AdminId",
  "adminID",
  "EmployeeId",
  "employeeId",
  "employeeID",
];

const JWT_ADMIN_ID_KEYS = [
  "adminId",
  "admin_Id",
  "adminID",
  "AdminId",
  "Admin_Id",
  "AdminID",
  "superAdminId",
  "superAdmin_Id",
  "superAdminID",
  "SuperAdminId",
  "SuperAdmin_Id",
  "SuperAdminID",
  "id",
  "Id",
  "sub",
  "nameid",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier",
  "userId",
  "UserId",
];

const JWT_SUPER_ADMIN_ID_KEYS = [
  "superAdminId",
  "superAdmin_Id",
  "superAdminID",
  "SuperAdminId",
  "SuperAdmin_Id",
  "SuperAdminID",
  "id",
  "Id",
  "sub",
  "nameid",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier",
];

const JWT_EMPLOYEE_ID_KEYS = [
  "employeeId",
  "employee_Id",
  "employeeID",
  "EmployeeId",
  "Employee_Id",
  "EmployeeID",
  "empId",
  "EmpId",
  "id",
  "Id",
  "sub",
  "nameid",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier",
];

const JWT_ONBOARDING_ID_KEYS = [
  "onboardingId",
  "onboarding_Id",
  "onboardingID",
  "OnboardingId",
  "Onboarding_Id",
  "OnboardingID",
  "candidateOnboardingId",
  "CandidateOnboardingId",
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

export const decodeJwtPayload = (token) => {
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

const normalizeAuthPayload = (value) => {
  const parsedValue = tryParseJson(value);

  if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
    return parsedValue;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
};

const extractValueFromSource = (source, keys = []) => {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return "";
  }

  for (const key of keys) {
    const value = source[key];

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

const extractValueFromSources = (sources = [], keys = []) =>
  pickFirstNonEmptyValue(
    ...sources.map((source) => extractValueFromSource(source, keys))
  );

const getFirstObjectCandidate = (values = []) => {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return null;
};

const getNestedRoleSources = (source) => {
  if (!source || typeof source !== "object") {
    return [];
  }

  return [
    source,
    source.user,
    source.admin,
    source.employee,
    source.superAdmin,
    source.data,
    source.data?.user,
    source.data?.admin,
    source.data?.employee,
    source.data?.superAdmin,
    source.data?.data,
    source.data?.data?.user,
    source.data?.data?.admin,
    source.data?.data?.employee,
    source.data?.data?.superAdmin,
    source.result,
    source.result?.user,
    source.result?.admin,
    source.result?.employee,
    source.result?.superAdmin,
    source.payload,
    source.payload?.user,
    source.payload?.admin,
    source.payload?.employee,
    source.payload?.superAdmin,
    source.response,
    source.response?.user,
    source.response?.admin,
    source.response?.employee,
    source.response?.superAdmin,
    source.authUser,
    source.userData,
    source.userInfo,
    source.data?.authUser,
    source.data?.userData,
    source.data?.userInfo,
  ];
};

const extractAuthenticatedUserRecord = (payload = {}) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = getFirstObjectCandidate([
    payload.user,
    payload.admin,
    payload.employee,
    payload.superAdmin,
    payload.data?.user,
    payload.data?.admin,
    payload.data?.employee,
    payload.data?.superAdmin,
    payload.data,
    payload.authUser,
    payload.userData,
    payload.userInfo,
    payload,
  ]);

  return candidate;
};

const extractAuthToken = (payload = {}) => {
  const normalizedPayload = normalizeAuthPayload(payload);
  const user = extractAuthenticatedUserRecord(normalizedPayload);

  return pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(normalizedPayload),
        ...getNestedRoleSources(user),
      ],
      AUTH_TOKEN_KEYS
    )
  );
};

const extractRefreshToken = (payload = {}) => {
  const normalizedPayload = normalizeAuthPayload(payload);
  const user = extractAuthenticatedUserRecord(normalizedPayload);

  return pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(normalizedPayload),
        ...getNestedRoleSources(user),
      ],
      REFRESH_TOKEN_KEYS
    )
  );
};

const extractDisplayName = (payload = {}) => {
  const normalizedPayload = normalizeAuthPayload(payload);
  const user = extractAuthenticatedUserRecord(normalizedPayload);

  const userDisplayName = pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(normalizedPayload),
        ...getNestedRoleSources(user),
      ],
      JWT_DISPLAY_NAME_KEYS
    )
  );

  if (userDisplayName) {
    return userDisplayName;
  }

  const firstName = pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(normalizedPayload),
        ...getNestedRoleSources(user),
      ],
      ["firstName", "FirstName", "givenName", "GivenName"]
    )
  );
  const lastName = pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(normalizedPayload),
        ...getNestedRoleSources(user),
      ],
      ["lastName", "LastName", "surname", "Surname", "familyName", "FamilyName"]
    )
  );

  return pickFirstNonEmptyValue(
    [firstName, lastName].filter(Boolean).join(" ").trim(),
    extractValueFromSources(
      [
        ...getNestedRoleSources(normalizedPayload),
        ...getNestedRoleSources(user),
      ],
      JWT_EMAIL_KEYS
    )
  );
};

export const detectAuthenticatedRole = ({
  response,
  decodedToken,
  fallback = "",
} = {}) => {
  return extractRole(decodedToken, response?.data ?? response ?? {}, fallback);
};

export const extractAuthenticatedUser = (response = {}) => {
  const payload = normalizeAuthPayload(response?.data ?? response ?? {});
  const decodedToken = decodeJwtPayload(extractAuthToken(payload)) || {};
  const user = extractAuthenticatedUserRecord(payload) || {};
  const role = extractRole(decodedToken, payload);
  const email = extractEmail(decodedToken, payload);
  const adminId = extractAdminId(decodedToken, payload);
  const employeeId = extractEmployeeId(decodedToken, payload);
  const onboardingId = extractOnboardingId(decodedToken, payload);
  const superAdminId = pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(payload),
        ...getNestedRoleSources(user),
      ],
      JWT_SUPER_ADMIN_ID_KEYS
    ),
    adminId
  );
  const userId = extractUserId(decodedToken, payload);
  const id = pickFirstNonEmptyValue(
    adminId,
    superAdminId,
    employeeId,
    userId,
    onboardingId,
    extractValueFromSources(
      [
        ...getNestedRoleSources(payload),
        ...getNestedRoleSources(user),
      ],
      ["id", "Id", "sub", "nameid"]
    )
  );
  const displayName = extractDisplayName(payload);
  const token = extractAuthToken(payload);
  const refreshToken = extractRefreshToken(payload);

  return {
    id,
    role,
    email,
    token,
    refreshToken,
    user,
    displayName,
    adminId,
    employeeId,
    superAdminId,
    onboardingId,
    userId,
  };
};

export const extractRole = (
  decodedToken = {},
  responseData = {},
  fallback = ""
) => {
  const payload = normalizeAuthPayload(responseData);
  const user = extractAuthenticatedUserRecord(payload);
  const token = normalizeAuthPayload(decodedToken);

  const role = extractValueFromSources(
    [
      ...getNestedRoleSources(payload),
      ...getNestedRoleSources(user),
      ...getNestedRoleSources(token),
    ],
    JWT_ROLE_KEYS
  );

  return normalizeStoredRole(role || fallback);
};

export const extractEmail = (
  decodedToken = {},
  responseData = {},
  fallback = ""
) => {
  const payload = normalizeAuthPayload(responseData);
  const user = extractAuthenticatedUserRecord(payload);
  const token = normalizeAuthPayload(decodedToken);

  return pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(payload),
        ...getNestedRoleSources(user),
      ],
      JWT_EMAIL_KEYS
    ),
    extractValueFromSources(
      [
        ...getNestedRoleSources(token),
      ],
      JWT_EMAIL_KEYS
    ),
    fallback
  );
};

export const extractUserId = (
  decodedToken = {},
  responseData = {},
  fallback = ""
) => {
  const payload = normalizeAuthPayload(responseData);
  const user = extractAuthenticatedUserRecord(payload);
  const token = normalizeAuthPayload(decodedToken);

  return pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(payload),
        ...getNestedRoleSources(user),
      ],
      JWT_USER_ID_KEYS
    ),
    extractValueFromSources(
      [
        ...getNestedRoleSources(token),
      ],
      JWT_USER_ID_KEYS
    ),
    fallback
  );
};

export const extractAdminId = (
  decodedToken = {},
  responseData = {},
  fallback = ""
) => {
  const payload = normalizeAuthPayload(responseData);
  const user = extractAuthenticatedUserRecord(payload);
  const token = normalizeAuthPayload(decodedToken);

  return pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(payload),
        ...getNestedRoleSources(user),
      ],
      JWT_ADMIN_ID_KEYS
    ),
    extractValueFromSources(
      [
        ...getNestedRoleSources(token),
      ],
      JWT_ADMIN_ID_KEYS
    ),
    fallback
  );
};

export const extractEmployeeId = (
  decodedToken = {},
  responseData = {},
  fallback = ""
) => {
  const payload = normalizeAuthPayload(responseData);
  const user = extractAuthenticatedUserRecord(payload);
  const token = normalizeAuthPayload(decodedToken);

  return pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(payload),
        ...getNestedRoleSources(user),
      ],
      JWT_EMPLOYEE_ID_KEYS
    ),
    extractValueFromSources(
      [
        ...getNestedRoleSources(token),
      ],
      JWT_EMPLOYEE_ID_KEYS
    ),
    fallback
  );
};

export const extractOnboardingId = (
  decodedToken = {},
  responseData = {},
  fallback = ""
) => {
  const payload = normalizeAuthPayload(responseData);
  const user = extractAuthenticatedUserRecord(payload);
  const token = normalizeAuthPayload(decodedToken);

  return pickFirstNonEmptyValue(
    extractValueFromSources(
      [
        ...getNestedRoleSources(payload),
        ...getNestedRoleSources(user),
      ],
      JWT_ONBOARDING_ID_KEYS
    ),
    extractValueFromSources(
      [
        ...getNestedRoleSources(token),
      ],
      JWT_ONBOARDING_ID_KEYS
    ),
    fallback
  );
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

const getStoredJsonRecord = (key) => {
  const parsedRecord = tryParseJson(getStoredAuthValue(key));

  return parsedRecord && typeof parsedRecord === "object"
    ? parsedRecord
    : null;
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

const ADMIN_PERMISSION_STORAGE_KEYS = [
  "adminPermissions",
  "allowedModules",
  "modules",
  "permissions",
];

const EMPLOYEE_PERMISSION_STORAGE_KEYS = [
  "employeePermissions",
  "employeeAllowedModules",
  "employeeModules",
  "employeePermissionModules",
];

const GENERIC_PERMISSION_STORAGE_KEYS = [
  "permissions",
  "modules",
  "allowedModules",
];

const getPermissionScopeForRole = (roleValue = "") => {
  const normalizedRole = normalizeStoredRole(roleValue);

  if (["admin", "superadmin"].includes(normalizedRole)) {
    return "admin";
  }

  if (["employee", "user"].includes(normalizedRole)) {
    return "employee";
  }

  return "";
};

const getPermissionStorageKeysForScope = (scope = "") => {
  if (scope === "employee") {
    return EMPLOYEE_PERMISSION_STORAGE_KEYS;
  }

  return ADMIN_PERMISSION_STORAGE_KEYS;
};

const extractStoredPermissionList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const nestedCandidates = [
    value.allowedModules,
    value.AllowedModules,
    value.modules,
    value.Modules,
    value.permissions,
    value.Permissions,
    value.data,
    value.Data,
    value.$values,
    value.data?.allowedModules,
    value.data?.AllowedModules,
    value.data?.modules,
    value.data?.Modules,
    value.data?.permissions,
    value.data?.Permissions,
    value.data?.data,
    value.data?.Data,
    value.data?.$values,
    value.data?.data?.allowedModules,
    value.data?.data?.AllowedModules,
    value.data?.data?.modules,
    value.data?.data?.Modules,
    value.data?.data?.permissions,
    value.data?.data?.Permissions,
    value.data?.data?.$values,
  ];

  for (const candidate of nestedCandidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return null;
};

const extractStoredPermissionSnapshot = (value) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return {
      adminId: "",
      adminEmail: "",
      modules: value,
    };
  }

  if (typeof value !== "object") {
    return null;
  }

  const modules = extractStoredPermissionList(value) || [];

  return {
    adminId: pickFirstNonEmptyValue(
      value.adminId,
      value.AdminId,
      value.adminID,
      value.data?.adminId,
      value.data?.AdminId,
      value.data?.adminID
    ),
    adminEmail: pickFirstNonEmptyValue(
      value.adminEmail,
      value.AdminEmail,
      value.email,
      value.Email,
      value.data?.adminEmail,
      value.data?.AdminEmail,
      value.data?.email,
      value.data?.Email
    ),
    modules,
  };
};

const extractStoredEmployeePermissionSnapshot = (value) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return {
      userId: "",
      userEmail: "",
      modules: value,
    };
  }

  if (typeof value !== "object") {
    return null;
  }

  const modules = extractStoredPermissionList(value) || [];

  return {
    userId: pickFirstNonEmptyValue(
      value.userId,
      value.UserId,
      value.employeeId,
      value.EmployeeId,
      value.employeeID,
      value.data?.userId,
      value.data?.UserId,
      value.data?.employeeId,
      value.data?.EmployeeId,
      value.data?.employeeID
    ),
    userEmail: pickFirstNonEmptyValue(
      value.userEmail,
      value.UserEmail,
      value.employeeEmail,
      value.EmployeeEmail,
      value.email,
      value.Email,
      value.data?.userEmail,
      value.data?.UserEmail,
      value.data?.employeeEmail,
      value.data?.EmployeeEmail,
      value.data?.email,
      value.data?.Email
    ),
    modules,
  };
};

const readStoredPermissionSnapshot = (storageKeys, extractor) => {
  const storage = getActiveAuthStorage();
  const otherStorage = storage === sessionStorage ? localStorage : sessionStorage;
  const storages = [storage, otherStorage];

  for (const store of storages) {
    if (!store) {
      continue;
    }

    for (const key of storageKeys) {
      const storedValue = store.getItem(key);

      if (storedValue === null) {
        continue;
      }

      try {
        const parsedValue = JSON.parse(storedValue);
        const snapshot = extractor(parsedValue);

        if (snapshot) {
          return snapshot;
        }
      } catch {
        // Keep looking in the next storage/key pair.
      }
    }
  }

  return null;
};

const readStoredPermissionSnapshotWithFallback = (storageKeys, extractor) => {
  const snapshot = readStoredPermissionSnapshot(storageKeys, extractor);

  if (snapshot) {
    return snapshot;
  }

  return readStoredPermissionSnapshot(GENERIC_PERMISSION_STORAGE_KEYS, extractor);
};

export const getStoredAdminPermissionSnapshot = () => {
  return readStoredPermissionSnapshotWithFallback(
    ADMIN_PERMISSION_STORAGE_KEYS,
    extractStoredPermissionSnapshot
  );
};

export const getStoredEmployeePermissionSnapshot = () => {
  return readStoredPermissionSnapshotWithFallback(
    EMPLOYEE_PERMISSION_STORAGE_KEYS,
    extractStoredEmployeePermissionSnapshot
  );
};

const readStoredPermissionsFromKeys = (storageKeys = []) => {
  const storage = getActiveAuthStorage();
  const otherStorage = storage === sessionStorage ? localStorage : sessionStorage;
  const storages = [storage, otherStorage];

  for (const store of storages) {
    if (!store) {
      continue;
    }

    for (const key of storageKeys) {
      const storedValue = store.getItem(key);

      if (storedValue === null) {
        continue;
      }

      try {
        const parsedValue = JSON.parse(storedValue);
        const permissions = extractStoredPermissionList(parsedValue);

        if (Array.isArray(permissions)) {
          return permissions;
        }
      } catch {
        // Keep looking in the next storage/key pair.
      }
    }
  }

  return [];
};

export const persistAdminPermissions = (snapshot = {}) => {
  const normalizedSnapshot = extractStoredPermissionSnapshot(snapshot) || {
    adminId: "",
    adminEmail: "",
    modules: [],
  };

  const serializedSnapshot = JSON.stringify(normalizedSnapshot);
  const serializedModules = JSON.stringify(Array.isArray(normalizedSnapshot.modules) ? normalizedSnapshot.modules : []);

  getStorageTargets().forEach((storage) => {
    storage.setItem("adminPermissions", serializedSnapshot);
    storage.setItem("allowedModules", serializedModules);
    storage.setItem("modules", serializedModules);
    storage.setItem("permissions", serializedModules);

    if (normalizedSnapshot.adminId) {
      storage.setItem("adminId", normalizedSnapshot.adminId);
    }

    if (normalizedSnapshot.adminEmail) {
      storage.setItem("adminEmail", normalizedSnapshot.adminEmail);
    }
  });

  return normalizedSnapshot;
};

export const persistEmployeePermissions = (snapshot = {}) => {
  const normalizedSnapshot = extractStoredEmployeePermissionSnapshot(snapshot) || {
    userId: "",
    userEmail: "",
    modules: [],
  };

  const serializedSnapshot = JSON.stringify(normalizedSnapshot);
  const serializedModules = JSON.stringify(
    Array.isArray(normalizedSnapshot.modules) ? normalizedSnapshot.modules : []
  );

  getStorageTargets().forEach((storage) => {
    storage.setItem("employeePermissions", serializedSnapshot);
    storage.setItem("employeeAllowedModules", serializedModules);
    storage.setItem("employeeModules", serializedModules);
    storage.setItem("employeePermissionModules", serializedModules);
  });

  return normalizedSnapshot;
};

export const clearEmployeePermissionCache = () => {
  if (typeof window === "undefined") {
    return;
  }

  const storages = [window.localStorage, window.sessionStorage].filter(Boolean);

  storages.forEach((storage) => {
    EMPLOYEE_PERMISSION_STORAGE_KEYS.forEach((key) => {
      storage.removeItem(key);
    });

    storage.removeItem("userId");
    storage.removeItem("userEmail");
    storage.removeItem("employeeId");
    storage.removeItem("employeeEmail");
  });
};

const hasPermissionCacheKey = (storage, storageKeys = ADMIN_PERMISSION_STORAGE_KEYS) =>
  storageKeys.some((key) => storage?.getItem(key) !== null);

export const getStoredJwtPayload = () => decodeJwtPayload(getStoredToken());

export const getStoredJwtRole = () =>
  getValueFromRecord(getStoredJwtPayload(), JWT_ROLE_KEYS);

export const getStoredUserRecord = () => {
  for (const key of JSON_STORAGE_KEYS) {
    const record = getStoredJsonRecord(key);

    if (record) {
      return record;
    }
  }

  return null;
};

export const getAuthenticatedUserSnapshot = () => {
  const token = getStoredToken();
  const refreshToken = getStoredRefreshToken();
  const payload = getStoredJwtPayload() || {};
  const user = getStoredUserRecord();
  const storedRole = getStoredRole();
  const storedRoleName = getStoredRoleName();
  const adminId = getStoredAdminId();
  const adminEmail = getStoredAdminEmail();
  const superAdminId = getStoredAuthValue("superAdminId");
  const userId = getStoredUserId();

  const resolvedRole = normalizeStoredRole(
    storedRole ||
      getStoredRoles()[0] ||
      getStoredValueFromSources(ROLE_KEYS) ||
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/name"]
  );

  return {
    token,
    payload,
    user:
      user ||
      payload?.user ||
      payload?.admin ||
      payload?.employee ||
      payload?.superAdmin ||
      payload?.data ||
      payload?.authUser ||
      payload?.userData ||
      null,
    role: resolvedRole,
    roleName: storedRoleName || getStoredRoles()[0] || resolvedRole || "",
    roles: getStoredRoles(),
    id: userId || adminId || superAdminId || "",
    adminId,
    adminEmail,
    superAdminId,
    refreshToken,
    isAuthenticated: Boolean(token),
    isReady:
      Boolean(token) &&
      Boolean(resolvedRole || storedRoleName || user || Object.keys(payload).length > 0),
  };
};

export const getAuthStorage = (rememberMe) =>
  rememberMe ? localStorage : sessionStorage;

const getStorageTargets = () => {
  if (typeof window === "undefined") {
    return [];
  }

  return [window.localStorage, window.sessionStorage].filter(Boolean);
};

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
  clearCurrentAdminAllowedModules();
};

export const getStoredAuthValue = (key, fallback = "") =>
  sessionStorage.getItem(key) || localStorage.getItem(key) || fallback;

const normalizeAuthTokenValue = (value) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue
    .replace(/^Bearer\s+/i, "")
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
};

export const normalizeAuthToken = (value) => normalizeAuthTokenValue(value);

export const getStoredToken = () =>
  normalizeAuthTokenValue(
    getStoredAuthValue("token") ||
      getStoredAuthValue("authToken") ||
      getStoredAuthValue("jwtToken")
  );

export const getStoredRefreshToken = () =>
  getStoredAuthValue("refreshToken") ||
  getStoredAuthValue("RefreshToken") ||
  getStoredAuthValue("refresh_token");

const normalizeStoredRoles = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (normalized) {
      return [normalized];
    }
  }

  return [];
};

export const getStoredRoles = () =>
  normalizeStoredRoles(
    tryParseJson(getStoredAuthValue("roles")) || getStoredAuthValue("roles")
  );

export const getStoredRole = () =>
  normalizeStoredRole(
    getStoredValueFromSources(ROLE_KEYS) ||
      getStoredRoles()[0] ||
      getStoredJwtRole() ||
      getStoredAuthValue("role")
  );

export const getStoredRoleName = () =>
  pickFirstNonEmptyValue(
    getStoredAuthValue("roleName"),
    getStoredRoles()[0],
    getStoredValueFromSources(ROLE_KEYS),
    getStoredJwtRole(),
    getStoredAuthValue("role")
  );

export const getStoredPermissions = (roleHint = "") => {
  const resolvedRole =
    roleHint ||
    getStoredRole() ||
    getStoredRoleName() ||
    getStoredJwtRole() ||
    "";
  const storage = getActiveAuthStorage();
  const otherStorage = storage === sessionStorage ? localStorage : sessionStorage;
  const storages = [storage, otherStorage].filter(Boolean);
  const storageScope = getPermissionScopeForRole(resolvedRole);
  const storageKeys = storageScope
    ? getPermissionStorageKeysForScope(storageScope)
    : ADMIN_PERMISSION_STORAGE_KEYS;

  console.log("[authStorage] getStoredPermissions", {
    roleHint,
    resolvedRole,
    storageScope: storageScope || "unscoped",
    storageKeys,
  });
  const scopedPermissions = readStoredPermissionsFromKeys(storageKeys);

  if (scopedPermissions.length > 0) {
    console.log("[authStorage] getStoredPermissions resolved scoped permissions", {
      resolvedRole,
      storageScope: storageScope || "unscoped",
      permissionCount: scopedPermissions.length,
    });
    return scopedPermissions;
  }

  const fallbackPermissions = readStoredPermissionsFromKeys(GENERIC_PERMISSION_STORAGE_KEYS);

  if (fallbackPermissions.length > 0) {
    console.log("[authStorage] getStoredPermissions resolved generic permissions", {
      resolvedRole,
      permissionCount: fallbackPermissions.length,
    });
    return fallbackPermissions;
  }

  if (!storageScope) {
    const fallbackScopes = ["admin", "employee"];

    console.log("[authStorage] getStoredPermissions entering fallback scope search", {
      resolvedRole,
      fallbackScopes,
    });

    for (const fallbackScope of fallbackScopes) {
      const fallbackKeys = getPermissionStorageKeysForScope(fallbackScope);

      for (const store of storages) {
        if (!store) {
          continue;
        }

        for (const key of fallbackKeys) {
          const storedValue = store.getItem(key);

          if (storedValue === null) {
            continue;
          }

          try {
            const parsedValue = JSON.parse(storedValue);
            const permissions = extractStoredPermissionList(parsedValue);

            if (Array.isArray(permissions)) {
              return permissions;
            }
          } catch {
            // Keep looking in the next storage/key pair.
          }
        }
      }
    }
  }

  return [];
};

export const hasStoredPermissionsCache = (roleHint = "") => {
  const storage = getActiveAuthStorage();
  const otherStorage = storage === sessionStorage ? localStorage : sessionStorage;
  const storageScope = getPermissionScopeForRole(
    roleHint || getStoredRole() || getStoredRoleName() || getStoredJwtRole() || ""
  );
  const storageKeys = storageScope
    ? getPermissionStorageKeysForScope(storageScope)
    : ADMIN_PERMISSION_STORAGE_KEYS;

  return (
    hasPermissionCacheKey(storage, storageKeys) ||
    hasPermissionCacheKey(otherStorage, storageKeys) ||
    hasPermissionCacheKey(storage, GENERIC_PERMISSION_STORAGE_KEYS) ||
    hasPermissionCacheKey(otherStorage, GENERIC_PERMISSION_STORAGE_KEYS) ||
    (!storageScope &&
      (hasPermissionCacheKey(storage, EMPLOYEE_PERMISSION_STORAGE_KEYS) ||
        hasPermissionCacheKey(otherStorage, EMPLOYEE_PERMISSION_STORAGE_KEYS)))
  );
};

export const getStoredEmployeeId = () =>
  getStoredValueFromSources(EMPLOYEE_ID_KEYS) ||
  getStoredUserId() ||
  getStoredAttendanceId();

export const getStoredEmployeeEmail = () =>
  pickFirstNonEmptyValue(
    getStoredAuthValue("employeeEmail"),
    getStoredAuthValue("userEmail"),
    getStoredAuthValue("email")
  );

export const getStoredOnboardingId = () =>
  getStoredValueFromSources(ONBOARDING_ID_KEYS);

export const isStoredOnboardingUser = () => {
  const explicitValue = String(getStoredAuthValue("isOnboardingUser") || "")
    .trim()
    .toLowerCase();

  if (["true", "1", "yes"].includes(explicitValue)) {
    return true;
  }

  const roleValue = String(getStoredRoleName() || getStoredRole() || "")
    .trim()
    .toLowerCase();

  return Boolean(getStoredOnboardingId()) || roleValue === "onboarding";
};

export const getStoredUserId = () =>
  getStoredValueFromSources(USER_ID_KEYS);

export const getStoredAdminId = () =>
  getStoredValueFromSources(ADMIN_ID_KEYS) ||
  getStoredUserId() ||
  getStoredEmployeeId();

export const getStoredAdminEmail = () =>
  getStoredAuthValue("adminEmail");

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
