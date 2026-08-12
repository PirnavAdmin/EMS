import React from "react";
import { Navigate } from "react-router-dom";
import { isPlatformAdmin } from "../utils/authorization";

function AdminRoute({ children, redirectTo = "/access-denied" }) {
  if (!isPlatformAdmin()) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

export default AdminRoute;
