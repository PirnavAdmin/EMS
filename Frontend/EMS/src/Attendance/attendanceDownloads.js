import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { getTodayInputValue } from "../utils/date";
 
const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
 
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
 
const extractFileNameFromHeaders = (headers, fallbackFileName) => {
  const dispositionHeader =
    headers?.["content-disposition"] ||
    headers?.["Content-Disposition"] ||
    "";
 
  const utf8Match = dispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return sanitizeFileName(decodeURIComponent(utf8Match[1]), fallbackFileName);
  }
 
  const basicMatch = dispositionHeader.match(/filename="?([^"]+)"?/i);
  if (basicMatch?.[1]) {
    return sanitizeFileName(basicMatch[1], fallbackFileName);
  }
 
  return fallbackFileName;
};
 
const triggerBrowserDownload = (blob, fileName) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
 
  downloadLink.href = blobUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.URL.revokeObjectURL(blobUrl);
};
 
export const getDownloadErrorMessage = async (
  error,
  fallbackMessage = "Download failed."
) => {
  const responseData = error?.response?.data;
 
  if (responseData instanceof Blob) {
    try {
      const errorText = await responseData.text();
 
      if (!errorText) {
        return fallbackMessage;
      }
 
      try {
        const parsedError = JSON.parse(errorText);
        return (
          parsedError?.message ||
          parsedError?.error ||
          fallbackMessage
        );
      } catch {
        return errorText;
      }
    } catch {
      return fallbackMessage;
    }
  }
 
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
};
 
export const downloadAttendanceFile = async ({
  endpoint,
  params,
  token,
  fallbackFileName,
  forceFallbackFileName = false,
}) => {
  const response = await api.get(
    endpoint,
    {
      params,
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
 
  const responseBlob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
        type: EXCEL_MIME_TYPE,
      });
 
  const fileName = forceFallbackFileName
    ? fallbackFileName
    : extractFileNameFromHeaders(
      response.headers,
      fallbackFileName
    );
 
  triggerBrowserDownload(responseBlob, fileName);
 
  return response;
};
 
export const downloadMonthlyAttendanceReport = ({
  month,
  year,
  token,
  fallbackFileName,
}) =>
  downloadAttendanceFile({
    endpoint: API_ENDPOINTS.attendance.downloadMonthly,
    params: {
      month,
      year,
    },
    token,
    fallbackFileName:
      fallbackFileName ||
      `monthly-attendance-${year}-${String(month).padStart(2, "0")}.xlsx`,
    forceFallbackFileName: true,
  });
 
export const downloadWeeklyAttendanceReport = ({
  token,
  params,
  fallbackFileName,
  forceFallbackFileName = false,
} = {}) =>
  downloadAttendanceFile({
    endpoint: API_ENDPOINTS.attendance.downloadWeekly,
    params,
    token,
    fallbackFileName:
      fallbackFileName || `weekly-attendance-${getTodayInputValue()}.xlsx`,
    forceFallbackFileName,
  });
 
 