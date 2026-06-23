import React, { memo } from "react";
import { FaUserPlus, FaCheckCircle, FaTasks, FaClock } from "react-icons/fa";
import { timeAgo } from "../utils/date";

function RecentActivity({ activities = [] }) {

  const getIcon = (type) => {
    switch (type) {
      case "employee":
        return <FaUserPlus />;
      case "leave":
        return <FaCheckCircle />;
      case "task":
        return <FaTasks />;
      default:
        return <FaClock />;
    }
  };

  const formatTime = (time) => {
    if (!time) return "";

    if (typeof time === "string" && time.toLowerCase().includes("ago")) {
      return time;
    }

    return timeAgo(time);
  };

  return (
    <div className="activity">

      <h3>Recent Activity</h3>

      {activities.length === 0 ? (
        <p>No recent activities</p>
      ) : (
        <ul>

          {activities.map((activity, index) => {

            const message =
              activity.message ||
              activity.title ||
              activity.activity ||
              "Activity updated";

            const rawTime =
              activity.time ||
              activity.createdAt ||
              activity.date ||
              "";

            const type =
              activity.type ||
              activity.activityType ||
              "attendance";

            return (
              <li key={index}>

                <div className="activity-left">
                  <span className="activity-icon teal">
                    {getIcon(type)}
                  </span>
                  <strong>{message}</strong>
                </div>

                <span>{formatTime(rawTime)}</span>

              </li>
            );
          })}

        </ul>
      )}

    </div>
  );
}

// Optimization: memoized recent activity avoids duplicate fetches and rerenders from sibling widgets.
export default memo(RecentActivity);
