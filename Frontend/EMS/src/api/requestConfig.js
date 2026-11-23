import { getStoredToken } from "../utils/authStorage";

const toPlainHeaders = (headers) => {
  if (!headers) {
    return {};
  }

  if (typeof headers.toJSON === "function") {
    return headers.toJSON();
  }

  return { ...headers };
};

export const withAuthHeaders = (config = {}) => {
  const token = getStoredToken();
  const headers = toPlainHeaders(config.headers);
  const hasHeader = (name) =>
    Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());

  if (token && !hasHeader("Authorization")) {
    headers.Authorization = `Bearer ${token}`;
  }

  const organizationCode =
    typeof window !== "undefined"
      ? String(window.localStorage?.getItem("organizationCode") || "").trim()
      : "";

  if (organizationCode && !hasHeader("X-Organization-Code")) {
    headers["X-Organization-Code"] = organizationCode;
  }

  return {
    ...config,
    headers,
  };
};
