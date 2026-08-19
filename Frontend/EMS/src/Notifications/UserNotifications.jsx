import React, { useEffect, useState, useCallback } from "react";
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
  markNotificationAsRead } from
"../services/notificationService";

function UserNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const authSnapshot = getAuthenticatedUserSnapshot();
  const currentRole = authSnapshot.role || authSnapshot.roleName || "";

  const normalizeNotifications = (data) => {
    if (!Array.isArray(data)) return [];

    const normalized = data.
    map((item, index) => {
      const normalizedItem = {
        ...item,
        id: item.id ?? item.notificationId ?? index,
        isRead: item.isRead ?? item.read ?? item.isread ?? false,
        title: item.title || "Notification",
        description: item.description || item.message || "No message",
        type: item.type || "info",
        timeAgo: item.timeAgo || item.createdAt || item.createdOn || ""
      };

      return normalizedItem;
    }).
    filter((item) => !item.isRead); // ✅ only keep unread

    return normalized;
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

      const previousNotifications = [...notifications];

      setNotifications((prev) => prev.filter((item) => item.id !== id));

      const success = await markNotificationAsRead(currentRole, id);

      if (!success) {
        setNotifications(previousNotifications);
        await fetchUserNotifications(true);
        return;
      }

      const refreshedNotifications = await fetchUserNotifications(true);
      window.dispatchEvent(
        new CustomEvent("notificationsUpdated", {
          detail: {
            notifications: refreshedNotifications
          }
        })
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ✅ MARK ALL → CLEAR UI
  const markAllAsRead = async () => {
    if (notifications.length === 0) return;

    const previousNotifications = [...notifications];

    try {
      setMarkingAll(true);

      setNotifications([]);

      const success = await markAllNotificationsAsRead(currentRole);

      if (!success) {
        setNotifications(previousNotifications);
        await fetchUserNotifications(true);
        return;
      }

      const refreshedNotifications = await fetchUserNotifications(true);
      window.dispatchEvent(
        new CustomEvent("notificationsUpdated", {
          detail: {
            notifications: refreshedNotifications
          }
        })
      );
    } catch (error) {
      setNotifications(previousNotifications);
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

  const unreadCount = notifications.length;

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div>
          <h2>My Notifications</h2>
          <p>{unreadCount} unread notifications</p>
        </div>

        <button
          className="mark-read-btn"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || markingAll}>
          
          {markingAll ? "Marking..." : "Mark all as read"}
        </button>
      </div>

      <div className="notifications-list">
        {loading ?
        <CardSkeleton count={4} variant="panel" /> :
        notifications.length === 0 ?
        <p className="no-notifications">No notifications</p> :

        notifications.map((item, index) =>
        <div
          key={item.id || index}
          className="notification-card unread"
          onClick={() => markAsRead(item.id)}
          style={{ cursor: "pointer" }}>
          
              <div className={`icon-circle ${item.type || "info"}`}>
                {getIcon(item.type)}
              </div>

              <div className="notification-content">
                <div className="notification-title">
                  {item.title}
                  <span className="unread-dot"></span>
                </div>

                <p>{item.description}</p>
              </div>

              <div className="notification-time">
                {updatingId === item.id ?
            "Updating..." :
            markingAll ?
            "Updating..." :
            item.timeAgo}
              </div>
            </div>
        )
        }
      </div>
    </div>);

}

export default UserNotifications;
