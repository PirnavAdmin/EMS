import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import "./OfferLetters.css";
import {
  FaFileAlt,
  FaEye,
  FaDownload,
  FaUser,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBriefcase,
  FaRupeeSign,
  FaCalendarAlt,
  FaTrash,
} from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import CompactSearchableDropdown from "../components/CompactSearchableDropdown";
import {
  deleteOfferLetter,
  calculateOfferLetterBreakup,
  downloadOfferLetter,
  getAllOfferLetters,
  getOfferLetterApiErrorMessage,
  getOfferLetterSendStatus,
  generateOfferLetter,
  previewOfferLetter,
  sendOfferLetter,
} from "../services/offerLetterService";
import { toast } from "../components/common/Toast/toastService";
import AppDatePicker from "../components/AppDatePicker";
import DocumentSendStatusButton from "../components/documentSendStatus/DocumentSendStatusButton";
import SendAgainModal from "../components/documentSendStatus/SendAgainModal";
import useDocumentSendStatus from "../hooks/useDocumentSendStatus";
import { sortByNewestIdFirst } from "../utils/collections";
import { formatDate } from "../utils/date";
import { extractDownloadFileName } from "../utils/downloadUtils";
import {
  resolveDocumentMimeType,
} from "../Employees/AddEmployee/documentPreview";
import {
  OfferLetterDeleteModal,
  OfferLetterPreviewModal,
  OfferLetterSendModal,
} from "./OfferLetterDialogs";
import { buildOfferLetterEmailDraft } from "./offerLetterDraft";
import {
  deleteRelievingLetter,
  downloadRelievingLetter,
  generateRelievingLetter,
  getAllRelievingLetters,
  previewRelievingLetter,
  sendRelievingLetter,
  getRelievingLetterSendStatus,
} from "../services/relievingLetterService";

const redirectToLogin = () => {
  window.location.replace("/login");
  return true;
};

const getEmployeeId = (employee) =>
  employee?.employee_Id ||
  employee?.employee_id ||
  employee?.employeeId ||
  employee?.id ||
  "";

const getEmployeeName = (employee) => {
  const fullName = [
    employee?.firstName,
    employee?.middleName,
    employee?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    employee?.name ||
    employee?.employeeName ||
    employee?.fullName ||
    fullName ||
    getEmployeeId(employee)
  );
};

const formatDisplayValue = (value) => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || "-";
};

const getEmployeeDropdownName = (employee) =>
  formatDisplayValue(
    employee?.employeeName ||
    employee?.name ||
    employee?.fullName ||
    [
      employee?.firstName,
      employee?.middleName,
      employee?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
  );

const getEmployeeDropdownSortKey = (employee) =>
  String(
    employee?.employeeName ||
    employee?.name ||
    employee?.fullName ||
    [
      employee?.firstName,
      employee?.middleName,
      employee?.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    getEmployeeId(employee) ||
    ""
  )
    .trim()
    .toLowerCase();

const getEmployeeDropdownLabel = (employee) => {
  const employeeId = formatDisplayValue(getEmployeeId(employee));
  const employeeName = getEmployeeDropdownName(employee);

  return `${employeeId} - ${employeeName}`;
};

const normalizeEmployeesForDropdown = (employeeList) => {
  const uniqueEmployees = new Map();

  (Array.isArray(employeeList) ? employeeList : []).forEach((employee) => {
    const employeeId = formatDisplayValue(getEmployeeId(employee));

    if (!employeeId || employeeId === "-") {
      return;
    }

    const normalizedIdKey = employeeId.toLowerCase();

    if (!uniqueEmployees.has(normalizedIdKey)) {
      uniqueEmployees.set(normalizedIdKey, employee);
    }
  });

  return Array.from(uniqueEmployees.values()).sort((left, right) => {
    const leftName = getEmployeeDropdownSortKey(left);
    const rightName = getEmployeeDropdownSortKey(right);

    const nameCompare = leftName.localeCompare(rightName, undefined, {
      sensitivity: "base",
      numeric: true,
    });

    if (nameCompare !== 0) {
      return nameCompare;
    }

    return formatDisplayValue(getEmployeeId(left)).localeCompare(
      formatDisplayValue(getEmployeeId(right)),
      undefined,
      {
        sensitivity: "base",
        numeric: true,
      }
    );
  });
};

const getRelievingLetterEmployeeId = (letter) =>
  letter?.employeeId ||
  letter?.employee_Id ||
  letter?.employee_id ||
  letter?.id ||
  "";

const getRelievingLetterId = (letter) =>
  letter?.id ||
  letter?.relievingLetterId ||
  letter?.relieving_Letter_Id ||
  letter?.relieving_letter_id ||
  letter?.relivingLetterId ||
  "";

const getRelievingLetterEmployeeLabel = (letter) =>
  letter?.employeeName ||
  letter?.employee_Name ||
  letter?.employee_name ||
  letter?.name ||
  letter?.fullName ||
  letter?.full_Name ||
  getRelievingLetterEmployeeId(letter) ||
  "-";

const getRelievingLetterEmployeeEmail = (letter) =>
  letter?.employeeEmail ||
  letter?.employee_Email ||
  letter?.employee_email ||
  letter?.email ||
  letter?.mail ||
  "";

const formatRelievingTableValue = (value) => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || "-";
};

const RELIEVING_TITLE_OPTIONS = [
  { label: "Mr", value: "Mr" },
  { label: "Ms", value: "Ms" },
  { label: "Mrs", value: "Mrs" },
];

const getOfferLetterId = (letter) =>
  letter?.id ||
  letter?.offerLetterId ||
  letter?.offer_letter_id ||
  letter?.offerLetterID ||
  "";

const getOfferLetterEmployeeId = (letter) =>
  letter?.employeeId ||
  letter?.employee_Id ||
  letter?.employee_id ||
  letter?.employeeID ||
  "";

function OfferLetters() {
  const [letterType, setLetterType] = useState("offer");
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
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [relievingLoading, setRelievingLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [relievingDownloadingId, setRelievingDownloadingId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState({});
  const [relievingErrors, setRelievingErrors] = useState({});
 const [relievingForm, setRelievingForm] = useState({
  employeeId: "",
  title: "",
  resignationDate: "",
  relievingDate: "",
});
  const [generatedRelievingLetters, setGeneratedRelievingLetters] = useState([]);
  const [loadingRelievingLetters, setLoadingRelievingLetters] = useState(false);
  const [previewOfferLetterTarget, setPreviewOfferLetterTarget] = useState(null);
  const [previewOfferLetterLoading, setPreviewOfferLetterLoading] = useState(false);
  const [previewOfferLetterError, setPreviewOfferLetterError] = useState("");
  const [previewOfferLetterBlob, setPreviewOfferLetterBlob] = useState(null);
  const [previewOfferLetterContentType, setPreviewOfferLetterContentType] =
    useState("");
  const previewRequestRef = useRef(0);
  const [sendOfferLetterOpen, setSendOfferLetterOpen] = useState(false);
  const [sendOfferLetterTarget, setSendOfferLetterTarget] = useState(null);
  const [sendOfferLetterSubject, setSendOfferLetterSubject] = useState("");
  const [sendOfferLetterBody, setSendOfferLetterBody] = useState("");
  const [sendOfferLetterErrors, setSendOfferLetterErrors] = useState({});
  const [sendingOfferLetterId, setSendingOfferLetterId] = useState(null);
  const [resendOfferLetterOpen, setResendOfferLetterOpen] = useState(false);
  const [resendOfferLetterTarget, setResendOfferLetterTarget] =
    useState(null);
  const [resendOfferLetterKind, setResendOfferLetterKind] = useState("offer");
  const [deleteOfferLetterTarget, setDeleteOfferLetterTarget] = useState(null);
  const [deletingOfferLetterId, setDeletingOfferLetterId] = useState(null);
  const [previewRelievingLetterTarget, setPreviewRelievingLetterTarget] =
    useState(null);
  const [previewRelievingLetterLoading, setPreviewRelievingLetterLoading] =
    useState(false);
  const [previewRelievingLetterError, setPreviewRelievingLetterError] =
    useState("");
  const [previewRelievingLetterBlob, setPreviewRelievingLetterBlob] =
    useState(null);
  const [
    previewRelievingLetterContentType,
    setPreviewRelievingLetterContentType,
  ] = useState("");
  const previewRelievingRequestRef = useRef(0);
  const [sendRelievingLetterOpen, setSendRelievingLetterOpen] = useState(false);
  const [sendRelievingLetterTarget, setSendRelievingLetterTarget] =
    useState(null);
  const [sendRelievingLetterSubject, setSendRelievingLetterSubject] =
    useState("");
  const [sendRelievingLetterBody, setSendRelievingLetterBody] = useState("");
  const [sendRelievingLetterErrors, setSendRelievingLetterErrors] = useState({});
  const [sendingRelievingLetterId, setSendingRelievingLetterId] =
    useState(null);
  const [deleteRelievingLetterTarget, setDeleteRelievingLetterTarget] =
    useState(null);
  const [deletingRelievingLetterId, setDeletingRelievingLetterId] =
    useState(null);
  const sendRequestLockRef = useRef(false);

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = useState(1);
  const [lettersPerPage, setLettersPerPage] = useState(30);

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

  const getResponseHeaderValue = (headers, key) =>
    headers?.[key] ||
    headers?.[key.toLowerCase()] ||
    headers?.[key.toUpperCase()] ||
    "";

  const employeeDropdownGroups = useMemo(
    () => [
      {
        label: "Employees",
        options: employees.map((employee) => {
          const employeeId = formatDisplayValue(getEmployeeId(employee));

          return {
            value: employeeId,
            label: getEmployeeDropdownLabel(employee),
          };
        }),
      },
    ],
    [employees]
  );

  const findEmployeeForRelievingLetter = useCallback(
    (letter) => {
      const employeeId = String(getRelievingLetterEmployeeId(letter) || "");

      if (!employeeId) {
        return null;
      }

      return (
        employees.find(
          (employee) =>
            String(getEmployeeId(employee) || "")
              .trim()
              .toLowerCase() === employeeId.trim().toLowerCase()
        ) || null
      );
    },
    [employees]
  );

  const getRelievingLetterRecipientName = useCallback(
    (letter) => {
      const employee = findEmployeeForRelievingLetter(letter);
      const letterName = getRelievingLetterEmployeeLabel(letter);
      const employeeName = getEmployeeName(employee);

      return letterName && letterName !== "-" ? letterName : employeeName;
    },
    [findEmployeeForRelievingLetter]
  );

  const getRelievingLetterRecipientEmail = useCallback(
    (letter) => {
      const employee = findEmployeeForRelievingLetter(letter);
      return (
        getRelievingLetterEmployeeEmail(letter) ||
        employee?.email ||
        employee?.employeeEmail ||
        employee?.employee_Email ||
        ""
      );
    },
    [findEmployeeForRelievingLetter]
  );

  const buildRelievingLetterEmailDraft = useCallback(
    (letter) => {
      const employeeName =
        getRelievingLetterRecipientName(letter) || "Employee";

      return {
        subject: `Relieving Letter - ${employeeName}`,
        body: `Dear ${employeeName},

Please find attached your relieving letter.

Thank you for your contribution to the organization.

We wish you all the very best for your future endeavors.

Regards,

HR Team`,
      };
    },
    [getRelievingLetterRecipientName]
  );

  const fetchOfferLetterSendStatusByDocument = useCallback(
    (offerLetter, config = {}) => {
      const offerLetterId = getOfferLetterId(offerLetter);

      if (!offerLetterId) {
        return Promise.resolve({ data: null });
      }

      return getOfferLetterSendStatus(offerLetterId, config);
    },
    []
  );

  const fetchRelievingLetterSendStatusByDocument = useCallback(
    (relievingLetter, config = {}) => {
      const relievingLetterId = getRelievingLetterId(relievingLetter);

      if (!relievingLetterId) {
        return Promise.resolve({ data: null });
      }

      return getRelievingLetterSendStatus(relievingLetterId, config);
    },
    []
  );

  const offerLetterSendStatus = useDocumentSendStatus({
    documents: letters,
    getDocumentId: getOfferLetterId,
    fetchSendStatus: fetchOfferLetterSendStatusByDocument,
    documentLabel: "Offer Letter",
  });

  const relievingLetterSendStatus = useDocumentSendStatus({
    documents: generatedRelievingLetters,
    getDocumentId: getRelievingLetterId,
    fetchSendStatus: fetchRelievingLetterSendStatusByDocument,
    documentLabel: "Relieving Letter",
  });

  const isOfferLetterAlreadySent = offerLetterSendStatus.isDocumentSent;
  const isRelievingLetterAlreadySent = relievingLetterSendStatus.isDocumentSent;
  const isOfferLetterSendStatusLoading =
    offerLetterSendStatus.isDocumentLoading;
  const isRelievingLetterSendStatusLoading =
    relievingLetterSendStatus.isDocumentLoading;
  const setOfferLetterSendStatus = offerLetterSendStatus.setDocumentStatus;
  const setRelievingLetterSendStatus =
    relievingLetterSendStatus.setDocumentStatus;

  const isAnyDocumentSending = Boolean(
    sendingOfferLetterId || sendingRelievingLetterId
  );

  const markOfferLetterSent = useCallback(
    (offerLetter) => {
      const offerLetterId = getOfferLetterId(offerLetter);

      if (!offerLetterId) {
        return;
      }

      setOfferLetterSendStatus(offerLetterId, {
        status: "sent",
        isSent: true,
        rawStatus: "sent",
        lastSentAt: new Date().toISOString(),
        statusText: "Sent",
        error: "",
      });
    },
    [setOfferLetterSendStatus]
  );

  const markRelievingLetterSent = useCallback(
    (relievingLetter) => {
      const relievingLetterId = getRelievingLetterId(relievingLetter);

      if (!relievingLetterId) {
        return;
      }

      setRelievingLetterSendStatus(relievingLetterId, {
        status: "sent",
        isSent: true,
        rawStatus: "sent",
        lastSentAt: new Date().toISOString(),
        statusText: "Sent",
        error: "",
      });
    },
    [setRelievingLetterSendStatus]
  );

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

      setFormData((prev) => ({
        ...prev,
        ctc_Annual: new Intl.NumberFormat("en-IN").format(annualCTC),
      }));

      if (!annualCTC || annualCTC <= 0) return;

      try {
        const response = await calculateOfferLetterBreakup({
          AnnualCtc: annualCTC,
          ManualOverrideFields: [],
        });

        const data = response.data;

        console.log("Salary API Response", data);
        console.log(Object.keys(data));

        setFormData((prev) => ({
          ...prev,

          ctc_Annual: new Intl.NumberFormat("en-IN").format(
            annualCTC
          ),

          monthlyCTC: data.monthlyCTC ?? "",
          basic: data.basic ?? "",
          hra: data.hra ?? "",
          conveyance: data.conveyance ?? "",
          medicalAllowance: data.medicalAllowance ?? "",
          otherAllowance: data.otherAllowance ?? "",
          providentFund: data.providentFund ?? "",
          professionalTax: data.professionalTax ?? "",
          gross: data.gross ?? "",
          netTakeHome: data.netTakeHome ?? "",

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
  const fetchOfferLetters = useCallback(async () => {
    try {
      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          redirectToLogin();
        }, 1200);
        return;
      }

      const res = await getAllOfferLetters();

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      setLetters(sortByNewestIdFirst(data, (letter) => letter.id));

      const newTotalPages =
        Math.ceil(data.length / lettersPerPage) || 1;

      if (currentPage > newTotalPages) {
        setCurrentPage(1);
      }

      return data;
    } catch (error) {
      console.error("Fetch Error:", error);
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to load offer letters.",
        "offer letter"
      );
      toast.error(message);
      return [];
    }
  }, [currentPage, lettersPerPage]);

  const refreshOfferLetterData = useCallback(async () => {
    await fetchOfferLetters();
  }, [fetchOfferLetters]);

  useEffect(() => {
    fetchOfferLetters();
  }, [fetchOfferLetters]);

  const loadRelievingLetters = useCallback(async () => {
    try {
      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          redirectToLogin();
        }, 1200);
        return;
      }

      setLoadingRelievingLetters(true);

      const response = await getAllRelievingLetters();
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setGeneratedRelievingLetters(data);
    } catch (error) {
      console.error("Relieving Letters Load Error:", error);
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to load relieving letters.",
        "relieving letter"
      );
      toast.error(message);
    } finally {
      setLoadingRelievingLetters(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);

      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          redirectToLogin();
        }, 1200);
        return;
      }

      const res = await api.get(API_ENDPOINTS.employees.list, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      setEmployees(normalizeEmployeesForDropdown(data));
    } catch (error) {
      console.error("Employees Fetch Error:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (letterType === "relieving" && employees.length === 0) {
      fetchEmployees();
    }
    if (letterType === "relieving") {
      loadRelievingLetters();
    }
  }, [employees.length, fetchEmployees, letterType, loadRelievingLetters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [lettersPerPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(letters.length / lettersPerPage));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, letters.length, lettersPerPage]);

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
          redirectToLogin();
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

      await generateOfferLetter(payload);

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

      await refreshOfferLetterData();
    } catch (error) {
      console.error("Generate Error:", error);

      const message = await getOfferLetterApiErrorMessage(
        error,
        "Failed to generate offer letter.",
        "offer letter"
      );

      toast.error(message);

      if (error.response?.status === 401) {
        setTimeout(() => {
          redirectToLogin();
        }, 1200);
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
          redirectToLogin();
        }, 1200);

        return;
      }

      setDownloadingId(id);

      const response = await downloadOfferLetter(id);

      const rawContentType = getResponseHeaderValue(
        response.headers,
        "content-type"
      );
      const initialFileName = extractDownloadFileName(
        response.headers,
        `OfferLetter_${id}`,
        rawContentType
      );
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
          type: rawContentType || "",
        });
      const contentType = await resolveDocumentMimeType({
        blob,
        fileName: initialFileName,
        headerMimeType: rawContentType,
      });
      const fileName = extractDownloadFileName(
        response.headers,
        `OfferLetter_${id}`,
        contentType
      );
      const file =
        blob.type === contentType
          ? blob
          : new Blob([blob], {
            type: contentType || "",
          });

      const url =
        window.URL.createObjectURL(file);

      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      toast.success("Offer Letter Downloaded");
    } catch (error) {
      console.error("Download Error:", error);
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to download the selected offer letter.",
        "offer letter"
      );
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  const closePreviewOfferLetterModal = () => {
    previewRequestRef.current += 1;
    setPreviewOfferLetterTarget(null);
    setPreviewOfferLetterLoading(false);
    setPreviewOfferLetterError("");
    setPreviewOfferLetterBlob(null);
    setPreviewOfferLetterContentType("");
  };

  const handlePreviewOfferLetter = async (offerLetter) => {
    const offerLetterId = getOfferLetterId(offerLetter);

    if (!offerLetterId) {
      toast.error("Unable to preview this offer letter.");
      return;
    }

    if (import.meta.env.DEV) {
      console.log("Preview ID:", offerLetterId);
    }

    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;

    setPreviewOfferLetterTarget(offerLetter);
    setPreviewOfferLetterLoading(true);
    setPreviewOfferLetterError("");
    setPreviewOfferLetterBlob(null);
    setPreviewOfferLetterContentType("");

    try {
      const response = await previewOfferLetter(offerLetterId);

      if (previewRequestRef.current !== requestId) {
        return;
      }

      const contentType = getResponseHeaderValue(
        response.headers,
        "content-type"
      );
      const previewBlob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
            type: contentType || "",
          });

      setPreviewOfferLetterBlob(previewBlob);
      setPreviewOfferLetterContentType(contentType || previewBlob.type || "");
      setPreviewOfferLetterLoading(false);
    } catch (error) {
      if (previewRequestRef.current !== requestId) {
        return;
      }

      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to preview the selected offer letter."
      );

      setPreviewOfferLetterError(message);
      setPreviewOfferLetterLoading(false);
      toast.error(message);
    }
  };

  const closeSendOfferLetterModal = () => {
    setSendOfferLetterOpen(false);
    setSendOfferLetterTarget(null);
    setSendOfferLetterSubject("");
    setSendOfferLetterBody("");
    setSendOfferLetterErrors({});
  };

  const closeResendOfferLetterModal = () => {
    if (isAnyDocumentSending) {
      return;
    }

    setResendOfferLetterOpen(false);
    setResendOfferLetterTarget(null);
    setResendOfferLetterKind("offer");
  };

  const openResendOfferLetterModal = useCallback((kind, documentItem) => {
    setResendOfferLetterKind(kind);
    setResendOfferLetterTarget(documentItem);
    setResendOfferLetterOpen(true);
  }, []);

  const executeSendOfferLetter = async ({
    offerLetter,
    subject,
    body,
    successMessage,
    onSuccess,
    allowResend = false,
  }) => {
    const offerLetterId = Number(getOfferLetterId(offerLetter));

    if (!offerLetterId) {
      toast.error("Unable to send this offer letter.");
      return false;
    }

    if (!allowResend && isOfferLetterAlreadySent(offerLetter)) {
      toast.info("Offer Letter Already Sent");
      return false;
    }

    if (sendRequestLockRef.current) {
      return false;
    }

    if (import.meta.env.DEV) {
      console.log("Send Payload:", {
        offerLetterId,
        subject,
        body,
      });
    }

    sendRequestLockRef.current = true;
    setSendingOfferLetterId(String(offerLetterId));

    try {
      await sendOfferLetter({
        offerLetterId,
        subject,
        body,
      });

      toast.success(successMessage);
      onSuccess?.();
      return true;
    } catch (error) {
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to send the selected offer letter."
      );

      toast.error(message);
      return false;
    } finally {
      setSendingOfferLetterId(null);
      sendRequestLockRef.current = false;
    }
  };

  const handleOpenSendOfferLetterModal = (offerLetter) => {
    if (sendRequestLockRef.current) {
      return;
    }

    const offerLetterId = getOfferLetterId(offerLetter);

    if (!offerLetterId) {
      toast.error("Unable to send this offer letter.");
      return;
    }

    if (isOfferLetterAlreadySent(offerLetter)) {
      openResendOfferLetterModal("offer", offerLetter);
      return;
    }

    const draft = buildOfferLetterEmailDraft(offerLetter);

    setSendOfferLetterTarget(offerLetter);
    setSendOfferLetterSubject(draft.subject);
    setSendOfferLetterBody(draft.body);
    setSendOfferLetterErrors({});
    setSendOfferLetterOpen(true);
  };

  const handleSendOfferLetterSubjectChange = (value) => {
    setSendOfferLetterSubject(value);
    setSendOfferLetterErrors((prev) =>
      prev.subject ? { ...prev, subject: "" } : prev
    );
  };

  const handleSendOfferLetterBodyChange = (value) => {
    setSendOfferLetterBody(value);
    setSendOfferLetterErrors((prev) =>
      prev.body ? { ...prev, body: "" } : prev
    );
  };

  const handleSendOfferLetterSubmit = async (event) => {
    event.preventDefault();

    if (!sendOfferLetterTarget) {
      return;
    }

    const subject = sendOfferLetterSubject.trim();
    const body = sendOfferLetterBody.trim();
    const nextErrors = {};

    if (!subject) {
      nextErrors.subject = "Subject is required.";
    }

    if (!body) {
      nextErrors.body = "Body is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setSendOfferLetterErrors(nextErrors);
      return;
    }

    const offerLetterId = Number(getOfferLetterId(sendOfferLetterTarget));

    if (!offerLetterId) {
      toast.error("Unable to send this offer letter.");
      return;
    }

    const sentOfferLetter = sendOfferLetterTarget;
    const isSent = await executeSendOfferLetter({
      offerLetter: sendOfferLetterTarget,
      subject,
      body,
      successMessage: "Offer letter sent successfully.",
      onSuccess: closeSendOfferLetterModal,
    });

    if (isSent) {
      markOfferLetterSent(sentOfferLetter);

      try {
        const statusRefresh =
          await offerLetterSendStatus.refreshDocumentSendStatus(
            sentOfferLetter,
            {
              markLoading: true,
              updateState: false,
            }
          );

        if (statusRefresh?.statusState?.isSent) {
          setOfferLetterSendStatus(
            getOfferLetterId(sentOfferLetter),
            statusRefresh.statusState
          );
        }
      } catch (error) {
        console.error("Offer Letter Send Status Refresh Error:", error);
      }
    }
  };

  const executeSendRelievingLetter = async ({
    relievingLetter,
    subject,
    body,
    successMessage,
    onSuccess,
    allowResend = false,
  }) => {
    const relievingLetterId = Number(getRelievingLetterId(relievingLetter));

    if (!relievingLetterId) {
      toast.error("Unable to send this relieving letter.");
      return false;
    }

    if (!allowResend && isRelievingLetterAlreadySent(relievingLetter)) {
      toast.info("Relieving Letter Already Sent");
      return false;
    }

    if (sendRequestLockRef.current) {
      return false;
    }

    if (import.meta.env.DEV) {
      console.log("Send Payload:", {
        relievingLetterId,
        subject,
        body,
      });
    }

    sendRequestLockRef.current = true;
    setSendingRelievingLetterId(String(relievingLetterId));

    try {
      await sendRelievingLetter({
        relievingLetterId,
        subject,
        body,
      });

      toast.success(successMessage);
      onSuccess?.();
      return true;
    } catch (error) {
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to send relieving letter.",
        "relieving letter"
      );

      toast.error(message);
      return false;
    } finally {
      setSendingRelievingLetterId(null);
      sendRequestLockRef.current = false;
    }
  };

  const handleConfirmResendOfferLetter = async () => {
    if (!resendOfferLetterTarget || isAnyDocumentSending) {
      return;
    }

    if (resendOfferLetterKind === "relieving") {
      const draft = buildRelievingLetterEmailDraft(resendOfferLetterTarget);
      const sentRelievingLetter = resendOfferLetterTarget;
      const isSent = await executeSendRelievingLetter({
        relievingLetter: resendOfferLetterTarget,
        subject: draft.subject,
        body: draft.body,
        successMessage: "Relieving Letter sent successfully again.",
        onSuccess: closeResendOfferLetterModal,
        allowResend: true,
      });

      if (isSent) {
        markRelievingLetterSent(sentRelievingLetter);

        try {
          const statusRefresh =
            await relievingLetterSendStatus.refreshDocumentSendStatus(
              sentRelievingLetter,
              {
                markLoading: true,
                updateState: false,
              }
            );

          if (statusRefresh?.statusState?.isSent) {
            setRelievingLetterSendStatus(
              getRelievingLetterId(sentRelievingLetter),
              statusRefresh.statusState
            );
          }
        } catch (error) {
          console.error("Relieving Letter Send Status Refresh Error:", error);
        }
      }
      return;
    }

    const draft = buildOfferLetterEmailDraft(resendOfferLetterTarget);
    const sentOfferLetter = resendOfferLetterTarget;
    const isSent = await executeSendOfferLetter({
      offerLetter: resendOfferLetterTarget,
      subject: draft.subject,
      body: draft.body,
      successMessage: "Offer Letter sent successfully again.",
      onSuccess: closeResendOfferLetterModal,
      allowResend: true,
    });

    if (isSent) {
      markOfferLetterSent(sentOfferLetter);

      try {
        const statusRefresh =
          await offerLetterSendStatus.refreshDocumentSendStatus(
            sentOfferLetter,
            {
              markLoading: true,
              updateState: false,
            }
          );

        if (statusRefresh?.statusState?.isSent) {
          setOfferLetterSendStatus(
            getOfferLetterId(sentOfferLetter),
            statusRefresh.statusState
          );
        }
      } catch (error) {
        console.error("Offer Letter Send Status Refresh Error:", error);
      }
    }
  };

  const closeDeleteOfferLetterModal = () => {
    if (deletingOfferLetterId) {
      return;
    }

    setDeleteOfferLetterTarget(null);
  };

  const handleOpenDeleteOfferLetter = (offerLetter) => {
    const offerLetterId = getOfferLetterId(offerLetter);

    if (!offerLetterId) {
      toast.error("Unable to delete this offer letter.");
      return;
    }

    setDeleteOfferLetterTarget(offerLetter);
  };

  const handleDeleteOfferLetter = async () => {
    if (!deleteOfferLetterTarget) {
      return;
    }

    const offerLetterId = getOfferLetterId(deleteOfferLetterTarget);

    if (!offerLetterId) {
      toast.error("Unable to delete this offer letter.");
      return;
    }

    if (import.meta.env.DEV) {
      console.log("Delete ID:", offerLetterId);
    }

    setDeletingOfferLetterId(String(offerLetterId));

    try {
      await deleteOfferLetter(offerLetterId);

      toast.success("Offer letter deleted successfully.");
      setLetters((prev) =>
        prev.filter(
          (letter) => String(getOfferLetterId(letter)) !== String(offerLetterId)
        )
      );
      setDeleteOfferLetterTarget(null);
      await fetchOfferLetters();
    } catch (error) {
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to delete the selected offer letter."
      );

      toast.error(message);
    } finally {
      setDeletingOfferLetterId(null);
    }
  };

  const handleRelievingChange = (e) => {
    const { name, value } = e.target;

    setRelievingErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setRelievingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRelievingEmployeeChange = useCallback((employeeId) => {
    setRelievingErrors((prev) => ({
      ...prev,
      employeeId: "",
    }));

    setRelievingForm((prev) => ({
      ...prev,
      employeeId,
    }));
  }, []);

  const validateRelievingForm = () => {
    const newErrors = {};

    if (!relievingForm.employeeId) {
      newErrors.employeeId = "Employee is required";
    }

    if (!relievingForm.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!relievingForm.resignationDate) {
  newErrors.resignationDate = "Resignation date is required";
}

    if (!relievingForm.relievingDate) {
      newErrors.relievingDate = "Relieving date is required";
    }

    setRelievingErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateRelievingLetter = async () => {
    if (!validateRelievingForm()) return;

    try {
      setRelievingLoading(true);

     const payload = {
  employeeId: relievingForm.employeeId,
  title: relievingForm.title.trim(),
  resignationDate: relievingForm.resignationDate,
  relievingDate: relievingForm.relievingDate,
};

      await generateRelievingLetter(payload);

      toast.success("Relieving Letter Generated Successfully");
      await loadRelievingLetters();

     setRelievingForm({
  employeeId: "",
  title: "",
  resignationDate: "",
  relievingDate: "",
  designation: "",
});
      setRelievingErrors({});
    } catch (error) {
      console.error("Relieving Generate Error:", error);
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Failed to generate relieving letter.",
        "relieving letter"
      );
      toast.error(message);
    } finally {
      setRelievingLoading(false);
    }
  };

  const handleDownloadRelievingLetter = async (id) => {
    try {
      setRelievingDownloadingId(id);

      const response = await downloadRelievingLetter(id);
      const contentType = getResponseHeaderValue(response.headers, "content-type");
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
            type: contentType || "application/pdf",
          });
      const file =
        blob.type === (contentType || "application/pdf")
          ? blob
          : new Blob([blob], {
            type: contentType || "application/pdf",
          });
      const url = window.URL.createObjectURL(file);
      const link = document.createElement("a");

      link.href = url;
      link.download = "RelievingLetter.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      toast.success("Relieving Letter Downloaded");
    } catch (error) {
      console.error("Relieving Download Error:", error);
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to download the selected relieving letter.",
        "relieving letter"
      );
      toast.error(message);
    } finally {
      setRelievingDownloadingId(null);
    }
  };

  const closePreviewRelievingLetterModal = () => {
    previewRelievingRequestRef.current += 1;
    setPreviewRelievingLetterTarget(null);
    setPreviewRelievingLetterLoading(false);
    setPreviewRelievingLetterError("");
    setPreviewRelievingLetterBlob(null);
    setPreviewRelievingLetterContentType("");
  };

  const handlePreviewRelievingLetter = async (relievingLetter) => {
    const relievingLetterId = getRelievingLetterId(relievingLetter);

    if (!relievingLetterId) {
      toast.error("Unable to preview this relieving letter.");
      return;
    }

    const requestId = previewRelievingRequestRef.current + 1;
    previewRelievingRequestRef.current = requestId;

    setPreviewRelievingLetterTarget(relievingLetter);
    setPreviewRelievingLetterLoading(true);
    setPreviewRelievingLetterError("");
    setPreviewRelievingLetterBlob(null);
    setPreviewRelievingLetterContentType("");

    try {
      const response = await previewRelievingLetter(relievingLetterId);

      if (previewRelievingRequestRef.current !== requestId) {
        return;
      }

      const contentType = getResponseHeaderValue(
        response.headers,
        "content-type"
      );
      const previewBlob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
            type: contentType || "application/pdf",
          });

      setPreviewRelievingLetterBlob(previewBlob);
      setPreviewRelievingLetterContentType(contentType || previewBlob.type || "");
      setPreviewRelievingLetterLoading(false);
    } catch (error) {
      if (previewRelievingRequestRef.current !== requestId) {
        return;
      }

      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to preview the selected relieving letter.",
        "relieving letter"
      );

      setPreviewRelievingLetterError(message);
      setPreviewRelievingLetterLoading(false);
      toast.error(message);
    }
  };

  const closeSendRelievingLetterModal = () => {
    setSendRelievingLetterOpen(false);
    setSendRelievingLetterTarget(null);
    setSendRelievingLetterSubject("");
    setSendRelievingLetterBody("");
    setSendRelievingLetterErrors({});
  };

  const handleOpenSendRelievingLetterModal = (relievingLetter) => {
    if (sendRequestLockRef.current) {
      return;
    }

    const relievingLetterId = getRelievingLetterId(relievingLetter);

    if (!relievingLetterId) {
      toast.error("Unable to send this relieving letter.");
      return;
    }

    if (isRelievingLetterAlreadySent(relievingLetter)) {
      openResendOfferLetterModal("relieving", relievingLetter);
      return;
    }

    const draft = buildRelievingLetterEmailDraft(relievingLetter);

    setSendRelievingLetterTarget(relievingLetter);
    setSendRelievingLetterSubject(draft.subject);
    setSendRelievingLetterBody(draft.body);
    setSendRelievingLetterErrors({});
    setSendRelievingLetterOpen(true);
  };

  const handleSendRelievingLetterSubjectChange = (value) => {
    setSendRelievingLetterSubject(value);
    setSendRelievingLetterErrors((prev) =>
      prev.subject ? { ...prev, subject: "" } : prev
    );
  };

  const handleSendRelievingLetterBodyChange = (value) => {
    setSendRelievingLetterBody(value);
    setSendRelievingLetterErrors((prev) =>
      prev.body ? { ...prev, body: "" } : prev
    );
  };

  const handleSendRelievingLetterSubmit = async (event) => {
    event.preventDefault();

    if (!sendRelievingLetterTarget) {
      return;
    }

    const subject = sendRelievingLetterSubject.trim();
    const body = sendRelievingLetterBody.trim();
    const nextErrors = {};

    if (!subject) {
      nextErrors.subject = "Subject is required.";
    }

    if (!body) {
      nextErrors.body = "Body is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setSendRelievingLetterErrors(nextErrors);
      return;
    }

    const relievingLetterId = Number(getRelievingLetterId(sendRelievingLetterTarget));

    if (!relievingLetterId) {
      toast.error("Unable to send this relieving letter.");
      return;
    }

    const sentRelievingLetter = sendRelievingLetterTarget;
    const isSent = await executeSendRelievingLetter({
      relievingLetter: sendRelievingLetterTarget,
      subject,
      body,
      successMessage: "Relieving letter sent successfully.",
      onSuccess: closeSendRelievingLetterModal,
    });

    if (isSent) {
      markRelievingLetterSent(sentRelievingLetter);

      try {
        const statusRefresh =
          await relievingLetterSendStatus.refreshDocumentSendStatus(
            sentRelievingLetter,
            {
              markLoading: true,
              updateState: false,
            }
          );

        if (statusRefresh?.statusState?.isSent) {
          setRelievingLetterSendStatus(
            getRelievingLetterId(sentRelievingLetter),
            statusRefresh.statusState
          );
        }
      } catch (error) {
        console.error("Relieving Letter Send Status Refresh Error:", error);
      }
    }
  };

  const closeDeleteRelievingLetterModal = () => {
    if (deletingRelievingLetterId) {
      return;
    }

    setDeleteRelievingLetterTarget(null);
  };

  const handleOpenDeleteRelievingLetter = (relievingLetter) => {
    const relievingLetterId = getRelievingLetterId(relievingLetter);

    if (!relievingLetterId) {
      toast.error("Unable to delete this relieving letter.");
      return;
    }

    setDeleteRelievingLetterTarget(relievingLetter);
  };

  const handleDeleteRelievingLetter = async () => {
    if (!deleteRelievingLetterTarget) {
      return;
    }

    const relievingLetterId = getRelievingLetterId(deleteRelievingLetterTarget);

    if (!relievingLetterId) {
      toast.error("Unable to delete this relieving letter.");
      return;
    }

    setDeletingRelievingLetterId(String(relievingLetterId));

    try {
      await deleteRelievingLetter(relievingLetterId);

      toast.success("Relieving letter deleted successfully.");
      setGeneratedRelievingLetters((prev) =>
        prev.filter(
          (letter) =>
            String(getRelievingLetterId(letter)) !== String(relievingLetterId)
        )
      );
      setDeleteRelievingLetterTarget(null);
      await loadRelievingLetters();
    } catch (error) {
      const message = await getOfferLetterApiErrorMessage(
        error,
        "Unable to delete relieving letter.",
        "relieving letter"
      );

      toast.error(message);
    } finally {
      setDeletingRelievingLetterId(null);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="offer-container">
      {letterType === "offer" ? (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              marginBottom: "0px",
              paddingBottom: "0px",
              marginTop: "0px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "26px",
                fontWeight: "650",
                color: "var(--text-primary)",
                lineHeight: "1.2",
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
                color: "var(--text-muted)",
                fontWeight: "500",
              }}
            >
              Generate offer letters for new hires
            </p>

            <div className="premium-input-group letter-type-field">
              <label>Letter Type</label>

              <select
                className="premium-input"
                value={letterType}
                onChange={(e) => setLetterType(e.target.value)}
              >
                <option value="offer">Offer Letter</option>
                <option value="relieving">Relieving Letter</option>
              </select>
            </div>
          </div>

          <div className="offer-card">
            <h3>Generate New Offer Letter</h3>

            <div className="form-grid offer-letter-form-grid">

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

                {errors.candidate_Name && (
                  <p className="field-error">
                    {errors.candidate_Name}
                  </p>
                )}
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

                {errors.email && (
                  <p className="field-error">
                    {errors.email}
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

              {/* Address */}
              <div className="form-group full-width">
                <label>
                  <FaMapMarkerAlt /> Address
                </label>

                <textarea
                  ref={fieldRefs.address}
                  name="address"
                  rows="3"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                />

                {errors.address && (
                  <p className="field-error">
                    {errors.address}
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
                    marginBottom: "12px",
                  }}
                >
                  <h3 className="compensation-title">
                    Compensation and Benefits Structure
                  </h3>

                  <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    style={{
                      background: isEditMode
                        ? "var(--danger)"
                        : "var(--primary)",
                      color: "var(--theme-on-primary)",
                      border: "1px solid var(--border-color)",
                      padding: "7px 14px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {isEditMode ? "Cancel Edit" : "Edit"}
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

                    <th className="offer-actions-cell offer-actions-header">
                      <span className="offer-actions-header-content">
                        <FaFileAlt aria-hidden="true" />
                        <span>Actions</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentLetters.length > 0 ? (
                    currentLetters.map((item, index) => {
                      const offerLetterId = getOfferLetterId(item);
                      const normalizedOfferLetterId = offerLetterId
                        ? String(offerLetterId)
                        : "";
                      const offerLetterStatus =
                        offerLetterSendStatus.getDocumentStatus(item);
                      const isAlreadySent = offerLetterStatus.status === "sent";
                      const isSendStatusChecking =
                        isOfferLetterSendStatusLoading(item);
                      const isDownloading =
                        String(downloadingId) === normalizedOfferLetterId;
                      const isSending =
                        String(sendingOfferLetterId) === normalizedOfferLetterId;
                      const isDeleting =
                        String(deletingOfferLetterId) === normalizedOfferLetterId;
                      const isPreviewing =
                        previewOfferLetterLoading &&
                        String(getOfferLetterId(previewOfferLetterTarget)) ===
                        normalizedOfferLetterId;

                      return (
                        <tr key={normalizedOfferLetterId || item.id || index}>
                          <td>{indexOfFirst + index + 1}</td>

                          <td>{item.candidate_Name}</td>

                          <td>{item.email}</td>
                          <td>{item.position}</td>

                          <td className="offer-actions-cell">
                            <div className="offer-actions-wrapper">
                              <button
                                type="button"
                                className="offer-action-btn offer-action-preview"
                                onClick={() => handlePreviewOfferLetter(item)}
                                disabled={!offerLetterId || isPreviewing || isSending}
                                title="Preview"
                                aria-label="Preview offer letter"
                              >
                                <FaEye />
                              </button>

                              <DocumentSendStatusButton
                                status={offerLetterStatus.status}
                                loading={isSendStatusChecking}
                                disabled={
                                  !offerLetterId ||
                                  isSending ||
                                  isAnyDocumentSending
                                }
                                onClick={() => handleOpenSendOfferLetterModal(item)}
                                title={
                                  isAlreadySent
                                    ? "Already Sent - Click to Send Again"
                                    : isSendStatusChecking
                                      ? "Checking send status..."
                                      : "Send Offer Letter"
                                }
                                aria-label={
                                  isAlreadySent
                                    ? "Already sent - click to send again"
                                    : isSendStatusChecking
                                      ? "Checking send status"
                                      : "Send offer letter"
                                }
                                className="offer-action-btn--status"
                              />

                              <button
                                type="button"
                                className="offer-action-btn offer-action-download"
                                onClick={() => handleDownload(offerLetterId)}
                                disabled={!offerLetterId || isDownloading || isSending}
                                title="Download"
                                aria-label="Download offer letter"
                              >
                                <FaDownload />
                              </button>

                              <button
                                type="button"
                                className="offer-action-btn offer-action-delete"
                                onClick={() => handleOpenDeleteOfferLetter(item)}
                                disabled={!offerLetterId || isDeleting || isSending}
                                title="Delete"
                                aria-label="Delete offer letter"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
              <div className="app-pagination-bar">
                <div className="app-pagination-info">
                  Showing <strong>{indexOfFirst + 1}</strong>-<strong>{Math.min(indexOfLast, letters.length)}</strong> of <strong>{letters.length}</strong>
                </div>

                <div className="app-pagination-controls">
                  <select
                    className="app-pagination-page-size"
                    value={lettersPerPage}
                    onChange={(event) => setLettersPerPage(Number(event.target.value))}
                  >
                    {[10, 20, 30, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="app-pagination-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    First
                  </button>

                  <button
                    type="button"
                    className="app-pagination-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, pageIndex) => pageIndex + 1)
                    .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                    .map((page, index, pages) => {
                      const previousPage = pages[index - 1];
                      const shouldShowDots = previousPage && page - previousPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {shouldShowDots && <span className="app-pagination-dots">...</span>}
                          <button
                            type="button"
                            className={`app-pagination-button ${currentPage === page ? "active" : ""}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    className="app-pagination-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </button>

                  <button
                    type="button"
                    className="app-pagination-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    Last
                  </button>
                </div>
              </div>
            )}

            <OfferLetterPreviewModal
              open={Boolean(previewOfferLetterTarget)}
              offerLetter={previewOfferLetterTarget}
              loading={previewOfferLetterLoading}
              error={previewOfferLetterError}
              blob={previewOfferLetterBlob}
              contentType={previewOfferLetterContentType}
              onClose={closePreviewOfferLetterModal}
            />

            <OfferLetterSendModal
              open={sendOfferLetterOpen}
              offerLetter={sendOfferLetterTarget}
              subject={sendOfferLetterSubject}
              body={sendOfferLetterBody}
              errors={sendOfferLetterErrors}
              sending={Boolean(sendingOfferLetterId)}
              onClose={closeSendOfferLetterModal}
              onSubjectChange={handleSendOfferLetterSubjectChange}
              onBodyChange={handleSendOfferLetterBodyChange}
              onSubmit={handleSendOfferLetterSubmit}
            />

            <SendAgainModal
              open={resendOfferLetterOpen}
              documentTitle={
                resendOfferLetterKind === "relieving"
                  ? getRelievingLetterRecipientName(resendOfferLetterTarget)
                  : resendOfferLetterTarget?.candidate_Name ||
                  resendOfferLetterTarget?.candidateName ||
                  "Selected document"
              }
              sending={
                resendOfferLetterKind === "offer"
                  ? Boolean(
                    sendingOfferLetterId &&
                    String(sendingOfferLetterId) ===
                    String(getOfferLetterId(resendOfferLetterTarget))
                  )
                  : Boolean(
                    sendingRelievingLetterId &&
                    String(sendingRelievingLetterId) ===
                    String(getRelievingLetterId(resendOfferLetterTarget))
                  )
              }
              onClose={closeResendOfferLetterModal}
              onConfirm={handleConfirmResendOfferLetter}
            />

            <OfferLetterDeleteModal
              open={Boolean(deleteOfferLetterTarget)}
              offerLetter={deleteOfferLetterTarget}
              deleting={Boolean(deletingOfferLetterId)}
              onClose={closeDeleteOfferLetterModal}
              onConfirm={handleDeleteOfferLetter}
            />
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              marginBottom: "0px",
              paddingBottom: "0px",
              marginTop: "0px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "26px",
                fontWeight: "650",
                color: "var(--text-primary)",
                lineHeight: "1.2",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaFileAlt />
              Relieving Letter Generation
            </h2>

            <p
              style={{
                marginTop: "0px",
                marginLeft: "42px",
                fontSize: "15px",
                color: "var(--text-muted)",
                fontWeight: "500",
              }}
            >
              Generate relieving letters for employees
            </p>

            <div className="premium-input-group letter-type-field">
              <label>Letter Type</label>

              <select
                className="premium-input"
                value={letterType}
                onChange={(e) => setLetterType(e.target.value)}
              >
                <option value="offer">Offer Letter</option>
                <option value="relieving">Relieving Letter</option>
              </select>
            </div>
          </div>

          <div className="offer-card">
            <h3>Generate New Relieving Letter</h3>

            <div className="form-grid">
              <div className="form-group">
                <label>
                  <FaUser /> Employee
                </label>

                <CompactSearchableDropdown
                  value={relievingForm.employeeId}
                  onChange={handleRelievingEmployeeChange}
                  groups={employeeDropdownGroups}
                  placeholder={
                    employeesLoading ? "Loading employees..." : "Select Employee"
                  }
                  searchPlaceholder="Search employee ID or name"
                  emptyText="No employees found"
                  disabled={employeesLoading}
                  loading={employeesLoading}
                  menuMaxHeight={240}
                />

                {relievingErrors.employeeId && (
                  <p className="field-error">
                    {relievingErrors.employeeId}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>
                  <FaBriefcase /> Title
                </label>

                <select
                  name="title"
                  value={relievingForm.title}
                  onChange={handleRelievingChange}
                >
                  <option value="">Select Title</option>
                  {RELIEVING_TITLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {relievingErrors.title && (
                  <p className="field-error">
                    {relievingErrors.title}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>
                  <FaCalendarAlt /> Resignation Date
                </label>

                <AppDatePicker
                  name="resignationDate"
                  value={relievingForm.resignationDate}
                  onChange={handleRelievingChange}
                />

                {relievingErrors.resignationDate && (
                  <p className="field-error">
                    {relievingErrors.resignationDate}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>
                  <FaCalendarAlt /> Relieving Date
                </label>

                <AppDatePicker
                  name="relievingDate"
                  value={relievingForm.relievingDate}
                  onChange={handleRelievingChange}
                />

                {relievingErrors.relievingDate && (
                  <p className="field-error">
                    {relievingErrors.relievingDate}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>
                  <FaBriefcase /> Designation
                </label>

                <input
                  type="text"
                  name="designation"
                  value={relievingForm.designation}
                  onChange={handleRelievingChange}
                  placeholder="Enter designation"
                />

                {relievingErrors.designation && (
                  <p className="field-error">
                    {relievingErrors.designation}
                  </p>
                )}
              </div>
            </div>

            <div className="offer-buttons">
              <button
                className="btn-primary"
                onClick={handleGenerateRelievingLetter}
                disabled={relievingLoading}
              >
                <FaFileAlt />
                {relievingLoading ? " Generating..." : " Generate Letter"}
              </button>
            </div>
          </div>

          <div className="offer-list">
            <h3>
              <FaFileAlt /> Generated Relieving Letters
            </h3>

            <div className="table-scroll">
              <table className="generated-relieving-letters-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>
                      <FaUser /> Employee ID
                    </th>
                    <th>
                      <FaUser /> Employee Name
                    </th>
                    <th>
                      <FaCalendarAlt /> Relieving Date
                    </th>
                    <th className="offer-actions-cell offer-actions-header">
                      <span className="offer-actions-header-content">
                        <FaFileAlt aria-hidden="true" />
                        <span>Actions</span>
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingRelievingLetters ? (
                    <tr>
                      <td colSpan="5" className="app-table-empty-cell">
                        Loading relieving letters...
                      </td>
                    </tr>
                  ) : generatedRelievingLetters.length > 0 ? (
                    generatedRelievingLetters.map((item, index) => {
                      const employeeId = getRelievingLetterEmployeeId(item);
                      const relievingLetterId = getRelievingLetterId(item);
                      const relievingLetterStatus =
                        relievingLetterSendStatus.getDocumentStatus(item);
                      const isAlreadySent =
                        relievingLetterStatus.status === "sent";
                      const isSendStatusChecking =
                        isRelievingLetterSendStatusLoading(item);
                      const isSending =
                        String(sendingRelievingLetterId) ===
                        String(relievingLetterId);

                      return (
                        <tr key={relievingLetterId || `${employeeId}-${index}`}>
                          <td>{formatRelievingTableValue(item.id)}</td>
                          <td>{formatRelievingTableValue(item.employeeId)}</td>
                          <td>{formatRelievingTableValue(item.employeeName)}</td>
                          <td>{formatDate(item.relievingDate)}</td>
                          <td className="offer-actions-cell">
                            <div className="offer-actions-wrapper">
                              <button
                                type="button"
                                className="offer-action-btn offer-action-preview"
                                onClick={() => handlePreviewRelievingLetter(item)}
                                disabled={
                                  !relievingLetterId ||
                                  isSending ||
                                  (previewRelievingLetterLoading &&
                                    String(getRelievingLetterId(previewRelievingLetterTarget)) ===
                                    String(relievingLetterId))
                                }
                                title="Preview"
                                aria-label="Preview relieving letter"
                              >
                                <FaEye />
                              </button>

                              <DocumentSendStatusButton
                                status={relievingLetterStatus.status}
                                loading={isSendStatusChecking}
                                disabled={
                                  !relievingLetterId ||
                                  isSending ||
                                  isAnyDocumentSending
                                }
                                onClick={() => handleOpenSendRelievingLetterModal(item)}
                                title={
                                  isAlreadySent
                                    ? "Already Sent - Click to Send Again"
                                    : isSendStatusChecking
                                      ? "Checking send status..."
                                      : "Send Relieving Letter"
                                }
                                aria-label={
                                  isAlreadySent
                                    ? "Already sent - click to send again"
                                    : isSendStatusChecking
                                      ? "Checking send status"
                                      : "Send relieving letter"
                                }
                                className="offer-action-btn--status"
                              />

                              <button
                                type="button"
                                className="offer-action-btn offer-action-download"
                                onClick={() => handleDownloadRelievingLetter(relievingLetterId)}
                                disabled={
                                  !relievingLetterId ||
                                  isSending ||
                                  String(relievingDownloadingId) ===
                                  String(relievingLetterId)
                                }
                                title="Download"
                                aria-label="Download relieving letter"
                              >
                                <FaDownload />
                              </button>

                              <button
                                type="button"
                                className="offer-action-btn offer-action-delete"
                                onClick={() => handleOpenDeleteRelievingLetter(item)}
                                disabled={
                                  !relievingLetterId ||
                                  isSending ||
                                  String(deletingRelievingLetterId) ===
                                  String(relievingLetterId)
                                }
                                title="Delete"
                                aria-label="Delete relieving letter"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="app-table-empty-cell">
                        No relieving letters found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <OfferLetterPreviewModal
            open={Boolean(previewRelievingLetterTarget)}
            offerLetter={previewRelievingLetterTarget}
            letterLabel="Relieving Letter"
            loading={previewRelievingLetterLoading}
            error={previewRelievingLetterError}
            blob={previewRelievingLetterBlob}
            contentType={previewRelievingLetterContentType}
            onClose={closePreviewRelievingLetterModal}
          />

          <OfferLetterSendModal
            open={sendRelievingLetterOpen}
            offerLetter={sendRelievingLetterTarget}
            letterLabel="Relieving Letter"
            recipientName={getRelievingLetterRecipientName(sendRelievingLetterTarget)}
            recipientEmail={getRelievingLetterRecipientEmail(sendRelievingLetterTarget)}
            subject={sendRelievingLetterSubject}
            body={sendRelievingLetterBody}
            errors={sendRelievingLetterErrors}
            sending={Boolean(sendingRelievingLetterId)}
            onClose={closeSendRelievingLetterModal}
            onSubjectChange={handleSendRelievingLetterSubjectChange}
            onBodyChange={handleSendRelievingLetterBodyChange}
            onSubmit={handleSendRelievingLetterSubmit}
          />

          <OfferLetterDeleteModal
            open={Boolean(deleteRelievingLetterTarget)}
            offerLetter={deleteRelievingLetterTarget}
            letterLabel="Relieving Letter"
            message="Are you sure you want to delete this relieving letter?"
            deleting={Boolean(deletingRelievingLetterId)}
            onClose={closeDeleteRelievingLetterModal}
            onConfirm={handleDeleteRelievingLetter}
          />
        </>
      )}
    </div>
  );
}

export default OfferLetters;
