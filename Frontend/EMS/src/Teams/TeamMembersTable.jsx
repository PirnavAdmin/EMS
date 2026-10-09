import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getDisplayDays } from "./teamUtils";
import { hasEmployeeShift } from "../utils/shiftUtils";

const normalizeId = (value) => String(value ?? "").trim();
const EMPTY_MEMBERS = [];
const rowKey = (member, index) => normalizeId(member?.employeeId ?? member?.employee_Id ?? member?.userId ?? member?.id) || String(index);
const formatShiftEndDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const shiftLabel = (value) => {
  const label = typeof value === "string" ? value.trim() : String(value?.shiftName ?? value?.name ?? "").trim();
  return /^(not assigned|unassigned)$/i.test(label) ? "" : label;
};
const shiftBadgeTone = (name) => {
  const value = name.toLowerCase();
  if (value.includes("night")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (value.includes("afternoon")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (value.includes("morning")) return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};
const shiftDotTone = (name) => {
  const value = name.toLowerCase();
  if (value.includes("night")) return "bg-indigo-500";
  if (value.includes("afternoon")) return "bg-amber-500";
  if (value.includes("morning")) return "bg-sky-500";
  return "bg-emerald-500";
};
const formatShiftTime = (value) => {
  const time = String(value ?? "").trim();
  const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return time || "-";
  let hours = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    hours = (hours % 12) + (meridiem === "PM" ? 12 : 0);
  }
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
};
function TeamMembersTable({ members = EMPTY_MEMBERS, teamData, isAdmin = false, selfServiceShiftActions = false, currentEmployeeMember = null, authenticatedEmployeeId = "", canAddMember = false, availableShifts = [], loadingShifts = false, onLoadShifts, onAssignMemberShift, onUnassignMemberShift, onAddMember, onRequestChange, onSwapShift, onOverride, onRemove }) {
  const [openUserMenu, setOpenUserMenu] = useState(null);
  const [openShiftControl, setOpenShiftControl] = useState(null);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [savingShiftRow, setSavingShiftRow] = useState(null);
  const [animatedShiftRow, setAnimatedShiftRow] = useState(null);
  const shiftPanelRef = useRef(null);
  const rosterScrollRef = useRef(null);
  const shiftAnimationTimeout = useRef(null);

  useLayoutEffect(() => {
    if (rosterScrollRef.current) rosterScrollRef.current.scrollLeft = 0;
  }, [members]);

  useEffect(() => () => window.clearTimeout(shiftAnimationTimeout.current), []);

  useEffect(() => {
    if (!openUserMenu) return undefined;
    const dismiss = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest(".team-members-reference__self-menu")) {
        setOpenUserMenu(null);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenUserMenu(null);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openUserMenu]);

  useEffect(() => {
    if (!openShiftControl) return undefined;
    const dismiss = (event) => {
      if (!shiftPanelRef.current?.contains(event.target)) {
        setOpenShiftControl(null);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        openShiftControl.trigger?.focus();
        setOpenShiftControl(null);
      }
    };
    const onScroll = () => setOpenShiftControl(null);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    rosterScrollRef.current?.addEventListener("scroll", onScroll);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      rosterScrollRef.current?.removeEventListener("scroll", onScroll);
    };
  }, [openShiftControl]);

  const toggleUserMenu = (event, key, member) => {
    if (!selfServiceShiftActions || !authenticatedEmployeeId || !currentEmployeeMember || member !== currentEmployeeMember) return;
    if (openUserMenu?.key === key) {
      setOpenUserMenu(null);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const menuHeight = 94;
    const top = bounds.bottom + menuHeight > window.innerHeight
      ? Math.max(8, bounds.top - menuHeight - 6)
      : bounds.bottom + 6;
    const left = Math.max(8, Math.min(bounds.right - 184, window.innerWidth - 192));
    setOpenUserMenu({ key, member, top, left });
  };

  const toggleShiftControl = (event, kind, key, member) => {
    if (savingShiftRow === key) return;
    if (openShiftControl?.key === key) {
      setOpenShiftControl(null);
      return;
    }
    setSelectedShiftId("");
    setOpenShiftControl({ kind, key, member, trigger: event.currentTarget });
    if (kind === "assign" && availableShifts.length === 0) onLoadShifts?.();
  };

  const restoreShiftTriggerFocus = (key) => {
    window.requestAnimationFrame(() => {
      const row = Array.from(document.querySelectorAll("[data-shift-row]"))
        .find((element) => element.getAttribute("data-shift-row") === key);
      row?.querySelector("[data-shift-control-trigger]")?.focus();
    });
  };

  const handleAssignShift = async (member, shift, key) => {
    if (savingShiftRow) return;
    setSavingShiftRow(key);
    try {
      const succeeded = await onAssignMemberShift?.(member, shift);
      if (succeeded) {
        window.clearTimeout(shiftAnimationTimeout.current);
        setAnimatedShiftRow(key);
        shiftAnimationTimeout.current = window.setTimeout(() => setAnimatedShiftRow(null), 220);
        setOpenShiftControl(null);
        restoreShiftTriggerFocus(key);
      }
    } finally {
      setSavingShiftRow(null);
    }
  };

  const handleUnassignShift = async (member, key) => {
    if (savingShiftRow) return;
    setSavingShiftRow(key);
    try {
      const succeeded = await onUnassignMemberShift?.(member);
      if (succeeded) {
        setOpenShiftControl(null);
        restoreShiftTriggerFocus(key);
      }
    } finally {
      setSavingShiftRow(null);
    }
  };

  const activeUserMenu = authenticatedEmployeeId && currentEmployeeMember && openUserMenu?.member === currentEmployeeMember
    ? openUserMenu
    : null;

  return <div className={`team-members-reference bg-white rounded-2xl border border-slate-200 shadow-sm ${isAdmin || selfServiceShiftActions ? "team-members-reference--admin" : ""} ${selfServiceShiftActions ? "team-members-reference--self-service" : ""}`}>
    <div className="team-members-reference__head px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h2 className="text-xl font-black text-slate-800 tracking-tight">Members</h2><p className="text-xs text-slate-500 mt-0.5">{isAdmin ? "Admin View: Team roster, shift controls, and overrides." : "Team roster, working days, and shift requests."}</p></div>
      <div className="team-members-reference__head-actions">
        {canAddMember && <button type="button" className="team-members-reference__add-member" onClick={onAddMember}><span className="team-members-reference__add-member-icon">+</span><span>Add Member</span></button>}
      </div>
    </div>
    <div className="team-members-reference__scroll" ref={rosterScrollRef}>
      <table className={`team-members-reference__table w-full text-sm text-center border-collapse ${isAdmin && !selfServiceShiftActions ? "team-members-reference__table--roster-admin" : ""}`}>
        {isAdmin && !selfServiceShiftActions && <colgroup>
          <col className="team-members-reference__col--employee" />
          <col className="team-members-reference__col--user-id" />
          <col className="team-members-reference__col--project" />
          <col className="team-members-reference__col--shift" />
          <col className="team-members-reference__col--wfo" />
          <col className="team-members-reference__col--wfh" />
          <col className="team-members-reference__col--actions" />
        </colgroup>}
        <thead className="team-members-reference__thead bg-teal-50/50 text-[11px] uppercase tracking-wider font-bold text-slate-600 border-b border-slate-200"><tr>
          <th className="py-3.5 px-4 text-center align-middle whitespace-nowrap">Employee</th>
          <th className="py-3.5 px-3 text-center align-middle whitespace-nowrap">{isAdmin ? <>User<br />ID</> : "User ID"}</th>
          <th className="py-3.5 px-4 text-center align-middle whitespace-nowrap">Project</th>
          <th className="py-3.5 px-4 text-center align-middle whitespace-nowrap">{isAdmin ? <>Current<br />Shift</> : "Current Shift"}</th>
          <th className="py-3.5 px-4 text-center align-middle whitespace-nowrap">WFO Days</th>
          <th className="py-3.5 px-4 text-center align-middle whitespace-nowrap">{isAdmin ? <>WFH<br />Days</> : "WFH Days"}</th>
          {selfServiceShiftActions && <th className="py-3.5 px-4 text-center align-middle whitespace-nowrap bg-teal-100/40 text-teal-900 border-l border-teal-100">SHIFT REQUEST ACTIONS</th>}
          {isAdmin && <th className="py-3.5 px-4 text-center align-middle whitespace-nowrap bg-amber-50 text-amber-900 font-bold border-l border-amber-200">Actions</th>}
        </tr></thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {members.map((member, index) => {
            if (!member || typeof member !== "object") return null;
            const { wfoDays: wfoList, wfhDays: wfhList } = getDisplayDays(member.wfoDays, member.wfhDays);
            const key = rowKey(member, index);
            const isOwnRow = Boolean(selfServiceShiftActions && authenticatedEmployeeId && currentEmployeeMember && member === currentEmployeeMember);
            const currentShiftRecord = member.shiftUnassigned
              ? null
              : member.shift || member.currentShift || member.employeeShift || member.assignedShift || member.currentShiftName || member.shiftName;
            const hasShift = hasEmployeeShift(member) && Boolean(shiftLabel(currentShiftRecord));
            const displayShift = hasShift ? shiftLabel(currentShiftRecord) : "";
            const hasCurrentShift = Boolean(displayShift);
            const shiftEffectiveTo = member.shiftEffectiveTo || member.effectiveTo || member.currentShift?.effectiveTo || member.shift?.effectiveTo;
            const memberName = member.name || member.employeeName || "Employee";
            const memberId = member.employeeCode || member.employeeId || member.employee_Id || member.userId || member.id;
            const projectName = member.projectName || member.project || "ABC";
            const hasKnownShiftTone = /night|afternoon|morning|general/i.test(displayShift);
            return <tr key={key} className={`team-members-reference__row ${member.isSelected || member.isHighlighted ? "is-reference-highlighted" : ""}`}>
              <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap font-bold text-slate-900">{memberName}</td>
              <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap"><span className="team-members-reference__id bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded text-[11px] font-semibold">{memberId}</span></td>
              <td className="team-members-reference__project-cell py-3.5 px-4 text-center align-middle whitespace-nowrap font-bold text-slate-800" title={projectName}><span className="team-members-reference__project-name">{projectName}</span></td>
              <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="inline-flex flex-col items-center gap-1">
                {isAdmin && !selfServiceShiftActions ? (hasCurrentShift ? (
                  <div className="team-members-reference__member-shift-control" data-shift-row={key}>
                    <button type="button" title={displayShift} className={`team-members-reference__shift-pill team-members-reference__shift-name-trigger inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${shiftBadgeTone(displayShift)} ${!hasKnownShiftTone ? "team-members-reference__shift-pill--neutral" : ""} ${animatedShiftRow === key ? "team-members-reference__shift-pill--enter" : ""}`} aria-label={`Unassign ${displayShift} from ${memberName}`} aria-haspopup="dialog" aria-expanded={openShiftControl?.key === key && openShiftControl?.kind === "unassign"} data-shift-control-trigger disabled={savingShiftRow === key} onClick={(event) => toggleShiftControl(event, "unassign", key, member)}><span className={`w-1.5 h-1.5 rounded-full ${shiftDotTone(displayShift)}`} />{displayShift}</button>
                  </div>
                ) : (
                  <div className="team-members-reference__member-shift-control" data-shift-row={key}>
                    <button type="button" className="team-members-reference__assign-shift" aria-haspopup="dialog" aria-expanded={openShiftControl?.key === key && openShiftControl?.kind === "assign"} data-shift-control-trigger disabled={savingShiftRow === key} onClick={(event) => toggleShiftControl(event, "assign", key, member)}>
                      {savingShiftRow === key ? <span className="team-members-reference__shift-spinner rounded-full" aria-label="Assigning shift" /> : "Assign Shift"}
                    </button>
                  </div>
                )) : hasShift ? <span className={`team-members-reference__shift-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${shiftBadgeTone(displayShift)} ${!hasKnownShiftTone ? "team-members-reference__shift-pill--neutral" : ""}`}><span className={`w-1 h-1 rounded-full ${shiftDotTone(displayShift)}`} />{displayShift}</span> : <span className="team-members-reference__day team-members-reference__day--wfo team-members-reference__no-shift inline-flex items-center rounded-full text-[11px] font-semibold">No shift</span>}
                {hasShift && (member.isTemporaryShift || member.shift?.isTemporary || member.currentShift?.isTemporary) && shiftEffectiveTo && <span className="team-members-reference__shift-temporary">Temporary · until {formatShiftEndDate(shiftEffectiveTo)}</span>}
              </div></td>
              <td className="team-members-reference__days-cell py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="team-members-reference__days">{wfoList.length ? wfoList.map((day) => <span key={day} className="team-members-reference__day team-members-reference__day--wfo bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap inline-block">{day}</span>) : <span className="team-day-empty">-</span>}</div></td>
              <td className="team-members-reference__days-cell py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="team-members-reference__days">{wfhList.length ? wfhList.map((day) => <span key={day} className="team-members-reference__day team-members-reference__day--wfh bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap inline-block">{day}</span>) : <span className="team-day-empty">-</span>}</div></td>
              {selfServiceShiftActions && <td className="team-members-reference__shift-actions py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="team-members-reference__shift-actions-inner">{isOwnRow
                ? <button type="button" className="team-members-reference__self-menu-trigger" aria-label="Open shift request options" aria-haspopup="menu" aria-expanded={activeUserMenu?.key === key} onClick={(event) => toggleUserMenu(event, key, member)}>⋮</button>
                : null}</div></td>}
              {isAdmin && <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="team-members-reference__actions">
                <button type="button" onClick={() => onOverride?.(member)} className="px-3 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition shadow-2xs" title="Override member shift">Override</button>
                <button type="button" onClick={() => onRemove?.(member)} className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition shadow-2xs" title="Remove member from team">Remove</button>
              </div></td>}
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    {openShiftControl && typeof document !== "undefined" && createPortal(
      <div className="team-modal-overlay team-members-reference__shift-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenShiftControl(null); }}>
      <section ref={shiftPanelRef} className="team-modal team-modal-small team-members-reference__shift-modal" role="dialog" aria-modal="true" aria-labelledby="member-shift-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        {openShiftControl.kind === "unassign" ? (
          <>
            <div className="team-modal-header"><div><h3 id="member-shift-modal-title" className="team-modal-title">Unassign shift?</h3><p className="team-modal-subtitle">Remove {shiftLabel(openShiftControl.member.shift || openShiftControl.member.currentShift || openShiftControl.member.employeeShift || openShiftControl.member.assignedShift || openShiftControl.member.currentShiftName || openShiftControl.member.shiftName)} from {openShiftControl.member.name || openShiftControl.member.employeeName || "Employee"}? They will follow the company timings until a new shift is assigned.</p></div></div>
            <div className="team-modal-footer"><button type="button" className="team-action-btn secondary" onClick={() => { const trigger = openShiftControl.trigger; setOpenShiftControl(null); trigger?.focus(); }} disabled={savingShiftRow === openShiftControl.key}>Cancel</button><button type="button" className="team-members-reference__unassign-confirm" onClick={() => handleUnassignShift(openShiftControl.member, openShiftControl.key)} disabled={savingShiftRow === openShiftControl.key}>{savingShiftRow === openShiftControl.key ? "Unassigning..." : "Unassign"}</button></div>
          </>
        ) : (
          <>
            <div className="team-modal-header"><div><h3 id="member-shift-modal-title" className="team-modal-title">Assign shift</h3><p className="team-modal-subtitle">Select a shift for {openShiftControl.member.name || openShiftControl.member.employeeName || "Employee"}</p></div></div>
            <div className="team-modal-body team-members-reference__shift-options">
              {loadingShifts && <div className="team-members-reference__shift-menu-state"><span className="team-members-reference__shift-spinner rounded-full" aria-hidden="true" /> Loading shifts...</div>}
              {!loadingShifts && availableShifts.length === 0 && <div className="team-members-reference__shift-menu-state">No active shifts available.</div>}
              {!loadingShifts && availableShifts.map((shift) => <button type="button" className={`team-members-reference__shift-menu-item ${String(selectedShiftId) === String(shift.shiftId) ? "is-selected" : ""}`} key={shift.shiftId} onClick={() => setSelectedShiftId(String(shift.shiftId))} disabled={savingShiftRow === openShiftControl.key}><span>{shift.shiftName}</span><span className="team-members-reference__shift-times">{formatShiftTime(shift.startTime)} - {formatShiftTime(shift.endTime)}</span></button>)}
            </div>
            <div className="team-modal-footer"><button type="button" className="team-action-btn secondary" onClick={() => { const trigger = openShiftControl.trigger; setOpenShiftControl(null); trigger?.focus(); }}>Cancel</button><button type="button" className="team-members-reference__assign-confirm" disabled={!selectedShiftId || savingShiftRow === openShiftControl.key || loadingShifts} onClick={() => { const shift = availableShifts.find((item) => String(item.shiftId) === String(selectedShiftId)); if (shift) handleAssignShift(openShiftControl.member, shift, openShiftControl.key); }}>{savingShiftRow === openShiftControl.key ? "Assigning..." : "Assign"}</button></div>
          </>
        )}
      </section></div>,
      document.body
    )}
    {activeUserMenu && typeof document !== "undefined" && createPortal(
      <div className="team-members-reference__self-menu" role="menu" style={{ top: activeUserMenu.top, left: activeUserMenu.left }}>
        <button type="button" role="menuitem" onClick={() => { const target = activeUserMenu.member; setOpenUserMenu(null); onSwapShift?.(target); }}>🔄 Shift Swap</button>
        <button type="button" role="menuitem" onClick={() => { const target = activeUserMenu.member; setOpenUserMenu(null); onRequestChange?.(target); }}>📝 Shift Change</button>
      </div>,
      document.body
    )}
  </div>;
}

export default TeamMembersTable;
