import {
  isStoredOnboardingUser,
  getStoredRole,
  getStoredRoleName,
  getStoredLoginType,
  getStoredPermissions,
  getStoredAuthValue,
  getStoredEmployeeId,
  getStoredUserId,
} from "./authStorage";
import { getCurrentAdminAllowedModules } from "./adminPermissionState";
import { ticketPermissionMatches } from "../TicketManagement/ticketConfig";
import { toBoolean } from "./boolean";

const normalizeRoleValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const getAuthErrorMessage = (data) => {
  if (typeof data === "string") {
    return data;
  }

  return [
    data?.message,
    data?.error,
    data?.title,
    data?.detail,
    data?.exceptionMessage,
  ]
    .filter(Boolean)
    .join(" ");
};

export const normalizeRole = normalizeRoleValue;

const extractPermissionCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidates = [
    payload.modules,
    payload.Modules,
    payload.permissions,
    payload.Permissions,
    payload.allowedModules,
    payload.AllowedModules,
    payload.data,
    payload.Data,
    payload.$values,
    payload.data?.modules,
    payload.data?.Modules,
    payload.data?.permissions,
    payload.data?.Permissions,
    payload.data?.allowedModules,
    payload.data?.AllowedModules,
    payload.data?.data,
    payload.data?.Data,
    payload.data?.$values,
    payload.data?.data?.modules,
    payload.data?.data?.Modules,
    payload.data?.data?.permissions,
    payload.data?.data?.Permissions,
    payload.data?.data?.allowedModules,
    payload.data?.data?.AllowedModules,
    payload.data?.data?.$values,
    payload.user?.modules,
    payload.user?.Modules,
    payload.user?.permissions,
    payload.user?.Permissions,
    payload.admin?.modules,
    payload.admin?.Modules,
    payload.admin?.permissions,
    payload.admin?.Permissions,
    payload.superAdmin?.modules,
    payload.superAdmin?.Modules,
    payload.superAdmin?.permissions,
    payload.superAdmin?.Permissions,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const nestedCollection = extractPermissionCollection(candidate);

      if (nestedCollection.length > 0) {
        return nestedCollection;
      }
    }
  }

  return [];
};

export const normalizePermissionList = (data) => {
  const list = extractPermissionCollection(data);

  return list
    .map((item) => {
      if (typeof item === "string") {
        return {
          moduleName: item.trim(),
          canAccess: true,
        };
      }

      const permissionId = item?.permissionId ?? item?.PermissionId ?? item?.id ?? item?.Id;
      const screenId = item?.screenId ?? item?.ScreenId ?? item?.moduleId ?? item?.ModuleId;
      const moduleId = item?.moduleId ?? item?.ModuleId ?? item?.screenId ?? item?.ScreenId;
      const canView = toBoolean(item?.canView ?? item?.CanView ?? false);
      const canAdd = toBoolean(item?.canAdd ?? item?.CanAdd ?? false);
      const canEdit = toBoolean(item?.canEdit ?? item?.CanEdit ?? false);
      const canDelete = toBoolean(item?.canDelete ?? item?.CanDelete ?? false);
      const canUpload = toBoolean(item?.canUpload ?? item?.CanUpload ?? item?.upload ?? item?.Upload ?? false);
      const canDownload = toBoolean(item?.canDownload ?? item?.CanDownload ?? item?.download ?? item?.Download ?? false);
      const canSubmit = toBoolean(item?.canSubmit ?? item?.CanSubmit ?? item?.submit ?? item?.Submit ?? false);
      const canApprove = toBoolean(item?.canApprove ?? item?.CanApprove ?? item?.approve ?? item?.Approve ?? false);
      const derivedAccess =
        canView || canAdd || canEdit || canDelete || canUpload || canDownload || canSubmit || canApprove;

      return {
        permissionId,
        screenId,
        moduleId,
        moduleName: String(
          item?.moduleName ?? item?.ModuleName ?? ""
        ).trim(),
        type: String(item?.type ?? item?.Type ?? item?.moduleType ?? item?.ModuleType ?? "").trim(),
        canView,
        canAdd,
        canEdit,
        canDelete,
        canUpload,
        canDownload,
        canSubmit,
        canApprove,
        canAccess:
          derivedAccess ||
          toBoolean(item?.canAccess ?? item?.CanAccess ?? false),
      };
    })
    .filter((item) => item.moduleName);
};

export const getUserRole = () => normalizeRoleValue(getStoredRole());

export const getUserRoleName = () =>
  normalizeRoleValue(getStoredRoleName());

export const isAdmin = (value) => {
  if (value !== undefined) {
    return normalizeRoleValue(value) === "admin";
  }

  const loginType = normalizeRoleValue(getStoredLoginType());

  if (loginType === "admin") {
    return true;
  }

  if (loginType === "superadmin" || loginType === "user" || loginType === "onboarding") {
    return false;
  }

  return (
    getUserRole() === "admin" ||
    getUserRoleName() === "admin"
  );
};

export const isSuperAdmin = (value) => {
  const superAdminRoles = new Set(["superadmin"]);

  if (value !== undefined) {
    return superAdminRoles.has(normalizeRoleValue(value));
  }

  const loginType = normalizeRoleValue(getStoredLoginType());

  if (superAdminRoles.has(loginType)) {
    return true;
  }

  if (loginType === "admin" || loginType === "user" || loginType === "onboarding") {
    return false;
  }

  const explicitFlag = String(getStoredAuthValue("isSuperAdmin") || "")
    .trim()
    .toLowerCase();

  if (["true", "1", "yes"].includes(explicitFlag)) {
    return true;
  }

  return (
    superAdminRoles.has(getUserRole()) ||
    superAdminRoles.has(getUserRoleName()) ||
    superAdminRoles.has(normalizeRoleValue(getStoredAuthValue("userType")))
  );
};

export const isPlatformAdmin = (value) =>
  value !== undefined ? isAdmin(value) || isSuperAdmin(value) : isAdmin() || isSuperAdmin();

export const hasRole = (...roles) => {
  const normalizedRoles = roles
    .flat()
    .map(normalizeRoleValue)
    .filter(Boolean);

  if (normalizedRoles.length === 0) {
    return false;
  }

  const activeRoles = [getUserRole(), getUserRoleName()].filter(Boolean);

  return activeRoles.some((role) =>
    normalizedRoles.includes(role)
  );
};

export const isEmployee = (value) => {
  if (value !== undefined) {
    const normalizedRole = normalizeRoleValue(value);
    return (
      normalizedRole === "employee" ||
      normalizedRole === "user" ||
      normalizedRole === "manager"
    );
  }

  return hasRole("employee", "user", "manager");
};

export const isEmployeeUser = () => isEmployee();

export const isOnboardingUser = () =>
  isStoredOnboardingUser() || hasRole("onboarding", "candidate");

export const isRolePermissionRole = (value) => {
  const normalizedRole =
    value !== undefined
      ? normalizeRoleValue(value)
      : normalizeRoleValue(getUserRole() || getUserRoleName() || "");

  if (!normalizedRole) {
    return false;
  }

  return ![
    "admin",
    "administrator",
    "superadmin",
    "superadministrator",
    "employee",
    "user",
    "manager",
    "onboarding",
    "candidate",
  ].includes(normalizedRole);
};

const normalizeModuleName = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const MODULE_PERMISSION_ALIASES = new Map([
  ["offerletters", "offerletters"],
  ["offerletter", "offerletters"],
  ["viewpurpose", "offerletters"],
]);

const normalizeModulePermissionName = (value) => {
  const normalized = normalizeModuleName(value);

  if (!normalized) {
    return "";
  }

  return MODULE_PERMISSION_ALIASES.get(normalized) || normalized;
};

export const modulePermissionMatches = (permissionModule, requestedModule) => {
  const storedModule = normalizeModulePermissionName(permissionModule);
  const targetModule = normalizeModulePermissionName(requestedModule);

  if (!storedModule || !targetModule) {
    return false;
  }

  if (storedModule === "all") {
    return true;
  }

  return storedModule === targetModule;
};

const matchesModulePermission = (permission, moduleName) => {
  const permissionModule = permission?.moduleName ?? permission?.ModuleName ?? "";

  if (!permissionModule || !String(moduleName ?? "").trim()) {
    return false;
  }

  return (
    modulePermissionMatches(permissionModule, moduleName) ||
    ticketPermissionMatches(permissionModule, moduleName)
  );
};

const findPermissionForModule = (permissions = [], moduleName) =>
  Array.isArray(permissions)
    ? permissions.find((permission) => matchesModulePermission(permission, moduleName)) || null
    : null;

export const hasModulePermission = (moduleName, action = "canAccess") => {
  const activeRole = getUserRole() || getUserRoleName();
  const loginType = getStoredLoginType();
  const superAdminRole = isSuperAdmin();
  const onboardingRole = isOnboardingUser();
  const adminPermissionRole =
    loginType === "admin" || (!loginType && isAdmin(activeRole));
  const userRole = activeRole || loginType || "";
  const userId = getStoredUserId() || "";
  const employeeId = getStoredEmployeeId() || "";
  const permissions =
    superAdminRole || adminPermissionRole
      ? getCurrentAdminAllowedModules()
      : getStoredPermissions(activeRole);
  const permissionFound = findPermissionForModule(permissions, moduleName);
  const canView = Boolean(
    permissionFound?.canView ??
      permissionFound?.CanView ??
      false
  );
  const accessGranted = superAdminRole
    ? true
    : onboardingRole
      ? false
      : Array.isArray(permissions) &&
        permissions.length > 0 &&
        permissions.some((permission) => {
          const permissionModule = permission.moduleName ?? permission.ModuleName;

          if (
            !modulePermissionMatches(permissionModule, moduleName) &&
            !ticketPermissionMatches(permissionModule, moduleName)
          ) {
            return false;
          }

          const canAccess =
            permission.canAccess ??
            permission.CanAccess ??
            permission.canView ??
            permission.CanView ??
            true;

          if (canAccess !== true) {
            return false;
          }

          if (!action || action === "canAccess") {
            return true;
          }

          return (
            permission[action] ??
            permission[action[0].toUpperCase() + action.slice(1)] ??
            canAccess
          ) === true;
        });

  if (superAdminRole) {
    return true;
  }

  if (onboardingRole) {
    return false;
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }

  return accessGranted;
};

export const hasPermission = (moduleName, action = "canAccess") =>
  hasModulePermission(moduleName, action);

export const hasViewPermission = (moduleName) =>
  hasModulePermission(moduleName, "canView");

export const hasAddPermission = (moduleName) =>
  hasModulePermission(moduleName, "canAdd");

export const hasEditPermission = (moduleName) =>
  hasModulePermission(moduleName, "canEdit");

export const hasDeletePermission = (moduleName) =>
  hasModulePermission(moduleName, "canDelete");

export const hasUploadPermission = (moduleName) =>
  hasModulePermission(moduleName, "canUpload");

export const hasDownloadPermission = (moduleName) =>
  hasModulePermission(moduleName, "canDownload");

export const hasSubmitPermission = (moduleName) =>
  hasModulePermission(moduleName, "canSubmit");

export const hasApprovePermission = (moduleName) =>
  hasModulePermission(moduleName, "canApprove");

export const hasAccessPermission = (moduleName) =>
  hasModulePermission(moduleName, "canAccess");

export const resolveAuthRole = (roleValue, fallback = "") => {
  const normalizedRole = normalizeRoleValue(roleValue);

  if (normalizedRole) {
    return normalizedRole;
  }

  const storedRole = getUserRole();
  if (storedRole) {
    return storedRole;
  }

  const storedRoleName = getUserRoleName();
  if (storedRoleName) {
    return storedRoleName;
  }

  return normalizeRoleValue(fallback);
};

export const normalizeLoginRole = (roleValue = "", fallback = "") => {
  const normalizedRole = normalizeRoleValue(roleValue);

  if (["employee", "user", "manager"].includes(normalizedRole)) {
    return "user";
  }

  if (["superadmin", "superadministrator"].includes(normalizedRole)) {
    return "superadmin";
  }

  if (["admin", "administrator"].includes(normalizedRole)) {
    return "admin";
  }

  return normalizedRole || normalizeRoleValue(fallback);
};

export const getDashboardPathForRole = (roleValue = "") => {
  const normalizedRole = normalizeLoginRole(roleValue, "");

  if (normalizedRole === "superadmin") {
    return "/dashboard";
  }

  if (normalizedRole === "admin") {
    return "/admin/dashboard";
  }

  return "/dashboard";
};

export const hasExpiredTokenMessage = (data) =>
  /token\s+expired|session\s+expired|expired\s+token|jwt\s+expired/i.test(
    getAuthErrorMessage(data)
  );

export const hasAuthenticationFailureMessage = (data) =>
  /invalid\s+token|token\s+invalid|access\s+token|bearer\s+token|token\s+expired|expired\s+token|jwt\s+expired|session\s+expired/i.test(
    getAuthErrorMessage(data)
  );

export const isAuthenticationFailureResponse = (status, data) => {
  if (status === 401) {
    return true;
  }

  if (status === 403) {
    return false;
  }

  return (
    hasExpiredTokenMessage(data) ||
    hasAuthenticationFailureMessage(data)
  );
};
