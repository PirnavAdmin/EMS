import { useContext } from "react";
import { ThemeContext } from "./themeContextState.js";

export default function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
