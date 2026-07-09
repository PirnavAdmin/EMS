import axios from "axios";
import { BASE_URL } from "./config";
import { sortNestedCollectionsByRecency } from "../utils/collections";
import { getStoredToken } from "../utils/authStorage";
import { isAuthenticationFailureResponse } from "../utils/authorization";

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
// FORCE LOGOUT
// =========================
const shouldForceLogout = (
  config,
  status,
  data
) =>

  !config?.skipAuth &&
  getStoredToken() &&
  isAuthenticationFailureResponse(status, data);
 
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
        endPerformanceTimer(
          config.metadata
            .performanceLabel
        );

        handleAutoLogout({
          reason: "Session expired before API request",
        });
 
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
      handleAutoLogout({
        reason: "Authentication failure response",
      });

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

    if (
      shouldForceLogout(
        config,
        status,
        data
      )
    ) {
      handleAutoLogout({
        reason: `Auth failure response (${status || "unknown status"})`,
      });
    }

    return Promise.reject(
      error
    );
  }
);
 
export default api;
 
