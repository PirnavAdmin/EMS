import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getAdminDashboard = (config = {}) =>
  api.get(API_ENDPOINTS.dashboard, config);

export const getUserDashboard = (config = {}) =>
  api.get(API_ENDPOINTS.userDashboard, config);
