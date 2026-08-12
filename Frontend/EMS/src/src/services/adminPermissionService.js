import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  isAdmin,
  isSuperAdmin,
  normalizePermissionList,
} from "../utils/authorization";
import { normalizePermissionList as normalizeEditablePermissionList } from "./permissionService";
import {
  getStoredAdminEmail,
  getStoredAdminId,
  getStoredAdminPermissionSnapshot,
  getStoredToken,
  persistAdminPermissions,
} from "../utils/authStorage";

const ADMIN_PERMISSION_STORAGE_KEYS = [
  "adminPermissions",
  "allowedModules",
  "modules",
  "permissions",
];

export const SUPER_ADMIN_FULL_ACCESS_MODULES = [
  {
    moduleId: "all",
    moduleName: "all",
    canAccess: true,
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
  },
];

export const createSuperAdminPermissionSnapshot = ({
  adminId = getStoredAdminId() || "",
  adminEmail = getStoredAdminEmail() || "",
} = {}) => ({
  adminId: String(adminId ?? "").trim(),
  adminEmail: String(adminEmail ?? "").trim(),
  modules: SUPER_ADMIN_FULL_ACCESS_MODULES.map((module) => ({ ...module })),
});

const normalizeId = (value) => String(value ?? "").trim();
const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const resolvePermissionRole = (role) =>
  isSuperAdmin(role) ? "superadmin" : isAdmin(role) ? "admin" : "";

const getPermissionEndpointForRole = (role) => {
  const normalizedRole = resolvePermissionRole(role);
  const adminPermissionEndpoint =
    API_ENDPOINTS.adminPermission.allowedModules || "";

  if (normalizedRole !== "admin") {
    return "";
  }

  return adminPermissionEndpoint;
};

const buildPermissionRequestParams = ({ adminId = "", adminEmail = "", params = {} } = {}) => {
  const requestParams = { ...(params || {}) };
  const normalizedAdminId = normalizeId(adminId || requestParams.adminId || "");
  const normalizedAdminEmail = String(adminEmail || requestParams.adminEmail || "").trim();

  if (normalizedAdminId) {
    requestParams.adminId = normalizedAdminId;
  } else {
    delete requestParams.adminId;
  }

  if (normalizedAdminEmail) {
    requestParams.adminEmail = normalizedAdminEmail;
  } else {
    delete requestParams.adminEmail;
  }

  return requestParams;
};

const normalizePermissionSnapshot = (value = {}, fallback = {}) => {
  const response = value?.data ?? value ?? {};

  return {
    adminId: normalizeId(
      response.adminId ??
        response.AdminId ??
        response.adminID ??
        response.data?.adminId ??
        response.data?.AdminId ??
        response.data?.adminID ??
        fallback.adminId ??
        getStoredAdminId() ??
        ""
    ),
    adminEmail: String(
      response.adminEmail ??
        response.AdminEmail ??
        response.email ??
        response.Email ??
        response.data?.adminEmail ??
        response.data?.AdminEmail ??
        response.data?.email ??
        response.data?.Email ??
        fallback.adminEmail ??
        getStoredAdminEmail() ??
        ""
    ).trim(),
    modules: normalizePermissionList(response),
  };
};

const hasAuthFailure = (error) => {
  const status = error?.response?.status;

  return status === 401;
};

const getFriendlyErrorMessage = (
  error,
  fallback = "We could not load the admin modules right now."
) => {
  const status = error?.response?.status;
  const validationErrors = error?.response?.data?.errors;

  if (status === 401) {
    return "Your session has expired or you are no longer authorized. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to access this resource.";
  }

  if (validationErrors && typeof validationErrors === "object") {
    const messages = Object.values(validationErrors)
      .flat()
      .filter(Boolean)
      .map((message) => String(message).trim())
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.title ||
    error?.message ||
    fallback
  );
};

const getCachedPermissionSnapshot = () => {
  const snapshot = getStoredAdminPermissionSnapshot();

  if (snapshot && Array.isArray(snapshot.modules) && snapshot.modules.length > 0) {
    return snapshot;
  }

  return null;
};

export const getCachedAllowedModules = () =>
  getCachedPermissionSnapshot()?.modules || [];

export const hasCachedAllowedModules = () =>
  getCachedAllowedModules().length > 0;

export const clearAdminPermissionCache = () => {
  if (typeof window === "undefined") {
    return;
  }

  const storages = [window.localStorage, window.sessionStorage].filter(Boolean);

  storages.forEach((storage) => {
    ADMIN_PERMISSION_STORAGE_KEYS.forEach((key) => {
      storage.removeItem(key);
    });

    storage.removeItem("adminId");
    storage.removeItem("adminEmail");
  });
};

const requestAllowedModules = async ({
  role = "",
  force = false,
  adminId = "",
  adminEmail = "",
  params = {},
} = {}) => {
  const normalizedRole = resolvePermissionRole(role);
  const permissionFlow =
    normalizedRole === "superadmin"
      ? "superadmin-bypass"
      : normalizedRole === "admin"
        ? "admin-permission"
        : "no-permission-api";
  const requestParams = buildPermissionRequestParams({
    adminId,
    adminEmail,
    params,
  });

  console.log("Authenticated Role:", normalizedRole || "unknown");
  console.log("Selected Permission Flow:", permissionFlow);

  if (normalizedRole === "superadmin") {
    console.log("Skipping permission API for Super Admin");

    const snapshot = persistAdminPermissions(
      createSuperAdminPermissionSnapshot({
        adminId: requestParams.adminId || getStoredAdminId() || "",
        adminEmail: requestParams.adminEmail || getStoredAdminEmail() || "",
      })
    );

    console.log("Selected Permission API:", "none");
    console.log("Permission API Response:", snapshot.modules);
    console.log("Visible Modules:", snapshot.modules);

    return snapshot;
  }

  if (normalizedRole !== "admin") {
    const emptySnapshot = persistAdminPermissions({
      adminId: getStoredAdminId() || "",
      adminEmail: getStoredAdminEmail() || "",
      modules: [],
    });

    console.log("Selected Permission API:", "none");
    console.log("Permission API Response:", []);
    console.log("Visible Modules:", []);

    return emptySnapshot;
  }

  if (!force && !requestParams.adminId && !requestParams.adminEmail) {
    const cached = getCachedPermissionSnapshot();

    if (cached) {
      return cached;
    }
  }

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const endpoint = getPermissionEndpointForRole(normalizedRole);

      if (!endpoint) {
        const emptySnapshot = persistAdminPermissions({
          adminId: getStoredAdminId() || "",
          adminEmail: getStoredAdminEmail() || "",
          modules: [],
        });

        console.log("Authenticated Role:", normalizedRole);
        console.log("Selected Permission Flow:", permissionFlow);
        console.log("Selected Permission API:", "none");
        console.log("Permission API Response:", []);
        console.log("Visible Modules:", []);

        return emptySnapshot;
      }

      console.log("Authenticated Role:", normalizedRole);
      console.log("Selected Permission Flow:", permissionFlow);
      console.log("Selected Permission API:", endpoint);
      console.log("Admin ID:", requestParams.adminId || getStoredAdminId() || "");
      console.log("Token:", getStoredToken() || "");
      console.log("Calling:", endpoint);

      const response = await api.get(endpoint, {
        headers: {
          Accept: "application/json",
        },
        skipAuthFailureHandling: true,
      });

      console.log("Permission API Response:", response.data);

      const normalizedSnapshot = normalizePermissionSnapshot(response.data, {
        adminId: requestParams.adminId || getStoredAdminId() || "",
        adminEmail: requestParams.adminEmail || getStoredAdminEmail() || "",
      });

      console.log("Visible Modules:", normalizedSnapshot.modules);

      const persistedSnapshot = persistAdminPermissions({
        adminId: normalizedSnapshot.adminId || getStoredAdminId() || "",
        adminEmail: normalizedSnapshot.adminEmail || getStoredAdminEmail() || "",
        modules: normalizedSnapshot.modules,
      });

      return persistedSnapshot;
    } catch (error) {
      lastError = error;

      console.error("Allowed Modules API Error:", error);

      if (hasAuthFailure(error)) {
        throw error;
      }

      if (attempt === 0) {
        continue;
      }
    }
  }

  throw lastError || new Error("Unable to load admin permissions.");
};

export const fetchAllowedAdminModules = async ({
  force = false,
  adminId = "",
  adminEmail = "",
  params = {},
} = {}) => {
  const normalizedAdminEmail = String(
    adminEmail || getStoredAdminEmail() || ""
  ).trim();

  const snapshot = await requestAllowedModules({
    role: "admin",
    force,
    adminId: adminId || getStoredAdminId() || "",
    adminEmail: normalizedAdminEmail,
    params,
  });
  return snapshot.modules || [];
};

export const fetchAllowedUserModules = async () => {
  console.log("Authenticated Role:", "user");
  console.log("Selected Permission Flow:", "no-permission-api");
  console.log("Selected Permission API:", "none");
  console.log("Permission API Response:", []);
  console.log("Visible Modules:", []);

  return [];
};

export const fetchAllowedModulesForRole = async (
  role,
  { force = false, adminId = "", adminEmail = "", params = {} } = {}
) => {
  const normalizedRole = resolvePermissionRole(role);
  const permissionFlow =
    normalizedRole === "superadmin"
      ? "superadmin-bypass"
      : normalizedRole === "admin"
        ? "admin-permission"
        : "no-permission-api";

  console.log("Authenticated Role:", normalizedRole || "unknown");
  console.log("Selected Permission Flow:", permissionFlow);

  if (normalizedRole === "superadmin") {
    console.log("Skipping permission API for Super Admin");
    const snapshot = persistAdminPermissions(
      createSuperAdminPermissionSnapshot({
        adminId: adminId || getStoredAdminId() || "",
        adminEmail: adminEmail || getStoredAdminEmail() || "",
      })
    );
    console.log("Selected Permission API:", "none");
    console.log("Permission API Response:", snapshot.modules);
    console.log("Visible Modules:", snapshot.modules);
    return snapshot.modules || [];
  }

  if (normalizedRole !== "admin") {
    console.log("Selected Permission API:", "none");
    console.log("Permission API Response:", []);
    console.log("Visible Modules:", []);
    return [];
  }

  const snapshot = await requestAllowedModules({
    role: normalizedRole,
    force,
    adminId,
    adminEmail,
    params,
  });

  return snapshot.modules || [];
};

export const fetchAllowedSuperAdminModules = async (options = {}) => {
  const snapshot = persistAdminPermissions(
    createSuperAdminPermissionSnapshot({
      adminId: options?.adminId || getStoredAdminId() || "",
      adminEmail: options?.adminEmail || getStoredAdminEmail() || "",
    })
  );

  console.log("Authenticated Role:", "superadmin");
  console.log("Selected Permission Flow:", "superadmin-bypass");
  console.log("Skipping permission API for Super Admin");
  console.log("Selected Permission API:", "none");
  console.log("Permission API Response:", snapshot.modules);
  console.log("Visible Modules:", snapshot.modules);

  return snapshot.modules || [];
};

export const getAdminPermissionErrorMessage = getFriendlyErrorMessage;

const normalizeAdminPermissionSnapshot = (payload = {}, fallback = {}) => {
  const response = payload?.data ?? payload ?? {};
  const permissions = normalizeEditablePermissionList(response);

  return {
    adminId: normalizeId(
      firstDefined(
        payload.adminId,
        payload.AdminId,
        payload.adminID,
        response.adminId,
        response.AdminId,
        response.adminID,
        payload.data?.adminId,
        payload.data?.AdminId,
        payload.data?.adminID,
        response.data?.adminId,
        response.data?.AdminId,
        response.data?.adminID,
        fallback.adminId,
        getStoredAdminId(),
        ""
      )
    ),
    adminEmail: String(
      firstDefined(
        payload.adminEmail,
        payload.AdminEmail,
        payload.email,
        payload.Email,
        response.adminEmail,
        response.AdminEmail,
        response.email,
        response.Email,
        payload.data?.adminEmail,
        payload.data?.AdminEmail,
        payload.data?.email,
        payload.data?.Email,
        response.data?.adminEmail,
        response.data?.AdminEmail,
        response.data?.email,
        response.data?.Email,
        fallback.adminEmail,
        getStoredAdminEmail(),
        ""
      )
    ).trim(),
    permissions,
  };
};

export const fetchAdminPermissionsByAdminId = async (adminId) => {
  const normalizedAdminId = normalizeId(adminId);

  if (!normalizedAdminId) {
    throw new Error("Admin ID is required.");
  }

  const response = await api.get(API_ENDPOINTS.adminPermission.get(normalizedAdminId), {
    headers: {
      Accept: "application/json",
    },
  });

  console.log("GET Permissions Response:", response.data);

  const snapshot = normalizeAdminPermissionSnapshot(response.data, {
    adminId: normalizedAdminId,
  });

  console.log("Mapped Permissions:", snapshot.permissions);

  return snapshot;
};

const normalizePermissionForSave = (permission = {}, fallbackAdminId = "") => {
  const permissionId = firstDefined(
    permission.permissionId,
    permission.PermissionId,
    permission.id,
    permission.Id,
    ""
  );
  const screenId = firstDefined(
    permission.screenId,
    permission.ScreenId,
    permission.moduleId,
    permission.ModuleId,
    ""
  );
  const moduleId = firstDefined(
    permission.moduleId,
    permission.ModuleId,
    permission.screenId,
    permission.ScreenId,
    ""
  );
  const adminId = firstDefined(permission.adminId, permission.AdminId, fallbackAdminId, "");

  return {
    ...(String(permissionId).trim() ? { permissionId } : {}),
    ...(String(screenId).trim() ? { screenId } : {}),
    ...(String(moduleId).trim() ? { moduleId } : {}),
    ...(String(adminId).trim() ? { adminId } : {}),
    moduleName: String(permission.moduleName ?? permission.ModuleName ?? "").trim(),
    canView: Boolean(permission.canView ?? permission.CanView ?? false),
    canAdd: Boolean(permission.canAdd ?? permission.CanAdd ?? false),
    canEdit: Boolean(permission.canEdit ?? permission.CanEdit ?? false),
    canDelete: Boolean(permission.canDelete ?? permission.CanDelete ?? false),
    canAccess: Boolean(permission.canAccess ?? permission.CanAccess ?? false),
  };
};

export const buildAdminPermissionSavePayload = ({
  adminId = "",
  permissions = [],
} = {}) => {
  const normalizedAdminId = normalizeId(adminId);

  if (!normalizedAdminId) {
    throw new Error("Admin ID is required.");
  }

  const normalizedPermissions = Array.isArray(permissions)
    ? permissions.map((permission) =>
        normalizePermissionForSave(permission, normalizedAdminId)
      )
    : [];

  const adminIdValue = Number.isFinite(Number(normalizedAdminId))
    ? Number(normalizedAdminId)
    : normalizedAdminId;

  return {
    adminId: adminIdValue,
    AdminId: adminIdValue,
    permissions: normalizedPermissions,
    Permissions: normalizedPermissions,
    modules: normalizedPermissions,
    Modules: normalizedPermissions,
  };
};

export const saveAdminPermissions = async ({
  adminId = "",
  permissions = [],
} = {}) => {
  const payload = buildAdminPermissionSavePayload({
    adminId,
    permissions,
  });

  console.log("Save Payload:", payload);

  const response = await api.post(API_ENDPOINTS.adminPermission.save, payload, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  console.log("Save Response:", response.data);

  return response.data;
};

export const isAdminPermissionAuthFailure = (error) => {
  if (!error) {
    return false;
  }

  if (error?.response?.status === 403) {
    return false;
  }

  if (hasAuthFailure(error)) {
    return true;
  }

  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED" ||
    /session\s+expired|sign\s*in|token\s+expired|expired\s+token/i.test(
      String(error?.message || "")
    )
  );
};
