import React from "react";
import {
  SettingsBanner,
  SettingsCard,
  SettingsField,
} from "./SettingsShared";
import { formatSettingsTimestamp } from "./settingsHelpers";

function CompanySettings({
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
          title="Company settings not loaded"
          message={loadError}
          tone="error"
        />
      )}

      {loading && !loadError && (
        <SettingsBanner
          title="Loading company settings"
          message="Fetching the latest company profile data from the backend."
          tone="info"
        />
      )}

      <SettingsCard
        title="Company Settings"
        description="Define the company profile and contact details returned by the backend."
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
            label="Company Name"
            required
            error={errors?.companyName}
          >
            <input
              className="settings-input"
              type="text"
              name="companyName"
              value={values?.companyName || ""}
              onChange={onChange}
              disabled={disabled}
              placeholder="Example Private Limited"
              aria-invalid={Boolean(errors?.companyName)}
            />
          </SettingsField>

          <SettingsField
            label="Company Short Name"
            required
            error={errors?.companyShortName}
          >
            <input
              className="settings-input"
              type="text"
              name="companyShortName"
              value={values?.companyShortName || ""}
              onChange={onChange}
              disabled={disabled}
              placeholder="Example"
              aria-invalid={Boolean(errors?.companyShortName)}
            />
          </SettingsField>

          <SettingsField
            label="Company Email"
            required
            error={errors?.companyEmail}
          >
            <input
              className="settings-input"
              type="email"
              name="companyEmail"
              value={values?.companyEmail || ""}
              onChange={onChange}
              disabled={disabled}
              placeholder="info@example.com"
              aria-invalid={Boolean(errors?.companyEmail)}
            />
          </SettingsField>

          <SettingsField
            label="Company Phone"
            required
            error={errors?.companyPhone}
          >
            <input
              className="settings-input"
              type="tel"
              name="companyPhone"
              value={values?.companyPhone || ""}
              onChange={onChange}
              disabled={disabled}
              placeholder="+91 98765 43210"
              aria-invalid={Boolean(errors?.companyPhone)}
            />
          </SettingsField>

          <SettingsField
            label="Company Website"
            required
            error={errors?.companyWebsite}
          >
            <input
              className="settings-input"
              type="url"
              name="companyWebsite"
              value={values?.companyWebsite || ""}
              onChange={onChange}
              disabled={disabled}
              placeholder="https://example.com"
              aria-invalid={Boolean(errors?.companyWebsite)}
            />
          </SettingsField>

          <SettingsField
            label="GST Number"
            required
            error={errors?.gstNumber}
          >
            <input
              className="settings-input"
              type="text"
              name="gstNumber"
              value={values?.gstNumber || ""}
              onChange={onChange}
              disabled={disabled}
              placeholder="29ABCDE1234F1Z5"
              aria-invalid={Boolean(errors?.gstNumber)}
            />
          </SettingsField>

          <SettingsField
            label="CIN Number"
            required
            error={errors?.cinNumber}
          >
            <input
              className="settings-input"
              type="text"
              name="cinNumber"
              value={values?.cinNumber || ""}
              onChange={onChange}
              disabled={disabled}
              placeholder="L12345MH2010PLC123456"
              aria-invalid={Boolean(errors?.cinNumber)}
            />
          </SettingsField>

          <SettingsField
            label="Company Address"
            required
            error={errors?.companyAddress}
            className="settings-field--full"
          >
            <textarea
              className="settings-textarea"
              name="companyAddress"
              value={values?.companyAddress || ""}
              onChange={onChange}
              disabled={disabled}
              rows={4}
              placeholder="Street, city, state, country"
              aria-invalid={Boolean(errors?.companyAddress)}
            />
          </SettingsField>

          <SettingsField
            label="Logo URL"
            error={errors?.logoUrl}
            className="settings-field--full"
          >
            <input
              className="settings-input"
              type="url"
              name="logoUrl"
              value={values?.logoUrl || ""}
              onChange={onChange}
              disabled={disabled}
              placeholder="https://cdn.example.com/logo.png"
              aria-invalid={Boolean(errors?.logoUrl)}
            />
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}

export default CompanySettings;
