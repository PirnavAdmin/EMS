import React, {
  createContext,
  useContext,
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

export const ThemeContext = createContext(null);

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

  const toggleThemeMode = useMemo(() => () => {
    setThemeModeState((currentMode) =>
      currentMode === "light"
        ? "dark"
        : currentMode === "dark"
          ? "light"
          : "dark"
    );
  }, []);

  const setThemeMode = useMemo(() => (nextThemeMode) => {
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

export const useThemeContext = () => useContext(ThemeContext);

export default ThemeProvider;
