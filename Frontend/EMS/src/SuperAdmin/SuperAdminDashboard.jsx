// --- old: React hook imports before metric icon rendering was made lint-safe ---
// import { useEffect, useMemo, useState } from "react";
import { createElement, useEffect, useMemo, useState } from "react";
/* --- old: icon set for ten dashboard metric cards ---
import {
  FaBuilding,
  FaChartLine,
  FaCreditCard,
  FaUserCheck,
  FaUserClock,
  FaUsers,
} from "react-icons/fa";
*/
import { FaBuilding, FaChartLine, FaCreditCard, FaUsers } from "react-icons/fa";
import "./SuperAdmin.css";
import "../dashboard/Dashboard.css";
// --- old: enhanced-dashboard-only data source ---
// import { getEnhancedSuperAdminDashboard } from "../services/superAdminService";
import {
  getAdmins,
  getEnhancedSuperAdminDashboard,
  getOrganizations,
} from "../services/superAdminService";

const formatDateTime = (value) => {
  if (!value) return "Recently";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString();
};

function MiniTable({ title, rows, columns, emptyMessage = "No recent records." }) {
  return (
    <section className="super-admin-table-card">
      <h3>{title}</h3>
      <div className="super-admin-list">
        {rows.length ? (
          rows.map((row, index) => (
            <div className="super-admin-list-row" key={`${title}-${row.id ?? row.identifier ?? index}`}>
              <span>{row[columns[0]] || "—"}</span>
              <strong>{row[columns[1]] || "—"}</strong>
            </div>
          ))
        ) : (
          <p className="super-admin-dashboard-empty">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}

function SuperAdminDashboard() {
  // --- old: dashboard state only ---
  // const [dashboard, setDashboard] = useState({});
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getEnhancedSuperAdminDashboard();
        if (mounted) setDashboard(data);
      } catch {
        if (mounted) {
          setDashboard({});
          setError("The platform overview could not be loaded. Please try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  // --- old: enhanced endpoint activity feed ---
  // const activity = (dashboard.recentActivities || []).map((item) => ({
  //   ...item,
  //   what: item.activity || item.action || "Recent activity",
  //   when: formatDateTime(item.createdAt),
  // }));
  useEffect(() => {
    let mounted = true;

    const loadActivitySources = async () => {
      try {
        const [organizationList, adminList] = await Promise.all([getOrganizations(), getAdmins()]);
        if (mounted) {
          setOrganizations(organizationList);
          setAdmins(adminList);
        }
      } catch {
        if (mounted) {
          setOrganizations([]);
          setAdmins([]);
        }
      }
    };

    loadActivitySources();
    return () => {
      mounted = false;
    };
  }, []);

  /* --- old: ten enhanced dashboard metric cards ---
  const metricsOld = useMemo(
    () => [
      ["Total Organizations", dashboard.totalOrganizations, FaBuilding, "blue"],
      ["Active Organizations", dashboard.activeOrganizations, FaChartLine, "green"],
      ["Total Admins", dashboard.totalAdmins, FaUsers, "blue"],
      ["Active Admins", dashboard.activeAdmins, FaUserCheck, "green"],
      ["Total Employees", dashboard.totalEmployees, FaUsers, "blue"],
      ["Active Employees", dashboard.activeEmployees, FaUserCheck, "green"],
      ["Pending Onboarding", dashboard.pendingOnboardingEmployees, FaUserClock, "orange"],
      ["Active Subscriptions", dashboard.activeSubscriptions, FaCreditCard, "green"],
      ["Expired Subscriptions", dashboard.expiredSubscriptions, FaCreditCard, "orange"],
      ["Expiring Soon", dashboard.expiringSoon, FaUserClock, "orange"],
    ],
    [dashboard]
  );
  */
  const metrics = useMemo(
    () => [
      ["Total Organizations", dashboard.totalOrganizations, FaBuilding, "blue"],
      ["Active Organizations", dashboard.activeOrganizations, FaChartLine, "green"],
      ["Total Admins", dashboard.totalAdmins, FaUsers, "blue"],
      ["Active Subscriptions", dashboard.activeSubscriptions, FaCreditCard, "green"],
      ["Expired Subscriptions", dashboard.expiredSubscriptions, FaCreditCard, "orange"],
    ],
    [dashboard]
  );

  const recentOrganizations = dashboard.recentOrganizations || [];
  const recentAdmins = (dashboard.recentAdmins || []).map((admin) => ({
    ...admin,
    status: admin.isActive ? "Active" : "Inactive",
  }));
  // --- old: Latest Employees panel data source ---
  // const recentEmployees = (dashboard.recentEmployees || []).map((employee) => ({
  //   ...employee,
  //   displayName: employee.name || employee.employeeId,
  //   displayStatus: employee.status || "—",
  // }));
  const activity = useMemo(() => {
    const toTimestamp = (item) => {
      const value = item.createdDate || item.createdAt || item.created_On || item.raw?.createdDate || item.raw?.CreatedDate || item.raw?.createdAt || item.raw?.CreatedAt;
      const timestamp = value ? new Date(value).getTime() : Number.NaN;
      return Number.isFinite(timestamp) ? timestamp : 0;
    };
    const toWhen = (item) => {
      const value = item.createdDate || item.createdAt || item.created_On || item.raw?.createdDate || item.raw?.CreatedDate || item.raw?.createdAt || item.raw?.CreatedAt;
      return value ? formatDateTime(value) : "Recently";
    };

    return [
      ...organizations.map((organization) => ({
        what: `Organization ${organization.organizationName || organization.organizationCode || ""} was created`,
        when: toWhen(organization),
        timestamp: toTimestamp(organization),
      })),
      ...admins.map((admin) => ({
        what: `Admin ${admin.email || ""} was added`,
        when: toWhen(admin),
        timestamp: toTimestamp(admin),
      })),
    ].sort((left, right) => right.timestamp - left.timestamp);
  }, [organizations, admins]);

  return (
    <div className="dashboard super-admin-dashboard">
      <div className="dashboard-hero">
        <h2 className="title">Super Admin Portal</h2>
        <p className="subtitle">Platform overview across all EMS client companies.</p>
      </div>

      {error && <p className="super-admin-error" role="alert">{error}</p>}

      <div className="cards" aria-busy={loading}>
        {metrics.map(([label, value, Icon, tone]) => (
          <article className="card" key={label}>
            <span className="label">{label}</span>
            <div className="bottom-row">
              {/* --- old: JSX metric icon rendering ---
              <span className={`icon ${tone}`}><Icon /></span>
              */}
              <span className={`icon ${tone}`}>{createElement(Icon)}</span>
              <strong className="value">{loading ? "—" : value ?? 0}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="super-admin-table-grid">
        {/* --- old: four dashboard panels, including Latest Employees ---
        <MiniTable title="Latest Organizations" rows={recentOrganizations.slice(0, 3)} columns={["organizationName", "status"]} />
        <MiniTable title="Latest Admins" rows={recentAdmins.slice(0, 3)} columns={["email", "status"]} />
        <MiniTable title="Latest Employees" rows={recentEmployees.slice(0, 3)} columns={["displayName", "displayStatus"]} />
        <MiniTable title="Latest Activity" rows={activity.slice(0, 3)} columns={["what", "when"]} />
        */}
        <MiniTable title="Latest Organizations" rows={recentOrganizations.slice(0, 3)} columns={["organizationName", "status"]} />
        <MiniTable title="Latest Activity" rows={activity.slice(0, 3)} columns={["what", "when"]} />
        <MiniTable title="Latest Admins" rows={recentAdmins.slice(0, 3)} columns={["email", "status"]} />
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
