import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaArrowLeft, FaRedo, FaSave } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import { TableSkeleton } from "../../components/Skeletons";
import { toastError, toastSuccess } from "../../components/common/toast/toastService";
import { extractCollection } from "../../utils/collections";
import {
  buildRolePermissionSavePayload,
  fetchRolePermissionsByRoleName,
  getRolePermissionErrorMessage,
  saveRolePermissions,
} from "../../services/rolePermissionService";
import { useAdminPermissions } from "../../context/AdminPermissionContext";
import "./ScreenPermissions.css";

const ACTIONS = [
  { key: "canView", label: "View" },
  { key: "canAdd", label: "Add" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
];

const GRANULAR_FIELDS = new Set(ACTIONS.map((action) => action.key));

const normalizeId = (value) => String(value ?? "").trim();

const safeDecodeURIComponent = (value) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "";
  }

  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
};

const normalizeComparableText = (value) =>
  normalizeId(value).toLowerCase().replace(/\s+/g, " ");

const compareModuleIds = (left, right) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const sortPermissions = (permissions = []) =>
  [...permissions]
    .filter((permission) => permission?.moduleName || permission?.moduleId)
    .sort((left, right) => compareModuleIds(left.moduleId, right.moduleId));

const normalizeScreenPermissionRow = (permission = {}, { strictAccess = false } = {}) => {
  const normalizedPermission = {
    ...permission,
    moduleId: normalizeId(permission.moduleId ?? permission.ModuleId ?? ""),
    moduleName: normalizeId(permission.moduleName ?? permission.ModuleName ?? ""),
    canAccess: Boolean(permission.canAccess ?? permission.CanAccess ?? false),
    canView: Boolean(permission.canView ?? permission.CanView ?? false),
    canAdd: Boolean(permission.canAdd ?? permission.CanAdd ?? false),
    canEdit: Boolean(permission.canEdit ?? permission.CanEdit ?? false),
    canDelete: Boolean(permission.canDelete ?? permission.CanDelete ?? false),
  };

  const hasFullGranularAccess = ACTIONS.every((action) => Boolean(normalizedPermission[action.key]));

  return {
    ...normalizedPermission,
    canAccess: strictAccess
      ? Boolean(normalizedPermission.canAccess && hasFullGranularAccess)
      : hasFullGranularAccess,
  };
};

const normalizeRoleRecord = (role = {}) => ({
  roleId: normalizeId(
    role.roleId ??
      role.id ??
      role.role_Id ??
      role.RoleId ??
      role.Role_Id ??
      ""
  ),
  roleName: normalizeId(
    role.roleName ??
      role.name ??
      role.RoleName ??
      role.Name ??
      "No Name"
  ),
});

const getRoleNameValue = (role = {}) =>
  normalizeId(
    role.roleName ??
      role.RoleName ??
      role.name ??
      role.Name ??
      ""
  );

function ScreenPermissions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshPermissions } = useAdminPermissions();
  const { roleName: routeRoleName } = useParams();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const locationStateRoleId = normalizeId(location.state?.roleId);
  const locationStateRoleName = normalizeId(location.state?.roleName);
  const queryRoleId = normalizeId(searchParams.get("roleId") || searchParams.get("id"));
  const queryRoleName = normalizeId(searchParams.get("roleName"));
  const initialRoleId = locationStateRoleId || queryRoleId;
  const initialRoleName =
    locationStateRoleName || queryRoleName || safeDecodeURIComponent(routeRoleName);

  const [selectedRole, setSelectedRole] = useState(() => ({
    roleId: initialRoleId,
    roleName: initialRoleName,
  }));
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const permissionRequestIdRef = useRef(0);
  const permissionsRef = useRef(permissions);

  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  useEffect(() => {
    console.log("Final mapped React state", permissions);
  }, [permissions]);

  const permissionRows = useMemo(() => sortPermissions(permissions), [permissions]);
  const hasPermissions = permissionRows.length > 0;
  const currentRoleId = selectedRole.roleId || initialRoleId;
  const currentRoleName = getRoleNameValue(selectedRole) || initialRoleName || "";
  const selectedRoleLabel = useMemo(() => {
    if (currentRoleName) {
      return currentRoleName;
    }

    if (initialRoleName) {
      return initialRoleName;
    }

    if (currentRoleId) {
      return `Role ${currentRoleId}`;
    }

    return "the selected role";
  }, [currentRoleId, currentRoleName, initialRoleName]);
  const isBusy = loading || saving;

  const resolveRoleSelection = useCallback(async () => {
    const baseRoleId = initialRoleId;
    const baseRoleName = initialRoleName;

    if (baseRoleId && baseRoleName) {
      return {
        roleId: baseRoleId,
        roleName: baseRoleName,
      };
    }

    if (!baseRoleId && !baseRoleName) {
      return {
        roleId: "",
        roleName: "",
      };
    }

    try {
      const response = await api.get(API_ENDPOINTS.masters.roles.list, {
        headers: {
          Accept: "application/json",
        },
      });

      const roles = extractCollection(response.data).map(normalizeRoleRecord);
      const matchedRole = roles.find((role) => {
        const matchesId = baseRoleId && normalizeId(role.roleId) === baseRoleId;
        const matchesName =
          baseRoleName &&
          normalizeComparableText(role.roleName) === normalizeComparableText(baseRoleName);

        return matchesId || matchesName;
      });

      if (matchedRole) {
        return {
          roleId: matchedRole.roleId || baseRoleId,
          roleName: matchedRole.roleName || baseRoleName,
        };
      }
    } catch (lookupError) {
      console.error("Role Resolution Error", lookupError);
    }

    return {
      roleId: baseRoleId,
      roleName: baseRoleName,
    };
  }, [initialRoleId, initialRoleName]);

  const loadPermissionsForRole = useCallback(
    async (roleName, { roleId = "", clearCurrent = false } = {}) => {
      const normalizedRoleName = normalizeId(roleName);

      if (!normalizedRoleName) {
        if (clearCurrent) {
          setPermissions([]);
        }

        setLoading(false);
        return [];
      }

      const requestId = ++permissionRequestIdRef.current;

      if (clearCurrent) {
        setPermissions([]);
      }

      setLoading(true);
      setError("");

      try {
        const snapshot = await fetchRolePermissionsByRoleName(normalizedRoleName);

        if (requestId !== permissionRequestIdRef.current) {
          return snapshot.permissions || [];
        }

        console.log("Reloaded API response", snapshot);

        const nextPermissions = sortPermissions(
          (snapshot.permissions || []).map((permission) =>
            normalizeScreenPermissionRow(permission, { strictAccess: true })
          )
        );

        setPermissions(nextPermissions);
        setSelectedRole((prev) => ({
          roleId: snapshot.roleId || roleId || prev.roleId || initialRoleId || "",
          roleName:
            snapshot.roleName ||
            normalizedRoleName ||
            prev.roleName ||
            initialRoleName ||
            "",
        }));

        console.log("Final mapped React state", nextPermissions);

        return nextPermissions;
      } catch (requestError) {
        if (requestId !== permissionRequestIdRef.current) {
          return [];
        }

        console.error("Permission API Error:", requestError);
        const message = getRolePermissionErrorMessage(
          requestError,
          "Unable to load permissions."
        );
        setError(message);
        toastError(message);

        return [];
      } finally {
        if (requestId === permissionRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [initialRoleId, initialRoleName]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setLoading(true);
      setError("");

      const resolvedRole = await resolveRoleSelection();

      if (!isMounted) {
        return;
      }

      setSelectedRole((prev) => ({
        roleId: resolvedRole.roleId || prev.roleId || "",
        roleName: resolvedRole.roleName || prev.roleName || "",
      }));

      const resolvedRoleName =
        getRoleNameValue(resolvedRole) || initialRoleName || "";

      if (!resolvedRoleName) {
        setPermissions([]);
        setError("Unable to determine the selected role.");
        setLoading(false);
        return;
      }

      await loadPermissionsForRole(resolvedRoleName, {
        roleId: resolvedRole.roleId || initialRoleId || "",
        clearCurrent: true,
      });
    };

    void bootstrap();

    return () => {
      isMounted = false;
      permissionRequestIdRef.current += 1;
    };
  }, [initialRoleId, initialRoleName, loadPermissionsForRole, resolveRoleSelection]);

  const handlePermissionChange = (moduleId, field, value) => {
    const normalizedModuleId = normalizeId(moduleId);

    if (!normalizedModuleId || (!GRANULAR_FIELDS.has(field) && field !== "canAccess")) {
      return;
    }

    setPermissions((current) =>
      sortPermissions(
        current.map((permission) => {
          const currentModuleId = normalizeId(permission.moduleId ?? permission.ModuleId ?? "");

          if (currentModuleId !== normalizedModuleId) {
            return permission;
          }

          const currentPermission = normalizeScreenPermissionRow(permission, {
            strictAccess: false,
          });

          let nextPermission = currentPermission;
          const nextValue = Boolean(value);

          if (field === "canAccess") {
            if (nextValue) {
              nextPermission = normalizeScreenPermissionRow(
                {
                  ...currentPermission,
                  canAccess: true,
                  canView: true,
                  canAdd: true,
                  canEdit: true,
                  canDelete: true,
                },
                { strictAccess: true }
              );
            } else {
              nextPermission = normalizeScreenPermissionRow(
                {
                  ...currentPermission,
                  canAccess: false,
                  canView: false,
                  canAdd: false,
                  canEdit: false,
                  canDelete: false,
                },
                { strictAccess: true }
              );
            }
          } else {
            nextPermission = normalizeScreenPermissionRow(
              {
                ...currentPermission,
                [field]: nextValue,
              },
              { strictAccess: false }
            );
          }

          console.log("Previous row state", currentPermission);
          console.log("Updated row state", nextPermission);
          console.log("Full Access toggle state", nextPermission.canAccess);

          return nextPermission;
        })
      )
    );
  };

  const handleRefresh = () => {
    if (!currentRoleName) {
      return;
    }

    void loadPermissionsForRole(currentRoleName, {
      roleId: currentRoleId,
      clearCurrent: false,
    });
  };

  const handleSave = async () => {
    if (!currentRoleName) {
      const message = "Please select a role before saving permissions.";
      setError(message);
      toastError(message);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const currentPermissions = permissions;
      const payload = buildRolePermissionSavePayload({
        roleName: currentRoleName,
        permissions: currentPermissions,
      });

      console.log("Final save payload", payload);

      const saveResponse = await saveRolePermissions({
        roleName: currentRoleName,
        permissions: currentPermissions,
      });

      console.log("API Response:", saveResponse);

      toastSuccess("Permissions saved successfully.");

      try {
        await loadPermissionsForRole(currentRoleName, {
          roleId: currentRoleId,
          clearCurrent: false,
        });

        await refreshPermissions({ force: true });
      } catch (refreshError) {
        console.error("Sidebar Permission Refresh Error:", refreshError);

        const message = getRolePermissionErrorMessage(
          refreshError,
          "Permissions were saved, but the latest modules could not be reloaded."
        );

        setError(message);
        toastError(message);
      }
    } catch (requestError) {
      console.error("Save Error", requestError.response?.data);

      const message = getRolePermissionErrorMessage(
        requestError,
        "Unable to save permissions."
      );
      setError(message);
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="permission-page">
      <div className="permission-top">
        <div className="permission-employee-header">
          <div>
            <h2>Role Permissions</h2>
            <p>
              Configure module access for {selectedRoleLabel}
              {currentRoleId ? ` (ID: ${currentRoleId})` : ""}.
            </p>
          </div>

          <dl>
            <div>
              <dt>Role Name</dt>
              <dd>{selectedRoleLabel}</dd>
            </div>
            <div>
              <dt>Role ID</dt>
              <dd>{currentRoleId || "Pending"}</dd>
            </div>
          </dl>
        </div>

        <div className="permission-actions">
          <button
            className="permission-secondary-btn"
            type="button"
            onClick={() => navigate("/roles")}
            disabled={saving}
          >
            <FaArrowLeft /> Back to Roles
          </button>
          <button
            className="permission-secondary-btn"
            type="button"
            onClick={handleRefresh}
            disabled={isBusy || !currentRoleName}
          >
            <FaRedo /> Refresh
          </button>
          <button
            className="select-all-btn"
            type="button"
            onClick={handleSave}
            disabled={isBusy || !currentRoleName}
          >
            <FaSave /> {saving ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      </div>

      {loading && !hasPermissions ? (
        <div style={{ marginBottom: 16 }}>
          <TableSkeleton rows={8} columns={6} />
        </div>
      ) : null}

      {loading && hasPermissions ? (
        <div className="permission-loading">Loading permissions...</div>
      ) : null}

      {error ? (
        <div
          className="sidebar-status-panel sidebar-status-error"
          style={{ marginBottom: 20 }}
        >
          <div className="sidebar-status-copy">
            <div>
              <div className="sidebar-status-title">Permissions unavailable</div>
              <div className="sidebar-status-text">{error}</div>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-status-retry"
            onClick={handleRefresh}
            disabled={!currentRoleName || isBusy}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="permission-group">
        <div className="group-header">MODULES</div>

        <div className="permission-matrix-wrap" aria-busy={isBusy}>
          {loading && !hasPermissions ? null : (
            <table className="permission-matrix">
              <thead>
                <tr>
                  <th>Module</th>
                  {ACTIONS.map((action) => (
                    <th key={action.key}>{action.label}</th>
                  ))}
                  <th>Full Access</th>
                </tr>
              </thead>
              <tbody>
                {hasPermissions ? (
                  permissionRows.map((permission, rowIndex) => {
                    const moduleKey =
                      normalizeId(permission.moduleId ?? permission.ModuleId ?? "") ||
                      permission.moduleName ||
                      rowIndex;

                    return (
                      <tr key={moduleKey}>
                        <td>{permission.moduleName}</td>
                        {ACTIONS.map((action) => (
                          <td key={action.key}>
                            <input
                              type="checkbox"
                              className="permission-checkbox"
                              checked={Boolean(permission[action.key])}
                              disabled={isBusy}
                              onChange={(event) =>
                                handlePermissionChange(
                                  permission.moduleId ?? permission.ModuleId,
                                  action.key,
                                  event.target.checked
                                )
                              }
                              aria-label={`${permission.moduleName} ${action.label}`}
                            />
                          </td>
                        ))}
                        <td className="permission-access-col">
                          <label
                            className={`permission-switch ${
                              permission.canAccess === true ? "active" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(permission.canAccess)}
                              onChange={(event) =>
                                handlePermissionChange(
                                  permission.moduleId ?? permission.ModuleId,
                                  "canAccess",
                                  event.target.checked
                                )
                              }
                              aria-label={`${permission.moduleName} Full Access`}
                            />
                            <span className="permission-slider" aria-hidden="true" />
                          </label>
                        </td>
                      </tr>
                    );
                  })
                ) : error ? (
                  <tr>
                    <td
                      colSpan={ACTIONS.length + 2}
                      style={{ textAlign: "center", padding: "24px" }}
                    >
                      Unable to load permissions.
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={ACTIONS.length + 2}
                      style={{ textAlign: "center", padding: "24px" }}
                    >
                      No modules were returned by the permission API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScreenPermissions;
