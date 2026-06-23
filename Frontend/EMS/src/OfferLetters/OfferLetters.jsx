import React, { useState, useEffect, useRef } from "react";
import "./OfferLetters.css";
import {
  FaFileAlt,
  FaDownload,
  FaUser,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBriefcase,
  FaRupeeSign,
  FaCalendarAlt,
} from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppDatePicker from "../components/AppDatePicker";
import { sortByNewestIdFirst } from "../utils/collections";
import { isValidEmail } from "../utils/validation";

function OfferLetters() {
  const [formData, setFormData] = useState({
    title: "Mr.",
    candidate_Name: "",
    email: "",
    address: "",
    position: "",
    joining_Date: "",
    ctc_Annual: "",
    monthlyCTC: "",

    basic: "",
    hra: "",
    conveyance: "",
    medicalAllowance: "",
    otherAllowance: "",

    providentFund: "",
    professionalTax: "",
    gross: "",
    netTakeHome: "",
  });

  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState({});

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = useState(1);
  const lettersPerPage = 50;

  const indexOfLast = currentPage * lettersPerPage;
  const indexOfFirst = indexOfLast - lettersPerPage;
  const currentLetters = letters.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(letters.length / lettersPerPage);

  /* ================= REFS ================= */
  const fieldRefs = {
    candidate_Name: useRef(null),
    email: useRef(null),
    address: useRef(null),
    position: useRef(null),
    joining_Date: useRef(null),
    ctc_Annual: useRef(null),
    basic: useRef(null),
    hra: useRef(null),
    conveyance: useRef(null),
    medicalAllowance: useRef(null),
    otherAllowance: useRef(null),
  };

  /* ================= SCROLL FUNCTION ================= */
  const scrollToField = (fieldName) => {
    const ref = fieldRefs[fieldName];

    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      ref.current.focus();
    }
  };

  /* ================= TOKEN ================= */
  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  };

  /* ================= HANDLE INPUT ================= */
  const handleChange = async (e) => {
    const { name, value } = e.target;

    // remove error while typing
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    /* ================= CTC AUTO CALCULATION ================= */
    if (name === "ctc_Annual") {
      const numericValue = value
        .replace(/\D/g, "")
        .slice(0, 8);
      const annualCTC = Number(numericValue);

      const handleChange = async (e) => {
        const { name, value } = e.target;

        // remove error while typing
        setErrors((prev) => ({
          ...prev,
          [name]: "",
        }));

        /* ================= CTC AUTO CALCULATION ================= */
        if (name === "ctc_Annual") {

          // existing ctc code here

          return;
        }

        /* ================= FORMAT SALARY INPUTS ================= */
        if (
          [
            "basic",
            "hra",
            "conveyance",
            "medicalAllowance",
            "otherAllowance",
          ].includes(name)
        ) {

          // existing salary code here

          return;
        }

        /* ================= ADD VALIDATIONS HERE ================= */

        /* ================= CANDIDATE NAME ================= */
        if (name === "candidate_Name") {

          // remove starting spaces
          let filteredValue = value
            .replace(/^\s+/g, "")
            .replace(/\s{2,}/g, " ");

          // allow only alphabets and spaces
          filteredValue = filteredValue.replace(
            /[^A-Za-z\s]/g,
            ""
          );

          if (filteredValue.length > 50) {
            return;
          }

          setFormData((prev) => ({
            ...prev,
            [name]: filteredValue,
          }));

          return;
        }

        /* ================= EMAIL ================= */
        if (name === "email") {

          let filteredValue = value
            .toLowerCase()
            .replace(/\s/g, "")
            .replace(/[^a-z0-9@.]/g, "");

          // first character must be alphabet
          if (
            filteredValue.length === 1 &&
            !/[a-z]/.test(filteredValue)
          ) {
            return;
          }

          // allow only one @
          const atCount =
            (filteredValue.match(/@/g) || []).length;

          if (atCount > 1) {
            return;
          }

          // prevent multiple .com
          const comCount =
            (filteredValue.match(/\.com/g) || []).length;

          if (comCount > 1) {
            return;
          }

          // prevent consecutive dots
          if (filteredValue.includes("..")) {
            return;
          }

          if (filteredValue.length > 40) {
            return;
          }

          setFormData((prev) => ({
            ...prev,
            [name]: filteredValue,
          }));

          return;
        }

        /* ================= ADDRESS ================= */
        if (name === "address") {

          let filteredValue = value
            .replace(/^\s+/g, "")
            .replace(/\s{2,}/g, " ")
            .replace(/[^A-Za-z0-9\s-]/g, "");

          const hyphenCount =
            (filteredValue.match(/-/g) || []).length;

          if (hyphenCount > 2) {
            return;
          }

          if (filteredValue.length > 150) {
            return;
          }

          setFormData((prev) => ({
            ...prev,
            [name]: filteredValue,
          }));

          return;
        }

        /* ================= POSITION ================= */
        if (name === "position") {

          let filteredValue = value
            .replace(/^\s+/g, "")
            .replace(/\s{2,}/g, " ")
            .replace(/[^A-Za-z\s]/g, "");

          if (filteredValue.length > 35) {
            return;
          }

          setFormData((prev) => ({
            ...prev,
            [name]: filteredValue,
          }));

          return;
        }

        /* ================= NORMAL INPUTS ================= */
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      };

      setFormData((prev) => ({
        ...prev,
        ctc_Annual: new Intl.NumberFormat("en-IN").format(annualCTC),
      }));

      if (!annualCTC || annualCTC <= 0) return;

      try {
        const response = await api.get(
          `/OfferLetter/salary-structure/${annualCTC}`
        );

        const data = response.data;

        setFormData((prev) => ({
          ...prev,

          ctc_Annual: new Intl.NumberFormat("en-IN").format(
            annualCTC
          ),

          monthlyCTC: new Intl.NumberFormat("en-IN").format(
            data.monthlyCTC || 0
          ),

          basic: new Intl.NumberFormat("en-IN").format(
            data.basic || 0
          ),

          hra: new Intl.NumberFormat("en-IN").format(
            data.hra || 0
          ),

          conveyance: new Intl.NumberFormat("en-IN").format(
            data.conveyance || 0
          ),

          medicalAllowance: new Intl.NumberFormat("en-IN").format(
            data.medicalAllowance || 0
          ),

          otherAllowance: new Intl.NumberFormat("en-IN").format(
            data.otherAllowance || 0
          ),

          providentFund: new Intl.NumberFormat("en-IN").format(
            data.providentFund || 0
          ),

          professionalTax: new Intl.NumberFormat("en-IN").format(
            data.professionalTax || 0
          ),

          gross: new Intl.NumberFormat("en-IN").format(
            data.gross || 0
          ),

          netTakeHome: new Intl.NumberFormat("en-IN").format(
            data.netTakeHome || 0
          ),
        }));

      } catch (error) {
        console.error("Salary Structure API Error =>", error);
      }

      return;
    }

    /* ================= FORMAT SALARY INPUTS ================= */
    if (
      [
        "basic",
        "hra",
        "conveyance",
        "medicalAllowance",
        "otherAllowance",
      ].includes(name)
    ) {
      const numericValue = value
        .replace(/\D/g, "")
        .slice(0, 8);

      setFormData((prev) => ({
        ...prev,
        [name]: new Intl.NumberFormat("en-IN").format(
          numericValue
        ),
      }));

      return;
    }

    /* ================= NORMAL INPUTS ================= */
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ================= FETCH OFFER LETTERS ================= */
  const fetchOfferLetters = async () => {
    try {
      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
        return;
      }

      const res = await api.get(
        API_ENDPOINTS.offerLetters.all,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = Array.isArray(res.data) ? res.data : [];

      setLetters(sortByNewestIdFirst(data, (letter) => letter.id));

      const newTotalPages =
        Math.ceil(data.length / lettersPerPage) || 1;

      if (currentPage > newTotalPages) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to fetch offer letters");
    }
  };

  useEffect(() => {
    fetchOfferLetters();
  }, []);

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    let newErrors = {};

    // Candidate Name
    if (
      formData.candidate_Name.trim().length < 2
    ) {
      newErrors.candidate_Name =
        "Candidate Name must contain minimum 2 characters";

      setErrors(newErrors);
      scrollToField("candidate_Name");
      return false;
    }

    if (
      !/^[A-Za-z\s]+$/.test(
        formData.candidate_Name.trim()
      )
    ) {
      newErrors.candidate_Name =
        "Only alphabets are allowed";

      setErrors(newErrors);
      scrollToField("candidate_Name");
      return false;
    }

    // Email
    if (
      !/^[A-Za-z][A-Za-z0-9]*@(gmail|yahoo|pirnav)\.com$/.test(
        formData.email
      )
    ) {
      newErrors.email =
        "Email must be like demo@gmail.com";

      setErrors(newErrors);
      scrollToField("email");
      return false;
    }

    // Address
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";

      setErrors(newErrors);
      scrollToField("address");
      return false;
    }

    // Position
    if (!formData.position.trim()) {
      newErrors.position = "Position is required";

      setErrors(newErrors);
      scrollToField("position");
      return false;
    }

    // CTC
    if (!formData.ctc_Annual.trim()) {
      newErrors.ctc_Annual =
        "Annual CTC is required";

      setErrors(newErrors);
      scrollToField("ctc_Annual");
      return false;
    }

    // Joining Date
    if (!formData.joining_Date) {
      newErrors.joining_Date =
        "Joining date is required";

      setErrors(newErrors);
      scrollToField("joining_Date");
      return false;
    }

    // Basic
    if (!formData.basic?.trim()) {
      newErrors.basic = "Basic salary is required";

      setErrors(newErrors);
      scrollToField("basic");
      return false;
    }

    // HRA
    if (!formData.hra?.trim()) {
      newErrors.hra = "HRA is required";

      setErrors(newErrors);
      scrollToField("hra");
      return false;
    }

    // Conveyance
    if (!formData.conveyance?.trim()) {
      newErrors.conveyance =
        "Conveyance is required";

      setErrors(newErrors);
      scrollToField("conveyance");
      return false;
    }

    // Medical Allowance
    if (!formData.medicalAllowance?.trim()) {
      newErrors.medicalAllowance =
        "Medical allowance is required";

      setErrors(newErrors);
      scrollToField("medicalAllowance");
      return false;
    }

    // Other Allowance
    if (!formData.otherAllowance?.trim()) {
      newErrors.otherAllowance =
        "Other allowance is required";

      setErrors(newErrors);
      scrollToField("otherAllowance");
      return false;
    }

    setErrors({});
    return true;
  };

  /* ================= GENERATE OFFER LETTER ================= */
  const handleGenerate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);

        return;
      }

      const payload = {
  candidate_Title: formData.title,
  candidate_Name: formData.candidate_Name.trim(),

        email: formData.email.trim(),

        address: formData.address.trim(),

        position: formData.position.trim(),

        joining_Date: formData.joining_Date,

        ctc_Annual: Number(
          formData.ctc_Annual.replace(/,/g, "")
        ),

        basic: Number(
          formData.basic.replace(/,/g, "")
        ),

        hra: Number(
          formData.hra.replace(/,/g, "")
        ),

        conveyance: Number(
          formData.conveyance.replace(/,/g, "")
        ),

        medicalAllowance: Number(
          formData.medicalAllowance.replace(/,/g, "")
        ),

        otherAllowance: Number(
          formData.otherAllowance.replace(/,/g, "")
        ),

        providentFund: Number(
          (formData.providentFund || "0")
            .toString()
            .replace(/,/g, "")
        ),

        professionalTax: Number(
          (formData.professionalTax || "0")
            .toString()
            .replace(/,/g, "")
        )
      };

      await api.post(
        API_ENDPOINTS.offerLetters.generate,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(
        "Offer Letter Generated Successfully"
      );

     setFormData({

  title: "Mr.",
 
  candidate_Name: "",

  email: "",

  address: "",

  position: "",

  joining_Date: "",

  ctc_Annual: "",
 
  monthlyCTC: "",
 
  basic: "",

  hra: "",

  conveyance: "",

  medicalAllowance: "",

  otherAllowance: "",
 
  providentFund: "",

  professionalTax: "",

  gross: "",

  netTakeHome: "",

});
 

      setErrors({});

      fetchOfferLetters();
    } catch (error) {
      console.error("Generate Error:", error);

      if (error.response?.status === 401) {
        toast.error(
          "Unauthorized. Please login again."
        );

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
      } else {
        toast.error(
          "Failed to generate offer letter"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= DOWNLOAD LETTER ================= */
  const handleDownload = async (id) => {
    try {
      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);

        return;
      }

      setDownloadingId(id);

      const response = await api.get(
        API_ENDPOINTS.offerLetters.download(id),
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const file = new Blob([response.data], {
        type: "application/pdf",
      });

      const url =
        window.URL.createObjectURL(file);

      const link = document.createElement("a");

      link.href = url;
      link.download = `OfferLetter_${id}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Offer Letter Downloaded");
    } catch (error) {
      console.error("Download Error:", error);
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="offer-container">
      <ToastContainer
        position="top-right"
        autoClose={2500}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          marginBottom: "0px",
          paddingBottom: "0px",
          marginTop: "-15px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "26px",
            fontWeight: "650",
            // color: "#141e35",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaFileAlt />
          Offer Letter Generation
        </h2>

        <p
          style={{
            marginTop: "0px",
            marginLeft: "42px",
            fontSize: "15px",
            color: "#64748b",
            fontWeight: "500",
          }}
        >
          Generate offer letters for new hires
        </p>
      </div>

      <div className="offer-card">
        <h3>Generate New Offer Letter</h3>

        <div className="form-grid">

          {/* Candidate Name */}
          <div className="form-group">
            <label>
              <FaUser /> Candidate Name
            </label>

            <div className="candidate-name-wrapper">

              <select
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="candidate-title-select"
              >
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
              </select>

              <input
                ref={fieldRefs.candidate_Name}
                type="text"
                name="candidate_Name"
                value={formData.candidate_Name}
                onChange={handleChange}
                placeholder="Enter candidate name"
                className="candidate-name-input"
              />

            </div>

            <p
              style={{
                color: "red",
                fontSize: "12px",
                marginTop: "3px",
                minHeight: "16px",
              }}
            >
              {errors.candidate_Name || ""}
            </p>
          </div>

          {/* Email */}
          <div className="form-group">
            <label>
              <FaEnvelope /> Email
            </label>

            <input
              ref={fieldRefs.email}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
            />

            <p
              style={{
                color: "red",
                fontSize: "12px",
                marginTop: "3px",
                minHeight: "16px",
              }}
            >
              {errors.email || ""}
            </p>
          </div>

          {/* Address */}
          <div
            className="form-group full-width"
            style={{
              marginTop: "-35px",
            }}
          >
            <label>
              <FaMapMarkerAlt /> Address
            </label>

            <textarea
              ref={fieldRefs.address}
              name="address"
              rows="4"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
            />

            {errors.address && (
              <p
                style={{
                  color: "red",
                  fontSize: "12px",
                  marginTop: "3px",
                  minHeight: "16px",
                }}
              >
                {errors.address || ""}
              </p>
            )}
          </div>

          {/* Position */}
          <div className="form-group">
            <label>
              <FaBriefcase /> Position
            </label>

            <input
              ref={fieldRefs.position}
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              placeholder="Enter position"
            />

            {errors.position && (
              <p
                style={{
                  color: "red",
                  fontSize: "12px",
                  marginTop: "3px",
                  minHeight: "16px",
                }}
              >
                {errors.position || ""}
              </p>
            )}
          </div>

          {/* Annual CTC */}
          <div className="form-group">
            <label>
              <FaRupeeSign /> Annual CTC
            </label>

            <input
              ref={fieldRefs.ctc_Annual}
              type="text"
              name="ctc_Annual"
              className="no-spinner"
              value={formData.ctc_Annual}
              onChange={handleChange}
              placeholder="Enter annual CTC"
              inputMode="numeric"
              onKeyDown={(e) => {
                if (
                  ["e", "E", "+", "-", "."].includes(
                    e.key
                  )
                ) {
                  e.preventDefault();
                }
              }}
            />

            {errors.ctc_Annual && (
              <p
                style={{
                  color: "red",
                  fontSize: "12px",
                  marginTop: "3px",
                  minHeight: "16px",
                }}
              >
                {errors.ctc_Annual || ""}
              </p>
            )}
          </div>

          {/* Joining Date */}
          <div className="form-group" ref={fieldRefs.joining_Date}>
            <label>
              <FaCalendarAlt /> Joining Date
            </label>

            <AppDatePicker
              name="joining_Date"
              value={formData.joining_Date}
              onChange={handleChange}
            />

            {errors.joining_Date && (
              <p
                style={{
                  color: "red",
                  fontSize: "12px",
                  marginTop: "3px",
                  minHeight: "16px",
                }}
              >
                {errors.joining_Date || ""}
              </p>
            )}
          </div>

          {/* Compensation Section */}
          <div className="full-width compensation-container">

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 className="compensation-title">
                Compensation and Benefits Structure
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsEditMode(!isEditMode)
                }
                style={{
                  background: isEditMode
                    ? "#dc2626"
                    : "#111827",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                {isEditMode
                  ? "Cancel Edit"
                  : "Edit"}
              </button>
            </div>

            <div className="compensation-box">

              {/* Monthly CTC */}
              <div className="comp-row">
                <div className="comp-label">
                  Monthly CTC
                </div>

                <div className="comp-input">
                  <input
                    type="text"
                    name="monthlyCTC"
                    value={formData.monthlyCTC}
                    onChange={handleChange}
                    placeholder="Enter Monthly CTC"
                    disabled={!isEditMode}
                  />
                </div>
              </div>

              {/* HRA */}
              <div className="comp-row">
                <div className="comp-label">
                  HRA
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.hra}
                    type="text"
                    name="hra"
                    value={formData.hra}
                    onChange={handleChange}
                    placeholder="Enter HRA"
                    disabled={!isEditMode}
                  />

                  {errors.hra && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.hra || ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Conveyance */}
              <div className="comp-row">
                <div className="comp-label">
                  Conveyance
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.conveyance}
                    type="text"
                    name="conveyance"
                    value={formData.conveyance}
                    onChange={handleChange}
                    placeholder="Enter Conveyance"
                    disabled={!isEditMode}
                  />

                  {errors.conveyance && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.conveyance || ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Medical */}
              <div className="comp-row">
                <div className="comp-label">
                  Medical Allowance
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.medicalAllowance}
                    type="text"
                    name="medicalAllowance"
                    value={formData.medicalAllowance}
                    onChange={handleChange}
                    placeholder="Enter Medical Allowance"
                    disabled={!isEditMode}
                  />

                  {errors.medicalAllowance && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.medicalAllowance || ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Other */}
              <div className="comp-row">
                <div className="comp-label">
                  Oth. Allowances
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.otherAllowance}
                    type="text"
                    name="otherAllowance"
                    value={formData.otherAllowance}
                    onChange={handleChange}
                    placeholder="Enter Other Allowances"
                    disabled={!isEditMode}
                  />

                  {errors.otherAllowance && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.otherAllowance || ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Provident Fund */}
              <div className="comp-row">
                <div className="comp-label">
                  Provident Fund
                </div>

                <div className="comp-input">
                  <input
                    type="text"
                    name="providentFund"
                    value={formData.providentFund}
                    onChange={handleChange}
                    placeholder="Enter Provident Fund"
                    disabled={!isEditMode}
                  />
                </div>
              </div>

              {/* Professional Tax */}
              <div className="comp-row">
                <div className="comp-label">
                  Professional Tax
                </div>

                <div className="comp-input">
                  <input
                    type="text"
                    name="professionalTax"
                    value={formData.professionalTax}
                    onChange={handleChange}
                    placeholder="Enter Professional Tax"
                    disabled={!isEditMode}
                  />
                </div>
              </div>

              {/* Gross Salary */}
              <div className="comp-row">
                <div className="comp-label">
                  Gross Salary
                </div>

                <div className="comp-input">
                  <input
                    type="text"
                    name="gross"
                    value={formData.gross}
                    onChange={handleChange}
                    placeholder="Enter Gross Salary"
                    disabled={!isEditMode}
                  />
                </div>
              </div>

              {/* Net Take Home */}
              <div className="comp-row">
                <div className="comp-label">
                  Net Take Home
                </div>

                <div className="comp-input">
                  <input
                    type="text"
                    name="netTakeHome"
                    value={formData.netTakeHome}
                    onChange={handleChange}
                    placeholder="Enter Net Take Home"
                    disabled={!isEditMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="offer-buttons">
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            <FaFileAlt />

            {loading
              ? " Generating..."
              : " Generate Letter"}
          </button>
        </div>
      </div>

      {/* OFFER LIST */}
      <div className="offer-list">
        <h3>
          <FaFileAlt /> Generated Offer Letters
        </h3>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>

                <th>
                  <FaUser /> Candidate
                </th>

                <th>
                  <FaEnvelope /> Email
                </th>

                <th>
                  <FaBriefcase /> Position
                </th>

                <th>
                  <FaDownload /> Download
                </th>
              </tr>
            </thead>
<tbody>
  {currentLetters.length > 0 ? (
    currentLetters.map((item, index) => (
      <tr key={item.id}>
        <td>{indexOfFirst + index + 1}</td>

        <td>{item.candidate_Name}</td>

        <td>{item.email}</td>
        <td>{item.position}</td>

        <td>
          <button
            className="download-btn"
            onClick={() => handleDownload(item.id)}
            disabled={downloadingId === item.id}
          >
            <FaDownload />
            {downloadingId === item.id ? " Downloading..." : " Download"}
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="5" style={{ textAlign: "center" }}>
        No offer letters found
      </td>
    </tr>
  )}
</tbody>
          </table>
        </div>



        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="assets-pagination">

            {/* PREVIOUS */}
            <button
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((prev) => prev - 1)
              }
            >
              Prev
            </button>

            {/* FIRST PAGE */}
            {currentPage > 3 && (
              <>
                <button onClick={() => setCurrentPage(1)}>
                  1
                </button>

                {currentPage > 4 && (
                  <span className="pagination-dots">...</span>
                )}
              </>
            )}

            {/* PAGE NUMBERS */}
            {Array.from(
              { length: totalPages },
              (_, i) => i + 1
            )
              .filter(
                (page) =>
                  page >= currentPage - 2 &&
                  page <= currentPage + 2
              )
              .map((page) => (
                <button
                  key={page}
                  className={
                    currentPage === page
                      ? "active-page"
                      : ""
                  }
                  onClick={() =>
                    setCurrentPage(page)
                  }
                >
                  {page}
                </button>
              ))}

            {/* LAST PAGE */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && (
                  <span className="pagination-dots">...</span>
                )}

                <button
                  onClick={() =>
                    setCurrentPage(totalPages)
                  }
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* NEXT */}
            <button
              disabled={
                currentPage === totalPages
              }
              onClick={() =>
                setCurrentPage((prev) => prev + 1)
              }
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfferLetters;
