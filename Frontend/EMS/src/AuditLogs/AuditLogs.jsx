import { useCallback, useEffect, useMemo, useState } from "react";
import { FaDownload, FaEye, FaRedo, FaSearch, FaTimes } from "react-icons/fa";
import { toastError } from "../components/common/Toast/toastService";
import useDebouncedValue from "../hooks/useDebouncedValue";
import {
  auditLogField,
  exportAuditLogs,
  getAuditLog,
  getAuditLogSummary,
  getAuditLogs,
} from "../services/auditLogService";
import "./AuditLogs.css";

const DEFAULT_PAGE_SIZE = 10;
const summaryValue = (summary, ...keys) => {
  const value = auditLogField(summary, ...keys);
  if (value === "" || value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object") return "—";
  return value;
};
const parseAuditTimestamp = (value) => {
  if (!value) return null;
  const timestamp = typeof value === "string" && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? `${value}Z`
    : value;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dateLabel = (value) => parseAuditTimestamp(value)?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "—";
const deviceName = (userAgent = "") => {
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/Android/i.test(userAgent)) {
    const model = userAgent.match(/Android[^;)]*;\s*([^;)]+)/i)?.[1]?.replace(/\s+Build\/.*$/i, "").trim();
    return model ? `Android · ${model}` : "Android device";
  }
  if (/Windows/i.test(userAgent)) return "Windows PC";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "Mac";
  if (/Linux/i.test(userAgent)) return "Linux PC";
  return userAgent ? "Other device" : "—";
};
const errorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.title || error?.message || fallback;

function AuditLogs() {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filters, setFilters] = useState({ search: "", role: "", startDate: "", endDate: "" });
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const query = useMemo(() => ({
    Page: page,
    PageSize: pageSize,
    ...(debouncedSearch ? { Search: debouncedSearch } : {}),
    ...(filters.startDate ? { StartDate: new Date(`${filters.startDate}T00:00:00`).toISOString() } : {}),
    ...(filters.endDate ? { EndDate: new Date(`${filters.endDate}T23:59:59.999`).toISOString() } : {}),
  }), [debouncedSearch, filters.endDate, filters.startDate, page, pageSize]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await getAuditLogSummary();
      setSummary(result || {});
    } catch (requestError) {
      toastError(errorMessage(requestError, "Unable to load audit log summary."));
    } finally { setSummaryLoading(false); }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAuditLogs(query);
      setRecords(result.items);
      setTotal(result.total);
      setPage((current) => result.page || current);
    } catch (requestError) {
      setRecords([]);
      setError(errorMessage(requestError, "Unable to load audit logs."));
    } finally { setLoading(false); }
  }, [pageSize, query]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };
  const visibleRecords = records.filter((record) => {
    if (!filters.role) return true;
    const normalizedRole = String(record.role || "").replace(/[\s_-]/g, "").toLowerCase();
    return filters.role === "admin"
      ? normalizedRole === "admin" || normalizedRole === "organizationadmin"
      : normalizedRole === "employee";
  });
  const showDetails = async (record) => {
    setDetailLoading(true);
    setDetail(record);
    try { setDetail(await getAuditLog(record.id)); }
    catch (requestError) {
      toastError(errorMessage(requestError, "Unable to load audit log details."));
    } finally { setDetailLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { ...query };
      delete params.Page;
      delete params.PageSize;
      const response = await exportAuditLogs(params);
      const disposition = response.headers?.["content-disposition"] || "";
      const filename = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i)?.[1] || "audit-logs.xlsx";
      const blobUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = decodeURIComponent(filename.replace(/"/g, ""));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (requestError) {
      toastError(errorMessage(requestError, "Unable to export audit logs."));
    } finally { setExporting(false); }
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const modulesTracked = auditLogField(summary, "modulesTracked", "ModulesTracked");
  const latestRecord = records.reduce((latest, record) => {
    if (!latest) return record;
    return (parseAuditTimestamp(record.dateTime)?.getTime() || 0) > (parseAuditTimestamp(latest.dateTime)?.getTime() || 0)
      ? record
      : latest;
  }, null);
  const recentActivity = summaryValue(summary, "recentActivity", "RecentActivity", "latestActivity", "LatestActivity");
  const summaryCards = [
    { label: "Total Activities", value: summaryValue(summary, "totalActivities", "TotalActivities", "totalCount", "TotalCount") },
    { label: "Unique Users", value: summaryValue(summary, "uniqueUsers", "UniqueUsers") },
    {
      label: "Recent Activity",
      value: recentActivity !== "—" ? recentActivity : latestRecord?.description || (latestRecord ? `${latestRecord.action} · ${latestRecord.module}` : "—"),
      detail: latestRecord ? dateLabel(latestRecord.dateTime) : "",
      recent: true,
    },
    {
      label: "Modules Tracked",
      value: summaryValue(summary, "modulesTracked", "ModulesTracked"),
      detail: Array.isArray(modulesTracked) ? modulesTracked.join(" · ") : "",
    },
  ];

  return (
    <main className="audit-page">
      <header className="audit-header">
        <div><h1>Audit Logs</h1><p>Review activity recorded across your organization.</p></div>
        <div className="audit-actions">
          <button type="button" className="audit-button secondary" onClick={() => { void loadRecords(); void loadSummary(); }} disabled={loading || summaryLoading}><FaRedo /> Refresh</button>
          <button type="button" className="audit-button primary" onClick={handleExport} disabled={exporting}><FaDownload /> {exporting ? "Exporting…" : "Export"}</button>
        </div>
      </header>

      <section className="audit-summary" aria-label="Audit log summary">
        {summaryCards.map(({ label, value, detail, recent }) => <article className="audit-summary-card" key={label}>
          <span>{label}</span>
          <strong className={recent ? "audit-summary-recent" : ""} title={String(value)}>{summaryLoading ? "…" : value}</strong>
          {detail && <small className="audit-summary-detail" title={detail}>{detail}</small>}
        </article>)}
      </section>

      <section className="audit-panel">
        <div className="audit-filters">
          <label className="audit-search"><FaSearch /><input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search user or description" aria-label="Search user or description" /></label>
          <select value={filters.role} onChange={(event) => updateFilter("role", event.target.value)} aria-label="Filter by Role"><option value="">All Roles</option><option value="admin">Admin</option><option value="employee">Employee</option></select>
          <label className="audit-date">Start date<input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} /></label>
          <label className="audit-date">End date<input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} /></label>
        </div>

        {error && <div className="audit-error" role="alert">{error}{/403/.test(error) ? " You do not have permission to view these records." : ""}</div>}
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead><tr><th>Date &amp; Time</th><th>User Name</th><th>Role</th><th>Device</th><th>Module</th><th>Action</th><th>Description</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="9" className="audit-message">Loading audit logs…</td></tr> : error ? <tr><td colSpan="9" className="audit-message">Audit records could not be loaded.</td></tr> : visibleRecords.length === 0 ? <tr><td colSpan="9" className="audit-message">No audit records match these filters.</td></tr> : visibleRecords.map((record, index) => <tr key={record.id || `${record.dateTime}-${index}`}>
                <td>{dateLabel(record.dateTime)}</td><td>{record.userName || "—"}</td><td>{record.role || "—"}</td><td title={record.userAgent || ""}>{deviceName(record.userAgent)}</td><td>{record.module || "—"}</td><td>{record.action || "—"}</td><td className="audit-description">{record.description || "—"}</td><td>{record.entityName || record.entityId || "—"}</td><td><button type="button" className="audit-view" onClick={() => showDetails(record)} disabled={!record.id} aria-label="View audit details"><FaEye /> View</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <footer className="audit-pagination"><span>{filters.role ? `${visibleRecords.length} matching on this page` : total ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}` : "0 records"} · Page {page} of {pageCount}</span><label>Rows per page <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label><div><button type="button" className="audit-button secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page <= 1}>Previous</button><button type="button" className="audit-button secondary" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={loading || page >= pageCount}>Next</button></div></footer>
      </section>

      {detail && <div className="audit-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><section className="audit-detail-modal" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title"><header><div><h2 id="audit-detail-title">Audit log details</h2><p>{detailLoading ? "Loading record…" : dateLabel(detail.dateTime)}</p></div><button type="button" className="audit-close" onClick={() => setDetail(null)} aria-label="Close details"><FaTimes /></button></header>{!detailLoading && <dl className="audit-detail-grid">{[["User Name", detail.userName], ["User Role", detail.role], ["Organization Code", detail.organizationCode], ["Action", detail.action], ["Module", detail.module], ["Entity Name", detail.entityName], ["Entity ID", detail.entityId], ["Date and Time", dateLabel(detail.dateTime)], ["IP Address", detail.ipAddress], ["Description", detail.description]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>}</section></div>}
    </main>
  );
}

export default AuditLogs;
