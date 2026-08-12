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

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    ...config,
    headers,
  };
};
