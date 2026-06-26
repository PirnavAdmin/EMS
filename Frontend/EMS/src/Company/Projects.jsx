import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Projects.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppDatePicker from "../components/AppDatePicker";
import AppPagination from "../components/AppPagination";
import { TableSkeleton } from "../components/Skeletons";
import { extractCollection } from "../utils/collections";
import { formatDate, toIsoDateString } from "../utils/date";

const PROJECT_STATUSES = [
  "Yet to Start",
  "In Progress",
  "Completed",
  "On Hold",
  "Go Live",
];

const EMPTY_PROJECT_FORM = {
  name: "",
  id: "",
  originalId: "",
  client: "",
  startDate: "",
  endDate: "",
  team: "",
  status: "",
};

const getEmployeeId = (employee) =>
  String(
    employee?.employee_Id ??
    employee?.employee_id ??
    employee?.employeeId ??
    employee?.Employee_Id ??
    employee?.EmployeeID ??
    employee?.id ??
    ""
  ).trim();

const getEmployeeName = (employee) =>
  String(
    employee?.employeeName ??
    employee?.employee_Name ??
    employee?.name ??
    employee?.fullName ??
    employee?.employeeFullName ??
    `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`.trim() ??
    ""
  ).trim();

const normalizeEmployeeRecord = (employee = {}) => {
  const employee_Id = getEmployeeId(employee);
  const employeeName = getEmployeeName(employee);
  const resolvedName = employeeName || employee_Id || "";

  return {
    ...employee,
    employee_Id,
    employeeName: resolvedName,
    name: resolvedName,
    fullName: resolvedName,
  };
};

const getEmployeeSelectionKey = (employee = {}) => {
  const employeeId = getEmployeeId(employee);

  if (employeeId) {
    return employeeId.trim().toLowerCase();
  }

  return getEmployeeName(employee).trim().toLowerCase();
};

const dedupeEmployeesByKey = (employeeList = []) => {
  const uniqueEmployees = new Map();

  employeeList.forEach((employee, index) => {
    const normalizedEmployee = normalizeEmployeeRecord(employee);
    const key = getEmployeeSelectionKey(normalizedEmployee) || `employee-${index}`;

    if (!uniqueEmployees.has(key)) {
      uniqueEmployees.set(key, normalizedEmployee);
    }
  });

  return Array.from(uniqueEmployees.values());
};

const buildEmployeeLookupMap = (employeeList = []) => {
  const lookup = new Map();

  employeeList.forEach((employee) => {
    const normalized = normalizeEmployeeRecord(employee);
    const keys = [
      normalized.employee_Id,
      normalized.employeeName,
      normalized.name,
      normalized.fullName,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    keys.forEach((key) => {
      lookup.set(key, normalized);
    });
  });

  return lookup;
};

const normalizeEmployeeReference = (value, employeeLookup) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    const rawValue = String(value).trim();

    if (!rawValue) {
      return null;
    }

    const lookupKey = rawValue.toLowerCase();
    const matchedEmployee =
      employeeLookup.get(lookupKey) ||
      employeeLookup.get(rawValue) ||
      null;

    if (matchedEmployee) {
      return matchedEmployee;
    }

    return normalizeEmployeeRecord({
      employee_Id: rawValue,
      employeeName: rawValue,
    });
  }

  const normalized = normalizeEmployeeRecord(value);
  const lookupKey = normalized.employee_Id.toLowerCase();
  const matchedEmployee =
    employeeLookup.get(lookupKey) ||
    employeeLookup.get(normalized.employeeName.toLowerCase()) ||
    employeeLookup.get(normalized.name.toLowerCase()) ||
    null;

  if (!matchedEmployee) {
    return normalized;
  }

  return {
    ...matchedEmployee,
    ...normalized,
    employee_Id: normalized.employee_Id || matchedEmployee.employee_Id,
    employeeName:
      normalized.employeeName ||
      matchedEmployee.employeeName ||
      matchedEmployee.name ||
      normalized.name,
    name:
      normalized.name ||
      matchedEmployee.name ||
      matchedEmployee.employeeName,
    fullName:
      normalized.fullName ||
      matchedEmployee.fullName ||
      matchedEmployee.name ||
      matchedEmployee.employeeName,
  };
};

const collectProjectMemberEntries = (project) => {
  const memberFields = [
    "projectMembers",
    "project_Members",
    "members",
    "memberDetails",
    "projectMemberDetails",
    "projectMemberIds",
    "projectMembersIds",
    "memberIds",
    "teamMembers",
    "team_Members",
  ];

  const entries = [];

  memberFields.forEach((fieldName) => {
    const value = project?.[fieldName];

    if (value === null || value === undefined || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      entries.push(...value);
      return;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) {
        return;
      }

      if (!/[A-Za-z]/.test(trimmed) && !/[;,|]/.test(trimmed)) {
        return;
      }

      entries.push(
        ...trimmed
          .split(/[,;|]/g)
          .map((item) => item.trim())
          .filter(Boolean)
      );
      return;
    }

    if (typeof value === "object") {
      entries.push(value);
    }
  });

  return entries;
};

const resolveProjectMembers = (project, employeeLookup) =>
  collectProjectMemberEntries(project)
    .map((member) => normalizeEmployeeReference(member, employeeLookup))
    .filter(Boolean);

const getProjectMemberCount = (project, members) => {
  const resolvedCount = members.length;

  if (resolvedCount > 0) {
    return resolvedCount;
  }

  const rawCount = Number(
    project?.team_Members ??
    project?.teamMembers ??
    project?.team ??
    project?.memberCount ??
    project?.projectMemberCount ??
    0
  );

  return Number.isFinite(rawCount) ? rawCount : 0;
};

const getProjectTeamLabel = (project, memberCount) => {
  const candidateValues = [
    project?.team_Members,
    project?.teamMembers,
    project?.team,
    project?.memberCount,
    project?.projectMemberCount,
  ];

  for (const value of candidateValues) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    const trimmed = String(value).trim();

    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }
  }

  return memberCount > 0 ? String(memberCount) : "";
};

const normalizeProjects = (response, employeeLookup = new Map()) =>
  extractCollection(response).map((project) => {
    const members = dedupeEmployeesByKey(
      resolveProjectMembers(project, employeeLookup)
    );
    const memberCount = getProjectMemberCount(project, members);

    return {
      name: project.project_Name ?? project.name ?? "",
      id: project.project_Id ?? project.id ?? "",
      clientId: project.clientId ?? project.client_Id ?? project.clientID ?? "",
      client: project.client ?? "",
      startDate: project.start_Date ? String(project.start_Date).split("T")[0] : "",
      endDate: project.end_Date ? String(project.end_Date).split("T")[0] : "",
      team: getProjectTeamLabel(project, memberCount),
      members,
      memberCount,
      projectMembers: members,
      status: project.status ?? "",
    };
  });

const normalizeClients = (response) =>
  extractCollection(response).map((client) => ({
    id: client.id ?? client.client_Id ?? client.client_Name,
    name: client.client_Name ?? client.name ?? "",
  }));

const sanitizeProjectName = (value) =>
  String(value)
    .replace(/[^A-Za-z\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/g, "")
    .slice(0, 50);

const sanitizeProjectId = (value) =>
  String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

const sanitizeTeamSize = (value) =>
  String(value).replace(/\D/g, "").slice(0, 4);

const formatDisplayDate = (value) => {
  return formatDate(value);
};

const getStatusClassName = (status) => {
  const normalized = String(status).toLowerCase();

  if (normalized.includes("progress")) return "progress";
  if (normalized.includes("completed")) return "completed";
  if (normalized.includes("hold")) return "hold";
  return "planned";
};

function Projects() {
  const [clients, setClients] = useState([]);
  const [projectsShowModal, setProjectsShowModal] = useState(false);
  const [projectsEditMode, setProjectsEditMode] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [isClosingDeletePopup, setIsClosingDeletePopup] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [projectRecords, setProjectRecords] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [projectsForm, setProjectsForm] = useState(EMPTY_PROJECT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 30;

  const projectNameInputRef = useRef(null);
  const employeeLookup = useMemo(
    () => buildEmployeeLookupMap(employees),
    [employees]
  );

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const response = await api.get(API_ENDPOINTS.company.projects.list);
      setProjectRecords(extractCollection(response));
    } catch (error) {
      console.error("Project fetch error:", error);
      toast.error("Failed to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.masters.clients.list);
      setClients(normalizeClients(response));
    } catch (error) {
      console.error("Client fetch error:", error);
      toast.error("Failed to load clients.");
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.employees.list);

      const employeeData = extractCollection(res.data);

      setEmployees(dedupeEmployeesByKey(employeeData));
    } catch (err) {
      console.error("Employee fetch error:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchEmployees();
  }, []);

  useEffect(() => {
    setProjectsList(normalizeProjects(projectRecords, employeeLookup));
  }, [projectRecords, employeeLookup]);

  useEffect(() => {
    if (!showProjectDetails || !selectedProject?.id) {
      return undefined;
    }

    const latestProject = projectsList.find(
      (project) => String(project.id) === String(selectedProject.id)
    );

    if (latestProject && latestProject !== selectedProject) {
      setSelectedProject(latestProject);
    }
  }, [projectsList, selectedProject?.id, showProjectDetails]);

  useEffect(() => {
    if (!projectsShowModal && !showDeletePopup) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [projectsShowModal, showDeletePopup]);

  useEffect(() => {
    if (!projectsShowModal && !showDeletePopup) return undefined;

    let timer;

    if (projectsShowModal) {
      timer = window.setTimeout(() => {
        projectNameInputRef.current?.focus();
      }, 80);
    }

    const handleEscape = (event) => {
      if (event.key !== "Escape" || isSubmitting) return;

      if (showDeletePopup) {
        closeDeletePopup();
        return;
      }

      if (projectsShowModal) {
        closeProjectModal();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSubmitting, projectsShowModal, showDeletePopup]);

  const resetForm = () => {
    setProjectsForm(EMPTY_PROJECT_FORM);
    setFormErrors({});
    setApiError("");
    setSelectedEmployees([]);
    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
  };

  const openCreateProjectModal = () => {
    resetForm();

    setProjectsForm({
      ...EMPTY_PROJECT_FORM,
      id: generateProjectId(),
    });

    setProjectsEditMode(false);
    setIsClosingModal(false);
    setProjectsShowModal(true);
  };

  const closeProjectModal = (forceClose = false) => {
    if (isSubmitting && !forceClose) return;

    setIsClosingModal(true);
    window.setTimeout(() => {
      setProjectsShowModal(false);
      setProjectsEditMode(false);
      setIsClosingModal(false);
      resetForm();
    }, 180);
  };

  const closeDeletePopup = () => {
    setIsClosingDeletePopup(true);
    window.setTimeout(() => {
      setShowDeletePopup(false);
      setProjectToDelete(null);
      setIsClosingDeletePopup(false);
    }, 180);
  };

  const generateProjectId = () => {
    if (!projectsList.length) return "PRJ001";

    const maxNumber = projectsList.reduce((max, project) => {
      const match = String(project.id || "").match(/^PRJ(\d+)$/i);
      if (!match) return max;

      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }, 0);

    return `PRJ${String(maxNumber + 1).padStart(3, "0")}`;
  };

  const validateField = (fieldName, draftForm = projectsForm) => {
    const value = String(draftForm[fieldName] ?? "");
    const trimmedValue = value.trim();

    switch (fieldName) {
      case "name": {
        if (!trimmedValue) {
          return "Project Name is required";
        }

        if (trimmedValue.length < 3) {
          return "Project Name must be at least 3 characters";
        }

        if (trimmedValue.length > 50) {
          return "Project Name cannot exceed 50 characters";
        }

        if (!/^[A-Za-z\s]+$/.test(trimmedValue)) {
          return "Only alphabets are allowed";
        }

        return "";
      }

      case "id": {
        if (!trimmedValue) {
          return "Project ID is required";
        }

        if (!/^[A-Z]{3}[0-9]{3}$/.test(trimmedValue)) {
          return "Project ID must be 3 alphabets and 3 numbers (Example: PRJ001)";
        }

        const idExists = projectsList.some(
          (project) =>
            String(project.id).toLowerCase() === trimmedValue.toLowerCase() &&
            String(project.id).toLowerCase() !==
            String(draftForm.originalId).toLowerCase()
        );

        if (idExists) {
          return "Project ID already exists";
        }

        return "";
      }

      case "client":
        return trimmedValue ? "" : "Client is required";

      case "startDate":
        if (!trimmedValue) return "Start Date is required";
        return "";

      case "endDate":

        // optional field

        if (
          trimmedValue &&
          draftForm.startDate &&
          trimmedValue < draftForm.startDate
        ) {

          return "End Date cannot be before Start Date";

        }

        return "";

      case "team": {
        return "";
      }

      case "status":
        return trimmedValue ? "" : "Status is required";

      default:
        return "";
    }
  };

  const validateProjectForm = (draftForm = projectsForm) => {
    const nextErrors = {
      name: validateField("name", draftForm),
      id: validateField("id", draftForm),
      client: validateField("client", draftForm),
      startDate: validateField("startDate", draftForm),
      endDate: validateField("endDate", draftForm),
      team: validateField("team", draftForm),
      status: validateField("status", draftForm),
    };

    const cleanedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => message)
    );

    setFormErrors(cleanedErrors);
    return Object.keys(cleanedErrors).length === 0;
  };

  const updateFieldValue = (name, rawValue) => {
    let nextValue = rawValue;

    if (name === "name") nextValue = sanitizeProjectName(rawValue);
    if (name === "id") nextValue = sanitizeProjectId(rawValue);
    if (name === "team") nextValue = sanitizeTeamSize(rawValue);

    const draftForm = {
      ...projectsForm,
      [name]: nextValue,
    };

    if (name === "name") {
      draftForm.name = draftForm.name.replace(/\s{2,}/g, " ");
    }

    setProjectsForm(draftForm);
    setApiError("");

    setFormErrors((prev) => {
      const nextErrors = {
        ...prev,
        [name]: validateField(name, draftForm),
      };

      if (name === "startDate" || name === "endDate") {
        nextErrors.startDate = validateField("startDate", draftForm);
        nextErrors.endDate = validateField("endDate", draftForm);
      }

      return Object.fromEntries(
        Object.entries(nextErrors).filter(([, message]) => message)
      );
    });
  };

  const handleProjectsChange = (event) => {
    const { name, value } = event.target;
    updateFieldValue(name, value);
  };

  const handleProjectsBlur = (event) => {
    const { name, value } = event.target;
    const normalizedValue = name === "name" ? value.trim().replace(/\s+/g, " ") : value.trim();

    updateFieldValue(name, normalizedValue);
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();

    const uniqueSelectedEmployees = dedupeEmployeesByKey(selectedEmployees);

    const trimmedForm = {
      ...projectsForm,
      name: projectsForm.name.trim().replace(/\s+/g, " "),
      id: projectsForm.id.trim().toUpperCase(),
      client: projectsForm.client.trim(),
      team: String(uniqueSelectedEmployees.length),
      status: projectsForm.status.trim(),
    };

    setProjectsForm(trimmedForm);

    if (!validateProjectForm(trimmedForm)) return;

    const selectedClient = clients.find(
      (client) => String(client.id) === String(trimmedForm.client)
    );

    const payload = {
      project_Name: trimmedForm.name,
      project_Id: trimmedForm.id,
      client: selectedClient?.name || "",
      clientId: Number(trimmedForm.client),
      start_Date: toIsoDateString(trimmedForm.startDate),
      end_Date: trimmedForm.endDate
        ? toIsoDateString(trimmedForm.endDate)
        : null,
      projectMembers: uniqueSelectedEmployees.map((emp) => ({
        employee_Id: emp.employee_Id,
        name:
          emp.employeeName ||
          emp.name ||
          emp.fullName,
      })),

      team_Members: uniqueSelectedEmployees
        .map((emp) =>
          String(emp.employee_Id || "").trim()
        )
        .filter(Boolean)
        .join(","),
      status: trimmedForm.status,

    };

    try {
      setIsSubmitting(true);
      setApiError("");

      if (projectsEditMode) {
        await api.put(
          API_ENDPOINTS.company.projects.byId(trimmedForm.originalId || trimmedForm.id),
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        await api.post(API_ENDPOINTS.company.projects.list, payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      toast.success(projectsEditMode ? "Project updated successfully." : "Project saved successfully.");
      await fetchProjects();
      closeProjectModal(true);
    } catch (error) {
      console.error("Project save failed:", error);

      const backendMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data ||
        error.message ||
        "Something went wrong while saving the project.";
      const normalizedMessage = String(backendMessage).toLowerCase();

      if (normalizedMessage.includes("duplicate") || normalizedMessage.includes("already exists")) {
        setFormErrors((prev) => ({
          ...prev,
          id: "Project ID already exists",
        }));
      }

      setApiError(String(backendMessage));
      toast.error("Unable to save project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProjectsEdit = (project) => {
    const matchedClient = clients.find(
      (client) =>
        String(client.id) === String(project.clientId) ||
        String(client.name).toLowerCase() === String(project.client).toLowerCase()
    );

    const resolvedMembers = project.members.length
      ? project.members
      : resolveProjectMembers(project, employeeLookup);

    setProjectsForm({
      name: project.name || "",
      id: project.id || "",
      originalId: project.id || "",
      client: matchedClient ? String(matchedClient.id) : "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      team: String(project.memberCount ?? resolvedMembers.length ?? project.team ?? ""),
      status: project.status || "",
    });
    setSelectedEmployees(
      dedupeEmployeesByKey(
        (project.projectMembers || resolvedMembers || []).map((member) => ({
          employee_Id: member.employee_Id,
          employeeName: member.name || member.employeeName,
          name: member.name || member.employeeName,
        }))
      )
    );
    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
    setFormErrors({});
    setApiError("");
    setProjectsEditMode(true);
    setIsClosingModal(false);
    setProjectsShowModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await api.delete(API_ENDPOINTS.company.projects.byId(projectToDelete.id));
      toast.success("Project deleted successfully.");
      await fetchProjects();
      closeDeletePopup();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Unable to delete project.");
    }
  };

  const statusOptions = useMemo(
    () =>
      PROJECT_STATUSES.map((status) => ({
        value: status,
        label: status,
      })),
    []
  );

  const selectedProjectMembers = useMemo(
    () =>
      dedupeEmployeesByKey(
        selectedProject?.projectMembers ||
        selectedProject?.members ||
        []
      ),
    [selectedProject]
  );
  const selectedProjectMemberCount =
    selectedProjectMembers.length;

  const totalPages = Math.max(
    1,
    Math.ceil(projectsList.length / PROJECTS_PER_PAGE)
  );

  const indexOfLastProject = currentPage * PROJECTS_PER_PAGE;
  const indexOfFirstProject = indexOfLastProject - PROJECTS_PER_PAGE;

  const currentProjects = useMemo(
    () => projectsList.slice(indexOfFirstProject, indexOfLastProject),
    [indexOfFirstProject, indexOfLastProject, projectsList]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [projectsList.length]);

  return (
    <div className="projects-page">
      <ToastContainer position="top-right" autoClose={2600} />

      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p>{projectsList.length} projects tracked across the company</p>
        </div>

        <button className="projects-add-btn" onClick={openCreateProjectModal}>
          + New Project
        </button>
      </div>

      <div className="projects-table-wrapper app-table-scroll">
        <table className="projects-table">
          <colgroup>
            <col style={{ width: "210px" }} />
            <col style={{ width: "180px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "150px" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              <th>Start</th>
              <th>End</th>
              <th>Team</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {projectsLoading ? (
              <tr>
                <td colSpan="7" style={{ padding: "0" }}>
                  <TableSkeleton
                    rows={10}
                    columns={[
                      { width: "minmax(220px, 1.4fr)", type: "avatar", headerWidth: "60%" },
                      { width: "180px", headerWidth: "58%" },
                      { width: "120px", headerWidth: "54%" },
                      { width: "120px", headerWidth: "54%" },
                      { width: "100px", type: "status", headerWidth: "52%" },
                      { width: "140px", type: "status", headerWidth: "56%" },
                      { width: "150px", type: "actions", headerWidth: "54%" },
                    ]}
                  />
                </td>
              </tr>
            ) : projectsList.length === 0 ? (
              <tr>
                <td colSpan="7" className="projects-empty-state">
                  No projects available.
                </td>
              </tr>
            ) : (
              currentProjects.map((project, index) => (
                <tr
                  key={`${project.id}-${index}`}
                  className="project-row-clickable"
                  onClick={() => {
                    setSelectedProject(project);
                    setShowProjectDetails(true);
                  }}
                >
                  <td>
                    <div
                      className="projects-name project-clickable"
                      onClick={() => {
                        setSelectedProject(project);
                        setShowProjectDetails(true);
                      }}
                    >
                      <strong className="project-name" title={project.name}>
                        {project.name || "-"}
                      </strong>

                      <span className="project-id" title={project.id}>
                        {project.id || "-"}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span className="projects-cell-truncate" title={project.client}>
                      {project.client || "-"}
                    </span>
                  </td>
                  <td>{formatDisplayDate(project.startDate)}</td>
                  <td>{formatDisplayDate(project.endDate)}</td>
                  <td>{project.team || "-"}</td>
                  <td>
                    <span
                      className={`projects-status ${getStatusClassName(project.status)}`}
                    >
                      {project.status || "-"}
                    </span>
                  </td>

                  <td>
                    <div
                      className="projects-action-cell"
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="projects-table-edit-btn app-action-button app-action-button--edit"
                        type="button"
                        style={{
                          width: "75px",
                          minWidth: "75px",
                          height: "40px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectsEdit(project);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="projects-delete-btn app-action-button app-action-button--delete"
                        type="button"
                        style={{
                          width: "75px",
                          minWidth: "75px",
                          height: "40px",
                        }}
                        onClick={() => {
                          setProjectToDelete(project);
                          setIsClosingDeletePopup(false);
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

      {projectsList.length > 0 && (
        <AppPagination
          totalItems={projectsList.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemLabel="projects"
        />
      )}

      {projectsShowModal && (
        <div
          className={`projects-modal-overlay ${isClosingModal ? "closing" : ""}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeProjectModal();
            }
          }}
        >
          <div
            className={`projects-modal ${isClosingModal ? "closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            aria-describedby="project-modal-description"
          >
            <div className="projects-modal-header">
              <div>
                <h3 id="project-modal-title">
                  {projectsEditMode ? "Update Project" : "Add Project"}
                </h3>
                <p id="project-modal-description">
                  Capture the project details with clean validation and consistent dates.
                </p>
              </div>

              <button
                type="button"
                className="projects-modal-close"
                aria-label="Close project form"
                onClick={closeProjectModal}
                disabled={isSubmitting}
              >
                x
              </button>
            </div>

            <form className="projects-form" onSubmit={handleSaveProject} noValidate>
              {apiError && (
                <div className="projects-form-alert" role="alert">
                  {apiError}
                </div>
              )}

              <div className="projects-form-grid">
                <div className="projects-field">
                  <label htmlFor="project-name-input">
                    Project Name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    ref={projectNameInputRef}
                    id="project-name-input"
                    name="name"
                    type="text"
                    value={projectsForm.name}
                    onChange={handleProjectsChange}
                    onBlur={handleProjectsBlur}
                    aria-invalid={Boolean(formErrors.name)}
                    aria-describedby={formErrors.name ? "project-name-error" : undefined}
                    className={formErrors.name ? "has-error" : ""}
                    maxLength={100}
                    autoComplete="off"
                  />
                  {formErrors.name && (
                    <p id="project-name-error" className="projects-field-error">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label htmlFor="project-id-input">
                    Project ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="project-id-input"
                    name="id"
                    type="text"
                    value={projectsForm.id}
                    readOnly
                    disabled={isSubmitting || projectsEditMode}
                  />
                  <p id="project-id-helper" className="projects-field-helper">
                    Use a format like PRJ001
                  </p>
                  {formErrors.id && (
                    <p id="project-id-error" className="projects-field-error">
                      {formErrors.id}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label htmlFor="project-client-select">
                    Client <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="project-client-select"
                    name="client"
                    value={projectsForm.client}
                    onChange={handleProjectsChange}
                    onBlur={handleProjectsBlur}
                    aria-invalid={Boolean(formErrors.client)}
                    aria-describedby={formErrors.client ? "project-client-error" : undefined}
                    className={formErrors.client ? "has-error" : ""}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.client && (
                    <p id="project-client-error" className="projects-field-error">
                      {formErrors.client}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label>
                    Team Members <span>*</span>
                  </label>

                  <div className="employee-select-wrapper">

                    <div
                      className="employee-select-box"
                      onClick={() =>
                        setShowEmployeeDropdown(!showEmployeeDropdown)
                      }
                    >
                      <span>
                        {selectedEmployees.length > 0
                          ? `${selectedEmployees.length} Employees Selected`
                          : "Select Employees"}
                      </span>

                      <span className="dropdown-arrow">
                        ▼
                      </span>
                    </div>

                    {showEmployeeDropdown && (
                      <div className="employee-dropdown-popup">

                        <input
                          type="text"
                          placeholder="Search employee..."
                          value={employeeSearch}
                          onChange={(e) =>
                            setEmployeeSearch(e.target.value)
                          }
                          className="employee-search-input"
                        />

                        <div className="employee-dropdown-list">

                          {employees
                            .filter((emp) => {
                              const fullName =
                                emp.employeeName ||
                                emp.employee_Name ||
                                emp.name ||
                                emp.fullName ||
                                `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                                emp.employee_Id;

                              return (
                                fullName
                                  .toLowerCase()
                                  .includes(employeeSearch.toLowerCase()) ||
                                String(emp.employee_Id || "")
                                  .toLowerCase()
                                  .includes(employeeSearch.toLowerCase())
                              );
                            })
                            .map((emp, index) => {

                              const fullName =
                                emp.employeeName ||
                                emp.employee_Name ||
                                emp.name ||
                                emp.fullName ||
                                `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                                emp.employee_Id;

                              const selected =
                                selectedEmployees.some(
                                  (e) =>
                                    getEmployeeSelectionKey(e) ===
                                    getEmployeeSelectionKey(emp)
                                );

                              return (
                                <div
                                  key={`${emp.employee_Id}-${index}`}
                                  className={`employee-option ${selected ? "selected" : ""
                                    }`}
                                  onClick={() => {

                                    if (selected) {
                                      setSelectedEmployees((prev) =>
                                        prev.filter(
                                          (x) =>
                                            getEmployeeSelectionKey(x) !==
                                            getEmployeeSelectionKey(emp)
                                        )
                                      );
                                    } else {
                                      setSelectedEmployees((prev) => {
                                        const nextEmployee =
                                          normalizeEmployeeRecord(emp);
                                        const nextEmployeeKey =
                                          getEmployeeSelectionKey(nextEmployee);

                                        if (
                                          prev.some(
                                            (item) =>
                                              getEmployeeSelectionKey(item) ===
                                              nextEmployeeKey
                                          )
                                        ) {
                                          return prev;
                                        }

                                        return [
                                          ...prev,
                                          nextEmployee,
                                        ];
                                      });
                                    }

                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      color: "var(--text-strong)",
                                    }}
                                  >
                                    {fullName}
                                  </div>

                                  <small
                                    style={{
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    Employee ID: {emp.employee_Id}
                                  </small>
                                </div>
                              );

                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="selected-count">
                    Selected Employees: {selectedEmployees.length}
                  </div>

                  <div className="selected-members-wrapper">
                    {selectedEmployees.map((emp, index) => (
                      <div
                        key={`${emp.employee_Id}-${index}`}
                        className="selected-member-chip"
                      >
                        <span className="employee-id">
                          {emp.employee_Id}
                        </span>

                        <span className="employee-name">
                          {emp.employeeName ||
                            emp.employee_Name ||
                            emp.name ||
                            emp.fullName ||
                            `${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            const updatedEmployees = selectedEmployees.filter(
                              (item) =>
                                getEmployeeSelectionKey(item) !==
                                getEmployeeSelectionKey(emp)
                            );

                            setSelectedEmployees(updatedEmployees);

                            setProjectsForm((prev) => ({
                              ...prev,
                              team: String(updatedEmployees.length),
                            }));
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="projects-field">
                  <label htmlFor="project-start-date">
                    Start Date <span aria-hidden="true">*</span>
                  </label>
                  <AppDatePicker
                    id="project-start-date"
                    name="startDate"
                    value={projectsForm.startDate}
                    onChange={handleProjectsChange}
                    aria-invalid={Boolean(formErrors.startDate)}
                    aria-describedby={
                      formErrors.startDate ? "project-start-date-error" : "project-start-date-helper"
                    }
                    className={formErrors.startDate ? "has-error" : ""}
                    disabled={isSubmitting}
                  />
                  <p id="project-start-date-helper" className="projects-field-helper">
                    {projectsForm.startDate
                      ? formatDisplayDate(projectsForm.startDate)
                      : "Format: 05 Apr 2026"}
                  </p>
                  {formErrors.startDate && (
                    <p id="project-start-date-error" className="projects-field-error">
                      {formErrors.startDate}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label htmlFor="project-end-date">
                    End Date
                  </label>
                  <AppDatePicker
                    id="project-end-date"
                    name="endDate"
                    value={projectsForm.endDate}
                    minDate={projectsForm.startDate || undefined}
                    onChange={handleProjectsChange}
                    aria-invalid={Boolean(formErrors.endDate)}
                    aria-describedby={
                      formErrors.endDate ? "project-end-date-error" : "project-end-date-helper"
                    }
                    className={formErrors.endDate ? "has-error" : ""}
                    disabled={isSubmitting}
                  />
                  <p id="project-end-date-helper" className="projects-field-helper">
                    {projectsForm.endDate
                      ? formatDisplayDate(projectsForm.endDate)
                      : "Format: 05 Apr 2026"}
                  </p>
                  {formErrors.endDate && (
                    <p id="project-end-date-error" className="projects-field-error">
                      {formErrors.endDate}
                    </p>
                  )}
                </div>

                <div className="projects-field projects-field-full">
                  <label htmlFor="project-status-select">
                    Status <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="project-status-select"
                    name="status"
                    value={projectsForm.status}
                    onChange={handleProjectsChange}
                    onBlur={handleProjectsBlur}
                    aria-invalid={Boolean(formErrors.status)}
                    aria-describedby={formErrors.status ? "project-status-error" : undefined}
                    className={formErrors.status ? "has-error" : ""}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.status && (
                    <p id="project-status-error" className="projects-field-error">
                      {formErrors.status}
                    </p>
                  )}
                </div>
              </div>

              <div className="projects-modal-btns">
                <button
                  type="button"
                  className="projects-secondary-btn"
                  onClick={closeProjectModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="projects-save-btn" disabled={isSubmitting}>
                  {isSubmitting && <span className="projects-btn-spinner" aria-hidden="true" />}
                  {isSubmitting
                    ? projectsEditMode
                      ? "Updating..."
                      : "Saving..."
                    : projectsEditMode
                      ? "Update"
                      : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }

      {
        showDeletePopup && (
          <div
            className={`projects-modal-overlay ${isClosingDeletePopup ? "closing" : ""}`}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeDeletePopup();
              }
            }}
          >
            <div
              className={`projects-modal projects-modal-small ${isClosingDeletePopup ? "closing" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-delete-title"
            >
              <div className="projects-delete-content">
                <h3 id="project-delete-title" className="projects-delete-title">
                  Confirm Delete
                </h3>

                <p className="projects-delete-copy">
                  Are you sure you want to delete this project?
                </p>

                <div className="projects-delete-actions">
                  <button className="projects-secondary-btn" onClick={closeDeletePopup}>
                    Cancel
                  </button>
                  <button
                    className="projects-delete-btn app-action-button app-action-button--delete"
                    onClick={confirmDeleteProject}
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {showProjectDetails && (
        <div
          className="projects-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowProjectDetails(false);
            }
          }}
        >
          <div className="project-members-modal">

            <div className="project-members-header">
              <h3>{selectedProject?.name}</h3>

              <button
                type="button"
                onClick={() => setShowProjectDetails(false)}
              >
                ×
              </button>
            </div>

            <p>
              {selectedProjectMemberCount} assigned members
            </p>

            <div className="project-members-list">
              {selectedProjectMembers.length > 0 ? (
                selectedProjectMembers.map((member, index) => (
                  <div
                    key={`${member.employee_Id}-${index}`}
                    className="project-member-card"
                  >
                    <div className="member-avatar">
                      {(
                        member.name ||
                        member.employeeName ||
                        member.fullName ||
                        member.employee_Id ||
                        ""
                      )
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className="member-name">
                        {member.name || member.employeeName || member.fullName}
                      </div>

                      <div className="member-id">
                        {member.employee_Id}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="project-members-empty-state">
                  No assigned members found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  );
};
export default Projects;
