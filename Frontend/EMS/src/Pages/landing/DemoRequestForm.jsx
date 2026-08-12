import React, { useId } from "react";
import { FaArrowRight } from "react-icons/fa";

const COMPANY_SIZE_OPTIONS = [
  "1-10 Employees",
  "11-25 Employees",
  "26-50 Employees",
  "51-100 Employees",
  "101-250 Employees",
  "251-500 Employees",
  "500+",
];



const DemoField = ({
  as = "input",
  className = "",
  children,
  error,
  fullWidth = false,
  id,
  label,
  required = false,
  revealDelay = 0,
  ...controlProps
}) => {
  const controlClassName = [
    "landing-control",
    as === "textarea" ? "landing-control--textarea" : "",
    as === "select" ? "landing-control--select" : "",
    error ? "is-invalid" : "",
    controlProps.className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`demo-field landing-fade-up ${fullWidth ? "demo-field--full" : ""} ${className}`
        .trim()}
      style={{ "--reveal-delay": `${revealDelay}ms` }}
    >
      <label className="demo-field-label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      {as === "textarea" ? (
        <textarea id={id} className={controlClassName} {...controlProps} />
      ) : as === "select" ? (
        <select id={id} className={controlClassName} {...controlProps}>
          {children}
        </select>
      ) : (
        <input id={id} className={controlClassName} {...controlProps} />
      )}

      {error ? (
        <p className="demo-field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

function DemoRequestForm({
  errors,
  isSubmitting,
  minDemoDate,
  onChange,
  onSubmit,
  values,
}) {
  const prefix = useId().replace(/:/g, "");

  const fieldId = (name) => `${prefix}-${name}`;

  return (
    <form className="demo-form" onSubmit={onSubmit} noValidate>
      <div className="demo-form-grid">
        <DemoField
          id={fieldId("fullName")}
          label="Full Name"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          required
          value={values.fullName}
          onChange={onChange}
          error={errors.fullName}
          revealDelay={80}
        />

        <DemoField
          id={fieldId("workEmail")}
          label="Work Email"
          name="workEmail"
          type="email"
          autoComplete="email"
          placeholder="Enter your work email"
          required
          value={values.workEmail}
          onChange={onChange}
          error={errors.workEmail}
          revealDelay={140}
        />

        <DemoField
          id={fieldId("phoneNumber")}
          label="Phone Number"
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          placeholder="Enter your phone number"
          required
          value={values.phoneNumber}
          onChange={onChange}
          error={errors.phoneNumber}
          revealDelay={200}
        />

        <DemoField
          id={fieldId("companyName")}
          label="Company Name"
          name="companyName"
          type="text"
          autoComplete="organization"
          placeholder="Enter your company name"
          required
          value={values.companyName}
          onChange={onChange}
          error={errors.companyName}
          revealDelay={260}
        />

        <DemoField
          id={fieldId("companySize")}
          label="Company Size"
          name="companySize"
          as="select"
          required
          value={values.companySize}
          onChange={onChange}
          error={errors.companySize}
          revealDelay={320}
        >
          <option value="">Select company size</option>
          {COMPANY_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </DemoField>

        <DemoField
          id={fieldId("preferredDemoDate")}
          label="Preferred Demo Date"
          name="preferredDemoDate"
          type="date"
          required
          min={minDemoDate}
          value={values.preferredDemoDate}
          onChange={onChange}
          error={errors.preferredDemoDate}
          revealDelay={380}
        />

        <DemoField
          id={fieldId("message")}
          label="Message"
          name="message"
          as="textarea"
          fullWidth
          placeholder="Tell us about your requirements or goals"
          rows={3}
          value={values.message}
          onChange={onChange}
          error={errors.message}
          revealDelay={440}
        />

        <div className="demo-actions demo-field--full landing-fade-up" style={{ "--reveal-delay": "500ms" }}>
          <button
            className="landing-primary-action demo-primary-action"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Request Demo"}
            <FaArrowRight aria-hidden="true" />
          </button>

          <a
            className="landing-secondary-action demo-secondary-action"
            href="mailto:sales@honeywellitsolutions.com?subject=Honeywell%20EMS%20Demo%20Inquiry"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </form>
  );
}

export default DemoRequestForm;
