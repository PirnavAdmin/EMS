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
    organizationId: firstDefined(admin.organizationId, admin.OrganizationId, ""),
    organizationName: firstDefined(admin.organizationName, admin.OrganizationName, ""),
    employeeCount: toNumber(firstDefined(admin.employeeCount, admin.EmployeeCount)),
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

export const normalizeOrganization = (org = {}) => ({
    raw: org,
    organizationId: firstDefined(org.organizationId, org.OrganizationId, org.id, org.Id, ""),
    organizationName: firstDefined(org.organizationName, org.OrganizationName, org.name, org.Name, ""),
    organizationCode: firstDefined(org.organizationCode, org.OrganizationCode, org.code, org.Code, ""),
    contactPerson: firstDefined(org.contactPerson, org.ContactPerson, ""),
    email: firstDefined(org.email, org.Email, ""),
    phoneNumber: firstDefined(org.phoneNumber, org.PhoneNumber, org.phone, org.Phone, ""),
    address: firstDefined(org.address, org.Address, ""),
    city: firstDefined(org.city, org.City, ""),
    state: firstDefined(org.state, org.State, ""),
    country: firstDefined(org.country, org.Country, ""),
    status: normalizeStatus(
        firstDefined(org.status, org.Status),
        normalizeBooleanFlag(firstDefined(org.isActive, org.IsActive, org.active, org.Active))
    ),
    isActive: resolveActiveFlag(org.isActive, org.IsActive, org.active, org.Active, org.status, org.Status),
    adminCount: toNumber(firstDefined(org.adminCount, org.AdminCount)),
    employeeCount: toNumber(firstDefined(org.employeeCount, org.EmployeeCount)),
    createdDate: firstDefined(org.createdDate, org.CreatedDate, org.createdAt, org.CreatedAt, ""),
    updatedDate: firstDefined(org.updatedDate, org.UpdatedDate, org.updatedAt, org.UpdatedAt, ""),
});

export const normalizeSuperAdminRole = (role = {}) => ({
    roleId: firstDefined(role.roleId, role.RoleId, role.id, role.Id, ""),
    name: firstDefined(role.name, role.Name, role.roleName, role.RoleName, ""),
    isActive: resolveActiveFlag(role.isActive, role.IsActive, role.active, role.Active),
    userCount: toNumber(firstDefined(role.userCount, role.UserCount, role.usersCount, role.UsersCount)),
    permissionCount: toNumber(firstDefined(role.permissionCount, role.PermissionCount)),
});

export const normalizeSubscription = (subscription = {}) => ({
    raw: subscription,
    adminId: firstDefined(subscription.adminId, subscription.AdminId, subscription.id, subscription.Id, ""),
    organizationId: firstDefined(subscription.organizationId, subscription.OrganizationId, ""),
    organizationName: firstDefined(subscription.organizationName, subscription.OrganizationName, ""),
    organizationCode: firstDefined(subscription.organizationCode, subscription.OrganizationCode, ""),
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

export const getEnhancedSuperAdminDashboard = async () => {
    const response = await api.get(API_ENDPOINTS.superAdmin.enhancedDashboard);
    return response.data?.data || response.data || {};
};

export const getAdminsPage = async ({ search = "", isActive, organizationId, page = 1, pageSize = 100 } = {}) => {
    const params = {
        page: Math.max(Number(page) || 1, 1),
        pageSize: Math.max(Number(pageSize) || 1, 1),
    };

    if (String(search).trim()) params.search = String(search).trim();
    if (typeof isActive === "boolean") params.isActive = isActive;
    if (organizationId !== undefined && organizationId !== null && organizationId !== "") {
        params.organizationId = Number(organizationId);
    }

    const response = await api.get(API_ENDPOINTS.superAdmin.admins, { params });
    const payload = response.data?.data || response.data || {};
    const items = extractCollection(payload.items ?? payload.Items ?? payload).map(normalizeAdmin);

    return {
        items,
        totalCount: toNumber(payload.totalCount ?? payload.TotalCount, items.length),
        pageNumber: toNumber(payload.pageNumber ?? payload.PageNumber, params.page),
        pageSize: toNumber(payload.pageSize ?? payload.PageSize, params.pageSize),
        totalPages: toNumber(payload.totalPages ?? payload.TotalPages, Math.ceil(items.length / params.pageSize)),
    };
};

export const getAdmins = async () => (await getAdminsPage()).items;

export const createAdmin = async (payload) => {
    const response = await api.post(API_ENDPOINTS.superAdmin.admins, payload, {
        headers: { "Content-Type": "application/json" },
    });

    return normalizeAdmin(response.data?.data || response.data || {});
};

export const getAdminById = async (adminId) => {
    const response = await api.get(API_ENDPOINTS.superAdmin.adminById(adminId));
    return normalizeAdmin(response.data?.data || response.data || {});
};

export const updateAdmin = async (adminId, payload) => {
    const response = await api.put(API_ENDPOINTS.superAdmin.adminById(adminId), payload, {
        headers: { "Content-Type": "application/json" },
    });

    return normalizeAdmin(response.data?.data || response.data || {});
};

export const deleteAdmin = async (adminId) => {
    const response = await api.delete(
        API_ENDPOINTS.superAdmin.adminById(adminId)
    );

    return response.data?.data || response.data || {};
};

export const assignAdminOrganization = async (adminId, organizationId) => {
    const response = await api.put(
        API_ENDPOINTS.superAdmin.assignAdminOrganization(adminId),
        { organizationId: Number(organizationId) || 0 },
        { headers: { "Content-Type": "application/json" } }
    );

    return normalizeAdmin(response.data?.data || response.data || {});
};

export const updateSuperAdminAdminStatus = (adminId, isActive, reason = "") =>
    api.put(API_ENDPOINTS.superAdmin.updateAdminStatus(adminId), {
        status: isActive ? "Active" : "Inactive",
        isActive: Boolean(isActive),
        reason,
    }, {
        headers: { "Content-Type": "application/json" },
    });

export const getSuperAdminRoles = async () => {
    const response = await api.get(API_ENDPOINTS.superAdmin.roles);
    return extractCollection(response.data?.data || response.data).map(normalizeSuperAdminRole);
};

export const createSuperAdminRole = async (payload) => {
    const response = await api.post(API_ENDPOINTS.superAdmin.roles, payload, {
        headers: { "Content-Type": "application/json" },
    });

    return normalizeSuperAdminRole(response.data?.data || response.data || {});
};

export const updateSuperAdminRole = async (roleId, payload) => {
    const response = await api.put(API_ENDPOINTS.superAdmin.roleById(roleId), payload, {
        headers: { "Content-Type": "application/json" },
    });

    return normalizeSuperAdminRole(response.data?.data || response.data || {});
};

export const updateSuperAdminRoleStatus = (roleId, isActive, reason = "") =>
    api.put(API_ENDPOINTS.superAdmin.updateRoleStatus(roleId), {
        status: isActive ? "Active" : "Inactive",
        isActive: Boolean(isActive),
        reason,
    }, {
        headers: { "Content-Type": "application/json" },
    });

export const getSuperAdminRoleUsers = async (roleId) => {
    const response = await api.get(API_ENDPOINTS.superAdmin.roleUsers(roleId));
    return extractCollection(response.data?.data || response.data);
};

export const getSuperAdminSettings = async () => {
    const response = await api.get(API_ENDPOINTS.superAdmin.settings);
    const payload = response.data?.data || response.data || {};

    return Array.isArray(payload) ? {} : payload;
};

export const updateSuperAdminSettings = async (values) => {
    const payload = {
        appName: String(values.appName ?? "").trim(),
        companyLogoUrl: String(values.companyLogoUrl ?? "").trim(),
        defaultTimeZone: String(values.defaultTimeZone ?? "").trim(),
        defaultLanguage: String(values.defaultLanguage ?? "").trim(),
        sessionTimeoutMinutes: Number(values.sessionTimeoutMinutes) || 0,
        maxFileUploadSizeMB: Number(values.maxFileUploadSizeMB) || 0,
        allowedDocumentTypes: String(values.allowedDocumentTypes ?? "").trim(),
        maintenanceMode: Boolean(values.maintenanceMode),
        generalNotes: String(values.generalNotes ?? "").trim(),
    };
    const response = await api.put(API_ENDPOINTS.superAdmin.settings, payload, {
        headers: { "Content-Type": "application/json" },
    });

    return response.data?.data || response.data || payload;
};

export const searchSuperAdmin = async (query) => {
    const response = await api.get(API_ENDPOINTS.superAdmin.search, {
        params: { query: String(query ?? "").trim() },
    });
    return response.data?.data || response.data || {};
};

export const getOrganizations = async () => {
    const response = await api.get(API_ENDPOINTS.organizations.list);
    return extractCollection(response.data).map(normalizeOrganization);
};

export const getOrganizationsPage = async ({ search = "", status = "", page = 1, pageSize = 10 } = {}) => {
    const params = {
        page: Math.max(Number(page) || 1, 1),
        pageSize: Math.max(Number(pageSize) || 10, 1),
    };

    if (String(search).trim()) params.search = String(search).trim();
    if (String(status).trim()) params.status = String(status).trim();

    const response = await api.get(API_ENDPOINTS.organizations.list, { params });
    const payload = response.data?.data || response.data || {};
    const items = extractCollection(payload.items ?? payload.Items ?? payload).map(normalizeOrganization);

    return {
        items,
        totalCount: toNumber(payload.totalCount ?? payload.TotalCount, items.length),
        pageNumber: toNumber(payload.pageNumber ?? payload.PageNumber, params.page),
        pageSize: toNumber(payload.pageSize ?? payload.PageSize, params.pageSize),
        totalPages: toNumber(payload.totalPages ?? payload.TotalPages, Math.ceil(items.length / params.pageSize)),
    };
};

export const createOrganization = async (payload) => {
    const response = await api.post(API_ENDPOINTS.organizations.create, payload, {
        headers: { "Content-Type": "application/json" },
    });

    return normalizeOrganization(response.data?.data || response.data || {});
};

export const getOrganizationById = async (organizationId) => {
    const response = await api.get(API_ENDPOINTS.organizations.byId(organizationId));
    return normalizeOrganization(response.data?.data || response.data || {});
};

export const updateOrganization = async (organizationId, payload) => {
    const response = await api.put(API_ENDPOINTS.organizations.byId(organizationId), payload, {
        headers: { "Content-Type": "application/json" },
    });

    return normalizeOrganization(response.data?.data || response.data || {});
};

export const deleteOrganization = (organizationId) =>
    api.delete(API_ENDPOINTS.organizations.byId(organizationId));

export const updateOrganizationStatus = (organizationId, isActive, reason = "") =>
    api.put(API_ENDPOINTS.organizations.updateStatus(organizationId), {
        status: isActive ? "Active" : "Inactive",
        isActive: Boolean(isActive),
        reason,
    }, {
        headers: { "Content-Type": "application/json" },
    });

export const getOrganizationSubscription = async (organizationId) => {
    const response = await api.get(API_ENDPOINTS.organizations.subscription(organizationId));
    return normalizeSubscription(response.data?.data || response.data || {});
};

export const createOrganizationSubscription = async (organizationId, payload) => {
    const response = await api.post(
        API_ENDPOINTS.organizations.subscription(organizationId),
        payload,
        {
            headers: { "Content-Type": "application/json" },
        }
    );

    return normalizeSubscription(response.data?.data || response.data || {});
};

export const updateOrganizationSubscription = async (organizationId, payload) => {
    const response = await api.put(API_ENDPOINTS.organizations.subscription(organizationId), payload, {
        headers: { "Content-Type": "application/json" },
    });

    return normalizeSubscription(response.data?.data || response.data || {});
};

export const getOrganizationSubscriptionUsage = async (organizationId) => {
    const response = await api.get(API_ENDPOINTS.organizations.subscriptionUsage(organizationId));
    return response.data?.data || response.data || {};
};

export const getOrganizationSubscriptionsPage = async ({
    search = "",
    isActive,
    isExpired,
    pageNumber = 1,
    pageSize = 10,
} = {}) => {
    const params = {
        PageNumber: Math.max(Number(pageNumber) || 1, 1),
        PageSize: Math.max(Number(pageSize) || 10, 1),
    };

    if (String(search).trim()) params.Search = String(search).trim();
    if (typeof isActive === "boolean") params.IsActive = isActive;
    if (typeof isExpired === "boolean") params.IsExpired = isExpired;

    const response = await api.get(API_ENDPOINTS.organizations.subscriptions, { params });
    const payload = response.data?.data || response.data || {};
    const items = extractCollection(payload.items ?? payload.Items ?? payload).map(normalizeSubscription);

    return {
        items,
        totalCount: toNumber(payload.totalCount ?? payload.TotalCount, items.length),
        pageNumber: toNumber(payload.pageNumber ?? payload.PageNumber, params.PageNumber),
        pageSize: toNumber(payload.pageSize ?? payload.PageSize, params.PageSize),
        totalPages: toNumber(payload.totalPages ?? payload.TotalPages, Math.ceil(items.length / params.PageSize)),
    };
};

export const getOrganizationEmployeesPage = async (organizationId, {
    search = "",
    adminId,
    status = "",
    onboardingStatus = "",
    department = "",
    roleId,
    pageNumber = 1,
    pageSize = 10,
} = {}) => {
    const params = {
        OrganizationId: Number(organizationId),
        PageNumber: Math.max(Number(pageNumber) || 1, 1),
        PageSize: Math.max(Number(pageSize) || 10, 1),
    };

    if (String(search).trim()) params.Search = String(search).trim();
    if (adminId !== undefined && adminId !== null && adminId !== "") params.AdminId = Number(adminId);
    if (String(status).trim()) params.Status = String(status).trim();
    if (String(onboardingStatus).trim()) params.OnboardingStatus = String(onboardingStatus).trim();
    if (String(department).trim()) params.Department = String(department).trim();
    if (roleId !== undefined && roleId !== null && roleId !== "") params.RoleId = Number(roleId);

    const response = await api.get(API_ENDPOINTS.organizations.employees(organizationId), { params });
    const payload = response.data?.data || response.data || {};
    const items = extractCollection(payload.items ?? payload.Items ?? payload);

    return {
        items,
        totalCount: toNumber(payload.totalCount ?? payload.TotalCount, items.length),
        pageNumber: toNumber(payload.pageNumber ?? payload.PageNumber, params.PageNumber),
        pageSize: toNumber(payload.pageSize ?? payload.PageSize, params.PageSize),
        totalPages: toNumber(payload.totalPages ?? payload.TotalPages, Math.ceil(items.length / params.PageSize)),
    };
};

export const getOrganizationEmployeeById = async (organizationId, employeeId) => {
    const response = await api.get(API_ENDPOINTS.organizations.employeeById(organizationId, employeeId));
    return response.data?.data || response.data || {};
};

export const updateOrganizationEmployeeStatus = (organizationId, employeeId, isActive, reason = "") =>
    api.put(API_ENDPOINTS.organizations.updateEmployeeStatus(organizationId, employeeId), {
        status: isActive ? "Active" : "Inactive",
        isActive: Boolean(isActive),
        reason,
    }, {
        headers: { "Content-Type": "application/json" },
    });

export const updateAdminStatus = (adminId, isActive, reason = "") =>
    updateSuperAdminAdminStatus(adminId, isActive, reason);

export const getAdminSubscriptions = async () => {
    const response = await api.get(API_ENDPOINTS.adminSubscription.list);
    return extractCollection(response.data).map(normalizeSubscription);
};

export const updateAdminSubscription = (adminId, payload) =>
    api.put(API_ENDPOINTS.adminSubscription.update(adminId), payload, {
        headers: { "Content-Type": "application/json" },
    });

export const getAdminSubscriptionUsage = async (adminId) => {
    const response = await api.get(API_ENDPOINTS.adminSubscription.usage(adminId));
    return response.data?.data || response.data || {};
};
