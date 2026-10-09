import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toastError, toastSuccess } from "../components/common/Toast/toastService";
import { approveSettlement, generateSettlement, getSettlements } from "../services/fullFinalSettlementService";
import { EMPLOYEE_EXIT_MODULE, hasApprovePermission, isEmployee } from "../utils/authorization";
import { usePermissionScope } from "../context/usePermissionScope";
import { clearanceError, cv, rows } from "../Clearance/clearanceUtils";
import "./Settlement.css";
import { SettlementFields, SettlementStatus } from "./SettlementFields";

const settlementIdOf = (settlement) => cv(settlement, "settlementId", "SettlementId", "settlementID", "Settlement_ID", "fullFinalSettlementId", "FullFinalSettlementId");

export default function SettlementSection({ employeeId, resignationId, available }) {
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(available);
  const [saving, setSaving] = useState(false);
  const routerNavigate = useNavigate();
  const { canAccessModule } = usePermissionScope();
  const navigate = (path) => routerNavigate(
      path.startsWith("/settlements/") && !isEmployee() && !canAccessModule(EMPLOYEE_EXIT_MODULE)
      ? "/403"
      : path
  );

  const reload = async () => {
    const response = await getSettlements();
    const matches = rows(response.data).find((item) => String(cv(item, "resignationId", "ResignationId")) === String(resignationId) || String(cv(item, "employeeId", "EmployeeId", "employee_Id")) === String(employeeId));
    setSettlement(matches || null);
  };

  useEffect(() => {
    if (!available) return;
    reload().catch((error) => toastError(clearanceError(error))).finally(() => setLoading(false));
  }, [available, employeeId, resignationId]);

  if (!available) return <section className="clearance-section"><h3>Full &amp; Final Settlement</h3><p>Full &amp; Final Settlement will be available after the Exit Interview is completed.</p></section>;
  if (loading) return <section className="clearance-section"><div className="skeleton-line" /></section>;

  const generate = async () => {
    if (saving) return;
    const currentEmployeeId = String(employeeId ?? "").trim();
    if (!currentEmployeeId) return toastError("Employee ID is missing for settlement generation.");
    const payload = { Employee_Id: currentEmployeeId };
    console.log("Generate Settlement Payload:", payload);
    setSaving(true);
    try {
      const response = await generateSettlement(payload);
      setSettlement(response.data?.data ?? response.data);
      toastSuccess("Settlement generated successfully.");
    } catch (error) {
      console.error("Generate Settlement Error:", error.response?.data);
      toastError(clearanceError(error));
    } finally { setSaving(false); }
  };

  const decide = async (isApproved) => {
    if (saving) return;
    if (isApproved && !window.confirm("Approve this settlement?")) return;
    const rawId = settlementIdOf(settlement);
    const settlementId = Number(rawId);
    if (!Number.isInteger(settlementId) || settlementId <= 0) return toastError("Settlement ID is missing or invalid.");
    const payload = { settlementId, isApproved };
    console.log("Settlement Approval Payload:", payload);
    setSaving(true);
    try {
      const response = await approveSettlement(payload);
      await reload();
      toastSuccess(response.data?.message || response.data?.detail || `Settlement ${isApproved ? "approved" : "rejected"} successfully.`);
    } catch (error) {
      console.error("Settlement Approval Error:", error.response?.data);
      toastError(clearanceError(error));
    } finally { setSaving(false); }
  };

  const status = String(cv(settlement, "status", "Status") ?? "Pending").trim();
  const approved = status.toLowerCase() === "approved";
  return <section className="clearance-section"><h3>Full &amp; Final Settlement</h3>{!settlement ? <><p>Exit Interview completed. Generate the settlement to continue.</p><button type="button" disabled={saving} onClick={generate}>{saving ? "Generating…" : "Generate Settlement"}</button></> : <><SettlementFields settlement={settlement} /><div className="settlement-actions"><SettlementStatus settlement={settlement} />{!approved && canAccessModule(EMPLOYEE_EXIT_MODULE) && <button type="button" disabled={saving} onClick={() => decide(true)}>{saving ? "Approving…" : "Approve Settlement"}</button>}</div><div className="settlement-actions"><button type="button" onClick={() => navigate(`/settlements/${settlementIdOf(settlement)}`)}>View Settlement</button></div></>}</section>;
}
