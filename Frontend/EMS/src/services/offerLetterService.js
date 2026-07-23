import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { withAuthHeaders } from "../api/requestConfig";

const textDecoder = new TextDecoder("utf-8");

const readResponseText = async (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Blob) {
    try {
      return await value.text();
    } catch {
      return "";
    }
  }

  if (value instanceof ArrayBuffer) {
    return textDecoder.decode(value);
  }

  if (ArrayBuffer.isView(value)) {
    return textDecoder.decode(
      value.buffer.slice(
        value.byteOffset,
        value.byteOffset + value.byteLength
      )
    );
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
};

const getMeaningfulMessage = (text) => {
  const normalizedText = String(text || "").trim();

  if (!normalizedText) {
    return "";
  }

  try {
    const parsed = JSON.parse(normalizedText);
    return (
      parsed?.message ||
      parsed?.Message ||
      parsed?.error ||
      parsed?.Error ||
      parsed?.title ||
      parsed?.Title ||
      parsed?.detail ||
      parsed?.Detail ||
      parsed?.exceptionMessage ||
      ""
    );
  } catch {
    // Fall through to plain-text heuristics.
  }

  if (
    /^system\./i.test(normalizedText) ||
    /stack trace/i.test(normalizedText) ||
    /\n\s*at\s+/i.test(normalizedText)
  ) {
    return "";
  }

  return normalizedText;
};

export const getOfferLetterApiErrorMessage = async (
  error,
  fallbackMessage = "Unable to complete the offer letter request.",
  letterLabel = "offer letter"
) => {
  const status = error?.response?.status;
  const responseData = error?.response?.data;

  if (!error?.response) {
    if (error?.code === "ECONNABORTED") {
      return "The request timed out. Please try again.";
    }

    return error?.message || fallbackMessage;
  }

  if (status === 401) {
    return "Your session expired. Please sign in again.";
  }

  if (status === 403) {
    const normalizedLabel = String(letterLabel || "").toLowerCase();

    if (normalizedLabel.includes("relieving")) {
      return "You do not have permission to access Relieving Letters.";
    }

    if (normalizedLabel.includes("offer")) {
      return "You do not have permission to access Offer Letters.";
    }

    return "You do not have permission to access this module.";
  }

  if (status === 404) {
    return `The selected ${letterLabel} could not be found.`;
  }

  if (status === 405) {
    return "Method not allowed for this request.";
  }

  if (status >= 500) {
    return "Internal Server Error. Please try again later.";
  }

  const objectMessage =
    responseData && typeof responseData === "object" && !Array.isArray(responseData)
      ? responseData.message ||
        responseData.Message ||
        responseData.error ||
        responseData.Error ||
        responseData.title ||
        responseData.Title ||
        responseData.detail ||
        responseData.Detail ||
        responseData.exceptionMessage ||
        ""
      : "";

  if (objectMessage) {
    return objectMessage;
  }

  const parsedMessage = getMeaningfulMessage(
    await readResponseText(responseData)
  );

  if (parsedMessage) {
    return parsedMessage;
  }

  if (status === 400) {
    return fallbackMessage;
  }

  return error?.message || fallbackMessage;
};

export const getAllOfferLetters = (config = {}) =>
  api.get(API_ENDPOINTS.offerLetters.all, withAuthHeaders(config));

export const generateOfferLetter = (payload, config = {}) =>
  api.post(
    API_ENDPOINTS.offerLetters.generate,
    payload,
    withAuthHeaders(config)
  );

export const calculateOfferLetterBreakup = (payload, config = {}) =>
  api.post(
    API_ENDPOINTS.offerLetters.calculateBreakup,
    payload,
    withAuthHeaders(config)
  );

export const previewOfferLetter = (id, config = {}) =>
  api.get(API_ENDPOINTS.offerLetters.preview(id), {
    ...withAuthHeaders(config),
    responseType: "blob",
    dedupe: false,
  });

export const sendOfferLetter = (payload, config = {}) =>
  api.post(API_ENDPOINTS.offerLetters.send, payload, withAuthHeaders(config));

export const getOfferLetterSendStatus = (id, config = {}) =>
  api.get(API_ENDPOINTS.offerLetters.sendStatus(id), {
    ...withAuthHeaders(config),
    dedupe: false,
  });

export const downloadOfferLetter = (id, config = {}) =>
  api.get(API_ENDPOINTS.offerLetters.download(id), {
    ...withAuthHeaders(config),
    responseType: "blob",
  });

export const deleteOfferLetter = (id, config = {}) =>
  api.delete(API_ENDPOINTS.offerLetters.delete(id), withAuthHeaders(config));
