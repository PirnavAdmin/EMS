import { Navigate, useLocation } from "react-router-dom";
import { ticketPermissionMatches } from "../TicketManagement/ticketConfig";
import { usePermissionScope } from "../context/usePermissionScope";
import { isSuperAdmin, modulePermissionMatches } from "../utils/authorization";

const PermissionRoute = ({ children, module }) => {
  const { loadingPermissions, allowedModules = [], permissionScope } = usePermissionScope();
  const location = useLocation();
  const currentPath = location.pathname;
  const currentRole = String(permissionScope || "").trim().toLowerCase();

  if (isSuperAdmin()) {
    return children;
  }

  if (loadingPermissions) {
    return null;
  }

  if (currentRole === "admin") {
    console.log("[Admin Permission] Checking route permission:", {
      currentRole,
      currentPath,
      allowedModules,
    });
  }

  const hasAccess = allowedModules.some((permission) => {
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

    return (
      modulePermissionMatches(permission.moduleName || permission.ModuleName || "", module) ||
      ticketPermissionMatches(permission.moduleName || permission.ModuleName || "", module)
    );
  });

  if (hasAccess) {
    if (currentRole === "admin") {
      console.log("[Admin Permission] Access granted:", currentPath);
    }

    return children;
  }

  if (currentRole === "admin") {
    console.log("[Admin Permission] Access denied:", currentPath);
  }

  return <Navigate to="/unauthorized" replace />;
};

export default PermissionRoute;
