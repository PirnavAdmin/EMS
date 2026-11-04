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
        const canAccess =
          permission?.canAccess ??
          permission?.CanAccess ??
          permission?.canView ??
          permission?.CanView ??
          permission?.canEdit ??
          permission?.CanEdit ??
          permission?.canApprove ??
          permission?.CanApprove ??
          false;

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

  if (import.meta.env.DEV && module === "EmployeeExit") {
    console.log("[Admin Permissions] EmployeeExit route decision:", {
      loadingPermissions,
      requestedModule: module,
      allowedModules,
      accessGranted,
    });
  }

  if (loadingPermissions) {
    return <div className="app-route-skeleton" aria-busy="true" aria-label="Loading permissions" />;
  }

  if (accessGranted) {
    return children;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default PermissionRoute;
