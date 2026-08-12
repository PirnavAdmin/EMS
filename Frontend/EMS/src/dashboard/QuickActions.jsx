import React from "react";
import {
  FaUserPlus,
  FaChartBar,
  FaClock,
  FaCalendarCheck
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function QuickActions() {

  const navigate = useNavigate();

  return (
    <div className="actions">
      <h3>Quick Actions</h3>

      <div className="action-grid">

        <button onClick={() => navigate("/employees")}>
          <FaUserPlus /> Add Employee
        </button>

        <button onClick={() => navigate("/reports")}>
          <FaChartBar /> View Reports
        </button>

        <button onClick={() => navigate("/attendance")}>
          <FaClock /> Track Time
        </button>

        <button onClick={() => navigate("/leave-management")}>
          <FaCalendarCheck /> Leave Mgnt
        </button>

      </div>
    </div>
  );
}

export default QuickActions;