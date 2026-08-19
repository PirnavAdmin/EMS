import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getTeams = (config = {}) =>
  api.get(API_ENDPOINTS.team.list, config);

export const getTeamById = (teamId, config = {}) =>
  api.get(API_ENDPOINTS.team.byId(teamId), config);

export const createTeam = (payload, config = {}) =>
  api.post(API_ENDPOINTS.team.create, payload, config);

export const updateTeam = (payload, config = {}) =>
  api.put(API_ENDPOINTS.team.update, payload, config);

export const deleteTeam = (teamId, config = {}) =>
  api.delete(API_ENDPOINTS.team.delete(teamId), config);

export const addTeamMembers = (payload, config = {}) =>
  api.post(API_ENDPOINTS.team.addMembers, payload, config);

export const removeTeamMember = (teamId, employeeId, config = {}) =>
  api.delete(API_ENDPOINTS.team.removeMember(teamId, employeeId), config);

export const updateTeamReportingDays = (payload, config = {}) =>
  api.put(API_ENDPOINTS.team.updateReportingDays, payload, config);

export const updateTeamMemberOverride = (payload, config = {}) =>
  api.put(API_ENDPOINTS.team.memberOverride, payload, config);

export const getAvailableTeamEmployees = (config = {}) =>
  api.get(API_ENDPOINTS.team.availableEmployees, config);

export const getTeamManagers = (config = {}) =>
  api.get(API_ENDPOINTS.team.managers, config);

export const getTeamProjects = (config = {}) =>
  api.get(API_ENDPOINTS.team.projects.list, config);
