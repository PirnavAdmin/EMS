import { Navigate } from "react-router-dom";
import { getStoredPermissions } from "../utils/authStorage";
import { ticketPermissionMatches } from "../TicketManagement/ticketConfig";
import { isAdmin } from "../utils/authorization";

const PermissionRoute = ({ children, module }) => {
  const permissions = getStoredPermissions();

  if (isAdmin()) {
    return children;
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return <Navigate to="/unauthorized" replace />;
  }

  const hasAccess = permissions.some((permission) => {
    if ((permission.canAccess ?? permission.CanAccess ?? true) !== true) {
      return false;
    }

    const normalizedModuleName = String(permission.moduleName || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (normalizedModuleName === "all") {
      return true;
    }

    return ticketPermissionMatches(permission.moduleName, module);
  });

  if (hasAccess) {
    return children;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default PermissionRoute;
