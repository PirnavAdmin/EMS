import React from "react";

function AuthField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  action,
  error = "",
  disabled = false,
  autoComplete,
  inputMode,
  maxLength,
  required = false,
  ...rest
}) {
  return (
    <div className="auth-field-group">
      <label htmlFor={name} className="auth-field-label">
        {label}
      </label>

      <div
        className={`auth-field-shell ${action ? "has-action" : ""} ${
          error ? "has-error" : ""
        }`.trim()}
      >
        {Icon ? (
          <span className="auth-field-icon" aria-hidden="true">
            <Icon />
          </span>
        ) : null}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="auth-field-input"
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          required={required}
          {...rest}
        />
        {action ? (
          <button
            type="button"
            className="auth-field-action"
            onClick={action.onClick}
            aria-label={action.label}
            disabled={disabled}
          >
            {action.icon}
          </button>
        ) : null}
      </div>

      {error ? <p className="auth-field-error">{error}</p> : null}
    </div>
  );
}

export default AuthField;
