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

  const token = getStoredToken();

  if (!token) {

    return false;
  }

  const expiryTime = getExpiryTime();

  if (!expiryTime) {

    return false;
  }

  const now = Date.now();
  const expired = now >= expiryTime;

  return expired;
};

export const handleAutoLogout = ({
  redirect = true,
  reason = ""
} = {}) => {
  if (autoLogoutInProgress) {
    return;
  }

  autoLogoutInProgress = true;

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

  const token = getStoredToken();

  if (!token) {

    clearSessionTimer();
    return;
  }

  const expiryTime = getExpiryTime();

  if (!expiryTime) {

    clearSessionTimer();
    return;
  }

  const now = Date.now();

  if (now >= expiryTime) {

    handleAutoLogout({
      reason: "Session timer expired"
    });
    return;
  }

  if (sessionTimerId && activeExpiryTime === expiryTime) {

    return;
  }

  clearSessionTimer();

  const remainingTime = expiryTime - Date.now();

  activeExpiryTime = expiryTime;
  sessionTimerId = window.setTimeout(() => {
    handleAutoLogout({
      reason: "Session timer expired"
    });
  }, remainingTime);

};