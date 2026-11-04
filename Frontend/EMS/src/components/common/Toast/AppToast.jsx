import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

const VARIANT_META = {
  success: {
    icon: CheckCircle2,
    title: "Success",
  },
  error: {
    icon: AlertCircle,
    title: "Error",
  },
  warning: {
    icon: AlertTriangle,
    title: "Warning",
  },
  info: {
    icon: Info,
    title: "Info",
  },
};

export default function AppToast({
  closeToast,
  message,
  title,
  variant = "info",
}) {
  const meta = VARIANT_META[variant] || VARIANT_META.info;
  const Icon = meta.icon;
  const resolvedTitle = title || meta.title;
  const resolvedMessage =
    typeof message === "string"
      ? message.trim()
      : String(message ?? "").trim();

  return (
    <div className="ems-toast__shell" data-variant={variant}>
      <div className="ems-toast__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2.2} />
      </div>

      <div className="ems-toast__content">
        <div className="ems-toast__header">
          <strong className="ems-toast__title">{resolvedTitle}</strong>

          <button
            type="button"
            className="ems-toast__close"
            onClick={closeToast}
            aria-label="Dismiss notification"
          >
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>

        <div className="ems-toast__message-wrap">
          {resolvedMessage ? (
            <p className="ems-toast__message">{resolvedMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
