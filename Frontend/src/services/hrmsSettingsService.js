import api from "../api/axiosInstance";

const ARRAY_KEYS = [
  "items",
  "data",
  "results",
  "records",
  "appraisals",
  "goals",
  "reviews",
  "cycles",
  "resignations",
  "clearances",
  "interviews",
  "settlements",
  "shifts",
  "assignments",
  "weeklyOffs",
  "planners",
  "rotations",
  "swaps",
  "requests",
  "rosters",
  "declarations",
  "declarationItems",
  "proofs",
  "templates",
  "workflows",
  "steps",
  "pending",
  "history",
  "form16",
  "forms",
  "tds",
];

const isObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const getHrmsErrorMessage = (
  error,
  fallback = "Unable to complete the request."
) => {
  const validationErrors = error?.response?.data?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    const messages = Object.values(validationErrors)
      .flat()
      .filter(Boolean)
      .map((message) => String(message).trim())
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return (
    [
      error?.response?.data?.message,
      error?.response?.data?.error,
      error?.response?.data?.title,
      error?.response?.data?.detail,
      error?.message,
    ].find(Boolean) || fallback
  )
    .toString()
    .trim();
};

export const extractHrmsCollection = (payload) => {
  const queue = [payload?.data, payload];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    if (Array.isArray(current)) {
      return current;
    }

    if (!isObject(current)) {
      continue;
    }

    if (Array.isArray(current.$values)) {
      return current.$values;
    }

    ARRAY_KEYS.forEach((key) => {
      if (current[key] !== undefined) {
        queue.push(current[key]);
      }
    });
  }

  return [];
};

export const extractHrmsRecord = (payload) => {
  if (Array.isArray(payload)) {
    return payload[0] || {};
  }

  if (!isObject(payload)) {
    return {};
  }

  if (isObject(payload.data)) {
    return extractHrmsRecord(payload.data);
  }

  return payload;
};

export const toHrmsEndpoint = (endpoint, id) =>
  typeof endpoint === "function" ? endpoint(id) : endpoint;

export const listHrmsSettings = async (moduleConfig, params = {}) => {
  const endpoint = moduleConfig?.api?.list;

  if (!endpoint) {
    return [];
  }

  const response = await api.get(toHrmsEndpoint(endpoint, params?.id), {
    params,
    dedupe: false,
  });
  return extractHrmsCollection(response?.data);
};

export const getHrmsSettingsRecord = async (endpoint, id) => {
  const response = await api.get(toHrmsEndpoint(endpoint, id), { dedupe: false });
  return extractHrmsRecord(response?.data);
};

const createFormData = (payload = {}, fileField = "file") => {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (value instanceof File) {
      formData.append(key || fileField, value);
      return;
    }

    formData.append(key, value);
  });

  return formData;
};

export const createHrmsSettingsRecord = async (moduleConfig, payload) => {
  const endpoint = moduleConfig.api.create;

  if (moduleConfig.api.createParamField) {
    return api.post(toHrmsEndpoint(endpoint, payload?.[moduleConfig.api.createParamField]), payload, {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (moduleConfig.uploadSettings || moduleConfig.api.contentType === "multipart/form-data") {
    return api.post(endpoint, createFormData(payload, moduleConfig.uploadSettings?.fileField), {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  return api.post(endpoint, payload, {
    headers: { "Content-Type": "application/json" },
  });
};

export const updateHrmsSettingsRecord = async (moduleConfig, id, payload) => {
  const endpoint = moduleConfig.api.update;

  if (!endpoint) {
    return createHrmsSettingsRecord(moduleConfig, payload);
  }

  return api.put(toHrmsEndpoint(endpoint, id), payload, {
    headers: { "Content-Type": "application/json" },
  });
};

export const deleteHrmsSettingsRecord = async (moduleConfig, id) =>
  api.delete(toHrmsEndpoint(moduleConfig.api.delete, id));

export const runHrmsWorkflowAction = async (action, payload = {}, id) => {
  const method = action.method || "post";
  const endpointId = action.paramField ? payload?.[action.paramField] : id;
  const endpoint = toHrmsEndpoint(action.endpoint, endpointId);

  if (method === "get") {
    return api.get(endpoint, { params: payload, dedupe: false });
  }

  if (method === "download") {
    return api.get(endpoint, { responseType: "blob", dedupe: false });
  }

  if (method === "put") {
    return api.put(endpoint, payload, {
      headers: { "Content-Type": "application/json" },
    });
  }

  return api.post(endpoint, payload, {
    headers: { "Content-Type": "application/json" },
  });
};

export const uploadHrmsBulkRecords = async (moduleConfig, file, extraPayload = {}) => {
  const endpoint = moduleConfig?.bulkUpload?.endpoint;
  const formData = new FormData();

  Object.entries(extraPayload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  formData.append(moduleConfig?.bulkUpload?.fileField || "file", file);

  return api.post(endpoint, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
