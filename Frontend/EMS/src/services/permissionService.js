import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import { toBoolean } from "../utils/boolean";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

export const normalizePermissionRecord = (permission = {}) => {
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
  const hasGranularPermissions = [
    permission.canView,
    permission.CanView,
    permission.canAdd,
    permission.CanAdd,
    permission.canEdit,
    permission.CanEdit,
    permission.canDelete,
    permission.CanDelete,
    permission.canUpload,
    permission.CanUpload,
    permission.upload,
    permission.Upload,
    permission.canDownload,
    permission.CanDownload,
    permission.download,
    permission.Download,
    permission.canSubmit,
    permission.CanSubmit,
    permission.submit,
    permission.Submit,
    permission.canApprove,
    permission.CanApprove,
    permission.approve,
    permission.Approve,
  ].some((value) => value !== undefined && value !== null);
  const legacyAccess = toBoolean(
    firstDefined(permission.canAccess, permission.CanAccess, false)
  );
  const canView = toBoolean(firstDefined(permission.canView, permission.CanView, legacyAccess));
  const canAdd = toBoolean(firstDefined(permission.canAdd, permission.CanAdd, hasGranularPermissions ? false : legacyAccess));
  const canEdit = toBoolean(firstDefined(permission.canEdit, permission.CanEdit, hasGranularPermissions ? false : legacyAccess));
  const canDelete = toBoolean(firstDefined(permission.canDelete, permission.CanDelete, hasGranularPermissions ? false : legacyAccess));
  const canUpload = toBoolean(firstDefined(permission.canUpload, permission.CanUpload, permission.upload, permission.Upload, hasGranularPermissions ? false : legacyAccess));
  const canDownload = toBoolean(firstDefined(permission.canDownload, permission.CanDownload, permission.download, permission.Download, hasGranularPermissions ? false : legacyAccess));
  const canSubmit = toBoolean(firstDefined(permission.canSubmit, permission.CanSubmit, permission.submit, permission.Submit, hasGranularPermissions ? false : legacyAccess));
  const canApprove = toBoolean(firstDefined(permission.canApprove, permission.CanApprove, permission.approve, permission.Approve, hasGranularPermissions ? false : legacyAccess));
  const derivedAccess =
    canView || canAdd || canEdit || canDelete || canUpload || canDownload || canSubmit || canApprove;

  return {
    permissionId,
    screenId,
    moduleId,
    moduleName: String(firstDefined(permission.moduleName, permission.ModuleName, "")).trim(),
    type: String(firstDefined(permission.type, permission.Type, permission.moduleType, permission.ModuleType, "")).trim(),
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
      toBoolean(firstDefined(permission.canAccess, permission.CanAccess, false)),
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

export const getUserPermission = async (roleName) => {
  const response = await api.get(
    API_ENDPOINTS.rolePermission.get(roleName)
  );

  return normalizePermissionList(response.data);
};

export const getEmployeesByRole = async (roleName) => {
  const employeesListEndpoint = API_ENDPOINTS?.employees?.list;

  console.log("Selected Role:", roleName);
  console.log("Endpoint:", employeesListEndpoint);

  if (!employeesListEndpoint) {
    throw new Error("Employee LIST endpoint is not configured.");
  }

  try {
    const response = await api.get(employeesListEndpoint);
    const normalizedRole = String(roleName ?? "").trim().toLowerCase();

    console.log("Employee Response:", response.data);

    return extractCollection(response?.data ?? [])
      .map(normalizeEmployeeRecord)
      .filter((employee) => {
        if (!normalizedRole) {
          return true;
        }

        return String(employee.role ?? "").trim().toLowerCase() === normalizedRole;
      });
  } catch (error) {
    console.error("Employee API Error:", error?.response?.data || error);
    throw error;
  }
};
