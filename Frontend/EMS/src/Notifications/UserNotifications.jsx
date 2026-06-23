import React, { useEffect, useState, useCallback } from "react";
import "./Notifications.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUserPlus,
} from "react-icons/fa";

function UserNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const getToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("jwtToken");

  const normalizeNotifications = (data) => {
    if (!Array.isArray(data)) return [];

    console.log("🟡 Raw notifications before normalize:", data);

    const normalized = data
      .map((item, index) => {
        const normalizedItem = {
          ...item,
          id: item.id ?? item.notificationId ?? index,
          isRead: item.isRead ?? item.read ?? item.isread ?? false,
          title: item.title || "Notification",
          description: item.description || item.message || "No message",
          type: item.type || "info",
          timeAgo: item.timeAgo || item.createdAt || item.createdOn || "",
        };

        console.log(`📦 Normalized Notification [${index}]`, normalizedItem);
        return normalizedItem;
      })
      .filter((item) => !item.isRead); // ✅ only keep unread

    console.log("✅ Final unread notifications in state:", normalized);

    return normalized;
  };

  const fetchUserNotifications = useCallback(async () => {
    try {
      setLoading(true);

      console.log("📡 Fetching notifications from:", API_ENDPOINTS.notifications.user);

      const response = await api.get(API_ENDPOINTS.notifications.user);

      console.log("✅ Fetch response:", response);
      console.log("📦 Fetch response data:", response?.data);

      const data = extractCollection(response?.data);

      setNotifications(normalizeNotifications(data));
    } catch (error) {
      console.error("❌ Fetch error:", error?.response || error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserNotifications();

    window.addEventListener("notificationsUpdated", fetchUserNotifications);

    return () => {
      window.removeEventListener(
        "notificationsUpdated",
        fetchUserNotifications
      );
    };
  }, [fetchUserNotifications]);

  // ✅ MARK SINGLE → REMOVE FROM UI
  const markAsRead = async (id) => {
    try {
      if (!id) return;

      console.log("🟠 Marking single notification as read:", id);

      setUpdatingId(id);

      // Save previous state in case rollback needed
      const previousNotifications = [...notifications];

      // ✅ remove from UI immediately
      setNotifications((prev) => prev.filter((item) => item.id !== id));

      console.log("📡 PUT:", API_ENDPOINTS.notifications.userRead(id));

      const response = await api.put(API_ENDPOINTS.notifications.userRead(id), null);

      console.log("✅ Mark as read success:", response?.data);

      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
      console.error("❌ Mark read error:", error?.response || error);

      // rollback if backend fails
      await fetchUserNotifications();
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

      console.log("🟠 Marking ALL notifications as read...");

      // ✅ clear UI immediately
      setNotifications([]);

      console.log("📡 PUT:", API_ENDPOINTS.notifications.userReadAll);

      const response = await api.put(API_ENDPOINTS.notifications.userReadAll, null);

      console.log("✅ Mark all success:", response?.data);

      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
      console.error("❌ Mark all error:", error?.response || error);

      // rollback if backend fails
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

  console.log("🔴 Current notifications state:", notifications);
  console.log("🔴 Unread count:", unreadCount);

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
          disabled={unreadCount === 0 || markingAll}
        >
          {markingAll ? "Marking..." : "Mark all as read"}
        </button>
      </div>

      <div className="notifications-list">
        {loading ? (
          <p className="no-notifications">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="no-notifications">No notifications</p>
        ) : (
          notifications.map((item, index) => (
            <div
              key={item.id || index}
              className="notification-card unread"
              onClick={() => markAsRead(item.id)}
              style={{ cursor: "pointer" }}
            >
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
