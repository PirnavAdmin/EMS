import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  CheckSquare,
  FileText,
  Menu,
} from "lucide-react";
import "./MobileBottomNav.css";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: CalendarCheck,
  },
  {
    label: "Tasks",
    path: "/task-management",
    icon: CheckSquare,
  },
  {
    label: "Leaves",
    path: "/leave-management",
    icon: FileText,
  },
];

export default function MobileBottomNav({ onToggleSidebar, sidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              className={`mobile-nav-item ${isActive ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              type="button"
            >
              <div className="mobile-nav-icon-wrapper">
                <Icon size={20} className="mobile-nav-icon" />
              </div>
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          className={`mobile-nav-item ${sidebarOpen ? "active" : ""}`}
          onClick={onToggleSidebar}
        >
          <div className="mobile-nav-icon-wrapper">
            <Menu size={20} className="mobile-nav-icon" />
          </div>
          <span className="mobile-nav-label">Menu</span>
        </button>
      </div>
    </nav>
  );
}
