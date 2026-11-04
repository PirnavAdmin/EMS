import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import "./index.css";
import "./theme/theme.css";
import App from "./App.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import { applyTheme, getStoredThemeMode } from "./theme/themeConfig";

applyTheme(getStoredThemeMode());

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </ThemeProvider>
  </BrowserRouter>
);
