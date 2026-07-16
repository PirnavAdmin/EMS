/**
 * gpsLocation.js
 * -------------------------------------------------------------------------
 * Browser-only live GPS acquisition for attendance capture.
 *
 * Rules:
 *  - Start geolocation only after a user action.
 *  - Use watchPosition only.
 *  - Collect live readings for up to 20 seconds.
 *  - Prefer at least 10 accepted readings whenever possible.
 *  - Remove stale, invalid, and obvious outlier readings.
 *  - Cluster nearby coordinates and select the strongest cluster.
 * -------------------------------------------------------------------------
 */

// --- GPS ACCURACY CONFIG ---
export const GPS_CONFIG = {
  EXCELLENT_ACCURACY_M: 100, // <= 100m -> excellent
  GOOD_ACCURACY_M: 200, // <= 200m -> good
  ACCEPTABLE_ACCURACY_M: 300, // <= 300m -> acceptable
  MAX_ATTEMPTS: 5, // Legacy compatibility; kept unchanged
  RETRY_DELAY_MS: 3000, // Legacy compatibility; kept unchanged
  TIMEOUT_MS: 45000,
};

const ACQUISITION_WINDOW_MS = 20000;
const MIN_READINGS_TARGET = 10;
const CLUSTER_DISTANCE_MIN_M = 120;
const CLUSTER_DISTANCE_MAX_M = 400;
const FINAL_ACCURACY_WARNING =
  "Unable to obtain an accurate location within 300 meters. Please move to an open area, enable Windows Location Services or GPS, and try again.";

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const createLocationError = (code, message) => {
  const error = new Error(message || code);
  
  error.code = code;
  return error;
};

const summarizeError = (error) => ({
  name: error?.name,
  code: error?.code,
  message: error?.message,
});

const summarizeReading = (reading) =>
  reading
    ? {
        latitude: reading.latitude,
        longitude: reading.longitude,
        accuracy: reading.accuracy,
        timestamp: reading.timestamp,
        speed: reading.speed,
        heading: reading.heading,
        ...(reading.reason ? { reason: reading.reason } : {}),
      }
    : null;

const summarizePosition = (position) => {
  const coords = position?.coords || {};

  return {
    latitude: coords.latitude ?? null,
    longitude: coords.longitude ?? null,
    accuracy: coords.accuracy ?? null,
    timestamp: position?.timestamp ?? null,
    speed: coords.speed ?? null,
    heading: coords.heading ?? null,
  };
};

const buildReading = ({
  latitude,
  longitude,
  accuracy,
  timestamp,
  speed = null,
  heading = null,
}) => ({
  latitude,
  longitude,
  accuracy,
  timestamp,
  speed: speed ?? null,
  heading: heading ?? null,
});

const validateReadingShape = (reading) => {
  if (
    !reading ||
    !isFiniteNumber(reading.latitude) ||
    !isFiniteNumber(reading.longitude) ||
    !isFiniteNumber(reading.accuracy) ||
    !isFiniteNumber(reading.timestamp) ||
    reading.latitude < -90 ||
    reading.latitude > 90 ||
    reading.longitude < -180 ||
    reading.longitude > 180 ||
    reading.latitude === 0 ||
    reading.longitude === 0 ||
    reading.timestamp <= 0 ||
    reading.accuracy < 0
  ) {
    throw createLocationError(
      "INVALID_READING",
      "Invalid GPS reading received."
    );
  }
};

const normalizeReadingFromPosition = (position) => {
  const coords = position?.coords || {};

  const reading = buildReading({
    latitude: Number(coords.latitude),
    longitude: Number(coords.longitude),
    accuracy: Number(coords.accuracy),
    timestamp: Number(position?.timestamp ?? Date.now()),
    speed: coords.speed ?? null,
    heading: coords.heading ?? null,
  });

  validateReadingShape(reading);
  return reading;
};

const normalizeGeolocationError = (error) => {
  if (!error) {
    return createLocationError(
      3,
      "Location request timed out. Please try again."
    );
  }

  if (error.code === "UNSUPPORTED") {
    return error;
  }

  if (error.code === 1 || error.code === 2 || error.code === 3) {
    return error;
  }

  if (
    error.code === "PERMISSION_DENIED" ||
    error.name === "NotAllowedError" ||
    error.name === "SecurityError" ||
    /permission/i.test(error.message || "")
  ) {
    return createLocationError(
      1,
      "Location permission is required to mark attendance."
    );
  }

  if (
    error.code === "POSITION_UNAVAILABLE" ||
    error.name === "NotFoundError" ||
    /unavailable|disabled|gps/i.test(error.message || "")
  ) {
    return createLocationError(
      2,
      "Unable to retrieve GPS location. Please ensure GPS is enabled."
    );
  }

  if (error.code === "TIMEOUT" || error.name === "TimeoutError") {
    return createLocationError(
      3,
      "Location request timed out. Please try again."
    );
  }

  return createLocationError(
    2,
    "Unable to retrieve GPS location. Please ensure GPS is enabled."
  );
};

const toRadians = (value) => (value * Math.PI) / 180;

const distanceMeters = (a, b) => {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinDeltaLat = Math.sin(deltaLat / 2);
  const sinDeltaLng = Math.sin(deltaLng / 2);
  const haversine =
    sinDeltaLat * sinDeltaLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDeltaLng * sinDeltaLng;

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(haversine)));
};

const median = (values) => {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

const deriveClusterThresholdMeters = (readings) => {
  const accuracies = readings
    .map((reading) => reading.accuracy)
    .filter((value) => isFiniteNumber(value) && value >= 0);

  if (!accuracies.length) {
    return CLUSTER_DISTANCE_MIN_M;
  }

  const dynamicThreshold = median(accuracies) * 1.5;
  return Math.max(
    CLUSTER_DISTANCE_MIN_M,
    Math.min(CLUSTER_DISTANCE_MAX_M, dynamicThreshold)
  );
};

const clusterReadings = (readings, thresholdMeters) => {
  const visited = new Array(readings.length).fill(false);
  const clusters = [];

  for (let i = 0; i < readings.length; i += 1) {
    if (visited[i]) continue;

    const stack = [i];
    visited[i] = true;
    const cluster = [];

    while (stack.length) {
      const index = stack.pop();
      cluster.push(readings[index]);

      for (let j = 0; j < readings.length; j += 1) {
        if (visited[j]) continue;
        if (distanceMeters(readings[index], readings[j]) <= thresholdMeters) {
          visited[j] = true;
          stack.push(j);
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
};

const scoreCluster = (cluster) => {
  const accuracyValues = cluster.map((reading) => reading.accuracy);
  const timestampValues = cluster.map((reading) => reading.timestamp);
  const centroid = {
    latitude:
      cluster.reduce((sum, reading) => sum + reading.latitude, 0) /
      cluster.length,
    longitude:
      cluster.reduce((sum, reading) => sum + reading.longitude, 0) /
      cluster.length,
  };

  const spread = cluster.reduce((maxDistance, reading) => {
    const nextDistance = distanceMeters(reading, centroid);
    return Math.max(maxDistance, nextDistance);
  }, 0);

  return {
    size: cluster.length,
    minAccuracy: Math.min(...accuracyValues),
    averageAccuracy:
      accuracyValues.reduce((sum, value) => sum + value, 0) / cluster.length,
    latestTimestamp: Math.max(...timestampValues),
    spread,
    centroid,
  };
};

function selectBestReadingFromReadings(readings) {
  if (!readings.length) {
    return {
      selectedReading: null,
      selectedCluster: [],
      ignoredReadings: [],
      clusterThresholdMeters: CLUSTER_DISTANCE_MIN_M,
      clusters: [],
    };
  }

  if (readings.length === 1) {
    return {
      selectedReading: readings[0],
      selectedCluster: readings,
      ignoredReadings: [],
      clusterThresholdMeters: CLUSTER_DISTANCE_MIN_M,
      clusters: [
        {
          cluster: readings,
          score: scoreCluster(readings),
        },
      ],
    };
  }

  const clusterThresholdMeters = deriveClusterThresholdMeters(readings);
  const clusters = clusterReadings(readings, clusterThresholdMeters)
    .map((cluster) => ({
      cluster,
      score: scoreCluster(cluster),
    }))
    .sort((left, right) => {
      if (right.score.size !== left.score.size) {
        return right.score.size - left.score.size;
      }

      if (left.score.spread !== right.score.spread) {
        return left.score.spread - right.score.spread;
      }

      if (left.score.minAccuracy !== right.score.minAccuracy) {
        return left.score.minAccuracy - right.score.minAccuracy;
      }

      if (left.score.averageAccuracy !== right.score.averageAccuracy) {
        return left.score.averageAccuracy - right.score.averageAccuracy;
      }

      return right.score.latestTimestamp - left.score.latestTimestamp;
    });

  const selectedCluster = clusters[0]?.cluster || [];
  const selectedReading =
    selectedCluster
      .slice()
      .sort((left, right) => {
        if (left.accuracy !== right.accuracy) {
          return left.accuracy - right.accuracy;
        }

        return right.timestamp - left.timestamp;
      })[0] || null;

  const selectedSet = new Set(selectedCluster);
  const ignoredReadings = readings.filter((reading) => !selectedSet.has(reading));

  return {
    selectedReading,
    selectedCluster,
    ignoredReadings,
    clusterThresholdMeters,
    clusters,
  };
}

const evaluateReadingAcceptance = (reading, state) => {
  if (!reading) {
    return { accepted: false, reason: "invalid-reading" };
  }

  if (!isFiniteNumber(reading.timestamp) || reading.timestamp <= 0) {
    return { accepted: false, reason: "invalid-timestamp" };
  }

  if (reading.latitude === 0 || reading.longitude === 0) {
    return { accepted: false, reason: "zero-coordinate" };
  }

  if (
    state.seenTimestamps.has(reading.timestamp) ||
    reading.timestamp <= state.lastAcceptedTimestamp
  ) {
    return { accepted: false, reason: "stale-timestamp" };
  }

  return { accepted: true, reason: null };
};

const collectReadingsFromWatch = () =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const acceptedReadings = [];
    const ignoredReadings = [];
    const seenTimestamps = new Set();
    let lastAcceptedTimestamp = -Infinity;
    let watchId = null;
    let timerId = null;
    let finished = false;
    let stopReason = "window_elapsed";
    let lastError = null;

    const hasGeolocation =
      typeof navigator !== "undefined" &&
      navigator.geolocation &&
      typeof navigator.geolocation.watchPosition === "function" &&
      typeof navigator.geolocation.clearWatch === "function";

    const cleanup = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }

      if (
        watchId !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation &&
        typeof navigator.geolocation.clearWatch === "function"
      ) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }

      console.log("[GPS] GPS Stopped:", {
        reason: stopReason,
        timeTakenMs: Date.now() - startedAt,
        readingsCaptured: acceptedReadings.length,
      });
    };

    const finish = (reason) => {
      if (finished) return;
      finished = true;
      stopReason = reason;
      cleanup();
      resolve({
        readings: acceptedReadings,
        ignoredReadings,
        lastError,
        durationMs: Date.now() - startedAt,
        stopReason,
      });
    };

    const recordIgnoredReading = (reason, reading, extra = {}) => {
      const entry = {
        reason,
        reading: reading ? summarizeReading(reading) : null,
        ...extra,
      };

      ignoredReadings.push(entry);
      console.warn("[GPS] Ignored Outliers:", entry);
    };

    console.log("[GPS] GPS Started:", {
      mode: "watchPosition",
      windowMs: ACQUISITION_WINDOW_MS,
      timeoutMs: GPS_CONFIG.TIMEOUT_MS,
      highAccuracy: true,
      maximumAge: 0,
      targetReadings: MIN_READINGS_TARGET,
    });

    if (!hasGeolocation) {
      lastError = createLocationError(
        "UNSUPPORTED",
        "Geolocation is not supported by your browser."
      );
      finish("unsupported");
      return;
    }

    timerId = setTimeout(() => finish("window_elapsed"), ACQUISITION_WINDOW_MS);

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (finished) {
            return;
          }

          let reading;

          try {
            reading = normalizeReadingFromPosition(position);
          } catch (error) {
            const normalizedError = normalizeGeolocationError(error);
            lastError = normalizedError;
            recordIgnoredReading(
              "invalid-reading",
              summarizePosition(position),
              {
                error: summarizeError(normalizedError),
              }
            );
            return;
          }

          const evaluation = evaluateReadingAcceptance(reading, {
            seenTimestamps,
            lastAcceptedTimestamp,
          });

          if (!evaluation.accepted) {
            recordIgnoredReading(evaluation.reason, reading);
            return;
          }

          acceptedReadings.push(reading);
          seenTimestamps.add(reading.timestamp);
          lastAcceptedTimestamp = reading.timestamp;
          lastError = null;

          console.log("[GPS] Each Reading:", summarizeReading(reading));

          if (acceptedReadings.length === MIN_READINGS_TARGET) {
            console.log("[GPS] Minimum reading target reached.");
          }

          const currentSelection = selectBestReadingFromReadings(
            acceptedReadings
          );

          if (currentSelection.selectedReading) {
            console.log("[GPS] Current Best Candidate:", {
              clusterCount: currentSelection.clusters.length,
              clusterThresholdMeters: currentSelection.clusterThresholdMeters,
              selectedClusterScore: currentSelection.clusters[0]?.score || null,
              selectedReading: summarizeReading(
                currentSelection.selectedReading
              ),
            });
          }

          if (
            acceptedReadings.length >= MIN_READINGS_TARGET &&
            currentSelection.selectedReading &&
            currentSelection.selectedReading.accuracy <=
              GPS_CONFIG.ACCEPTABLE_ACCURACY_M
          ) {
            console.log(
              "[GPS] Final best location selected within acquisition window."
            );
            finish(
              currentSelection.selectedReading.accuracy <=
                GPS_CONFIG.EXCELLENT_ACCURACY_M
                ? "excellent_fix"
                : "acceptable_fix"
            );
          }
        },
        (error) => {
          if (finished) {
            return;
          }

          const normalizedError = normalizeGeolocationError(error);
          lastError = normalizedError;

          console.warn("[GPS] Watch error:", summarizeError(normalizedError));

          if (
            normalizedError.code === 1 ||
            normalizedError.code === "UNSUPPORTED"
          ) {
            finish(
              normalizedError.code === "UNSUPPORTED"
                ? "unsupported"
                : "permission_denied"
            );
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: GPS_CONFIG.TIMEOUT_MS,
        }
      );
    } catch (error) {
      lastError = normalizeGeolocationError(error);
      finish("fatal_error");
    }
  });

/**
 * Classifies an accuracy value (meters) into a validation tier.
 * Returns { tier, allowed, warning }.
 *
 *   <= 100m         -> excellent, allowed, no warning
 *   <= 200m         -> good, allowed, no warning
 *   <= 300m         -> acceptable, allowed, warning shown
 *   > 300m          -> poor, NOT allowed
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
    warning: FINAL_ACCURACY_WARNING,
  };
};

/** Maps browser geolocation errors to user-friendly messages. */
export const getGeolocationErrorMessage = (error) => {
  if (error?.code === "UNSUPPORTED") {
    return "Geolocation is not supported by your browser.";
  }

  if (error?.code === "GEOLOCATION_ACCURACY_UNAVAILABLE") {
    return FINAL_ACCURACY_WARNING;
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
 * Attempts to acquire the best possible live GPS fix.
 *
 * Behavior:
 *  - Uses watchPosition to collect a burst of live readings after click.
 *  - Stops after 20 seconds or when a stable <= 300m cluster is selected.
 *  - Clusters nearby coordinates and discards obvious outliers.
 *  - Selects the largest cluster and then the reading with the lowest
 *    accuracy from that cluster.
 *  - Returns the same stable attendance payload shape as before.
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
 * Throws only for unsupported browsers or unrecoverable permission errors
 * before any usable reading exists.
 */
export const acquireReliableLocation = async () => {
  const acquisition = await collectReadingsFromWatch();
  const {
    readings,
    ignoredReadings: ignoredDuringCollection = [],
    lastError,
    durationMs,
    stopReason,
  } = acquisition;

  const attemptsMade = readings.length;

  if (!readings.length) {
    if (lastError?.code === 1 || lastError?.code === "UNSUPPORTED") {
      throw lastError;
    }

    throw createLocationError(
      "GEOLOCATION_ACCURACY_UNAVAILABLE",
      FINAL_ACCURACY_WARNING
    );
  }

  const selection = selectBestReadingFromReadings(readings);
  const {
    selectedReading,
    selectedCluster,
    ignoredReadings: clusterIgnoredReadings,
    clusterThresholdMeters,
    clusters,
  } = selection;

  const ignoredOutliers = [
    ...ignoredDuringCollection,
    ...clusterIgnoredReadings.map((reading) => ({
      reason: "cluster-outlier",
      reading: summarizeReading(reading),
    })),
  ];

  console.log("[GPS] Selected Cluster:", {
    clusterCount: clusters.length,
    clusterThresholdMeters,
    selectedClusterScore: clusters[0]?.score || null,
    members: selectedCluster.map((reading) => summarizeReading(reading)),
  });

  if (ignoredOutliers.length) {
    console.warn("[GPS] Ignored Outliers:", ignoredOutliers);
  }

  if (!selectedReading) {
    throw createLocationError(
      "GEOLOCATION_ACCURACY_UNAVAILABLE",
      FINAL_ACCURACY_WARNING
    );
  }

  console.log("[GPS] Final Latitude:", selectedReading.latitude);
  console.log("[GPS] Final Longitude:", selectedReading.longitude);
  console.log("[GPS] Final Accuracy:", selectedReading.accuracy);
  console.log("[GPS] Time Taken:", `${durationMs}ms`);
  console.log("[GPS] Retry count:", attemptsMade);
  console.log("[GPS] Final selection stop reason:", stopReason);

  const { tier, allowed, warning } = classifyAccuracy(selectedReading.accuracy);

  return {
    latitude: selectedReading.latitude,
    longitude: selectedReading.longitude,
    accuracy: selectedReading.accuracy,
    timestamp: selectedReading.timestamp,
    tier,
    allowed,
    warning,
    attempts: attemptsMade,
  };
};
