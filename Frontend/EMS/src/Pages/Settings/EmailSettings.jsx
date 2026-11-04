import React, { useCallback, useEffect, useState } from "react";
import { FaEdit, FaPlus, FaPowerOff, FaTimes } from "react-icons/fa";
import {
  SettingsBanner,
  SettingsCard,
  SettingsField,
} from "./SettingsShared";
import { formatSettingsTimestamp } from "./settingsHelpers";
import {
  fetchEmailPurposeMappings,
  fetchEmailSenderAccounts,
  saveEmailSenderAccount,
  saveEmailPurposeMapping,
} from "../../services/settingsService";

const EMPTY_SENDER = {
  senderEmail: "",
  senderPassword: "",
  smtpHost: "",
  smtpPort: "",
  enableSSL: false,
  displayName: "",
  isActive: true,
  hasPassword: false,
  purposes: [],
};

const validateSender = (sender, isEditing) => {
  const errors = {};
  if (!sender.senderEmail.trim()) {
    errors.senderEmail = "Sender Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.senderEmail.trim())) {
    errors.senderEmail = "Enter a valid sender email.";
  }
  if (!sender.smtpHost.trim()) errors.smtpHost = "SMTP Host is required.";
  if (!isEditing && !sender.senderPassword.trim()) {
    errors.senderPassword = "SMTP Password is required when adding a sender account.";
  }
  const port = Number(sender.smtpPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.smtpPort = "Enter a valid SMTP port between 1 and 65535.";
  }
  if (sender.purposes.length && !sender.isActive) {
    errors.isActive = "Activate this sender before assigning it as a default.";
  }
  return errors;
};

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
  const [senderAccounts, setSenderAccounts] = useState([]);
  const [purposeMappings, setPurposeMappings] = useState([]);
  const [supportedPurposes, setSupportedPurposes] = useState([]);
  const [senderLoading, setSenderLoading] = useState(true);
  const [senderSaving, setSenderSaving] = useState(false);
  const [senderError, setSenderError] = useState("");
  const [senderLoadError, setSenderLoadError] = useState("");
  const [senderFormErrors, setSenderFormErrors] = useState({});
  const [senderForm, setSenderForm] = useState(EMPTY_SENDER);
  const [editingSenderId, setEditingSenderId] = useState(null);
  const [senderFormOpen, setSenderFormOpen] = useState(false);

  const loadSenderData = useCallback(async () => {
    setSenderLoading(true);
    setSenderLoadError("");
    try {
      const [accounts, mappings] = await Promise.all([
        fetchEmailSenderAccounts(),
        fetchEmailPurposeMappings(),
      ]);
      setSenderAccounts(accounts);
      setPurposeMappings(mappings.mappings);
      setSupportedPurposes(mappings.supportedPurposes);
    } catch (error) {
      setSenderLoadError(error?.message || "Sender email settings could not be loaded.");
    } finally {
      setSenderLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSenderData();
  }, [loadSenderData]);

  const startAddSender = () => {
    setEditingSenderId(null);
    setSenderForm(EMPTY_SENDER);
    setSenderFormErrors({});
    setSenderError("");
    setSenderFormOpen(true);
  };

  const startEditSender = (account) => {
    const assignedPurposes = purposeMappings.filter(
      (mapping) => mapping.senderAccountId === account.id
    ).map((mapping) => mapping.purpose);
    setEditingSenderId(account.id);
    setSenderForm({
      ...EMPTY_SENDER,
      ...account,
      senderPassword: "",
      purposes: assignedPurposes,
    });
    setSenderFormErrors({});
    setSenderError("");
    setSenderFormOpen(true);
  };

  const saveSender = async (event) => {
    event.preventDefault();
    const validationErrors = validateSender(senderForm, Boolean(editingSenderId));
    setSenderFormErrors(validationErrors);
    setSenderError("");
    if (Object.keys(validationErrors).length) return;

    setSenderSaving(true);
    try {
      const savedId = await saveEmailSenderAccount(senderForm, editingSenderId);
      let senderAccountId = savedId || editingSenderId;
      if (senderForm.purposes.length && !senderAccountId) {
        const accounts = await fetchEmailSenderAccounts();
        senderAccountId = accounts.find((account) =>
          account.senderEmail.toLowerCase() === senderForm.senderEmail.trim().toLowerCase()
        )?.id;
      }
      for (const purpose of senderForm.purposes) {
        if (!senderAccountId) {
          throw new Error("Sender account was saved, but its ID was not returned; purpose assignment could not be completed.");
        }
        await saveEmailPurposeMapping(purpose, senderAccountId);
      }
      const [refreshedAccounts, mappings] = await Promise.all([
        fetchEmailSenderAccounts(),
        fetchEmailPurposeMappings(),
      ]);
      setSenderAccounts(refreshedAccounts);
      setPurposeMappings(mappings.mappings);
      setSupportedPurposes(mappings.supportedPurposes);
      setSenderFormOpen(false);
      setSenderForm(EMPTY_SENDER);
      setEditingSenderId(null);
    } catch (error) {
      setSenderError(error?.message || "Sender email account could not be saved.");
      await loadSenderData();
    } finally {
      setSenderSaving(false);
    }
  };

  const toggleSenderActive = async (account) => {
    const assignedPurposes = purposeMappings
      .filter((mapping) => mapping.senderAccountId === account.id)
      .map((mapping) => supportedPurposes.find((purpose) => purpose.code === mapping.purpose)?.label || mapping.purpose);
    if (account.isActive && assignedPurposes.length) {
      setSenderError(
        `Reassign ${assignedPurposes.join(", ")} to another sender before deactivating this account.`
      );
      return;
    }
    const nextIsActive = !account.isActive;
    const action = nextIsActive ? "Activate" : "Deactivate";
    if (!window.confirm(`${action} ${account.senderEmail}?`)) return;
    setSenderSaving(true);
    setSenderError("");
    try {
      await saveEmailSenderAccount({ ...account, isActive: nextIsActive }, account.id);
      await loadSenderData();
    } catch (error) {
      setSenderError(error?.message || "Sender email account could not be deactivated.");
    } finally {
      setSenderSaving(false);
    }
  };

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
            hint="Saved passwords are not prefilled. Enter the SMTP password to save this configuration."
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
              placeholder="smtp.gmail.com"
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

      <SettingsCard
        title="Sender Email Accounts"
        description="Manage SMTP senders and assign the default sender for each email type."
        meta={
          <button
            type="button"
            className="app-button-primary hrms-workflow-button"
            onClick={startAddSender}
            disabled={senderSaving || Boolean(senderLoadError)}
          >
            <FaPlus aria-hidden="true" /> Add New Sender
          </button>
        }
      >
        {senderError && (
          <SettingsBanner
            title="Sender email settings issue"
            message={senderError}
            tone="error"
          />
        )}
        {senderLoadError ? (
          <div>
            <SettingsBanner
              title="Sender email settings not loaded"
              message={senderLoadError}
              tone="error"
            />
            <button
              type="button"
              className="app-button-secondary hrms-workflow-button"
              onClick={() => void loadSenderData()}
              disabled={senderLoading}
            >
              {senderLoading ? "Retrying..." : "Retry"}
            </button>
          </div>
        ) : senderLoading ? (
          <p role="status">Loading sender email accounts...</p>
        ) : (
          <div className="hrms-table-wrap">
            <table className="hrms-settings-table email-sender-accounts-table">
              <thead>
                <tr>
                  <th>Sender Email</th>
                  <th>Display Name</th>
                  <th>SMTP Server</th>
                  <th>Default For</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {senderAccounts.length ? senderAccounts.map((account) => {
                  const purposes = purposeMappings
                    .filter((mapping) => mapping.senderAccountId === account.id)
                    .map((mapping) =>
                      supportedPurposes.find((purpose) => purpose.code === mapping.purpose)?.label
                        || mapping.purpose
                    );
                  return (
                    <tr key={account.id}>
                      <td>{account.senderEmail || "—"}</td>
                      <td>{account.displayName || "—"}</td>
                      <td>{account.smtpHost || "—"}{account.smtpPort ? `:${account.smtpPort}` : ""}</td>
                      <td>{purposes.length ? purposes.join(", ") : "—"}</td>
                      <td>{account.isActive ? "Active" : "Inactive"}</td>
                      <td>
                        <div className="hrms-row-actions">
                          <button
                            type="button"
                            className="settings-icon-button"
                            aria-label={`Edit ${account.senderEmail}`}
                            onClick={() => startEditSender(account)}
                            disabled={senderSaving || Boolean(senderLoadError)}
                          >
                            <FaEdit aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`settings-icon-button${account.isActive ? " is-danger" : ""}`}
                            aria-label={`${account.isActive ? "Deactivate" : "Activate"} ${account.senderEmail}`}
                            onClick={() => void toggleSenderActive(account)}
                            disabled={senderSaving || Boolean(senderLoadError)}
                          >
                            <FaPowerOff aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : senderError ? (
                  <tr><td className="hrms-table-state" colSpan="6">Could not verify sender accounts. See the error above and retry.</td></tr>
                ) : (
                  <tr><td className="hrms-table-state" colSpan="6">No sender email accounts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {senderFormOpen && (
          <form className="settings-form-grid settings-grid settings-grid-2" onSubmit={saveSender} noValidate>
            <h4 className="settings-field--full">
              {editingSenderId ? "Edit Sender Account" : "Add New Sender"}
            </h4>
            <SettingsField label="Sender Email" required error={senderFormErrors.senderEmail}>
              <input
                className="settings-input"
                type="email"
                value={senderForm.senderEmail}
                onChange={(event) => setSenderForm((current) => ({ ...current, senderEmail: event.target.value }))}
                disabled={senderSaving}
                aria-invalid={Boolean(senderFormErrors.senderEmail)}
              />
            </SettingsField>
            <SettingsField
              label="SMTP Password"
              required={!editingSenderId}
              error={senderFormErrors.senderPassword}
              hint={editingSenderId
                ? senderForm.hasPassword
                  ? "Leave blank to keep the configured password unchanged, or enter a new password to replace it."
                  : "Enter a new password; stored passwords are never returned or prefilled."
                : "Required for a new sender account."}
            >
              <input
                className="settings-input"
                type="password"
                value={senderForm.senderPassword}
                required={!editingSenderId}
                onChange={(event) => setSenderForm((current) => ({ ...current, senderPassword: event.target.value }))}
                autoComplete="new-password"
                placeholder={editingSenderId ? "Leave blank to keep current password" : "Enter SMTP password"}
                disabled={senderSaving}
                aria-invalid={Boolean(senderFormErrors.senderPassword)}
              />
            </SettingsField>
            <SettingsField label="SMTP Host" required error={senderFormErrors.smtpHost}>
              <input
                className="settings-input"
                value={senderForm.smtpHost}
                onChange={(event) => setSenderForm((current) => ({ ...current, smtpHost: event.target.value }))}
                disabled={senderSaving}
                aria-invalid={Boolean(senderFormErrors.smtpHost)}
              />
            </SettingsField>
            <SettingsField label="SMTP Port" required error={senderFormErrors.smtpPort}>
              <input
                className="settings-input"
                type="number"
                min="1"
                max="65535"
                step="1"
                value={senderForm.smtpPort}
                onChange={(event) => setSenderForm((current) => ({ ...current, smtpPort: event.target.value }))}
                disabled={senderSaving}
                aria-invalid={Boolean(senderFormErrors.smtpPort)}
              />
            </SettingsField>
            <SettingsField label="Display Name">
              <input
                className="settings-input"
                value={senderForm.displayName}
                onChange={(event) => setSenderForm((current) => ({ ...current, displayName: event.target.value }))}
                disabled={senderSaving}
              />
            </SettingsField>
            <SettingsField
              label="Default For"
              hint="Select one or more server-supported purposes. Existing assignments are preserved; selecting a purpose assigned to another sender reassigns it."
            >
              <div className="settings-form-grid">
                {supportedPurposes.map(({ code, label }) => {
                  const alreadyAssignedToSender = purposeMappings.some(
                    (mapping) =>
                      mapping.purpose === code &&
                      mapping.senderAccountId === editingSenderId
                  );
                  const checked = senderForm.purposes.includes(code);
                  return (
                    <label className="settings-switch-copy" key={code}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setSenderForm((current) => ({
                          ...current,
                          purposes: event.target.checked
                            ? [...new Set([...current.purposes, code])]
                            : current.purposes.filter((purpose) => purpose !== code),
                        }))}
                        disabled={senderSaving || senderLoading || Boolean(senderLoadError) || alreadyAssignedToSender}
                      />
                      {label}
                      {alreadyAssignedToSender ? " (currently assigned)" : ""}
                    </label>
                  );
                })}
                {!supportedPurposes.length && !senderLoading && !senderLoadError && (
                  <span>No supported email purposes are available.</span>
                )}
              </div>
            </SettingsField>
            <SettingsField label="Enable SSL" className="settings-field--toggle">
              <label className="settings-switch">
                <input
                  type="checkbox"
                  checked={Boolean(senderForm.enableSSL)}
                  onChange={(event) => setSenderForm((current) => ({ ...current, enableSSL: event.target.checked }))}
                  disabled={senderSaving}
                />
                <span className="settings-switch-track" aria-hidden="true">
                  <span className="settings-switch-thumb" />
                </span>
                <span className="settings-switch-copy">{senderForm.enableSSL ? "Enabled" : "Disabled"}</span>
              </label>
            </SettingsField>
            <SettingsField label="Account Status" error={senderFormErrors.isActive} className="settings-field--toggle">
              <label className="settings-switch">
                <input
                  type="checkbox"
                  checked={Boolean(senderForm.isActive)}
                  onChange={(event) => setSenderForm((current) => ({ ...current, isActive: event.target.checked }))}
                  disabled={senderSaving}
                />
                <span className="settings-switch-track" aria-hidden="true">
                  <span className="settings-switch-thumb" />
                </span>
                <span className="settings-switch-copy">{senderForm.isActive ? "Active" : "Inactive"}</span>
              </label>
            </SettingsField>
            <div className="settings-field--full hrms-settings-actions">
              <button type="button" className="app-button-secondary hrms-workflow-button" onClick={() => setSenderFormOpen(false)} disabled={senderSaving}>
                <FaTimes aria-hidden="true" /> Cancel
              </button>
              <button type="submit" className="app-button-primary hrms-workflow-button" disabled={senderSaving}>
                {senderSaving ? "Saving..." : "Save Sender"}
              </button>
            </div>
          </form>
        )}
        </SettingsCard>
    </div>
  );
}

export default EmailSettings;
