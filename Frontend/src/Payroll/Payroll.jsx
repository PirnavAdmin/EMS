import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./Payroll.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildApiUrl } from "../api/endpoints";
import AppPagination from "../components/AppPagination";
import { formatDate } from "../utils/date";
import { formatCurrency as formatAppCurrency } from "../utils/formatters";
import { getStoredToken } from "../utils/authStorage";
import useDebouncedValue from "../hooks/useDebouncedValue";
import {
  endPerformanceTimer,
  logPerformanceError,
  startPerformanceTimer,
} from "../utils/performance";
import { FiDownload, FiLoader, FiTrash2 } from "react-icons/fi";

const PAYROLL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PAYROLL_YEARS = Array.from({ length: 10 }, (_, i) => 2022 + i);
const STANDARD_PERIODS = [1, 3, 6, 12];
const PAYSLIP_BATCH_SIZE = 50;
const PAYSLIP_CONCURRENCY = 50;
const MAX_FAILED_ITEMS_TO_SHOW = 5;
const MANUAL_FIELDS = [
  ["totalWorkingDays", "Total Working Days"],
  ["lopDays", "LOP Days"],
  ["otherDeductions", "Other Deductions"]
];

const normalizeEmployeeIdentifier = (value) =>
  String(value ?? "").trim().toUpperCase();
const buildRollingPayrollPeriods = (endMonth, endYear, periodCount) => {
  const monthIndex = PAYROLL_MONTHS.findIndex(
    (monthName) => monthName === String(endMonth ?? "").trim()
  );
  const normalizedYear = Number(endYear);
  const normalizedPeriodCount = Math.max(1, Number(periodCount) || 1);

  if (monthIndex < 0 || !Number.isFinite(normalizedYear)) {
    return [];
  }

  const periods = [];

  for (let offset = 0; offset < normalizedPeriodCount; offset += 1) {
    const periodDate = new Date(normalizedYear, monthIndex - offset, 1);

    periods.push({
      month: PAYROLL_MONTHS[periodDate.getMonth()],
      year: periodDate.getFullYear(),
    });
  }

  return periods;
};
const formatPayrollPeriodLabel = (period = {}) =>
  `${String(period.month ?? "").trim()} ${String(period.year ?? "").trim()}`.trim();

const formatPayrollPeriodListLabel = (periods) =>
  (Array.isArray(periods) ? periods : [])
    .map(formatPayrollPeriodLabel)
    .filter(Boolean)
    .join(" | ");

const formatPayrollPeriodCountLabel = (count) => {
  const normalizedCount = Math.max(1, Number(count) || 1);
  return `${normalizedCount} ${normalizedCount === 1 ? "Month" : "Months"}`;
};
const getPayslipEmployeeKey = (payslip) =>
  normalizeEmployeeIdentifier(
    payslip?.employeeId ??
    payslip?.employee_Id ??
    payslip?.employeeID ??
    payslip?.employee_id
  );
const getPayslipId = (payslip) =>
  payslip?.id ??
  payslip?.payslipId ??
  payslip?.paySlipId ??
  payslip?.paySlipID ??
  payslip?.paySlip_Id ??
  payslip?.payslip_Id;

const isDevMode = Boolean(import.meta.env.DEV);
const logPayrollTiming = (label, payload) => {
  if (isDevMode) {
    console.info(label, payload);
  }
};

const logBulkBatchStart = (batchIndex, periodLabel, normalizedMonth, normalizedYear, payload, batch) => {
  if (!isDevMode) {
    return;
  }

  console.group(`[Payroll] BULK BATCH ${batchIndex} START`);
  console.info("Batch index:", batchIndex);
  console.info("Periods:", periodLabel);
  console.info("Batch size:", batch.length);
  console.info("Employee IDs:", batch);
  console.info("Selected month:", normalizedMonth);
  console.info("Selected year:", normalizedYear);
  console.info("Endpoint:", API_ENDPOINTS.payroll.generateAll);
  console.info("Payload:", payload);
  console.groupEnd();
};

const logBulkBatchSuccess = (batchIndex, periodLabel, batch, response, batchSummary) => {
  if (!isDevMode) {
    return;
  }

  console.group(`[Payroll] BULK BATCH ${batchIndex} SUCCESS`);
  console.info("Periods:", periodLabel);
  console.info("HTTP status:", response?.status);
  console.info("Raw response:", response?.data);
  console.info("Batch size:", batch.length);
  console.info("Parsed generated count:", batchSummary.generatedCount);
  console.info("Parsed skipped count:", batchSummary.skippedCount);
  console.info("Parsed failed count:", batchSummary.failedCount);
  console.info("Parsed failed employee IDs:", batchSummary.failedEmployeeIds);
  console.info("Failure details:", batchSummary.failureDetails);
  console.groupEnd();
};

const logBulkBatchError = (batchIndex, periodLabel, batch, error) => {
  if (!isDevMode) {
    return;
  }

  console.group(`[Payroll] BULK BATCH ${batchIndex} ERROR`);
  console.error("Periods:", periodLabel);
  console.error("HTTP status:", error?.response?.status);
  console.error("Status text:", error?.response?.statusText);
  console.error("API response:", error?.response?.data);
  console.error("Axios message:", error?.message);
  console.error("Axios code:", error?.code);
  console.error("Request URL:", error?.config?.url);
  console.error("Request method:", error?.config?.method);
  console.error("Batch size:", batch.length);
  console.error("Batch employee IDs:", batch);
  console.groupEnd();
};

const logBulkGenerationFinalSummary = ({
  totalEmployees,
  periodCount,
  totalRequests,
  generatedCount,
  skippedCount,
  failedCount,
  failedEmployeeIds,
  failedBatches,
}) => {
  if (!isDevMode) {
    return;
  }

  console.group("[Payroll] FINAL BULK GENERATION SUMMARY");
  console.info("Total selected employees:", totalEmployees);
  console.info("Period count:", periodCount);
  console.info("Total request jobs:", totalRequests);
  console.info("Generated:", generatedCount);
  console.info("Skipped:", skippedCount);
  console.info("Failed:", failedCount);
  console.info("Failed employees:", failedEmployeeIds);
  console.info("Failed batches:", failedBatches);
  console.info("Processed count:", generatedCount + skippedCount + failedCount);
  console.info(
    "Expected count:",
    totalEmployees * Math.max(1, Number(periodCount) || 1)
  );
  console.groupEnd();
};

const runWithConcurrencyLimit = async (items, limit, worker) => {
  const queue = [...items];
  const workerCount = Math.max(1, Math.min(limit || 1, queue.length));

  let nextIndex = 0;
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= queue.length) {
        break;
      }

      await worker(queue[currentIndex]);
    }
  });

  await Promise.all(workers);
};

const formatFailureSummary = (failedItems) => {
  if (!failedItems.length) {
    return "";
  }

  const preview = failedItems
    .slice(0, MAX_FAILED_ITEMS_TO_SHOW)
    .map((item) => item.label)
    .join(", ");
  const remaining = failedItems.length - MAX_FAILED_ITEMS_TO_SHOW;

  return `Failed employees: ${preview}${remaining > 0 ? ` +${remaining} more` : ""}`;
};

const chunkArray = (items, batchSize) => {
  const source = Array.isArray(items) ? items : [];
  const size = Math.max(1, Number(batchSize) || 1);
  const chunks = [];

  for (let index = 0; index < source.length; index += size) {
    chunks.push(source.slice(index, index + size));
  }

  return chunks;
};

const extractBulkBatchFailureInfo = (responseData) => {
  const source =
    responseData && typeof responseData === "object" && !Array.isArray(responseData)
      ? responseData
      : {};

  const failedEmployeeDetails = new Map();
  const failureDetails = [];

  const registerFailedEmployee = (employeeId, detail = "") => {
    const normalizedEmployeeId = normalizeEmployeeIdentifier(employeeId);

    if (!normalizedEmployeeId) {
      return;
    }

    const existingDetail = failedEmployeeDetails.get(normalizedEmployeeId) || "";

    if (!failedEmployeeDetails.has(normalizedEmployeeId)) {
      failedEmployeeDetails.set(normalizedEmployeeId, detail);
      return;
    }

    if (detail && !existingDetail) {
      failedEmployeeDetails.set(normalizedEmployeeId, detail);
    }
  };

  const collectEntry = (entry) => {
    if (entry == null) {
      return;
    }

    if (typeof entry === "string" || typeof entry === "number") {
      const normalizedEntry = normalizeEmployeeIdentifier(entry);

      if (normalizedEntry) {
        registerFailedEmployee(normalizedEntry);
      }

      return;
    }

    if (typeof entry !== "object") {
      return;
    }

    const employeeId = String(
      entry.employeeId ??
        entry.employee_Id ??
        entry.employee_id ??
        entry.employeeID ??
        entry.employeeCode ??
        entry.id ??
        entry.employee ??
        entry.label ??
        ""
    ).trim();
    const normalizedEmployeeId = normalizeEmployeeIdentifier(employeeId);

    const detail = String(
      entry.message ??
        entry.Message ??
        entry.error ??
        entry.Error ??
        entry.reason ??
        entry.Reason ??
        entry.detail ??
        entry.Detail ??
        ""
    ).trim();

    if (normalizedEmployeeId) {
      registerFailedEmployee(normalizedEmployeeId, detail);
    } else if (detail) {
      failureDetails.push(detail);
    }
  };

  const candidateCollections = [];

  if (Array.isArray(responseData)) {
    candidateCollections.push(responseData);
  }

  if (Array.isArray(source.data)) {
    candidateCollections.push(source.data);
  }

  candidateCollections.push(
    source.failedEmployeeIds,
    source.failedEmployees,
    source.failedIds,
    source.errors,
    source.data?.failedEmployeeIds,
    source.data?.failedEmployees,
    source.data?.failedIds,
    source.data?.errors
  );

  candidateCollections.forEach((collection) => {
    if (Array.isArray(collection)) {
      collection.forEach(collectEntry);
      return;
    }

    if (collection !== undefined && collection !== null) {
      collectEntry(collection);
    }
  });

  const failedEmployeeIds = Array.from(failedEmployeeDetails.keys());
  const alignedFailureDetails = failedEmployeeIds.map(
    (employeeId) => failedEmployeeDetails.get(employeeId) || ""
  );

  if (failureDetails.length > 0) {
    alignedFailureDetails.push(...failureDetails);
  }

  const messageCandidates = [
    source.message,
    source.Message,
    source.error,
    source.Error,
    source.title,
    source.Title,
    source.detail,
    source.Detail,
    source.exceptionMessage,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return {
    message: messageCandidates[0] || "",
    failedEmployeeIds,
    failureDetails: alignedFailureDetails,
  };
};

const collectEmployeeIdsFromCollections = (...collections) => {
  const employeeIds = new Set();

  const visit = (entry) => {
    if (entry == null) {
      return;
    }

    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }

    if (typeof entry === "string" || typeof entry === "number") {
      const normalizedEntry = normalizeEmployeeIdentifier(entry);

      if (normalizedEntry) {
        employeeIds.add(normalizedEntry);
      }

      return;
    }

    if (typeof entry !== "object") {
      return;
    }

    const employeeId = String(
      entry.employeeId ??
        entry.employee_Id ??
        entry.employee_id ??
        entry.employeeID ??
        entry.employeeCode ??
        entry.id ??
        entry.employee ??
        entry.label ??
        ""
    ).trim();
    const normalizedEmployeeId = normalizeEmployeeIdentifier(employeeId);

    if (normalizedEmployeeId) {
      employeeIds.add(normalizedEmployeeId);
    }
  };

  collections.forEach(visit);

  return Array.from(employeeIds);
};

const toNonNegativeNumber = (...values) => {
  for (const value of values) {
    const normalizedValue = Number(value);

    if (Number.isFinite(normalizedValue) && normalizedValue >= 0) {
      return normalizedValue;
    }
  }

  return null;
};

const extractBulkGenerationSummary = (responseData, batch = []) => {
  const source =
    responseData && typeof responseData === "object" && !Array.isArray(responseData)
      ? responseData
      : {};
  const nestedSource =
    source.data && typeof source.data === "object" && !Array.isArray(source.data)
      ? source.data
      : {};
  const summarySource = { ...nestedSource, ...source };
  const failedInfo = extractBulkBatchFailureInfo(summarySource);
  const batchSize = Array.isArray(batch) ? batch.length : 0;

  const skippedEmployeeIds = collectEmployeeIdsFromCollections(
    summarySource.skippedEmployeeIds,
    summarySource.skippedEmployees,
    summarySource.skippedIds,
    summarySource.duplicateEmployeeIds,
    summarySource.duplicateEmployees,
    summarySource.duplicateIds,
    summarySource.data?.skippedEmployeeIds,
    summarySource.data?.skippedEmployees,
    summarySource.data?.skippedIds,
    summarySource.data?.duplicateEmployeeIds,
    summarySource.data?.duplicateEmployees,
    summarySource.data?.duplicateIds
  );

  const rawGeneratedCount = toNonNegativeNumber(
    summarySource.generatedCount,
    summarySource.generated,
    summarySource.successCount,
    summarySource.createdCount,
    summarySource.processedCount,
    summarySource.data?.generatedCount,
    summarySource.data?.generated,
    summarySource.data?.successCount,
    summarySource.data?.createdCount,
    summarySource.data?.processedCount
  );

  const rawSkippedCount = toNonNegativeNumber(
    summarySource.skippedCount,
    summarySource.skipped,
    summarySource.duplicateCount,
    summarySource.duplicatesCount,
    summarySource.data?.skippedCount,
    summarySource.data?.skipped,
    summarySource.data?.duplicateCount,
    summarySource.data?.duplicatesCount
  );

  const rawFailedCount = toNonNegativeNumber(
    summarySource.failedCount,
    summarySource.failed,
    summarySource.errorCount,
    summarySource.data?.failedCount,
    summarySource.data?.failed,
    summarySource.data?.errorCount
  );

  const failedEmployeeCount = failedInfo.failedEmployeeIds.length;
  const skippedEmployeeCount = skippedEmployeeIds.length;
  const hasAnyExplicitCounts =
    rawGeneratedCount != null ||
    rawSkippedCount != null ||
    rawFailedCount != null ||
    failedEmployeeCount > 0 ||
    skippedEmployeeCount > 0;

  let generatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  if (!hasAnyExplicitCounts && batchSize > 0) {
    generatedCount = batchSize;
  } else {
    skippedCount = Math.max(rawSkippedCount ?? 0, skippedEmployeeCount);
    failedCount = Math.max(rawFailedCount ?? 0, failedEmployeeCount);

    if (rawGeneratedCount == null) {
      generatedCount = Math.max(batchSize - skippedCount - failedCount, 0);
    } else {
      generatedCount = Math.max(rawGeneratedCount, 0);
    }

    const processedCount = generatedCount + skippedCount + failedCount;

    if (batchSize > 0 && processedCount > batchSize) {
      if (isDevMode) {
        console.warn("[Payroll] Bulk batch count validation warning", {
          batchSize,
          processedCount,
          generatedCount,
          skippedCount,
          failedCount,
          rawResponse: responseData,
        });
      }

      skippedCount = Math.min(skippedCount, batchSize);
      failedCount = Math.min(failedCount, Math.max(batchSize - skippedCount, 0));
      generatedCount = Math.max(batchSize - skippedCount - failedCount, 0);
    }
  }

  const messageCandidates = [
    summarySource.message,
    summarySource.Message,
    summarySource.error,
    summarySource.Error,
    summarySource.title,
    summarySource.Title,
    summarySource.detail,
    summarySource.Detail,
    summarySource.exceptionMessage,
    summarySource.data?.message,
    summarySource.data?.Message,
    summarySource.data?.error,
    summarySource.data?.Error,
    summarySource.data?.title,
    summarySource.data?.Title,
    summarySource.data?.detail,
    summarySource.data?.Detail,
    summarySource.data?.exceptionMessage,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return {
    message: messageCandidates[0] || failedInfo.message || "",
    generatedCount,
    skippedCount,
    failedCount,
    failedEmployeeIds: failedInfo.failedEmployeeIds,
    skippedEmployeeIds,
    failureDetails: failedInfo.failureDetails,
  };
};

const isValidPayrollMonth = (value) =>
  PAYROLL_MONTHS.includes(String(value ?? "").trim());

const isValidPayrollYear = (value) => {
  const normalizedYear = Number(value);
  return Number.isInteger(normalizedYear) && normalizedYear >= 1900 && normalizedYear <= 2100;
};

const formatBulkBatchFailureSummary = (failedBatches) => {
  if (!failedBatches.length) {
    return "";
  }

  const preview = failedBatches
    .slice(0, MAX_FAILED_ITEMS_TO_SHOW)
    .map((batch) => {
      const employeeIds = Array.isArray(batch.employeeIds) ? batch.employeeIds : [];
      const employeePreview = employeeIds.slice(0, 3).join(", ");
      const remainingEmployees = employeeIds.length - 3;
      const employeeLabel = employeePreview
        ? `${employeePreview}${remainingEmployees > 0 ? ` +${remainingEmployees} more` : ""}`
        : "unknown employees";
      const message = batch.message ? `: ${batch.message}` : "";

      const periodSuffix = batch.periodLabel ? ` - ${batch.periodLabel}` : "";

      return `Batch ${batch.batchIndex}${periodSuffix} (${employeeLabel})${message}`;
    })
    .join(" | ");

  const remaining = failedBatches.length - MAX_FAILED_ITEMS_TO_SHOW;

  return `${failedBatches.length} batch${failedBatches.length === 1 ? "" : "es"} failed.${preview ? ` ${preview}${remaining > 0 ? ` | +${remaining} more` : ""}` : ""}`;
};

const getPayrollApiErrorMessage = (
  error,
  fallback = "Unable to complete the payroll request."
) => {
  if (!error?.response) {
    return "Something went wrong. Please try again.";
  }

  const data = error.response.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  const message =
    data?.message ||
    data?.Message ||
    data?.error ||
    data?.Error ||
    data?.title ||
    data?.Title ||
    data?.detail ||
    data?.Detail;

  if (message) {
    return message;
  }

  return fallback;
};

function parseDateSafely(dateString) {
  if (!dateString) return null;
  if (dateString instanceof Date && !isNaN(dateString.getTime())) return dateString;

  const raw = String(dateString).trim();
  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hour = parseInt(match[4] || "0", 10);
    const minute = parseInt(match[5] || "0", 10);
    const second = parseInt(match[6] || "0", 10);

    const parsed = new Date(year, month, day, hour, minute, second);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(raw);
  return !isNaN(fallback.getTime()) ? fallback : null;
}

function formatCurrency(val, showZero = false) {
  return formatAppCurrency(val, {
    fallback: showZero ? "\u20b90.00" : "-",
    decimals: 2,
    showZero,
  });
}

function getCtcValue(payslip, emp) {
  const ctc = payslip?.ctc ?? emp?.ctc ?? payslip?.annualCTC ?? emp?.annualCTC;
  return ctc != null && ctc !== "" && ctc !== 0 ? Number(ctc) : null;
}

function formatGeneratedDate(dateValue) {
  const parsedDate =
    dateValue instanceof Date ? dateValue : parseDateSafely(dateValue);

  if (!parsedDate) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(parsedDate)
    .replace(/\b(am|pm)\b/i, (match) => match.toUpperCase());
}

function extractPayslipRecords(responseData) {
  const payslipData =
    responseData?.data ||
    responseData?.items ||
    responseData?.records ||
    (Array.isArray(responseData) ? responseData : []);

  return Array.isArray(payslipData) ? payslipData : [];
}

function normalizePayslipRecords(responseData, months) {
  return extractPayslipRecords(responseData)
    .map((p) => {
      const generatedDate =
        p.generated_On || p.generatedOn || p.generatedDate ||
        p.createdOn || p.createdDate || p.generatedAt || p.createdAt;

      const parsedDate = parseDateSafely(generatedDate);
      const normalizedMonth =
        p.month && months.includes(p.month)
          ? p.month
          : parsedDate ? months[parsedDate.getMonth()] : "";

      const normalizedYear =
        p.year && !isNaN(Number(p.year))
          ? Number(p.year)
          : parsedDate ? parsedDate.getFullYear() : "";

      return {
        ...p,
        id: getPayslipId(p),
        netPay: p.netPay || p.netSalary || p.totalNet || (p.ctc ? p.ctc / 12 : 0),
        generatedDate,
        parsedGeneratedDate: parsedDate,
        month: normalizedMonth,
        year: normalizedYear,
        OtherDeductions: p.OtherDeductions ?? p.otherDeductions ?? p.deduction ?? 0
      };
    })
    .sort((a, b) => {
      const dateA = a.parsedGeneratedDate ? a.parsedGeneratedDate.getTime() : 0;
      const dateB = b.parsedGeneratedDate ? b.parsedGeneratedDate.getTime() : 0;
      return dateB - dateA;
    });
}

function Payroll() {
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString("en-US", { month: "long" });
  const currentYearValue = currentDate.getFullYear();

  const [employees, setEmployees] = useState([]);

  const [allPayslips, setAllPayslips] = useState([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [year, setYear] = useState(currentYearValue);
  const [month, setMonth] = useState(currentMonthName);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    completed: 0,
    total: 0,
  });
  const generationLockRef = useRef(false);

  const [generationMode, setGenerationMode] = useState("auto");
  const [deduction, setDeduction] = useState("");
  const [tdsPercentage, setTdsPercentage] = useState("");

  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [recentFilterMonth, setRecentFilterMonth] = useState(currentMonthName);
  const [recentFilterYear, setRecentFilterYear] = useState(String(currentYearValue));

  const [recentPage, setRecentPage] = useState(1);
  const RECENT_ROWS_PER_PAGE = 30;
  const [recentLoading, setRecentLoading] = useState(false);
  const [isSalaryDownloading, setIsSalaryDownloading] = useState(false);
  const [isSendingPayslipEmails, setIsSendingPayslipEmails] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingPayslipId, setDeletingPayslipId] = useState(null);

  const token = getStoredToken();
  const months = PAYROLL_MONTHS;
  const years = PAYROLL_YEARS;

  const [manualForm, setManualForm] = useState({
    totalWorkingDays: "",
    lopDays: "",
    otherDeductions: ""
  });

  const fetchEmployees = useCallback(async (signal) => {
    const timerLabel = "payroll:employees-fetch";

    try {
      // Optimization: time initial payroll employee loading and cancel stale route requests.
      startPerformanceTimer(timerLabel);

      const res = await api.get(API_ENDPOINTS.payroll.employees, {
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });
      const empData = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setEmployees(empData);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") {
        return;
      }

      logPerformanceError("Employees fetch error:", err.response?.data || err.message);
      setErrorMsg("Failed to fetch employees");
    } finally {
      endPerformanceTimer(timerLabel);
    }
  }, [token]);

  const fetchRecentPayslips = useCallback(async (signal, options = {}) => {
    let canceled = false;
    const silent = options.silent === true;
    const clearOnError = options.clearOnError !== false;
    const timerLabel = "payroll:recent-payslips-fetch";

    try {
      setRecentLoading(true);

      startPerformanceTimer(timerLabel);

      const res = await api.get(API_ENDPOINTS.payroll.recent, {
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });

      setAllPayslips(normalizePayslipRecords(res.data, months));
      return true;
    } catch (err) {
      canceled = err?.code === "ERR_CANCELED";

      if (canceled) {
        return null;
      }

      logPerformanceError("Recent payslips fetch error:", err.response?.data || err.message);

      if (!silent) {
        setErrorMsg("Failed to fetch recent payslips");
      }

      if (clearOnError) {
        setAllPayslips([]);
      }

      return false;
    } finally {
      endPerformanceTimer(timerLabel);

      if (!canceled) {
        setRecentLoading(false);
      }
    }
  }, [token, months]);

  const fetchEmployeePayslips = useCallback(async (employeeId, signal, options = {}) => {
    if (!employeeId) {
      return;
    }

    let canceled = false;
    const silent = options.silent === true;
    const clearOnError = options.clearOnError !== false;
    const timerLabel = "payroll:employee-payslips-fetch";

    try {
      setRecentLoading(true);

      startPerformanceTimer(timerLabel);

      const res = await api.get(API_ENDPOINTS.payroll.byEmployee(employeeId), {
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });

      setAllPayslips(normalizePayslipRecords(res.data, months));
    } catch (err) {
      canceled = err?.code === "ERR_CANCELED";

      if (canceled) {
        return;
      }

      logPerformanceError("Employee payslips fetch error:", err.response?.data || err.message);

      if (!silent) {
        setErrorMsg("Failed to fetch employee payslips");
      }

      if (clearOnError) {
        setAllPayslips([]);
      }
    } finally {
      endPerformanceTimer(timerLabel);

      if (!canceled) {
        setRecentLoading(false);
      }
    }
  }, [token, months]);

  useEffect(() => {
    const controller = new AbortController();

    fetchEmployees(controller.signal);
    fetchRecentPayslips(controller.signal);

    return () => controller.abort();
  }, [fetchEmployees, fetchRecentPayslips]);

  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg("");
        setErrorMsg("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  useEffect(() => {
    setRecentPage(1);
  }, [recentFilterMonth, recentFilterYear]);

  useEffect(() => {
    setRecentPage(1);
  }, [selectedEmployees]);

  const filteredEmployees = useMemo(() => {
    const keyword = debouncedSearch.toLowerCase();

    // Optimization: debounce payroll employee filtering for large employee lists.
    return employees.filter((emp) => {
      return (
        (emp.name || "").toLowerCase().includes(keyword) ||
        (emp.employee_Id || "").toLowerCase().includes(keyword)
      );
    });
  }, [employees, debouncedSearch]);

  const employeesById = useMemo(() => {
    // Optimization: avoid repeated employees.find calls while rendering payslip rows.
    return new Map(
      employees.map((emp) => [normalizeEmployeeIdentifier(emp.employee_Id), emp])
    );
  }, [employees]);

  const selectedEmployeeSet = useMemo(
    () => new Set(selectedEmployees.map(normalizeEmployeeIdentifier).filter(Boolean)),
    [selectedEmployees]
  );

  const availableEmployeeIds = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map((emp) => normalizeEmployeeIdentifier(emp.employee_Id))
          .filter(Boolean)
      )
    );
  }, [employees]);

  const availableEmployeeIdSet = useMemo(
    () => new Set(availableEmployeeIds),
    [availableEmployeeIds]
  );

  useEffect(() => {
    if (selectedEmployees.length === 0) {
      return;
    }

    setSelectedEmployees((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const next = prev.filter((employeeId) =>
        availableEmployeeIdSet.has(normalizeEmployeeIdentifier(employeeId))
      );

      if (
        next.length === prev.length &&
        next.every((employeeId, index) =>
          normalizeEmployeeIdentifier(employeeId) === normalizeEmployeeIdentifier(prev[index])
        )
      ) {
        return prev;
      }

      return next;
    });
  }, [availableEmployeeIdSet, selectedEmployees.length]);

  const selectedEmployeeObjects = useMemo(() => {
    return selectedEmployees
      .map((employeeId) => employeesById.get(normalizeEmployeeIdentifier(employeeId)))
      .filter(Boolean);
  }, [employeesById, selectedEmployees]);

  const filteredPayslips = useMemo(() => {
    return allPayslips.filter((p) => {
      const monthMatch = recentFilterMonth === "All" || p.month === recentFilterMonth;
      const yearMatch = recentFilterYear === "All" || String(p.year) === String(recentFilterYear);
      return monthMatch && yearMatch;
    });
  }, [allPayslips, recentFilterMonth, recentFilterYear]);

  const displayedPayslips = useMemo(() => {
    const data = filteredPayslips;

    if (selectedEmployees.length === 1) {
      const selectedEmployeeId = normalizeEmployeeIdentifier(selectedEmployees[0]);
      return data.filter((p) => getPayslipEmployeeKey(p) === selectedEmployeeId);
    }

    if (selectedEmployees.length > 1) {
      return data.filter((p) => selectedEmployeeSet.has(getPayslipEmployeeKey(p)));
    }

    return data;
  }, [filteredPayslips, selectedEmployeeSet, selectedEmployees]);

  const recentTotalCount = displayedPayslips.length;
  const totalRecentPages = Math.max(1, Math.ceil(recentTotalCount / RECENT_ROWS_PER_PAGE));

  const paginatedRecentPayslips = useMemo(() => {
    const startIndex = (recentPage - 1) * RECENT_ROWS_PER_PAGE;
    const endIndex = startIndex + RECENT_ROWS_PER_PAGE;
    return displayedPayslips.slice(startIndex, endIndex);
  }, [displayedPayslips, recentPage]);

  useEffect(() => {
    if (recentPage > totalRecentPages) setRecentPage(totalRecentPages);
  }, [recentPage, totalRecentPages]);

  const handleToggleEmployee = (employeeId) => {
    if (generating) return;
    const selectedEmployeeId = normalizeEmployeeIdentifier(employeeId);
    setSelectedEmployees((prev) => {
      const alreadySelected = prev.includes(selectedEmployeeId);
      let updated = alreadySelected
        ? prev.filter((id) => id !== selectedEmployeeId)
        : [...prev, selectedEmployeeId];
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (generating) return;
    const allAvailableSelected =
      availableEmployeeIds.length > 0 &&
      availableEmployeeIds.every((id) => selectedEmployeeSet.has(id));

    setSelectedEmployees(allAvailableSelected ? [] : availableEmployeeIds);
  };

  const allEmployeesSelected =
    availableEmployeeIds.length > 0 &&
    availableEmployeeIds.every((id) =>
      selectedEmployeeSet.has(normalizeEmployeeIdentifier(id))
    );

  const handleCardClick = (emp) => {
    if (generating) return;
    setSelectedEmployees([normalizeEmployeeIdentifier(emp.employee_Id)]);
  };

  const handleGeneratePayslip = async () => {
    if (generating || generationLockRef.current) {
      return;
    }

    const employeeIds = Array.from(
      new Set(selectedEmployees.map(normalizeEmployeeIdentifier).filter(Boolean))
    );

    if (employeeIds.length === 0) {
      setErrorMsg("Please select employee(s)");
      return;
    }

    const normalizedMonth = String(month ?? "").trim();
    const normalizedYear = Number(year);
    const payrollPeriodLabel = `${normalizedMonth} ${normalizedYear}`;

    if (!isValidPayrollMonth(normalizedMonth) || !isValidPayrollYear(normalizedYear)) {
      setErrorMsg("Please select a valid payroll month and year.");
      return;
    }

    const totalEmployees = employeeIds.length;

    if (generationMode === "auto") {
      const bulkBatches = chunkArray(employeeIds, PAYSLIP_BATCH_SIZE);
      const selectedStandardPeriod =
        STANDARD_PERIODS.includes(Number(selectedPeriod))
          ? Number(selectedPeriod)
          : 1;
      const rollingPeriods = buildRollingPayrollPeriods(
        normalizedMonth,
        normalizedYear,
        selectedStandardPeriod
      );
      const rollingPeriodLabel = formatPayrollPeriodListLabel(rollingPeriods);
      const rollingPeriodCountLabel = formatPayrollPeriodCountLabel(
        rollingPeriods.length
      );
      const bulkRequestMonths = rollingPeriods.map((period) => period.month);
      const totalRequestJobs = bulkBatches.length;
      const failedEmployeeIdSet = new Set();
      const failedItemsByEmployeeId = new Map();
      const failedBatches = [];
      let generatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      let completedRequestJobs = 0;
      const generationStartedAt = performance.now();

      try {
        if (rollingPeriods.length === 0) {
          setErrorMsg("Please select a valid payroll month and year.");
          return;
        }

        generationLockRef.current = true;
        setGenerating(true);
        setSuccessMsg("");
        setErrorMsg("");
        setGenerationProgress({ completed: 0, total: totalRequestJobs });

        logPayrollTiming("[Payroll] Bulk generation started", {
          totalEmployees,
          batchSize: PAYSLIP_BATCH_SIZE,
          batchCount: bulkBatches.length,
          periodCount: rollingPeriods.length,
          selectedPeriod: selectedStandardPeriod,
          month: normalizedMonth,
          year: normalizedYear,
        });

        for (const [batchOffset, batch] of bulkBatches.entries()) {
          const batchIndex = batchOffset + 1;
          const batchStartedAt = performance.now();
          const payload = {
            year: normalizedYear,
            employeeIds: batch,
            months: bulkRequestMonths,
          };

          logBulkBatchStart(
            batchIndex,
            rollingPeriodLabel,
            normalizedMonth,
            normalizedYear,
            payload,
            batch
          );
          logPayrollTiming("[Payroll] Bulk batch started", {
            batchIndex,
            periodCount: rollingPeriods.length,
            periodLabel: rollingPeriodLabel,
            batchSize: batch.length,
            completed: completedRequestJobs,
            totalRequests: totalRequestJobs,
          });

          try {
            console.info(
              `[Payroll] Calling generate-all API for batch ${batchIndex}`,
              {
                periodLabel: rollingPeriodLabel,
                batchSize: batch.length,
                employeeIds: batch,
                months: bulkRequestMonths,
                month: normalizedMonth,
                year: normalizedYear,
              }
            );
            console.log("[Payroll] generate-all FINAL PAYLOAD", payload);

            const response = await api.post(
              API_ENDPOINTS.payroll.generateAll,
              payload,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.info(
              `[Payroll] generate-all API returned for batch ${batchIndex}`,
              {
                periodLabel: rollingPeriodLabel,
                status: response?.status,
                data: response?.data,
              }
            );

            const batchSummary = extractBulkGenerationSummary(response?.data, batch);
            generatedCount += batchSummary.generatedCount;
            skippedCount += batchSummary.skippedCount;
            failedCount += batchSummary.failedCount;

            batchSummary.failedEmployeeIds.forEach((employeeId, index) => {
              const normalizedEmployeeId = normalizeEmployeeIdentifier(employeeId);

              if (!normalizedEmployeeId || failedItemsByEmployeeId.has(normalizedEmployeeId)) {
                return;
              }

              failedEmployeeIdSet.add(normalizedEmployeeId);
              failedItemsByEmployeeId.set(normalizedEmployeeId, {
                label: normalizedEmployeeId,
                message:
                  batchSummary.failureDetails[index] ||
                  batchSummary.message ||
                  `Failed to generate payslip for ${normalizedEmployeeId}.`,
              });
            });

            if (batchSummary.skippedEmployeeIds.length > 0) {
              logPayrollTiming("[Payroll] Bulk batch skipped employees", {
                batchIndex,
                periodLabel: rollingPeriodLabel,
                skippedEmployeeIds: batchSummary.skippedEmployeeIds,
                months: bulkRequestMonths,
              });
            }

            logBulkBatchSuccess(batchIndex, rollingPeriodLabel, batch, response, batchSummary);

            logPayrollTiming("[Payroll] Bulk batch finished", {
              batchIndex,
              periodCount: rollingPeriods.length,
              periodLabel: rollingPeriodLabel,
              batchSize: batch.length,
              durationMs: Math.round(performance.now() - batchStartedAt),
              completed: completedRequestJobs + 1,
              totalRequests: totalRequestJobs,
            });
          } catch (error) {
            const batchSummary = extractBulkGenerationSummary(
              error?.response?.data,
              batch
            );
            const batchFailedEmployeeIds =
              batchSummary.failedEmployeeIds.length > 0
                ? batchSummary.failedEmployeeIds
                : batch.map(normalizeEmployeeIdentifier).filter(Boolean);
            const errorMessage = getPayrollApiErrorMessage(
              error,
              "Failed to generate payslip(s)."
            );
            const batchFailedCount =
              batchSummary.failedCount ||
              batchFailedEmployeeIds.length ||
              batch.length;

            failedCount += batchFailedCount;

            batchFailedEmployeeIds.forEach((employeeId) => {
              const normalizedEmployeeId = normalizeEmployeeIdentifier(employeeId);

              if (!normalizedEmployeeId) {
                return;
              }

              failedEmployeeIdSet.add(normalizedEmployeeId);
            });

            failedBatches.push({
              batchIndex,
              periodLabel: rollingPeriodLabel,
              employeeIds: batchFailedEmployeeIds,
              message: batchSummary.message || errorMessage,
              status: error?.response?.status ?? null,
            });

            logPerformanceError("Bulk payslip generation error:", {
              batchIndex,
              periodLabel: rollingPeriodLabel,
              employeeIds: batchFailedEmployeeIds,
              error: error?.response?.data || error?.message,
            });

            logBulkBatchError(batchIndex, rollingPeriodLabel, batch, error);

            logPayrollTiming("[Payroll] Bulk batch failed", {
              batchIndex,
              periodCount: rollingPeriods.length,
              periodLabel: rollingPeriodLabel,
              batchSize: batch.length,
              durationMs: Math.round(performance.now() - batchStartedAt),
              message: batchSummary.message || errorMessage,
            });
          } finally {
            completedRequestJobs += 1;
            setGenerationProgress({
              completed: Math.min(totalRequestJobs, completedRequestJobs),
              total: totalRequestJobs,
            });
          }
        }

        setRecentPage(1);
        const finalFailedItems = Array.from(failedItemsByEmployeeId.values());
        const finalFailedEmployeeIds = Array.from(failedEmployeeIdSet);
        const totalDurationMs = Math.round(
          performance.now() - generationStartedAt
        );
        const summaryParts = [];

        if (generatedCount > 0) {
          summaryParts.push(`${generatedCount} generated`);
        }

        if (skippedCount > 0) {
          summaryParts.push(`${skippedCount} skipped`);
        }

        if (failedCount > 0) {
          summaryParts.push(`${failedCount} failed`);
        }

        const successMessage = summaryParts.length > 0
          ? `Payslip generation completed for ${totalEmployees} ${totalEmployees === 1 ? "employee" : "employees"} across ${rollingPeriodCountLabel}. (${summaryParts.join(", ")}).`
          : `Payslips generated successfully for ${totalEmployees} ${totalEmployees === 1 ? "employee" : "employees"} across ${rollingPeriodCountLabel}.`;
        const hasSuccessfulWork = generatedCount > 0 || skippedCount > 0;
        const hasFailures = failedCount > 0 || failedBatches.length > 0;
        const failureMessageParts = [];

        if (failedBatches.length > 0) {
          failureMessageParts.push(formatBulkBatchFailureSummary(failedBatches));
        }

        if (finalFailedItems.length > 0) {
          failureMessageParts.push(formatFailureSummary(finalFailedItems));
        }

        const failureMessage =
          failureMessageParts.length > 0
            ? failureMessageParts.join(" | ")
            : "Payslip generation failed. No payslips were generated.";

        logBulkGenerationFinalSummary({
          totalEmployees,
          periodCount: rollingPeriods.length,
          totalRequests: totalRequestJobs,
          generatedCount,
          skippedCount,
          failedCount,
          failedEmployeeIds: finalFailedEmployeeIds,
          failedBatches,
        });

        logPayrollTiming("[Payroll] Bulk generation finished", {
          totalEmployees,
          periodCount: rollingPeriods.length,
          totalRequests: totalRequestJobs,
          generatedCount,
          skippedCount,
          failedCount,
          totalDurationMs,
        });

        if (hasFailures) {
          if (hasSuccessfulWork) {
            setSuccessMsg(successMessage);
          } else {
            setSuccessMsg("");
          }

          setErrorMsg(
            hasSuccessfulWork
              ? failureMessage
              : `Payslip generation failed. No payslips were generated.${
                  failureMessage ? ` ${failureMessage}` : ""
                }`
          );
        } else {
          setSuccessMsg(successMessage);
          setErrorMsg("");
        }

        const refreshSucceeded = await fetchRecentPayslips(undefined, {
          silent: true,
          clearOnError: false,
        });

        if (refreshSucceeded === false) {
          const refreshErrorMessage = "Payslip list refresh failed.";

          if (isDevMode) {
            console.error(`[Payroll] ${refreshErrorMessage}`);
          }

          setErrorMsg((previousErrorMsg) =>
            previousErrorMsg
              ? `${previousErrorMsg} ${refreshErrorMessage}`
              : refreshErrorMessage
          );
        }
      } catch (error) {
        logPerformanceError(
          "Bulk Generate Error:",
          error?.response?.data || error?.message
        );
        setErrorMsg(
          getPayrollApiErrorMessage(
            error,
            "Failed to generate payslip(s)."
          )
        );
      } finally {
        setGenerating(false);
        generationLockRef.current = false;
        setGenerationProgress({ completed: 0, total: 0 });
      }

      return;
    }

    const manualPayloadBase = {
      month: normalizedMonth,
      year: normalizedYear,
      totalWorkingDays: Number(manualForm.totalWorkingDays) || 0,
      lopDays: Number(manualForm.lopDays) || 0,
      otherDeductions: Number(manualForm.otherDeductions) || 0,
    };

    try {
      generationLockRef.current = true;
      setGenerating(true);
      setSuccessMsg("");
      setErrorMsg("");
      setGenerationProgress({ completed: 0, total: totalEmployees });

      let completedEmployees = 0;
      const failedItems = [];
      const generationStartedAt = performance.now();

      const markEmployeeComplete = (failedItem = null) => {
        completedEmployees += 1;
        setGenerationProgress({
          completed: completedEmployees,
          total: totalEmployees,
        });

        if (failedItem) {
          failedItems.push(failedItem);
        }
      };

      const generateManualEmployee = async (employeeId) => {
        const requestStartedAt = performance.now();

        try {
          const payload = {
            employeeId,
            ...manualPayloadBase,
          };

          await api.post(API_ENDPOINTS.payroll.manualGenerate, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          logPayrollTiming("[Payroll] Manual payslip request", {
            employeeId,
            durationMs: Math.round(performance.now() - requestStartedAt),
          });

          return null;
        } catch (error) {
          const errorMessage = getPayrollApiErrorMessage(
            error,
            "Failed to generate payslip."
          );

          logPerformanceError("Manual payslip generation error:", {
            employeeId,
            error: error.response?.data || error.message,
          });

          logPayrollTiming("[Payroll] Manual payslip request failed", {
            employeeId,
            durationMs: Math.round(performance.now() - requestStartedAt),
            message: errorMessage,
          });

          return {
            label: employeeId,
            message: errorMessage,
          };
        }
      };

      logPayrollTiming("[Payroll] Manual generation started", {
        totalEmployees,
        batchSize: PAYSLIP_BATCH_SIZE,
        concurrency: PAYSLIP_CONCURRENCY,
      });

      for (
        let batchStart = 0;
        batchStart < employeeIds.length;
        batchStart += PAYSLIP_BATCH_SIZE
      ) {
        const batchIndex = Math.floor(batchStart / PAYSLIP_BATCH_SIZE) + 1;
        const batch = employeeIds.slice(
          batchStart,
          batchStart + PAYSLIP_BATCH_SIZE
        );
        const batchStartedAt = performance.now();

        logPayrollTiming("[Payroll] Manual batch started", {
          batchIndex,
          batchSize: batch.length,
          completed: completedEmployees,
          totalEmployees,
        });

        await runWithConcurrencyLimit(batch, PAYSLIP_CONCURRENCY, async (employeeId) => {
          let failedItem = null;

          try {
            failedItem = await generateManualEmployee(employeeId);
          } catch (error) {
            logPerformanceError("Manual payslip generation error:", {
              employeeId,
              error: error.response?.data || error.message,
            });

            failedItem = {
              label: employeeId,
              message: getPayrollApiErrorMessage(
                error,
                "Failed to generate payslip."
              ),
            };
          } finally {
            markEmployeeComplete(failedItem);
          }
        });

        logPayrollTiming("[Payroll] Manual batch finished", {
          batchIndex,
          batchSize: batch.length,
          durationMs: Math.round(performance.now() - batchStartedAt),
          completed: completedEmployees,
          totalEmployees,
        });
      }

      setRecentPage(1);
      await fetchRecentPayslips();

      const totalDurationMs = Math.round(
        performance.now() - generationStartedAt
      );
      const failureSummary = formatFailureSummary(failedItems);

      logPayrollTiming("[Payroll] Generation finished", {
        totalEmployees,
        completedEmployees,
        failedCount: failedItems.length,
        totalDurationMs,
      });

      setManualForm({
        totalWorkingDays: "",
        lopDays: "",
        otherDeductions: "",
      });

      if (failedItems.length > 0) {
        setSuccessMsg(
          `Manual payslips generated for ${totalEmployees} employee(s) for ${payrollPeriodLabel}.`
        );
        setErrorMsg(failureSummary);
      } else {
        setSuccessMsg(
          `Manual payslips generated for ${totalEmployees} employee(s) for ${payrollPeriodLabel}.`
        );
      }
    } catch (error) {
      logPerformanceError("Generate Error:", error.response?.data || error.message);
      setErrorMsg(
        getPayrollApiErrorMessage(error, "Failed to generate payslip(s)")
      );
    } finally {
      setGenerating(false);
      generationLockRef.current = false;
      setGenerationProgress({ completed: 0, total: 0 });
    }
  };

  const handleManualInputChange = (e) => {
    if (generating) return;
    const { name, value } = e.target;
    setManualForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDownloadPayslip = async (id) => {
    try {
      const response = await api.get(
        buildApiUrl(API_ENDPOINTS.payroll.download(id)),
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Payslip_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logPerformanceError("Download failed:", error);
    }
  };

  const refreshPayslipsAfterDelete = useCallback(async () => {
    const selectedEmployeeIds = selectedEmployees
      .map(normalizeEmployeeIdentifier)
      .filter(Boolean);

    if (selectedEmployeeIds.length === 1) {
      await fetchEmployeePayslips(
        selectedEmployeeIds[0],
        undefined,
        { silent: true, clearOnError: false }
      );
      return;
    }

    await fetchRecentPayslips(
      undefined,
      { silent: true, clearOnError: false }
    );
  }, [fetchEmployeePayslips, fetchRecentPayslips, selectedEmployees]);

  const handleOpenDeleteModal = (payslip) => {
    if (getPayslipId(payslip) == null || deletingPayslipId) {
      return;
    }

    setSuccessMsg("");
    setErrorMsg("");
    setDeleteTarget(payslip);
  };

  const closeDeleteModal = () => {
    if (deletingPayslipId) {
      return;
    }

    setDeleteTarget(null);
  };

  const handleDeletePayslip = async () => {
    const payslipId = getPayslipId(deleteTarget);

    if (payslipId == null || deletingPayslipId) {
      return;
    }

    try {
      setDeletingPayslipId(payslipId);
      setErrorMsg("");

      await api.delete(API_ENDPOINTS.payroll.delete(payslipId), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAllPayslips((prev) =>
        prev.filter((p) => String(p.id) !== String(payslipId))
      );

      setDeleteTarget(null);
      setSuccessMsg("Payslip deleted successfully.");
      await refreshPayslipsAfterDelete();
    } catch (error) {
      logPerformanceError("Delete payslip error:", error.response?.data || error.message);
      setErrorMsg(
        getPayrollApiErrorMessage(
          error,
          "Unable to delete payslip. Please try again."
        )
      );
    } finally {
      setDeletingPayslipId(null);
    }
  };

  const handleDownloadSalaryRegister = async () => {
    try {
      setIsSalaryDownloading(true);

      const registerMonth =
        recentFilterMonth === "All" ? month : recentFilterMonth;
      const registerYear =
        recentFilterYear === "All" ? year : Number(recentFilterYear);

      const response = await api.get(
        buildApiUrl(API_ENDPOINTS.payroll.salaryRegister),
        {
          params: {
            month: registerMonth,
            year: Number(registerYear)
          },
          responseType: "blob",
          timeout: 120000,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          }
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      );

      const file =
        new File(
          [blob],
          `salary-register-${new Date()
            .toISOString()
            .split("T")[0]}.xlsx`,
          {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );

      const downloadUrl =
        window.URL.createObjectURL(file);

      const link =
        document.createElement("a");

      link.href = downloadUrl;

      link.setAttribute(
        "download",
        file.name
      );

      document.body.appendChild(link);

      link.click();

      setTimeout(() => {

        document.body.removeChild(link);

        window.URL.revokeObjectURL(downloadUrl);

      }, 1000);

      setSuccessMsg(
        "Salary register downloaded successfully."
      );

    } catch (error) {

      logPerformanceError(
        "Salary register download error:",
        error
      );

      setErrorMsg(
        "Failed to download salary register."
      );

    } finally {

      setIsSalaryDownloading(false);

    }
  };

  const handleSendPayslipEmails = async () => {
    if (isSendingPayslipEmails) {
      return;
    }

    try {
      setIsSendingPayslipEmails(true);
      setSuccessMsg("");
      setErrorMsg("");

      const emailMonth =
        recentFilterMonth === "All" ? month : recentFilterMonth;
      const emailYear =
        recentFilterYear === "All" ? year : Number(recentFilterYear);

      const response = await api.post(
        API_ENDPOINTS.payroll.sendAllEmails,
        null,
        {
          params: {
            month: emailMonth,
            year: Number(emailYear),
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const responseData = response?.data;
      const successMessage =
        (typeof responseData === "string" && responseData.trim()) ||
        responseData?.message ||
        responseData?.Message ||
        responseData?.data?.message ||
        "Payslip emails sent successfully.";

      setSuccessMsg(successMessage);
    } catch (error) {
      logPerformanceError(
        "Send payslip emails error:",
        error.response?.data || error.message
      );

      setErrorMsg(
        getPayrollApiErrorMessage(
          error,
          "Failed to send payslip emails."
        )
      );
    } finally {
      setIsSendingPayslipEmails(false);
    }
  };

  const isBulkMode = selectedEmployees.length > 1;
  const previewEmployee = selectedEmployees.length === 1 ? selectedEmployeeObjects[0] : null;
  const generationBadgeText = selectedEmployees.length > 0
    ? `${selectedEmployees.length} Selected`
    : "No Selection";
  const selectionAvatarText = (() => {
    if (selectedEmployees.length === 0) return "ALL";
    if (selectedEmployees.length === 1) {
      return previewEmployee?.name
        ?.split(" ")
        .map((part) => part[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "EE";
    }
    return String(selectedEmployees.length);
  })();
  const selectionTitle = (() => {
    if (selectedEmployees.length === 0) return "All Employees";
    if (selectedEmployees.length === 1) return previewEmployee?.name || "Employee";
    return `${selectedEmployees.length} Employees Selected`;
  })();
  const selectionSubtitle = (() => {
    if (selectedEmployees.length === 0) return "Showing payslips for all employees";
    if (selectedEmployees.length === 1) {
      return [
        previewEmployee?.department || "-",
        `CTC ${formatCurrency(previewEmployee?.ctc, true)}`,
        `Joined ${formatDate(previewEmployee?.joiningDate)}`
      ].join(" | ");
    }
    return "Bulk Generation Mode";
  })();
  const deleteTargetEmployee = deleteTarget
    ? employeesById.get(getPayslipEmployeeKey(deleteTarget))
    : null;
  const deleteTargetEmployeeName =
    deleteTargetEmployee?.name ||
    deleteTarget?.employeeName ||
    deleteTarget?.employeeId ||
    "-";
  const deleteTargetMonth = deleteTarget?.month || "-";
  const deleteTargetYear = deleteTarget?.year || "-";
  const selectedPayrollPeriodCount = STANDARD_PERIODS.includes(Number(selectedPeriod))
    ? Number(selectedPeriod)
    : 1;
  const selectedPayrollPeriodCountLabel =
    formatPayrollPeriodCountLabel(selectedPayrollPeriodCount);
  const generateButtonLabel =
    generationMode === "manual"
      ? selectedEmployees.length === 0
        ? "Select employee(s) to generate"
        : selectedEmployees.length === 1
          ? `Generate Manual for ${previewEmployee?.name || "1 Employee"}`
          : `Generate Manual for ${selectedEmployees.length} Employees`
      : selectedEmployees.length === 0
        ? "Select employee(s) to generate"
        : `Generate ${selectedEmployees.length} ${selectedEmployees.length === 1 ? "Employee" : "Employees"} - ${selectedPayrollPeriodCountLabel}`;

  return (
    <div className="payroll-page">
      {/* LEFT PANEL */}
      <div className={`employee-panel ${generating ? "panel-disabled" : ""}`}>
        <div className="payroll-header">
          <h2>Payroll</h2>
        </div>
        <input
          className="search-box"
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={generating}
        />

        <div className="select-all-row">
              <label className="select-all-label">
                <input
                  type="checkbox"
                  checked={allEmployeesSelected}
                  onChange={handleSelectAll}
                  disabled={generating}
                />
                <span>
                  Select All
                  {availableEmployeeIds.length > 0 ? ` (${availableEmployeeIds.length})` : ""}
                </span>
              </label>
            </div>

        <div className="employee-list">
          {filteredEmployees.map((emp) => {
            const normalizedEmployeeKey = normalizeEmployeeIdentifier(emp.employee_Id);
            const isChecked = selectedEmployeeSet.has(normalizedEmployeeKey);
            const isActive = isChecked && selectedEmployees.length === 1;

            return (
              <div
                key={emp.employee_Id}
                className={`employee-card ${isActive ? "active" : ""} ${generating ? "disabled-card" : ""}`}
                onClick={() => handleCardClick(emp)}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={generating}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggleEmployee(emp.employee_Id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="employee-card-body">
                  <div className="employee-card-name">
                    {emp.name}
                  </div>

                  <p className="employee-card-id">
                    {emp.employee_Id}
                  </p>
                </div>
                <span className="dept">{emp.department}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="payroll-content">
        {generating && (
          <div className="generation-overlay">
            <div className="generation-loader"></div>
            <div className="generation-overlay-copy">
              <p>Generating Payslips for {selectedPayrollPeriodCountLabel}...</p>
              {generationProgress.total > 0 && (
                <span className="generation-progress">
                  {generationProgress.completed} / {generationProgress.total} completed
                </span>
              )}
            </div>
          </div>
        )}

        <div className={`employee-header ${generating ? "panel-disabled" : ""}`}>
          {!isBulkMode ? (
            <>
              <div className={`avatar ${selectedEmployees.length === 0 ? "bulk-avatar" : ""}`}>
                {selectionAvatarText}
              </div>
              <div className="employee-header-info">
                <h3>{selectionTitle}</h3>
                <p className="employee-header-subtitle">{selectionSubtitle}</p>
                <p>
                  {previewEmployee?.employee_Id || "-"} {" • "}
                  {previewEmployee?.department || "-"} {" • "}
                  CTC {formatCurrency(previewEmployee?.ctc, true)} {" • "}
                  Joined {formatDate(previewEmployee?.joiningDate)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="avatar bulk-avatar">{selectedEmployees.length}</div>
              <div className="employee-header-info">
                <h3>{selectionTitle}</h3>
                <p className="employee-header-subtitle">{selectionSubtitle}</p>
                <p>
                  Bulk generation mode •{" "}
                  {selectedEmployeeObjects
                    .slice(0, 3)
                    .map((e) => e.name)
                    .join(", ")}
                  {selectedEmployeeObjects.length > 3
                    ? ` +${selectedEmployeeObjects.length - 3} more`
                    : ""}
                </p>
              </div>
            </>
          )}

          <div className="mode-dropdown-wrapper payroll-filter-wrapper">
            <label>Payslip Mode</label>
            <select
              value={generationMode}
              onChange={(e) => setGenerationMode(e.target.value)}
              className="mode-dropdown payroll-filter-select payroll-mode-select"
              disabled={generating}
            >
              <option value="auto">Auto Payslip</option>
              <option value="manual">Manual Payslip</option>
            </select>
          </div>
        </div>

        {(successMsg || errorMsg) && (
          <div className="payroll-generation-messages">
            {successMsg && <div className="success-message">{successMsg}</div>}
            {errorMsg && <div className="error-message">{errorMsg}</div>}
          </div>
        )}

        {/* AUTO MODE */}
        {generationMode === "auto" && (
          <>
            <div className="ctc-card">
              <div className="payroll-deduction-grid">

                <div className="payroll-input-group">
                  <label>DEDUCTION (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={deduction}
                    onChange={(e) => setDeduction(e.target.value)}
                    placeholder="Enter Deduction"
                    disabled={generating}
                  />
                  <small className="helper-text">
                    Current Deduction: ₹{Number(deduction) || 0}
                  </small>
                </div>

                <div className="payroll-input-group">
                  <label>TDS (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tdsPercentage}
                    onChange={(e) => setTdsPercentage(e.target.value)}
                    placeholder="Enter TDS Percentage"
                    disabled={generating}
                  />
                  <small className="helper-text">
                    Current TDS: {Number(tdsPercentage) || 0}%
                  </small>
                </div>

              </div>
            </div>

            <div className="generate-card">
              <h4>
                Generate Payslip
                <span className="selected-badge">
                  {generationBadgeText}
                </span>
              </h4>

              <div className="period-section payroll-filter-wrapper">
                <div className="standard-periods payroll-filter-group payroll-period-group">
                  <label>STANDARD PERIODS</label>
                  <div className="period-buttons payroll-period-controls">
                    {STANDARD_PERIODS.map((period) => (
                      <button
                        key={period}
                        type="button"
                        disabled={generating}
                        className={`payroll-period-btn ${selectedPeriod === period ? "active-period-btn payroll-period-btn-active" : ""}`}
                        onClick={() => setSelectedPeriod(period)}
                      >
                        {period}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="specific-period payroll-filter-group payroll-period-group">
                  <label>SPECIFIC PERIOD</label>
                  <div className="period-buttons payroll-period-controls">
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      disabled={generating}
                      className="payroll-filter-select payroll-period-select"
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      disabled={generating}
                      className="payroll-filter-select payroll-period-select"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                className="generate-btn"
                onClick={handleGeneratePayslip}
                disabled={generating || selectedEmployees.length === 0}
              >
                {generating ? "Generating..." : generateButtonLabel}
              </button>
            </div>
          </>
        )}

        {/* MANUAL MODE */}
        {generationMode === "manual" && (
          <div className="generate-card">
            <h4>
              Manual Payslip Generation
              <span className="selected-badge">
                {generationBadgeText}
              </span>
            </h4>
            <div className="period-section manual-top-controls payroll-filter-wrapper">
              <div className="specific-period payroll-filter-group payroll-period-group">
                <label>PAYSLIP MONTH</label>
                <div className="period-buttons payroll-period-controls">
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    disabled={generating}
                    className="payroll-filter-select payroll-period-select"
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="specific-period payroll-filter-group payroll-period-group">
                <label>PAYSLIP YEAR</label>
                <div className="period-buttons payroll-period-controls">
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    disabled={generating}
                    className="payroll-filter-select payroll-period-select"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="manual-fields-grid">
              {MANUAL_FIELDS.map(([name, label]) => (
                <div key={name} className="manual-field">
                  <label>{label}</label>
                  <input
                    type="number"
                    min="0"
                    name={name}
                    value={manualForm[name]}
                    onChange={handleManualInputChange}
                    placeholder={`Enter ${label}`}
                    disabled={generating}
                  />
                </div>
              ))}
            </div>

            <button
              className="generate-btn manual-generate-btn"
              onClick={handleGeneratePayslip}
              disabled={generating || selectedEmployees.length === 0}
            >
              {generating ? "Generating..." : generateButtonLabel}
            </button>
          </div>
        )}

        {/* RECENT PAYSLIPS TABLE */}
        <div className="recent-table">
          <div className="recent-table-header">
            <div className="recent-table-title-group">
              <h4>Recently Generated</h4>

              <button
                disabled={isSalaryDownloading}
                onClick={handleDownloadSalaryRegister}
                className="payroll-report-btn"
              >
                {isSalaryDownloading
                  ? "Downloading..."
                  : "Download Monthly Report"}
              </button>

              <button
                disabled={isSendingPayslipEmails}
                onClick={handleSendPayslipEmails}
                className="payroll-report-btn"
              >
                {isSendingPayslipEmails
                  ? "Sending..."
                  : "Send Payslip Emails"}
              </button>
            </div>

            <div className="recent-filters payroll-filter-wrapper">
              <select
                value={recentFilterMonth}
                onChange={(e) => setRecentFilterMonth(e.target.value)}
                disabled={generating || recentLoading}
                className="payroll-filter-select payroll-report-filter-select"
              >
                <option value="All">All Months</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={recentFilterYear}
                onChange={(e) => setRecentFilterYear(e.target.value)}
                disabled={generating || recentLoading}
                className="payroll-filter-select payroll-report-filter-select"
              >
                <option value="All">All Years</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>

            </div>
          </div>

          <div className="payroll-scroll-hint">
            Scroll horizontally to view more payroll details
          </div>

          <div className="table-scroll payroll-table-shell">
            <table className="payroll-table">
              {/* TABLE HEADER */}
              <thead className="payroll-table-head">
                <tr>
                  <th className="payroll-table-header payroll-header-cell payroll-header-cell--left payroll-sticky-column payroll-col-employee">
                    Employee
                  </th>
                  <th className="payroll-table-header payroll-header-cell payroll-header-cell--center payroll-col-department">
                    Department
                  </th>
                  <th className="payroll-table-header payroll-header-cell payroll-header-cell--center payroll-col-period">
                    Period
                  </th>
                  <th className="payroll-table-header payroll-header-cell payroll-header-cell--right payroll-col-netpay">
                    Net Pay
                  </th>
                  <th className="payroll-table-header payroll-header-cell payroll-header-cell--center payroll-col-deduction">
                    Deduction
                  </th>
                  <th className="payroll-table-header payroll-header-cell payroll-header-cell--center payroll-col-ctc">
                    CTC
                  </th>
                  <th className="payroll-table-header payroll-header-cell payroll-header-cell--center payroll-col-generated">
                    Generated
                  </th>
                  <th className="payroll-table-header payroll-header-cell payroll-header-cell--center payroll-col-actions">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody>
                {recentLoading ? (
                  <tr>
                    <td colSpan="8" className="payroll-recent-loading-cell">
                      <div
                        className="payroll-recent-loading-state"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <div
                          className="generation-loader payroll-recent-loading-spinner"
                          aria-hidden="true"
                        />
                        <p>Loading recent payslips...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecentPayslips.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="payroll-empty-state">
                      No Payslips Generated
                    </td>
                  </tr>
                ) : (
                  paginatedRecentPayslips.map((p, index) => {
                    const emp = employeesById.get(getPayslipEmployeeKey(p));
                    const isDeletingRow = deletingPayslipId != null && String(deletingPayslipId) === String(p.id);

                    const ctcValue = getCtcValue(p, emp);

                    return (
                      <tr key={p.id || index} className="payroll-table-row">
                        {/* EMPLOYEE */}
                        <td className="payroll-table-cell payroll-employee-cell payroll-sticky-column payroll-col-employee">
                          <div className="payroll-employee-content">
                            <div className="payroll-employee-name">
                              {emp?.name || p.employeeName || p.employeeId}
                            </div>

                            <div className="payroll-employee-id">
                              {p.employeeId}
                            </div>
                          </div>
                        </td>

                        {/* DEPARTMENT */}
                        <td className="payroll-table-cell payroll-department-cell payroll-col-department">
                          {emp?.department || p.department || "-"}
                        </td>

                        {/* PERIOD */}
                        <td className="payroll-table-cell payroll-period-cell payroll-col-period">
                          {p.month || "-"} {p.year || ""}
                        </td>

                        {/* NET PAY */}
                        <td className="payroll-table-cell payroll-currency-cell payroll-netpay-cell payroll-col-netpay">
                          {formatCurrency(p.netPay, true)}
                        </td>

                        {/* DEDUCTION */}
                        <td className="payroll-table-cell payroll-currency-cell payroll-deduction-cell payroll-col-deduction">
                          {formatCurrency(
                            p.OtherDeductions ??
                            p.otherDeductions ??
                            p.deduction ??
                            0,
                            true
                          )}
                        </td>

                        {/* CTC */}
                        <td className="payroll-table-cell payroll-currency-cell payroll-ctc-cell payroll-col-ctc">
                          {formatCurrency(ctcValue, true)}
                        </td>

                        {/* GENERATED */}
                        <td className="payroll-table-cell payroll-generated-cell payroll-col-generated">
                          {formatGeneratedDate(p.parsedGeneratedDate)}
                        </td>

                        {/* ACTION */}
                        <td className="payroll-table-cell payroll-actions-cell payroll-col-actions">
                          <div className="payroll-actions">
                            <button
                              type="button"
                              className="payroll-action-btn payroll-download-btn"
                              onClick={() => handleDownloadPayslip(p.id)}
                              disabled={isDeletingRow}
                              title="Download Payslip"
                              aria-label={`Download payslip for ${emp?.name || p.employeeName || p.employeeId || "employee"}`}
                            >
                              <FiDownload aria-hidden="true" focusable="false" />
                            </button>
                            <button
                              type="button"
                              className="payroll-action-btn payroll-delete-btn"
                              onClick={() => handleOpenDeleteModal(p)}
                              disabled={isDeletingRow || p.id == null}
                              title={isDeletingRow ? "Deleting Payslip..." : "Delete Payslip"}
                              aria-label={`Delete payslip for ${emp?.name || p.employeeName || p.employeeId || "employee"}`}
                            >
                              {isDeletingRow ? (
                                <FiLoader className="payroll-action-spinner" aria-hidden="true" focusable="false" />
                              ) : (
                                <FiTrash2 aria-hidden="true" focusable="false" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <AppPagination
            totalItems={recentTotalCount}
            currentPage={recentPage}
            onPageChange={setRecentPage}
            itemLabel="payslips"
          />
        </div>

        {deleteTarget && (
          <div
            className="delete-overlay payroll-delete-overlay"
            role="presentation"
            onClick={closeDeleteModal}
          >
            <div
              className="delete-modal payroll-delete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="payroll-delete-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="payroll-delete-header">
                <h3 id="payroll-delete-title" className="payroll-delete-title">
                  Delete Payslip
                </h3>
              </div>

              <div className="payroll-delete-body">
                <p className="payroll-delete-message">
                  Are you sure you want to delete this payslip?
                </p>

                <div className="payroll-delete-summary">
                  <div className="payroll-delete-summary-row">
                    <span className="payroll-delete-summary-label">Employee:</span>
                    <span className="payroll-delete-summary-value">{deleteTargetEmployeeName}</span>
                  </div>
                  <div className="payroll-delete-summary-row">
                    <span className="payroll-delete-summary-label">Month:</span>
                    <span className="payroll-delete-summary-value">{deleteTargetMonth}</span>
                  </div>
                  <div className="payroll-delete-summary-row">
                    <span className="payroll-delete-summary-label">Year:</span>
                    <span className="payroll-delete-summary-value">{deleteTargetYear}</span>
                  </div>
                </div>

                <p className="payroll-delete-warning">
                  This action cannot be undone.
                </p>

                {errorMsg ? (
                  <div className="payroll-delete-error" role="alert">
                    {errorMsg}
                  </div>
                ) : null}
              </div>

              <div className="delete-actions payroll-delete-actions">
                <button
                  type="button"
                  className="delete-cancel-btn"
                  onClick={closeDeleteModal}
                  disabled={Boolean(deletingPayslipId)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="delete-confirm-btn payroll-delete-confirm-btn"
                  onClick={handleDeletePayslip}
                  disabled={Boolean(deletingPayslipId)}
                >
                  {deletingPayslipId ? (
                    <>
                      <FiLoader className="payroll-action-spinner" aria-hidden="true" focusable="false" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Payslip"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Payroll;

