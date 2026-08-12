import React, { useEffect, useMemo, useState } from "react";
import { FaChevronDown, FaTimes } from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  TEAM_DAY_OPTIONS,
  TEAM_ENGAGEMENT_OPTIONS,
} from "./teamsData";

const createInitialForm = (defaultTeamNumber = "") => ({
  teamNumber: defaultTeamNumber,
  teamName: "",
  reportingManager: "",
  engagementType: "Project",
  projectName: "",
  reportingDays: [...TEAM_DAY_OPTIONS],
  memberIds: [],
});

function AddTeamModal({
  open,
  onClose,
  onCreate,
  defaultTeamNumber = "TM-04",
}) {
  const [form, setForm] = useState(createInitialForm(defaultTeamNumber));
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const selectableEmployees = employees;

  const selectedMembers = useMemo(() => {
    return employees.filter((employee) =>
      form.memberIds.includes(employee.employee_Id)
    );
  }, [employees, form.memberIds]);

  const filteredEmployees = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();

    if (!search) return employees;

    return employees.filter((employee) =>
      (employee.name || "")
        .toLowerCase()
        .includes(search) ||
      String(employee.employee_Id || "")
        .toLowerCase()
        .includes(search)
    );
  }, [employees, memberSearch]);

  useEffect(() => {

    if (!open) return;

    const fetchDropdowns = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${getToken()}`
        };

        const [
          employeeRes,
          managerRes,
          projectRes
        ] = await Promise.all([
          api.get(API_ENDPOINTS.team.availableEmployees, { headers }),
          api.get(API_ENDPOINTS.team.managers, { headers }),
          api.get(API_ENDPOINTS.team.projects.list, { headers })
        ]);

        console.log(employeeRes.data);
        console.log(managerRes.data);
        console.log(projectRes.data);

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
        console.error(error);
      }
    };

    fetchDropdowns();

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
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
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
        reportingDays: nextDays,
      };
    });
  };

  const toggleMember = (employeeId) => {
    setForm((current) => {
      const isSelected = current.memberIds.includes(employeeId);
      const nextMemberIds = isSelected
        ? current.memberIds.filter((id) => id !== employeeId)
        : [...current.memberIds, employeeId];

      return {
        ...current,
        memberIds: nextMemberIds,
      };
    });
  };

  const removeMember = (employeeId) => {
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.filter((id) => id !== employeeId),
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
      reportingManager: form.reportingManager.trim(),
      engagementType: form.engagementType,
      projectName: form.projectName.trim(),
      reportingDays:
        form.reportingDays.length > 0
          ? form.reportingDays
          : [...TEAM_DAY_OPTIONS],
      memberIds: [...form.memberIds],
    };

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
                value={form.reportingManager}
                onChange={(e) => updateField("reportingManager", e.target.value)}
              >
                <option value="">Select Manager</option>

                {managers.map((manager) => (
                  <option
                    key={manager.employee_Id}
                    value={manager.employee_Id}
                  >
                    {manager.employeeName ||
                      manager.name ||
                      manager.fullName}
                  </option>
                ))}
              </select>
              {errors.reportingManager ? (
                <span className="team-form-error">{errors.reportingManager}</span>
              ) : null}
            </div>

            <div className="team-form-field">
              <label htmlFor="team-engagement">Engagement Type</label>
              <select
                id="team-engagement"
                className="team-form-select"
                value={form.engagementType}
                onChange={(event) =>
                  updateField("engagementType", event.target.value)
                }
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
                value={form.projectName}
                onChange={(e) => updateField("projectName", e.target.value)}
              >

                <option value="">
                  Select Project
                </option>

                {projects.map(project => (
                  <option
                    key={project.project_Id}
                    value={project.project_Id}
                  >
                    {project.project_Name}
                  </option>
                ))}

              </select>
              {errors.projectName ? (
                <span className="team-form-error">{errors.projectName}</span>
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
                    ? `${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""
                    } selected`
                    : "Select team members"}
                </span>

                <FaChevronDown className={membersOpen ? "is-open" : ""} />
              </button>

              {membersOpen && (
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
                  {filteredEmployees.map((employee) => (
                    <label
                      key={employee.employee_Id}
                      className="team-member-option"
                    >
                      <input
                        type="checkbox"
                        checked={form.memberIds.includes(employee.employee_Id)}
                        onChange={() => toggleMember(employee.employee_Id)}
                      />

                      <div className="team-member-info">
                        <strong>{employee.name}</strong>
                        <small>
                          Employee ID: {employee.employee_Id}
                        </small>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {errors.memberIds ? (
                <span className="team-form-error">{errors.memberIds}</span>
              ) : null}

              {selectedMembers.length > 0 && (
                <div className="team-selected-members">
                  {selectedMembers.map((member) => {
                    const id = member.employee_Id;
                    const name = member.name;

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
              )}
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
    </div>
  );
}

export default AddTeamModal;
