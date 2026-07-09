import React from "react";
import {
  SettingsBanner,
  SettingsCard,
  SettingsField,
} from "./SettingsShared";
import {
  formatSettingsTimestamp,
  getDynamicFieldType,
  humanizeSettingsKey,
} from "./settingsHelpers";

const META_KEYS = new Set(["__fieldTypes", "__policyOptions"]);

const getOptionValue = (option) => {
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

const getOptionLabel = (option) => {
  if (typeof option === "string") {
    return option;
  }

  return (
    option?.label ??
    option?.Label ??
    option?.policyTitle ??
    option?.PolicyTitle ??
    option?.name ??
    option?.Name ??
    option?.title ??
    option?.Title ??
    getOptionValue(option)
  );
};

const normalizeTextareaValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

const MULTILINE_FIELD_PATTERN =
  /(address|roles|emails|description|notes|message|content|body)/i;

function DynamicSettingsSection({
  title,
  description,
  values,
  errors,
  onChange,
  lastUpdated,
  loadError,
  disabled = false,
  loading = false,
  policyFieldName = null,
  policyOptions = [],
  onPolicyChange,
  selectLabel = "Policy Type",
  selectHint = "Choose the policy you want to edit.",
  emptyMessage = "No configurable fields were returned for this section.",
}) {
  const timestamp = formatSettingsTimestamp(lastUpdated);
  const fieldTypes = values?.__fieldTypes || {};
  const options = Array.isArray(policyOptions)
    ? policyOptions
    : Array.isArray(values?.__policyOptions)
      ? values.__policyOptions
      : [];
  const entries = Object.entries(values || {}).filter(
    ([key]) => !META_KEYS.has(key) && !String(key).startsWith("__")
  );
  const orderedEntries = [...entries].sort((left, right) => {
    if (left[0] === policyFieldName) {
      return -1;
    }

    if (right[0] === policyFieldName) {
      return 1;
    }

    return 0;
  });
  const hasVisibleFields = entries.length > 0;
  const isDisabled = disabled || loading;

  const renderInputForField = (key, rawValue) => {
    const fieldType = getDynamicFieldType(key, rawValue, fieldTypes);
    const value =
      fieldType === "boolean"
        ? Boolean(rawValue)
        : normalizeTextareaValue(rawValue);

    if (key === policyFieldName && (options.length > 0 || onPolicyChange)) {
      const handlePolicyChange = (event) => {
        if (typeof onPolicyChange === "function") {
          onPolicyChange(event.target.value);
          return;
        }

        onChange(event);
      };

      if (options.length > 0) {
        return (
          <SettingsField
            key={key}
            label={selectLabel}
            hint={selectHint}
            required
            error={errors?.[key]}
            className="settings-field--full"
          >
            <select
              className="settings-select"
              name={key}
              value={value || ""}
              onChange={handlePolicyChange}
              disabled={isDisabled}
              aria-invalid={Boolean(errors?.[key])}
            >
              <option value="" disabled>
                Select a policy
              </option>
              {options.map((option, index) => {
                const optionValue = normalizeTextareaValue(getOptionValue(option));
                return (
                  <option
                    key={`${optionValue || "empty"}-${index}`}
                    value={optionValue}
                  >
                    {getOptionLabel(option)}
                  </option>
                );
              })}
            </select>
          </SettingsField>
        );
      }
    }

    if (fieldType === "boolean") {
      return (
        <SettingsField
          key={key}
          label={humanizeSettingsKey(key)}
          error={errors?.[key]}
          className="settings-field--toggle"
        >
          <label className="settings-switch" aria-disabled={isDisabled}>
            <input
              type="checkbox"
              name={key}
              checked={Boolean(rawValue)}
              onChange={onChange}
              disabled={isDisabled}
            />
            <span className="settings-switch-track" aria-hidden="true">
              <span className="settings-switch-thumb" />
            </span>
            <span className="settings-switch-copy">
              {rawValue ? "Enabled" : "Disabled"}
            </span>
          </label>
        </SettingsField>
      );
    }

    if (
      key !== policyFieldName &&
      (fieldType === "json" || MULTILINE_FIELD_PATTERN.test(key))
    ) {
      return (
        <SettingsField
          key={key}
          label={humanizeSettingsKey(key)}
          error={errors?.[key]}
          className="settings-field--full"
        >
          <textarea
            className="settings-textarea"
            name={key}
            value={value}
            onChange={onChange}
            disabled={isDisabled}
            rows={6}
            aria-invalid={Boolean(errors?.[key])}
          />
        </SettingsField>
      );
    }

    if (key === policyFieldName) {
      return (
        <SettingsField
          key={key}
          label={humanizeSettingsKey(key)}
          error={errors?.[key]}
          className="settings-field--full"
        >
          <input
            className="settings-input"
            type="text"
            name={key}
            value={value}
            onChange={onChange}
            disabled={isDisabled}
            aria-invalid={Boolean(errors?.[key])}
          />
        </SettingsField>
      );
    }

    const inputType =
      fieldType === "email"
        ? "email"
        : fieldType === "url"
          ? "url"
          : fieldType === "time"
            ? "time"
            : fieldType === "number"
              ? "number"
              : "text";

    return (
      <SettingsField
        key={key}
        label={humanizeSettingsKey(key)}
        error={errors?.[key]}
      >
        <input
          className="settings-input"
          type={inputType}
          name={key}
          value={value}
          onChange={onChange}
          disabled={isDisabled}
          aria-invalid={Boolean(errors?.[key])}
          step={fieldType === "number" ? "1" : undefined}
        />
      </SettingsField>
    );
  };

  return (
    <div className="settings-tab-panel">
      {loadError && (
        <SettingsBanner title="Settings not loaded" message={loadError} tone="error" />
      )}

      {loading && !loadError && (
        <SettingsBanner
          title="Loading settings"
          message="Fetching the latest configuration from the server."
          tone="info"
        />
      )}

      <SettingsCard
        title={title}
        description={description}
        meta={
          timestamp ? (
            <span className="settings-last-updated">
              Last updated {timestamp}
            </span>
          ) : null
        }
      >
        {!hasVisibleFields ? (
          <SettingsBanner
            title="No fields available"
            message={emptyMessage}
            tone="info"
          />
        ) : (
          <div className="settings-form-grid settings-grid settings-grid-2">
            {orderedEntries.map(([key, rawValue]) =>
              renderInputForField(key, rawValue)
            )}
          </div>
        )}
      </SettingsCard>
    </div>
  );
}

export default DynamicSettingsSection;
