import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const LANDING_CONTACT_EMAIL_UPDATED_EVENT = "landing-contact-email-updated";

export const notifyLandingPageContactEmailUpdated = (contactEmail) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(LANDING_CONTACT_EMAIL_UPDATED_EVENT, {
      detail: { contactEmail },
    })
  );

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(LANDING_CONTACT_EMAIL_UPDATED_EVENT);
      channel.postMessage({ contactEmail });
      channel.close();
    }
  } catch (error) {
    console.error("Could not broadcast landing page contact email update.", error);
  }
};

export const getLandingPageContactEmail = async () => {
  const response = await api.get(API_ENDPOINTS.superAdmin.landingContactEmail, {
    skipAuth: true,
    cacheTTL: 0,
  });
  const body = response.data;
  const result = body?.data ?? body;
  const payload = result?.data ?? result;

  if (body?.success === false || result?.success === false) {
    throw new Error(
      body.message ||
        result.message ||
        "The landing page contact email could not be loaded."
    );
  }

  const contactEmail = payload?.contactEmail;

  if (typeof contactEmail !== "string" || !contactEmail.trim()) {
    throw new Error("The landing page contact email response was invalid.");
  }

  return contactEmail.trim();
};

const saveLandingPageContactEmail = async (contactEmail, request) => {
  const response = await request({ contactEmail });
  const body = response.data;
  const result = body?.data ?? body;

  if (body?.success === false || result?.success === false) {
    throw new Error(
      body.message ||
        result.message ||
        "The landing page contact email could not be saved."
    );
  }

  return response;
};

export const createLandingPageContactEmail = (contactEmail) =>
  saveLandingPageContactEmail(contactEmail, (payload) =>
    api.post(API_ENDPOINTS.superAdmin.landingContactEmail, payload)
  );

export const updateLandingPageContactEmail = (contactEmail) =>
  saveLandingPageContactEmail(contactEmail, (payload) =>
    api.put(API_ENDPOINTS.superAdmin.landingContactEmail, payload)
  );

export const isLandingPageContactEmailNotConfigured = (error) =>
  error?.response?.status === 404;
