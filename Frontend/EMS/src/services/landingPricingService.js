import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getSuperAdminLandingLogo = async () => {
  const response = await api.get(API_ENDPOINTS.superAdmin.landingLogo, {
    cacheTTL: 0,
  });
  const body = response.data;
  const payload = body?.data?.data ?? body?.data ?? body;

  if (!payload || typeof payload !== "object") {
    throw new Error("The landing page logo response was invalid.");
  }

  return payload;
};

export const uploadSuperAdminLandingLogo = (file, config = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post(API_ENDPOINTS.superAdmin.landingLogo, formData, {
    ...config,
    headers: {
      ...config.headers,
      "Content-Type": "multipart/form-data",
    },
  });
};
