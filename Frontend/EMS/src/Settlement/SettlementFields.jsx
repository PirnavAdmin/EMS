import React from "react";
import { cv } from "../Clearance/clearanceUtils";
import { formatDate } from "../utils/date";

const fields = [
  ["settlementId", "Settlement ID", ["settlementId", "SettlementId", "settlementID", "Settlement_ID", "fullFinalSettlementId", "FullFinalSettlementId"]],
  ["employeeId", "Employee ID", ["employee_Id", "employeeId", "EmployeeId"]],
  ["grossSalary", "Gross salary", ["grossSalary", "GrossSalary"]],
  ["leaveEncashment", "Leave encashment", ["leaveEncashment", "LeaveEncashment"]],
  ["bonus", "Bonus", ["bonus", "Bonus"]],
  ["deductions", "Deductions", ["deductions", "Deductions"]],
  ["netSettlement", "Net settlement", ["netSettlement", "NetSettlement"]],
  ["generatedDate", "Generated on", ["generatedDate", "GeneratedDate"]],
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function displayValue(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (["grossSalary", "leaveEncashment", "bonus", "deductions", "netSettlement"].includes(key)) {
    const amount = Number(value);
    return Number.isFinite(amount) ? currency.format(amount) : String(value);
  }
  if (key === "generatedDate") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
    return `${formatDate(date, "—")}, ${time}`;
  }
  return String(value);
}

export function SettlementFields({ settlement }) {
  return (
    <div className="settlement-grid">
      {fields.map(([key, label, aliases]) => {
        const value = cv(settlement, ...aliases);
        return (
          <div className={`settlement-card${key === "deductions" ? " settlement-card--deductions" : ""}${key === "netSettlement" ? " settlement-card--net" : ""}`} key={key}>
            <small className="settlement-label">{label}</small>
            <strong className="settlement-value">{displayValue(key, value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function SettlementStatus({ settlement }) {
  const status = cv(settlement, "status", "Status");
  const label = status == null || status === "" ? "—" : String(status);
  const normalized = label.toLowerCase();
  const statusClass = normalized === "approved"
    ? "status-approved"
    : normalized === "rejected"
      ? "status-rejected"
      : "status-pending";
  return <span className={`resignation-status ${statusClass}`}>{label}</span>;
}
