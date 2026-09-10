import React, { useEffect, useState } from "react";
import { FaRedo, FaSave } from "react-icons/fa";
import EmptyState from "../components/EmptyState";
import { getSuperAdminSettings, updateSuperAdminSettings } from "../services/superAdminService";
import "./SuperAdmin.css";

const EDITABLE_FIELDS = [["appName", "Application name", "text"], ["companyLogoUrl", "Company logo URL", "url"], ["defaultTimeZone", "Default time zone", "text"], ["defaultLanguage", "Default language", "text"], ["sessionTimeoutMinutes", "Session timeout (minutes)", "number"], ["maxFileUploadSizeMB", "Maximum upload size (MB)", "number"], ["allowedDocumentTypes", "Allowed document types", "text"]];
const EMPTY_SETTINGS = { appName: "", companyLogoUrl: "", defaultTimeZone: "", defaultLanguage: "", sessionTimeoutMinutes: 0, maxFileUploadSizeMB: 0, allowedDocumentTypes: "", maintenanceMode: false, generalNotes: "" };

function SuperAdminSettings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const loadSettings = async () => { setLoading(true); setError(""); setMessage(""); try { const response = await getSuperAdminSettings(); setSettings(response); setForm({ ...EMPTY_SETTINGS, ...response }); } catch { setSettings(null); setError("Platform settings could not be loaded. Please try again."); } finally { setLoading(false); } };
  useEffect(() => { loadSettings(); }, []);
  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const saveSettings = async (event) => { event.preventDefault(); setSaving(true); setError(""); setMessage(""); try { const response = await updateSuperAdminSettings(form); setSettings(response); setForm((current) => ({ ...current, ...response })); setMessage("Platform settings updated successfully."); } catch { setError("Platform settings could not be saved. Please try again."); } finally { setSaving(false); } };

  return <main className="super-admin-page super-admin-settings-page"><div className="page-header"><div><h1>Platform Settings</h1><p>Manage the configuration for the EMS platform.</p></div><button className="secondary-btn" type="button" onClick={loadSettings} disabled={loading || saving}><FaRedo /> Refresh</button></div>{error && <p className="super-admin-settings-error" role="alert">{error}</p>}{message && <p className="super-admin-settings-success" role="status">{message}</p>}{loading ? <div className="super-admin-empty">Loading platform settings...</div> : !settings ? <EmptyState message="No platform settings found." /> : <form className="super-admin-settings-form" onSubmit={saveSettings}><section className="super-admin-settings-grid">{EDITABLE_FIELDS.map(([key, label, type]) => <label className="super-admin-setting-field" key={key}><span>{label}</span><input type={type} min={type === "number" ? "0" : undefined} value={form[key] ?? ""} onChange={(event) => updateField(key, event.target.value)} /></label>)}<label className="super-admin-setting-field super-admin-setting-field--toggle"><span>Maintenance mode</span><input type="checkbox" checked={Boolean(form.maintenanceMode)} onChange={(event) => updateField("maintenanceMode", event.target.checked)} /></label><label className="super-admin-setting-field super-admin-setting-field--wide"><span>General notes</span><textarea rows="4" value={form.generalNotes ?? ""} onChange={(event) => updateField("generalNotes", event.target.value)} /></label></section><section className="super-admin-email-settings"><h2>Email configuration</h2><p><strong>Status:</strong> {settings.emailConfigured ? "Configured" : "Not configured"}</p><p><strong>SMTP host:</strong> {settings.smtpHost || "Not configured"}</p><p><strong>Sender email:</strong> {settings.senderEmail || "Not configured"}</p></section><div className="super-admin-settings-actions"><button className="primary-btn" type="submit" disabled={saving}><FaSave /> {saving ? "Saving..." : "Save settings"}</button></div></form>}</main>;
}

export default SuperAdminSettings;
