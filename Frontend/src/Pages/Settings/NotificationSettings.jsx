import React from "react";
import DynamicSettingsSection from "./DynamicSettingsSection";

function NotificationSettings({
  values,
  errors,
  onChange,
  lastUpdated,
  loadError,
  loading = false,
  disabled = false,
}) {
  return (
    <DynamicSettingsSection
      title="Notification Settings"
      description="Configure the notification data returned by the backend."
      values={values}
      errors={errors}
      onChange={onChange}
      lastUpdated={lastUpdated}
      loadError={loadError}
      loading={loading}
      disabled={disabled}
    />
  );
}

export default NotificationSettings;
