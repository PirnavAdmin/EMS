import React, { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCode,
  FaFilter,
  FaSearch,
  FaTimesCircle,
  FaUsers,
  FaCheckCircle,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import EmptyState from "../components/EmptyState";
import { CardSkeleton, TableSkeleton } from "../components/Skeletons";
import { formatDate } from "../utils/date";
import "./ProjectDetails.css";

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

const parseBooleanLike = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
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
    const isActive = parseBooleanLike(firstDefined(member.isActive, member.is_active));
    if (isActive !== null) {
      return {
        kind: isActive ? "active" : "inactive",
        label: isActive ? "Active Today" : "Inactive Today",
      };
    }

    const attendanceStatus = toText(
      firstDefined(
        member.attendanceStatus,
        member.attendance_status,
        member.todayStatus,
        member.activityStatus,
        member.statusToday,
        member.todayAttendance
      )
    );

    if (!attendanceStatus) {
      return { kind: "unknown", label: "Unknown" };
    }

    const normalized = attendanceStatus.toLowerCase();

    if (normalized.includes("inactive")) {
      return { kind: "inactive", label: "Inactive Today" };
    }

    if (normalized.includes("active")) {
      return { kind: "active", label: "Active Today" };
    }

    return { kind: "unknown", label: "Unknown" };
  })();

const normalizeProjectMember = (member = {}) => {
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
  const attendanceStatus = toText(
    firstDefined(
      source.attendanceStatus,
      source.attendance_status,
      source.todayStatus,
      source.activityStatus,
      source.statusToday,
      source.todayAttendance
    )
  );
  const isActive = parseBooleanLike(firstDefined(source.isActive, source.is_active));
  const status = resolveMemberStatus(source);
  const normalizedMember = {
    employeeId,
    employeeName,
    technology,
    attendanceStatus,
    isActive,
    activityKind: status.kind,
    activityLabel: status.label,
  };

  console.log("Project Member Before Normalize:", member);
  console.log("Normalized Member:", normalizedMember);

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
      employeeId: member.employeeId || member.employee_Id || "",
      employeeName: member.employeeName || member.name || member.fullName || member.employeeId || "",
      technology: member.technology || "",
      attendanceStatus: member.attendanceStatus || "",
      isActive: member.isActive,
      activityKind: member.activityKind || "unknown",
      activityLabel: member.activityLabel || "Unknown",
    }))
    .filter((member) => member.employeeId || member.employeeName);
};

const resolveProjectText = (project = {}, keys = []) =>
  toText(firstDefined(...keys.map((key) => project?.[key])));

const resolveProjectDate = (project = {}, keys = []) =>
  toText(firstDefined(...keys.map((key) => project?.[key])));

const getStatusTone = (status = "") => {
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

function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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
          toast.error("Failed to load project details.");
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
  }, [normalizedInitialProject, projectId]);

  const metadataProject = project || collectionFallbackProject || normalizedInitialProject;
  const membersProject = normalizedInitialProject || collectionFallbackProject || project;
  const projectData = useMemo(() => {
    if (!metadataProject) {
      return null;
    }

    const members = membersProject?.members || [];

    return {
      ...metadataProject,
      members,
      projectMembers: membersProject?.projectMembers || members,
      teamMembers: members,
      memberCount: members.length,
      team: membersProject?.team || metadataProject.team || String(members.length || ""),
    };
  }, [metadataProject, membersProject]);

  const teamMembers = projectData?.members || [];
  const totalTeamMembers = teamMembers.length;
  const projectTitle = toText(projectData?.name) || toText(projectData?.id) || "Project Details";
  const projectStatusLabel = displayValue(projectData?.status);
  const projectStatusTone = getStatusTone(projectData?.status);

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
        <ToastContainer position="top-right" autoClose={2500} />

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
        <ToastContainer position="top-right" autoClose={2500} />

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
      <ToastContainer position="top-right" autoClose={2500} />

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
                          <strong
                            className="project-details-member-name"
                            title={displayValue(member.employeeName)}
                          >
                            {displayValue(member.employeeName)}
                          </strong>
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
    </div>
  );
}

export default ProjectDetails;
