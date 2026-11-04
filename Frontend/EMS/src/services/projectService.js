import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

const normalizeProjectIdentifier = (projectId) =>
  encodeURIComponent(String(projectId ?? "").trim());

export const getProjects = (config = {}) =>
  api.get(API_ENDPOINTS.company.projects.list, config);

export const getProjectById = (projectId, config = {}) =>
  api.get(API_ENDPOINTS.company.projects.byId(normalizeProjectIdentifier(projectId)), config);

export const createProject = (payload, config = {}) =>
  api.post(API_ENDPOINTS.company.projects.list, payload, config);

export const updateProject = (projectId, payload, config = {}) =>
  api.put(API_ENDPOINTS.company.projects.byId(normalizeProjectIdentifier(projectId)), payload, config);

export const deleteProject = (projectId, config = {}) =>
  api.delete(API_ENDPOINTS.company.projects.byId(normalizeProjectIdentifier(projectId)), config);
