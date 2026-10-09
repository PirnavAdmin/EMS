import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toastError } from "../components/common/Toast/toastService";
import { downloadSettlementPdf, getSettlements } from "../services/fullFinalSettlementService";
import { clearanceError, cv, rows } from "../Clearance/clearanceUtils";
import { getStoredEmployeeId } from "../utils/authStorage";
import { isEmployee } from "../utils/authorization";
import "../Resignation/Resignation.css";
import "./Settlement.css";
import { SettlementFields, SettlementStatus } from "./SettlementFields";
const idOf = (record) => cv(record, "settlementId", "SettlementId", "settlementID", "Settlement_ID", "fullFinalSettlementId", "FullFinalSettlementId");
const errorText = (error) => error?.response?.data?.message || error?.response?.data?.detail || clearanceError(error);
export default function SettlementDetails() {
  const { id } = useParams(); const nav = useNavigate(); const [settlement, setSettlement] = useState(); const [error, setError] = useState("");
  useEffect(() => { const settlementId = Number(id); if (!Number.isInteger(settlementId) || settlementId <= 0) { setError("Invalid settlement ID."); return; } getSettlements().then((response) => { const employee = isEmployee() ? String(getStoredEmployeeId() ?? "") : null; const found = rows(response.data).find((item) => Number(idOf(item)) === settlementId && (!employee || String(cv(item, "employeeId", "EmployeeId", "employee_Id")) === employee)); setSettlement(found || null); if (!found) setError("Settlement not found or unavailable for this employee."); }).catch((requestError) => { setError(errorText(requestError)); }); }, [id]);
  const pdf = async () => { try { const response = await downloadSettlementPdf(Number(id)); const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "full-final-settlement.pdf"; anchor.click(); URL.revokeObjectURL(url); } catch (requestError) { toastError(errorText(requestError)); } };
  const approved = String(cv(settlement, "status", "Status") || "").toLowerCase() === "approved";
  return <div className="resignation-page"><div className="resignation-header"><h1>Full &amp; Final Settlement</h1><button onClick={() => nav(-1)}>Back</button></div><div className="resignation-card">{error ? <p>{error}</p> : !settlement ? <div className="skeleton-line" /> : <><SettlementFields settlement={settlement} />{isEmployee() ? <div className="settlement-actions"><SettlementStatus settlement={settlement} />{approved && <button onClick={pdf}>Download PDF</button>}</div> : <div className="settlement-actions"><SettlementStatus settlement={settlement} /><button onClick={pdf}>Download PDF</button></div>}</>}</div></div>;
}
