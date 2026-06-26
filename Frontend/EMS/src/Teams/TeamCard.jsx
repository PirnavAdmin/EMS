import React from "react";
import {
  FaArrowRight,
  FaProjectDiagram,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";
import { TEAM_DAY_OPTIONS } from "./teamsData";

function TeamCard({ team, onClick }) {
  const accentClass = `accent-${team.accent || "teal"}`;

  return (
    <article className={`team-card ${accentClass}`}>
      <button
        type="button"
        className="team-card-button"
        onClick={onClick}
        aria-label={`Open ${team.teamName} team details`}
      >
        <div className="team-card-top">
          <span className="team-number-badge">{team.teamNumber}</span>

          <span
            className={`team-engagement-badge ${String(team.engagementType || "")
              .toLowerCase()
              .trim()}`}
          >
            {team.engagementType}
          </span>
        </div>

        <div className="team-card-title-row">
          <div>
            <h3 className="team-card-name">{team.teamName}</h3>
            <p className="team-card-hint">Click to open details</p>
          </div>

          <span className="team-card-arrow" aria-hidden="true">
            <FaArrowRight />
          </span>
        </div>

        <div className="team-card-meta">
          <div className="team-card-meta-item">
            <FaUserTie className="team-card-meta-icon" />

            <div>
              <span className="team-card-meta-label">Reporting Manager</span>
              <span className="team-card-meta-value">
                {team.reportingManager || team.managerName || "-"}
              </span>
            </div>
          </div>

          <div className="team-card-meta-item">
            <FaProjectDiagram className="team-card-meta-icon" />

            <div>
              <span className="team-card-meta-label">Project</span>
              <span className="team-card-meta-value">{team.projectName}</span>
            </div>
          </div>
        </div>

        <div className="team-card-days">
          {TEAM_DAY_OPTIONS.map((day) => {
            const isActive = (team.reportingDays || []).includes(day);

            return (
              <span
                key={`${team.teamId || team.id}-${day}`}
                className={`team-day-chip ${isActive ? "is-active" : ""}`}
              >
                {day}
              </span>
            );
          })}
        </div>

        <div className="team-card-footer">
          <span>Reporting days</span>

          <span className="team-members-count">
            <FaUsers />
            {team.employeeNames?.length ??
              team.members?.length ??
              team.membersCount ??
              0} members
          </span>
        </div>
      </button>
    </article>
  );
}

export default TeamCard;
