export const THEME_STORAGE_KEY = "ems-theme";
export const THEME_MODE_STORAGE_KEY = "darkMode";
export const FALLBACK_THEME_MODE = "light";
const LEGACY_THEME_ALIASES = {
  true: "dark",
  false: "light",
};

export const THEME_OPTIONS = [
  {
    value: "light",
    label: "Professional Aqua",
    description: "Clean light mode with balanced aqua surfaces",
    swatch: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    dataTheme: "professional-aqua",
    colorScheme: "light",
  },
  // {
  //   value: "dark",
  //   label: "Dark Mode",
  //   description: "Classic dark surfaces with familiar contrast",
  //   swatch: "linear-gradient(135deg, #202124 0%, #303134 100%)",
  //   dataTheme: "professional-aqua",
  //   colorScheme: "dark",
  // },
  {
    value: "dark-executive",
    label: "Executive Dark Blue",
    description: "Premium navy dark mode without black flash",
    swatch: "linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)",
    dataTheme: "dark-executive",
    colorScheme: "dark",
  },
];

const THEME_BY_VALUE = THEME_OPTIONS.reduce((accumulator, option) => {
  accumulator[option.value] = option;
  return accumulator;
}, {});

export const normalizeThemeMode = (mode) =>
  Object.prototype.hasOwnProperty.call(
    THEME_BY_VALUE,
    LEGACY_THEME_ALIASES[mode] || mode
  )
    ? LEGACY_THEME_ALIASES[mode] || mode
    : FALLBACK_THEME_MODE;

export const getThemeDetails = (themeMode = FALLBACK_THEME_MODE) =>
  THEME_BY_VALUE[normalizeThemeMode(themeMode)] || THEME_BY_VALUE.light;

export const getStoredThemeMode = () => {
  if (typeof window === "undefined") {
    return FALLBACK_THEME_MODE;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme) {
    return normalizeThemeMode(storedTheme);
  }

  const legacyMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return normalizeThemeMode(legacyMode);
};

export const applyTheme = (themeMode = FALLBACK_THEME_MODE) => {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedMode = normalizeThemeMode(themeMode);
  const themeDetails = getThemeDetails(resolvedMode);

  document.documentElement.setAttribute("data-theme", themeDetails.dataTheme);
  document.documentElement.setAttribute(
    "data-theme-mode",
    themeDetails.colorScheme
  );
  document.documentElement.style.colorScheme = themeDetails.colorScheme;
};
