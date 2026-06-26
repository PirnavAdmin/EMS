import React, { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";

import TopCharts from "./TopCharts";
import RecentActivity from "./RecentActivity";
import Holidays from "./Holidays";
import QuickActions from "./QuickActions";
import { PageSkeleton } from "../components/Skeletons";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { sortByRecency } from "../utils/collections";
import {
  endPerformanceTimer,
  logPerformanceError,
  startPerformanceTimer,
} from "../utils/performance";

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timerLabel = "dashboard:initial-data";

    const fetchDashboard = async () => {
      try {
        setLoading(true);

        // Optimization: fetch dashboard data once and share it with child widgets.
        startPerformanceTimer(timerLabel);

        const res = await api.get(API_ENDPOINTS.dashboard, {
          signal: controller.signal,
        });

        setDashboardData(res.data || {});
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }

        logPerformanceError(
          "Dashboard API error:",
          error.response?.data || error.message
        );
      } finally {
        endPerformanceTimer(timerLabel);
        setLoading(false);
      }
    };

    fetchDashboard();

    return () => controller.abort();
  }, []);

  const recentActivities = useMemo(() => {
    const activityData =
      dashboardData?.recentActivities ||
      dashboardData?.activities ||
      dashboardData?.data?.recentActivities ||
      [];

    // Optimization: memoize activity sorting so card rerenders do not repeat the same work.
    return sortByRecency(Array.isArray(activityData) ? activityData : []).slice(0, 6);
  }, [dashboardData]);

  if (loading) {
    return (
      <div className="dashboard">
        <PageSkeleton variant="dashboard" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2 className="title">Dashboard</h2>
      <p className="subtitle">
        Welcome back! Here's an overview of your organization.
      </p>

      <TopCharts data={dashboardData} />

      <div className="bottom">
        <RecentActivity activities={recentActivities} />

        <div className="right">
          <Holidays holidays={dashboardData?.upcomingHolidays || []} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
