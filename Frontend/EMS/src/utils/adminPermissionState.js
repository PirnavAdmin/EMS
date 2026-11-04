const clonePermission = (permission) =>
  permission && typeof permission === "object" && !Array.isArray(permission)
    ? { ...permission }
    : permission;

let currentAdminAllowedModules = [];

export const setCurrentAdminAllowedModules = (modules = []) => {
  currentAdminAllowedModules = Array.isArray(modules)
    ? modules.map(clonePermission).filter(Boolean)
    : [];

  return currentAdminAllowedModules;
};

export const getCurrentAdminAllowedModules = () =>
  currentAdminAllowedModules.map(clonePermission);

export const clearCurrentAdminAllowedModules = () => {
  currentAdminAllowedModules = [];
};
