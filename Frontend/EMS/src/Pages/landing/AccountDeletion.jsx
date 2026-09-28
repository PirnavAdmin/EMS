import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaUserShield,
  FaEnvelope,
  FaMapMarkerAlt,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import pirnavLogo from "../../assets/pirnav.png";
import "./PrivacyPolicy.css";
import "./LandingPage.css";
import "./AccountDeletion.css";

const EMPTY_FORM = {
  requestType: "",
  employeeId: "",
  employeeName: "",
  email: "",
  phone: "",
  reason: "",
  otherReason: "",
  acknowledgement: false,
};

const REASONS = [
  "Leaving the organization",
  "No longer using the account",
  "Privacy concerns",
  "Duplicate account",
  "Account created incorrectly",
  "Other",
];

const ACCOUNT_FIELDS = [
  { name: "employeeId", label: "Employee ID", placeholder: "Enter your employee ID", type: "text", autoComplete: "off" },
  { name: "employeeName", label: "Employee Name", placeholder: "Enter your full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email Address", placeholder: "Enter your registered email address", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone Number", placeholder: "Enter your phone number", type: "tel", autoComplete: "tel" },
];

const SOCIAL_LINKS = [
  { label: "LinkedIn", icon: FaLinkedinIn },
  { label: "Facebook", icon: FaFacebookF },
  { label: "Instagram", icon: FaInstagram },
  { label: "YouTube", icon: FaYoutube },
];

const FOOTER_LINKS = {
  "Quick Links": [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Request Demo", href: "/#request-demo" },
  ],
  Company: [
    { label: "About", href: "/#home" },
    { label: "Security", href: "/#features" },
    { label: "Careers", href: "/#pricing" },
    { label: "Contact", href: "/#contact" },
  ],
  Resources: [
    { label: "Help Center", href: "/#contact" },
    { label: "Documentation", href: "/#features" },
    { label: "Security", href: "/#features" },
    { label: "FAQ", href: "/#contact" },
  ],
};

const FOOTER_POLICY_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Account Deletion", href: "/account-deletion" },
  { label: "Terms of Service", href: "#terms" },
  { label: "Cookie Policy", href: "#cookies" },
];

const validateForm = (values) => {
  const errors = {};

  if (!["delete", "deactivate"].includes(values.requestType)) {
    errors.requestType = "Please select a request type.";
  }
  if (!values.employeeId.trim()) errors.employeeId = "Please enter your employee ID.";
  if (!values.employeeName.trim()) errors.employeeName = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  const phone = values.phone.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  if (!/^\+?[\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Please enter a phone number with 7–15 digits; spaces, +, parentheses and hyphens are allowed.";
  }
  if (!REASONS.includes(values.reason)) errors.reason = "Please select a reason.";
  if (values.reason === "Other" && !values.otherReason.trim()) {
    errors.otherReason = "Please specify your reason.";
  }
  if (!values.acknowledgement) {
    errors.acknowledgement = "Please acknowledge the request before submitting.";
  }
  return errors;
};

const AccountDeletion = () => {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [submittedType, setSubmittedType] = useState(null);
  const dialogRef = useRef(null);
  const submitRef = useRef(null);
  const isDeactivation = form.requestType === "deactivate";

  useEffect(() => {
    if (!submittedType) return;

    const dialog = dialogRef.current;
    const submitButton = submitRef.current;
    const previousOverflow = document.body.style.overflow;
    // A native modal keeps keyboard focus inside and makes the background inert.
    dialog.showModal();
    document.body.style.overflow = "hidden";
    dialog.querySelector("button").focus();

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      submitButton?.focus();
    };
  }, [submittedType]);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    const nextForm = { ...form, [name]: type === "checkbox" ? checked : value };
    if (name === "reason" && value !== "Other") nextForm.otherReason = "";
    // Changing the action requires acknowledging its new meaning.
    if (name === "requestType") nextForm.acknowledgement = false;
    setForm(nextForm);
    if (Object.keys(errors).length) setErrors(validateForm(nextForm));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      event.currentTarget.elements.namedItem(firstInvalidField)?.focus();
      return;
    }

    // TODO: Add backend API integration here and reset only after it succeeds.
    // For now, success is frontend-only: nothing is sent or persisted.
    setSubmittedType(form.requestType);
    setForm({ ...EMPTY_FORM });
    setErrors({});
  };

  const fieldProps = (name) => ({
    id: `account-deletion-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    required: true,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `account-deletion-${name}-error` : undefined,
  });

  const renderError = (name) => errors[name] && (
    <p className="account-deletion-error" id={`account-deletion-${name}-error`} aria-live="polite">
      {errors[name]}
    </p>
  );

  return (
    <div className="privacy-policy-page">
      <header className="privacy-policy-header">
        <div className="privacy-policy-header-inner">
          <Link to="/" className="privacy-policy-logo">
            <img src={pirnavLogo} alt="Pirnav Software Solutions Pvt. Ltd." />
          </Link>
          <Link to="/" className="privacy-policy-back">
            <FaArrowLeft aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="privacy-policy-main">
        <div className="privacy-policy-shell">
          <div className="privacy-policy-heading">
            <div className="privacy-policy-eyebrow">
              <FaUserShield aria-hidden="true" />
              <span>PIRNAV ACCOUNT MANAGEMENT</span>
            </div>
            <h1>Account Deletion &amp; Deactivation</h1>
            <p>PIRNAV HRMS – Employee Management System</p>
          </div>

          <article className="privacy-policy-card">
            <section className="privacy-policy-section">
              <h2>Request Account Deletion or Deactivation</h2>
              <p>
                Use this page to request deletion or deactivation of your PIRNAV HRMS account.
                Please provide the information associated with your employee account so that
                our HR team can review and process your request.
              </p>
              <p>
                Submitting this form creates a request only. Our HR team may contact you to
                verify your identity and confirm the request before the account is deleted
                or deactivated.
              </p>
              <p>All fields are required.</p>

              <form className="account-deletion-form" onSubmit={handleSubmit} noValidate>
                <div className="account-deletion-field">
                  <label htmlFor="account-deletion-requestType">Request Type</label>
                  <select {...fieldProps("requestType")}>
                    <option value="">Select a request type</option>
                    <option value="delete">Delete Account</option>
                    <option value="deactivate">Deactivate Account</option>
                  </select>
                  {renderError("requestType")}
                </div>

                <div className="account-deletion-fields">
                  {ACCOUNT_FIELDS.map(({ name, label, ...inputProps }) => (
                    <div className="account-deletion-field" key={name}>
                      <label htmlFor={`account-deletion-${name}`}>{label}</label>
                      <input {...inputProps} {...fieldProps(name)} />
                      {renderError(name)}
                    </div>
                  ))}
                </div>

                <div className="account-deletion-field">
                  <label htmlFor="account-deletion-reason">Reason</label>
                  <select {...fieldProps("reason")}>
                    <option value="">Select a reason</option>
                    {REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                  </select>
                  {renderError("reason")}
                </div>

                {form.reason === "Other" && (
                  <div className="account-deletion-field">
                    <label htmlFor="account-deletion-otherReason">Please specify your reason</label>
                    <textarea
                      {...fieldProps("otherReason")}
                      placeholder="Please tell us why you want to delete or deactivate your account"
                      rows={4}
                    />
                    {renderError("otherReason")}
                  </div>
                )}

                <div className="privacy-policy-contact" aria-live="polite">
                  <p>
                    {isDeactivation
                      ? "Account deactivation disables access to the account but does not necessarily delete the account or associated information."
                      : "Account deletion may result in permanent removal or anonymization of account information associated with your PIRNAV HRMS account. Certain employment, payroll, tax, attendance, financial, security, legal, or compliance records may be retained where required or permitted by law or legitimate organizational obligations."}
                  </p>
                </div>

                <div className="account-deletion-field">
                  <label className="account-deletion-acknowledgement" htmlFor="account-deletion-acknowledgement">
                    <input
                      id="account-deletion-acknowledgement"
                      name="acknowledgement"
                      type="checkbox"
                      checked={form.acknowledgement}
                      onChange={handleChange}
                      required
                      aria-invalid={Boolean(errors.acknowledgement)}
                      aria-describedby={errors.acknowledgement ? "account-deletion-acknowledgement-error" : undefined}
                    />
                    <span>
                      {isDeactivation
                        ? "I understand that I am submitting a request to deactivate my PIRNAV HRMS account and that deactivation does not constitute permanent account deletion."
                        : "I understand that I am submitting a request to delete my PIRNAV HRMS account and associated data, subject to identity verification and applicable data-retention requirements."}
                    </span>
                  </label>
                  {renderError("acknowledgement")}
                </div>

                <button ref={submitRef} className="landing-primary-action account-deletion-submit" type="submit">
                  {form.requestType ? `Submit ${isDeactivation ? "Deactivation" : "Deletion"} Request` : "Submit Request"}
                </button>
              </form>
            </section>
          </article>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-shell">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <div className="landing-footer-logo">
                <img src={pirnavLogo} alt="Pirnav" className="landing-footer-mark" />
              </div>
              <div className="landing-footer-brand-copy">
                <h3 className="landing-footer-brand-name">Pirnav HRMS</h3>
                <p className="landing-footer-brand-tagline">Intelligent people operations.</p>
              </div>
              <p className="landing-footer-copy">
                A modern HRMS platform for smarter employee management, attendance, payroll,
                leave, and workforce operations.
              </p>
              <div className="landing-footer-socials" aria-label="Social links">
                {SOCIAL_LINKS.map(({ label, icon }) => (
                  <a className="landing-social-link" href="/#contact" aria-label={label} key={label}>
                    {React.createElement(icon, { "aria-hidden": true })}
                  </a>
                ))}
              </div>
            </div>
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div className="landing-footer-links-group" key={title}>
                <h3 className="landing-footer-title">{title}</h3>
                <div className="landing-footer-links">
                  {links.map((link) => (
                    <a className="landing-footer-link" href={link.href} key={link.label}>{link.label}</a>
                  ))}
                </div>
              </div>
            ))}
            <div className="landing-footer-links-group">
              <h3 className="landing-footer-title">Contact</h3>
              <div className="landing-footer-contact">
                <a className="landing-footer-contact-link" href="mailto:contact@pirnav.com">
                  <FaEnvelope aria-hidden="true" /><span>contact@pirnav.com</span>
                </a>
                <a className="landing-footer-contact-link" href="mailto:contact@pirnav.com">
                  <FaEnvelope aria-hidden="true" /><span>contact@pirnav.com</span>
                </a>
                <div className="landing-footer-contact-link landing-footer-contact-link--static">
                  <FaMapMarkerAlt aria-hidden="true" /><span>India</span>
                </div>
              </div>
            </div>
          </div>
          <div className="landing-footer-divider" aria-hidden="true" />
          <div className="landing-footer-bottom">
            <p className="landing-footer-bottom-copy">{"\u00A9"} 2026 Pirnav. All rights reserved.</p>
            <nav className="landing-footer-bottom-links" aria-label="Footer policy links">
              {FOOTER_POLICY_LINKS.map((link) => (
                <Link className="landing-footer-bottom-link" to={link.href} key={link.label}>{link.label}</Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>

      <dialog
        ref={dialogRef}
        className="account-deletion-success"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-deletion-success-title"
        aria-describedby="account-deletion-success-message"
        onKeyDown={(event) => {
          // Done is the dialog's only control; keep Tab and Shift+Tab on it.
          if (event.key === "Tab") {
            event.preventDefault();
            event.currentTarget.querySelector("button").focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          setSubmittedType(null);
        }}
      >
        <FaCheckCircle className="account-deletion-success-icon" aria-hidden="true" />
        <h2 id="account-deletion-success-title">Request Submitted Successfully</h2>
        <p id="account-deletion-success-message">
          Your account {submittedType === "deactivate" ? "deactivation" : "deletion"} request
          has been submitted successfully. Our HR team will review your request and contact
          you shortly regarding the next steps.
        </p>
        <button className="landing-primary-action account-deletion-submit" type="button" onClick={() => setSubmittedType(null)}>
          Done
        </button>
      </dialog>
    </div>
  );
};

export default AccountDeletion;
