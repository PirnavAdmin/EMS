import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getReports = (config = {}) =>
  api.get(API_ENDPOINTS.reports.all, config);
