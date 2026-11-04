import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildApiUrl } from "../api/endpoints";

export const getEmployees = (config = {}) =>
  api.get(API_ENDPOINTS.employees.list, config);

export const createEmployee = (payload, config = {}) =>
  api.post(API_ENDPOINTS.employees.list, payload, config);

export const updateEmployee = (employeeId, payload, config = {}) =>
  api.put(API_ENDPOINTS.employees.byId(employeeId), payload, config);

export const deleteEmployee = (employeeId, config = {}) =>
  api.delete(API_ENDPOINTS.employees.byId(employeeId), config);

export const downloadFullMaster = (config = {}) =>
  api.get(API_ENDPOINTS.employees.downloadFullMaster, {
    responseType: "blob",
    ...config,
  });

export const downloadEmployeeTemplate = (config = {}) =>
  api.get(API_ENDPOINTS.employees.downloadEmployeeTemplate, {
    responseType: "blob",
    ...config,
  });

export const bulkUploadEmployees = (formData, config = {}) =>
  api.post(API_ENDPOINTS.employees.bulkUpload, formData, config);

export const getUpcomingBirthdays = (config = {}) =>
  api.get(API_ENDPOINTS.employees.upcomingBirthdays, config);

export const exportEmployeeProfilePdf = (employeeId, config = {}) =>
  api.get(buildApiUrl(API_ENDPOINTS.employees.exportProfilePdf(employeeId)), {
    responseType: "blob",
    ...config,
  });

export const getEmployeeFullDetail = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.employeeFullDetail.byId(employeeId), config);

export const getMyEmployeeFullDetail = (config = {}) =>
  api.get(API_ENDPOINTS.employeeFullDetail.myDetails, config);

export const getEmployeePersonalInfo = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.employeePersonalInfo.byEmployeeId(employeeId), config);

export const createEmployeePersonalInfo = (payload, config = {}) =>
  api.post(API_ENDPOINTS.employeePersonalInfo.list, payload, config);

export const updateEmployeePersonalInfo = (employeeId, payload, config = {}) =>
  api.put(API_ENDPOINTS.employeePersonalInfo.byEmployeeId(employeeId), payload, config);

export const getEmployeeBankDetails = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.employeeBankDetails.byEmployeeId(employeeId), config);

export const createEmployeeBankDetails = (payload, config = {}) =>
  api.post(API_ENDPOINTS.employeeBankDetails.list, payload, config);

export const updateEmployeeBankDetails = (employeeId, payload, config = {}) =>
  api.put(API_ENDPOINTS.employeeBankDetails.byEmployeeId(employeeId), payload, config);

export const getEmployeeSalaryStructure = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.employeeSalaryStructure.byEmployeeId(employeeId), config);

export const createEmployeeSalaryStructure = (payload, config = {}) =>
  api.post(API_ENDPOINTS.employeeSalaryStructure.list, payload, config);

export const updateEmployeeSalaryStructure = (employeeId, payload, config = {}) =>
  api.put(API_ENDPOINTS.employeeSalaryStructure.update(employeeId), payload, config);

export const getEmployeeEducation = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId), config);

export const createEmployeeEducation = (payload, config = {}) =>
  api.post(API_ENDPOINTS.employeeEducation.list, payload, config);

export const updateEmployeeEducation = (employeeId, payload, config = {}) =>
  api.put(API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId), payload, config);

export const deleteEmployeeEducation = (employeeId, config = {}) =>
  api.delete(API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId), config);

export const getEmployeeExperience = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.employeeExperience.byEmployeeId(employeeId), config);

export const createEmployeeExperience = (payload, config = {}) =>
  api.post(API_ENDPOINTS.employeeExperience.list, payload, config);

export const updateEmployeeExperience = (employeeId, payload, config = {}) =>
  api.put(API_ENDPOINTS.employeeExperience.byEmployeeId(employeeId), payload, config);

export const deleteEmployeeExperience = (employeeId, config = {}) =>
  api.delete(API_ENDPOINTS.employeeExperience.byEmployeeId(employeeId), config);
