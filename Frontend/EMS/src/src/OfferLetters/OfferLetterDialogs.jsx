import React, { useEffect, useMemo } from "react";
import {
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileAlt,
  FaPaperPlane,
  FaSpinner,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

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

const getOfferLetterTitle = (offerLetter) => {
  const candidateName = String(
    offerLetter?.candidate_Name ||
      offerLetter?.candidateName ||
      offerLetter?.employeeName ||
      offerLetter?.employee_name ||
      offerLetter?.name ||
      "Document"
  ).trim();
  const position = String(
    offerLetter?.position ||
      offerLetter?.designation ||
      offerLetter?.role ||
      offerLetter?.title ||
      ""
  ).trim();

  return position ? `${candidateName} - ${position}` : candidateName;
};

export function OfferLetterPreviewModal({
  open,
  offerLetter,
  letterLabel = "Offer Letter",
  loading,
  error,
  blob,
  contentType,
  onClose,
}) {
  useBodyScrollLock(open);
  const normalizedContentType = String(contentType || blob?.type || "").toLowerCase();
  const isImage = normalizedContentType.startsWith("image/");
  const previewUrl = useMemo(() => {
    if (!open || !blob || loading || error) {
      return "";
    }

    return window.URL.createObjectURL(blob);
  }, [blob, error, loading, open]);

  useEffect(() => {
    if (!previewUrl) {
      return undefined;
    }

    return () => {
      window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const title = getOfferLetterTitle(offerLetter);
  const canRenderPreview = Boolean(blob) && !loading && !error;

  return (
    <div
      className="offer-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="offer-modal offer-modal--preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-letter-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="offer-modal-header">
          <div>
            <h3 id="offer-letter-preview-title">Preview {letterLabel}</h3>
            <p title={title}>
              {title}
              {offerLetter?.id ? ` • ID ${offerLetter.id}` : ""}
            </p>
          </div>

          <button
            type="button"
            className="offer-modal-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <FaTimes />
          </button>
        </div>

        <div className="offer-modal-body offer-preview-body">
          {loading ? (
            <div className="offer-preview-loading" role="status" aria-live="polite">
              <FaSpinner className="offer-spinner" aria-hidden="true" />
              Loading preview...
            </div>
          ) : error ? (
            <div className="offer-preview-error" role="alert">
              <FaExclamationTriangle className="offer-preview-alert-icon" aria-hidden="true" />
              <strong>Unable to preview the {letterLabel.toLowerCase()}.</strong>
              <p>{error}</p>
            </div>
          ) : canRenderPreview ? (
            isImage ? (
              <div className="offer-preview-image-shell">
                <img
                  className="offer-preview-image"
                  src={previewUrl}
                  alt={`Offer letter preview for ${title}`}
                />
              </div>
            ) : (
              <iframe
                className="offer-preview-frame"
                title={`Offer letter preview for ${title}`}
                src={previewUrl}
              />
            )
          ) : (
            <div className="offer-preview-empty">
              <FaFileAlt aria-hidden="true" />
              <p>No preview content available.</p>
            </div>
          )}
        </div>

        <div className="offer-modal-footer offer-modal-footer--end">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfferLetterSendModal({
  open,
  offerLetter,
  letterLabel = "Offer Letter",
  recipientName = "",
  recipientEmail = "",
  subject,
  body,
  errors,
  sending,
  onClose,
  onSubjectChange,
  onBodyChange,
  onSubmit,
}) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const title = useMemo(
    () => getOfferLetterTitle(offerLetter),
    [offerLetter]
  );

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
        className="offer-modal offer-modal--compose"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-letter-send-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="offer-modal-header">
          <div>
            <h3 id="offer-letter-send-title">Send {letterLabel}</h3>
            <p title={title}>
              {title}
              {offerLetter?.email ? ` • ${offerLetter.email}` : ""}
            </p>
          </div>

          <button
            type="button"
            className="offer-modal-close"
            onClick={onClose}
            disabled={sending}
            aria-label="Close email modal"
          >
            <FaTimes />
          </button>
        </div>

        <form className="offer-modal-body" onSubmit={onSubmit}>
          <div className="offer-form-grid">
            {recipientName ? (
              <div className="offer-form-group">
                <label>Employee Name</label>
                <input type="text" value={recipientName} disabled />
              </div>
            ) : null}

            {recipientEmail ? (
              <div className="offer-form-group">
                <label>Employee Email</label>
                <input type="email" value={recipientEmail} disabled />
              </div>
            ) : null}

            <div className="offer-form-group offer-form-group--full">
              <label htmlFor="offer-letter-subject">Subject</label>
              <input
                id="offer-letter-subject"
                type="text"
                value={subject}
                onChange={(event) => onSubjectChange(event.target.value)}
                placeholder="Enter email subject"
                disabled={sending}
              />
              {errors.subject && <p className="offer-field-error">{errors.subject}</p>}
            </div>

            <div className="offer-form-group offer-form-group--full">
              <label htmlFor="offer-letter-body">
                <FaEnvelope aria-hidden="true" />
                Email Body
              </label>
              <textarea
                id="offer-letter-body"
                rows={9}
                value={body}
                onChange={(event) => onBodyChange(event.target.value)}
                placeholder="Write the email body"
                disabled={sending}
              />
              {errors.body && <p className="offer-field-error">{errors.body}</p>}
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
              type="submit"
              className="btn-primary"
              disabled={sending}
            >
              <FaPaperPlane />
              {sending ? " Sending..." : " Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OfferLetterDeleteModal({
  open,
  offerLetter,
  letterLabel = "Offer Letter",
  message,
  deleting,
  onClose,
  onConfirm,
}) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting, open, onClose]);

  const title = useMemo(
    () => getOfferLetterTitle(offerLetter),
    [offerLetter]
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="offer-modal-overlay"
      role="presentation"
      onClick={deleting ? undefined : onClose}
    >
      <div
        className="offer-modal offer-modal--delete"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-letter-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="offer-modal-header">
          <div>
            <h3 id="offer-letter-delete-title">Delete {letterLabel}</h3>
            <p>This action cannot be undone.</p>
          </div>

          <button
            type="button"
            className="offer-modal-close"
            onClick={onClose}
            disabled={deleting}
            aria-label="Close delete confirmation"
          >
            <FaTimes />
          </button>
        </div>

        <div className="offer-modal-body">
          <div className="offer-delete-warning">
            <div className="offer-delete-icon" aria-hidden="true">
              <FaExclamationTriangle />
            </div>

            <div className="offer-delete-copy">
              <h4>{title}</h4>
              <p>
                {message ||
                  `Deleting this ${letterLabel.toLowerCase()} will permanently remove the record from the list.`}
              </p>
            </div>
          </div>
        </div>

        <div className="offer-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="offer-modal-danger-btn"
            onClick={onConfirm}
            disabled={deleting}
          >
            <FaTrash />
            {deleting ? " Deleting..." : " Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocumentAlreadySentModal({
  open,
  documentTitle = "",
  sending,
  onClose,
  onConfirm,
}) {
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
        aria-labelledby="document-already-sent-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="offer-modal-header">
          <div>
            <h3 id="document-already-sent-title">Document Already Sent</h3>
            <p>Review the record before sending it again.</p>
          </div>

          <button
            type="button"
            className="offer-modal-close"
            onClick={onClose}
            disabled={sending}
            aria-label="Close already sent confirmation"
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
              <p>
                This document has already been sent to the employee. Do you want
                to send it again?
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
            {sending ? " Sending..." : " Send Again"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfferLetterResendConfirmModal({
  open,
  offerLetter,
  sending,
  onClose,
  onConfirm,
}) {
  const documentTitle = useMemo(
    () => getOfferLetterTitle(offerLetter),
    [offerLetter]
  );

  return (
    <DocumentAlreadySentModal
      open={open}
      documentTitle={documentTitle}
      sending={sending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
