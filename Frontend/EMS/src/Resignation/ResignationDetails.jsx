import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResignation } from "../services/employeeResignationService";
import { getStoredEmployeeId } from "../utils/authStorage";
import { getClearanceByResignation } from "../services/employeeClearanceService";
import { statusOf, value } from "./resignationUtils";
import { clearanceComplete, unwrap, cv } from "../Clearance/clearanceUtils";
import EmployeeClearanceSection from "../Clearance/EmployeeClearanceSection";
import ExitInterviewSection from "../ExitInterview/ExitInterviewSection";
import SettlementSection from "../Settlement/SettlementSection";
import "../Clearance/Clearance.css";
import "./Resignation.css";

export default function ResignationDetails({ employeeScoped = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resignation, setResignation] = useState();
  const [clearance, setClearance] = useState();
  const [exitInterviewCompleted, setExitInterviewCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await getResignation(id);
        const payload = response.data?.data ?? response.data;
        const item = Array.isArray(payload) ? payload.find((record) => String(value(record, "resignationId", "ResignationId", "id", "Id")) === String(id)) : payload;
        const loggedInEmployeeId = getStoredEmployeeId();
        const recordEmployeeId = value(item, "employeeId", "EmployeeId", "employee_Id");
        const belongsToEmployee = !employeeScoped || (loggedInEmployeeId && recordEmployeeId && String(loggedInEmployeeId) === String(recordEmployeeId));
        const authorizedItem = belongsToEmployee && (!employeeScoped || String(value(item, "overallStatus", "OverallStatus", "status", "Status")).toLowerCase() === "approved") ? item : null;
        const resignationId = value(authorizedItem, "resignationId", "ResignationId", "id", "Id");
        setResignation(authorizedItem);
        if (authorizedItem && String(statusOf(authorizedItem)).toLowerCase() === "approved") {
          try {
            const clearanceResponse = await getClearanceByResignation(resignationId);
            setClearance(unwrap(clearanceResponse.data));
          } catch (error) {
            if (error?.response?.status !== 404) console.error(error);
            setClearance(null);
          }
        }
      } finally { setLoading(false); }
    })();
  }, [id, employeeScoped]);

  if (loading) return <div className="resignation-page"><div className="resignation-card"><div className="skeleton-line" /><div className="skeleton-line" /></div></div>;
  if (!resignation) return <div className="resignation-page"><div className="resignation-card">Resignation not found.</div></div>;
  const departments = Array.isArray(clearance) ? clearance : (clearance?.departments || clearance?.items || clearance?.departmentClearances || []);
  const departmentStatuses = ["hrStatus", "itStatus", "financeStatus", "adminStatus"].map((field) => String(clearance?.[field] ?? clearance?.[field[0].toUpperCase() + field.slice(1)] ?? "").toLowerCase());
  const clearanceIsComplete = clearanceComplete(clearance);
  const employeeId = value(resignation, "employeeId", "EmployeeId", "employee_Id");
  const resignationId = value(resignation, "resignationId", "ResignationId", "id", "Id");
  const approved = String(statusOf(resignation)).toLowerCase() === "approved";
  return <div className="resignation-page"><div className="resignation-header"><div><h1>Resignation Details</h1><p>Request #{resignationId}</p></div><button type="button" onClick={() => navigate(-1)}>Back</button></div><div className="resignation-card"><div className="resignation-detail-grid">{[["Employee", value(resignation, "employeeName", "EmployeeName")], ["Employee ID", employeeId], ["Status", statusOf(resignation)], ["Last working date", value(resignation, "lastWorkingDate", "LastWorkingDate")]].map(([key, val]) => <div key={key}><small>{key}</small><strong>{val || "-"}</strong></div>)}</div><EmployeeClearanceSection resignationId={resignationId} approved={approved} clearance={clearance} loading={approved && clearance === undefined} onRefresh={async () => { const response = await getClearanceByResignation(resignationId); setClearance(unwrap(response.data)); }} /><ExitInterviewSection resignationId={resignationId} available={approved && clearanceIsComplete} onCompleted={() => setExitInterviewCompleted(true)} /><SettlementSection employeeId={employeeId} resignationId={resignationId} available={approved && clearanceIsComplete && exitInterviewCompleted} /></div></div>;
}
