import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import { getAuthenticatedUserSnapshot } from "../utils/authStorage";

const normalizeNotificationRole = (value) => {
  const normalized = String(value ?? "").
  trim().
  toLowerCase().
  replace(/[\s_-]+/g, "");

  if (!normalized) {
    return "";
  }

  if (normalized === "superadmin") {
    return "superadmin";
  }

  if (normalized === "admin") {
    return "admin";
  }

  if (["employee", "teacher", "student", "parent", "user"].includes(normalized)) {
    return "user";
  }

  return normalized;
};

const NOTIFICATION_CONFIGS = {
  admin: {
    label: "Admin",
    route: "/notifications",
    list: API_ENDPOINTS.notifications.admin,
    read: API_ENDPOINTS.notifications.adminRead,
    readAll: API_ENDPOINTS.notifications.adminReadAll,
    supportsNotifications: true
  },
  user: {
    label: "User",
    route: "/user-notifications",
    list: API_ENDPOINTS.notifications.user,
    read: API_ENDPOINTS.notifications.userRead,
    readAll: API_ENDPOINTS.notifications.userReadAll,
    supportsNotifications: true
  },
  superadmin: {
    label: "SuperAdmin",
    route: "/notifications",
    list: "",
    read: null,
    readAll: "",
    supportsNotifications: false
  }
};

const resolveNotificationConfig = (role) => {
  const normalizedRole = normalizeNotificationRole(role);

  if (normalizedRole === "superadmin") {
    return NOTIFICATION_CONFIGS.superadmin;
  }

  if (normalizedRole === "admin") {
    return NOTIFICATION_CONFIGS.admin;
  }

  return NOTIFICATION_CONFIGS.user;
};

const buildRequestConfig = (context) => {
  const headers = {};

  if (context.authorizationHeader) {
    headers.Authorization = context.authorizationHeader;
  }

  return {
    headers,
    skipAuthFailureHandling: true
  };
};

const getErrorMessage = (error) =>
error?.response?.data?.message ||
error?.response?.data?.error ||
error?.response?.data?.title ||
error?.response?.data ||
error?.message ||
"Notification request failed";

const logNotificationEvent = ({
  action,
  context,
  endpoint,
  phase,
  responseStatus,
  error
}) => {

  if (error) {

  }
};

export const getNotificationContext = (role, snapshot = getAuthenticatedUserSnapshot()) => {
  const resolvedRole = normalizeNotificationRole(role || snapshot.role || snapshot.roleName || "");
  const config = resolveNotificationConfig(resolvedRole);

  return {
    snapshot,
    resolvedRole,
    config,
    authorizationHeader: snapshot.token ? `Bearer ${snapshot.token}` : "",
    currentUser: snapshot.user || snapshot.payload || null,
    currentRole: snapshot.roleName || snapshot.role || resolvedRole || "",
    endpoint: config.list || "",
    route: config.route,
    label: config.label,
    supportsNotifications: Boolean(config.supportsNotifications && config.list),
    isReady: Boolean(snapshot.isReady)
  };
};

export const getNotificationEndpoint = (role, snapshot) =>
getNotificationContext(role, snapshot).endpoint;

export const getNotificationReadEndpoint = (role, notificationId, snapshot) => {
  const context = getNotificationContext(role, snapshot);

  if (!notificationId || typeof context.config.read !== "function") {
    return "";
  }

  return context.config.read(notificationId);
};

export const getNotificationReadAllEndpoint = (role, snapshot) =>
getNotificationContext(role, snapshot).config.readAll || "";

export const getNotificationRoute = (role, snapshot) =>
getNotificationContext(role, snapshot).route;

export const loadNotifications = async (role, snapshot) => {
  const context = getNotificationContext(role, snapshot);

  if (!context.isReady || !context.supportsNotifications || !context.endpoint) {
    logNotificationEvent({
      action: "fetch",
      context,
      endpoint: context.endpoint,
      phase: "skipped",
      responseStatus: "skipped"
    });
    return [];
  }

  logNotificationEvent({
    action: "fetch",
    context,
    endpoint: context.endpoint,
    phase: "request"
  });

  try {
    const response = await api.get(context.endpoint, buildRequestConfig(context));

    logNotificationEvent({
      action: "fetch",
      context,
      endpoint: context.endpoint,
      phase: "response",
      responseStatus: response.status
    });

    return extractCollection(response.data);
  } catch (error) {
    logNotificationEvent({
      action: "fetch",
      context,
      endpoint: context.endpoint,
      phase: "warning",
      error
    });

    return [];
  }
};

export const markNotificationAsRead = async (role, notificationId, snapshot) => {
  const context = getNotificationContext(role, snapshot);
  const endpoint = getNotificationReadEndpoint(role, notificationId, snapshot);

  if (!context.isReady || !context.supportsNotifications || !endpoint) {
    logNotificationEvent({
      action: "mark-read",
      context,
      endpoint,
      phase: "skipped",
      responseStatus: "skipped"
    });
    return false;
  }

  logNotificationEvent({
    action: "mark-read",
    context,
    endpoint,
    phase: "request"
  });

  try {
    const response = await api.put(endpoint, {}, buildRequestConfig(context));

    logNotificationEvent({
      action: "mark-read",
      context,
      endpoint,
      phase: "response",
      responseStatus: response.status
    });

    return true;
  } catch (error) {
    logNotificationEvent({
      action: "mark-read",
      context,
      endpoint,
      phase: "warning",
      error
    });

    return false;
  }
};

export const markAllNotificationsAsRead = async (role, snapshot) => {
  const context = getNotificationContext(role, snapshot);
  const endpoint = getNotificationReadAllEndpoint(role, snapshot);

  if (!context.isReady || !context.supportsNotifications || !endpoint) {
    logNotificationEvent({
      action: "mark-all",
      context,
      endpoint,
      phase: "skipped",
      responseStatus: "skipped"
    });
    return false;
  }

  logNotificationEvent({
    action: "mark-all",
    context,
    endpoint,
    phase: "request"
  });

  try {
    const response = await api.put(endpoint, {}, buildRequestConfig(context));

    logNotificationEvent({
      action: "mark-all",
      context,
      endpoint,
      phase: "response",
      responseStatus: response.status
    });

    return true;
  } catch (error) {
    logNotificationEvent({
      action: "mark-all",
      context,
      endpoint,
      phase: "warning",
      error
    });

    return false;
  }
};