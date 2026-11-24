import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaRedo, FaSave } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import "./SuperAdmin.css";
import "../Employees/EmployeeList.css";
import "../Employees/ScreenPermissions/ScreenPermissions.css";
import { TableSkeleton } from "../components/Skeletons";
import { toastError, toastSuccess } from "../components/common/Toast/toastService";
import {
  fetchAdminPermissionsByAdminId,
  getAdminPermissionErrorMessage,
  saveAdminPermissions } from
"../services/adminPermissionService";
import { fetchPermissionModules } from "../services/permissionService";
import { getAuditLogsPermission, updateAuditLogsPermission } from "../services/auditLogsPermissionService";
import {
  getAdmins,
  getApiErrorMessage } from
"../services/superAdminService";
import { getStoredToken } from "../utils/authStorage";

const ACTIONS = [
{ key: "canView", label: "View" },
{ key: "canAdd", label: "Add" },
{ key: "canEdit", label: "Edit" },
{ key: "canDelete", label: "Delete" }];

const normalizeId = (value) => String(value ?? "").trim();

const sortPermissions = (permissions = []) =>
[...permissions].
filter((permission) => permission?.moduleName).
sort((left, right) => Number(left.moduleId || 0) - Number(right.moduleId || 0));

const calculateFullAccess = (permission = {}) =>
Boolean(
  permission.canView &&
  permission.canAdd &&
  permission.canEdit &&
  permission.canDelete
);

const normalizeAdminPermissionRow = (permission = {}) => {
  const normalizedPermission = {
    ...permission,
    moduleId: normalizeId(
      permission.moduleId ??
      permission.ModuleId ??
      permission.screenId ??
      permission.ScreenId ??
      permission.permissionId ??
      permission.PermissionId ??
      ""
    ),
    moduleName: normalizeId(permission.moduleName ?? permission.ModuleName ?? ""),
    canView: Boolean(permission.canView ?? permission.CanView ?? false),
    canAdd: Boolean(permission.canAdd ?? permission.CanAdd ?? false),
    canEdit: Boolean(permission.canEdit ?? permission.CanEdit ?? false),
    canDelete: Boolean(permission.canDelete ?? permission.CanDelete ?? false)
  };

  return {
    ...normalizedPermission,
    canAccess: calculateFullAccess(normalizedPermission)
  };
};

const isAuthFailure = (error) =>
[401, 403].includes(Number(error?.response?.status)) ||
error?.code === "ERR_CANCELED";

const permissionKeyLabel = (key) =>
ACTIONS.find((action) => action.key === key)?.label || key;

const normalizeModuleId = (permission) =>
[
  permission?.moduleId,
  permission?.ModuleId,
  permission?.screenId,
  permission?.ScreenId,
  permission?.permissionId,
  permission?.PermissionId,
  permission?.moduleName,
].map(normalizeId).find(Boolean) || "";

const isAuditLogsPermission = (permission) =>
  normalizeId(permission?.moduleName ?? permission?.ModuleName)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") === "auditlogs";

function SuperAdminPermissions() {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryAdminId = normalizeId(searchParams.get("adminId"));
  const queryAdminEmail = normalizeId(searchParams.get("adminEmail"));

  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState(queryAdminId);
  const [permissions, setPermissions] = useState([]);
  const [moduleCatalog, setModuleCatalog] = useState([]);
  const [auditLogsPermission, setAuditLogsPermission] = useState(null);
  const [savedAuditLogsPermission, setSavedAuditLogsPermission] = useState(null);
  const [auditLogsPermissionError, setAuditLogsPermissionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const permissionRequestIdRef = useRef(0);
  const permissionsRef = useRef(permissions);
  const savedPermissionsRef = useRef([]);

  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  useEffect(() => {

  }, [permissions]);

  const selectedAdmin = useMemo(
    () =>
    admins.find((admin) => normalizeId(admin.adminId) === selectedAdminId) || null,
    [admins, selectedAdminId]
  );

  const selectedAdminLabel = useMemo(() => {
    if (selectedAdmin?.name) {
      return selectedAdmin.name;
    }

    if (selectedAdmin?.email) {
      return selectedAdmin.email;
    }

    if (queryAdminEmail) {
      return queryAdminEmail;
    }

    return selectedAdminId ? `Admin ${selectedAdminId}` : "the selected admin";
  }, [queryAdminEmail, selectedAdmin, selectedAdminId]);

  const permissionRows = useMemo(() => sortPermissions(permissions), [permissions]);
  const hasPermissions = permissionRows.length > 0;
  const isBusy = loading || saving;
  const selectedAdminExists = Boolean(
    selectedAdminId &&
    admins.some((admin) => normalizeId(admin.adminId) === selectedAdminId)
  );

  const loadPermissionsForAdmin = async (adminId, { showLoading = true, catalog = moduleCatalog } = {}) => {
    const normalizedAdminId = normalizeId(adminId);

    if (!normalizedAdminId) {
      setPermissions([]);
      setAuditLogsPermission(null);
      setSavedAuditLogsPermission(null);
      setAuditLogsPermissionError("");
      return [];
    }

    const requestId = ++permissionRequestIdRef.current;

    if (showLoading) {
      setLoading(true);
    }

    setAuditLogsPermission(null);
    setSavedAuditLogsPermission(null);
    setAuditLogsPermissionError("");

    setError("");

    try {
      const snapshot = await fetchAdminPermissionsByAdminId(normalizedAdminId);

      if (requestId !== permissionRequestIdRef.current) {
        return snapshot.permissions || [];
      }

      const returnedPermissions = (Array.isArray(snapshot.permissions) ? snapshot.permissions : [])
        .filter((permission) => !isAuditLogsPermission(permission));
      const returnedNames = new Set(returnedPermissions.map((item) => normalizeId(item.moduleName ?? item.ModuleName).toLowerCase()));
      const catalogRows = catalog.filter((module) => !isAuditLogsPermission(module)).map((module) => ({
        ...module,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      })).filter((module) => !returnedNames.has(normalizeId(module.moduleName).toLowerCase()));
      const mappedPermissions = sortPermissions(
        [...returnedPermissions, ...catalogRows].map((permission) => normalizeAdminPermissionRow(permission))
      );

      setPermissions(mappedPermissions);
      savedPermissionsRef.current = mappedPermissions;

      try {
        const auditStatus = await getAuditLogsPermission(normalizedAdminId);
        if (requestId === permissionRequestIdRef.current) {
          setAuditLogsPermission(auditStatus.hasAuditLogsPermission);
          setSavedAuditLogsPermission(auditStatus.hasAuditLogsPermission);
        }
      } catch (auditError) {
        if (requestId === permissionRequestIdRef.current) {
          setAuditLogsPermissionError(getAdminPermissionErrorMessage(auditError, "Unable to load Audit Logs permission."));
        }
      }

      return mappedPermissions;
    } catch (requestError) {
      if (requestId !== permissionRequestIdRef.current) {
        return [];
      }

      if (isAuthFailure(requestError)) {
        return [];
      }

      setError("Unable to load permissions.");
      toastError("Unable to load permissions.");

      return [];
    } finally {
      if (requestId === permissionRequestIdRef.current && showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setLoading(true);
      setError("");

      try {
        const adminList = await getAdmins();
        let catalog = [];
        try {
          catalog = await fetchPermissionModules();
        } catch {
          // Permission rows can still be loaded if the module catalog is unavailable.
        }

        if (!isMounted) {
          return;
        }

        const normalizedAdmins = Array.isArray(adminList) ? adminList : [];
        setModuleCatalog(catalog);
        setAdmins(normalizedAdmins);

        const initialAdminId =
        queryAdminId ||
        selectedAdminId ||
        normalizeId(normalizedAdmins[0]?.adminId || "");

        if (initialAdminId && initialAdminId !== selectedAdminId) {
          setSelectedAdminId(initialAdminId);
        }

        if (initialAdminId) {
          await loadPermissionsForAdmin(initialAdminId, {
            showLoading: false,
            catalog,
          });
        } else {
          setPermissions([]);
        }
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        if (isAuthFailure(requestError)) {
          return;
        }

        const message = getApiErrorMessage(requestError, "Unable to load admins.");
        setError(message);
        toastError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
      permissionRequestIdRef.current += 1;
    };
    // The initial admin selection is intentionally read once from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdminChange = (event) => {
    const nextAdminId = normalizeId(event.target.value);
    setSelectedAdminId(nextAdminId);

    if (!nextAdminId) {
      setPermissions([]);
      savedPermissionsRef.current = [];
      setError("");
      return;
    }

    void loadPermissionsForAdmin(nextAdminId);
  };

  const handleRefresh = () => {
    if (!selectedAdminId) {
      return;
    }

    void loadPermissionsForAdmin(selectedAdminId);
  };

  const handleFullAccessToggle = (moduleId, enabled) => {
    const normalizedModuleId = normalizeId(moduleId);

    if (!normalizedModuleId) {
      return;
    }

    setPermissions((current) =>
    sortPermissions(
      current.map((permission) => {
        const currentModuleId = normalizeId(normalizeModuleId(permission));

        if (currentModuleId !== normalizedModuleId) {
          return permission;
        }

        const currentPermission = normalizeAdminPermissionRow(permission);
        const nextPermission = normalizeAdminPermissionRow({
          ...currentPermission,
          canView: enabled,
          canAdd: enabled,
          canEdit: enabled,
          canDelete: enabled
        });

        return nextPermission;
      })
    )
    );
  };

  const handlePermissionChange = (moduleId, field, value) => {
    const normalizedModuleId = normalizeId(moduleId);

    if (field === "canAccess") {
      handleFullAccessToggle(normalizedModuleId, Boolean(value));
      return;
    }

    setPermissions((current) =>
    sortPermissions(
      current.map((permission) => {
        const currentModuleId = normalizeId(normalizeModuleId(permission));

        if (currentModuleId !== normalizedModuleId) {
          return permission;
        }

        const currentPermission = normalizeAdminPermissionRow(permission);
        const nextPermission = normalizeAdminPermissionRow({
          ...currentPermission,
          [field]: Boolean(value)
        });

        return nextPermission;
      })
    )
    );
  };

  const handleSave = async () => {
    if (!selectedAdminId) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const currentPermissions = sortPermissions(permissionsRef.current).map((permission) =>
      normalizeAdminPermissionRow(permission)
      );
      const comparable = (items) => JSON.stringify(items.map((permission) => ({
        moduleId: normalizeModuleId(permission),
        canView: Boolean(permission.canView),
        canAdd: Boolean(permission.canAdd),
        canEdit: Boolean(permission.canEdit),
        canDelete: Boolean(permission.canDelete),
      })));
      const genericPermissionsChanged = comparable(currentPermissions) !== comparable(savedPermissionsRef.current);
      const auditPermissionChanged =
        typeof auditLogsPermission === "boolean" &&
        auditLogsPermission !== savedAuditLogsPermission;
      const token = getStoredToken();

      if (!token) {
        const message = "Missing authentication token. Please sign in again.";
        setError(message);
        toastError(message);
        return;
      }

      if (genericPermissionsChanged) {
        await saveAdminPermissions({
          adminId: selectedAdminId,
          permissions: currentPermissions
        });
        savedPermissionsRef.current = currentPermissions;
      }

      if (auditPermissionChanged) {
        await updateAuditLogsPermission(selectedAdminId, auditLogsPermission);
        const verified = await getAuditLogsPermission(selectedAdminId);
        if (verified.hasAuditLogsPermission !== auditLogsPermission) {
          throw new Error("The Audit Logs permission could not be verified after saving.");
        }
        setSavedAuditLogsPermission(verified.hasAuditLogsPermission);
      }

      toastSuccess(
        auditPermissionChanged
          ? "Audit Logs permission saved and verified successfully."
          : genericPermissionsChanged
            ? "Permissions saved successfully."
            : "Permissions are already up to date."
      );
      await loadPermissionsForAdmin(selectedAdminId);
    } catch (requestError) {

      const message = getAdminPermissionErrorMessage(
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
    <div className="emp-page-unique super-admin-page">
      <div className="emp-header-unique">
        <div>
          <h2>Admin Permissions</h2>
          <p>
            Configure module access for {selectedAdminLabel}
            {selectedAdminId ? ` (ID: ${selectedAdminId})` : ""}.
          </p>
        </div>

        <div className="emp-header-actions">
          <button
            className="emp-download-btn"
            type="button"
            onClick={handleRefresh}
            disabled={isBusy || !selectedAdminId}>
            
            <FaRedo /> Refresh
          </button>
          <button
            className="emp-add-btn"
            type="button"
            onClick={handleSave}
            disabled={isBusy || !selectedAdminId}>
            
            <FaSave /> Save Permissions
          </button>
        </div>
      </div>

      <div className="emp-toolbar">
        <label style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          <span style={{ minWidth: 108, fontWeight: 600, color: "var(--text-primary)" }}>
            Select Admin
          </span>
          <select
            className="emp-filter-select"
            value={selectedAdminId}
            onChange={handleAdminChange}
            disabled={isBusy || admins.length === 0}>
            
            <option value="">{admins.length > 0 ? "Select Admin" : "No admins available"}</option>
            {selectedAdminId && !selectedAdminExists ?
            <option value={selectedAdminId}>{selectedAdminLabel}</option> :
            null}
            {admins.map((admin) => {
              const adminId = normalizeId(admin.adminId);
              const label = admin.name || admin.email || `Admin ${adminId}`;

              return (
                <option key={adminId || label} value={adminId}>
                  {label}
                  {admin.email ? ` (${admin.email})` : ""}
                </option>);

            })}
          </select>
        </label>
      </div>

      {loading ?
      <div style={{ marginBottom: 16, color: "var(--text-secondary)" }}>
          Loading permissions...
        </div> :
      null}

      {error ?
      <div
        className="sidebar-status-panel sidebar-status-error"
        style={{ marginBottom: 20 }}>
        
          <div className="sidebar-status-copy">
            <div>
              <div className="sidebar-status-title">Permissions unavailable</div>
              <div className="sidebar-status-text">{error}</div>
            </div>
          </div>
        </div> :
      null}

      {auditLogsPermissionError ?
      <div className="sidebar-status-panel sidebar-status-error" style={{ marginBottom: 20 }}>
        <div className="sidebar-status-copy"><div><div className="sidebar-status-title">Audit Logs permission unavailable</div><div className="sidebar-status-text">{auditLogsPermissionError}</div></div></div>
      </div> : null}

      <div className="emp-table-container">
        {loading && !hasPermissions ?
        <TableSkeleton rows={8} columns={6} /> :

        <table className="emp-table super-admin-table--compact">
            <thead>
              <tr>
                <th>Module</th>
                {ACTIONS.map((action) =>
              <th key={action.key}>{action.label}</th>
              )}
                <th>Full Access</th>
              </tr>
            </thead>
            <tbody>
              {hasPermissions ?
            permissionRows.map((permission, rowIndex) =>
            <tr key={normalizeModuleId(permission) || rowIndex}>
                    <td>{permission.moduleName}</td>
                    {ACTIONS.map((action) =>
              <td key={action.key}>
                        <input
                  type="checkbox"
                  className="permission-checkbox"
                  checked={Boolean(permission[action.key])}
                  disabled={isBusy}
                  onChange={(event) =>
                  handlePermissionChange(
                    normalizeModuleId(permission),
                    action.key,
                    event.target.checked
                  )
                  }
                  aria-label={`${permission.moduleName} ${permissionKeyLabel(action.key)}`} />
                
                      </td>
              )}
                    <td className="permission-access-col">
                      <label
                  className={`permission-switch ${
                  permission.canAccess === true ? "active" : ""}`
                  }>
                  
                        <input
                    type="checkbox"
                    checked={Boolean(permission.canAccess)}
                    onChange={(event) =>
                    handlePermissionChange(
                      normalizeModuleId(permission),
                      "canAccess",
                      event.target.checked
                    )
                    }
                    aria-label={`${permission.moduleName} Full Access`} />
                  
                        <span className="permission-slider" aria-hidden="true" />
                      </label>
                    </td>
                  </tr>
            ) :
            error ?
            <tr>
                  <td
                colSpan={ACTIONS.length + 2}
                style={{ textAlign: "center", padding: "24px" }}>
                
                    Unable to load permissions.
                  </td>
                </tr> :

            <tr>
                  <td
                colSpan={ACTIONS.length + 2}
                style={{ textAlign: "center", padding: "24px" }}>
                
                    No modules were returned by the permission API.
                  </td>
                </tr>
            }
              {typeof auditLogsPermission === "boolean" && <tr>
                <td>Audit Logs</td>
                <td colSpan={ACTIONS.length} />
                <td className="permission-access-col"><label className={`permission-switch ${auditLogsPermission ? "active" : ""}`}>
                  <input type="checkbox" checked={auditLogsPermission} disabled={isBusy} onChange={(event) => setAuditLogsPermission(event.target.checked)} aria-label="Audit Logs permission" />
                  <span className="permission-slider" aria-hidden="true" />
                </label></td>
              </tr>}
            </tbody>
          </table>
        }
      </div>
    </div>);

}

export default SuperAdminPermissions;
