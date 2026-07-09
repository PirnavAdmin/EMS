import React from "react";
import {
  SettingsBanner,
  SettingsCard,
  SettingsField,
} from "./SettingsShared";
import { formatSettingsTimestamp } from "./settingsHelpers";

function AttendanceSettings({
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
          title="Attendance settings not loaded"
          message={loadError}
          tone="error"
        />
      )}

      {loading && !loadError && (
        <SettingsBanner
          title="Loading attendance settings"
          message="Fetching the latest attendance configuration from the backend."
          tone="info"
        />
      )}

      <SettingsCard
        title="Attendance Settings"
        description="Shape the working day, late mark, and checkout automation for the office."
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
            label="Office Start Time"
            required
            error={errors?.officeStartTime}
          >
            <input
              className="settings-input settings-time-input"
              type="time"
              name="officeStartTime"
              value={values?.officeStartTime || ""}
              onChange={onChange}
              disabled={disabled}
              step="300"
              aria-invalid={Boolean(errors?.officeStartTime)}
            />
          </SettingsField>

          <SettingsField
            label="Office End Time"
            required
            error={errors?.officeEndTime}
          >
            <input
              className="settings-input settings-time-input"
              type="time"
              name="officeEndTime"
              value={values?.officeEndTime || ""}
              onChange={onChange}
              disabled={disabled}
              step="300"
              aria-invalid={Boolean(errors?.officeEndTime)}
            />
          </SettingsField>

          <SettingsField
            label="Check-In Start Time"
            required
            error={errors?.checkInStartTime}
          >
            <input
              className="settings-input settings-time-input"
              type="time"
              name="checkInStartTime"
              value={values?.checkInStartTime || ""}
              onChange={onChange}
              disabled={disabled}
              step="300"
              aria-invalid={Boolean(errors?.checkInStartTime)}
            />
          </SettingsField>

          <SettingsField
            label="Late After Time"
            required
            error={errors?.lateAfterTime}
          >
            <input
              className="settings-input settings-time-input"
              type="time"
              name="lateAfterTime"
              value={values?.lateAfterTime || ""}
              onChange={onChange}
              disabled={disabled}
              step="300"
              aria-invalid={Boolean(errors?.lateAfterTime)}
            />
          </SettingsField>

          <SettingsField
            label="Checkout Time"
            required
            error={errors?.checkoutTime}
          >
            <input
              className="settings-input settings-time-input"
              type="time"
              name="checkoutTime"
              value={values?.checkoutTime || ""}
              onChange={onChange}
              disabled={disabled}
              step="300"
              aria-invalid={Boolean(errors?.checkoutTime)}
            />
          </SettingsField>

          <SettingsField
            label="Half Day Hours"
            required
            error={errors?.halfDayHours}
            hint="Use decimal values if your policy supports them."
          >
            <input
              className="settings-input"
              type="number"
              name="halfDayHours"
              value={values?.halfDayHours || ""}
              onChange={onChange}
              disabled={disabled}
              min="0"
              step="0.5"
              inputMode="decimal"
              placeholder="4"
              aria-invalid={Boolean(errors?.halfDayHours)}
            />
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}

export default AttendanceSettings;
