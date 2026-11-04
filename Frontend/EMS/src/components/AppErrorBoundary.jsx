import React from "react";
import DebugErrorPanel from "./DebugErrorPanel";
import { APPLICATION_ERROR_EVENT } from "../utils/errorReporting";
import { recoverFromChunkLoadError } from "../utils/chunkLoadRecovery";

const toErrorObject = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Error) {
    return value;
  }

  if (typeof value === "string") {
    return new Error(value);
  }

  const error = new Error(value.message || "Application error");
  error.name = value.name || "Error";
  error.stack = value.stack || "";
  error.status = value.status;
  error.api = value.api;
  return error;
};

const extractStackLocation = (stack = "") => {
  const lines = String(stack || "").
  split("\n").
  map((line) => line.trim()).
  filter(Boolean);

  for (const line of lines) {
    const parenMatch = line.match(/\((.*):(\d+):(\d+)\)$/);
    if (parenMatch) {
      return {
        sourceFile: parenMatch[1],
        lineNumber: Number(parenMatch[2]),
        columnNumber: Number(parenMatch[3])
      };
    }

    const directMatch = line.match(/^(?:at\s+)?(.*):(\d+):(\d+)$/);
    if (directMatch) {
      return {
        sourceFile: directMatch[1].replace(/^at\s+/, ""),
        lineNumber: Number(directMatch[2]),
        columnNumber: Number(directMatch[3])
      };
    }
  }

  return {};
};

const formatLocation = ({
  sourceFile = "",
  lineNumber = "",
  columnNumber = ""
} = {}) => {
  const file = String(sourceFile || "").trim();

  if (!file) {
    return "";
  }

  const line = lineNumber ? String(lineNumber) : "?";
  const column = columnNumber ? String(columnNumber) : "?";
  return `${file}:${line}:${column}`;
};

const buildErrorDetails = ({
  error,
  componentStack = "",
  routeName = "",
  currentUrl = "",
  filename = "",
  lineNumber = "",
  columnNumber = "",
  meta = {}
}) => {
  const stackLocation = extractStackLocation(
    error?.stack || componentStack || ""
  );
  const sourceFile = filename || stackLocation.sourceFile || "";
  const resolvedLineNumber = lineNumber || stackLocation.lineNumber || "";
  const resolvedColumnNumber = columnNumber || stackLocation.columnNumber || "";

  return {
    ...meta,
    routeName,
    currentUrl,
    sourceFile,
    lineNumber: resolvedLineNumber,
    columnNumber: resolvedColumnNumber,
    sourceLocation: formatLocation({
      sourceFile,
      lineNumber: resolvedLineNumber,
      columnNumber: resolvedColumnNumber
    })
  };
};

const logBoundaryError = () => {};

class AppErrorBoundary extends React.Component {
  state = {
    error: null,
    componentStack: "",
    details: {},
    title: "Application Error",
    message: ""
  };

  componentDidMount() {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("error", this.handleWindowError);
    window.addEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection
    );
    window.addEventListener(APPLICATION_ERROR_EVENT, this.handleApplicationError);
  }

  componentWillUnmount() {
    if (typeof window === "undefined") {
      return;
    }

    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection
    );
    window.removeEventListener(
      APPLICATION_ERROR_EVENT,
      this.handleApplicationError
    );
  }

  componentDidCatch(error, errorInfo) {
    const componentStack = errorInfo?.componentStack || error.stack || "";
    const routeName =
    typeof window !== "undefined" ? window.location.pathname : "";
    const currentUrl =
    typeof window !== "undefined" ? window.location.href : "";

    if (recoverFromChunkLoadError(error)) {
      return;
    }

    const details = buildErrorDetails({
      error,
      componentStack,
      routeName,
      currentUrl
    });

    logBoundaryError("React Error:", error, {
      ...details,
      componentStack
    });

    this.setState({
      error,
      componentStack,
      details,
      title: "JavaScript Error",
      message: error.message || "A runtime error occurred."
    });
  }

  handleApplicationError = (event) => {
    const detail = event?.detail || {};
    const error = toErrorObject(detail.error) || new Error(detail.message);
    const componentStack = detail.componentStack || error.stack || "";
    const routeName =
    detail.meta?.routeName || (
    typeof window !== "undefined" ? window.location.pathname : "");
    const currentUrl =
    detail.meta?.currentUrl || (
    typeof window !== "undefined" ? window.location.href : "");

    if (recoverFromChunkLoadError(detail.error || detail.message)) {
      return;
    }

    const details = buildErrorDetails({
      error,
      componentStack,
      routeName,
      currentUrl,
      meta: detail.meta || {}
    });

    logBoundaryError("Application Error:", error, {
      ...details,
      componentStack
    });

    this.setState({
      error,
      componentStack,
      details,
      title: detail.title || "Application Error",
      message: detail.message || error.message
    });
  };

  handleWindowError = (event) => {
    if (this.state.error) {
      return;
    }

    const error = toErrorObject(event?.error) || new Error(event?.message || "Unknown error");

    if (recoverFromChunkLoadError(event?.error || event?.message || event)) {
      return;
    }

    const componentStack = error.stack || "";
    const details = buildErrorDetails({
      error,
      componentStack,
      routeName: typeof window !== "undefined" ? window.location.pathname : "",
      currentUrl: typeof window !== "undefined" ? window.location.href : "",
      filename: event?.filename || "",
      lineNumber: event?.lineno || "",
      columnNumber: event?.colno || ""
    });

    logBoundaryError("JavaScript Error:", error, {
      message: event?.message || error.message,
      filename: event?.filename || "",
      lineno: event?.lineno || "",
      colno: event?.colno || "",
      ...details
    });

    this.setState({
      error,
      componentStack,
      details,
      title: "JavaScript Error",
      message: error.message
    });
  };

  handleUnhandledRejection = (event) => {
    if (this.state.error) {
      return;
    }

    const reason = event?.reason;
    const error =
    toErrorObject(reason) ||
    new Error(typeof reason === "string" ? reason : "Unhandled promise rejection");

    if (recoverFromChunkLoadError(reason || event?.message || event)) {
      return;
    }

    const componentStack = error.stack || "";
    const details = buildErrorDetails({
      error,
      componentStack,
      routeName: typeof window !== "undefined" ? window.location.pathname : "",
      currentUrl: typeof window !== "undefined" ? window.location.href : ""
    });

    logBoundaryError("Promise Rejection:", error, {
      reason: typeof reason === "string" ? reason : "",
      ...details
    });

    this.setState({
      error,
      componentStack,
      details,
      title: "Promise Rejection",
      message: error.message
    });
  };

  handleReset = () => {
    this.setState({
      error: null,
      componentStack: "",
      details: {},
      title: "Application Error",
      message: ""
    });
  };

  render() {
    if (this.state.error) {
      return (
        <DebugErrorPanel
          title={this.state.title}
          message={this.state.message}
          error={this.state.error}
          componentStack={this.state.componentStack}
          details={this.state.details}
          onRetry={this.handleReset} />);

    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
