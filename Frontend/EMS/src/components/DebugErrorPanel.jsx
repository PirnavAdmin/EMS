import React from "react";
import {
  FaCode,
  FaExclamationTriangle,
  FaRedoAlt,
  FaShieldAlt,
} from "react-icons/fa";
import {
  getStoredRole,
  getStoredRoleName,
} from "../utils/authStorage";

const outerStyle = {
  minHeight: "calc(100vh - 96px)",
  padding: "clamp(20px, 4vw, 44px)",
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(circle at top left, rgba(239, 68, 68, 0.12), transparent 25%), radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.12), transparent 28%), linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94))",
};

const cardStyle = {
  width: "min(100%, 980px)",
  borderRadius: "24px",
  padding: "clamp(22px, 3vw, 36px)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
  background: "var(--surface, #fff)",
  color: "var(--text-primary, #0f172a)",
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "0.5rem 0.85rem",
  borderRadius: "999px",
  background: "rgba(239, 68, 68, 0.08)",
  color: "rgb(185, 28, 28)",
  fontWeight: 700,
  fontSize: "12px",
  letterSpacing: "0.02em",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginTop: "20px",
};

const detailCardStyle = {
  borderRadius: "18px",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  background: "rgba(248, 250, 252, 0.75)",
  padding: "16px",
};

const detailLabelStyle = {
  display: "block",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted, #64748b)",
  marginBottom: "8px",
};

const detailValueStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  wordBreak: "break-word",
};

const stackStyle = {
  marginTop: "20px",
  borderRadius: "18px",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  background: "#0f172a",
  color: "#e2e8f0",
  padding: "18px",
  overflow: "auto",
};

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  border: "none",
  borderRadius: "999px",
  padding: "0.85rem 1.2rem",
  cursor: "pointer",
  background: "linear-gradient(135deg, var(--theme-primary, #2563eb), var(--theme-secondary, #0f766e))",
  color: "var(--theme-on-primary, #fff)",
  fontWeight: 700,
};

const normalizeText = (value, fallback = "Unavailable") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

function DetailRow({ label, value }) {
  return (
    <div style={detailCardStyle}>
      <span style={detailLabelStyle}>{label}</span>
      <div style={detailValueStyle}>{normalizeText(value)}</div>
    </div>
  );
}

function DebugErrorPanel({
  title = "Application Error",
  message = "An unexpected error occurred.",
  error,
  componentStack = "",
  details = {},
  onRetry,
}) {
  const currentUrl =
    details.currentUrl ||
    (typeof window !== "undefined" ? window.location.href : "");
  const routeName =
    details.routeName ||
    (typeof window !== "undefined" ? window.location.pathname : "");
  const currentRole = details.currentRole || getStoredRole();
  const currentRoleName = details.currentRoleName || getStoredRoleName();
  const failedApi =
    details.failedApi ||
    details.api ||
    error?.api ||
    "";
  const status = details.status || error?.status || "";
  const sourceFile = details.sourceFile || "";
  const lineNumber = details.lineNumber || "";
  const columnNumber = details.columnNumber || "";
  const sourceLocation =
    details.sourceLocation ||
    (sourceFile
      ? `${sourceFile}:${lineNumber || "?"}:${columnNumber || "?"}`
      : "");
  const resolvedMessage =
    message ||
    error?.message ||
    "An unexpected error occurred.";
  const resolvedStack =
    componentStack ||
    details.componentStack ||
    error?.stack ||
    "";

  return (
    <div style={outerStyle}>
      <div style={cardStyle} className="app-surface">
        <div style={headerStyle}>
          <div>
            <div style={badgeStyle}>
              <FaExclamationTriangle />
              <span>Debug error</span>
            </div>

            <h1
              style={{
                margin: "16px 0 8px",
                fontSize: "clamp(28px, 4vw, 42px)",
                lineHeight: 1.1,
              }}
            >
              {normalizeText(title, "Application Error")}
            </h1>

            <p
              style={{
                margin: 0,
                color: "var(--text-secondary, #475569)",
                lineHeight: 1.7,
                maxWidth: "70ch",
              }}
            >
              {normalizeText(resolvedMessage, "An unexpected error occurred.")}
            </p>
          </div>

          <button
            type="button"
            style={buttonStyle}
            onClick={onRetry || (() => window.location.reload())}
          >
            <FaRedoAlt />
            {onRetry ? "Try Again" : "Reload Page"}
          </button>
        </div>

        <div style={gridStyle}>
          <DetailRow label="Route Name" value={routeName} />
          <DetailRow label="Current URL" value={currentUrl} />
          <DetailRow label="Source File" value={sourceFile} />
          <DetailRow label="Line Number" value={lineNumber} />
          <DetailRow label="Column Number" value={columnNumber} />
          <DetailRow label="Source Location" value={sourceLocation} />
          <DetailRow label="Current Role" value={currentRole} />
          <DetailRow label="Role Name" value={currentRoleName} />
          <DetailRow label="Failed API" value={failedApi || "Not available"} />
          <DetailRow label="Status" value={status || "Not available"} />
        </div>

        {resolvedStack ? (
          <div style={stackStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
                fontWeight: 700,
              }}
            >
              <FaCode />
              <span>Component Stack</span>
            </div>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              {resolvedStack}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DebugErrorPanel;
