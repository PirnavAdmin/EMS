import React, { useRef, useState } from "react";
import { FaCalendarAlt, FaExchangeAlt, FaLock, FaTimes } from "react-icons/fa";
import { toastError } from "@/components/common/toast/toastService";
import { getApiErrorMessage } from "../services/superAdminService";

const employeeIdOf = (member) => String(member?.employeeId ?? member?.employee_Id ?? member?.employeeID ?? member?.EmployeeId ?? member?.EmployeeID ?? member?.Employee_Id ?? member?.employee?.employeeId ?? member?.employee?.employee_Id ?? member?.employee?.employeeID ?? member?.raw?.employeeId ?? member?.raw?.employee_Id ?? member?.raw?.employee?.employeeId ?? "").trim();
const employeeIdsOf = (member) => [member?.employeeId, member?.employee_Id, member?.employeeID, member?.EmployeeId, member?.EmployeeID, member?.Employee_Id, member?.employee?.employeeId, member?.employee?.employee_Id, member?.employee?.employeeID, member?.raw?.employeeId, member?.raw?.employee_Id, member?.raw?.employee?.employeeId].map((value) => String(value ?? "").trim().toLowerCase()).filter(Boolean);
const employeeNameOf = (member) => member?.name ?? member?.employeeName ?? member?.fullName ?? member?.employee?.name ?? member?.employee?.employeeName ?? "Employee";
const shiftIdOf = (member) => member?.currentShiftId ?? member?.shiftId ?? member?.currentShift?.shiftId ?? member?.shift?.shiftId;
const shiftNameOf = (member) => (typeof member?.currentShift === "string" ? member.currentShift : member?.currentShift?.shiftName) ?? (typeof member?.shift === "string" ? member.shift : member?.shift?.shiftName) ?? member?.currentShiftName ?? member?.shiftName;
const teamIdOf = (member) => member?.teamId ?? member?.team_Id ?? member?.teamID ?? member?.TeamId ?? member?.raw?.teamId ?? member?.raw?.team_Id;
const shiftLabel = (shift) => `${shift?.shiftName || "Shift"}${shift?.startTime || shift?.endTime ? ` (${shift.startTime || "?"} - ${shift.endTime || "?"})` : ""}`;

function ModalHeading({ id, title, subtitle, icon, onClose }) {
  return <header className="team-modal-header team-request-modal__header">
    <span className="team-request-modal__icon">{React.createElement(icon, { "aria-hidden": true })}</span>
    <div className="team-request-modal__heading"><h3 className="team-modal-title" id={id}>{title}</h3><p className="team-modal-subtitle">{subtitle}</p></div>
    <button className="team-modal-close" type="button" aria-label={`Close ${title}`} onClick={onClose}><FaTimes aria-hidden="true" /></button>
  </header>;
}

export function ShiftChangeModal({ member, requester, shifts = [], onClose, onSubmit, saving }) {
  const [form, setForm] = useState({ requestedShiftId: "", effectiveFrom: "", effectiveTo: "", isPermanent: false, reason: "" });
  const [error, setError] = useState("");
  const lock = useRef(false);
  if (!member) return null;
  const currentMember = requester || member;
  const requesterId = employeeIdOf(currentMember);
  const shiftsList = Array.isArray(shifts) ? shifts : [];
  const currentId = shiftIdOf(currentMember);
  const currentName = shiftNameOf(currentMember);
  const current = shiftsList.find((shift) => String(shift?.shiftId) === String(currentId)) || shiftsList.find((shift) => String(shift?.shiftName ?? "").toLowerCase() === String(currentName ?? "").toLowerCase());
  const resolvedCurrentId = current?.shiftId ?? currentId;
  const currentLabel = current ? shiftLabel(current) : currentName || "Shift not assigned";
  const options = shiftsList.filter((shift) => shift?.shiftId != null && String(shift.shiftId) !== String(currentId ?? current?.shiftId ?? ""));
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current || saving) return;
    if (!requesterId || !resolvedCurrentId || !form.requestedShiftId || !form.effectiveFrom || (!form.isPermanent && !form.effectiveTo)) {
      setError("Check your current shift, choose a new shift, and complete the required dates.");
      return;
    }
    if (!form.isPermanent && form.effectiveTo < form.effectiveFrom) {
      setError("To date must be on or after the from date.");
      return;
    }
    lock.current = true;
    setError("");
    try {
      await onSubmit({ requestedShiftId: form.requestedShiftId, effectiveFrom: form.effectiveFrom, effectiveTo: form.isPermanent ? null : form.effectiveTo, isPermanent: form.isPermanent, reason: form.reason.trim() });
    } catch (submitError) {
      const message = getApiErrorMessage(submitError, "Unable to submit shift change request.");
      setError(message);
      toastError(message);
    } finally {
      lock.current = false;
    }
  };
  const update = (event) => { setError(""); setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value })); };

  return <div className="team-modal-overlay"><section className="team-modal team-request-modal team-request-modal--compact" role="dialog" aria-modal="true" aria-labelledby="shift-change-title">
    <ModalHeading id="shift-change-title" title="Request Shift Change" subtitle="Request a temporary or permanent shift change" icon={FaCalendarAlt} onClose={onClose} />
    <form onSubmit={submit}>
      <div className="team-modal-body team-request-form team-request-form--compact">
        <label className="team-form-field team-request-form__full">Current Shift<div className="team-request-readonly"><FaCalendarAlt aria-hidden="true" /><span>{currentLabel}</span><FaLock className="team-request-lock" aria-hidden="true" /></div></label>
        <label className="team-form-field team-request-form__full">New Shift<select className="team-form-select" name="requestedShiftId" value={form.requestedShiftId} onChange={update} disabled={!options.length}><option value="">{options.length ? "Select new shift" : "No other shifts available"}</option>{options.map((shift) => <option key={shift.shiftId} value={shift.shiftId}>{shiftLabel(shift)}</option>)}</select></label>
        <label className="team-form-field">From Date<input className="team-form-input" type="date" name="effectiveFrom" value={form.effectiveFrom} onChange={update} /></label>
        <label className="team-form-field">To Date<input className="team-form-input" type="date" name="effectiveTo" value={form.effectiveTo} onChange={update} disabled={form.isPermanent} min={form.effectiveFrom || undefined} /></label>
        <label className="team-request-permanent"><input type="checkbox" name="isPermanent" checked={form.isPermanent} onChange={update} /> <span>Permanent</span></label>
        <label className="team-form-field team-request-form__full">Reason (Optional)<textarea className="team-form-input team-request-reason" name="reason" placeholder="Enter reason..." value={form.reason} onChange={update} /></label>
        {error && <div className="team-request-error team-request-form__full" role="alert">{error}</div>}
      </div>
      <div className="team-modal-footer team-request-modal__footer"><button className="team-action-btn secondary" type="button" onClick={onClose}>Cancel</button><button className="team-action-btn" type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</button></div>
    </form>
  </section></div>;
}

export function ShiftSwapModal({ member, requester, members = [], shifts = [], teamId, onClose, onSubmit, saving, loadingShifts = false, loadingEmployeeInfo = false, loadingTeamMembers = false, employeeInfoError = "" }) {
  const [form, setForm] = useState({ toEmployeeId: "", shiftId: "", shiftDate: "", reason: "" });
  const [selectedTechnology, setSelectedTechnology] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  if (!member && !loadingEmployeeInfo && !loadingTeamMembers) return null;
  const requesterId = employeeIdOf(requester);
  const currentId = shiftIdOf(requester);
  const currentName = shiftNameOf(requester);
  const shiftsList = Array.isArray(shifts) ? shifts : [];
  const current = shiftsList.find((shift) => String(shift?.shiftId) === String(currentId)) || shiftsList.find((shift) => String(shift?.shiftName ?? "").toLowerCase() === String(currentName ?? "").toLowerCase());
  const resolvedCurrentId = current?.shiftId ?? currentId;
  const requesterTeamId = teamIdOf(requester) ?? teamId;
  const currentLabel = current ? shiftLabel(current) : currentName || "Shift not assigned";
  const teamMembers = Array.isArray(members) ? members : [];
  const technologyOf = (teamMember) => String(teamMember?.technology ?? teamMember?.Technology ?? teamMember?.raw?.technology ?? teamMember?.raw?.Technology ?? "").trim();
  const technologies = [...new Set(teamMembers.map(technologyOf).filter(Boolean))];
  const requesterIds = new Set(employeeIdsOf(requester));
  const seen = new Set();
  const colleagues = teamMembers.filter((candidate) => {
    const id = employeeIdOf(candidate);
    const key = id.toLowerCase();
    const aliases = employeeIdsOf(candidate);
    if (!candidate || !id || aliases.some((alias) => requesterIds.has(alias)) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const filteredColleagues = selectedTechnology
    ? colleagues.filter((candidate) => technologyOf(candidate) === selectedTechnology)
    : colleagues;
  const shiftOptions = shiftsList.filter((shift) => shift?.shiftId != null);
  const update = (event) => { setError(""); setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value })); };
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current || saving) return;
    if (loadingEmployeeInfo || loadingTeamMembers) { setError("Loading employee information..."); return; }
    if (!requesterId) { setError(employeeInfoError || "Unable to identify the logged-in employee."); return; }
    const selectedTeamId = teamIdOf(colleagues.find((candidate) => employeeIdOf(candidate) === form.toEmployeeId));
    if (!form.toEmployeeId || !filteredColleagues.some((candidate) => employeeIdOf(candidate) === form.toEmployeeId)) { setError("Please select an employee to swap with."); return; }
    if (form.toEmployeeId.toLowerCase() === requesterId.toLowerCase()) { setError("You cannot request a shift swap with yourself."); return; }
    if (!selectedTeamId || !requesterTeamId || String(selectedTeamId) !== String(requesterTeamId)) { setError("Shift swap is allowed only between employees in the same team."); return; }
    if (!resolvedCurrentId) { setError("Your current shift could not be identified."); return; }
    if (!form.shiftId || !form.shiftDate) { setError("Choose a shift and request date."); return; }
    lock.current = true;
    setError("");
    try { await onSubmit({ fromEmployeeId: requesterId, toEmployeeId: form.toEmployeeId, shiftId: form.shiftId, shiftDate: form.shiftDate, reason: form.reason.trim() }); }
    catch (submitError) { const message = getApiErrorMessage(submitError, "Unable to submit shift swap request."); setError(message); toastError(message); }
    finally { lock.current = false; }
  };
  return <div className="team-modal-overlay"><section className="team-modal team-request-modal team-request-modal--compact" role="dialog" aria-modal="true" aria-labelledby="shift-swap-title">
    <ModalHeading id="shift-swap-title" title="Request Shift Swap" subtitle="Swap your shift with another team member" icon={FaExchangeAlt} onClose={onClose} />
    <form onSubmit={submit}>
      <div className="team-modal-body team-request-form team-request-form--compact">
        {loadingEmployeeInfo || loadingTeamMembers ? <p className="team-form-help team-request-form__full" role="status" aria-live="polite">Loading employee information...</p> : !requesterId ? <div className="team-request-error team-request-form__full" role="alert">{employeeInfoError || "Unable to identify the logged-in employee."}</div> : <>
        <label className="team-form-field team-request-form__full">Current Shift<div className="team-request-readonly"><FaCalendarAlt aria-hidden="true" /><span>{currentLabel}</span><FaLock className="team-request-lock" aria-hidden="true" /></div></label>
        <label className="team-form-field">Technology<select className="team-form-select" name="technology" value={selectedTechnology} onChange={(event) => { setError(""); setSelectedTechnology(event.target.value); setForm((currentForm) => ({ ...currentForm, toEmployeeId: "" })); }} disabled={!technologies.length}><option value="">Select technology</option>{technologies.map((technology) => <option key={technology} value={technology}>{technology}</option>)}</select></label>
        <label className="team-form-field">Swap With<select className="team-form-select" name="toEmployeeId" value={form.toEmployeeId} onChange={update} disabled={!filteredColleagues.length}><option value="">{filteredColleagues.length ? "Select employee" : selectedTechnology ? "No employees for this technology" : "No other members in this team"}</option>{filteredColleagues.map((colleague) => <option key={employeeIdOf(colleague)} value={employeeIdOf(colleague)}>{employeeNameOf(colleague)} ({employeeIdOf(colleague)})</option>)}</select></label>
        <div className="team-request-form__full team-request-form__date-shift">
          <label className="team-form-field">Request Date<input className="team-form-input" type="date" name="shiftDate" value={form.shiftDate} onChange={update} /></label>
          <label className="team-form-field">Shift<select className="team-form-select" name="shiftId" value={form.shiftId} onChange={update} disabled={!shiftOptions.length || loadingShifts}><option value="">Select shift</option>{shiftOptions.map((shift) => <option key={shift.shiftId} value={shift.shiftId}>{shiftLabel(shift)}</option>)}</select></label>
        </div>
        <label className="team-form-field team-request-form__full">Reason (Optional)<textarea className="team-form-input team-request-reason" name="reason" placeholder="Enter reason..." value={form.reason} onChange={update} /></label>
        {loadingShifts && <span className="team-form-help team-request-form__full">Loading available shifts...</span>}
        {error && <div className="team-request-error team-request-form__full" role="alert">{error}</div>}
        </>}
      </div>
      <div className="team-modal-footer team-request-modal__footer"><button className="team-action-btn secondary" type="button" onClick={onClose}>Cancel</button><button className="team-action-btn" type="submit" disabled={saving || loadingEmployeeInfo || loadingTeamMembers}>{saving ? "Submitting..." : "Submit Request"}</button></div>
    </form>
  </section></div>;
}
