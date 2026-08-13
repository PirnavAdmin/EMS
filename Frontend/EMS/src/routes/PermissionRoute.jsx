import { Navigate, useLocation } from "react-router-dom";
import { ticketPermissionMatches } from "../TicketManagement/ticketConfig";
import { usePermissionScope } from "../context/usePermissionScope";
import { isSuperAdmin, modulePermissionMatches } from "../utils/authorization";

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

  if (isSuperAdmin()) {
    return children;
  }

  if (loadingPermissions) {
    return null;
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
    return children;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default PermissionRoute;
