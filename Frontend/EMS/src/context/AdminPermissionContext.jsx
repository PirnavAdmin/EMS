/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState } from
"react";
import { ticketPermissionMatches } from "../TicketManagement/ticketConfig";
import {
  clearAdminPermissionCache,
  createSuperAdminPermissionSnapshot,
  fetchAllowedModulesForRole,
  getAdminPermissionErrorMessage,
  isAdminPermissionAuthFailure,
  SUPER_ADMIN_FULL_ACCESS_MODULES } from
"../services/adminPermissionService";
import {
  clearAuthData,
  getAuthenticatedUserSnapshot,
  getStoredAdminEmail,
  getStoredAdminId,
  getStoredAuthValue,
  getStoredRefreshToken,
  getStoredLoginType,
  getStoredRole,
  getStoredRoleName,
  getStoredToken,
  getStoredUserRecord,
  persistAdminPermissions } from
"../utils/authStorage";
import {
  clearCurrentAdminAllowedModules,
  getCurrentAdminAllowedModules,
  setCurrentAdminAllowedModules } from
"../utils/adminPermissionState";
import {
  isAdmin,
  modulePermissionMatches,
  resolveAuthRole,
  normalizePermissionList,
  isSuperAdmin } from
"../utils/authorization";
import { logPermissionCollection, sanitizeForDebug } from "../utils/debugLogging";

const AdminPermissionContext = createContext(null);

const normalizeModuleName = (value) =>
String(value ?? "").
trim().
toLowerCase().
replace(/[^a-z0-9]/g, "");

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
    ));

};

const normalizeSnapshot = (snapshot = {}) => {
  if (Array.isArray(snapshot)) {
    return {
      adminId: "",
      adminEmail: "",
      modules: normalizePermissionList(snapshot)
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
    modules: normalizePermissionList(payload)
  };
};

const readCachedSnapshot = () => {
  const modules = getCurrentAdminAllowedModules();

  if (Array.isArray(modules) && modules.length > 0) {
    return {
      adminId: getStoredAdminId() || "",
      adminEmail: getStoredAdminEmail() || "",
      modules
    };
  }

  return null;
};

const resolvePermission = (permissions, moduleName) =>
permissions.find((permission) => matchesModule(permission, moduleName)) || null;

const resolvePermissionRole = () => {
  const storedRole = getStoredRole() || getStoredRoleName() || "";
  const loginType = getStoredLoginType();

  if (loginType === "super-admin") {
    return "superadmin";
  }

  if (loginType === "admin") {
    return "admin";
  }

  if (loginType === "user") {
    return "";
  }

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
    !isInitialSuperAdmin ?
    "loading" :
    "ready"
  );
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);
  const [token, setToken] = useState(
    () => initialAuthSnapshot.token || getStoredToken() || ""
  );
  const [role, setRole] = useState(() =>
  resolveAuthRole(
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
    initialSnapshot?.modules || (
    isInitialSuperAdmin ?
    SUPER_ADMIN_FULL_ACCESS_MODULES.map((module) => ({ ...module })) :
    [])
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
    const normalizedRole = resolveAuthRole(
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
      isAuthenticated: Boolean(authSnapshot.token)
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
    isSuperAdmin(role) ?
    {
      canAccess: true,
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true
    } :
    resolvePermission(allowedModules, moduleName),
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

      const currentRole = resolveAuthRole(
        authSnapshot.role || resolvePermissionRole() || "admin",
        "admin"
      );
      const currentLoginType = authSnapshot.loginType || getStoredLoginType() || "";
      const isSuperAdminRole =
      currentLoginType === "super-admin" ?
      true :
      currentLoginType ?
      false :
      isSuperAdmin(currentRole);
      const isAdminRole =
      currentLoginType === "admin" ?
      true :
      currentLoginType ?
      false :
      isAdmin(currentRole);
      const permissionFlow = isSuperAdminRole ?
      "superadmin-bypass" :
      isAdminRole ?
      "admin-permission" :
      "no-permission-api";
      const selectedPermissionApi = isSuperAdminRole ?
      "none" :
      isAdminRole ?
      "/AdminPermission/allowed-modules" :
      "none";

      console.log("========== MODULE PERMISSION START ==========");
      console.log(
        "[PERMISSION] Current User ID:",
        authSnapshot.adminId || getStoredAdminId() || getStoredAuthValue("userId") || ""
      );
      console.log("[PERMISSION] Current Employee ID:", getStoredAuthValue("employeeId") || "");
      console.log("[PERMISSION] Current Role:", currentRole);
      console.log("[PERMISSION] Permission API Endpoint:", selectedPermissionApi);
      console.log("[PERMISSION] Permission Flow:", permissionFlow);

      if (isSuperAdminRole) {

        const snapshot = persistAdminPermissions(
          createSuperAdminPermissionSnapshot({
            adminId: authSnapshot.adminId || getStoredAdminId() || "",
            adminEmail: authSnapshot.adminEmail || getStoredAdminEmail() || ""
          })
        );

        logPermissionCollection(snapshot.modules || []);
        applySnapshot(snapshot);

        return snapshot.modules;
      }

      if (!isAdminRole && !isSuperAdminRole) {
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

      try {
        const modules = await fetchAllowedModulesForRole(currentRole, {
          force,
          adminId: currentAdminId,
          adminEmail: currentAdminEmail
        });

        const apiModules = Array.isArray(modules) ? modules : [];
        const snapshot = {
          adminId: currentAdminId,
          adminEmail: currentAdminEmail,
          modules: apiModules
        };

        console.log("[PERMISSION PROCESSING] Raw permissions:", sanitizeForDebug(apiModules));
        console.log("[PERMISSION PROCESSING] Processed permissions:", sanitizeForDebug(snapshot.modules));
        console.log("[PERMISSION PROCESSING] Permission state before update:", sanitizeForDebug(allowedModules));

        applySnapshot(snapshot);

        return apiModules;
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
            errorStatusCode === 403 ?
            "You do not have permission to access this resource." :
            "Unable to load your assigned modules."
          )
        );

        throw fetchError;
      }
    },
    [allowedModules, applySnapshot, clearPermissionState, syncAuthState]
  );

  useEffect(() => {
    if (
    !token ||
    !isAdmin(role) && !isSuperAdmin(role) ||
    hasSyncedPermissionsRef.current ||
    allowedModules.length > 0)
    {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshPermissions({ force: true }).catch(() => {});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [allowedModules.length, refreshPermissions, role, token]);

  useEffect(() => {
    console.log("[PERMISSION STATE] Updated permissions:", sanitizeForDebug(allowedModules));
  }, [allowedModules]);

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
      clearPermissionState
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
    user]

  );

  return (
    <AdminPermissionContext.Provider value={value}>
      {children}
    </AdminPermissionContext.Provider>);

};

export const useAdminPermissions = () => {
  const context = useContext(AdminPermissionContext);

  if (!context) {
    throw new Error("useAdminPermissions must be used within AdminPermissionProvider.");
  }

  return context;
};
