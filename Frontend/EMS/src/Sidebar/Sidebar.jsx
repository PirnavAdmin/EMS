import React, { useEffect, useRef, useState } from "react";
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
  FaCog,
  FaTicketAlt,
} from "react-icons/fa";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";
import pirnavLogo from "../assets/pirnav.png";
import { getStoredPermissions } from "../utils/authStorage";
import { getUserRole, hasRole, isAdmin } from "../utils/authorization";

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
  {
    key: "tickets",
    label: "Ticket Management",
    labelByRole: {
      user: "My Tickets",
      employee: "My Tickets",
    },
    icon: FaTicketAlt,
    items: [
      {
        to: "/admin/tickets",
        icon: FaList,
        label: "All Tickets",
        permission: "All Tickets",
      },
      {
        to: "/employee/my-tickets",
        icon: FaList,
        label: "My Tickets",
        permission: "My Tickets",
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
  {
    to: "/teams",
    icon: FaProjectDiagram,
    label: "Teams",
  },
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
  {
    to: "/settings",
    icon: FaCog,
    label: "Settings",
    adminOnly: true,
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
  const permissions = getStoredPermissions();

  if (isAdmin()) {
    return true;
  }

  if (!permissions || permissions.length === 0) {
    return false;
  }

  return permissions.some((permission) => {
    if ((permission.canAccess ?? permission.CanAccess ?? true) !== true) {
      return false;
    }

    return (
      permission.moduleName?.trim().toLowerCase() ===
      module.trim().toLowerCase()
    );
  });
};

function SidebarLink({ to, icon, label, compact, onClick }) {
  return (
    <NavLink
      to={to}
      className={getMenuLinkClassName}
      onClick={onClick}
      data-title={label}
      data-nav-target={to}
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
      data-nav-target={to}
    >
      <span className="submenu-item-icon">{React.createElement(icon)}</span>
      <span className="submenu-item-label">{label}</span>
    </NavLink>
  );
}

function Sidebar({ collapsed, isMobile = false, mobileOpen = false, onClose }) {
  const location = useLocation();
  const roleName = getUserRole();
  const isCompact = !isMobile && collapsed;
  const routeMenu = isCompact ? null : getMenuKeyFromPath(location.pathname);
  const [menuState, setMenuState] = useState(() => ({
    active: routeMenu,
    interactionPath: location.pathname,
  }));
  const [submenuDirections, setSubmenuDirections] = useState({});
  const menuButtonRefs = useRef({});
  const submenuRefs = useRef({});
  const activeMenu = isCompact
    ? null
    : menuState.interactionPath === location.pathname
      ? menuState.active
      : routeMenu;

  const setMenuButtonRef = (menuKey) => (node) => {
    if (node) {
      menuButtonRefs.current[menuKey] = node;
      return;
    }

    delete menuButtonRefs.current[menuKey];
  };

  const setSubmenuRef = (menuKey) => (node) => {
    if (node) {
      submenuRefs.current[menuKey] = node;
      return;
    }

    delete submenuRefs.current[menuKey];
  };

  const measureSubmenuDirection = (menuKey) => {
    if (typeof window === "undefined") {
      return "down";
    }

    const button = menuButtonRefs.current[menuKey];
    const submenu = submenuRefs.current[menuKey];

    if (!button || !submenu) {
      return "down";
    }

    const rect = button.getBoundingClientRect();
    const submenuHeight =
      submenu.scrollHeight || submenu.offsetHeight || 0;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const buffer = 16;

    if (spaceBelow >= submenuHeight + buffer) {
      return "down";
    }

    if (spaceAbove >= submenuHeight + buffer) {
      return "up";
    }

    return spaceAbove > spaceBelow ? "up" : "down";
  };

  const syncSubmenuDirection = (menuKey) => {
    const nextDirection = measureSubmenuDirection(menuKey);

    setSubmenuDirections((prev) => ({
      ...prev,
      [menuKey]: nextDirection,
    }));

    return nextDirection;
  };

  useEffect(() => {
    if (isCompact || !menuState.active) {
      return undefined;
    }

    const updateDirection = () => {
      syncSubmenuDirection(menuState.active);
    };

    updateDirection();
    window.addEventListener("resize", updateDirection);
    window.addEventListener("orientationchange", updateDirection);

    return () => {
      window.removeEventListener("resize", updateDirection);
      window.removeEventListener("orientationchange", updateDirection);
    };
  }, [isCompact, menuState.active]);

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

    if (activeMenu === menuKey) {
      setMenuState({
        active: null,
        interactionPath: location.pathname,
      });
      return;
    }

    syncSubmenuDirection(menuKey);

    setMenuState({
      active: menuKey,
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
      "My Notifications",
    ];

    if (item.adminOnly && !isAdmin()) {
      return null;
    }

    if (isAdmin() && adminHiddenMenus.includes(item.label)) {
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
      if (isAdmin() && item.label === "Add Details") {
        return false;
      }

      // Hide My Tickets for Admin
      if (isAdmin() && item.label === "My Tickets") {
        return false;
      }

      // Hide All Tickets for Employee/User
      if (hasRole("employee", "user") && item.label === "All Tickets") {
        return false;
      }

      return hasPermission(item.permission);
    });

    const submenuDirection = submenuDirections[menu.key] || "down";

    if (
      menu.key === "tickets" &&
      hasRole("user", "employee") &&
      visibleItems.length === 1
    ) {
      const item = visibleItems[0];

      return (
        <SidebarLink
          key={menu.key}
          to={item.to}
          icon={menu.icon}
          label={item.label}
          compact={isCompact}
          onClick={handleLinkClick}
        />
      );
    }

    return (
      <div
        className={`menu-section ${submenuDirection === "up"
            ? "submenu-open-up"
            : "submenu-open-down"
          }`}
        key={menu.key}
      >
        <button
          type="button"
          className={`menu-item menu-toggle ${isMenuActive(menu.key) ? "active" : ""
            }`}
          ref={setMenuButtonRef(menu.key)}
          onClick={() => toggleMenu(menu.key)}
          data-title={menu.label}
          aria-expanded={isMenuExpanded(menu.key)}
          title={isCompact ? menu.label : undefined}
        >
          <span className="menu-item-icon">{React.createElement(menu.icon)}</span>

          <span className="menu-item-label">
            {menu.labelByRole?.[roleName] || menu.label}
          </span>
          <span className="menu-arrow-wrap">
            <FaChevronDown
              className={`menu-arrow ${isMenuExpanded(menu.key) ? "rotated" : ""
                }`}
            />
          </span>
        </button>

        {!isCompact && (
          <div
            ref={setSubmenuRef(menu.key)}
            className={`submenu-shell ${isMenuExpanded(menu.key) ? "open" : ""}`}
          >
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
