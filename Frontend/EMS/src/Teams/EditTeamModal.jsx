import React, { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { getTeamManagers, getTeamProjects, getTeams } from "../services/teamService";
import { TEAM_ENGAGEMENT_OPTIONS } from "./teamsData";
import { WEEKLY_OFF_DAY_OPTIONS } from "./weeklyOffDays";
import {
  normalizeCollection,
  normalizeEmployeeRecord,
  normalizeProjectTeamRecord,
  normalizeTeamRecord,
  extractApiErrorMessage
} from "./teamUtils";

const createInitialForm = (team = {}) => ({
  teamName: team.teamName || "",
  projectId: team.projectId || "",
  reportingManagerId: team.reportingManagerId || "",
  engagementType: team.engagementType || "",
  weeklyOffDays: Array.isArray(team.weeklyOffDays) ? [...team.weeklyOffDays] : []
});

function EditTeamModal({
  open,
  team,
  onClose,
  onSave,
  saving = false
}) {
  const [form, setForm] = useState(() => createInitialForm(team));
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [weeklyOffLoading, setWeeklyOffLoading] = useState(true);
  const [weeklyOffLookupError, setWeeklyOffLookupError] = useState("");
  const [weeklyOffAttempt, setWeeklyOffAttempt] = useState(0);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const controller = new AbortController();

    const fetchLookups = async () => {
      try {
        const [managerRes, projectRes] = await Promise.all([
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
          : normalizeCollection(managerRes.data);
        const managerList = managerSource.map((item) => normalizeEmployeeRecord(item));
        const projectList = normalizeCollection(projectRes.data).map((item) =>
          normalizeProjectTeamRecord(item)
        );

        setManagers(managerList.filter(Boolean));
        setProjects(projectList.filter(Boolean));
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }

        setManagers([]);
        setProjects([]);
      }
    };

    fetchLookups();
    return () => controller.abort();
  }, [open, team]);

  useEffect(() => {
    if (!open || team?.teamId == null) return undefined;

    const controller = new AbortController();
    getTeams({
      signal: controller.signal,
      cacheTTL: 0,
      dedupe: false
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        const savedTeam = normalizeCollection(response.data)
          .map((item) => normalizeTeamRecord(item))
          .find((item) => String(item?.teamId ?? "") === String(team.teamId));
        if (!savedTeam) {
          setWeeklyOffLookupError("This team's saved weekly off days were not found in GET /api/Team.");
          return;
        }
        setForm((current) => ({
          ...current,
          weeklyOffDays: [...(savedTeam.weeklyOffDays ?? [])]
        }));
        setWeeklyOffLookupError("");
      })
      .catch((error) => {
        if (error?.code === "ERR_CANCELED") return;
        setWeeklyOffLookupError(
          extractApiErrorMessage(error, "Unable to load saved weekly off days.")
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setWeeklyOffLoading(false);
      });

    return () => controller.abort();
  }, [open, team?.teamId, weeklyOffAttempt]);

  const visibleProjects = useMemo(() => {
    const projectList = [...projects];

    if (team?.projectId && !projectList.some((project) => {
      return String(project.projectId ?? project.id ?? "").trim() === String(team.projectId).trim();
    })) {
      projectList.unshift({
        id: team.projectId,
        projectId: team.projectId,
        projectName: team.projectName || "Current Project",
        teamExists: true,
        teamId: team.teamId
      });
    }

    return projectList;
  }, [projects, team]);

  const visibleManagers = useMemo(() => {
    const managerList = [...managers];

    if (team?.reportingManagerId && !managerList.some((manager) => {
      return String(manager.employeeId ?? manager.id ?? "").trim() === String(team.reportingManagerId).trim();
    })) {
      managerList.unshift({
        id: team.reportingManagerId,
        employeeId: team.reportingManagerId,
        employeeName: team.reportingManagerName || team.reportingManager || "Current Manager",
        name: team.reportingManagerName || team.reportingManager || "Current Manager"
      });
    }

    return managerList;
  }, [managers, team]);

  const engagementOptions = useMemo(() => {
    const options = [...TEAM_ENGAGEMENT_OPTIONS];

    if (team?.engagementType && !options.includes(team.engagementType)) {
      options.unshift(team.engagementType);
    }

    return options;
  }, [team]);

  const selectedProject = useMemo(() => {
    const value = String(form.projectId ?? "").trim();

    if (!value) {
      return null;
    }

    return visibleProjects.find(
      (project) => String(project.projectId ?? project.id ?? "").trim() === value
    );
  }, [form.projectId, visibleProjects]);

  const toggleWeeklyOffDay = (day) => {
    setForm((current) => ({
      ...current,
      weeklyOffDays: current.weeklyOffDays.includes(day)
        ? current.weeklyOffDays.filter((selectedDay) => selectedDay !== day)
        : [...current.weeklyOffDays, day]
    }));
  };

  if (!open) {
    return null;
  }

  return (
    <div className="team-modal-overlay">
      <div className="team-modal">
        <div className="team-modal-header">
          <div>
            <h3>Edit Team</h3>
            <p>Update team information.</p>
          </div>

          <button className="team-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="team-modal-body">
          <div className="team-form-field">
            <label>Team Name</label>
            <input
              className="team-form-input"
              value={form.teamName}
              onChange={(e) =>
                setForm({
                  ...form,
                  teamName: e.target.value
                })
              }
            />
          </div>

          <div className="team-form-field">
            <label>Project</label>
            <div className="team-select-wrap">
              <select
                className="team-form-select"
                value={form.projectId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    projectId: e.target.value
                  })
                }
              >
                <option value="">Select Project</option>
                {visibleProjects.map((project) => (
                  <option
                    key={`${project.projectId ?? project.id}-${project.projectName}`}
                    value={project.projectId ?? project.id}
                  >
                    {project.teamExists
                      ? `${project.projectName} - Team Exists`
                      : `${project.projectName} - No Team Yet`}
                  </option>
                ))}
              </select>
            </div>

            {selectedProject ? (
              <div className="team-project-summary is-available">
                <strong>{selectedProject.projectName}</strong>
                <span>
                  {selectedProject.teamExists
                    ? `Team ${selectedProject.teamNumber || selectedProject.teamId || ""} already exists`
                    : "No team exists yet for this project"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="team-form-field">
            <label>Reporting Manager</label>
            <div className="team-select-wrap">
              <select
                className="team-form-select"
                value={form.reportingManagerId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reportingManagerId: e.target.value
                  })
                }
              >
                <option value="">Select Manager</option>
                {visibleManagers.map((manager, index) => {
                  const managerId = manager.employeeId || manager.id || "";

                  return (
                    <option
                      key={`${managerId || "manager"}-${index}`}
                      value={managerId}
                    >
                      {manager.employeeName || manager.name || manager.fullName || managerId}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="team-form-field">
            <label>Engagement Type</label>
            <select
              className="team-form-select"
              value={form.engagementType}
              onChange={(e) =>
                setForm({
                  ...form,
                  engagementType: e.target.value
                })
              }
            >
              <option value="">Select</option>
              {engagementOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <fieldset
            className="team-form-field team-form-field-wide weekly-off-fieldset"
            disabled={weeklyOffLoading || Boolean(weeklyOffLookupError)}
            aria-busy={weeklyOffLoading}
          >
            <legend>Weekly Off Days</legend>
            {weeklyOffLoading ? (
              <span className="team-reporting-days-modal__status" role="status">
                Loading saved weekly off days...
              </span>
            ) : null}
            <div className="weekly-off-day-list">
              {WEEKLY_OFF_DAY_OPTIONS.map((day) => (
                <label className="weekly-off-day-option" key={day}>
                  <input
                    type="checkbox"
                    checked={form.weeklyOffDays.includes(day)}
                    onChange={() => toggleWeeklyOffDay(day)}
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {weeklyOffLookupError ? (
            <div className="team-reporting-days-modal__error" role="alert">
              <span>{weeklyOffLookupError}</span>
              <button
                type="button"
                className="team-action-btn secondary"
                onClick={() => {
                  setWeeklyOffLoading(true);
                  setWeeklyOffAttempt((attempt) => attempt + 1);
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>

        <div className="team-modal-footer">
          <button
            className="team-action-btn secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>

          <button
            className="team-action-btn"
            onClick={() => onSave(form)}
            type="button"
            disabled={saving || weeklyOffLoading || Boolean(weeklyOffLookupError)}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditTeamModal;
