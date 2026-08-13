import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./dashboard/Header";
import { PageSkeleton } from "./components/Skeletons";
import { getStoredToken } from "./utils/authStorage";
import { handleAutoLogout, isSessionExpired, startSessionTimer, clearSessionTimer } from "./utils/sessionManager";

function MainLayout({ permissionScope }) {
  const location = useLocation();
  const { loadingPermissions, error, errorStatus, refreshPermissions } = permissionScope;
  const permissionScopeName = permissionScope?.permissionScope;
  const permissionFlow = permissionScope?.permissionFlow;
  const loginType = permissionScope?.loginType;
  const allowedModules = Array.isArray(permissionScope?.allowedModules) ?
  permissionScope.allowedModules :
  [];
  const permissionErrorMessage =
  typeof error === "string" ? error : error?.message || "";
  const hasPermissionError = Boolean(error);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      clearSessionTimer();
      return undefined;
    }

    if (isSessionExpired()) {
      handleAutoLogout({
        reason: "MainLayout detected an expired session during initialization"
      });
      return undefined;
    }

    startSessionTimer();
    return undefined;
  }, []);

  useEffect(() => {

  }, [
  location.pathname,
  loadingPermissions,
  errorStatus,
  hasPermissionError,
  permissionScopeName,
  loginType,
  permissionFlow,
  allowedModules,
  permissionErrorMessage]
  );

  useEffect(() => {
    let listener;

    const setupListener = async () => {
      try {
        if (CapApp && typeof CapApp.addListener === "function") {
          listener = await CapApp.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              CapApp.exitApp();
            }
          });
        }
      } catch {

        // Native plugin is not available in standard browser sessions.
      }};

    setupListener();

    return () => {
      if (listener && typeof listener.remove === "function") {
        listener.remove();
      }
    };
  }, []);

  if (loadingPermissions) {
    return (
      <div className="app-layout">
        <div className="app-route-skeleton" style={{ padding: "24px" }}>
          <PageSkeleton variant="dashboard" />
        </div>
      </div>);

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
            background: "linear-gradient(180deg, var(--bg-primary), var(--bg-secondary))"
          }}>
          
          <div
            className="app-surface"
            style={{
              width: "min(100%, 640px)",
              padding: "32px",
              borderRadius: "24px",
              boxShadow: "0 20px 60px rgba(15,108,189,.12)",
              textAlign: "center"
            }}>
            
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
              style={{ minWidth: 160 }}>
              
              Retry
            </button>
          </div>
        </div>
      </div>);

  }

  return (
    <div
      className="app-layout">
      
      <Sidebar
        key={location.pathname}
        collapsed={collapsed} />
      

      <div className={`app-main ${collapsed ? "is-collapsed" : ""}`}>
        <Header
          collapsed={collapsed}
          onToggle={() => {
            setCollapsed((prev) => !prev);
          }} />
        

        <div className="app-main-scroll">
          <main className="page-shell">
            <Outlet />
          </main>
        </div>
      </div>

    </div>);

}

export default MainLayout;