import { Navigate, useLocation } from "react-router-dom";
import { usePermissionScope } from "../context/usePermissionScope";
import { getStoredJwtRole, getStoredRole, getStoredRoleName, getStoredToken } from "../utils/authStorage";
import { normalizeRole } from "../utils/authorization";

const RoleRoute = ({ allowedRoles, children }) => {
  const location = useLocation();
  const { authenticatedRole, loadingPermissions, isReady } = usePermissionScope();
  const role =
    authenticatedRole ||
    getStoredRole() ||
    getStoredRoleName() ||
    getStoredJwtRole() ||
    "";

  console.log("role:", role, "allowed:", allowedRoles, "path:", location.pathname);

  if (loadingPermissions || (!role && getStoredToken() && !isReady)) {
    return (
      <div
        className="app-route-skeleton"
        aria-busy="true"
        aria-label="Loading account"
      />
    );
  }

  const normalizedRole = normalizeRole(role);
  const isAllowed = allowedRoles.some(
    (allowedRole) => normalizeRole(allowedRole) === normalizedRole
  );

  return isAllowed ? children : <Navigate to="/403" replace />;
};

export default RoleRoute;
