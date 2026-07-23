import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { TableSkeleton } from "../components/Skeletons";

const PAYROLL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PAYROLL_YEARS = Array.from({ length: 10 }, (_, i) => 2022 + i);
const STANDARD_PERIODS = [1, 3, 6, 12];
const MANUAL_FIELDS = [
  ["totalWorkingDays", "Total Working Days"],
  ["lopDays", "LOP Days"],
  ["otherDeductions", "Other Deductions"]
];

const getEmployeeKey = (value) => String(value ?? "");
const getPayslipEmployeeKey = (payslip) =>
  getEmployeeKey(
    payslip?.employeeId ??
    payslip?.employee_Id ??
    payslip?.employeeID ??
    payslip?.employee_id
  );

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

  const [generationMode, setGenerationMode] = useState("auto");
  const [deduction, setDeduction] = useState("");

  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [recentFilterMonth, setRecentFilterMonth] = useState(currentMonthName);
  const [recentFilterYear, setRecentFilterYear] = useState(String(currentYearValue));

  const [recentPage, setRecentPage] = useState(1);
  const RECENT_ROWS_PER_PAGE = 30;
  const [recentLoading, setRecentLoading] = useState(false);
  const [isSalaryDownloading, setIsSalaryDownloading] = useState(false);
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
      if (!silent) {
        setRecentLoading(true);
      }

      startPerformanceTimer(timerLabel);

      const res = await api.get(API_ENDPOINTS.payroll.recent, {
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });

      setAllPayslips(normalizePayslipRecords(res.data, months));
    } catch (err) {
      canceled = err?.code === "ERR_CANCELED";

      if (canceled) {
        return;
      }

      logPerformanceError("Recent payslips fetch error:", err.response?.data || err.message);

      if (!silent) {
        setErrorMsg("Failed to fetch recent payslips");
      }

      if (clearOnError) {
        setAllPayslips([]);
      }
    } finally {
      endPerformanceTimer(timerLabel);

      if (!canceled && !silent) {
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
      if (!silent) {
        setRecentLoading(true);
      }

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

      if (!canceled && !silent) {
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

  const getMonthYearList = (count, selectedMonth, selectedYear) => {
    const selectedMonthIndex = months.findIndex((m) => m === selectedMonth);
    const result = [];

    for (let i = 0; i < count; i++) {
      let monthIndex = selectedMonthIndex - i;
      let currentYear = Number(selectedYear);
      while (monthIndex < 0) {
        monthIndex += 12;
        currentYear -= 1;
      }
      result.push({ month: months[monthIndex], year: currentYear });
    }
    return result;
  };

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
    return new Map(employees.map((emp) => [getEmployeeKey(emp.employee_Id), emp]));
  }, [employees]);

  const selectedEmployeeSet = useMemo(
    () => new Set(selectedEmployees.map(getEmployeeKey)),
    [selectedEmployees]
  );

  const selectedEmployeeObjects = useMemo(() => {
    return selectedEmployees
      .map((employeeId) => employeesById.get(getEmployeeKey(employeeId)))
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
      const selectedEmployeeId = getEmployeeKey(selectedEmployees[0]);
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
    const selectedEmployeeId = getEmployeeKey(employeeId);
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
    const visibleIds = filteredEmployees.map((emp) => getEmployeeKey(emp.employee_Id));
    const visibleIdSet = new Set(visibleIds);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedEmployeeSet.has(id));

    const updated = allVisibleSelected
      ? selectedEmployees.filter((id) => !visibleIdSet.has(id))
      : [...new Set([...selectedEmployees, ...visibleIds])];

    setSelectedEmployees(updated);
  };

  const allFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((emp) => selectedEmployeeSet.has(getEmployeeKey(emp.employee_Id)));

  const handleCardClick = (emp) => {
    if (generating) return;
    setSelectedEmployees([getEmployeeKey(emp.employee_Id)]);
  };

  const handleGeneratePayslip = async () => {
    if (generating) return;

    const employeeIds = selectedEmployees;

    if (employeeIds.length === 0) {
      setErrorMsg("Please select employee(s)");
      return;
    }

    try {
      setGenerating(true);
      setSuccessMsg("");
      setErrorMsg("");

      if (generationMode === "auto") {
        const periods = getMonthYearList(selectedPeriod, month, year);
        const deductionValue = Number(deduction) || 0;

        for (const employeeId of employeeIds) {
          for (const period of periods) {
            await api.post(API_ENDPOINTS.payroll.generate, null, {
              params: {
                employeeId,
                year: period.year,
                month: period.month,
                OtherDeductions: deductionValue
              },
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        }
        setSuccessMsg(`Payslips generated for ${employeeIds.length} employee(s) for ${selectedPeriod} month(s)`);
      } else {
        for (const employeeId of employeeIds) {
          const payload = {
            employeeId,
            month,
            year: Number(year),
            totalWorkingDays: Number(manualForm.totalWorkingDays) || 0,
            lopDays: Number(manualForm.lopDays) || 0,
            otherDeductions: Number(manualForm.otherDeductions) || 0
          };

          await api.post(API_ENDPOINTS.payroll.manualGenerate, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
        }
        setSuccessMsg(`Manual payslips generated for ${employeeIds.length} employee(s)`);
        setManualForm({ totalWorkingDays: "", lopDays: "", otherDeductions: "" });
      }

      setRecentPage(1);
      await fetchRecentPayslips();
    } catch (err) {
      logPerformanceError("Generate Error:", err.response?.data || err.message);
      setErrorMsg(err.response?.data?.message || "Failed to generate payslip(s)");
    } finally {
      setGenerating(false);
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
    const selectedEmployeeIds = selectedEmployees.map(getEmployeeKey).filter(Boolean);

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
    if (payslip?.id == null || deletingPayslipId) {
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
    const payslipId = deleteTarget?.id;

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
      setErrorMsg("Unable to delete payslip. Please try again.");
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
  const generateButtonLabel =
    generationMode === "manual"
      ? selectedEmployees.length === 0
        ? "Select employee(s) to generate"
        : selectedEmployees.length === 1
          ? `Generate Manual for ${previewEmployee?.name || "1 Employee"}`
          : `Generate Manual for ${selectedEmployees.length} Employees`
      : selectedEmployees.length === 0
        ? "Select employee(s) to generate"
        : selectedEmployees.length === 1
          ? `Generate for ${previewEmployee?.name || "1 Employee"} - ${selectedPeriod} Month(s)`
          : `Generate for ${selectedEmployees.length} Employees - ${selectedPeriod} Month(s)`;

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
              checked={allFilteredSelected}
              onChange={handleSelectAll}
              disabled={generating}
            />
            <span>
              Select All
              {filteredEmployees.length > 0 ? ` (${filteredEmployees.length})` : ""}
            </span>
          </label>
        </div>

        <div className="employee-list">
          {filteredEmployees.map((emp) => {
            const employeeKey = getEmployeeKey(emp.employee_Id);
            const isChecked = selectedEmployeeSet.has(employeeKey);
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
              <p>Generating payslip(s)... Please wait</p>
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
            <div className={errorMsg ? "error-message" : "success-message"}>
              {successMsg || errorMsg}
            </div>
          )}

          {/* AUTO MODE */}
          {generationMode === "auto" && (
            <>
              <div className="ctc-card">
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
                  <label>MONTH</label>
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
                  <label>YEAR</label>
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
                      <td colSpan="8" className="payroll-skeleton-cell">
                        <TableSkeleton
                          rows={6}
                          columns={[
                            { width: "260px", type: "avatar", headerWidth: "58%" },
                            { width: "150px", headerWidth: "54%" },
                            { width: "140px", headerWidth: "54%" },
                            { width: "150px", headerWidth: "58%" },
                            { width: "150px", headerWidth: "56%" },
                            { width: "150px", headerWidth: "56%" },
                            { width: "220px", headerWidth: "58%" },
                            { width: "120px", type: "actions", headerWidth: "54%" },
                          ]}
                        />
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

