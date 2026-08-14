import { Navigate, useLocation } from "react-router-dom";
import { ticketPermissionMatches } from "../TicketManagement/ticketConfig";
import { usePermissionScope } from "../context/usePermissionScope";
import { getStoredEmployeeId, getStoredUserId } from "../utils/authStorage";
import { isSuperAdmin, modulePermissionMatches } from "../utils/authorization";
import { describePermissionForLog } from "../utils/debugLogging";

const matchesModulePermission = (permission, moduleName) => {
  const permissionModule = permission?.moduleName ?? permission?.ModuleName ?? "";

  if (!permissionModule || !String(moduleName ?? "").trim()) {
    return false;
  }

  return (
    modulePermissionMatches(permissionModule, moduleName) ||
    ticketPermissionMatches(permissionModule, moduleName)
  );
};

const PermissionRoute = ({ children, module }) => {
  const {
    loadingPermissions,
    allowedModules = [],
    permissionScope,
    authenticatedRole,
  } = usePermissionScope();
  const location = useLocation();
  const currentPath = location.pathname;
  const currentRole = String(authenticatedRole || permissionScope || "").trim().toLowerCase();
  const userId = getStoredUserId() || "";
  const employeeId = getStoredEmployeeId() || "";
  const permissionFound = Array.isArray(allowedModules)
    ? allowedModules.find((permission) => matchesModulePermission(permission, module)) || null
    : null;
  const canView = Boolean(
    permissionFound?.canView ??
      permissionFound?.CanView ??
      false
  );
  const accessGranted = Array.isArray(allowedModules)
    ? allowedModules.some((permission) => {
        const canAccess = permission?.canAccess ?? permission?.CanAccess ?? false;

        if (canAccess !== true) {
          return false;
        }

        const normalizedModuleName = String(permission.moduleName || permission.ModuleName || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        if (normalizedModuleName === "all") {
          return true;
        }

        return matchesModulePermission(permission, module);
      })
    : false;

  if (isSuperAdmin()) {
    console.log("[MODULE ACCESS CHECK]", {
      module,
      route: currentPath,
      userRole: currentRole,
      userId,
      employeeId,
      permissionFound: permissionFound ? describePermissionForLog(permissionFound) : null,
      canView,
      accessGranted: true
    });
    console.log("[MODULE ACCESS GRANTED]", {
      module,
      role: currentRole,
      userId,
      permission: permissionFound ? describePermissionForLog(permissionFound) : null
    });
    return children;
  }

  if (loadingPermissions) {
    return null;
  }

  console.log("[MODULE ACCESS CHECK]", {
    module,
    route: currentPath,
    userRole: currentRole,
    userId,
    employeeId,
    permissionFound: permissionFound ? describePermissionForLog(permissionFound) : null,
    canView,
    accessGranted
  });

  if (accessGranted) {
    console.log("[MODULE ACCESS GRANTED]", {
      module,
      role: currentRole,
      userId,
      permission: permissionFound ? describePermissionForLog(permissionFound) : null
    });
    return children;
  }

  console.warn("[MODULE ACCESS DENIED]", {
    module,
    role: currentRole,
    userId,
    employeeId,
    permission: permissionFound ? describePermissionForLog(permissionFound) : null
  });

  return <Navigate to="/unauthorized" replace />;
};

export default PermissionRoute;
