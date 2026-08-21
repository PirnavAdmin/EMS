import { parseDate } from "./date.js";

export const EMAIL_PATTERN =
  /^[A-Za-z0-9]+@[A-Za-z0-9]+\.(com|in)$/;

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
    .toLowerCase()
    .trim()
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

export const REQUIRED_FIELD_MESSAGE = "This field is required.";

export const isBlankValue = (value) =>
  value === undefined ||
  value === null ||
  String(value).trim() === "";

export const validateFieldValue = (
  value,
  { required = false, validator = () => "", normalize = (input) => input } = {}
) => {
  const normalizedValue = normalize(value);

  if (isBlankValue(normalizedValue)) {
    return required ? REQUIRED_FIELD_MESSAGE : "";
  }

  return validator(normalizedValue);
};

export const validateOptionalValue = (value, validator, normalize) =>
  validateFieldValue(value, { required: false, validator, normalize });

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const CUSTOMER_ID_PATTERN = /^\d{9}$/;
export const ACCOUNT_NUMBER_PATTERN = /^\d{15}$/;
export const UAN_PATTERN = /^\d{12}$/;
export const PF_ACCOUNT_PATTERN = /^[A-Z0-9]{22}$/;
export const TEXT_PATTERN = /^[A-Za-z0-9.,&()'/-]+(?:\s+[A-Za-z0-9.,&()'/-]+)*$/;
export const ACCOUNT_HOLDER_NAME_PATTERN =
  /^[A-Za-z.'-]+(?:\s+[A-Za-z.'-]+)*$/;

export const normalizeCurrencyInput = (value) =>
  String(value ?? "").replace(/,/g, "").trim();

export const toOptionalAmount = (value) => {
  const normalizedValue = normalizeCurrencyInput(value);
  return normalizedValue ? Number(normalizedValue) : 0;
};

export const validateCustomerId = (value) =>
  validateOptionalValue(
    value,
    (normalizedValue) => {
      if (!/^\d+$/.test(normalizedValue)) {
        return "Customer ID must contain only digits. Example: 974448262";
      }

      if (!CUSTOMER_ID_PATTERN.test(normalizedValue)) {
        return "Customer ID must be exactly 9 digits. Example: 974448262";
      }

      if (isAllZeroDigits(normalizedValue)) {
        return "Customer ID cannot be all zeros. Example: 974448262";
      }

      return "";
    },
    (input) => String(input || "").trim()
  );

export const validateIfscCode = (value) =>
  validateOptionalValue(
    value,
    (normalizedValue) => {
      if (!IFSC_PATTERN.test(normalizedValue)) {
        return "IFSC Code must be exactly 11 characters. Format: 4 letters + 0 + 6 alphanumeric characters. Example: UTIB0000289";
      }

      return "";
    },
    (input) => String(input || "").trim().toUpperCase()
  );

export const validateBankAccountNumber = (value) =>
  validateOptionalValue(value, (digits) => {
    if (!/^\d+$/.test(digits)) {
      return "Account Number must contain only digits. Example: 925010019088861";
    }

    if (!ACCOUNT_NUMBER_PATTERN.test(digits)) {
      return "Account Number must be exactly 15 digits. Example: 925010019088861";
    }

    if (isAllZeroDigits(digits)) {
      return "Account Number cannot be all zeros. Example: 925010019088861";
    }

    return "";
  }, (input) => String(input || "").trim());

export const validateUanNumber = (value) =>
  validateOptionalValue(value, (digits) => {
    if (!/^\d+$/.test(digits)) {
      return "UAN Number must contain only digits. Example: 102265179628";
    }

    if (!UAN_PATTERN.test(digits)) {
      return "UAN Number must be exactly 12 digits. Example: 102265179628";
    }

    if (isAllZeroDigits(digits)) {
      return "UAN Number cannot be all zeros. Example: 102265179628";
    }

    return "";
  }, (input) => String(input || "").trim());

export const validatePfAccountNumber = (value) =>
  validateOptionalValue(
    value,
    (normalizedValue) => {
      if (!PF_ACCOUNT_PATTERN.test(normalizedValue)) {
        return "PF Account Number must be exactly 22 characters and contain only letters and digits. Example: APKKP28542430000010080";
      }

      return "";
    },
    (input) => String(input || "").trim().toUpperCase()
  );

export const validateAccountHolderName = (value) =>
  validateOptionalValue(
    value,
    (normalizedValue) => {
      if (
        normalizedValue.length < 2 ||
        normalizedValue.length > 80 ||
        !ACCOUNT_HOLDER_NAME_PATTERN.test(normalizedValue)
      ) {
        return "Account Holder Name must contain only letters, spaces, and normal name punctuation. Example: Dwarsala Veera Vishnu Vardhan Reddy";
      }

      return "";
    },
    normalizeWhitespace
  );

export const validateBranchName = (value) =>
  validateOptionalValue(
    value,
    (normalizedValue) => {
      if (
        normalizedValue.length < 2 ||
        normalizedValue.length > 80 ||
        !TEXT_PATTERN.test(normalizedValue)
      ) {
        return "Branch Name must be between 2 and 80 characters. Example: Sanjeevreddy Nagar, Hyd";
      }

      return "";
    },
    normalizeWhitespace
  );

export const validateTextValue = (
  value,
  { label = "Field", min = 2, max = 80, required = false } = {}
) =>
  validateFieldValue(value, {
    required,
    validator: (normalizedValue) => {
      if (normalizedValue.length < min) {
        return `${label} must be at least ${min} characters`;
      }

      if (normalizedValue.length > max) {
        return `${label} cannot exceed ${max} characters`;
      }

      if (!TEXT_PATTERN.test(normalizedValue)) {
        return `${label} contains invalid characters`;
      }

      return "";
    },
    normalize: normalizeWhitespace
  });

export const validateNonNegativeAmount = (
  value,
  {
    label = "Amount",
    required = false,
    maxDigits = 10,
    message = ""
  } = {}
) =>
  validateFieldValue(value, {
    required,
    validator: (normalizedValue) => {
      const invalidMessage = message || `${label} must be a valid number`;

      if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
        return invalidMessage;
      }

      const digitCount = normalizedValue.replace(/\D/g, "").length;
      if (digitCount > maxDigits) {
        return `${label} cannot exceed ${maxDigits} digits`;
      }

      if (Number(normalizedValue) < 0) {
        return invalidMessage;
      }

      return "";
    },
    normalize: normalizeCurrencyInput
  });

export const calculateAnnualCtc = ({
  basicSalary = "",
  hra = "",
  conveyanceAllowance = "",
  medicalAllowance = "",
  specialAllowance = "",
  employerPF = ""
} = {}) => {
  const monthlyCtc =
    toOptionalAmount(basicSalary) +
    toOptionalAmount(hra) +
    toOptionalAmount(conveyanceAllowance) +
    toOptionalAmount(medicalAllowance) +
    toOptionalAmount(specialAllowance) +
    toOptionalAmount(employerPF);

  return Math.round(monthlyCtc * 12);
};

export const validateAnnualCTC = (annualCTC, salaryValues = {}) => {
  const amountError = validateNonNegativeAmount(annualCTC, {
    label: "Annual CTC",
    required: false,
    maxDigits: 10
  });

  if (amountError) {
    return amountError;
  }

  if (isBlankValue(annualCTC)) {
    return "";
  }

  const includedFields = [
    "basicSalary",
    "hra",
    "conveyanceAllowance",
    "medicalAllowance",
    "specialAllowance",
    "employerPF"
  ];

  const hasAnyComponent = includedFields.some(
    (fieldName) => !isBlankValue(salaryValues[fieldName])
  );

  if (!hasAnyComponent) {
    return "";
  }

  const expectedAnnualCtc = calculateAnnualCtc(salaryValues);
  const enteredAnnualCtc = toOptionalAmount(annualCTC);

  if (expectedAnnualCtc !== enteredAnnualCtc) {
    return "Annual CTC does not match the salary structure.";
  }

  return "";
};

export const validateEmployeeName = (
  value,
  { label = "Employee Name", min = 2, max = 40 } = {}
) => {
  const normalizedValue = normalizeWhitespace(value);

  if (!normalizedValue) {
    return REQUIRED_FIELD_MESSAGE;
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
    return REQUIRED_FIELD_MESSAGE;
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
  const isEmailAddress = label.toLowerCase() === "email address";

  if (!normalizedValue) {
    return required
      ? isEmailAddress
        ? "Email address is required."
        : REQUIRED_FIELD_MESSAGE
      : "";
  }

  if (normalizedValue.length > max) {
    return `${label} cannot exceed ${max} characters`;
  }

  if (!isValidEmail(normalizedValue)) {
    return isEmailAddress
      ? "Please enter a valid email address."
      : `Enter a valid ${label.toLowerCase()}`;
  }

  return "";
};

export const validatePhoneNumber = (
  value,
  { label = "Phone Number", required = true } = {}
) => {
  const digits = sanitizePhoneInput(value);

  if (!digits) {
    return required ? REQUIRED_FIELD_MESSAGE : "";
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
    return REQUIRED_FIELD_MESSAGE;
  }

  if (!GST_PATTERN.test(normalizedValue)) {
    return `Enter a valid ${label}`;
  }

  return "";
};

export const validatePanNumber = (value, label = "PAN Number") => {
  const normalizedValue = sanitizeAlphaNumericInput(value, 10);

  if (!normalizedValue) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (!PAN_PATTERN.test(normalizedValue)) {
    return `Enter a valid ${label}`;
  }

  return "";
};

export const validateTinNumber = (value, label = "TIN Number") => {
  const digits = sanitizeDigitsInput(value, 11);

  if (!digits) {
    return REQUIRED_FIELD_MESSAGE;
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
    return REQUIRED_FIELD_MESSAGE;
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

const toDateOnlyTime = (value) => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return Number.NaN;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  ).getTime();
};

export const calculateLeaveDuration = (fromDate, toDate) => {
  const fromTime = toDateOnlyTime(fromDate);
  const toTime = toDateOnlyTime(toDate);

  if (Number.isNaN(fromTime) || Number.isNaN(toTime) || toTime < fromTime) {
    return 0;
  }

  return Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24)) + 1;
};

export const getFinancialYear = (value) => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const startsInCurrentYear = parsedDate.getMonth() >= 3;
  const startYear = startsInCurrentYear ? year : year - 1;

  return `${startYear}-${startYear + 1}`;
};

export const validateLeaveDates = ({
  leaveType = "",
  fromDate = "",
  toDate = "",
  requireLeaveType = true,
  requireToDate = true
} = {}) => {
  const errors = {};

  if (requireLeaveType && (!leaveType || leaveType === "Select")) {
    errors.leaveType = "This field is required.";
  }

  if (!fromDate) {
    errors.fromDate = "From Date is required.";
  }

  if (requireToDate && !toDate) {
    errors.toDate = "To Date is required.";
  }

  if (errors.fromDate || errors.toDate) {
    return errors;
  }

  const fromTime = toDateOnlyTime(fromDate);
  const toTime = toDateOnlyTime(toDate);

  if (Number.isNaN(fromTime)) {
    errors.fromDate = "Please enter a valid leave date.";
  }

  if (Number.isNaN(toTime)) {
    errors.toDate = "Please enter a valid leave date.";
  }

  if (errors.fromDate || errors.toDate) {
    return errors;
  }

  if (toTime < fromTime) {
    errors.toDate = "To Date cannot be before From Date.";
    return errors;
  }

  if (calculateLeaveDuration(fromDate, toDate) > 31) {
    errors.duration = "Leave duration cannot exceed 1 month (31 days).";
  }

  if (getFinancialYear(fromDate) !== getFinancialYear(toDate)) {
    errors.financialYear =
      "Leave cannot be applied across different financial years.";
  }

  return errors;
};
