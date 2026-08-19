import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getEmployeeDocuments = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.employeeDocuments.byEmployeeId(employeeId), config);

export const uploadEmployeeDocument = (formData, config = {}) =>
  api.post(API_ENDPOINTS.employeeDocuments.upload, formData, config);

export const viewEmployeeDocument = (id, config = {}) =>
  api.get(API_ENDPOINTS.employeeDocuments.view(id), config);

export const downloadEmployeeDocument = (id, config = {}) =>
  api.get(API_ENDPOINTS.employeeDocuments.download(id), config);

export const deleteEmployeeDocument = (id, config = {}) =>
  api.delete(API_ENDPOINTS.employeeDocuments.delete(id), config);

export const verifyEmployeeDocument = (id, config = {}) =>
  api.put(API_ENDPOINTS.employeeDocuments.verify(id), {}, config);

export const rejectEmployeeDocument = (id, config = {}) =>
  api.put(API_ENDPOINTS.employeeDocuments.reject(id), {}, config);

export const getEmployeeDocumentChecklist = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.employeeDocuments.checklist(employeeId), config);

export const getOnboardingDocuments = (onboardingId, config = {}) =>
  api.get(API_ENDPOINTS.onboardingDocuments.byOnboardingId(onboardingId), config);

export const getOnboardingDocument = (id, config = {}) =>
  api.get(API_ENDPOINTS.onboardingDocuments.byId(id), config);

export const uploadOnboardingDocument = (formData, config = {}) =>
  api.post(API_ENDPOINTS.onboardingDocuments.upload, formData, config);

export const downloadOnboardingDocument = (id, config = {}) =>
  api.get(API_ENDPOINTS.onboardingDocuments.download(id), config);

export const deleteOnboardingDocument = (id, config = {}) =>
  api.delete(API_ENDPOINTS.onboardingDocuments.delete(id), config);
