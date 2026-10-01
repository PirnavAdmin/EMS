import React from "react";
import { FaBell, FaCheck, FaClock, FaPen, FaTimes } from "react-icons/fa";
import { TEAM_DAY_OPTIONS } from "./teamsData";

function TeamReportingDays({
  teamName,
  days = TEAM_DAY_OPTIONS,
  draftDays = TEAM_DAY_OPTIONS,
  isEditing = false,
  saving = false,
  canManage = false,
  onEdit,
  onCancel,
  onSave,
  onToggleDay,
  shift,
  onAssignShift,
  onCreateShift,
  canCreateShift = false,
}) {
  const activeDays = isEditing ? draftDays : days;

  return (
    <section className="teams-reporting-card">
      <div className="teams-reporting-header">
        <div>
          <h3>Team Default Working Days</h3>
          <p>
            Default days members of this team must report to office.
          </p>
        </div>

        <div className="teams-reporting-actions">
          {isEditing ? (
            <>
              <button
                type="button"
                className="team-action-btn secondary"
                onClick={onCancel}
              >
                <FaTimes />
                Cancel
              </button>

              <button
                type="button"
                className="team-action-btn"
                onClick={onSave}
                disabled={saving}
              >
              <FaBell />
                {saving ? "Saving..." : "Save & Notify"}
              </button>
            </>
         ) : (
  canManage && (
    <>
    <button
      type="button"
      className="team-action-btn secondary"
      onClick={onAssignShift}
    >
      <FaClock />
      Assign Shift
    </button>
    {canCreateShift && <button
      type="button"
      className="team-action-btn"
      onClick={onCreateShift}
    >
      Create Shift
    </button>}
    <button
      type="button"
      className="team-action-btn secondary"
      onClick={onEdit}
    >
      <FaPen />
      Edit
    </button>
    </>
  )
)}
        </div>
      </div>

      <div className="team-assigned-shift" role="status">
        <FaClock aria-hidden="true" />
        <span>
          <strong>Assigned Shift:</strong>{" "}
          {shift?.shiftName
            ? `${shift.shiftName} | ${shift.startTime || "-"} - ${shift.endTime || "-"} (Team Default)`
            : "Not Assigned"}
        </span>
      </div>

      <div className="teams-day-grid" aria-label={`Reporting days for ${teamName || "team"}`}>
        {TEAM_DAY_OPTIONS.map((day) => {
          const isSelected = activeDays.includes(day);
          const canToggle = Boolean(isEditing && typeof onToggleDay === "function");

          return (
            <button
              key={day}
              type="button"
              className={`teams-day-button ${isSelected ? "is-active" : ""} ${canToggle ? "is-editable" : ""}`}
              onClick={() => {
                if (canToggle) {
                  onToggleDay(day);
                }
              }}
              disabled={!canToggle}
            >
              {isEditing && isSelected ? <FaCheck aria-hidden="true" /> : null}
              <span>{day}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default TeamReportingDays;
