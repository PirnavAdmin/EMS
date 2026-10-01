import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  LoaderCircle,
  Mail,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import "./Performance.css";
import api from "../api/axiosInstance";
import { extractCollection } from "../utils/collections";
import { getStoredEmployeeId, getStoredRole, getStoredRoleName, getStoredToken, getStoredUserRecord } from "../utils/authStorage";
import { hasAddPermission, hasEditPermission } from "../utils/authorization";
import { downloadBinaryFile, getDownloadErrorMessage } from "../utils/downloadUtils";
import { toastError, toastInfo, toastSuccess, toastWarning } from "../components/common/toast/toastService";
import {
  generateHikeLetter,
  getAllAppraisals,
  getAppraisalSalary,
  getEmployeeAppraisal,
  getEmployeeSalaryStructure,
  getPerformanceCycles,
  hrReview,
  managerReview,
  saveAppraisal,
  saveAppraisalSalary,
  sendHikeEmail,
} from "../services/appraisalService";
import { getEmployees } from "../services/employeeService";

const SALARY_FIELDS = [
  ["annualCTC", "Annual CTC"], ["monthlyCTC", "Monthly CTC"], ["basicSalary", "Basic Salary"],
  ["hra", "HRA"], ["bonus", "Bonus"], ["conveyanceAllowance", "Conveyance Allowance"],
  ["medicalAllowance", "Medical Allowance"], ["specialAllowance", "Special Allowance"],
  ["employeePF", "Employee PF"], ["employerPF", "Employer PF"], ["professionalTax", "Professional Tax"],
  ["tds", "TDS"], ["otherDeduction", "Other Deduction"], ["grossSalary", "Gross Salary"],
  ["netTakeHome", "Net Take Home"], ["esi", "ESI"], ["variablePay", "Variable Pay"],
];

const numeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toBoolean = (value) => value === true || String(value).trim().toLowerCase() === "true" || String(value).trim() === "1";

const getValue = (item, ...keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const normalizeId = (value) => String(value ?? "").trim().toLowerCase();
const appraisalIdOf = (item) => getValue(item, "appraisalId", "AppraisalId", "id", "Id");
const employeeIdOf = (item) => getValue(item, "employee_Id", "employeeId", "employee_id", "Employee_Id", "EmployeeId");
const cycleIdOf = (item) => getValue(item, "performanceCycleId", "PerformanceCycleId", "performanceCycle_Id");
const ratingOf = (item, key) => {
  const value = getValue(item, key, key[0].toUpperCase() + key.slice(1));
  return value === "" ? null : numeric(value, null);
};
const isCompletedRating = (value) => {
  const rating = numeric(value, 0);

  return rating >= 1 && rating <= 5;
};

const reviewCompleted = (appraisal, ratingKey) => {
  return isCompletedRating(
    getValue(
      appraisal,
      ratingKey,
      ratingKey[0].toUpperCase() + ratingKey.slice(1)
    )
  );
};

const getCollection = (payload) => extractCollection(payload ?? []);
const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};
const apiError = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.response?.data?.title || error?.message || fallback;

const blankSalary = (employeeId = "", appraisalId = "", hikePercentage = 0) => ({
  employee_Id: employeeId,
  appraisalId,
  hikePercentage: numeric(hikePercentage),
  effectiveFrom: new Date().toISOString().slice(0, 10),
  ...Object.fromEntries(SALARY_FIELDS.map(([key]) => [key, 0])),
});

const normalizeSalary = (source, employeeId, appraisalId, hikePercentage) => {
  const next = blankSalary(employeeId, appraisalId, hikePercentage);
  const record = Array.isArray(source) ? source[0] || {} : source || {};
  Object.keys(next).forEach((key) => {
    if (key === "effectiveFrom") {
      const value = getValue(record, key, "EffectiveFrom");
      next[key] = value ? String(value).slice(0, 10) : next[key];
    } else if (key === "employee_Id") {
      next[key] = getValue(record, key, "employeeId", "Employee_Id", "EmployeeId") || next[key];
    } else if (key === "appraisalId") {
      next[key] = getValue(record, key, "AppraisalId") || next[key];
    } else {
      next[key] = numeric(getValue(record, key, key[0].toUpperCase() + key.slice(1)), next[key]);
    }
  });
  return next;
};

const extractSalaryRecord = (payload) => {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    return payload[0] || null;
  }

  if (payload?.data) {
    if (Array.isArray(payload.data)) {
      return payload.data[0] || null;
    }

    if (typeof payload.data === "object") {
      return payload.data;
    }
  }

  if (payload?.result) {
    if (Array.isArray(payload.result)) {
      return payload.result[0] || null;
    }

    if (typeof payload.result === "object") {
      return payload.result;
    }
  }

  if (payload?.salaryStructure) {
    return Array.isArray(payload.salaryStructure)
      ? payload.salaryStructure[0] || null
      : payload.salaryStructure;
  }

  return payload;
};

const hasSalaryData = (record) => {
  if (!record) return false;

  return SALARY_FIELDS.some(([key]) => {
    const value = getValue(
      record,
      key,
      key[0].toUpperCase() + key.slice(1)
    );

    return value !== "" && numeric(value, 0) !== 0;
  });
};

const employeeNameOf = (employee = {}) => {
  const explicit = getValue(employee, "employeeName", "name", "fullName", "EmployeeName", "Name");
  return explicit || `${getValue(employee, "firstName", "FirstName")} ${getValue(employee, "lastName", "LastName")}`.trim() || "-";
};

const employeeDetails = (employee = {}) => ({
  id: employeeIdOf(employee),
  name: employeeNameOf(employee),
  department: getValue(employee, "department", "dept", "departmentName", "Department") || "-",
  designation: getValue(employee, "designation", "jobTitle", "Designation") || "-",
});

const resolveRole = () => {
  const role = String(getStoredRoleName() || getStoredRole() || "").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (role.includes("manager")) return "manager";
  if (role === "hr" || role.includes("humanresource")) return "hr";
  if (role.includes("admin")) return "admin";
  return "employee";
};

function RatingInput({ value, onChange, disabled = false, label }) {
  return <label className="performance-field"><span>{label}</span><select value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? "" : numeric(event.target.value))} disabled={disabled}><option value="">Select rating</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select></label>;
}

const workflowFlag = (appraisal, ...keys) => {
  // First check the actual boolean flags returned by the API.
  if (
    keys.some((key) =>
      toBoolean(getValue(appraisal, key))
    )
  ) {
    return true;
  }

  // Also use the appraisal Status as a fallback.
  // This is important when the list says "Letter Generated"
  // but the separate boolean field is not returned.
  const status = String(
    getValue(appraisal, "status", "Status") || ""
  )
    .trim()
    .toLowerCase();

  // Salary Saved -> salary structure is already saved.
  if (
    keys.some((key) =>
      [
        "salarystructuresaved",
        "appraisalsalarysaved",
        "salarysaved",
      ].includes(
        String(key).replace(/[^a-zA-Z]/g, "").toLowerCase()
      )
    )
  ) {
    return (
      status.includes("salary saved") ||
      status.includes("letter generated") ||
      status.includes("email sent") ||
      status === "completed"
    );
  }

  // Letter Generated -> letter already exists.
  if (
    keys.some((key) =>
      [
        "hikelettergenerated",
        "lettergenerated",
      ].includes(
        String(key).replace(/[^a-zA-Z]/g, "").toLowerCase()
      )
    )
  ) {
    return (
      status.includes("letter generated") ||
      status.includes("email sent") ||
      status === "completed"
    );
  }

  // Email Sent -> email has already been sent at least once.
  if (
    keys.some((key) =>
      [
        "hikeletteremailsent",
        "emailsent",
      ].includes(
        String(key).replace(/[^a-zA-Z]/g, "").toLowerCase()
      )
    )
  ) {
    return (
      status.includes("email sent") ||
      status === "completed"
    );
  }

  return false;
};

function Workflow({
  appraisal,
  salarySaved = false,
  letterGenerated = false,
  emailSent = false,
}) {
  const selfDone = reviewCompleted(
    appraisal,
    "selfRating"
  );

  const managerDone = reviewCompleted(
    appraisal,
    "managerRating"
  );

  const hrDone = reviewCompleted(
    appraisal,
    "finalRating"
  );

  const salaryDone =
    salarySaved ||
    workflowFlag(
      appraisal,
      "salaryStructureSaved",
      "SalaryStructureSaved",
      "appraisalSalarySaved",
      "AppraisalSalarySaved",
      "salarySaved",
      "SalarySaved"
    );

  const letterDone =
    letterGenerated ||
    workflowFlag(
      appraisal,
      "hikeLetterGenerated",
      "HikeLetterGenerated",
      "letterGenerated",
      "LetterGenerated"
    );

  const emailDone =
    emailSent ||
    workflowFlag(
      appraisal,
      "hikeLetterEmailSent",
      "HikeLetterEmailSent",
      "emailSent",
      "EmailSent"
    );

  const steps = [
    ["Self Review", selfDone],
    ["Manager Review", managerDone],
    ["HR Review", hrDone],
    ["Salary", salaryDone],
    ["Letter", letterDone],
    ["Email", emailDone],
  ];

  return (
    <div
      className="performance-workflow"
      aria-label="Performance review workflow"
    >
      {steps.map(([label, complete]) => (
        <div
          className={`performance-step ${complete ? "complete" : ""
            }`}
          key={label}
        >
          <span />
          {label}
        </div>
      ))}
    </div>
  );
}

function DetailGrid({ appraisal, employee }) {
  const cycle = appraisal?.performanceCycle || appraisal?.PerformanceCycle || {};
  const details = employeeDetails(employee);
  return <>
    <div className="performance-detail-grid">
      <div><span>Employee ID</span><strong>{details.id || employeeIdOf(appraisal) || "-"}</strong></div>
      <div><span>Employee</span><strong>{details.name}</strong></div>
      <div><span>Department</span><strong>{details.department}</strong></div>
      <div><span>Designation</span><strong>{details.designation}</strong></div>
    </div>
    {appraisal && <div className="performance-cycle-details"><span>{getValue(cycle, "cycleName", "CycleName") || "Performance cycle"}</span><span>{getValue(cycle, "financialYear", "FinancialYear") || "-"}</span><span>{formatDate(getValue(cycle, "startDate", "StartDate"))} - {formatDate(getValue(cycle, "endDate", "EndDate"))}</span></div>}
  </>;
}

export default function Performance() {
  const role = useMemo(resolveRole, []);
  const currentEmployeeId = useMemo(() => getStoredEmployeeId(), []);
  const currentUser = useMemo(() => getStoredUserRecord(), []);
  const [mode, setMode] = useState(role === "employee" ? "self" : "employees");
  const [appraisals, setAppraisals] = useState([]);
  const [ownAppraisals, setOwnAppraisals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState("");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [selfRating, setSelfRating] = useState("");
  const [employeeRemarks, setEmployeeRemarks] = useState("");
  const [managerRating, setManagerRating] = useState("");
  const [managerRemarks, setManagerRemarks] = useState("");
  const [finalRating, setFinalRating] = useState("");
  const [hike, setHike] = useState("");
  const [promotion, setPromotion] = useState(false);
  const [hrRemarks, setHrRemarks] = useState("");
  const [salary, setSalary] = useState(blankSalary());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [downloadingLetter, setDownloadingLetter] = useState(false);
  const [letterReady, setLetterReady] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [salarySaved, setSalarySaved] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const canModify = role !== "admin" && (hasAddPermission("Performance") || hasEditPermission("Performance"));
  const ownEmployee = useMemo(() => employees.find((employee) => normalizeId(employeeIdOf(employee)) === normalizeId(currentEmployeeId)) || currentUser || {}, [currentEmployeeId, currentUser, employees]);
  const selectedCycleAppraisal = useMemo(() => ownAppraisals.find((item) => String(cycleIdOf(item)) === String(cycleId)) || null, [cycleId, ownAppraisals]);
  const employeeMap = useMemo(() => new Map(employees.map((employee) => [normalizeId(employeeIdOf(employee)), employee])), [employees]);

  const refresh = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      // IMPORTANT:
      // ALL ROLES use the SAME appraisal API.
      // Admin already receives the correct records from this API,
      // so Manager and HR must also use the same source.
      const [
        appraisalResult,
        employeesResult,
        cyclesResult,
        ownResult,
      ] = await Promise.allSettled([
        getAllAppraisals(),
        getEmployees(),
        getPerformanceCycles(),
        currentEmployeeId
          ? getEmployeeAppraisal(currentEmployeeId)
          : Promise.resolve({ data: [] }),
      ]);

      // ---------------------------------------------------------
      // APPRAISALS
      // ---------------------------------------------------------
      if (appraisalResult.status === "fulfilled") {
        const records = getCollection(
          appraisalResult.value?.data
        );

        console.log(
          "PERFORMANCE - ALL APPRAISALS:",
          records
        );

        setAppraisals(records);
      } else {
        console.error(
          "PERFORMANCE - APPRAISAL API ERROR:",
          appraisalResult.reason
        );

        toastError(
          apiError(
            appraisalResult.reason,
            "Unable to load appraisals."
          )
        );

        setAppraisals([]);
      }

      // ---------------------------------------------------------
      // EMPLOYEES
      // ---------------------------------------------------------
      if (employeesResult.status === "fulfilled") {
        setEmployees(
          getCollection(
            employeesResult.value?.data
          )
        );
      } else {
        setEmployees([]);
      }

      // ---------------------------------------------------------
      // OWN EMPLOYEE APPRAISALS
      // ---------------------------------------------------------
      if (ownResult.status === "fulfilled") {
        setOwnAppraisals(
          getCollection(
            ownResult.value?.data
          )
        );
      } else {
        setOwnAppraisals([]);
      }

      // ---------------------------------------------------------
      // PERFORMANCE CYCLES
      // ---------------------------------------------------------
      if (cyclesResult.status === "fulfilled") {
        const resultCycles = getCollection(
          cyclesResult.value?.data
        );

        setCycles(resultCycles);

        setCycleId((previous) => {
          if (previous) {
            return previous;
          }

          return resultCycles.length
            ? String(
              cycleIdOf(resultCycles[0])
            )
            : "";
        });
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [currentEmployeeId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!selectedCycleAppraisal) {
      setSelfRating(""); setEmployeeRemarks(""); return;
    }
    setSelfRating(ratingOf(selectedCycleAppraisal, "selfRating") ?? "");
    setEmployeeRemarks(getValue(selectedCycleAppraisal, "employeeRemarks", "EmployeeRemarks"));
  }, [selectedCycleAppraisal]);

  const currentManagerKeys = useMemo(() => {
    const values = [
      currentEmployeeId,
      getValue(currentUser, "employeeId", "employee_Id", "EmployeeId", "Employee_Id"),
      getValue(currentUser, "userId", "UserId", "id", "Id"),
      getValue(currentUser, "email", "Email", "userName", "username", "UserName"),
    ];

    return new Set(values.filter(Boolean).map(normalizeId));
  }, [currentEmployeeId, currentUser]);

  const visibleAppraisals = useMemo(() => {
    // ============================================================
    // IMPORTANT
    //
    // Do NOT filter appraisals by managerEmployeeIds.
    // Do NOT filter by appraisalBelongsToManager().
    //
    // Admin already receives the correct appraisal collection
    // from getAllAppraisals().
    //
    // Manager and HR must use the SAME collection.
    // ============================================================

    let source = [...appraisals];

    const query = search.trim().toLowerCase();

    // ------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------
    if (query) {
      source = source.filter((item) => {
        const employee =
          employeeMap.get(
            normalizeId(
              employeeIdOf(item)
            )
          ) || {};

        const employeeName =
          employeeNameOf(employee) !== "-"
            ? employeeNameOf(employee)
            : getValue(
              item,
              "employeeName",
              "employeeFullName",
              "EmployeeName",
              "EmployeeFullName",
              "name",
              "Name"
            );

        const department =
          getValue(
            employee,
            "department",
            "dept",
            "departmentName",
            "Department"
          ) ||
          getValue(
            item,
            "department",
            "departmentName",
            "Department"
          );

        return [
          employeeIdOf(item),
          employeeName,
          department,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    }

    return source;
  }, [
    appraisals,
    employeeMap,
    search,
  ]);

  const selectedEmployee = useMemo(() => {
    if (!selected) return {};

    const employeeId = normalizeId(
      employeeIdOf(selected)
    );

    return (
      employeeMap.get(employeeId) || {
        employeeId: employeeIdOf(selected),
        employeeName: getValue(
          selected,
          "employeeName",
          "employeeFullName",
          "EmployeeName",
          "EmployeeFullName",
          "name",
          "Name"
        ),
        department: getValue(
          selected,
          "department",
          "departmentName",
          "Department"
        ),
        designation: getValue(
          selected,
          "designation",
          "designationName",
          "Designation"
        ),
      }
    );
  }, [selected, employeeMap]);
  const hasManagerReview =
    Boolean(selected) &&
    reviewCompleted(
      selected,
      "managerRating"
    );

  const hasHrReview =
    Boolean(selected) &&
    reviewCompleted(
      selected,
      "finalRating"
    );

  const salaryAlreadySaved =
    Boolean(selected) &&
    (
      salarySaved ||
      workflowFlag(
        selected,
        "salaryStructureSaved",
        "SalaryStructureSaved",
        "appraisalSalarySaved",
        "AppraisalSalarySaved",
        "salarySaved",
        "SalarySaved"
      )
    );

  const selectAppraisal = async (appraisal) => {
    setSelected(appraisal);
    setSalary(blankSalary(employeeIdOf(appraisal), appraisalIdOf(appraisal)));
    setSalarySaved(
      workflowFlag(
        appraisal,
        "salaryStructureSaved",
        "SalaryStructureSaved",
        "appraisalSalarySaved",
        "AppraisalSalarySaved",
        "salarySaved",
        "SalarySaved"
      )
    );

    setLetterReady(
      workflowFlag(
        appraisal,
        "hikeLetterGenerated",
        "HikeLetterGenerated",
        "letterGenerated",
        "LetterGenerated"
      )
    );

    setEmailSent(
      workflowFlag(
        appraisal,
        "hikeLetterEmailSent",
        "HikeLetterEmailSent",
        "emailSent",
        "EmailSent"
      )
    );

    setManagerRating(ratingOf(appraisal, "managerRating") ?? "");
    setManagerRemarks(
      getValue(appraisal, "managerRemarks", "ManagerRemarks")
    );
    setFinalRating(ratingOf(appraisal, "finalRating") ?? "");
    setHike(
      getValue(
        appraisal,
        "salaryHikePercentage",
        "SalaryHikePercentage"
      )
    );
    setPromotion(
      toBoolean(
        getValue(
          appraisal,
          "promotionRecommended",
          "PromotionRecommended"
        )
      )
    );
    setHrRemarks(
      getValue(appraisal, "hrRemarks", "HrRemarks")
    );

    if (role === "hr" || role === "admin") {
      await loadSalary(appraisal);
    }
  };

  const loadSalary = async (appraisal = selected) => {
    if (!appraisal) return;

    const employeeId = employeeIdOf(appraisal);
    const appraisalId = appraisalIdOf(appraisal);

    if (!employeeId) {
      toastError("Employee ID is unavailable.");
      return;
    }

    const appraisalSalaryAlreadySaved = workflowFlag(
      appraisal,
      "salaryStructureSaved",
      "SalaryStructureSaved",
      "appraisalSalarySaved",
      "AppraisalSalarySaved",
      "salarySaved",
      "SalarySaved"
    );

    setSalaryLoading(true);

    try {
      /*
       * ============================================================
       * CASE 1:
       * Salary structure was already saved for this appraisal.
       *
       * In this case load the revised/appraisal salary.
       * ============================================================
       */
      if (appraisalSalaryAlreadySaved) {
        try {
          const response = await getAppraisalSalary(
            employeeId,
            appraisalId
          );

          const appraisalRecord = extractSalaryRecord(
            response?.data
          );

          if (hasSalaryData(appraisalRecord)) {
            const normalized = normalizeSalary(
              appraisalRecord,
              employeeId,
              appraisalId,
              getValue(
                appraisal,
                "salaryHikePercentage",
                "SalaryHikePercentage"
              )
            );

            setSalary(normalized);
            setSalarySaved(true);
            return;
          }
        } catch (error) {
          console.warn(
            "Unable to load saved appraisal salary:",
            error
          );
        }

        /*
         * Do not silently show zeros if a saved salary is expected.
         * Try the employee's current structure as a fallback.
         */
      }

      /*
       * ============================================================
       * CASE 2:
       * Salary has NOT been saved for this appraisal.
       *
       * ALWAYS load the employee's ORIGINAL/current salary structure.
       *
       * This is what HR should see BEFORE entering/saving the hike.
       * ============================================================
       */
      const response = await getEmployeeSalaryStructure(
        employeeId
      );

      const originalRecord = extractSalaryRecord(
        response?.data
      );

      if (!originalRecord || !hasSalaryData(originalRecord)) {
        throw new Error(
          "Employee salary structure was not found."
        );
      }

      const originalSalary = normalizeSalary(
        originalRecord,
        employeeId,
        appraisalId,
        getValue(
          appraisal,
          "salaryHikePercentage",
          "SalaryHikePercentage"
        )
      );

      /*
       * Keep the ORIGINAL salary in state.
       *
       * SalaryPanel will calculate the revised salary only in preview
       * when HR enters a hike percentage.
       */
      setSalary(originalSalary);

      // IMPORTANT:
      // If the appraisal status already indicates that salary was saved
      // (Salary Saved / Letter Generated / Email Sent / Completed),
      // NEVER reset salarySaved back to false.
      //
      // This keeps the Save Salary Structure button disabled permanently
      // after the salary has already been saved.
      setSalarySaved(appraisalSalaryAlreadySaved);

    } catch (error) {
      console.error(
        "PERFORMANCE - SALARY LOAD ERROR:",
        error
      );

      setSalary(
        blankSalary(
          employeeId,
          appraisalId,
          getValue(
            appraisal,
            "salaryHikePercentage",
            "SalaryHikePercentage"
          )
        )
      );

      setSalarySaved(appraisalSalaryAlreadySaved);

      toastError(
        apiError(
          error,
          "Unable to load employee salary structure."
        )
      );
    } finally {
      setSalaryLoading(false);
    }
  };

  const submitSelf = async () => {
    if (!canModify) return toastWarning("Your Performance permission does not allow changes.");
    if (!currentEmployeeId) return toastError("Your employee ID is unavailable.");
    if (!cycleId) return toastError("Select a performance cycle.");
    if (![1, 2, 3, 4, 5].includes(numeric(selfRating, 0))) return toastError("Select a self rating from 1 to 5.");
    setSubmitting(true);
    try {
      const latest = await getEmployeeAppraisal(currentEmployeeId);
      const duplicate = getCollection(latest.data).find((item) => String(cycleIdOf(item)) === String(cycleId));
      if (duplicate) { toastInfo("A performance review already exists for this cycle."); await refresh({ showLoader: false }); return; }
      await saveAppraisal({ employee_Id: currentEmployeeId, performanceCycleId: numeric(cycleId), selfRating: numeric(selfRating), employeeRemarks: employeeRemarks.trim() });
      toastSuccess("Performance saved successfully.");
      await refresh({ showLoader: false });
    } catch (error) { toastError(apiError(error, "Unable to save performance.")); }
    finally { setSubmitting(false); }
  };

  const submitManagerReview = async () => {
    if (!selected) {
      return;
    }

    if (role !== "manager") {
      return;
    }

    if (!canModify) {
      return toastWarning(
        "Your Performance permission does not allow changes."
      );
    }

    if (hasManagerReview) {
      return toastInfo(
        "Manager review has already been submitted."
      );
    }

    if (
      ![1, 2, 3, 4, 5].includes(
        numeric(managerRating, 0)
      )
    ) {
      return toastError(
        "Select a manager rating from 1 to 5."
      );
    }

    setSubmitting(true);

    try {
      await managerReview(
        appraisalIdOf(selected),
        numeric(managerRating),
        managerRemarks.trim()
      );

      toastSuccess(
        "Manager review submitted successfully."
      );

      // Refresh ALL appraisal data so the pipeline
      // immediately changes to Manager Review completed.
      const response =
        await getAllAppraisals();

      const latestAppraisals =
        getCollection(response.data);

      setAppraisals(latestAppraisals);

      const latest =
        latestAppraisals.find(
          (item) =>
            String(appraisalIdOf(item)) ===
            String(appraisalIdOf(selected))
        ) || selected;

      setSelected(latest);

      setManagerRating(
        ratingOf(
          latest,
          "managerRating"
        ) ?? ""
      );

      setManagerRemarks(
        getValue(
          latest,
          "managerRemarks",
          "ManagerRemarks"
        )
      );
    } catch (error) {
      toastError(
        apiError(
          error,
          "Unable to submit manager review."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitHrReview = async () => {
    if (!selected) {
      return;
    }

    if (role !== "hr") {
      return;
    }

    if (!canModify) {
      return toastWarning(
        "Your Performance permission does not allow changes."
      );
    }

    if (!hasManagerReview) {
      return toastWarning(
        "Waiting for Manager Review."
      );
    }

    if (hasHrReview) {
      return toastInfo(
        "HR review has already been submitted."
      );
    }

    if (
      ![1, 2, 3, 4, 5].includes(
        numeric(finalRating, 0)
      )
    ) {
      return toastError(
        "Select a final rating from 1 to 5."
      );
    }

    if (
      hike === "" ||
      numeric(hike, -1) < 0 ||
      numeric(hike, -1) > 100
    ) {
      return toastError(
        "Enter a valid hike percentage between 0 and 100."
      );
    }

    setSubmitting(true);

    try {
      await hrReview(
        appraisalIdOf(selected),
        numeric(finalRating),
        numeric(hike),
        promotion,
        hrRemarks.trim()
      );

      toastSuccess(
        "HR review submitted successfully."
      );

      const response =
        await getAllAppraisals();

      const latestAppraisals =
        getCollection(response.data);

      setAppraisals(latestAppraisals);

      const latest =
        latestAppraisals.find(
          (item) =>
            String(appraisalIdOf(item)) ===
            String(appraisalIdOf(selected))
        ) || selected;

      setSelected(latest);

      setFinalRating(
        ratingOf(
          latest,
          "finalRating"
        ) ?? ""
      );

      setHike(
        getValue(
          latest,
          "salaryHikePercentage",
          "SalaryHikePercentage"
        )
      );

      setPromotion(
        toBoolean(
          getValue(
            latest,
            "promotionRecommended",
            "PromotionRecommended"
          )
        )
      );

      setHrRemarks(
        getValue(
          latest,
          "hrRemarks",
          "HrRemarks"
        )
      );

      // Load the salary again after HR review.
      await loadSalary(latest);
    } catch (error) {
      toastError(
        apiError(
          error,
          "Unable to submit HR review."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const saveSalary = async (salaryToSave = null) => {
    if (
      !selected ||
      role !== "hr" ||
      !canModify ||
      !hasHrReview ||
      salaryAlreadySaved
    ) {
      return;
    }

    const employeeId = employeeIdOf(selected);
    const appraisalId = appraisalIdOf(selected);
    const values = salaryToSave || salary;

    if (!employeeId) {
      return toastError("Employee ID is missing.");
    }

    if (!appraisalId) {
      return toastError("Appraisal ID is missing.");
    }

    const payload = {
      employee_Id: employeeId,
      appraisalId: appraisalId,

      annualCTC: numeric(values.annualCTC),
      monthlyCTC: numeric(values.monthlyCTC),
      basicSalary: numeric(values.basicSalary),
      hra: numeric(values.hra),
      bonus: numeric(values.bonus),
      conveyanceAllowance: numeric(values.conveyanceAllowance),
      medicalAllowance: numeric(values.medicalAllowance),
      specialAllowance: numeric(values.specialAllowance),
      employeePF: numeric(values.employeePF),
      employerPF: numeric(values.employerPF),
      professionalTax: numeric(values.professionalTax),
      tds: numeric(values.tds),
      otherDeduction: numeric(values.otherDeduction),
      grossSalary: numeric(values.grossSalary),
      netTakeHome: numeric(values.netTakeHome),
      esi: numeric(values.esi),
      variablePay: numeric(values.variablePay),

      hikePercentage: numeric(hike, 0),

      effectiveFrom: values.effectiveFrom
        ? `${values.effectiveFrom}T00:00:00`
        : null,
    };

    console.log(
      "PERFORMANCE - SAVE SALARY PAYLOAD:",
      payload
    );

    setSubmitting(true);

    try {
      const response = await saveAppraisalSalary(payload);

      console.log(
        "PERFORMANCE - SAVE SALARY RESPONSE:",
        response?.data
      );

      /*
       * IMPORTANT:
       * Keep the revised salary in the UI after successful save.
       * Do not call loadSalary() here.
       */
      setSalary({
        ...values,
        employee_Id: employeeId,
        appraisalId,
        hikePercentage: numeric(hike, 0),
      });

      setSalarySaved(true);

      // Letter must be generated after salary save.
      setLetterReady(false);

      // Email must be sent only after letter generation.
      setEmailSent(false);

      toastSuccess(
        "Salary structure saved successfully."
      );
    } catch (error) {
      console.error(
        "PERFORMANCE - SAVE SALARY ERROR:",
        error?.response?.data || error
      );

      toastError(
        apiError(
          error,
          "Unable to save salary structure."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const generateLetter = async () => {
    if (
      !selected ||
      role !== "hr" ||
      !hasHrReview ||
      !salarySaved ||
      letterReady ||
      generatingLetter
    ) {
      return;
    }

    setGeneratingLetter(true);

    try {
      await generateHikeLetter(
        appraisalIdOf(selected)
      );

      setLetterReady(true);

      toastSuccess(
        "Hike letter generated successfully."
      );
    } catch (error) {
      console.error(
        "PERFORMANCE - GENERATE HIKE LETTER ERROR:",
        error?.response?.data || error
      );

      toastError(
        apiError(
          error,
          "Unable to generate hike letter."
        )
      );
    } finally {
      setGeneratingLetter(false);
    }
  };
  const downloadLetter = async () => {
    if (!selected || !letterReady || downloadingLetter) {
      return;
    }

    const appraisalId = appraisalIdOf(selected);
    const fileName = `hike-letter-${employeeIdOf(selected) || appraisalId
      }.pdf`;

    const downloadOptions = {
      endpoint: `/AppraisalSalary/download/${appraisalId}`,
      token: getStoredToken(),
      fallbackFileName: fileName,
    };

    setDownloadingLetter(true);

    try {
      try {
        await downloadBinaryFile(downloadOptions);
      } catch (error) {
        // If the file is missing, regenerate it and retry once.
        if (error?.response?.status !== 404) {
          throw error;
        }

        await generateHikeLetter(appraisalId);
        await downloadBinaryFile(downloadOptions);
      }

      toastSuccess("Hike letter downloaded successfully.");
    } catch (error) {
      console.error(
        "Hike letter download failed:",
        error?.response?.data || error
      );

      toastError(
        getDownloadErrorMessage(error) ||
        "Unable to download the hike letter. Please try again."
      );
    } finally {
      setDownloadingLetter(false);
    }
  };


  const sendEmail = async () => {
    if (
      !selected ||
      emailSending ||
      role !== "hr" ||
      !letterReady
    ) {
      return;
    }

    setEmailSending(true);

    try {
      await sendHikeEmail(
        appraisalIdOf(selected)
      );

      setEmailSent(true);

      toastSuccess(
        "Hike letter email sent successfully."
      );
    } catch (error) {
      toastError(
        apiError(
          error,
          "Unable to send hike letter email."
        )
      );
    } finally {
      setEmailSending(false);
    }
  };

  const summary = useMemo(
    () => ({
      total: appraisals.length,

      self: appraisals.filter((item) =>
        reviewCompleted(item, "selfRating")
      ).length,

      manager: appraisals.filter((item) =>
        reviewCompleted(item, "managerRating")
      ).length,

      hr: appraisals.filter((item) =>
        reviewCompleted(item, "finalRating")
      ).length,

      completed: appraisals.filter(
        (item) =>
          String(
            getValue(item, "status", "Status")
          ).toLowerCase() === "completed"
      ).length,
    }),
    [appraisals]
  );

  const renderSelf = () => <section className="performance-surface"><div className="performance-section-head"><div><h2>Self Performance</h2><p>Record your own review for the selected cycle.</p></div><span className="performance-status">{getValue(selectedCycleAppraisal, "status", "Status") || "Not submitted"}</span></div><label className="performance-field"><span>Performance Cycle</span><select value={cycleId} onChange={(event) => setCycleId(event.target.value)} disabled={Boolean(selectedCycleAppraisal)}><option value="">Select cycle</option>{cycles.map((cycle) => <option key={cycleIdOf(cycle)} value={cycleIdOf(cycle)}>{getValue(cycle, "cycleName", "CycleName") || `Cycle ${cycleIdOf(cycle)}`}</option>)}</select></label><DetailGrid employee={ownEmployee} appraisal={selectedCycleAppraisal} /><div className="performance-form-grid"><RatingInput label="Self Rating" value={selfRating} onChange={setSelfRating} disabled={Boolean(selectedCycleAppraisal) || !canModify} /><label className="performance-field performance-field-wide"><span>Employee Remarks</span><textarea value={employeeRemarks} onChange={(event) => setEmployeeRemarks(event.target.value)} disabled={Boolean(selectedCycleAppraisal) || !canModify} placeholder="Share your performance notes" /></label></div>{selectedCycleAppraisal ? <><Workflow appraisal={selectedCycleAppraisal} /><ReviewReadOnly appraisal={selectedCycleAppraisal} /></> : <button type="button" className="performance-primary" onClick={submitSelf} disabled={submitting || !cycleId || !canModify}>{submitting ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}Save Performance</button>}</section>;

  const renderList = () => <section className="performance-surface"><div className="performance-section-head"><div><h2>Employee Performance</h2><p>{role === "manager" ? "Review employees who report to you." : "Select an appraisal to review or monitor."}</p></div><button type="button" className="performance-icon-button" title="Refresh appraisals" onClick={() => refresh({ showLoader: false })}><RefreshCw size={17} /></button></div><label className="performance-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee" /></label><div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>Employee</th><th>Department</th><th>Cycle</th><th>Self</th><th>Manager</th><th>Final</th><th>Status</th><th /></tr></thead>
    <tbody>
      {visibleAppraisals.map((item) => {
        const employee =
          employeeMap.get(
            normalizeId(
              employeeIdOf(item)
            )
          ) || {};

        const cycle =
          item.performanceCycle ||
          item.PerformanceCycle ||
          {};

        const employeeName =
          employeeNameOf(employee) !== "-"
            ? employeeNameOf(employee)
            : getValue(
              item,
              "employeeName",
              "employeeFullName",
              "EmployeeName",
              "EmployeeFullName",
              "name",
              "Name"
            ) || "-";

        const department =
          getValue(
            employee,
            "department",
            "dept",
            "departmentName",
            "Department"
          ) ||
          getValue(
            item,
            "department",
            "departmentName",
            "Department"
          ) ||
          "-";

        const cycleName =
          getValue(
            cycle,
            "cycleName",
            "CycleName"
          ) ||
          getValue(
            item,
            "cycleName",
            "CycleName"
          ) ||
          cycleIdOf(item) ||
          "-";

        return (
          <tr
            key={appraisalIdOf(item)}
          >
            <td>
              <strong>
                {employeeName}
              </strong>

              <small>
                {employeeIdOf(item) || "-"}
              </small>
            </td>

            <td>
              {department}
            </td>

            <td>
              {cycleName}
            </td>

            <td>
              {ratingOf(
                item,
                "selfRating"
              ) ?? "-"}
            </td>

            <td>
              {ratingOf(
                item,
                "managerRating"
              ) ?? "-"}
            </td>

            <td>
              {ratingOf(
                item,
                "finalRating"
              ) ?? "-"}
            </td>

            <td>
              <span className="performance-status">
                {getValue(
                  item,
                  "status",
                  "Status"
                ) || "In progress"}
              </span>
            </td>

            <td>
              <button
                type="button"
                className="performance-text-button"
                onClick={() =>
                  selectAppraisal(item)
                }
              >
                View
              </button>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>{!visibleAppraisals.length && <div className="performance-empty">No appraisal records found.</div>}</div></section>;

  const renderSelected = () =>
    selected && (
      <section className="performance-surface performance-selected">
        <div className="performance-section-head">
          <div>
            <h2>
              {role === "admin"
                ? "Appraisal Details"
                : "Review Performance"}
            </h2>
            <p>
              {getValue(selected, "status", "Status") ||
                "In progress"}
            </p>
          </div>

          <button
            type="button"
            className="performance-text-button"
            onClick={() => setSelected(null)}
          >
            Back to list
          </button>
        </div>

        <DetailGrid
          employee={selectedEmployee}
          appraisal={selected}
        />

        <Workflow
          appraisal={selected}
          salarySaved={salaryAlreadySaved}
          letterGenerated={letterReady}
          emailSent={emailSent}
        />

        <ReviewReadOnly appraisal={selected} />

        {role === "manager" && (
          <div className="performance-review-form">
            <h3>Manager Review</h3>

            <div className="performance-form-grid">
              <RatingInput
                label="Manager Rating"
                value={managerRating}
                onChange={setManagerRating}
                disabled={
                  hasManagerReview || !canModify
                }
              />

              <label className="performance-field performance-field-wide">
                <span>Manager Remarks</span>

                <textarea
                  value={managerRemarks}
                  onChange={(event) =>
                    setManagerRemarks(
                      event.target.value
                    )
                  }
                  disabled={
                    hasManagerReview || !canModify
                  }
                  placeholder="Add manager feedback"
                />
              </label>
            </div>

            <button
              type="button"
              className="performance-primary"
              onClick={submitManagerReview}
              disabled={
                submitting ||
                hasManagerReview ||
                !canModify
              }
            >
              {submitting ? (
                <LoaderCircle
                  className="spin"
                  size={17}
                />
              ) : (
                <Save size={17} />
              )}
              Submit Review
            </button>
          </div>
        )}

        {role === "hr" && (
          <>
            <div className="performance-review-form">
              <h3>HR Final Review</h3>

              {!hasManagerReview && (
                <div className="performance-notice">
                  Waiting for Manager Review
                </div>
              )}

              <div className="performance-form-grid">
                <RatingInput
                  label="Final Rating"
                  value={finalRating}
                  onChange={setFinalRating}
                  disabled={
                    !hasManagerReview ||
                    hasHrReview ||
                    !canModify
                  }
                />

                <label className="performance-field">
                  <span>Hike Percentage</span>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hike}
                    onChange={(event) =>
                      setHike(event.target.value)
                    }
                    disabled={
                      !hasManagerReview ||
                      hasHrReview ||
                      !canModify
                    }
                    placeholder="Enter hike %"
                  />
                </label>

                <label className="performance-field">
                  <span>Promotion Recommended</span>

                  <select
                    value={
                      promotion ? "yes" : "no"
                    }
                    onChange={(event) =>
                      setPromotion(
                        event.target.value ===
                        "yes"
                      )
                    }
                    disabled={
                      !hasManagerReview ||
                      hasHrReview ||
                      !canModify
                    }
                  >
                    <option value="no">
                      No
                    </option>
                    <option value="yes">
                      Yes
                    </option>
                  </select>
                </label>

                <label className="performance-field performance-field-wide">
                  <span>HR Remarks</span>

                  <textarea
                    value={hrRemarks}
                    onChange={(event) =>
                      setHrRemarks(
                        event.target.value
                      )
                    }
                    disabled={
                      !hasManagerReview ||
                      hasHrReview ||
                      !canModify
                    }
                    placeholder="Add HR final remarks"
                  />
                </label>
              </div>

              <button
                type="button"
                className="performance-primary"
                onClick={submitHrReview}
                disabled={
                  submitting ||
                  !hasManagerReview ||
                  hasHrReview ||
                  !canModify
                }
              >
                {submitting ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <Save size={17} />
                )}
                Submit HR Review
              </button>
            </div>

            {hasManagerReview && (
              <SalaryPanel
                salary={salary}
                setSalary={setSalary}
                loading={salaryLoading}
                disabled={!canModify}
                onSave={saveSalary}
                onGenerate={generateLetter}
                onDownload={downloadLetter}
                onSendEmail={sendEmail}
                submitting={submitting}
                generatingLetter={generatingLetter}
                downloadingLetter={downloadingLetter}
                letterReady={letterReady}
                emailSending={emailSending}
                hike={hike}
                onHikeChange={setHike}
                hrReviewed={hasHrReview}
                salarySaved={salaryAlreadySaved}
                emailSent={emailSent}
              />
            )}
          </>
        )}

        {role === "admin" && (
          <SalaryPanel
            salary={salary}
            setSalary={setSalary}
            loading={salaryLoading}
            disabled
            readOnly
            onDownload={downloadLetter}
            letterReady={letterReady}
            hike={hike}
            hrReviewed={hasHrReview}
            salarySaved={salarySaved}
            emailSent={emailSent}
          />
        )}
      </section>
    );

  if (loading) return <div className="performance-page performance-loading"><LoaderCircle className="spin" size={25} />Loading performance data...</div>;
  const summaryCards = [["Total Appraisals", summary.total, ClipboardCheck], ["Self Reviews", summary.self, UserCheck], ["Manager Reviews", summary.manager, Award], ["HR Reviews", summary.hr, ShieldCheck], ["Completed", summary.completed, CheckCircle2]];
  return <main className="performance-page"><header className="performance-header"><div><h1>Performance Reviews</h1><p>Self reviews, manager feedback, and final HR decisions in one workflow.</p></div>{(role === "manager" || role === "hr") && <label className="performance-mode"><span>View</span><select value={mode} onChange={(event) => { setMode(event.target.value); setSelected(null); }}><option value="self">Self Performance</option><option value="employees">Employee Performance</option></select></label>}</header>{role === "admin" && <section className="performance-summary">{summaryCards.map(([label, value, Icon]) => <div key={label}><span><Icon aria-hidden="true" />{label}</span><strong>{value}</strong></div>)}</section>}{role === "admin" ? (selected ? renderSelected() : renderList()) : role === "employee" || mode === "self" ? renderSelf() : selected ? renderSelected() : renderList()}</main>;
}

function ReviewReadOnly({ appraisal }) {
  const selfCompleted = reviewCompleted(
    appraisal,
    "selfRating"
  );

  const managerCompleted = reviewCompleted(
    appraisal,
    "managerRating"
  );

  const hrCompleted = reviewCompleted(
    appraisal,
    "finalRating"
  );

  return (
    <div className="performance-readonly">
      <div>
        <h3>Employee Self Review</h3>

        <p>
          <strong>Rating:</strong>{" "}
          {selfCompleted
            ? ratingOf(appraisal, "selfRating")
            : "Pending"}
        </p>

        <p>
          {getValue(
            appraisal,
            "employeeRemarks",
            "EmployeeRemarks"
          ) || "No employee remarks provided."}
        </p>
      </div>

      <div>
        <h3>Manager Review</h3>

        <p>
          <strong>Rating:</strong>{" "}
          {managerCompleted
            ? ratingOf(
              appraisal,
              "managerRating"
            )
            : "Pending"}
        </p>

        <p>
          {managerCompleted
            ? getValue(
              appraisal,
              "managerRemarks",
              "ManagerRemarks"
            ) || "No manager remarks provided."
            : "Waiting for manager review."}
        </p>
      </div>

      <div>
        <h3>HR Review</h3>

        <p>
          <strong>Final Rating:</strong>{" "}
          {hrCompleted
            ? ratingOf(
              appraisal,
              "finalRating"
            )
            : "Pending"}
        </p>

        <p>
          {hrCompleted
            ? getValue(
              appraisal,
              "hrRemarks",
              "HrRemarks"
            ) || "No HR remarks provided."
            : "Waiting for HR review."}
        </p>
      </div>
    </div>
  );
}

function SalaryPanel({
  salary,
  setSalary,
  loading,
  disabled,
  readOnly = false,
  onSave,
  onGenerate,
  onDownload,
  onSendEmail,
  submitting,
  generatingLetter,
  downloadingLetter,
  letterReady,
  emailSending,
  hike,
  onHikeChange,
  hrReviewed,
  salarySaved,
  emailSent,
}) {
  const percentage = Math.min(
    100,
    Math.max(0, numeric(hike, 0))
  );

  const previewSalary = useMemo(() => {
    if (salarySaved || percentage <= 0) {
      return salary;
    }

    const multiplier = 1 + percentage / 100;

    return {
      ...salary,
      hikePercentage: percentage,
      ...Object.fromEntries(
        SALARY_FIELDS.map(([key]) => [
          key,
          Number(
            (
              numeric(salary[key], 0) *
              multiplier
            ).toFixed(2)
          ),
        ])
      ),
    };
  }, [salary, percentage, salarySaved]);

  const update = (key, value) => {
    setSalary((previous) => ({
      ...previous,
      [key]:
        key === "effectiveFrom"
          ? value
          : numeric(value),
    }));
  };

  const handleSave = () => {
    const values = {
      ...previewSalary,
      hikePercentage: percentage,
    };

    setSalary(values);
    onSave(values);
  };

  return (
    <div className="performance-salary">
      <div className="performance-section-head">
        <div>
          <h3>Salary Structure</h3>
          <p>
            {salarySaved
              ? "Revised salary structure saved for this appraisal."
              : "Original salary is shown first. Enter the hike percentage to preview the revised salary."}
          </p>
        </div>

        {loading && (
          <LoaderCircle
            className="spin"
            size={18}
          />
        )}
      </div>

      <div className="performance-form-grid">
        <label className="performance-field">
          <span>Hike Percentage</span>

          <input
            type="number"
            min="0"
            max="100"
            value={hike ?? ""}
            disabled={
              disabled ||
              readOnly ||
              hrReviewed
            }
            onChange={(event) =>
              onHikeChange?.(
                event.target.value
              )
            }
            placeholder="Enter hike %"
          />
        </label>

        <label className="performance-field">
          <span>Effective From</span>

          <input
            type="date"
            value={salary.effectiveFrom || ""}
            disabled={disabled || readOnly || salarySaved}
            onChange={(event) =>
              update(
                "effectiveFrom",
                event.target.value
              )
            }
          />
        </label>

        {SALARY_FIELDS.map(
          ([key, label]) => (
            <label
              className="performance-field"
              key={key}
            >
              <span>{label}</span>

              <input
                type="number"
                min="0"
                value={
                  previewSalary[key] ?? 0
                }
                disabled={
                  disabled ||
                  readOnly ||
                  salarySaved
                }
                onChange={(event) =>
                  update(
                    key,
                    event.target.value
                  )
                }
              />
            </label>
          )
        )}
      </div>

      <div className="performance-actions">
        <button
          type="button"
          className="performance-primary"
          onClick={handleSave}
          disabled={
            disabled ||
            submitting ||
            !hrReviewed ||
            salarySaved
          }
        >
          <Save size={17} />
          Save Salary Structure
        </button>

        <button
          type="button"
          className="performance-secondary"
          onClick={onGenerate}
          disabled={
            disabled ||
            submitting ||
            generatingLetter ||
            letterReady ||
            !hrReviewed ||
            !salarySaved
          }
        >
          {generatingLetter ? (
            <>
              <LoaderCircle
                className="spin"
                size={17}
              />
              Generating...
            </>
          ) : (
            <>
              <FileText size={17} />
              {letterReady
                ? "Letter Generated"
                : "Generate Hike Letter"}
            </>
          )}
        </button>

        <button
          type="button"
          className="performance-secondary"
          onClick={onDownload}
          disabled={!letterReady || downloadingLetter}
        >
          {downloadingLetter ? (
            <>
              <LoaderCircle className="spin" size={17} />
              Downloading...
            </>
          ) : (
            <>
              <Download size={17} />
              Download Hike Letter
            </>
          )}
        </button>

        <button
          type="button"
          className="performance-secondary"
          onClick={onSendEmail}
          disabled={
            !letterReady ||
            emailSending ||
            emailSent
          }
        >
          {emailSending ? (
            <LoaderCircle
              className="spin"
              size={17}
            />
          ) : (
            <Mail size={17} />
          )}
          Send Email
        </button>
      </div>
    </div>
  );
}
