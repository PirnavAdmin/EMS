import axios from "axios";
import { BASE_URL } from "./config";
import { sortNestedCollectionsByRecency } from "../utils/collections";
import {
  getStoredJwtRole,
  getStoredRole,
  getStoredRoleName,
  getStoredToken } from
"../utils/authStorage";
import { isAuthenticationFailureResponse } from "../utils/authorization";

import {
  handleAutoLogout,
  isSessionExpired } from
"../utils/sessionManager";

import {
  endPerformanceTimer,
  startPerformanceTimer } from
"../utils/performance";

const api = axios.create({
  baseURL: BASE_URL,

  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true"
  }
});

const inFlightGetRequests = new Map();
const cachedGetResponses = new Map();
let cacheGeneration = 0;

const DEFAULT_GET_CACHE_RULES = [
  { prefix: "/admin-notifications", ttl: 15 * 1000 },
  { prefix: "/user-notifications", ttl: 15 * 1000 },
  { prefix: "/attendance", ttl: 15 * 1000 },
  { prefix: "/dashboard", ttl: 30 * 1000 },
  { prefix: "/user-dashboard", ttl: 30 * 1000 },
  { prefix: "/superadmin/dashboard", ttl: 30 * 1000 },
  { prefix: "/permission", ttl: 60 * 1000 },
  { prefix: "/rolepermission", ttl: 60 * 1000 },
  { prefix: "/userpermission", ttl: 60 * 1000 },
  { prefix: "/adminpermission", ttl: 60 * 1000 },
  { prefix: "/adminsubscription", ttl: 60 * 1000 },
  { prefix: "/admin", ttl: 60 * 1000 },
  { prefix: "/employees", ttl: 60 * 1000 },
  { prefix: "/employeefulldetail", ttl: 60 * 1000 },
  { prefix: "/employeepersonalinfo", ttl: 60 * 1000 },
  { prefix: "/employeebankdetails", ttl: 60 * 1000 },
  { prefix: "/employeesalarystructure", ttl: 60 * 1000 },
  { prefix: "/employeeeducation", ttl: 60 * 1000 },
  { prefix: "/employeeexperience", ttl: 60 * 1000 },
  { prefix: "/employeedocuments", ttl: 60 * 1000 },
  { prefix: "/departments", ttl: 60 * 1000 },
  { prefix: "/roles", ttl: 60 * 1000 },
  { prefix: "/clients", ttl: 60 * 1000 },
  { prefix: "/projects", ttl: 60 * 1000 },
  { prefix: "/company", ttl: 60 * 1000 },
  { prefix: "/branches", ttl: 60 * 1000 },
  { prefix: "/holidays", ttl: 5 * 60 * 1000 },
  { prefix: "/team", ttl: 60 * 1000 },
  { prefix: "/leavebalance", ttl: 30 * 1000 },
  { prefix: "/employeeleave", ttl: 30 * 1000 },
  { prefix: "/ticket", ttl: 30 * 1000 },
  { prefix: "/payslip", ttl: 30 * 1000 },
  { prefix: "/offerletter", ttl: 60 * 1000 },
  { prefix: "/relievingletter", ttl: 60 * 1000 },
  { prefix: "/experienceofferletter", ttl: 60 * 1000 },
  { prefix: "/template", ttl: 60 * 1000 },
  { prefix: "/workflow", ttl: 60 * 1000 },
  { prefix: "/appraisal", ttl: 60 * 1000 },
  { prefix: "/employeeclearance", ttl: 60 * 1000 },
  { prefix: "/employeegoal", ttl: 60 * 1000 },
  { prefix: "/employeeresignation", ttl: 60 * 1000 },
  { prefix: "/employeeshift", ttl: 60 * 1000 },
  { prefix: "/employeeweeklyoff", ttl: 60 * 1000 },
  { prefix: "/exitinterview", ttl: 60 * 1000 },
  { prefix: "/fullfinalsettlement", ttl: 60 * 1000 },
  { prefix: "/goalreview", ttl: 60 * 1000 },
  { prefix: "/performancecycle", ttl: 60 * 1000 },
  { prefix: "/shift", ttl: 60 * 1000 },
  { prefix: "/taxdeclaration", ttl: 60 * 1000 },
  { prefix: "/taxdeclarationitem", ttl: 60 * 1000 },
  { prefix: "/taxproof", ttl: 60 * 1000 },
  { prefix: "/tds", ttl: 60 * 1000 },
  { prefix: "/form16", ttl: 60 * 1000 },
  { prefix: "/onboardingpersonalinfo", ttl: 60 * 1000 },
  { prefix: "/onboardingeducation", ttl: 60 * 1000 },
  { prefix: "/onboardingexperience", ttl: 60 * 1000 },
  { prefix: "/onboardingdocuments", ttl: 60 * 1000 },
  { prefix: "/agreement", ttl: 60 * 1000 },
  { prefix: "/reports", ttl: 60 * 1000 },
  { prefix: "/modulesearch", ttl: 15 * 1000 },
];

const normalizeCachePath = (url) => {
  const normalizedUrl = String(url || "")
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .split("?")[0]
    .replace(/^\/api(?=\/|$)/i, "")
    .replace(/\/{2,}/g, "/")
    .toLowerCase();

  return normalizedUrl;
};

const resolveDefaultCacheTTL = (url) => {
  const normalizedPath = normalizeCachePath(url);

  if (!normalizedPath) {
    return 0;
  }

  for (const rule of DEFAULT_GET_CACHE_RULES) {
    if (normalizedPath.startsWith(rule.prefix)) {
      return rule.ttl;
    }
  }

  return 0;
};

const invalidateGetRequestCaches = () => {
  cacheGeneration += 1;
  inFlightGetRequests.clear();
  cachedGetResponses.clear();
};

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("ems-auth-cleared", invalidateGetRequestCaches);
}

const getAuthScopeKey = () => {
  const token = getStoredToken();
  const role =
    getStoredJwtRole() ||
    getStoredRoleName() ||
    getStoredRole() ||
    "";

  return `${String(token || "").trim()}|${String(role || "").trim()}`;
};

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
    return `[${value.
    map(stableSerialize).
    join(",")}]`;
  }

  if (typeof value === "object") {
    return JSON.stringify(
      Object.keys(value).
      sort().
      reduce((acc, key) => {
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
config = {},
{ allowSignal = false } = {}) =>
{

  if (
  !allowSignal &&
  config.signal ||

  config.responseType &&
  config.responseType !== "json")

  {
    return null;
  }

  return `${getAuthScopeKey()}::${url}?${stableSerialize(
    config.params
  )}`;
};

const cloneCachedResponse = (response) => ({
  ...response,
  data: response?.data
});

// =========================
// DEDUPE GET REQUESTS
// =========================
const originalGet =
api.get.bind(api);

api.get = (
url,
config = {}) =>
{
  const hasExplicitCacheTTL = config.cacheTTL !== undefined;
  const explicitCacheTTL = Number(config.cacheTTL || 0);
  const cacheTTL = hasExplicitCacheTTL ?
  explicitCacheTTL :
  resolveDefaultCacheTTL(url);
  const useCache = Number.isFinite(cacheTTL) && cacheTTL > 0;
  const requestGeneration = cacheGeneration;

  const requestKey =
  config.dedupe === false && !useCache ?
  null :
  getRequestKey(
    url,
    config,
    {
      allowSignal: useCache
    }
  );

  if (
  useCache &&
  requestKey)
  {

    const cachedResponse =
    cachedGetResponses.get(requestKey);

    if (
    cachedResponse &&
    cachedResponse.generation === requestGeneration &&
    cachedResponse.expiresAt > Date.now())
    {
      return Promise.resolve(
        cloneCachedResponse(
          cachedResponse.response
        )
      );
    }
  }

  if (!requestKey) {
    return originalGet(
      url,
      config
    );
  }

  if (
  inFlightGetRequests.has(
    requestKey
  ))
  {
    return inFlightGetRequests.get(
      requestKey
    );
  }

  const request =
  originalGet(
    url,
    config
  ).then((response) => {

    if (useCache && requestKey) {
      if (requestGeneration !== cacheGeneration) {
        return response;
      }

      cachedGetResponses.set(
        requestKey,
        {
          response: cloneCachedResponse(response),
          expiresAt: Date.now() + cacheTTL,
          generation: requestGeneration
        }
      );
    }

    return response;

  }).finally(() => {

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
data) =>

!config?.skipAuth &&
!config?.skipAuthFailureHandling &&
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
    "get").
    toUpperCase();

    const url =
    config.url || "";

    if (!config.headers) {
      config.headers = {};
    }

    if (token) {
      if (typeof config.headers.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    config.metadata = {
      ...(config.metadata || {}),

      performanceLabel:
      `api:${method}:${url}`
    };

    startPerformanceTimer(
      config.metadata.
      performanceLabel
    );

    if (
    !config.skipAuth &&
    token)
    {

    if (
      isSessionExpired())
      {
        endPerformanceTimer(
          config.metadata.
          performanceLabel
        );

        invalidateGetRequestCaches();
        handleAutoLogout({
          reason: "Session expired before API request"
        });

        return Promise.reject(
          new axios.CanceledError(
            "Session expired"
          )
        );
      }
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
      response?.config?.metadata?.
      performanceLabel
    );

    const responseMethod =
    String(response?.config?.method || "").toLowerCase();

    if (responseMethod && responseMethod !== "get" && responseMethod !== "head") {
      invalidateGetRequestCaches();
    }

    if (
    shouldForceLogout(
      response?.config,
      response?.status,
      response?.data
    ))
    {
      invalidateGetRequestCaches();
      handleAutoLogout({
        reason: "Authentication failure response"
      });

      return Promise.reject(
        new axios.CanceledError(
          "Session expired"
        )
      );
    }

    const responseType =
    response?.config?.
    responseType;

    if (
    responseType &&
    responseType !== "json")
    {
      return response;
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
      config?.metadata?.
      performanceLabel
    );

    if (error?.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

  if (
  shouldForceLogout(
    config,
    status,
    data
  ))
  {
    invalidateGetRequestCaches();
    handleAutoLogout({
      reason: `Auth failure response (${status || "unknown status"})`
    });
  }

    return Promise.reject(
      error
    );
  }
);

export default api;
