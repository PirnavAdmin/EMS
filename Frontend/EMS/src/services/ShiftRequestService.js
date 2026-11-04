import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
 
const buildApprovedByParams = (approvedBy) => {
  const value = String(approvedBy ?? "").trim();
  return value ? { approvedBy: value } : undefined;
};
const buildRejectionPayload = (remarks, rejectedBy) => ({
  remarks: String(remarks ?? "").trim(),
  rejectedBy: String(rejectedBy ?? "").trim()
});
 
export const createShiftChangeRequest = async (payload) => {
  try {
    return await api.post(API_ENDPOINTS.shiftChangeRequest.create, payload);
  } catch (error) {
    console.error("POST /api/ShiftChangeRequest failed", { payload, status: error?.response?.status, response: error?.response?.data });
    throw error;
  }
};
 
export const getShiftChangeRequests = async (employeeId, status = "Pending") => {
  if (employeeId === undefined || employeeId === null || !String(employeeId).trim()) return [];
  const response = await api.get(API_ENDPOINTS.shiftChangeRequest.list, {
    params: { employeeId: String(employeeId).trim(), ...(status ? { status } : {}) }, dedupe: false
  });
  return response.data;
};
export const fetchShiftChangeRequests = getShiftChangeRequests;
 
export const cancelShiftChangeRequest = (requestId) => {
  if (requestId === undefined || requestId === null || !String(requestId).trim()) {
    throw new Error("A shift change request ID is required to cancel a request.");
  }
  return api.delete(API_ENDPOINTS.shiftChangeRequest.delete(requestId));
};
 
export const getTeamShiftChangeRequests = async (teamId, status = "") => {
  if (teamId === undefined || teamId === null || !String(teamId).trim()) return [];
  const response = await api.get(API_ENDPOINTS.shiftChangeRequest.list, {
    params: { teamId: String(teamId).trim(), ...(status ? { status } : {}) }, dedupe: false
  });
  return response.data;
};
 
export const approveShiftChangeRequest = (id, approvedBy) =>
  api.put(API_ENDPOINTS.shiftChangeRequest.approveById(id), undefined, { params: buildApprovedByParams(approvedBy) });
export const rejectShiftChangeRequest = (id, remarks, rejectedBy) =>
  api.put(API_ENDPOINTS.shiftChangeRequest.reject(id), buildRejectionPayload(remarks, rejectedBy));
 
 