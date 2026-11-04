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

const getValidationErrorsBlock = (data) =>
  data?.errors ||
  data?.Errors ||
  data?.validationErrors ||
  data?.ValidationErrors ||
  null;

const collectValidationMessages = (validationErrors) => {
  if (!validationErrors || typeof validationErrors !== "object") {
    return [];
  }

  const messages = [];
  const addMessage = (value) => {
    const message = getMeaningfulMessage(value);
    if (message && !messages.includes(message)) {
      messages.push(message);
    }
  };

  for (const value of Object.values(validationErrors)) {
    if (Array.isArray(value)) {
      value.forEach(addMessage);
      continue;
    }

    addMessage(value);
  }

  return messages;
};

const getMeaningfulMessage = (text) => {
  const normalizedText = String(text || "").trim();

  if (!normalizedText) {
    return "";
  }

  try {
    const parsed = JSON.parse(normalizedText);

    const validationMessages = collectValidationMessages(
      getValidationErrorsBlock(parsed)
    );

    if (validationMessages.length) {
      return validationMessages.join(" ");
    }

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

const extractNestedErrorMessage = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "";
  }

  const validationMessages = collectValidationMessages(
    getValidationErrorsBlock(data)
  );

  if (validationMessages.length) {
    return validationMessages.join(" ");
  }

  const directMessage =
    data.message ||
    data.Message ||
    data.error ||
    data.Error ||
    data.title ||
    data.Title ||
    data.detail ||
    data.Detail ||
    data.exceptionMessage ||
    data.ExceptionMessage ||
    "";

  if (directMessage) {
    return String(directMessage).trim();
  }

  return "";
};

export const getRelievingLetterApiErrorMessage = async (
  error,
  fallbackMessage = "Unable to complete the relieving letter request."
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
    return "You do not have permission to access Relieving Letters.";
  }

  if (status === 404) {
    return "The selected relieving letter could not be found.";
  }

  if (status === 405) {
    return "Method not allowed for this request.";
  }

  if (typeof status === "number" && status >= 500) {
    return "Internal Server Error. Please try again later.";
  }

  const objectMessage = extractNestedErrorMessage(responseData);
  if (objectMessage) {
    return objectMessage;
  }

  const parsedMessage = await readResponseText(responseData).then((text) =>
    getMeaningfulMessage(text)
  );

  if (parsedMessage) {
    return parsedMessage;
  }

  if (status === 400) {
    return fallbackMessage;
  }

  return error?.message || fallbackMessage;
};

export const generateRelievingLetter = (data, config = {}) =>
  api.post(
    API_ENDPOINTS.RELIEVING_LETTER.GENERATE,
    data,
    withAuthHeaders(config)
  );

export const getAllRelievingLetters = (config = {}) =>
  api.get(API_ENDPOINTS.RELIEVING_LETTER.GET_ALL, withAuthHeaders(config));

export const downloadRelievingLetter = (id, config = {}) =>
  api.get(API_ENDPOINTS.RELIEVING_LETTER.DOWNLOAD(id), {
    ...withAuthHeaders(config),
    responseType: "blob",
  });

export const previewRelievingLetter = (id, config = {}) =>
  api.get(API_ENDPOINTS.RELIEVING_LETTER.PREVIEW(id), {
    ...withAuthHeaders(config),
    responseType: "blob",
    dedupe: false,
  });

export const sendRelievingLetter = (payload, config = {}) =>
  api.post(
    API_ENDPOINTS.RELIEVING_LETTER.SEND,
    payload,
    withAuthHeaders(config)
  );

export const getRelievingLetterSendStatus = (id, config = {}) =>
  api.get(API_ENDPOINTS.RELIEVING_LETTER.SEND_STATUS(id), {
    ...withAuthHeaders(config),
    dedupe: false,
  });

export const deleteRelievingLetter = (id, config = {}) =>
  api.delete(API_ENDPOINTS.RELIEVING_LETTER.DELETE(id), withAuthHeaders(config));
