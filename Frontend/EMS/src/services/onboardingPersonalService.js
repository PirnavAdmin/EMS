import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getOnboardingPersonalInfo = async (onboardingId) => {
  const response = await api.get(
    API_ENDPOINTS.onboardingPersonalInfo.byOnboardingId(onboardingId)
  );

  return response.data;
};

export const createOnboardingPersonalInfo = async (payload) => {
  const response = await api.post(
    API_ENDPOINTS.onboardingPersonalInfo.create,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const updateOnboardingPersonalInfo = async (onboardingId, payload) => {
  const response = await api.put(
    API_ENDPOINTS.onboardingPersonalInfo.update(onboardingId),
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};
