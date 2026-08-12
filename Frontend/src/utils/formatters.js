const integerCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const decimalCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const getNumericValue = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const normalizeCurrencyOutput = (value) => value.replace(/\s/g, "");

export const formatCurrency = (
  value,
  { fallback = "-", decimals = 0, showZero = true } = {}
) => {
  const numericValue = getNumericValue(value);

  if (numericValue === null) {
    return fallback;
  }

  if (numericValue === 0 && !showZero) {
    return fallback;
  }

  return normalizeCurrencyOutput(
    decimals > 0
      ? decimalCurrencyFormatter.format(numericValue)
      : integerCurrencyFormatter.format(numericValue)
  );
};

export const formatNumber = (value, fallback = "-") => {
  const numericValue = getNumericValue(value);
  return numericValue === null ? fallback : numberFormatter.format(numericValue);
};

export const formatEmployeeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

export const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();
