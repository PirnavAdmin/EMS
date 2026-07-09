import React, { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./dashboard/Header";
import api from "./api/axiosInstance";
import { API_ENDPOINTS } from "./api/endpoints";
 
import {
  getActiveAuthStorage,
  getStoredPermissions,
  getStoredRoleName,
  getStoredToken,
} from "./utils/authStorage";
import { isAdmin, isAuthenticationFailureResponse } from "./utils/authorization";
import {
  handleAutoLogout,
  isSessionExpired,
  startSessionTimer,
} from "./utils/sessionManager";
 
const MOBILE_LAYOUT_QUERY = "(max-width: 991px)";

function MainLayout() {
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
  // NARROW VIEWPORT
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
  // DRAWER BODY SCROLL
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
    const token = getStoredToken();

    if (!token) {
      return undefined;
    }

    if (isSessionExpired()) {
      handleAutoLogout({
        reason: "MainLayout detected an expired session during initialization",
      });
      return undefined;
    }

    startSessionTimer();

    return undefined;

  }, []);
 
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
 
        let roleName =
          getStoredRoleName();
 
        if (!token) {
 
          setStoredPermissions([]);
 
          return;
        }
 
        // ADMIN
        if (isAdmin()) {
 
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
        const isAuthFailure = isAuthenticationFailureResponse(
          error?.response?.status,
          error?.response?.data
        );

        // =========================
        // AUTO LOGOUT ON ERROR
        // =========================
        if (isAuthFailure) {
          handleAutoLogout({
            reason:
              "MainLayout permission initialization returned an auth failure",
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
 
 
