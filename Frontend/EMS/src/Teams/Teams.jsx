import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toastError, toastSuccess } from "@/components/common/toast/toastService";
import "./Teams.css";
import AppPagination from "../components/AppPagination";
import EmptyState from "../components/EmptyState";
import { CardSkeleton } from "../components/Skeletons";
import AddTeamModal from "./AddTeamModal";
import TeamCard from "./TeamCard";
import { BASE_URL } from "../api/config";
import { API_ENDPOINTS } from "../api/endpoints";
import { createTeam, getTeamById, getTeams } from "../services/teamService";
import { hasAddPermission } from "../utils/authorization";
import {
  buildCreateTeamPayload,
  extractApiErrorMessage,
  normalizeCollection,
  normalizeTeamRecord
} from "./teamUtils";

const PAGE_SIZE = 6;

const logCreateTeamDebug = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const logTeamMemberCountDebug = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const getTeamIdValue = (team = {}) =>
  String(team?.teamId ?? team?.id ?? "").trim();

const normalizeMemberCount = (team = {}) =>
  Number(team?.memberCount || team?.membersCount || team?.members?.length || 0) || 0;

const enrichTeamMemberCount = async (team, signal) => {
  const teamId = getTeamIdValue(team);
  const fallbackMemberCount = normalizeMemberCount(team);

  logTeamMemberCountDebug("teamId:", teamId);

  if (!teamId) {
    logTeamMemberCountDebug("/api/Team/{teamId} response:", null);
    logTeamMemberCountDebug("extracted member count:", fallbackMemberCount);
    logTeamMemberCountDebug("final member count displayed:", fallbackMemberCount);

    return {
      ...team,
      memberCount: fallbackMemberCount,
      membersCount: fallbackMemberCount
    };
  }

  try {
    const response = await getTeamById(teamId, {
      signal,
      cacheTTL: 60 * 1000
    });

    logTeamMemberCountDebug("/api/Team/{teamId} response:", response.data);

    const detailedTeam = normalizeTeamRecord(response.data);
    const extractedMemberCount = normalizeMemberCount(detailedTeam);
    const finalMemberCount = extractedMemberCount || fallbackMemberCount;

    logTeamMemberCountDebug("extracted member count:", extractedMemberCount);
    logTeamMemberCountDebug("final member count displayed:", finalMemberCount);

    return {
      ...team,
      ...detailedTeam,
      members: detailedTeam?.members ?? team.members ?? [],
      memberCount: finalMemberCount,
      membersCount: finalMemberCount,
      raw: detailedTeam?.raw ?? team.raw ?? response.data
    };
  } catch (error) {
    if (error?.code === "ERR_CANCELED") {
      throw error;
    }

    logTeamMemberCountDebug("/api/Team/{teamId} response:", error?.response?.data ?? error);
    logTeamMemberCountDebug("extracted member count:", fallbackMemberCount);
    logTeamMemberCountDebug("final member count displayed:", fallbackMemberCount);

    return {
      ...team,
      memberCount: fallbackMemberCount,
      membersCount: fallbackMemberCount
    };
  }
};

const getNextTeamNumber = (teams = []) => {
  const highestNumber = teams.reduce((max, team) => {
    const match = String(team.teamNumber || "").match(/(\d+)/);

    if (!match) {
      return max;
    }

    return Math.max(max, Number.parseInt(match[1], 10) || max);
  }, 0);

  return `TM-${String(highestNumber + 1 || 1).padStart(2, "0")}`;
};

function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const canAddTeam = hasAddPermission("Teams");

  const fetchTeams = useCallback(async (signal) => {
    setIsLoading(true);

    try {
      const res = await getTeams({
        signal,
        cacheTTL: 60 * 1000
      });

      const normalizedTeams = normalizeCollection(res.data)
        .map((team) => normalizeTeamRecord(team))
        .filter(Boolean);

      const enrichedTeams = await Promise.all(
        normalizedTeams.map((team) => enrichTeamMemberCount(team, signal))
      );

      setTeams(enrichedTeams);
      return enrichedTeams;
    } catch (error) {
      if (error?.code === "ERR_CANCELED") {
        return [];
      }

      setTeams([]);
      toastError(extractApiErrorMessage(error, "Failed to load teams"));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchTeams(controller.signal);

    return () => controller.abort();
  }, [fetchTeams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredTeams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return teams;
    }

    return teams.filter((team) => {
      const memberNames = (team.members || []).map((member) =>
        String(member.employeeName || member.name || "").toLowerCase()
      );

      return [
        team.teamNumber,
        team.teamName,
        team.reportingManagerName,
        team.reportingManager,
        team.projectName,
        team.engagementType,
        ...(team.reportingDays || []),
        ...memberNames
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [searchTerm, teams]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const paginatedTeams = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredTeams.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTeams, safeCurrentPage]);

  const nextTeamNumber = useMemo(() => getNextTeamNumber(teams), [teams]);

  const handleCreateTeam = async (payload) => {
    const requestPayload = buildCreateTeamPayload(payload);
    const createTeamApiUrl = `${BASE_URL}${API_ENDPOINTS.team.create}`;

    logCreateTeamDebug("CREATE TEAM PAYLOAD:", requestPayload);
    logCreateTeamDebug("TEAM NUMBER:", requestPayload.teamNumber);
    logCreateTeamDebug("TEAM NAME:", requestPayload.teamName);
    logCreateTeamDebug(
      "REPORTING MANAGER:",
      payload?.reportingManagerName || requestPayload.reportingManagerId
    );
    logCreateTeamDebug("REPORTING MANAGER ID:", requestPayload.reportingManagerId);
    logCreateTeamDebug("ENGAGEMENT TYPE:", requestPayload.engagementType);
    logCreateTeamDebug("PROJECT ID:", requestPayload.projectId);
    logCreateTeamDebug("DEFAULT REPORTING DAYS:", requestPayload.reportingDays);
    logCreateTeamDebug("TEAM MEMBERS:", requestPayload.employeeIds);
    logCreateTeamDebug("CREATE TEAM API URL:", createTeamApiUrl);
    logCreateTeamDebug("CREATE TEAM API METHOD:", "POST");

    setIsSavingTeam(true);

    try {
      const response = await createTeam(requestPayload);

      logCreateTeamDebug("CREATE TEAM API RESPONSE:", response?.data ?? response);

      toastSuccess("Team created successfully");
      await fetchTeams().catch(() => {});

      return response.data;
    } catch (error) {
      logCreateTeamDebug("CREATE TEAM API ERROR:", error?.response?.data ?? error);
      toastError(extractApiErrorMessage(error, "Unable to create team"));
      return null;
    } finally {
      setIsSavingTeam(false);
    }
  };

  if (isLoading) {
    return (
      <div className="teams-page">
        <div className="teams-header">
          <div className="teams-header-copy">
            <div className="teams-skeleton-title" />
            <div className="teams-skeleton-subtitle" />
          </div>

          <div className="teams-header-actions">
            <div className="teams-skeleton-badge" />
            <div className="teams-skeleton-button" />
          </div>
        </div>

        <div className="teams-toolbar">
          <div className="teams-skeleton-search" />
          <div className="teams-skeleton-note" />
        </div>

        <CardSkeleton count={3} variant="panel" />
      </div>
    );
  }

  return (
    <div className="teams-page">
      <div className="teams-header">
        <div className="teams-header-copy">
          <h2 className="teams-title">Teams</h2>
          <p className="teams-subtitle">
            Click a team to view members, project details and reporting days.
          </p>
        </div>

        <div className="teams-header-actions">
          <span className="teams-count-badge">
            <FaUsers />
            {teams.length} {teams.length === 1 ? "Team" : "Teams"}
          </span>

          {canAddTeam && (
            <button
              type="button"
              className="teams-add-btn"
              onClick={() => setIsAddTeamOpen(true)}
            >
              <FaPlus />
              Add Team
            </button>
          )}
        </div>
      </div>

      <div className="teams-toolbar">
        <label className="teams-search-wrap" htmlFor="teams-search">
          <FaSearch className="teams-search-icon" aria-hidden="true" />

          <input
            id="teams-search"
            className="teams-search-input"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search teams, manager, project or members"
          />
        </label>

        <div className="teams-toolbar-note">
          Search state ready for future API integration.
        </div>
      </div>

      {filteredTeams.length === 0 ? (
        <EmptyState
          className="teams-empty-state"
          message={
            searchTerm.trim() ? "No teams match your search." : "No teams available."
          }
        />
      ) : (
        <>
          <div className="teams-grid">
            {paginatedTeams.map((team) => (
              <TeamCard
                key={team.teamId || team.id}
                team={team}
                onClick={() => {
                  const teamRouteId = team.teamId ?? team.id;
                  if (!teamRouteId) {
                    return;
                  }

                  navigate(`/teams/${teamRouteId}`, {
                    state: { team }
                  });
                }}
              />
            ))}
          </div>

          <AppPagination
            totalItems={filteredTeams.length}
            currentPage={safeCurrentPage}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="teams"
          />
        </>
      )}

      <AddTeamModal
        open={isAddTeamOpen}
        defaultTeamNumber={nextTeamNumber}
        onClose={() => setIsAddTeamOpen(false)}
        onCreate={handleCreateTeam}
        onOpenExistingTeam={(teamId) => {
          setIsAddTeamOpen(false);
          if (teamId) {
            navigate(`/teams/${teamId}`);
          }
        }}
        saving={isSavingTeam}
      />
    </div>
  );
}

export default Teams;
