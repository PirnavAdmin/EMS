// Optimization: keep performance timings available
// without flooding production logs by default.

const activeTimers = new Set();

export const isPerformanceLoggingEnabled = () =>
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_PERF_LOGS === "true";

// START TIMER
export const startPerformanceTimer = (label) => {

  if (
    !isPerformanceLoggingEnabled() ||
    typeof console === "undefined"
  ) {
    return;
  }

  // REMOVE DUPLICATE TIMER WARNING
  if (activeTimers.has(label)) {
    activeTimers.delete(label);
  }

  activeTimers.add(label);

  console.time(label);
};

// END TIMER
export const endPerformanceTimer = (label) => {

  if (
    !isPerformanceLoggingEnabled() ||
    typeof console === "undefined"
  ) {
    return;
  }

  // IGNORE MISSING TIMER
  if (!activeTimers.has(label)) {
    return;
  }

  activeTimers.delete(label);

  console.timeEnd(label);
};

// ERROR LOG
export const logPerformanceError = (...args) => {

  if (
    !isPerformanceLoggingEnabled() ||
    typeof console === "undefined"
  ) {
    return;
  }

  console.error(...args);
};

// WARNING LOG
export const logPerformanceWarning = (...args) => {

  if (
    !isPerformanceLoggingEnabled() ||
    typeof console === "undefined"
  ) {
    return;
  }

  console.warn(...args);
};