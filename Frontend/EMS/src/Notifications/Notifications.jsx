import React, { useEffect, useState } from "react";
import "./Notifications.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import { CardSkeleton } from "../components/Skeletons";
import {
  FaUserPlus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle
} from "react-icons/fa";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    fetchNotifications();
  }, []);

  /* ================= FETCH ================= */

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const token = getToken();

      // ✅ Token check
      if (!token) {
        console.error("No token found");
        setNotifications([]);
        return;
      }

      const res = await api.get(API_ENDPOINTS.notifications.admin);

      const data = extractCollection(res.data);
      setNotifications(data);

    } catch (err) {
      console.error("❌ Fetch notifications error:", err);

      // ✅ Handle all types of errors
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "Failed to fetch notifications";

      console.log("Backend message:", message);

      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= MARK SINGLE ================= */

  const markAsRead = async (id) => {
    try {
      const token = getToken();
      setUpdatingId(id);

      if (!token) {
        alert("User not authenticated");
        return;
      }

      await api.put(API_ENDPOINTS.notifications.adminRead(id), {});

      await fetchNotifications();
      window.dispatchEvent(new Event("notificationsUpdated"));

    } catch (err) {
      console.error("❌ Mark as read error:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "Failed to update notification";

      alert(message);

    } finally {
      setUpdatingId(null);
    }
  };

  /* ================= MARK ALL ================= */

  const markAllAsRead = async () => {
    try {
      const token = getToken();

      if (!token) {
        alert("User not authenticated");
        return;
      }

      await api.put(API_ENDPOINTS.notifications.adminReadAll, {});

      await fetchNotifications();
      window.dispatchEvent(new Event("notificationsUpdated"));

    } catch (err) {
      console.error("❌ Mark all as read error:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "Failed to update notifications";

      alert(message);
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
