import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const loginSuperAdmin = (payload, config = {}) =>
  api.post(API_ENDPOINTS.auth.superAdminLogin, payload, config);

export const loginAdmin = (payload, config = {}) =>
  api.post(API_ENDPOINTS.auth.adminLogin, payload, config);

export const loginUser = (payload, config = {}) =>
  api.post(API_ENDPOINTS.auth.userLogin, payload, config);

export const registerUser = (payload, config = {}) =>
  api.post(API_ENDPOINTS.auth.userRegister, payload, config);

export const forgotPasswordByRole = (role = "admin", payload, config = {}) =>
  api.post(API_ENDPOINTS.auth.forgotPasswordByRole(role), payload, config);

export const verifyOtpByRole = (role = "admin", payload, config = {}) =>
  api.post(API_ENDPOINTS.auth.verifyOtpByRole(role), payload, config);

export const resetPasswordByRole = (role = "admin", payload, config = {}) =>
  api.post(API_ENDPOINTS.auth.resetPasswordByRole(role), payload, config);

export const changePasswordByRole = (role = "admin", payload, config = {}) =>
  api.post(API_ENDPOINTS.auth.changePasswordByRole(role), payload, config);
