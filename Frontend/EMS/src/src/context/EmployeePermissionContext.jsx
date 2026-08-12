/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ticketPermissionMatches } from "../TicketManagement/ticketConfig";
import {
  clearEmployeePermissionCache,
  fetchAllowedEmployeeModules,
  getEmployeePermissionErrorMessage,
  isEmployeePermissionAuthFailure,
} from "../services/employeePermissionService";
import {
  clearAuthData,
  getAuthenticatedUserSnapshot,
  getStoredEmployeeEmail,
  getStoredEmployeeId,
  getStoredEmployeePermissionSnapshot,
  getStoredRefreshToken,
  getStoredRole,
  getStoredRoleName,
  getStoredToken,
  persistEmployeePermissions,
} from "../utils/authStorage";
import {
  isEmployee,
  isSuperAdmin,
  modulePermissionMatches,
  normalizeLoginRole,
  normalizePermissionList,
} from "../utils/authorization";

const EmployeePermissionContext = createContext(null);

const normalizeModuleName = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const matchesModule = (permission, moduleName) => {
  const permissionName = String(
    permission?.moduleName ?? permission?.ModuleName ?? ""
  ).trim();

  if (!permissionName || !String(moduleName ?? "").trim()) {
    return false;
  }

  return (
    modulePermissionMatches(permissionName, moduleName) ||
    ticketPermissionMatches(permissionName, moduleName) ||
    modulePermissionMatches(
      normalizeModuleName(permissionName),
      normalizeModuleName(moduleName)
    )
  );
};

const normalizeSnapshot = (snapshot = {}) => {
  if (Array.isArray(snapshot)) {
    return {
      userId: "",
      userEmail: "",
      modules: normalizePermissionList(snapshot),
    };
  }

  const payload = snapshot?.data ?? snapshot ?? {};

  return {
    userId: String(
      payload.userId ??
        payload.UserId ??
        payload.employeeId ??
        payload.EmployeeId ??
        snapshot.userId ??
        snapshot.UserId ??
        snapshot.employeeId ??
        snapshot.EmployeeId ??
        getStoredEmployeeId() ??
        ""
    ).trim(),
    userEmail: String(
      payload.userEmail ??
        payload.UserEmail ??
        payload.employeeEmail ??
        payload.EmployeeEmail ??
        payload.email ??
        payload.Email ??
        snapshot.userEmail ??
        snapshot.UserEmail ??
        snapshot.employeeEmail ??
        snapshot.EmployeeEmail ??
        snapshot.email ??
        snapshot.Email ??
        getStoredEmployeeEmail() ??
        ""
    ).trim(),
    modules: normalizePermissionList(payload),
  };
};

const readCachedSnapshot = () => {
  const snapshot = getStoredEmployeePermissionSnapshot();

  if (snapshot && Array.isArray(snapshot.modules) && snapshot.modules.length > 0) {
    return snapshot;
  }

  return null;
};

const resolvePermission = (permissions, moduleName) =>
  permissions.find((permission) => matchesModule(permission, moduleName)) || null;

const resolvePermissionRole = () =>
  normalizeLoginRole(getStoredRole() || getStoredRoleName() || "user", "user");

const isEmployeeScope = (roleValue) => isEmployee(roleValue);

export const EmployeePermissionProvider = ({ children }) => {
  const initialSnapshot = readCachedSnapshot();
  const initialAuthSnapshot = getAuthenticatedUserSnapshot();
  const initialRole = normalizeLoginRole(
    initialAuthSnapshot.role ||
      initialAuthSnapshot.roleName ||
      getStoredRole() ||
      getStoredRoleName() ||
      "user",
    "user"
  );
  const hasCachedPermissions = Boolean(initialSnapshot?.modules?.length);
  const hasSyncedPermissionsRef = useRef(false);
  const [status, setStatus] = useState(
    () =>
      initialAuthSnapshot.token && isEmployeeScope(initialRole) && !hasCachedPermissions
        ? "loading"
        : "ready"
  );
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);
  const [token, setToken] = useState(
    () => initialAuthSnapshot.token || getStoredToken() || ""
  );
  const [role, setRole] = useState(() => initialRole);
  const [user, setUser] = useState(
    () => initialAuthSnapshot.user || null
  );
  const [refreshToken, setRefreshToken] = useState(
    () => initialAuthSnapshot.refreshToken || getStoredRefreshToken() || ""
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(initialAuthSnapshot.token || getStoredToken())
  );
  const [allowedModules, setAllowedModules] = useState(
    () => initialSnapshot?.modules || []
  );
  const [userId, setUserId] = useState(
    () => initialSnapshot?.userId || getStoredEmployeeId() || ""
  );
  const [userEmail, setUserEmail] = useState(
    () => initialSnapshot?.userEmail || getStoredEmployeeEmail() || ""
  );

  const isLoading = status === "loading";
  const isReady = status === "ready";

  const syncAuthState = useCallback(() => {
    const authSnapshot = getAuthenticatedUserSnapshot();
    const normalizedRole = normalizeLoginRole(
      authSnapshot.role ||
        authSnapshot.roleName ||
        getStoredRole() ||
        getStoredRoleName() ||
        "user",
      "user"
    );
    const normalizedUser = authSnapshot.user || null;
    const normalizedRefreshToken =
      authSnapshot.refreshToken || getStoredRefreshToken() || "";

    setToken(authSnapshot.token || "");
    setRole(normalizedRole);
    setUser(normalizedUser);
    setRefreshToken(normalizedRefreshToken);
    setIsAuthenticated(Boolean(authSnapshot.token));

    return {
      ...authSnapshot,
      role: normalizedRole,
      user: normalizedUser,
      refreshToken: normalizedRefreshToken,
      isAuthenticated: Boolean(authSnapshot.token),
    };
  }, []);

  const applySnapshot = useCallback((snapshot) => {
    const normalizedSnapshot = normalizeSnapshot(snapshot);

    setAllowedModules(normalizedSnapshot.modules);
    setUserId(normalizedSnapshot.userId || "");
    setUserEmail(normalizedSnapshot.userEmail || "");
    setStatus("ready");
    setError("");
    setErrorStatus(0);

    return normalizedSnapshot;
  }, []);

  const clearPermissionState = useCallback(() => {
    hasSyncedPermissionsRef.current = false;
    clearEmployeePermissionCache();
    clearAuthData();
    setStatus("ready");
    setError("");
    setErrorStatus(0);
    setToken("");
    setRole("");
    setUser(null);
    setRefreshToken("");
    setIsAuthenticated(false);
    setAllowedModules([]);
    setUserId("");
    setUserEmail("");
  }, []);

  const canAccessModule = useCallback(
    (moduleName) =>
      isEmployeeScope(role) &&
      resolvePermission(allowedModules, moduleName)?.canAccess === true,
    [allowedModules, role]
  );

  const getPermissionForModule = useCallback(
    (moduleName) =>
      isEmployeeScope(role) ? resolvePermission(allowedModules, moduleName) : null,
    [allowedModules, role]
  );

  const canViewModule = useCallback(
    (moduleName) => {
      if (!isEmployeeScope(role)) {
        return false;
      }

      const permission = resolvePermission(allowedModules, moduleName);
      return permission?.canAccess === true && permission?.canView === true;
    },
    [allowedModules, role]
  );

  const canAddModule = useCallback(
    (moduleName) => {
      if (!isEmployeeScope(role)) {
        return false;
      }

      const permission = resolvePermission(allowedModules, moduleName);
      return permission?.canAccess === true && permission?.canAdd === true;
    },
    [allowedModules, role]
  );

  const canEditModule = useCallback(
    (moduleName) => {
      if (!isEmployeeScope(role)) {
        return false;
      }

      const permission = resolvePermission(allowedModules, moduleName);
      return permission?.canAccess === true && permission?.canEdit === true;
    },
    [allowedModules, role]
  );

  const canDeleteModule = useCallback(
    (moduleName) => {
      if (!isEmployeeScope(role)) {
        return false;
      }

      const permission = resolvePermission(allowedModules, moduleName);
      return permission?.canAccess === true && permission?.canDelete === true;
    },
    [allowedModules, role]
  );

  const refreshPermissions = useCallback(
    async ({ force = false } = {}) => {
      const authSnapshot = syncAuthState();
      hasSyncedPermissionsRef.current = true;

      if (!authSnapshot.token) {
        clearPermissionState();
        return [];
      }

      const currentRole = normalizeLoginRole(
        authSnapshot.role || resolvePermissionRole() || "user",
        "user"
      );
      const currentRoleLabel = String(
        authSnapshot.roleName ||
          authSnapshot.role ||
          getStoredRoleName() ||
          getStoredRole() ||
          currentRole
      ).trim();
      const isSuperAdminRole = isSuperAdmin(currentRole);
      const permissionFlow = isEmployeeScope(currentRole)
        ? "role-permission"
        : isSuperAdminRole
          ? "superadmin-bypass"
          : "no-permission-api";

      if (!isEmployeeScope(currentRole)) {
        console.log("Authenticated Role:", currentRoleLabel || currentRole || "unknown");
        console.log("Selected Permission Flow:", permissionFlow);

        if (isSuperAdminRole) {
          console.log("Skipping permission API for Super Admin");
        }

        console.log("Selected Permission API:", "none");
        setAllowedModules([]);
        setStatus("ready");
        setError("");
        setErrorStatus(0);
        return [];
      }

      if (!force) {
        const cachedSnapshot = readCachedSnapshot();

        if (cachedSnapshot?.modules?.length > 0) {
          applySnapshot(cachedSnapshot);
          return cachedSnapshot.modules;
        }
      }

      setStatus("loading");
      setError("");
      setErrorStatus(0);

      const currentUserId =
        authSnapshot.userId ||
        authSnapshot.employeeId ||
        getStoredEmployeeId() ||
        "";
      const currentUserEmail =
        authSnapshot.userEmail ||
        authSnapshot.email ||
        getStoredEmployeeEmail() ||
        "";

      console.log("Authenticated Role:", currentRoleLabel || currentRole);
      console.log("Selected Permission Flow:", permissionFlow);
      console.log("Selected Permission API:", "/RolePermission/allowed-modules");
      console.log("JWT Token:", authSnapshot.token || getStoredToken() || "");

      try {
        const modules = await fetchAllowedEmployeeModules({
          force,
          userId: currentUserId,
          userEmail: currentUserEmail,
          role: currentRoleLabel || currentRole,
        });

        console.log("Permission Response:", modules);

        const snapshot = {
          userId: currentUserId,
          userEmail: currentUserEmail,
          modules,
        };

        applySnapshot(snapshot);
        persistEmployeePermissions(snapshot);

        console.log("Visible Modules:", modules);

        return modules;
      } catch (fetchError) {
        const errorStatusCode = Number(fetchError?.response?.status || 0);

        if (isEmployeePermissionAuthFailure(fetchError)) {
          clearPermissionState();
          throw fetchError;
        }

        setAllowedModules([]);
        setStatus("error");
        setErrorStatus(errorStatusCode);
        setError(
          getEmployeePermissionErrorMessage(
            fetchError,
            errorStatusCode === 403
              ? "You do not have permission to access this resource."
              : "Unable to load your assigned modules."
          )
        );

        throw fetchError;
      }
    },
    [applySnapshot, clearPermissionState, syncAuthState]
  );

  useEffect(() => {
    if (
      !token ||
      !isEmployeeScope(role) ||
      hasSyncedPermissionsRef.current ||
      allowedModules.length > 0
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void refreshPermissions({ force: true }).catch(() => {});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [allowedModules.length, refreshPermissions, role, token]);

  const value = useMemo(
    () => ({
      status,
      error,
      errorStatus,
      token,
      role,
      user,
      refreshToken,
      isAuthenticated,
      userId,
      userEmail,
      allowedModules,
      modules: allowedModules,
      permissions: allowedModules,
      isLoading,
      loadingPermissions: isLoading,
      isReady,
      canAccessModule,
      CanAccess: canAccessModule,
      canViewModule,
      CanView: canViewModule,
      canAddModule,
      CanAdd: canAddModule,
      canEditModule,
      CanEdit: canEditModule,
      canDeleteModule,
      CanDelete: canDeleteModule,
      getPermissionForModule,
      refreshPermissions,
      clearPermissionState,
    }),
    [
      allowedModules,
      canAccessModule,
      canAddModule,
      canDeleteModule,
      canEditModule,
      canViewModule,
      clearPermissionState,
      error,
      errorStatus,
      getPermissionForModule,
      isAuthenticated,
      isLoading,
      isReady,
      refreshPermissions,
      refreshToken,
      role,
      status,
      token,
      user,
      userEmail,
      userId,
    ]
  );

  return (
    <EmployeePermissionContext.Provider value={value}>
      {children}
    </EmployeePermissionContext.Provider>
  );
};

export const useEmployeePermissions = () => {
  const context = useContext(EmployeePermissionContext);

  if (!context) {
    throw new Error("useEmployeePermissions must be used within EmployeePermissionProvider.");
  }

  return context;
};
