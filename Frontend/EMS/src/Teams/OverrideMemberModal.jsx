import React, { useEffect, useMemo, useState } from "react";
import { FaCheck, FaChevronDown, FaTimes } from "react-icons/fa";
import { TEAM_DAY_OPTIONS } from "./teamsData";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

const createInitialState = (member, teamProjectName) => {
  const hasProjectOverride = Boolean(member?.crossTeam || member?.overrideProjectName);
  const hasDayOverride =
    Boolean(member?.overrideWfoDays?.length) || Boolean(member?.overrideWfhDays?.length);

  return {
    differentProject: hasProjectOverride,
    projectId:
      Number(
        member?.overrideProjectId ??
        member?.projectId ??
        ""
      ) || "",
    projectName: member?.overrideProjectName || member?.projectName || teamProjectName || "",
    customReportingDays: hasDayOverride,
    reportingDays:
      member?.overrideWfoDays?.length > 0
        ? [...member.overrideWfoDays]
        : [...(member?.wfoDays || TEAM_DAY_OPTIONS)],
  };
};

function OverrideMemberModal({
  open,
  member,
  teamProjectName = "",
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() =>
    createInitialState(member, teamProjectName)
  );
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    console.log("Projects =>", projects);
  }, [projects]);

  useEffect(() => {
    console.log("Form =>", form);
  }, [form]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    setForm(createInitialState(member, teamProjectName));
    setErrors({});

    const fetchProjects = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        const res = await api.get(
          API_ENDPOINTS.team.projects.list,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data =
          res.data?.data ??
          res.data?.list ??
          res.data ??
          [];

        console.log("Projects Response", data);

        const formatted = (Array.isArray(data) ? data : []).map((p) => ({
          id: Number(
            p.project_Id ??
            p.projectId ??
            p.id
          ),
          project_Name:
            p.project_Name ??
            p.projectName ??
            p.name
        }));

        setProjects(formatted);

        setProjects(formatted);

      } catch (err) {
        console.error(err);
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
    return () => window.removeEventListener("keydown", handleEscape);
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

  const validate = () => {
    const nextErrors = {};



    if (form.customReportingDays && form.reportingDays.length === 0) {
      nextErrors.reportingDays = "Select at least one reporting day";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    onSave({
      differentProject: form.differentProject,
      projectId: form.projectId,
      projectName: form.projectName,
      customReportingDays: form.customReportingDays,
      reportingDays: form.reportingDays
    });
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

                    const projectId = Number(e.target.value);

                    const selectedProject = projects.find(
                      p => p.id === projectId
                    );

                    console.log("Selected Project:", selectedProject);

                    setForm(prev => ({
                      ...prev,
                      projectId,
                      projectName: selectedProject?.project_Name || ""
                    }));
                  }}
                >
                  <option value="">Select Project</option>

                  {projects.map(project => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.project_Name}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="team-select-chevron" aria-hidden="true" />
              </div>
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
                      className={`teams-day-button ${isSelected ? "is-active" : ""} ${form.customReportingDays ? "is-editable" : "is-locked"
                        }`}
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

          <button type="button" className="team-action-btn" onClick={handleSubmit}>
            Save &amp; Notify Member
          </button>
        </div>
      </div>
    </div>
  );
}

export default OverrideMemberModal;
