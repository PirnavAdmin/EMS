import React, { useEffect, useState } from "react";
import "./AddEmployee.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import AppDatePicker from "../../components/AppDatePicker";
import { extractCollection } from "../../utils/collections";
import { formatEmployeeCode } from "../../utils/formatters";
import { toIsoDateString } from "../../utils/date";
import {
  normalizeWhitespace,
  sanitizeAlphaNumericInput,
  sanitizeEmailInput,
  sanitizeLettersAndSpaces,
  sanitizePhoneInput,
  validateEmailAddress,
  validateEmployeeId,
  validateEmployeeName,
  validatePhoneNumber,
} from "../../utils/validation";

const INITIAL_FORM_DATA = {
  employeeId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  phone: "",
  email: "",
  aadhaar: "",
  pan: "",
  department: "",
  designation: "",
  joiningDate: "",
  workExperience: "",
  bloodGroup: "",
  houseNo: "",
  street: "",
  city: "",
  district: "",
  state: "",
  country: "",
  pincode: "",
};

function PersonalInfo({ onNext, viewMode, data }) {
  // Temporarily hidden until finalized
  const isWorkExperienceFieldHidden = true;

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormData({
      ...INITIAL_FORM_DATA,
      employeeId: String(data.employee_Id ?? ""),
      firstName: String(data.firstName ?? ""),
      middleName: String(data.middleName ?? ""),
      lastName: String(data.lastName ?? ""),
      dob: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "",
      gender: String(data.gender ?? ""),
      maritalStatus: String(data.marital_Status ?? ""),
      phone: String(data.phoneNumber ?? ""),
      email: String(data.email ?? ""),
      aadhaar: String(data.aadhaarNumber ?? ""),
      pan: String(data.panNumber ?? ""),
      department: String(data.department ?? ""),
      designation: String(data.designation ?? ""),
      joiningDate: data.joiningDate ? data.joiningDate.split("T")[0] : "",
      workExperience:
        data.workExperience !== undefined && data.workExperience !== null
          ? String(data.workExperience)
          : "",
      bloodGroup: String(data.bloodGroup ?? ""),
      houseNo: String(data.houseNo ?? ""),
      street: String(data.street ?? ""),
      city: String(data.city ?? ""),
      district: String(data.district ?? ""),
      state: String(data.state ?? ""),
      country: String(data.country ?? ""),
      pincode: String(data.pincode ?? ""),
    });
  }, [data]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.departments.list);
        setDepartments(extractCollection(response.data));
      } catch (error) {
        console.error("Department fetch error:", error);
      }
    };

    fetchDepartments();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (["firstName", "middleName", "lastName"].includes(name)) {
      nextValue = sanitizeLettersAndSpaces(value, 30);
    }

    if (name === "phone") {
      nextValue = sanitizePhoneInput(value, 10);
    }

    if (name === "email") {
      nextValue = sanitizeEmailInput(value, 60);
    }

    if (name === "aadhaar") {
      nextValue = value.replace(/\D/g, "").slice(0, 12);
    }

    if (name === "pan") {
      nextValue = value.toUpperCase();
    }

    if (name === "employeeId") {
      nextValue = sanitizeAlphaNumericInput(formatEmployeeCode(value), 10);
    }

    if (name === "houseNo") {
      nextValue = value.replace(/[^a-zA-Z0-9/-]/g, "").slice(0, 15);
    }

    if (name === "street") {
      nextValue = value
        .replace(/[^a-zA-Z0-9,\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\s+/g, "")
        .slice(0, 50);
    }

    if (name === "city") {
      nextValue = value
        .replace(/[^a-zA-Z,\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\s+/g, "")
        .slice(0, 50);
    }

    if (["district", "state", "country"].includes(name)) {
      nextValue = value
        .replace(/[^a-zA-Z\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\s+/g, "")
        .slice(0, 30);
    }

    if (name === "pincode") {
      nextValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    const employeeIdError = validateEmployeeId(formData.employeeId, {
      label: "Employee ID",
      min: 3,
      max: 10,
    });
    if (employeeIdError) {
      nextErrors.employeeId = employeeIdError;
    }

    const firstNameError = validateEmployeeName(formData.firstName, {
      label: "First Name",
      min: 2,
      max: 30,
    });
    if (firstNameError) {
      nextErrors.firstName = firstNameError;
    }

    if (normalizeWhitespace(formData.middleName)) {
      const middleNameError = validateEmployeeName(formData.middleName, {
        label: "Middle Name",
        min: 1,
        max: 30,
      });

      if (middleNameError) {
        nextErrors.middleName = middleNameError;
      }
    }

    const lastNameError = validateEmployeeName(formData.lastName, {
      label: "Last Name",
      min: 2,
      max: 30,
    });
    if (lastNameError) {
      nextErrors.lastName = lastNameError;
    }

    if (!formData.gender) {
      nextErrors.gender = "Gender is required";
    }

    if (!formData.maritalStatus) {
      nextErrors.maritalStatus = "Marital status is required";
    }

    if (!formData.dob) {
      nextErrors.dob = "Date of birth is required";
    }

    const phoneError = validatePhoneNumber(formData.phone);
    if (phoneError) {
      nextErrors.phone = phoneError;
    }

    const emailError = validateEmailAddress(formData.email, {
      label: "Email",
      max: 60,
    });
    if (emailError) {
      nextErrors.email = emailError;
    }

    if (!/^[0-9]{12}$/.test(formData.aadhaar)) {
      nextErrors.aadhaar = "Aadhaar must be 12 digits";
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) {
      nextErrors.pan = "Enter valid PAN (e.g., ABCDE1234F)";
    }

    if (!formData.department.trim()) {
      nextErrors.department = "Department is required";
    }

    if (!isWorkExperienceFieldHidden && formData.workExperience === "") {
      nextErrors.workExperience = "Experience is required";
    }

    if (!formData.designation.trim()) {
      nextErrors.designation = "Designation is required";
    }

    if (!formData.joiningDate) {
      nextErrors.joiningDate = "Joining date is required";
    }

    if (!formData.bloodGroup) {
      nextErrors.bloodGroup = "Blood group is required";
    }

    if (!formData.houseNo.trim()) {
      nextErrors.houseNo = "House Number is required";
    } else if (!/^[a-zA-Z0-9/-]{1,15}$/.test(formData.houseNo)) {
      nextErrors.houseNo =
        "Max 15 characters. Only letters, numbers, - or / allowed";
    }

    if (!formData.street.trim()) {
      nextErrors.street = "Street is required";
    } else if (formData.street.length > 50) {
      nextErrors.street = "Street cannot exceed 50 characters";
    } else if (!/^[A-Za-z0-9,\s]+$/.test(formData.street)) {
      nextErrors.street =
        "Only letters, numbers, spaces and comma are allowed";
    } else {
      const streetWords = formData.street.trim().split(/\s+/);

      if (streetWords.length < 2) {
        nextErrors.street = "Street must contain at least 2 words";
      }
    }

    if (!formData.city.trim()) {
      nextErrors.city = "City is required";
    } else if (formData.city.length > 50) {
      nextErrors.city = "City cannot exceed 50 characters";
    } else if (!/^[A-Za-z,\s]+$/.test(formData.city)) {
      nextErrors.city =
        "Only alphabets, spaces and comma are allowed";
    }

    if (!formData.district.trim()) {
      nextErrors.district = "District is required";
    } else if (!/^[A-Za-z\s]{1,30}$/.test(formData.district)) {
      nextErrors.district = "Only alphabets allowed (max 30 characters)";
    }

    if (!formData.state.trim()) {
      nextErrors.state = "State is required";
    } else if (!/^[A-Za-z\s]{1,30}$/.test(formData.state)) {
      nextErrors.state = "Only alphabets allowed (max 30 characters)";
    }

    if (!formData.country.trim()) {
      nextErrors.country = "Country is required";
    } else if (!/^[A-Za-z\s]{1,30}$/.test(formData.country)) {
      nextErrors.country = "Only alphabets allowed (max 30 characters)";
    }

    if (!/^[0-9]{6}$/.test(formData.pincode)) {
      nextErrors.pincode = "Enter valid 6-digit pincode";
    }

    return nextErrors;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setApiError("");
    setSuccessMsg("");
    setSaving(true);

    const resolvedWorkExperience =
      formData.workExperience === ""
        ? data?.workExperience ?? 0
        : formData.workExperience;

    const payload = {
      employee_Id: formData.employeeId.trim().toUpperCase(),
      firstName: normalizeWhitespace(formData.firstName),
      middleName: normalizeWhitespace(formData.middleName),
      lastName: normalizeWhitespace(formData.lastName),
      dateOfBirth: toIsoDateString(formData.dob),
      phoneNumber: formData.phone,
      email: sanitizeEmailInput(formData.email, 60),
      aadhaarNumber: formData.aadhaar,
      panNumber: formData.pan,
      bloodGroup: formData.bloodGroup,
      marital_Status: formData.maritalStatus,
      department: formData.department,
      designation: formData.designation,
      gender: formData.gender,
      location: "India",
      houseNo: formData.houseNo,
      street: formData.street,
      city: formData.city,
      district: formData.district,
      state: formData.state,
      country: formData.country,
      pincode: formData.pincode,
      workExperience: String(resolvedWorkExperience ?? "0"),
      joiningDate: toIsoDateString(formData.joiningDate),
    };

    try {
      const response = data
        ? await api.put(
          API_ENDPOINTS.employeePersonalInfo.byEmployeeId(formData.employeeId),
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
        : await api.post(
          API_ENDPOINTS.employeePersonalInfo.list,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

      console.log("Saved:", response.data);
      setSuccessMsg(data ? "Updated successfully!" : "Saved successfully!");

      setTimeout(() => {
        onNext?.(formData.employeeId);
      }, 800);
    } catch (error) {
      console.log("Backend Validation Errors:");

      if (error.response?.data?.errors) {
        Object.entries(error.response.data.errors).forEach(([field, messages]) => {
          console.log(field, messages);
        });
      }

      console.log(error.response?.data);
      setApiError(
        error.response?.data?.message || "Failed to save personal information."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderError = (field) =>
    errors[field] ? (
      <span
        className="field-error"
        role="alert"
      >
        {errors[field]}
      </span>
    ) : null;

  const getFieldClassName = (field, extraClass = "") =>
    [extraClass, errors[field] ? "is-invalid" : ""]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="form-section">
      <h3>Personal Information</h3>

      <div className="form-card">
        <div className="form-grid">
          <div className="form-group">
            <label>Employee ID<span className="required">*</span></label>
            <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} className={getFieldClassName("employeeId")} disabled={viewMode} />
            {renderError("employeeId")}
          </div>

          <div className="form-group">
            <label>First Name<span className="required">*</span></label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={getFieldClassName("firstName")} disabled={viewMode} />
            {renderError("firstName")}
          </div>

          <div className="form-group">
            <label>Middle Name</label>
            <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className={getFieldClassName("middleName")} disabled={viewMode} />
            {renderError("middleName")}
          </div>

          <div className="form-group">
            <label>Last Name<span className="required">*</span></label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={getFieldClassName("lastName")} disabled={viewMode} />
            {renderError("lastName")}
          </div>

          <div className="form-group">
            <label>Gender<span className="required">*</span></label>
            <select name="gender" value={formData.gender} onChange={handleChange} className={getFieldClassName("gender")} disabled={viewMode}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {renderError("gender")}
          </div>

          <div className="form-group">
            <label>Marital Status<span className="required">*</span></label>
            <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className={getFieldClassName("maritalStatus")} disabled={viewMode}>
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
            </select>
            {renderError("maritalStatus")}
          </div>

          <div className="form-group">
            <label>Date of Birth<span className="required">*</span></label>
            <AppDatePicker name="dob" value={formData.dob} onChange={handleChange} className={getFieldClassName("dob")} disabled={viewMode} />
            {renderError("dob")}
          </div>

          <div className="form-group">
            <label>Phone Number<span className="required">*</span></label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={getFieldClassName("phone")} disabled={viewMode} />
            {renderError("phone")}
          </div>

          <div className="form-group">
            <label>Email<span className="required">*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className={getFieldClassName("email")} disabled={viewMode} />
            {renderError("email")}
          </div>

          <div className="form-group">
            <label>Aadhaar Number<span className="required">*</span></label>
            <input type="text" name="aadhaar" value={formData.aadhaar} onChange={handleChange} className={getFieldClassName("aadhaar")} disabled={viewMode} />
            {renderError("aadhaar")}
          </div>

          <div className="form-group">
            <label>PAN Number<span className="required">*</span></label>
            <input type="text" name="pan" value={formData.pan} onChange={handleChange} className={getFieldClassName("pan")} disabled={viewMode} />
            {renderError("pan")}
          </div>

          <div className="form-group">
            <label>Department<span className="required">*</span></label>
            <select name="department" value={formData.department} onChange={handleChange} className={getFieldClassName("department")} disabled={viewMode}>
              <option value="">Select</option>
              {departments.map((department) => (
                <option key={department.id} value={department.departmentName}>
                  {department.departmentName}
                </option>
              ))}
            </select>
            {renderError("department")}
          </div>

          <div className="form-group">
            <label>Designation<span className="required">*</span></label>
            <select name="designation" value={formData.designation} onChange={handleChange} className={getFieldClassName("designation")} disabled={viewMode}>
              <option value="">Select</option>
              <option value="Associate Software Engineer">Associate Software Engineer</option>
              <option value="Senior Software Engineer">Senior Software Engineer</option>
              <option value="Tech Lead">Tech Lead</option>
              <option value="QA Analyst">QA Analyst</option>
              <option value="QA Engineer">QA Engineer</option>
              <option value="QA Automation Engineer">QA Automation Engineer</option>
              <option value="QA Lead">QA Lead</option>
              <option value="Manager">Manager</option>
              <option value="HR">HR</option>
              <option value="HR Manager">HR Manager</option>
              <option value="HR Intern">HR Intern</option>
              <option value="HR Executive">HR Executive</option>
            </select>
            {renderError("designation")}
          </div>
 

          <div className="form-group">
            <label>Date of Joining<span className="required">*</span></label>
            <AppDatePicker
              name="joiningDate"
              value={formData.joiningDate}
              onChange={handleChange}
              className={getFieldClassName("joiningDate")}
              disabled={viewMode}
            />
            {renderError("joiningDate")}
          </div>

          {!isWorkExperienceFieldHidden && (
            <div className="form-group">
              <label>Experience (Years)<span className="required">*</span></label>
              <select name="workExperience" value={formData.workExperience} onChange={handleChange} disabled={viewMode}>
                <option value="">Select</option>
                {[...Array(21).keys()].map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
              {renderError("workExperience")}
            </div>
          )}

          <div className="form-group">
            <label>Blood Group<span className="required">*</span></label>
            <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className={getFieldClassName("bloodGroup")} disabled={viewMode}>
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
            {renderError("bloodGroup")}
          </div>
        </div>
      </div>

      <div className="form-card">
        <h3>Address Information</h3>

        <div className="form-grid">
          <div className="form-group">
            <label>House Number <span className="required">*</span></label>
            <input type="text" name="houseNo" value={formData.houseNo} onChange={handleChange} placeholder="House Number" className={getFieldClassName("houseNo")} disabled={viewMode} />
            {renderError("houseNo")}
          </div>

          <div className="form-group">
            <label>Street / Area<span className="required">*</span></label>
            <input type="text" name="street" value={formData.street} onChange={handleChange} className={getFieldClassName("street")} disabled={viewMode} />
            {renderError("street")}
          </div>

          <div className="form-group">
            <label>City / Village<span className="required">*</span></label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} className={getFieldClassName("city")} disabled={viewMode} />
            {renderError("city")}
          </div>

          <div className="form-group">
            <label>District<span className="required">*</span></label>
            <input type="text" name="district" value={formData.district} onChange={handleChange} className={getFieldClassName("district")} disabled={viewMode} />
            {renderError("district")}
          </div>

          <div className="form-group">
            <label>State<span className="required">*</span></label>
            <input type="text" name="state" value={formData.state} onChange={handleChange} className={getFieldClassName("state")} disabled={viewMode} />
            {renderError("state")}
          </div>

          <div className="form-group">
            <label>Country<span className="required">*</span></label>
            <input type="text" name="country" value={formData.country} onChange={handleChange} className={getFieldClassName("country")} disabled={viewMode} />
            {renderError("country")}
          </div>

          <div className="form-group">
            <label>Pincode<span className="required">*</span></label>
            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className={getFieldClassName("pincode")} disabled={viewMode} />
            {renderError("pincode")}
          </div>
        </div>

        <div className="step-actions">
          {successMsg && (
            <p
              className="workflow-feedback success"
            >
              {successMsg}
            </p>
          )}

          {apiError && (
            <p
              className="workflow-feedback error"
            >
              {apiError}
            </p>
          )}

          {!viewMode && (
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? data
                  ? "Updating..."
                  : "Saving..."
                : data
                  ? "Update & Next"
                  : "Save & Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonalInfo;
