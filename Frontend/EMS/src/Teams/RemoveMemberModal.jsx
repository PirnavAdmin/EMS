import React from "react";
import { FaTrash, FaTimes } from "react-icons/fa";

function RemoveMemberModal({
  open,
  member,
  onClose,
  onRemove,
}) {
  if (!open || !member) return null;

  return (
    <div className="team-modal-overlay">
      <div
        className="team-modal team-remove-member-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="team-modal-header">

          <div>
            <h3>Remove Member</h3>
            <p>Remove this employee from the team.</p>
          </div>

          <button
            type="button"
            className="team-modal-close"
            onClick={onClose}
          >
            <FaTimes />
          </button>

        </div>

        <div className="team-modal-body">

          <div className="team-remove-warning">

            <FaTrash className="team-remove-icon" />

            <div>

              <h4>
                Remove {member.employeeName}?
              </h4>

              <p>
                This employee will no longer belong to this team.
              </p>

            </div>

          </div>

          <div className="team-member-preview">

            <div>
              <span>Employee</span>
              <strong>{member.employeeName}</strong>
            </div>

            <div>
              <span>User ID</span>
              <strong>{member.userId || member.employeeId}</strong>
            </div>

            <div>
              <span>Designation</span>
              <strong>{member.designation}</strong>
            </div>

          </div>

        </div>

        <div className="team-modal-footer">

          <button
            type="button"
            className="team-action-btn secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="team-action-btn danger"
            onClick={onRemove}
          >
            Remove Member
          </button>

        </div>

      </div>
    </div>
  );
}

export default RemoveMemberModal;