import { useAdminPermissions } from "./AdminPermissionContext";
import { useEmployeePermissions } from "./EmployeePermissionContext";
import { getStoredJwtRole, getStoredRole, getStoredRoleName } from "../utils/authStorage";
import { isAdmin, isEmployee, isSuperAdmin } from "../utils/authorization";

const resolvePermissionScope = () => {
  const role =
    getStoredRole() ||
    getStoredRoleName() ||
    getStoredJwtRole() ||
    "";

  if (isSuperAdmin(role)) {
    return "superadmin";
  }

  if (isAdmin(role)) {
    return "admin";
  }

  if (isEmployee(role)) {
    return "employee";
  }

  return "admin";
};

export const usePermissionScope = () => {
  const adminPermissions = useAdminPermissions();
  const employeePermissions = useEmployeePermissions();
  const scope = resolvePermissionScope();
  const permissionFlow =
    scope === "superadmin"
      ? "superadmin-bypass"
      : scope === "employee"
        ? "role-permission"
        : scope === "admin"
          ? "admin-permission"
          : "no-permission-api";

  const selectedPermissions =
    scope === "employee" ? employeePermissions : adminPermissions;

  return {
    ...selectedPermissions,
    permissionScope: scope,
    permissionFlow,
    adminPermissions,
    employeePermissions,
  };
};
