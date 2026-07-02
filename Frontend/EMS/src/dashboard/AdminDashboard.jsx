import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaBirthdayCake, FaChevronRight, FaRedo } from "react-icons/fa";
import "./Dashboard.css";

import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildServerUrl } from "../api/endpoints";
import { PageSkeleton } from "../components/Skeletons";
import { extractCollection, sortByRecency } from "../utils/collections";
import { formatDate } from "../utils/date";
import {
  endPerformanceTimer,
  logPerformanceError,
  startPerformanceTimer,
} from "../utils/performance";

import TopCharts from "./TopCharts";
import RecentActivity from "./RecentActivity";
import Holidays from "./Holidays";
import QuickActions from "./QuickActions";

const normalizeDashboardData = (payload = {}) => ({
  totalEmployees: payload?.totalEmployees ?? 0,
  totalDepartments: payload?.totalDepartments ?? 0,
  activeProjects: payload?.activeProjects ?? 0,
  attendancePercentage: payload?.attendancePercentage ?? 0,
  recentActivities: payload?.recentActivities ?? payload?.activities ?? [],
  upcomingHolidays: payload?.upcomingHolidays ?? [],
});

const getInitials = (value = "") =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "E";

const resolveBirthdayImage = (record = {}) => {
  const rawSource =
    record?.employeePhoto ||
    record?.photo ||
    record?.photoUrl ||
    record?.imageUrl ||
    record?.avatarUrl ||
    record?.profileImage ||
    record?.picture ||
    record?.image ||
    "";

  if (!rawSource) {
    return "";
  }

  return buildServerUrl(rawSource);
};

const normalizeBirthday = (record = {}) => {
  const employeeName =
    record?.employeeName ||
    record?.name ||
    `${record?.firstName ?? ""} ${record?.lastName ?? ""}`.trim() ||
    "Employee";

  const designation =
    record?.designation ||
    record?.designationName ||
    record?.roleName ||
    record?.role ||
    record?.position ||
    "-";

  const birthday =
    record?.birthday ||
    record?.dob ||
    record?.birthDate ||
    record?.dateOfBirth ||
    "";

  const parsedDaysRemaining = Number(
    record?.daysRemaining ??
    record?.days_remaining ??
    record?.remainingDays ??
    0
  );

  const daysRemaining = Number.isFinite(parsedDaysRemaining)
    ? Math.max(0, parsedDaysRemaining)
    : 0;

  return {
    employeeId:
      record?.employeeId ||
      record?.employeeID ||
      record?.employee_id ||
      record?.id ||
      "",
    employeeName,
    designation,
    birthday,
    daysRemaining,
    imageUrl: resolveBirthdayImage(record),
    initials: getInitials(employeeName),
  };
};

const formatDaysRemaining = (daysRemaining) => {
  if (daysRemaining === 0) {
    return "Today";
  }

  if (daysRemaining === 1) {
    return "1 day left";
  }

  return `${daysRemaining} days left`;
};

function AdminBirthdaysCard({ birthdays = [], loading = false, error = "", onRetry }) {
  const visibleBirthdays = birthdays.slice(0, 3);

  return (
    <section className="birthdays">
      <div className="birthdays-header">
        <div>
          <h3>Upcoming Birthdays</h3>
          <p>Celebrate the people who keep the organization moving.</p>
        </div>

        <Link className="birthdays-link" to="/employees">
          View All Birthdays
          <FaChevronRight aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="birthdays-skeleton" aria-busy="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="birthday-skeleton-row" key={index}>
              <div className="birthday-skeleton-avatar" />
              <div className="birthday-skeleton-copy">
                <div className="birthday-skeleton-line short" />
                <div className="birthday-skeleton-line" />
              </div>
              <div className="birthday-skeleton-badge" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="birthdays-empty birthdays-error">
          <div className="birthdays-empty-icon">
            <FaRedo aria-hidden="true" />
          </div>

          <strong>Unable to load birthdays</strong>
          <p>{error}</p>

          <button type="button" className="birthdays-retry-btn" onClick={onRetry}>
            <FaRedo aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : visibleBirthdays.length === 0 ? (
        <div className="birthdays-empty">
          <div className="birthdays-empty-icon">
            <FaBirthdayCake aria-hidden="true" />
          </div>

          <strong>No upcoming birthdays</strong>
          <p>New birthdays will appear here automatically when the API returns them.</p>
        </div>
      ) : (
        <div className="birthdays-list">
          {visibleBirthdays.map((birthday) => (
            <div className="birthday-item" key={`${birthday.employeeId}-${birthday.employeeName}`}>
              <div className="birthday-avatar">
                {birthday.imageUrl ? (
                  <img src={birthday.imageUrl} alt={birthday.employeeName} />
                ) : (
                  <span>{birthday.initials}</span>
                )}
              </div>

              <div className="birthday-copy">
                <strong>{birthday.employeeName}</strong>

                <span className="birthday-meta">
                  {birthday.employeeId}
                </span>

                <small>{formatDate(birthday.birthday)}</small>
              </div>

              <span className="birthday-badge">
                {formatDaysRemaining(birthday.daysRemaining)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(normalizeDashboardData());
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [birthdaysError, setBirthdaysError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timerLabel = "admin-dashboard:initial-data";

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setDashboardError("");
        setBirthdaysError("");

        startPerformanceTimer(timerLabel);

        const [dashboardResult, birthdaysResult] = await Promise.allSettled([
          api.get(API_ENDPOINTS.dashboard, {
            signal: controller.signal,
          }),
          api.get(API_ENDPOINTS.employees.upcomingBirthdays, {
            signal: controller.signal,
          }),
        ]);

        if (dashboardResult.status === "fulfilled") {
          setDashboardData(
            normalizeDashboardData(dashboardResult.value?.data || {})
          );
        } else {
          setDashboardData(normalizeDashboardData());
          setDashboardError("Unable to load the dashboard summary right now.");
          logPerformanceError(
            "Admin dashboard summary error:",
            dashboardResult.reason?.response?.data ||
            dashboardResult.reason?.message ||
            dashboardResult.reason
          );
        }

        if (birthdaysResult.status === "fulfilled") {
          const birthdayRecords = extractCollection(birthdaysResult.value?.data)
            .map(normalizeBirthday)
            .sort((left, right) => {
              if (left.daysRemaining !== right.daysRemaining) {
                return left.daysRemaining - right.daysRemaining;
              }

              return left.employeeName.localeCompare(right.employeeName);
            });
          setBirthdays(birthdayRecords);
        } else {
          setBirthdays([]);
          setBirthdaysError("Unable to load upcoming birthdays.");
          logPerformanceError(
            "Admin birthdays error:",
            birthdaysResult.reason?.response?.data ||
            birthdaysResult.reason?.message ||
            birthdaysResult.reason
          );
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }

        logPerformanceError(
          "Dashboard API error:",
          error.response?.data || error.message
        );
        setDashboardError("Unable to load the dashboard summary right now.");
        setBirthdaysError("Unable to load upcoming birthdays.");
        setDashboardData(normalizeDashboardData());
        setBirthdays([]);
      } finally {
        endPerformanceTimer(timerLabel);
        setLoading(false);
      }
    };

    loadDashboard();

    return () => controller.abort();
  }, [reloadTick]);

  const recentActivities = useMemo(() => {
    const activityData =
      dashboardData?.recentActivities ||
      dashboardData?.activities ||
      dashboardData?.data?.recentActivities ||
      [];

    return sortByRecency(Array.isArray(activityData) ? activityData : []).slice(0, 13);
  }, [dashboardData]);

  const topBirthdays = useMemo(
    () => birthdays.slice(0, 3),
    [birthdays]
  );

  if (loading) {
    return (
      <div className="dashboard">
        <PageSkeleton variant="dashboard" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h2 className="title">Dashboard</h2>
        <p className="subtitle">
          Welcome back. Here&apos;s your organization overview for today.
        </p>
      </div>

      {dashboardError && (
        <div className="dashboard-alert" role="alert">
          {dashboardError}
        </div>
      )}

      <TopCharts data={dashboardData} loading={false} />

      <div className="bottom">
        <RecentActivity activities={recentActivities} />

        <div className="right">
          <AdminBirthdaysCard
            birthdays={topBirthdays}
            error={birthdaysError}
            onRetry={() => setReloadTick((tick) => tick + 1)}
          />
          <Holidays holidays={dashboardData?.upcomingHolidays || []} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
