import React from "react";
import { createPortal } from "react-dom";
import { ToastContainer } from "react-toastify";
import useTheme from "../../../theme/useTheme";
import { toastTransition } from "./toastService";

const toastClassName = ({ type }) => `ems-toast ems-toast--${type || "info"}`;

function GlobalToastContainer() {
  const { isDarkMode } = useTheme();

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <ToastContainer
      autoClose={4000}
      closeButton={false}
      closeOnClick
      containerClassName="ems-toast-container"
      draggable
      draggablePercent={60}
      hideProgressBar={false}
      icon={false}
      limit={1}
      newestOnTop
      pauseOnFocusLoss={false}
      pauseOnHover
      position="top-right"
      role="status"
      theme={isDarkMode ? "dark" : "light"}
      toastClassName={toastClassName}
      transition={toastTransition}
    />,
    document.body
  );
}

export default GlobalToastContainer;
