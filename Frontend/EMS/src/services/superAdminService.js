import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import { toBoolean } from "../utils/boolean";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const joinName = (...parts) =>
  parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeBooleanFlag = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return Boolean(fallback);
  }

  if (["true", "1", "yes", "active", "enabled"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) {
    return false;
  }

  return Boolean(fallback);
};

const resolveActiveFlag = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    const normalized = String(value).trim().toLowerCase();

    if (["true", "1", "yes", "active", "enabled"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) {
      return false;
    }
  }

  return false;
};

export const getApiErrorMessage = (error, fallback = "Something went wrong.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.title ||
  error?.response?.data ||
  error?.message ||
  fallback;

export const normalizeStatus = (value, activeFallback) => {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";

  const normalized = String(value ?? "").trim();

  if (normalized) {
    const lowered = normalized.toLowerCase();

    if (["active", "true", "1", "yes", "enabled"].includes(lowered)) {
      return "Active";
    }

    if (["inactive", "false", "0", "no", "disabled"].includes(lowered)) {
      return "Inactive";
    }

    return normalized;
  }

  if (typeof activeFallback === "boolean") {
    return activeFallback ? "Active" : "Inactive";
  }

  return "Inactive";
};

export const normalizeAdmin = (admin = {}) => ({
  raw: admin,
  adminId: firstDefined(admin.adminId, admin.AdminId, admin.id, admin.Id, ""),
  firstName: firstDefined(admin.firstName, admin.FirstName, ""),
  lastName: firstDefined(admin.lastName, admin.LastName, ""),
  name: firstDefined(
    admin.name,
    admin.Name,
    admin.fullName,
    admin.FullName,
    joinName(
      firstDefined(admin.firstName, admin.FirstName, ""),
      firstDefined(admin.lastName, admin.LastName, "")
    )
  ),
  email: firstDefined(admin.email, admin.Email, admin.officialEmail, admin.OfficialEmail, ""),
  phone: firstDefined(admin.phone, admin.Phone, admin.phoneNumber, admin.PhoneNumber, ""),
  company: firstDefined(admin.company, admin.Company, admin.companyName, admin.CompanyName, ""),
  isActive: resolveActiveFlag(
    admin.isActive,
    admin.IsActive,
    admin.active,
    admin.Active,
    admin.status,
    admin.Status
  ),
  active: resolveActiveFlag(
    admin.active,
    admin.Active,
    admin.isActive,
    admin.IsActive,
    admin.status,
    admin.Status
  ),
  status: normalizeStatus(
    firstDefined(admin.status, admin.Status),
    normalizeBooleanFlag(
      firstDefined(admin.isActive, admin.IsActive, admin.active, admin.Active)
    )
  ),
  createdDate: firstDefined(admin.createdDate, admin.CreatedDate, admin.createdAt, admin.CreatedAt, admin.created_On, ""),
});

export const normalizeSubscription = (subscription = {}) => ({
  raw: subscription,
  adminId: firstDefined(subscription.adminId, subscription.AdminId, subscription.id, subscription.Id, ""),
  admin: firstDefined(subscription.adminName, subscription.AdminName, subscription.admin, subscription.Admin, subscription.email, ""),
  plan: firstDefined(subscription.plan, subscription.Plan, subscription.planName, subscription.PlanName, ""),
  maximumUsers: toNumber(firstDefined(subscription.maximumUsers, subscription.MaximumUsers, subscription.maxUsers, subscription.MaxUsers)),
  maxUsers: toNumber(firstDefined(subscription.maxUsers, subscription.MaxUsers, subscription.maximumUsers, subscription.MaximumUsers)),
  currentUsers: toNumber(firstDefined(subscription.currentUsers, subscription.CurrentUsers)),
  remainingUsers: toNumber(firstDefined(subscription.remainingUsers, subscription.RemainingUsers)),
  startDate: firstDefined(subscription.startDate, subscription.StartDate, ""),
  endDate: firstDefined(subscription.endDate, subscription.EndDate, ""),
  price: firstDefined(subscription.price, subscription.Price, ""),
  billingCycle: firstDefined(subscription.billingCycle, subscription.BillingCycle, ""),
  isActive: resolveActiveFlag(
    subscription.isActive,
    subscription.IsActive,
    subscription.active,
    subscription.Active,
    subscription.status,
    subscription.Status
  ),
  active: resolveActiveFlag(
    subscription.active,
    subscription.Active,
    subscription.isActive,
    subscription.IsActive,
    subscription.status,
    subscription.Status
  ),
  status: normalizeStatus(
    firstDefined(subscription.status, subscription.Status),
    normalizeBooleanFlag(
      firstDefined(subscription.isActive, subscription.IsActive, subscription.active, subscription.Active)
    )
  ),
});

const extractAdminPermissionCollection = (payload) => {
  const candidates = [
    payload,
    payload?.permissions,
    payload?.permissions?.$values,
    payload?.Permissions,
    payload?.Permissions?.$values,
    payload?.modules,
    payload?.modules?.$values,
    payload?.Modules,
    payload?.Modules?.$values,
    payload?.data?.permissions,
    payload?.data?.permissions?.$values,
    payload?.data?.Permissions,
    payload?.data?.Permissions?.$values,
    payload?.data?.modules,
    payload?.data?.modules?.$values,
    payload?.data?.Modules,
    payload?.data?.Modules?.$values,
    payload?.data?.data?.permissions,
    payload?.data?.data?.permissions?.$values,
    payload?.data?.data?.Permissions,
    payload?.data?.data?.Permissions?.$values,
    payload?.data?.data?.modules,
    payload?.data?.data?.modules?.$values,
    payload?.data?.data?.Modules,
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

export const normalizePermissions = (payload) => {
  const records = extractAdminPermissionCollection(payload);

  return records.map((item) => ({
    moduleId: firstDefined(item.moduleId, item.ModuleId, ""),
    moduleName: firstDefined(item.moduleName, item.ModuleName, item.name, item.Name, ""),
    canView: toBoolean(firstDefined(item.canView, item.CanView, item.view, item.View, false)),
    canAdd: toBoolean(firstDefined(item.canAdd, item.CanAdd, item.add, item.Add, false)),
    canEdit: toBoolean(firstDefined(item.canEdit, item.CanEdit, item.edit, item.Edit, false)),
    canDelete: toBoolean(firstDefined(item.canDelete, item.CanDelete, item.delete, item.Delete, false)),
    canAccess: toBoolean(firstDefined(item.canAccess, item.CanAccess, false)),
  })).filter((item) => item.moduleName || item.moduleId);
};

export const superAdminLogin = (payload) =>
  api.post(API_ENDPOINTS.superAdmin.login, payload, {
    skipAuth: true,
    headers: { "Content-Type": "application/json" },
  });

export const getSuperAdminDashboard = async () => {
  const response = await api.get(API_ENDPOINTS.superAdmin.dashboard);
  return response.data;
};

export const getAdmins = async () => {
  const response = await api.get(API_ENDPOINTS.adminManagement.list);
  return extractCollection(response.data).map(normalizeAdmin);
};

export const createAdmin = (payload) =>
  api.post(API_ENDPOINTS.adminManagement.create, payload, {
    headers: { "Content-Type": "application/json" },
  });

export const updateAdminStatus = (adminId, status) =>
  api.put(API_ENDPOINTS.adminManagement.updateStatus(adminId), {
    status: Boolean(status),
    isActive: Boolean(status),
  }, {
    headers: { "Content-Type": "application/json" },
  });

export const getAdminSubscriptions = async () => {
  const response = await api.get(API_ENDPOINTS.adminSubscription.list);
  return extractCollection(response.data).map(normalizeSubscription);
};

export const createAdminSubscription = (payload) =>
  api.post(API_ENDPOINTS.adminSubscription.create, payload, {
    headers: { "Content-Type": "application/json" },
  });

export const updateAdminSubscription = (adminId, payload) =>
  api.put(API_ENDPOINTS.adminSubscription.update(adminId), payload, {
    headers: { "Content-Type": "application/json" },
  });

export const getAdminSubscriptionUsage = async (adminId) => {
  const response = await api.get(API_ENDPOINTS.adminSubscription.usage(adminId));
  return response.data?.data || response.data || {};
};
