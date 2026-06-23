import React, { memo } from "react";

const steps = [
  {
    id: 1,
    label: "Personal Info",
  },
  {
    id: 2,
    label: "Bank Info",
  },
  {
    id: 3,
    label: "Education",
  },
  {
    id: 4,
    label: "Experience",
  },
  {
    id: 5,
    label: "Documents",
  },
  {
    id: 6,
    label: "Review",
  }
];

function Stepper({ step, setStep, maxStep }) {
  const handleStepClick = (targetStep) => {
    if (targetStep <= maxStep) {
      setStep(targetStep);
    }
  };

  return (
    <nav className="stepper" aria-label="Add employee steps">
      {steps.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`step ${step === item.id ? "active" : ""} ${maxStep < item.id ? "disabled" : ""}`.trim()}
          data-step={item.id}
          aria-current={step === item.id ? "step" : undefined}
          disabled={maxStep < item.id}
          onClick={() => handleStepClick(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export default memo(Stepper);
