import React, { useMemo, useState } from "react";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaRegClock,
} from "react-icons/fa";
import { isValidEmail, normalizeWhitespace } from "../../utils/validation";
import DemoRequestForm from "./DemoRequestForm";
import "./DemoRequestSection.css";

const INITIAL_FORM_STATE = {
  fullName: "",
  companyName: "",
  workEmail: "",
  phoneNumber: "",
  companySize: "",
  preferredDemoDate: "",
  message: "",
};

const PHONE_PATTERN = /^[+()\d\s-]{7,24}$/;

const getLocalDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const validateField = (name, value) => {
  const normalizedValue = String(value ?? "").trim();

  if (name === "fullName") {
    const nameValue = normalizeWhitespace(value).replace(/\s+/g, " ");

    if (!nameValue) {
      return "Full Name is required";
    }

    if (nameValue.length < 2) {
      return "Full Name must contain at least 2 characters";
    }

    if (!/^[A-Za-z][A-Za-z .'-]*$/.test(nameValue)) {
      return "Enter a valid full name";
    }

    return "";
  }

  if (name === "companyName") {
    const companyValue = normalizeWhitespace(value);

    if (!companyValue) {
      return "Company Name is required";
    }

    if (companyValue.length < 2) {
      return "Company Name must contain at least 2 characters";
    }

    return "";
  }

  if (name === "workEmail") {
    if (!normalizedValue) {
      return "Work Email is required";
    }

    if (!isValidEmail(normalizedValue)) {
      return "Enter a valid work email";
    }

    return "";
  }

  if (name === "phoneNumber") {
    const digits = normalizedValue.replace(/\D/g, "");

    if (!normalizedValue) {
      return "Phone Number is required";
    }

    if (!PHONE_PATTERN.test(normalizedValue) || digits.length < 8 || digits.length > 15) {
      return "Enter a valid phone number";
    }

    return "";
  }

  if (name === "companySize") {
    return normalizedValue ? "" : "Company Size is required";
  }

  if (name === "preferredDemoDate") {
    if (!normalizedValue) {
      return "Preferred Demo Date is required";
    }

    const today = getLocalDateInputValue();

    if (normalizedValue < today) {
      return "Choose a future demo date";
    }

    return "";
  }

  if (name === "message") {
    if (normalizedValue.length > 1000) {
      return "Message cannot exceed 1000 characters";
    }

    return "";
  }

  return "";
};

const validateForm = (formState) => {
  const nextErrors = {
    fullName: validateField("fullName", formState.fullName),
    companyName: validateField("companyName", formState.companyName),
    workEmail: validateField("workEmail", formState.workEmail),
    phoneNumber: validateField("phoneNumber", formState.phoneNumber),
    companySize: validateField("companySize", formState.companySize),
    preferredDemoDate: validateField("preferredDemoDate", formState.preferredDemoDate),
  };

  return Object.fromEntries(
    Object.entries(nextErrors).filter(([, message]) => message)
  );
};

function DemoRequestSection() {
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const minDemoDate = useMemo(() => getLocalDateInputValue(), []);

  const updateFieldError = (fieldName, nextValue) => {
    const nextError = validateField(fieldName, nextValue);

    setErrors((prev) => {
      if (nextError) {
        return {
          ...prev,
          [fieldName]: nextError,
        };
      }

      if (!prev[fieldName]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setFormState((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    updateFieldError(name, nextValue);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm(formState);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDemo = () => {
    setIsSubmitted(false);
    setFormState({ ...INITIAL_FORM_STATE });
    setErrors({});
  };

  const handleBackHome = () => {
    const target = document.getElementById("home");

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="landing-section demo-request-section" id="request-demo">
      <div className="landing-shell demo-request-grid">
        <div className="demo-request-copy landing-fade-up" style={{ "--reveal-delay": "80ms" }}>
          <div className="demo-request-badge">
            <FaCalendarAlt aria-hidden="true" />
            <span>Request a Demo</span>
          </div>

          <div className="landing-section-heading landing-section-heading--left">
            <h2 className="landing-section-title demo-request-title">
              Book Your Personalized HRMS Demo
            </h2>
          </div>

          <p className="demo-request-description">
            Experience Honeywell EMS with a live demonstration tailored to your
            organization. Discover Attendance, Payroll, Leave Management,
            Employee Management, Recruitment, Performance, Reports, and Analytics.
          </p>

          <div className="demo-request-features">
            {[
              "Live Product Walkthrough",
              "Personalized Consultation",
              "Setup Guidance",
              "Free Expert Support",
            ].map((feature) => (
              <div className="demo-request-feature" key={feature}>
                <span className="demo-request-feature-icon" aria-hidden="true">
                  <FaCheck />
                </span>
                <p className="demo-request-feature-copy">{feature}</p>
              </div>
            ))}
          </div>

          <div className="demo-request-info">
            <span className="demo-request-info-icon" aria-hidden="true">
              <FaRegClock />
            </span>

            <div className="demo-request-info-copy">
              <p className="demo-request-info-title">Response within 24 Hours</p>
              <p className="demo-request-info-text">
                Our HR experts will contact you to schedule your personalized demo.
              </p>
            </div>
          </div>
        </div>

        <div className="demo-request-panel landing-fade-up" style={{ "--reveal-delay": "140ms" }}>
          {isSubmitted ? (
            <div className="demo-success-card demo-success-card--enter" role="status" aria-live="polite">
              <span className="demo-success-icon" aria-hidden="true">
                <FaCheckCircle />
              </span>

              <div className="landing-section-heading landing-section-heading--left">
                <h3 className="demo-success-title">Thank You!</h3>
              </div>

              <p className="demo-success-copy">
                Your demo request has been submitted successfully.
                <br />
                Our HR specialist will contact you within 24 hours to schedule your
                personalized demo.
              </p>

              <div className="demo-success-actions">
                <button
                  type="button"
                  className="landing-secondary-action demo-secondary-action"
                  onClick={handleBackHome}
                >
                  Back Home
                </button>

                <button
                  type="button"
                  className="landing-primary-action demo-primary-action"
                  onClick={handleResetDemo}
                >
                  Book Another Demo
                  <FaArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <DemoRequestForm
              errors={errors}
              isSubmitting={isSubmitting}
              minDemoDate={minDemoDate}
              onChange={handleChange}
              onSubmit={handleSubmit}
              values={formState}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default DemoRequestSection;
