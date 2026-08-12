import React from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

function DeleteTeamModal({
  open,
  team,
  onClose,
  onDelete,
}) {
  if (!open) return null;

  return (
    <div className="team-modal-overlay">
      <div
        className="team-modal team-delete-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="team-modal-header">
          <div>
            <h3>Delete Team</h3>
            <p>This action cannot be undone.</p>
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

          <div className="team-delete-warning">

            <FaExclamationTriangle className="team-delete-icon" />

            <div>

              <h4>
                Delete "{team?.teamName}"?
              </h4>

              <p>
                This will permanently remove the team and all team assignments.
              </p>

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
            onClick={onDelete}
          >
            Delete Team
          </button>

        </div>

      </div>
    </div>
  );
}

export default DeleteTeamModal;