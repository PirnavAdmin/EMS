import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { isEmployee, normalizePermissionList } from "../utils/authorization";
import {
  clearEmployeePermissionCache,
  getStoredEmployeeEmail,
  getStoredEmployeeId,
  getStoredEmployeePermissionSnapshot,
  getStoredRole,
  getStoredRoleName,
  getStoredUserRecord,
  persistEmployeePermissions } from
"../utils/authStorage";
import {
  logApiError,
  logPermissionCollection,
  sanitizeForDebug,
  summarizeAxiosResponse } from
"../utils/debugLogging";

const normalizeId = (value) => String(value ?? "").trim();

const getEmployeePermissionEndpoint = (employeeId = "") => {
  const normalizedEmployeeId = normalizeId(employeeId || getStoredEmployeeId() || "");

  if (!normalizedEmployeeId) {
    return "";
  }

  return API_ENDPOINTS.userPermission.get(normalizedEmployeeId) || "";
};

const resolveLoggedInRole = (role = "") =>
String(role || getStoredRoleName() || getStoredRole() || "").trim();

const resolvePermissionFlow = (role = "") => {
  const normalizedRole = String(role ?? "").
  trim().
  toLowerCase().
  replace(/[\s_-]+/g, "");

  if (["employee", "user", "manager"].includes(normalizedRole)) {
    return "role-permission";
  }

  if (normalizedRole === "superadmin") {
    return "superadmin-bypass";
  }

  return "no-permission-api";
};

const normalizeEmployeePermissionSnapshot = (payload = {}, fallback = {}) => {
  const response = payload?.data ?? payload ?? {};

  return {
    userId: normalizeId(
      response.userId ??
      response.UserId ??
      response.employeeId ??
      response.EmployeeId ??
      response.employeeID ??
      response.data?.userId ??
      response.data?.UserId ??
      response.data?.employeeId ??
      response.data?.EmployeeId ??
      response.data?.employeeID ??
      fallback.userId ??
      getStoredEmployeeId() ??
      ""
    ),
    userEmail: String(
      response.userEmail ??
      response.UserEmail ??
      response.employeeEmail ??
      response.EmployeeEmail ??
      response.email ??
      response.Email ??
      response.data?.userEmail ??
      response.data?.UserEmail ??
      response.data?.employeeEmail ??
      response.data?.EmployeeEmail ??
      response.data?.email ??
      response.data?.Email ??
      fallback.userEmail ??
      getStoredEmployeeEmail() ??
      ""
    ).trim(),
    modules: normalizePermissionList(response)
  };
};

const getCachedEmployeePermissionSnapshot = () => {
  const snapshot = getStoredEmployeePermissionSnapshot();

  if (snapshot && Array.isArray(snapshot.modules) && snapshot.modules.length > 0) {
    return snapshot;
  }

  const storedUser = getStoredUserRecord();

  if (storedUser) {
    const normalizedUserSnapshot = normalizeEmployeePermissionSnapshot(storedUser);

    if (Array.isArray(normalizedUserSnapshot.modules) && normalizedUserSnapshot.modules.length > 0) {
      return persistEmployeePermissions({
        userId: normalizedUserSnapshot.userId || getStoredEmployeeId() || "",
        userEmail: normalizedUserSnapshot.userEmail || getStoredEmployeeEmail() || "",
        modules: normalizedUserSnapshot.modules
      });
    }
  }

  return null;
};

const getFriendlyEmployeePermissionErrorMessage = (
error,
fallback = "We could not load employee permissions right now.") =>
{
  const status = error?.response?.status;
  const validationErrors = error?.response?.data?.errors;

  if (status === 401) {
    return "Your session has expired or you are no longer authorized. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to access this resource.";
  }

  if (validationErrors && typeof validationErrors === "object") {
    const messages = Object.values(validationErrors).
    flat().
    filter(Boolean).
    map((message) => String(message).trim()).
    filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.title ||
    error?.message ||
    fallback);

};

const isAuthFailure = (error) =>
error?.response?.status === 401 ||
error?.name === "CanceledError" ||
error?.code === "ERR_CANCELED" ||
/session\s+expired|sign\s*in|token\s+expired|expired\s+token/i.test(
  String(error?.message || "")
);

const requestAllowedModules = async ({
  force = false,
  userId = "",
  userEmail = "",
  role = ""
} = {}) => {
  const loggedInRole = resolveLoggedInRole(role);
  const permissionFlow = resolvePermissionFlow(loggedInRole);
  const resolvedEmployeeId = normalizeId(userId || getStoredEmployeeId() || "");
  const endpoint = getEmployeePermissionEndpoint(resolvedEmployeeId);
  const normalizedRole = String(loggedInRole ?? "").
  trim().
  toLowerCase().
  replace(/[\s_-]+/g, "");
  console.log("[PERMISSION] Permission Flow:", permissionFlow);
  console.log("[PERMISSION] Normalized Role:", normalizedRole);

  if (!isEmployee(loggedInRole)) {
    return persistEmployeePermissions({
      userId: getStoredEmployeeId() || "",
      userEmail: getStoredEmployeeEmail() || "",
      modules: []
    });
  }

  if (!resolvedEmployeeId) {

    return persistEmployeePermissions({
      userId: getStoredEmployeeId() || "",
      userEmail: getStoredEmployeeEmail() || "",
      modules: []
    });
  }

  if (!force) {
    const cached = getCachedEmployeePermissionSnapshot();

    if (cached) {
      return cached;
    }
  }

  if (!endpoint) {
    const emptySnapshot = persistEmployeePermissions({
      userId: getStoredEmployeeId() || "",
      userEmail: getStoredEmployeeEmail() || "",
      modules: []
    });

    return emptySnapshot;
  }

  try {
    console.log("========== MODULE PERMISSION START ==========");
    console.log("[PERMISSION] Current User ID:", resolvedEmployeeId || getStoredEmployeeId() || "");
    console.log("[PERMISSION] Current Employee ID:", resolvedEmployeeId || getStoredEmployeeId() || "");
    console.log("[PERMISSION] Current Role:", loggedInRole || "");
    console.log("[PERMISSION] Permission API Endpoint:", endpoint);

    const response = await api.get(endpoint, {
      headers: {
        Accept: "application/json"
      },
      skipAuthFailureHandling: true
    });

    console.log("[PERMISSION API] Response:", summarizeAxiosResponse(response));
    console.log("[PERMISSION API] Status:", response?.status);
    console.log("[PERMISSION API] Response Data:", sanitizeForDebug(response?.data));

    const normalizedSnapshot = normalizeEmployeePermissionSnapshot(response.data, {
      userId: resolvedEmployeeId,
      userEmail: userEmail || getStoredEmployeeEmail() || ""
    });

    const persistedSnapshot = persistEmployeePermissions({
      userId: normalizedSnapshot.userId || getStoredEmployeeId() || "",
      userEmail: normalizedSnapshot.userEmail || getStoredEmployeeEmail() || "",
      modules: normalizedSnapshot.modules
    });

    logPermissionCollection(persistedSnapshot.modules || []);

    return persistedSnapshot;
  } catch (error) {
    logApiError("[API ERROR]", error);
    throw error;
  }
};

export const fetchAllowedEmployeeModules = async ({
  force = false,
  userId = "",
  userEmail = "",
  role = ""
} = {}) => {
  const snapshot = await requestAllowedModules({
    force,
    userId,
    userEmail,
    role
  });

  return snapshot.modules || [];
};

export const getEmployeePermissionErrorMessage =
getFriendlyEmployeePermissionErrorMessage;

export const isEmployeePermissionAuthFailure = isAuthFailure;

export { clearEmployeePermissionCache };
export const clearEmployeePermissions = clearEmployeePermissionCache;
