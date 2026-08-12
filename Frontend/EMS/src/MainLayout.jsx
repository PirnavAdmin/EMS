import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./dashboard/Header";
import MobileBottomNav from "./components/mobile/MobileBottomNav";
import { PageSkeleton } from "./components/Skeletons";
import { getStoredToken } from "./utils/authStorage";
import { isOnboardingUser } from "./utils/authorization";
import { handleAutoLogout, isSessionExpired, startSessionTimer, clearSessionTimer } from "./utils/sessionManager";

const MOBILE_LAYOUT_QUERY = "(max-width: 991px)";

function MainLayout({ permissionScope }) {
  const location = useLocation();
  const { loadingPermissions, error, errorStatus, refreshPermissions } = permissionScope;
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }

    return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);

    const handleViewportChange = (event) => {
      setIsMobileViewport(event.matches);
      setMobileSidebarOpen(false);
    };

    handleViewportChange(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleViewportChange);

      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);

    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const shouldLockScroll = isMobileViewport && mobileSidebarOpen;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = shouldLockScroll ? "hidden" : "";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileViewport, mobileSidebarOpen]);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      clearSessionTimer();
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

  useEffect(() => {
    let listener;

    const setupListener = async () => {
      try {
        if (CapApp && typeof CapApp.addListener === "function") {
          listener = await CapApp.addListener("backButton", ({ canGoBack }) => {
            if (mobileSidebarOpen) {
              setMobileSidebarOpen(false);
            } else if (canGoBack) {
              window.history.back();
            } else {
              CapApp.exitApp();
            }
          });
        }
      } catch {
        // Native plugin is not available in standard browser sessions.
      }
    };

    setupListener();

    return () => {
      if (listener && typeof listener.remove === "function") {
        listener.remove();
      }
    };
  }, [mobileSidebarOpen]);

  if (loadingPermissions) {
    return (
      <div className="app-layout">
        <div className="app-route-skeleton" style={{ padding: "24px" }}>
          <PageSkeleton variant="dashboard" />
        </div>
      </div>
    );
  }

  if (errorStatus === 403) {
    return <Navigate to="/403" replace />;
  }

  if (error) {
    return (
      <div className="app-layout">
        <div
          style={{
            minHeight: "100vh",
            width: "100%",
            display: "grid",
            placeItems: "center",
            padding: "32px",
            background: "linear-gradient(180deg, var(--bg-primary), var(--bg-secondary))",
          }}
        >
          <div
            className="app-surface"
            style={{
              width: "min(100%, 640px)",
              padding: "32px",
              borderRadius: "24px",
              boxShadow: "0 20px 60px rgba(15,108,189,.12)",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: 0, color: "var(--text-primary)" }}>
              Unable to load your permissions
            </h2>
            <p style={{ margin: "12px 0 24px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {error}
            </p>
            <button
              type="button"
              className="app-button-primary"
              onClick={() => {
                void refreshPermissions({ force: true }).catch(() => {});
              }}
              style={{ minWidth: 160 }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`app-layout ${isMobileViewport ? "is-mobile" : ""} ${
        mobileSidebarOpen ? "is-mobile-sidebar-open" : ""
      }`}
    >
      <Sidebar
        key={location.pathname}
        collapsed={collapsed}
        isMobile={isMobileViewport}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div
        className={`app-main ${!isMobileViewport && collapsed ? "is-collapsed" : ""}`}
      >
        <Header
          collapsed={collapsed}
          isMobileViewport={isMobileViewport}
          onToggle={() => {
            if (isMobileViewport) {
              setMobileSidebarOpen((prev) => !prev);
              return;
            }

            setCollapsed((prev) => !prev);
          }}
        />

        <div className="app-main-scroll">
          <main className="page-shell">
            <Outlet />
          </main>
        </div>
      </div>

      {!isOnboardingUser() && (
        <MobileBottomNav
          onToggleSidebar={() => {
            if (isMobileViewport) {
              setMobileSidebarOpen((prev) => !prev);
              return;
            }

            setCollapsed((prev) => !prev);
          }}
          sidebarOpen={mobileSidebarOpen}
        />
      )}
    </div>
  );
}

export default MainLayout;
