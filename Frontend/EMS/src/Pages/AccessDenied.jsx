import React from "react";
import { FaArrowLeft, FaHome, FaShieldAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./AccessDenied.css";

function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="access-denied-page">
      <div className="access-denied-card app-surface">
        <div className="access-denied-badge">
          <FaShieldAlt />
          <span>Restricted area</span>
        </div>

        <div className="access-denied-icon">
          <FaShieldAlt />
        </div>

        <h1>Access Denied</h1>
        <p>
          This section is available to EMS administrators only. If you believe
          you should have access, please contact your system administrator.
        </p>

        <div className="access-denied-actions">
          <button
            type="button"
            className="app-button-secondary access-denied-secondary"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            <FaArrowLeft />
            Back to Dashboard
          </button>

          <button
            type="button"
            className="app-button-primary access-denied-primary"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            <FaHome />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;

