import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Notifications.css";
import { CardSkeleton } from "../components/Skeletons";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUserPlus } from
"react-icons/fa";
import { getAuthenticatedUserSnapshot } from "../utils/authStorage";
import {
  loadNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  isShiftSwapNotification } from
"../services/notificationService";

function UserNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const authSnapshot = getAuthenticatedUserSnapshot();
  const currentRole = authSnapshot.role || authSnapshot.roleName || "";
  const [activeFilter, setActiveFilter] = useState("all");

 const normalizeNotifications = (data) => {
    if (!Array.isArray(data)) return [];

    return data.map((item, index) => ({
        ...item,
        id: item.id ?? item.notificationId ?? index,
        isRead: item.isRead ?? item.read ?? item.isread ?? false,
        title: item.title || "Notification",
        description: item.description || item.message || "No message",
        type: item.type || "info",
        timeAgo: item.timeAgo || item.createdAt || item.createdOn || ""
    }));
};
  const fetchUserNotifications = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);

      const data = await loadNotifications(currentRole, undefined, {
        forceRefresh
      });
      const nextNotifications = normalizeNotifications(data);
      setNotifications(nextNotifications);
      return nextNotifications;
    } finally {
      setLoading(false);
    }
  }, [currentRole]);

  useEffect(() => {
    fetchUserNotifications();

    const handleNotificationsUpdated = () => {
      fetchUserNotifications(true);
    };

    window.addEventListener("notificationsUpdated", handleNotificationsUpdated);

    return () => {
      window.removeEventListener(
        "notificationsUpdated",
        handleNotificationsUpdated
      );
    };
  }, [fetchUserNotifications]);

  // ✅ MARK SINGLE → REMOVE FROM UI
 const markAsRead = async (id) => {
    try {
        if (!id) return;

        setUpdatingId(id);

        const success = await markNotificationAsRead(currentRole, id);

        if (!success) {
            await fetchUserNotifications(true);
            return;
        }

        // Keep notification visible, but remove unread status
        setNotifications((prev) =>
            prev.map((item) =>
                item.id === id
                    ? { ...item, isRead: true }
                    : item
            )
        );

        window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
        await fetchUserNotifications(true);
    } finally {
        setUpdatingId(null);
    }
};
  const handleNotificationClick = (item) => {
    if (isShiftSwapNotification(item)) {
      navigate("/my-team");
      window.setTimeout(() => window.dispatchEvent(new Event("swapRequestsRefresh")), 0);
    }
    void markAsRead(item.id);
  };

  // ✅ MARK ALL → CLEAR UI
 const markAllAsRead = async () => {
    if (notifications.length === 0) return;

    try {
        setMarkingAll(true);

        const success = await markAllNotificationsAsRead(currentRole);

        if (!success) {
            await fetchUserNotifications(true);
            return;
        }

        // Keep all notifications, update them to read
        setNotifications((prev) =>
            prev.map((item) => ({
                ...item,
                isRead: true
            }))
        );

        window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        await fetchUserNotifications(true);
    } finally {
        setMarkingAll(false);
    }
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

const unreadCount = notifications.filter(
  (item) => !item.isRead
).length;

const readCount = notifications.length - unreadCount;

const filteredNotifications = notifications.filter((item) => {
  if (activeFilter === "unread") return !item.isRead;
  if (activeFilter === "read") return item.isRead;
  return true;
});

 return (
  <div className="notifications-container">

    {/* Header */}
    <div className="notifications-header">
      <div>
        <h2>My Notifications</h2>
        <p>
          {unreadCount} unread notifications
        </p>
      </div>

      <button
        className="mark-read-btn"
        onClick={markAllAsRead}
        disabled={unreadCount === 0 || markingAll}
      >
        {markingAll ? "Marking..." : "Mark all as read"}
      </button>
    </div>

    {/* Filters */}
    <div className="notification-toolbar">
      <div className="notification-filter-tabs">

        <button
          className={`notification-filter ${
            activeFilter === "all" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("all")}
        >
          All <span>{notifications.length}</span>
        </button>

        <button
          className={`notification-filter ${
            activeFilter === "unread" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("unread")}
        >
          Unread <span>{unreadCount}</span>
        </button>

        <button
          className={`notification-filter ${
            activeFilter === "read" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("read")}
        >
          Read <span>{readCount}</span>
        </button>

      </div>

      <span className="notification-toolbar-caption">
        {activeFilter === "all"
          ? "All notifications"
          : activeFilter === "unread"
          ? `${unreadCount} unread notifications`
          : `${readCount} read notifications`}
      </span>
    </div>

    {/* Notifications List */}
    <div className="notifications-list">

      {loading ? (
        <CardSkeleton count={4} variant="panel" />
      ) : filteredNotifications.length === 0 ? (
        <p className="no-notifications">
          {activeFilter === "unread"
            ? "No unread notifications"
            : activeFilter === "read"
            ? "No read notifications"
            : "No notifications"}
        </p>
      ) : (
        filteredNotifications.map((item, index) => (
          <div
            key={item.id || index}
            className={`notification-card ${
              item.isRead ? "read" : "unread"
            }`}
            onClick={() => handleNotificationClick(item)}
            style={{ cursor: "pointer" }}
          >

            {/* {!item.isRead && (
              <span className="notification-unread-indicator" />
            )} */}

            <div className={`icon-circle ${item.type || "info"}`}>
              {getIcon(item.type)}
            </div>

            <div className="notification-content">

              <div className="notification-title">
                <span className="notification-title-text">
                  {item.title}
                </span>

                {!item.isRead && (
                  <span className="new-badge">
                    New
                  </span>
                )}
              </div>

              <p>{item.description}</p>

            </div>

            <div className="notification-time">
              {updatingId === item.id
                ? "Updating..."
                : markingAll
                ? "Updating..."
                : item.timeAgo}
            </div>

          </div>
        ))
      )}

    </div>
  </div>
);
}

export default UserNotifications;
