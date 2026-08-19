import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getDepartments = (config = {}) =>
  api.get(API_ENDPOINTS.departments.list, config);

export const getDepartmentById = (departmentId, config = {}) =>
  api.get(API_ENDPOINTS.departments.byId(departmentId), config);

export const createDepartment = (payload, config = {}) =>
  api.post(API_ENDPOINTS.departments.list, payload, config);

export const updateDepartment = (departmentId, payload, config = {}) =>
  api.put(API_ENDPOINTS.departments.byId(departmentId), payload, config);

export const deleteDepartment = (departmentId, config = {}) =>
  api.delete(API_ENDPOINTS.departments.byId(departmentId), config);
