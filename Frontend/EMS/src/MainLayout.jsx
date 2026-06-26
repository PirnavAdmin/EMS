import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./dashboard/Header";
import api from "./api/axiosInstance";
import { API_ENDPOINTS } from "./api/endpoints";
 
import {
  getActiveAuthStorage,
  getStoredPermissions,
  getStoredRole,
  getStoredRoleName,
  getStoredToken,
  clearAuthData,
} from "./utils/authStorage";
import { clearSessionTimer } from "./utils/sessionManager";
 
const MOBILE_LAYOUT_QUERY = "(max-width: 767px)";
const AUTO_LOGOUT_TIME = 105 * 60 * 1000;
 
function MainLayout() {
 
  const navigate = useNavigate();
 
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
 
    if (
      typeof window === "undefined" ||
      !window.matchMedia
    ) {
      return false;
    }
 
    return window
      .matchMedia(MOBILE_LAYOUT_QUERY)
      .matches;
 
  });
 
  const [collapsed, setCollapsed] =
    useState(false);
 
  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);
 
  const [ready, setReady] =
    useState(false);
 
  // =========================
  // MOBILE VIEWPORT
  // =========================
  useEffect(() => {
 
    if (!window.matchMedia) {
      return undefined;
    }
 
    const mediaQuery =
      window.matchMedia(MOBILE_LAYOUT_QUERY);
 
    const handleViewportChange = (event) => {
 
      setIsMobileViewport(event.matches);
 
      setMobileSidebarOpen(false);
 
    };
 
    handleViewportChange(mediaQuery);
 
    if (mediaQuery.addEventListener) {
 
      mediaQuery.addEventListener(
        "change",
        handleViewportChange
      );
 
      return () =>
        mediaQuery.removeEventListener(
          "change",
          handleViewportChange
        );
    }
 
    mediaQuery.addListener(handleViewportChange);
 
    return () =>
      mediaQuery.removeListener(handleViewportChange);
 
  }, []);
 
  // =========================
  // MOBILE BODY SCROLL
  // =========================
  useEffect(() => {
 
    if (typeof document === "undefined") {
      return undefined;
    }
 
    const shouldLockScroll =
      isMobileViewport &&
      mobileSidebarOpen;
 
    const previousOverflow =
      document.body.style.overflow;
 
    document.body.style.overflow =
      shouldLockScroll
        ? "hidden"
        : "";
 
    return () => {
 
      document.body.style.overflow =
        previousOverflow;
 
    };
 
  }, [
    isMobileViewport,
    mobileSidebarOpen
  ]);
 
  // =========================
  // AUTO LOGOUT
  // =========================
  useEffect(() => {
    const performLogout = () => {
      clearSessionTimer();
      clearAuthData();
      navigate("/login", { replace: true });
    };
 
    const loginTime = Number(
      localStorage.getItem("loginTime")
    );
 
    if (!Number.isFinite(loginTime) || loginTime <= 0) {
      performLogout();
      return undefined;
    }
 
    const currentTime = Date.now();
    const elapsedTime = currentTime - loginTime;
    const remainingTime = AUTO_LOGOUT_TIME - elapsedTime;
 
    if (remainingTime <= 0) {
      performLogout();
      return undefined;
    }
 
    const logoutTimer = window.setTimeout(
      performLogout,
      remainingTime
    );
 
    return () => window.clearTimeout(logoutTimer);
 
  }, [navigate]);
 
  // =========================
  // FETCH PERMISSIONS
  // =========================
  useEffect(() => {
 
    const fetchPermissions = async () => {
 
      const storage =
        getActiveAuthStorage();
 
      const setStoredPermissions =
        (permissions) => {
 
          storage.setItem(
            "permissions",
            JSON.stringify(permissions)
          );
 
          storage.setItem(
            "modules",
            JSON.stringify(permissions)
          );
        };
 
      const normalizePermissionList =
        (data) => {
 
          const list =
            data?.data?.$values ||
            data?.data ||
            data?.$values ||
            data ||
            [];
 
          if (!Array.isArray(list)) {
            return [];
          }
 
          return list
            .filter(
              (permission) =>
                (
                  permission.canAccess ??
                  permission.CanAccess ??
                  true
                ) === true
            )
            .map((permission) => ({
              moduleId:
                permission.moduleId ??
                permission.ModuleId,
 
              moduleName:
                (
                  permission.moduleName ||
                  permission.ModuleName ||
                  ""
                ).trim(),
 
              canAccess: true,
            }))
            .filter(
              (permission) =>
                permission.moduleName
            );
        };
 
      try {
 
        const token =
          getStoredToken();
 
        const role =
          getStoredRole();
 
        let roleName =
          getStoredRoleName();
 
        if (!token) {
 
          setStoredPermissions([]);
 
          return;
        }
 
        // ADMIN
        if (role === "admin") {
 
          setStoredPermissions([
            {
              moduleName: "ALL",
              canAccess: true
            }
          ]);
 
          return;
        }
 
        const allowedModulesResponse =
          await api.get(
            API_ENDPOINTS.rolePermission.allowedModules,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );
 
        const allowedModules =
          normalizePermissionList(
            allowedModulesResponse.data
          );
 
        if (allowedModules.length > 0) {
 
          setStoredPermissions(
            allowedModules
          );
 
          return;
        }
 
        if (!roleName) {
 
          setStoredPermissions(
            getStoredPermissions()
          );
 
          return;
        }
 
        roleName =
          roleName.trim();
 
        const res =
          await api.get(
            API_ENDPOINTS.rolePermission.byRoleName(roleName),
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );
 
        const permissions =
          normalizePermissionList(
            res.data
          );
 
        if (permissions.length === 0) {
 
          setStoredPermissions(
            getStoredPermissions()
          );
 
          return;
        }
 
        setStoredPermissions(
          permissions
        );
 
      }
      catch (error) {
 
        console.error(
          "Permission initialization error:",
          error?.response?.data ||
          error.message
        );

        const errorMessage = [
          error?.response?.data?.message,
          error?.response?.data?.error,
          error?.response?.data?.title,
          error?.response?.data?.detail,
        ]
          .filter(Boolean)
          .join(" ");

        const isAuthFailure =
          error?.response?.status === 401 ||
          error?.response?.status === 403 ||
          /token\s+expired|session\s+expired|jwt\s+expired/i.test(
            errorMessage
          );

        // =========================
        // AUTO LOGOUT ON ERROR
        // =========================
        if (isAuthFailure) {
 
          clearSessionTimer();
 
          clearAuthData();
 
          navigate("/login", {
            replace: true,
          });
 
          return;
        }
 
        setStoredPermissions(
          getStoredPermissions()
        );
 
      }
      finally {
 
        setReady(true);
 
      }
    };
 
    fetchPermissions();
 
  }, []);
 
  // =========================
  // SIDEBAR
  // =========================
  const handleSidebarClose =
    useCallback(() => {
 
      setMobileSidebarOpen(false);
 
    }, []);
 
  const handleSidebarToggle = () => {
 
    if (isMobileViewport) {
 
      setMobileSidebarOpen(
        (prev) => !prev
      );
 
      return;
    }
 
    setCollapsed(
      (prev) => !prev
    );
  };
 
  // =========================
  // LOADING
  // =========================
  if (!ready) {
 
    return (
      <p style={{ padding: "20px" }}>
        Initializing...
      </p>
    );
  }
 
  // =========================
  // UI
  // =========================
  return (
    <div
      className={`app-layout ${isMobileViewport
        ? "is-mobile"
        : ""
        } ${mobileSidebarOpen
          ? "is-mobile-sidebar-open"
          : ""
        }`}
    >
 
      <Sidebar
        collapsed={collapsed}
        isMobile={isMobileViewport}
        mobileOpen={mobileSidebarOpen}
        onClose={handleSidebarClose}
      />
 
      <div
        className={`app-main ${!isMobileViewport &&
          collapsed
          ? "is-collapsed"
          : ""
          }`}
      >
 
        <Header
          collapsed={collapsed}
          isMobileViewport={isMobileViewport}
          onToggle={handleSidebarToggle}
        />
 
        <div className="app-main-scroll">
 
          <main className="page-shell">
            <Outlet />
          </main>
 
        </div>
      </div>
    </div>
  );
}
 
export default MainLayout;
 
 
