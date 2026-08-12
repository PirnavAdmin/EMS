import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyTheme,
  getStoredThemeMode,
  getThemeDetails,
  THEME_MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  normalizeThemeMode,
  THEME_OPTIONS,
} from "./themeConfig";
import { ThemeContext } from "./themeContextState.js";

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(getStoredThemeMode);

  useEffect(() => {
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

  const toggleThemeMode = useCallback(() => {
    setThemeModeState((currentMode) =>
      currentMode === "light"
        ? "dark"
        : currentMode === "dark"
          ? "light"
          : "dark"
    );
  }, []);

  const setThemeMode = useCallback((nextThemeMode) => {
    setThemeModeState(normalizeThemeMode(nextThemeMode));
  }, []);

  const value = useMemo(() => {
    const activeTheme = getThemeDetails(themeMode);

    return {
      themeMode,
      activeTheme,
      themeOptions: THEME_OPTIONS,
      isDarkMode: themeMode !== "light",
      setThemeMode,
      toggleThemeMode,
    };
  }, [setThemeMode, themeMode, toggleThemeMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
