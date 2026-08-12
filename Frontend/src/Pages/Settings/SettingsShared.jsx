import React from "react";

export function SettingsCard({
  title,
  description,
  meta,
  children,
  className = "",
}) {
  return (
    <section className={`settings-card ${className}`.trim()}>
      <div className="settings-card-header settings-header settings-card-head">
        <div className="settings-card-copy">
          <h3 className="settings-card-title">{title}</h3>
          {description && (
            <p className="settings-card-description">{description}</p>
          )}
        </div>

        {meta && <div className="settings-card-meta">{meta}</div>}
      </div>

      <div className="settings-card-body">{children}</div>
    </section>
  );
}

export function SettingsField({
  label,
  hint,
  error,
  required = false,
  className = "",
  children,
}) {
  return (
    <div className={`settings-field ${className}`.trim()}>
      <div className="settings-field-label-row">
        <label className="settings-field-label">
          {label}
          {required && <span className="settings-field-required">*</span>}
        </label>

        {hint && <span className="settings-field-hint">{hint}</span>}
      </div>

      {children}

      {error && <div className="settings-field-error">{error}</div>}
    </div>
  );
}

export function SettingsBanner({ title, message, tone = "error" }) {
  return (
    <div className={`settings-banner is-${tone}`.trim()} role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

export function SettingsStatPill({ label, value, tone = "info" }) {
  return (
    <div className={`settings-stat-pill is-${tone}`.trim()}>
      <span className="settings-stat-label">{label}</span>
      <strong className="settings-stat-value">{value}</strong>
    </div>
  );
}
