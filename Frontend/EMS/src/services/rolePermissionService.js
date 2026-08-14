import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import { toBoolean } from "../utils/boolean";
import {
  logApiError,
  logPermissionCollection,
  sanitizeForDebug,
  summarizeAxiosResponse } from
"../utils/debugLogging";
import { normalizePermissionList } from "./permissionService";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const normalizeId = (value) => String(value ?? "").trim();

const normalizePayloadId = (value) => {
  const normalized = normalizeId(value);

  if (!normalized) {
    return "";
  }

  const numericValue = Number(normalized);

  if (Number.isFinite(numericValue) && normalized === String(numericValue)) {
    return numericValue;
  }

  return normalized;
};

const compareModuleIds = (left, right) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const dedupePermissions = (permissions = []) => {
  const uniquePermissions = new Map();

  permissions.forEach((permission) => {
    const moduleId = normalizeId(permission.moduleId ?? permission.ModuleId ?? "");
    const moduleName = normalizeId(permission.moduleName ?? permission.ModuleName ?? "");
    const key = moduleId || moduleName.toLowerCase();

    if (!key) {
      return;
    }

    const nextPermission = {
      ...permission,
      moduleId,
      moduleName,
      canView: toBoolean(permission.canView ?? permission.CanView ?? false),
      canAdd: toBoolean(permission.canAdd ?? permission.CanAdd ?? false),
      canEdit: toBoolean(permission.canEdit ?? permission.CanEdit ?? false),
      canDelete: toBoolean(permission.canDelete ?? permission.CanDelete ?? false),
      canUpload: toBoolean(permission.canUpload ?? permission.CanUpload ?? false),
      canDownload: toBoolean(permission.canDownload ?? permission.CanDownload ?? false),
      canSubmit: toBoolean(permission.canSubmit ?? permission.CanSubmit ?? false),
      canApprove: toBoolean(permission.canApprove ?? permission.CanApprove ?? false),
    };

    nextPermission.canAccess = Boolean(
      nextPermission.canView ||
        nextPermission.canAdd ||
        nextPermission.canEdit ||
        nextPermission.canDelete ||
        nextPermission.canUpload ||
        nextPermission.canDownload ||
        nextPermission.canSubmit ||
        nextPermission.canApprove
    );

    uniquePermissions.set(key, nextPermission);
  });

  return Array.from(uniquePermissions.values()).sort((left, right) =>
    compareModuleIds(left.moduleId, right.moduleId)
  );
};

const extractRolePermissionCollection = (payload) => {
  const candidates = [
    payload,
    payload?.permissions,
    payload?.Permissions,
    payload?.permissions?.$values,
    payload?.Permissions?.$values,
    payload?.modules,
    payload?.Modules,
    payload?.modules?.$values,
    payload?.Modules?.$values,
    payload?.data?.permissions,
    payload?.data?.Permissions,
    payload?.data?.permissions?.$values,
    payload?.data?.Permissions?.$values,
    payload?.data?.modules,
    payload?.data?.Modules,
    payload?.data?.modules?.$values,
    payload?.data?.Modules?.$values,
    payload?.data?.data?.permissions,
    payload?.data?.data?.Permissions,
    payload?.data?.data?.permissions?.$values,
    payload?.data?.data?.Permissions?.$values,
    payload?.data?.data?.modules,
    payload?.data?.data?.Modules,
    payload?.data?.data?.modules?.$values,
    payload?.data?.data?.Modules?.$values,
    extractCollection(payload),
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

export const normalizeRolePermissionSnapshot = (payload = {}, fallback = {}) => {
  const response = payload?.data ?? payload ?? {};
  const permissions = dedupePermissions(normalizePermissionList(extractRolePermissionCollection(response)));

  return {
    roleId: normalizeId(
      firstDefined(
        payload.roleId,
        payload.RoleId,
        payload.roleID,
        response.roleId,
        response.RoleId,
        response.roleID,
        payload.data?.roleId,
        payload.data?.RoleId,
        payload.data?.roleID,
        response.data?.roleId,
        response.data?.RoleId,
        response.data?.roleID,
        fallback.roleId,
        ""
      )
    ),
    roleName: normalizeId(
      firstDefined(
        payload.roleName,
        payload.RoleName,
        payload.name,
        payload.Name,
        response.roleName,
        response.RoleName,
        response.name,
        response.Name,
        payload.data?.roleName,
        payload.data?.RoleName,
        payload.data?.name,
        payload.data?.Name,
        response.data?.roleName,
        response.data?.RoleName,
        response.data?.name,
        response.data?.Name,
        fallback.roleName,
        ""
      )
    ),
    permissions,
    modules: permissions,
  };
};

export const getRolePermissionErrorMessage = (
  error,
  fallback = "We could not load role permissions right now."
) =>
  (error?.response?.data?.errors && typeof error.response.data.errors === "object"
    ? Object.values(error.response.data.errors)
        .flat()
        .filter(Boolean)
        .map((message) => String(message).trim())
        .filter(Boolean)
        .join(" ")
    : "") ||
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.title ||
  error?.response?.data ||
  error?.message ||
  fallback;

const resolveRolePermissionInput = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizeId(
      firstDefined(
        value.roleName,
        value.RoleName,
        value.name,
        value.Name,
        value.role,
        value.Role,
        ""
      )
    );
  }

  return normalizeId(value);
};

export const fetchRolePermissionsByRoleName = async (roleName) => {
  const normalizedRoleName = resolveRolePermissionInput(roleName);

  if (!normalizedRoleName) {
    throw new Error("Role name is required.");
  }

  const response = await api.get(
    API_ENDPOINTS.rolePermission.byRoleName(normalizedRoleName),
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  const snapshot = normalizeRolePermissionSnapshot(response.data, {
    roleName: normalizedRoleName,
  });

  return snapshot;
};

export const fetchRolePermissionsByRoleId = fetchRolePermissionsByRoleName;

export const fetchAllowedRoleModules = async ({
  role = "",
  roleName = "",
} = {}) => {
  const resolvedRole = resolveRolePermissionInput(roleName || role);
  const endpoint = API_ENDPOINTS.rolePermission.allowedModules;
  if (!endpoint) {
    return [];
  }

  try {
    console.log("[PERMISSION API] Endpoint:", endpoint);

    const response = await api.get(endpoint, {
      headers: {
        Accept: "application/json",
      },
      skipAuthFailureHandling: true,
    });

    console.log("[PERMISSION API] Response:", summarizeAxiosResponse(response));
    console.log("[PERMISSION API] Status:", response?.status);
    console.log("[PERMISSION API] Response Data:", sanitizeForDebug(response?.data));

    const snapshot = normalizeRolePermissionSnapshot(response.data, {
      roleName: resolvedRole,
    });
    const permissions = Array.isArray(snapshot?.modules) ? snapshot.modules : [];

    logPermissionCollection(permissions);

    return permissions;
  } catch (error) {
    logApiError("[API ERROR]", error);
    throw error;
  }
};

const normalizePermissionForSave = (permission = {}) => {
  const moduleId = normalizeId(permission.moduleId ?? permission.ModuleId ?? "");
  const canView = toBoolean(permission.canView ?? permission.CanView ?? false);
  const canAdd = toBoolean(permission.canAdd ?? permission.CanAdd ?? false);
  const canEdit = toBoolean(permission.canEdit ?? permission.CanEdit ?? false);
  const canDelete = toBoolean(permission.canDelete ?? permission.CanDelete ?? false);
  const canAccess = toBoolean(
    permission.canAccess ??
      permission.CanAccess ??
      (canView || canAdd || canEdit || canDelete)
  );

  return {
    ModuleId: normalizePayloadId(moduleId),
    CanAccess: canAccess,
    CanView: canView,
    CanAdd: canAdd,
    CanEdit: canEdit,
    CanDelete: canDelete,
  };
};

export const buildRolePermissionSavePayload = ({
  roleName = "",
  roleId = "",
  permissions = [],
} = {}) => {
  const normalizedRoleName =
    resolveRolePermissionInput(roleName) || resolveRolePermissionInput(roleId);

  if (!normalizedRoleName) {
    throw new Error("Role name is required.");
  }

  const uniquePermissions = new Map();

  (Array.isArray(permissions) ? permissions : []).forEach((permission) => {
    const normalizedPermission = normalizePermissionForSave(permission);
    const key = normalizeId(normalizedPermission.ModuleId);

    if (!key) {
      return;
    }

    uniquePermissions.set(key, normalizedPermission);
  });

  return {
    RoleName: normalizedRoleName,
    Modules: Array.from(uniquePermissions.values()).sort((left, right) =>
      compareModuleIds(left.ModuleId, right.ModuleId)
    ),
  };
};

export const saveRolePermissions = async ({
  roleName = "",
  roleId = "",
  permissions = [],
} = {}) => {
  const payload = buildRolePermissionSavePayload({
    roleName,
    roleId,
    permissions,
  });

  const response = await api.post(API_ENDPOINTS.rolePermission.save, payload, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  return response.data;
};
