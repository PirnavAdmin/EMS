import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

function EditTeamModal({
  open,
  team,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    teamName: "",
    projectId: "",
    projectName: "",
    reportingManagerId: "",
    reportingManager: "",
    engagementType: "",
  });

  useEffect(() => {
    if (!team) return;

    setForm({
      teamName: team.teamName || "",
      projectId: team.projectId || "",
      projectName: team.projectName || "",
      reportingManagerId: team.reportingManagerId || "",
      reportingManager: team.reportingManager || "",
      engagementType: team.engagementType || "",
    });
  }, [team]);

  if (!open) return null;

  return (
    <div className="team-modal-overlay">
      <div className="team-modal">

        <div className="team-modal-header">
          <div>
            <h3>Edit Team</h3>
            <p>Update team information.</p>
          </div>

          <button
            className="team-modal-close"
            onClick={onClose}
          >
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
                  teamName: e.target.value,
                })
              }
            />
          </div>

          <div className="team-form-field">
            <label>Project</label>

            <input
              className="team-form-input"
              value={form.projectName}
              readOnly
            />
          </div>

          <div className="team-form-field">
            <label>Reporting Manager</label>

            <input
              className="team-form-input"
              value={form.reportingManager}
              readOnly
            />
          </div>

          <div className="team-form-field">
            <label>Engagement Type</label>

            <select
              className="team-form-select"
              value={form.engagementType}
              onChange={(e) =>
                setForm({
                  ...form,
                  engagementType: e.target.value,
                })
              }
            >
              <option value="">Select</option>
              <option value="Internal">Internal</option>
              <option value="Client">Client</option>
              <option value="Project">Project</option>
            </select>
          </div>

        </div>

        <div className="team-modal-footer">

          <button
            className="team-action-btn secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="team-action-btn"
            onClick={() => onSave(form)}
          >
            Save Changes
          </button>

        </div>

      </div>
    </div>
  );
}

export default EditTeamModal;