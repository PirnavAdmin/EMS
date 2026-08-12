import React from "react";

function TruncatedText({
  as: Component = "span",
  value,
  className = "",
  fallback = "-",
  ...rest
}) {
  const content = value || fallback;

  return (
    <Component
      className={`app-truncate ${className}`.trim()}
      title={typeof content === "string" ? content : undefined}
      {...rest}
    >
      {content}
    </Component>
  );
}

export default TruncatedText;
