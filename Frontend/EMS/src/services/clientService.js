import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

const normalizeClientIdentifier = (clientName) =>
  encodeURIComponent(String(clientName ?? "").trim());

export const getClients = (config = {}) =>
  api.get(API_ENDPOINTS.masters.clients.list, config);

export const getClientByName = (clientName, config = {}) =>
  api.get(API_ENDPOINTS.masters.clients.byId(normalizeClientIdentifier(clientName)), config);

export const createClient = (payload, config = {}) =>
  api.post(API_ENDPOINTS.masters.clients.list, payload, config);

export const updateClient = (clientName, payload, config = {}) =>
  api.put(API_ENDPOINTS.masters.clients.byId(normalizeClientIdentifier(clientName)), payload, config);

export const deleteClient = (clientName, config = {}) =>
  api.delete(API_ENDPOINTS.masters.clients.byId(normalizeClientIdentifier(clientName)), config);

export const getClientProjects = (clientId, config = {}) =>
  api.get(API_ENDPOINTS.clients.projects(clientId), config);
