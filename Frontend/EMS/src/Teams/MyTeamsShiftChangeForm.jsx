import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createShiftChangeRequest } from "../services/shiftRequestService";
import { listHrmsSettings } from "../services/hrmsSettingsService";
import { shiftModulesConfig } from "../Pages/Settings/hrmsSettingsConfig";
import { normalizeCollection } from "./teamUtils";

const cleanName = (value) => String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
const shiftNameOf = (shift) => shift?.shiftName ?? shift?.name ?? shift?.label ?? "";
const shiftIdOf = (shift) => shift?.shiftId ?? shift?.id ?? shift?.shift_Id;

function MyTeamShiftChangeForm({ employeeId, currentShiftId, onClose, onSubmitted }) {
  const [shifts, setShifts] = useState([]);
  const [requestedShift, setRequestedShift] = useState("");
  const [reason, setReason] = useState("");
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    listHrmsSettings(shiftModulesConfig.shiftMaster)
      .then((records) => { if (active) setShifts(normalizeCollection(records)); })
      .catch(() => { if (active) setLoadError("Unable to load shift options. Please try again."); })
      .finally(() => { if (active) setLoadingShifts(false); });
    return () => { active = false; };
  }, []);

  const currentId = currentShiftId;
  const selectedShift = useMemo(() => shifts.find((shift) => cleanName(shiftNameOf(shift)) === cleanName(requestedShift)), [requestedShift, shifts]);

  const submit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) { toast.error("Reason for change is required."); return; }
    if (!employeeId || !currentId || !shiftIdOf(selectedShift)) {
      toast.error("A current assigned shift and requested shift are required.");
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await createShiftChangeRequest({
        employeeId,
        currentShiftId: currentId,
        requestedShiftId: shiftIdOf(selectedShift),
        effectiveFrom: `${today}T00:00:00`,
        effectiveTo: null,
        isPermanent: true,
        reason: reason.trim()
      });
      const message = "Shift change request submitted to Vijitha Putluru Reddy";
      toast.success(message);
      onSubmitted?.(message);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data?.title || "Unable to submit shift change request.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="team-request-panel team-request-panel--unified" aria-labelledby="my-team-shift-change-title">
    <div className="team-request-panel__head">
      <div><span className="teams-section-kicker">My Requests</span><h3 id="my-team-shift-change-title">Shift Change Request</h3></div>
      <button type="button" className="team-action-btn secondary" onClick={onClose}>✕ Close Panel</button>
    </div>
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-slate-700" htmlFor="my-team-current-shift">Current Shift</label>
        <input id="my-team-current-shift" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm" readOnly value={currentId ? shiftNameOf(shifts.find((shift) => String(shiftIdOf(shift)) === String(currentId))) || "Assigned shift" : "No shift"} />
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-slate-700" htmlFor="my-team-requested-shift">Requested Shift</label>
        <select id="my-team-requested-shift" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={requestedShift} onChange={(event) => setRequestedShift(event.target.value)} disabled={loadingShifts} required>
          <option value="">{loadingShifts ? "Loading shifts..." : "Select a shift"}</option>
          {shifts.map((shift) => {
            const name = shiftNameOf(shift);
            const start = shift.startTime ?? shift.start_Time;
            const end = shift.endTime ?? shift.end_Time;
            return <option key={shiftIdOf(shift) ?? name} value={name}>{name}{start || end ? ` (${start || "?"} - ${end || "?"})` : ""}</option>;
          })}
        </select>
        {loadError && <span className="text-sm text-rose-700" role="alert">{loadError}</span>}
        {!loadingShifts && requestedShift && !selectedShift && <span className="text-sm text-rose-700" role="alert">{requestedShift} is not configured in Shift Master.</span>}
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-slate-700" htmlFor="my-team-change-reason">Reason for Change</label>
        <textarea id="my-team-change-reason" className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} required />
      </div>
      <p className="text-sm text-slate-600">Reporting Manager: <strong>Vijitha Putluru Reddy</strong></p>
      <div className="flex justify-end">
        <button className="team-action-btn" type="submit" disabled={saving || loadingShifts || !requestedShift || !selectedShift || !reason.trim()}>{saving ? "Submitting..." : "Submit Change Request"}</button>
      </div>
    </form>
  </section>;
}

export default MyTeamShiftChangeForm;
