import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toastError, toastInfo, toastSuccess } from "@/components/common/toast/toastService";
import { cancelShiftChangeRequest, getShiftChangeRequests } from "../services/ShiftRequestService";
import { employeeAccept, employeeReject, getEmployeeSwaps } from "../services/shiftSwapApi";
import { canEmployeeRespond, normalizeStatus } from "../utils/SwapStatus";
import { getApiErrorMessage } from "../services/superAdminService";
import { normalizeCollection } from "./teamUtils";

const idOf = (value) => String(value ?? "").trim();
const sameId = (left, right) => idOf(left).toLocaleLowerCase() === idOf(right).toLocaleLowerCase();
const field = (record, ...keys) => {
  if (!record || typeof record !== "object") return undefined;
  const hasValue = (value) => value !== undefined && value !== null && !(typeof value === "string" && !value.trim());
  for (const key of keys) if (hasValue(record[key])) return record[key];
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, "")));
  return Object.entries(record).find(([key, value]) => normalizedKeys.has(key.toLowerCase().replace(/[^a-z0-9]/g, "")) && hasValue(value))?.[1];
};
const requesterIdOf = (request) => idOf(field(request, "fromEmployeeId", "requesterEmployeeId", "senderEmployeeId", "requesterId", "fromEmployee_Id", "employee1Id", "employee1_Id", "employeeFromId") ?? request?.fromEmployee?.employeeId ?? request?.requester?.employeeId ?? request?.employee1?.employeeId);
const recipientIdOf = (request) => idOf(field(request, "toEmployeeId", "recipientEmployeeId", "targetEmployeeId", "receiverEmployeeId", "toEmployee_Id", "targetEmployee_Id", "employee2Id", "employee2_Id", "employeeId2", "receiverId", "employeeToId") ?? request?.toEmployee?.employeeId ?? request?.recipient?.employeeId ?? request?.targetEmployee?.employeeId ?? request?.employee2?.employeeId);
const employeeIdOfChange = (request) => idOf(request?.employeeCode ?? request?.EmployeeCode ?? request?.employeeId ?? request?.employee_Id ?? request?.EmployeeId ?? request?.Employee_Id ?? request?.empId ?? request?.EmpId ?? request?.employee?.employeeCode ?? request?.employee?.EmployeeCode ?? request?.employee?.employeeId ?? request?.employee?.employee_Id ?? request?.employee?.empId ?? request?.requesterEmployeeId ?? request?.fromEmployeeId);
const swapIdOf = (request) => field(request, "swapId", "shiftSwapId", "requestId", "id");
const changeIdOf = (request) => request?.shiftChangeRequestId ?? request?.shiftChangeRequest_Id ?? request?.requestId ?? request?.id ?? request?.Id;
const normalizeSwapCollection = (payload) => {
  const rows = normalizeCollection(payload);
  if (rows.length) return rows;
  const candidates = [payload?.data?.data, payload?.data, payload?.result, payload];
  const record = candidates.find((candidate) => candidate && !Array.isArray(candidate) && typeof candidate === "object" && swapIdOf(candidate) !== undefined);
  return record ? [record] : [];
};
const normalizedStatus = (request) => String(request?.status ?? request?.requestStatus ?? "").toLowerCase().replace(/[^a-z]/g, "");
const changeStatus = (request) => {
  const status = normalizedStatus(request);
  if (status.startsWith("rejected")) return "rejectedbyadmin";
  if (status === "approved" || status === "accepted" || status.includes("approved")) return "approved";
  if (status === "pending" || status.startsWith("pending") || status.includes("awaiting") || status.includes("waiting") || status.includes("review") || status.includes("submitted")) return "pendingadmin";
  return "unknown";
};
const timestampOf = (request) => new Date(request?.createdDate ?? request?.createdAt ?? request?.requestedDate ?? request?.requestDate ?? request?.effectiveFrom ?? request?.shiftDate ?? 0).getTime() || 0;
const newestFirst = (items) => [...items].sort((left, right) => timestampOf(right) - timestampOf(left));
const formatDate = (value) => {
  if (!value) return "Date not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};
const statusLabel = (request, type) => {
  if (type === "change") {
    const status = changeStatus(request);
    if (status === "approved") return "Approved";
    if (status === "rejectedbyadmin") return "Rejected";
    if (status === "pendingadmin") return "Pending";
    return "Status unavailable";
  }
  const status = normalizeStatus(request);
  if (status === "rejectedbyemployee" || status === "rejectedbyadmin") return "Rejected";
  if (status === "approved") return "Swap Approved - Roster Synced";
  if (status === "pendingadmin") return "Step 2: Awaiting Admin";
  return "Waiting for Colleague";
};
const shiftTime = (request, prefix, rosterMember) => {
  const shiftName = prefix === "from"
    ? request.fromShiftName ?? request.currentShiftName ?? request.shiftName ?? request.fromShift?.shiftName ?? request.currentShift?.shiftName ?? rosterMember?.shiftName ?? rosterMember?.shift?.shiftName
    : request.toShiftName ?? request.targetShiftName ?? request.toShift?.shiftName ?? request.targetShift?.shiftName ?? rosterMember?.shiftName ?? rosterMember?.shift?.shiftName;
  const start = prefix === "from"
    ? request.fromShiftStartTime ?? request.currentShiftStartTime ?? request.fromShift?.startTime ?? rosterMember?.shiftStartTime ?? rosterMember?.shift?.startTime
    : request.toShiftStartTime ?? request.targetShiftStartTime ?? request.toShift?.startTime ?? rosterMember?.shiftStartTime ?? rosterMember?.shift?.startTime;
  const end = prefix === "from"
    ? request.fromShiftEndTime ?? request.currentShiftEndTime ?? request.fromShift?.endTime ?? rosterMember?.shiftEndTime ?? rosterMember?.shift?.endTime
    : request.toShiftEndTime ?? request.targetShiftEndTime ?? request.toShift?.endTime ?? rosterMember?.shiftEndTime ?? rosterMember?.shift?.endTime;
  const fallback = prefix === "from"
    ? request.currentShiftId ?? request.fromShiftId ?? request.shiftId
    : request.toShiftId ?? request.targetShiftId ?? request.requestedShiftId;
  return `${shiftName || (fallback ? `Shift #${fallback}` : "Shift not specified")}${start || end ? `  -  ${start || "?"} - ${end || "?"}` : ""}`;
};

const SWAP_STEPS = ["Sent", "Colleague Step 1", "Admin Step 2", "Reflected to A & B"];
const CHANGE_STEPS = ["Request Sent", "Admin Review", "Requester Notified"];

function SwapProgress({ request }) {
  const status = normalizeStatus(request);
  const failedAt = status === "rejectedbyadmin" ? 2 : status === "rejectedbyemployee" ? 1 : -1;
  const activeAt = status === "pendingadmin" ? 2 : status === "pendingemployee" ? 1 : -1;
  const completedThrough = status === "approved" ? 3 : status === "pendingadmin" || status === "rejectedbyadmin" ? 1 : 0;
  const reflected = status === "approved" || status === "rejectedbyemployee" || status === "rejectedbyadmin";
  return (
    <ol className="shift-swap-tracker">
      {SWAP_STEPS.map((step, index) => {
      const tone = failedAt === index ? "is-rejected" : index <= completedThrough || (reflected && index === 3) ? "is-complete" : index === activeAt ? "is-current" : "";
      const icon = tone === "is-complete" ? "✓" : tone === "is-rejected" ? "✕" : tone === "is-current" ? "⏱" : index + 1;
      return <li className={`shift-swap-tracker__step ${tone}`} key={step}><span className="shift-swap-tracker__dot" aria-hidden="true">{icon}</span><span>{step}</span></li>;
      })}
    </ol>
  );
}

function ChangeProgress({ request }) {
  const status = changeStatus(request);
  const failedAt = status === "rejectedbyadmin" ? 1 : -1;
  const activeAt = status === "pendingadmin" ? 1 : -1;
  const completedThrough = status === "approved" ? 2 : 0;
  const requesterNotified = status === "approved" || status === "rejectedbyadmin";
  return <ol className="shift-swap-tracker shift-change-tracker" aria-label="Shift change approval progress">
    {CHANGE_STEPS.map((step, index) => {
      const tone = failedAt === index ? "is-rejected" : index <= completedThrough || (requesterNotified && index === 2) ? "is-complete" : index === activeAt ? "is-current" : "";
      const icon = tone === "is-complete" ? "\u2713" : tone === "is-rejected" ? "\u2715" : tone === "is-current" ? "\u23f1" : index + 1;
      return <li className={`shift-swap-tracker__step ${tone}`} key={step}><span className="shift-swap-tracker__dot" aria-hidden="true">{icon}</span><span>{step}</span></li>;
    })}
  </ol>;
}

function StatusBadge({ request, type }) {
  const status = type === "change" ? changeStatus(request) : normalizeStatus(request);
  const tone = status?.startsWith("rejected") ? "rejected" : status === "approved" ? "approved" : type === "change" ? "pending" : status === "pendingadmin" ? "review" : "pending";
  return <span className={`team-request-status is-${tone}`}>{statusLabel(request, type)}</span>;
}

const formatRequestDate = (value) => {
  if (!value) return "Date not specified";
  const textValue = String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(textValue);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? textValue : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

function EmployeeChangeRequestRow({ request, onCancel, confirming, onConfirmCancel, onKeep, cancelling, actionError }) {
  const status = changeStatus(request);
  const from = request.effectiveFrom ?? request.fromDate ?? request.startDate ?? request.requestDate;
  const to = request.effectiveTo ?? request.toDate ?? request.endDate;
  const dateLabel = `${formatRequestDate(from)}${to && to !== from ? ` – ${formatRequestDate(to)}` : ""}`;
  const current = request.currentShiftName ?? request.fromShiftName ?? request.currentShift?.shiftName ?? (request.currentShiftId ? `Shift #${request.currentShiftId}` : "Current shift");
  const next = request.requestedShiftName ?? request.toShiftName ?? request.requestedShift?.shiftName ?? (request.requestedShiftId ? `Shift #${request.requestedShiftId}` : "New shift");
  const remarks = request.rejectionRemarks ?? request.rejectionReason ?? request.adminRemarks ?? request.remarks;
  return <article className="team-request-item team-request-item--employee team-change-employee-row">
    <div className="team-request-item__heading"><strong>{dateLabel}</strong><span className={`team-request-status is-${status === "pendingadmin" ? "pending" : status === "approved" ? "approved" : status === "rejectedbyadmin" ? "rejected" : "review"}`}>{statusLabel(request, "change")}</span></div>
    <div className="team-change-employee-row__shift">{current} <span aria-hidden="true">→</span> {next}</div>
    {request.reason && <p className="team-request-item__details">{request.reason}</p>}
    {status === "rejectedbyadmin" && remarks && <p className="team-request-item__details">Admin remarks: {remarks}</p>}
    {actionError && <div className="team-request-error" role="alert">{actionError}</div>}
    {status === "pendingadmin" && (confirming ? <div className="team-change-cancel-confirm" role="group" aria-label="Confirm cancellation">
      <span>Cancel this request?</span>
      <button type="button" className="team-request-reject" disabled={cancelling} onClick={() => onConfirmCancel(request)}>{cancelling ? "Cancelling..." : "Confirm cancel"}</button>
      <button type="button" className="team-request-view-button" disabled={cancelling} onClick={onKeep}>Keep request</button>
    </div> : <button type="button" className="team-request-reject team-change-cancel-button" disabled={cancelling} onClick={() => onCancel(request)}>Cancel request</button>)}
  </article>;
}

function RequestCard({ request, type, pending = false, onAction, actingId, employeeRoster, employeeId, employeeIds, actionError }) {
  const requestId = type === "swap" ? swapIdOf(request) : changeIdOf(request);
  const fromId = requesterIdOf(request) || employeeIdOfChange(request);
  const toId = recipientIdOf(request);
  const requester = employeeRoster?.get(fromId);
  const recipient = employeeRoster?.get(toId);
  const date = type === "swap"
    ? field(request, "shiftDate", "requestedDate", "swapDate", "date", "createdAt", "createdOn")
    : request.effectiveFrom ?? request.fromDate ?? request.startDate ?? request.requestDate ?? request.createdAt;
  const currentShift = shiftTime(request, "from", requester);
  const requestedShift = type === "swap"
    ? shiftTime(request, "to", recipient)
    : request.requestedShiftName ?? request.toShiftName ?? request.targetShiftName ?? request.requestedShift?.shiftName ?? (request.requestedShiftId ? `Shift #${request.requestedShiftId}` : "Requested Shift");
  const senderName = field(request, "fromEmployeeName", "requesterName", "senderName", "employee1Name", "fromName", "employeeName") ?? requester?.name ?? requester?.employeeName ?? fromId ?? "Employee";
  const recipientName = field(request, "toEmployeeName", "targetEmployeeName", "recipientName", "employee2Name", "toName") ?? recipient?.name ?? recipient?.employeeName ?? toId ?? "Colleague";
  const displayParty = (name, id) => <>{name} {(employeeIds?.has(idOf(id).toLocaleLowerCase()) || sameId(id, employeeId)) && <small className="ml-1 font-medium text-slate-400">(You)</small>} ({id || "-"})</>;
  const rejectionRemarks = field(request, "rejectionRemarks", "rejectionReason", "remarks");
  const reason = field(request, "reason", "requestReason", "remarks");

  return <article className="team-request-item team-request-item--employee">
    {pending && <span className="team-swap-incoming-label">Incoming {type === "swap" ? "shift swap" : "shift change"} request</span>}
    <div className="team-request-item__heading">
      <strong>{type === "swap" ? <>{displayParty(senderName, fromId)} ⇄ {displayParty(recipientName, toId)}</> : <>{displayParty(senderName, fromId)} → Admin approval</>}</strong>
      <StatusBadge request={request} type={type} />
    </div>
    <span className="team-request-item__id">{type === "swap" ? `ID: ${fromId || "-"} - Request with ${toId || "-"}` : `Employee ID: ${fromId || "-"}`}</span>
    <span className="team-request-item__date">{formatDate(date)}</span>
    <div className="team-swap-participants">
      <div><strong>{type === "swap" ? "Requester Offers:" : "Current Shift"}</strong>{type === "swap" && <span>{displayParty(senderName, fromId)}</span>}<span>{currentShift}</span></div>
      <span className="team-swap-participants__arrow" aria-hidden="true">{type === "swap" ? "⇄" : "→"}</span>
      <div><strong>{type === "swap" ? "Agreed Colleague:" : "Requested Shift"}</strong>{type === "swap" && <span>{displayParty(recipientName, toId)}</span>}<span>{requestedShift}</span></div>
    </div>
    {reason && <span className="team-request-item__details">{reason}</span>}
    {rejectionRemarks && <span className="team-request-item__details">Rejection reason: {rejectionRemarks}</span>}
    {type === "swap" ? <SwapProgress request={request} /> : <ChangeProgress request={request} />}
    {actionError && <div className="team-request-error" role="alert" style={{ color: "#b91c1c" }}>{actionError}</div>}
    {type === "swap" && canEmployeeRespond(request, employeeId) && <div className="team-request-actions">
      <button type="button" className="team-request-approve" disabled={actingId === requestId} onClick={() => onAction(request, "accept")}>{actingId === requestId ? "Accepting..." : "Accept"}</button>
      <button type="button" className="team-request-reject" disabled={actingId === requestId} onClick={() => onAction(request, "reject")}>{actingId === requestId ? "Rejecting..." : "Reject"}</button>
    </div>}
  </article>;
}
function RequestSection({ title, emptyText, loading, items, renderItem, titleAction }) {
  return <section className="team-request-content__section">
    <div className="flex items-center justify-between gap-3"><h4>{title}</h4>{titleAction}</div>
    {loading ? <div className="team-request-skeleton-list" aria-label="Loading requests" aria-busy="true">{[0, 1].map((item) => <div className="team-request-skeleton" key={item}><i /><i /><i /></div>)}</div> : items.length ? <div className="team-request-list">{items.map(renderItem)}</div> : <p className="team-request-empty">{emptyText}</p>}
  </section>;
}

function TeamRequestPanels({ currentEmployeeId, refreshKey = 0, members = [], onRequestUpdated, hideSwapRequests = false, onRequestViewChange, activeRequestView = "change", submittedChangeBanner = "", className = "" }) {
  const employeeId = idOf(currentEmployeeId);
  const [requestFilter, setRequestFilter] = useState(activeRequestView === "swap" ? "swap" : "change");
  const [swaps, setSwaps] = useState([]);
  const [actionErrors, setActionErrors] = useState({});
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancellingChangeId, setCancellingChangeId] = useState(null);
  const [changeActionErrors, setChangeActionErrors] = useState({});
  const [changeListError, setChangeListError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const actingIds = useRef(new Set());
  const notifiedApprovalIds = useRef(new Set());
  const notifiedChangeApprovalIds = useRef(new Set());
  const onRequestUpdatedRef = useRef(onRequestUpdated);
  const employeeRoster = useMemo(() => new Map(members.flatMap((member) => [
    member.employeeCode,
    member.employeeId,
    member.employee_Id,
    member.empId,
    member.userId,
    member.id
  ].map((value) => [idOf(value), member]).filter(([id]) => id))), [members]);
  const employeeIds = useMemo(() => {
    const currentMember = employeeRoster.get(employeeId);
    return new Set([
      employeeId,
      currentMember?.employeeCode,
      currentMember?.employeeId,
      currentMember?.employee_Id,
      currentMember?.empId,
      currentMember?.userId,
      currentMember?.id
    ].map((value) => idOf(value).toLocaleLowerCase()).filter(Boolean));
  }, [employeeId, employeeRoster]);

  useEffect(() => { onRequestUpdatedRef.current = onRequestUpdated; }, [onRequestUpdated]);
  useEffect(() => { setRequestFilter(activeRequestView === "swap" ? "swap" : "change"); }, [activeRequestView]);

  const loadRequests = useCallback(async (quiet = false) => {
    if (!employeeId) {
      setSwaps([]);
      setChangeRequests([]);
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    try {
      const [employeeSwapsResult, changesResult] = await Promise.allSettled([
        hideSwapRequests ? Promise.resolve([]) : getEmployeeSwaps(employeeId),
        getShiftChangeRequests(employeeId, "")
      ]);
      const employeeSwaps = employeeSwapsResult.status === "fulfilled" ? normalizeSwapCollection(employeeSwapsResult.value) : [];
      const employeeChanges = changesResult.status === "fulfilled" ? normalizeCollection(changesResult.value) : [];
      setSwaps(employeeSwaps);
      if (changesResult.status === "fulfilled") {
        setChangeRequests(employeeChanges);
        setChangeListError("");
      } else {
        const message = getApiErrorMessage(changesResult.reason, "Unable to load shift change requests.");
        setChangeListError(message);
        if (!quiet) toastError(message);
      }
      const newlyApproved = employeeSwaps.some((request) => {
        const requestId = idOf(swapIdOf(request));
        if (!sameId(requesterIdOf(request), employeeId) || !requestId || normalizeStatus(request) !== "approved" || notifiedApprovalIds.current.has(requestId)) return false;
        notifiedApprovalIds.current.add(requestId);
        return true;
      });
      const newlyApprovedChange = employeeChanges.some((request) => {
        const requestId = idOf(changeIdOf(request));
        if (!employeeIds.has(idOf(employeeIdOfChange(request)).toLocaleLowerCase()) || !requestId || changeStatus(request) !== "approved" || notifiedChangeApprovalIds.current.has(requestId)) return false;
        notifiedChangeApprovalIds.current.add(requestId);
        return true;
      });
      if (newlyApproved || newlyApprovedChange) onRequestUpdatedRef.current?.();
    } catch {
      if (!quiet) toastError("Unable to load shift requests");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [employeeId, employeeIds, hideSwapRequests]);

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

  // Verify ownership from each row before rendering it. The request list query
  // is only a filter; the response recipient is the authority for UI actions.
  const ownSent = useMemo(() => newestFirst(swaps.filter((request) => sameId(requesterIdOf(request), employeeId))), [employeeId, swaps]);
  const received = useMemo(() => newestFirst(swaps.filter((request) => sameId(recipientIdOf(request), employeeId))), [employeeId, swaps]);
  const pendingReceived = useMemo(() => swaps.filter((request) => canEmployeeRespond(request, employeeId)), [swaps, employeeId]);
  const actionedReceived = useMemo(() => received.filter((request) => normalizeStatus(request) !== "pendingemployee"), [received]);
  const ownChanges = useMemo(() => newestFirst(changeRequests.filter((request) => employeeIds.has(idOf(employeeIdOfChange(request)).toLocaleLowerCase()))), [changeRequests, employeeIds]);
  const pendingChanges = useMemo(() => ownChanges.filter((request) => changeStatus(request) === "pendingadmin"), [ownChanges]);
  const decidedChanges = useMemo(() => ownChanges.filter((request) => changeStatus(request) !== "pendingadmin"), [ownChanges]);
  const activeSwapRequest = useMemo(() => newestFirst([...pendingReceived, ...actionedReceived, ...ownSent])[0] ?? null, [pendingReceived, actionedReceived, ownSent]);

  const beginCancelChange = (request) => {
    if (changeStatus(request) !== "pendingadmin") return;
    setConfirmCancelId(idOf(changeIdOf(request)));
  };
  const confirmCancelChange = async (request) => {
    const requestId = changeIdOf(request);
    const key = idOf(requestId);
    if (!requestId || changeStatus(request) !== "pendingadmin" || cancellingChangeId) return;
    setCancellingChangeId(key);
    setChangeActionErrors((current) => ({ ...current, [key]: "" }));
    try {
      await cancelShiftChangeRequest(requestId);
      toastSuccess("Shift change request cancelled.");
      setConfirmCancelId(null);
      await loadRequests();
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to cancel shift change request.");
      if (error?.response?.status === 409 || /already decided|already exists/i.test(message)) {
        toastInfo("Request status was refreshed.");
        setConfirmCancelId(null);
        await loadRequests(true);
      } else {
        toastError(message);
        setChangeActionErrors((current) => ({ ...current, [key]: message }));
      }
    } finally {
      setCancellingChangeId(null);
    }
  };

  const handleAction = async (request, action) => {
    const requestId = swapIdOf(request);
    if (!requestId || !canEmployeeRespond(request, employeeId) || actingIds.current.has(requestId)) return;
    actingIds.current.add(requestId);
    setActingId(requestId);
    setActionErrors((items) => ({ ...items, [requestId]: "" }));
    try {
      if (action === "accept") await employeeAccept(requestId);
      else await employeeReject(requestId, "Declined by recipient");
      setSwaps((items) => items.map((item) => sameId(swapIdOf(item), requestId)
        ? { ...item, status: action === "accept" ? "PendingAdminApproval" : "RejectedByEmployee", ...(action === "accept" ? { employeeAccepted: true } : { remarks: "Declined by recipient" }) }
        : item));
      toastSuccess(action === "accept" ? "Swap accepted and sent for admin review" : "Swap declined; the requester has been notified");
      await loadRequests();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.currentStatus) {
        const syncId = idOf(data.swapId);
        if (syncId) setSwaps((items) => items.map((item) => sameId(swapIdOf(item), syncId) ? { ...item, status: data.currentStatus } : item));
        toastInfo(data.message || "Shift swap status was refreshed.");
      } else {
        const message = getApiErrorMessage(err);
        toastError(message);
        setActionErrors((items) => ({ ...items, [requestId]: message }));
      }
      await loadRequests(true);
    } finally {
      actingIds.current.delete(requestId);
      setActingId(null);
    }
  };

  return <aside className={`team-request-panels ${className}`} aria-live="polite">
    <section className="team-request-panel team-request-panel--unified">
      <div className="team-request-panel__head">
        <div><span className="teams-section-kicker">TEAM REQUESTS</span><h3>{activeRequestView === "swap" ? "Shift Swap (2-Step)" : "Shift Change (Admin Approval)"}</h3></div>
        <div className="team-request-dropdown">
          <button type="button" className="team-request-view-button" aria-haspopup="menu" aria-expanded={isDropdownOpen} onClick={(event) => { event.stopPropagation(); setIsDropdownOpen((open) => !open); }}>My Requests <span aria-hidden="true">▾</span></button>
          {isDropdownOpen && <div className="team-request-dropdown__menu !z-50" role="menu" aria-label="Team requests" onClick={(event) => event.stopPropagation()}>
            <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setIsDropdownOpen(false); setRequestFilter("swap"); onRequestViewChange("swap"); }}>Shift Swap (2-Step) {activeRequestView === "swap" && <span className="team-request-active-dot">•</span>}</button>
            <button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); setIsDropdownOpen(false); setRequestFilter("change"); onRequestViewChange("change"); }}>Shift Change Requests {activeRequestView !== "swap" && <span className="team-request-active-dot">•</span>}</button>
          </div>}
        </div>
      </div>

      {requestFilter === "swap" ? <div className="team-request-content">
        <RequestSection title="ACTIVE SHIFT SWAP" emptyText="No active shift swap requests." loading={loading} items={activeSwapRequest ? [activeSwapRequest] : []} renderItem={(request) => <RequestCard key={swapIdOf(request)} request={request} type="swap" pending={canEmployeeRespond(request, employeeId)} onAction={handleAction} actingId={actingId} employeeRoster={employeeRoster} employeeId={employeeId} actionError={actionErrors[idOf(swapIdOf(request))]} />} />
      </div> : <div className="team-request-content">
        {changeListError && <div className="team-request-error team-change-api-error" role="alert">{changeListError}</div>}
        <RequestSection title="PENDING" emptyText="No pending shift change requests." loading={loading} items={pendingChanges} renderItem={(request) => { const key = idOf(changeIdOf(request)); return <EmployeeChangeRequestRow key={key} request={request} confirming={confirmCancelId === key} onCancel={beginCancelChange} onConfirmCancel={confirmCancelChange} onKeep={() => setConfirmCancelId(null)} cancelling={cancellingChangeId === key} actionError={changeActionErrors[key]} />; }} />
        <RequestSection title="RECENTLY DECIDED" emptyText="No recently decided requests." loading={loading} items={decidedChanges} renderItem={(request) => <EmployeeChangeRequestRow key={changeIdOf(request)} request={request} />} />
        {submittedChangeBanner && <div className="team-request-status is-approved mt-2" role="status">{submittedChangeBanner}</div>}
      </div>}
    </section>
  </aside>;
}

export default TeamRequestPanels;
