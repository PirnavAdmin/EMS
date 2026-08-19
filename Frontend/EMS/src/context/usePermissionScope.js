import { useMemo } from "react";
import { useAdminPermissions } from "./AdminPermissionContext";
import { useEmployeePermissions } from "./EmployeePermissionContext";
import {
  getStoredJwtRole,
  getStoredLoginType,
  getStoredRole,
  getStoredRoleName } from
"../utils/authStorage";
import { isAdmin, isEmployee, isRolePermissionRole, isSuperAdmin, resolveAuthRole } from "../utils/authorization";

const resolvePermissionScope = (roleValue = "") =>
resolveAuthRole(
  roleValue ||
  getStoredRole() ||
  getStoredRoleName() ||
  getStoredJwtRole() ||
  "",
  ""
);

export const usePermissionScope = () => {
  const adminPermissions = useAdminPermissions();
  const employeePermissions = useEmployeePermissions();
  const authenticatedRole = resolvePermissionScope();
  const loginType = getStoredLoginType() || (
  isSuperAdmin(authenticatedRole) ?
  "super-admin" :
  isAdmin(authenticatedRole) ?
  "admin" :
  isEmployee(authenticatedRole) || isRolePermissionRole(authenticatedRole) ?
  "user" :
  "");
  const adminRole = isAdmin(authenticatedRole);
  const employeeRole = isEmployee(authenticatedRole);
  const rolePermissionRole = isRolePermissionRole(authenticatedRole);
  const permissionFlow = loginType === "admin" ?
  "admin-permission" :
  loginType === "super-admin" ?
  "superadmin-bypass" :
  loginType === "user" ?
  "role-permission" :
  adminRole ?
  "admin-permission" :
  employeeRole || rolePermissionRole ?
  "role-permission" :
  "no-permission-api";

  const selectedPermissions =
  loginType === "admin" || loginType === "super-admin" ?
  adminPermissions :
  employeePermissions;

  return useMemo(
    () => ({
      ...selectedPermissions,
      permissionScope: authenticatedRole,
      authenticatedRole,
      loginType,
      selectedPermissionFlow: permissionFlow,
      permissionFlow,
      adminPermissions,
      employeePermissions
    }),
    [
      adminPermissions,
      authenticatedRole,
      employeePermissions,
      loginType,
      permissionFlow,
      selectedPermissions
    ]
  );
};
