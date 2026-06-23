import axios from "axios";
import { BASE_URL } from "./config";
import { sortNestedCollectionsByRecency } from "../utils/collections";
import { getStoredToken } from "../utils/authStorage";
 
import {
  handleAutoLogout,
  isSessionExpired,
} from "../utils/sessionManager";
 
import {
  endPerformanceTimer,
  startPerformanceTimer,
} from "../utils/performance";
 
const api = axios.create({
  baseURL: BASE_URL,
 
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});
 
const inFlightGetRequests = new Map();
 
// =========================
// STABLE SERIALIZE
// =========================
const stableSerialize = (value) => {
  if (!value) {
    return "";
  }
 
  if (value instanceof URLSearchParams) {
    return value.toString();
  }
 
  if (Array.isArray(value)) {
    return `[${value
      .map(stableSerialize)
      .join(",")}]`;
  }
 
  if (typeof value === "object") {
    return JSON.stringify(
      Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = value[key];
          return acc;
        }, {})
    );
  }
 
  return String(value);
};
 
// =========================
// REQUEST KEY
// =========================
const getRequestKey = (
  url,
  config = {}
) => {
 
  if (
    config.signal ||
    (
      config.responseType &&
      config.responseType !== "json"
    )
  ) {
    return null;
  }
 
  return `${url}?${stableSerialize(
    config.params
  )}`;
};
 
// =========================
// DEDUPE GET REQUESTS
// =========================
const originalGet =
  api.get.bind(api);
 
api.get = (
  url,
  config = {}
) => {
 
  const requestKey =
    config.dedupe === false
      ? null
      : getRequestKey(
          url,
          config
        );
 
  if (!requestKey) {
    return originalGet(
      url,
      config
    );
  }
 
  if (
    inFlightGetRequests.has(
      requestKey
    )
  ) {
    return inFlightGetRequests.get(
      requestKey
    );
  }
 
  const request =
    originalGet(
      url,
      config
    ).finally(() => {
 
      inFlightGetRequests.delete(
        requestKey
      );
 
    });
 
  inFlightGetRequests.set(
    requestKey,
    request
  );
 
  return request;
};
 
// =========================
// AUTH ERROR MESSAGE
// =========================
const getAuthErrorMessage = (
  data
) => {
 
  if (
    typeof data === "string"
  ) {
    return data;
  }
 
  return [
    data?.message,
    data?.error,
    data?.title,
    data?.detail,
  ]
    .filter(Boolean)
    .join(" ");
};
 
// =========================
// TOKEN EXPIRED
// =========================
const hasExpiredTokenMessage =
  (data) =>
    /token\s+expired|expired\s+token|jwt\s+expired/i.test(
      getAuthErrorMessage(data)
    );
 
// =========================
// FORCE LOGOUT
// =========================
const shouldForceLogout = (
  config,
  status,
  data
) =>
 
  !config?.skipAuth &&
  getStoredToken() &&
  (
    status === 401 ||
    hasExpiredTokenMessage(data)
  );
 
// =========================
// REQUEST INTERCEPTOR
// =========================
api.interceptors.request.use(
 
  (config) => {
 
    const token =
      getStoredToken();
 
    const method =
      (
        config.method ||
        "get"
      ).toUpperCase();
 
    const url =
      config.url || "";
 
    config.metadata = {
      ...(config.metadata || {}),
 
      performanceLabel:
        `api:${method}:${url}`,
    };
 
    startPerformanceTimer(
      config.metadata
        .performanceLabel
    );
 
    if (
      !config.skipAuth &&
      token
    ) {
 
      if (
        isSessionExpired()
      ) {
 
        handleAutoLogout();
 
        endPerformanceTimer(
          config.metadata
            .performanceLabel
        );
 
        return Promise.reject(
          new axios.CanceledError(
            "Session expired"
          )
        );
      }
 
      config.headers.Authorization =
        `Bearer ${token}`;
    }
 
    return config;
  },
 
  (error) =>
    Promise.reject(error)
);
 
// =========================
// RESPONSE INTERCEPTOR
// =========================
api.interceptors.response.use(
 
  // SUCCESS
  (response) => {
 
    endPerformanceTimer(
      response?.config?.metadata
        ?.performanceLabel
    );
 
    const responseType =
      response?.config
        ?.responseType;
 
    if (
      responseType &&
      responseType !== "json"
    ) {
 
      return response;
    }
 
    if (
      shouldForceLogout(
        response?.config,
        response?.status,
        response?.data
      )
    ) {
 
      handleAutoLogout();
 
      window.location.href =
        "/login";
 
      return Promise.reject(
        new axios.CanceledError(
          "Session expired"
        )
      );
    }
 
    response.data =
      sortNestedCollectionsByRecency(
        response.data
      );
 
    return response;
  },
 
  // ERROR
  (error) => {
 
    const config =
      error?.config ||
      error?.response?.config ||
      {};
 
    const status =
      error?.response?.status;
 
    const data =
      error?.response?.data;
 
    endPerformanceTimer(
      config?.metadata
        ?.performanceLabel
    );
 
    // =========================
    // AUTO LOGOUT + LOGIN PAGE
    // =========================
    if (
      shouldForceLogout(
        config,
        status,
        data
      ) ||
      status === 401 ||
      status === 403 ||
      status === 500
    ) {
 
      handleAutoLogout();
 
      localStorage.clear();
 
      sessionStorage.clear();
 
      window.location.href =
        "/login";
    }
 
    return Promise.reject(
      error
    );
  }
);
 
export default api;
 