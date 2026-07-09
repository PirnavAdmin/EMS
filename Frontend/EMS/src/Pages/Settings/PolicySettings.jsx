import React from "react";
import DynamicSettingsSection from "./DynamicSettingsSection";

function PolicySettings(props) {
  return (
    <DynamicSettingsSection
      {...props}
      title="Policy Settings"
      description="Select a policy type and edit the configuration returned by the backend."
      policyFieldName="type"
      selectLabel="Policy Type"
      selectHint="Choose which policy record to edit."
      emptyMessage="No policies were returned by the backend."
    />
  );
}

export default PolicySettings;
