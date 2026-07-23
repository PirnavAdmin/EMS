import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value ?? "").trim().toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
};

export const normalizePermissionRecord = (permission = {}) => {
  const hasGranularPermissions = [
    permission.canView,
    permission.CanView,
    permission.canAdd,
    permission.CanAdd,
    permission.canEdit,
    permission.CanEdit,
    permission.canDelete,
    permission.CanDelete,
  ].some((value) => value !== undefined && value !== null);
  const legacyAccess = toBoolean(
    firstDefined(permission.canAccess, permission.CanAccess, false)
  );
  const canView = toBoolean(firstDefined(permission.canView, permission.CanView, legacyAccess));
  const canAdd = toBoolean(firstDefined(permission.canAdd, permission.CanAdd, hasGranularPermissions ? false : legacyAccess));
  const canEdit = toBoolean(firstDefined(permission.canEdit, permission.CanEdit, hasGranularPermissions ? false : legacyAccess));
  const canDelete = toBoolean(firstDefined(permission.canDelete, permission.CanDelete, hasGranularPermissions ? false : legacyAccess));

  return {
    moduleId: firstDefined(permission.moduleId, permission.ModuleId),
    moduleName: String(firstDefined(permission.moduleName, permission.ModuleName, "")).trim(),
    canView,
    canAdd,
    canEdit,
    canDelete,
    canAccess: toBoolean(firstDefined(permission.canAccess, permission.CanAccess, canView || canAdd || canEdit || canDelete)),
  };
};

const extractPermissionCollection = (payload) => {
  const candidates = [
    payload?.modules,
    payload?.Modules,
    payload?.modules?.$values,
    payload?.Modules?.$values,
    payload?.data?.modules,
    payload?.data?.Modules,
    payload?.data?.modules?.$values,
    payload?.data?.Modules?.$values,
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

export const normalizePermissionList = (payload) =>
  extractPermissionCollection(payload)
    .map(normalizePermissionRecord)
    .filter((permission) => permission.moduleId || permission.moduleName);

export const normalizeEmployeeRecord = (employee = {}) => ({
  employeeId: String(
    firstDefined(
      employee.employeeId,
      employee.EmployeeId,
      employee.employee_Id,
      employee.Employee_Id,
      employee.empId,
      employee.id,
      ""
    )
  ).trim(),
  employeeName: String(
    firstDefined(
      employee.employeeName,
      employee.EmployeeName,
      employee.name,
      employee.fullName,
      `${firstDefined(employee.firstName, employee.FirstName, "")} ${firstDefined(employee.lastName, employee.LastName, "")}`
    )
  ).trim(),
  role: String(firstDefined(employee.role, employee.Role, employee.roleName, employee.RoleName, "")).trim(),
  status: String(firstDefined(employee.status, employee.Status, employee.isActive === false ? "Inactive" : "", employee.IsActive === false ? "Inactive" : "", "Active")).trim(),
});

export const saveUserPermission = (payload) =>
  api.post(API_ENDPOINTS.userPermission.save, payload, {
    headers: { "Content-Type": "application/json" },
  });

export const getUserPermission = async (employeeId) => {
  const response = await api.get(API_ENDPOINTS.userPermission.get(employeeId));
  return {
    raw: response.data,
    modules: normalizePermissionList(response.data),
  };
};

export const getAllowedModules = async (employeeId) => {
  const response = await api.get(API_ENDPOINTS.userPermission.allowed(employeeId));
  return normalizePermissionList(response.data);
};

export const getEmployeesByRole = async (roleName) => {
  const response = await api.get(API_ENDPOINTS.rolePermission.employees(roleName));
  return extractCollection(response.data).map(normalizeEmployeeRecord);
};
