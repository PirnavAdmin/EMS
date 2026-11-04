const CHUNK_LOAD_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to load module script/i,
  /ChunkLoadError/i,
  /dynamically imported module/i,
];

const CHUNK_RELOAD_SESSION_KEY = "ems:last-chunk-reload-at";
const CHUNK_RELOAD_COOLDOWN_MS = 5 * 60 * 1000;

const toErrorMessage = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name || "Error"}: ${value.message || ""}\n${value.stack || ""}`;
  }

  if (typeof value === "object") {
    return [
      value.message,
      value.reason?.message,
      value.error?.message,
      value.filename,
      value.stack,
      value.type,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return String(value);
};

export const isChunkLoadError = (value) => {
  const message = toErrorMessage(value);

  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

export const recoverFromChunkLoadError = (value) => {
  if (typeof window === "undefined" || !isChunkLoadError(value)) {
    return false;
  }

  const currentUrl = window.location.href;
  const now = Date.now();

  try {
    const lastAttempt = Number(
      window.sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) || "0"
    );

    if (Number.isFinite(lastAttempt) && lastAttempt > 0 && now - lastAttempt < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, String(now));
  } catch {
    // Best effort only. If storage is unavailable, still attempt a single reload.
  }

  window.setTimeout(() => {
    window.location.replace(currentUrl);
  }, 0);

  return true;
};
