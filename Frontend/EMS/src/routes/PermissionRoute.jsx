import { Navigate } from "react-router-dom";
import { ticketPermissionMatches } from "../TicketManagement/ticketConfig";
import { usePermissionScope } from "../context/usePermissionScope";
import { modulePermissionMatches } from "../utils/authorization";

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
  } = usePermissionScope();
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

  if (loadingPermissions) {
    return null;
  }

  if (accessGranted) {
    return children;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default PermissionRoute;
