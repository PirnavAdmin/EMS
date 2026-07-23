import React, {
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaAdjust,
  FaBusinessTime,
  FaCalendarCheck,
  FaCalendarTimes,
  FaChartBar,
  FaCheckCircle,
  FaClock,
  FaHome,
  FaRedo,
  FaSignOutAlt,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";
import "./AttendanceOverview.css";

const isRecordLike = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date);

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
  if (typeof value === "string") {
    const sanitized = value.trim().replace(/,/g, "").replace(/%/g, "");
    const numeric = Number(sanitized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clampPercentage = (value) => {
  const numeric = normalizeNumber(value, 0);
  return Math.min(100, Math.max(0, numeric));
};

const formatCountValue = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numeric = normalizeNumber(value, Number.NaN);

  if (Number.isFinite(numeric)) {
    if (Number.isInteger(numeric)) {
      return String(numeric);
    }

    return String(Number(numeric.toFixed(1)));
  }

  const text = String(value).trim();
  return text || fallback;
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
        return "0h";
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

    if (/\d+\s*h/i.test(trimmed) || /\d+\s*m/i.test(trimmed)) {
      return trimmed;
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

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const getFirstPresentValue = (source, keys = []) => {
  if (!isRecordLike(source)) {
    return undefined;
  }

  for (const key of keys) {
    if (!hasOwn(source, key)) {
      continue;
    }

    const value = source[key];

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === "string" && !value.trim()) {
      continue;
    }

    return value;
  }

  return undefined;
};

const flattenMetricValue = (value) => {
  if (!isRecordLike(value)) {
    return value;
  }

  return (
    getFirstPresentValue(value, [
      "value",
      "count",
      "total",
      "hours",
      "workingHours",
      "duration",
      "number",
      "attendance",
      "percentage",
    ]) ?? value
  );
};

const findMetricEntry = (source, keys = []) => {
  if (!isRecordLike(source)) {
    return null;
  }

  for (const key of keys) {
    if (!hasOwn(source, key)) {
      continue;
    }

    const value = source[key];

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === "string" && !value.trim()) {
      continue;
    }

    return { key, value };
  }

  return null;
};

const resolveMetricDisplayValue = (entry, { format = "count", fallback = "-" } = {}) => {
  if (!entry) {
    return fallback;
  }

  const key = String(entry.key || "").toLowerCase();
  const value = flattenMetricValue(entry.value);

  if (format === "hours" || /hour|time|working/.test(key)) {
    return formatWorkingHours(value, fallback);
  }

  return formatCountValue(value, fallback);
};

const resolveMetricCount = (source, keys = [], fallback = 0) => {
  const entry = findMetricEntry(source, keys);
  const value = flattenMetricValue(entry?.value);
  const numeric = normalizeNumber(value, Number.NaN);

  if (Number.isFinite(numeric)) {
    return Math.max(0, numeric);
  }

  return fallback;
};

const calculateAttendancePercentage = (presentEmployees = 0, totalEmployees = 0) => {
  const present = Math.max(0, normalizeNumber(presentEmployees, 0));
  const total = Math.max(0, normalizeNumber(totalEmployees, 0));

  if (!total) {
    return 0;
  }

  return Math.min(100, Math.round((present / total) * 100));
};

const prepareChartData = (payload = {}) => {
  const source = unwrapPayload(payload);
  const totalEmployees = resolveMetricCount(source, [
    "totalEmployees",
    "totalEmployeeCount",
    "employeeCount",
    "employees",
    "total",
  ]);
  const present = resolveMetricCount(source, [
    "presentEmployees",
    "presentEmployeeCount",
    "presentCount",
    "present",
  ]);
  const absent = resolveMetricCount(source, [
    "absentEmployees",
    "absentEmployeeCount",
    "absentCount",
    "absent",
  ]);
  const leave = resolveMetricCount(source, [
    "leaveEmployees",
    "leaveEmployeeCount",
    "leaveCount",
    "leave",
    "onLeave",
    "onLeaveCount",
  ]);
  const halfDay = resolveMetricCount(source, [
    "halfDayEmployees",
    "halfDayEmployeeCount",
    "halfDayCount",
    "halfDay",
  ]);
  const late = resolveMetricCount(source, [
    "lateEmployees",
    "lateEmployeeCount",
    "lateCount",
    "late",
  ]);

  const chartData = [
    {
      key: "present",
      label: "Present",
      count: present,
      color: "var(--theme-success)",
    },
    {
      key: "absent",
      label: "Absent",
      count: absent,
      color: "var(--theme-danger)",
    },
    {
      key: "leave",
      label: "Leave",
      count: leave,
      color: "var(--theme-info)",
    },
    {
      key: "halfDay",
      label: "Half Day",
      count: halfDay,
      color: "var(--attendance-status-orange)",
    },
    {
      key: "late",
      label: "Late",
      count: late,
      color: "var(--attendance-status-amber)",
    },
  ];

  return {
    totalEmployees,
    present,
    absent,
    leave,
    halfDay,
    late,
    chartData,
  };
};

const buildExtraCards = (source = {}) => {
  const earlyCheckoutEntry = findMetricEntry(source, [
    "earlyCheckoutEmployees",
    "earlyCheckoutCount",
    "earlyCheckout",
    "earlyCheckOut",
  ]);
  const wfhEntry = findMetricEntry(source, [
    "wfhEmployees",
    "workFromHomeEmployees",
    "wfhCount",
    "wfh",
    "workFromHome",
  ]);
  const overtimeEntry = findMetricEntry(source, [
    "overtimeHours",
    "overtime",
    "overtimeCount",
    "overtimeEmployees",
  ]);

  return [
    {
      key: "earlyCheckout",
      label: "Early Checkout",
      subtitle: "Left early",
      tone: "early-checkout",
      icon: FaSignOutAlt,
      value: resolveMetricDisplayValue(earlyCheckoutEntry),
      visible: Boolean(earlyCheckoutEntry),
    },
    {
      key: "wfh",
      label: "WFH",
      subtitle: "Working from home",
      tone: "wfh",
      icon: FaHome,
      value: resolveMetricDisplayValue(wfhEntry),
      visible: Boolean(wfhEntry),
    },
    {
      key: "overtime",
      label: "Overtime",
      subtitle: "Extra hours",
      tone: "overtime",
      icon: FaBusinessTime,
      value: resolveMetricDisplayValue(overtimeEntry, {
        format: /hour|time/.test(String(overtimeEntry?.key || "").toLowerCase())
          ? "hours"
          : "count",
      }),
      visible: Boolean(overtimeEntry),
    },
  ].filter((card) => card.visible);
};

const normalizeAttendanceOverview = (payload = {}) => {
  const source = unwrapPayload(payload);
  const distribution = prepareChartData(source);

  return {
    hasData: Object.keys(source || {}).length > 0,
    totalEmployees: distribution.totalEmployees,
    attendancePercentage: calculateAttendancePercentage(
      distribution.present,
      distribution.totalEmployees
    ),
    presentEmployees: formatCountValue(distribution.present),
    absentEmployees: formatCountValue(distribution.absent),
    halfDayEmployees: formatCountValue(distribution.halfDay),
    leaveEmployees: formatCountValue(distribution.leave),
    lateEmployees: formatCountValue(distribution.late),
    chartData: distribution.chartData,
    extraCards: buildExtraCards(source),
  };
};

function AttendanceStatCard({
  title,
  value,
  subtitle,
  tone,
  icon: Icon,
}) {
  return (
    <article className={`ad-attendance-stat-card ${tone}`}>
      <div className="ad-attendance-stat-copy">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>

      <div className="ad-attendance-stat-icon" aria-hidden="true">
        <Icon />
      </div>
    </article>
  );
}

function AttendanceProgressCircle({ percentage }) {
  const clampedPercentage = clampPercentage(percentage);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const size = 128;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      setAnimatedPercentage(clampedPercentage);
      return undefined;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setAnimatedPercentage(clampedPercentage);
      return undefined;
    }

    let frameId = 0;
    const startTime = performance.now();
    const duration = 850;

    const animate = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPercentage(clampedPercentage * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    setAnimatedPercentage(0);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [clampedPercentage]);

  const dashOffset =
    circumference - (animatedPercentage / 100) * circumference;

  return (
    <div
      className="ad-attendance-progress-card"
      aria-label={`Attendance ${Math.round(clampedPercentage)} percent`}
    >
      <svg
        className="ad-attendance-progress-ring"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          className="ad-attendance-progress-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="ad-attendance-progress-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>

      <div className="ad-attendance-progress-copy">
        <strong>{Math.round(animatedPercentage)}%</strong>
        <span>Attendance</span>
      </div>
    </div>
  );
}

const renderAttendanceBarLabel = ({ x = 0, y = 0, width = 0, value }) => {
  const numericValue = normalizeNumber(value, Number.NaN);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return (
    <text
      x={x + width / 2}
      y={Math.max(12, y - 8)}
      textAnchor="middle"
      fill="var(--text-strong)"
      fontSize={11}
      fontWeight={700}
    >
      {formatCountValue(numericValue, "0")}
    </text>
  );
};

const AttendanceDistributionChart = memo(function AttendanceDistributionChart({
  data = [],
  totalEmployees = 0,
}) {
  const chartData = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data]
  );
  const maxValue = useMemo(
    () =>
      chartData.reduce(
        (currentMax, item) => Math.max(currentMax, normalizeNumber(item?.count, 0)),
        0
      ),
    [chartData]
  );

  if (Math.max(0, normalizeNumber(totalEmployees, 0)) <= 0) {
    return (
      <div className="ad-attendance-chart-empty">
        <div className="ad-attendance-chart-empty-icon" aria-hidden="true">
          <FaChartBar />
        </div>
        <strong>No attendance data available.</strong>
        <p>The chart will appear here once the dashboard API returns employee counts.</p>
      </div>
    );
  }

  const yAxisMax = maxValue > 0 ? Math.ceil(maxValue * 1.25) : 5;

  return (
    <div className="ad-attendance-chart-plot">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 28, right: 8, left: -8, bottom: 4 }}
          barCategoryGap="26%"
          barGap={10}
        >
          <CartesianGrid strokeDasharray="4 10" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{
              fill: "var(--text-muted)",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={36}
            tick={{
              fill: "var(--text-muted)",
              fontSize: 11,
              fontWeight: 600,
            }}
            allowDecimals={false}
            domain={[0, yAxisMax]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-soft)",
              borderRadius: "14px",
              boxShadow: "var(--theme-shadow-md)",
              color: "var(--text-strong)",
            }}
            labelStyle={{
              color: "var(--text-strong)",
              fontWeight: 700,
            }}
            itemStyle={{
              color: "var(--text-body)",
            }}
            cursor={{
              fill: "var(--sidebar-accent-soft)",
            }}
            formatter={(value, _name, props) => [
              formatCountValue(value, "0"),
              props?.payload?.label || "Employees",
            ]}
          />
          <Bar
            dataKey="count"
            radius={[12, 12, 0, 0]}
            isAnimationActive
            animationDuration={800}
          >
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
            <LabelList content={renderAttendanceBarLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

function AttendanceOverviewSkeleton() {
  return (
    <div className="ad-attendance-skeleton" aria-busy="true" aria-live="polite">
      <div className="ad-attendance-skeleton-top">
        <div className="ad-attendance-skeleton-progress">
          <div className="ad-attendance-skeleton-ring" />
          <div className="ad-attendance-skeleton-progress-copy">
            <div className="ad-attendance-skeleton-line is-lg" />
            <div className="ad-attendance-skeleton-line is-sm" />
          </div>
        </div>

        <div className="ad-attendance-skeleton-grid">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="ad-attendance-skeleton-stat" key={index}>
              <div className="ad-attendance-skeleton-stat-copy">
                <div className="ad-attendance-skeleton-line is-xs" />
                <div className="ad-attendance-skeleton-line is-md" />
                <div className="ad-attendance-skeleton-line is-sm" />
              </div>
              <div className="ad-attendance-skeleton-stat-icon" />
            </div>
          ))}
        </div>
      </div>

      <div className="ad-attendance-skeleton-chart">
        <div className="ad-attendance-skeleton-chart-header">
          <div className="ad-attendance-skeleton-line is-md" />
          <div className="ad-attendance-skeleton-line is-subtitle" />
        </div>

        <div className="ad-attendance-skeleton-chart-plot">
          <div className="ad-attendance-skeleton-bars">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                className="ad-attendance-skeleton-bar"
                style={{ height: `${38 + ((index * 11) % 36)}%` }}
                key={index}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceOverviewCard({
  data = {},
  loading = false,
  error = "",
  onRetry,
}) {
  const normalized = useMemo(
    () => normalizeAttendanceOverview(data),
    [data]
  );

  const summaryCards = useMemo(
    () => [
      {
        key: "total-employees",
        title: "TOTAL EMPLOYEES",
        value: formatCountValue(normalized.totalEmployees, "0"),
        subtitle: "Registered Employees",
        tone: "total-employees",
        icon: FaUsers,
      },
      {
        key: "present",
        title: "Present",
        value: normalized.presentEmployees,
        subtitle: "Working Employees",
        tone: "present",
        icon: FaCheckCircle,
      },
      {
        key: "absent",
        title: "Absent",
        value: normalized.absentEmployees,
        subtitle: "Absent Today",
        tone: "absent",
        icon: FaTimesCircle,
      },
      {
        key: "leave",
        title: "Leave",
        value: normalized.leaveEmployees,
        subtitle: "Employees on Leave",
        tone: "leave",
        icon: FaCalendarTimes,
      },
      {
        key: "half-day",
        title: "Half Day",
        value: normalized.halfDayEmployees,
        subtitle: "Half Day Employees",
        tone: "half-day",
        icon: FaAdjust,
      },
      {
        key: "late",
        title: "Late",
        value: normalized.lateEmployees,
        subtitle: "Arrived late",
        tone: "late",
        icon: FaClock,
      },
      ...normalized.extraCards.map((card) => ({
        key: card.key,
        title: card.label,
        value: card.value,
        subtitle: card.subtitle,
        tone: card.tone,
        icon: card.icon,
      })),
    ],
    [normalized]
  );

  if (loading) {
    return (
      <section
        className="ad-attendance-overview ad-attendance-overview--loading"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="ad-attendance-overview-header">
          <div className="ad-attendance-overview-copy">
            <div className="ad-attendance-skeleton-line is-header" />
            <div className="ad-attendance-skeleton-line is-subtitle" />
          </div>

          <div className="ad-attendance-overview-chip is-skeleton">
            <FaCalendarCheck aria-hidden="true" />
            <span>Live Attendance</span>
          </div>
        </div>

        <AttendanceOverviewSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className="ad-attendance-overview" role="region" aria-label="Attendance overview">
        <div className="ad-attendance-overview-header">
          <div className="ad-attendance-overview-copy">
            <h3 className="ad-attendance-overview-title">Attendance Overview</h3>
            <p className="ad-attendance-overview-subtitle">
              Monitor attendance levels, absence trends, and today&apos;s distribution at a glance.
            </p>
          </div>

          <div className="ad-attendance-overview-chip">
            <FaCalendarCheck aria-hidden="true" />
            <span>Live Attendance</span>
          </div>
        </div>

        <div className="ad-attendance-empty-state ad-attendance-empty-state--error">
          <div className="ad-attendance-empty-icon">
            <FaRedo aria-hidden="true" />
          </div>

          <strong>Unable to load attendance overview</strong>
          <p>{error}</p>

          <button type="button" className="ad-attendance-retry-btn" onClick={onRetry}>
            <FaRedo aria-hidden="true" />
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!normalized.hasData) {
    return (
      <section className="ad-attendance-overview" role="region" aria-label="Attendance overview">
        <div className="ad-attendance-overview-header">
          <div className="ad-attendance-overview-copy">
            <h3 className="ad-attendance-overview-title">Attendance Overview</h3>
            <p className="ad-attendance-overview-subtitle">
              Monitor attendance levels, absence trends, and today&apos;s distribution at a glance.
            </p>
          </div>

          <div className="ad-attendance-overview-chip">
            <FaCalendarCheck aria-hidden="true" />
            <span>Live Attendance</span>
          </div>
        </div>

        <div className="ad-attendance-empty-state">
          <div className="ad-attendance-empty-icon">
            <FaChartBar aria-hidden="true" />
          </div>

          <strong>No attendance data available.</strong>
          <p>The dashboard will show live attendance insights once the API responds.</p>

          <button type="button" className="ad-attendance-retry-btn" onClick={onRetry}>
            <FaRedo aria-hidden="true" />
            Refresh
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="ad-attendance-overview ad-attendance-overview--ready"
      role="region"
      aria-label="Attendance overview"
    >
      <div className="ad-attendance-overview-header">
        <div className="ad-attendance-overview-copy">
          <h3 className="ad-attendance-overview-title">Attendance Overview</h3>
          <p className="ad-attendance-overview-subtitle">
            Monitor attendance levels, absence trends, and today&apos;s distribution at a glance.
          </p>
        </div>

        <div className="ad-attendance-overview-chip">
          <FaCalendarCheck aria-hidden="true" />
          <span>Live Attendance</span>
        </div>
      </div>

      <div className="ad-attendance-top-grid">
        <AttendanceProgressCircle percentage={normalized.attendancePercentage} />

        <div className="ad-attendance-summary-grid">
          {summaryCards.map((card) => (
            <AttendanceStatCard
              key={card.key}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              tone={card.tone}
              icon={card.icon}
            />
          ))}
        </div>
      </div>

      <div className="ad-attendance-chart-card">
        <div className="ad-attendance-chart-card-header">
          <div className="ad-attendance-chart-card-copy">
            <h4>Employee Attendance Distribution</h4>
            <p>Today's workforce breakdown from the live attendance summary.</p>
          </div>
        </div>

        <AttendanceDistributionChart
          data={normalized.chartData}
          totalEmployees={normalized.totalEmployees}
        />
      </div>
    </section>
  );
}

export {
  AttendanceDistributionChart,
  AttendanceProgressCircle,
  AttendanceStatCard,
  calculateAttendancePercentage,
  normalizeAttendanceOverview,
  prepareChartData,
};

export default memo(AttendanceOverviewCard);
