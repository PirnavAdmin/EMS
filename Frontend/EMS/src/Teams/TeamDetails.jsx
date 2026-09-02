import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaUsers } from "react-icons/fa";
import { toastError, toastSuccess } from "@/components/common/toast/toastService";
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
import { BASE_URL } from "../api/config";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  addTeamMembers,
  deleteTeam,
  getMyTeam,
  getTeamById,
  removeTeamMember,
  updateTeam,
  updateTeamMemberOverride,
  updateTeamReportingDays
} from "../services/teamService";
import {
  hasDeletePermission,
  hasEditPermission,
  hasViewPermission
} from "../utils/authorization";
import { TEAM_DAY_OPTIONS } from "./teamsData";
import {
  buildAddMembersPayload,
  buildMemberOverridePayload,
  buildUpdateReportingDaysPayload,
  buildUpdateTeamPayload,
  extractApiErrorMessage,
  normalizeReportingDays,
  normalizeTeamRecord,
  toNumberId
} from "./teamUtils";

const normalizeLookupId = (value) => String(value ?? "").trim();

const findMatchingTeamMember = (members = [], sourceMember = {}) => {
  const targetTeamMemberId = normalizeLookupId(
    sourceMember.teamMemberId ?? sourceMember.id
  );
  const targetEmployeeId = normalizeLookupId(sourceMember.employeeId);
  const targetUserId = normalizeLookupId(sourceMember.userId);
  const targetEmployeeFallbackId = normalizeLookupId(
    sourceMember.employee?.id ??
      sourceMember.employee?.employeeId ??
      sourceMember.employee?.userId
  );

  return (
    members.find((member) => {
      const memberTeamMemberId = normalizeLookupId(member.teamMemberId ?? member.id);
      const memberEmployeeId = normalizeLookupId(member.employeeId);
      const memberUserId = normalizeLookupId(member.userId);
      const memberEmployeeFallbackId = normalizeLookupId(
        member.employee?.id ?? member.employee?.employeeId ?? member.employee?.userId
      );

      return (
        (targetTeamMemberId && memberTeamMemberId === targetTeamMemberId) ||
        (targetEmployeeId && memberEmployeeId === targetEmployeeId) ||
        (targetUserId && memberUserId === targetUserId) ||
        (targetEmployeeFallbackId &&
          memberEmployeeFallbackId === targetEmployeeFallbackId)
      );
    }) || null
  );
};

const areDayListsEqual = (leftDays = [], rightDays = []) => {
  const left = normalizeReportingDays(leftDays)
    .sort((leftDay, rightDay) => TEAM_DAY_OPTIONS.indexOf(leftDay) - TEAM_DAY_OPTIONS.indexOf(rightDay))
    .join("|");
  const right = normalizeReportingDays(rightDays)
    .sort((leftDay, rightDay) => TEAM_DAY_OPTIONS.indexOf(leftDay) - TEAM_DAY_OPTIONS.indexOf(rightDay))
    .join("|");

  return left === right;
};

const logOverrideDebug = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

function TeamDetails({ mode = "management" }) {
  const params = useParams();
  const navigate = useNavigate();
  const isMyTeamMode = mode === "my-team";
  const teamId = isMyTeamMode ? null : params.teamId;

  const [team, setTeam] = useState(() => {
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingReportingDays, setIsEditingReportingDays] = useState(false);
  const [draftReportingDays, setDraftReportingDays] = useState([...TEAM_DAY_OPTIONS]);
  const [overrideMember, setOverrideMember] = useState(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isDeleteTeamOpen, setIsDeleteTeamOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState(null);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isSavingMembers, setIsSavingMembers] = useState(false);
  const [isSavingReportingDays, setIsSavingReportingDays] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const canViewTeam = isMyTeamMode || hasViewPermission("Teams");
  const canEditTeam = !isMyTeamMode && hasEditPermission("Teams");
  const canDeleteTeam = !isMyTeamMode && hasDeletePermission("Teams");

  const fetchTeam = useCallback(
    async (
      signal,
      {
        cacheTTL = 60 * 1000,
        showError = true,
        throwOnError = false,
        setLoading = true,
        clearOnError = true
      } = {}
    ) => {
      try {
        if (setLoading) {
          setIsLoading(true);
        }

        const res = isMyTeamMode
          ? await getMyTeam({
              signal,
              cacheTTL
            })
          : await getTeamById(teamId, {
              signal,
              cacheTTL
            });

        const normalizedTeam = normalizeTeamRecord(res.data);

        setTeam(normalizedTeam);
        setDraftReportingDays(
          normalizedTeam?.reportingDays?.length
            ? [...normalizedTeam.reportingDays]
            : [...TEAM_DAY_OPTIONS]
        );

        return normalizedTeam;
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return null;
        }

        if (clearOnError) {
          setTeam(null);
        }

        if (showError && error?.response?.status !== 404) {
          toastError(extractApiErrorMessage(error, "Unable to load team"));
        }

        if (throwOnError) {
          throw error;
        }

        return null;
      } finally {
        if (setLoading) {
          setIsLoading(false);
        }
      }
    },
    [isMyTeamMode, teamId]
  );

  useEffect(() => {
    if (!canViewTeam) {
      return undefined;
    }

    const controller = new AbortController();
    void fetchTeam(controller.signal).catch(() => {});

    return () => controller.abort();
  }, [canViewTeam, fetchTeam]);

  useEffect(() => {
    if (!team) {
      return;
    }

    setDraftReportingDays(
      team.reportingDays?.length ? [...team.reportingDays] : [...TEAM_DAY_OPTIONS]
    );
  }, [team]);

  const summary = useMemo(() => {
    if (!team) {
      return null;
    }

    return {
      totalMembers: team.memberCount || team.members?.length || 0,
      reportingDays: team.reportingDays || TEAM_DAY_OPTIONS
    };
  }, [team]);

  const refreshTeam = useCallback(async () => {
    return fetchTeam(undefined, {
      cacheTTL: 0,
      showError: false,
      throwOnError: true,
      setLoading: false,
      clearOnError: false
    });
  }, [fetchTeam]);

  const handleToggleReportingDay = (day) => {
    setDraftReportingDays((current) => {
      const isSelected = current.includes(day);
      return isSelected ? current.filter((item) => item !== day) : [...current, day];
    });
  };

  const handleSaveReportingDays = async () => {
    if (draftReportingDays.length === 0) {
      toastError("Select at least one reporting day");
      return;
    }

    setIsSavingReportingDays(true);

    try {
      await updateTeamReportingDays(
        buildUpdateReportingDaysPayload(team.teamId, draftReportingDays)
      );
      toastSuccess("Reporting days updated");
      setIsEditingReportingDays(false);
      await refreshTeam().catch(() => {});
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to update reporting days"));
    } finally {
      setIsSavingReportingDays(false);
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

  const handleSaveOverride = async (form) => {
    if (!team || !overrideMember) {
      return null;
    }

    setIsSavingOverride(true);

    try {
      const payload = buildMemberOverridePayload(team.teamId, overrideMember, form);
      const overrideApiUrl = `${BASE_URL}${API_ENDPOINTS.team.memberOverride}`;

      logOverrideDebug("OVERRIDE MEMBER ID:", {
        teamId: payload.teamId,
        teamMemberId: payload.teamMemberId,
        employeeId: payload.employeeId,
        userId: overrideMember.userId ?? overrideMember.employee?.userId ?? ""
      });
      logOverrideDebug("OVERRIDE API URL:", overrideApiUrl);
      logOverrideDebug("OVERRIDE API METHOD:", "PUT");
      logOverrideDebug("OVERRIDE PAYLOAD:", payload);
      logOverrideDebug("SENT CUSTOM DAYS:", payload.reportingDays ?? []);
      logOverrideDebug("SENT FLAG:", payload.customReportingDays);
      logOverrideDebug(
        "SENT PROJECT OVERRIDE:",
        payload.differentProject
          ? {
              projectId: payload.projectId
            }
          : null
      );

      const saveResponse = await updateTeamMemberOverride(payload);
      logOverrideDebug("OVERRIDE API RESPONSE:", saveResponse?.data ?? saveResponse);

      const refreshedTeam = await refreshTeam();
      logOverrideDebug("OVERRIDE REFETCH RESPONSE:", refreshedTeam?.raw ?? refreshedTeam);
      const refreshedMember = findMatchingTeamMember(
        refreshedTeam?.members || [],
        overrideMember
      );

      if (!refreshedMember) {
        throw new Error(
          "The override was saved, but the refreshed team data did not include the selected member."
        );
      }

      const mismatches = [];
      const selectedProjectId = toNumberId(form.projectId);
      const selectedReportingDays = normalizeReportingDays(form.reportingDays);
      const returnedProjectId = toNumberId(
        refreshedMember.overrideProjectId ?? refreshedMember.projectId
      );
      const returnedReportingDays = normalizeReportingDays(
        refreshedMember.overrideReportingDays?.length > 0
          ? refreshedMember.overrideReportingDays
          : refreshedMember.wfoDays
      );
      const returnedCustomDaysFlag = refreshedMember.customReportingDays === true;

      if (form.differentProject) {
        if (selectedProjectId == null) {
          mismatches.push("selected project");
        } else if (returnedProjectId !== selectedProjectId) {
          mismatches.push("selected project");
        }

        if (
          refreshedMember.differentProject !== true &&
          refreshedMember.isCrossMapped !== true
        ) {
          mismatches.push("cross-team flag");
        }
      }

      if (form.customReportingDays) {
        if (returnedCustomDaysFlag !== true) {
          mismatches.push("custom reporting days flag");
        }

        if (!areDayListsEqual(returnedReportingDays, selectedReportingDays)) {
          mismatches.push("custom reporting days");
        }
      }

      logOverrideDebug("RETURNED CUSTOM DAYS:", returnedReportingDays);
      logOverrideDebug("RETURNED FLAG:", returnedCustomDaysFlag);
      logOverrideDebug("OVERRIDE COMPARISON:", {
        sentProjectId: selectedProjectId,
        returnedProjectId,
        sentCustomDays: selectedReportingDays,
        returnedCustomDays: returnedReportingDays,
        sentFlag: Boolean(form.customReportingDays),
        returnedFlag: returnedCustomDaysFlag,
        sentEmployeeId: payload.employeeId,
        returnedEmployeeId: refreshedMember.employeeId,
        returnedUserId: refreshedMember.userId
      });

      if (mismatches.length > 0) {
        throw new Error(
          `The override was not persisted for ${mismatches.join(" and ")}.`
        );
      }

      toastSuccess("Member override saved");
      return refreshedMember;
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to save member override"));
      throw error;
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleSaveTeam = async (form) => {
    if (!team) {
      return;
    }

    setIsSavingTeam(true);

    try {
      await updateTeam(
        buildUpdateTeamPayload({
          teamId: team.teamId,
          teamNumber: team.teamNumber,
          teamName: form.teamName,
          projectId: form.projectId ?? team.projectId,
          reportingManagerId: form.reportingManagerId ?? team.reportingManagerId,
          engagementType: form.engagementType ?? team.engagementType,
          reportingDays: form.reportingDays ?? team.reportingDays,
          employeeIds:
            form.employeeIds ??
            (team.members || [])
              .map((member) => member.employeeId)
              .filter(Boolean)
        })
      );

      toastSuccess("Team updated successfully");
      setIsEditTeamOpen(false);
      await refreshTeam().catch(() => {});
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to update team"));
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleSaveMembers = async (employeeIds) => {
    if (!team) {
      return;
    }

    setIsSavingMembers(true);

    try {
      await addTeamMembers(buildAddMembersPayload(team.teamId, employeeIds));
      toastSuccess("Members added");
      setIsAddMemberOpen(false);
      await refreshTeam().catch(() => {});
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to add members"));
    } finally {
      setIsSavingMembers(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!team) {
      return;
    }

    setIsDeletingTeam(true);

    try {
      await deleteTeam(team.teamId);
      toastSuccess("Team deleted");
      navigate("/teams");
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to delete team"));
    } finally {
      setIsDeletingTeam(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!team || !removeMember) {
      return;
    }

    setIsRemovingMember(true);

    try {
      await removeTeamMember(team.teamId, removeMember.employeeId);
      toastSuccess("Member removed");
      setRemoveMember(null);
      await refreshTeam().catch(() => {});
    } catch (error) {
      toastError(extractApiErrorMessage(error, "Unable to remove member"));
    } finally {
      setIsRemovingMember(false);
    }
  };

  const backButtonLabel = isMyTeamMode ? "Back to Dashboard" : "Back to Teams";
  const backButtonTarget = isMyTeamMode ? "/dashboard" : "/teams";

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
            { width: "140px", type: "actions", headerWidth: "54%" }
          ]}
        />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="teams-page">
        <button
          type="button"
          className="teams-back-btn"
          onClick={() => navigate(backButtonTarget)}
        >
          <FaArrowLeft />
          {backButtonLabel}
        </button>

        <EmptyState
          className="teams-empty-state teams-detail-empty"
          message={
            isMyTeamMode
              ? "You are not assigned to a team yet."
              : "Team not found."
          }
        />
      </div>
    );
  }

  return (
    <div className="teams-page">
      <button
        type="button"
        className="teams-back-btn"
        onClick={() => navigate(backButtonTarget)}
      >
        <FaArrowLeft />
        {backButtonLabel}
      </button>

      <div className="teams-details-grid">
        <section className="teams-summary-card">
          <div className="teams-summary-header">
            <div>
              <span className="teams-section-kicker">Team Summary</span>

              <h2>{team.teamName || "Team"}</h2>

              <p>Members, project alignment and reporting setup.</p>
            </div>

            {canEditTeam && (
              <div className="team-summary-actions">
                <button
                  type="button"
                  className="team-action-btn secondary"
                  onClick={handleEditTeam}
                >
                  Edit Team
                </button>

                {canDeleteTeam && (
                  <button
                    type="button"
                    className="team-action-btn danger"
                    onClick={handleDeleteTeam}
                  >
                    Delete Team
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="teams-summary-list">
            <div className="teams-summary-row">
              <span className="teams-summary-label">Team ID</span>
              <strong className="teams-summary-value">
                {team.teamId ?? team.id ?? "-"}
              </strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Team Number</span>
              <strong className="teams-summary-value">{team.teamNumber || "-"}</strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Reporting Manager</span>
              <strong className="teams-summary-value">
                {team.reportingManagerName || team.reportingManager || "-"}
              </strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Project Name</span>
              <strong className="teams-summary-value">{team.projectName || "-"}</strong>
            </div>

            <div className="teams-summary-row">
              <span className="teams-summary-label">Engagement Type</span>
              <strong className="teams-summary-value">
                {team.engagementType || "-"}
              </strong>
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

      <TeamReportingDays
        teamName={team.teamName}
        days={summary?.reportingDays || TEAM_DAY_OPTIONS}
        draftDays={draftReportingDays}
        isEditing={isEditingReportingDays}
        canManage={canEditTeam}
        onEdit={() => setIsEditingReportingDays(true)}
        onCancel={() => {
          setDraftReportingDays(team.reportingDays || [...TEAM_DAY_OPTIONS]);
          setIsEditingReportingDays(false);
        }}
        onSave={handleSaveReportingDays}
        onToggleDay={handleToggleReportingDay}
      />

      <TeamMembersTable
        members={team.members || []}
        teamProjectName={team.projectName}
        teamEngagementType={team.engagementType}
        reportingDays={team.reportingDays || TEAM_DAY_OPTIONS}
        canManage={canEditTeam}
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
        saving={isSavingOverride}
      />

      <EditTeamModal
        open={isEditTeamOpen}
        team={team}
        onClose={() => setIsEditTeamOpen(false)}
        onSave={handleSaveTeam}
        saving={isSavingTeam}
      />

      <AddMembersModal
        open={isAddMemberOpen}
        team={team}
        onClose={() => setIsAddMemberOpen(false)}
        onSave={handleSaveMembers}
        saving={isSavingMembers}
      />

      <DeleteTeamModal
        open={isDeleteTeamOpen}
        team={team}
        onClose={() => setIsDeleteTeamOpen(false)}
        onDelete={handleDeleteConfirm}
        saving={isDeletingTeam}
      />

      <RemoveMemberModal
        open={!!removeMember}
        member={removeMember}
        onClose={() => setRemoveMember(null)}
        onRemove={handleConfirmRemoveMember}
        saving={isRemovingMember}
      />
    </div>
  );
}

export default TeamDetails;
