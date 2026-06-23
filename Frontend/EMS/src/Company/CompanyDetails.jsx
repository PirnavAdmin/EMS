import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  FaEnvelope,
  FaPhoneAlt,
  FaReceipt,
  FaSitemap,
} from "react-icons/fa";
import "./CompanyDetails.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import AppDatePicker from "../components/AppDatePicker";
import { extractCollection } from "../utils/collections";
import { formatDate, toIsoDateString } from "../utils/date";
import {
  normalizeWhitespace,
  sanitizeAlphaNumericInput,
  sanitizeDigitsInput,
  sanitizeEmailInput,
  sanitizeLeadingWhitespace,
  sanitizeLettersAndSpaces,
  sanitizePhoneInput,
  validateEmailAddress,
  validateEmployeeName,
  validateGstNumber,
  validatePanNumber,
  validatePhoneNumber,
  validateTinNumber,
} from "../utils/validation";

const COMPANY_ID = 1;

const EMPTY_BRANCH = {
  name: "",
  established: "",
  phone: "",
  email: "",
};

const createEmptyCompany = () => ({
  name: "",
  established: "",
  phone: "",
  email: "",
  gst: "",
  tin: "",
  pan: "",
});

const isFutureDate = (value) => {
  if (!value) {
    return false;
  }

  const selectedDate = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate > today;
};

const isMeaningfulName = (value) => {

  if (!value) return false;

  const cleanValue =
    value
      .trim()
      .toLowerCase();

  // prevent same character repeated
  if (/^(.)\1+$/.test(cleanValue)) {
    return false;
  }

  // prevent random keyboard patterns
  const invalidPatterns = [
    "asdf",
    "qwer",
    "zxcv",
    "poi",
    "lkj",
    "mnb",
    "test",
    "aaa",
    "bbb",
    "ccc"
  ];

  const hasInvalidPattern =
    invalidPatterns.some((pattern) =>
      cleanValue.includes(pattern)
    );

  if (hasInvalidPattern) {
    return false;
  }

  // minimum meaningful characters
  const uniqueChars =
    new Set(
      cleanValue.replace(/\s/g, "")
    );

  if (uniqueChars.size < 3) {
    return false;
  }

  return true;
};

function CompanyDetails() {
  const [company, setCompany] = useState(createEmptyCompany);
  const [branches, setBranches] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showBranchPopup, setShowBranchPopup] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [branchErrors, setBranchErrors] = useState({});
  const [companyErrors, setCompanyErrors] = useState({});
  const [companySaving, setCompanySaving] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);

  const fetchCompany = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.company.getById(COMPANY_ID));
      const data = res.data || {};

      setCompany({
        name: data.companyName || "",
        established: data.establishedDate?.split("T")[0] || "",
        phone: sanitizePhoneInput(data.phoneNumber, 10),
        email: data.emailAddress || "",
        gst: sanitizeAlphaNumericInput(data.gstNumber, 15),
        tin: sanitizeDigitsInput(data.tinNumber, 11),
        pan: sanitizeAlphaNumericInput(data.panNumber, 10),
      });
    } catch (error) {
      console.error("Company fetch error:", error);
      toast.error("Failed to load company details.");
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.company.branches.list);
      const mappedBranches = extractCollection(res.data).map((branchItem) => ({
        id: branchItem.id,
        name: branchItem.branchName || "",
        established: branchItem.established
          ? branchItem.established.split("T")[0]
          : "",
        phone: sanitizePhoneInput(branchItem.phoneNumber, 10),
        email: branchItem.email || "",
      }));

      setBranches(mappedBranches);
    } catch (error) {
      console.error("Branches fetch error:", error);
      toast.error("Failed to load branches.");
    }
  };

  useEffect(() => {
    fetchCompany();
    fetchBranches();
  }, []);

  const companyInfoItems = useMemo(
    () => [
      {
        icon: <FaPhoneAlt />,
        label: "Phone Number",
        value: company.phone || "-",
      },
      {
        icon: <FaEnvelope />,
        label: "Email Address",
        value: company.email || "-",
      },
      {
        icon: <FaReceipt />,
        label: "GST Number",
        value: company.gst || "-",
      },
      {
        icon: <FaReceipt />,
        label: "TIN Number",
        value: company.tin || "-",
      },
      {
        icon: <FaReceipt />,
        label: "PAN Number",
        value: company.pan || "-",
      },
      {
        icon: <FaSitemap />,
        label: "Branches",
        value: String(branches.length),
      },
    ],
    [branches.length, company.email, company.gst, company.pan, company.phone, company.tin]
  );

  const resetBranchForm = () => {
    setBranchForm(EMPTY_BRANCH);
    setBranchErrors({});
    setEditingBranchId(null);
  };

  const closeModal = () => {
    if (companySaving || branchSaving) {
      return;
    }

    setModalType(null);
    resetBranchForm();
    setCompanyErrors({});
  };

  const closeBranchPopup = () => {
    setSelectedBranch(null);
    setShowBranchPopup(false);
  };

  const handleCompanyChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "name") {
 
      nextValue = value
        .replace(/[^A-Za-z\s]/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/^\s+/g, "")
        .slice(0, 40);
    }
    else if (name === "phone") {
      // Exactly 10 digits only
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }
    else if (name === "email") {

      nextValue = value
        .replace(/\s/g, "") // no spaces
        .replace(/[^A-Za-z0-9@.]/g, "") // only alphabets numbers @ .
        .replace(/@{2,}/g, "@") // prevent multiple @ together
        .toLowerCase()
        .slice(0, 40);

      // allow only one @
      const atCount =
        (nextValue.match(/@/g) || []).length;

      if (atCount > 1) {
        return;
      }
    }
    else if (name === "gst") {
      // GSTIN2345666835 format
      nextValue = value
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase()
        .slice(0, 15);
    }
    else if (name === "tin") {
      // 10 digits only
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }
    else if (name === "pan") {
      // CVFGH4567J format
      nextValue = value
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase()
        .slice(0, 10);
    }

    setCompany((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setCompanyErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleBranchChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "name") {
      // only alphabets + spaces, max 30 chars
      nextValue = value
        .replace(/[^A-Za-z ]/g, "")
        .replace(/\s{2,}/g, " ")
        .slice(0, 30);
    } else if (name === "phone") {
      // only 10 digits
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (name === "email") {

      nextValue = value
        .replace(/\s/g, "")
        .replace(/[^A-Za-z0-9@.]/g, "")
        .replace(/@{2,}/g, "@")
        .toLowerCase()
        .slice(0, 40);

      const atCount =
        (nextValue.match(/@/g) || []).length;

      if (atCount > 1) {
        return;
      }
    }

    setBranchForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setBranchErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateCompany = () => {
    const nextErrors = {};
    const companyName = normalizeWhitespace(company.name);

    // Company Name
    if (!companyName) {
      nextErrors.name = "Company Name is required";
    }
    else if (companyName.length > 40) {
      nextErrors.name =
        "Company Name cannot exceed 40 characters";
    }
    else if (!/^[A-Za-z\s]+$/.test(companyName)) {
      nextErrors.name =
        "Company Name must contain only alphabets";
    }
    else if (!isMeaningfulName(companyName)) {
      nextErrors.name =
        "Enter a meaningful Company Name";
    }

    // Established Date
    if (!company.established) {
      nextErrors.established =
        "Established Date is required";
    }
    else if (isFutureDate(company.established)) {
      nextErrors.established =
        "Future dates are not allowed";
    }

    // Phone Number
    if (!company.phone) {
      nextErrors.phone = "Phone Number is required";
    }
    else if (!/^\d{10}$/.test(company.phone)) {
      nextErrors.phone =
        "Phone Number must contain exactly 10 digits";
    }
    else if (/^(\d)\1{9}$/.test(company.phone)) {
      nextErrors.phone =
        "Phone Number cannot contain same digit continuously";
    }

    // Email
    // Email
    if (!company.email) {

      nextErrors.email =
        "Email Address is required";

    }
    else if (
      company.email.length > 35
    ) {

      nextErrors.email =
        "Email Address cannot exceed 35 characters";

    }
    else if (
      company.email.startsWith("@") ||
      /^[0-9]/.test(company.email)
    ) {

      nextErrors.email =
        "Email cannot start with @ or number";

    }
    else if (
      /\s/.test(company.email)
    ) {

      nextErrors.email =
        "Spaces are not allowed in Email";

    }
    else if (
      (company.email.match(/@/g) || []).length !== 1
    ) {

      nextErrors.email =
        "Only one @ is allowed";

    }
    else if (
      !/^[a-z][a-z0-9]*@(gmail|yahoo|pirnav)\.com$/.test(
        company.email
      )
    ) {

      nextErrors.email =
        "Email must be like abc123@gmail.com";

    }
    else {

      const localPart =
        company.email.split("@")[0];

      if (/^(.)\1+$/.test(localPart)) {

        nextErrors.email =
          "Email cannot contain repeated same character continuously";

      }
    }

    // GST Number Format -> GSTIN2345666835
    if (!company.gst) {
      nextErrors.gst = "GST Number is required";
    }
    else if (!/^GSTIN\d{10}$/.test(company.gst)) {
      nextErrors.gst =
        "GST Number format must be GSTIN2345666835";
    }

    // TIN Number -> 10 digits
    if (!company.tin) {
      nextErrors.tin = "TIN Number is required";
    }
    else if (!/^\d{10}$/.test(company.tin)) {
      nextErrors.tin =
        "TIN Number must contain exactly 10 digits";
    }

    // PAN Number -> CVFGH4567J
    if (!company.pan) {
      nextErrors.pan = "PAN Number is required";
    }
    else if (
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(company.pan)
    ) {
      nextErrors.pan =
        "PAN Number format must be like CVFGH4567J";
    }

    setCompanyErrors(nextErrors);

    setCompany((prev) => ({
      ...prev,
      name: companyName,
      email: company.email.trim(),
    }));

    return Object.keys(nextErrors).length === 0;
  };

  const validateBranch = () => {
    const nextErrors = {};
    const branchName = normalizeWhitespace(branchForm.name);

    // Branch Name Validation
    if (!branchName) {
      nextErrors.name = "Branch Name is required";
    } else if (branchName.length > 30) {
      nextErrors.name = "Branch Name must not exceed 30 characters";
    } else if (!/^[A-Za-z ]+$/.test(branchName)) {
      nextErrors.name =
        "Branch Name must contain only alphabets";
    }
    else if (!isMeaningfulName(branchName)) {
      nextErrors.name =
        "Enter a meaningful Branch Name";
    }

    // Established Date Validation
    if (!branchForm.established) {
      nextErrors.established = "Established Date is required";
    } else if (isFutureDate(branchForm.established)) {
      nextErrors.established = "Future dates are not allowed";
    }

    // Phone Validation
    if (!branchForm.phone) {
      nextErrors.phone = "Phone Number is required";
    } else if (!/^\d{10}$/.test(branchForm.phone)) {
      nextErrors.phone =
        "Phone Number must contain exactly 10 digits";
    }
    else if (/^(\d)\1{9}$/.test(branchForm.phone)) {
      nextErrors.phone =
        "Phone Number cannot contain same digit continuously";
    }

    // Email Validation
    // Email
    if (!branchForm.email) {

      nextErrors.email =
        "Email Address is required";

    }
    else if (
      branchForm.email.length > 35
    ) {

      nextErrors.email =
        "Email Address cannot exceed 35 characters";

    }
    else if (
      branchForm.email.startsWith("@") ||
      /^[0-9]/.test(branchForm.email)
    ) {

      nextErrors.email =
        "Email cannot start with @ or number";

    }
    else if (
      /\s/.test(branchForm.email)
    ) {

      nextErrors.email =
        "Spaces are not allowed in Email";

    }
    else if (
      (branchForm.email.match(/@/g) || []).length !== 1
    ) {

      nextErrors.email =
        "Only one @ is allowed";

    }
    else if (
      !/^[a-z][a-z0-9]*@(gmail|yahoo|pirnav)\.com$/.test(
        branchForm.email
      )
    ) {

      nextErrors.email =
        "Email must be like abc123@gmail.com";

    }
    else {

      const localPart =
        branchForm.email.split("@")[0];

      if (/^(.)\1+$/.test(localPart)) {

        nextErrors.email =
          "Email cannot contain repeated same character continuously";

      }
    }

  setBranchErrors(nextErrors);

  setBranchForm((prev) => ({
    ...prev,
    name: branchName,
  }));

  return Object.keys(nextErrors).length === 0;
};

const updateCompany = async () => {
  if (!validateCompany()) {
    return;
  }

  try {
    setCompanySaving(true);

    const payload = {
      companyName: normalizeWhitespace(company.name),
      establishedDate: toIsoDateString(company.established),
      phoneNumber: company.phone.trim(),
      emailAddress: sanitizeEmailInput(company.email, 60),
      gstNumber: company.gst.trim(),
      tinNumber: company.tin.trim(),
      panNumber: company.pan.trim(),
      branches: branches.length,
      branchList: [],
    };

    await api.put(API_ENDPOINTS.company.update(COMPANY_ID), payload);
    toast.success("Company details updated successfully.");
    closeModal();
    await fetchCompany();
  } catch (error) {
    console.error("Update error:", error.response?.data || error.message);
    toast.error("Unable to update company details.");
  } finally {
    setCompanySaving(false);
  }
};

const handleSaveBranch = async () => {
  if (!validateBranch()) {
    return;
  }

  try {
    setBranchSaving(true);

    const payload = {
      branchName: normalizeWhitespace(branchForm.name),
      established: toIsoDateString(branchForm.established),
      phoneNumber: branchForm.phone.trim(),
      email: sanitizeEmailInput(branchForm.email, 60),
    };

    if (editingBranchId) {
      await api.put(API_ENDPOINTS.company.branches.byId(editingBranchId), payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      await api.post(API_ENDPOINTS.company.branches.list, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    toast.success(editingBranchId ? "Branch updated successfully." : "Branch added successfully.");
    closeModal();
    await fetchBranches();
  } catch (error) {
    console.error("Branch save error:", error.response?.data || error.message);
    toast.error("Unable to save branch.");
  } finally {
    setBranchSaving(false);
  }
};

const openBranchForm = (branchItem = null) => {
  if (branchItem) {
    setBranchForm({
      name: branchItem.name || "",
      established: branchItem.established || "",
      phone: branchItem.phone || "",
      email: branchItem.email || "",
    });
    setEditingBranchId(branchItem.id);
  } else {
    resetBranchForm();
  }

  setBranchErrors({});
  setModalType("branch");
};

const handleDeleteBranch = async () => {
  if (!selectedBranch) {
    return;
  }

  try {
    await api.delete(API_ENDPOINTS.company.branches.byId(selectedBranch.id));
    toast.success("Branch deleted successfully.");
    setShowDeleteModal(false);
    closeBranchPopup();
    await fetchBranches();
  } catch (error) {
    console.error("Delete error:", error.response?.data || error.message);
    toast.error("Unable to delete branch.");
  }
};

return (
  <div className="company-page">
    <ToastContainer position="top-right" autoClose={2400} />

    <div className="company-card">
      <div className="company-header">
        <div className="company-header-copy">
          <h2>{company.name || "Company"}</h2>
          <p>Established: {formatDate(company.established)}</p>
        </div>

        <button
          className="company-header-edit app-button-secondary"
          type="button"
          onClick={() => setModalType("company")}
        >
          Edit Details
        </button>
      </div>

      <div className="company-info">
        {companyInfoItems.map((item) => (
          <div key={item.label} className="company-info-item">
            <span className="company-info-icon" aria-hidden="true">
              {item.icon}
            </span>
            <div>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="branch-header">
      <div>
        <h3>Branches</h3>
        <p>{branches.length} branches registered</p>
      </div>

      <button
        className="company-add-btn app-button-primary"
        type="button"
        onClick={() => openBranchForm()}
        style={{
          transform: "translateX(-20px)"
        }}
      >
        + Add Branch
      </button>
    </div>

    <div className="company-branch-table-wrap app-table-scroll">
      <table className="branch-table">
        <thead>
          <tr>
            <th>Branch Name</th>
            <th style={{ textAlign: "center" }}>Established</th>
            <th style={{ textAlign: "center" }}>Phone</th>
            <th style={{ textAlign: "center" }}>Email</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {branches.length === 0 ? (
            <tr>
              <td colSpan="5" className="app-table-empty-cell">
                No branches available.
              </td>
            </tr>
          ) : (
            branches.map((branchItem) => (
              <tr
                key={branchItem.id}
                className="branch-row-click"
                onClick={() => {
                  setSelectedBranch(branchItem);
                  setShowBranchPopup(true);
                }}
              >
                <td>{branchItem.name}</td>
                <td style={{ textAlign: "center" }}>
                  {formatDate(branchItem.established)}
                </td>

                <td style={{ textAlign: "center" }}>
                  {branchItem.phone}
                </td>

                <td style={{ textAlign: "center" }}>
                  {branchItem.email}
                </td>
                <td>
                  <div
                    className="branch-action-cell"
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      className="company-edit-btn app-action-button app-action-button--edit"
                      type="button"
                      style={{
                        width: "75px",
                        minWidth: "75px",
                        height: "40px",
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        openBranchForm(branchItem);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="company-delete-btn app-action-button app-action-button--delete"
                      type="button"
                      style={{
                        width: "75px",
                        minWidth: "75px",
                        height: "40px",
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedBranch(branchItem);
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {showBranchPopup && selectedBranch && (
      <div className="company-modal-overlay" onClick={closeBranchPopup}>
        <div
          className="company-modal-box company-modal-box-small"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="company-modal-head">
            <div>
              <h3>Branch Details</h3>
              <p>Review the selected branch information.</p>
            </div>

            <button
              type="button"
              className="company-modal-close"
              onClick={closeBranchPopup}
            >
              <X size={20} />
            </button>
          </div>

          <div className="branch-details">
            <div className="branch-detail-row">
              <span>Name</span>
              <strong>{selectedBranch.name}</strong>
            </div>
            <div className="branch-detail-row">
              <span>Established</span>
              <strong>{formatDate(selectedBranch.established)}</strong>
            </div>
            <div className="branch-detail-row">
              <span>Phone</span>
              <strong>{selectedBranch.phone}</strong>
            </div>
            <div className="branch-detail-row">
              <span>Email</span>
              <strong>{selectedBranch.email}</strong>
            </div>
          </div>

          <div className="company-modal-btns">
            <button
              className="app-button-secondary"
              type="button"
              onClick={closeBranchPopup}
            >
              Close
            </button>
            <button
              className="app-action-button app-action-button--edit"
              type="button"
              onClick={() => {
                closeBranchPopup();
                openBranchForm(selectedBranch);
              }}
            >
              Edit
            </button>
            <button
              className="app-action-button app-action-button--delete"
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setShowBranchPopup(false);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}

    {showDeleteModal && (
      <div
        className="company-modal-overlay"
        onClick={() => setShowDeleteModal(false)}
      >
        <div
          className="company-modal-box company-modal-box-small"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="company-modal-head">
            <div>
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete this branch?</p>
            </div>

            <button
              type="button"
              className="company-modal-close"
              onClick={() => setShowDeleteModal(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="company-modal-btns">
            <button
              className="app-button-secondary"
              type="button"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </button>
            <button
              className="app-action-button app-action-button--delete"
              type="button"
              onClick={handleDeleteBranch}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    )}

    {modalType === "company" && (
      <div className="company-modal-overlay" onClick={closeModal}>
        <div
          className="company-modal-box"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="company-modal-head">
            <div>
              <h3>Edit Company Details</h3>
              <p>Update company information with validated business details.</p>
            </div>

            <button
              type="button"
              className="company-modal-close"
              onClick={closeModal}
              disabled={companySaving}
            >
              <X size={20} />
            </button>
          </div>

          <div className="company-form-grid">
            <div className="form-group">
              <label>Company Name</label>
              <input
                name="name"
                value={company.name}
                onChange={handleCompanyChange}
                className={companyErrors.name ? "input-error" : ""}
              />
              {companyErrors.name && <span className="error">{companyErrors.name}</span>}
            </div>

            <div className="form-group">
              <label>Established Date</label>
              <AppDatePicker
                name="established"
                value={company.established}
                onChange={handleCompanyChange}
                className={companyErrors.established ? "input-error" : ""}
              />
              {companyErrors.established && (
                <span className="error">{companyErrors.established}</span>
              )}
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                name="phone"
                value={company.phone}
                onChange={handleCompanyChange}
                className={companyErrors.phone ? "input-error" : ""}
              />
              {companyErrors.phone && <span className="error">{companyErrors.phone}</span>}
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                name="email"
                value={company.email}
                onChange={handleCompanyChange}
                className={companyErrors.email ? "input-error" : ""}
              />
              {companyErrors.email && <span className="error">{companyErrors.email}</span>}
            </div>

            <div className="form-group">
              <label>GST Number</label>
              <input
                name="gst"
                value={company.gst}
                onChange={handleCompanyChange}
                className={companyErrors.gst ? "input-error" : ""}
              />
              {companyErrors.gst && <span className="error">{companyErrors.gst}</span>}
            </div>

            <div className="form-group">
              <label>TIN Number</label>
              <input
                name="tin"
                value={company.tin}
                onChange={handleCompanyChange}
                className={companyErrors.tin ? "input-error" : ""}
              />
              {companyErrors.tin && <span className="error">{companyErrors.tin}</span>}
            </div>

            <div className="form-group company-form-full">
              <label>PAN Number</label>
              <input
                name="pan"
                value={company.pan}
                onChange={handleCompanyChange}
                className={companyErrors.pan ? "input-error" : ""}
              />
              {companyErrors.pan && <span className="error">{companyErrors.pan}</span>}
            </div>
          </div>

          <div className="company-modal-btns">
            <button
              className="app-button-secondary"
              type="button"
              onClick={closeModal}
              disabled={companySaving}
            >
              Cancel
            </button>

            <button
              className="app-button-primary"
              type="button"
              onClick={updateCompany}
              disabled={companySaving}
            >
              {companySaving ? "Updating..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    )}

    {modalType === "branch" && (
      <div className="company-modal-overlay" onClick={closeModal}>
        <div
          className="company-modal-box company-modal-box-small"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="company-modal-head">
            <div>
              <h3>{editingBranchId ? "Edit Branch" : "Add Branch"}</h3>
              <p>Capture branch contact and establishment details.</p>
            </div>

            <button
              type="button"
              className="company-modal-close"
              onClick={closeModal}
              disabled={branchSaving}
            >
              <X size={20} />
            </button>
          </div>

          <div className="company-form-grid company-form-grid-single">
            <div className="form-group">
              <label>Branch Name</label>
              <input
                name="name"
                value={branchForm.name}
                onChange={handleBranchChange}
                className={branchErrors.name ? "input-error" : ""}
              />
              {branchErrors.name && <span className="error">{branchErrors.name}</span>}
            </div>

            <div className="form-group">
              <label>Established Date</label>
              <AppDatePicker
                name="established"
                value={branchForm.established}
                onChange={handleBranchChange}
                className={branchErrors.established ? "input-error" : ""}
              />
              {branchErrors.established && (
                <span className="error">{branchErrors.established}</span>
              )}
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                name="phone"
                value={branchForm.phone}
                onChange={handleBranchChange}
                className={branchErrors.phone ? "input-error" : ""}
              />
              {branchErrors.phone && <span className="error">{branchErrors.phone}</span>}
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                name="email"
                value={branchForm.email}
                onChange={handleBranchChange}
                className={branchErrors.email ? "input-error" : ""}
              />
              {branchErrors.email && <span className="error">{branchErrors.email}</span>}
            </div>
          </div>

          <div className="company-modal-btns">
            <button
              className="app-button-secondary"
              type="button"
              onClick={closeModal}
              disabled={branchSaving}
            >
              Cancel
            </button>
            <button
              className="app-button-primary"
              type="button"
              onClick={handleSaveBranch}
              disabled={branchSaving}
            >
              {branchSaving
                ? editingBranchId
                  ? "Updating..."
                  : "Saving..."
                : editingBranchId
                  ? "Update"
                  : "Save"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}

export default CompanyDetails;
