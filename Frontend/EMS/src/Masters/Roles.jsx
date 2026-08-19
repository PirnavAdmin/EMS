import React, { useState, useEffect, useMemo } from "react";
import "./Roles.css";
import { FaShieldAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toastSuccess, toastError, toastWarning } from "@/components/common/toast/toastService";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { TableSkeleton } from "../components/Skeletons";
import { extractCollection, sortByNewestIdFirst } from "../utils/collections";
import { getEmployeesByRole } from "../services/permissionService";
import {
  normalizeWhitespace,
  validateRoleName } from
"../utils/validation";

const normalizeRoleStatus = (value) =>
String(value || "").trim().toLowerCase() === "inactive" ? "Inactive" : "Active";

const ROLES_PER_PAGE = 10;
const EMPLOYEE_USERS_PER_PAGE = 10;

function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rolesShowModal, setRolesShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeModalRole, setEmployeeModalRole] = useState(null);
  const [roleEmployees, setRoleEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);

  const [isEdit, setIsEdit] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [rolesForm, setRolesForm] = useState({
    roleName: "",
    status: "Active"
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(roles.length / ROLES_PER_PAGE));

    setCurrentPage((prevPage) => Math.min(Math.max(prevPage, 1), totalPages));
  }, [roles.length]);

  const totalPages = Math.max(1, Math.ceil(roles.length / ROLES_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * ROLES_PER_PAGE;
  const visibleRoles = roles.slice(pageStartIndex, pageStartIndex + ROLES_PER_PAGE);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const fetchRoles = async () => {
    setLoading(true);

    try {
      const res = await api.get(API_ENDPOINTS.masters.roles.list);

      const formattedData = sortByNewestIdFirst(
        extractCollection(res.data).map((role) => ({
          roleId: role.id ?? role.roleId ?? role.role_Id,
          roleName: role.name ?? role.roleName ?? "No Name",
          status: role.isActive ?? role.IsActive ? "Active" : "Inactive",
          users: role.usersCount ?? role.users ?? 0
        })),
        (role) => role.roleId
      );

      setRoles(formattedData);
    } catch (error) {

      setRoles([]);
      toastError(error.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const handleRolesChange = (e) => {
    const { name, value } = e.target;

    let nextValue = value;

    if (name === "roleName") {
      // allow only letters and single space
      nextValue = value.
      replace(/[^A-Za-z ]/g, "") // remove special chars & numbers
      .replace(/\s+/g, " ") // only one space
      .replace(/^ /, ""); // no starting space
    }

    if (name === "status") {
      nextValue = normalizeRoleStatus(value);
    }

    const nextForm = {
      ...rolesForm,
      [name]: nextValue
    };

    setRolesForm(nextForm);

    setErrors((prev) => ({
      ...prev,
      [name]:
      name === "roleName" ?
      validateRoleName(nextValue) :
      nextForm.status ?
      "" :
      "Status is required"
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
      status: normalizedStatus
    }));

    return Object.keys(nextErrors).length === 0;
  };

  const handleRolesSubmit = async () => {
    if (!validateRoleForm()) return;

    const payload = {
      name: rolesForm.roleName.trim(),
      isActive: normalizeRoleStatus(rolesForm.status) === "Active"
    };

    setSaving(true);

    try {
      if (isEdit) {
        await api.put(
          API_ENDPOINTS.masters.roles.byId(selectedRoleId),
          payload,
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        toastSuccess("Role updated successfully");
      } else {
        await api.post(API_ENDPOINTS.masters.roles.list, payload, {
          headers: {
            "Content-Type": "application/json"
          }
        });

        toastSuccess("Role added successfully");
      }

      resetForm();
      fetchRoles();
    } catch (error) {

      toastError(error.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(API_ENDPOINTS.masters.roles.byId(id));

      toastSuccess("Role deleted successfully");
      fetchRoles();
    } catch (error) {

      const msg = error.response?.data || "";

      if (msg.includes("assigned to users")) {
        toastError("This role is assigned to users");
      } else {
        toastError("Unable to delete role");
      }
    }
  };

  const handleEditClick = (role) => {
    setIsEdit(true);
    setSelectedRoleId(role.roleId);

    setRolesForm({
      roleName: role.roleName,
      status: normalizeRoleStatus(role.status)
    });

    setRolesShowModal(true);
  };

  const openRolePermissions = (role) => {
    navigate(`/roles/${encodeURIComponent(role.roleName)}`, {
      state: { roleId: role.roleId, roleName: role.roleName }
    });
  };

  const handleUsersClick = async (role) => {
    setEmployeeModalOpen(true);
    setEmployeeModalRole(role);
    setEmployeeSearch("");
    setEmployeeCurrentPage(1);
    setRoleEmployees([]);
    setEmployeesLoading(true);

    try {
      const employees = await getEmployeesByRole(role.roleName);
      setRoleEmployees(employees);
    } catch (error) {

      toastError(error.response?.data?.message || "Failed to load role employees");
    } finally {
      setEmployeesLoading(false);
    }
  };

  const closeEmployeeModal = () => {
    setEmployeeModalOpen(false);
    setEmployeeModalRole(null);
    setRoleEmployees([]);
    setEmployeeSearch("");
    setEmployeeCurrentPage(1);
  };

  const handleEmployeeSelect = (employee) => {
    if (!employee.employeeId || !employeeModalRole) {
      toastError("Employee ID is missing");
      return;
    }

    const roleName = employeeModalRole.roleName;
    closeEmployeeModal();
    navigate(
      `/roles/${encodeURIComponent(roleName)}?employeeId=${encodeURIComponent(employee.employeeId)}`,
      {
        state: {
          roleId: employeeModalRole.roleId,
          roleName,
          employee
        }
      }
    );
  };

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();

    if (!query) {
      return roleEmployees;
    }

    return roleEmployees.filter((employee) =>
      [employee.employeeId, employee.employeeName, employee.role, employee.status].
      some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [roleEmployees, employeeSearch]);

  const employeeTotalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / EMPLOYEE_USERS_PER_PAGE)
  );
  const safeEmployeeCurrentPage = Math.min(
    Math.max(employeeCurrentPage, 1),
    employeeTotalPages
  );
  const employeePageStartIndex =
    (safeEmployeeCurrentPage - 1) * EMPLOYEE_USERS_PER_PAGE;
  const visibleEmployees = filteredEmployees.slice(
    employeePageStartIndex,
    employeePageStartIndex + EMPLOYEE_USERS_PER_PAGE
  );
  const employeeRangeStart =
    filteredEmployees.length === 0 ? 0 : employeePageStartIndex + 1;
  const employeeRangeEnd =
    filteredEmployees.length === 0 ?
    0 :
    Math.min(
      employeePageStartIndex + EMPLOYEE_USERS_PER_PAGE,
      filteredEmployees.length
    );

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
      </div>);

  }

  return (
    <div className="roles-page-container">
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
          }}>
          
          + Add Role
        </button>
      </div>
 
      <div
        className="roles-table-wrap"
        style={{
          background: "var(--bg-page)",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border-soft)"
        }}>
        
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}>
          
          <thead>
            <tr
              style={{
                background: "var(--bg-muted)",
                height: "30px"
              }}>
              
              <th
                style={{
                  padding: "12px 50px",
                  textAlign: "left",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text-primary)"
                }}>
                
                ROLE
              </th>
 
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text-primary)"
                }}>
                
                USERS
              </th>
 
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text-primary)"
                }}>
                
                STATUS
              </th>
 
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text-primary)"
                }}>
                
                ACTIONS
              </th>
            </tr>
          </thead>
 
          <tbody>
            {visibleRoles.map((r, i) =>
            <tr
              key={r.roleId || i}
              style={{
                borderBottom: "1px solid var(--border-soft)",
                height: "62px"
              }}>
              
                <td
                onClick={() => openRolePermissions(r)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer"
                }}>
                
                  <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                  
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
                      flexShrink: 0
                    }}>
                    
                      <FaShieldAlt />
                    </div>
 
                    <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "500",
                      color: "var(--text-strong)"
                    }}>
                    
                      {r.roleName}
                    </span>
                  </div>
                </td>
 
                <td
                style={{
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "var(--text-strong)"
                }}>
                
                  <button
                  type="button"
                  className="roles-users-count-btn"
                  onClick={() => handleUsersClick(r)}>
                  
                    {r.users}
                  </button>
                </td>
 
                <td
                style={{
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: "500",
                  color: "var(--text-strong)"
                }}>
                
                  {r.status}
                </td>
 
                <td
                style={{
                  textAlign: "center",
                  padding: "10px"
                }}>
                
                  <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                  
                    <button
                    type="button"
                    onClick={() => handleEditClick(r)}
                    className="roles-action-btn roles-action-btn--edit">
                    
                      Edit
                    </button>
 
                    <button
                    type="button"
                    onClick={() => {
                      if (r.users > 0) {
                        toastWarning("Role already assigned to users");
                        return;
                      }

                      setDeleteRoleId(r.roleId);
                      setShowDeletePopup(true);
                    }}
                    disabled={r.users > 0}
                    className="roles-action-btn roles-action-btn--delete">
                    
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
 
      <div className="app-pagination-bar roles-pagination-bar">
        <div className="app-pagination-info">
          Showing{" "}
          <strong>
            {roles.length === 0 ? 0 : pageStartIndex + 1}
            -
            {Math.min(pageStartIndex + ROLES_PER_PAGE, roles.length)}
          </strong>{" "}
          of <strong>{roles.length}</strong> roles
        </div>

        <div className="app-pagination-controls">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => setCurrentPage((prevPage) => Math.max(prevPage - 1, 1))}
            disabled={safeCurrentPage === 1 || roles.length === 0}>
            Previous
          </button>

          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`pagination-btn ${pageNumber === safeCurrentPage ? "active" : ""}`}
              onClick={() => setCurrentPage(pageNumber)}
              aria-current={pageNumber === safeCurrentPage ? "page" : undefined}>
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            className="pagination-btn"
            onClick={() =>
              setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages))
            }
            disabled={safeCurrentPage === totalPages || roles.length === 0}>
            Next
          </button>
        </div>
      </div>

      {rolesShowModal &&
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
              autoComplete="off" />
            
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
              className={errors.status ? "has-error" : ""}>
              
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
              disabled={saving}>
              
                {saving ? isEdit ? "Updating..." : "Saving..." : isEdit ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      }
      {employeeModalOpen &&
      <div className="roles-modal-overlay">
          <div className="roles-employees-modal">
            <div className="roles-employees-modal__header">
              <div>
                <h3>{employeeModalRole?.roleName || "Role"} Users</h3>
                <p>{roleEmployees.length} employee{roleEmployees.length === 1 ? "" : "s"}</p>
              </div>
              <button type="button" onClick={closeEmployeeModal}>
                Close
              </button>
            </div>

            <input
            type="search"
            className="roles-employee-search"
            placeholder="Search by employee ID, name, role, or status"
            value={employeeSearch}
            onChange={(event) => {
              setEmployeeSearch(event.target.value);
              setEmployeeCurrentPage(1);
            }} />
          

            <div className="roles-employees-table-wrap">
              <table className="roles-employees-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesLoading ?
                <tr>
                      <td colSpan={4}>Loading employees...</td>
                    </tr> :
                visibleEmployees.length > 0 ?
                visibleEmployees.map((employee) =>
                <tr
                  key={employee.employeeId || employee.employeeName}
                  onClick={() => handleEmployeeSelect(employee)}>
                  
                        <td>{employee.employeeId || "-"}</td>
                        <td>{employee.employeeName || "-"}</td>
                        <td>{employee.role || employeeModalRole?.roleName || "-"}</td>
                        <td>
                          <span
                      className={`roles-status-badge ${
                      String(employee.status || "").toLowerCase() === "inactive" ?
                      "roles-status-badge--inactive" :
                      "roles-status-badge--active"}`
                      }>
                      
                            {employee.status || "Active"}
                          </span>
                        </td>
                      </tr>
                ) :

                <tr>
                      <td colSpan={4}>No employees found</td>
                    </tr>
                }
                </tbody>
              </table>
            </div>

            {!employeesLoading &&
            <div className="roles-employees-pagination" aria-label="Employee users pagination">
                <div className="roles-employees-pagination__info">
                  Page {safeEmployeeCurrentPage} of {employeeTotalPages}{" \u00B7 "}Showing {employeeRangeStart}{"\u2013"}{employeeRangeEnd} of {filteredEmployees.length} employees
                </div>

                <div className="roles-employees-pagination__controls">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() =>
                      setEmployeeCurrentPage((prevPage) => Math.max(prevPage - 1, 1))
                    }
                    disabled={safeEmployeeCurrentPage === 1 || filteredEmployees.length === 0}>
                    Previous
                  </button>

                  <span
                    className="pagination-btn active roles-employees-pagination__current-page"
                    aria-current="page">
                    {safeEmployeeCurrentPage}
                  </span>

                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() =>
                      setEmployeeCurrentPage((prevPage) =>
                        Math.min(prevPage + 1, employeeTotalPages)
                      )
                    }
                    disabled={
                      safeEmployeeCurrentPage === employeeTotalPages ||
                      filteredEmployees.length === 0
                    }>
                    Next
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
      {showDeletePopup &&
      <div className="roles-modal-overlay">
          <div className="roles-delete-modal">
            <h2
            style={{
              marginBottom: "15px",
              color: "var(--text-strong)",
              fontSize: "18px",
              fontWeight: "700"
            }}>
            
              Confirm Delete
            </h2>
 
            <p
            style={{
              color: "var(--text-body)",
              fontSize: "16px",
              marginBottom: "20px",
              fontWeight: "500"
            }}>
            
              Are you sure you want to delete this role?
            </p>
 
            <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "14px"
            }}>
            
              <button
              onClick={() => {
                setShowDeletePopup(false);
                setDeleteRoleId(null);
              }}
              className="roles-modal-btn roles-modal-btn--secondary">
              
                Cancel
              </button>
 
              <button
              onClick={() => {
                handleDelete(deleteRoleId);
                setShowDeletePopup(false);
                setDeleteRoleId(null);
              }}
              className="roles-modal-btn roles-modal-btn--danger">
              
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}

export default Roles;
