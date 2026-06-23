import api from "../api/axiosInstance";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const CONTENT_TYPE_EXTENSION_MAP = [
  {
    pattern: /spreadsheetml\.sheet/i,
    extension: ".xlsx",
    mimeType: EXCEL_MIME_TYPE,
  },
  {
    pattern: /ms-excel/i,
    extension: ".xls",
    mimeType: "application/vnd.ms-excel",
  },
  {
    pattern: /text\/csv|application\/csv/i,
    extension: ".csv",
    mimeType: "text/csv",
  },
  {
    pattern: /pdf/i,
    extension: ".pdf",
    mimeType: "application/pdf",
  },
  {
    pattern: /zip/i,
    extension: ".zip",
    mimeType: "application/zip",
  },
];

const isHttpUrl = (value) => /^https?:\/\//i.test(value);

const isBlobUrl = (value) => /^blob:/i.test(value);

const isDataUrl = (value) => /^data:/i.test(value);

const getHeaderValue = (headers, key) =>
  headers?.[key] || headers?.[key.toLowerCase()] || headers?.[key.toUpperCase()] || "";

const getContentTypeMetadata = (contentType = "") => {
  const normalizedContentType = String(contentType || "").toLowerCase();

  const matchedType = CONTENT_TYPE_EXTENSION_MAP.find(({ pattern }) =>
    pattern.test(normalizedContentType)
  );

  return matchedType || null;
};

const getFileExtension = (fileName = "") => {
  const normalizedFileName = String(fileName || "").trim();
  const lastDotIndex = normalizedFileName.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === normalizedFileName.length - 1) {
    return "";
  }

  return normalizedFileName.slice(lastDotIndex);
};

const sanitizeFileName = (value, fallbackFileName) => {
  const normalizedFileName = String(value || "").trim();

  if (!normalizedFileName) {
    return fallbackFileName;
  }

  return Array.from(normalizedFileName)
    .map((character) => {
      const characterCode = character.charCodeAt(0);

      if (
        characterCode <= 31 ||
        '<>:"/\\|?*'.includes(character)
      ) {
        return "_";
      }

      return character;
    })
    .join("");
};

export const normalizeDownloadEndpoint = (endpoint) => {
  const normalizedEndpoint = String(endpoint || "").trim();

  if (!normalizedEndpoint) {
    return "";
  }

  if (
    isHttpUrl(normalizedEndpoint) ||
    isBlobUrl(normalizedEndpoint) ||
    isDataUrl(normalizedEndpoint)
  ) {
    return normalizedEndpoint;
  }

  return normalizedEndpoint.replace(/^\/?api\/+/i, "/");
};

export const getDownloadContentType = (headers) =>
  getHeaderValue(headers, "content-type") ||
  getHeaderValue(headers, "Content-Type") ||
  EXCEL_MIME_TYPE;

export const extractDownloadFileName = (
  headers,
  fallbackFileName,
  contentType = ""
) => {
  const dispositionHeader =
    getHeaderValue(headers, "content-disposition") ||
    getHeaderValue(headers, "Content-Disposition") ||
    "";

  const utf8Match = dispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);
  const quotedMatch = dispositionHeader.match(/filename="?([^"]+)"?/i);

  const rawFileName =
    (utf8Match?.[1]
      ? decodeURIComponent(utf8Match[1])
      : null) ||
    quotedMatch?.[1] ||
    fallbackFileName;

  const sanitizedFileName =
    sanitizeFileName(rawFileName, fallbackFileName);

  if (!sanitizedFileName) {
    return fallbackFileName;
  }

  if (getFileExtension(sanitizedFileName)) {
    return sanitizedFileName;
  }

  const contentTypeExtension =
    getContentTypeMetadata(contentType)?.extension ||
    getFileExtension(fallbackFileName);

  return contentTypeExtension
    ? `${sanitizedFileName}${contentTypeExtension}`
    : sanitizedFileName;
};

const arrayBufferToText = async (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Blob) {
    return value.text();
  }

  if (value instanceof ArrayBuffer) {
    return new Blob([value]).text();
  }

  if (ArrayBuffer.isView(value)) {
    const viewBuffer = value.buffer.slice(
      value.byteOffset,
      value.byteOffset + value.byteLength
    );

    return new Blob([viewBuffer]).text();
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return "";
};

export const getDownloadErrorMessage = async (
  error,
  fallbackMessage = "Download failed."
) => {
  const response = error?.response || {};
  const responseData = response.data;
  const status = response.status;

  if (responseData instanceof Blob) {
    try {
      const responseText = await responseData.text();

      if (responseText) {
        try {
          const parsedData = JSON.parse(responseText);

          return (
            parsedData?.message ||
            parsedData?.error ||
            parsedData?.title ||
            parsedData?.detail ||
            responseText
          );
        } catch {
          return responseText;
        }
      }
    } catch {
      return fallbackMessage;
    }
  }

  const responseText = await arrayBufferToText(responseData);

  if (responseText) {
    try {
      const parsedData = JSON.parse(responseText);

      return (
        parsedData?.message ||
        parsedData?.error ||
        parsedData?.title ||
        parsedData?.detail ||
        responseText
      );
    } catch {
      if (status === 404) {
        return "Requested report was not found.";
      }

      if (status >= 500) {
        return "Server error while preparing the download.";
      }

      return responseText;
    }
  }

  if (typeof responseData === "object" && responseData !== null) {
    const objectMessage =
      responseData?.message ||
      responseData?.error ||
      responseData?.title ||
      responseData?.detail ||
      "";

    if (objectMessage) {
      return objectMessage;
    }

    if (status === 404) {
      return "Requested report was not found.";
    }

    if (status >= 500) {
      return "Server error while preparing the download.";
    }
  }

  if (status === 404) {
    return "Requested report was not found.";
  }

  if (status >= 500) {
    return "Server error while preparing the download.";
  }

  return error?.message || fallbackMessage;
};

const isErrorContentType = (contentType = "") =>
  /json|text\/html|text\/plain/i.test(String(contentType || ""));

const responseDataToBlob = (responseData, contentType) => {
  if (responseData instanceof Blob) {
    return responseData;
  }

  return new Blob([responseData], {
    type: contentType || EXCEL_MIME_TYPE,
  });
};

const triggerBrowserDownload = (blob, fileName) => {
  const downloadUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.rel = "noopener";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(downloadUrl);
  }, 1000);
};

export const downloadBinaryFile = async ({
  endpoint,
  token,
  params,
  fallbackFileName,
  accept = `${EXCEL_MIME_TYPE}, application/vnd.ms-excel;q=0.9, application/octet-stream;q=0.8, */*;q=0.1`,
  timeout = 120000,
}) => {
  const normalizedEndpoint = normalizeDownloadEndpoint(endpoint);

  const response = await api.get(normalizedEndpoint, {
    params,
    responseType: "arraybuffer",
    timeout,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
    },
  });

  const contentType = getDownloadContentType(response.headers);

  if (isErrorContentType(contentType)) {
    const errorMessage = await getDownloadErrorMessage(
      { response },
      "Download failed."
    );

    throw new Error(errorMessage);
  }

  const fileName = extractDownloadFileName(
    response.headers,
    fallbackFileName,
    contentType
  );

  const blob = responseDataToBlob(response.data, contentType);

  triggerBrowserDownload(blob, fileName);

  return response;
};
