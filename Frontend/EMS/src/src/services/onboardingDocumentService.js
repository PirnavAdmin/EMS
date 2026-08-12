import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getOnboardingDocuments = async (onboardingId) => {
  const response = await api.get(
    API_ENDPOINTS.onboardingDocuments.byOnboardingId(onboardingId)
  );

  return response.data;
};

export const getOnboardingDocumentDetails = async (id) => {
  const response = await api.get(API_ENDPOINTS.onboardingDocuments.byId(id));

  return response.data;
};

export const uploadOnboardingDocument = async ({
  onboardingId,
  documentType,
  file,
}) => {
  const formData = new FormData();
  formData.append("onboardingId", onboardingId);
  formData.append("documentType", documentType);
  formData.append("file", file);

  const response = await api.post(API_ENDPOINTS.onboardingDocuments.upload, formData);

  return response.data;
};

export const deleteOnboardingDocument = async (id) => {
  const response = await api.delete(API_ENDPOINTS.onboardingDocuments.delete(id));

  return response.data;
};
