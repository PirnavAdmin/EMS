import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const taxDeclarationService = {
  getAll: () => api.get(API_ENDPOINTS.taxDeclaration.list, { dedupe: false }),
  create: (payload) => api.post(API_ENDPOINTS.taxDeclaration.create, payload),
  update: (payload) => api.put(API_ENDPOINTS.taxDeclaration.update, payload),
  getEmployeeDeclaration: (employeeId) =>
    api.get(API_ENDPOINTS.taxDeclaration.byEmployee(employeeId), { dedupe: false }),
  submit: (id) => api.post(API_ENDPOINTS.taxDeclaration.submit(id)),
  approve: (id, payload = {}) =>
    api.post(API_ENDPOINTS.taxDeclaration.approve(id), payload),
  delete: (id) => api.delete(API_ENDPOINTS.taxDeclaration.delete(id)),
};

export const taxDeclarationItemService = {
  create: (payload) => api.post(API_ENDPOINTS.taxDeclarationItem.create, payload),
  update: (payload) => api.put(API_ENDPOINTS.taxDeclarationItem.update, payload),
  getItems: (declarationId) =>
    api.get(API_ENDPOINTS.taxDeclarationItem.byDeclaration(declarationId), {
      dedupe: false,
    }),
  delete: (id) => api.delete(API_ENDPOINTS.taxDeclarationItem.delete(id)),
};

export const taxProofService = {
  upload: (payload) => {
    const formData = payload instanceof FormData ? payload : new FormData();

    if (!(payload instanceof FormData)) {
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value);
        }
      });
    }

    return api.post(API_ENDPOINTS.taxProof.upload, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getProof: (itemId) =>
    api.get(API_ENDPOINTS.taxProof.byItem(itemId), { dedupe: false }),
  approve: (id, payload = {}) => api.post(API_ENDPOINTS.taxProof.approve(id), payload),
  reject: (id, payload = {}) => api.post(API_ENDPOINTS.taxProof.reject(id), payload),
  delete: (id) => api.delete(API_ENDPOINTS.taxProof.delete(id)),
};

export const tdsService = {
  calculate: (employeeId, payload = {}) =>
    api.post(API_ENDPOINTS.tds.calculate(employeeId), payload),
  getEmployeeTDS: (employeeId) =>
    api.get(API_ENDPOINTS.tds.byEmployee(employeeId), { dedupe: false }),
};

export const form16Service = {
  generate: (employeeId, payload = {}) =>
    api.post(API_ENDPOINTS.form16.generate(employeeId), payload),
  getEmployeeForm16: (employeeId) =>
    api.get(API_ENDPOINTS.form16.byEmployee(employeeId), { dedupe: false }),
  download: (id) =>
    api.get(API_ENDPOINTS.form16.download(id), { responseType: "blob" }),
  delete: (id) => api.delete(API_ENDPOINTS.form16.delete(id)),
};
