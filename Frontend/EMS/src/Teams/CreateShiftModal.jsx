import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";

const EMPTY_FORM = {
  shiftName: "",
  shiftCode: "",
  startTime: "",
  endTime: "",
  description: "",
};

function CreateShiftModal({ open, saving = false, onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  if (!open) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    ["shiftName", "shiftCode", "startTime", "endTime"].forEach((field) => {
      if (!String(form[field] || "").trim()) {
        const label = field === "shiftName" ? "Shift name" : field === "shiftCode" ? "Shift code" : field === "startTime" ? "Start time" : "End time";
        nextErrors[field] = `${label} is required.`;
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await onCreate({
      shiftName: form.shiftName.trim(),
      shiftCode: form.shiftCode.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    });
  };

  const fields = [
    { name: "shiftName", label: "Shift Name", type: "text" },
    { name: "shiftCode", label: "Shift Code", type: "text" },
    { name: "startTime", label: "Start Time", type: "time" },
    { name: "endTime", label: "End Time", type: "time" },
  ];

  return (
    <div className="team-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section className="team-modal team-modal-small" role="dialog" aria-modal="true" aria-labelledby="create-shift-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="team-modal-header">
          <div><h3 id="create-shift-title" className="team-modal-title">Create Shift</h3></div>
          <button type="button" className="team-modal-close" onClick={onClose} aria-label="Close" disabled={saving}><FaTimes /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="team-modal-body">
            <div className="team-modal-grid">
              {fields.map(({ name, label, type }) => (
                <label className="team-form-field" key={name}>
                  <label htmlFor={`create-${name}`}>{label}</label>
                  <input className="team-form-input" id={`create-${name}`} type={type} name={name} value={form[name]} onChange={updateField} required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} disabled={saving} />
                  {errors[name] && <small className="create-shift-error" id={`${name}-error`} role="alert">{errors[name]}</small>}
                </label>
              ))}
              <div className="team-form-field team-form-field-wide">
                <label htmlFor="create-description">Description (optional)</label>
                <textarea className="team-form-input" id="create-description" name="description" value={form.description} onChange={updateField} rows="3" disabled={saving} />
              </div>
            </div>
          </div>
          <div className="team-modal-footer">
            <button type="button" className="team-action-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="team-action-btn" disabled={saving}>{saving ? "Creating..." : "Create Shift"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CreateShiftModal;
