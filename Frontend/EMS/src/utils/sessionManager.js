import { clearAuthData, getStoredToken } from "./authStorage";

export const SESSION_TIMEOUT_MS = 6300000;

let sessionTimerId = null;
let activeExpiryTime = null;
let autoLogoutInProgress = false;

const getLoginTime = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const loginTime = Number(localStorage.getItem("loginTime"));

  return Number.isFinite(loginTime) && loginTime > 0 ? loginTime : null;
};

const getExpiryTime = () => {
  const loginTime = getLoginTime();

  return loginTime ? loginTime + SESSION_TIMEOUT_MS : null;
};

export const clearSessionTimer = () => {
  if (sessionTimerId) {
    window.clearTimeout(sessionTimerId);
  }

  sessionTimerId = null;
  activeExpiryTime = null;
};

export const isSessionExpired = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (!getStoredToken()) {
    return false;
  }

  const expiryTime = getExpiryTime();

  if (!expiryTime) {
    return true;
  }

  return Date.now() >= expiryTime;
};

export const handleAutoLogout = ({ redirect = true } = {}) => {
  if (autoLogoutInProgress) {
    return;
  }

  autoLogoutInProgress = true;
  console.log("Auto logout triggered");

  clearSessionTimer();
  clearAuthData();

  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      autoLogoutInProgress = false;
    }, 1000);

    if (redirect && window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  } else {
    autoLogoutInProgress = false;
  }
};

export const startSessionTimer = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (!getStoredToken()) {
    clearSessionTimer();
    return;
  }

  const expiryTime = getExpiryTime();

  if (!expiryTime || Date.now() >= expiryTime) {
    handleAutoLogout();
    return;
  }

  if (sessionTimerId && activeExpiryTime === expiryTime) {
    return;
  }

  clearSessionTimer();

  const remainingTime = expiryTime - Date.now();

  console.log("Session started");
  console.log("Session expires at:", expiryTime);

  activeExpiryTime = expiryTime;
  sessionTimerId = window.setTimeout(() => {
    handleAutoLogout();
  }, remainingTime);
};
