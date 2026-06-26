import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import "./EmployeeList.css";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import AppDatePicker from "../components/AppDatePicker";
import AppPagination from "../components/AppPagination";
import TruncatedText from "../components/TruncatedText";
import SalaryStructureCard from "../components/SalaryStructureCard";
import { TableSkeleton } from "../components/Skeletons";
import useSalaryStructure from "../hooks/useSalaryStructure";
import { extractCollection } from "../utils/collections";
import { formatDate, toIsoDateString } from "../utils/date";
import {
  formatCurrency as formatAppCurrency,
  formatEmployeeCode,
} from "../utils/formatters";
import { isValidEmail } from "../utils/validation";
import {
  SALARY_MIN,
  buildSalaryBreakupPayload,
} from "../utils/salaryStructure";

const initialEmployeeForm = {
  id: "",
  originalId: "",
  name: "",
  email: "",
  dept: "",
  roleId: "",
  status: "",
  joined: "",
};

const normalizeRoleOptions = (response) =>
  extractCollection(response).map((role) => ({
    roleId: role.roleId ?? role.id ?? role.role_Id ?? "",
    roleName: role.roleName ?? role.name ?? role.role ?? "",
  }));

const normalizeDepartmentOptions = (response) =>
  extractCollection(response).map((dept) => ({
    id: dept.id ?? dept.departmentId ?? dept.department_Id ?? dept.departmentName,
    departmentName: dept.departmentName ?? dept.name ?? dept.department ?? "",
  }));

const normalizeEmployeeList = (response, roleOptions) =>
  extractCollection(response).map((emp) => {
    const fullName = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim();
    const matchedRole =
      roleOptions.find(
        (role) => String(role.roleId) === String(emp.roleId ?? emp.role_Id ?? "")
      ) ||
      roleOptions.find(
        (role) =>
          String(role.roleName).toLowerCase() ===
          String(emp.roleName ?? emp.role ?? "").toLowerCase()
      );

    const rawCtc =
      emp.ctc === null || emp.ctc === undefined || emp.ctc === ""
        ? ""
        : String(emp.ctc);
    const joinedValue = emp.joiningDate
      ? String(emp.joiningDate).split("T")[0]
      : "";

    return {
      id: formatEmployeeCode(emp.employee_id ?? emp.employee_Id ?? emp.employeeId ?? "-"),
      name: emp.name || fullName || "-",
      email: emp.email ?? "-",
      dept: emp.department ?? emp.dept ?? "-",
      ctcRaw: rawCtc,
      ctc: formatAppCurrency(rawCtc, { fallback: "-", showZero: true }),
      role: matchedRole?.roleName || emp.roleName || emp.role || "-",
      roleId: matchedRole?.roleId || emp.roleId || emp.role_Id || "",
      status: emp.status ?? "-",
      joinedValue,
      joined: formatDate(joinedValue),
      salarySource: emp,
    };
  });

function EmployeeList() {
  const navigate = useNavigate();

  const [empList, setEmpList] = useState([]);
  const [empSearch, setEmpSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("latest-desc");
  const [joiningDateFilter, setJoiningDateFilter] = useState("");

  const [empShowModal, setEmpShowModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newRole, setNewRole] = useState("");
  const [errors, setErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const EMPLOYEES_PER_PAGE = 30;
  const [empForm, setEmpForm] = useState(initialEmployeeForm);
  const {
    ctcValue: employeeCtcValue,
    salaryBreakup,
    manualSalaryFields,
    salaryErrors,
    isSalaryValid: isEmployeeSalaryValid,
    isSyncingSalary: isEmployeeSalarySyncing,
    handleCtcChange: handleEmployeeCtcChange,
    handleBreakupFieldChange: handleEmployeeBreakupFieldChange,
    resetSalaryStructure: resetEmployeeSalaryStructure,
  } = useSalaryStructure({
    initialCtc: SALARY_MIN,
    calculateEndpoint: API_ENDPOINTS.offerLetters.calculateBreakup,
  });

  const isEditMode = Boolean(empForm.originalId);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [roleRes, empRes, deptRes] = await Promise.all([
          api.get(API_ENDPOINTS.masters.roles.list),
          api.get(API_ENDPOINTS.employees.list),
          api.get(API_ENDPOINTS.departments.list),
        ]);

        const roleOptions = normalizeRoleOptions(roleRes);
        const departmentOptions = normalizeDepartmentOptions(deptRes);

        setRoles(roleOptions);
        setDepartments(departmentOptions);
        setEmpList(normalizeEmployeeList(empRes, roleOptions));
      } catch (err) {
        console.error("Data load error:", err);
        setMessage("Unable to load employees.");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    empSearch,
    departmentFilter,
    statusFilter,
    joiningDateFilter,
    sortBy,
  ]);

  useEffect(() => {
    if (!isEmployeeSalaryValid && !errors.ctc) {
      return;
    }

    if (isEmployeeSalaryValid && errors.ctc) {
      setErrors((prev) => ({
        ...prev,
        ctc: "",
      }));
    }
  }, [errors.ctc, isEmployeeSalaryValid]);

  const fetchEmployees = async (roleOptions = roles) => {
    try {
      const res = await api.get(API_ENDPOINTS.employees.list);
      setEmpList(normalizeEmployeeList(res, roleOptions));
    } catch (err) {
      console.error("Employee fetch error:", err.response?.data || err.message);
      setMessage("Unable to refresh employees.");
      setMessageType("error");
    }
  };

  const handleEmpChange = (event) => {
    const { name, value } = event.target;

    setEmpForm((prev) => ({
      ...prev,
      [name]:
        name === "id"
          ? value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 7)
          : name === "name"
            ? value
              .replace(/[^A-Za-z\s]/g, "")
              .slice(0, 40)
            : name === "email"
              ? value.toLowerCase().slice(0, 40)
              : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const resetEmployeeForm = () => {
    setEmpForm(initialEmployeeForm);
    setErrors({});
    resetEmployeeSalaryStructure({ ctcAnnual: SALARY_MIN });
  };

  const openAddEmployeeModal = () => {
    resetEmployeeForm();
    setEmpShowModal(true);
  };

  const openEditEmployeeModal = (emp) => {
    setErrors({});
    setEmpForm({
      id: formatEmployeeCode(emp.id),
      originalId: formatEmployeeCode(emp.id),
      name: emp.name === "-" ? "" : emp.name,
      email: emp.email === "-" ? "" : emp.email,
      dept: emp.dept === "-" ? "" : emp.dept,
      roleId: emp.roleId,
      status: emp.status === "-" ? "" : emp.status,
      joined: emp.joinedValue,
    });
    resetEmployeeSalaryStructure({
      ctcAnnual: Number(emp.ctcRaw || SALARY_MIN),
      source: emp.salarySource,
    });
    setEmpShowModal(true);
  };

  const validateEmployee = () => {
    const nextErrors = {};

    // =========================
    // EMPLOYEE ID VALIDATION
    // =========================
    const employeeId = empForm.id.trim().toUpperCase();

    if (!employeeId) {
      nextErrors.id = "Employee ID is required";
    } else {
      // 1 or 2 alphabets + exactly 5 digits
      // Examples:
      // P12345
      // EM12345

      const employeeIdRegex = /^[A-Z]{1}[0-9]{3}$/;

      if (!employeeIdRegex.test(employeeId)) {
        nextErrors.id =
          "Employee ID must contain 1 alphabet followed by exactly 3 numbers";
      } else if (!isEditMode) {
        const idExists = empList.some(
          (emp) =>
            String(emp.id).toLowerCase() === employeeId.toLowerCase()
        );

        if (idExists) {
          nextErrors.id = "Employee ID already exists.";
        }
      }
    }

    // =========================
    // NAME VALIDATION
    // =========================
    const employeeName = empForm.name.trim();

    if (!employeeName) {
      nextErrors.name = "Employee name is required";
    } else {
      // only alphabets + spaces
      const nameRegex = /^[A-Za-z\s]+$/;

      if (!nameRegex.test(employeeName)) {
        nextErrors.name =
          "Name should contain only alphabets";
      } else if (employeeName.length > 40) {
        nextErrors.name =
          "Name should not exceed 40 characters";
      }
    }

    // =========================
    // EMAIL VALIDATION
    // =========================


    // =========================
    // EMAIL VALIDATION
    // =========================
    const email = empForm.email.trim().toLowerCase();

    if (!email) {
      nextErrors.email = "Email is required";
    } else if (!isEditMode) {
      const emailExists = empList.some(
        (emp) => String(emp.email).toLowerCase() === email
      );

      if (emailExists) {
        nextErrors.email = "Email already exists.";
      }
    }

    // =========================
    // OTHER VALIDATIONS
    // =========================

    if (!empForm.dept) {
      nextErrors.dept = "Department is required";
    }

    if (!empForm.roleId) {
      nextErrors.roleId = "Role is required";
    }

    if (!empForm.status) {
      nextErrors.status = "Status is required";
    }

    if (!empForm.joined) {
      nextErrors.joined = "Joining date is required";
    }

    if (!isEmployeeSalaryValid) {
      nextErrors.ctc =
        "Please review the salary structure.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };


  const handleEmployeeSubmit = async () => {
    if (!validateEmployee()) return;

    setIsSubmitting(true);

    try {
      const selectedRole = roles.find(
        (role) => String(role.roleId) === String(empForm.roleId)
      );
      const salaryStructure = buildSalaryBreakupPayload(
        employeeCtcValue,
        salaryBreakup,
        manualSalaryFields
      );

      const payload = {
        employee_Id: empForm.id.trim(),
        name: empForm.name.trim(),
        email: empForm.email.trim(),
        department: empForm.dept,
        roleName: selectedRole?.roleName || "",
        status: empForm.status,
        joiningDate: toIsoDateString(empForm.joined),
        ctc: employeeCtcValue,
        basic: salaryStructure.basic,
        hra: salaryStructure.hra,
        conveyance: salaryStructure.conveyance,
        medicalAllowance: salaryStructure.medicalAllowance,
        otherAllowance: salaryStructure.otherAllowance,
        totalCtc: salaryStructure.totalCtc,
        manualOverrideFields: salaryStructure.manualOverrideFields,
        salaryStructure,
      };

      if (isEditMode) {
        await api.put(API_ENDPOINTS.employees.byId(empForm.id), payload, {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        await api.post(API_ENDPOINTS.employees.list, payload, {
          headers: { "Content-Type": "application/json" },
        });
      }

      setMessage(isEditMode ? "Employee updated successfully." : "Employee added successfully.");
      setMessageType("success");
      setEmpShowModal(false);
      resetEmployeeForm();
      await fetchEmployees();
    } catch (err) {
      console.error("Employee save error:", err.response?.data || err.message);

      const backendMessage =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "";
      const normalizedMessage = String(backendMessage).toLowerCase();

      if (normalizedMessage.includes("employee")) {
        setMessage("Employee ID already exists.");
      } else if (normalizedMessage.includes("email")) {
        setMessage("Email already exists.");
      } else {
        setMessage(backendMessage || "Failed to save employee.");
      }

      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      await api.delete(API_ENDPOINTS.employees.byId(employeeToDelete));
      setShowDeletePopup(false);
      setEmployeeToDelete(null);
      setMessage("Employee deleted successfully.");
      setMessageType("success");
      await fetchEmployees();
    } catch (err) {
      console.error("Delete error:", err.response?.data || err.message);
      setMessage("Delete failed.");
      setMessageType("error");
    }
  };

  const handleAddDept = () => {
    if (!newDept.trim()) return;

    if (!departments.some((dept) => dept.departmentName === newDept.trim())) {
      setDepartments((prev) => [
        ...prev,
        { id: newDept.trim(), departmentName: newDept.trim() },
      ]);
    }

    setNewDept("");
  };

  const handleDeleteDept = (dept) => {
    const used = empList.some((emp) => emp.dept === dept);

    if (used) {
      setMessage("Department already assigned to an employee.");
      setMessageType("error");
      return;
    }

    setDepartments((prev) => prev.filter((item) => item.departmentName !== dept));
  };

  const handleAddRole = () => {
    if (!newRole.trim()) return;

    if (!roles.some((role) => role.roleName === newRole.trim())) {
      setRoles((prev) => [
        ...prev,
        { roleId: Date.now(), roleName: newRole.trim() },
      ]);
    }

    setNewRole("");
  };

  const handleDeleteRole = (roleName) => {
    const used = empList.some((emp) => emp.role === roleName);

    if (used) {
      setMessage("Role already assigned to an employee.");
      setMessageType("error");
      return;
    }

    setRoles((prev) => prev.filter((role) => role.roleName !== roleName));
  };

  const departmentOptions = useMemo(() => {
    const values = departments
      .map((dept) => dept.departmentName)
      .filter(Boolean);

    return [...new Set(values)];
  }, [departments]);

  const statusOptions = [
    "Active",
    "Inactive",
    "Probation",
    "Ready to Accept Offer",
    "Rejected Offer",
  ];

  const filteredEmployees = useMemo(() => {
    const searchText = empSearch.trim().toLowerCase();

    const results = empList.filter((emp) => {
      const matchesSearch =
        !searchText ||
        [emp.name, emp.email, emp.id].some((value) =>
          String(value || "").toLowerCase().includes(searchText)
        );
      const matchesDepartment =
        departmentFilter === "All" || emp.dept === departmentFilter;
      const matchesStatus =
        statusFilter === "All" || emp.status === statusFilter;

      const matchesJoiningDate =
        !joiningDateFilter ||
        emp.joinedValue === joiningDateFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus &&
        matchesJoiningDate
      );
    });

    return [...results].sort((first, second) => {
      if (sortBy === "latest-desc") {
        return (
          new Date(second.joinedValue) -
          new Date(first.joinedValue)
        );
      }

      if (sortBy === "oldest-asc") {
        return (
          new Date(first.joinedValue) -
          new Date(second.joinedValue)
        );
      }

      if (sortBy === "name-asc") {
        return first.name.localeCompare(second.name);
      }

      if (sortBy === "ctc-desc") {
        return Number(second.ctcRaw || 0) - Number(first.ctcRaw || 0);
      }

      return 0;
    });
  }, [departmentFilter, empList, empSearch, sortBy, statusFilter]);

  const emptyStateMessage = useMemo(() => {
    const hasSearch = empSearch.trim().length > 0;
    const hasFilters = departmentFilter !== "All" || statusFilter !== "All";

    if (hasSearch && hasFilters) {
      return "No employees match the current search and filters.";
    }

    if (hasSearch) {
      return "No employees found for this search.";
    }

    if (hasFilters) {
      return "No employees match the selected filters.";
    }

    return "No employees available.";
  }, [departmentFilter, empSearch, statusFilter]);

  const indexOfLastEmployee = currentPage * EMPLOYEES_PER_PAGE;

  const indexOfFirstEmployee =
    indexOfLastEmployee - EMPLOYEES_PER_PAGE;

  const currentEmployees = filteredEmployees.slice(
    indexOfFirstEmployee,
    indexOfLastEmployee
  );

  if (loading) {
    return (
      <div className="emp-page-unique">
        <div className="emp-header-unique">
          <div>
            <div
              className="ui-skeleton"
              style={{ width: "180px", height: "28px", marginBottom: "10px" }}
            />
            <div
              className="ui-skeleton"
              style={{ width: "260px", height: "14px" }}
            />
          </div>

          <div className="emp-header-actions">
            <div
              className="ui-skeleton"
              style={{ width: "138px", height: "42px", borderRadius: "12px" }}
            />
            <div
              className="ui-skeleton"
              style={{ width: "128px", height: "42px", borderRadius: "12px" }}
            />
          </div>
        </div>

        <div className="emp-toolbar">
          <div
            className="ui-skeleton"
            style={{ flex: "1 1 280px", height: "44px", borderRadius: "14px" }}
          />

          <div className="emp-filter-group">
            <div
              className="ui-skeleton"
              style={{ width: "180px", height: "44px", borderRadius: "12px" }}
            />
            <div
              className="ui-skeleton"
              style={{ width: "160px", height: "44px", borderRadius: "12px" }}
            />
            <div
              className="ui-skeleton"
              style={{ width: "180px", height: "44px", borderRadius: "12px" }}
            />
          </div>
        </div>

        <TableSkeleton
          rows={10}
          columns={[
            { width: "minmax(230px, 1.4fr)", type: "avatar", headerWidth: "64%" },
            { width: "120px", headerWidth: "58%" },
            { width: "220px", headerWidth: "72%" },
            { width: "150px", headerWidth: "70%" },
            { width: "130px", type: "status", headerWidth: "56%" },
            { width: "120px", headerWidth: "50%" },
            { width: "170px", headerWidth: "60%" },
            { width: "110px", headerWidth: "54%" },
            { width: "165px", type: "actions", headerWidth: "52%" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="emp-page-unique">
      {message && <div className={`emp-message ${messageType}`}>{message}</div>}

      <div className="emp-header-unique">
        <div>
          <h2>Employees</h2>
          <p>
            {filteredEmployees.length} shown of {empList.length} employees
          </p>
        </div>

        <div className="emp-header-actions">
          <button
            className="emp-download-btn"
            disabled={isDownloading}
            onClick={async () => {
              try {
                setIsDownloading(true);

                const response = await api.get(
                  API_ENDPOINTS.employees.downloadFullMaster,
                  {
                    responseType: "blob",
                  }
                );

                const blob = new Blob([response.data], {
                  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });

                const downloadUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = downloadUrl;
                link.download = "employee-full-master.xlsx";

                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);

                setMessage("Download completed successfully.");
                setMessageType("success");
              } catch (error) {
                console.error("Download error:", error);

                setMessage("Failed to download Employee Excel.");
                setMessageType("error");
              } finally {
                setIsDownloading(false);
              }
            }}
          >
            {isDownloading ? "Downloading..." : "Download Excel"}
          </button>

          <button className="emp-add-btn" onClick={openAddEmployeeModal}>
            + Add Employee
          </button>
        </div>
      </div>

      <div className="emp-toolbar">
        <input
          className="emp-search-box"
          type="text"
          placeholder="Search by name, email, or ID..."
          value={empSearch}
          onChange={(event) => setEmpSearch(event.target.value)}
        />

        <div className="emp-filter-group">
          <select
            className="emp-filter-select"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="All">All Departments</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            className="emp-filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Statuses</option>

            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>



          <select
            className="emp-filter-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="latest-desc">
              Sort: New Joining Date
            </option>

            <option value="oldest-asc">
              Sort: Old Joining Date
            </option>

            <option value="ctc-desc">
              Sort: Highest CTC
            </option>

            <option value="name-asc">
              Sort: Name
            </option>
          </select>
        </div>
      </div>

      <div className="emp-table-wrapper">

        <div className="emp-scroll-hint">
          ← Scroll horizontally to view more employee details →
        </div>

        <div className="emp-table-container">
          <table className="emp-table">
            <colgroup>
              <col style={{ width: "270px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "240px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "165px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Employee ID</th>
                <th style={{ textAlign: "center" }}>Email</th>
                <th style={{ textAlign: "center" }}>Department</th>
                <th>CTC</th>
                <th style={{ textAlign: "center" }}>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="emp-action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentEmployees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="emp-empty-state app-table-empty-cell">
                    {emptyStateMessage}
                  </td>
                </tr>
              ) : (
                currentEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="emp-row-click"
                    onClick={() => navigate(`/add-employee/${emp.id}`)}
                  >
                    <td className="emp-name-col">
                      <TruncatedText
                        as="div"
                        className="emp-name"
                        value={emp.name}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/add-employee/${emp.id}`);
                        }}
                      >
                        {emp.name}
                      </TruncatedText>
                    </td>

                    <td className="emp-id-col">
                      <TruncatedText as="div" className="emp-id-code" value={emp.id} />
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <TruncatedText className="emp-cell-truncate" value={emp.email} />
                    </td>

                    <td style={{ textAlign: "center" }}>{emp.dept}</td>
                    <td>{emp.ctc}</td>
                    <td style={{ textAlign: "center" }}>{emp.role}</td>
                    <td>{emp.status}</td>
                    <td>{emp.joined}</td>

                    <td className="emp-action-col">
                      <div className="emp-action-buttons">
                        <button
                          className="app-action-button emp-action-btn emp-action-btn--edit"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditEmployeeModal(emp);
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="app-action-button emp-action-btn emp-action-btn--delete"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEmployeeToDelete(emp.id);
                            setShowDeletePopup(true);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AppPagination
          totalItems={filteredEmployees.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemLabel="employees"
        />
      </div>

      {empShowModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-box salary-modal">
            <div className="emp-modal-header">
              <div>
                <h3>{isEditMode ? "Edit Employee" : "Add Employee"}</h3>

                <p className="emp-modal-description">
                  Maintain employee details and set the annual salary structure in
                  one clean workspace.
                </p>
              </div>

              <button
                type="button"
                className="emp-modal-close-icon"
                onClick={() => setEmpShowModal(false)}
                disabled={isSubmitting}
              >
                <X size={22} />
              </button>
            </div>

            <div className="emp-modal-form-grid">
              <div className="emp-field-group">
                <label htmlFor="employee-id-input">Employee ID</label>
                <input
                  id="employee-id-input"
                  name="id"
                  value={empForm.id}
                  onChange={handleEmpChange}
                  placeholder="Ex: P401"
                  disabled={isSubmitting || isEditMode}
                />
                {errors.id && <p className="form-error">{errors.id}</p>}
              </div>

              <div className="emp-field-group">
                <label htmlFor="employee-name-input">Name</label>
                <input
                  id="employee-name-input"
                  name="name"
                  value={empForm.name}
                  onChange={handleEmpChange}
                  placeholder="Enter employee name"
                  disabled={isSubmitting}
                />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="emp-field-group">
                <label htmlFor="employee-email-input">Email</label>
                <input
                  id="employee-email-input"
                  name="email"
                  value={empForm.email}
                  onChange={handleEmpChange}
                  placeholder="Enter employee email"
                  disabled={isSubmitting}
                />
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              <div className="emp-field-group">
                <label htmlFor="employee-department-select">Department</label>
                <select
                  id="employee-department-select"
                  name="dept"
                  value={empForm.dept}
                  onChange={handleEmpChange}
                  disabled={isSubmitting}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.departmentName}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
                {errors.dept && <p className="form-error">{errors.dept}</p>}
              </div>

              <div className="emp-field-group emp-salary-field-group emp-modal-span-2">
                <label>Salary Structure</label>
                <SalaryStructureCard
                  idPrefix="employee-salary"
                  ctcValue={employeeCtcValue}
                  salaryBreakup={salaryBreakup}
                  manualSalaryFields={manualSalaryFields}
                  salaryErrors={salaryErrors}
                  isSyncingSalary={isEmployeeSalarySyncing}
                  disabled={isSubmitting}
                  onCtcChange={handleEmployeeCtcChange}
                  onBreakupFieldChange={handleEmployeeBreakupFieldChange}
                  onResetBreakup={() =>
                    resetEmployeeSalaryStructure({ ctcAnnual: employeeCtcValue })
                  }
                  helperText="Use the shared salary component so CTC, breakup totals, and formatting stay consistent everywhere."
                  variant="detailed"
                />
                {errors.ctc && <p className="form-error">{errors.ctc}</p>}
              </div>

              <div className="emp-field-group">
                <label htmlFor="employee-role-select">Role</label>
                <select
                  id="employee-role-select"
                  name="roleId"
                  value={empForm.roleId}
                  onChange={handleEmpChange}
                  disabled={isSubmitting}
                >
                  <option value="">Select Role</option>
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <option key={role.roleId} value={role.roleId}>
                        {role.roleName}
                      </option>
                    ))
                  ) : (
                    <option disabled>No roles available</option>
                  )}
                </select>
                {errors.roleId && <p className="form-error">{errors.roleId}</p>}
              </div>

              <div className="emp-field-group">
                <label htmlFor="employee-status-select">Status</label>
                <select
                  id="employee-status-select"
                  name="status"
                  value={empForm.status}
                  onChange={handleEmpChange}
                  disabled={isSubmitting}
                >
                  <option value="">Select Status</option>
                  <option>Ready to Accept Offer</option>
                  <option>Rejected Offer</option>
                  <option>Active</option>
                  <option>Probation</option>
                  <option>InActive</option>
                </select>
                {errors.status && <p className="form-error">{errors.status}</p>}
              </div>

              <div className="emp-field-group emp-modal-span-2">
                <label htmlFor="employee-joined-input">Joining Date</label>
                <AppDatePicker
                  id="employee-joined-input"
                  name="joined"
                  value={empForm.joined}
                  onChange={handleEmpChange}
                  disabled={isSubmitting}
                  ariaInvalid={Boolean(errors.joined)}
                  ariaDescribedBy={errors.joined ? "employee-joined-error" : undefined}
                />
                {empForm.joined && (
                  <p className="emp-field-helper">
                    Displayed as: {formatDate(empForm.joined)}
                  </p>
                )}
                {errors.joined && (
                  <p id="employee-joined-error" className="form-error">
                    {errors.joined}
                  </p>
                )}
              </div>
            </div>

            <div className="emp-modal-btns">
              <button
                className="emp-close-btn"
                onClick={() => setEmpShowModal(false)}
                disabled={isSubmitting}
              >
                Close
              </button>
              <button
                className="emp-save-btn"
                
                onClick={handleEmployeeSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Saving..."
                  : isEditMode
                    ? "Update"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeptModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-box small">
            <h3>Manage Departments</h3>

            <div className="master-add">
              <input
                value={newDept}
                onChange={(event) => setNewDept(event.target.value)}
                placeholder="New Department"
              />
              <button className="emp-save-btn" onClick={handleAddDept}>
                Add
              </button>
            </div>

            {departments.map((dept) => (
              <div className="master-item" key={dept.id}>
                {dept.departmentName}
                <button onClick={() => handleDeleteDept(dept.departmentName)}>x</button>
              </div>
            ))}

            <div className="emp-modal-btns">
              <button className="emp-close-btn" onClick={() => setShowDeptModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoleModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-box small">
            <h3>Manage Roles</h3>

            <div className="master-add">
              <input
                value={newRole}
                onChange={(event) => setNewRole(event.target.value)}
                placeholder="New Role"
              />
              <button className="emp-save-btn" onClick={handleAddRole}>
                Add
              </button>
            </div>

            {roles.map((role) => (
              <div className="master-item" key={role.roleId}>
                {role.roleName}
                <button onClick={() => handleDeleteRole(role.roleName)}>x</button>
              </div>
            ))}

            <div className="emp-modal-btns">
              <button className="emp-close-btn" onClick={() => setShowRoleModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePopup && (
        <div className="emp-delete-overlay">
          <div className="emp-delete-modal">
            <h3>Confirm Delete</h3>

            <p style={{ marginBottom: "35px" }}>
              Are you sure you want to delete this employee?
            </p>

            <div className="emp-delete-actions">
              <button
                className="emp-delete-cancel-btn"
                onClick={() => {
                  setShowDeletePopup(false);
                  setEmployeeToDelete(null);
                }}
              >
                Cancel
              </button>

              <button className="emp-delete-btn" onClick={confirmDeleteEmployee}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeList;
