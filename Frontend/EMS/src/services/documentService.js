// import api from "../api/axiosInstance";
// import { API_ENDPOINTS } from "../api/endpoints";

// export const getEmployeeDocuments = (employeeId, config = {}) =>
//   api.get(API_ENDPOINTS.employeeDocuments.byEmployeeId(employeeId), config);

// export const uploadEmployeeDocument = (formData, config = {}) =>
//   api.post(API_ENDPOINTS.employeeDocuments.upload, formData, config);

// export const viewEmployeeDocument = (id, config = {}) =>
//   api.get(API_ENDPOINTS.employeeDocuments.view(id), config);

// export const downloadEmployeeDocument = (id, config = {}) =>
//   api.get(API_ENDPOINTS.employeeDocuments.download(id), config);

// export const deleteEmployeeDocument = (id, config = {}) =>
//   api.delete(API_ENDPOINTS.employeeDocuments.delete(id), config);

// export const verifyEmployeeDocument = (id, config = {}) =>
//   api.put(API_ENDPOINTS.employeeDocuments.verify(id), {}, config);

// export const rejectEmployeeDocument = (id, config = {}) =>
//   api.put(API_ENDPOINTS.employeeDocuments.reject(id), {}, config);

// export const getEmployeeDocumentChecklist = (employeeId, config = {}) =>
//   api.get(API_ENDPOINTS.employeeDocuments.checklist(employeeId), config);

// export const getOnboardingDocuments = (onboardingId, config = {}) =>
//   api.get(API_ENDPOINTS.onboardingDocuments.byOnboardingId(onboardingId), config);

// export const getOnboardingDocument = (id, config = {}) =>
//   api.get(API_ENDPOINTS.onboardingDocuments.byId(id), config);

// export const uploadOnboardingDocument = (formData, config = {}) =>
//   api.post(API_ENDPOINTS.onboardingDocuments.upload, formData, config);

// export const downloadOnboardingDocument = (id, config = {}) =>
//   api.get(API_ENDPOINTS.onboardingDocuments.download(id), config);

// export const deleteOnboardingDocument = (id, config = {}) =>
//   api.delete(API_ENDPOINTS.onboardingDocuments.delete(id), config);
import api from "../api/axiosInstance";

const DEMO_METADATA_PREFIX = "Demo preferences:\n";
const DEMO_MESSAGE_SEPARATOR = "\n\nMessage:\n";

const getApiErrorMessage = (error) => {
  if (error?.code === "ERR_CANCELED" || error?.message === "Session expired") {
    return "Your session has expired. Sign in and try again.";
  }

  const status = error?.response?.status;
  const data = error?.response?.data;
  const validationMessages = data?.errors && typeof data.errors === "object"
    ? Object.values(data.errors).flat().filter(Boolean).join(" ")
    : "";
  const serverMessage = data?.message || data?.detail || data?.title || validationMessages;

  if (serverMessage) return serverMessage;
  if (status === 400) return "The request contains invalid fields. Check your information and try again.";
  if (status === 401) return "Your session has expired. Sign in and try again.";
  if (status === 403) return "You do not have permission to manage demo requests.";
  if (status === 404) return "This demo request could not be found. Refresh the list and try again.";
  if (status === 409) return "This demo request conflicts with a recent change. Refresh and try again.";
  if (status >= 500) return "The server could not process this request. Please try again later.";
  if (!error?.response) return "Could not reach the server. Check your connection and try again.";
  return error?.message || "The demo request could not be processed.";
};

const requestWithErrorMessage = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    const apiError = new Error(getApiErrorMessage(error));
    apiError.status = error?.response?.status;
    apiError.cause = error;
    throw apiError;
  }
};

const unwrapResponse = (value) => {
  let result = value;
  while (result && !Array.isArray(result) && typeof result === "object") {
    const nested = result.data ?? result.result;
    if (!nested || nested === result) break;
    result = nested;
  }
  return result;
};

const unpackMessage = (value) => {
  const message = String(value || "");
  if (!message.startsWith(DEMO_METADATA_PREFIX)) return { metadata: {}, message };

  const separatorIndex = message.indexOf(DEMO_MESSAGE_SEPARATOR);
  if (separatorIndex < 0) return { metadata: {}, message };

  const metadata = {};
  const fields = {
    Designation: "designation",
    Industry: "industry",
    "Company size": "companySize",
    "Interested EMS modules": "interestedModules",
    "Preferred demo date": "preferredDemoDate",
    "Preferred time": "preferredTime",
  };

  message.slice(DEMO_METADATA_PREFIX.length, separatorIndex).split("\n").forEach((line) => {
    const delimiterIndex = line.indexOf(": ");
    if (delimiterIndex < 0) return;
    const field = fields[line.slice(0, delimiterIndex)];
    const fieldValue = line.slice(delimiterIndex + 2);
    if (field) {
      metadata[field] = field === "interestedModules"
        ? fieldValue.split(", ").filter(Boolean)
        : fieldValue;
    }
  });

  return {
    metadata,
    message: message.slice(separatorIndex + DEMO_MESSAGE_SEPARATOR.length),
  }
};

const normalizeReply = (reply = {}, index = 0) => ({
  ...reply,
  id: reply.id ?? reply.replyId ?? `reply-${index}`,
  message: reply.message ?? reply.reply ?? "",
  sentAt: reply.sentAt ?? reply.createdAt ?? reply.repliedAt ?? "",
});

const normalizeStatus = (value) => {
  const status = String(value || "Pending").trim();
  const knownStatus = ["Pending", "Replied", "Closed"].find(
    (known) => known.toLowerCase() === status.toLowerCase()
  );
  return knownStatus || status;
};

const normalizeDemoRequest = (value) => {
  if (!value || typeof value !== "object") return value;
  const request = value.request && typeof value.request === "object" ? value.request : value;
  const { metadata, message } = unpackMessage(request.message);
  const replies = request.replies ?? request.replyHistory ?? request.responses ?? [];

  return {
    ...request,
    id: request.id ?? request.requestId ?? request.demoRequestId,
    fullName: request.fullName ?? request.name ?? "",
    workEmail: request.workEmail ?? request.email ?? "",
    phoneNumber: request.phoneNumber ?? request.phone ?? "",
    companyName: request.companyName ?? request.company ?? "",
    designation: request.designation ?? metadata.designation ?? "",
    industry: request.industry ?? metadata.industry ?? "",
    companySize: request.companySize ?? metadata.companySize ?? "",
    interestedModules: request.interestedModules ?? metadata.interestedModules ?? [],
    preferredDemoDate: request.preferredDemoDate ?? metadata.preferredDemoDate ?? "",
    preferredTime: request.preferredTime ?? metadata.preferredTime ?? "",
    submittedAt: request.submittedAt ?? request.createdAt ?? request.requestedAt ?? "",
    status: normalizeStatus(request.status),
    message,
    replies: Array.isArray(replies) ? replies.map(normalizeReply) : [],
  };
};

const createSubmissionMessage = (data) => {
  const details = [
    `Designation: ${data.designation || ""}`,
    `Industry: ${data.industry || ""}`,
    `Company size: ${data.companySize || ""}`,
    `Preferred demo date: ${data.preferredDemoDate || ""}`,
  ].join("\n");
  const message = `${DEMO_METADATA_PREFIX}${details}${DEMO_MESSAGE_SEPARATOR}${String(data.message || "").trim()}`;

  if (message.length > 2000) {
    throw new Error("The demo request details are too long. Shorten the message and try again.");
  }
  return message;
};

const getRequestList = (responseData) => {
  const data = unwrapResponse(responseData);
  const requests = Array.isArray(data)
    ? data
    : data?.items ?? data?.requests ?? data?.results ?? data?.value;

  if (!Array.isArray(requests)) {
    throw new Error("The server returned an unexpected demo requests response.");
  }
  return requests.map(normalizeDemoRequest);
};

export async function createDemoRequest(data) {
  const payload = {
    name: String(data.fullName || "").trim(),
    email: String(data.workEmail || "").trim().toLowerCase(),
    phone: String(data.phoneNumber || "").trim() || null,
    company: String(data.companyName || "").trim() || null,
    message: createSubmissionMessage(data),
  };
  const response = await requestWithErrorMessage(() => api.post("/demo-requests", payload));
  const result = unwrapResponse(response.data);
  return result && typeof result === "object" ? normalizeDemoRequest(result) : null;
}

export async function getDemoRequests() {
  const response = await requestWithErrorMessage(() =>
    api.get("/demo-requests", { dedupe: false })
  );
  return getRequestList(response.data);
}

export async function getDemoRequestById(id) {
  const response = await requestWithErrorMessage(() =>
    api.get(`/demo-requests/${encodeURIComponent(id)}`, { dedupe: false })
  );
  const result = unwrapResponse(response.data);
  return result && typeof result === "object" ? normalizeDemoRequest(result) : null;
}

export async function replyToDemoRequest(id, data) {
  const reply = String(data?.message || "").trim();
  if (!reply) throw new Error("Message is required.");

  const response = await requestWithErrorMessage(() =>
    api.post(`/demo-requests/${encodeURIComponent(id)}/reply`, { reply })
  );
  const result = unwrapResponse(response.data);
  const deliveryStatus = String(
    result?.reply?.deliveryStatus ?? result?.deliveryStatus ?? result?.status ?? ""
  ).toLowerCase();
  if (
    result?.success === false ||
    result?.sent === false ||
    ["failed", "failure", "undelivered", "not sent"].includes(deliveryStatus)
  ) {
    throw new Error(result?.message || "The server did not confirm delivery of this reply.");
  }

  return {
    request: result?.request ? normalizeDemoRequest(result.request) : null,
    reply: result?.reply ? normalizeReply(result.reply) : null,
    response: result,
  };
}

export async function deleteDemoRequest(id) {
  return requestWithErrorMessage(() =>
    api.delete(`/demo-requests/${encodeURIComponent(id)}`)
  );
}
