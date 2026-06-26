import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Teams.css";
import AppPagination from "../components/AppPagination";
import EmptyState from "../components/EmptyState";
import { CardSkeleton } from "../components/Skeletons";
import AddTeamModal from "./AddTeamModal";
import TeamCard from "./TeamCard";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  TEAM_DAY_OPTIONS,
  getComplementDays,
} from "./teamsData";
import { getEmployeeById } from "./employeeData";

const TEAM_ACCENTS = ["teal", "blue", "amber", "violet"];
const PAGE_SIZE = 6;
const roleName = localStorage.getItem("roleName") || "";
const isEmployee = roleName.toLowerCase() === "employee";

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

const buildMemberSeedsFromSelection = ({
  memberIds = [],
  projectName = "",
  reportingDays = TEAM_DAY_OPTIONS,
  engagementType = "Project",
}) =>
  memberIds.map((memberId) => {
    const employee = getEmployeeById(memberId);

    return {
      employeeId: employee?.id || memberId,
      userId: employee?.userId || "",
      employeeName: employee?.name || memberId,
      designation: employee?.designation || "Team Member",
      department: employee?.department || "",
      projectName,
      engagementType,
      wfoDays: [...reportingDays],
      wfhDays: getComplementDays(reportingDays),
      crossTeam: false,
    };
  });

function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const fetchTeams = async () => {
    try {

      setIsLoading(true);

      const res = await api.get(
        API_ENDPOINTS.team.list,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );
      console.log("Teams API:", res.data);

      setTeams(res.data || []);

    } catch (err) {

      console.log(err);

    } finally {

      setIsLoading(false);

    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

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
        ...memberNames,
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

    try {

      const response = await api.post(
        API_ENDPOINTS.team.create,
        payload,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      toast.success("Team Created");

      await fetchTeams();

      return response.data;

    }
    catch (err) {

      console.log(err);

      toast.error("Unable to create team");
    }

  };

  if (isLoading) {
    return (
      <div className="teams-page">
        <ToastContainer position="top-right" autoClose={2500} />

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
      <ToastContainer position="top-right" autoClose={2500} />

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

          {!isEmployee && (
            <button
              onClick={handleAddTeam}
            >
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
            searchTerm.trim()
              ? "No teams match your search."
              : "No teams available."
          }
        />
      ) : (
        <>
          <div className="teams-grid">
            {paginatedTeams.map((team) => (
              <TeamCard
                key={team.id || team.teamId}
                team={team}
                onClick={() =>
                  navigate(`/teams/${team.teamId}`, {
                    state: { team },
                  })
                }
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
      />
    </div>
  );
}

export default Teams;
