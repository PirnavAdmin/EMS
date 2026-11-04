import React from "react";
import { SettingsBanner, SettingsCard, SettingsField } from "./SettingsShared";
import { formatSettingsTimestamp } from "./settingsHelpers";

const normalizeDisplayValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

const getPolicyOptionValue = (option) => {
  if (typeof option === "string") {
    return option;
  }

  return (
    option?.type ??
    option?.policyType ??
    option?.PolicyType ??
    option?.value ??
    option?.Value ??
    option?.name ??
    option?.Name ??
    option?.label ??
    option?.Label ??
    ""
  );
};

const getPolicyOptionLabel = (option) => {
  if (typeof option === "string") {
    return option;
  }

  return (
    option?.policyTitle ??
    option?.PolicyTitle ??
    option?.policyType ??
    option?.PolicyType ??
    option?.label ??
    option?.Label ??
    option?.name ??
    option?.Name ??
    option?.title ??
    option?.Title ??
    getPolicyOptionValue(option)
  );
};

function PolicySettings({
  values = {},
  errors = {},
  onChange,
  lastUpdated,
  loadError,
  loading = false,
  disabled = false,
  policyOptions = [],
  onPolicyChange,
}) {
  const timestamp = formatSettingsTimestamp(lastUpdated);
  const options = Array.isArray(policyOptions) ? policyOptions : [];
  const isDisabled = disabled || loading;
  const selectedType = normalizeDisplayValue(values?.type || values?.policyType);

  const handlePolicyChange = (event) => {
    if (typeof onPolicyChange === "function") {
      onPolicyChange(event.target.value);
      return;
    }

    onChange(event);
  };

  return (
    <div className="settings-tab-panel">
      {loadError && (
        <SettingsBanner
          title="Settings not loaded"
          message={loadError}
          tone="error"
        />
      )}

      {loading && !loadError && (
        <SettingsBanner
          title="Loading settings"
          message="Fetching the latest configuration from the server."
          tone="info"
        />
      )}

      <SettingsCard
        title="Policy Settings"
        description="Select a policy type and edit the configuration returned by the backend."
        meta={
          <span className="settings-last-updated">
            Last updated {timestamp || "Not available"}
          </span>
        }
      >
        <div className="settings-form-grid settings-grid settings-grid-2">
          <SettingsField
            label="Policy Type"
            hint="Choose which policy record to edit."
            required
            error={errors?.type}
            className="settings-field--full"
          >
            <select
              className="settings-select"
              name="type"
              value={selectedType}
              onChange={handlePolicyChange}
              disabled={isDisabled || options.length === 0}
              aria-invalid={Boolean(errors?.type)}
            >
              <option value="" disabled>
                Select a policy
              </option>
              {options.map((option, index) => {
                const optionValue = normalizeDisplayValue(getPolicyOptionValue(option));

                return (
                  <option
                    key={`${optionValue || "empty"}-${index}`}
                    value={optionValue}
                  >
                    {getPolicyOptionLabel(option)}
                  </option>
                );
              })}
            </select>
          </SettingsField>

          <SettingsField label="Id" error={errors?.id}>
            <input
              className="settings-input"
              type="number"
              name="id"
              value={normalizeDisplayValue(values?.id)}
              onChange={onChange}
              disabled={isDisabled}
              readOnly
              aria-readonly="true"
              aria-invalid={Boolean(errors?.id)}
            />
          </SettingsField>

          <SettingsField label="Policy Type" error={errors?.policyType}>
            <input
              className="settings-input"
              type="text"
              name="policyType"
              value={normalizeDisplayValue(values?.policyType)}
              onChange={onChange}
              disabled={isDisabled}
              aria-invalid={Boolean(errors?.policyType)}
            />
          </SettingsField>

          <SettingsField label="Policy Title" error={errors?.policyTitle}>
            <input
              className="settings-input"
              type="text"
              name="policyTitle"
              value={normalizeDisplayValue(values?.policyTitle)}
              onChange={onChange}
              disabled={isDisabled}
              aria-invalid={Boolean(errors?.policyTitle)}
            />
          </SettingsField>

          <SettingsField
            label="Policy Content"
            error={errors?.policyContent}
            className="settings-field--full"
          >
            <textarea
              className="settings-textarea"
              name="policyContent"
              value={normalizeDisplayValue(values?.policyContent)}
              onChange={onChange}
              disabled={isDisabled}
              rows={6}
              aria-invalid={Boolean(errors?.policyContent)}
            />
          </SettingsField>

          <SettingsField label="Version" error={errors?.version}>
            <input
              className="settings-input"
              type="text"
              name="version"
              value={normalizeDisplayValue(values?.version)}
              onChange={onChange}
              disabled={isDisabled}
              aria-invalid={Boolean(errors?.version)}
            />
          </SettingsField>

          <SettingsField label="Effective From" error={errors?.effectiveFrom}>
            <input
              className="settings-input"
              type="datetime-local"
              name="effectiveFrom"
              step="1"
              value={normalizeDisplayValue(values?.effectiveFrom)}
              onChange={onChange}
              disabled={isDisabled}
              aria-invalid={Boolean(errors?.effectiveFrom)}
            />
          </SettingsField>

          <SettingsField
            label="Is Active"
            error={errors?.isActive}
            className="settings-field--toggle"
          >
            <label className="settings-switch" aria-disabled={isDisabled}>
              <input
                type="checkbox"
                name="isActive"
                checked={Boolean(values?.isActive)}
                onChange={onChange}
                disabled={isDisabled}
              />
              <span className="settings-switch-track" aria-hidden="true">
                <span className="settings-switch-thumb" />
              </span>
              <span className="settings-switch-copy">
                {values?.isActive ? "Enabled" : "Disabled"}
              </span>
            </label>
          </SettingsField>

          <SettingsField label="Created By" error={errors?.createdBy}>
            <input
              className="settings-input"
              type="text"
              name="createdBy"
              value={normalizeDisplayValue(values?.createdBy)}
              onChange={onChange}
              disabled={isDisabled}
              readOnly
              aria-readonly="true"
              aria-invalid={Boolean(errors?.createdBy)}
            />
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}

export default PolicySettings;
