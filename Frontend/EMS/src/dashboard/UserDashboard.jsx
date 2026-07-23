import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaAdjust,
  FaBirthdayCake,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCalendarTimes,
  FaCheckCircle,
  FaBell,
  FaChevronRight,
  FaClock,
  FaPlaneDeparture,
  FaRedo,
  FaTicketAlt,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";
import "./UserDashboard.css";

import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildServerUrl } from "../api/endpoints";
import { PageSkeleton } from "../components/Skeletons";
import { extractCollection, sortByRecency } from "../utils/collections";
import { formatDate, parseDate, timeAgo } from "../utils/date";
import {
  endPerformanceTimer,
  logPerformanceError,
  startPerformanceTimer,
} from "../utils/performance";
import {
  getAttendanceDashboardErrorMessage,
  getAttendanceDashboardOverview,
} from "../services/attendanceService";

const DEFAULT_WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const unwrapPayload = (payload = {}) => {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
  ) {
    return payload.data;
  }

  return payload || {};
};

const normalizeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clampPercentage = (value) => {
  const numeric = normalizeNumber(value, 0);
  return Math.min(100, Math.max(0, numeric));
};

const formatWorkingHours = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return fallback;
    }

    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const [hoursPart, minutesPart = "0", secondsPart = "0"] = trimmed
        .split(":")
        .map((part) => Number(part));
      const totalMinutes = Math.max(
        0,
        Math.round(hoursPart * 60 + minutesPart + secondsPart / 60)
      );
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours === 0 && minutes === 0) {
        return "0m";
      }

      if (hours === 0) {
        return `${minutes}m`;
      }

      return `${hours}h${minutes ? ` ${minutes}m` : ""}`;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return formatWorkingHours(numeric, fallback);
    }

    return trimmed;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const safeHours = Math.max(0, value);
    const hours = Math.floor(safeHours);
    const minutes = Math.round((safeHours - hours) * 60);

    if (hours === 0 && minutes === 0) {
      return "0h";
    }

    if (hours === 0) {
      return `${minutes}m`;
    }

    return `${hours}h${minutes ? ` ${minutes}m` : ""}`;
  }

  return fallback;
};

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

  return rawSource ? buildServerUrl(rawSource) : "";
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

const getWeekLabel = (item, index) => {
  if (!item || typeof item !== "object") {
    return DEFAULT_WEEK_LABELS[index] || `Day ${index + 1}`;
  }

  const directLabel =
    item?.day ||
    item?.dayName ||
    item?.label ||
    item?.weekDay ||
    item?.weekday ||
    item?.name ||
    "";

  if (directLabel) {
    const raw = String(directLabel).trim();
    if (/^(mon|tue|wed|thu|fri|sat|sun)/i.test(raw)) {
      return raw.slice(0, 3).replace(/^./, (char) => char.toUpperCase());
    }

    if (raw.length <= 3) {
      return raw;
    }

    return raw.slice(0, 3);
  }

  const dateValue =
    item?.date ||
    item?.attendanceDate ||
    item?.dayDate ||
    item?.weekDate ||
    "";

  const parsedDate = parseDate(dateValue);
  if (parsedDate) {
    return parsedDate.toLocaleDateString("en-US", {
      weekday: "short",
    });
  }

  return DEFAULT_WEEK_LABELS[index] || `Day ${index + 1}`;
};

const parseHoursValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return 0;
    }

    // Supports: "9h 4m", "7h 22m"
    const hoursMatch = trimmed.match(/(\d+)\s*h/i);
    const minutesMatch = trimmed.match(/(\d+)\s*m/i);

    if (hoursMatch || minutesMatch) {
      const hours = Number(hoursMatch?.[1] || 0);
      const minutes = Number(minutesMatch?.[1] || 0);

      return hours + minutes / 60;
    }

    // Supports: "09:04" or "09:04:00"
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const [hoursPart = 0, minutesPart = 0, secondsPart = 0] =
        trimmed.split(":").map(Number);

      return hoursPart + minutesPart / 60 + secondsPart / 3600;
    }

    const numeric = Number(trimmed);

    return Number.isFinite(numeric) ? numeric : 0;
  }

  return 0;
};

const getWeekHours = (item) =>
  parseHoursValue(
    item && typeof item === "object"
      ? item?.hours ??
      item?.value ??
      item?.workingHours ??
      item?.duration ??
      item?.totalHours ??
      item?.weekHours ??
      0
      : item
  );

const normalizeWeeklyHours = (value) => {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      day: getWeekLabel(item, index),
      hours: getWeekHours(item),
    }));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, entry], index) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        return {
          day: getWeekLabel({ ...entry, day: key }, index),
          hours: getWeekHours(entry),
        };
      }

      return {
        day: key,
        hours: normalizeNumber(entry, 0),
      };
    });
  }

  return [];
};

const normalizeAttendance = (payload = {}) => {
  const source = unwrapPayload(payload);

  return {
    attendancePercentage: clampPercentage(
      source?.attendancePercentage ??
      source?.attendance ??
      source?.percentage ??
      0
    ),
    presentDays: normalizeNumber(
      source?.presentDays ?? source?.present ?? source?.presentCount ?? 0
    ),
    absentDays: normalizeNumber(
      source?.absentDays ?? source?.absent ?? source?.absentCount ?? 0
    ),
    halfDays: normalizeNumber(
      source?.halfDays ?? source?.halfDay ?? source?.halfDayCount ?? 0
    ),
    leaveDays: normalizeNumber(
      source?.leaveDays ?? source?.leave ?? source?.leaveCount ?? 0
    ),
    todayWorkingHours:
      source?.todayWorkingHours ??
      source?.workingHoursToday ??
      source?.workingHours ??
      "",
    weeklyHours: normalizeWeeklyHours(
      source?.weeklyHours ??
      source?.weeklyAttendance ??
      source?.weekly ??
      source?.weeklyData ??
      source?.graph ??
      []
    ),
  };
};

const normalizeDashboardData = (payload = {}) => {
  const source = unwrapPayload(payload);

  console.log("Dashboard API Response:", source);

  return {
    myTickets: normalizeNumber(
      source?.myTickets ??
      source?.totalTickets ??
      source?.ticketCount ??
      0
    ),

    completedTickets: normalizeNumber(
      source?.completedTickets ??
      source?.completed ??
      source?.completedTicketCount ??
      source?.completedCount ??
      0
    ),

    pendingTickets: normalizeNumber(
      source?.pendingTickets ??
      source?.pending ??
      source?.pendingTicketCount ??
      source?.pendingCount ??
      0
    ),

    attendance: normalizeNumber(
      source?.attendance ??
      source?.attendancePercentage ??
      0
    ),

    recentActivities:
      source?.recentActivities ||
      source?.activities ||
      source?.recentActivity ||
      [],

    upcomingHolidays:
      source?.upcomingHolidays ||
      source?.holidays ||
      source?.upcomingHoliday ||
      [],
  };
};

const attendanceMiniCards = [
  {
    key: "presentDays",
    label: "Present",
    icon: FaCheckCircle,
    tone: "present",
    helper: "Working days",
  },
  {
    key: "absentDays",
    label: "Absent",
    icon: FaTimesCircle,
    tone: "absent",
    helper: "Missed days",
  },
  {
    key: "halfDays",
    label: "Half Days",
    icon: FaAdjust,
    tone: "half-day",
    helper: "Partial days",
  },
  {
    key: "leaveDays",
    label: "Leave",
    icon: FaCalendarTimes,
    tone: "leave",
    helper: "Approved leave",
  },
];

function AttendanceOverviewCard({
  data,
  hasData,
  error,
  onRetry,
}) {
  const attendancePercentage = clampPercentage(data?.attendancePercentage ?? 0);
  const chartData = Array.isArray(data?.weeklyHours) ? data.weeklyHours : [];
  const chartHasData = chartData.length > 0;
  const ringRadius = 48;
  const ringStroke = 12;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (attendancePercentage / 100) * ringCircumference;

  return (
    <section className="udb-section udb-attendance-card">
      <div className="udb-card-header">
        <div>
          <h3 className="udb-card-title">Attendance Overview</h3>
          <p className="udb-card-copy">
            Monitor attendance, absence trends, and today&apos;s working hours.
          </p>
        </div>

        <div className="udb-chip">
          <FaCalendarCheck aria-hidden="true" />
          Live Attendance
        </div>
      </div>

      {error ? (
        <div className="udb-empty-state udb-card-empty-state">
          <div className="udb-empty-icon error">
            <FaRedo aria-hidden="true" />
          </div>

          <strong>Unable to load attendance</strong>
          <p>{error}</p>

          <button type="button" className="udb-retry-btn" onClick={onRetry}>
            <FaRedo aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : !hasData ? (
        <div className="udb-empty-state udb-card-empty-state">
          <div className="udb-empty-icon">
            <FaCalendarAlt aria-hidden="true" />
          </div>

          <strong>No attendance summary yet</strong>
          <p>The dashboard will show attendance insights once the API responds.</p>

          <button type="button" className="udb-retry-btn" onClick={onRetry}>
            <FaRedo aria-hidden="true" />
            Refresh
          </button>
        </div>
      ) : (
        <>
          <div className="udb-attendance-top">
            <div className="udb-progress-card">
              <svg
                className="udb-progress-ring"
                viewBox="0 0 120 120"
                aria-hidden="true"
              >
                <circle
                  className="udb-progress-track"
                  cx="60"
                  cy="60"
                  r={ringRadius}
                  strokeWidth={ringStroke}
                />
                <circle
                  className="udb-progress-value"
                  cx="60"
                  cy="60"
                  r={ringRadius}
                  strokeWidth={ringStroke}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>

              <div className="udb-progress-copy">
                <strong>{Math.round(attendancePercentage)}%</strong>
                <span>Attendance</span>
              </div>
            </div>

            <div className="udb-mini-grid">
              {attendanceMiniCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div className={`udb-mini-card ${card.tone}`} key={card.key}>
                    <div className="udb-mini-copy">
                      <span>{card.label}</span>
                      <strong>{normalizeNumber(data?.[card.key], 0)}</strong>
                      <small>{card.helper}</small>
                    </div>

                    <div className="udb-mini-icon">
                      <Icon aria-hidden="true" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="udb-working-hours">
            <div>
              <span>Today&apos;s Working Hours</span>
              <strong>{formatWorkingHours(data?.todayWorkingHours, "0h")}</strong>
            </div>

            <div className="udb-working-hours-meta">
              <FaClock aria-hidden="true" />
              <span>Auto-calculated from attendance logs</span>
            </div>
          </div>

          <div className="udb-chart-shell">
            <div className="udb-chart-header">
              <div>
                <h4>Weekly Attendance Graph</h4>
                <p>Compare working hours across the current week.</p>
              </div>
            </div>

            {chartHasData ? (
              <div className="udb-chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity={0.34} />
                        <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="4 10" vertical={false} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={34}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      cursor={{ stroke: "var(--theme-primary)", strokeWidth: 1 }}
                      formatter={(value) => [`${formatWorkingHours(value, "0h")}`, "Hours"]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="var(--theme-primary)"
                      fill="url(#attendanceGradient)"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        strokeWidth: 2,
                        fill: "var(--bg-page)",
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="udb-chart-empty">
                <FaCalendarAlt aria-hidden="true" />
                <p>No weekly graph data available yet.</p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function BirthdaysListItem({ birthday, compact = false }) {
  const isToday = birthday.daysRemaining === 0;

  return (
    <div className={`udb-birthday-item ${compact ? "compact" : ""}`}>
      <div className="udb-birthday-avatar">
        {birthday.imageUrl ? (
          <img src={birthday.imageUrl} alt={birthday.employeeName} />
        ) : (
          <span>{birthday.initials}</span>
        )}
      </div>

      <div className="udb-birthday-copy">
        <strong>{birthday.employeeName}</strong>

        <span className="birthday-meta">
          {birthday.employeeId}
        </span>

        <small>{formatDate(birthday.birthday)}</small>
      </div>

      <span className={`udb-birthday-badge ${isToday ? "is-today" : ""}`}>
        {isToday ? "Today" : `${birthday.daysRemaining} days left`}
      </span>
    </div>
  );
}

function UpcomingBirthdaysCard({
  birthdays,
  loading = false,
  error = "",
  onRetry,
  onViewAll,
}) {
  const visibleBirthdays = birthdays.slice(0, 6);

  return (
    <section className="udb-section udb-birthdays-card">
      <div className="udb-card-header">
        <div>
          <h3 className="udb-card-title">Upcoming Birthdays</h3>
          <p className="udb-card-copy">
            Keep celebrations visible with the next birthdays coming up.
          </p>
        </div>

        <button
          type="button"
          className="udb-view-all-btn"
          onClick={onViewAll}
          disabled={loading}
        >
          View All Birthdays
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <div className="udb-birthday-skeleton" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="udb-birthday-skeleton-row" key={index}>
              <div className="udb-birthday-skeleton-avatar" />
              <div className="udb-birthday-skeleton-copy">
                <div className="udb-birthday-skeleton-line short" />
                <div className="udb-birthday-skeleton-line" />
                <div className="udb-birthday-skeleton-line tiny" />
              </div>
              <div className="udb-birthday-skeleton-badge" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="udb-empty-state udb-card-empty-state">
          <div className="udb-empty-icon error">
            <FaRedo aria-hidden="true" />
          </div>

          <strong>Unable to load birthdays</strong>
          <p>{error}</p>

          <button type="button" className="udb-retry-btn" onClick={onRetry}>
            <FaRedo aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : visibleBirthdays.length === 0 ? (
        <div className="udb-empty-state udb-card-empty-state">
          <div className="udb-empty-icon">
            <FaBirthdayCake aria-hidden="true" />
          </div>

          <strong>No upcoming birthdays</strong>
          <p>The birthdays API returned no employees for the upcoming window.</p>
        </div>
      ) : (
        <div className="udb-birthday-list">
          {visibleBirthdays.map((birthday) => (
            <BirthdaysListItem key={`${birthday.employeeId}-${birthday.employeeName}`} birthday={birthday} />
          ))}
        </div>
      )}
    </section>
  );
}

function BirthdayModal({ open, birthdays, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="udb-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Upcoming birthdays"
    >
      <div className="udb-modal">
        <div className="udb-modal-header">
          <div>
            <h3>Upcoming Birthdays</h3>
            <p>{birthdays.length} birthday{birthdays.length === 1 ? "" : "s"} loaded from the API</p>
          </div>

          <button type="button" className="udb-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {birthdays.length === 0 ? (
          <div className="udb-modal-empty">
            <FaBirthdayCake aria-hidden="true" />
            <strong>No birthdays to display</strong>
            <p>The selected API response did not include any birthdays.</p>
          </div>
        ) : (
          <div className="udb-modal-list">
            {birthdays.map((birthday) => (
              <BirthdaysListItem
                key={`${birthday.employeeId}-${birthday.employeeName}-modal`}
                birthday={birthday}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    recentActivities: [],
    upcomingHolidays: [],
  });
  const [attendanceData, setAttendanceData] = useState({
    attendancePercentage: 0,
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    todayWorkingHours: "",
    weeklyHours: [],
  });
  const [attendanceHasData, setAttendanceHasData] = useState(false);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [birthdaysError, setBirthdaysError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timerLabel = "user-dashboard:initial-data";

    const fetchAll = async () => {
      try {
        setLoading(true);
        setDashboardError("");
        setAttendanceError("");
        setBirthdaysError("");

        startPerformanceTimer(timerLabel);

        const [dashboardResult, attendanceResult, birthdaysResult] =
          await Promise.allSettled([
            api.get(API_ENDPOINTS.userDashboard, {
              signal: controller.signal,
            }),
            getAttendanceDashboardOverview({
              signal: controller.signal,
            }),
            api.get(API_ENDPOINTS.employees.upcomingBirthdays, {
              signal: controller.signal,
            }),
          ]);

        if (dashboardResult.status === "fulfilled") {
          setDashboardData(normalizeDashboardData(dashboardResult.value?.data || {}));
        } else {
          setDashboardData({
            recentActivities: [],
            upcomingHolidays: [],
          });

          setDashboardError("Unable to load your dashboard activity right now.");
          logPerformanceError(
            "User dashboard error:",
            dashboardResult.reason?.response?.data ||
            dashboardResult.reason?.message ||
            dashboardResult.reason
          );
        }

        if (attendanceResult.status === "fulfilled") {
          const source = unwrapPayload(attendanceResult.value?.data || {});
          setAttendanceData(normalizeAttendance(source));
          setAttendanceHasData(Object.keys(source || {}).length > 0);
        } else {
          if (attendanceResult.reason?.code === "ERR_CANCELED") {
            return;
          }

          setAttendanceData({
            attendancePercentage: 0,
            presentDays: 0,
            absentDays: 0,
            halfDays: 0,
            leaveDays: 0,
            todayWorkingHours: "",
            weeklyHours: [],
          });
          setAttendanceHasData(false);
          setAttendanceError(
            getAttendanceDashboardErrorMessage(
              attendanceResult.reason,
              "Unable to load attendance summary."
            )
          );
          logPerformanceError(
            "Attendance dashboard error:",
            attendanceResult.reason?.response?.data ||
            attendanceResult.reason?.message ||
            attendanceResult.reason
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
            "Birthdays dashboard error:",
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
          "User dashboard load error:",
          error.response?.data || error.message
        );

        setDashboardData({
          recentActivities: [],
          upcomingHolidays: [],
        });
        setAttendanceData({
          attendancePercentage: 0,
          presentDays: 0,
          absentDays: 0,
          halfDays: 0,
          leaveDays: 0,
          todayWorkingHours: "",
          weeklyHours: [],
        });
        setBirthdays([]);
        setAttendanceHasData(false);
        setDashboardError("Unable to load your dashboard activity right now.");
        setAttendanceError("Unable to load attendance summary.");
        setBirthdaysError("Unable to load upcoming birthdays.");
      } finally {
        endPerformanceTimer(timerLabel);
        setLoading(false);
      }
    };

    fetchAll();

    return () => controller.abort();
  }, [reloadTick]);

  const recentActivities = useMemo(() => {
    const activityData = dashboardData?.recentActivities || [];

    return sortByRecency(Array.isArray(activityData) ? activityData : []).slice(0, 6);
  }, [dashboardData]);

  const upcomingHolidays = useMemo(
    () => Array.isArray(dashboardData?.upcomingHolidays) ? dashboardData.upcomingHolidays : [],
    [dashboardData]
  );

  const birthdayPreview = useMemo(() => birthdays.slice(0, 6), [birthdays]);

  if (loading) {
    return (
      <div className="udb-wrapper">
        <PageSkeleton variant="dashboard" />
      </div>
    );
  }

  return (

    <div className="udb-wrapper">

      <div className="udb-header">
        <div>
          <h2 className="udb-title">Employee Dashboard</h2>
          <p className="udb-subtitle">
            Track attendance, celebrate birthdays, and keep an eye on today&apos;s work rhythm.
          </p>
        </div>


        <div className="udb-header-chip">
          <FaUsers aria-hidden="true" />
          HRMS Overview
        </div>
      </div>

      <div className="udb-top-cards">
          <div className="udb-top-card">
          <div className="udb-top-card-content">
            <h3>My Tickets</h3>
            <h2>{dashboardData?.myTickets || 0}</h2>
            <span>
              {dashboardData?.pendingTickets || 0} pending
            </span>
          </div>

          <div className="udb-top-card-icon tickets">
            <FaTicketAlt />
          </div>
        </div>

        <div className="udb-top-card">
          <div className="udb-top-card-content">
            <h3>Completed Tickets</h3>
            <h2>{dashboardData?.completedTickets || 0}</h2>
            <span>Completed</span>
          </div>

          <div className="udb-top-card-icon completed">
            <FaCheckCircle />
          </div>
        </div>

        <div className="udb-top-card">
          <div className="udb-top-card-content">
            <h3>Pending Tickets</h3>
            <h2>{dashboardData?.pendingTickets || 0}</h2>
            <span>Need attention</span>
          </div>

          <div className="udb-top-card-icon pending">
            <FaClock />
          </div>
        </div>

        <div className="udb-top-card">
          <div className="udb-top-card-content">
            <h3>Attendance</h3>
            <h2>{dashboardData?.attendance || 0}%</h2>
            <span>This month</span>
          </div>

          <div className="udb-top-card-icon attendance">
            <FaCalendarCheck />
          </div>
        </div>
      </div>
      {dashboardError && (
        <div className="udb-alert" role="alert">
          <div>
            <strong>Dashboard data could not be refreshed.</strong>
            <span>{dashboardError}</span>
          </div>

          <button type="button" className="udb-alert-btn" onClick={() => setReloadTick((tick) => tick + 1)}>
            <FaRedo aria-hidden="true" />
            Retry All
          </button>
        </div>
      )}



      <div className="udb-feature-grid">

        <AttendanceOverviewCard
          data={attendanceData}
          hasData={attendanceHasData}
          error={attendanceError}
          onRetry={() => setReloadTick((tick) => tick + 1)}
        />

        <UpcomingBirthdaysCard
          birthdays={birthdayPreview}
          error={birthdaysError}
          onRetry={() => setReloadTick((tick) => tick + 1)}
          onViewAll={() => setShowBirthdaysModal(true)}
        />
      </div>


      <div className="udb-main">
        <div className="udb-section">
          <h3 className="udb-section-title">My Recent Activities</h3>

          {recentActivities.length === 0 ? (
            dashboardError ? (
              <div className="udb-empty-state">
                <div className="udb-empty-icon error">
                  <FaRedo aria-hidden="true" />
                </div>
                <strong>Activity feed unavailable</strong>
                <p>{dashboardError}</p>
              </div>
            ) : (
              <div className="udb-empty-state">
              <div className="udb-empty-icon">
                  <FaTicketAlt aria-hidden="true" />
                </div>
                <strong>No recent activities</strong>
                <p>Your recent actions will appear here once they are logged.</p>
              </div>
            )
          ) : (
            recentActivities.map((item, index) => {
              const message =
                item?.message ||
                item?.activity ||
                item?.title ||
                "Activity updated";

              const rawTime =
                item?.time ||
                item?.createdAt ||
                item?.updatedAt ||
                item?.date ||
                "";
              const rawTimeText = String(rawTime || "");

              return (
                <div className="udb-task-row" key={`${message}-${index}`}>
                  <span className="udb-activity-message">{message}</span>
                  <span className="udb-activity-time">
                    {rawTimeText
                      ? rawTimeText.toLowerCase().includes("ago")
                        ? rawTimeText
                        : timeAgo(rawTimeText)
                      : ""}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="udb-section">
          <h3 className="udb-section-title">Upcoming Holidays</h3>

          {upcomingHolidays.length === 0 ? (
            <div className="udb-empty-state">
              <div className="udb-empty-icon">
                <FaCalendarAlt aria-hidden="true" />
              </div>
              <strong>No upcoming holidays</strong>
              <p>Holiday information will show here when the dashboard API returns it.</p>
            </div>
          ) : (
            upcomingHolidays.map((holiday, index) => (
              <div className="udb-holiday-row" key={`${holiday?.holidayName || holiday?.holiday_Name || "holiday"}-${index}`}>
                <span>
                  {holiday?.holidayName || holiday?.holiday_Name || holiday?.name || "Holiday"}
                </span>

                <span>{formatDate(holiday?.date || holiday?.holiday_Date)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="udb-actions">
        <button className="udb-action-btn" onClick={() => navigate("/user-leave-management")}>
          <FaPlaneDeparture />
          Apply Leave
        </button>

        <button className="udb-action-btn" onClick={() => navigate("/user-attendance")}>
          <FaCalendarCheck />
          Mark Attendance
        </button>

        <button className="udb-action-btn" onClick={() => navigate("/employee/my-tickets")}>
          <FaTicketAlt />
          View Tickets
        </button>

        <button className="udb-action-btn" onClick={() => navigate("/notifications")}>
          <FaBell />
          Notifications
        </button>
      </div>

      <BirthdayModal
        open={showBirthdaysModal}
        birthdays={birthdays}
        onClose={() => setShowBirthdaysModal(false)}
      />
    </div>
  );
}

export default UserDashboard;
