import React from "react";
import { FaCheckCircle, FaPaperPlane, FaSpinner } from "react-icons/fa";

const joinClassNames = (...values) =>
  values
    .flatMap((value) => String(value || "").split(" "))
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");

const DocumentSendStatusButton = ({
  status = "unknown",
  loading = false,
  disabled = false,
  onClick,
  title,
  ariaLabel,
  className = "",
  buttonRef,
}) => {
  const isSent = status === "sent";
  const isChecking = loading && !isSent;

  return (
    <button
      ref={buttonRef}
      type="button"
      className={joinClassNames(
        "offer-action-btn",
        "offer-action-send",
        isSent && "offer-action-send--sent",
        className
      )}
      onClick={onClick}
      disabled={disabled || isChecking}
      title={title}
      aria-label={ariaLabel}
      aria-busy={isChecking || undefined}
    >
      {isChecking ? (
        <FaSpinner className="offer-spinner" aria-hidden="true" />
      ) : isSent ? (
        <FaCheckCircle aria-hidden="true" />
      ) : (
        <FaPaperPlane aria-hidden="true" />
      )}
    </button>
  );
};

export default React.memo(DocumentSendStatusButton);
