import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toastSuccess, toastError } from "@/components/common/toast/toastService";
import "./Teams.css";
import AppPagination from "../components/AppPagination";
import EmptyState from "../components/EmptyState";
import { CardSkeleton } from "../components/Skeletons";
import AddTeamModal from "./AddTeamModal";
import TeamCard from "./TeamCard";
import { createTeam, getTeams } from "../services/teamService";
import { hasModulePermission, isEmployee } from "../utils/authorization";

const PAGE_SIZE = 6;

const pickTeamApiMessage = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = pickTeamApiMessage(item);
      if (message) {
        return message;
      }
    }

    return "";
  }

  if (typeof value !== "object") {
    return "";
  }

  const directMessage =
  value.message ||
  value.Message ||
  value.error ||
  value.Error ||
  value.title ||
  value.Title ||
  value.detail ||
  value.Detail ||
  value.exceptionMessage ||
  "";

  if (directMessage) {
    return String(directMessage).trim();
  }

  const validationErrors = value.errors || value.Errors;

  if (validationErrors && typeof validationErrors === "object") {
    for (const item of Object.values(validationErrors)) {
      const message = pickTeamApiMessage(item);
      if (message) {
        return message;
      }
    }
  }

  return "";
};

const getCreateTeamErrorMessage = (error) => {
  const status = error?.response?.status;
  const responseMessage = pickTeamApiMessage(error?.response?.data);

  if (responseMessage) {
    return responseMessage;
  }

  if (status === 400) {
    return "Please review the team details and try again.";
  }

  if (typeof status === "number" && status >= 500) {
    return "Internal Server Error. Please try again later.";
  }

  return error?.message || "Unable to create team";
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
  const canManageTeams = !isEmployee() && hasModulePermission("Teams");

  const fetchTeams = useCallback(async (signal) => {
    try {
      setIsLoading(true);

      const res = await getTeams({
        signal,
        cacheTTL: 60 * 1000
      });

      setTeams(res.data || []);

      return res.data || [];
    } catch (err) {
      if (err?.code === "ERR_CANCELED") {
        return [];
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTeams(controller.signal);

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
      String(member.employeeName || "").toLowerCase()
      );

      return [
      team.teamNumber,
      team.teamName,
      team.reportingManager,
      team.projectName,
      team.engagementType,
      ...(team.reportingDays || []),
      ...memberNames].

      filter(Boolean).
      some((value) => String(value).toLowerCase().includes(query));
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
    try {
      const response = await createTeam(payload);

      toastSuccess("Team Created");

      await fetchTeams().catch(() => {});

      return response.data;
    } catch (err) {
      toastError(getCreateTeamErrorMessage(err));
      return null;
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
      </div>);

  }

  return (
    <div className="teams-page">
<div className="teams-header">
        <div className="teams-header-copy">
          <h2 className="teams-title">Teams</h2>
          <p className="teams-subtitle">
            Click a team to view members, projects and reporting days.
          </p>
        </div>

        <div className="teams-header-actions">
          <span className="teams-count-badge">
            <FaUsers />
            {teams.length} {teams.length === 1 ? "Team" : "Teams"}
          </span>

          {canManageTeams &&
          <button
            className="teams-add-btn"
            onClick={() => setIsAddTeamOpen(true)}>

              <FaPlus />
              Add Team
            </button>
          }
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
            placeholder="Search teams, manager, project or members" />

        </label>

        <div className="teams-toolbar-note">
          Search state ready for future API integration.
        </div>
      </div>

      {filteredTeams.length === 0 ?
      <EmptyState
        className="teams-empty-state"
        message={
        searchTerm.trim() ?
        "No teams match your search." :
        "No teams available."
        } /> :

      <>
          <div className="teams-grid">
            {paginatedTeams.map((team) =>
          <TeamCard
            key={team.id || team.teamId}
            team={team}
            onClick={() =>
            navigate(`/teams/${team.teamId}`, {
              state: { team }
            })
            } />

          )}
          </div>

          <AppPagination
          totalItems={filteredTeams.length}
          currentPage={safeCurrentPage}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="teams" />

        </>
      }

      <AddTeamModal
        open={isAddTeamOpen}
        defaultTeamNumber={nextTeamNumber}
        onClose={() => setIsAddTeamOpen(false)}
        onCreate={handleCreateTeam} />

    </div>);

}

export default Teams;
