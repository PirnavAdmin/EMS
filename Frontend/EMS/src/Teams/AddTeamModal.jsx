import React, { useEffect, useMemo, useState } from "react";
import { FaChevronDown, FaTimes } from "react-icons/fa";
import {
  getAvailableTeamEmployees,
  getTeamManagers,
  getTeamProjects
} from "../services/teamService";
import {
  TEAM_DAY_OPTIONS,
  TEAM_ENGAGEMENT_OPTIONS
} from "./teamsData";
import {
  normalizeCollection,
  normalizeEmployeeRecord,
  normalizeProjectTeamRecord
} from "./teamUtils";

const normalizeSelectionId = (value) => String(value ?? "").trim();

const normalizeProjectId = (value) => {
  const trimmedValue = normalizeSelectionId(value);

  if (!trimmedValue) {
    return "";
  }

  const numericValue = Number(trimmedValue);
  return Number.isNaN(numericValue) ? trimmedValue : numericValue;
};

const getEmployeeId = (employee) =>
  normalizeSelectionId(employee?.employeeId ?? employee?.employee_Id ?? employee?.id);

const getEmployeeName = (employee) =>
  employee?.employeeName || employee?.name || employee?.fullName || "";

const getManagerId = (manager) =>
  normalizeSelectionId(manager?.employeeId ?? manager?.employee_Id ?? manager?.id);

const getManagerName = (manager) =>
  manager?.name || manager?.employeeName || manager?.fullName || "";

const getProjectId = (project) =>
  normalizeSelectionId(project?.projectId ?? project?.project_Id ?? project?.id);

const getProjectName = (project) =>
  project?.projectName || project?.project_Name || project?.name || "";

const createInitialForm = (defaultTeamNumber = "") => ({
  teamNumber: defaultTeamNumber,
  teamName: "",
  reportingManagerId: "",
  engagementType: "Project",
  projectId: "",
  reportingDays: [],
  employeeIds: []
});

const logAddTeamDebug = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

function AddTeamModal({
  open,
  onClose,
  onCreate,
  onOpenExistingTeam,
  defaultTeamNumber = "TM-04",
  saving = false
}) {
  const [form, setForm] = useState(createInitialForm(defaultTeamNumber));
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const selectedProject = useMemo(
    () => {
      const normalizedProjectId = normalizeSelectionId(form.projectId);

      return projects.find((project) =>
        normalizeSelectionId(project.projectId ?? project.id) === normalizedProjectId
      );
    },
    [form.projectId, projects]
  );

  const hasExistingTeam = Boolean(selectedProject?.teamExists);
  const canOpenExistingTeam = Boolean(selectedProject?.teamId != null);

  const selectedMemberIds = useMemo(
    () =>
      new Set(
        form.employeeIds
          .map((id) => normalizeSelectionId(id))
          .filter((id) => id !== "")
      ),
    [form.employeeIds]
  );

  const selectedMembers = useMemo(() => {
    return employees.filter((employee) =>
      selectedMemberIds.has(getEmployeeId(employee))
    );
  }, [employees, selectedMemberIds]);

  const filteredEmployees = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();

    if (!search) {
      return employees;
    }

    return employees.filter((employee) => {
      const employeeName = String(getEmployeeName(employee) || "").toLowerCase();
      const employeeId = String(getEmployeeId(employee) || "").toLowerCase();

      return employeeName.includes(search) || employeeId.includes(search);
    });
  }, [employees, memberSearch]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const controller = new AbortController();

    setForm(createInitialForm(defaultTeamNumber));
    setErrors({});
    setMembersOpen(false);
    setMemberSearch("");

    const fetchDropdowns = async () => {
      try {
        const [employeeRes, managerRes, projectRes] = await Promise.all([
          getAvailableTeamEmployees({
            signal: controller.signal,
            cacheTTL: 60 * 1000
          }),
          getTeamManagers({
            signal: controller.signal,
            cacheTTL: 60 * 1000
          }),
          getTeamProjects({
            signal: controller.signal,
            cacheTTL: 60 * 1000
          })
        ]);

        if (controller.signal.aborted) {
          return;
        }

        const managerSource = Array.isArray(managerRes.data?.managers)
          ? managerRes.data.managers
          : Array.isArray(managerRes.data?.data?.managers)
            ? managerRes.data.data.managers
            : normalizeCollection(managerRes.data);

        const employeeList = normalizeCollection(employeeRes.data).map((item) =>
          normalizeEmployeeRecord(item)
        );
        const managerList = managerSource.map((item) =>
          normalizeEmployeeRecord(item)
        );
        const projectList = normalizeCollection(projectRes.data).map((item) =>
          normalizeProjectTeamRecord(item)
        );

        const normalizedManagers = managerList.filter(Boolean);
        const managerDropdownOptions = normalizedManagers.map((manager) => ({
          label: getManagerName(manager) || getManagerId(manager),
          value: getManagerId(manager),
          employeeId: getManagerId(manager)
        }));

        logAddTeamDebug("MANAGERS API RESPONSE:", managerRes.data);
        logAddTeamDebug("MANAGERS ARRAY:", managerSource);
        logAddTeamDebug("MANAGER DROPDOWN OPTIONS:", managerDropdownOptions);

        setEmployees(employeeList.filter(Boolean));
        setManagers(normalizedManagers);
        setProjects(projectList.filter(Boolean));
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }

        setEmployees([]);
        setManagers([]);
        setProjects([]);
      }
    };

    fetchDropdowns();

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      controller.abort();
      window.removeEventListener("keydown", handleEscape);
    };
  }, [defaultTeamNumber, onClose, open]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value
    }));

    setErrors((current) => ({
      ...current,
      [name]: ""
    }));
  };

  const toggleDay = (day) => {
    setForm((current) => {
      const isSelected = current.reportingDays.includes(day);
      const nextDays = isSelected
        ? current.reportingDays.filter((item) => item !== day)
        : [...current.reportingDays, day];

      return {
        ...current,
        reportingDays: nextDays
      };
    });
  };

  const toggleMember = (employeeId) => {
    const normalizedEmployeeId = normalizeSelectionId(employeeId);

    if (!normalizedEmployeeId) {
      return;
    }

    setForm((current) => {
      const isSelected = current.employeeIds
        .map((id) => normalizeSelectionId(id))
        .includes(normalizedEmployeeId);

      const nextMemberIds = isSelected
        ? current.employeeIds.filter(
            (id) => normalizeSelectionId(id) !== normalizedEmployeeId
          )
        : [...current.employeeIds, normalizedEmployeeId];

      return {
        ...current,
        employeeIds: nextMemberIds
      };
    });
  };

  const removeMember = (employeeId) => {
    const normalizedEmployeeId = normalizeSelectionId(employeeId);

    setForm((current) => ({
      ...current,
      employeeIds: current.employeeIds.filter(
        (id) => normalizeSelectionId(id) !== normalizedEmployeeId
      )
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (hasExistingTeam) {
      nextErrors.projectId = "This project already has a team";
      setErrors(nextErrors);
      return false;
    }

    if (!form.teamNumber.trim()) {
      nextErrors.teamNumber = "Team Number is required";
    }

    if (!form.teamName.trim()) {
      nextErrors.teamName = "Team Name is required";
    }

    if (!form.reportingManagerId.trim()) {
      nextErrors.reportingManagerId = "Reporting Manager is required";
    }

    if (!form.projectId.trim()) {
      nextErrors.projectId = "Project is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePrimaryAction = async () => {
    if (hasExistingTeam) {
      if (canOpenExistingTeam) {
        onOpenExistingTeam?.(selectedProject.teamId);
        return;
      }

      setErrors((current) => ({
        ...current,
        projectId: "This project already has a team"
      }));
      return;
    }

    if (!validate()) {
      return;
    }

    const selectedManager = managers.find(
      (manager) =>
        normalizeSelectionId(getManagerId(manager)) ===
        normalizeSelectionId(form.reportingManagerId)
    );

    logAddTeamDebug("SELECTED MANAGER:", selectedManager);
    logAddTeamDebug(
      "SELECTED MANAGER EMPLOYEE ID:",
      getManagerId(selectedManager) || normalizeSelectionId(form.reportingManagerId)
    );

    const createdTeam = await onCreate?.({
      reportingManagerName:
        getManagerName(selectedManager) || normalizeSelectionId(form.reportingManagerId),
      teamNumber: form.teamNumber.trim().toUpperCase(),
      teamName: form.teamName.trim(),
      reportingManagerId: normalizeSelectionId(form.reportingManagerId),
      engagementType: form.engagementType,
      projectId: normalizeProjectId(form.projectId),
      reportingDays:
        form.reportingDays.length > 0 ? [...form.reportingDays] : [...TEAM_DAY_OPTIONS],
      employeeIds: form.employeeIds
        .map((id) => normalizeSelectionId(id))
        .filter((id) => id !== "")
    });

    if (createdTeam) {
      setForm(createInitialForm(defaultTeamNumber));
      setErrors({});
      setMembersOpen(false);
      onClose?.();
    }
  };

  if (!open) {
    return null;
  }

  const primaryLabel = hasExistingTeam
    ? canOpenExistingTeam
      ? "Open Existing Team"
      : "Team Already Exists"
    : saving
      ? "Creating..."
      : "Create Team";

  return (
    <div
      className="team-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="team-modal" role="dialog" aria-modal="true" aria-labelledby="add-team-title">
        <div className="team-modal-header">
          <div>
            <h3 id="add-team-title" className="team-modal-title">
              Add Team
            </h3>
            <p className="team-modal-subtitle">
              Create a new team and assign reporting manager, project and members.
            </p>
          </div>

          <button
            type="button"
            className="team-modal-close"
            onClick={onClose}
            aria-label="Close add team modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="team-modal-body">
          <div className="team-modal-grid">
            <div className="team-form-field">
              <label htmlFor="team-number">Team Number</label>
              <input
                id="team-number"
                className="team-form-input"
                value={form.teamNumber}
                onChange={(event) =>
                  updateField(
                    "teamNumber",
                    event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                  )
                }
                placeholder="TM-04"
              />

              {errors.teamNumber ? (
                <span className="team-form-error">{errors.teamNumber}</span>
              ) : null}
            </div>

            <div className="team-form-field">
              <label htmlFor="team-name">Team Name</label>
              <input
                id="team-name"
                className="team-form-input"
                value={form.teamName}
                onChange={(event) => updateField("teamName", event.target.value)}
                placeholder="Enter team name"
              />

              {errors.teamName ? (
                <span className="team-form-error">{errors.teamName}</span>
              ) : null}
            </div>

            <div className="team-form-field">
              <label htmlFor="team-manager">Reporting Manager</label>
              <select
                id="team-manager"
                className="team-form-select"
                value={form.reportingManagerId}
                onChange={(e) => updateField("reportingManagerId", e.target.value)}
              >
                <option value="">Select Manager</option>
                {managers.map((manager, index) => {
                  const managerId = getManagerId(manager);

                  return (
                    <option
                      key={`${managerId || "manager"}-${index}`}
                      value={managerId}
                    >
                      {getManagerName(manager) || String(managerId || "")}
                    </option>
                  );
                })}
              </select>

              {errors.reportingManagerId ? (
                <span className="team-form-error">{errors.reportingManagerId}</span>
              ) : null}
            </div>

            <div className="team-form-field">
              <label htmlFor="team-engagement">Engagement Type</label>
              <select
                id="team-engagement"
                className="team-form-select"
                value={form.engagementType}
                onChange={(event) => updateField("engagementType", event.target.value)}
              >
                {TEAM_ENGAGEMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="team-form-field team-form-field-wide">
              <label htmlFor="team-project">Project Name</label>
              <select
                id="team-project"
                className="team-form-select"
                value={form.projectId}
                onChange={(e) => updateField("projectId", e.target.value)}
              >
                <option value="">Select Project</option>

                {projects.map((project, index) => {
                  const projectId = getProjectId(project);
                  const projectLabel = project.teamExists
                    ? `${getProjectName(project) || String(projectId || "")} - Team Exists`
                    : `${getProjectName(project) || String(projectId || "")} - No Team Yet`;

                  return (
                    <option
                      key={`${projectId || "project"}-${index}`}
                      value={projectId}
                    >
                      {projectLabel}
                    </option>
                  );
                })}
              </select>

              {errors.projectId ? (
                <span className="team-form-error">{errors.projectId}</span>
              ) : null}

              {selectedProject ? (
                <div
                  className={`team-project-summary ${
                    hasExistingTeam ? "is-existing" : "is-available"
                  }`}
                >
                  <strong>{selectedProject.projectName || "Selected project"}</strong>
                  <span>
                    {hasExistingTeam
                      ? `Team ${selectedProject.teamNumber || selectedProject.teamName || selectedProject.teamId} already exists`
                      : "No team exists yet for this project"}
                  </span>

                  {canOpenExistingTeam && onOpenExistingTeam ? (
                    <button
                      type="button"
                      className="team-action-btn secondary team-project-open-btn"
                      onClick={() => onOpenExistingTeam(selectedProject.teamId)}
                    >
                      Open Existing Team
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="team-form-field team-form-field-wide">
              <label>Default Reporting Days</label>
              <div className="team-day-grid">
                {TEAM_DAY_OPTIONS.map((day) => {
                  const isSelected = form.reportingDays.includes(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      className={`team-day-button ${isSelected ? "is-active" : ""}`}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="team-form-field team-form-field-wide team-multiselect">
              <label>Team Members</label>
              <button
                type="button"
                className="team-multiselect-trigger"
                onClick={() => setMembersOpen((current) => !current)}
              >
                <span>
                  {selectedMembers.length > 0
                    ? `${selectedMembers.length} member${
                        selectedMembers.length > 1 ? "s" : ""
                      } selected`
                    : "Select team members"}
                </span>

                <FaChevronDown className={membersOpen ? "is-open" : ""} />
              </button>

              {membersOpen ? (
                <div className="team-multiselect-menu">
                  <div className="team-member-search">
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="team-member-search-input"
                    />
                  </div>

                  {filteredEmployees.map((employee, index) => {
                    const employeeId = getEmployeeId(employee);

                    return (
                      <label
                        key={`${employeeId || "employee"}-${index}`}
                        className="team-member-option"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.has(employeeId)}
                          onChange={() => toggleMember(employeeId)}
                        />

                        <div className="team-member-info">
                          <strong>{getEmployeeName(employee) || String(employeeId || "")}</strong>
                          <small>Employee ID: {employeeId}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {selectedMembers.length > 0 ? (
                <div className="team-selected-members">
                  {selectedMembers.map((member) => {
                    const id = getEmployeeId(member);
                    const name = getEmployeeName(member) || String(id || "");

                    return (
                      <span key={id} className="team-selected-chip">
                        <span>{name}</span>

                        <button
                          type="button"
                          onClick={() => removeMember(id)}
                          aria-label={`Remove ${name}`}
                        >
                          <FaTimes />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="team-modal-footer">
          <button type="button" className="team-action-btn secondary" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="team-action-btn"
            onClick={handlePrimaryAction}
            disabled={saving || (hasExistingTeam && !canOpenExistingTeam)}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddTeamModal;
