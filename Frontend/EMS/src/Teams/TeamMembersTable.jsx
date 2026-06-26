import React from "react";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa";
import { TEAM_DAY_OPTIONS, getComplementDays } from "./teamsData";

const roleName = localStorage.getItem("roleName") || "";
const isEmployee = roleName.toLowerCase() === "employee";
const resolveDays = (primaryDays = [], fallbackDays = []) =>
  primaryDays.length > 0 ? primaryDays : fallbackDays;

function DayChips({ days, fallbackLabel = "-" }) {
  if (!days || days.length === 0) {
    return <span className="team-day-empty">{fallbackLabel}</span>;
  }

  return (
    <div className="team-day-badges">
      {days.map((day) => (
        <span key={day} className="team-day-badge">
          {day}
        </span>
      ))}
    </div>
  );
}

function TeamMembersTable({
  members = [],
  teamProjectName = "",
  teamEngagementType = "",
  reportingDays = TEAM_DAY_OPTIONS,
  onOverrideMember,
  onAddMember,
  onRemoveMember,
}) {
  const fallbackWfhDays = getComplementDays(reportingDays);

  return (
    <section className="teams-table-card">
      <div className="teams-table-head">

        <div>
          <h3>Members</h3>
          <p>
            Project alignment, reporting days and quick overrides for each member.
          </p>
        </div>

        {!isEmployee && (
          <button
            className="teams-add-btn"
            onClick={onAddMember}
          >
            <FaPlus />
            Add Member
          </button>
        )}

      </div>

      <div className="teams-table-scroll">
        <table className="teams-members-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>User ID</th>
              <th>Project / Engagement</th>
              <th>WFO Days</th>
              <th>WFH Days</th>
              {!isEmployee && <th>ACTIONS</th>}
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={isEmployee ? 5 : 6} className="teams-empty-table-cell">
                  No team members
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const displayProjectName =
                  member.overrideProjectName ||
                  member.projectName ||
                  teamProjectName ||
                  "-";

                const displayEngagement =
                  member.engagementType ||
                  teamEngagementType ||
                  "-";

                const displayWfoDays =
                  member.overrideWfoDays?.length > 0
                    ? member.overrideWfoDays
                    : member.wfoDays?.length > 0
                      ? member.wfoDays
                      : reportingDays;

                const displayWfhDays =
                  member.overrideWfoDays?.length > 0
                    ? getComplementDays(displayWfoDays)
                    : member.wfhDays?.length > 0
                      ? member.wfhDays
                      : fallbackWfhDays;

                const isCrossTeam =
                  member.crossTeam === true ||
                  member.overrideProjectId != null;

                return (
                  <tr key={member.employeeId}>
                    <td>
                      <div className="team-member-name-stack">
                        <strong>{member.name || member.employeeName}</strong>
                        <span>{member.role || member.designation || "-"}</span>
                        {isCrossTeam ? (
                          <span className="team-cross-team-badge">cross-team</span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <span className="team-user-id-pill">
                        {member.employeeId || member.userId || "-"}
                      </span>
                    </td>

                    <td>
                      <div className="team-member-project-stack">
                        <strong>{displayProjectName}</strong>
                        <span>{displayEngagement}</span>
                      </div>
                    </td>

                    <td>
                      <DayChips days={displayWfoDays} />
                    </td>

                    <td>
                      <DayChips days={displayWfhDays} />
                    </td>

                    <td>

                      {!isEmployee && (
                        <td>
                          <div className="team-member-actions">

                            <button
                              className="team-action-btn secondary team-row-action-btn"
                              onClick={() => onOverrideMember(member)}
                            >
                              <FaPen />
                              Override
                            </button>

                            <button
                              className="team-action-btn danger team-row-action-btn"
                              onClick={() => onRemoveMember(member)}
                            >
                              <FaTrash />
                              Remove
                            </button>

                          </div>
                        </td>
                      )}

                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TeamMembersTable;
