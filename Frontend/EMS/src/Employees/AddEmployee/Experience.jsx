import React, { useState, useEffect } from "react";
import "./AddEmployee.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import AppDatePicker from "../../components/AppDatePicker";
import { parseDate, toIsoDateString } from "../../utils/date";
import { toastError } from "@/components/common/toast/toastService";
import { validateTextValue } from "../../utils/validation";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_EXPERIENCE_YEARS = 50;

const getDaysInMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

const normalizeDate = (value) => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return null;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );
};

const getTodayDate = () => {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
};

const addYearsClamped = (date, years) => {
  const year = date.getFullYear() + years;
  const month = date.getMonth();
  const day = Math.min(date.getDate(), getDaysInMonth(year, month));

  return new Date(year, month, day);
};

const addMonthsClamped = (date, months) => {
  const totalMonths = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(totalMonths / 12);
  const month = (totalMonths % 12 + 12) % 12;
  const day = Math.min(date.getDate(), getDaysInMonth(year, month));

  return new Date(year, month, day);
};

const formatDurationUnit = (value, label) =>
  `${value} ${value === 1 ? label : `${label}s`}`;

const calculateExperienceDuration = (fromValue, toValue) => {
  const startDate = normalizeDate(fromValue);

  if (!startDate) {
    return {
      label: "",
      yearsValue: 0
    };
  }

  const endDate = normalizeDate(toValue) ?? getTodayDate();

  if (endDate < startDate) {
    return {
      label: "",
      yearsValue: 0
    };
  }

  let years = endDate.getFullYear() - startDate.getFullYear();

  if (
    endDate.getMonth() < startDate.getMonth() ||
    endDate.getMonth() === startDate.getMonth() &&
    endDate.getDate() < startDate.getDate()) {
    years -= 1;
  }

  if (years < 0) {
    years = 0;
  }

  const afterYears = addYearsClamped(startDate, years);

  let months =
    (endDate.getFullYear() - afterYears.getFullYear()) * 12 + (
      endDate.getMonth() - afterYears.getMonth());

  if (endDate.getDate() < afterYears.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    months = 0;
  }

  const afterMonths = addMonthsClamped(afterYears, months);
  const days = Math.max(
    0,
    Math.floor(
      (Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
      ) -
        Date.UTC(
          afterMonths.getFullYear(),
          afterMonths.getMonth(),
          afterMonths.getDate()
        )) /
      ONE_DAY_MS
    )
  );

  const parts = [];

  if (years > 0) {
    parts.push(formatDurationUnit(years, "Year"));
  }

  if (months > 0) {
    parts.push(formatDurationUnit(months, "Month"));
  }

  if (days > 0 || parts.length === 0) {
    parts.push(formatDurationUnit(days, "Day"));
  }

  return {
    label: parts.join(" "),
    yearsValue: years
  };
};

const isExperienceRowEmpty = (experience) =>
  [
    experience.company,
    experience.designation,
    experience.from,
    experience.to,
    experience.reason,
    experience.description].
    every((value) => !String(value || "").trim());

function Experience({ employeeId, viewMode, data, onNext, onBack }) {
  const emptyExperience = {
    id: 0,
    company: "",
    designation: "",
    from: "",
    to: "",
    years: "",
    yearsValue: 0,
    reason: "",
    description: ""
  };

  const [experiences, setExperiences] = useState([emptyExperience]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState([]);
  const isEditMode = data && data.length > 0;

  useEffect(() => {
    if (!data || data.length === 0) return;

    const mapped = data.map((exp) => {
      const fromDate = exp.fromDate ? exp.fromDate.split("T")[0] : "";
      const toDate = exp.toDate ? exp.toDate.split("T")[0] : "";
      const duration = calculateExperienceDuration(fromDate, toDate);
      const fallbackYears = Number.parseInt(exp.years, 10);

      return {
        id: exp.id || 0,
        company: exp.companyName || "",
        designation: exp.designation || "",
        from: fromDate,
        to: toDate,
        years: duration.label || (Number.isFinite(fallbackYears) ? String(fallbackYears) : ""),
        yearsValue: duration.label ?
          duration.yearsValue :
          Number.isFinite(fallbackYears) ?
            fallbackYears :
            0,
        reason: exp.reasonForLeaving || "",
        description: exp.description || ""
      };
    });

    setExperiences(mapped);
  }, [data]);

  const handleChange = (index, e) => {
    const updated = [...experiences];
    const { name, value } = e.target;
    updated[index][name] = value;

    if (name === "from" || name === "to") {
      const duration = calculateExperienceDuration(
        updated[index].from,
        updated[index].to
      );

      updated[index].years = duration.label;
      updated[index].yearsValue = duration.yearsValue;

      if (duration.yearsValue > MAX_EXPERIENCE_YEARS) {
        setErrors((prev) => {
          const next = [...prev];

          next[index] = {
            ...(next[index] || {}),
            to: "Experience cannot be more than 50 years",
          };

          return next;
        });
      } else {
        setErrors((prev) => {
          const next = [...prev];

          if (next[index]?.to === "Experience cannot be more than 50 years") {
            const nextError = { ...next[index] };
            delete nextError.to;
            next[index] = nextError;
          }

          return next;
        });
      }
    }
  };

  const addExperience = () => {
    setExperiences([...experiences, { ...emptyExperience }]);
  };

  const validate = () => {
    const nextErrors = experiences.map(() => ({}));
    const today = getTodayDate();
    let isValid = true;

    experiences.forEach((exp, index) => {
      if (isExperienceRowEmpty(exp)) {
        return;
      }

      const companyError = validateTextValue(exp.company, {
        label: "Company Name",
        min: 2,
        max: 100,
        required: false
      });
      if (companyError) {
        nextErrors[index].company = companyError;
        isValid = false;
      }

      const designationError = validateTextValue(exp.designation, {
        label: "Designation",
        min: 2,
        max: 80,
        required: false
      });
      if (designationError) {
        nextErrors[index].designation = designationError;
        isValid = false;
      }

      const fromDate = normalizeDate(exp.from);
      const toDate = normalizeDate(exp.to);

      if (String(exp.from || "").trim() && !fromDate) {
        nextErrors[index].from = "Enter a valid From Date";
        isValid = false;
      }

      if (fromDate && fromDate > today) {
        nextErrors[index].from = "From Date cannot be in the future";
        isValid = false;
      }

      if (String(exp.to || "").trim() && !toDate) {
        nextErrors[index].to = "Enter a valid To Date";
        isValid = false;
      }

      if (toDate && toDate > today) {
        nextErrors[index].to = "To Date cannot be in the future";
        isValid = false;
      }

      if (fromDate && toDate && toDate < fromDate) {
        nextErrors[index].to = "To Date cannot be before From Date";
        isValid = false;
      }

      if (fromDate && toDate && toDate >= fromDate) {
        const duration = calculateExperienceDuration(exp.from, exp.to);

        if (duration.yearsValue > MAX_EXPERIENCE_YEARS) {
          nextErrors[index].to =
            "Experience cannot be more than 50 years";
          isValid = false;
        }
      }

      const reasonError = validateTextValue(exp.reason, {
        label: "Reason for Leaving",
        min: 2,
        max: 120,
        required: false
      });
      if (reasonError) {
        nextErrors[index].reason = reasonError;
        isValid = false;
      }

      const descriptionError = validateTextValue(exp.description, {
        label: "Description",
        min: 2,
        max: 500,
        required: false
      });
      if (descriptionError) {
        nextErrors[index].description = descriptionError;
        isValid = false;
      }
    });

    setErrors(nextErrors);
    return isValid;
  };

  // ✅ REMOVE = DELETE API + UI UPDATE
  const removeExperience = async (index) => {

    if (!employeeId) {
      toastError("Employee ID missing");
      return;
    }

    if (!window.confirm("Delete experience?")) return;

    try {
      setLoading(true);

      const response = await api.delete(
        API_ENDPOINTS.employeeExperience.byEmployeeId(employeeId)
      );

      // ✅ Update UI
      const updated = experiences.filter((_, i) => i !== index);
      setExperiences(updated.length ? updated : [emptyExperience]);

    } catch (err) {

      toastError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {

    if (!employeeId) {
      toastError("Employee ID missing");
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      const experiencesToSave = experiences.filter(
        (exp) => !isExperienceRowEmpty(exp)
      );

      // ✅ DELETE old experiences first (only in edit mode)
      if (isEditMode) {
        await api.delete(
          API_ENDPOINTS.employeeExperience.byEmployeeId(employeeId)
        );
      }

      // ✅ Save all experiences one by one
      if (experiencesToSave.length === 0) {
        setSuccessMsg(isEditMode ? "Experience cleared successfully!" : "No experience details to save.");
        onNext?.();
        return;
      }

      const requests = experiencesToSave.map((exp) => {

        const payload = {
          Employee_Id: employeeId,
          CompanyName: exp.company?.trim() || "",
          Designation: exp.designation?.trim() || "",
          FromDate: exp.from ? toIsoDateString(exp.from) : null,
          ToDate: exp.to ? toIsoDateString(exp.to) : null,
          Years: Number.isFinite(exp.yearsValue) ? exp.yearsValue : 0,
          ReasonForLeaving: exp.reason?.trim() || "",
          Description: exp.description?.trim() || ""
        };

        return api.post(
          API_ENDPOINTS.employeeExperience.list,
          payload,
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      });

      // ✅ Wait all inserts complete
      const responses = await Promise.all(requests);

      setSuccessMsg(
        `${isEditMode ? "Updated" : "Added"} successfully!`
      );

      if (onNext) {
        onNext();
      }

    } catch (err) {

      toastError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-section">

      <h3>Add Previous Work Experience</h3>



      {experiences.map((exp, index) =>
        <div className="form-card" key={index}>

          <div className="card-header">

            <h4>Experience {index + 1}</h4>



            {!viewMode && experiences.length > 1 &&
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeExperience(index)}>


                Remove

              </button>
            }

          </div>



          <div className="form-grid">

            <div className="form-group">

              <label>Company Name</label>

              <input
                type="text"
                name="company"
                value={exp.company || ""}
                onChange={(e) => handleChange(index, e)}
                disabled={viewMode} />
              {errors[index]?.company && <span className="error" role="alert">{errors[index].company}</span>}


            </div>



            <div className="form-group">

              <label>Designation</label>

              <input
                type="text"
                name="designation"
                value={exp.designation || ""}
                onChange={(e) => handleChange(index, e)}
                disabled={viewMode} />
              {errors[index]?.designation && <span className="error" role="alert">{errors[index].designation}</span>}


            </div>



            <div className="form-group">

              <label>From Date</label>

              <AppDatePicker
                name="from"
                value={exp.from || ""}
                onChange={(e) => handleChange(index, e)}
                disabled={viewMode} />
              {errors[index]?.from && <span className="error" role="alert">{errors[index].from}</span>}


            </div>



            <div className="form-group">

              <label>To Date</label>

              <AppDatePicker
                name="to"
                value={exp.to || ""}
                onChange={(e) => handleChange(index, e)}
                disabled={viewMode} />
              {errors[index]?.to && <span className="error" role="alert">{errors[index].to}</span>}


            </div>



            <div className="form-group">

              <label>Years of Experience</label>

              <input
                type="text"
                name="years"
                value={exp.years || ""}
                readOnly
                placeholder="Auto-calculated duration"
                disabled={viewMode}
                className="experience-years-input" />


            </div>



            <div className="form-group">

              <label>Reason for Leaving</label>

              <input
                type="text"
                name="reason"
                value={exp.reason || ""}
                onChange={(e) => handleChange(index, e)}
                disabled={viewMode} />
              {errors[index]?.reason && <span className="error" role="alert">{errors[index].reason}</span>}


            </div>



            <div className="form-group full">

              <label>Description</label>

              <textarea
                name="description"
                value={exp.description || ""}
                onChange={(e) => handleChange(index, e)}
                disabled={viewMode} />
              {errors[index]?.description && <span className="error" role="alert">{errors[index].description}</span>}


            </div>

          </div>

        </div>
      )}



      {!viewMode &&
        <button
          type="button"
          className="btn primary add-experience-btn"
          onClick={addExperience}>


          + Add Another Experience

        </button>
      }



      <div className="step-actions">

        <button
          type="button"
          className="btn secondary"
          onClick={onBack}
          disabled={loading}>


          Back

        </button>

        {successMsg &&
          <p className="workflow-feedback success">

            {successMsg}

          </p>
        }



        <button
          type="button"
          className="btn primary"
          onClick={handleSave}
          disabled={loading}>


          {loading ?
            isEditMode ?
              "Updating..." :
              "Saving..." :
            isEditMode ?
              "Update & Next" :
              "Save & Next"}

        </button>



        {!viewMode &&
          <button
            type="button"
            className="btn secondary"
            onClick={() => {

              setSuccessMsg("Skipped");

              setTimeout(() => {
                if (onNext) {
                  onNext(); // ✅ FIX
                }
              }, 500);
            }}>


            Skip

          </button>
        }

      </div>

    </div>);

}

export default Experience;
