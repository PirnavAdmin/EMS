import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { withAuthHeaders } from "../api/requestConfig";

const textDecoder = new TextDecoder("utf-8");

const DEFAULT_PREVIEW_ERROR_MESSAGE = "Document preview unavailable.";
const SESSION_EXPIRED_MESSAGE = "Session expired. Please sign in again.";
const FORBIDDEN_MESSAGE = "You do not have permission to preview this document.";
const NOT_FOUND_MESSAGE = "Document not found.";
const SERVER_ERROR_MESSAGE = "Internal Server Error.";

const toPlainHeaders = (headers) => {
  if (!headers) {
    return {};
  }

  if (typeof headers.toJSON === "function") {
    return headers.toJSON();
  }

  return { ...headers };
};

const getRequestConfig = (config = {}) => {
  const headers = {
    Accept: "*/*",
    ...toPlainHeaders(config.headers),
  };

  return withAuthHeaders({
    ...config,
    headers,
  });
};

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

const getParsedErrorMessage = (text) => {
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
    // Fall through to plain text handling.
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

const getFriendlyPreviewErrorMessage = (
  status,
  responseText,
  fallbackMessage = DEFAULT_PREVIEW_ERROR_MESSAGE
) => {
  if (status === 401) {
    return SESSION_EXPIRED_MESSAGE;
  }

  if (status === 403) {
    return FORBIDDEN_MESSAGE;
  }

  if (status === 404) {
    return NOT_FOUND_MESSAGE;
  }

  if (status === 500) {
    return SERVER_ERROR_MESSAGE;
  }

  const parsedMessage = getParsedErrorMessage(responseText);

  if (parsedMessage) {
    return parsedMessage;
  }

  if (status === 400) {
    return fallbackMessage;
  }

  return fallbackMessage || DEFAULT_PREVIEW_ERROR_MESSAGE;
};

const toBlob = (value, contentType = "") => {
  if (value instanceof Blob) {
    if (!contentType || value.type === contentType) {
      return value;
    }

    return new Blob([value], {
      type: contentType,
    });
  }

  if (value instanceof ArrayBuffer) {
    return new Blob([value], {
      type: contentType,
    });
  }

  if (ArrayBuffer.isView(value)) {
    return new Blob(
      [
        value.buffer.slice(
          value.byteOffset,
          value.byteOffset + value.byteLength
        ),
      ],
      {
        type: contentType,
      }
    );
  }

  return new Blob([value ?? ""], {
    type: contentType,
  });
};

const normalizeBlobResponse = (response) => {
  const contentType = String(
    response?.headers?.["content-type"] ||
      response?.headers?.["Content-Type"] ||
      ""
  ).trim();

  const blob = toBlob(response?.data, contentType);

  return {
    ...response,
    data: blob,
    blob,
    contentType: contentType || blob.type || "",
  };
};

const executePreviewRequest = async (requestUrl, config = {}) => {
  const normalizedUrl = String(requestUrl || "").trim();

  if (!normalizedUrl) {
    const error = new Error(DEFAULT_PREVIEW_ERROR_MESSAGE);
    error.status = 400;
    throw error;
  }

  try {
    const response = await api.get(
      normalizedUrl,
      {
        ...getRequestConfig(config),
        responseType: "blob",
        dedupe: false,
      }
    );

    return normalizeBlobResponse(response);
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }

    const status = error?.response?.status;
    const responseText = await readResponseText(error?.response?.data);
    const message = getFriendlyPreviewErrorMessage(
      status,
      responseText,
      error?.message || DEFAULT_PREVIEW_ERROR_MESSAGE
    );

    const normalizedError = new Error(message || DEFAULT_PREVIEW_ERROR_MESSAGE);
    normalizedError.status = status;
    normalizedError.response = error?.response;
    normalizedError.responseText = responseText;

    throw normalizedError;
  }
};

export const previewEmployeeDocument = (id, config = {}) =>
  executePreviewRequest(
    API_ENDPOINTS.employeeDocuments.view(id),
    config
  );

export const previewDocumentFromUrl = (url, config = {}) =>
  executePreviewRequest(url, config);
