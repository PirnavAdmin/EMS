import React from "react";
import { isAdmin } from "../utils/authorization";
import AdminDashboard from "./AdminDashboard";
import UserDashboard from "./UserDashboard";

function Dashboard() {
  return isAdmin() ? <AdminDashboard /> : <UserDashboard />;
}

export default Dashboard;
