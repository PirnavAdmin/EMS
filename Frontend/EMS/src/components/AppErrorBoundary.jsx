import React from "react";
import DebugErrorPanel from "./DebugErrorPanel";
import {
  APPLICATION_ERROR_EVENT,
} from "../utils/errorReporting";

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

const logBoundaryError = (label, error, extra = {}) => {
  console.error(label, error);

  if (Object.keys(extra).length > 0) {
    console.error(`${label} Details:`, extra);
  }

  console.trace();
};

class AppErrorBoundary extends React.Component {
  state = {
    error: null,
    componentStack: "",
    details: {},
    title: "Application Error",
    message: "",
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
    logBoundaryError("React Error:", error, {
      componentStack: errorInfo?.componentStack || error.stack || "",
      routeName: typeof window !== "undefined" ? window.location.pathname : "",
      currentUrl: typeof window !== "undefined" ? window.location.href : "",
    });

    this.setState({
      error,
      componentStack: errorInfo?.componentStack || error.stack || "",
      details: {
        routeName: window.location.pathname,
        currentUrl: window.location.href,
      },
      title: "JavaScript Error",
      message: error.message || "A runtime error occurred.",
    });
  }

  handleApplicationError = (event) => {
    const detail = event?.detail || {};
    const error = toErrorObject(detail.error) || new Error(detail.message);

    logBoundaryError("Application Error:", error, {
      ...detail.meta,
      componentStack: detail.componentStack || error.stack || "",
    });

    this.setState({
      error,
      componentStack: detail.componentStack || detail.error?.stack || "",
      details: detail.meta || {},
      title: detail.title || "Application Error",
      message: detail.message || error.message,
    });
  };

  handleWindowError = (event) => {
    if (this.state.error) {
      return;
    }

    const error = toErrorObject(event?.error) || new Error(event?.message || "Unknown error");

    logBoundaryError("JavaScript Error:", error, {
      message: event?.message || error.message,
      filename: event?.filename || "",
      lineno: event?.lineno || "",
      colno: event?.colno || "",
    });

    this.setState({
      error,
      componentStack: error.stack || "",
      details: {
        routeName: window.location.pathname,
        currentUrl: window.location.href,
      },
      title: "JavaScript Error",
      message: error.message,
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

    logBoundaryError("Promise Rejection:", error, {
      reason: typeof reason === "string" ? reason : "",
    });

    this.setState({
      error,
      componentStack: error.stack || "",
      details: {
        routeName: window.location.pathname,
        currentUrl: window.location.href,
      },
      title: "Promise Rejection",
      message: error.message,
    });
  };

  handleReset = () => {
    this.setState({
      error: null,
      componentStack: "",
      details: {},
      title: "Application Error",
      message: "",
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
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
