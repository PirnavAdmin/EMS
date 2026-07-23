import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./ScreenPermissions.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import { PageSkeleton } from "../../components/Skeletons";
import { extractCollection } from "../../utils/collections";
import {
  getEmployeesByRole,
  getUserPermission,
  normalizeEmployeeRecord,
  normalizePermissionList,
  saveUserPermission,
} from "../../services/permissionService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MODULES = [
  { moduleId: 46, moduleName: "Dashboard" },
  { moduleId: 47, moduleName: "Employees" },
  { moduleId: 48, moduleName: "Add Employee" },
  { moduleId: 49, moduleName: "Screen Permissions" },
  { moduleId: 50, moduleName: "Departments" },
  { moduleId: 51, moduleName: "Company Details" },
  { moduleId: 52, moduleName: "Holidays" },
  { moduleId: 53, moduleName: "Projects" },
  { moduleId: 54, moduleName: "Job Openings" },
  { moduleId: 70, moduleName: "User Holidays" },
  { moduleId: 55, moduleName: "Roles" },
  { moduleId: 56, moduleName: "Assets" },
  { moduleId: 57, moduleName: "Clients" },
  { moduleId: 58, moduleName: "Attendance" },
  { moduleId: 59, moduleName: "User Attendance" },
  { moduleId: 60, moduleName: "Leave Management" },
  { moduleId: 61, moduleName: "User Leave Management" },
  { moduleId: 72, moduleName: "All Tickets" },
  { moduleId: 73, moduleName: "My Tickets" },
  { moduleId: 64, moduleName: "Payroll" },
  { moduleId: 65, moduleName: "User Payslip" },
  { moduleId: 66, moduleName: "Offer Letters" },
  { moduleId: 67, moduleName: "Reports" },
  { moduleId: 68, moduleName: "Notifications" },
  { moduleId: 71, moduleName: "User Notifications" },
];

const GROUPS = [
  { title: "EMPLOYEE MANAGEMENT", modules: [47, 48, 49] },
  { title: "COMPANY", modules: [50, 51, 52, 70, 53, 54] },
  { title: "MASTERS", modules: [55, 56, 57] },
  { title: "ATTENDANCE & LEAVE", modules: [58, 59, 60, 61] },
  { title: "TICKETS", modules: [72, 73] },
  { title: "PAYROLL", modules: [64, 65] },
  { title: "OTHERS", modules: [66, 67, 68, 71] },
];

const ACTIONS = [
  { key: "canView", label: "View" },
  { key: "canAdd", label: "Add" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
];

const emptyPermission = {
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
};

const createEmptyPermissions = () =>
  MODULES.reduce((acc, module) => {
    acc[module.moduleId] = { ...emptyPermission };
    return acc;
  }, {});

const fullAccessFor = (permission = emptyPermission) =>
  ACTIONS.every((action) => permission[action.key] === true);

const permissionsSignature = (permissions) =>
  JSON.stringify(
    MODULES.map((module) => ({
      moduleId: module.moduleId,
      ...emptyPermission,
      ...(permissions[module.moduleId] || {}),
    }))
  );

const getResponseRecord = (payload) => {
  const data = payload?.data ?? payload;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data;
  }
  return {};
};

const buildPermissionsMap = (records, { includeAllModules = true } = {}) => {
  const formatted = includeAllModules ? createEmptyPermissions() : {};

  records.forEach((record) => {
    const normalized = normalizePermissionList([record])[0];
    if (!normalized?.moduleId) return;

    formatted[normalized.moduleId] = {
      canView: normalized.canView,
      canAdd: normalized.canAdd,
      canEdit: normalized.canEdit,
      canDelete: normalized.canDelete,
    };
  });

  return formatted;
};

const clonePermissions = (permissions) =>
  MODULES.reduce((acc, module) => {
    acc[module.moduleId] = {
      ...emptyPermission,
      ...(permissions?.[module.moduleId] || {}),
    };
    return acc;
  }, {});

const mergePermissions = (basePermissions, overridePermissions) => {
  const merged = clonePermissions(basePermissions);

  Object.entries(overridePermissions || {}).forEach(([moduleId, permission]) => {
    merged[moduleId] = {
      ...merged[moduleId],
      ...permission,
    };
  });

  return merged;
};

function ScreenPermissions() {
  const { id, roleName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const employeeId = searchParams.get("employeeId") || "";
  const isEmployeeMode = Boolean(employeeId);
  const decodedRoleName = decodeURIComponent(roleName || "");

  const [roleId, setRoleId] = useState(() => Number(location.state?.roleId || id || 0));
  const [rolePermissions, setRolePermissions] = useState(createEmptyPermissions);
  const [employeePermissions, setEmployeePermissions] = useState({});
  const [initialSignature, setInitialSignature] = useState("");
  const [employee, setEmployee] = useState(() =>
    location.state?.employee ? normalizeEmployeeRecord(location.state.employee) : null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const editablePermissions = useMemo(
    () => (isEmployeeMode ? employeePermissions : rolePermissions),
    [employeePermissions, isEmployeeMode, rolePermissions]
  );

  const isDirty = useMemo(
    () => initialSignature && permissionsSignature(editablePermissions) !== initialSignature,
    [editablePermissions, initialSignature]
  );

  useEffect(() => {
    let active = true;

    const resolveRoleId = async () => {
      if (roleId || !decodedRoleName) return roleId;

      const response = await api.get(API_ENDPOINTS.masters.roles.list);
      const role = extractCollection(response.data).find((item) => {
        const name = item.name ?? item.roleName ?? item.RoleName ?? "";
        return String(name).trim().toLowerCase() === decodedRoleName.trim().toLowerCase();
      });
      const resolvedRoleId = Number(role?.id ?? role?.roleId ?? role?.role_Id ?? 0);

      if (active && resolvedRoleId) {
        setRoleId(resolvedRoleId);
      }

      return resolvedRoleId;
    };

    const loadEmployeeDetails = async () => {
      if (!isEmployeeMode || employee || !decodedRoleName) return;

      const employees = await getEmployeesByRole(decodedRoleName);
      const matchedEmployee = employees.find(
        (item) => item.employeeId.toLowerCase() === employeeId.toLowerCase()
      );

      if (active && matchedEmployee) {
        setEmployee(matchedEmployee);
      }
    };

    const loadRolePermissionsMap = async () => {
      const response = await api.get(API_ENDPOINTS.rolePermission.byRoleName(decodedRoleName));
      return buildPermissionsMap(normalizePermissionList(response.data));
    };

    const fetchPermissions = async () => {
      setLoading(true);

      try {
        const nextRoleId = await resolveRoleId();
        const inheritedRolePermissions = await loadRolePermissionsMap();

        if (isEmployeeMode) {
          let overrides = {};
          let responseEmployee = null;

          try {
            const response = await getUserPermission(employeeId);
            overrides =
              response.modules.length > 0
                ? buildPermissionsMap(response.modules, { includeAllModules: false })
                : {};
            const record = getResponseRecord(response.raw);
            responseEmployee = normalizeEmployeeRecord(record.employee || record.user || record);
          } catch (error) {
            if (error?.response?.status !== 404) {
              throw error;
            }
          }

          if (active) {
            const inheritedEmployeePermissions = clonePermissions(inheritedRolePermissions);
            const effective = mergePermissions(inheritedEmployeePermissions, overrides);

            setRolePermissions(inheritedRolePermissions);
            setEmployeePermissions(effective);
            setInitialSignature(permissionsSignature(effective));
            if (responseEmployee?.employeeId || responseEmployee?.employeeName) {
              setEmployee((prev) => prev || responseEmployee);
            }
          }

          await loadEmployeeDetails();
          return;
        }

        if (active) {
          setRoleId(nextRoleId || 0);
          setRolePermissions(inheritedRolePermissions);
          setEmployeePermissions({});
          setInitialSignature(permissionsSignature(inheritedRolePermissions));
        }
      } catch (error) {
        console.error(error);
        toast.error("Unable to load permissions.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPermissions();

    return () => {
      active = false;
    };
  }, [decodedRoleName, employee, employeeId, id, isEmployeeMode, roleId]);

  const updatePermission = (moduleId, key, checked) => {
    const setPermissionState = isEmployeeMode ? setEmployeePermissions : setRolePermissions;

    setPermissionState((prev) => {
      const current = prev[moduleId] || emptyPermission;
      const nextPermission =
        key === "fullAccess"
          ? {
              canView: checked,
              canAdd: checked,
              canEdit: checked,
              canDelete: checked,
            }
          : {
              ...current,
              [key]: checked,
            };

      return {
        ...prev,
        [moduleId]: nextPermission,
      };
    });
  };

  const handleSelectAll = () => {
    const allSelected = MODULES.every((module) => fullAccessFor(editablePermissions[module.moduleId]));
    const updated = {};

    MODULES.forEach((module) => {
      updated[module.moduleId] = {
        canView: !allSelected,
        canAdd: !allSelected,
        canEdit: !allSelected,
        canDelete: !allSelected,
      };
    });

    if (isEmployeeMode) {
      setEmployeePermissions(updated);
    } else {
      setRolePermissions(updated);
    }
  };

  const buildModulesPayload = () =>
    MODULES.map((module) => {
      const permission = editablePermissions[module.moduleId] || emptyPermission;

      return {
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        canView: permission.canView === true,
        canAdd: permission.canAdd === true,
        canEdit: permission.canEdit === true,
        canDelete: permission.canDelete === true,
        canAccess:
          permission.canView === true ||
          permission.canAdd === true ||
          permission.canEdit === true ||
          permission.canDelete === true,
      };
    });

  const handleSave = async () => {
    if (!isDirty || saving) return;

    setSaving(true);

    try {
      const modules = buildModulesPayload();

      if (isEmployeeMode) {
        await saveUserPermission({
          employeeId,
          modules,
        });
      } else {
        await api.post(
          API_ENDPOINTS.rolePermission.save,
          {
            roleId,
            roleName: decodedRoleName,
            modules,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      const nextSignature = permissionsSignature(editablePermissions);
      setInitialSignature(nextSignature);
      toast.success("Permissions saved successfully.");
      setTimeout(() => navigate("/roles"), 1000);
    } catch (error) {
      console.error(error);
      toast.error("Unable to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="permission-page" style={{ padding: "20px" }}>
        <PageSkeleton variant="table" tableRows={8} tableColumns={6} />
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="permission-page">
        <div className="permission-top">
          <div>
            {isEmployeeMode ? (
              <div className="permission-employee-header">
                <h2>Employee Permissions</h2>
                <dl>
                  <div>
                    <dt>Employee:</dt>
                    <dd>{employee?.employeeName || "Unknown Employee"}</dd>
                  </div>
                  <div>
                    <dt>Employee ID:</dt>
                    <dd>{employeeId}</dd>
                  </div>
                  <div>
                    <dt>Role:</dt>
                    <dd>{decodedRoleName}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <h2>
                Role Permissions <span>{decodedRoleName}</span>
              </h2>
            )}
          </div>

          <button className="select-all-btn" onClick={handleSelectAll}>
            Select All
          </button>
        </div>

        {GROUPS.map((group) => (
          <div className="permission-group" key={group.title}>
            <div className="group-header">{group.title}</div>

            <div className="permission-matrix-wrap">
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
                  {group.modules.map((moduleId) => {
                    const module = MODULES.find((item) => item.moduleId === moduleId);
                    const permission = editablePermissions[moduleId] || emptyPermission;

                    return (
                      <tr key={moduleId}>
                        <td>{module?.moduleName}</td>
                        {ACTIONS.map((action) => (
                          <td key={action.key}>
                            <input
                              type="checkbox"
                              className="permission-checkbox"
                              checked={permission[action.key] === true}
                              onChange={(event) =>
                                updatePermission(moduleId, action.key, event.target.checked)
                              }
                              aria-label={`${module?.moduleName} ${action.label}`}
                            />
                          </td>
                        ))}
                        <td>
                          <input
                            type="checkbox"
                            className="permission-checkbox"
                            checked={fullAccessFor(permission)}
                            onChange={(event) =>
                              updatePermission(moduleId, "fullAccess", event.target.checked)
                            }
                            aria-label={`${module?.moduleName} Full Access`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="permission-actions">
          <button onClick={() => navigate("/roles")}>Skip</button>
          <button onClick={handleSave} disabled={!isDirty || saving}>
            {saving ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      </div>
    </>
  );
}

export default ScreenPermissions;
