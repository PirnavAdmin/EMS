import React, { useCallback, useEffect, useState } from "react";
import { FaRedo, FaSave } from "react-icons/fa";
import { isValidEmail } from "../utils/validation";
import {
  createLandingPageContactEmail,
  getLandingPageContactEmail,
  isLandingPageContactEmailNotConfigured,
  notifyLandingPageContactEmailUpdated,
  updateLandingPageContactEmail,
} from "../services/landingContactEmailService";
import { SettingsCard, SettingsField } from "../Pages/Settings/SettingsShared";

function ContactEmailSettings() {
  const [contactEmail, setContactEmail] = useState("");
  const [configured, setConfigured] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadContactEmail = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const savedEmail = await getLandingPageContactEmail();
      setContactEmail(savedEmail);
      setConfigured(true);
    } catch (requestError) {
      if (isLandingPageContactEmailNotConfigured(requestError)) {
        setContactEmail("");
        setConfigured(false);
      } else {
        setConfigured(null);
        setError("Landing page contact email could not be loaded. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContactEmail();
  }, [loadContactEmail]);

  const saveContactEmail = async (event) => {
    event.preventDefault();
    const normalizedEmail = contactEmail.trim();
    setError("");
    setMessage("");

    if (normalizedEmail.length > 320 || !isValidEmail(normalizedEmail)) {
      setError(
        normalizedEmail.length > 320
          ? "Email address must be 320 characters or fewer."
          : "Enter a valid email address."
      );
      return;
    }

    if (saving || configured === null) return;
    setSaving(true);
    try {
      if (configured) {
        await updateLandingPageContactEmail(normalizedEmail);
      } else {
        await createLandingPageContactEmail(normalizedEmail);
      }
      setContactEmail(normalizedEmail);
      setConfigured(true);
      setMessage("Landing page contact email saved successfully.");
      notifyLandingPageContactEmailUpdated(normalizedEmail);
    } catch {
      setError("Landing page contact email could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title="Landing Page Contact Email"
      description="Manage the contact email shown on the landing page."
      className="super-admin-workspace-card"
    >
      <form className="settings-form-grid" onSubmit={saveContactEmail} noValidate>
        <SettingsField label="Contact Email" required>
          <input
            className="settings-input"
            type="email"
            autoComplete="email"
            maxLength={320}
            value={contactEmail}
            onChange={(event) => {
              setContactEmail(event.target.value);
              setMessage("");
              setError("");
            }}
            disabled={loading || saving}
            aria-invalid={Boolean(error)}
          />
        </SettingsField>

        {loading && <p role="status">Loading landing page contact email...</p>}
        {error && (
          <div className="settings-field--full" role="alert">
            <p className="super-admin-logo-error">{error}</p>
            {configured === null && (
              <button
                type="button"
                className="super-admin-workspace-secondary"
                onClick={() => void loadContactEmail()}
                disabled={loading || saving}
              >
                <FaRedo aria-hidden="true" /> Retry loading
              </button>
            )}
          </div>
        )}
        {message && (
          <p className="settings-banner is-success" role="status">
            {message}
          </p>
        )}

        <div className="super-admin-workspace-actions settings-field--full">
          <button
            type="submit"
            className="super-admin-workspace-primary"
            disabled={loading || saving || configured === null}
          >
            <FaSave aria-hidden="true" /> {saving ? "Saving..." : "Save contact email"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

export default ContactEmailSettings;
