import React, { useState, useEffect } from "react";
import "./Roles.css";
import { FaShieldAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { TableSkeleton } from "../components/Skeletons";
import { extractCollection, sortByNewestIdFirst } from "../utils/collections";
import {
  normalizeWhitespace,
  validateRoleName,
} from "../utils/validation";
 
const normalizeRoleStatus = (value) =>
  String(value || "").trim().toLowerCase() === "inactive" ? "Inactive" : "Active";
 
function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rolesShowModal, setRolesShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
 
  const [isEdit, setIsEdit] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState(null);
 
  const [rolesForm, setRolesForm] = useState({
    roleName: "",
    status: "Active"
  });
 
  const navigate = useNavigate();
 
  useEffect(() => {
    fetchRoles();
  }, []);
 
  const fetchRoles = async () => {
    setLoading(true);
 
    try {
      const res = await api.get(API_ENDPOINTS.masters.roles.list);
 
      const formattedData = sortByNewestIdFirst(
        extractCollection(res.data).map((role) => ({
          roleId: role.id ?? role.roleId ?? role.role_Id,
          roleName: role.name ?? role.roleName ?? "No Name",
          status: role.isActive ?? role.IsActive ? "Active" : "Inactive",
          users: role.usersCount ?? role.users ?? 0,
        })),
        (role) => role.roleId
      );
 
      setRoles(formattedData);
    } catch (error) {
      console.error(error);
      setRoles([]);
      toast.error(error.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };
 
  const handleRolesChange = (e) => {
    const { name, value } = e.target;
 
    let nextValue = value;
 
    if (name === "roleName") {
      // allow only letters and single space
      nextValue = value
        .replace(/[^A-Za-z ]/g, "") // remove special chars & numbers
        .replace(/\s+/g, " ") // only one space
        .replace(/^ /, ""); // no starting space
    }
 
    if (name === "status") {
      nextValue = normalizeRoleStatus(value);
    }
 
    const nextForm = {
      ...rolesForm,
      [name]: nextValue,
    };
 
    setRolesForm(nextForm);
 
    setErrors((prev) => ({
      ...prev,
      [name]:
        name === "roleName"
          ? validateRoleName(nextValue)
          : nextForm.status
            ? ""
            : "Status is required",
    }));
  };
 
  const validateRoleForm = () => {
    const trimmedRoleName = normalizeWhitespace(rolesForm.roleName);
    const normalizedStatus = normalizeRoleStatus(rolesForm.status);
 
    const nextErrors = {};
 
    const roleNameError = validateRoleName(trimmedRoleName);
 
    if (roleNameError) {
      nextErrors.roleName = roleNameError;
    }
 
    if (!normalizedStatus) {
      nextErrors.status = "Status is required";
    }
 
    setErrors(nextErrors);
 
    setRolesForm((prev) => ({
      ...prev,
      roleName: trimmedRoleName,
      status: normalizedStatus,
    }));
 
    return Object.keys(nextErrors).length === 0;
  };
 
  const handleRolesSubmit = async () => {
    if (!validateRoleForm()) return;
 
    const payload = {
      name: rolesForm.roleName.trim(),
      isActive: normalizeRoleStatus(rolesForm.status) === "Active",
    };
 
    setSaving(true);
 
    try {
      if (isEdit) {
        await api.put(
          API_ENDPOINTS.masters.roles.byId(selectedRoleId),
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            }
          }
        );
 
        toast.success("Role updated successfully");
      } else {
        await api.post(API_ENDPOINTS.masters.roles.list, payload, {
          headers: {
            "Content-Type": "application/json",
          }
        });
 
        toast.success("Role added successfully");
      }
 
      resetForm();
      fetchRoles();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };
 
  const handleDelete = async (id) => {
    try {
      await api.delete(API_ENDPOINTS.masters.roles.byId(id));
 
      toast.success("Role deleted successfully");
      fetchRoles();
    } catch (error) {
      console.error(error);
 
      const msg = error.response?.data || "";
 
      if (msg.includes("assigned to users")) {
        toast.error("This role is assigned to users");
      } else {
        toast.error("Unable to delete role");
      }
    }
  };
 
  const handleEditClick = (role) => {
    setIsEdit(true);
    setSelectedRoleId(role.roleId);
 
    setRolesForm({
      roleName: role.roleName,
      status: normalizeRoleStatus(role.status),
    });
 
    setRolesShowModal(true);
  };
 
  const resetForm = () => {
    setRolesForm({ roleName: "", status: "Active" });
    setErrors({});
    setIsEdit(false);
    setSelectedRoleId(null);
    setRolesShowModal(false);
  };
 
  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <TableSkeleton rows={10} columns={4} />
      </div>
    );
  }
 
  return (
    <div className="roles-page-container">
      <ToastContainer
        position="top-right"
        autoClose={2000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        style={{ zIndex: 9999 }}
      />
      <div className="roles-header-bar">
        <div>
          <h2>Roles & Permissions</h2>
        </div>
 
        <button
          className="roles-add-btn"
          onClick={() => {
            setRolesForm({ roleName: "", status: "Active" });
            setErrors({});
            setIsEdit(false);
            setSelectedRoleId(null);
            setRolesShowModal(true);
          }}
        >
          + Add Role
        </button>
      </div>
 
      <div
        className="roles-table-wrap"
        style={{
          background: "var(--bg-page)",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border-soft)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--bg-muted)",
                height: "30px",
              }}
            >
              <th
                style={{
                  padding: "12px 50px",
                  textAlign: "left",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                }}
              >
                ROLE
              </th>
 
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                }}
              >
                USERS
              </th>
 
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                }}
              >
                STATUS
              </th>
 
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                }}
              >
                ACTIONS
              </th>
            </tr>
          </thead>
 
          <tbody>
            {roles.map((r, i) => (
              <tr
                key={r.roleId || i}
                style={{
                  borderBottom: "1px solid var(--border-soft)",
                  height: "62px",
                }}
              >
                <td
                  onClick={() =>
                    navigate(`/employee-permissions/${r.roleId}/${r.roleName}`)
                  }
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "var(--surface-info-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--theme-secondary)",
                        fontSize: "15px",
                        flexShrink: 0,
                      }}
                    >
                      <FaShieldAlt />
                    </div>
 
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: "500",
                        color: "var(--text-strong)",
                      }}
                    >
                      {r.roleName}
                    </span>
                  </div>
                </td>
 
                <td
                  style={{
                    textAlign: "center",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "var(--text-strong)",
                  }}
                >
                  {r.users}
                </td>
 
                <td
                  style={{
                    textAlign: "center",
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "var(--text-strong)",
                  }}
                >
                  {r.status}
                </td>
 
                <td
                  style={{
                    textAlign: "center",
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleEditClick(r)}
                      className="roles-action-btn roles-action-btn--edit"
                    >
                      Edit
                    </button>
 
                    <button
                      type="button"
                      onClick={() => {
                        if (r.users > 0) {
                          toast.warning("Role already assigned to users");
                          return;
                        }
 
                        setDeleteRoleId(r.roleId);
                        setShowDeletePopup(true);
                      }}
                      disabled={r.users > 0}
                      className="roles-action-btn roles-action-btn--delete"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {rolesShowModal && (
        <div className="roles-modal-overlay">
          <div className="roles-modal-container">
            <h3>{isEdit ? "Edit Role" : "Add Role"}</h3>
 
            <div className="roles-field-group">
              <label htmlFor="role-name-input">Role Name</label>
              <input
                id="role-name-input"
                type="text"
                name="roleName"
                value={rolesForm.roleName}
                onChange={handleRolesChange}
                aria-invalid={Boolean(errors.roleName)}
                className={errors.roleName ? "has-error" : ""}
                maxLength={15}
                autoComplete="off"
              />
              {errors.roleName && <p className="roles-error">{errors.roleName}</p>}
            </div>
 
            <div className="roles-field-group">
              <label htmlFor="role-status-select">Status</label>
              <select
                id="role-status-select"
                name="status"
                value={rolesForm.status}
                onChange={handleRolesChange}
                aria-invalid={Boolean(errors.status)}
                className={errors.status ? "has-error" : ""}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && <p className="roles-error">{errors.status}</p>}
            </div>
 
            <div className="roles-modal-actions">
              <button className="roles-modal-btn roles-modal-btn--secondary" onClick={resetForm}>
                Cancel
              </button>

              <button
                className="roles-modal-btn roles-modal-btn--primary"
                onClick={handleRolesSubmit}
                disabled={saving}
              >
                {saving ? (isEdit ? "Updating..." : "Saving...") : isEdit ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeletePopup && (
        <div className="roles-modal-overlay">
          <div className="roles-delete-modal">
            <h2
              style={{
                marginBottom: "15px",
                color: "var(--text-strong)",
                fontSize: "18px",
                fontWeight: "700",
              }}
            >
              Confirm Delete
            </h2>
 
            <p
              style={{
                color: "var(--text-body)",
                fontSize: "16px",
                marginBottom: "20px",
                fontWeight: "500",
              }}
            >
              Are you sure you want to delete this role?
            </p>
 
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "14px",
              }}
            >
              <button
                onClick={() => {
                  setShowDeletePopup(false);
                  setDeleteRoleId(null);
                }}
                className="roles-modal-btn roles-modal-btn--secondary"
              >
                Cancel
              </button>
 
              <button
                onClick={() => {
                  handleDelete(deleteRoleId);
                  setShowDeletePopup(false);
                  setDeleteRoleId(null);
                }}
                className="roles-modal-btn roles-modal-btn--danger"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
export default Roles;
 
 
 
