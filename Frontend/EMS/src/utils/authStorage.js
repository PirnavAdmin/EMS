const AUTH_KEYS = [
  "token",
  "authToken",
  "jwtToken",
  "refreshToken",
  "loginTime",
  "role",
  "roleName",
  "roleId",
  "email",
  "modules",
  "permissions",
  "userData",
  "user",
  "userInfo",
  "authUser",
];

export const getAuthStorage = (rememberMe) =>
  rememberMe ? localStorage : sessionStorage;

export const getActiveAuthStorage = () => {
  if (sessionStorage.getItem("token")) {
    return sessionStorage;
  }

  if (localStorage.getItem("token")) {
    return localStorage;
  }

  return sessionStorage;
};

export const clearAuthData = () => {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  sessionStorage.clear();
};

export const getStoredAuthValue = (key, fallback = "") =>
  sessionStorage.getItem(key) || localStorage.getItem(key) || fallback;

export const getStoredToken = () =>
  getStoredAuthValue("token") ||
  getStoredAuthValue("authToken") ||
  getStoredAuthValue("jwtToken");

export const getStoredRole = () =>
  getStoredAuthValue("role", "user").toLowerCase();

export const getStoredRoleName = () => getStoredAuthValue("roleName");

export const getStoredPermissions = () => {
  const storage = getActiveAuthStorage();
  const otherStorage = storage === sessionStorage ? localStorage : sessionStorage;
  const keys = ["modules", "permissions"];

  for (const store of [storage, otherStorage]) {
    for (const key of keys) {
      try {
        const value = JSON.parse(store.getItem(key));

        if (Array.isArray(value) && value.length > 0) {
          return value;
        }
      } catch {
        // Keep looking in the next storage/key pair.
      }
    }
  }

  return [];
};
