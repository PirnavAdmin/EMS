const DEFAULT_TRUE_VALUES = ["true", "1", "yes", "y", "on", "active", "enabled"];
const DEFAULT_FALSE_VALUES = ["false", "0", "no", "n", "off", "inactive", "disabled"];

const toNormalizedSet = (values) =>
  new Set(
    (values || [])
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

export const toBoolean = (value, fallback = false, options = {}) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return Boolean(fallback);
  }

  const truthyValues = toNormalizedSet([
    ...DEFAULT_TRUE_VALUES,
    ...(options.trueValues || []),
  ]);
  const falsyValues = toNormalizedSet([
    ...DEFAULT_FALSE_VALUES,
    ...(options.falseValues || []),
  ]);

  if (truthyValues.has(normalized)) {
    return true;
  }

  if (falsyValues.has(normalized)) {
    return false;
  }

  return Boolean(fallback);
};
