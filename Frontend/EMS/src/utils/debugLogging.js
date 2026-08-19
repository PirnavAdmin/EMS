const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|token|secret|authorization|bearer|refresh|access[_-]?token|api[_-]?key|client[_-]?secret)/i;

const tryParseJson = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const summarizeHeaders = (headers) => {
  if (!headers) {
    return {};
  }

  if (typeof headers.toJSON === "function") {
    return headers.toJSON();
  }

  return headers;
};

export const sanitizeForDebug = (value, seen = new WeakSet(), key = "") => {
  if (SENSITIVE_KEY_PATTERN.test(String(key))) {
    return REDACTED_VALUE;
  }

  if (value === null || value === undefined) {
    return value;
  }

  const valueType = typeof value;

  if (
    valueType === "string" ||
    valueType === "number" ||
    valueType === "boolean" ||
    valueType === "bigint"
  ) {
    if (
      (key === "data" || key === "body" || key === "payload") &&
      valueType === "string"
    ) {
      const parsedValue = tryParseJson(value);

      if (parsedValue !== null) {
        return sanitizeForDebug(parsedValue, seen, key);
      }
    }

    return value;
  }

  if (valueType === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof URLSearchParams) {
    return value.toString();
  }

  if (!isPlainObject(value) && !Array.isArray(value)) {
    return String(value);
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForDebug(item, seen));
  }

  const output = {};

  Object.entries(value).forEach(([nestedKey, nestedValue]) => {
    if (nestedKey === "headers") {
      output[nestedKey] = sanitizeForDebug(summarizeHeaders(nestedValue), seen, nestedKey);
      return;
    }

    output[nestedKey] = sanitizeForDebug(nestedValue, seen, nestedKey);
  });

  return output;
};

export const summarizeAxiosResponse = (response) => {
  if (!response) {
    return null;
  }

  return {
    status: response?.status,
    statusText: response?.statusText,
    headers: sanitizeForDebug(summarizeHeaders(response?.headers)),
    config: sanitizeForDebug({
      url: response?.config?.url,
      method: response?.config?.method,
      baseURL: response?.config?.baseURL,
      params: response?.config?.params,
      data: response?.config?.data,
    }),
    data: sanitizeForDebug(response?.data),
  };
};

export const logApiError = () => {};

export const logAuthStorageSnapshot = () => {};

export const describePermissionForLog = (permission = {}) => ({
  module:
    permission?.module ??
    permission?.Module ??
    permission?.moduleId ??
    permission?.ModuleId ??
    permission?.screenId ??
    permission?.ScreenId ??
    "",
  moduleName: permission?.moduleName ?? permission?.ModuleName ?? "",
  permission:
    permission?.permission ??
    permission?.Permission ??
    permission?.type ??
    permission?.Type ??
    "",
  canView: Boolean(permission?.canView ?? permission?.CanView ?? false),
  canCreate: Boolean(
    permission?.canCreate ??
      permission?.CanCreate ??
      permission?.canAdd ??
      permission?.CanAdd ??
      false
  ),
  canEdit: Boolean(permission?.canEdit ?? permission?.CanEdit ?? false),
  canDelete: Boolean(permission?.canDelete ?? permission?.CanDelete ?? false),
  canAccess: Boolean(permission?.canAccess ?? permission?.CanAccess ?? false),
});

export const logPermissionCollection = () => {};
