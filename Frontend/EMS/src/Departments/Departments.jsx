import React, { useEffect, useMemo, useState } from "react";
import { FaUsers } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./Departments.css";

import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";

const EMPTY_DEPARTMENT_FORM = {
  name: "",
  head: "",
  building: "",
  status: "",
};

const normalizeDepartmentName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getDepartmentRecordId = (department) => {
  const value =
    department?.id ??
    department?.departmentId ??
    department?.department_Id ??
    department?.departmentID ??
    department?.Department_Id ??
    null;

  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" &&
    !value.trim()
  ) {
    return null;
  }

  return value;
};

const hasDepartmentIdentifier = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (
    typeof value === "string" &&
    !value.trim()
  ) {
    return false;
  }

  return true;
};

const buildDepartmentIdentifierFields = (
  value
) => {
  if (!hasDepartmentIdentifier(value)) {
    return {};
  }

  return {
    id: value,
    department_Id: value,
    departmentId: value,
  };
};

const createDepartmentIdentifier = () => {
  if (
    globalThis?.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (
    globalThis?.crypto &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] =
        Math.floor(Math.random() * 256);
    }
  }

  bytes[6] =
    (bytes[6] & 0x0f) | 0x40;
  bytes[8] =
    (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(
    bytes,
    (byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
  ).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
};

function Departments() {

  const [departments, setDepartments] =
    useState([]);

  const [employees, setEmployees] =
    useState([]);

  const [selectedDept, setSelectedDept] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);

  const [editId, setEditId] =
    useState(null);

  const [activeMenu, setActiveMenu] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [errors, setErrors] =
    useState({});

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [deptToDelete, setDeptToDelete] =
    useState(null);

  const [headSearch, setHeadSearch] =
    useState("");

  const [newDept, setNewDept] =
    useState(EMPTY_DEPARTMENT_FORM);

  //--------------------------------------------------
  // FETCH DEPARTMENTS
  //--------------------------------------------------

  const fetchDepartments = async () => {

    try {

      const res = await api.get(
        API_ENDPOINTS.departments.list
      );

      const cleaned = extractCollection(
        res.data
      ).map((dept) => ({
        ...buildDepartmentIdentifierFields(
          getDepartmentRecordId(dept)
        ),
        ...dept,
        id:
          getDepartmentRecordId(dept) ??
          dept?.id ??
          null,
        department_Id:
          dept?.department_Id ??
          getDepartmentRecordId(dept) ??
          null,
        departmentId:
          dept?.departmentId ??
          dept?.department_Id ??
          getDepartmentRecordId(dept) ??
          null,
        membersCount: Math.max(
          0,
          Number(dept.membersCount || 0)
        ),
      }));

      setDepartments(cleaned);

    }

    catch (err) {

      console.error(
        "Error fetching departments:",
        err
      );

      toast.error(
        "Failed to load departments."
      );

    }

  };

  //--------------------------------------------------
  // FETCH EMPLOYEES
  //--------------------------------------------------

  const fetchEmployees = async () => {

    try {

      const res = await api.get(
        API_ENDPOINTS.employees.list
      );

      const empData = extractCollection(
        res.data
      );

      setEmployees(empData);

    }

    catch (err) {

      console.error(
        "Employee fetch error:",
        err
      );

      toast.error(
        "Failed to load employees."
      );

    }

  };

  //--------------------------------------------------
  // EFFECTS
  //--------------------------------------------------

  useEffect(() => {

    fetchDepartments();
    fetchEmployees();

  }, []);

  useEffect(() => {

    const closeMenu = (event) => {
      const target =
        event?.target;

      if (
        !(
          target &&
          typeof target.closest === "function"
        ) ||
        !target.closest(
          ".dept-menu-wrapper"
        )
      ) {

        setActiveMenu(null);

      }

    };

    window.addEventListener(
      "click",
      closeMenu
    );

    return () =>
      window.removeEventListener(
        "click",
        closeMenu
      );

  }, []);

  //--------------------------------------------------
  // EMPLOYEE OPTIONS
  //--------------------------------------------------

  const normalizedEmployees = useMemo(
    () =>
      employees.map((emp) => ({
        id:
          emp.employee_Id ||
          emp.employee_id ||
          emp.id,

        label:
          emp.name ||
          `${emp.firstName || ""} ${emp.lastName || ""
            }`.trim() ||
          "Employee",

        department:
          emp.department ||
          emp.dept ||
          "",
      })),
    [employees]
  );

  const employeeOptions = useMemo(
    () =>
      normalizedEmployees.map((emp) => ({
        id: emp.id,
        label: emp.label,
      })),
    [normalizedEmployees]
  );

  //--------------------------------------------------
  // SELECTED DEPARTMENT MEMBERS
  //--------------------------------------------------

  const selectedDepartmentMembers =
    useMemo(() => {

      const activeDepartment =
        normalizeDepartmentName(
          selectedDept?.departmentName
        );

      if (!activeDepartment) {

        return [];

      }

      return normalizedEmployees.filter(
        (employee) =>
          normalizeDepartmentName(
            employee.department
          ) === activeDepartment
      );

    }, [
      selectedDept,
      normalizedEmployees,
    ]);

  //--------------------------------------------------
  // VALIDATION
  //--------------------------------------------------

  const validateField = (
    name,
    draft = newDept
  ) => {

    const value = String(
      draft[name] ?? ""
    ).trim();

    //--------------------------------------
    // NAME
    //--------------------------------------

    if (name === "name") {

      if (!value)
        return "Department Name is required";

      if (value.length > 25) {

        return "Department Name cannot exceed 25 characters";

      }

      if (
        !/^(?=.*[A-Za-z])[A-Za-z\s-]+$/.test(
          value
        )
      ) {

        return "Department Name must contain only alphabets and hyphen";

      }

      if (
        (value.match(/-/g) || []).length > 1
      ) {

        return "Only 1 hyphen (-) is allowed";

      }

      return "";

    }

    //--------------------------------------
    // HEAD
    //--------------------------------------

    if (name === "head") {

      return "";

    }

    //--------------------------------------
    // BUILDING
    //--------------------------------------

    if (name === "building") {

      if (!value)
        return "Building is required";

      if (value.length > 25) {

        return "Building cannot exceed 25 characters";

      }

      if (
        !/^(?=.*[A-Za-z])[A-Za-z\s-]+$/.test(
          value
        )
      ) {

        return "Building must contain only alphabets and hyphen";

      }

      if (
        (value.match(/-/g) || []).length > 1
      ) {

        return "Only 1 hyphen (-) is allowed";

      }

      return "";

    }

    //--------------------------------------
    // STATUS
    //--------------------------------------

    if (name === "status") {

      return value
        ? ""
        : "Status is required";

    }

    return "";

  };

  //--------------------------------------------------
  // VALIDATE FORM
  //--------------------------------------------------

  const validateForm = (
    draft = newDept
  ) => {

    const nextErrors = {

      name: validateField(
        "name",
        draft
      ),

      head: "",

      building: validateField(
        "building",
        draft
      ),

      status: validateField(
        "status",
        draft
      ),

    };

    const cleanedErrors =
      Object.fromEntries(
        Object.entries(nextErrors).filter(
          ([, value]) => value
        )
      );

    setErrors(cleanedErrors);

    return (
      Object.keys(cleanedErrors)
        .length === 0
    );

  };

  //--------------------------------------------------
  // HANDLE CHANGE
  //--------------------------------------------------

  const handleChange = (event) => {

    const { name, value } =
      event.target;

    const draft = {

      ...newDept,

      [name]:
        name === "name" ||
          name === "building"
          ? value.replace(/^\s+/g, "")
          : value,

    };

    setNewDept(draft);

    setErrors((prev) => {

      const nextErrors = {

        ...prev,

        [name]: validateField(
          name,
          draft
        ),

      };

      return Object.fromEntries(
        Object.entries(nextErrors).filter(
          ([, error]) => error
        )
      );

    });

  };

  //--------------------------------------------------
  // OPEN MODAL
  //--------------------------------------------------

  const openCreateModal = () => {

    setEditId(null);

    setErrors({});

    setHeadSearch("");

    setNewDept(
      EMPTY_DEPARTMENT_FORM
    );

    setShowModal(true);

  };

  //--------------------------------------------------
  // CLOSE MODAL
  //--------------------------------------------------

  const closeModal = () => {

    if (saving) return;

    setShowModal(false);

    setEditId(null);

    setErrors({});

    setNewDept(
      EMPTY_DEPARTMENT_FORM
    );

  };

  //--------------------------------------------------
  // HANDLE SUBMIT
  //--------------------------------------------------

  const handleSubmit = async () => {

    const trimmed = {

      ...newDept,

      name: newDept.name
        .trim()
        .replace(/\s+/g, " "),

      head: newDept.head.trim(),

      building: newDept.building
        .trim()
        .replace(/\s+/g, " "),

      status: newDept.status.trim(),

    };

    const trimmedDepartmentMembers =
      normalizedEmployees.filter(
        (employee) =>
          normalizeDepartmentName(
            employee.department
          ) ===
          normalizeDepartmentName(
            trimmed.name
          )
      );

    setNewDept(trimmed);

    if (!validateForm(trimmed))
      return;

    const payload = {

      departmentName: trimmed.name,

      departmentHead: trimmed.head,

      membersCount: trimmedDepartmentMembers.length,

      building: trimmed.building,

      status: trimmed.status,

    };

    try {

      setSaving(true);

      if (editId) {

        await api.put(
          API_ENDPOINTS.departments.byId(editId),
          {
            departmentName: trimmed.name,
            departmentHead: trimmed.head,
            membersCount: trimmedDepartmentMembers.length,
            building: trimmed.building,
            status: trimmed.status,
            id: editId,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

      }

      else {

        await api.post(
          API_ENDPOINTS.departments.list,
          payload,
          {
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      }

      toast.success(
        editId
          ? "Department updated successfully."
          : "Department added successfully."
      );

      closeModal();

      await fetchDepartments();

    }

    catch (error) {

      console.error(
        "Error saving department:",
        error
      );

      toast.error(
        error.response?.data
          ?.message ||
        "Unable to save department."
      );

    }

    finally {

      setSaving(false);

    }

  };

  //--------------------------------------------------
  // EDIT
  //--------------------------------------------------

  const handleEdit = (dept) => {

    const resolvedDepartmentId =
      getDepartmentRecordId(dept);

    if (!resolvedDepartmentId) {
      toast.error(
        "Unable to edit department."
      );
      setActiveMenu(null);
      return;
    }

    setEditId(resolvedDepartmentId);

    setErrors({});

    setNewDept({

      name:
        dept.departmentName || "",

      head:
        dept.departmentHead || "",

      building:
        dept.building || "",

      status:
        dept.status || "",

    });

    setHeadSearch(
      dept.departmentHead || ""
    );

    setShowModal(true);

    setActiveMenu(null);

  };

  //--------------------------------------------------
  // DELETE
  //--------------------------------------------------

  const handleDeleteClick = (
    dept
  ) => {

    const resolvedDepartmentId =
      getDepartmentRecordId(dept);

    if (!resolvedDepartmentId) {
      toast.error(
        "Unable to delete department."
      );
      setActiveMenu(null);
      return;
    }

    setDeptToDelete(dept);

    setShowDeleteModal(true);

    setActiveMenu(null);

  };

  const confirmDelete = async () => {

    if (!deptToDelete) return;

    const resolvedDepartmentId =
      getDepartmentRecordId(
        deptToDelete
      );

    if (!resolvedDepartmentId) {
      toast.error(
        "Unable to delete department."
      );
      setShowDeleteModal(false);
      setDeptToDelete(null);
      return;
    }

    try {

      await api.delete(
        API_ENDPOINTS.departments.byId(
          resolvedDepartmentId
        ),
        {
          params:
            buildDepartmentIdentifierFields(
              resolvedDepartmentId
            ),
          headers: {
            "Content-Type":
              "application/json",
          },
          data:
            buildDepartmentIdentifierFields(
              resolvedDepartmentId
            ),
        }
      );

      toast.success(
        "Department deleted successfully."
      );

      setShowDeleteModal(false);

      setDeptToDelete(null);

      await fetchDepartments();

    }

    catch (error) {

      console.error(
        "Error deleting department:",
        error
      );

      toast.error(
        error?.response?.data
          ?.message ||
        "Unable to delete department."
      );

    }

  };

  //--------------------------------------------------
  // UI
  //--------------------------------------------------

  return (

    <div className="dept-page">

      <ToastContainer
        position="top-right"
        autoClose={2400}
      />

      {/* HEADER */}

      <div className="dept-header">

        <div>

          <h2>
            Departments
          </h2>

          <p>
            Manage company departments
          </p>

        </div>

        <button
          className="add-btn"
          onClick={openCreateModal}
        >
          + Add Department
        </button>

      </div>

      {/* GRID */}

      <div className="dept-grid">

        {departments.map((dept, index) => {

          const departmentCardId =
            getDepartmentRecordId(
              dept
            ) ||
            `${dept.departmentName || "department"}-${index}`;

          const deptEmployees =
            normalizedEmployees.filter(
              (emp) =>
                normalizeDepartmentName(
                  emp.department
                ) ===
                normalizeDepartmentName(
                  dept.departmentName
                )
            );

          return (

            <div
              className="dept-card"
              key={departmentCardId}
              onClick={() =>
                setSelectedDept(dept)
              }
            >

              <div className="dept-menu-wrapper">

                <button
                  className="dept-menu-btn"
                  onClick={(event) => {

                    event.stopPropagation();

                    setActiveMenu(
                      activeMenu ===
                        departmentCardId
                        ? null
                        : departmentCardId
                    );

                  }}
                >
                  ⋮

                </button>

                {activeMenu ===
                  departmentCardId && (

                    <div
                      className="dept-popup-menu"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >

                      <button
                        onClick={() =>
                          handleEdit(dept)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="delete"
                        onClick={() =>
                          handleDeleteClick(
                            dept
                          )
                        }
                      >
                        Delete
                      </button>

                    </div>

                  )}

              </div>

              <div className="dept-top">

                <div className="dept-icon">
                  <FaUsers />
                </div>

                <span
                  className={
                    dept.status ===
                      "Active"
                      ? "dept-status active"
                      : "dept-status inactive"
                  }
                >
                  {dept.status}
                </span>

              </div>

              <h3
                title={
                  dept.departmentName
                }
              >
                {dept.departmentName}
              </h3>

              <p
                className="dept-head"
                title={
                  dept.departmentHead
                }
              >
                Head:
                {" "}
                {
                  dept.departmentHead
                }
              </p>

              <div className="dept-footer">

                <span>
                  👥 {deptEmployees.length} members
                </span>

                <span>
                  📍 {dept.building}
                </span>

              </div>

            </div>

          );

        })}

      </div>

      {/* ADD / EDIT MODAL */}

      {showModal && (

        <div
          className="dept-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="dept-modal-box"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="dept-modal-header">
              <h3>
                {editId
                  ? "Edit Department"
                  : "Add Department"}
              </h3>

              <button
                type="button"
                className="dept-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* NAME */}

            <div className="dept-field-group">

              <label htmlFor="dept-name-input">
                Department Name
              </label>

              <input
                id="dept-name-input"
                name="name"
                value={newDept.name}
                onChange={handleChange}
                aria-invalid={Boolean(
                  errors.name
                )}
                className={
                  errors.name
                    ? "field-error"
                    : ""
                }
              />

              {errors.name && (
                <p className="dept-error">
                  {errors.name}
                </p>
              )}

            </div>

            {/* HEAD */}

            <div className="dept-field-group">

              <label htmlFor="dept-head-select">
                Department Head
              </label>

              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                className="dept-head-search"
                value={headSearch}
                onChange={(e) =>
                  setHeadSearch(
                    e.target.value
                  )
                }
              />

              {newDept.head && (

                <div
                  style={{
                    marginTop: "10px",
                    marginBottom:
                      "10px",
                    padding:
                      "10px 12px",
                    borderRadius:
                      "10px",
                    background:
                      "var(--surface-info-soft)",
                    border:
                      "1px solid var(--theme-secondary)",
                    color:
                      "var(--text-primary)",
                    fontSize:
                      "14px",
                    fontWeight:
                      "600",
                  }}
                >
                  Selected Head:
                  {" "}
                  {newDept.head}
                </div>

              )}

              <div
                className={`dept-head-dropdown ${errors.head
                  ? "field-error"
                  : ""
                  }`}
              >

                {employeeOptions
                  .filter((employee) => {

                    const search =
                      headSearch.toLowerCase();

                    return (

                      employee.label
                        .toLowerCase()
                        .includes(
                          search
                        ) ||

                      String(
                        employee.id || ""
                      )
                        .toLowerCase()
                        .includes(
                          search
                        )

                    );

                  })

                  .map((employee) => {

                    const isSelected =
                      newDept.head ===
                      employee.label;

                    return (

                      <div
                        key={employee.id}
                        onClick={() => {

                          setNewDept(
                            (prev) => ({
                              ...prev,
                              head:
                                employee.label,
                            })
                          );

                          setHeadSearch(
                            employee.label
                          );

                          setErrors(
                            (prev) => ({
                              ...prev,
                              head: "",
                            })
                          );

                        }}

                        style={{
                          padding:
                            "10px 12px",

                          borderRadius:
                            "8px",

                          cursor:
                            "pointer",

                          marginBottom:
                            "6px",

                          background:
                            isSelected
                              ? "var(--theme-primary)"
                              : "var(--bg-page)",

                          color:
                            isSelected
                              ? "var(--bg-page)"
                              : "var(--text-primary)",

                          border:
                            isSelected
                              ? "1px solid var(--theme-primary)"
                              : "1px solid transparent",
                        }}
                      >

                        <div
                          style={{
                            fontSize:
                              "14px",

                            fontWeight:
                              "500",
                          }}
                        >
                          {
                            employee.label
                          }
                        </div>

                        <div
                          style={{
                            fontSize:
                              "12px",

                            opacity:
                              0.8,

                            marginTop:
                              "2px",
                          }}
                        >
                          Employee ID:
                          {" "}
                          {employee.id ||
                            "N/A"}
                        </div>

                      </div>

                    );

                  })}

              </div>

              {errors.head && (
                <p className="dept-error">
                  {errors.head}
                </p>
              )}

            </div>

            {/* BUILDING */}

            <div className="dept-field-group">

              <label htmlFor="dept-building-input">
                Building
              </label>

              <input
                id="dept-building-input"
                name="building"
                value={
                  newDept.building
                }
                onChange={
                  handleChange
                }
                aria-invalid={Boolean(
                  errors.building
                )}
                className={
                  errors.building
                    ? "field-error"
                    : ""
                }
              />

              {errors.building && (
                <p className="dept-error">
                  {
                    errors.building
                  }
                </p>
              )}

            </div>

            {/* STATUS */}

            <div className="dept-field-group">

              <label htmlFor="dept-status-select">
                Status
              </label>

              <select
                id="dept-status-select"
                name="status"
                value={newDept.status}
                onChange={
                  handleChange
                }
                aria-invalid={Boolean(
                  errors.status
                )}
                className={
                  errors.status
                    ? "field-error"
                    : ""
                }
              >

                <option value="">
                  Select Status
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

              </select>

              {errors.status && (
                <p className="dept-error">
                  {errors.status}
                </p>
              )}

            </div>

            {/* BUTTONS */}

            <div className="dept-modal-btns">

              <button
                onClick={
                  closeModal
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="dept-save-btn"
                onClick={
                  handleSubmit
                }
                disabled={saving}
              >

                {saving
                  ? editId
                    ? "Updating..."
                    : "Saving..."
                  : editId
                    ? "Update"
                    : "Save"}

              </button>

            </div>

          </div>

        </div>

      )}

      {/* DELETE MODAL */}

      {showDeleteModal && (

        <div className="delete-overlay">

          <div className="delete-modal">

            <h3>
              Confirm Delete
            </h3>

            <p>

              Are you sure you want to delete{" "}

              <strong>
                {deptToDelete
                  ?.departmentName ||
                  "this department"}
              </strong>

              ?

            </p>

            <div className="delete-actions">

              <button
                className="cancel-btn"
                onClick={() =>
                  setShowDeleteModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                className="confirm-delete-btn"
                onClick={
                  confirmDelete
                }
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}

      {/* MEMBERS MODAL */}

      {selectedDept && (

        <div
          className="dept-members-overlay"
          onClick={() =>
            setSelectedDept(null)
          }
        >

          <div
            className="dept-members-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="dept-members-modal-header">

              <div>

                <h3>
                  {
                    selectedDept.departmentName
                  }
                </h3>

                <p>
                  {
                    selectedDepartmentMembers.length
                  }{" "}
                  assigned members
                </p>

              </div>

              <button
                type="button"
                className="dept-members-close"
                onClick={() =>
                  setSelectedDept(
                    null
                  )
                }
                aria-label="Close department members"
              >
                Ãƒâ€”
              </button>

            </div>

            <div className="dept-members-list">

              {selectedDepartmentMembers.length >
                0 ? (

                selectedDepartmentMembers.map(
                  (member) => (

                    <div
                      className="dept-member-row"
                      key={
                        member.id ||
                        member.label
                      }
                    >

                      <span className="dept-member-avatar">

                        {member.label
                          .substring(0, 2)
                          .toUpperCase()}

                      </span>

                      <div>

                        <strong>
                          {
                            member.label
                          }
                        </strong>

                        <p>
                          {member.id ||
                            "No employee code"}
                        </p>

                      </div>

                    </div>

                  )
                )

              ) : (

                <p className="dept-members-empty-state">

                  No employees are assigned
                  to this department yet.

                </p>

              )}

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

export default Departments;