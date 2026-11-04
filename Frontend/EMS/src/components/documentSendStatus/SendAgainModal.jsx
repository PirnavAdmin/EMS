import React, { useEffect } from "react";
import { FaCheckCircle, FaPaperPlane, FaSpinner, FaTimes } from "react-icons/fa";

const useBodyScrollLock = (open) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.body.classList.add("app-modal-open");

    return () => {
      document.body.classList.remove("app-modal-open");
    };
  }, [open]);
};

const SendAgainModal = ({
  open,
  documentTitle = "",
  sending = false,
  onClose,
  onConfirm,
  confirmLabel = "Send Again",
}) => {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !sending) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, sending]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="offer-modal-overlay"
      role="presentation"
      onClick={sending ? undefined : onClose}
    >
      <div
        className="offer-modal offer-modal--resend"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-again-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="offer-modal-header">
          <div>
            <h3 id="send-again-modal-title">Document Already Sent</h3>
            <p>Review the document before sending it again.</p>
          </div>

          <button
            type="button"
            className="offer-modal-close"
            onClick={onClose}
            disabled={sending}
            aria-label="Close resend confirmation"
          >
            <FaTimes />
          </button>
        </div>

        <div className="offer-modal-body">
          <div className="offer-resend-warning">
            <div className="offer-resend-icon" aria-hidden="true">
              <FaCheckCircle />
            </div>

            <div className="offer-resend-copy">
              <h4>{documentTitle || "Selected document"}</h4>
              <p className="offer-resend-message">
                This document has already been sent to the employee.
                {"\n\n"}
                Do you want to send it again?
              </p>
            </div>
          </div>
        </div>

        <div className="offer-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={sending}
          >
            {sending ? <FaSpinner className="offer-spinner" /> : <FaPaperPlane />}
            {sending ? " Sending..." : ` ${confirmLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SendAgainModal);
