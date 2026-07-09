import React from "react";
import { Navigate } from "react-router-dom";
import { isAdmin } from "../utils/authorization";

function AdminRoute({ children, redirectTo = "/access-denied" }) {
  if (!isAdmin()) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

export default AdminRoute;
