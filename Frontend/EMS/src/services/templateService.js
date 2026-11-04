import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const templateService = {
  getAll: () => api.get(API_ENDPOINTS.template.list, { dedupe: false }),
  create: (payload) => {
    const formData = payload instanceof FormData ? payload : new FormData();

    if (!(payload instanceof FormData)) {
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value);
        }
      });
    }

    return api.post(API_ENDPOINTS.template.create, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (id) => api.delete(API_ENDPOINTS.template.delete(id)),
  download: (id) =>
    api.get(API_ENDPOINTS.template.download(id), { responseType: "blob" }),
};
