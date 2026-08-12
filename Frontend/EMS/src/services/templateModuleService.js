import api from "../api/axiosInstance";

const templateModuleService = {
  getAll: () => api.get("/TemplateModule"),
};

export default templateModuleService;