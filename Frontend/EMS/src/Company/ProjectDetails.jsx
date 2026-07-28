import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCloudUploadAlt,
  FaCode,
  FaDownload,
  FaFilter,
  FaFileExcel,
  FaSearch,
  FaSpinner,
  FaSyncAlt,
  FaTimesCircle,
  FaUsers,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toastSuccess, toastError } from "@/components/common/toast/toastService";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import EmptyState from "../components/EmptyState";
import { CardSkeleton, TableSkeleton } from "../components/Skeletons";
import useTheme from "../theme/useTheme";
import { formatDate } from "../utils/date";
import "./../TicketManagement/TicketManagement.css";
import "./ProjectDetails.css";
import AutoAssignConfirmModal from "../TicketManagement/AutoAssignConfirmModal";
import {
  AUTO_ASSIGN_SUCCESS_MESSAGE,
  autoAssignTickets,
  buildAutoAssignPayload,
  downloadTicketTemplate,
  fetchEmployeeTickets,
  fetchProjectTickets,
  getAutoAssignErrorMessage,
  getTicketApiErrorMessage,
  uploadTicketBulkFile,
} from "../services/ticketService";
import {
  getPriorityTone,
  getStatusTone,
  getTicketPriorityLabel,
  getTicketSearchText,
  getTicketStatusLabel,
  normalizeTicketStatus,
} from "../TicketManagement/ticketConfig";

const PROJECT_MEMBER_COLLECTION_KEYS = [
  "teamMembers",
  "projectMembers",
  "project_Members",
  "members",
  "memberDetails",
  "assignedEmployees",
  "employeeDetails",
  "teamMemberTechnologies",
  "memberTechnologies",
  "employeeTechnologies",
];

const TEXT_EMPTY_VALUES = new Set(["", "-", "n/a", "na", "none", "null", "undefined"]);
const PLACEHOLDER_TEXT = "Not Available";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const toText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    return toText(
      firstDefined(
        value.name,
        value.clientName,
        value.client_Name,
        value.fullName,
        value.employeeName,
        value.employee_Name,
        value.label,
        value.title,
        value.value
      )
    );
  }

  return String(value).trim();
};

const displayValue = (value, fallback = PLACEHOLDER_TEXT) => {
  const text = toText(value);
  return text && !TEXT_EMPTY_VALUES.has(text.toLowerCase()) ? text : fallback;
};

const getEmployeeId = (member = {}) =>
  toText(
    firstDefined(
      member.employee_Id,
      member.employee_id,
      member.employeeId,
      member.Employee_Id,
      member.EmployeeID,
      member.id,
      member.employee?.employee_Id,
      member.employee?.employee_id,
      member.employee?.employeeId,
      member.employee?.EmployeeID,
      member.employee?.id
    )
  );

const getEmployeeName = (member = {}) =>
  toText(
    firstDefined(
      member.employeeName,
      member.employee_Name,
      member.name,
      member.fullName,
      member.employeeFullName,
      member.employee?.employeeName,
      member.employee?.employee_Name,
      member.employee?.name,
      member.employee?.fullName,
      member.employee?.employeeFullName,
      member.employee?.firstName && member.employee?.lastName
        ? `${member.employee.firstName} ${member.employee.lastName}`
        : "",
      member.firstName && member.lastName
        ? `${member.firstName} ${member.lastName}`
        : ""
    )
  );

const getMemberKey = (member = {}) => {
  const employeeId = getEmployeeId(member);
  if (employeeId) {
    return employeeId.toLowerCase();
  }

  const employeeName = getEmployeeName(member);
  return employeeName ? employeeName.toLowerCase() : "";
};

const mergeDefinedValues = (target, source = {}) => {
  const next = { ...target };

  Object.entries(source).forEach(([key, value]) => {
    if (value !== undefined && value !== null && toText(value) !== "") {
      next[key] = value;
    }
  });

  return next;
};

const getEmployeeLookupKey = (member = {}) => {
  const employeeId = getEmployeeId(member);
  return employeeId ? employeeId.toLowerCase() : "";
};

const indexMembersByEmployeeId = (members = []) => {
  const lookup = new Map();

  (Array.isArray(members) ? members : []).forEach((member) => {
    const key = getEmployeeLookupKey(member);
    if (!key || lookup.has(key)) {
      return;
    }

    lookup.set(key, member);
  });

  return lookup;
};

const extractProjectCollection = (payload) => {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.result,
    payload?.items,
    payload?.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const matchesProjectId = (project = {}, projectId = "") => {
  const targetId = String(projectId || "").trim().toLowerCase();
  if (!targetId) {
    return false;
  }

  return [
    project.project_Id,
    project.projectId,
    project.projectID,
    project.id,
    project.Project_Id,
    project.ProjectID,
  ].some((value) => String(value || "").trim().toLowerCase() === targetId);
};

const resolveMemberStatus = (member = {}) =>
  (() => {
    if (member.isActive === true) {
      return {
        kind: "active",
        label: "Active Today",
      };
    }

    if (member.isActive === false) {
      return {
        kind: "inactive",
        label: "Inactive Today",
      };
    }

    const attendanceStatus = toText(
      firstDefined(
        member.attendanceStatus,
        member.attendance_status
      )
    );

    if (attendanceStatus === "Active") {
      return { kind: "active", label: "Active Today" };
    }

    if (attendanceStatus === "Inactive") {
      return { kind: "inactive", label: "Inactive Today" };
    }

    return { kind: "unknown", label: "Unknown" };
  })();

const normalizeProjectMember = (member = {}) => {
  console.log("Raw API Member:", member);
  console.log("API isActive:", member.isActive);
  console.log("API attendanceStatus:", member.attendanceStatus);

  const source = member?.employee && typeof member.employee === "object"
    ? { ...member.employee, ...member }
    : member;

  const employeeId = getEmployeeId(source);
  const employeeName = getEmployeeName(source) || employeeId;
  const technology = toText(
    firstDefined(
      source.technology,
      source.projectTechnology,
      source.assignedTechnology,
      source.tech,
      source.techStack,
      source.projectRole,
      source.role
    )
  );
  const status = resolveMemberStatus(source);
  const activityKind = status.kind;
  const activityLabel = status.label;
  const normalizedMember = {
    ...source,
    employeeId,
    employeeName,
    technology,
    activityKind,
    activityLabel,
  };

  console.log("Resolved Activity:", activityKind);

  return normalizedMember;
};

const normalizeProjectMembers = (project = {}) => {
  const mergedMembers = new Map();

  PROJECT_MEMBER_COLLECTION_KEYS.forEach((key) => {
    const value = project?.[key];
    if (!Array.isArray(value)) {
      return;
    }

    value.forEach((entry) => {
      const normalized = normalizeProjectMember(
        typeof entry === "string" || typeof entry === "number"
          ? { employeeId: entry, employeeName: entry }
          : entry
      );

      const memberKey = getMemberKey(normalized) || `member-${mergedMembers.size}`;
      const existing = mergedMembers.get(memberKey) || {};
      mergedMembers.set(memberKey, mergeDefinedValues(existing, normalized));
    });
  });

  return Array.from(mergedMembers.values())
    .map((member) => ({
      ...member,
      employeeId: member.employeeId || member.employee_Id || "",
      employeeName: member.employeeName || member.name || member.fullName || member.employeeId || "",
      technology: member.technology || "",
      activityKind: member.activityKind || "unknown",
      activityLabel: member.activityLabel || "Unknown",
    }))
    .filter((member) => member.employeeId || member.employeeName);
};

const mergeProjectMembersByEmployeeId = (detailsMembers = [], projectsMembers = []) => {
  const detailsLookup = indexMembersByEmployeeId(detailsMembers);
  const projectsLookup = indexMembersByEmployeeId(projectsMembers);
  const orderedEmployeeIds = [];
  const seenEmployeeIds = new Set();

  for (const employeeId of detailsLookup.keys()) {
    if (!seenEmployeeIds.has(employeeId)) {
      seenEmployeeIds.add(employeeId);
      orderedEmployeeIds.push(employeeId);
    }
  }

  for (const employeeId of projectsLookup.keys()) {
    if (!seenEmployeeIds.has(employeeId)) {
      seenEmployeeIds.add(employeeId);
      orderedEmployeeIds.push(employeeId);
    }
  }

  return orderedEmployeeIds.map((employeeId) => {
    const detailsMember = detailsLookup.get(employeeId) || null;
    const projectsMember = projectsLookup.get(employeeId) || null;
    const mergedMember = mergeDefinedValues(detailsMember || projectsMember || {}, {
      isActive: projectsMember?.isActive,
      attendanceStatus: projectsMember?.attendanceStatus,
    });
    const status = resolveMemberStatus(mergedMember);
    const finalMember = {
      ...mergedMember,
      activityKind: status.kind,
      activityLabel: status.label,
    };

    console.log("Projects API Member", projectsMember);
    console.log("Project Details API Member", detailsMember);
    console.log("Merged Member", finalMember);

    return finalMember;
  });
};

const resolveProjectText = (project = {}, keys = []) =>
  toText(firstDefined(...keys.map((key) => project?.[key])));

const resolveProjectDate = (project = {}, keys = []) =>
  toText(firstDefined(...keys.map((key) => project?.[key])));

const getProjectStatusTone = (status = "") => {
  const normalized = String(status || "").toLowerCase();
  if (!normalized) return "unknown";
  if (normalized.includes("progress")) return "progress";
  if (normalized.includes("completed")) return "completed";
  if (normalized.includes("hold")) return "hold";
  return "planned";
};

const unwrapProjectPayload = (payload) => {
  const candidates = [
    payload?.data,
    payload?.data?.data,
    payload?.result,
    payload?.project,
    payload?.item,
    payload?.record,
    payload,
  ];

  for (const candidate of candidates) {
    if (candidate && !Array.isArray(candidate) && typeof candidate === "object") {
      return candidate;
    }
  }

  if (Array.isArray(payload)) {
    return payload[0] || {};
  }

  return {};
};

const normalizeProjectRecord = (project = {}) => {
  const source = unwrapProjectPayload(project);
  const members = normalizeProjectMembers(source);

  return {
    ...source,
    id: resolveProjectText(source, [
      "project_Id",
      "projectId",
      "id",
      "projectID",
      "Project_Id",
      "ProjectID",
    ]),
    name: resolveProjectText(source, [
      "project_Name",
      "projectName",
      "name",
    ]),
    clientName: resolveProjectText(source, [
      "clientName",
      "client_Name",
      "client",
      "clientDetails",
    ]),
    clientId: resolveProjectText(source, [
      "clientId",
      "client_Id",
      "clientID",
    ]),
    startDate: resolveProjectDate(source, [
      "start_Date",
      "startDate",
      "start_date",
    ]),
    endDate: resolveProjectDate(source, [
      "end_Date",
      "endDate",
      "end_date",
    ]),
    status: resolveProjectText(source, [
      "status",
      "projectStatus",
      "project_Status",
    ]),
    projectManager: resolveProjectText(source, [
      "projectManager",
      "projectManagerName",
      "manager",
      "managerName",
      "reportingManager",
      "reportingManagerName",
    ]),
    description: resolveProjectText(source, [
      "description",
      "projectDescription",
      "project_Description",
      "summary",
      "projectSummary",
    ]),
    members,
    projectMembers: members,
  };
};

const formatProjectDate = (value) => {
  const text = toText(value);
  return text ? formatDate(text, PLACEHOLDER_TEXT) : PLACEHOLDER_TEXT;
};

const memberStatusOptions = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const ACCEPTED_TICKET_EXTENSIONS = [".xls", ".xlsx"];

const PROJECT_TICKET_TABLE_COLUMNS = [
  { key: "ticketId", label: "Ticket ID", width: "120px" },
  { key: "title", label: "Title", width: "220px" },
  { key: "category", label: "Category", width: "150px" },
  { key: "priority", label: "Priority", width: "120px" },
  { key: "status", label: "Status", width: "140px" },
  { key: "assignedTo", label: "Assigned To", width: "180px" },
  { key: "assignedDate", label: "Assigned Date", width: "140px" },
  { key: "dueDate", label: "Due Date", width: "140px" },
];

const EMPLOYEE_TICKET_TABLE_COLUMNS = [
  { key: "ticketId", label: "Ticket ID", width: "120px" },
  { key: "title", label: "Title", width: "220px" },
  { key: "description", label: "Description", width: "260px" },
  { key: "priority", label: "Priority", width: "120px" },
  { key: "category", label: "Category", width: "150px" },
  { key: "status", label: "Status", width: "140px" },
  { key: "assignedDate", label: "Assigned Date", width: "140px" },
  { key: "startedDate", label: "Started Date", width: "140px" },
  { key: "completedDate", label: "Completed Date", width: "140px" },
  { key: "estimatedHours", label: "Estimated Hours", width: "140px" },
  { key: "spentHours", label: "Spent Hours", width: "120px" },
];

const EMPLOYEE_TICKET_STATUS_OPTIONS = [
  "All",
  "Open",
  "Assigned",
  "In Progress",
  "Completed",
  "Closed",
];

const isExcelTicketFile = (file) => {
  if (!file) {
    return false;
  }

  const name = String(file.name || "").toLowerCase();
  return ACCEPTED_TICKET_EXTENSIONS.some((extension) => name.endsWith(extension));
};

function StatusPill({ value }) {
  const tone = getStatusTone(value);

  return (
    <span className={`ticket-pill status-pill status-${tone}`}>
      {getTicketStatusLabel(value)}
    </span>
  );
}

function PriorityPill({ value }) {
  const tone = getPriorityTone(value);

  return (
    <span className={`ticket-pill priority-pill priority-${tone}`}>
      {getTicketPriorityLabel(value)}
    </span>
  );
}

function ModalShell({
  open,
  title,
  subtitle,
  headerActions,
  onClose,
  children,
  footer,
  className = "",
}) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  return (
    <div
      className="delete-overlay ticket-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`ticket-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ticket-modal-head">
          <div className="ticket-modal-heading">
            <span className="ticket-eyebrow">Project Details</span>
            <div>
              <h3 id={titleId}>{title}</h3>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>

          <div className="ticket-modal-head-actions">
            {headerActions}
            <button
              type="button"
              className="ticket-modal-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <FaTimes aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="ticket-modal-body">{children}</div>

        {footer ? <div className="ticket-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

function BulkUploadTicketsModal({ open, onClose, onUploaded, projectId }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setDragActive(false);
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) {
      return;
    }

    if (!isExcelTicketFile(file)) {
      toastError("Please select an Excel file (.xls or .xlsx).");
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleInputChange = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadTicketTemplate();
      toastSuccess("Template download started.");
    } catch (error) {
      console.error("Template download failed:", error);
      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to download the template right now."
      );
      toastError(errorMessage);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toastError("Choose a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("uploadFile", selectedFile);

    if (projectId) {
      formData.append("projectId", projectId);
      formData.append("ProjectId", projectId);
    }

    try {
      setUploading(true);
      await uploadTicketBulkFile(formData);
      toastSuccess("Tickets uploaded successfully.");
      await onUploaded?.();
      onClose?.();
    } catch (error) {
      console.error("Bulk upload failed:", error);
      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to upload the ticket file right now."
      );
      toastError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell
      open={open}
      title="Bulk Upload Tickets"
      subtitle="Download the template, fill it out, and upload multiple tickets at once."
      headerActions={
        <button
          type="button"
          className="ticket-button secondary ticket-modal-header-button"
          onClick={handleTemplateDownload}
          disabled={uploading}
        >
          <FaDownload aria-hidden="true" />
          Download Template
        </button>
      }
      onClose={() => {
        if (!uploading) {
          onClose?.();
        }
      }}
      className="ticket-modal-wide"
      footer={
        <>
          <button
            type="button"
            className="ticket-button secondary"
            onClick={clearFile}
            disabled={uploading || !selectedFile}
          >
            Reset
          </button>

          <button
            type="button"
            className="ticket-button primary"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? (
              <>
                <FaSpinner className="ticket-button-spinner" />
                Uploading...
              </>
            ) : (
              <>
                <FaCloudUploadAlt aria-hidden="true" />
                Upload Tickets
              </>
            )}
          </button>
        </>
      }
    >
      <div className="ticket-upload-modal-body">
        <div
          className={`ticket-dropzone ${dragActive ? "is-active" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
        >
          <div className="ticket-dropzone-icon">
            <FaCloudUploadAlt aria-hidden="true" />
          </div>

          <h3>Drag and drop your Excel file here</h3>
          <p>Supported formats: .xls and .xlsx</p>

          <label className="ticket-button primary" htmlFor="project-ticket-bulk-file">
            <FaFileExcel aria-hidden="true" />
            Choose File
          </label>

          <input
            ref={fileInputRef}
            id="project-ticket-bulk-file"
            type="file"
            accept=".xls,.xlsx"
            onChange={handleInputChange}
          />
        </div>

        {selectedFile ? (
          <div className="ticket-upload-selected">
            <div>
              <strong>{selectedFile.name}</strong>
              <span>{Math.round(selectedFile.size / 1024)} KB</span>
            </div>

            <button
              type="button"
              className="ticket-button ghost"
              onClick={clearFile}
              disabled={uploading}
            >
              Remove File
            </button>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

function EmployeeTicketDetailsModal({ open, employee, onClose }) {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [errorMessage, setErrorMessage] = useState("");

  const deferredSearch = useDeferredValue(searchQuery);
  const employeeId = employee?.employeeId || "";
  const employeeName = employee?.employeeName || "Employee";

  useEffect(() => {
    if (!open || !employeeId) {
      setLoading(false);
      setTickets([]);
      setSearchQuery("");
      setStatusFilter("All");
      setErrorMessage("");
      return undefined;
    }

    let active = true;

    const loadEmployeeTickets = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await fetchEmployeeTickets(employeeId);

        if (active) {
          setTickets(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Unable to load employee tickets:", error);
        const message = await getTicketApiErrorMessage(
          error,
          "Unable to load employee tickets right now."
        );
        toastError(message);

        if (active) {
          setTickets([]);
          setErrorMessage(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadEmployeeTickets();

    return () => {
      active = false;
    };
  }, [employeeId, open]);

  const filteredTickets = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const normalizedStatus = normalizeTicketStatus(ticket.status);
      const ticketSearchText = `${getTicketSearchText(ticket)} ${ticket.description || ""}`.toLowerCase();
      const matchesSearch = !query || ticketSearchText.includes(query);
      const matchesStatus =
        statusFilter === "All" || normalizedStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [deferredSearch, statusFilter, tickets]);

  if (!open || !employeeId) {
    return null;
  }

  return (
    <ModalShell
      open
      title="Employee Ticket Details"
      subtitle={employeeName}
      headerActions={<span className="ticket-modal-badge">{employeeId}</span>}
      onClose={onClose}
      className="ticket-modal-wide"
    >
      <div className="ticket-toolbar">
        <label className="ticket-search-group" htmlFor={`employee-ticket-search-${employeeId}`}>
          <FaSearch aria-hidden="true" />
          <input
            id={`employee-ticket-search-${employeeId}`}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search ticket ID, title, description, or status"
          />
        </label>

        <div className="ticket-filter-row">
          <select
            className="ticket-status-select details"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {EMPLOYEE_TICKET_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ticket-modal-loading">
          <FaSpinner className="ticket-button-spinner" aria-hidden="true" />
          Loading employee tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          className="project-details-empty-inline"
          message={
            errorMessage || "No employee tickets match the current filters."
          }
        />
      ) : (
        <div className="ticket-table-card project-details-employee-ticket-card">
          <div className="ticket-table-scroll project-details-employee-ticket-scroll">
            <table className="ticket-table project-details-employee-ticket-table">
              <thead>
                <tr>
                  {EMPLOYEE_TICKET_TABLE_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      style={{
                        width: column.width,
                        minWidth: column.width,
                        maxWidth: column.width,
                      }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.ticketId || `${ticket.title}-${ticket.createdDate}`}>
                    <td>{displayValue(ticket.ticketId, "-")}</td>
                    <td title={displayValue(ticket.title, "-")}>{displayValue(ticket.title, "-")}</td>
                    <td title={displayValue(ticket.description, "-")}>
                      {displayValue(ticket.description, "-")}
                    </td>
                    <td>
                      <PriorityPill value={ticket.priority} />
                    </td>
                    <td title={displayValue(ticket.category, "-")}>
                      {displayValue(ticket.category, "-")}
                    </td>
                    <td>
                      <StatusPill value={ticket.status} />
                    </td>
                    <td>{formatDate(ticket.assignedDate, "-")}</td>
                    <td>{formatDate(ticket.startedDate, "-")}</td>
                    <td>{formatDate(ticket.completedDate, "-")}</td>
                    <td>{displayValue(ticket.estimatedHours, "-")}</td>
                    <td>{displayValue(ticket.spentHours, "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { themeMode } = useTheme();
  const isDarkTheme = themeMode !== "light";

  const initialProject = location.state?.project || location.state?.projectSummary || null;
  const normalizedInitialProject = useMemo(
    () => (initialProject ? normalizeProjectRecord(initialProject) : null),
    [initialProject]
  );

  const [project, setProject] = useState(null);
  const [collectionFallbackProject, setCollectionFallbackProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [technologyFilter, setTechnologyFilter] = useState("All");
  const [activityFilter, setActivityFilter] = useState("All");
  const [projectTickets, setProjectTickets] = useState([]);
  const [projectTicketsLoading, setProjectTicketsLoading] = useState(true);
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignSaving, setAutoAssignSaving] = useState(false);
  const [employeeTicketState, setEmployeeTicketState] = useState({
    open: false,
    employeeId: "",
    employeeName: "",
  });

  const refreshProjectData = useCallback(() => {
    setProjectRefreshKey((current) => current + 1);
    setTicketRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (normalizedInitialProject) {
      console.log("Projects list/route state payload:", normalizedInitialProject);
    }
  }, [normalizedInitialProject]);

  useEffect(() => {
    let active = true;

    const fetchProjectDetails = async () => {
      if (!projectId) {
        if (active) {
          setErrorMessage("Project identifier is missing.");
          setIsLoading(false);
        }
        return;
      }

      try {
        setProject(null);
        setCollectionFallbackProject(null);
        setIsLoading(true);
        setErrorMessage("");

        const detailRequest = api.get(
          API_ENDPOINTS.company.projects.byId(encodeURIComponent(projectId))
        );
        const shouldFetchCollectionFallback = !normalizedInitialProject;
        const collectionRequest = shouldFetchCollectionFallback
          ? api.get(API_ENDPOINTS.company.projects.list)
          : null;

        const [detailResult, collectionResult] = await Promise.allSettled(
          [detailRequest, collectionRequest].filter(Boolean)
        );

        if (!active) {
          return;
        }

        const detailSucceeded = detailResult.status === "fulfilled";
        const collectionSucceeded = !collectionRequest || collectionResult?.status === "fulfilled";

        if (detailSucceeded) {
          console.log("Raw Project Details API Response:", detailResult.value.data);
          setProject(normalizeProjectRecord(detailResult.value.data));
        } else {
          console.error("Project details fetch error:", detailResult.reason);
        }

        if (collectionResult?.status === "fulfilled") {
          console.log("Raw Projects API Response:", collectionResult.value.data);
          const projectList = extractProjectCollection(collectionResult.value.data);
          const matchedProject = projectList.find((entry) =>
            matchesProjectId(entry, projectId)
          );

          if (matchedProject) {
            setCollectionFallbackProject(normalizeProjectRecord(matchedProject));
          }
        } else if (collectionResult?.status === "rejected") {
          console.error("Projects list fallback fetch error:", collectionResult.reason);
        }

        if (!detailSucceeded && !collectionSucceeded) {
          toastError("Failed to load project details.");
        }
      } catch (error) {
        if (active && !normalizedInitialProject) {
          setErrorMessage("Unable to load project details right now.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchProjectDetails();

    return () => {
      active = false;
    };
  }, [normalizedInitialProject, projectId, projectRefreshKey]);

  const metadataProject = project || collectionFallbackProject || normalizedInitialProject;
  const activityProject = normalizedInitialProject || collectionFallbackProject || project;
  const projectData = useMemo(() => {
    if (!metadataProject) {
      return null;
    }

    const detailsMembers = metadataProject?.members || [];
    const activityMembers = activityProject?.members || [];
    const members = mergeProjectMembersByEmployeeId(detailsMembers, activityMembers);

    return {
      ...metadataProject,
      members,
      projectMembers: members,
      teamMembers: members,
      memberCount: members.length,
      team: metadataProject.team || String(members.length || ""),
    };
  }, [metadataProject, activityProject]);

  useEffect(() => {
    let active = true;

    const loadProjectTickets = async () => {
      if (!projectId) {
        if (active) {
          setProjectTickets([]);
          setProjectTicketsLoading(false);
        }
        return;
      }

      try {
        setProjectTicketsLoading(true);

        const tickets = await fetchProjectTickets(projectId);

        if (active) {
          setProjectTickets(Array.isArray(tickets) ? tickets : []);
        }
      } catch (error) {
        console.error("Unable to load project tickets:", error);
        const message = await getTicketApiErrorMessage(
          error,
          "Unable to load project tickets right now."
        );
        toastError(message);

        if (active) {
          setProjectTickets([]);
        }
      } finally {
        if (active) {
          setProjectTicketsLoading(false);
        }
      }
    };

    loadProjectTickets();

    return () => {
      active = false;
    };
  }, [projectId, ticketRefreshKey]);

  const teamMembers = projectData?.members || [];
  const totalTeamMembers = teamMembers.length;
  const projectTitle = toText(projectData?.name) || toText(projectData?.id) || "Project Details";
  const projectStatusLabel = displayValue(projectData?.status);
  const projectStatusTone = getProjectStatusTone(projectData?.status);

  const technologies = useMemo(() => {
    const uniqueTechnologies = new Set();
    teamMembers.forEach((member) => {
      const technology = toText(member.technology);
      if (!technology || TEXT_EMPTY_VALUES.has(technology.toLowerCase())) {
        return;
      }

      uniqueTechnologies.add(technology);
    });

    return Array.from(uniqueTechnologies);
  }, [teamMembers]);

  const activeCount = useMemo(
    () => teamMembers.filter((member) => member.activityKind === "active").length,
    [teamMembers]
  );

  const inactiveCount = useMemo(
    () => teamMembers.filter((member) => member.activityKind === "inactive").length,
    [teamMembers]
  );

  useEffect(() => {
    if (!projectData) {
      return;
    }

    console.log("Total Members:", teamMembers.length);
    console.log(
      "Active Members:",
      teamMembers.filter((member) => member.activityKind === "active")
    );
    console.log(
      "Inactive Members:",
      teamMembers.filter((member) => member.activityKind === "inactive")
    );
  }, [projectData, teamMembers]);

  useEffect(() => {
    const listSourceProject = normalizedInitialProject || collectionFallbackProject;

    if (!listSourceProject || !project) {
      return;
    }

    const snapshot = (member = {}) => ({
      employeeId: member.employeeId,
      employeeName: member.employeeName,
      technology: member.technology,
      isActive: member.isActive,
      attendanceStatus: member.attendanceStatus,
      activityKind: member.activityKind,
      activityLabel: member.activityLabel,
    });

    console.log(
      "GET /Projects snapshot:",
      (listSourceProject.members || []).map(snapshot)
    );
    console.log(
      "GET /Projects/{projectId} snapshot:",
      (project.members || []).map(snapshot)
    );
  }, [collectionFallbackProject, normalizedInitialProject, project]);

  const openEmployeeTickets = useCallback((member) => {
    setEmployeeTicketState({
      open: true,
      employeeId: member?.employeeId || "",
      employeeName: member?.employeeName || member?.employeeId || "Employee",
    });
  }, []);

  const closeEmployeeTickets = useCallback(() => {
    setEmployeeTicketState({
      open: false,
      employeeId: "",
      employeeName: "",
    });
  }, []);

  const handleAutoAssignConfirm = async () => {
    if (!projectId) {
      toastError("Project identifier is missing.");
      return;
    }

    try {
      setAutoAssignSaving(true);
      await autoAssignTickets(buildAutoAssignPayload(projectId));
      toastSuccess(AUTO_ASSIGN_SUCCESS_MESSAGE);
      setAutoAssignOpen(false);
      refreshProjectData();
    } catch (error) {
      console.error("Auto assign failed:", error);
      const message = await getAutoAssignErrorMessage(error);
      toastError(message);
    } finally {
      setAutoAssignSaving(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return teamMembers.filter((member) => {
      const matchesSearch = !query || [
        member.employeeName,
        member.employeeId,
        member.technology,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const matchesTechnology =
        technologyFilter === "All" ||
        String(member.technology || "").toLowerCase() === technologyFilter.toLowerCase();

      const matchesActivity =
        activityFilter === "All" ||
        (activityFilter === "Active" && member.activityKind === "active") ||
        (activityFilter === "Inactive" && member.activityKind === "inactive");

      return matchesSearch && matchesTechnology && matchesActivity;
    });
  }, [activityFilter, technologyFilter, searchQuery, teamMembers]);

  const summaryCards = [
    {
      label: "Total Employees",
      value: totalTeamMembers,
      icon: <FaUsers aria-hidden="true" />,
      tone: "primary",
    },
    {
      label: "Active Today",
      value: activeCount,
      icon: <FaCheckCircle aria-hidden="true" />,
      tone: "success",
    },
    {
      label: "Inactive Today",
      value: inactiveCount,
      icon: <FaTimesCircle aria-hidden="true" />,
      tone: "danger",
    },
    {
      label: "Technologies Used",
      value: technologies.length,
      icon: <FaCode aria-hidden="true" />,
      tone: "info",
    },
  ];

  const clearSearch = () => setSearchQuery("");
  const resetFilters = () => {
    setSearchQuery("");
    setTechnologyFilter("All");
    setActivityFilter("All");
  };

  const handleBack = () => {
    navigate("/projects");
  };

  if (isLoading) {
    return (
      <div className="projects-page project-details-page">
<div className="project-details-hero">
          <div className="project-details-hero-copy">
            <div className="project-details-skeleton-back" />
            <div className="project-details-skeleton-title" />
            <div className="project-details-skeleton-subtitle" />
          </div>
        </div>

        <div className="project-details-summary-grid">
          <CardSkeleton count={4} variant="metric" />
        </div>

        <div className="project-details-overview-grid">
          <CardSkeleton count={1} variant="panel" />
          <CardSkeleton count={1} variant="panel" />
        </div>

        <CardSkeleton count={1} variant="panel" />
        <TableSkeleton
          rows={6}
          columns={[
            { width: "1fr", type: "avatar", headerWidth: "70%" },
            { width: "1fr", headerWidth: "58%" },
            { width: "1fr", headerWidth: "64%" },
            { width: "1fr", type: "status", headerWidth: "54%", align: "center" },
          ]}
        />
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="projects-page project-details-page">
<button type="button" className="project-details-back-btn" onClick={handleBack}>
          <FaArrowLeft aria-hidden="true" />
          Back to Projects
        </button>

        <EmptyState
          className="project-details-empty-state"
          message={errorMessage || "Project not found."}
        />
      </div>
    );
  }

  return (
    <div className="projects-page project-details-page">
<div className="project-details-hero">
        <div className="project-details-hero-copy">
          <button type="button" className="project-details-back-btn" onClick={handleBack}>
            <FaArrowLeft aria-hidden="true" />
            Back to Projects
          </button>

          <span className="project-details-kicker">Project Details</span>

          <div className="project-details-title-row">
            <h2>{projectTitle}</h2>
            {projectData.id && (
              <span className="project-details-id-badge">{projectData.id}</span>
            )}
          </div>
        </div>

        <dl className="project-details-hero-meta">
          <div className="project-details-hero-meta-item">
            <dt>Client</dt>
            <dd>{displayValue(projectData.clientName || projectData.client)}</dd>
          </div>

          <div className="project-details-hero-meta-item">
            <dt>Status</dt>
            <dd>
              <span className={`project-details-status-badge ${projectStatusTone}`}>
                {projectStatusLabel}
              </span>
            </dd>
          </div>

          <div className="project-details-hero-meta-item">
            <dt>Start Date</dt>
            <dd>{formatProjectDate(projectData.startDate)}</dd>
          </div>

          <div className="project-details-hero-meta-item">
            <dt>End Date</dt>
            <dd>{formatProjectDate(projectData.endDate)}</dd>
          </div>
        </dl>
      </div>

      <div className="project-details-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`project-details-summary-card is-${card.tone}`}>
            <div className="project-details-summary-topline">
              <span className="project-details-summary-icon">{card.icon}</span>
              <span className="project-details-summary-label">{card.label}</span>
            </div>
            <strong className="project-details-summary-value">{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="project-details-overview-grid">
        <section className="project-details-card project-details-card--info">
          <div className="project-details-card-header">
            <div>
              <span className="project-details-card-kicker">Project Information</span>
              <h3>Overview</h3>
              <p>Primary project data pulled from the backend response.</p>
            </div>
          </div>

          <dl className="project-details-info-grid">
            <div className="project-details-info-item">
              <dt>Project Name</dt>
              <dd>{displayValue(projectData.name)}</dd>
            </div>

            <div className="project-details-info-item">
              <dt>Project ID</dt>
              <dd>{displayValue(projectData.id)}</dd>
            </div>

            <div className="project-details-info-item">
              <dt>Client Name</dt>
              <dd>{displayValue(projectData.clientName || projectData.client)}</dd>
            </div>

            <div className="project-details-info-item">
              <dt>Project Manager</dt>
              <dd>{displayValue(projectData.projectManager)}</dd>
            </div>

            <div className="project-details-info-item">
              <dt>Start Date</dt>
              <dd>
                <FaCalendarAlt aria-hidden="true" />
                <span>{formatProjectDate(projectData.startDate)}</span>
              </dd>
            </div>

            <div className="project-details-info-item">
              <dt>End Date</dt>
              <dd>
                <FaCalendarAlt aria-hidden="true" />
                <span>{formatProjectDate(projectData.endDate)}</span>
              </dd>
            </div>

            <div className="project-details-info-item">
              <dt>Project Status</dt>
              <dd>
                <span className={`project-details-status-badge ${projectStatusTone}`}>
                  {projectStatusLabel}
                </span>
              </dd>
            </div>

            <div className="project-details-info-item">
              <dt>Total Team Members</dt>
              <dd>{totalTeamMembers}</dd>
            </div>

            <div className="project-details-info-item project-details-info-item--full">
              <dt>Project Description</dt>
              <dd className="project-details-description">
                {displayValue(projectData.description)}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="project-details-card project-details-card--tech">
          <div className="project-details-card-header">
            <div>
              <span className="project-details-card-kicker">Technology</span>
              <h3>Stack Snapshot</h3>
              <p>Unique technologies extracted directly from assigned employees.</p>
            </div>
          </div>

          {technologies.length > 0 ? (
            <div className="project-details-tech-list">
              {technologies.map((technology) => (
                <span key={technology} className="project-details-tech-chip">
                  {technology}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState
              className="project-details-empty-inline"
              message="No technology data found for this project."
            />
          )}
        </aside>
      </div>

      <section className="project-details-card project-details-card--table project-details-card--tickets">
        <div className="project-details-card-header project-details-card-header--stack">
          <div>
            <span className="project-details-card-kicker">Project Tickets</span>
            <h3>Ticket Queue</h3>
            <p>
              Review tickets for this project, upload new tickets in bulk, or auto
              assign unassigned work.
            </p>
          </div>

          <div className="project-details-ticket-actions">
            <button
              type="button"
              className="ticket-button secondary"
              onClick={() => setBulkUploadOpen(true)}
              disabled={!projectId}
            >
              <FaCloudUploadAlt aria-hidden="true" />
              Bulk Upload Tickets
            </button>

            <button
              type="button"
              className="ticket-button primary"
              onClick={() => setAutoAssignOpen(true)}
              disabled={!projectId}
            >
              <FaSyncAlt aria-hidden="true" />
              Auto Assign
            </button>
          </div>
        </div>

        {projectTicketsLoading ? (
          <TableSkeleton
            rows={5}
            columns={PROJECT_TICKET_TABLE_COLUMNS.map((column, index) => ({
              width: column.width,
              type:
                index === 0
                  ? "avatar"
                  : index === PROJECT_TICKET_TABLE_COLUMNS.length - 1
                    ? "actions"
                    : "text",
              headerWidth: index === 0 ? "70%" : "62%",
            }))}
          />
        ) : (
          projectTickets.length > 0 ? (
            <div className="ticket-table-card project-details-ticket-table-card">
              <div className="ticket-table-scroll project-details-ticket-scroll">
                <table className="ticket-table project-details-ticket-table">
                  <thead>
                    <tr>
                      {PROJECT_TICKET_TABLE_COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          style={{
                            width: column.width,
                            minWidth: column.width,
                            maxWidth: column.width,
                          }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {projectTickets.map((ticket) => (
                      <tr key={ticket.ticketId || `${ticket.title}-${ticket.createdDate}`}>
                        <td>{displayValue(ticket.ticketId, "-")}</td>
                        <td title={displayValue(ticket.title, "-")}>
                          {displayValue(ticket.title, "-")}
                        </td>
                        <td title={displayValue(ticket.category, "-")}>
                          {displayValue(ticket.category, "-")}
                        </td>
                        <td>
                          <PriorityPill value={ticket.priority} />
                        </td>
                        <td>
                          <StatusPill value={ticket.status} />
                        </td>
                        <td title={displayValue(ticket.assignedTo || ticket.assignedBy, "-")}>
                          {displayValue(ticket.assignedTo || ticket.assignedBy, "-")}
                        </td>
                        <td>{formatDate(ticket.assignedDate, "-")}</td>
                        <td>{formatDate(ticket.dueDate, "-")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null
        )}
      </section>

      <section className="project-details-card project-details-card--table">
        <div className="project-details-card-header project-details-card-header--stack">
          <div>
            <span className="project-details-card-kicker">Team Members</span>
            <h3>Assigned Employees</h3>
            <p>
              Search by employee name, employee ID, or technology. Filter by backend
              activity state and technology.
            </p>
          </div>
        </div>

        <div className="project-details-toolbar">
          <label className="project-details-search" htmlFor="project-details-search">
            <FaSearch className="project-details-search-icon" aria-hidden="true" />
            <input
              id="project-details-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search employee, ID or technology"
            />
            {searchQuery && (
              <button
                type="button"
                className="project-details-clear-btn"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>

          <label className="project-details-select-wrap" htmlFor="project-details-technology">
            <span className="project-details-filter-label">
              <FaCode aria-hidden="true" />
              Technology
            </span>
            <select
              id="project-details-technology"
              value={technologyFilter}
              onChange={(event) => setTechnologyFilter(event.target.value)}
            >
              <option value="All">All Technologies</option>
              {technologies.map((technology) => (
                <option key={technology} value={technology}>
                  {technology}
                </option>
              ))}
            </select>
          </label>

          <div className="project-details-filter-group" role="group" aria-label="Today status filter">
            <span className="project-details-filter-label">
              <FaFilter aria-hidden="true" />
              Today Status
            </span>
            <div className="project-details-status-filters">
              {memberStatusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`project-details-status-filter ${activityFilter === option.value ? "is-active" : ""}`}
                  onClick={() => setActivityFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="project-details-table-wrapper">
          <table className="project-details-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Employee ID</th>
                <th>Technology</th>
                <th>Today's Status</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className="project-details-empty-state-card">
                      <div className="project-details-empty-state-icon">
                        <FaUsers aria-hidden="true" />
                      </div>
                      <div className="project-details-empty-state-copy">
                        <h4>No employees are assigned yet</h4>
                        <p>
                          Once the backend returns project members, their name, ID,
                          technology, and today&apos;s activity status will appear here.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className="project-details-empty-state-card">
                      <div className="project-details-empty-state-icon">
                        <FaSearch aria-hidden="true" />
                      </div>
                      <div className="project-details-empty-state-copy">
                        <h4>No employees match the current filters</h4>
                        <p>
                          Try a different search term or clear the filters to view the
                          full team.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="project-details-reset-btn"
                        onClick={resetFilters}
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => (
                  <tr key={`${member.employeeId || member.employeeName || "member"}-${index}`}>
                    <td>
                      <div className="project-details-member-name-wrap">
                        <span className="project-details-member-avatar">
                          {(member.employeeName || member.employeeId || "NA")
                            .substring(0, 2)
                            .toUpperCase()}
                        </span>
                        <div className="project-details-member-name-block">
                          <button
                            type="button"
                            className="project-details-member-name-btn"
                            onClick={() => openEmployeeTickets(member)}
                            title={`View tickets for ${displayValue(member.employeeName)}`}
                          >
                            <strong className="project-details-member-name">
                              {displayValue(member.employeeName)}
                            </strong>
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="project-details-table-value" title={displayValue(member.employeeId)}>
                        {displayValue(member.employeeId)}
                      </span>
                    </td>
                    <td>
                      <span className="project-details-table-value" title={displayValue(member.technology)}>
                        {displayValue(member.technology)}
                      </span>
                    </td>
                    <td className="project-details-status-cell">
                      <span className={`project-details-activity-badge is-${member.activityKind}`}>
                        {member.activityLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <BulkUploadTicketsModal
        open={bulkUploadOpen}
        projectId={projectId}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={refreshProjectData}
      />

      <AutoAssignConfirmModal
        open={autoAssignOpen}
        saving={autoAssignSaving}
        onClose={() => {
          if (!autoAssignSaving) {
            setAutoAssignOpen(false);
          }
        }}
        onConfirm={handleAutoAssignConfirm}
      />

      <EmployeeTicketDetailsModal
        open={employeeTicketState.open}
        employee={employeeTicketState}
        onClose={closeEmployeeTickets}
      />
    </div>
  );
}

export default ProjectDetails;
