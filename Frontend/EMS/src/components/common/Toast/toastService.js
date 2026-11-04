import React from "react";
import { cssTransition, toast as toastifyToast } from "react-toastify";
import AppToast from "./AppToast";

export const toastTransition = cssTransition({
  enter: "ems-toast-enter",
  exit: "ems-toast-exit",
  duration: 300,
  appendPosition: false,
  collapse: true,
});

const DEFAULT_TOAST_OPTIONS = {
  position: "top-right",
  autoClose: 4000,
  closeOnClick: true,
  draggable: true,
  draggablePercent: 60,
  hideProgressBar: false,
  closeButton: false,
  newestOnTop: true,
  pauseOnFocusLoss: false,
  pauseOnHover: true,
  icon: false,
};

const VARIANT_TITLES = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

const GLOBAL_TOAST_ID = "ems-global-toast";

const resolveAutoClose = (variant, options = {}) =>
  options.autoClose ??
  (variant === "error" ? 5000 : 4000);

const dismissVisibleToasts = () => {
  toastifyToast.dismiss();

  if (typeof toastifyToast.clearWaitingQueue === "function") {
    toastifyToast.clearWaitingQueue();
  }
};

const normalizeToastMessage = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (value instanceof Error) {
    return value.message || "Something went wrong.";
  }

  if (typeof value === "object") {
    const message =
      value.message ||
      value.title ||
      value.error ||
      value.detail ||
      value.description ||
      "";

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "Something went wrong.";
    }
  }

  return String(value);
};

const resolveToastTitle = (variant, options = {}) =>
  options.title || VARIANT_TITLES[variant] || "Notification";

const createToastNode = (variant, title, message) =>
  ({ closeToast }) =>
    React.createElement(AppToast, {
      closeToast,
      message: normalizeToastMessage(message),
      title,
      variant,
    });

const renderToast = (variant, message, options = {}) => {
  dismissVisibleToasts();

  const title = resolveToastTitle(variant, options);
  const toastOptions = {
    ...DEFAULT_TOAST_OPTIONS,
    ...options,
    toastId: options.toastId || GLOBAL_TOAST_ID,
    autoClose: resolveAutoClose(variant, options),
    transition: options.transition || toastTransition,
  };

  return toastifyToast(
    createToastNode(variant, title, message),
    toastOptions
  );
};

const updateToastState = (toastId, variant, message, options = {}) => {
  const title = resolveToastTitle(variant, options);

  return toastifyToast.update(toastId, {
    render: createToastNode(variant, title, message),
    type: variant,
    autoClose: resolveAutoClose(variant, options),
    closeButton: false,
    draggable: true,
    transition: options.transition || toastTransition,
  });
};

const toastApi = {
  success: (message, options = {}) => renderToast("success", message, options),
  error: (message, options = {}) => renderToast("error", message, options),
  warning: (message, options = {}) => renderToast("warning", message, options),
  info: (message, options = {}) => renderToast("info", message, options),
  promise: (promise, messages = {}, options = {}) => {
    dismissVisibleToasts();

    const pendingToastId =
      options.toastId ||
      `${GLOBAL_TOAST_ID}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    toastifyToast(
      createToastNode(
        "info",
        options.pendingTitle || "Loading",
        messages.pending || "Loading..."
      ),
      {
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
        toastId: pendingToastId,
        autoClose: false,
        closeButton: false,
        draggable: false,
        transition: options.transition || toastTransition,
      }
    );

    return Promise.resolve(promise).then(
      (result) => {
        updateToastState(
          pendingToastId,
          "success",
          messages.success || "Success",
          {
            ...options,
            title: options.successTitle || "Success",
          }
        );

        return result;
      },
      (error) => {
        updateToastState(
          pendingToastId,
          "error",
          messages.error || error || "Something went wrong.",
          {
            ...options,
            title: options.errorTitle || "Error",
          }
        );

        throw error;
      }
    );
  },
};

export const toastSuccess = toastApi.success;
export const toastError = toastApi.error;
export const toastWarning = toastApi.warning;
export const toastInfo = toastApi.info;
export const toastPromise = toastApi.promise;
export const toast = {
  success: toastApi.success,
  error: toastApi.error,
  warning: toastApi.warning,
  info: toastApi.info,
  promise: toastApi.promise,
  dismiss: (...args) => toastifyToast.dismiss(...args),
  clearWaitingQueue: (...args) =>
    typeof toastifyToast.clearWaitingQueue === "function"
      ? toastifyToast.clearWaitingQueue(...args)
      : undefined,
};

export const normalizeToastContent = normalizeToastMessage;
