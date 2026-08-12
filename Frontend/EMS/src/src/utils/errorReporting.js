export const APPLICATION_ERROR_EVENT = "ems:application-error";

const toSerializableError = (error) => {
  if (!error) {
    return {
      name: "Error",
      message: "Unknown application error.",
      stack: "",
    };
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
      stack: "",
    };
  }

  return {
    name: error.name || "Error",
    message: error.message || String(error),
    stack: error.stack || "",
    status: error.response?.status ?? error.status ?? "",
    api:
      error.config?.url ||
      error.response?.config?.url ||
      error.api ||
      "",
  };
};

export const reportApplicationError = (error, meta = {}) => {
  const normalizedError = toSerializableError(error);
  const payload = {
    title: meta.title || "Application Error",
    message:
      meta.message ||
      normalizedError.message ||
      "An unexpected application error occurred.",
    error: normalizedError,
    componentStack: meta.componentStack || "",
    meta: {
      ...meta,
      routeName: meta.routeName || meta.route || "",
      currentUrl: meta.currentUrl || (typeof window !== "undefined" ? window.location.href : ""),
      failedApi: meta.failedApi || normalizedError.api || "",
      status: meta.status ?? normalizedError.status ?? "",
    },
  };

  console.error(meta.logLabel || "Application Error:", error);
  console.trace();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(APPLICATION_ERROR_EVENT, { detail: payload })
    );
  }

  return payload;
};
