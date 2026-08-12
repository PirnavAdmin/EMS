import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getOnboardingEducation = async (onboardingId) => {
  const response = await api.get(
    API_ENDPOINTS.onboardingEducation.byOnboardingId(onboardingId)
  );

  return response.data;
};

export const createOnboardingEducation = async (payload) => {
  const response = await api.post(
    API_ENDPOINTS.onboardingEducation.create,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const updateOnboardingEducation = async (onboardingId, payload) => {
  const response = await api.put(
    API_ENDPOINTS.onboardingEducation.update(onboardingId),
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};
