import { useEffect } from "react";
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
  const adminPermissionCount = Array.isArray(adminPermissions?.allowedModules) ?
  adminPermissions.allowedModules.length :
  0;
  const employeePermissionCount = Array.isArray(employeePermissions?.allowedModules) ?
  employeePermissions.allowedModules.length :
  0;

  const selectedPermissions =
  loginType === "admin" || loginType === "super-admin" ?
  adminPermissions :
  employeePermissions;

  useEffect(() => {

  }, [
  authenticatedRole,
  loginType,
  permissionFlow,
  adminPermissionCount,
  employeePermissionCount,
  selectedPermissions]
  );

  return {
    ...selectedPermissions,
    permissionScope: authenticatedRole,
    authenticatedRole,
    loginType,
    selectedPermissionFlow: permissionFlow,
    permissionFlow,
    adminPermissions,
    employeePermissions
  };
};