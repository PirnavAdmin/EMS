export const PASSWORD_RULES = [
  {
    id: "uppercase-start",
    label: "Start with an uppercase letter",
    test: (value) => /^[A-Z]/.test(value),
  },
  {
    id: "length",
    label: "Minimum 8 characters",
    test: (value) => value.length >= 8,
  },
  {
    id: "number",
    label: "At least one number",
    test: (value) => /[0-9]/.test(value),
  },
  {
    id: "special",
    label: "At least one special character",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export const isValidEmail = (value = "") =>
  /^(?!.*\.\.)([A-Z0-9._%+-]+)@([A-Z0-9-]+\.)+[A-Z]{2,}$/i.test(
    String(value).trim()
  );

export const splitFullName = (value = "") => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

export const getPasswordRuleState = (password = "") =>
  PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

export const getPasswordStrength = (password = "") => {
  if (!password) {
    return {
      score: 0,
      tone: "idle",
      label: "Start typing to check strength",
    };
  }

  const score = PASSWORD_RULES.reduce(
    (total, rule) => total + Number(rule.test(password)),
    0
  );

  if (score <= 1) {
    return {
      score,
      tone: "weak",
      label: "Weak password",
    };
  }

  if (score <= 3) {
    return {
      score,
      tone: "medium",
      label: "Medium password",
    };
  }

  return {
    score,
    tone: "strong",
    label: "Strong password",
  };
};

export const getPasswordValidationMessage = (password = "") => {
  const failedRule = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failedRule ? failedRule.label : "";
};
