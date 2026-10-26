import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./dashboard/Header";
import { PageSkeleton } from "./components/Skeletons";
import { getStoredToken } from "./utils/authStorage";
import { isAdmin, isSuperAdmin } from "./utils/authorization";
import { handleAutoLogout, isSessionExpired, startSessionTimer, clearSessionTimer } from "./utils/sessionManager";
import "./touch-layout.css";

const TOUCH_LAYOUT_QUERY = "(max-width: 768px), (hover: none) and (pointer: coarse)";
const TABLE_VIEW_STORAGE_KEY = "ems-touch-table-view";

const getStoredTableView = () =>
  typeof window !== "undefined" && window.localStorage.getItem(TABLE_VIEW_STORAGE_KEY) === "cards"
    ? "cards"
    : "table";
 
function MainLayout({ permissionScope }) {
  const { loadingPermissions, error, errorStatus, refreshPermissions } = permissionScope;
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isTouchLayout, setIsTouchLayout] = useState(false);
  const [tableView, setTableView] = useState(getStoredTableView);
  const billingRouteAllowed =
    location.pathname === "/super-admin/billing" && (isAdmin() || isSuperAdmin());
 
  useEffect(() => {
    const mediaQuery = window.matchMedia(TOUCH_LAYOUT_QUERY);
    const updateTouchLayout = () => setIsTouchLayout(mediaQuery.matches);

    updateTouchLayout();
    mediaQuery.addEventListener("change", updateTouchLayout);
    return () => mediaQuery.removeEventListener("change", updateTouchLayout);
  }, []);

  useEffect(() => {
    if (!isTouchLayout) {
      return undefined;
    }

    const scrollContainers = Array.from(
      document.querySelectorAll(".page-shell .app-table-scroll, .page-shell .table-scroll, .page-shell [class$='table-wrapper'], .page-shell [class*='table-scroll']")
    );
    const cleanups = scrollContainers.map((container) => {
      container.classList.add("touch-table-scroll");
      const updateScrollState = () => {
        container.dataset.scrolled = container.scrollLeft > 8 ? "true" : "false";
      };
      updateScrollState();
      container.addEventListener("scroll", updateScrollState, { passive: true });
      return () => container.removeEventListener("scroll", updateScrollState);
    });

    document.querySelectorAll(".page-shell table").forEach((table) => {
      const headings = Array.from(table.querySelectorAll("thead th")).map((heading) => heading.textContent.trim());
      table.querySelectorAll("tbody tr").forEach((row) => {
        Array.from(row.children).forEach((cell, index) => {
          if (cell.tagName === "TD" && headings[index]) {
            cell.dataset.label = headings[index];
          }
        });
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [isTouchLayout, location.pathname]);

  useEffect(() => {
    document.documentElement.dataset.tableView = isTouchLayout ? tableView : "table";
    if (isTouchLayout) {
      window.localStorage.setItem(TABLE_VIEW_STORAGE_KEY, tableView);
    }
  }, [isTouchLayout, tableView]);

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

  const sidebarCollapsed = collapsed || isTouchLayout;
 
  if (errorStatus === 403 && !billingRouteAllowed) {
    return <Navigate to="/403" replace />;
  }
 
  if (error && !billingRouteAllowed) {
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
      className={`app-layout ${isTouchLayout ? "is-touch-layout" : ""}`}>
     
      <Sidebar
        collapsed={sidebarCollapsed} />
     
 
      <div className={`app-main ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <Header
          collapsed={sidebarCollapsed}
          onToggle={() => {
            if (!isTouchLayout) {
              setCollapsed((prev) => !prev);
            }
          }} />
       
 
        <div className="app-main-scroll">
          <main className="page-shell">
            <Outlet />
          </main>
        </div>
      </div>

      {isTouchLayout && (
        <button
          type="button"
          className="touch-table-view-toggle"
          aria-pressed={tableView === "cards"}
          onClick={() => setTableView((current) => current === "table" ? "cards" : "table")}
        >
          {tableView === "table" ? "Cards" : "Table"}
        </button>
      )}
 
    </div>);
 
}
 
export default MainLayout;
 
 
