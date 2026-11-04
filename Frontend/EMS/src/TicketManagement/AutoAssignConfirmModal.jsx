import React, { useId } from "react";
import { FaSpinner, FaSyncAlt, FaTimes } from "react-icons/fa";

function AutoAssignConfirmModal({
  open,
  saving = false,
  badge = "Project",
  onClose,
  onConfirm,
}) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  const handleClose = () => {
    if (!saving) {
      onClose?.();
    }
  };

  return (
    <div
      className="delete-overlay ticket-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="ticket-modal ticket-modal-narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ticket-modal-head">
          <div className="ticket-modal-heading">
            <span className="ticket-eyebrow">Tickets</span>
            <div>
              <h3 id={titleId}>Auto Assign Tickets</h3>
              <p>Are you sure you want to auto assign all unassigned tickets?</p>
            </div>
          </div>

          <div className="ticket-modal-head-actions">
            <span className="ticket-modal-badge">{badge}</span>

            <button
              type="button"
              className="ticket-modal-close"
              onClick={handleClose}
              aria-label="Close dialog"
              disabled={saving}
            >
              <FaTimes aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="ticket-modal-body">
          <div className="ticket-details-section ticket-confirm-section">
            <div className="ticket-detail-chips">
              <span className="ticket-pill detail-chip">
                Unassigned tickets will be distributed automatically.
              </span>
            </div>
          </div>
        </div>

        <div className="ticket-modal-footer">
          <button
            type="button"
            className="ticket-button secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="ticket-button primary"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? (
              <>
                <FaSpinner className="ticket-button-spinner" />
                Assigning...
              </>
            ) : (
              <>
                <FaSyncAlt aria-hidden="true" />
                Assign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AutoAssignConfirmModal;
