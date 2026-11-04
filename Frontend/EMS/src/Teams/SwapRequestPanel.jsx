import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { normalizeCollection } from "./teamUtils";
import {
  adminApprove,
  adminReject,
  employeeAccept,
  employeeReject,
  getEmployeeSwaps,
  getAdminQueue,
} from "../services/shiftSwapApi";
import { canAdminDecide, canEmployeeRespond, normalizeStatus } from "../utils/SwapStatus";
import { getApiErrorMessage } from "../services/superAdminService";

const SWAP_STEPS = ["Request Sent", "Employee Accepts", "Admin Review", "Requester Notified"];
const idOf = (value) => String(value ?? "").trim();
const requestIdOf = (request) => idOf(request?.swapId ?? request?.id);

function SwapProgress({ request }) {
  const status = normalizeStatus(request);
  const failedAt = status === "rejectedbyemployee" ? 1 : status === "rejectedbyadmin" ? 2 : -1;
  const activeAt = status === "pendingemployee" ? 1 : status === "pendingadmin" ? 2 : -1;
  const completedThrough = status === "approved" ? 3 : status === "pendingadmin" || status === "rejectedbyadmin" ? 1 : 0;
  return (
    <ol className="shift-swap-tracker" aria-label="Shift swap approval progress">
      {SWAP_STEPS.map((step, index) => {
        const tone = failedAt === index ? "is-rejected" : (index <= completedThrough && index !== failedAt) ? "is-complete" : index === activeAt ? "is-current" : "";
        const icon = tone === "is-complete" ? "✓" : tone === "is-rejected" ? "✕" : tone === "is-current" ? "⏱" : index + 1;
        return <li className={`shift-swap-tracker__step ${tone}`} key={step}><span className="shift-swap-tracker__dot" aria-hidden="true">{icon}</span><span>{step}</span></li>;
      })}
    </ol>
  );
}

function badgeLabel(request) {
  switch (normalizeStatus(request)) {
    case "pendingemployee": return "Waiting for employee";
    case "pendingadmin": return "Employee accepted - pending admin review";
    case "approved": return "Approved - your shift swap is confirmed";
    case "rejectedbyemployee":
    case "rejectedbyadmin": return "Rejected";
    default: return "Status unavailable";
  }
}

function badgeTone(request) {
  const status = normalizeStatus(request);
  if (status === "approved") return "is-approved";
  if (status?.startsWith("rejected")) return "is-rejected";
  if (status === "pendingadmin") return "is-review";
  return "is-pending";
}

function RequestCard({ request, employeeId, canManage, busy, error, onEmployeeAction, onAdminAction }) {
  const status = normalizeStatus(request);
  const employeeCanRespond = canEmployeeRespond(request, employeeId);
  const adminCanDecide = canAdminDecide(request, canManage);
  const requesterId = request.fromEmployeeId ?? request.requesterId ?? "-";
  const receiverId = request.toEmployeeId ?? request.receiverId ?? "-";
  const requesterName = request.fromEmployeeName ?? request.requesterName ?? `Employee ${requesterId}`;
  const receiverName = request.toEmployeeName ?? request.receiverName ?? `Employee ${receiverId}`;
  const isCurrentUser = (id) => String(id ?? "").toLowerCase() === String(employeeId ?? "").toLowerCase();
  const partyLabel = (name, id) => <>{name} {isCurrentUser(id) && <small className="ml-1 font-medium text-slate-400">(You)</small>} ({id})</>;
  const busyLabel = busy === "accept" ? "Accepting…" : busy === "reject" ? "Rejecting…" : busy === "approve" ? "Approving…" : busy === "admin-reject" ? "Rejecting…" : "";
  const rejectionReason = request.rejectionReason ?? request.rejectionRemarks ?? request.remarks;
  return (
    <article className="team-request-item team-request-item--employee" aria-busy={Boolean(busy)}>
      {employeeCanRespond && <span className="team-swap-incoming-label">Incoming shift swap request</span>}
      <div className="team-request-item__heading">
        <strong className="font-bold text-slate-800">{partyLabel(requesterName, requesterId)} ⇄ {partyLabel(receiverName, receiverId)}</strong>
        <span className={`team-request-status ${badgeTone(request)}`}>{badgeLabel(request)}</span>
      </div>
      <span className="team-request-item__id">ID: {request.fromEmployeeId ?? "-"} - Swap with {request.toEmployeeId ?? "-"}</span>
      <span className="team-request-item__date">{request.shiftDate ? new Date(request.shiftDate).toLocaleDateString() : "Date not specified"}</span>
      <div className="team-swap-participants">
        <div><strong>Requester Offers:</strong><span>{partyLabel(requesterName, requesterId)}</span><span>{request.shiftName ?? request.fromShiftName ?? "Shift not specified"}</span></div>
        <span className="team-swap-participants__arrow" aria-hidden="true">-</span>
        <div><strong>Agreed Colleague:</strong><span>{partyLabel(receiverName, receiverId)}</span><span>{request.toShiftName ?? request.requestedShiftName ?? "Shift not specified"}</span></div>
      </div>
      {request.reason && <span className="team-request-item__details">{request.reason}</span>}
      {rejectionReason && status?.startsWith("rejected") && <span className="team-request-item__details">Rejection reason: {rejectionReason}</span>}
      {error && <div className="team-request-error" role="alert" style={{ color: "#b91c1c" }}>{error}</div>}
      <SwapProgress request={request} />
      {employeeCanRespond && <div className="team-request-actions">
        <button className="team-request-approve" type="button" disabled={Boolean(busy)} onClick={() => onEmployeeAction(request, true)}>{busy === "accept" ? busyLabel : "Accept"}</button>
        <button className="team-request-reject" type="button" disabled={Boolean(busy)} onClick={() => onEmployeeAction(request, false)}>{busy === "reject" ? busyLabel : "Reject"}</button>
      </div>}
      {adminCanDecide && <div className="team-request-actions">
        <button className="team-request-approve" type="button" disabled={Boolean(busy)} onClick={() => onAdminAction(request, true)}>{busy === "approve" ? busyLabel : "Approve"}</button>
        <button className="team-request-reject" type="button" disabled={Boolean(busy)} onClick={() => onAdminAction(request, false)}>{busy === "admin-reject" ? busyLabel : "Reject"}</button>
      </div>}
    </article>
  );
}

function RequestSection({ title, emptyText, loading, requests, renderRequest }) {
  return (
    <section className="team-request-content__section">
      <h4>{title}</h4>
      {loading ? <p className="team-request-empty">Loading requests...</p> : requests.length
        ? <div className="team-request-list">{requests.map(renderRequest)}</div>
        : <p className="team-request-empty">{emptyText}</p>}
    </section>
  );
}

function SwapRequestsPanel({ employeeId, canManage = false, refreshKey = 0, onRequestUpdated, onSwapRowsLoaded, onCreateRequest }) {
  const currentId = idOf(employeeId);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyById, setBusyById] = useState({});
  const busyIds = useRef(new Set());
  const [errorsById, setErrorsById] = useState({});
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequests = useCallback(async (quiet = false) => {
    if (!currentId && !canManage) { setSwaps([]); onSwapRowsLoaded?.([]); setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const params = [
        ...(currentId ? [{ scope: "incoming", employeeId: currentId }, { scope: "mine", employeeId: currentId }] : []),
        ...(canManage ? [{ scope: "admin-queue" }] : [])
      ];
      const [employeeRows, adminRows] = await Promise.all([
        currentId ? getEmployeeSwaps(currentId) : Promise.resolve([]),
        canManage ? getAdminQueue() : Promise.resolve([])
      ]);
      const rows = [...new Map(normalizeCollection([...employeeRows, ...adminRows]).map((row) => [requestIdOf(row), row])).values()];
      const incomingCount = rows.filter((request) => canEmployeeRespond(request, currentId)).length;
      const sentCount = rows.filter((request) => idOf(request.fromEmployeeId) === currentId).length;
      const actionedCount = rows.filter((request) => idOf(request.toEmployeeId) === currentId && normalizeStatus(request) !== "pendingemployee").length;
      if (import.meta.env.DEV) console.debug("[ShiftSwap] My Teams lists", {
        params,
        rowsReturned: rows.length,
        incoming: incomingCount,
        sent: sentCount,
        actioned: actionedCount
      });
      setSwaps(rows);
      onSwapRowsLoaded?.(rows);
    } catch {
      // The API service reports request failures with the endpoint and server message.
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [currentId, canManage, onSwapRowsLoaded]);

  useEffect(() => { void loadRequests(); }, [loadRequests, refreshKey]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void loadRequests(true); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("swapRequestsRefresh", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("swapRequestsRefresh", refresh);
    };
  }, [loadRequests]);

  const incoming = useMemo(() => swaps.filter((request) => canEmployeeRespond(request, currentId)), [swaps, currentId]);
  const mine = useMemo(() => swaps.filter((request) => idOf(request.fromEmployeeId) === currentId), [swaps, currentId]);
  const respondedIncoming = useMemo(() => swaps.filter((request) => idOf(request.toEmployeeId) === currentId && normalizeStatus(request) !== "pendingemployee"), [swaps, currentId]);
  const adminQueue = useMemo(() => swaps.filter((request) => canAdminDecide(request, canManage)), [swaps, canManage]);

  const updateLocalStatus = (id, status) => {
    setSwaps((items) => items.map((item) => requestIdOf(item) === id ? { ...item, status } : item));
    setErrorsById((items) => ({ ...items, [id]: "" }));
  };

  const runAction = async (request, action, reason = "") => {
    const id = requestIdOf(request);
    if (!id || busyIds.current.has(id)) return;
    if (["accept", "reject"].includes(action) && !canEmployeeRespond(request, currentId)) return;
    if (["approve", "admin-reject"].includes(action) && !canAdminDecide(request, canManage)) return;
    busyIds.current.add(id);
    setBusyById((items) => ({ ...items, [id]: action }));
    setErrorsById((items) => ({ ...items, [id]: "" }));
    try {
      if (action === "accept") { await employeeAccept(id); updateLocalStatus(id, "PendingAdminApproval"); }
      else if (action === "reject") { await employeeReject(id, "Declined by recipient"); updateLocalStatus(id, "RejectedByEmployee"); }
      else if (action === "approve") { await adminApprove(id); updateLocalStatus(id, "Approved"); }
      else { await adminReject(id, reason); updateLocalStatus(id, "RejectedByAdmin"); }
      toast.success(action === "accept" ? "Waiting for admin" : action === "approve" ? "Approved - your shift swap is confirmed" : action === "reject" ? "Swap rejected; the requester has been notified." : "Swap rejected and reason saved.");
      setRejectingRequest(null);
      setRejectionReason("");
      await loadRequests(true);
      onRequestUpdated?.();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.currentStatus) {
        const syncId = idOf(data.swapId);
        if (syncId) updateLocalStatus(syncId, data.currentStatus);
        toast.info(data.message || "Shift swap status was refreshed.");
        await loadRequests(true);
      } else {
        const message = getApiErrorMessage(err);
        toast.error(message);
        setErrorsById((items) => ({ ...items, [id]: message }));
        await loadRequests(true);
      }
    } finally {
      busyIds.current.delete(id);
      setBusyById((items) => { const next = { ...items }; delete next[id]; return next; });
    }
  };

  const handleAdminAction = (request, approve) => {
    if (approve) void runAction(request, "approve");
    else { setRejectingRequest(request); setRejectionReason(""); }
  };
  const submitRejection = (event) => {
    event.preventDefault();
    if (!rejectionReason.trim() || !rejectingRequest) { toast.error("A rejection reason is required."); return; }
    void runAction(rejectingRequest, "admin-reject", rejectionReason.trim());
  };

  const renderCard = (request, admin = false) => {
    const id = requestIdOf(request);
    return <RequestCard key={id} request={request} employeeId={currentId} canManage={admin && canManage} busy={busyById[id]} error={errorsById[id]} onEmployeeAction={(row, accept) => void runAction(row, accept ? "accept" : "reject")} onAdminAction={handleAdminAction} />;
  };

  return (
    <aside className="team-request-panels" aria-live="polite">
      <section className="team-request-panel team-request-panel--unified">
        <div className="team-request-panel__head"><div><span className="teams-section-kicker">My Requests</span><h3>Swap Requests</h3></div>{onCreateRequest && <button type="button" className="team-action-btn" onClick={onCreateRequest}>+ Request a shift swap</button>}</div>
        <div className="team-request-content">
          <RequestSection title="Incoming shift swap requests" emptyText="No requests need your action." loading={loading} requests={incoming} renderRequest={(request) => renderCard(request)} />
          {respondedIncoming.length > 0 && <RequestSection title="Requests you responded to" emptyText="" loading={loading} requests={respondedIncoming} renderRequest={(request) => renderCard(request)} />}
          <RequestSection title="Your shift swap status" emptyText="No requests sent yet." loading={loading} requests={mine} renderRequest={(request) => renderCard(request)} />
          {canManage && <RequestSection title="Admin Approval Queue" emptyText="No shift swaps awaiting admin review." loading={loading} requests={adminQueue} renderRequest={(request) => renderCard(request, true)} />}
        </div>
      </section>
      {rejectingRequest && <div className="team-modal-overlay">
        <form className="team-modal" role="dialog" aria-modal="true" aria-labelledby="swap-rejection-title" onSubmit={submitRejection}>
          <div className="team-modal-header"><h3 className="team-modal-title" id="swap-rejection-title">Reject shift swap</h3></div>
          <div className="team-modal-body"><label className="team-form-field">Reason for rejection<textarea required value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={4} /></label></div>
          <div className="team-modal-footer">
            <button className="team-action-btn secondary" type="button" onClick={() => setRejectingRequest(null)}>Cancel</button>
            <button className="team-action-btn" type="submit" disabled={!rejectionReason.trim() || Boolean(busyById[requestIdOf(rejectingRequest)])}>{busyById[requestIdOf(rejectingRequest)] ? "Rejecting…" : "Reject request"}</button>
          </div>
        </form>
      </div>}
    </aside>
  );
}

export default SwapRequestsPanel;
