import React, { useCallback, useEffect, useState } from "react";
import "./Notifications.css";
import { CardSkeleton } from "../components/Skeletons";
import {
  FaUserPlus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle
} from "react-icons/fa";
import { getAuthenticatedUserSnapshot } from "../utils/authStorage";
import {
  loadNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const authSnapshot = getAuthenticatedUserSnapshot();
  const authReady = authSnapshot.isReady;
  const authToken = authSnapshot.token;
  const currentRole = authSnapshot.role || authSnapshot.roleName || "";

  /* ================= FETCH ================= */

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const data = await loadNotifications(currentRole);
      setNotifications(
        Array.isArray(data)
          ? data
          : []
      );
    } finally {
      setLoading(false);
    }
  }, [authReady, authToken, currentRole]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /* ================= MARK SINGLE ================= */

  const markAsRead = async (id) => {
    try {
      setUpdatingId(id);

      const success = await markNotificationAsRead(
        currentRole,
        id
      );

      if (!success) {
        await fetchNotifications();
        return;
      }

      await fetchNotifications();
      window.dispatchEvent(new Event("notificationsUpdated"));
    } finally {
      setUpdatingId(null);
    }
  };

  /* ================= MARK ALL ================= */

  const markAllAsRead = async () => {
    try {
      const success = await markAllNotificationsAsRead(
        currentRole
      );

      if (!success) {
        await fetchNotifications();
        return;
      }

      await fetchNotifications();
      window.dispatchEvent(new Event("notificationsUpdated"));
    } finally {
      // Nothing to reset here; the action is fire-and-forget.
    }
  };

  /* ================= ICON ================= */

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

  const unreadCount = notifications.length;

  /* ================= UI ================= */

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div>
          <h2>Notifications ({unreadCount})</h2>
        </div>

        <button
          className="mark-read-btn"
          onClick={markAllAsRead}
          disabled={!notifications.length}
        >
          Mark all as read
        </button>
      </div>

      <div className="notifications-list">
        {loading ? (
          <CardSkeleton count={4} variant="panel" />
        ) : notifications.length === 0 ? (
          <p className="no-notifications">No notifications</p>
        ) : (
          notifications.map((item) => {
            const notificationId = item.id || item.Id;

            return (
              <div
                key={notificationId}
                className="notification-card unread"
                onClick={() => markAsRead(notificationId)}
              >
                <div className={`icon-circle ${item.type || "info"}`}>
                  {getIcon(item.type)}
                </div>

                <div className="notification-content">
                  <div className="notification-title">
                    {item.title || item.Title}
                  </div>
                  <p>
                    {item.description ||
                      item.message ||
                      item.Message ||
                      "No message"}
                  </p>
                </div>

                <div className="notification-time">
                  {updatingId === notificationId ? "Updating..." : ""}
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
