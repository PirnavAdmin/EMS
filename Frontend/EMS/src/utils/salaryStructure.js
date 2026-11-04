import {
  formatCurrency as formatAppCurrency,
  formatNumber as formatAppNumber,
} from "./formatters";

export const SALARY_MIN = 100000;
export const SALARY_MAX = 5000000;
export const DEFAULT_CONVEYANCE = 19200;
export const DEFAULT_MEDICAL_ALLOWANCE = 15000;
 
export const SALARY_BREAKUP_FIELDS = [
  {
    name: "basic",
    label: "Basic",
    aliases: ["basic", "basicSalary"],
  },
  {
    name: "hra",
    label: "HRA",
    aliases: ["hra", "houseRentAllowance"],
  },
  {
    name: "conveyance",
    label: "Conveyance",
    aliases: ["conveyance", "conveyanceAllowance"],
  },
  {
    name: "medicalAllowance",
    label: "Medical Allowance",
    aliases: ["medicalAllowance", "medical_Allowance", "medical"],
  },
  {
    name: "otherAllowance",
    label: "Other Allowance",
    aliases: ["otherAllowance", "other_Allowance", "specialAllowance", "other"],
  },
];
 
export const createManualSalaryFieldMap = () => ({
  basic: false,
  hra: false,
  conveyance: false,
  medicalAllowance: false,
  otherAllowance: false,
});
 
const unwrapSalarySource = (source) =>
  source?.salaryStructure ||
  source?.salaryBreakup ||
  source?.data?.salaryStructure ||
  source?.data?.salaryBreakup ||
  source?.data ||
  source ||
  {};
 
const extractNumericValue = (source, aliases) => {
  for (const alias of aliases) {
    const rawValue = source?.[alias];
 
    if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
      const numericValue = Number(rawValue);
 
      if (Number.isFinite(numericValue)) {
        return Math.max(0, Math.round(numericValue));
      }
    }
  }
 
  return null;
};
 
export const parseCurrencyInput = (value) => {
  const digitsOnly = String(value ?? "").replace(/\D/g, "");
 
  if (!digitsOnly) {
    return 0;
  }
 
  return Number(digitsOnly);
};
 
export const clampAnnualCtc = (value) => {
  const numericValue = Number(value);
 
  if (!Number.isFinite(numericValue)) {
    return SALARY_MIN;
  }
 
  return Math.min(Math.max(numericValue, SALARY_MIN), SALARY_MAX);
};

export const formatCurrency = (value) =>
  formatAppCurrency(value, {
    fallback: "\u20b90",
    showZero: true,
  });

export const formatNumberInput = (value) =>
  formatAppNumber(value, "0");
 
export const formatLpa = (value) => {
  const lpaValue = Number(value || 0) / 100000;
  return `${Number(lpaValue.toFixed(1)).toString()} LPA`;
};
 
export const calculateSalaryBreakup = (
  ctcAnnual,
  values = {},
  manualFields = createManualSalaryFieldMap()
) => {
  const normalizedCtc = clampAnnualCtc(ctcAnnual);
  const defaults = {
    basic: Math.round(normalizedCtc * 0.4),
    hra: Math.round(normalizedCtc * 0.2),
    conveyance: DEFAULT_CONVEYANCE,
    medicalAllowance: DEFAULT_MEDICAL_ALLOWANCE,
  };
 
  const structure = {
    basic: manualFields.basic
      ? Math.max(0, Number(values.basic) || 0)
      : defaults.basic,
    hra: manualFields.hra
      ? Math.max(0, Number(values.hra) || 0)
      : defaults.hra,
    conveyance: manualFields.conveyance
      ? Math.max(0, Number(values.conveyance) || 0)
      : defaults.conveyance,
    medicalAllowance: manualFields.medicalAllowance
      ? Math.max(0, Number(values.medicalAllowance) || 0)
      : defaults.medicalAllowance,
    otherAllowance: 0,
  };
 
  const committedWithoutOther =
    structure.basic +
    structure.hra +
    structure.conveyance +
    structure.medicalAllowance;
 
  structure.otherAllowance = manualFields.otherAllowance
    ? Math.max(0, Number(values.otherAllowance) || 0)
    : Math.max(normalizedCtc - committedWithoutOther, 0);
 
  structure.totalCtc =
    structure.basic +
    structure.hra +
    structure.conveyance +
    structure.medicalAllowance +
    structure.otherAllowance;
 
  return structure;
};
 
export const validateSalaryBreakup = (ctcAnnual, breakup) => {
  const nextErrors = {};
  const normalizedCtc = clampAnnualCtc(ctcAnnual);
 
  SALARY_BREAKUP_FIELDS.forEach(({ name, label }) => {
    const numericValue = Number(breakup?.[name]);
 
    if (!Number.isFinite(numericValue)) {
      nextErrors[name] = `${label} must be a valid amount.`;
      return;
    }
 
    if (numericValue < 0) {
      nextErrors[name] = `${label} cannot be negative.`;
    }
  });
 
  const totalCtc = Number(breakup?.totalCtc) || 0;
 
  if (totalCtc > normalizedCtc) {
    nextErrors.total =
      "Salary breakup total cannot exceed the selected Annual CTC.";
  }
 
  return nextErrors;
};
 
export const extractManualOverrideFields = (source) => {
  const unwrappedSource = unwrapSalarySource(source);
  const nextManualFields = createManualSalaryFieldMap();
  const manualOverrideFields =
    unwrappedSource.manualOverrideFields ||
    unwrappedSource.manualFields ||
    [];
 
  if (Array.isArray(manualOverrideFields)) {
    manualOverrideFields.forEach((fieldName) => {
      if (fieldName in nextManualFields) {
        nextManualFields[fieldName] = true;
      }
    });
  }
 
  return nextManualFields;
};
 
export const extractSalaryBreakup = (
  source,
  ctcAnnual,
  manualFields = createManualSalaryFieldMap()
) => {
  const unwrappedSource = unwrapSalarySource(source);
  const seededValues = {};
 
  SALARY_BREAKUP_FIELDS.forEach(({ name, aliases }) => {
    const numericValue = extractNumericValue(unwrappedSource, aliases);
 
    if (numericValue !== null) {
      seededValues[name] = numericValue;
    }
  });
 
  return calculateSalaryBreakup(ctcAnnual, seededValues, manualFields);
};
 
export const buildSalaryBreakupPayload = (
  ctcAnnual,
  breakup,
  manualFields = createManualSalaryFieldMap()
) => {
  const normalizedBreakup = calculateSalaryBreakup(
    ctcAnnual,
    breakup,
    manualFields
  );
  const manualOverrideFields = Object.entries(manualFields)
    .filter(([, isManual]) => isManual)
    .map(([fieldName]) => fieldName);
 
  return {
    annualCtc: clampAnnualCtc(ctcAnnual),
    basic: normalizedBreakup.basic,
    hra: normalizedBreakup.hra,
    conveyance: normalizedBreakup.conveyance,
    medicalAllowance: normalizedBreakup.medicalAllowance,
    otherAllowance: normalizedBreakup.otherAllowance,
    totalCtc: normalizedBreakup.totalCtc,
    manualOverrideFields,
  };
};
 
 
