import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toastError, toastInfo, toastSuccess } from "@/components/common/toast/toastService";
import {
  approveShiftChangeRequest,
  getTeamShiftChangeRequests,
  rejectShiftChangeRequest
} from "../services/ShiftRequestService";
import { adminApprove, adminReject, getAdminQueue } from "../services/shiftSwapApi";
import { canAdminDecide, normalizeStatus } from "../utils/SwapStatus";
import { getApiErrorMessage } from "../services/superAdminService";
import { normalizeCollection } from "./teamUtils";

const idOf = (value) => String(value ?? "").trim();
const changeIdOf = (request) => request?.shiftChangeRequestId ?? request?.shiftChangeRequest_Id ?? request?.ShiftChangeRequestId ?? request?.requestId ?? request?.id ?? request?.Id;
const swapIdOf = (request) => request?.swapId ?? request?.shiftSwapId ?? request?.id ?? request?.Id;
const employeeIdOf = (request) => idOf(request?.employeeCode ?? request?.EmployeeCode ?? request?.employeeId ?? request?.employee_Id ?? request?.empId ?? request?.requesterEmployeeId ?? request?.fromEmployeeId);
const statusOf = (request) => String(request?.status ?? request?.requestStatus ?? "").trim();
const normalizedStatus = (request) => String(request?.status ?? request?.requestStatus ?? "").toLowerCase().replace(/[^a-z]/g, "");
const isPendingChange = (request) => {
  const status = normalizedStatus(request);
  return status === "pending" || status.startsWith("pending") || status.includes("awaiting") || status.includes("waiting") || status.startsWith("request") || status.includes("submitted") || status.includes("inreview");
};
const isDecidedChange = (request) => {
  const status = normalizedStatus(request);
  return status.includes("approv") || status.startsWith("reject") || status.includes("declin");
};
const timestampOf = (request) => new Date(request?.createdDate ?? request?.createdAt ?? request?.requestedDate ?? request?.requestDate ?? request?.effectiveFrom ?? request?.shiftDate ?? 0).getTime() || 0;
const newestFirst = (items) => [...items].sort((a, b) => timestampOf(b) - timestampOf(a));
const formatDate = (value) => {
  if (!value) return "Date not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const swapShiftText = (request, prefix, member) => {
  const shift = prefix === "from" ? (request.fromShift ?? request.currentShift ?? member?.shift) : (request.toShift ?? request.targetShift ?? member?.shift);
  const name = prefix === "from"
    ? request.fromShiftName ?? request.currentShiftName ?? request.shiftName ?? shift?.shiftName ?? member?.shiftName
    : request.toShiftName ?? request.targetShiftName ?? shift?.shiftName ?? member?.shiftName;
  const start = prefix === "from"
    ? request.fromShiftStartTime ?? request.currentShiftStartTime ?? shift?.startTime ?? member?.shiftStartTime
    : request.toShiftStartTime ?? request.targetShiftStartTime ?? shift?.startTime ?? member?.shiftStartTime;
  const end = prefix === "from"
    ? request.fromShiftEndTime ?? request.currentShiftEndTime ?? shift?.endTime ?? member?.shiftEndTime
    : request.toShiftEndTime ?? request.targetShiftEndTime ?? shift?.endTime ?? member?.shiftEndTime;
  const id = prefix === "from" ? request.currentShiftId ?? request.fromShiftId ?? request.shiftId : request.toShiftId ?? request.targetShiftId;
  return `${name || (id ? `Shift #${id}` : "Shift not specified")}${start || end ? `  -  ${start || "?"} - ${end || "?"}` : ""}`;
};

const SWAP_STEPS = ["Request Sent", "Employee Accepts", "Admin Review", "Requester Notified"];

function SwapProgress({ request }) {
  const status = normalizeStatus(request);
  const failedAt = status === "rejectedbyadmin" ? 2 : status === "rejectedbyemployee" ? 1 : -1;
  const activeAt = status === "pendingadmin" ? 2 : status === "pendingemployee" ? 1 : -1;
  const completedThrough = status === "approved" ? 3 : status === "pendingadmin" || status === "rejectedbyadmin" ? 1 : 0;
  const rejected = failedAt >= 0;
  return (
    <ol className="shift-swap-tracker">
      {SWAP_STEPS.map((label, index) => {
        const tone = failedAt === index ? "is-rejected" : (index <= completedThrough || (rejected && index === 3)) ? "is-complete" : index === activeAt ? "is-current" : "";
        const icon = tone === "is-complete" ? String.fromCharCode(10003) : tone === "is-rejected" ? String.fromCharCode(215) : tone === "is-current" ? String.fromCharCode(9687) : index + 1;
        return <li className={`shift-swap-tracker__step ${tone}`} key={label}><span className="shift-swap-tracker__dot" aria-hidden="true">{icon}</span><span>{label}</span></li>;
      })}
    </ol>
  );
}

function Badge({ status, request, type }) {
  const normalized = type === "swap" ? normalizeStatus(request) : String(status).toLowerCase();
  const rejected = type === "swap" ? normalized.startsWith("rejected") : normalized.includes("reject") || normalized.includes("declin");
  const approved = type === "swap" ? normalized === "approved" : normalized.includes("approv");
  const awaitingAdmin = type === "swap" && normalized === "pendingadmin";
  const pending = type === "swap" ? !rejected && !approved : isPendingChange(request);
  const label = rejected ? "REJECTED" : approved ? "APPROVED" : awaitingAdmin ? "AWAITING ADMIN" : pending ? "PENDING" : "STATUS UNAVAILABLE";
  return <span className={`team-change-request-badge ${rejected ? "is-rejected" : approved ? "is-approved" : pending ? "is-pending" : "is-unknown"}`}>{label}</span>;
}

function RequestCard({ request, type, member, pending, canManage, actingId, onDecide, actionError }) {
  const requestId = type === "change" ? changeIdOf(request) : swapIdOf(request);
  const employeeId = employeeIdOf(request);
  const requesterName = request.employeeName ?? request.requesterName ?? request.fromEmployeeName ?? member?.name ?? employeeId ?? "Employee";
  const recipientId = idOf(request.toEmployeeId ?? request.targetEmployeeId);
  const recipientMember = request.recipientMember;
  const employeeName = type === "swap"
    ? `${requesterName}  -  ${request.toEmployeeName ?? request.targetEmployeeName ?? recipientId ?? "Colleague"}`
    : requesterName;
  const status = statusOf(request);
  const rawRejectionRemarks = request.rejectionRemarks ?? request.remarks ?? request.rejectionReason;
  const rejectionRemarks = type === "change" && !normalizedStatus(request).startsWith("reject") ? "" : rawRejectionRemarks;
  const date = type === "change"
    ? `${formatDate(request.effectiveFrom ?? request.startDate ?? request.fromDate ?? request.requestDate ?? request.createdAt)}${request.effectiveTo ?? request.endDate ?? request.toDate ? `  -  ${formatDate(request.effectiveTo ?? request.endDate ?? request.toDate)}` : request.isPermanent ? "  -  Permanent" : ""}`
    : `Date: ${formatDate(request.shiftDate ?? request.requestedDate ?? request.createdAt)}`;
  const shift = type === "change"
    ? `${request.currentShiftName ?? request.fromShiftName ?? "Current Shift"}  -  ${request.requestedShiftName ?? request.toShiftName ?? `Shift #${request.requestedShiftId ?? "-"}`}`
    : `${request.fromShiftName ?? request.currentShiftName ?? "Shift swap"}  -  ${request.toShiftName ?? request.targetShiftName ?? "Swap requested"}`;
  const fromSwapShift = swapShiftText(request, "from", member);
  const toSwapShift = swapShiftText(request, "to", recipientMember);
  const details = [date, request.reason, rejectionRemarks ? `Rejection Remarks: ${rejectionRemarks}` : ""].filter(Boolean).join("  -  ");

  return <article className="team-change-request-card">
    <div className="team-change-request-card__top">
      <strong>{employeeName}</strong>
      <Badge status={status} request={request} type={type} />
    </div>
    <div className="team-change-request-id">ID: {employeeId || "-"}{type === "swap" && recipientId ? `  -  Swap with ${recipientId}` : ""}</div>
    {type === "swap" ? <div className="team-swap-participants">
      <div><strong>{requesterName}</strong><span>{fromSwapShift}</span></div>
      <span className="team-swap-participants__arrow" aria-hidden="true"> - </span>
      <div><strong>{request.toEmployeeName ?? request.targetEmployeeName ?? recipientMember?.name ?? recipientMember?.employeeName ?? recipientId ?? "Colleague"}</strong><span>{toSwapShift}</span></div>
    </div> : <div className="team-change-request-card__shift">{shift}</div>}
    <div className="team-change-request-card__details">{details || "No additional details."}</div>
    {actionError && <div className="team-request-error" role="alert" style={{ color: "#b91c1c" }}>{actionError}</div>}
    {pending && type === "swap" && <>
      <div className="team-swap-admin-heading">Pending shift swap approval</div>
      <div className="team-swap-admin-agreed">Employee side has already agreed to this swap.</div>
    </>}
    {type === "swap" && <SwapProgress request={request} />}
    {pending && (type === "swap" ? canAdminDecide(request, canManage) : canManage) && <div className="team-request-actions">
      <button type="button" className="team-request-approve" disabled={actingId === `${type}-${requestId}`} onClick={() => onDecide(request, type, "approve")}>{actingId === `${type}-${requestId}` ? "Approving…" : "Approve"}</button>
      <button type="button" className="team-request-reject" disabled={actingId === `${type}-${requestId}`} onClick={() => onDecide(request, type, "reject")}>{actingId === `${type}-${requestId}` ? "Rejecting…" : "Reject"}</button>
    </div>}
  </article>;
}

function RequestListSkeleton() {
  return <div className="team-request-skeleton-list" aria-label="Loading requests" aria-busy="true">{[0, 1].map((item) => <div className="team-request-skeleton" key={item}><i /><i /><i /></div>)}</div>;
}

function TeamChangeRequestPanel({ team, approverId, canManage, onRequestUpdated }) {
  const teamId = idOf(team?.teamId ?? team?.id);
  const [requestType, setRequestType] = useState("swap");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changeRequests, setChangeRequests] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const actingIds = useRef(new Set());
  const [requestActionErrors, setRequestActionErrors] = useState({});
  const [listError, setListError] = useState("");
  const roster = useMemo(() => new Map((team?.members ?? []).flatMap((member) => [
    member.employeeCode,
    member.employeeId,
    member.employee_Id,
    member.userId,
    member.id
  ].map((value) => [idOf(value), member]).filter(([id]) => id))), [team?.members]);

  const loadRequests = useCallback(async (quiet = false) => {
    if (!teamId && requestType === "change") {
      setChangeRequests([]);
      setSwapRequests([]);
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    try {
      const [changes, swaps] = await Promise.all([teamId ? getTeamShiftChangeRequests(teamId) : Promise.resolve([]), getAdminQueue()]);
      setChangeRequests(normalizeCollection(changes));
      setSwapRequests(normalizeCollection(swaps));
      setListError("");
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load team shift requests.");
      setListError(message);
      if (!quiet) toastError(message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [teamId, requestType]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);
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

  const teamChanges = useMemo(() => changeRequests.filter((request) => {
    const isPeerDecisionRequest = Boolean(request.receiverId ?? request.toEmployeeId ?? request.recipientEmployeeId);
    return !isPeerDecisionRequest && (roster.has(employeeIdOf(request)) || idOf(request.teamId ?? request.team_Id) === teamId);
  }), [changeRequests, roster, teamId]);
  const teamSwaps = useMemo(() => swapRequests.filter((request) => roster.has(idOf(request.fromEmployeeId ?? request.requesterEmployeeId)) || roster.has(idOf(request.toEmployeeId ?? request.recipientEmployeeId ?? request.targetEmployeeId)) || idOf(request.teamId ?? request.team_Id) === teamId), [roster, swapRequests, teamId]);
  const requests = requestType === "change" ? teamChanges : teamSwaps;
  const requestsWithRecipient = requestType === "swap" ? requests.map((request) => ({
    ...request,
    recipientMember: roster.get(idOf(request.toEmployeeId ?? request.recipientEmployeeId ?? request.targetEmployeeId))
  })) : requests;
  const pending = newestFirst(requestsWithRecipient.filter((request) => requestType === "swap"
    ? canAdminDecide(request, canManage)
    : isPendingChange(request)));
  const decided = newestFirst(requestsWithRecipient.filter((request) => requestType === "swap"
    ? ["approved", "rejectedbyemployee", "rejectedbyadmin"].includes(normalizeStatus(request))
    : isDecidedChange(request)));

  const decideRequest = async (request, type, action) => {
    const requestId = type === "change" ? changeIdOf(request) : swapIdOf(request);
    const actionKey = `${type}-${requestId}`;
    if (!canManage || !requestId || actingIds.current.has(actionKey) || (type === "change" && (!approverId || !isPendingChange(request) || request.receiverId || request.toEmployeeId || request.recipientEmployeeId))) return;
    if (type === "swap" && !canAdminDecide(request, canManage)) return;
    let remarks = "";
    if (action === "reject") {
      const response = window.prompt(type === "change" ? "Enter rejection remarks (at least 5 characters):" : "Enter rejection remarks for this swap request:");
      if (response === null) return;
      if (type === "change" && response.trim().length < 5) { toastError("Rejection remarks must be at least 5 characters."); return; }
      if (!response.trim()) { toastError("A rejection reason is required"); return; }
      remarks = response;
    }
    actingIds.current.add(actionKey);
    setActingId(actionKey);
    setRequestActionErrors((items) => ({ ...items, [actionKey]: "" }));
    try {
      if (type === "change") {
        if (action === "approve") await approveShiftChangeRequest(requestId, approverId);
        else await rejectShiftChangeRequest(requestId, remarks, approverId);
      } else if (action === "approve") {
        await adminApprove(requestId);
      } else {
        await adminReject(requestId, remarks);
      }
      if (type === "swap") {
        setSwapRequests((items) => items.map((item) => idOf(swapIdOf(item)) === idOf(requestId)
          ? { ...item, status: action === "approve" ? "Approved" : "RejectedByAdmin", ...(action === "reject" ? { remarks } : {}) }
          : item));
      } else {
        setChangeRequests((items) => items.map((item) => idOf(changeIdOf(item)) === idOf(requestId)
          ? { ...item, status: action === "approve" ? "Approved" : "Rejected", ...(action === "reject" ? { rejectionRemarks: remarks } : {}) }
          : item));
      }
      toastSuccess(`Shift ${type} request ${action === "approve" ? "approved" : "rejected"}`);
      await loadRequests();
      onRequestUpdated?.();
    } catch (error) {
      const message = getApiErrorMessage(error, `Unable to ${action} shift ${type} request.`);
      if (type === "change" && (error?.response?.status === 409 || /already decided|already exists/i.test(message))) {
        toastInfo("Request status was refreshed.");
        await loadRequests(true);
      } else if (type === "swap" && error?.response?.data?.currentStatus) {
        const data = error.response.data;
        const syncId = idOf(data.swapId);
        if (syncId) setSwapRequests((items) => items.map((item) => idOf(swapIdOf(item)) === syncId ? { ...item, status: data.currentStatus } : item));
        toastInfo(data.message || "Shift swap status was refreshed.");
      }
      else {
        toastError(message);
        setRequestActionErrors((items) => ({ ...items, [actionKey]: message }));
      }
      await loadRequests(true);
    } finally {
      actingIds.current.delete(actionKey);
      setActingId(null);
    }
  };

  const title = requestType === "change" ? "Shift Change Requests" : "Shift Swap Requests";
  return <aside className="team-request-panels" aria-live="polite">
    <section className="team-request-panel team-request-panel--admin">
      <div className="team-request-panel__head">
        <div className="team-request-panel__title">
          <span className="teams-section-kicker">TEAM REQUESTS</span>
          <h3>{title}</h3>
        </div>
        <div className="team-request-dropdown">
          <button type="button" className="team-request-filter" aria-haspopup="listbox" aria-expanded={dropdownOpen} onClick={() => setDropdownOpen((open) => !open)}>
          <span>{title}</span><span className="team-request-dropdown__chevron" aria-hidden="true"> - </span>
          </button>
          {dropdownOpen && <div className="team-request-dropdown__menu" role="listbox" aria-label="Request type">
            {[ ["swap", "Shift Swap Requests"], ["change", "Shift Change Requests"] ].map(([value, label]) => <button key={value} type="button" role="option" aria-selected={requestType === value} onClick={() => { setRequestType(value); setDropdownOpen(false); }}>
              <span>{label}</span>{requestType === value && <span className="team-request-dropdown__selected" />}
            </button>)}
          </div>}
        </div>
      </div>

      {listError && <div className="team-request-error team-change-api-error" role="alert">{listError}</div>}

      <section className="team-request-section">
        <div className="team-request-pending-heading">
          <h4>PENDING{requestType === "swap" ? ` (${pending.length})` : ""}</h4>
          {requestType === "swap" && pending.length > 0 && <span>Action Needed</span>}
        </div>
        {loading ? <RequestListSkeleton /> : pending.length ? <div className="team-request-list">{pending.map((request) => { const requestId = requestType === "change" ? changeIdOf(request) : swapIdOf(request); return <RequestCard key={requestId} request={request} type={requestType} member={roster.get(employeeIdOf(request))} pending canManage={canManage} actingId={actingId} actionError={requestActionErrors[`${requestType}-${requestId}`]} onDecide={decideRequest} />; })}</div> : <p className="team-request-empty">{requestType === "change" ? "No pending requests." : "No shift swaps awaiting admin review."}</p>}
      </section>

      <section className="team-request-section team-request-section--decided">
        <h4>RECENTLY DECIDED</h4>
        <div className="team-request-decided-scroll">
          <div className="team-request-list team-request-list--decided">
            {loading ? <RequestListSkeleton /> : decided.length ? decided.map((request) => { const requestId = requestType === "change" ? changeIdOf(request) : swapIdOf(request); return <RequestCard key={requestId} request={request} type={requestType} member={roster.get(employeeIdOf(request))} pending={false} canManage={canManage} actingId={actingId} actionError={requestActionErrors[`${requestType}-${requestId}`]} onDecide={decideRequest} />; }) : <p className="team-request-empty">No recently decided requests.</p>}
          </div>
          {!loading && decided.length > 2 && <div className="team-request-scroll-badge"><span>Scroll for more <i aria-hidden="true"> - </i></span></div>}
        </div>
      </section>
    </section>
  </aside>;
}

export default TeamChangeRequestPanel;
