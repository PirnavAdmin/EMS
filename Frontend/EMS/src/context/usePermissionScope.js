import { useEffect } from "react";
import { useAdminPermissions } from "./AdminPermissionContext";
import { useEmployeePermissions } from "./EmployeePermissionContext";
import { getStoredJwtRole, getStoredRole, getStoredRoleName } from "../utils/authStorage";
import { isAdmin, isEmployee, isSuperAdmin } from "../utils/authorization";

const resolvePermissionScope = (roleValue = "") => {
  const role =
    roleValue ||
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
  const resolvedRole =
    getStoredRole() ||
    getStoredRoleName() ||
    getStoredJwtRole() ||
    "";
  const scope = resolvePermissionScope(resolvedRole);
  const permissionFlow =
    scope === "superadmin"
      ? "superadmin-bypass"
      : scope === "employee"
        ? "role-permission"
        : scope === "admin"
          ? "admin-permission"
          : "no-permission-api";
  const adminPermissionCount = Array.isArray(adminPermissions?.allowedModules)
    ? adminPermissions.allowedModules.length
    : 0;
  const employeePermissionCount = Array.isArray(employeePermissions?.allowedModules)
    ? employeePermissions.allowedModules.length
    : 0;

  const selectedPermissions =
    scope === "employee" ? employeePermissions : adminPermissions;

  useEffect(() => {
    console.log("[permissionScope] Resolved permission flow", {
      resolvedRole: resolvedRole || "unknown",
      permissionScope: scope,
      permissionFlow,
      adminPermissionCount,
      employeePermissionCount,
    });
  }, [resolvedRole, scope, permissionFlow, adminPermissionCount, employeePermissionCount]);

  return {
    ...selectedPermissions,
    permissionScope: scope,
    permissionFlow,
    adminPermissions,
    employeePermissions,
  };
};
