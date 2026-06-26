import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaBars,
  FaBell,
  FaChevronDown,
  FaCloudSun,
  FaKey,
  FaMoon,
  FaSignOutAlt,
  FaSun,
  FaUser,
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  clearAuthData,
  getStoredAuthValue,
  getStoredRole,
} from "../utils/authStorage";
import { clearSessionTimer } from "../utils/sessionManager";
import useTheme from "../theme/useTheme";
import ChangePasswordModal from "./ChangePasswordModal";

const getGreetingMeta = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return {
      text: "Good Morning",
      Icon: FaSun,
    };
  }

  if (hour < 17) {
    return {
      text: "Good Afternoon",
      Icon: FaCloudSun,
    };
  }

  return {
    text: "Good Evening",
    Icon: FaMoon,
  };
};

function Header({ collapsed = false, isMobileViewport = false, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const profileMenuRef = useRef(null);
  const { themeMode, themeOptions, setThemeMode } = useTheme();
  const [openProfile, setOpenProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [greetingMeta, setGreetingMeta] = useState(getGreetingMeta());

  const role = getStoredRole();
  const email = getStoredAuthValue("email", "No Email");

  const profileLabel = useMemo(() => {
    const safeEmail = String(email || "").trim();
    if (!safeEmail || safeEmail === "No Email") {
      return "User";
    }

    return safeEmail.split("@")[0].replace(/[._-]+/g, " ");
  }, [email]);
  const GreetingIcon = greetingMeta.Icon;

  useEffect(() => {
    let isMounted = true;

    const fetchNotificationStatus = async () => {
      try {
        const apiUrl =
          role.toLowerCase() === "admin"
            ? API_ENDPOINTS.notifications.admin
            : API_ENDPOINTS.notifications.user;

        const response = await api.get(apiUrl);
        const data = response?.data?.data || response?.data || [];

        if (isMounted) {
          setNotifications(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Header notification fetch error:", error);

        if (isMounted) {
          setNotifications([]);
        }
      }
    };

    const syncGreeting = () => {
      if (isMounted) {
        setGreetingMeta(getGreetingMeta());
      }
    };

    const handleNotificationsUpdated = () => {
      fetchNotificationStatus();
    };

    syncGreeting();
    fetchNotificationStatus();
    const interval = window.setInterval(syncGreeting, 60000);

    window.addEventListener("notificationsUpdated", handleNotificationsUpdated);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener(
        "notificationsUpdated",
        handleNotificationsUpdated
      );
    };
  }, [role]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setOpenProfile(false);
      }
    };

    if (openProfile) {
      window.addEventListener("pointerdown", handleOutsideClick);
    }

    return () => {
      window.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [openProfile]);

  useEffect(() => {
    const closeTimer = window.setTimeout(() => {
      setOpenProfile(false);
    }, 0);

    return () => window.clearTimeout(closeTimer);
  }, [location.pathname]);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;
  const headerOffset = collapsed
    ? "var(--layout-sidebar-collapsed-width)"
    : "var(--layout-sidebar-width)";

  const handleLogout = () => {
    clearSessionTimer();
    clearAuthData();
    navigate("/login");
  };

  const handleNotificationClick = () => {
    if (role.toLowerCase() === "admin") {
      navigate("/notifications");
      return;
    }

    navigate("/user-notifications");
  };

  const handleProfileClick = () => {
    setOpenProfile(false);
    navigate("/add-employee");
  };

  const handleChangePassword = () => {
    setOpenProfile(false);
    setShowPasswordModal(true);
  };

  return (
    <>
      <header
        className="app-header"
        style={{
          position: "fixed",
          top: 0,
          left: isMobileViewport ? "0" : headerOffset,
          right: 0,
          width: isMobileViewport ? "100%" : `calc(100% - ${headerOffset})`,
          zIndex: 1000,
        }}
      >
        <div className="app-header-inner">
          <div className="app-header-left">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={onToggle}
              aria-label="Toggle sidebar"
            >
              <FaBars />
            </button>

            <div className="app-header-search">
              <div
                className="app-header-search-panel"
                aria-label={greetingMeta.text}
              >
                <GreetingIcon className="app-header-greeting-icon" />
                <span className="app-header-greeting">{greetingMeta.text}</span>
              </div>
            </div>
          </div>

          <div className="app-header-right">
            <button
              type="button"
              className="header-icon-button"
              onClick={handleNotificationClick}
              aria-label="Open notifications"
            >
              <span className="header-icon-glyph">
                <FaBell />
              </span>

              {unreadCount > 0 && (
                <span className="header-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <div className="profile-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="profile-trigger"
                aria-haspopup="menu"
                aria-expanded={openProfile}
                onClick={() => setOpenProfile((prev) => !prev)}
              >
                <span className="profile-avatar">
                  {profileLabel.charAt(0).toUpperCase() || "U"}
                </span>

                <span className="profile-copy">
                  <span className="profile-name">{profileLabel}</span>
                  <span className="profile-email">{email}</span>
                </span>

                <FaChevronDown className="profile-chevron" />
              </button>

              <div className={`profile-dropdown ${openProfile ? "open" : ""}`}>
                <div className="profile-dropdown-head">
                  <strong>{profileLabel}</strong>
                  <span>{email}</span>
                </div>
                {role?.toLowerCase() !== "admin" && (
                  <button
                    type="button"
                    className="profile-item"
                    onClick={handleProfileClick}
                  >
                    <span className="profile-item-icon">
                      <FaUser />
                    </span>
                    <span>My Profile</span>
                  </button>
                )}

                <button
                  type="button"
                  className="profile-item"
                  onClick={handleChangePassword}
                >
                  <span className="profile-item-icon">
                    <FaKey />
                  </span>
                  <span>Change Password</span>
                </button>

                <div className="profile-appearance-section">
                  <span className="profile-appearance-label">Theme</span>

                  {themeOptions.map((option) => {
                    const isActive = themeMode === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`profile-mode-toggle ${
                          isActive ? "active" : ""
                        }`}
                        onClick={() => setThemeMode(option.value)}
                        aria-pressed={isActive}
                        aria-label={`Select ${option.label}`}
                      >
                        <span
                          className="profile-mode-toggle-icon"
                          aria-hidden="true"
                          style={{
                            background: option.swatch,
                            borderColor: isActive
                              ? "var(--theme-primary)"
                              : "var(--border-soft)",
                          }}
                        />

                        <span className="profile-mode-toggle-copy">
                          <strong>{option.label}</strong>
                          <span>{option.description}</span>
                        </span>

                        <span className="profile-mode-toggle-state">
                          {isActive ? "Active" : "Select"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="profile-item danger"
                  onClick={handleLogout}
                >
                  <span className="profile-item-icon">
                    <FaSignOutAlt />
                  </span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        role={role}
        email={email}
      />
    </>
  );
}

export default Header;
