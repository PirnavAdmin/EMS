import {
  MOCK_MANAGERS,
  MOCK_EMPLOYEES,
  MOCK_PROJECTS,
  TEAM_DAY_OPTIONS,
  TEAM_ENGAGEMENT_OPTIONS,
  getEmployeeById,
} from "./employeeData";

const normalizeTeamSlug = (...parts) =>
  parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getComplementDays = (selectedDays = []) =>
  TEAM_DAY_OPTIONS.filter((day) => !selectedDays.includes(day));

const buildMemberRecord = (memberSeed = {}, teamDefaults = {}) => {
  const employee = getEmployeeById(memberSeed.employeeId);
  const teamReportingDays = Array.isArray(teamDefaults.reportingDays)
    ? teamDefaults.reportingDays
    : TEAM_DAY_OPTIONS;

  const baseWfoDays = Array.isArray(memberSeed.wfoDays) && memberSeed.wfoDays.length
    ? memberSeed.wfoDays
    : teamReportingDays;

  const baseWfhDays = Array.isArray(memberSeed.wfhDays)
    ? memberSeed.wfhDays
    : getComplementDays(baseWfoDays);

  const employeeName =
    employee?.name ||
    memberSeed.employeeName ||
    memberSeed.name ||
    `Employee ${memberSeed.employeeId || ""}`.trim();

  return {
    employeeId: employee?.id || memberSeed.employeeId || "",
    userId: employee?.userId || memberSeed.userId || "",
    employeeName,
    designation: employee?.designation || memberSeed.designation || "Team Member",
    department: employee?.department || memberSeed.department || "",
    projectName: memberSeed.projectName || teamDefaults.projectName || "",
    engagementType: memberSeed.engagementType || teamDefaults.engagementType || "Project",
    crossTeam: Boolean(memberSeed.crossTeam),
    wfoDays: baseWfoDays,
    wfhDays: baseWfhDays,
    overrideProjectName: memberSeed.overrideProjectName || "",
    overrideWfoDays: memberSeed.overrideWfoDays || [],
    overrideWfhDays: memberSeed.overrideWfhDays || [],
  };
};

export const createTeamRecord = ({
  teamNumber,
  teamName,
  engagementType,
  reportingManager,
  projectName,
  reportingDays = TEAM_DAY_OPTIONS,
  accent = "teal",
  members = [],
}) => {
  const resolvedMembers = members.map((member) =>
    buildMemberRecord(member, {
      engagementType,
      projectName,
      reportingDays,
    })
  );

  const slug = normalizeTeamSlug(teamNumber, teamName);

  return {
    id: slug,
    slug,
    teamNumber,
    teamName,
    engagementType,
    reportingManager,
    projectName,
    reportingDays: [...reportingDays],
    accent,
    members: resolvedMembers,
    membersCount: resolvedMembers.length,
  };
};

export const INITIAL_TEAMS = [
  createTeamRecord({
    teamNumber: "TM-01",
    teamName: "Atlas",
    engagementType: "Project",
    reportingManager: "Nidhi Verma",
    projectName: "Atlas Commerce",
    reportingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    accent: "teal",
    members: [
      {
        employeeId: "EMP-1001",
        projectName: "Atlas Commerce",
        wfoDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        wfhDays: [],
        crossTeam: false,
      },
      {
        employeeId: "EMP-1002",
        projectName: "Nimbus Creative Support",
        wfoDays: ["Mon", "Wed", "Fri"],
        wfhDays: ["Tue", "Thu"],
        crossTeam: true,
      },
      {
        employeeId: "EMP-1003",
        projectName: "Atlas QA Automation",
        wfoDays: ["Tue", "Thu"],
        wfhDays: ["Mon", "Wed", "Fri"],
        crossTeam: false,
      },
    ],
  }),
  createTeamRecord({
    teamNumber: "TM-02",
    teamName: "Nimbus",
    engagementType: "Training",
    reportingManager: "Rahul Kapoor",
    projectName: "Nimbus Academy",
    reportingDays: ["Mon", "Wed", "Fri"],
    accent: "blue",
    members: [
      {
        employeeId: "EMP-1004",
        projectName: "Nimbus Academy",
        wfoDays: ["Mon", "Wed", "Fri"],
        wfhDays: ["Tue", "Thu"],
        crossTeam: false,
      },
      {
        employeeId: "EMP-1005",
        projectName: "Nimbus Academy",
        wfoDays: ["Tue", "Thu"],
        wfhDays: ["Mon", "Wed", "Fri"],
        crossTeam: false,
      },
      {
        employeeId: "EMP-1006",
        projectName: "Spark Ops",
        wfoDays: ["Mon", "Thu"],
        wfhDays: ["Tue", "Wed", "Fri"],
        crossTeam: true,
      },
    ],
  }),
  createTeamRecord({
    teamNumber: "TM-03",
    teamName: "Spark",
    engagementType: "Project",
    reportingManager: "Kavya Menon",
    projectName: "Spark CRM Revamp",
    reportingDays: ["Tue", "Wed", "Thu"],
    accent: "amber",
    members: [
      {
        employeeId: "EMP-1007",
        projectName: "Spark CRM Revamp",
        wfoDays: ["Tue", "Wed", "Thu"],
        wfhDays: ["Mon", "Fri"],
        crossTeam: false,
      },
      {
        employeeId: "EMP-1008",
        projectName: "Spark CRM Revamp",
        wfoDays: ["Tue", "Fri"],
        wfhDays: ["Mon", "Wed", "Thu"],
        crossTeam: false,
      },
      {
        employeeId: "EMP-1009",
        projectName: "Atlas Ops",
        wfoDays: ["Mon", "Thu", "Fri"],
        wfhDays: ["Tue", "Wed"],
        crossTeam: true,
      },
    ],
  }),
];

export const getTeamBySlug = (slug, teams = INITIAL_TEAMS) =>
  teams.find(
    (team) =>
      String(team.slug).toLowerCase() === String(slug || "").trim().toLowerCase() ||
      String(team.teamNumber).toLowerCase() === String(slug || "").trim().toLowerCase()
  ) || null;

export {
  MOCK_EMPLOYEES,
  MOCK_MANAGERS,
  MOCK_PROJECTS,
  getComplementDays,
  TEAM_DAY_OPTIONS,
  TEAM_ENGAGEMENT_OPTIONS,
  normalizeTeamSlug,
};
