import React, { useEffect, useMemo, useState } from "react";
import { FaCheck, FaChevronDown, FaTimes } from "react-icons/fa";
import { TEAM_DAY_OPTIONS } from "./teamsData";
import { getTeamProjects } from "../services/teamService";
import {
  normalizeCollection,
  normalizeProjectTeamRecord
} from "./teamUtils";

const createInitialState = (member, teamProjectName) => {
  const hasProjectOverride = Boolean(
    member?.differentProject ||
      member?.isCrossMapped ||
      member?.overrideProjectId != null ||
      member?.overrideProjectName
  );
  const hasDayOverride = Boolean(
    member?.customReportingDays || member?.overrideReportingDays?.length
  );

  return {
    differentProject: hasProjectOverride,
    projectId:
      Number(
        member?.overrideProjectId ??
          member?.projectId ??
          member?.teamMemberOverride?.overrideProjectId ??
          ""
      ) || "",
    projectName:
      member?.overrideProjectName ||
      member?.projectName ||
      teamProjectName ||
      "",
    customReportingDays: hasDayOverride,
    reportingDays:
      member?.overrideReportingDays?.length > 0
        ? [...member.overrideReportingDays]
        : member?.wfoDays?.length > 0
          ? [...member.wfoDays]
          : member?.reportingDays?.length > 0
            ? [...member.reportingDays]
            : [...TEAM_DAY_OPTIONS]
  };
};

function OverrideMemberModal({
  open,
  member,
  teamProjectName = "",
  onClose,
  onSave,
  saving = false
}) {
  const [form, setForm] = useState(() => createInitialState(member, teamProjectName));
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const controller = new AbortController();
    setForm(createInitialState(member, teamProjectName));
    setErrors({});

    const fetchProjects = async () => {
      try {
        const res = await getTeamProjects({
          signal: controller.signal,
          cacheTTL: 60 * 1000
        });

        if (controller.signal.aborted) {
          return;
        }

        const data = normalizeCollection(res.data).map((project) =>
          normalizeProjectTeamRecord(project)
        );

        setProjects(data.filter(Boolean));
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }

        setProjects([]);
      }
    };

    fetchProjects();

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
  }, [member, onClose, open, teamProjectName]);

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

  const selectedProject = useMemo(() => {
    const projectId = String(form.projectId ?? "").trim();

    if (!projectId) {
      return null;
    }

    return projects.find(
      (project) => String(project.projectId ?? project.id ?? "").trim() === projectId
    );
  }, [form.projectId, projects]);

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

  const validate = () => {
    const nextErrors = {};

    if (form.differentProject && !String(form.projectId ?? "").trim()) {
      nextErrors.projectName = "Select a project";
    }

    if (form.customReportingDays && form.reportingDays.length === 0) {
      nextErrors.reportingDays = "Select at least one reporting day";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      const savedMember = await onSave({
        differentProject: form.differentProject,
        projectId: form.projectId,
        projectName: form.projectName,
        customReportingDays: form.customReportingDays,
        reportingDays: form.reportingDays
      });

      if (savedMember) {
        onClose?.();
      }
    } catch (error) {
      // Parent handles notifications.
    }
  };

  if (!open || !member) {
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
      <div
        className="team-modal team-modal-small"
        role="dialog"
        aria-modal="true"
        aria-labelledby="override-member-title"
      >
        <div className="team-modal-header">
          <div>
            <h3 id="override-member-title" className="team-modal-title">
              Override for {member.employeeName}
            </h3>
            <p className="team-modal-subtitle">
              Make project or reporting day changes for this member.
            </p>
          </div>

          <button
            type="button"
            className="team-modal-close"
            onClick={onClose}
            aria-label="Close override modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="team-modal-body">
          <div className="team-override-stack">
            <label className="team-checkbox-field">
              <input
                type="checkbox"
                checked={form.differentProject}
                onChange={(event) =>
                  updateField("differentProject", event.target.checked)
                }
              />

              <span>Different Project (cross-team)</span>
            </label>

            <div className="team-form-field">
              <label htmlFor="override-project">Project Dropdown</label>
              <div className="team-select-wrap">
                <select
                  id="override-project"
                  value={form.projectId}
                  disabled={!form.differentProject}
                  onChange={(e) => {
                    const projectId = e.target.value ? Number(e.target.value) : "";
                    const selected = projects.find(
                      (project) => String(project.projectId ?? project.id ?? "") === String(projectId)
                    );

                    setForm((prev) => ({
                      ...prev,
                      projectId,
                      projectName: selected?.projectName || ""
                    }));
                  }}
                >
                  <option value="">Select Project</option>

                  {projects.map((project) => (
                    <option
                      key={`${project.projectId ?? project.id}-${project.projectName}`}
                      value={project.projectId ?? project.id}
                    >
                      {project.teamExists
                        ? `${project.projectName} - Team Exists`
                        : project.projectName}
                    </option>
                  ))}
                </select>

                <FaChevronDown className="team-select-chevron" aria-hidden="true" />
              </div>

              {selectedProject ? (
                <div className="team-project-summary is-available">
                  <strong>{selectedProject.projectName || "Selected project"}</strong>
                  <span>
                    {selectedProject.teamExists
                      ? `Team ${selectedProject.teamNumber || selectedProject.teamId || ""} already exists`
                      : "No team exists yet for this project"}
                  </span>
                </div>
              ) : null}

              {errors.projectName ? (
                <span className="team-form-error">{errors.projectName}</span>
              ) : null}
            </div>

            <label className="team-checkbox-field">
              <input
                type="checkbox"
                checked={form.customReportingDays}
                onChange={(event) =>
                  updateField("customReportingDays", event.target.checked)
                }
              />

              <span>Custom Reporting Days</span>
            </label>

            <div className="team-form-field">
              <label>Day Selection Chips</label>
              <div className="teams-day-grid">
                {TEAM_DAY_OPTIONS.map((day) => {
                  const isSelected = form.reportingDays.includes(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      className={`teams-day-button ${
                        isSelected ? "is-active" : ""
                      } ${form.customReportingDays ? "is-editable" : "is-locked"}`}
                      onClick={() => {
                        if (form.customReportingDays) {
                          toggleDay(day);
                        }
                      }}
                      disabled={!form.customReportingDays}
                    >
                      {isSelected ? <FaCheck aria-hidden="true" /> : null}
                      <span>{day}</span>
                    </button>
                  );
                })}
              </div>

              {errors.reportingDays ? (
                <span className="team-form-error">{errors.reportingDays}</span>
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
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save & Notify Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OverrideMemberModal;
