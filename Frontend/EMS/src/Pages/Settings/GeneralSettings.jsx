import React from "react";
import DynamicSettingsSection from "./DynamicSettingsSection";

function GeneralSettings({
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
      title="General Settings"
      description="Configure the general workspace data returned by the backend."
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

export default GeneralSettings;
