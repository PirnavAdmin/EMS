import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection, sortByRecency } from "../utils/collections";
import { downloadBinaryFile, getDownloadErrorMessage } from "../utils/downloadUtils";
import { getStoredToken } from "../utils/authStorage";
import {
  normalizeTicketRecord,
  normalizeTicketStatus,
} from "../TicketManagement/ticketConfig";

const pickFirstMessage = (value) =>
  [
    value?.message,
    value?.Message,
    value?.error,
    value?.Error,
    value?.title,
    value?.Title,
    value?.detail,
    value?.Detail,
    value?.exceptionMessage,
  ].find(Boolean) || "";

export const getTicketApiErrorMessage = async (
  error,
  fallbackMessage = "Unable to complete the ticket request."
) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const parsedMessage = pickFirstMessage(data);

  if (parsedMessage) {
    return parsedMessage;
  }

  if (status === 400) {
    return "Please review the ticket details and try again.";
  }

  if (status === 401) {
    return "Your session expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested ticket could not be found.";
  }

  if (status >= 500) {
    return "The server could not process the ticket request right now.";
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
};

export const normalizeTicketCollection = (payload) =>
  sortByRecency(
    extractCollection(payload).map((ticket) => normalizeTicketRecord(ticket))
  );

export const normalizeTicketDetails = (payload) => {
  const source =
    payload?.data?.data ||
    payload?.data ||
    payload ||
    {};

  return normalizeTicketRecord(source);
};

export const fetchTickets = async () => {
  const response = await api.get(API_ENDPOINTS.tickets.list);
  return normalizeTicketCollection(response.data);
};

export const fetchMyTickets = async () => {
  const response = await api.get(API_ENDPOINTS.tickets.myTickets);
  return normalizeTicketCollection(response.data);
};

export const fetchTicketById = async (ticketId) => {
  const response = await api.get(API_ENDPOINTS.tickets.byId(ticketId));
  return normalizeTicketDetails(response.data);
};

export const createTicket = (payload) =>
  api.post(API_ENDPOINTS.tickets.create, payload);

export const updateTicket = async (ticketId, payload) => {
  try {
    const response = await api.put(
      API_ENDPOINTS.tickets.update(ticketId),
      payload
    );
    return response;
  } catch (error) {
    console.log("===== UPDATE ERROR =====");
    console.log("Payload:", payload);
    console.log("Status:", error.response?.status);
    console.log("Response:", error.response?.data);

    // ADD THIS LINE
    console.log("Validation Errors:", error.response?.data?.errors);

    console.log("========================");
    throw error;
  }
};

export const deleteTicket = (ticketId) =>
  api.delete(API_ENDPOINTS.tickets.delete(ticketId));

export const updateTicketStatus = (ticketId, status) =>
  api.put(
    `${API_ENDPOINTS.tickets.updateStatus(ticketId)}?status=${encodeURIComponent(
      normalizeTicketStatus(status)
    )}`
  );

export const exportTickets = async (params = {}) => {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Your session expired. Please sign in again.");
  }

  await downloadBinaryFile({
    endpoint: API_ENDPOINTS.tickets.export,
    token,
    params,
    fallbackFileName: "Tickets.xlsx",
  });
};

export const downloadTicketTemplate = async () => {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Your session expired. Please sign in again.");
  }

  await downloadBinaryFile({
    endpoint: API_ENDPOINTS.tickets.downloadTemplate,
    token,
    fallbackFileName: "TicketTemplate.xlsx",
  });
};

export const uploadTicketBulkFile = (formData) =>
  api.post(API_ENDPOINTS.tickets.bulkUpload, formData);

export { getDownloadErrorMessage };

