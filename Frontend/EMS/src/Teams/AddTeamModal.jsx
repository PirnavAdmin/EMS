import React, { useEffect, useMemo, useState } from "react";
import { FaChevronDown, FaTimes } from "react-icons/fa";
import {
  getAvailableTeamEmployees,
  getTeamManagers,
  getTeamProjects,
} from "../services/teamService";
import {
  TEAM_DAY_OPTIONS,
  TEAM_ENGAGEMENT_OPTIONS } from
"./teamsData";

const normalizeSelectionId = (value) =>
  String(value ?? "").trim();

const normalizeProjectId = (value) => {
  const trimmedValue = normalizeSelectionId(value);

  if (!trimmedValue) {
    return "";
  }

  const numericValue = Number(trimmedValue);
  return Number.isNaN(numericValue) ? trimmedValue : numericValue;
};

const getEmployeeId = (employee) =>
  normalizeSelectionId(
    employee?.employee_Id ??
    employee?.employeeId ??
    employee?.id
  );

const getEmployeeName = (employee) =>
  employee?.employeeName ||
  employee?.name ||
  employee?.fullName ||
  "";

const getManagerId = (manager) =>
  normalizeSelectionId(
    manager?.employee_Id ??
    manager?.employeeId ??
    manager?.id
  );

const getManagerName = (manager) =>
  manager?.employeeName ||
  manager?.name ||
  manager?.fullName ||
  "";

const getProjectId = (project) =>
  normalizeSelectionId(
    project?.project_Id ??
    project?.projectId ??
    project?.id
  );

const getProjectName = (project) =>
  project?.project_Name ||
  project?.projectName ||
  project?.name ||
  "";

const createInitialForm = (defaultTeamNumber = "") => ({
  teamNumber: defaultTeamNumber,
  teamName: "",
  reportingManager: "",
  engagementType: "Project",
  projectName: "",
  reportingDays: [...TEAM_DAY_OPTIONS],
  memberIds: []
});

function AddTeamModal({
  open,
  onClose,
  onCreate,
  defaultTeamNumber = "TM-04"
}) {
  const [form, setForm] = useState(createInitialForm(defaultTeamNumber));
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");

  const selectedMemberIds = useMemo(() => {
    return new Set(
      form.memberIds.
      map((id) => normalizeSelectionId(id)).
      filter((id) => id !== "")
    );
  }, [form.memberIds]);

  const selectedMembers = useMemo(() => {
    return employees.filter((employee) =>
    selectedMemberIds.has(getEmployeeId(employee))
    );
  }, [employees, selectedMemberIds]);

  const filteredEmployees = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();

    if (!search) return employees;

    return employees.filter((employee) =>
    (getEmployeeName(employee) || "").
    toLowerCase().
    includes(search) ||
    String(getEmployeeId(employee) || "").
    toLowerCase().
    includes(search)
    );
  }, [employees, memberSearch]);

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();

    const fetchDropdowns = async () => {
      try {
        const [
        employeeRes,
        managerRes,
        projectRes] =
        await Promise.all([
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
        })]
        );

        if (controller.signal.aborted) {
          return;
        }

        const employees =
        employeeRes.data?.data ||
        employeeRes.data?.list ||
        employeeRes.data ||
        [];

        const managers =
        managerRes.data?.data ||
        managerRes.data?.list ||
        managerRes.data ||
        [];

        const projects =
        projectRes.data?.data ||
        projectRes.data?.list ||
        projectRes.data ||
        [];

        setEmployees(Array.isArray(employees) ? employees : []);
        setManagers(Array.isArray(managers) ? managers : []);
        setProjects(Array.isArray(projects) ? projects : []);

      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }
      }
    };

    fetchDropdowns();
    return () => controller.abort();

  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    setForm(createInitialForm(defaultTeamNumber));
    setErrors({});
    setMembersOpen(false);

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
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
      const nextDays = isSelected ?
      current.reportingDays.filter((item) => item !== day) :
      [...current.reportingDays, day];

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
      const isSelected = current.memberIds.
      map((id) => normalizeSelectionId(id)).
      includes(normalizedEmployeeId);

      const nextMemberIds = isSelected ?
      current.memberIds.filter((id) =>
      normalizeSelectionId(id) !== normalizedEmployeeId
      ) :
      [...current.memberIds, normalizedEmployeeId];

      return {
        ...current,
        memberIds: nextMemberIds
      };
    });
  };

  const removeMember = (employeeId) => {
    const normalizedEmployeeId = normalizeSelectionId(employeeId);

    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.filter((id) =>
      normalizeSelectionId(id) !== normalizedEmployeeId
      )
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.teamNumber.trim()) {
      nextErrors.teamNumber = "Team Number is required";
    }

    if (!form.teamName.trim()) {
      nextErrors.teamName = "Team Name is required";
    }

    if (!form.reportingManager.trim()) {
      nextErrors.reportingManager = "Reporting Manager is required";
    }

    if (!form.projectName.trim()) {
      nextErrors.projectName = "Project Name is required";
    }

    if (form.memberIds.length === 0) {
      nextErrors.memberIds = "Select at least one member";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    const sanitizedPayload = {
      teamNumber: form.teamNumber.trim().toUpperCase(),
      teamName: form.teamName.trim(),
      reportingManagerId: normalizeSelectionId(form.reportingManager),
      engagementType: form.engagementType,
      projectId: normalizeProjectId(form.projectName),
      reportingDays:
      form.reportingDays.length > 0 ?
      [...form.reportingDays] :
      [...TEAM_DAY_OPTIONS],
      employeeIds:
      form.memberIds.
      map((id) => normalizeSelectionId(id)).
      filter((id) => id !== "")
    };

    console.log("[Teams] create payload", sanitizedPayload);

    const createdTeam = await onCreate?.(sanitizedPayload);

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

  return (
    <div
      className="team-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}>

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
            aria-label="Close add team modal">

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
                placeholder="TM-04" />

              {errors.teamNumber ?
              <span className="team-form-error">{errors.teamNumber}</span> :
              null}
            </div>

            <div className="team-form-field">
              <label htmlFor="team-name">Team Name</label>
              <input
                id="team-name"
                className="team-form-input"
                value={form.teamName}
                onChange={(event) => updateField("teamName", event.target.value)}
                placeholder="Enter team name" />

              {errors.teamName ?
              <span className="team-form-error">{errors.teamName}</span> :
              null}
            </div>

            <div className="team-form-field">
              <label htmlFor="team-manager">Reporting Manager</label>
              <select
                id="team-manager"
                className="team-form-select"
                value={form.reportingManager}
                onChange={(e) => updateField("reportingManager", e.target.value)}>

                <option value="">Select Manager</option>

                {managers.map((manager, index) => {
                  const managerId = getManagerId(manager);

                  return (
                    <option
                      key={`${managerId || "manager"}-${index}`}
                      value={managerId}>

                      {getManagerName(manager) || String(managerId || "")}
                    </option>
                  );
                })}
              </select>
              {errors.reportingManager ?
              <span className="team-form-error">{errors.reportingManager}</span> :
              null}
            </div>

            <div className="team-form-field">
              <label htmlFor="team-engagement">Engagement Type</label>
              <select
                id="team-engagement"
                className="team-form-select"
                value={form.engagementType}
                onChange={(event) =>
                updateField("engagementType", event.target.value)
                }>

                {TEAM_ENGAGEMENT_OPTIONS.map((option) =>
                <option key={option} value={option}>
                    {option}
                  </option>
                )}
              </select>
            </div>

            <div className="team-form-field team-form-field-wide">
              <label htmlFor="team-project">Project Name</label>
              <select
                id="team-project"
                className="team-form-select"
                value={form.projectName}
                onChange={(e) => updateField("projectName", e.target.value)}>


                <option value="">
                  Select Project
                </option>

                {projects.map((project, index) => {
                  const projectId = getProjectId(project);

                  return (
                    <option
                      key={`${projectId || "project"}-${index}`}
                      value={projectId}>

                      {getProjectName(project) || String(projectId || "")}
                    </option>
                  );
                })}

              </select>
              {errors.projectName ?
              <span className="team-form-error">{errors.projectName}</span> :
              null}
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
                      onClick={() => toggleDay(day)}>

                      {day}
                    </button>);

                })}
              </div>
            </div>

            <div className="team-form-field team-form-field-wide team-multiselect">
              <label>Team Members</label>
              <button
                type="button"
                className="team-multiselect-trigger"
                onClick={() => setMembersOpen((current) => !current)}>

                <span>
                  {selectedMembers.length > 0 ?
                  `${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""} selected` :

                  "Select team members"}
                </span>

                <FaChevronDown className={membersOpen ? "is-open" : ""} />
              </button>

              {membersOpen &&
              <div className="team-multiselect-menu">

                  <div className="team-member-search">
                    <input
                    type="text"
                    placeholder="Search employee..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="team-member-search-input" />

                  </div>
                  {filteredEmployees.map((employee, index) => {
                    const employeeId = getEmployeeId(employee);

                    return (
                      <label
                        key={`${employeeId || "employee"}-${index}`}
                        className="team-member-option">

                        <input
                          type="checkbox"
                          checked={selectedMemberIds.has(employeeId)}
                          onChange={() => toggleMember(employeeId)} />


                        <div className="team-member-info">
                          <strong>{getEmployeeName(employee) || String(employeeId || "")}</strong>
                          <small>
                            Employee ID: {employeeId}
                          </small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              }

              {errors.memberIds ?
              <span className="team-form-error">{errors.memberIds}</span> :
              null}

              {selectedMembers.length > 0 &&
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
                        aria-label={`Remove ${name}`}>

                          <FaTimes />
                        </button>
                      </span>);

                })}
                </div>
              }
            </div>
          </div>
        </div>

        <div className="team-modal-footer">
          <button type="button" className="team-action-btn secondary" onClick={onClose}>
            Cancel
          </button>

          <button type="button" className="team-action-btn" onClick={handleSubmit}>
            Create Team
          </button>
        </div>
      </div>
    </div>);

}

export default AddTeamModal;
