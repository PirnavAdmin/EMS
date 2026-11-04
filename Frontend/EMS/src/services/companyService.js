import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getCompanyById = (companyId, config = {}) =>
  api.get(API_ENDPOINTS.company.getById(companyId), config);

export const updateCompany = (companyId, payload, config = {}) =>
  api.put(API_ENDPOINTS.company.update(companyId), payload, config);

export const getBranches = (config = {}) =>
  api.get(API_ENDPOINTS.company.branches.list, config);

export const createBranch = (payload, config = {}) =>
  api.post(API_ENDPOINTS.company.branches.list, payload, config);

export const updateBranch = (branchId, payload, config = {}) =>
  api.put(API_ENDPOINTS.company.branches.byId(branchId), payload, config);

export const deleteBranch = (branchId, config = {}) =>
  api.delete(API_ENDPOINTS.company.branches.byId(branchId), config);

export const getHolidays = (config = {}) =>
  api.get(API_ENDPOINTS.company.holidays.list, config);

export const createHoliday = (payload, config = {}) =>
  api.post(API_ENDPOINTS.company.holidays.list, payload, config);

export const updateHoliday = (holidayId, payload, config = {}) =>
  api.put(API_ENDPOINTS.company.holidays.byId(holidayId), payload, config);

export const deleteHoliday = (holidayId, config = {}) =>
  api.delete(API_ENDPOINTS.company.holidays.byId(holidayId), config);
