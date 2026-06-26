import React, { useEffect, useState } from "react";
import {
  FaTachometerAlt,
  FaUsers,
  FaList,
  FaChevronDown,
  FaBuilding,
  FaCalendarAlt,
  FaShieldAlt,
  FaLaptop,
  FaCalendarMinus,
  FaBell,
  FaFileSignature,
  FaChartBar,
  FaMoneyBillWave,
  FaProjectDiagram,
  FaUserTie,
} from "react-icons/fa";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";
import pirnavLogo from "../assets/pirnav.png";
import { getStoredPermissions, getStoredRole } from "../utils/authStorage";

const normalize = (name) =>
  (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

const EXPANDABLE_MENUS = [
  {
    key: "employees",
    label: "Employees",
    icon: FaUsers,
    items: [
      {
        to: "/employees",
        icon: FaList,
        label: "Employee List",
        permission: "Employees",
      },
      {
        to: "/add-employee",
        icon: FaUsers,
        label: "Add Details",
        permission: "Add Employee",
      },
    ],
  },
  {
    key: "company",
    label: "Company",
    icon: FaBuilding,
    items: [
      {
        to: "/company",
        icon: FaBuilding,
        label: "Company Details",
        permission: "Company Details",
      },
      {
        to: "/projects",
        icon: FaList,
        label: "Projects",
        permission: "Projects",
      },
      {
        to: "/holidays",
        icon: FaCalendarAlt,
        label: "Holidays",
        permission: "Holidays",
      },
    ],
  },
  {
    key: "masters",
    label: "Masters",
    icon: FaShieldAlt,
    items: [
      {
        to: "/roles",
        icon: FaShieldAlt,
        label: "Roles",
        permission: "Roles",
      },
      {
        to: "/assets",
        icon: FaLaptop,
        label: "Assets",
        permission: "Assets",
      },
      {
        to: "/clients",
        icon: FaUserTie,
        label: "Clients",
        permission: "Clients",
      },
      {
        to: "/departments",
        icon: FaBuilding,
        label: "Departments",
        permission: "Departments",
      },
    ],
  },
];

const EXPANDABLE_MENU_PATHS = EXPANDABLE_MENUS.reduce((acc, menu) => {
  acc[menu.key] = menu.items.map((item) => item.to);
  return acc;
}, {});

const pathMatchesMenu = (pathname, menuKey) => {
  const menuPaths = EXPANDABLE_MENU_PATHS[menuKey] || [];

  return menuPaths.some((path) => {
    if (pathname === path) {
      return true;
    }

    return path === "/add-employee" && pathname.startsWith("/add-employee/");
  });
};

const STATIC_MENUS_BEFORE_DROPDOWNS = [
  {
    getTo: (roleName) => (roleName === "admin" ? "/dashboard" : "/user-dashboard"),
    icon: FaTachometerAlt,
    label: "Dashboard",
  },
  {
    to: "/user-holidays",
    icon: FaCalendarAlt,
    label: "My Holidays",
    permission: "User Holidays",
  },
];

const STATIC_MENUS_AFTER_DROPDOWNS = [
  {
    to: "/payroll",
    icon: FaMoneyBillWave,
    label: "Payroll",
    permission: "Payroll",
  },
  {
    to: "/user-payslip",
    icon: FaMoneyBillWave,
    label: "Payslip",
    permission: "User Payslip",
  },
  {
    to: "/reports",
    icon: FaChartBar,
    label: "Reports",
    permission: "Reports",
  },
  {
    to: "/offer-letters",
    icon: FaFileSignature,
    label: "Offer Letters",
    permission: "Offer Letters",
  },
  {
    to: "/attendance",
    icon: FaCalendarAlt,
    label: "Attendance",
    permission: "Attendance",
  },
  {
    to: "/user-attendance",
    icon: FaCalendarAlt,
    label: "My Attendance",
    permission: "User Attendance",
  },
  // {
  //   to: "/teams",
  //   icon: FaProjectDiagram,
  //   label: "Teams",
  // },
  {
    to: "/leave-management",
    icon: FaCalendarMinus,
    label: "Leave",
    permission: "Leave Management",
  },
  {
    to: "/user-leave-management",
    icon: FaCalendarMinus,
    label: "Employee Leave",
    permission: "User Leave Management",
  },
  {
    to: "/tasks",
    icon: FaList,
    label: "Tasks",
    permission: "Task Management",
  },
  {
    to: "/user-tasks",
    icon: FaList,
    label: "My Tasks",
    permission: "User Task Management",
  },
  {
    to: "/notifications",
    icon: FaBell,
    label: "Notifications",
    permission: "Notifications",
  },
  {
    to: "/user-notifications",
    icon: FaBell,
    label: "My Notifications",
    permission: "User Notifications",
  },
];

const getMenuKeyFromPath = (pathname) =>
  Object.entries(EXPANDABLE_MENU_PATHS).find(([, paths]) =>
    paths.some((path) =>
      pathname === path ||
      (path === "/add-employee" && pathname.startsWith("/add-employee/"))
    )
  )?.[0] || null;

const getMenuLinkClassName = ({ isActive }) =>
  `menu-item ${isActive ? "active" : ""}`;

const getSubmenuLinkClassName = ({ isActive }) =>
  `submenu-item ${isActive ? "active" : ""}`;

const hasPermission = (module) => {
  const role = getStoredRole();
  const permissions = getStoredPermissions();
  const normalizedModule = normalize(module);

  if (role === "admin") {
    return true;
  }

  if (!permissions || permissions.length === 0) {
    return false;
  }

  const allowedModules = permissions.map((permission) =>
    normalize(permission.moduleName)
  );

  return (
    allowedModules.includes(normalizedModule) || allowedModules.includes("all")
  );
};

function SidebarLink({ to, icon, label, compact, onClick }) {
  return (
    <NavLink
      to={to}
      className={getMenuLinkClassName}
      onClick={onClick}
      data-title={label}
      title={compact ? label : undefined}
    >
      <span className="menu-item-icon">{React.createElement(icon)}</span>
      <span className="menu-item-label">{label}</span>
    </NavLink>
  );
}

function SubmenuLink({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      className={getSubmenuLinkClassName}
      onClick={onClick}
      data-title={label}
    >
      <span className="submenu-item-icon">{React.createElement(icon)}</span>
      <span className="submenu-item-label">{label}</span>
    </NavLink>
  );
}

function Sidebar({ collapsed, isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation();
  const roleName = getStoredRole();
  const isCompact = !isMobile && collapsed;
  const routeMenu = isCompact ? null : getMenuKeyFromPath(location.pathname);
  const [menuState, setMenuState] = useState(() => ({
    active: routeMenu,
    interactionPath: location.pathname,
  }));
  const activeMenu = isCompact
    ? null
    : menuState.interactionPath === location.pathname
      ? menuState.active
      : routeMenu;

  useEffect(() => {
    if (!isMobile || !mobileOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobile, mobileOpen, onClose]);

  useEffect(() => {
    if (isMobile) {
      onClose?.();
    }
  }, [isMobile, location.pathname, onClose]);

  const toggleMenu = (menuKey) => {
    if (isCompact) {
      return;
    }

    setMenuState({
      active: activeMenu === menuKey ? null : menuKey,
      interactionPath: location.pathname,
    });
  };

  const closeMenus = () => {
    setMenuState({
      active: null,
      interactionPath: location.pathname,
    });
  };

  const handleLinkClick = () => {
    closeMenus();

    if (isMobile) {
      onClose?.();
    }
  };

  const isMenuExpanded = (menuKey) => !isCompact && activeMenu === menuKey;
  const isMenuActive = (menuKey) =>
    pathMatchesMenu(location.pathname, menuKey) || isMenuExpanded(menuKey);

  const renderStaticMenu = (item) => {

    // Hide user menus for admin
    const adminHiddenMenus = [
      "Add Details",
      "My Holidays",
      "Employee Leave",
      "My Attendance",
      "Payslip",
      "My Tasks",
      "My Notifications",
    ];

    if (roleName === "admin" && adminHiddenMenus.includes(item.label)) {
      return null;
    }

    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    const targetPath =
      typeof item.getTo === "function" ? item.getTo(roleName) : item.to;

    return (
      <SidebarLink
        key={item.label}
        to={targetPath}
        icon={item.icon}
        label={item.label}
        compact={isCompact}
        onClick={handleLinkClick}
      />
    );
  };

  const renderExpandableMenu = (menu) => {
    const visibleItems = menu.items.filter((item) => {
      // Hide Add Details for Admin
      if (roleName === "admin" && item.label === "Add Details") {
        return false;
      }

      return hasPermission(item.permission);
    });

    if (visibleItems.length === 0) {
      return null;
    }

    return (
      <div className="menu-section" key={menu.key}>
        <button
          type="button"
          className={`menu-item menu-toggle ${isMenuActive(menu.key) ? "active" : ""
            }`}
          onClick={() => toggleMenu(menu.key)}
          data-title={menu.label}
          aria-expanded={isMenuExpanded(menu.key)}
          title={isCompact ? menu.label : undefined}
        >
          <span className="menu-item-icon">{React.createElement(menu.icon)}</span>

          <span className="menu-item-label">{menu.label}</span>
          <span className="menu-arrow-wrap">
            <FaChevronDown
              className={`menu-arrow ${isMenuExpanded(menu.key) ? "rotated" : ""
                }`}
            />
          </span>
        </button>

        {!isCompact && (
          <div className={`submenu-shell ${isMenuExpanded(menu.key) ? "open" : ""}`}>
            <div className="submenu">
              {visibleItems.map((item) => (
                <SubmenuLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  onClick={handleLinkClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isMobile && (
        <button
          type="button"
          className={`sidebar-backdrop ${mobileOpen ? "open" : ""}`}
          onClick={() => onClose?.()}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`sidebar ${isCompact ? "collapsed" : ""} ${isMobile ? "mobile-sidebar" : ""
          } ${isMobile && mobileOpen ? "mobile-open" : ""}`}
      >
        <div className="logo">
          <img src={pirnavLogo} alt="Pirnav Logo" className="sidebar-logo-img" />
        </div>

        <nav className="menu">
          {STATIC_MENUS_BEFORE_DROPDOWNS.map(renderStaticMenu)}
          {EXPANDABLE_MENUS.map(renderExpandableMenu)}
          {STATIC_MENUS_AFTER_DROPDOWNS.map(renderStaticMenu)}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
