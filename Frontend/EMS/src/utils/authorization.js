import {
  getStoredRole,
  getStoredRoleName,
} from "./authStorage";

const normalizeRoleValue = (value) =>
  String(value ?? "").trim().toLowerCase();

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

export const normalizePermissionList = (data) => {
  const list =
    data?.data?.$values ||
    data?.data ||
    data?.$values ||
    data ||
    [];

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((item) => {
      if (typeof item === "string") {
        return {
          moduleName: item.trim(),
          canAccess: true,
        };
      }

      return {
        moduleId: item?.moduleId ?? item?.ModuleId,
        moduleName: String(
          item?.moduleName ?? item?.ModuleName ?? ""
        ).trim(),
        canAccess: item?.canAccess ?? item?.CanAccess ?? true,
      };
    })
    .filter(
      (item) =>
        item.moduleName &&
        (item.canAccess ?? true) !== false
    );
};

export const getUserRole = () => normalizeRoleValue(getStoredRole());

export const getUserRoleName = () =>
  normalizeRoleValue(getStoredRoleName());

export const isAdmin = (value) => {
  if (value !== undefined) {
    return normalizeRoleValue(value) === "admin";
  }

  return (
    getUserRole() === "admin" ||
    getUserRoleName() === "admin"
  );
};

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

export const isEmployee = () => hasRole("employee");

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

export const hasExpiredTokenMessage = (data) =>
  /token\s+expired|session\s+expired|expired\s+token|jwt\s+expired/i.test(
    getAuthErrorMessage(data)
  );

export const hasAuthenticationFailureMessage = (data) =>
  /unauthori[sz]ed|authentication|auth\s+failed|invalid\s+token|token\s+invalid|access\s+token|bearer\s+token|login\s+required|sign\s*in|credentials?/i.test(
    getAuthErrorMessage(data)
  );

export const isAuthenticationFailureResponse = (status, data) =>
  status === 401 ||
  hasExpiredTokenMessage(data);
