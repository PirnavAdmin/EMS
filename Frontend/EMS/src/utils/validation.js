export const EMAIL_PATTERN =
  /^(?!.*\.\.)([A-Z0-9._%+-]+)@((?!-)[A-Z0-9-]{1,63}(?<!-)\.)+[A-Z]{2,}$/i;

export const GST_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const TIN_PATTERN = /^\d{9,11}$/;
export const INDIAN_PHONE_PATTERN = /^[6-9]\d{9}$/;
export const PERSON_NAME_PATTERN = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
export const EMPLOYEE_ID_PATTERN = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{3,10}$/;
export const ROLE_NAME_PATTERN = /^(?!\d+$)[A-Za-z0-9&/ -]+$/;

export const sanitizeLeadingWhitespace = (value) =>
  String(value || "").replace(/^\s+/g, "");

export const normalizeWhitespace = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

export const sanitizeLettersAndSpaces = (value, maxLength = 50) =>
  sanitizeLeadingWhitespace(value)
    .replace(/[^A-Za-z\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLength);

export const sanitizeRoleNameInput = (value, maxLength = 30) =>
  sanitizeLeadingWhitespace(value)
    .replace(/[^A-Za-z0-9&/ -]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLength);

export const sanitizeEmailInput = (value, maxLength = 60) =>
  String(value || "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .slice(0, maxLength);

export const sanitizePhoneInput = (value, maxLength = 10) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);

export const sanitizeDigitsInput = (value, maxLength = 12) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);

export const sanitizeAlphaNumericInput = (value, maxLength = 10) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, maxLength);

export const isValidEmail = (value) =>
  EMAIL_PATTERN.test(String(value || "").trim());

export const isAllZeroDigits = (value) =>
  /^0+$/.test(String(value || "").trim());

export const validateEmployeeName = (
  value,
  { label = "Employee Name", min = 2, max = 40 } = {}
) => {
  const normalizedValue = normalizeWhitespace(value);

  if (!normalizedValue) {
    return `${label} is required`;
  }

  if (normalizedValue.length < min) {
    return `${label} must be at least ${min} characters`;
  }

  if (normalizedValue.length > max) {
    return `${label} cannot exceed ${max} characters`;
  }

  if (!PERSON_NAME_PATTERN.test(normalizedValue)) {
    return `${label} must contain only alphabets and spaces`;
  }

  return "";
};

export const validateEmployeeId = (
  value,
  { label = "Employee ID", min = 3, max = 10 } = {}
) => {
  const normalizedValue = String(value || "")
    .trim()
    .toUpperCase();

  if (!normalizedValue) {
    return `${label} is required`;
  }

  if (!/^[A-Z0-9]+$/.test(normalizedValue)) {
    return `${label} must contain only letters and numbers`;
  }

  if (normalizedValue.length < min || normalizedValue.length > max) {
    return `${label} must be between ${min} and ${max} characters`;
  }

  if (!EMPLOYEE_ID_PATTERN.test(normalizedValue)) {
    return `${label} must include at least one letter and one number`;
  }

  return "";
};

export const validateEmailAddress = (
  value,
  { label = "Email Address", max = 60, required = true } = {}
) => {
  const normalizedValue = sanitizeEmailInput(value, max);

  if (!normalizedValue) {
    return required ? `${label} is required` : "";
  }

  if (normalizedValue.length > max) {
    return `${label} cannot exceed ${max} characters`;
  }

  if (!isValidEmail(normalizedValue)) {
    return `Enter a valid ${label.toLowerCase()}`;
  }

  return "";
};

export const validatePhoneNumber = (
  value,
  { label = "Phone Number", required = true } = {}
) => {
  const digits = sanitizePhoneInput(value);

  if (!digits) {
    return required ? `${label} is required` : "";
  }

  if (digits.length !== 10) {
    return `${label} must contain exactly 10 digits`;
  }

  if (isAllZeroDigits(digits)) {
    return `${label} cannot be all zeros`;
  }

  if (!INDIAN_PHONE_PATTERN.test(digits)) {
    return `Enter a valid ${label.toLowerCase()}`;
  }

  return "";
};

export const validateGstNumber = (value, label = "GST Number") => {
  const normalizedValue = sanitizeAlphaNumericInput(value, 15);

  if (!normalizedValue) {
    return `${label} is required`;
  }

  if (!GST_PATTERN.test(normalizedValue)) {
    return `Enter a valid ${label}`;
  }

  return "";
};

export const validatePanNumber = (value, label = "PAN Number") => {
  const normalizedValue = sanitizeAlphaNumericInput(value, 10);

  if (!normalizedValue) {
    return `${label} is required`;
  }

  if (!PAN_PATTERN.test(normalizedValue)) {
    return `Enter a valid ${label}`;
  }

  return "";
};

export const validateTinNumber = (value, label = "TIN Number") => {
  const digits = sanitizeDigitsInput(value, 11);

  if (!digits) {
    return `${label} is required`;
  }

  if (!TIN_PATTERN.test(digits)) {
    return `${label} must contain 9 to 11 digits`;
  }

  return "";
};

export const validateRoleName = (
  value,
  { label = "Role Name", min = 2, max = 30 } = {}
) => {
  const normalizedValue = normalizeWhitespace(value);

  if (!normalizedValue) {
    return `${label} is required`;
  }

  if (normalizedValue.length < min) {
    return `${label} must be at least ${min} characters`;
  }

  if (normalizedValue.length > max) {
    return `${label} cannot exceed ${max} characters`;
  }

  if (/^\d+$/.test(normalizedValue)) {
    return `${label} cannot contain numbers only`;
  }

  if (!ROLE_NAME_PATTERN.test(normalizedValue)) {
    return `${label} contains invalid characters`;
  }

  return "";
};
