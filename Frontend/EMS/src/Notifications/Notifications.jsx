import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Notifications.css";
import { CardSkeleton } from "../components/Skeletons";
import {
  FaUserPlus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaBell,
  FaEnvelope,
  FaCalendarAlt,
  FaClock,
  FaLayerGroup,
  FaCheck,
  FaChevronRight,
} from "react-icons/fa";
import { getAuthenticatedUserSnapshot } from "../utils/authStorage";
import {
  loadNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  isShiftSwapNotification,
} from "../services/notificationService";

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const authSnapshot = getAuthenticatedUserSnapshot();
  const currentRole = authSnapshot.role || authSnapshot.roleName || "";

  // ================= FETCH =================

  const fetchNotifications = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);

        const data = await loadNotifications(currentRole, undefined, {
          forceRefresh,
        });

        const nextNotifications = Array.isArray(data)
          ? data.map((item) => ({
              ...item,
              isRead: item.isRead ?? item.IsRead ?? item.isread ?? false,
            }))
          : [];

        setNotifications(nextNotifications);
        return nextNotifications;
      } finally {
        setLoading(false);
      }
    },
    [currentRole]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ================= HELPERS =================

  const getNotificationDate = (item) => {
    const rawDate =
      item.createdAt ??
      item.CreatedAt ??
      item.createdDate ??
      item.CreatedDate ??
      item.date ??
      item.Date ??
      item.timestamp ??
      item.Timestamp;

    if (!rawDate) return null;

    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getDateGroup = (item) => {
    const date = getNotificationDate(item);
    if (!date) return "Earlier";

    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const notificationDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diff = Math.floor(
      (today - notificationDay) / (1000 * 60 * 60 * 24)
    );

    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return "Earlier";
  };

  const formatNotificationTime = (item) => {
    const date = getNotificationDate(item);
    if (!date) return "";

    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getIcon = (type) => {
    switch ((type || "").toLowerCase()) {
      case "success":
        return <FaCheckCircle />;
      case "warning":
        return <FaExclamationTriangle />;
      case "info":
        return <FaInfoCircle />;
      default:
        return <FaUserPlus />;
    }
  };

  // ================= COUNTS =================

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const readCount = notifications.length - unreadCount;

  const todayCount = notifications.filter(
    (item) => getDateGroup(item) === "Today"
  ).length;

  const weekCount = notifications.filter((item) => {
    const date = getNotificationDate(item);
    if (!date) return false;

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    return date >= sevenDaysAgo && date <= now;
  }).length;

  // ================= FILTER =================

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((item) => !item.isRead);
    }

    if (activeFilter === "read") {
      return notifications.filter((item) => item.isRead);
    }

    return notifications;
  }, [notifications, activeFilter]);

  const groupedNotifications = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    filteredNotifications.forEach((item) => {
      groups[getDateGroup(item)].push(item);
    });

    return groups;
  }, [filteredNotifications]);

  // ================= MARK SINGLE =================

  const markAsRead = async (id) => {
    try {
      setUpdatingId(id);

      const success = await markNotificationAsRead(currentRole, id);

      if (!success) {
        await fetchNotifications(true);
        return;
      }

      const refreshedNotifications = await fetchNotifications(true);

      window.dispatchEvent(
        new CustomEvent("notificationsUpdated", {
          detail: {
            notifications: refreshedNotifications,
          },
        })
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNotificationClick = (item, notificationId) => {
    if (isShiftSwapNotification(item)) {
      navigate("/my-team");

      window.setTimeout(() => {
        window.dispatchEvent(new Event("swapRequestsRefresh"));
      }, 0);
    }

    if (!item.isRead) {
      void markAsRead(notificationId);
    }
  };

  // ================= MARK ALL =================

  const markAllAsRead = async () => {
    if (!unreadCount || markingAll) return;

    try {
      setMarkingAll(true);

      const success = await markAllNotificationsAsRead(currentRole);

      if (!success) {
        await fetchNotifications(true);
        return;
      }

      const refreshedNotifications = await fetchNotifications(true);

      window.dispatchEvent(
        new CustomEvent("notificationsUpdated", {
          detail: {
            notifications: refreshedNotifications,
          },
        })
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // ================= UI =================

  return (
    <div className="notifications-container">
      {/* Page Header */}
      <div className="notifications-header">
        <div className="notifications-heading">
          <div className="notifications-heading-icon">
            <FaBell />
          </div>

          <div>
            <h2>Notifications</h2>
            <p>Stay updated with the latest activities and announcements.</p>
          </div>
        </div>

        <button
          className="mark-read-btn"
          onClick={markAllAsRead}
          disabled={!unreadCount || markingAll}
        >
          <FaCheck />
          {markingAll ? "Updating..." : "Mark all as read"}
        </button>
      </div>

      {/* Filters */}
      <div className="notification-toolbar">
        <div className="notification-filter-tabs">
          <button
            className={`notification-filter ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All <span>{notifications.length}</span>
          </button>

          <button
            className={`notification-filter ${activeFilter === "unread" ? "active" : ""}`}
            onClick={() => setActiveFilter("unread")}
          >
            Unread <span>{unreadCount}</span>
          </button>

          <button
            className={`notification-filter ${activeFilter === "read" ? "active" : ""}`}
            onClick={() => setActiveFilter("read")}
          >
            Read <span>{readCount}</span>
          </button>
        </div>

        <div className="notification-toolbar-caption">
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "You're all caught up"}
        </div>
      </div>

      {/* Notifications */}
      <div className="notifications-list">
        {loading ? (
          <CardSkeleton count={4} variant="panel" />
        ) : filteredNotifications.length === 0 ? (
          <div className="notification-empty-state">
            <div className="notification-empty-icon">
              <FaBell />
            </div>

            <h3>
              {activeFilter === "unread"
                ? "You're all caught up!"
                : activeFilter === "read"
                ? "No read notifications"
                : "No notifications yet"}
            </h3>

            <p>
              {activeFilter === "unread"
                ? "There are no unread notifications at the moment."
                : "Your notifications will appear here when there are updates."}
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([groupName, items]) => {
            if (!items.length) return null;

            return (
              <div className="notification-group" key={groupName}>
                <div className="notification-group-heading">
                  <div className="notification-group-title">
                    <FaCalendarAlt />
                    <h3>{groupName}</h3>
                  </div>

                  <span className="notification-group-count">
                    {items.length}
                  </span>
                </div>

                <div className="notification-group-list">
                  {items.map((item) => {
                    const notificationId = item.id || item.Id;

                    return (
                      <div
                        key={notificationId}
                        className={`notification-card ${
                          item.isRead ? "read" : "unread"
                        } ${item.type || "info"}`}
                        onClick={() =>
                          handleNotificationClick(item, notificationId)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleNotificationClick(item, notificationId);
                          }
                        }}
                      >
                        {/* {!item.isRead && (
                          <span className="notification-unread-indicator" />
                        )} */}

                        <div
                          className={`notification-icon-box ${(
                            item.type || "default"
                          ).toLowerCase()}`}
                        >
                          {getIcon(item.type)}
                        </div>

                        <div className="notification-content">
                          <div className="notification-title">
                            <span className="notification-title-text">
                              {item.title || item.Title}
                            </span>

                            {!item.isRead && (
                              <span className="new-badge">New</span>
                            )}
                          </div>

                          <p>
                            {item.description ||
                              item.message ||
                              item.Message ||
                              "No message"}
                          </p>
                        </div>

                        <div className="notification-card-meta">
                          <span className="notification-time">
                            {updatingId === notificationId
                              ? "Updating..."
                              : formatNotificationTime(item)}
                          </span>

                          <span className="notification-arrow">
                            <FaChevronRight />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Notifications;