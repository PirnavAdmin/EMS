import React from "react";
import {
  SettingsBanner,
  SettingsCard,
  SettingsField,
} from "./SettingsShared";
import { formatSettingsTimestamp } from "./settingsHelpers";

function EmailSettings({
  values,
  errors,
  onChange,
  lastUpdated,
  loadError,
  loading = false,
  disabled = false,
}) {
  const timestamp = formatSettingsTimestamp(lastUpdated);

  return (
    <div className="settings-tab-panel">
      {loadError && (
        <SettingsBanner
          title="Email settings not loaded"
          message={loadError}
          tone="error"
        />
      )}

      {loading && !loadError && (
        <SettingsBanner
          title="Loading email settings"
          message="Fetching the latest SMTP configuration from the backend."
          tone="info"
        />
      )}

      <SettingsCard
        title="Email Settings"
        description="Configure the SMTP connection and sender identity used by the backend."
        meta={
          timestamp ? (
            <span className="settings-last-updated">
              Last updated {timestamp}
            </span>
          ) : null
        }
      >
        <div className="settings-form-grid settings-grid settings-grid-2">
          <SettingsField
            label="Sender Email"
            required
            error={errors?.senderEmail}
          >
            <input
              className="settings-input"
              type="email"
              name="senderEmail"
              value={values?.senderEmail || ""}
              onChange={onChange}
              placeholder="smtp@company.com"
              disabled={disabled}
              aria-invalid={Boolean(errors?.senderEmail)}
            />
          </SettingsField>

          <SettingsField
            label="Sender Password"
            required
            error={errors?.senderPassword}
          >
            <input
              className="settings-input"
              type="password"
              name="senderPassword"
              value={values?.senderPassword || ""}
              onChange={onChange}
              placeholder="Enter SMTP password"
              autoComplete="new-password"
              disabled={disabled}
              aria-invalid={Boolean(errors?.senderPassword)}
            />
          </SettingsField>

          <SettingsField
            label="SMTP Host"
            required
            error={errors?.smtpHost}
          >
            <input
              className="settings-input"
              type="text"
              name="smtpHost"
              value={values?.smtpHost || ""}
              onChange={onChange}
              placeholder="smtp.hostinger.com"
              disabled={disabled}
              aria-invalid={Boolean(errors?.smtpHost)}
            />
          </SettingsField>

          <SettingsField
            label="SMTP Port"
            required
            error={errors?.smtpPort}
          >
            <input
              className="settings-input"
              type="number"
              name="smtpPort"
              value={values?.smtpPort || ""}
              onChange={onChange}
              placeholder="587"
              disabled={disabled}
              min="1"
              max="65535"
              step="1"
              inputMode="numeric"
              aria-invalid={Boolean(errors?.smtpPort)}
            />
          </SettingsField>

          <SettingsField
            label="Display Name"
            required
            error={errors?.displayName}
          >
            <input
              className="settings-input"
              type="text"
              name="displayName"
              value={values?.displayName || ""}
              onChange={onChange}
              placeholder="EMS Notifications"
              disabled={disabled}
              aria-invalid={Boolean(errors?.displayName)}
            />
          </SettingsField>

          <SettingsField
            label="Enable SSL"
            error={errors?.enableSSL}
            className="settings-field--toggle"
          >
            <label className="settings-switch" aria-disabled={disabled}>
              <input
                type="checkbox"
                name="enableSSL"
                checked={Boolean(values?.enableSSL)}
                onChange={onChange}
                disabled={disabled}
              />
              <span className="settings-switch-track" aria-hidden="true">
                <span className="settings-switch-thumb" />
              </span>
              <span className="settings-switch-copy">
                {values?.enableSSL ? "Enabled" : "Disabled"}
              </span>
            </label>
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}

export default EmailSettings;
