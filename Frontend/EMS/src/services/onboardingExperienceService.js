import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getOnboardingExperience = async (onboardingId) => {
  const response = await api.get(
    API_ENDPOINTS.onboardingExperience.byOnboardingId(onboardingId)
  );

  return response.data;
};

export const createOnboardingExperience = async (payload) => {
  const response = await api.post(
    API_ENDPOINTS.onboardingExperience.create,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const updateOnboardingExperience = async (onboardingId, payload) => {
  const response = await api.put(
    API_ENDPOINTS.onboardingExperience.update(onboardingId),
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};
