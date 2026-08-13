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
    console.log("[sessionManager] Session expiry check skipped: no token");
    return false;
  }

  const expiryTime = getExpiryTime();

  if (!expiryTime) {
    console.log("[sessionManager] Session expiry check skipped: no expiry time");
    return false;
  }

  const now = Date.now();
  const expired = now >= expiryTime;

  console.log("[sessionManager] Session expiry check", {
    hasToken: true,
    expiryTime,
    now,
    expired,
  });

  return expired;
};

export const handleAutoLogout = ({
  redirect = true,
  reason = "",
} = {}) => {
  if (autoLogoutInProgress) {
    return;
  }

  autoLogoutInProgress = true;

  console.log("[sessionManager] Auto logout requested", {
    reason: reason || "unspecified",
    redirect,
  });

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
    console.log("[sessionManager] startSessionTimer skipped: no token");
    clearSessionTimer();
    return;
  }

  const expiryTime = getExpiryTime();

  if (!expiryTime) {
    console.log("[sessionManager] startSessionTimer skipped: no expiry time");
    clearSessionTimer();
    return;
  }

  const now = Date.now();

  if (now >= expiryTime) {
    console.log("[sessionManager] startSessionTimer detected expired session", {
      expiryTime,
      now,
    });
    handleAutoLogout({
      reason: "Session timer expired",
    });
    return;
  }

  if (sessionTimerId && activeExpiryTime === expiryTime) {
    console.log("[sessionManager] startSessionTimer reused existing timer", {
      expiryTime,
    });
    return;
  }

  clearSessionTimer();

  const remainingTime = expiryTime - Date.now();

  activeExpiryTime = expiryTime;
  sessionTimerId = window.setTimeout(() => {
    handleAutoLogout({
      reason: "Session timer expired",
    });
  }, remainingTime);

  console.log("[sessionManager] startSessionTimer armed", {
    expiryTime,
    remainingTime,
  });
};
