import React, { useLayoutEffect, useState } from "react";
import ThemeContext from "./themeContextState";
import {
  applyTheme,
  getStoredThemeMode,
  getThemeDetails,
  THEME_MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  THEME_OPTIONS,
} from "./themeConfig";

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(getStoredThemeMode);

  useLayoutEffect(() => {
    const resolvedThemeMode = normalizeThemeMode(themeMode);
    const themeDetails = getThemeDetails(resolvedThemeMode);

    applyTheme(resolvedThemeMode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, resolvedThemeMode);
      window.localStorage.setItem(
        THEME_MODE_STORAGE_KEY,
        themeDetails.colorScheme
      );
    }
  }, [themeMode]);

  const toggleThemeMode = () => {
    setThemeModeState((currentMode) =>
      currentMode === "light"
        ? "dark"
        : currentMode === "dark"
          ? "light"
          : "dark"
    );
  };

  const setThemeMode = (nextThemeMode) => {
    setThemeModeState(normalizeThemeMode(nextThemeMode));
  };

  const activeTheme = getThemeDetails(themeMode);

  const value = {
    themeMode,
    activeTheme,
    themeOptions: THEME_OPTIONS,
    isDarkMode: themeMode !== "light",
    setThemeMode,
    toggleThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
