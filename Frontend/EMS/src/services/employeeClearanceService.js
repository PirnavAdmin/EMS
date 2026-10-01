import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
export const createClearance = (payload) => api.post(API_ENDPOINTS.employeeClearance.create, { resignationId: Number(payload.resignationId) });
export const updateDepartmentClearance = (payload) => api.put(API_ENDPOINTS.employeeClearance.department, payload);
export const getClearanceByResignation = (id) => api.get(API_ENDPOINTS.employeeClearance.byResignation(id));
export const getPendingClearances = () => api.get(API_ENDPOINTS.employeeClearance.pending);
export const getCompletedClearances = () => api.get(API_ENDPOINTS.employeeClearance.completed);
