import React from "react";
import { FaChevronDown } from "react-icons/fa";

function AuthSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  icon: Icon,
  error = "",
  disabled = false,
  required = false,
  placeholder = "",
  ...rest
}) {
  return (
    <div className="auth-field-group">
      <label htmlFor={name} className="auth-field-label">
        {label}
      </label>

      <div
        className={`auth-field-shell auth-select-shell ${error ? "has-error" : ""}`.trim()}
      >
        {Icon ? (
          <span className="auth-field-icon" aria-hidden="true">
            <Icon />
          </span>
        ) : null}

        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="auth-field-input auth-select-input"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          required={required}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}

          {options.map((option) => (
            <option
              key={String(option.value)}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <span className="auth-select-caret" aria-hidden="true">
          <FaChevronDown />
        </span>
      </div>

      {error ? <p className="auth-field-error">{error}</p> : null}
    </div>
  );
}

export default AuthSelect;
