/**
 * gpsLocation.js
 * -------------------------------------------------------------------------
 * Reusable, reliable GPS acquisition utility for attendance capture.
 *
 * Designed for enterprise HRMS use (1000+ concurrent users):
 *  - All work happens client-side (no extra backend load).
 *  - Retries automatically to avoid wildly inaccurate "city-swap" errors
 *    (e.g. Hyderabad being reported as Rajasthan due to a cold GPS fix,
 *    Wi-Fi/IP based fallback, or a stale cached position).
 *  - Always runs every configured attempt (unless an unrecoverable error
 *    occurs) and selects the single most accurate reading collected, since
 *    users are frequently indoors / in basements / in weak-signal office
 *    buildings where an early "good" fix can still be beaten by a later one.
 *  - Returns a single, predictable result shape so callers stay simple.
 * -------------------------------------------------------------------------
 */

// --- GPS ACCURACY CONFIG ---
export const GPS_CONFIG = {
  EXCELLENT_ACCURACY_M: 50,   // <= 50m  -> excellent, submit immediately
  GOOD_ACCURACY_M: 100,       // <= 100m -> good, submit normally
  ACCEPTABLE_ACCURACY_M: 500, // <= 500m -> acceptable, submit with warning
  MAX_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  TIMEOUT_MS: 30000,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wraps navigator.geolocation.getCurrentPosition in a Promise. */
const getPositionOnce = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: "UNSUPPORTED", message: "GEOLOCATION_NOT_SUPPORTED" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: GPS_CONFIG.TIMEOUT_MS,
        maximumAge: 0,
      }
    );
  });

/**
 * Classifies an accuracy value (meters) into a validation tier.
 * Returns { tier, allowed, warning }.
 *
 *   <= 50m          -> excellent, allowed, no warning
 *   <= 100m         -> good, allowed, no warning
 *   101m - 500m     -> acceptable, allowed, warning shown
 *   > 500m          -> poor, NOT allowed
 */
export const classifyAccuracy = (accuracy) => {
  if (accuracy <= GPS_CONFIG.EXCELLENT_ACCURACY_M) {
    return { tier: "excellent", allowed: true, warning: null };
  }
  if (accuracy <= GPS_CONFIG.GOOD_ACCURACY_M) {
    return { tier: "good", allowed: true, warning: null };
  }
  if (accuracy <= GPS_CONFIG.ACCEPTABLE_ACCURACY_M) {
    return {
      tier: "acceptable",
      allowed: true,
      warning:
        "GPS accuracy is lower than expected. Attendance has been recorded.",
    };
  }
  return {
    tier: "poor",
    allowed: false,
    warning:
      "Unable to obtain an accurate GPS location. Please move outdoors and enable Precise Location.",
  };
};

/** Maps browser geolocation errors to user-friendly messages. */
export const getGeolocationErrorMessage = (error) => {
  if (error?.code === "UNSUPPORTED") {
    return "Geolocation is not supported by your browser.";
  }
  switch (error?.code) {
    case 1: // PERMISSION_DENIED
      return "Location permission is required to mark attendance.";
    case 2: // POSITION_UNAVAILABLE
      return "Unable to retrieve GPS location. Please ensure GPS is enabled.";
    case 3: // TIMEOUT
      return "Location request timed out. Please try again.";
    default:
      return "Unable to obtain GPS location. Please try again.";
  }
};

/**
 * Attempts to acquire a reliable GPS fix.
 *
 * Behavior:
 *  - Requests position with enableHighAccuracy, timeout=30000, maximumAge=0.
 *  - Logs latitude, longitude, accuracy, timestamp, and attempt number for
 *    every attempt.
 *  - ALWAYS performs every configured attempt (MAX_ATTEMPTS = 3), waiting
 *    RETRY_DELAY_MS (2000ms) between attempts. It does NOT stop early just
 *    because a "good" reading was found - office buildings, basements, and
 *    other weak-signal environments mean a later attempt can still be more
 *    accurate than an earlier "good enough" one.
 *  - Tracks every reading and keeps the one with the lowest accuracy value
 *    (i.e. the most precise) across all attempts.
 *  - Only stops early for unrecoverable errors: permission denied, or
 *    geolocation unsupported. Recoverable errors (timeout, position
 *    unavailable) do not stop the retry loop.
 *  - After all attempts (or an unrecoverable error), the best reading
 *    collected is run through classifyAccuracy() and returned.
 *
 * Resolves with:
 *   {
 *     latitude, longitude, accuracy, timestamp,
 *     tier,      // "excellent" | "good" | "acceptable" | "poor"
 *     allowed,   // boolean - whether this reading may be submitted
 *     warning,   // string | null - message to show the user, if any
 *     attempts,  // number of attempts actually made
 *   }
 *
 * Throws only when NO reading could be obtained at all (e.g. permission
 * denied on the very first attempt, or geolocation unsupported). The thrown
 * error should be passed to getGeolocationErrorMessage() for display.
 */
export const acquireReliableLocation = async () => {
  let bestReading = null;
  let lastError = null;
  let attemptsMade = 0;

  for (let attempt = 1; attempt <= GPS_CONFIG.MAX_ATTEMPTS; attempt++) {
    attemptsMade = attempt;

    try {
      const position = await getPositionOnce();
      const { latitude, longitude, accuracy } = position.coords;
      const timestamp = position.timestamp || Date.now();

      // Required debug logging
      console.log(
        `[GPS] Attempt ${attempt}/${GPS_CONFIG.MAX_ATTEMPTS} -> ` +
        `Latitude: ${latitude}, Longitude: ${longitude}, ` +
        `Accuracy: ${accuracy}m, Timestamp: ${new Date(timestamp).toISOString()}`
      );

      if (!bestReading || accuracy < bestReading.accuracy) {
        bestReading = { latitude, longitude, accuracy, timestamp };
      }

      // NOTE: We intentionally do NOT break early on a "good" reading.
      // Enterprise HRMS usage includes basements, office buildings, and
      // other weak-signal environments where an early reading can look
      // acceptable but a later attempt is meaningfully more accurate.
      // All configured attempts are always executed (unless an
      // unrecoverable error occurs below), and the most accurate reading
      // among all of them is selected once the loop finishes.
    } catch (error) {
      console.error(`[GPS] Attempt ${attempt} failed:`, error);
      lastError = error;

      // Permission denied / unsupported won't improve with retries.
      if (error?.code === 1 || error?.code === "UNSUPPORTED") {
        break;
      }
    }

    if (attempt < GPS_CONFIG.MAX_ATTEMPTS) {
      await delay(GPS_CONFIG.RETRY_DELAY_MS);
    }
  }

  if (!bestReading) {
    // Never got a single successful reading.
    throw lastError || new Error("GEOLOCATION_UNAVAILABLE");
  }

  const { tier, allowed, warning } = classifyAccuracy(bestReading.accuracy);

  return { ...bestReading, tier, allowed, warning, attempts: attemptsMade };
};