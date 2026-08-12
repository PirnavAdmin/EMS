import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { toastError, toastSuccess } from "@/components/common/toast/toastService";
import AppDatePicker from "../components/AppDatePicker";
import EmployeeDocuments from "../Employees/AddEmployee/Documents";
import Stepper from "../Employees/AddEmployee/Stepper";
import "../Employees/AddEmployee/AddEmployee.css";
import { getStoredOnboardingId } from "../utils/authStorage";
import { extractCollection } from "../utils/collections";
import { formatDate, formatDateTime, parseDate, toIsoDateString } from "../utils/date";
import {
  normalizeWhitespace,
  sanitizeEmailInput,
  sanitizeLettersAndSpaces,
  sanitizePhoneInput,
  validateEmailAddress,
  validateEmployeeName,
  validatePhoneNumber,
} from "../utils/validation";
import {
  createOnboardingPersonalInfo,
  getOnboardingPersonalInfo,
  updateOnboardingPersonalInfo,
} from "../services/onboardingPersonalService";
import {
  createOnboardingEducation,
  getOnboardingEducation,
  updateOnboardingEducation,
} from "../services/onboardingEducationService";
import {
  createOnboardingExperience,
  getOnboardingExperience,
  updateOnboardingExperience,
} from "../services/onboardingExperienceService";
import {
  getOnboardingDocuments,
} from "../services/onboardingDocumentService";
import {
  getPendingAgreementCount,
  getSignedAgreementCount,
  viewSignedAgreement,
} from "../services/agreementService";

const ONBOARDING_STEPS = [
  { id: 1, label: "Personal Details" },
  { id: 2, label: "Education" },
  { id: 3, label: "Experience" },
  { id: 4, label: "Documents" },
  { id: 5, label: "Review" },
];

const initialPersonalForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  phoneNumber: "",
  email: "",
  aadhaarNumber: "",
  panNumber: "",
  bloodGroup: "",
  marital_Status: "",
  gender: "",
  joiningDate: "",
  location: "",
  workExperience: "",
  department: "",
  designation: "",
  houseNo: "",
  street: "",
  city: "",
  district: "",
  state: "",
  country: "",
  pincode: "",
};

const emptyEducation = () => ({
  qualification: "",
  institution: "",
  university: "",
  yearOfPassing: "",
  percentage: "",
});

const emptyExperience = () => ({
  companyName: "",
  designation: "",
  fromDate: "",
  toDate: "",
  yearsOfExperience: 0,
});

const normalizeArrayPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const collection = extractCollection(payload);

  if (collection.length > 0) {
    return collection;
  }

  if (payload && typeof payload === "object" && Object.keys(payload).length > 0) {
    return [payload];
  }

  return [];
};

const hasRecord = (payload) =>
  Boolean(payload && typeof payload === "object" && Object.keys(payload).length > 0);

const getDocumentId = (document) =>
  document?.id ||
  document?.documentId ||
  document?.onboardingDocumentId ||
  document?.fileId ||
  document?.Id ||
  "";

const getDocumentName = (document) =>
  document?.documentName ||
  document?.fileName ||
  document?.originalFileName ||
  document?.name ||
  "Document";

const getDocumentType = (document) =>
  document?.documentType || document?.type || "Document";

const getUploadedDate = (document) =>
  document?.uploadedDate ||
  document?.uploadedAt ||
  document?.createdAt ||
  document?.createdDate ||
  "";

const getAgreementId = (agreement) =>
  agreement?.signedEmployeeAgreementId ||
  agreement?.SignedEmployeeAgreementId ||
  agreement?.employeeAgreementId ||
  agreement?.EmployeeAgreementId ||
  agreement?.agreementId ||
  agreement?.AgreementId ||
  agreement?.id ||
  agreement?.Id ||
  agreement?.agreementCode ||
  agreement?.AgreementCode ||
  "";

const getAgreementName = (agreement) =>
  agreement?.agreementName ||
  agreement?.AgreementName ||
  agreement?.name ||
  agreement?.Name ||
  agreement?.agreementCode ||
  agreement?.AgreementCode ||
  "Agreement";

const getAgreementStatus = (agreement) =>
  agreement?.status ||
  agreement?.Status ||
  agreement?.agreementStatus ||
  agreement?.AgreementStatus ||
  "Pending";

const getAgreementSignedDate = (agreement) =>
  agreement?.signedDate ||
  agreement?.SignedDate ||
  agreement?.signedAt ||
  agreement?.SignedAt ||
  agreement?.updatedAt ||
  agreement?.UpdatedAt ||
  "";

const getAgreementSignatureName = (agreement) =>
  agreement?.signatureName ||
  agreement?.SignatureName ||
  agreement?.signedBy ||
  agreement?.SignedBy ||
  "";

const mergeOnboardingAgreements = (pendingAgreements = [], signedAgreements = []) => {
  const agreementMap = new Map();

  [
    ...pendingAgreements.map((agreement) => ({ ...agreement, status: getAgreementStatus(agreement) || "Pending" })),
    ...signedAgreements.map((agreement) => ({ ...agreement, status: "Signed" })),
  ].forEach((agreement) => {
    const agreementId = String(getAgreementId(agreement) || `${getAgreementName(agreement)}-${agreementMap.size}`);
    const existingAgreement = agreementMap.get(agreementId) || {};
    agreementMap.set(agreementId, {
      ...existingAgreement,
      ...agreement,
      status: getAgreementStatus(agreement),
    });
  });

  return Array.from(agreementMap.values());
};

const calculateYears = (fromValue, toValue) => {
  const fromDate = parseDate(fromValue);
  const toDate = parseDate(toValue);

  if (!fromDate || !toDate || toDate < fromDate) {
    return 0;
  }

  const diffMs = toDate.getTime() - fromDate.getTime();
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);

  return Math.max(0, Number(years.toFixed(1)));
};

const buildOnboardingExperiencePayload = (onboardingId, row) => ({
  onboardingId: String(onboardingId || "").trim(),
  companyName: String(row.companyName || "").trim(),
  designation: String(row.designation || "").trim(),
  fromDate: toIsoDateString(row.fromDate),
  toDate: toIsoDateString(row.toDate),
  yearsOfExperience: Number(row.yearsOfExperience) || 0,
});

function FieldError({ message }) {
  return message ? (
    <span className="field-error" role="alert">
      {message}
    </span>
  ) : null;
}

export const OnboardingPersonalStep = forwardRef(function OnboardingPersonalStep({
  onboardingId,
  data,
  exists,
  onSaved,
  viewMode = false,
}, ref) {
  const [formData, setFormData] = useState(initialPersonalForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormData({
      ...initialPersonalForm,
      firstName: String(data.firstName ?? ""),
      middleName: String(data.middleName ?? ""),
      lastName: String(data.lastName ?? ""),
      dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).split("T")[0] : "",
      phoneNumber: String(data.phoneNumber ?? ""),
      email: String(data.email ?? ""),
      aadhaarNumber: String(data.aadhaarNumber ?? ""),
      panNumber: String(data.panNumber ?? ""),
      bloodGroup: String(data.bloodGroup ?? ""),
      marital_Status: String(data.marital_Status ?? ""),
      gender: String(data.gender ?? ""),
      joiningDate: data.joiningDate ? String(data.joiningDate).split("T")[0] : "",
      location: String(data.location ?? ""),
      workExperience: String(data.workExperience ?? ""),
      department: String(data.department ?? ""),
      designation: String(data.designation ?? ""),
      houseNo: String(data.houseNo ?? ""),
      street: String(data.street ?? ""),
      city: String(data.city ?? ""),
      district: String(data.district ?? ""),
      state: String(data.state ?? ""),
      country: String(data.country ?? ""),
      pincode: String(data.pincode ?? ""),
    });
    setDirty(false);
  }, [data]);

  const getFieldClassName = (field) => (errors[field] ? "is-invalid" : "");

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (["firstName", "middleName", "lastName"].includes(name)) {
      nextValue = sanitizeLettersAndSpaces(value, 30);
    } else if (name === "phoneNumber") {
      nextValue = sanitizePhoneInput(value, 10);
    } else if (name === "email") {
      nextValue = sanitizeEmailInput(value, 60);
    } else if (name === "aadhaarNumber") {
      nextValue = value.replace(/\D/g, "").slice(0, 12);
    } else if (name === "panNumber") {
      nextValue = value.toUpperCase().slice(0, 10);
    } else if (name === "pincode") {
      nextValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    setDirty(true);
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    const firstNameError = validateEmployeeName(formData.firstName, {
      label: "First Name",
      min: 2,
      max: 30,
    });
    if (firstNameError) nextErrors.firstName = firstNameError;

    if (normalizeWhitespace(formData.middleName)) {
      const middleNameError = validateEmployeeName(formData.middleName, {
        label: "Middle Name",
        min: 1,
        max: 30,
      });
      if (middleNameError) nextErrors.middleName = middleNameError;
    }

    const lastNameError = validateEmployeeName(formData.lastName, {
      label: "Last Name",
      min: 2,
      max: 30,
    });
    if (lastNameError) nextErrors.lastName = lastNameError;

    if (!formData.dateOfBirth) nextErrors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) nextErrors.gender = "Gender is required";
    if (!formData.marital_Status) nextErrors.marital_Status = "Marital status is required";
    if (!formData.joiningDate) nextErrors.joiningDate = "Joining date is required";
    if (!formData.bloodGroup) nextErrors.bloodGroup = "Blood group is required";
    if (!formData.department.trim()) nextErrors.department = "Department is required";
    if (!formData.designation.trim()) nextErrors.designation = "Designation is required";
    if (!formData.location.trim()) nextErrors.location = "Location is required";

    const phoneError = validatePhoneNumber(formData.phoneNumber);
    if (phoneError) nextErrors.phoneNumber = phoneError;

    const emailError = validateEmailAddress(formData.email, {
      label: "Email",
      max: 60,
    });
    if (emailError) nextErrors.email = emailError;

    if (!/^[0-9]{12}$/.test(formData.aadhaarNumber)) {
      nextErrors.aadhaarNumber = "Aadhaar must be 12 digits";
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.panNumber)) {
      nextErrors.panNumber = "Enter valid PAN (e.g., ABCDE1234F)";
    }

    ["houseNo", "street", "city", "district", "state", "country"].forEach((field) => {
      if (!String(formData[field] || "").trim()) {
        nextErrors[field] = "This field is required";
      }
    });

    if (!/^[0-9]{6}$/.test(formData.pincode)) {
      nextErrors.pincode = "Enter valid 6-digit pincode";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async ({ advance = true } = {}) => {
    if (!validate()) {
      return false;
    }

    setSaving(true);

    const payload = {
      onboardingId,
      ...formData,
      firstName: normalizeWhitespace(formData.firstName),
      middleName: normalizeWhitespace(formData.middleName),
      lastName: normalizeWhitespace(formData.lastName),
      dateOfBirth: toIsoDateString(formData.dateOfBirth),
      joiningDate: toIsoDateString(formData.joiningDate),
      workExperience: formData.workExperience === "" ? "0" : String(formData.workExperience),
    };

    try {
      const savedData = exists
        ? await updateOnboardingPersonalInfo(onboardingId, payload)
        : await createOnboardingPersonalInfo(payload);

      toastSuccess(exists ? "Personal details updated successfully." : "Personal details saved successfully.");
      setDirty(false);
      onSaved?.(savedData || payload, { advance });
      return true;
    } catch (error) {
      toastError(error?.response?.data?.message || "Failed to save personal details.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: () => handleSave({ advance: false }),
    isDirty: () => dirty,
  }));

  return (
    <div className="form-section">
      <h3>Personal Information</h3>

      <div className="form-card">
        <div className="form-grid">
          <div className="form-group">
            <label>Onboarding ID<span className="required">*</span></label>
            <input type="text" value={onboardingId} readOnly disabled />
          </div>

          {[
            ["firstName", "First Name"],
            ["middleName", "Middle Name"],
            ["lastName", "Last Name"],
            ["phoneNumber", "Phone Number"],
            ["email", "Email"],
            ["aadhaarNumber", "Aadhaar Number"],
            ["panNumber", "PAN Number"],
            ["location", "Location"],
            ["workExperience", "Experience (Years)"],
            ["department", "Department"],
            ["designation", "Designation"],
          ].map(([name, label]) => (
            <div className="form-group" key={name}>
              <label>{label}{name !== "middleName" ? <span className="required">*</span> : null}</label>
              <input
                type={name === "email" ? "email" : "text"}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className={getFieldClassName(name)}
                disabled={saving || viewMode}
              />
              <FieldError message={errors[name]} />
            </div>
          ))}

          <div className="form-group">
            <label>Date of Birth<span className="required">*</span></label>
            <AppDatePicker name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={getFieldClassName("dateOfBirth")} disabled={saving || viewMode} />
            <FieldError message={errors.dateOfBirth} />
          </div>

          <div className="form-group">
            <label>Gender<span className="required">*</span></label>
            <select name="gender" value={formData.gender} onChange={handleChange} className={getFieldClassName("gender")} disabled={saving || viewMode}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <FieldError message={errors.gender} />
          </div>

          <div className="form-group">
            <label>Marital Status<span className="required">*</span></label>
            <select name="marital_Status" value={formData.marital_Status} onChange={handleChange} className={getFieldClassName("marital_Status")} disabled={saving || viewMode}>
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
            </select>
            <FieldError message={errors.marital_Status} />
          </div>

          <div className="form-group">
            <label>Date of Joining<span className="required">*</span></label>
            <AppDatePicker name="joiningDate" value={formData.joiningDate} onChange={handleChange} className={getFieldClassName("joiningDate")} disabled={saving || viewMode} />
            <FieldError message={errors.joiningDate} />
          </div>

          <div className="form-group">
            <label>Blood Group<span className="required">*</span></label>
            <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className={getFieldClassName("bloodGroup")} disabled={saving || viewMode}>
              <option value="">Select</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <FieldError message={errors.bloodGroup} />
          </div>
        </div>
      </div>

      <div className="form-card">
        <h3>Address Information</h3>
        <div className="form-grid">
          {[
            ["houseNo", "House Number"],
            ["street", "Street / Area"],
            ["city", "City / Village"],
            ["district", "District"],
            ["state", "State"],
            ["country", "Country"],
            ["pincode", "Pincode"],
          ].map(([name, label]) => (
            <div className="form-group" key={name}>
              <label>{label}<span className="required">*</span></label>
              <input name={name} value={formData[name]} onChange={handleChange} className={getFieldClassName(name)} disabled={saving || viewMode} />
              <FieldError message={errors[name]} />
            </div>
          ))}
        </div>

        <div className="step-actions">
          {!viewMode && <button type="button" className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : exists ? "Update & Next" : "Save & Next"}
          </button>}
        </div>
      </div>
    </div>
  );
});

export const OnboardingEducationStep = forwardRef(function OnboardingEducationStep({
  onboardingId,
  data,
  exists,
  onBack,
  onSaved,
  viewMode = false,
}, ref) {
  const [rows, setRows] = useState([emptyEducation()]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const mappedRows = normalizeArrayPayload(data).map((item) => ({
      qualification: String(item.qualification ?? item.degree ?? ""),
      institution: String(item.institution ?? item.universityBoard ?? ""),
      university: String(item.university ?? ""),
      yearOfPassing: item.yearOfPassing ? String(item.yearOfPassing) : "",
      percentage: item.percentage !== undefined && item.percentage !== null
        ? String(item.percentage)
        : String(item.percentageCGPA ?? ""),
    }));

    setRows(mappedRows.length > 0 ? mappedRows : [emptyEducation()]);
    setDirty(false);
  }, [data]);

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row)
    );
    setDirty(true);
    setErrors((prev) => prev.map((error, rowIndex) => rowIndex === index ? { ...error, [field]: "" } : error));
  };

  const validate = () => {
    const nextErrors = rows.map(() => ({}));
    let valid = true;
    const currentYear = new Date().getFullYear();

    rows.forEach((row, index) => {
      if (!row.qualification.trim()) nextErrors[index].qualification = "Qualification required";
      if (!row.institution.trim()) nextErrors[index].institution = "Institution required";
      if (!row.university.trim()) nextErrors[index].university = "University required";
      if (!/^\d{4}$/.test(String(row.yearOfPassing)) || Number(row.yearOfPassing) > currentYear + 1) {
        nextErrors[index].yearOfPassing = "Enter a valid year";
      }
      const percentage = Number(row.percentage);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        nextErrors[index].percentage = "Enter a valid percentage";
      }
      if (Object.keys(nextErrors[index]).length > 0) valid = false;
    });

    setErrors(nextErrors);
    return valid;
  };

  const handleSave = async ({ advance = true } = {}) => {
    if (!validate()) return false;

    const payload = rows.map((row) => ({
      onboardingId,
      qualification: row.qualification.trim(),
      institution: row.institution.trim(),
      university: row.university.trim(),
      yearOfPassing: Number(row.yearOfPassing),
      percentage: Number(row.percentage),
    }));

    setSaving(true);

    try {
      const savedData = exists
        ? await updateOnboardingEducation(onboardingId, payload)
        : await Promise.all(payload.map(createOnboardingEducation));

      toastSuccess(exists ? "Education updated successfully." : "Education saved successfully.");
      setDirty(false);
      onSaved?.(savedData || payload, { advance });
      return true;
    } catch (error) {
      toastError(error?.response?.data?.message || "Failed to save education details.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: () => handleSave({ advance: false }),
    isDirty: () => dirty,
  }));

  return (
    <div className="form-section">
      <h3>Add Educational Qualifications</h3>

      {rows.map((row, index) => (
        <div className="form-card" key={`education-${index}`}>
          <div className="card-header">
            <h4>Education {index + 1}</h4>
            {!viewMode && rows.length > 1 && (
              <button type="button" className="remove-btn" onClick={() => {
                setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
                setDirty(true);
              }} disabled={saving}>
                Remove
              </button>
            )}
          </div>

          <div className="form-grid">
            {[
              ["qualification", "Qualification"],
              ["institution", "Institution"],
              ["university", "University"],
              ["yearOfPassing", "Year of Passing"],
              ["percentage", "Percentage"],
            ].map(([field, label]) => (
              <div className="form-group" key={field}>
                <label>{label}<span className="required">*</span></label>
                <input
                  value={row[field]}
                  onChange={(event) => updateRow(index, field, event.target.value)}
                  className={errors[index]?.[field] ? "is-invalid" : ""}
                  disabled={saving || viewMode}
                />
                <FieldError message={errors[index]?.[field]} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {!viewMode && <div className="education-add-wrapper">
        <button type="button" className="btn primary add-education-btn" onClick={() => {
          setRows((prev) => [...prev, emptyEducation()]);
          setDirty(true);
        }} disabled={saving}>
          + Add Education
        </button>
      </div>}

      <div className="step-actions">
        <button type="button" className="btn secondary" onClick={onBack} disabled={saving}>Back</button>
        {!viewMode && <button type="button" className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : exists ? "Update & Next" : "Save & Next"}
        </button>}
      </div>
    </div>
  );
});

export const OnboardingExperienceStep = forwardRef(function OnboardingExperienceStep({
  onboardingId,
  data,
  exists,
  onBack,
  onSaved,
  viewMode = false,
}, ref) {
  const [rows, setRows] = useState([emptyExperience()]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const mappedRows = normalizeArrayPayload(data).map((item) => ({
      companyName: String(item.companyName ?? ""),
      designation: String(item.designation ?? ""),
      fromDate: item.fromDate ? String(item.fromDate).split("T")[0] : "",
      toDate: item.toDate ? String(item.toDate).split("T")[0] : "",
      yearsOfExperience: Number(item.yearsOfExperience ?? item.years ?? 0),
    }));

    setRows(mappedRows.length > 0 ? mappedRows : [emptyExperience()]);
    setDirty(false);
  }, [data]);

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const nextRow = { ...row, [field]: value };

        if (field === "fromDate" || field === "toDate") {
          nextRow.yearsOfExperience = calculateYears(nextRow.fromDate, nextRow.toDate);
        }

        return nextRow;
      })
    );
    setDirty(true);
    setErrors((prev) => prev.map((error, rowIndex) => rowIndex === index ? { ...error, [field]: "" } : error));
  };

  const validate = () => {
    const nextErrors = rows.map(() => ({}));
    let valid = true;

    rows.forEach((row, index) => {
      if (!row.companyName.trim()) nextErrors[index].companyName = "Company name required";
      if (!row.designation.trim()) nextErrors[index].designation = "Designation required";
      if (!row.fromDate) nextErrors[index].fromDate = "From date required";
      if (!row.toDate) nextErrors[index].toDate = "To date required";
      if (row.fromDate && row.toDate && parseDate(row.toDate) < parseDate(row.fromDate)) {
        nextErrors[index].toDate = "To date cannot be before from date";
      }
      if (Object.keys(nextErrors[index]).length > 0) valid = false;
    });

    setErrors(nextErrors);
    return valid;
  };

  const handleSave = async ({ advance = true } = {}) => {
    if (!validate()) return false;

    const payload = rows.map((row) => buildOnboardingExperiencePayload(onboardingId, row));

    setSaving(true);

    try {
      const savedData = exists
        ? await Promise.all(
            payload.map((record) =>
              updateOnboardingExperience(onboardingId, record)
            )
          )
        : await Promise.all(payload.map(createOnboardingExperience));

      toastSuccess(exists ? "Experience updated successfully." : "Experience saved successfully.");
      setDirty(false);
      onSaved?.(savedData || payload, { advance });
      return true;
    } catch (error) {
      toastError(error?.response?.data?.message || "Failed to save experience details.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: () => handleSave({ advance: false }),
    isDirty: () => dirty,
  }));

  return (
    <div className="form-section">
      <h3>Add Previous Work Experience</h3>

      {rows.map((row, index) => (
        <div className="form-card" key={`experience-${index}`}>
          <div className="card-header">
            <h4>Experience {index + 1}</h4>
            {!viewMode && rows.length > 1 && (
              <button type="button" className="remove-btn" onClick={() => {
                setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
                setDirty(true);
              }} disabled={saving}>
                Remove
              </button>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Company Name<span className="required">*</span></label>
              <input value={row.companyName} onChange={(event) => updateRow(index, "companyName", event.target.value)} className={errors[index]?.companyName ? "is-invalid" : ""} disabled={saving || viewMode} />
              <FieldError message={errors[index]?.companyName} />
            </div>

            <div className="form-group">
              <label>Designation<span className="required">*</span></label>
              <input value={row.designation} onChange={(event) => updateRow(index, "designation", event.target.value)} className={errors[index]?.designation ? "is-invalid" : ""} disabled={saving || viewMode} />
              <FieldError message={errors[index]?.designation} />
            </div>

            <div className="form-group">
              <label>From Date<span className="required">*</span></label>
              <AppDatePicker name="fromDate" value={row.fromDate} onChange={(event) => updateRow(index, "fromDate", event.target.value)} className={errors[index]?.fromDate ? "is-invalid" : ""} disabled={saving || viewMode} />
              <FieldError message={errors[index]?.fromDate} />
            </div>

            <div className="form-group">
              <label>To Date<span className="required">*</span></label>
              <AppDatePicker name="toDate" value={row.toDate} onChange={(event) => updateRow(index, "toDate", event.target.value)} className={errors[index]?.toDate ? "is-invalid" : ""} disabled={saving || viewMode} />
              <FieldError message={errors[index]?.toDate} />
            </div>

            <div className="form-group">
              <label>Years of Experience</label>
              <input value={row.yearsOfExperience} readOnly disabled />
            </div>
          </div>
        </div>
      ))}

      {!viewMode && <button type="button" className="btn primary add-experience-btn" onClick={() => {
        setRows((prev) => [...prev, emptyExperience()]);
        setDirty(true);
      }} disabled={saving}>
        + Add Another Experience
      </button>}

      <div className="step-actions">
        <button type="button" className="btn secondary" onClick={onBack} disabled={saving}>Back</button>
        {!viewMode && <button type="button" className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : exists ? "Update & Next" : "Save & Next"}
        </button>}
      </div>
    </div>
  );
});

export const OnboardingDocumentsStep = forwardRef(function OnboardingDocumentsStep({
  onboardingId,
  onBack,
  onNext,
  onRefresh,
  viewMode = false,
  adminMode = false,
}, ref) {
  return (
    <EmployeeDocuments
      ref={ref}
      mode="onboarding"
      entityType="onboarding"
      onboardingId={onboardingId}
      viewMode={viewMode}
      agreementReadOnly={adminMode ? viewMode : false}
      onBack={onBack}
      onNext={onNext}
      onRefresh={onRefresh}
    />
  );
});

function ReviewField({ label, value }) {
  return (
    <div className="review-item">
      <span className="review-label">{label}</span>
      <span className="review-value">{value || "-"}</span>
    </div>
  );
}

function ReviewSection({
  title,
  stepNumber,
  onEditSection,
  children,
  viewMode = false,
}) {
  return (
    <div className="form-card review-section-card">
      <div className="review-section-header">
        <h4>{title}</h4>
        {!viewMode && <button type="button" className="btn secondary review-edit-btn" onClick={() => onEditSection(stepNumber)}>
          Edit
        </button>}
      </div>
      {children}
    </div>
  );
}

export function OnboardingReviewStep({
  data,
  onBack,
  onEditSection,
  onFinalSubmit,
  submitting,
  viewMode = false,
}) {
  const personal = data.personalInfo || {};
  const education = normalizeArrayPayload(data.education);
  const experience = normalizeArrayPayload(data.experience);
  const agreements = normalizeArrayPayload(data.agreements);
  const [viewingAgreementId, setViewingAgreementId] = useState("");

  const handleViewSignedAgreement = async (agreement) => {
    const agreementId = String(getAgreementId(agreement) || "");

    if (!agreementId) {
      toastError("Signed agreement is not available.");
      return;
    }

    setViewingAgreementId(agreementId);

    try {
      const response = await viewSignedAgreement(agreement);
      const blob = response?.data instanceof Blob
        ? response.data
        : new Blob([response?.data ?? []], {
            type: response?.headers?.["content-type"] || "application/pdf",
          });
      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (error) {
      toastError(error?.response?.data?.message || error?.message || "Failed to view signed agreement.");
    } finally {
      setViewingAgreementId("");
    }
  };

  return (
    <div className="form-section">
      <h3>Review & Submit</h3>
      <p className="review-intro">Review the saved onboarding details before final submission.</p>

      <ReviewSection title="Personal Details" stepNumber={1} onEditSection={onEditSection} viewMode={viewMode}>
        <div className="review-item-grid">
          <ReviewField label="Onboarding ID" value={personal.onboardingId} />
          <ReviewField label="Full Name" value={[personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(" ")} />
          <ReviewField label="Date of Birth" value={formatDate(personal.dateOfBirth)} />
          <ReviewField label="Phone Number" value={personal.phoneNumber} />
          <ReviewField label="Email" value={personal.email} />
          <ReviewField label="Aadhaar Number" value={personal.aadhaarNumber} />
          <ReviewField label="PAN Number" value={personal.panNumber} />
          <ReviewField label="Department" value={personal.department} />
          <ReviewField label="Designation" value={personal.designation} />
          <ReviewField label="Joining Date" value={formatDate(personal.joiningDate)} />
          <ReviewField label="Location" value={personal.location} />
          <ReviewField label="Blood Group" value={personal.bloodGroup} />
        </div>
      </ReviewSection>

      <ReviewSection title="Education" stepNumber={2} onEditSection={onEditSection} viewMode={viewMode}>
        {education.length === 0 ? <div className="review-empty-state">No education details added.</div> : (
          <div className="review-stack">
            {education.map((item, index) => (
              <div className="review-list-card" key={`review-education-${index}`}>
                <div className="review-section-subtitle">Education {index + 1}</div>
                <div className="review-item-grid">
                  <ReviewField label="Qualification" value={item.qualification || item.degree} />
                  <ReviewField label="Institution" value={item.institution || item.universityBoard} />
                  <ReviewField label="University" value={item.university} />
                  <ReviewField label="Year" value={item.yearOfPassing} />
                  <ReviewField label="Percentage" value={item.percentage || item.percentageCGPA} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection title="Experience" stepNumber={3} onEditSection={onEditSection} viewMode={viewMode}>
        {experience.length === 0 ? <div className="review-empty-state">No experience details added.</div> : (
          <div className="review-stack">
            {experience.map((item, index) => (
              <div className="review-list-card" key={`review-experience-${index}`}>
                <div className="review-section-subtitle">Experience {index + 1}</div>
                <div className="review-item-grid">
                  <ReviewField label="Company Name" value={item.companyName} />
                  <ReviewField label="Designation" value={item.designation} />
                  <ReviewField label="From Date" value={formatDate(item.fromDate)} />
                  <ReviewField label="To Date" value={formatDate(item.toDate)} />
                  <ReviewField label="Years of Experience" value={item.yearsOfExperience || item.years} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection title={`Uploaded Documents (${data.documents.length})`} stepNumber={4} onEditSection={onEditSection} viewMode={viewMode}>
        {data.documents.length === 0 ? <div className="review-empty-state">No documents uploaded.</div> : (
          <div className="review-stack">
            {data.documents.map((document, index) => (
              <div className="review-list-card" key={`review-document-${getDocumentId(document) || index}`}>
                <div className="review-section-subtitle">Document {index + 1}</div>
                <div className="review-item-grid">
                  <ReviewField label="Document Name" value={getDocumentName(document)} />
                  <ReviewField label="Document Type" value={getDocumentType(document)} />
                  <ReviewField label="Uploaded Date" value={formatDateTime(getUploadedDate(document))} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection title={`Employee Agreements (${agreements.length})`} stepNumber={4} onEditSection={onEditSection} viewMode={viewMode}>
        {agreements.length === 0 ? <div className="review-empty-state">No agreements found.</div> : (
          <div className="review-stack">
            {agreements.map((agreement, index) => {
              const agreementId = String(getAgreementId(agreement) || index);
              const isSigned = String(getAgreementStatus(agreement)).toLowerCase().includes("signed");

              return (
                <div className="review-list-card" key={`review-agreement-${agreementId}`}>
                  <div className="review-section-subtitle">Agreement {index + 1}</div>
                  <div className="review-item-grid">
                    <ReviewField label="Agreement Name" value={getAgreementName(agreement)} />
                    <ReviewField label="Agreement Status" value={getAgreementStatus(agreement)} />
                    <ReviewField label="Signed Date" value={formatDateTime(getAgreementSignedDate(agreement))} />
                    <ReviewField label="Signature Name" value={getAgreementSignatureName(agreement)} />
                    {isSigned && (
                      <div className="review-item review-item-full">
                        <span className="review-label">Signed Agreement</span>
                        <span className="uploaded-document-actions">
                          <button
                            type="button"
                            className="document-action-btn view-btn"
                            onClick={() => handleViewSignedAgreement(agreement)}
                            disabled={viewingAgreementId === agreementId}
                          >
                            {viewingAgreementId === agreementId ? "Opening..." : "View Signed"}
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ReviewSection>

      <div className="step-actions">
        <button type="button" className="btn secondary" onClick={onBack} disabled={submitting}>Back</button>
        {!viewMode && <button type="button" className="btn primary" onClick={onFinalSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Final Submit"}
        </button>}
      </div>
    </div>
  );
}

function OnboardingDetails({
  onboardingId: onboardingIdOverride,
  adminMode = false,
  initialEditing = false,
  title,
  subtitle,
}) {
  const onboardingId = onboardingIdOverride || getStoredOnboardingId();
  const activeStepRef = useRef(null);
  const adminStepRefs = useRef({});
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(adminMode ? ONBOARDING_STEPS.length : 1);
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    personalInfo: null,
    education: [],
    experience: [],
    documents: [],
    agreements: [],
  });
  const [exists, setExists] = useState({
    personalInfo: false,
    education: false,
    experience: false,
  });

  const loadDetails = useCallback(async ({ showLoader = true } = {}) => {
    if (!onboardingId) {
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);

    const nextData = {
      personalInfo: null,
      education: [],
      experience: [],
      documents: [],
      agreements: [],
    };
    const nextExists = {
      personalInfo: false,
      education: false,
      experience: false,
    };

    await Promise.allSettled([
      getOnboardingPersonalInfo(onboardingId).then((result) => {
        nextData.personalInfo = result;
        nextExists.personalInfo = hasRecord(result);
      }),
      getOnboardingEducation(onboardingId).then((result) => {
        nextData.education = normalizeArrayPayload(result);
        nextExists.education = nextData.education.length > 0;
      }),
      getOnboardingExperience(onboardingId).then((result) => {
        nextData.experience = normalizeArrayPayload(result);
        nextExists.experience = nextData.experience.length > 0;
      }),
      getOnboardingDocuments(onboardingId).then((result) => {
        nextData.documents = normalizeArrayPayload(result);
      }),
      Promise.all([
        getPendingAgreementCount(onboardingId),
        getSignedAgreementCount(onboardingId),
      ]).then(([pendingAgreements, signedAgreements]) => {
        nextData.agreements = mergeOnboardingAgreements(
          normalizeArrayPayload(pendingAgreements),
          normalizeArrayPayload(signedAgreements)
        );
      }),
    ]);

    setData(nextData);
    setExists(nextExists);
    setLoading(false);
  }, [onboardingId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const goToStep = async (targetStep) => {
    if (adminMode) {
      setStep(targetStep);
      return;
    }

    await loadDetails({ showLoader: false });
    setStep(targetStep);
    setMaxStep((prev) => Math.max(prev, targetStep));
  };

  const details = useMemo(() => ({
    ...data,
    documents: Array.isArray(data.documents) ? data.documents : [],
    agreements: Array.isArray(data.agreements) ? data.agreements : [],
  }), [data]);

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      await loadDetails({ showLoader: false });
      toastSuccess("Onboarding details submitted successfully.");
      setMaxStep(5);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHeaderAction = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setHeaderSaving(true);

    try {
      if (adminMode) {
        const editableRefs = [1, 2, 3, 4]
          .map((stepId) => adminStepRefs.current[stepId])
          .filter((stepRef) => stepRef?.isDirty?.());

        for (const stepRef of editableRefs) {
          const saved = await stepRef.save?.();

          if (saved === false) {
            return;
          }
        }

        await loadDetails({ showLoader: false });
        setIsEditing(false);
        return;
      }

      if (step === 5) {
        setIsEditing(false);
        return;
      }

      const saved = await activeStepRef.current?.save?.();

      if (saved !== false) {
        setIsEditing(false);
      }
    } finally {
      setHeaderSaving(false);
    }
  };

  if (!onboardingId) {
    return (
      <div className="add-employee">
        <div className="page-header-row profile-card">
          <div className="profile-header-copy">
            <h2 className="page-title profile-title">Candidate Onboarding</h2>
            <p className="employee-empty-message">Onboarding ID was not found for this session.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="employee-loader-container">
        <div className="employee-loader"></div>
        <p>Loading onboarding details...</p>
      </div>
    );
  }

  const personal = details.personalInfo || {};
  const candidateName = [personal.firstName, personal.middleName, personal.lastName]
    .filter(Boolean)
    .join(" ");
  const stepperMaxStep = adminMode ? ONBOARDING_STEPS.length : maxStep;
  const setStepperStep = adminMode ? setStep : setStep;
  const setAdminStepRef = (stepId) => (node) => {
    if (node) {
      adminStepRefs.current[stepId] = node;
      return;
    }

    delete adminStepRefs.current[stepId];
  };
  const adminSectionStyle = (stepId) => ({
    display: step === stepId ? "block" : "none",
  });

  return (
    <div className="add-employee">
      <div className="page-header-row profile-card">
        <div className="profile-header-copy">
          <h2 className="page-title profile-title">
            {title || (adminMode ? candidateName || "Candidate Details" : "My Profile")}
          </h2>
          <p className="page-subtitle">
            {subtitle || (adminMode
              ? [
                  personal.onboardingId || onboardingId,
                  personal.department,
                  personal.designation,
                  personal.email,
                  personal.phoneNumber,
                  formatDate(personal.joiningDate),
                  personal.location,
                ].filter(Boolean).join(" | ")
              : "Complete your profile step by step")}
          </p>
        </div>

        <div className="profile-header-actions">
          <div className="profile-header-buttons">
            <button
              type="button"
              className="edit-profile-btn"
              onClick={handleHeaderAction}
              disabled={headerSaving}
            >
              {isEditing ? headerSaving ? "Saving..." : "Save" : "Edit"}
            </button>
          </div>
        </div>
      </div>

      <Stepper
        step={step}
        setStep={setStepperStep}
        maxStep={stepperMaxStep}
        steps={ONBOARDING_STEPS}
        ariaLabel="Candidate onboarding steps"
      />

      <div className="step-content">
        {adminMode ? (
          <>
            <div style={adminSectionStyle(1)}>
              <OnboardingPersonalStep
                ref={setAdminStepRef(1)}
                onboardingId={onboardingId}
                data={details.personalInfo}
                exists={exists.personalInfo}
                viewMode={!isEditing}
                onSaved={(savedData) => {
                  setData((prev) => ({ ...prev, personalInfo: savedData || prev.personalInfo }));
                  setExists((prev) => ({ ...prev, personalInfo: true }));
                }}
              />
            </div>

            <div style={adminSectionStyle(2)}>
              <OnboardingEducationStep
                ref={setAdminStepRef(2)}
                onboardingId={onboardingId}
                data={details.education}
                exists={exists.education}
                viewMode={!isEditing}
                onBack={() => setStep(1)}
                onSaved={(savedData) => {
                  setData((prev) => ({ ...prev, education: normalizeArrayPayload(savedData) }));
                  setExists((prev) => ({ ...prev, education: true }));
                }}
              />
            </div>

            <div style={adminSectionStyle(3)}>
              <OnboardingExperienceStep
                ref={setAdminStepRef(3)}
                onboardingId={onboardingId}
                data={details.experience}
                exists={exists.experience}
                viewMode={!isEditing}
                onBack={() => setStep(2)}
                onSaved={(savedData) => {
                  setData((prev) => ({ ...prev, experience: normalizeArrayPayload(savedData) }));
                  setExists((prev) => ({ ...prev, experience: true }));
                }}
              />
            </div>

            <div style={adminSectionStyle(4)}>
              <OnboardingDocumentsStep
                ref={setAdminStepRef(4)}
                onboardingId={onboardingId}
                documents={details.documents}
                viewMode={!isEditing}
                adminMode={adminMode}
                onBack={() => setStep(3)}
                onRefresh={() => loadDetails({ showLoader: false })}
                onNext={() => setStep(5)}
              />
            </div>

            <div style={adminSectionStyle(5)}>
              <OnboardingReviewStep
                data={details}
                viewMode={!isEditing}
                onBack={() => setStep(4)}
                onEditSection={setStep}
                onFinalSubmit={handleFinalSubmit}
                submitting={submitting}
              />
            </div>
          </>
        ) : (
          <>
            {step === 1 && (
              <OnboardingPersonalStep
                ref={activeStepRef}
                onboardingId={onboardingId}
                data={details.personalInfo}
                exists={exists.personalInfo}
                viewMode={!isEditing}
                onSaved={(savedData, options = {}) => {
                  setData((prev) => ({ ...prev, personalInfo: savedData || prev.personalInfo }));
                  setExists((prev) => ({ ...prev, personalInfo: true }));
                  if (options.advance !== false) goToStep(2);
                }}
              />
            )}

            {step === 2 && (
              <OnboardingEducationStep
                ref={activeStepRef}
                onboardingId={onboardingId}
                data={details.education}
                exists={exists.education}
                viewMode={!isEditing}
                onBack={() => setStep(1)}
                onSaved={(savedData, options = {}) => {
                  setData((prev) => ({ ...prev, education: normalizeArrayPayload(savedData) }));
                  setExists((prev) => ({ ...prev, education: true }));
                  if (options.advance !== false) goToStep(3);
                }}
              />
            )}

            {step === 3 && (
              <OnboardingExperienceStep
                ref={activeStepRef}
                onboardingId={onboardingId}
                data={details.experience}
                exists={exists.experience}
                viewMode={!isEditing}
                onBack={() => setStep(2)}
                onSaved={(savedData, options = {}) => {
                  setData((prev) => ({ ...prev, experience: normalizeArrayPayload(savedData) }));
                  setExists((prev) => ({ ...prev, experience: true }));
                  if (options.advance !== false) goToStep(4);
                }}
              />
            )}

            {step === 4 && (
              <OnboardingDocumentsStep
                ref={activeStepRef}
                onboardingId={onboardingId}
                documents={details.documents}
                viewMode={!isEditing}
                onBack={() => setStep(3)}
                onRefresh={() => loadDetails({ showLoader: false })}
                onNext={async () => {
                  await goToStep(5);
                }}
              />
            )}

            {step === 5 && (
              <OnboardingReviewStep
                data={details}
                viewMode={!isEditing}
                onBack={() => setStep(4)}
                onEditSection={(targetStep) => {
                  setStep(targetStep);
                  setMaxStep((prev) => Math.max(prev, targetStep));
                }}
                onFinalSubmit={handleFinalSubmit}
                submitting={submitting}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OnboardingDetails;
