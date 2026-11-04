import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getRoles = (config = {}) =>
  api.get(API_ENDPOINTS.masters.roles.list, config);

export const getRoleById = (roleId, config = {}) =>
  api.get(API_ENDPOINTS.masters.roles.byId(roleId), config);

export const createRole = (payload, config = {}) =>
  api.post(API_ENDPOINTS.masters.roles.list, payload, config);

export const updateRole = (roleId, payload, config = {}) =>
  api.put(API_ENDPOINTS.masters.roles.byId(roleId), payload, config);

export const deleteRole = (roleId, config = {}) =>
  api.delete(API_ENDPOINTS.masters.roles.byId(roleId), config);
