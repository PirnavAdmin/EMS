import React from "react";
import {
  SettingsBanner,
  SettingsCard,
  SettingsField,
} from "./SettingsShared";
import { formatSettingsTimestamp } from "./settingsHelpers";

function LeaveSettings({
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
          title="Leave settings not loaded"
          message={loadError}
          tone="error"
        />
      )}

      {loading && !loadError && (
        <SettingsBanner
          title="Loading leave settings"
          message="Fetching the latest leave configuration from the backend."
          tone="info"
        />
      )}

      <SettingsCard
        title="Leave Settings"
        description="Configure leave approval routing, notice periods, and attachment rules."
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
            label="Approval Roles"
            required
            error={errors?.approvalRoles}
            className="settings-field--full"
          >
            <textarea
              className="settings-textarea"
              name="approvalRoles"
              value={values?.approvalRoles || ""}
              onChange={onChange}
              disabled={disabled}
              rows={4}
              placeholder="HR, Manager"
              aria-invalid={Boolean(errors?.approvalRoles)}
            />
          </SettingsField>

          <SettingsField
            label="External Emails"
            required
            error={errors?.externalEmails}
            className="settings-field--full"
          >
            <textarea
              className="settings-textarea"
              name="externalEmails"
              value={values?.externalEmails || ""}
              onChange={onChange}
              disabled={disabled}
              rows={4}
              placeholder="leave-approvals@company.com, manager@company.com"
              aria-invalid={Boolean(errors?.externalEmails)}
            />
          </SettingsField>

          <SettingsField
            label="Cc Emails"
            required
            error={errors?.ccEmails}
            className="settings-field--full"
          >
            <textarea
              className="settings-textarea"
              name="ccEmails"
              value={values?.ccEmails || ""}
              onChange={onChange}
              disabled={disabled}
              rows={4}
              placeholder="hr@company.com, admin@company.com"
              aria-invalid={Boolean(errors?.ccEmails)}
            />
          </SettingsField>

          <SettingsField
            label="Allow Half Day"
            error={errors?.allowHalfDay}
            className="settings-field--toggle"
          >
            <label className="settings-switch" aria-disabled={disabled}>
              <input
                type="checkbox"
                name="allowHalfDay"
                checked={Boolean(values?.allowHalfDay)}
                onChange={onChange}
                disabled={disabled}
              />
              <span className="settings-switch-track" aria-hidden="true">
                <span className="settings-switch-thumb" />
              </span>
              <span className="settings-switch-copy">
                {values?.allowHalfDay ? "Enabled" : "Disabled"}
              </span>
            </label>
          </SettingsField>

          <SettingsField
            label="Max Leave Days"
            required
            error={errors?.maxLeaveDays}
          >
            <input
              className="settings-input"
              type="number"
              name="maxLeaveDays"
              value={values?.maxLeaveDays || ""}
              onChange={onChange}
              disabled={disabled}
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="12"
              aria-invalid={Boolean(errors?.maxLeaveDays)}
            />
          </SettingsField>

          <SettingsField
            label="Advance Notice Days"
            required
            error={errors?.advanceNoticeDays}
          >
            <input
              className="settings-input"
              type="number"
              name="advanceNoticeDays"
              value={values?.advanceNoticeDays || ""}
              onChange={onChange}
              disabled={disabled}
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="3"
              aria-invalid={Boolean(errors?.advanceNoticeDays)}
            />
          </SettingsField>

          <SettingsField
            label="Attachment Required"
            error={errors?.attachmentRequired}
            className="settings-field--toggle"
          >
            <label className="settings-switch" aria-disabled={disabled}>
              <input
                type="checkbox"
                name="attachmentRequired"
                checked={Boolean(values?.attachmentRequired)}
                onChange={onChange}
                disabled={disabled}
              />
              <span className="settings-switch-track" aria-hidden="true">
                <span className="settings-switch-thumb" />
              </span>
              <span className="settings-switch-copy">
                {values?.attachmentRequired ? "Required" : "Optional"}
              </span>
            </label>
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}

export default LeaveSettings;
