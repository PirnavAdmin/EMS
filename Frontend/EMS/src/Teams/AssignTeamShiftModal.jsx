import React, { useState } from "react";
import { FaCheck, FaClock, FaTimes, FaTrash } from "react-icons/fa";
 
const shiftLabel = (shift) =>
  `${shift.shiftName || "Unnamed Shift"} - ${shift.startTime || "-"} to ${
    shift.endTime || "-"
  }${shift.shiftCode ? ` (${shift.shiftCode})` : ""}`;
 
function AssignTeamShiftModal({
  open,
  shifts = [],
  assignedShiftId,
  loading,
  saving,
  canDeleteShift = false,
  deletingShiftId = null,
  onClose,
  onSave,
  onDeleteShift,
}) {
  const [selectedShiftId, setSelectedShiftId] = useState(() =>
    assignedShiftId == null ? "" : String(assignedShiftId)
  );
  const [shiftToDelete, setShiftToDelete] = useState(null);
  const selectedShiftIsAvailable = shifts.some((shift) => String(shift.shiftId) === selectedShiftId);
  const activeSelectedShiftId = selectedShiftIsAvailable ? selectedShiftId : "";
 
  if (!open) return null;
 
  return (
    <div className="team-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="team-modal team-modal-small"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-team-shift-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="team-modal-header">
          <div>
            <h3 id="assign-team-shift-title" className="team-modal-title">Assign Team Shift</h3>
            <p className="team-modal-subtitle">Members inherit this shift unless they have an individual override.</p>
          </div>
          <button type="button" className="team-modal-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>
 
        <div className="team-modal-body">
          {loading ? (
            <p className="team-empty-text">Loading active shifts...</p>
          ) : shifts.length === 0 ? (
            <p className="team-empty-text">No active shifts are available in Shift Master.</p>
          ) : (
            <div className="team-shift-options" role="radiogroup" aria-label="Available shifts">
              {shifts.map((shift) => {
                const isSelected = String(shift.shiftId) === activeSelectedShiftId;
                return (
                  <label key={shift.shiftId} className={`team-shift-option ${canDeleteShift ? "has-delete-action" : ""} ${isSelected ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="team-shift"
                      value={shift.shiftId}
                      checked={isSelected}
                      onChange={(event) => setSelectedShiftId(event.target.value)}
                    />
                    <FaClock aria-hidden="true" />
                    <span className="team-shift-option-label" title={shiftLabel(shift)}>{shiftLabel(shift)}</span>
                    {String(shift.shiftId) === String(assignedShiftId)
                      ? <FaCheck aria-label="Currently assigned" />
                      : <span className="team-shift-current-placeholder" aria-hidden="true" />}
                    {canDeleteShift && (
                      <button
                        type="button"
                        className="team-shift-delete-button"
                        aria-label={`Delete ${shift.shiftName || "shift"}`}
                        title="Delete shift"
                        disabled={deletingShiftId != null || saving}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setShiftToDelete(shift);
                        }}
                      >
                        <FaTrash aria-hidden="true" />
                      </button>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
 
        <div className="team-modal-footer">
          <button type="button" className="team-action-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="button"
            className="team-action-btn"
            onClick={() => onSave(activeSelectedShiftId)}
            disabled={!activeSelectedShiftId || saving}
          >
            {saving ? "Assigning..." : "Assign Shift"}
          </button>
        </div>
      </section>
 
      {shiftToDelete && (
        <div className="team-modal-overlay team-shift-delete-overlay" role="presentation" onMouseDown={(event) => {
          event.stopPropagation();
          if (deletingShiftId == null) setShiftToDelete(null);
        }}>
          <section
            className="team-modal team-modal-small"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-shift-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="team-modal-header">
              <div><h3 id="delete-shift-title" className="team-modal-title">Delete Shift</h3></div>
              <button type="button" className="team-modal-close" onClick={() => setShiftToDelete(null)} aria-label="Close" disabled={deletingShiftId != null}><FaTimes /></button>
            </div>
            <div className="team-modal-body team-shift-delete-summary">
              <p>Are you sure you want to delete this shift?</p>
              <p><strong>Shift:</strong> {shiftToDelete.shiftName || "Unnamed Shift"}</p>
              <p><strong>Code:</strong> {shiftToDelete.shiftCode || "-"}</p>
              <p><strong>Time:</strong> {shiftToDelete.startTime || "-"} - {shiftToDelete.endTime || "-"}</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="team-modal-footer">
              <button type="button" className="team-action-btn secondary" onClick={() => setShiftToDelete(null)} disabled={deletingShiftId != null}>Cancel</button>
              <button
                type="button"
                className="team-action-btn danger"
                disabled={deletingShiftId != null}
                onClick={async () => {
                  const deleted = await onDeleteShift?.(shiftToDelete);
                  if (deleted) {
                    if (String(selectedShiftId) === String(shiftToDelete.shiftId)) {
                      setSelectedShiftId("");
                    }
                    setShiftToDelete(null);
                  }
                }}
              >
                {deletingShiftId != null ? "Deleting..." : "Delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
 
export default AssignTeamShiftModal;
 
 