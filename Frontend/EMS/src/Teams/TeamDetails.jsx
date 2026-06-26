import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaUsers } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "./Teams.css";
import EmptyState from "../components/EmptyState";
import { CardSkeleton, TableSkeleton } from "../components/Skeletons";
import TeamMembersTable from "./TeamMembersTable";
import TeamReportingDays from "./TeamReportingDays";
import OverrideMemberModal from "./OverrideMemberModal";
import EditTeamModal from "./EditTeamModal";
import AddMembersModal from "./AddMembersModal";
import DeleteTeamModal from "./DeleteTeamModal";
import RemoveMemberModal from "./RemoveMemberModal";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  TEAM_DAY_OPTIONS,
  getComplementDays,
} from "./teamsData";
const roleName = localStorage.getItem("roleName") || "";
const isEmployee = roleName.toLowerCase() === "employee";
const cloneTeamRecord = (team) => {
  if (!team) {
    return null;
  }

  return {
    ...team,
    reportingDays: [...(team.reportingDays || TEAM_DAY_OPTIONS)],
    members: (team.members || []).map((member) => ({
      ...member,
      wfoDays: [...(member.wfoDays || [])],
      wfhDays: [...(member.wfhDays || [])],
      overrideWfoDays: [...(member.overrideWfoDays || [])],
      overrideWfhDays: [...(member.overrideWfhDays || [])],
    })),
  };
};

function TeamDetails() {
  const { teamId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingReportingDays, setIsEditingReportingDays] = useState(false);
  const [draftReportingDays, setDraftReportingDays] = useState([...TEAM_DAY_OPTIONS]);
  const [overrideMember, setOverrideMember] = useState(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isDeleteTeamOpen, setIsDeleteTeamOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState(null);

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const fetchTeam = async () => {

    try {

      setIsLoading(true);

      const res = await api.get(
        API_ENDPOINTS.team.byId(teamId),
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      console.log("ProjectId:", res.data.projectId);
      console.log("ReportingManagerId:", res.data.reportingManagerId);
      console.log("Full Response:", res.data);
      setTeam({
        ...res.data,
        id: res.data.teamId,
      });

      setDraftReportingDays(
        res.data.reportingDays || [...TEAM_DAY_OPTIONS]
      );

    }
    finally {

      setIsLoading(false);

    }

  }

  useEffect(() => {
    fetchTeam();
  }, [teamId]);

  const summary = useMemo(() => {
    if (!team) {
      return null;
    }

    return {
      totalMembers: team.members?.length || 0,
      reportingDays: team.reportingDays || TEAM_DAY_OPTIONS,
    };
  }, [team]);

  const handleToggleReportingDay = (day) => {
    setDraftReportingDays((current) => {
      const isSelected = current.includes(day);
      return isSelected
        ? current.filter((item) => item !== day)
        : [...current, day];
    });
  };

  const handleSaveReportingDays = async () => {

    if (draftReportingDays.length === 0) {
      toast.error("Select at least one reporting day");
      return;
    }

    try {

      console.log("Team Object:", team);
      console.log("team.id:", team?.id);
      console.log("Route teamId:", teamId);

      await api.put(
        API_ENDPOINTS.team.updateReportingDays,
        {
          teamId: team.id,
          reportingDays: draftReportingDays,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );
      toast.success("Reporting days updated");

      setIsEditingReportingDays(false);

      fetchTeam();

    } catch (err) {

      console.log(err);
      console.log("Status:", err.response?.status);
      console.log("URL:", err.config?.baseURL + err.config?.url);
      console.log("Request:", JSON.parse(err.config?.data || "{}"));
      console.log("Response:", err.response?.data);
      toast.error("Unable to update reporting days");

    }
  };

  const handleOpenOverride = (member) => {
    setOverrideMember(member);
    setIsOverrideOpen(true);
  };

  const handleEditTeam = () => {
    setIsEditTeamOpen(true);
  };

  const handleDeleteTeam = () => {
    setIsDeleteTeamOpen(true);
  };

  const handleAddMembers = () => {
    setIsAddMemberOpen(true);
  };

  const handleRemoveMember = (member) => {
    setRemoveMember(member);
  };

  const handleSaveOverride = async ({
    differentProject,
    projectId,
    projectName,
    customReportingDays,
    reportingDays
  }) => {

    const payload = {
      teamId: team.id,
      employeeId: overrideMember.employeeId,
      teamMemberId: overrideMember.teamMemberId,

      differentProject,
      isCrossMapped: differentProject,

      overrideProjectId: projectId,
      projectName,

      customReportingDays,
      reportingDays: customReportingDays
        ? reportingDays
        : []
    };

    console.log(payload);

    try {
      console.log("Override Payload:", payload);

      const res = await api.put(
        API_ENDPOINTS.team.memberOverride,
        payload,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      console.log("Response:", res.data);

      fetchTeam();

    } catch (err) {

      console.log("Status:", err.response?.status);
      console.log("Response:", err.response?.data);
      console.log("Errors:", err.response?.data?.errors);
      console.log("Payload:", payload);
    }

    fetchTeam();
  };


  if (isLoading) {
    return (
      <div className="teams-page">
        <ToastContainer position="top-right" autoClose={2500} />

        <div className="teams-details-back-row">
          <div className="teams-skeleton-back-button" />
        </div>

        <div className="teams-details-grid">
          <CardSkeleton count={2} variant="panel" />
          <CardSkeleton count={1} variant="panel" />
        </div>

        <CardSkeleton count={1} variant="panel" />
        <TableSkeleton
          rows={4}
          columns={[
            { width: "minmax(220px, 1.5fr)", headerWidth: "72%" },
            { width: "120px", headerWidth: "64%" },
            { width: "minmax(220px, 1.35fr)", headerWidth: "72%" },
            { width: "160px", type: "stacked", headerWidth: "64%" },
            { width: "160px", type: "stacked", headerWidth: "64%" },
            { width: "140px", type: "actions", headerWidth: "54%" },
          ]}
        />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="teams-page">
        <ToastContainer position="top-right" autoClose={2500} />

        <button
          type="button"
          className="teams-back-btn"
          onClick={() => navigate("/teams")}
        >
          <FaArrowLeft />
          Back to Teams
        </button>

        <EmptyState
          className="teams-empty-state teams-detail-empty"
          message="Team not found."
        />
      </div>
    );
  }

  return (
    <div className="teams-page">
      <ToastContainer position="top-right" autoClose={2500} />

      <button
        type="button"
        className="teams-back-btn"
        onClick={() => navigate("/teams")}
      >
        <FaArrowLeft />
        Back to Teams
      </button>

      <div className="teams-details-grid">
        <section className="teams-summary-card">
          <div className="teams-summary-header">

            <div>
              <span className="teams-section-kicker">
                Team Summary
              </span>

              <h2>{team.teamName}</h2>

              <p>
                Members, project alignment and reporting setup.
              </p>
            </div>

            {!isEmployee && (
              <div className="team-summary-actions">

                <button
                  className="team-action-btn secondary"
                  onClick={handleEditTeam}
                >
                  Edit Team
                </button>

                <button
                  className="team-action-btn danger"
                  onClick={handleDeleteTeam}
                >
                  Delete Team
                </button>

              </div>
            )}

          </div>

          <div className="teams-summary-list">
            <div className="teams-summary-row">
              <span className="teams-summary-label">Team Number</span>
              <strong className="teams-summary-value">{team.teamNumber}</strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Reporting Manager</span>
              <strong className="teams-summary-value">
                {team.reportingManager}
              </strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Project Name</span>
              <strong className="teams-summary-value">{team.projectName}</strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Engagement Type</span>
              <strong className="teams-summary-value">{team.engagementType}</strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Total Members</span>
              <strong className="teams-summary-value">
                {summary?.totalMembers || 0}
              </strong>
            </div>
          </div>
        </section>

        <aside className="teams-stat-card">
          <span className="teams-stat-label">Members Count</span>
          <strong className="teams-stat-value">{summary?.totalMembers || 0}</strong>
          <p>
            Employees currently assigned to <strong>{team.teamName}</strong>.
          </p>
          <div className="teams-stat-icon">
            <FaUsers />
          </div>
        </aside>
      </div>

      {!isEmployee && (
        <TeamReportingDays
          teamName={team.teamName}
          days={team.reportingDays}
          draftDays={draftReportingDays}
          isEditing={isEditingReportingDays}
          onEdit={() => setIsEditingReportingDays(true)}
          onCancel={() => {
            setDraftReportingDays(team.reportingDays || [...TEAM_DAY_OPTIONS]);
            setIsEditingReportingDays(false);
          }}
          onSave={handleSaveReportingDays}
          onToggleDay={handleToggleReportingDay}
        />
      )}

      <TeamMembersTable
        members={team.members || []}
        teamProjectName={team.projectName}
        teamEngagementType={team.engagementType}
        reportingDays={team.reportingDays}
        onOverrideMember={handleOpenOverride}
        onAddMember={handleAddMembers}
        onRemoveMember={handleRemoveMember}
      />

      <OverrideMemberModal
        open={isOverrideOpen}
        member={overrideMember}
        teamProjectName={team.projectName}
        onClose={() => {
          setIsOverrideOpen(false);
          setOverrideMember(null);
        }}
        onSave={handleSaveOverride}
      />

      <EditTeamModal
        open={isEditTeamOpen}
        team={team}
        onClose={() => setIsEditTeamOpen(false)}
        onSave={async (form) => {
          try {
            const payload = {
              teamId: team.id,
              teamNumber: team.teamNumber,
              teamName: form.teamName,
              projectId: form.projectId,
              reportingManagerId: form.reportingManagerId,
              engagementType: form.engagementType,
            };

            console.log("Update Team Payload:", payload);

            await api.put(
              API_ENDPOINTS.team.update,
              payload,
              {
                headers: {
                  Authorization: `Bearer ${getToken()}`
                }
              }
            );

            toast.success("Team updated successfully");

            setIsEditTeamOpen(false);

            fetchTeam();

          } catch (err) {

            console.log(err);
            console.log("Status:", err.response?.status);
            console.log("Response:", err.response?.data);
            console.log("Request:", JSON.parse(err.config?.data || "{}"));

            toast.error(err.response?.data || "Unable to update team");
          }
        }}
      />

      <AddMembersModal
        open={isAddMemberOpen}
        team={team}
        onClose={() => setIsAddMemberOpen(false)}
        onSave={async (employeeIds) => {

          try {

            await api.post(
              API_ENDPOINTS.team.addMembers,
              {
                teamId: team.id,
                employeeIds,
              },
              {
                headers: {
                  Authorization: `Bearer ${getToken()}`
                }
              }
            );

            toast.success("Members added");

            setIsAddMemberOpen(false);

            fetchTeam();

          } catch (err) {

            console.log(err);

            toast.error("Unable to add members");

          }

        }}
      />

      <DeleteTeamModal
        open={isDeleteTeamOpen}
        team={team}
        onClose={() => setIsDeleteTeamOpen(false)}
        onDelete={async () => {

          try {

            await api.delete(
              API_ENDPOINTS.team.delete(team.id),
              {
                headers: {
                  Authorization: `Bearer ${getToken()}`
                }
              }
            );

            toast.success("Team deleted");

            navigate("/teams");

          } catch (err) {

            console.log(err);

            toast.error("Unable to delete team");

          }

        }}
      />

      <RemoveMemberModal
        open={!!removeMember}
        member={removeMember}
        onClose={() => setRemoveMember(null)}
        onRemove={async () => {

          try {

            await api.delete(
              API_ENDPOINTS.team.removeMember(
                team.id,
                removeMember.employeeId
              ),
              {
                headers: {
                  Authorization: `Bearer ${getToken()}`
                }
              }
            );

            toast.success("Member removed");

            setRemoveMember(null);

            fetchTeam();

          } catch (err) {

            console.log(err);

            toast.error("Unable to remove member");

          }

        }}
      />

    </div>
  );
}

export default TeamDetails;
