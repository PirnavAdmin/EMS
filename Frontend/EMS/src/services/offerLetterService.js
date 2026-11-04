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
      "");

  } catch {

    // Fall through to plain-text heuristics.
  }
  if (
  /^system\./i.test(normalizedText) ||
  /stack trace/i.test(normalizedText) ||
  /\n\s*at\s+/i.test(normalizedText))
  {
    return "";
  }

  return normalizedText;
};

const resolveSalaryStructureCtc = (payload) => {
  if (typeof payload === "number" && Number.isFinite(payload)) {
    return payload;
  }

  if (typeof payload === "string" && payload.trim()) {
    const numeric = Number(payload);
    return Number.isFinite(numeric) ? numeric : payload.trim();
  }

  if (payload && typeof payload === "object") {
    const ctcCandidates = [
    payload.ctc,
    payload.annualCtc,
    payload.AnnualCtc,
    payload.ctcAnnual,
    payload.ctc_Annual,
    payload.monthlyCtc,
    payload.monthlyCTC];

    for (const candidate of ctcCandidates) {
      if (candidate === null || candidate === undefined || candidate === "") {
        continue;
      }

      const numeric = Number(candidate);

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }

  return "";
};

export const getOfferLetterApiErrorMessage = async (
error,
fallbackMessage = "Unable to complete the offer letter request.",
letterLabel = "offer letter") =>
{
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
  responseData && typeof responseData === "object" && !Array.isArray(responseData) ?
  responseData.message ||
  responseData.Message ||
  responseData.error ||
  responseData.Error ||
  responseData.title ||
  responseData.Title ||
  responseData.detail ||
  responseData.Detail ||
  responseData.exceptionMessage ||
  "" :
  "";

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
{
  const ctc = resolveSalaryStructureCtc(payload);
  const url = API_ENDPOINTS.offerLetters.calculateBreakup(ctc);
  const headers = withAuthHeaders(config);

  return api.get(url, {
    ...headers,
    dedupe: false
  });
};

export const previewOfferLetter = (id, config = {}) =>
api.get(API_ENDPOINTS.offerLetters.preview(id), {
  ...withAuthHeaders(config),
  responseType: "blob",
  dedupe: false
});

export const sendOfferLetter = (payload, config = {}) =>
api.post(API_ENDPOINTS.offerLetters.send, payload, withAuthHeaders(config));

export const getOfferLetterSendStatus = (id, config = {}) =>
api.get(API_ENDPOINTS.offerLetters.sendStatus(id), {
  ...withAuthHeaders(config),
  dedupe: false
});

export const downloadOfferLetter = (id, config = {}) =>
api.get(API_ENDPOINTS.offerLetters.download(id), {
  ...withAuthHeaders(config),
  responseType: "blob"
});

export const deleteOfferLetter = (id, config = {}) =>
api.delete(API_ENDPOINTS.offerLetters.delete(id), withAuthHeaders(config));