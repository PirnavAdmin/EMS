import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

const normalizeAdminId = (value) => String(value ?? "").trim();

const readAuditLogsPermission = async (url, adminId) => {
  const id = normalizeAdminId(adminId);
  if (!id) throw new Error("Admin ID is required to load Audit Logs permission.");

  const response = await api.get(url(id), {
    headers: { Accept: "application/json" },
    cacheTTL: 0,
    dedupe: false,
  });
  const payload = response.data;
  const data = payload?.data;

  if (payload?.success !== true || !data || typeof data.hasAuditLogsPermission !== "boolean") {
    throw new Error("The Audit Logs permission response did not include the documented status.");
  }

  if (normalizeAdminId(data.adminId) !== id) {
    throw new Error("The Audit Logs permission response was for a different Admin.");
  }

  return {
    adminId: data.adminId,
    adminEmail: data.adminEmail,
    hasAuditLogsPermission: data.hasAuditLogsPermission,
  };
};

export const getAuditLogsPermission = (adminId) =>
  readAuditLogsPermission(API_ENDPOINTS.superAdmin.auditLogsPermission, adminId);

export const getAuthenticatedAdminAuditLogsPermission = (adminId) =>
  readAuditLogsPermission(API_ENDPOINTS.adminPermission.auditLogsStatus, adminId);

export const updateAuditLogsPermission = async (adminId, canAccess) => {
  const id = normalizeAdminId(adminId);
  if (!id) throw new Error("Admin ID is required to update Audit Logs permission.");
  if (typeof canAccess !== "boolean") throw new Error("Audit Logs permission must be enabled or disabled.");

  const response = await api.put(
    API_ENDPOINTS.superAdmin.auditLogsPermission(id),
    { canAccess },
    {
      params: { canAccess },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  const payload = response.data;

  if (payload?.success !== true || normalizeAdminId(payload.adminId) !== id || payload.hasAuditLogsPermission !== canAccess) {
    throw new Error("The Audit Logs permission update response did not confirm the requested Admin and state.");
  }

  return payload;
};

