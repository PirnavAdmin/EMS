import React from "react";

function EmptyState({ message = "No data available", className = "" }) {
  return <div className={`app-empty-state ${className}`.trim()}>{message}</div>;
}

export default EmptyState;
