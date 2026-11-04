import React, { useEffect, useState } from "react";
import { toastError, toastSuccess } from "../components/common/Toast/toastService";
import { createExitInterview, getExitInterviews } from "../services/exitInterviewService";
import { clearanceError, cv, rows } from "../Clearance/clearanceUtils";
import { isEmployee } from "../utils/authorization";
import "./ExitInterview.css";

const fields = [
  ["conductedBy", "Conducted By", "text"],
  ["reasonForLeaving", "Reason for Leaving", "textarea"],
  ["feedback", "Feedback", "textarea"],
  ["suggestions", "Suggestions", "textarea"],
  ["interviewDate", "Interview Date", "datetime-local"],
];

export default function ExitInterviewSection({ resignationId, available, onCompleted }) {
  const readOnly = isEmployee();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(available);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    conductedBy: "",
    reasonForLeaving: "",
    feedback: "",
    suggestions: "",
    interviewDate: "",
  });

  useEffect(() => {
    if (!available) return undefined;

    let active = true;

    getExitInterviews()
      .then((response) => {
        if (!active) return;

        const existing = rows(response.data).find(
          (item) =>
            String(cv(item, "resignationId", "ResignationId")) ===
            String(resignationId),
        );

        if (existing) {
          setRecord(existing);
          onCompleted?.();
          setForm({
            conductedBy: String(cv(existing, "conductedBy", "ConductedBy") || ""),
            reasonForLeaving: String(
              cv(existing, "reasonForLeaving", "ReasonForLeaving") || "",
            ),
            feedback: String(cv(existing, "feedback", "Feedback") || ""),
            suggestions: String(cv(existing, "suggestions", "Suggestions") || ""),
            interviewDate: String(
              cv(existing, "interviewDate", "InterviewDate") || "",
            ).slice(0, 16),
          });
        }
      })
      .catch((error) => {
        if (error?.response?.status !== 404) {
          toastError(clearanceError(error));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [available, resignationId, onCompleted]);

  if (!available) {
    return (
      <section className="clearance-section">
        <h3>Exit Interview</h3>
        <p>Exit Interview will be available after all department clearances are completed.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="clearance-section">
        <h3>Exit Interview</h3>
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </section>
    );
  }

  const submit = async (event) => {
    event.preventDefault();

    if (!form.interviewDate || !form.conductedBy.trim()) {
      return toastError("Conducted by and interview date are required.");
    }

    if (saving) return;

    setSaving(true);
    try {
      const response = await createExitInterview({
        resignationId: Number(resignationId),
        ...form,
        interviewDate: new Date(form.interviewDate).toISOString(),
      });

      setRecord(response.data?.data ?? response.data ?? { ...form, resignationId });
      onCompleted?.();
      toastSuccess("Exit interview submitted successfully.");
    } catch (error) {
      toastError(clearanceError(error));
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) {
    return (
      <section className="clearance-section">
        <h3>Exit Interview</h3>
        {!record ? (
          <p>No Exit Interview has been recorded.</p>
        ) : (
          <>
            <p>
              <span className="clearance-chip">Completed</span>
            </p>
            <div className="exit-interview-read-only-grid">
              {[["Status", "Completed"], ...fields.map(([key, label]) => [label, form[key]])].map(
                ([label, value]) => (
                  <div key={label}>
                    <small>{label}</small>
                    <strong>{value || "—"}</strong>
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="clearance-section">
      <h3>Exit Interview</h3>
      {record ? (
        <>
          <p>
            <span className="clearance-chip">Completed</span>
          </p>
          <div className="exit-interview-grid">
            {fields.map(([key, label, type]) => (
              <label className={type === "textarea" ? "wide" : ""} key={key}>
                {label}
                {type === "textarea" ? (
                  <textarea value={form[key]} readOnly />
                ) : (
                  <input type={type} value={form[key]} readOnly />
                )}
              </label>
            ))}
          </div>
        </>
      ) : (
        <form className="exit-interview-form" onSubmit={submit}>
          <div className="exit-interview-grid">
            {fields.map(([key, label, type]) => (
              <label className={type === "textarea" ? "wide" : ""} key={key}>
                {label}
                {type === "textarea" ? (
                  <textarea
                    value={form[key]}
                    onChange={(event) =>
                      setForm({ ...form, [key]: event.target.value })
                    }
                    disabled={saving}
                  />
                ) : (
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(event) =>
                      setForm({ ...form, [key]: event.target.value })
                    }
                    disabled={saving}
                  />
                )}
              </label>
            ))}
          </div>
          <button type="submit" disabled={saving}>
            {saving ? "Submitting…" : "Submit Exit Interview"}
          </button>
        </form>
      )}
    </section>
  );
}
