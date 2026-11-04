import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
export const applyResignation = (payload) => api.post(API_ENDPOINTS.employeeResignation.apply, payload);
export const getApprovedEmployeeResignations = () => api.get(API_ENDPOINTS.employeeResignation.employeeResignation);
export const updateResignation = (payload) => {
  const resignationId = Number(payload.resignationId);
  if (!Number.isFinite(resignationId) || resignationId <= 0) {
    console.error("[EmployeeResignation] Invalid resignationId:", payload.resignationId);
    return Promise.reject(new Error("A valid resignationId is required to update a resignation."));
  }
  const updatePayload = {
    resignationId,
    employee_Id: String(payload.employee_Id ?? "").trim(),
    resignationDate: String(payload.resignationDate ?? "").slice(0, 10),
    lastWorkingDate: String(payload.lastWorkingDate ?? "").slice(0, 10),
    reason: String(payload.reason ?? "").trim(),
  };
  console.log("[EmployeeResignation] UPDATE payload:", updatePayload);
  return api.put(API_ENDPOINTS.employeeResignation.update, updatePayload).catch((error) => {
    console.error(
      "[EmployeeResignation] UPDATE error:",
      error?.response?.status,
      error?.response?.data
    );
    throw error;
  });
};
export const getResignations = (config = {}) => {
  console.log("[Admin Resignation] Loading all resignations");
  return api.get(API_ENDPOINTS.employeeResignation.list, config).then((response) => {
    console.log("[Admin Resignation] API response:", response.data);
    return response;
  });
};
export const getEmployeeResignation = (employeeId) => api.get(API_ENDPOINTS.employeeResignation.byEmployee(employeeId));
export const getResignation = (id) => api.get(API_ENDPOINTS.employeeResignation.byId(id));
export const updateResignationApproval = (payload) => api.put(API_ENDPOINTS.employeeResignation.approval, payload);
export const deleteResignation = (id) => api.delete(API_ENDPOINTS.employeeResignation.delete(id));
