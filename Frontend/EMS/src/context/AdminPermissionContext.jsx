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
  clearAdminPermissionCache,
  createSuperAdminPermissionSnapshot,
  fetchAllowedModulesForRole,
  getAdminPermissionErrorMessage,
  isAdminPermissionAuthFailure,
  SUPER_ADMIN_FULL_ACCESS_MODULES,
} from "../services/adminPermissionService";
import {
  clearAuthData,
  getAuthenticatedUserSnapshot,
  getStoredAdminEmail,
  getStoredAdminId,
  getStoredRefreshToken,
  getStoredRole,
  getStoredRoleName,
  getStoredToken,
  getStoredUserRecord,
  persistAdminPermissions,
} from "../utils/authStorage";
import {
  clearCurrentAdminAllowedModules,
  getCurrentAdminAllowedModules,
  setCurrentAdminAllowedModules,
} from "../utils/adminPermissionState";
import {
  isAdmin,
  modulePermissionMatches,
  normalizeLoginRole,
  normalizePermissionList,
  isSuperAdmin,
} from "../utils/authorization";

const AdminPermissionContext = createContext(null);

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
      adminId: "",
      adminEmail: "",
      modules: normalizePermissionList(snapshot),
    };
  }

  const payload = snapshot?.data ?? snapshot ?? {};

  return {
    adminId: String(
      payload.adminId ??
        payload.AdminId ??
        payload.adminID ??
        snapshot.adminId ??
        snapshot.AdminId ??
        snapshot.adminID ??
        getStoredAdminId() ??
        ""
    ).trim(),
    adminEmail: String(
      payload.adminEmail ??
        payload.AdminEmail ??
        payload.email ??
        payload.Email ??
        snapshot.adminEmail ??
        snapshot.AdminEmail ??
        snapshot.email ??
        snapshot.Email ??
        getStoredAdminEmail() ??
        ""
    ).trim(),
    modules: normalizePermissionList(payload),
  };
};

const readCachedSnapshot = () => {
  const modules = getCurrentAdminAllowedModules();

  if (Array.isArray(modules) && modules.length > 0) {
    return {
      adminId: getStoredAdminId() || "",
      adminEmail: getStoredAdminEmail() || "",
      modules,
    };
  }

  return null;
};

const resolvePermission = (permissions, moduleName) =>
  permissions.find((permission) => matchesModule(permission, moduleName)) || null;

const resolvePermissionRole = () => {
  const storedRole = getStoredRole() || getStoredRoleName() || "";

  if (isSuperAdmin(storedRole)) {
    return "superadmin";
  }

  if (isAdmin(storedRole)) {
    return "admin";
  }

  return "";
};

export const AdminPermissionProvider = ({ children }) => {
  const initialSnapshot = readCachedSnapshot();
  const initialAuthSnapshot = getAuthenticatedUserSnapshot();
  const hasCachedPermissions = Boolean(initialSnapshot?.modules?.length);
  const initialResolvedRole = resolvePermissionRole();
  const isInitialSuperAdmin = isSuperAdmin(initialResolvedRole);
  const hasSyncedPermissionsRef = useRef(false);
  const [status, setStatus] = useState(
    () =>
      initialAuthSnapshot.token &&
      initialResolvedRole &&
      !hasCachedPermissions &&
      !isInitialSuperAdmin
        ? "loading"
        : "ready"
  );
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);
  const [token, setToken] = useState(
    () => initialAuthSnapshot.token || getStoredToken() || ""
  );
  const [role, setRole] = useState(() =>
    normalizeLoginRole(
      initialAuthSnapshot.role ||
        initialAuthSnapshot.roleName ||
        getStoredRole() ||
        getStoredRoleName() ||
        "admin",
      "admin"
    )
  );
  const [user, setUser] = useState(
    () => initialAuthSnapshot.user || getStoredUserRecord() || null
  );
  const [refreshToken, setRefreshToken] = useState(
    () => initialAuthSnapshot.refreshToken || getStoredRefreshToken() || ""
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(initialAuthSnapshot.token || getStoredToken())
  );
  const [allowedModules, setAllowedModules] = useState(
    () =>
      initialSnapshot?.modules ||
      (isInitialSuperAdmin
        ? SUPER_ADMIN_FULL_ACCESS_MODULES.map((module) => ({ ...module }))
        : [])
  );
  const [adminId, setAdminId] = useState(
    () => initialSnapshot?.adminId || getStoredAdminId() || ""
  );
  const [adminEmail, setAdminEmail] = useState(
    () => initialSnapshot?.adminEmail || getStoredAdminEmail() || ""
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
        "admin",
      "admin"
    );
    const normalizedUser =
      authSnapshot.user || getStoredUserRecord() || null;
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
    setAdminId(normalizedSnapshot.adminId || "");
    setAdminEmail(normalizedSnapshot.adminEmail || "");
    setCurrentAdminAllowedModules(normalizedSnapshot.modules);
    setStatus("ready");
    setError("");
    setErrorStatus(0);

    return normalizedSnapshot;
  }, []);

  const clearPermissionState = useCallback(() => {
    hasSyncedPermissionsRef.current = false;
    clearAdminPermissionCache();
    clearCurrentAdminAllowedModules();
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
    setAdminId("");
    setAdminEmail("");
  }, []);

  const canAccessModule = useCallback(
    (moduleName) =>
      isSuperAdmin(role) ||
      resolvePermission(allowedModules, moduleName)?.canAccess === true,
    [allowedModules, role]
  );

  const getPermissionForModule = useCallback(
    (moduleName) =>
      isSuperAdmin(role)
        ? {
            canAccess: true,
            canView: true,
            canAdd: true,
            canEdit: true,
            canDelete: true,
          }
        : resolvePermission(allowedModules, moduleName),
    [allowedModules, role]
  );

  const canViewModule = useCallback(
    (moduleName) => {
      if (isSuperAdmin(role)) {
        return true;
      }

      const permission = resolvePermission(allowedModules, moduleName);
      return permission?.canAccess === true && permission?.canView === true;
    },
    [allowedModules, role]
  );

  const canAddModule = useCallback(
    (moduleName) => {
      if (isSuperAdmin(role)) {
        return true;
      }

      const permission = resolvePermission(allowedModules, moduleName);
      return permission?.canAccess === true && permission?.canAdd === true;
    },
    [allowedModules, role]
  );

  const canEditModule = useCallback(
    (moduleName) => {
      if (isSuperAdmin(role)) {
        return true;
      }

      const permission = resolvePermission(allowedModules, moduleName);
      return permission?.canAccess === true && permission?.canEdit === true;
    },
    [allowedModules, role]
  );

  const canDeleteModule = useCallback(
    (moduleName) => {
      if (isSuperAdmin(role)) {
        return true;
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
        authSnapshot.role || resolvePermissionRole() || "admin",
        "admin"
      );
      const isSuperAdminRole = isSuperAdmin(currentRole);
      const permissionFlow = isSuperAdminRole
        ? "superadmin-bypass"
        : isAdmin(currentRole)
          ? "admin-permission"
          : "no-permission-api";

      console.log("Authenticated Role:", currentRole);
      console.log("Selected Permission Flow:", permissionFlow);

      if (isSuperAdminRole) {
        console.log("Skipping permission API for Super Admin");

        const snapshot = persistAdminPermissions(
          createSuperAdminPermissionSnapshot({
            adminId: authSnapshot.adminId || getStoredAdminId() || "",
            adminEmail: authSnapshot.adminEmail || getStoredAdminEmail() || "",
          })
        );

        applySnapshot(snapshot);

        console.log("Selected Permission API:", "none");
        console.log("Permission Response:", snapshot.modules);
        console.log("Allowed Modules:", snapshot.modules);

        return snapshot.modules;
      }

      if (!isAdmin(currentRole) && !isSuperAdmin(currentRole)) {
        clearCurrentAdminAllowedModules();
        setAllowedModules([]);
        setStatus("ready");
        setError("");
        setErrorStatus(0);
        return [];
      }

      if (force) {
        clearCurrentAdminAllowedModules();
        setAllowedModules([]);
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

      const currentAdminId =
        authSnapshot.adminId || getStoredAdminId() || "";
      const currentAdminEmail =
        authSnapshot.adminEmail || getStoredAdminEmail() || "";

      console.log("JWT Token:", authSnapshot.token || getStoredToken() || "");

      try {
        const modules = await fetchAllowedModulesForRole(currentRole, {
          force,
          adminId: currentAdminId,
          adminEmail: currentAdminEmail,
        });

        console.log("Permission Response:", modules);

        const snapshot = {
          adminId: currentAdminId,
          adminEmail: currentAdminEmail,
          modules,
        };

        applySnapshot(snapshot);

        console.log("Allowed Modules:", modules);

        return modules;
      } catch (fetchError) {
        const errorStatusCode = Number(fetchError?.response?.status || 0);

        if (isAdminPermissionAuthFailure(fetchError)) {
          clearPermissionState();
          throw fetchError;
        }

        setAllowedModules([]);
        setStatus("error");
        setErrorStatus(errorStatusCode);
        setError(
          getAdminPermissionErrorMessage(
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
      (!isAdmin(role) && !isSuperAdmin(role)) ||
      hasSyncedPermissionsRef.current ||
      allowedModules.length > 0
    ) {
      return;
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
      adminId,
      adminEmail,
      allowedModules,
      isLoading,
      loadingPermissions: isLoading,
      isReady,
      canAccessModule,
      canViewModule,
      canAddModule,
      canEditModule,
      canDeleteModule,
      getPermissionForModule,
      refreshPermissions,
      clearPermissionState,
    }),
    [
      adminEmail,
      adminId,
      allowedModules,
      isAuthenticated,
      canAccessModule,
      canAddModule,
      canDeleteModule,
      canEditModule,
      canViewModule,
      clearPermissionState,
      error,
      errorStatus,
      getPermissionForModule,
      isLoading,
      isReady,
      refreshPermissions,
      refreshToken,
      role,
      status,
      token,
      user,
    ]
  );

  return (
    <AdminPermissionContext.Provider value={value}>
      {children}
    </AdminPermissionContext.Provider>
  );
};

export const useAdminPermissions = () => {
  const context = useContext(AdminPermissionContext);

  if (!context) {
    throw new Error("useAdminPermissions must be used within AdminPermissionProvider.");
  }

  return context;
};
