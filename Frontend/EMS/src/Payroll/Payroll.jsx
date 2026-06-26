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
import { FaDownload } from "react-icons/fa6";
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

function Payroll() {
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString("en-US", { month: "long" });
  const currentYearValue = currentDate.getFullYear();

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);

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

  const token = getStoredToken();
  const months = PAYROLL_MONTHS;
  const years = PAYROLL_YEARS;

  const [manualForm, setManualForm] = useState({
    totalWorkingDays: "",
    lopDays: "",
    otherDeductions: ""
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchEmployees(controller.signal);
    fetchRecentPayslips(controller.signal);

    return () => controller.abort();
  }, []);

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

  const parseDateSafely = (dateString) => {
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
  };

  const fetchEmployees = async (signal) => {
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
      if (empData.length > 0) setSelectedEmp(empData[0]);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") {
        return;
      }

      logPerformanceError("Employees fetch error:", err.response?.data || err.message);
      setErrorMsg("Failed to fetch employees");
    } finally {
      endPerformanceTimer(timerLabel);
    }
  };

  const fetchRecentPayslips = useCallback(async (signal) => {
    let canceled = false;
    const timerLabel = "payroll:recent-payslips-fetch";

    try {
      setRecentLoading(true);
      startPerformanceTimer(timerLabel);

      const res = await api.get(API_ENDPOINTS.payroll.recent, {
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });

      const responseData = res.data;
      const payslipData =
        responseData?.data ||
        responseData?.items ||
        responseData?.records ||
        (Array.isArray(responseData) ? responseData : []);

      const normalized = payslipData
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

      setAllPayslips(normalized);
    } catch (err) {
      canceled = err?.code === "ERR_CANCELED";

      if (canceled) {
        return;
      }

      logPerformanceError("Recent payslips fetch error:", err.response?.data || err.message);
      setErrorMsg("Failed to fetch recent payslips");
      setAllPayslips([]);
    } finally {
      endPerformanceTimer(timerLabel);

      if (!canceled) {
        setRecentLoading(false);
      }
    }
  }, [token]);

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
    return new Map(employees.map((emp) => [emp.employee_Id, emp]));
  }, [employees]);

  const selectedEmployeeSet = useMemo(
    () => new Set(selectedEmployees),
    [selectedEmployees]
  );

  const selectedEmployeeObjects = useMemo(() => {
    return selectedEmployees
      .map((employeeId) => employeesById.get(employeeId))
      .filter(Boolean);
  }, [employeesById, selectedEmployees]);

  const filteredPayslips = useMemo(() => {
    return allPayslips.filter((p) => {
      const monthMatch = recentFilterMonth === "All" || p.month === recentFilterMonth;
      const yearMatch = recentFilterYear === "All" || String(p.year) === String(recentFilterYear);
      return monthMatch && yearMatch;
    });
  }, [allPayslips, recentFilterMonth, recentFilterYear]);

  const recentTotalCount = filteredPayslips.length;
  const totalRecentPages = Math.max(1, Math.ceil(recentTotalCount / RECENT_ROWS_PER_PAGE));

  const paginatedRecentPayslips = useMemo(() => {
    const startIndex = (recentPage - 1) * RECENT_ROWS_PER_PAGE;
    const endIndex = startIndex + RECENT_ROWS_PER_PAGE;
    return filteredPayslips.slice(startIndex, endIndex);
  }, [filteredPayslips, recentPage]);

  useEffect(() => {
    if (recentPage > totalRecentPages) setRecentPage(totalRecentPages);
  }, [recentPage, totalRecentPages]);

  const handleToggleEmployee = (employeeId) => {
    if (generating) return;
    setSelectedEmployees((prev) => {
      const alreadySelected = prev.includes(employeeId);
      let updated = alreadySelected
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId];

      if (updated.length === 1) {
        const onlyEmp = employeesById.get(updated[0]);
        setSelectedEmp(onlyEmp || null);
      } else {
        setSelectedEmp(null);
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (generating) return;
    const visibleIds = filteredEmployees.map((emp) => emp.employee_Id);
    const visibleIdSet = new Set(visibleIds);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedEmployeeSet.has(id));

    const updated = allVisibleSelected
      ? selectedEmployees.filter((id) => !visibleIdSet.has(id))
      : [...new Set([...selectedEmployees, ...visibleIds])];

    setSelectedEmployees(updated);
    if (updated.length === 1) {
      const onlyEmp = employeesById.get(updated[0]);
      setSelectedEmp(onlyEmp || null);
    } else {
      setSelectedEmp(null);
    }
  };

  const allFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((emp) => selectedEmployeeSet.has(emp.employee_Id));

  const handleCardClick = (emp) => {
    if (generating) return;
    setSelectedEmp(emp);
  };

  const handleGeneratePayslip = async () => {
    if (generating) return;

    const employeeIds =
      selectedEmployees.length > 0
        ? selectedEmployees
        : selectedEmp ? [selectedEmp.employee_Id] : [];

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
  const previewEmployee =
    selectedEmployees.length === 1 ? selectedEmployeeObjects[0] : selectedEmp;

  const getCtcValue = (payslip, emp) => {
    const ctc = payslip?.ctc ?? emp?.ctc ?? payslip?.annualCTC ?? emp?.annualCTC;
    return ctc != null && ctc !== "" && ctc !== 0 ? Number(ctc) : null;
  };

  const formatCurrency = (val, showZero = false) => {
    return formatAppCurrency(val, {
      fallback: showZero ? "\u20b90.00" : "-",
      decimals: 2,
      showZero,
    });
  };

  const tableColumnWidths = {
    employee: "240px",
    department: "150px",
    period: "130px",
    netPay: "140px",
    deduction: "130px",
    ctc: "140px",
    generated: "190px",
    actions: "80px"
  };

  const numericPaddingRight = "20px";

  const baseTableCellStyle = {
    padding: "14px",
    fontSize: "14px",
    borderBottom: "1px solid var(--bg-muted)",
    verticalAlign: "middle",
    color: "var(--text-strong)",
    boxSizing: "border-box",
    lineHeight: 1.5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  };

  const baseTableHeaderStyle = {
    ...baseTableCellStyle,
    paddingBottom: "16px",
    borderBottom: "2px solid var(--border-soft)"
  };

  const getTableCellStyle = (width, align = "left", extraStyles = {}) => ({
    ...baseTableCellStyle,
    width,
    minWidth: width,
    maxWidth: width,
    textAlign: align,
    paddingRight: align === "right" ? numericPaddingRight : "14px",
    paddingLeft: "14px",
    ...extraStyles
  });

  const getTableHeaderStyle = (width, align = "left", extraStyles = {}) => ({
    ...baseTableHeaderStyle,
    width,
    minWidth: width,
    maxWidth: width,
    textAlign: align,
    paddingRight: align === "right" ? numericPaddingRight : "14px",
    paddingLeft: "14px",
    ...extraStyles
  });

  const numericValueStyle = {
    display: "block",
    width: "100%",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum" 1, "lnum" 1',
    whiteSpace: "nowrap"
  };

  const renderNumericValue = (value) => (
    <span style={numericValueStyle}>{formatCurrency(value)}</span>
  );

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
            const isChecked = selectedEmployeeSet.has(emp.employee_Id);
            const isActive =
              selectedEmp?.employee_Id === emp.employee_Id ||
              (selectedEmployees.length === 1 && isChecked);

            return (
              <div
                key={emp.employee_Id}
                className={`employee-card ${isActive ? "active" : ""} ${generating ? "disabled-card" : ""}`}
                style={{
                  padding: "8px 10px",
                  minHeight: "52px",
                  border: isActive
                    ? "2px solid var(--theme-info)"
                    : "1px solid var(--border-soft)",
                  borderRadius: "10px",
                  marginBottom: "2px",
                  background: "var(--bg-page)"
                }}
                onClick={() => handleCardClick(emp)}
              >
                <div className="employee-left">
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
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: "2px",
                      lineHeight: "1"
                    }}
                  >
                    <div
                      style={{
                        margin: "0",
                        padding: "0",
                        lineHeight: "1.3",
                        fontSize: "14px",
                        fontWeight: "400"
                      }}
                    >
                      {emp.name}
                    </div>

                    <p
                      style={{
                        margin: "0",
                        marginTop: "2px",
                        padding: "0",
                        lineHeight: "1",
                        fontSize: "12px",
                        color: "var(--text-muted)"
                      }}
                    >
                      {emp.employee_Id}
                    </p>
                  </div>
                </div>
                <span className="dept">{emp.department}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      {(selectedEmp || selectedEmployees.length > 0) && (
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
                <div className="avatar">
                  {previewEmployee?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div className="employee-header-info">
                  <h3>{previewEmployee?.name || "Employee"}</h3>
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
                  <h3>{selectedEmployees.length} Employees Selected</h3>
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

            <div className="mode-dropdown-wrapper">
              <label>Payslip Mode</label>
              <select
                value={generationMode}
                onChange={(e) => setGenerationMode(e.target.value)}
                className="mode-dropdown"
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
                    {selectedEmployees.length > 0
                      ? `${selectedEmployees.length} Selected`
                      : "Single Employee"}
                  </span>
                </h4>

                <div className="period-section">
                  <div className="standard-periods">
                    <label>STANDARD PERIODS</label>
                    <div className="period-buttons">
                      {STANDARD_PERIODS.map((period) => (
                        <button
                          key={period}
                          type="button"
                          disabled={generating}
                          className={selectedPeriod === period ? "active-period-btn" : ""}
                          onClick={() => setSelectedPeriod(period)}
                        >
                          {period}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="specific-period">
                    <label>SPECIFIC PERIOD</label>
                    <div className="period-buttons">
                      <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        disabled={generating}
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
                  disabled={generating}
                >
                  {generating
                    ? "Generating..."
                    : selectedEmployees.length > 0
                      ? `Generate for ${selectedEmployees.length} Employee(s) - ${selectedPeriod} Month(s)`
                      : `Generate ${selectedPeriod > 1 ? `${selectedPeriod} Months` : `${month}`} Payslip`}
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
                  {selectedEmployees.length > 0
                    ? `${selectedEmployees.length} Selected`
                    : "Single Employee"}
                </span>
              </h4>
              <div className="period-section manual-top-controls">
                <div className="specific-period">
                  <label>MONTH</label>
                  <div className="period-buttons">
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      disabled={generating}
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="specific-period">
                  <label>YEAR</label>
                  <div className="period-buttons">
                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      disabled={generating}
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
                className="generate-btn"
                onClick={handleGeneratePayslip}
                disabled={generating}
                style={{ marginTop: "20px" }}
              >
                {generating
                  ? "Generating..."
                  : selectedEmployees.length > 0
                    ? `Generate Manual for ${selectedEmployees.length} Employee(s)`
                    : "Generate Manual Payslip"}
              </button>
            </div>
          )}

          {/* RECENT PAYSLIPS TABLE */}
          <div className="recent-table">
            <div className="recent-table-header">

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}
              >
                <h4>Recently Generated</h4>

                <button
                  disabled={isSalaryDownloading}
                  onClick={handleDownloadSalaryRegister}
                  style={{
                    border: "1px solid var(--surface-info-soft)",
                    background: "var(--surface-info-soft)",
                    color: "var(--theme-info)",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "0.2s ease",
                    opacity: isSalaryDownloading ? 0.7 : 1
                  }}
                >
                  {isSalaryDownloading
                    ? "Downloading..."
                    : "Download Monthly Report"}
                </button>
              </div>

              <div className="recent-filters">
                <select
                  value={recentFilterMonth}
                  onChange={(e) => setRecentFilterMonth(e.target.value)}
                  disabled={generating || recentLoading}
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

            <div
              style={{
                width: "100%",
                padding: "6px 15px",
                marginBottom: "14px",
                border: "1px solid var(--surface-info-soft)",
                borderRadius: "16px",
                background: "var(--surface-info-soft)",
                color: "var(--theme-info-strong)",
                fontSize: "13px",
                fontWeight: "450",
                textAlign: "center",
                boxSizing: "border-box",
              }}
            >
              ← Scroll horizontally to view more payroll details →
            </div>

            <div
              className="table-scroll"
              style={{
                overflowX: "auto",
                border: "1px solid var(--border-soft)",
                borderRadius: "12px",
                background: "var(--bg-page)",
                position: "relative"
              }}
            >
              <table
                className="payroll-table"
                style={{
                  width: "100%",
                  minWidth: "1100px",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  tableLayout: "fixed"
                }}
              >
                {/* TABLE HEADER */}
                <thead
                  style={{
                    background: "var(--bg-muted)"
                  }}
                >
                  <tr>
                    {[
                      ["Employee", "left", "240px"],
                      ["Department", "left", "110px"],
                      ["Period", "center", "80px"],
                      ["Net Pay", "center", "150px"],
                      ["Deduction", "right", "110px"],
                      ["CTC", "right", "130px"],
                      ["Generated", "center", "180px"],
                      ["Actions", "center", "110px"]
                    ].map(([title, align, width]) => (
                      <th
                        key={title}
                        style={{
                          position: title === "Employee" ? "sticky" : "static",
                          left: title === "Employee" ? 0 : "auto",
                          zIndex: title === "Employee" ? 20 : 1,
                          width,
                          minWidth: width,
                          maxWidth: width,
                          padding: "12px 0px",
                          paddingLeft:
                            title === "Net Pay"
                              ? "35px"
                              : title === "Employee"
                                ? "20px"
                                : "0px",
                          textAlign: align,
                          verticalAlign: "middle",
                          borderBottom: "1px solid var(--border-soft)",
                          whiteSpace: "nowrap",
                          background: "var(--bg-muted)",
                          height: "48px",
                          lineHeight: "20px"
                        }}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* TABLE BODY */}
                <tbody>
                  {recentLoading ? (
                    <tr>
                      <td colSpan="8" style={{ padding: "0" }}>
                        <TableSkeleton
                          rows={6}
                          columns={[
                            { width: "240px", type: "avatar", headerWidth: "58%" },
                            { width: "110px", headerWidth: "54%" },
                            { width: "80px", headerWidth: "54%" },
                            { width: "150px", headerWidth: "58%" },
                            { width: "110px", headerWidth: "56%" },
                            { width: "130px", headerWidth: "56%" },
                            { width: "180px", headerWidth: "58%" },
                            { width: "110px", type: "actions", headerWidth: "54%" },
                          ]}
                        />
                      </td>
                    </tr>
                  ) : paginatedRecentPayslips.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        style={{
                          padding: "45px",
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "15px"
                        }}
                      >
                        No Payslips Generated
                      </td>
                    </tr>
                  ) : (
                    paginatedRecentPayslips.map((p, index) => {
                      const emp = employeesById.get(p.employeeId);

                      const ctcValue = getCtcValue(p, emp);

                      return (
                        <tr
                          key={p.id || index}
                          style={{
                            background: "var(--bg-page)",
                            transition: "0.2s ease",
                            height: "50px"
                          }}
                        >
                          {/* EMPLOYEE */}
                          <td
                            style={{
                              padding: "0px 8px",
                              borderBottom: "1px solid var(--bg-muted)",
                              verticalAlign: "middle",
                              position: "sticky",
                              left: 0,
                              zIndex: 10,
                              background: "var(--bg-page)",
                              boxShadow: "6px 0 10px var(--shadow-color-xs)"
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                color: "var(--text-strong)",
                                fontSize: "13px",
                                marginBottom: "1px",
                                lineHeight: "16px"
                              }}
                            >
                              {emp?.name || p.employeeName || p.employeeId}
                            </div>

                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                lineHeight: "14px"
                              }}
                            >
                              {p.employeeId}
                            </div>
                          </td>

                          {/* DEPARTMENT */}
                          <td
                            style={{
                              padding: "10px 25px",
                              borderBottom: "1px solid var(--bg-muted)",
                              color: "var(--text-strong)",
                              verticalAlign: "middle",
                              fontSize: "13px",
                              lineHeight: "16px"
                            }}
                          >
                            {emp?.department || p.department || "-"}
                          </td>

                          {/* PERIOD */}
                          <td
                            style={{
                              padding: "4px 10px",
                              borderBottom: "1px solid var(--bg-muted)",
                              textAlign: "center",
                              color: "var(--text-strong)",
                              verticalAlign: "middle",
                              whiteSpace: "nowrap",
                              fontSize: "13px",
                              lineHeight: "16px"
                            }}
                          >
                            {p.month || "-"} {p.year || ""}
                          </td>

                          {/* NET PAY */}
                          <td
                            style={{
                              padding: "4px 25px 4px 10px",
                              borderBottom: "1px solid var(--bg-muted)",
                              textAlign: "right",
                              verticalAlign: "middle",
                              fontWeight: 700,
                              color: "var(--success)",
                              fontSize: "13px",
                              fontVariantNumeric: "tabular-nums",
                              whiteSpace: "nowrap",
                              lineHeight: "16px"
                            }}
                          >
                            {formatCurrency(p.netPay, true)}
                          </td>

                          {/* DEDUCTION */}
                          <td
                            style={{
                              padding: "4px 14px 4px 10px",
                              borderBottom: "1px solid var(--bg-muted)",
                              textAlign: "right",
                              verticalAlign: "middle",
                              color: "var(--theme-danger)",
                              fontSize: "13px",
                              fontVariantNumeric: "tabular-nums",
                              whiteSpace: "nowrap",
                              lineHeight: "16px"
                            }}
                          >
                            {formatCurrency(
                              p.OtherDeductions ??
                              p.otherDeductions ??
                              p.deduction ??
                              0,
                              true
                            )}
                          </td>

                          {/* CTC */}
                          <td
                            style={{
                              padding: "4px 14px 4px 10px",
                              borderBottom: "1px solid var(--bg-muted)",
                              textAlign: "right",
                              verticalAlign: "middle",
                              fontWeight: 700,
                              color: "var(--text-strong)",
                              fontSize: "13px",
                              fontVariantNumeric: "tabular-nums",
                              whiteSpace: "nowrap",
                              lineHeight: "16px"
                            }}
                          >
                            {formatCurrency(ctcValue, true)}
                          </td>

                          {/* GENERATED */}
                          <td
                            style={{
                              padding: "4px 10px",
                              borderBottom: "1px solid var(--bg-muted)",
                              textAlign: "center",
                              verticalAlign: "middle",
                              color: "var(--text-body)",
                              fontSize: "12px",
                              lineHeight: "16px"
                            }}
                          >
                            {p.parsedGeneratedDate
                              ? p.parsedGeneratedDate.toLocaleString(
                                "en-IN",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: true
                                }
                              )
                              : "-"}
                          </td>

                          {/* ACTION */}
                          <td
                            style={{
                              padding: "4px 10px",
                              borderBottom: "1px solid var(--bg-muted)",
                              textAlign: "center",
                              verticalAlign: "middle"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center"
                              }}
                            >
                              <FaDownload
                                className="download-icon"
                                onClick={() => handleDownloadPayslip(p.id)}
                                title="Download Payslip"
                                style={{
                                  cursor: "pointer",
                                  fontSize: "15px",
                                  color: "var(--theme-info)"
                                }}
                              />
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
        </div>
      )}
    </div>
  );
}

export default Payroll;
