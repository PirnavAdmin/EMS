import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Projects.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { toastSuccess, toastError } from "@/components/common/toast/toastService";
import AppDatePicker from "../components/AppDatePicker";
import AppPagination from "../components/AppPagination";
import { TableSkeleton } from "../components/Skeletons";
import { extractCollection } from "../utils/collections";
import { formatDate, toIsoDateString } from "../utils/date";

const PROJECT_STATUSES = [
  "All",
  "Yet to Start",
  "In Progress",
  "Completed",
  "On Hold",
  "Go Live",
];

const ROLES = [
  "Frontend",
  "Backend",
  "Full Stack",
  "Testing / QA",
  "UI / UX",
  "DevOps",
  "Database",
  "Mobile Developer",
  "Cloud Engineer",
  "AI / ML Engineer",
  "Business Analyst",
  "Product Owner",
  "Scrum Master",
  "Project Manager",
  "Team Lead",
  "Support Engineer",
  "Security Engineer",
  "Other",
];

const EMPTY_PROJECT_FORM = {
  name: "",
  id: "",
  originalId: "",
  client: "",
  startDate: "",
  endDate: "",
  status: "",
};

// ... [KEEP ALL YOUR EXISTING HELPER FUNCTIONS HERE] ...
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
  if (employeeId) return employeeId.trim().toLowerCase();
  return getEmployeeName(employee).trim().toLowerCase();
};

const dedupeEmployeesByKey = (employeeList = []) => {
  const uniqueEmployees = new Map();
  employeeList.forEach((employee, index) => {
    const normalizedEmployee = normalizeEmployeeRecord(employee);
    const key = getEmployeeSelectionKey(normalizedEmployee) || `employee-${index}`;
    if (!uniqueEmployees.has(key)) uniqueEmployees.set(key, normalizedEmployee);
  });
  return Array.from(uniqueEmployees.values());
};

const buildEmployeeLookupMap = (employeeList = []) => {
  const lookup = new Map();
  employeeList.forEach((employee) => {
    const normalized = normalizeEmployeeRecord(employee);
    const keys = [normalized.employee_Id, normalized.employeeName, normalized.name, normalized.fullName]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    keys.forEach((key) => lookup.set(key, normalized));
  });
  return lookup;
};

const normalizeEmployeeReference = (value, employeeLookup) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" || typeof value === "number") {
    const rawValue = String(value).trim();
    if (!rawValue) return null;
    const lookupKey = rawValue.toLowerCase();
    const matchedEmployee = employeeLookup.get(lookupKey) || employeeLookup.get(rawValue) || null;
    if (matchedEmployee) return matchedEmployee;
    return normalizeEmployeeRecord({ employee_Id: rawValue, employeeName: rawValue });
  }
  const normalized = normalizeEmployeeRecord(value);
  const lookupKey = normalized.employee_Id.toLowerCase();
  const matchedEmployee =
    employeeLookup.get(lookupKey) ||
    employeeLookup.get(normalized.employeeName.toLowerCase()) ||
    employeeLookup.get(normalized.name.toLowerCase()) ||
    null;
  if (!matchedEmployee) return normalized;
  return {
    ...matchedEmployee,
    ...normalized,
    employee_Id: normalized.employee_Id || matchedEmployee.employee_Id,
    employeeName: normalized.employeeName || matchedEmployee.employeeName || matchedEmployee.name || normalized.name,
    name: normalized.name || matchedEmployee.name || matchedEmployee.employeeName,
    fullName: normalized.fullName || matchedEmployee.fullName || matchedEmployee.name || matchedEmployee.employeeName,
  };
};

const collectProjectMemberEntries = (project) => {
  // Adjusted to look for the new structure or legacy structures
  const memberFields = ["teamMembers", "projectMembers", "project_Members", "members", "memberDetails"];
  const entries = [];

  memberFields.forEach((fieldName) => {
    const value = project?.[fieldName];
    if (value === null || value === undefined || value === "") return;

    if (Array.isArray(value)) {
      entries.push(...value);
      return;
    }

    // Handle legacy string formats if necessary
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (!/[A-Za-z]/.test(trimmed) && !/[;,|]/.test(trimmed)) return;
      entries.push(...trimmed.split(/[,;|]/g).map((item) => item.trim()).filter(Boolean));
      return;
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
  if (resolvedCount > 0) return resolvedCount;
  const rawCount = Number(project?.team_Members ?? project?.teamMembers ?? project?.team ?? project?.memberCount ?? project?.projectMemberCount ?? 0);
  return Number.isFinite(rawCount) ? rawCount : 0;
};

const getProjectTeamLabel = (project, memberCount) => {
  const candidateValues = [project?.team_Members, project?.teamMembers, project?.team, project?.memberCount, project?.projectMemberCount];
  for (const value of candidateValues) {
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    const trimmed = String(value).trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
  }
  return memberCount > 0 ? String(memberCount) : "";
};

const normalizeProjects = (response, employeeLookup = new Map()) =>
  extractCollection(response).map((project) => {
    const members = project.projectMembers?.length
      ? project.projectMembers.map(member => ({
        ...member
      }))
      : dedupeEmployeesByKey(
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
      projectMembers: project.projectMembers || [],
      status: project.status ?? "",
    };
  });

const normalizeClients = (response) =>
  extractCollection(response).map((client) => ({
    id: client.id ?? client.client_Id ?? client.client_Name,
    name: client.client_Name ?? client.name ?? "",
  }));

const sanitizeProjectName = (value) => String(value).replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " ").replace(/^\s+/g, "").slice(0, 50);
const sanitizeProjectId = (value) => String(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
const formatDisplayDate = (value) => formatDate(value);

const normalizeProjectClientId = (value) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  if (/^-?\d+$/.test(text)) {
    const numericValue = Number(text);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return text;
};

const PROJECT_ERROR_FIELD_MAP = {
  projectname: "name",
  project_name: "name",
  name: "name",
  projectid: "id",
  project_id: "id",
  id: "id",
  client: "client",
  clientid: "client",
  client_id: "client",
  clientname: "client",
  client_name: "client",
  startdate: "startDate",
  start_date: "startDate",
  enddate: "endDate",
  end_date: "endDate",
  status: "status",
  projectstatus: "status",
  project_status: "status",
};

const toValidationMessage = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
      .join(" ");
  }

  return String(value ?? "").trim();
};

const mapProjectValidationErrors = (errors = {}) => {
  const mappedErrors = {};
  const generalErrors = [];

  Object.entries(errors || {}).forEach(([rawKey, rawValue]) => {
    const message = toValidationMessage(rawValue);

    if (!message) {
      return;
    }

    const normalizedKey = String(rawKey)
      .replace(/[^A-Za-z0-9_]/g, "")
      .toLowerCase();

    const fieldName = PROJECT_ERROR_FIELD_MAP[normalizedKey];

    if (fieldName) {
      mappedErrors[fieldName] = message;
      return;
    }

    generalErrors.push(`${rawKey}: ${message}`);
  });

  return {
    mappedErrors,
    generalErrors,
  };
};

const getStatusClassName = (status) => {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("progress")) return "progress";
  if (normalized.includes("completed")) return "completed";
  if (normalized.includes("hold")) return "hold";
  return "planned";
};

function Projects() {
  const navigate = useNavigate();
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

  // ENHANCED TEAM STATE
  // Structure: { empKey: { employee: Object, role: string, customRole: string } }
  const [selectedTeamMembers, setSelectedTeamMembers] = useState({});

  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // ✅ NEW: Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 30;

  const projectNameInputRef = useRef(null);
  const employeeLookup = useMemo(() => buildEmployeeLookupMap(employees), [employees]);

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const response = await api.get(API_ENDPOINTS.company.projects.list);
      setProjectRecords(extractCollection(response));
    } catch (error) {
      console.error("Project fetch error:", error);
      toastError("Failed to load projects.");
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
      toastError("Failed to load clients.");
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

  // ✅ Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (!projectsShowModal && !showDeletePopup) {
      document.body.style.overflow = "";
      return undefined;
    }
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
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
      if (showDeletePopup) { closeDeletePopup(); return; }
      if (projectsShowModal) { closeProjectModal(); }
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
    setSelectedTeamMembers({});
    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
  };

  const openCreateProjectModal = () => {
    resetForm();
    setProjectsForm({ ...EMPTY_PROJECT_FORM, id: generateProjectId() });
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
      case "name":
        if (!trimmedValue) return "Project Name is required";
        if (trimmedValue.length < 3) return "Project Name must be at least 3 characters";
        if (trimmedValue.length > 50) return "Project Name cannot exceed 50 characters";
        if (!/^[A-Za-z\s]+$/.test(trimmedValue)) return "Only alphabets are allowed";
        return "";
      case "id":
        if (!trimmedValue) return "Project ID is required";
        if (!/^[A-Z]{3}[0-9]{3}$/.test(trimmedValue)) return "Project ID must be 3 alphabets and 3 numbers (Example: PRJ001)";
        const idExists = projectsList.some(
          (project) =>
            String(project.id).toLowerCase() === trimmedValue.toLowerCase() &&
            String(project.id).toLowerCase() !== String(draftForm.originalId).toLowerCase()
        );
        if (idExists) return "Project ID already exists";
        return "";
      case "client": return trimmedValue ? "" : "Client is required";
      case "startDate": return trimmedValue ? "" : "Start Date is required";
      case "endDate":
        if (trimmedValue && draftForm.startDate && trimmedValue < draftForm.startDate) return "End Date cannot be before Start Date";
        return "";
      case "status": return trimmedValue ? "" : "Status is required";
      default: return "";
    }
  };

  const validateProjectForm = (draftForm = projectsForm) => {
    const nextErrors = {
      name: validateField("name", draftForm),
      id: validateField("id", draftForm),
      client: validateField("client", draftForm),
      startDate: validateField("startDate", draftForm),
      endDate: validateField("endDate", draftForm),
      status: validateField("status", draftForm),
    };

    // Validate Team Members
    const teamMembersArray = Object.values(selectedTeamMembers);
    if (teamMembersArray.length === 0) {
      // Optional: Enforce at least one member? Assuming yes based on requirements.
      // If not required, remove this block.
      // For now, let's assume at least one member is good practice but maybe not strictly enforced unless specified.
      // Requirement 6 says "Employee is required", implying the list shouldn't be empty if we are saving a team.
      // Let's keep it flexible but ensure individual validity.
    }

    let hasTeamError = false;
    teamMembersArray.forEach((member) => {
      if (!member.role) hasTeamError = true;
      if (member.role === "Other" && !member.customRole?.trim()) hasTeamError = true;
    });

    if (hasTeamError) {
      // We can show a generic error or highlight the section. 
      // For simplicity, we'll just prevent save.
    }

    const cleanedErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, message]) => message));
    setFormErrors(cleanedErrors);
    return Object.keys(cleanedErrors).length === 0 && !hasTeamError;
  };

  const updateFieldValue = (name, rawValue) => {
    let nextValue = rawValue;
    if (name === "name") nextValue = sanitizeProjectName(rawValue);
    if (name === "id") nextValue = sanitizeProjectId(rawValue);

    const draftForm = { ...projectsForm, [name]: nextValue };
    if (name === "name") draftForm.name = draftForm.name.replace(/\s{2,}/g, " ");

    setProjectsForm(draftForm);
    setApiError("");

    setFormErrors((prev) => {
      const nextErrors = { ...prev, [name]: validateField(name, draftForm) };
      if (name === "startDate" || name === "endDate") {
        nextErrors.startDate = validateField("startDate", draftForm);
        nextErrors.endDate = validateField("endDate", draftForm);
      }
      return Object.fromEntries(Object.entries(nextErrors).filter(([, message]) => message));
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

  // --- TEAM MEMBER LOGIC ---

  const addTeamMember = (employee) => {
    const key = getEmployeeSelectionKey(employee);
    if (selectedTeamMembers[key]) return; // Already selected

    setSelectedTeamMembers(prev => ({
      ...prev,
      [key]: {
        employee: normalizeEmployeeRecord(employee),
        role: "",
        customRole: ""
      }
    }));
  };

  const removeTeamMember = (empKey) => {
    setSelectedTeamMembers(prev => {
      const next = { ...prev };
      delete next[empKey];
      return next;
    });
  };

  const updateTeamMemberRole = (empKey, role) => {
    setSelectedTeamMembers(prev => ({
      ...prev,
      [empKey]: {
        ...prev[empKey],
        role: role,
        // Clear custom role if switching away from Other
        customRole: role === "Other" ? prev[empKey].customRole : ""
      }
    }));
  };

  const updateTeamMemberCustomRole = (empKey, customRole) => {
    setSelectedTeamMembers(prev => ({
      ...prev,
      [empKey]: {
        ...prev[empKey],
        customRole: customRole
      }
    }));
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();

    const trimmedForm = {
      ...projectsForm,
      name: projectsForm.name.trim().replace(/\s+/g, " "),
      id: projectsForm.id.trim().toUpperCase(),
      client: projectsForm.client.trim(),
      status: projectsForm.status.trim(),
    };

    setProjectsForm(trimmedForm);

    // Validate Basic Fields
    if (!validateProjectForm(trimmedForm)) {
      // Check specifically for team errors to alert user
      const teamMembersArray = Object.values(selectedTeamMembers);
      const invalidMember = teamMembersArray.find(m => !m.role || (m.role === 'Other' && !m.customRole?.trim()));
      if (invalidMember) {
        toastError("Please assign valid roles to all team members.");
      }
      return;
    }

    // Prepare Payload
    const selectedClient =
      clients.find((client) => String(client.id) === String(trimmedForm.client)) ||
      clients.find((client) => String(client.name).toLowerCase() === String(trimmedForm.client).toLowerCase());

    // Transform selectedTeamMembers object to array for payload
    const teamMembersPayload = Object.values(selectedTeamMembers).map((member) => {
      const employeeId = String(member?.employee?.employee_Id ?? "").trim();
      const employeeName = String(
        member?.employee?.employeeName ??
        member?.employee?.name ??
        member?.employee?.fullName ??
        ""
      ).trim();
      const role = String(
        member?.role === "Other" ? member?.customRole : member?.role ?? ""
      ).trim();

      return {
        employee_Id: employeeId,
        employeeId,
        name: employeeName,
        employeeName,
        role,
      };
    });

    const payload = {
      project_Name: trimmedForm.name,
      project_Id: trimmedForm.id,
      client: selectedClient?.name || "",
      clientId: Number(trimmedForm.client),
      start_Date: toIsoDateString(trimmedForm.startDate),
      end_Date: trimmedForm.endDate
        ? toIsoDateString(trimmedForm.endDate)
        : null,

      projectMembers: teamMembersPayload.map((m) => ({
        employee_Id: m.employee_Id,
        name: m.name,
      })),

      teamMemberTechnologies: teamMembersPayload.map((m) => ({
        employee_Id: m.employee_Id,
        employeeId: m.employee_Id,
        technology: m.role,
      })),

      team_Members: String(teamMembersPayload.length),

      status: trimmedForm.status,
    };

    try {
      setIsSubmitting(true);
      setApiError("");
      if (projectsEditMode) {
        const projectRouteId = String(trimmedForm.originalId || trimmedForm.id || "").trim();

        if (!projectRouteId) {
          setApiError("Project identifier is missing.");
          toastError("Unable to save project.");
          return;
        }

        const updateUrl = API_ENDPOINTS.company.projects.byId(encodeURIComponent(projectRouteId));
        const updatePayload = {
          ...payload,
          client: String(selectedClient?.name || trimmedForm.client || "").trim(),
          clientId: normalizeProjectClientId(selectedClient?.id ?? trimmedForm.client),
          client_Id: normalizeProjectClientId(selectedClient?.id ?? trimmedForm.client),
          projectId: trimmedForm.id,
          projectMembers: teamMembersPayload.map((m) => ({
            employee_Id: m.employee_Id,
            employeeId: m.employeeId,
            name: m.name,
            employeeName: m.employeeName,
            technology: m.role,
          })),
          teamMemberTechnologies: teamMembersPayload.map((m) => ({
            employee_Id: m.employee_Id,
            employeeId: m.employeeId,
            technology: m.role,
          })),
        };

        console.log("Update URL:", updateUrl);
        console.log("Update Payload:", updatePayload);

        await api.put(updateUrl, updatePayload, {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        await api.post(API_ENDPOINTS.company.projects.list, payload, { headers: { "Content-Type": "application/json" } });
      }
      toastSuccess(projectsEditMode ? "Project updated successfully." : "Project saved successfully.");
      await fetchProjects();
      closeProjectModal(true);
    } catch (error) {
      console.error("Project save failed:", error);
      console.log("Backend Status:", error.response?.status);

      console.log(
        "Backend Response:",
        JSON.stringify(error.response?.data, null, 2)
      );

      console.log(
        "Validation Errors:",
        JSON.stringify(error.response?.data?.errors, null, 2)
      );

      console.log("Payload Sent:", payload);

      const validationErrors = error.response?.data?.errors;
      if (validationErrors && typeof validationErrors === "object") {
        const { mappedErrors, generalErrors } = mapProjectValidationErrors(validationErrors);

        if (Object.keys(mappedErrors).length > 0) {
          setFormErrors((prev) => ({
            ...prev,
            ...mappedErrors,
          }));
        }

        if (generalErrors.length > 0) {
          setApiError(generalErrors.join(" | "));
        } else {
          setApiError("Please fix the highlighted fields and try again.");
        }

        toastError("Please fix the highlighted fields.");
        return;
      }

      const backendMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data ||
        error.message ||
        "Something went wrong while saving the project.";
      const normalizedMessage = String(backendMessage).toLowerCase();
      if (normalizedMessage.includes("duplicate") || normalizedMessage.includes("already exists")) {
        setFormErrors((prev) => ({ ...prev, id: "Project ID already exists" }));
      }
      setApiError(String(backendMessage));
      toastError("Unable to save project.");
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

    // Resolve members from project data
    const resolvedMembers = project.members.length ? project.members : resolveProjectMembers(project, employeeLookup);

    // Build initial Team Members State
    const initialTeamState = {};

    // Try to map existing roles if they exist in the project object (e.g. project.teamMembers)
    // Otherwise default to empty role
    const existingTechnologies =
      project.projectMembers || [];

    resolvedMembers.forEach((member) => {
      const empKey = getEmployeeSelectionKey(member);
      // Find if this member had a specific role saved
      const savedMemberData = existingTechnologies.find(
        tm => String(tm.employee_Id) === String(member.employee_Id)
      );

      let role = savedMemberData?.technology || "";
      let customRole = "";

      // If the saved role isn't in our standard list, assume it was "Other"
      if (role && !ROLES.includes(role)) {
        customRole = role;
        role = "Other";
      }

      initialTeamState[empKey] = {
        employee: normalizeEmployeeRecord(member),
        role: role,
        customRole: customRole
      };
    });

    setProjectsForm({
      name: project.name || "",
      id: project.id || "",
      originalId: project.id || "",
      client: matchedClient
        ? String(matchedClient.id)
        : String(project.clientId || project.client || ""),
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      status: project.status || "",
    });

    setSelectedTeamMembers(initialTeamState);
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
      toastSuccess("Project deleted successfully.");
      await fetchProjects();
      closeDeletePopup();
    } catch (error) {
      console.error("Delete error:", error);
      toastError("Unable to delete project.");
    }
  };

  const statusOptions = useMemo(() => PROJECT_STATUSES.map((status) => ({ value: status, label: status })), []);

  const openProjectDetails = (project) => {
    if (!project?.id) {
      return;
    }

    navigate(`/projects/${encodeURIComponent(project.id)}`, {
      state: { project },
    });
  };


  // ✅ FILTERED PROJECTS LOGIC
  const filteredProjects = useMemo(() => {
    return projectsList.filter((project) => {
      // Status Filter
      const matchesStatus = statusFilter === "All" || project.status === statusFilter;

      // Search Filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        project.name?.toLowerCase().includes(searchLower) ||
        project.id?.toLowerCase().includes(searchLower) ||
        project.client?.toLowerCase().includes(searchLower) ||
        project.status?.toLowerCase().includes(searchLower);

      return matchesStatus && matchesSearch;
    });
  }, [projectsList, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE));
  const indexOfLastProject = currentPage * PROJECTS_PER_PAGE;
  const indexOfFirstProject = indexOfLastProject - PROJECTS_PER_PAGE;

  const currentProjects = useMemo(
    () => filteredProjects.slice(indexOfFirstProject, indexOfLastProject),
    [filteredProjects, indexOfFirstProject, indexOfLastProject]
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Helper to check if form is valid for submission
  const isFormValid = useMemo(() => {
    // Basic fields valid?
    const basicValid = !formErrors.name && !formErrors.id && !formErrors.client && !formErrors.startDate && !formErrors.endDate && !formErrors.status;
    if (!basicValid) return false;

    // Team members valid?
    const members = Object.values(selectedTeamMembers);
    if (members.length === 0) return false; // Require at least one member

    return members.every(m => {
      if (!m.role) return false;
      if (m.role === "Other" && !m.customRole?.trim()) return false;
      return true;
    });
  }, [formErrors, selectedTeamMembers]);


  return (
    <div className="projects-page">
<div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p>{projectsList.length} projects tracked across the company</p>
        </div>
        <button className="projects-add-btn" onClick={openCreateProjectModal}>
          + New Project
        </button>
      </div>

      {/* ✅ PREMIUM ENTERPRISE SEARCH & FILTER TOOLBAR */}
      <div className="search-filter-toolbar">
        <div className="search-bar-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by project name, ID, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")} aria-label="Clear search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div className="leave-filter-tabs" aria-label="Project status filters">
          {PROJECT_STATUSES.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`leave-filter-tab ${statusFilter === tab ? "is-active" : ""}`}
              onClick={() => setStatusFilter(tab)}
              aria-pressed={statusFilter === tab}
            >
              {tab}
            </button>
          ))}
        </div>
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
            ) : currentProjects.length === 0 ? (
              <tr>
                <td colSpan="7" className="projects-empty-state">
                  {searchQuery || statusFilter !== "All"
                    ? "No matching projects found."
                    : "No projects available."}
                </td>
              </tr>
            ) : (
              currentProjects.map((project, index) => (
                <tr
                  key={`${project.id}-${index}`}
                  className="project-row-clickable"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open details for ${project.name || project.id || "project"}`}
                  onClick={() => openProjectDetails(project)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProjectDetails(project);
                    }
                  }}
                >
                  <td>
                    <div
                      className="projects-name project-clickable"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open details for ${project.name || project.id || "project"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openProjectDetails(project);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          openProjectDetails(project);
                        }
                      }}
                    >
                      <strong className="project-name" title={project.name}>{project.name || "-"}</strong>
                      <span className="project-id" title={project.id}>{project.id || "-"}</span>
                    </div>
                  </td>
                  <td><span className="projects-cell-truncate" title={project.client}>{project.client || "-"}</span></td>
                  <td>{formatDisplayDate(project.startDate)}</td>
                  <td>{formatDisplayDate(project.endDate)}</td>
                  <td>{project.team || "-"}</td>
                  <td>
                    <span className={`projects-status ${getStatusClassName(project.status)}`}>
                      {project.status || "-"}
                    </span>
                  </td>
                  <td>
                    <div className="projects-action-cell" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <button
                        className="projects-table-edit-btn app-action-button app-action-button--edit"
                        type="button"
                        style={{ width: "75px", minWidth: "75px", height: "40px" }}
                        onClick={(e) => { e.stopPropagation(); handleProjectsEdit(project); }}
                      >
                        Edit
                      </button>
                      <button
                        className="projects-delete-btn app-action-button app-action-button--delete"
                        type="button"
                        style={{ width: "75px", minWidth: "75px", height: "40px" }}
                        onClick={(e) => {
                          e.stopPropagation();
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

      {filteredProjects.length > 0 && (
        <AppPagination
          totalItems={filteredProjects.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemLabel="projects"
        />
      )}

      {/* ================= MODALS ================= */}
      {projectsShowModal && (
        <div className={`projects-modal-overlay ${isClosingModal ? "closing" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) closeProjectModal(); }}>
          <div className={`projects-modal ${isClosingModal ? "closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="project-modal-title" aria-describedby="project-modal-description">
            <div className="projects-modal-header">
              <div>
                <h3 id="project-modal-title">{projectsEditMode ? "Update Project" : "Add Project"}</h3>
                <p id="project-modal-description">Capture the project details with clean validation and consistent dates.</p>
              </div>
              <button type="button" className="projects-modal-close" aria-label="Close project form" onClick={closeProjectModal} disabled={isSubmitting}>x</button>
            </div>
            <form className="projects-form" onSubmit={handleSaveProject} noValidate>
              {apiError && <div className="projects-form-alert" role="alert">{apiError}</div>}
              <div className="projects-form-grid">
                <div className="projects-field">
                  <label htmlFor="project-name-input">Project Name <span aria-hidden="true">*</span></label>
                  <input ref={projectNameInputRef} id="project-name-input" name="name" type="text" value={projectsForm.name} onChange={handleProjectsChange} onBlur={handleProjectsBlur} aria-invalid={Boolean(formErrors.name)} aria-describedby={formErrors.name ? "project-name-error" : undefined} className={formErrors.name ? "has-error" : ""} maxLength={100} autoComplete="off" />
                  {formErrors.name && <p id="project-name-error" className="projects-field-error">{formErrors.name}</p>}
                </div>
                <div className="projects-field">
                  <label htmlFor="project-id-input">Project ID <span aria-hidden="true">*</span></label>
                  <input id="project-id-input" name="id" type="text" value={projectsForm.id} readOnly disabled={isSubmitting || projectsEditMode} />
                  <p id="project-id-helper" className="projects-field-helper">Use a format like PRJ001</p>
                  {formErrors.id && <p id="project-id-error" className="projects-field-error">{formErrors.id}</p>}
                </div>
                <div className="projects-field">
                  <label htmlFor="project-client-select">Client <span aria-hidden="true">*</span></label>
                  <select id="project-client-select" name="client" value={projectsForm.client} onChange={handleProjectsChange} onBlur={handleProjectsBlur} aria-invalid={Boolean(formErrors.client)} aria-describedby={formErrors.client ? "project-client-error" : undefined} className={formErrors.client ? "has-error" : ""} disabled={isSubmitting}>
                    <option value="">Select Client</option>
                    {clients.map((client) => (<option key={client.id} value={client.id}>{client.name}</option>))}
                  </select>
                  {formErrors.client && <p id="project-client-error" className="projects-field-error">{formErrors.client}</p>}
                </div>

                {/* ENHANCED TEAM MEMBERS SECTION */}
                <div className="projects-field projects-field-full">
                  <label>Team Members <span>*</span></label>

                  {/* Dropdown Selector */}
                  <div className="employee-select-wrapper">
                    <div className="employee-select-box" onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}>
                      <span>{Object.keys(selectedTeamMembers).length > 0 ? `${Object.keys(selectedTeamMembers).length} Employees Selected` : "Select Employees"}</span>
                      <span className="dropdown-arrow">▼</span>
                    </div>

                    {showEmployeeDropdown && (
                      <div className="employee-dropdown-popup">
                        <input
                          type="text"
                          placeholder="Search employee..."
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          className="employee-search-input"
                          autoFocus
                        />
                        <div className="employee-dropdown-list">
                          {employees.filter((emp) => {
                            const fullName = emp.employeeName || emp.employee_Name || emp.name || emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employee_Id;
                            return fullName.toLowerCase().includes(employeeSearch.toLowerCase()) || String(emp.employee_Id || "").toLowerCase().includes(employeeSearch.toLowerCase());
                          }).map((emp, index) => {
                            const empKey = getEmployeeSelectionKey(emp);
                            const isSelected = !!selectedTeamMembers[empKey];

                            return (
                              <div
                                key={`${emp.employee_Id}-${index}`}
                                className={`employee-option ${isSelected ? "selected" : ""}`}
                                onClick={() => {
                                  if (!isSelected) {
                                    addTeamMember(emp);
                                    setEmployeeSearch(""); // Clear search after selection
                                  }
                                }}
                              >
                                <div style={{ fontWeight: 600, color: "var(--text-strong)" }}>
                                  {emp.employeeName || emp.employee_Name || emp.name || emp.fullName}
                                </div>
                                <small style={{ color: "var(--text-muted)" }}>ID: {emp.employee_Id}</small>
                                {isSelected && <span style={{ marginLeft: 'auto', color: 'var(--success)' }}>✓ Added</span>}
                              </div>
                            );
                          })}
                          {employees.filter((emp) => {
                            const fullName = emp.employeeName || emp.employee_Name || emp.name || emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employee_Id;
                            return fullName.toLowerCase().includes(employeeSearch.toLowerCase()) || String(emp.employee_Id || "").toLowerCase().includes(employeeSearch.toLowerCase());
                          }).length === 0 && (
                              <div className="employee-option" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>No employees found</div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Team Members Cards */}
                  <div className="selected-team-members-container">
                    <div className="team-members-header">
                      <span>Selected Team Members ({Object.keys(selectedTeamMembers).length})</span>
                    </div>

                    {Object.keys(selectedTeamMembers).length === 0 ? (
                      <div className="team-members-empty">No team members assigned yet.</div>
                    ) : (
                      <div className="team-members-list">
                        {Object.entries(selectedTeamMembers).map(([empKey, memberData]) => {
                          const { employee, role, customRole } = memberData;
                          const displayName = employee.employeeName || employee.name || employee.fullName || employee.employee_Id;

                          return (
                            <div key={empKey} className="team-member-card">
                              <div className="team-member-info">
                                <div className="member-avatar-small">
                                  {displayName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="member-details">
                                  <div className="member-name-row">
                                    <span className="member-name-text">{displayName}</span>
                                    <span className="member-id-text">({employee.employee_Id})</span>
                                  </div>
                                </div>
                              </div>

                              <div className="team-member-actions">
                                <div className="role-selector-group">
                                  <label className="role-label">Role</label>
                                  <select
                                    className="role-select-input"
                                    value={role}
                                    onChange={(e) => updateTeamMemberRole(empKey, e.target.value)}
                                  >
                                    <option value="">Select Role</option>
                                    {ROLES.map(r => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                </div>

                                {role === "Other" && (
                                  <div className="custom-role-input-group">
                                    <label className="role-label">Custom Role <span style={{ color: 'var(--theme-danger)' }}>*</span></label>
                                    <input
                                      type="text"
                                      className="custom-role-input"
                                      placeholder="e.g. Cloud Architect"
                                      value={customRole}
                                      onChange={(e) => updateTeamMemberCustomRole(empKey, e.target.value)}
                                    />
                                  </div>
                                )}

                                <button
                                  type="button"
                                  className="remove-member-btn"
                                  onClick={() => removeTeamMember(empKey)}
                                  title="Remove Member"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="projects-field">
                  <label htmlFor="project-start-date">Start Date <span aria-hidden="true">*</span></label>
                  <AppDatePicker id="project-start-date" name="startDate" value={projectsForm.startDate} onChange={handleProjectsChange} aria-invalid={Boolean(formErrors.startDate)} aria-describedby={formErrors.startDate ? "project-start-date-error" : "project-start-date-helper"} className={formErrors.startDate ? "has-error" : ""} disabled={isSubmitting} />
                  <p id="project-start-date-helper" className="projects-field-helper">{projectsForm.startDate ? formatDisplayDate(projectsForm.startDate) : "Format: 05 Apr 2026"}</p>
                  {formErrors.startDate && <p id="project-start-date-error" className="projects-field-error">{formErrors.startDate}</p>}
                </div>
                <div className="projects-field">
                  <label htmlFor="project-end-date">End Date</label>
                  <AppDatePicker id="project-end-date" name="endDate" value={projectsForm.endDate} minDate={projectsForm.startDate || undefined} onChange={handleProjectsChange} aria-invalid={Boolean(formErrors.endDate)} aria-describedby={formErrors.endDate ? "project-end-date-error" : "project-end-date-helper"} className={formErrors.endDate ? "has-error" : ""} disabled={isSubmitting} />
                  <p id="project-end-date-helper" className="projects-field-helper">{projectsForm.endDate ? formatDisplayDate(projectsForm.endDate) : "Format: 05 Apr 2026"}</p>
                  {formErrors.endDate && <p id="project-end-date-error" className="projects-field-error">{formErrors.endDate}</p>}
                </div>
                <div className="projects-field projects-field-full">
                  <label htmlFor="project-status-select">Status <span aria-hidden="true">*</span></label>
                  <select id="project-status-select" name="status" value={projectsForm.status} onChange={handleProjectsChange} onBlur={handleProjectsBlur} aria-invalid={Boolean(formErrors.status)} aria-describedby={formErrors.status ? "project-status-error" : undefined} className={formErrors.status ? "has-error" : ""} disabled={isSubmitting}>
                    <option value="">Select Status</option>
                    {statusOptions.map((status) => (<option key={status.value} value={status.value}>{status.label}</option>))}
                  </select>
                  {formErrors.status && <p id="project-status-error" className="projects-field-error">{formErrors.status}</p>}
                </div>
              </div>
              <div className="projects-modal-btns">
                <button type="button" className="projects-secondary-btn" onClick={closeProjectModal} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="projects-save-btn" disabled={isSubmitting || !isFormValid}>
                  {isSubmitting && <span className="projects-btn-spinner" aria-hidden="true" />}
                  {isSubmitting ? (projectsEditMode ? "Updating..." : "Saving...") : (projectsEditMode ? "Update" : "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeletePopup && (
        <div className={`projects-modal-overlay ${isClosingDeletePopup ? "closing" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) closeDeletePopup(); }}>
          <div className={`projects-modal projects-modal-small ${isClosingDeletePopup ? "closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="project-delete-title">
            <div className="projects-delete-content">
              <h3 id="project-delete-title" className="projects-delete-title">Confirm Delete</h3>
              <p className="projects-delete-copy">Are you sure you want to delete this project?</p>
              <div className="projects-delete-actions">
                <button className="projects-secondary-btn" onClick={closeDeletePopup}>Cancel</button>
                <button className="projects-delete-btn app-action-button app-action-button--delete" onClick={confirmDeleteProject}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Projects;
