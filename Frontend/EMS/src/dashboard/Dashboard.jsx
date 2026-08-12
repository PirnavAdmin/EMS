import React from "react";
import { isAdmin, isSuperAdmin } from "../utils/authorization";
import AdminDashboard from "./AdminDashboard";
import UserDashboard from "./UserDashboard";
import SuperAdminDashboard from "../SuperAdmin/SuperAdminDashboard";

function Dashboard() {
  if (isSuperAdmin()) {
    return <SuperAdminDashboard />;
  }

  return isAdmin() ? <AdminDashboard /> : <UserDashboard />;
}

export default Dashboard;
