import React, { useEffect, useState } from "react";
import "./AddEmployee.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
 
const degreeOptions = [
  "10th (SSC)",
  "Intermediate (12th)",
  "Diploma",
  "B.Tech / BE",
  "B.Sc",
  "BCA",
  "B.Com",
  "M.Tech / ME",
  "M.Sc",
  "MCA",
  "M.Com",
  "MBA",
  "PhD",
  "Other",
];
 
const createEmptyEducation = () => ({
  Graduation: "",
  customGraduation: "",
  university: "",
  year: "",
  percentage: "",
  specialization: "",
});
 
const getEducationDegree = (education) =>
  education.Graduation === "Other"
    ? String(education.customGraduation || "").trim()
    : String(education.Graduation || "").trim();
 
const isEducationRowEmpty = (education) =>
  [
    getEducationDegree(education),
    education.university,
    education.year,
    education.percentage,
    education.specialization,
  ].every((value) => !String(value || "").trim());
 
const mapEducationFromApi = (education) => {
  const degree = String(education.degree || "").trim();
  const isListedDegree = degreeOptions.includes(degree) && degree !== "Other";
 
  return {
    Graduation: isListedDegree ? degree : degree ? "Other" : "",
    customGraduation: isListedDegree ? "" : degree,
    university: String(education.universityBoard || ""),
    year: education.yearOfPassing ? String(education.yearOfPassing) : "",
    percentage:
      education.percentageCGPA !== undefined && education.percentageCGPA !== null
        ? String(education.percentageCGPA)
        : "",
    specialization: String(education.specialization || ""),
  };
};
 
function Education({ onNext, onBack, employeeId, viewMode, data }) {
  const [educations, setEducations] = useState(() =>
    viewMode ? [] : [createEmptyEducation()]
  );
  const [errors, setErrors] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditMode = Array.isArray(data) && data.length > 0;

  const getFieldClassName = (index, field, extraClass = "") =>
    [extraClass, errors[index]?.[field] ? "is-invalid" : ""]
      .filter(Boolean)
      .join(" ");
 
  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      setEducations(viewMode ? [] : [createEmptyEducation()]);
      setErrors([]);
      return;
    }
 
    setEducations(data.map(mapEducationFromApi));
    setErrors([]);
  }, [data, viewMode]);
 
  const clearRowErrors = (index, fields = []) => {
    setErrors((prev) =>
      prev.map((error, errorIndex) => {
        if (errorIndex !== index || !error) {
          return error;
        }
 
        const nextError = { ...error };
        fields.forEach((field) => {
          delete nextError[field];
        });
 
        return nextError;
      })
    );
  };
 
  const handleChange = (index, field, value) => {
    setEducations((prev) =>
      prev.map((education, educationIndex) =>
        educationIndex === index
          ? {
              ...education,
              [field]: value,
            }
          : education
      )
    );
 
    clearRowErrors(index, [field, "duplicate", "row"]);
    setApiError("");
    setSuccessMsg("");
  };
 
  const handleQualificationChange = (index, value) => {
    setEducations((prev) =>
      prev.map((education, educationIndex) =>
        educationIndex === index
          ? {
              ...education,
              Graduation: value,
              customGraduation: value === "Other" ? education.customGraduation : "",
            }
          : education
      )
    );
 
    clearRowErrors(index, ["Graduation", "customGraduation", "duplicate", "row"]);
    setApiError("");
    setSuccessMsg("");
  };
 
  const handleYearChange = (index, value) => {
    if (!/^\d*$/.test(value) || value.length > 4) {
      return;
    }
 
    handleChange(index, "year", value);
  };
 
  const handlePercentageChange = (index, value) => {
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }
 
    handleChange(index, "percentage", value);
  };
 
  const addEducation = () => {
    setEducations((prev) => [...prev, createEmptyEducation()]);
    setApiError("");
    setSuccessMsg("");
  };
 
  const buildEducationPayload = (list) =>
    list
      .filter((education) => !isEducationRowEmpty(education))
      .map((education) => ({
        Employee_Id: String(employeeId),
        Degree: getEducationDegree(education),
        UniversityBoard: String(education.university || "").trim(),
        YearOfPassing: parseInt(education.year, 10),
        PercentageCGPA: String(education.percentage || "").trim(),
        Specialization: String(education.specialization || "").trim(),
      }));
 
  const syncEducationCollection = async (nextEducations) => {
    const payloadList = buildEducationPayload(nextEducations);
 
    if (payloadList.length === 0) {
      await api.delete(API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId));
      return;
    }
 
    await api.put(API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId), payloadList, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  };
 
  const removeEducation = async (index) => {
    const previousEducations = educations;
    const updatedEducations = educations.filter((_, educationIndex) => educationIndex !== index);
 
    setEducations(updatedEducations);
    setErrors([]);
    setApiError("");
    setSuccessMsg("");
 
    if (!isEditMode || !employeeId) {
      return;
    }
 
    try {
      setLoading(true);
      await syncEducationCollection(updatedEducations);
      setSuccessMsg("Education deleted successfully!");
    } catch (error) {
      console.error("Education delete failed:", error);
      setEducations(previousEducations);
      setApiError("Failed to delete education details.");
    } finally {
      setLoading(false);
    }
  };
 
  const validate = () => {
    if (educations.length === 0) {
      setErrors([]);
      return true;
    }
 
    const nextErrors = educations.map(() => ({}));
    const seenCombinations = new Map();
    let isValid = true;
 
    educations.forEach((education, index) => {
      if (isEducationRowEmpty(education)) {
        nextErrors[index].row = "Please complete or remove this education entry.";
        isValid = false;
        return;
      }
 
      const qualification = getEducationDegree(education);
      const institution = String(education.university || "").trim();
      const year = String(education.year || "").trim();
 
      if (!qualification) {
        nextErrors[index].Graduation = "Qualification required";
        isValid = false;
      }
 
      if (!institution) {
        nextErrors[index].university = "University required";
        isValid = false;
      }
 
      if (!/^\d{4}$/.test(year)) {
        nextErrors[index].year = "Valid year required";
        isValid = false;
      }
 
      if (!String(education.percentage || "").trim()) {
        nextErrors[index].percentage = "Percentage required";
        isValid = false;
      }
 
      if (!String(education.specialization || "").trim()) {
        nextErrors[index].specialization = "Specialization required";
        isValid = false;
      }
 
      if (!qualification || !institution || !year) {
        return;
      }
 
      const duplicateKey = [
        qualification.toLowerCase(),
        institution.toLowerCase(),
        year,
      ].join("::");
 
      if (seenCombinations.has(duplicateKey)) {
        const firstIndex = seenCombinations.get(duplicateKey);
 
        nextErrors[index].duplicate =
          "This qualification, institution, and year combination already exists.";
        nextErrors[firstIndex].duplicate =
          "This qualification, institution, and year combination already exists.";
        isValid = false;
        return;
      }
 
      seenCombinations.set(duplicateKey, index);
    });
 
    setErrors(nextErrors);
    return isValid;
  };
 
  const handleSaveNext = async () => {
    setSuccessMsg("");
    setApiError("");
 
    if (!validate()) {
      return;
    }
 
    if (!employeeId) {
      setApiError("Employee ID missing.");
      return;
    }
 
    setLoading(true);
 
    try {
      const payloadList = buildEducationPayload(educations);
 
      if (payloadList.length === 0) {
        if (isEditMode) {
          await api.delete(API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId));
        }
 
        setSuccessMsg(
          isEditMode
            ? "Education cleared successfully!"
            : "No education details to save."
        );
 
        setTimeout(() => {
          onNext?.();
        }, 500);
 
        return;
      }
 
      if (isEditMode) {
        await api.put(API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId), payloadList, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      } else {
        await Promise.all(
          payloadList.map((payload) =>
            api.post(API_ENDPOINTS.employeeEducation.list, payload, {
              headers: {
                "Content-Type": "application/json",
              },
            })
          )
        );
      }
 
      setSuccessMsg(
        isEditMode
          ? "Education updated successfully!"
          : "Education saved successfully!"
      );
 
      setTimeout(() => {
        onNext?.();
      }, 800);
    } catch (error) {
      console.error("Education save failed:", error);
      setApiError("Failed to save education details.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="form-section">
      <h3>Add Educational Qualifications</h3>
 
      {educations.length === 0 ? (
        <div className="form-card">
          <p className="review-empty-state">No education details added.</p>
        </div>
      ) : (
        educations.map((education, index) => (
        <div
          className={`form-card${errors[index]?.row || errors[index]?.duplicate ? " validation-card-error" : ""}`}
          key={`education-${index}`}
        >
            <div className="card-header">
              <h4>Education {index + 1}</h4>
 
              {!viewMode && (
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeEducation(index)}
                  disabled={loading}
                >
                  Remove
                </button>
              )}
            </div>
 
            {errors[index]?.row && <p className="education-feedback error" role="alert">{errors[index].row}</p>}
            {errors[index]?.duplicate && (
              <p className="education-feedback error" role="alert">{errors[index].duplicate}</p>
            )}
 
            <div className="form-grid">
              <div className="form-group">
                <label>Qualification</label>
                <select
                  value={education.Graduation}
                  onChange={(event) => handleQualificationChange(index, event.target.value)}
                  className={getFieldClassName(index, "Graduation")}
                  disabled={viewMode}
                >
                  <option value="">Select Qualification</option>
                  {degreeOptions.map((degree) => (
                    <option key={degree} value={degree}>
                      {degree}
                    </option>
                  ))}
                </select>
                {errors[index]?.Graduation && <span className="error" role="alert">{errors[index].Graduation}</span>}
 
                {education.Graduation === "Other" && (
                  <>
                    <input
                      type="text"
                      placeholder="Enter your qualification"
                      value={education.customGraduation}
                      onChange={(event) =>
                        handleChange(index, "customGraduation", event.target.value)
                      }
                      className={`education-custom-input ${getFieldClassName(index, "customGraduation")}`.trim()}
                      disabled={viewMode}
                    />
                    {errors[index]?.customGraduation && (
                      <span className="error" role="alert">{errors[index].customGraduation}</span>
                    )}
                  </>
                )}
              </div>
 
              <div className="form-group">
                <label>University</label>
                <input
                  value={education.university}
                  onChange={(event) => handleChange(index, "university", event.target.value)}
                  className={getFieldClassName(index, "university")}
                  disabled={viewMode}
                />
                {errors[index]?.university && <span className="error" role="alert">{errors[index].university}</span>}
              </div>
 
              <div className="form-group">
                <label>Year</label>
                <input
                  value={education.year}
                  onChange={(event) => handleYearChange(index, event.target.value)}
                  className={getFieldClassName(index, "year")}
                  disabled={viewMode}
                />
                {errors[index]?.year && <span className="error" role="alert">{errors[index].year}</span>}
              </div>
 
              <div className="form-group">
                <label>Percentage</label>
                <input
                  value={education.percentage}
                  onChange={(event) => handlePercentageChange(index, event.target.value)}
                  className={getFieldClassName(index, "percentage")}
                  disabled={viewMode}
                />
                {errors[index]?.percentage && <span className="error" role="alert">{errors[index].percentage}</span>}
              </div>
 
              <div className="form-group full">
                <label>Specialization</label>
                <input
                  value={education.specialization}
                  onChange={(event) => handleChange(index, "specialization", event.target.value)}
                  className={getFieldClassName(index, "specialization")}
                  disabled={viewMode}
                />
                {errors[index]?.specialization && (
                  <span className="error" role="alert">{errors[index].specialization}</span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
 
      {!viewMode && (
        <div className="education-add-wrapper">
          <button
            type="button"
            className="btn primary add-education-btn"
            onClick={addEducation}
            disabled={loading}
          >
            + Add Education
          </button>
        </div>
      )}
 
      <div className="step-actions">
        <button type="button" className="btn secondary" onClick={onBack} disabled={loading}>
          Back
        </button>
 
        {successMsg && <p className="education-feedback success">{successMsg}</p>}
        {apiError && <p className="education-feedback error">{apiError}</p>}
 
        {!viewMode && (
          <button className="btn primary" onClick={handleSaveNext} disabled={loading}>
            {loading
              ? isEditMode
                ? "Updating..."
                : "Saving..."
              : isEditMode
                ? "Update & Next"
                : "Save & Next"}
          </button>
        )}
      </div>
    </div>
  );
}
 
export default Education;
 
 
