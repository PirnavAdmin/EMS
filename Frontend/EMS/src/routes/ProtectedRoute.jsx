import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isOnboardingUser } from "../utils/authorization";
import { getStoredToken } from "../utils/authStorage";
import { handleAutoLogout, isSessionExpired } from "../utils/sessionManager";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = getStoredToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isSessionExpired()) {
    handleAutoLogout({
      reason: "ProtectedRoute detected an expired session.",
    });

    return <Navigate to="/login" replace />;
  }

  if (isOnboardingUser() && !location.pathname.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
