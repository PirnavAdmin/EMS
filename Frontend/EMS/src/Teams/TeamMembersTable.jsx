import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const normalizeId = (value) => String(value ?? "").trim();
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
function TeamMembersTable({ members = [], teamData, isAdmin = false, selfServiceShiftActions = false, currentEmployeeMember = null, authenticatedEmployeeId = "", canAddMember = false, onAddMember, onRequestChange, onSwapShift, onOverride, onRemove }) {
  const [openUserMenu, setOpenUserMenu] = useState(null);

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
    <div className="team-members-reference__scroll overflow-x-auto">
      <table className="team-members-reference__table w-full text-sm text-center border-collapse">
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
            const wfoList = Array.isArray(member.wfoDays) && member.wfoDays.length ? member.wfoDays : ["Mon", "Tue", "Thu", "Wed"];
            const wfhList = Array.isArray(member.wfhDays) && member.wfhDays.length ? member.wfhDays : ["Fri"];
            const key = rowKey(member, index);
            const isOwnRow = Boolean(selfServiceShiftActions && authenticatedEmployeeId && currentEmployeeMember && member === currentEmployeeMember);
            const displayShift = shiftLabel(member.currentShift) || shiftLabel(member.shift) || shiftLabel(teamData?.shift) || shiftLabel(member.currentShiftName) || shiftLabel(member.shiftName) || "General Shift";
            const shiftEffectiveTo = member.shiftEffectiveTo || member.effectiveTo || member.currentShift?.effectiveTo || member.shift?.effectiveTo;
            const memberName = member.name || member.employeeName || "Employee";
            const memberId = member.employeeCode || member.employeeId || member.employee_Id || member.userId || member.id;
            const projectName = member.projectName || member.project || "ABC";
            return <tr key={key} className={`team-members-reference__row ${member.isSelected || member.isHighlighted ? "is-reference-highlighted" : ""}`}>
              <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap font-bold text-slate-900">{memberName}</td>
              <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap"><span className="team-members-reference__id bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded text-[11px] font-semibold">{memberId}</span></td>
              <td className="team-members-reference__project-cell py-3.5 px-4 text-center align-middle whitespace-nowrap font-bold text-slate-800" title={projectName}><span className="team-members-reference__project-name">{projectName}</span></td>
              <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="inline-flex flex-col items-center gap-1">
                <span className={`team-members-reference__shift-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${shiftBadgeTone(displayShift)}`}><span className={`w-1.5 h-1.5 rounded-full ${shiftDotTone(displayShift)}`} />{displayShift}</span>
                {(member.isTemporaryShift || member.shift?.isTemporary || member.currentShift?.isTemporary) && shiftEffectiveTo && <span className="team-members-reference__shift-temporary">Temporary · until {formatShiftEndDate(shiftEffectiveTo)}</span>}
              </div></td>
              <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="team-members-reference__days flex justify-center items-center gap-1 flex-nowrap">{wfoList.map((day, i) => <span key={i} className="team-members-reference__day team-members-reference__day--wfo bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap inline-block">{day}</span>)}</div></td>
              <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="team-members-reference__days flex justify-center items-center gap-1 flex-nowrap">{wfhList.map((day, i) => <span key={i} className="team-members-reference__day team-members-reference__day--wfh bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap inline-block">{day}</span>)}</div></td>
              {selfServiceShiftActions && <td className="team-members-reference__shift-actions py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="team-members-reference__shift-actions-inner">{isOwnRow
                ? <button type="button" className="team-members-reference__self-menu-trigger" aria-label="Open shift request options" aria-haspopup="menu" aria-expanded={activeUserMenu?.key === key} onClick={(event) => toggleUserMenu(event, key, member)}>⋮</button>
                : null}</div></td>}
              {isAdmin && <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap"><div className="team-members-reference__actions inline-flex items-center justify-center gap-1.5">
                <button type="button" onClick={() => onOverride?.(member)} className="px-3 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition shadow-2xs" title="Override member shift">Override</button>
                <button type="button" onClick={() => onRemove?.(member)} className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition shadow-2xs" title="Remove member from team">Remove</button>
              </div></td>}
            </tr>;
          })}
        </tbody>
      </table>
    </div>
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
