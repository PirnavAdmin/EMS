import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

const EMAIL_HINTS = [
  "id",
  "senderEmail",
  "senderPassword",
  "smtpHost",
  "smtpPort",
  "enableSSL",
  "displayName",
  "updatedAt",
];

const ATTENDANCE_HINTS = [
  "officeStartTime",
  "officeEndTime",
  "checkInStartTime",
  "lateAfterTime",
  "checkoutTime",
  "halfDayHours",
];

const LEAVE_HINTS = [
  "approvalRoles",
  "externalEmails",
  "ccEmails",
  "allowHalfDay",
  "maxLeaveDays",
  "advanceNoticeDays",
  "attachmentRequired",
];

const COMPANY_HINTS = [
  "companyName",
  "companyShortName",
  "companyEmail",
  "companyPhone",
  "companyWebsite",
  "companyAddress",
  "logoUrl",
  "gstNumber",
  "cinNumber",
];

const POLICY_HINTS = [
  "type",
  "policyType",
  "PolicyType",
];

const TIMESTAMP_KEYS = [
  "lastUpdated",
  "LastUpdated",
  "updatedAt",
  "UpdatedAt",
  "updatedOn",
  "UpdatedOn",
  "modifiedAt",
  "ModifiedAt",
  "modifiedOn",
  "ModifiedOn",
  "lastModified",
  "LastModified",
];

const META_KEYS = [
  "id",
  "Id",
  "createdAt",
  "CreatedAt",
  "updatedAt",
  "UpdatedAt",
  "updatedOn",
  "UpdatedOn",
  "modifiedAt",
  "ModifiedAt",
  "modifiedOn",
  "ModifiedOn",
  "lastModified",
  "LastModified",
  "lastUpdated",
  "LastUpdated",
];

const hasOwn = (value, key) =>
  Boolean(value) &&
  typeof value === "object" &&
  Object.prototype.hasOwnProperty.call(value, key);

const isObjectLike = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value);

const firstDefined = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
};

const shouldSkipKey = (key) =>
  META_KEYS.includes(key) || String(key).startsWith("__");

export const normalizeTextValue = (value) =>
  String(firstDefined(value, "")).trim();

export const normalizeNumberString = (value) => {
  const rawValue = String(firstDefined(value, "")).replace(/,/g, "").trim();

  if (!rawValue) {
    return "";
  }

  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) ? String(parsedValue) : "";
};

export const normalizeBooleanValue = (value) =>
  value === true ||
  String(value).trim().toLowerCase() === "true" ||
  String(value).trim() === "1";

export const normalizeTimeString = (value) => {
  const rawValue = String(firstDefined(value, "")).trim();

  if (!rawValue) {
    return "";
  }

  const match = rawValue.match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    // Return HH:mm:ss for .NET TimeSpan
    return `${match[1].padStart(2, "0")}:${match[2]}:00`;
  }

  return rawValue;
};

const extractSettingsRecord = (payload, hintKeys = []) => {
  const candidates = [
    payload?.data?.$values?.[0],
    payload?.data?.data,
    payload?.data,
    payload?.$values?.[0],
    payload,
  ];

  for (const candidate of candidates) {
    if (isObjectLike(candidate) && hintKeys.some((key) => hasOwn(candidate, key))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (isObjectLike(candidate)) {
      return candidate;
    }

    if (Array.isArray(candidate) && candidate.length > 0) {
      const firstItem = candidate[0];

      if (isObjectLike(firstItem)) {
        return firstItem;
      }
    }
  }

  return {};
};

const extractSettingsCollection = (payload) => {
  const candidates = [
    payload?.data?.$values,
    payload?.data?.items,
    payload?.data?.policies,
    payload?.data,
    payload?.$values,
    payload?.items,
    payload?.policies,
    payload,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

export const extractSettingsTimestamp = (...sources) => {
  const queue = [...sources];

  while (queue.length > 0) {
    const source = queue.shift();

    if (!source) {
      continue;
    }

    if (Array.isArray(source)) {
      queue.push(...source);
      continue;
    }

    if (!isObjectLike(source)) {
      continue;
    }

    for (const key of TIMESTAMP_KEYS) {
      if (source[key]) {
        return source[key];
      }
    }

    if (source.data && source.data !== source) {
      queue.push(source.data);
    }

    if (source.$values && source.$values !== source) {
      queue.push(source.$values);
    }

    if (Array.isArray(source.items)) {
      queue.push(source.items);
    }
  }

  return "";
};

export const getSettingsErrorMessage = (
  error,
  fallback = "Unable to save settings."
) =>
  (
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

const toNullableNumber = (value) => {
  const normalizedValue = normalizeNumberString(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const maybeParseJsonValue = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
    (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmedValue);
    } catch {
      return value;
    }
  }

  return value;
};

const normalizeDynamicSettings = (payload = {}) => {
  const record = extractSettingsRecord(payload, []);
  const values = {};
  const fieldTypes = {};

  Object.entries(record).forEach(([key, rawValue]) => {
    if (shouldSkipKey(key)) {
      return;
    }

    if (typeof rawValue === "boolean") {
      values[key] = rawValue;
      fieldTypes[key] = "boolean";
      return;
    }

    if (typeof rawValue === "number") {
      values[key] = Number.isFinite(rawValue) ? rawValue : "";
      fieldTypes[key] = "number";
      return;
    }

    if (Array.isArray(rawValue) || isObjectLike(rawValue)) {
      values[key] = JSON.stringify(rawValue, null, 2);
      fieldTypes[key] = "json";
      return;
    }

    values[key] = normalizeTextValue(rawValue);
    fieldTypes[key] = "string";
  });

  return {
    ...values,
    __fieldTypes: fieldTypes,
  };
};

const prepareDynamicPayload = (values = {}) => {
  const payload = {};
  const fieldTypes = values.__fieldTypes || {};

  Object.entries(values).forEach(([key, rawValue]) => {
    if (shouldSkipKey(key)) {
      return;
    }

    const fieldType = fieldTypes[key];

    if (fieldType === "boolean") {
      payload[key] = Boolean(rawValue);
      return;
    }

    if (fieldType === "number") {
      payload[key] = toNullableNumber(rawValue);
      return;
    }

    if (fieldType === "json") {
      payload[key] = maybeParseJsonValue(rawValue);
      return;
    }

    payload[key] = normalizeTextValue(rawValue);
  });

  return payload;
};

const logSettingsApiError = ({ error, endpoint, method, payload }) => {
  console.error("========== SETTINGS API ERROR ==========");
  console.error("URL:", endpoint);
  console.error("Method:", String(method || "get").toUpperCase());
  console.error("Payload:", payload);
  console.error("Status:", error?.response?.status);
  console.error("Response:", error?.response?.data);
  console.table(error?.response?.data);
  console.log(JSON.stringify(error?.response?.data, null, 2));
  console.error("Validation Errors:", error?.response?.data?.errors);
  console.error("Stack Trace:", error?.stack);
  console.error(error);
  console.trace();
  console.error("=======================================");
};

const requestSettings = async ({
  endpoint,
  method,
  payload,
  normalize,
  hintKeys = [],
}) => {
  try {
    const request =
      method === "put"
        ? (() => {
          console.log("PUT Endpoint:", endpoint);
          console.log("PUT Payload:", JSON.stringify(payload, null, 2));

          return api.put(endpoint, payload, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        })()
        : api.get(endpoint);
    if (method === "put") {
      console.log("PUT Payload:", payload);
    }
    const response = await request;
    const record = extractSettingsRecord(response?.data, hintKeys);
    const recordHasHints =
      isObjectLike(record) && hintKeys.some((key) => hasOwn(record, key));

    const normalizedSource =
      recordHasHints || method === "get"
        ? record
        : payload || response?.data;

    const normalizedValues = normalize(normalizedSource);

    return {
      values: normalizedValues,
      lastUpdated: extractSettingsTimestamp(record, response?.data),
      raw: record,
      response: response?.data,
    };
  } catch (error) {
    logSettingsApiError({ error, endpoint, method, payload });
    throw error;
  }
};

export const EMAIL_SETTINGS_DEFAULTS = {
  id: "",
  senderEmail: "",
  senderPassword: "",
  smtpHost: "",
  smtpPort: "",
  enableSSL: false,
  displayName: "",
  updatedAt: "",
};

export const ATTENDANCE_SETTINGS_DEFAULTS = {
  officeStartTime: "",
  officeEndTime: "",
  checkInStartTime: "",
  lateAfterTime: "",
  checkoutTime: "",
  halfDayHours: "",
};

export const LEAVE_SETTINGS_DEFAULTS = {
  approvalRoles: "",
  externalEmails: "",
  ccEmails: "",
  allowHalfDay: false,
  maxLeaveDays: "",
  advanceNoticeDays: "",
  attachmentRequired: false,
};

export const COMPANY_SETTINGS_DEFAULTS = {
  companyName: "",
  companyShortName: "",
  companyEmail: "",
  companyPhone: "",
  companyWebsite: "",
  companyAddress: "",
  logoUrl: "",
  gstNumber: "",
  cinNumber: "",
};

export const NOTIFICATION_SETTINGS_DEFAULTS = {};

export const GENERAL_SETTINGS_DEFAULTS = {};

export const POLICY_SETTINGS_DEFAULTS = {
  type: "",
};

export const normalizeEmailSettings = (payload = {}) => {
  const record = extractSettingsRecord(payload, EMAIL_HINTS);

  return {
    id: normalizeTextValue(record.id),
    senderEmail: normalizeTextValue(record.senderEmail),
    senderPassword: normalizeTextValue(record.senderPassword),
    smtpHost: normalizeTextValue(record.smtpHost),
    smtpPort: normalizeNumberString(record.smtpPort),
    enableSSL: normalizeBooleanValue(record.enableSSL),
    displayName: normalizeTextValue(record.displayName),
    updatedAt: normalizeTextValue(record.updatedAt),
  };
};

export const normalizeAttendanceSettings = (payload = {}) => {
  const record = extractSettingsRecord(payload, ATTENDANCE_HINTS);

  return {
    officeStartTime: normalizeTimeString(record.officeStartTime),
    officeEndTime: normalizeTimeString(record.officeEndTime),
    checkInStartTime: normalizeTimeString(record.checkInStartTime),
    lateAfterTime: normalizeTimeString(record.lateAfterTime),
    checkoutTime: normalizeTimeString(record.checkoutTime),
    halfDayHours: normalizeNumberString(record.halfDayHours),
  };
};

export const normalizeLeaveSettings = (payload = {}) => {
  const record = extractSettingsRecord(payload, LEAVE_HINTS);

  return {
    approvalRoles: normalizeTextValue(record.approvalRoles),
    externalEmails: normalizeTextValue(record.externalEmails),
    ccEmails: normalizeTextValue(record.ccEmails),
    allowHalfDay: normalizeBooleanValue(record.allowHalfDay),
    maxLeaveDays: normalizeNumberString(record.maxLeaveDays),
    advanceNoticeDays: normalizeNumberString(record.advanceNoticeDays),
    attachmentRequired: normalizeBooleanValue(record.attachmentRequired),
  };
};

export const normalizeCompanySettings = (payload = {}) => {
  const record = extractSettingsRecord(payload, COMPANY_HINTS);

  return {
    companyName: normalizeTextValue(record.companyName),
    companyShortName: normalizeTextValue(record.companyShortName),
    companyEmail: normalizeTextValue(record.companyEmail),
    companyPhone: normalizeTextValue(record.companyPhone),
    companyWebsite: normalizeTextValue(record.companyWebsite),
    companyAddress: normalizeTextValue(record.companyAddress),
    logoUrl: normalizeTextValue(record.logoUrl),
    gstNumber: normalizeTextValue(record.gstNumber),
    cinNumber: normalizeTextValue(record.cinNumber),
  };
};

export const normalizeNotificationSettings = (payload = {}) =>
  normalizeDynamicSettings(payload);

export const normalizeGeneralSettings = (payload = {}) =>
  normalizeDynamicSettings(payload);

export const normalizePolicySettings = (payload = {}, fallbackType = "") => {
  const record = extractSettingsRecord(payload, POLICY_HINTS);
  const dynamicValues = normalizeDynamicSettings(record);
  const policyType = normalizeTextValue(
    firstDefined(
      record.type,
      record.policyType,
      record.PolicyType,
      fallbackType
    )
  );

  return {
    id: record.id ?? record.Id ?? 0,
    ...dynamicValues,
    type: policyType,
  };
};

export const normalizePoliciesList = (payload = {}) =>
  extractSettingsCollection(payload).map((item) => {
    const record = isObjectLike(item) ? item : { type: item };

    const policyType = normalizeTextValue(
      firstDefined(
        record.type,
        record.policyType,
        record.PolicyType
      )
    );

    return {
      ...normalizeDynamicSettings(record),
      type: policyType,
    };
  });

export const fetchEmailSettings = () =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.email,
    method: "get",
    normalize: normalizeEmailSettings,
    hintKeys: EMAIL_HINTS,
  });

export const saveEmailSettings = (values) =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.email,
    method: "put",
    payload: {
      senderEmail: normalizeTextValue(values?.senderEmail),
      senderPassword: normalizeTextValue(values?.senderPassword),
      smtpHost: normalizeTextValue(values?.smtpHost),
      smtpPort: toNullableNumber(values?.smtpPort),
      enableSSL: normalizeBooleanValue(values?.enableSSL),
      displayName: normalizeTextValue(values?.displayName),
    },
    normalize: normalizeEmailSettings,
    hintKeys: EMAIL_HINTS,
  });

export const fetchAttendanceSettings = () =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.attendance,
    method: "get",
    normalize: normalizeAttendanceSettings,
    hintKeys: ATTENDANCE_HINTS,
  });

export const saveAttendanceSettings = (values) =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.attendance,
    method: "put",
    payload: {
      officeStartTime: normalizeTimeString(values?.officeStartTime),
      officeEndTime: normalizeTimeString(values?.officeEndTime),
      checkInStartTime: normalizeTimeString(values?.checkInStartTime),
      lateAfterTime: normalizeTimeString(values?.lateAfterTime),
      checkoutTime: normalizeTimeString(values?.checkoutTime),
      halfDayHours: toNullableNumber(values?.halfDayHours),
    },
    normalize: normalizeAttendanceSettings,
    hintKeys: ATTENDANCE_HINTS,
  });

export const fetchLeaveSettings = () =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.leave,
    method: "get",
    normalize: normalizeLeaveSettings,
    hintKeys: LEAVE_HINTS,
  });

export const saveLeaveSettings = (values) =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.leave,
    method: "put",
    payload: {
      approvalRoles: normalizeTextValue(values?.approvalRoles),
      externalEmails: normalizeTextValue(values?.externalEmails),
      ccEmails: normalizeTextValue(values?.ccEmails),
      allowHalfDay: Boolean(values?.allowHalfDay),
      maxLeaveDays: toNullableNumber(values?.maxLeaveDays),
      advanceNoticeDays: toNullableNumber(values?.advanceNoticeDays),
      attachmentRequired: Boolean(values?.attachmentRequired),
    },
    normalize: normalizeLeaveSettings,
    hintKeys: LEAVE_HINTS,
  });

export const fetchCompanySettings = () =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.company,
    method: "get",
    normalize: normalizeCompanySettings,
    hintKeys: COMPANY_HINTS,
  });

export const saveCompanySettings = (values) =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.company,
    method: "put",
    payload: {
      companyName: normalizeTextValue(values?.companyName),
      companyShortName: normalizeTextValue(values?.companyShortName),
      companyEmail: normalizeTextValue(values?.companyEmail),
      companyPhone: normalizeTextValue(values?.companyPhone),
      companyWebsite: normalizeTextValue(values?.companyWebsite),
      companyAddress: normalizeTextValue(values?.companyAddress),
      logoUrl: normalizeTextValue(values?.logoUrl),
      gstNumber: normalizeTextValue(values?.gstNumber),
      cinNumber: normalizeTextValue(values?.cinNumber),
    },
    normalize: normalizeCompanySettings,
    hintKeys: COMPANY_HINTS,
  });

export const fetchNotificationSettings = () =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.notification,
    method: "get",
    normalize: normalizeNotificationSettings,
    hintKeys: [],
  });

export const saveNotificationSettings = (values) =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.notification,
    method: "put",
    payload: prepareDynamicPayload(values),
    normalize: normalizeNotificationSettings,
    hintKeys: [],
  });

export const fetchGeneralSettings = () =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.general,
    method: "get",
    normalize: normalizeGeneralSettings,
    hintKeys: [],
  });

export const saveGeneralSettings = (values) =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.general,
    method: "put",
    payload: prepareDynamicPayload(values),
    normalize: normalizeGeneralSettings,
    hintKeys: [],
  });

export const fetchPoliciesSettings = async (preferredType) => {
  let listResponse;

  try {
    listResponse = await api.get(API_ENDPOINTS.settings.policies);
  } catch (error) {
    logSettingsApiError({
      error,
      endpoint: API_ENDPOINTS.settings.policies,
      method: "get",
      payload: undefined,
    });
    throw error;
  }

  const policies = normalizePoliciesList(listResponse?.data);
  const defaultType =
    normalizeTextValue(preferredType) ||
    normalizeTextValue(policies[0]?.type);

  if (!defaultType) {
    return {
      values: {
        ...POLICY_SETTINGS_DEFAULTS,
        __policyOptions: policies,
      },
      policies,
      lastUpdated: extractSettingsTimestamp(listResponse?.data),
    };
  }

  let selectedResponse;

  try {
    selectedResponse = await api.get(API_ENDPOINTS.settings.policy(defaultType));
  } catch (error) {
    logSettingsApiError({
      error,
      endpoint: API_ENDPOINTS.settings.policy(defaultType),
      method: "get",
      payload: undefined,
    });
    throw error;
  }

  const values = normalizePolicySettings(selectedResponse?.data, defaultType);

  return {
    values: {
      ...values,
      __policyOptions: policies,
    },
    policies,
    lastUpdated: extractSettingsTimestamp(
      selectedResponse?.data,
      listResponse?.data
    ),
  };
};

export const fetchPolicySettings = async (policyType) => {
  const targetType = normalizeTextValue(policyType);

  if (!targetType) {
    return {
      values: {
        ...POLICY_SETTINGS_DEFAULTS,
        __policyOptions: [],
      },
      policies: [],
      lastUpdated: "",
    };
  }

  try {
    const response = await api.get(API_ENDPOINTS.settings.policy(targetType));
    return {
      values: {
        ...normalizePolicySettings(response?.data, targetType),
        __policyOptions: [],
      },
      policies: [],
      lastUpdated: extractSettingsTimestamp(response?.data),
    };
  } catch (error) {
    logSettingsApiError({
      error,
      endpoint: API_ENDPOINTS.settings.policy(targetType),
      method: "get",
      payload: undefined,
    });
    throw error;
  }
};

export const savePolicySettings = (values) =>
  requestSettings({
    endpoint: API_ENDPOINTS.settings.updatePolicy,
    method: "put",
    payload: {
      id: values?.id,
      ...prepareDynamicPayload(values),
      type: normalizeTextValue(values?.type),
    },
    normalize: normalizePolicySettings,
    hintKeys: POLICY_HINTS,
  });
