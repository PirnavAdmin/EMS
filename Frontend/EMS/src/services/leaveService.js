import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getLeaveRequests = (config = {}) =>
  api.get(API_ENDPOINTS.leave.list, config);

export const getAllLeaveRequests = (config = {}) =>
  api.get(API_ENDPOINTS.leave.all, config);

export const getLeaveBalance = (config = {}) =>
  api.get(API_ENDPOINTS.leave.balance, config);

export const getLeaveBalanceByEmployee = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.leaveBalance.byEmployee(employeeId), config);

export const getEmployeeLeaveDetails = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.leave.employeeLeaveDetails(employeeId), config);

export const createLeaveRequest = (payload, config = {}) =>
  api.post(API_ENDPOINTS.leave.list, payload, config);

export const applyLeave = (payload, config = {}) =>
  api.post(API_ENDPOINTS.leave.apply, payload, config);

export const deleteLeave = (leaveId, config = {}) =>
  api.delete(API_ENDPOINTS.leave.byId(leaveId), config);

export const cancelLeave = (leaveId, config = {}) =>
  api.put(API_ENDPOINTS.leave.cancel(leaveId), {}, config);

export const updateLeaveStatus = (leaveId, payload, config = {}) =>
  api.put(API_ENDPOINTS.leave.updateStatus(leaveId), payload, config);

export const getWfhRequests = (config = {}) =>
  api.get(API_ENDPOINTS.wfh.all, config);

export const getMyWfhRequests = (config = {}) =>
  api.get(API_ENDPOINTS.wfh.my, config);

export const applyWfh = (payload, config = {}) =>
  api.post(API_ENDPOINTS.wfh.apply, payload, config);

export const cancelWfh = (id, config = {}) =>
  api.put(API_ENDPOINTS.wfh.cancel(id), {}, config);

export const updateWfhStatus = (id, payload, config = {}) =>
  api.put(API_ENDPOINTS.wfh.updateStatus(id), payload, config);

export const getMyLeaveBalance = (config = {}) =>
  api.get(API_ENDPOINTS.leaveBalance.myLeaveBalance, config);
