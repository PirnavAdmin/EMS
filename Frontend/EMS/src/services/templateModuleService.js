import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
 
const templateModuleService = {
  getAll: () => api.get(API_ENDPOINTS.templateModule.list, { dedupe: false }),
  create: (payload) => api.post(API_ENDPOINTS.templateModule.create, payload),
};
 
export default templateModuleService;