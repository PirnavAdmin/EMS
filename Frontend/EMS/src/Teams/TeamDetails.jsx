import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaUsers } from "react-icons/fa";
import { toastSuccess, toastError } from "@/components/common/toast/toastService";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  addTeamMembers,
  deleteTeam,
  getTeamById,
  removeTeamMember,
  updateTeam,
  updateTeamMemberOverride,
  updateTeamReportingDays,
} from "../services/teamService";
import { hasModulePermission, isEmployee } from "../utils/authorization";
import { TEAM_DAY_OPTIONS } from "./teamsData";

function TeamDetails() {
  const { teamId } = useParams();
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
  const canManageTeams = !isEmployee() && hasModulePermission("Teams");

  const fetchTeam = useCallback(async (signal) => {
    try {
      setIsLoading(true);

      if (!teamId) {
        setTeam(null);
        return null;
      }

      const res = await getTeamById(teamId, {
        signal,
        cacheTTL: 60 * 1000
      });

      setTeam({
        ...res.data,
        id: res.data.teamId
      });

      setDraftReportingDays(
        res.data.reportingDays || [...TEAM_DAY_OPTIONS]
      );

      return res.data;

    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchTeam(controller.signal).catch(() => {});

    return () => controller.abort();
  }, [fetchTeam]);

  const summary = useMemo(() => {
    if (!team) {
      return null;
    }

    return {
      totalMembers: team.members?.length || 0,
      reportingDays: team.reportingDays || TEAM_DAY_OPTIONS
    };
  }, [team]);

  const handleToggleReportingDay = (day) => {
    setDraftReportingDays((current) => {
      const isSelected = current.includes(day);
      return isSelected ?
      current.filter((item) => item !== day) :
      [...current, day];
    });
  };

  const handleSaveReportingDays = async () => {

    if (draftReportingDays.length === 0) {
      toastError("Select at least one reporting day");
      return;
    }

    try {
      await updateTeamReportingDays({
        teamId: team.id,
        reportingDays: draftReportingDays
      });
      toastSuccess("Reporting days updated");

      setIsEditingReportingDays(false);

      await fetchTeam().catch(() => {});

    } catch (err) {

      toastError("Unable to update reporting days");

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
      reportingDays: customReportingDays ?
      reportingDays :
      []
    };

    try {
      await updateTeamMemberOverride(payload);
      await fetchTeam().catch(() => {});

    } catch (err) {

    }
  };

  if (isLoading) {
    return (
      <div className="teams-page">
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
          { width: "140px", type: "actions", headerWidth: "54%" }]
          } />
        
      </div>);

  }

  if (!team) {
    return (
      <div className="teams-page">
<button
          type="button"
          className="teams-back-btn"
          onClick={() => navigate("/teams")}>
          
          <FaArrowLeft />
          Back to Teams
        </button>

        <EmptyState
          className="teams-empty-state teams-detail-empty"
          message="Team not found." />
        
      </div>);

  }

  return (
    <div className="teams-page">
<button
        type="button"
        className="teams-back-btn"
        onClick={() => navigate("/teams")}>
        
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

            {canManageTeams &&
            <div className="team-summary-actions">

                <button
                className="team-action-btn secondary"
                onClick={handleEditTeam}>
                
                  Edit Team
                </button>

                <button
                className="team-action-btn danger"
                onClick={handleDeleteTeam}>
                
                  Delete Team
                </button>

              </div>
            }

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

      {canManageTeams &&
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
        onToggleDay={handleToggleReportingDay} />

      }

      <TeamMembersTable
        members={team.members || []}
        teamProjectName={team.projectName}
        teamEngagementType={team.engagementType}
        reportingDays={team.reportingDays}
        canManage={canManageTeams}
        onOverrideMember={handleOpenOverride}
        onAddMember={handleAddMembers}
        onRemoveMember={handleRemoveMember} />
      

      <OverrideMemberModal
        open={isOverrideOpen}
        member={overrideMember}
        teamProjectName={team.projectName}
        onClose={() => {
          setIsOverrideOpen(false);
          setOverrideMember(null);
        }}
        onSave={handleSaveOverride} />
      

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
              engagementType: form.engagementType
            };

            await updateTeam(payload);

            toastSuccess("Team updated successfully");

            setIsEditTeamOpen(false);

            await fetchTeam().catch(() => {});

          } catch (err) {

            toastError(err.response?.data || "Unable to update team");
          }
        }} />
      

      <AddMembersModal
        open={isAddMemberOpen}
        team={team}
        onClose={() => setIsAddMemberOpen(false)}
        onSave={async (employeeIds) => {

          try {
            await addTeamMembers({
              teamId: team.id,
              employeeIds
            });

            toastSuccess("Members added");

            setIsAddMemberOpen(false);

            await fetchTeam().catch(() => {});

          } catch (err) {

            toastError("Unable to add members");

          }

        }} />
      

      <DeleteTeamModal
        open={isDeleteTeamOpen}
        team={team}
        onClose={() => setIsDeleteTeamOpen(false)}
        onDelete={async () => {

          try {
            await deleteTeam(team.id);

            toastSuccess("Team deleted");

            navigate("/teams");

          } catch (err) {

            toastError("Unable to delete team");

          }

        }} />
      

      <RemoveMemberModal
        open={!!removeMember}
        member={removeMember}
        onClose={() => setRemoveMember(null)}
        onRemove={async () => {

          try {
            await removeTeamMember(team.id, removeMember.employeeId);

            toastSuccess("Member removed");

            setRemoveMember(null);

            await fetchTeam().catch(() => {});

          } catch (err) {

            toastError("Unable to remove member");

          }

        }} />
      

    </div>);

}

export default TeamDetails;
