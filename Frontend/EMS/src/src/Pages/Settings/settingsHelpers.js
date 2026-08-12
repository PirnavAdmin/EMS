import { formatDateTime } from "../../utils/date";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const META_KEYS = new Set(["__fieldTypes", "__policyOptions"]);

export const formatSettingsTimestamp = (value) => {
  if (!value) {
    return "";
  }

  const formatted = formatDateTime(value, "");

  if (formatted && formatted !== "-") {
    return formatted;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toMinutes = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

const isValidTime = (value) => toMinutes(value) !== null;

const parseNumber = (value) => {
  const normalized = String(value || "").replace(/,/g, "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  if (!/^-?\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isInteger(parsed) ? parsed : null;
};

const parseNumberList = (value) =>
  String(value || "")
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || "").trim());

const isValidUrl = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return true;
  }

  try {
    new URL(rawValue);
    return true;
  } catch (error) {
    try {
      new URL(`https://${rawValue}`);
      return true;
    } catch (nestedError) {
      return false;
    }
  }
};

const toTitleCase = (value) =>
  String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      /^[A-Z0-9]{2,}$/.test(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");

export const humanizeSettingsKey = (key) => {
  const formatted = toTitleCase(key);

  return formatted || String(key || "");
};

const isLikelyEmailField = (key) => /email/i.test(String(key || ""));

const isLikelyUrlField = (key) => /(url|website)/i.test(String(key || ""));

const isLikelyMultilineField = (key) =>
  /(address|roles|emails|description|notes|message|content|body|policy)/i.test(
    String(key || "")
  );

export const getDynamicFieldType = (key, rawValue, fieldTypes = {}) => {
  const declaredType = fieldTypes?.[key];

  if (declaredType === "boolean" || typeof rawValue === "boolean") {
    return "boolean";
  }

  if (declaredType === "number" || typeof rawValue === "number") {
    return "number";
  }

  if (
    declaredType === "json" ||
    Array.isArray(rawValue) ||
    (rawValue && typeof rawValue === "object")
  ) {
    return "json";
  }

  if (isLikelyMultilineField(key)) {
    return "textarea";
  }

  if (isLikelyEmailField(key)) {
    return "email";
  }

  if (isLikelyUrlField(key)) {
    return "url";
  }

  if (/time/i.test(String(key || ""))) {
    return "time";
  }

  return "text";
};

const validateEmailList = (value) => {
  const entries = parseNumberList(value);

  if (entries.length === 0) {
    return null;
  }

  return entries.every(isValidEmail);
};

export const validateDynamicSettings = (values = {}, options = {}) => {
  const errors = {};
  const fieldTypes = values?.__fieldTypes || {};
  const requiredKeys = new Set(options.requiredKeys || []);

  Object.entries(values || {}).forEach(([key, rawValue]) => {
    if (META_KEYS.has(key) || String(key).startsWith("__")) {
      return;
    }

    const fieldType = getDynamicFieldType(key, rawValue, fieldTypes);
    const textValue = String(rawValue ?? "").trim();

    if (requiredKeys.has(key) && !textValue) {
      errors[key] = `${humanizeSettingsKey(key)} is required.`;
      return;
    }

    if (fieldType === "number") {
      if (!textValue) {
        return;
      }

      if (parseNumber(rawValue) === null) {
        errors[key] = `${humanizeSettingsKey(key)} must be a valid number.`;
      }

      return;
    }

    if (fieldType === "json") {
      if (!textValue) {
        return;
      }

      try {
        JSON.parse(textValue);
      } catch (error) {
        errors[key] = `${humanizeSettingsKey(key)} must contain valid JSON.`;
      }

      return;
    }

    if (fieldType === "email" && textValue && !isValidEmail(textValue)) {
      errors[key] = `Enter a valid ${humanizeSettingsKey(key).toLowerCase()}.`;
      return;
    }

    if (fieldType === "url" && textValue && !isValidUrl(textValue)) {
      errors[key] = `Enter a valid ${humanizeSettingsKey(key).toLowerCase()}.`;
    }
  });

  return errors;
};

export const validateEmailSettings = (values = {}) => {
  const errors = {};

  const senderEmail = String(values?.senderEmail || "").trim();
  const senderPassword = String(values?.senderPassword || "").trim();
  const smtpHost = String(values?.smtpHost || "").trim();
  const displayName = String(values?.displayName || "").trim();

  if (!senderEmail) {
    errors.senderEmail = "Sender Email is required.";
  } else if (!EMAIL_PATTERN.test(senderEmail)) {
    errors.senderEmail = "Enter a valid sender email.";
  }

  if (!senderPassword) {
    errors.senderPassword = "Sender Password is required.";
  }

  if (!smtpHost) {
    errors.smtpHost = "SMTP Host is required.";
  }

  if (!displayName) {
    errors.displayName = "Display Name is required.";
  }

  const smtpPort = parseInteger(values?.smtpPort);

  if (!String(values?.smtpPort || "").trim()) {
    errors.smtpPort = "SMTP Port is required.";
  } else if (smtpPort === null) {
    errors.smtpPort = "SMTP Port must be a valid number.";
  } else if (
    smtpPort !== null &&
    (smtpPort < 1 || smtpPort > 65535)
  ) {
    errors.smtpPort = "SMTP Port must be between 1 and 65535.";
  }

  return errors;
};

export const validateAttendanceSettings = (values = {}) => {
  const errors = {};

  const officeStart = toMinutes(values?.officeStartTime);
  const officeEnd = toMinutes(values?.officeEndTime);
  const checkInStart = toMinutes(values?.checkInStartTime);
  const lateAfter = toMinutes(values?.lateAfterTime);
  const checkoutTime = toMinutes(values?.checkoutTime);
  const halfDayHours = parseNumber(values?.halfDayHours);

  if (!isValidTime(values?.officeStartTime)) {
    errors.officeStartTime = "Office Start Time is required.";
  }

  if (!isValidTime(values?.officeEndTime)) {
    errors.officeEndTime = "Office End Time is required.";
  }

  if (!isValidTime(values?.checkInStartTime)) {
    errors.checkInStartTime = "Check-In Start Time is required.";
  }

  if (!isValidTime(values?.lateAfterTime)) {
    errors.lateAfterTime = "Late After Time is required.";
  }

  if (!isValidTime(values?.checkoutTime)) {
    errors.checkoutTime = "Checkout Time is required.";
  }

  if (!String(values?.halfDayHours || "").trim()) {
    errors.halfDayHours = "Half Day Hours is required.";
  } else if (halfDayHours === null || halfDayHours <= 0) {
    errors.halfDayHours = "Half Day Hours must be greater than 0.";
  }

  if (
    officeStart !== null &&
    officeEnd !== null &&
    officeEnd <= officeStart
  ) {
    errors.officeEndTime = "Office End Time must be after Office Start Time.";
  }

  if (
    checkInStart !== null &&
    officeStart !== null &&
    checkInStart > officeStart
  ) {
    errors.checkInStartTime =
      "Check-In Start Time should be before Office Start Time.";
  }

  if (lateAfter !== null && officeStart !== null && lateAfter <= officeStart) {
    errors.lateAfterTime = "Late After Time must be after Office Start Time.";
  }

  if (lateAfter !== null && officeEnd !== null && lateAfter > officeEnd) {
    errors.lateAfterTime = "Late After Time must be before Office End Time.";
  }

  if (checkoutTime !== null && officeEnd !== null && checkoutTime <= officeEnd) {
    errors.checkoutTime = "Checkout Time must be after Office End Time.";
  }

  return errors;
};

export const validateLeaveSettings = (values = {}) => {
  const errors = {};

  const approvalRoles = String(values?.approvalRoles || "").trim();
  const externalEmails = String(values?.externalEmails || "").trim();
  const ccEmails = String(values?.ccEmails || "").trim();

  if (!approvalRoles) {
    errors.approvalRoles = "Approval Roles is required.";
  }

  if (!externalEmails) {
    errors.externalEmails = "External Emails is required.";
  } else if (!validateEmailList(externalEmails)) {
    errors.externalEmails = "Enter valid external email addresses.";
  }

  if (!ccEmails) {
    errors.ccEmails = "Cc Emails is required.";
  } else if (!validateEmailList(ccEmails)) {
    errors.ccEmails = "Enter valid cc email addresses.";
  }

  const maxLeaveDays = parseInteger(values?.maxLeaveDays);
  const advanceNoticeDays = parseInteger(values?.advanceNoticeDays);

  if (maxLeaveDays === null) {
    errors.maxLeaveDays = "Max Leave Days is required.";
  } else if (maxLeaveDays < 0) {
    errors.maxLeaveDays = "Max Leave Days must be non-negative.";
  }

  if (advanceNoticeDays === null) {
    errors.advanceNoticeDays = "Advance Notice Days is required.";
  } else if (advanceNoticeDays < 0) {
    errors.advanceNoticeDays = "Advance Notice Days must be non-negative.";
  }

  return errors;
};

export const validateCompanySettings = (values = {}) => {
  const errors = {};

  const requiredTextFields = [
    ["companyName", "Company Name"],
    ["companyShortName", "Company Short Name"],
    ["companyPhone", "Company Phone"],
    ["companyAddress", "Company Address"],
    ["gstNumber", "GST Number"],
    ["cinNumber", "CIN Number"],
  ];

  requiredTextFields.forEach(([key, label]) => {
    if (!String(values?.[key] || "").trim()) {
      errors[key] = `${label} is required.`;
    }
  });

  const companyEmail = String(values?.companyEmail || "").trim();
  const companyWebsite = String(values?.companyWebsite || "").trim();
  const logoUrl = String(values?.logoUrl || "").trim();

  if (!companyEmail) {
    errors.companyEmail = "Company Email is required.";
  } else if (!EMAIL_PATTERN.test(companyEmail)) {
    errors.companyEmail = "Enter a valid company email.";
  }

  if (!companyWebsite) {
    errors.companyWebsite = "Company Website is required.";
  } else if (!isValidUrl(companyWebsite)) {
    errors.companyWebsite = "Enter a valid company website.";
  }

  if (logoUrl && !isValidUrl(logoUrl)) {
    errors.logoUrl = "Enter a valid logo URL.";
  }

  return errors;
};

export const validateNotificationSettings = (values = {}) =>
  validateDynamicSettings(values);

export const validateGeneralSettings = (values = {}) =>
  validateDynamicSettings(values);

export const validatePolicySettings = (values = {}) =>
  validateDynamicSettings(values, {
    requiredKeys: ["type"],
  });

export const validatePayrollSettings = (values = {}) =>
  validateCompanySettings(values);

export const validateWfhSettings = (values = {}) =>
  validateGeneralSettings(values);
