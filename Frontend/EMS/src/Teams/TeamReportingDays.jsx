import React from "react";
import { createPortal } from "react-dom";
import { FaCalendarAlt, FaCheck, FaClock, FaPen, FaTimes } from "react-icons/fa";
import { TEAM_REPORTING_DAY_OPTIONS } from "./teamsData";
import { normalizeWeeklyOffDays } from "./weeklyOffDays";

function TeamReportingDays({
  teamName,
  days = TEAM_REPORTING_DAY_OPTIONS,
  weeklyOffDays = [],
  draftDays = TEAM_REPORTING_DAY_OPTIONS,
  isEditing = false,
  saving = false,
  loadingSchedule = false,
  scheduleError = "",
  timelineOptions = [],
  selectedTimeline = "",
  canManage = false,
  onEdit,
  onCancel,
  onSave,
  onAssignWeekends,
  onToggleDay,
  onTimelineChange,
  onRetrySchedule,
  shift,
  onAssignShift,
  onCreateShift,
  canCreateShift = false,
}) {
  const activeDays = days;
  const weeklyOffDayNames = new Set(
    normalizeWeeklyOffDays(weeklyOffDays).map((day) => day.slice(0, 3))
  );
  const visibleReportingDays = TEAM_REPORTING_DAY_OPTIONS.filter(
    (day) => !weeklyOffDayNames.has(day)
  );

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
          {canManage && (
            <>
              <button
                type="button"
                className="team-action-btn secondary"
                onClick={onAssignShift}
              >
                <FaClock />
                Assign Shift
              </button>
              <button
                type="button"
                className="team-action-btn secondary"
                onClick={onAssignWeekends}
              >
                <FaCalendarAlt />
                Assign Weekends
              </button>
              {canCreateShift && (
                <button
                  type="button"
                  className="team-action-btn"
                  onClick={onCreateShift}
                >
                  Create Shift
                </button>
              )}
              <button
                type="button"
                className="team-action-btn secondary"
                onClick={onEdit}
              >
                <FaPen />
                Edit
              </button>
            </>
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
        {visibleReportingDays.map((day) => {
          const isSelected = activeDays.includes(day);

          return (
            <button
              key={day}
              type="button"
              className={`teams-day-button ${isSelected ? "is-active" : ""}`}
              disabled
            >
              {isSelected ? <FaCheck aria-hidden="true" /> : null}
              <span>{day}</span>
            </button>
          );
        })}
      </div>

      <div className="team-weekly-off-display" aria-label={`Weekly off days for ${teamName || "team"}`}>
        <strong>Weekly Off Days:</strong>
        {weeklyOffDays.length > 0
          ? weeklyOffDays.join(", ")
          : "None configured"}
      </div>

      {isEditing &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="team-modal-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) onCancel?.();
            }}
          >
            <section
              className="team-modal team-modal-small team-reporting-days-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="team-reporting-days-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="team-modal-header">
                <h2
                  className="team-modal-title"
                  id="team-reporting-days-title"
                >
                  Edit Team Working Days
                </h2>
                <button
                  type="button"
                  className="team-modal-close"
                  aria-label="Close"
                  onClick={onCancel}
                  disabled={saving}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="team-modal-body team-reporting-days-modal__body">
                <label className="team-form-field">
                  <span>Week Timeline</span>
                  <select
                    className="team-form-input"
                    value={selectedTimeline}
                    onChange={(event) => onTimelineChange?.(event.target.value)}
                    disabled={saving}
                  >
                    {timelineOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset
                  className="team-reporting-days-modal__fieldset"
                  disabled={loadingSchedule || saving}
                  aria-busy={loadingSchedule}
                >
                  <legend>Reporting Days</legend>
                  <div
                    className="teams-day-grid"
                    aria-label={`Reporting days for ${teamName || "team"}`}
                  >
                    {TEAM_REPORTING_DAY_OPTIONS.map((day) => {
                      const isSelected = draftDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`teams-day-button ${isSelected ? "is-active" : ""} is-editable`}
                          onClick={() => onToggleDay?.(day)}
                          disabled={loadingSchedule || saving}
                          aria-pressed={isSelected}
                        >
                          {isSelected ? <FaCheck aria-hidden="true" /> : null}
                          <span>{day}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {loadingSchedule && (
                  <p className="team-reporting-days-modal__status" role="status">
                    Loading reporting days...
                  </p>
                )}
                {scheduleError && (
                  <div className="team-reporting-days-modal__error" role="alert">
                    <span>{scheduleError}</span>
                    <button
                      type="button"
                      className="team-action-btn secondary"
                      onClick={onRetrySchedule}
                      disabled={loadingSchedule || saving}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="team-modal-footer">
                <button
                  type="button"
                  className="team-action-btn secondary"
                  onClick={onCancel}
                  disabled={saving}
                >
                  <FaTimes />
                  Cancel
                </button>
                <button
                  type="button"
                  className="team-action-btn"
                  onClick={onSave}
                  disabled={saving || loadingSchedule || Boolean(scheduleError)}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </section>
  );
}

export default TeamReportingDays;
