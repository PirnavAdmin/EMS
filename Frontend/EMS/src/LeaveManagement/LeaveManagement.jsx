import React, { useState, useEffect, useRef } from "react";
import "./LeaveManagement.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildApiUrl } from "../api/endpoints";
import AppPagination from "../components/AppPagination";
import { toast } from "../components/common/Toast/toastService";
import { TableSkeleton } from "../components/Skeletons";
import { extractCollection, sortByRecency } from "../utils/collections";
import { formatDate, isDateRangeValid, parseDate } from "../utils/date";
import { FaChevronDown, FaFilter } from "react-icons/fa";
import {
  getAllLeaveRequests,
  getWfhRequests,
  updateLeaveStatus,
  updateWfhStatus,
} from "../services/leaveService";

function LeaveManagement() {
  const [filter, setFilter] = useState("All");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [leaveData, setLeaveData] = useState([]);
  const [actionLoading, setActionLoading] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeBalanceCache, setEmployeeBalanceCache] = useState({});
  const [employeeBalanceLoading, setEmployeeBalanceLoading] = useState("");
  const [employeeHistoryLoading, setEmployeeHistoryLoading] = useState(false);
  const [wfhData, setWfhData] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ NEW: Search state
  const ROWS_PER_PAGE = 5;
  const FILTER_OPTIONS = [
  "All",
  "Pending",
  "Approved",
  "Rejected",
  "Leave",
  "WFH"];

  const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

  const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

  const getValue = (record, keys) =>
  firstDefined(...keys.map((key) => record?.[key]));

  const normalizeStatusToken = (value) =>
  String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[\s_-]+/g, "");

  const isPendingStatus = (status) =>
  normalizeStatusToken(status) === "pending";

  const isApprovedStatus = (status) => {
    const normalized = normalizeStatusToken(status);

    return (
      normalized.startsWith("approved") ||
      normalized.startsWith("approveas")
    );
  };

  const isRejectedStatus = (status) => {
    const normalized = normalizeStatusToken(status);

    return (
      normalized.startsWith("rejected") ||
      normalized.startsWith("reject")
    );
  };

  const isCancelledStatus = (status) => {
    const normalized = normalizeStatusToken(status);

    return (
      normalized.startsWith("cancelled") ||
      normalized.startsWith("canceled") ||
      normalized.startsWith("cancel")
    );
  };

  const getStatusGroup = (status) => {
    if (isPendingStatus(status)) {
      return "pending";
    }

    if (isApprovedStatus(status)) {
      return "approved";
    }

    if (isRejectedStatus(status)) {
      return "rejected";
    }

    if (isCancelledStatus(status)) {
      return "cancelled";
    }

    return normalizeStatusToken(status);
  };

  const formatStatusLabel = (status) => {
    const rawValue = String(status ?? "").trim();
    const normalized = normalizeStatusToken(status);

    if (!normalized) {
      return "Pending";
    }

    if (isApprovedStatus(status)) {
      const approverMatch = rawValue.match(/\bby\s+(.+)$/i);
      const approver = approverMatch?.[1]?.trim();
      const isWfhApproval =
      normalized.includes("wfh") ||
      /\bwfh\b/i.test(rawValue);

      if (approver) {
        return isWfhApproval ?
        `Approved As WFH By ${approver}` :
        `Approved By ${approver}`;
      }

      if (isWfhApproval) {
        return "Approved As WFH";
      }

      return "Approved";
    }

    if (isRejectedStatus(status)) {
      const approverMatch = rawValue.match(/\bby\s+(.+)$/i);
      const approver = approverMatch?.[1]?.trim();

      if (approver) {
        return `Rejected By ${approver}`;
      }

      return "Rejected";
    }

    if (isCancelledStatus(status)) {
      return "Cancelled";
    }

    if (isPendingStatus(status)) {
      return "Pending";
    }

    return rawValue || "Pending";
  };

  const isFinalApprovalStatus = (status) => {
    return !isPendingStatus(status);
  };

  const normalizeLeaveBalanceCards = (payload) => {
    const data = payload?.data || payload || {};
    const types = [
      ["Annual Leave", ["annualLeave", "AnnualLeave", "annual"]],
      ["Casual Leave", ["casualLeave", "CasualLeave", "casual"]],
      ["Medical Leave", ["medicalLeave", "MedicalLeave", "medical"]],
      ["Sick Leave", ["sickLeave", "SickLeave", "sick"]],
      ["Comp Off", ["compOff", "CompOff", "compensatoryOff"]],
      ["LOP", ["lop", "LOP", "lossOfPay"]],
      ["Remaining Leave", ["remainingLeave", "RemainingLeave", "remaining"]],
      ["Total Leave", ["totalLeave", "TotalLeave", "total"]],
      ["Consumed Leave", ["consumedLeave", "ConsumedLeave", "used"]]
    ];

    return types.map(([label, keys]) => {
      const value = firstDefined(...keys.map((key) => data[key]), 0);
      const displayValue =
        typeof value === "object"
          ? firstDefined(
              value.remaining,
              value.Remaining,
              value.balance,
              value.Balance,
              value.total,
              value.Total,
              0
            )
          : value;

      return { label, value: displayValue };
    });
  };

  const resolveEmployeeLookupCandidates = (leave = {}) => {
    const candidates = [
      leave.employeeId,
      leave.EmployeeId,
      leave.employeeCode,
      leave.EmployeeCode,
      leave.employee_Id,
      leave.employee_id,
      leave.userId,
      leave.user_Id,
      leave.employee?.userId,
      leave.employee?.user_Id,
      leave.employee?.employeeId,
      leave.employee?.EmployeeId,
      leave.employee?.employeeCode,
      leave.employee?.EmployeeCode,
      leave.employee?.employee_Id,
      leave.employee?.employee_id,
      leave.employee?.id,
      leave.id
    ];

    return [...new Set(candidates.map((value) => String(value ?? "").trim()).filter(Boolean))];
  };

  const logLeaveRequest = (label, endpoint, employeeId) => {
    console.log(`${label} API URL`, buildApiUrl(endpoint));
    console.log(`${label} API METHOD`, "GET");
    console.log(`${label} EMPLOYEE ID`, employeeId);
  };

  const fetchLeaveResourceWithFallback = async ({
    label,
    candidates,
    endpointForCandidate,
    config
  }) => {
    let lastError = null;

    for (const candidate of candidates) {
      const endpoint = endpointForCandidate(candidate);

      logLeaveRequest(label, endpoint, candidate);

      try {
        const response = await api.get(endpoint, config);

        console.log(`${label} API RESPONSE`, {
          status: response.status,
          data: response.data
        });

        return {
          candidate,
          response
        };
      } catch (error) {
        console.log(`${label} API ERROR`, {
          status: error?.response?.status,
          data: error?.response?.data
        });

        lastError = error;

        if (error?.response?.status !== 404) {
          throw error;
        }
      }
    }

    throw lastError || new Error(`${label} request failed`);
  };

  const normalizeText = (value) =>
  String(value ?? "").trim().toLowerCase();

  const normalizeLeaveType = (value) => {
    const normalized = normalizeText(value).
    replace(/\((.*?)\)/g, "$1").
    replace(/[^a-z0-9]+/g, " ").
    replace(/\bleave\b/g, "").
    trim();

    if (["lop", "loss of pay"].includes(normalized)) {
      return "loss of pay";
    }

    return normalized;
  };

  const normalizeRequestRecord = (item, requestType, index) => {
    const leaveType = requestType === "WFH" ?
    firstDefined(
      getValue(item, ["leaveType", "LeaveType", "requestType", "RequestType"]),
      "Work From Home"
    ) :
    getValue(item, ["leaveType", "LeaveType", "type", "Type"]);

    return {
      ...item,
      id: getValue(item, ["id", "Id", "leaveId", "LeaveId", "wfhId", "WfhId", "WFHId"]) ?? `${requestType}-${index}`,
      employeeId: getValue(item, ["employeeId", "EmployeeId", "empId", "EmpId", "employeeCode", "EmployeeCode"]),
      employeeName: getValue(item, ["employeeName", "EmployeeName", "empName", "EmpName", "name", "Name"]),
      leaveType,
      fromDate: getValue(item, ["fromDate", "FromDate", "startDate", "StartDate"]),
      toDate: getValue(item, ["toDate", "ToDate", "endDate", "EndDate"]),
      reason: getValue(item, ["reason", "Reason", "description", "Description"]),
      status: getValue(item, ["status", "Status"]) || "Pending",
      appliedDate: getValue(item, ["appliedDate", "AppliedDate", "createdAt", "CreatedAt", "createdOn", "CreatedOn"]),
      approvedDate: getValue(item, ["approvedDate", "ApprovedDate", "updatedAt", "UpdatedAt", "updatedOn", "UpdatedOn"]),
      requestType
    };
  };

  /* ================= FETCH LEAVES ================= */
  const fetchLeaves = async () => {
    try {
      const res = await getAllLeaveRequests({
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = extractCollection(res.data);

      setLeaveData(sortByRecency(data));
      return data;
    } catch (err) {

      return [];
    }
  };

  const fetchWFH = async () => {
    try {
      const res = await getWfhRequests(
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      const data = extractCollection(res.data);

      setWfhData(sortByRecency(data));
      return data;

    } catch (err) {

      return [];
    }
  };

  useEffect(() => {
    const fetchAllRequests = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchLeaves(), fetchWFH()]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllRequests();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const openEmployeeHistory = async (leave) => {
    try {
      setEmployeeHistoryLoading(true);
      const displayEmployeeId = String(leave.employeeId || "").trim();
      const employeeCandidates = resolveEmployeeLookupCandidates(leave);
      const authConfig = {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      };

      setEmployeeBalanceLoading(displayEmployeeId);

      let leaveBalance = employeeBalanceCache[displayEmployeeId];

      if (!leaveBalance) {
        try {
          const balanceResult = await fetchLeaveResourceWithFallback({
            label: "LEAVE BALANCE",
            candidates: employeeCandidates,
            endpointForCandidate: (candidate) =>
              API_ENDPOINTS.leaveBalance.byEmployee(candidate),
            config: authConfig
          });

          leaveBalance = normalizeLeaveBalanceCards(balanceResult.response.data);

          setEmployeeBalanceCache((current) => ({
            ...current,
            [displayEmployeeId]: leaveBalance
          }));
        } catch (balanceError) {
          leaveBalance = employeeBalanceCache[displayEmployeeId] || [];
        }
      }

      let apiData = null;
      let history = [];
      try {
        const detailsResult = await fetchLeaveResourceWithFallback({
          label: "LEAVE DETAILS",
          candidates: employeeCandidates,
          endpointForCandidate: (candidate) =>
            API_ENDPOINTS.leave.employeeLeaveDetails(candidate),
          config: authConfig
        });

        apiData = detailsResult.response.data;
        history = apiData.leaveHistory || apiData.history || [];
      } catch (detailsError) {
        const normalizedDisplayEmployeeId = normalizeText(displayEmployeeId);
        history = combinedData.filter((item) =>
          normalizeText(item.employeeId) === normalizedDisplayEmployeeId
        );
        apiData = {
          totalLeavesApplied: history.length,
          leaveHistory: history
        };
      }

      setSelectedEmployee({
        employeeId: displayEmployeeId,
        employeeName: leave.employeeName,
        leaveBalance,

        totalLeavesApplied:
        apiData?.totalLeavesApplied || history.length || 0,

        // leaveBalances: {
        //   casual:
        //     apiData.leaveBalance?.casual ||
        //     apiData.leaveBalance?.Casual ||
        //     {},

        //   sick:
        //     apiData.leaveBalance?.sick ||
        //     apiData.leaveBalance?.Sick ||
        //     {},

        //   earned:
        //     apiData.leaveBalance?.earned ||
        //     apiData.leaveBalance?.Earned ||
        //     {}
        // },

        history
      });

    } catch (error) {

      setSelectedEmployee({
        employeeId: String(leave.employeeId || "").trim(),
        employeeName: leave.employeeName,
        leaveBalance: employeeBalanceCache[String(leave.employeeId || "").trim()] || [],
        history: []
      });

    } finally {
      setEmployeeHistoryLoading(false);
      setEmployeeBalanceLoading("");
    }
  };

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (
  leaveId,
  status) =>
  {

    const requestStatus = String(status ?? "").trim();

    try {

      setActionLoading(
        `${leaveId}-${requestStatus}`
      );

      await updateLeaveStatus(
        leaveId,
        null,
        {
          params: { status },
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      await Promise.all([
        fetchLeaves(),
        fetchWFH()
      ]);

      if (
      selectedLeave?.id === leaveId)
      {

        setSelectedLeave((prev) => ({
          ...prev,
          status: requestStatus
        }));

      }

      toast.success(
        requestStatus === "Reject" ?
        "Leave request rejected successfully." :
        "Leave request updated successfully."
      );

      return true;

    } catch (error) {

      toast.error(
        error?.response?.data?.message ||
        error?.response?.data ||
        "Unable to update leave request."
      );

      return false;

    } finally {

      setActionLoading("");

    }
  };

  const updateWFHStatus = async (
  id,
  status) =>
  {

    const requestStatus = String(status ?? "").trim();

    try {

      setActionLoading(`${id}-${requestStatus}`);

      await updateWfhStatus(
        id,
        null,
        {
          params: { status: requestStatus },
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      await Promise.all([
        fetchLeaves(),
        fetchWFH()
      ]);

      toast.success(
        requestStatus === "Reject" ?
        "Work From Home request rejected successfully." :
        "Work From Home request updated successfully."
      );

      return true;

    } catch (err) {

      toast.error(
        err?.response?.data?.message ||
        err?.response?.data ||
        "Unable to update Work From Home request."
      );

      return false;

    } finally {

      setActionLoading("");

    }
  };

  const getApprovalOptions = (requestType) =>
  requestType === "WFH" ?
  [
    { label: "Approve as Work From Home", status: "ApproveAsWFH" },
    { label: "Approve as Leave", status: "ApproveAsLeave" },
    { label: "Reject", status: "Reject" }
  ] :
  [
    { label: "Approve as Leave", status: "ApproveAsLeave" },
    { label: "Approve as Work From Home", status: "ApproveAsWFH" },
    { label: "Reject", status: "Reject" }
  ];

  const handleApprovalAction = async (request, status) => {
    if (!request?.id || !status || isFinalApprovalStatus(request.status)) {
      return;
    }

    const result =
    request.requestType === "WFH" ?
    await updateWFHStatus(request.id, status) :
    await updateStatus(request.id, status);

    if (result) {
      setPendingApproval(null);
    }
  };

  /* ================= UTIL ================= */
  const calculateDays = (from, to) => {
    if (!isDateRangeValid(from, to)) {
      return 0;
    }

    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    return Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
  };

  const truncateStatus = (text, maxLength = 20) => {
    const value = String(text ?? "Pending");

    if (value.length <= maxLength) {
      return {
        display: value,
        title: value
      };
    }

    return {
      display: `${value.slice(0, maxLength)}...`,
      title: value
    };
  };

  const combinedData = [
  ...(leaveData || []).map((item, index) =>
  normalizeRequestRecord(item, "Leave", index)
  ),

  ...(wfhData || []).map((item, index) =>
  normalizeRequestRecord(item, "WFH", index)
  )];

  const filteredLeaves = combinedData.filter((item) => {
    const itemStatus = normalizeStatusToken(item.status);
    const itemLeaveType = normalizeLeaveType(item.leaveType);

    let matchesFilter = true;

    if (filter === "Leave") {
      matchesFilter = item.requestType === "Leave";
    } else if (filter === "WFH") {
      matchesFilter = item.requestType === "WFH";
    } else if (filter === "Pending") {
      matchesFilter = itemStatus === "pending";
    } else if (filter === "Approved") {
      matchesFilter =
      itemStatus.includes("approved") ||
      itemStatus.startsWith("approveas");
    } else if (filter === "Rejected") {
      matchesFilter =
      itemStatus.includes("reject");
    }

    if (!matchesFilter) {
      return false;
    }

    const normalizedSearch = normalizeText(searchQuery);

    if (!normalizedSearch) {
      return true;
    }

    return [
    item.employeeName,
    item.employeeId,
    item.leaveType,
    item.reason,
    formatStatusLabel(item.status),
    item.requestType].
    some((value) => normalizeText(value).includes(normalizedSearch));
  });
  const totalPages = Math.ceil(
    filteredLeaves.length / ROWS_PER_PAGE
  );

  const startIndex =
  (currentPage - 1) * ROWS_PER_PAGE;

  const paginatedLeaves =
  filteredLeaves.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="leave-page">
        <div className="leave-header">
          <div>
            <h2>Leave Management</h2>
            <p>Manage employee leave requests</p>
          </div>
        </div>

        <div className="leave-filter-tabs" aria-label="Leave request filters">
          {FILTER_OPTIONS.map((tab) =>
          <button
            key={tab}
            type="button"
            className={filter === tab ? "leave-filter-tab is-active" : "leave-filter-tab"}
            aria-pressed={filter === tab}
            disabled>
            
              {tab}
            </button>
          )}
        </div>

        <TableSkeleton
          rows={10}
          columns={[
          { width: "140px", headerWidth: "58%" },
          { width: "minmax(180px, 1.2fr)", headerWidth: "62%" },
          { width: "minmax(160px, 1.1fr)", headerWidth: "60%" },
          { width: "180px", headerWidth: "60%" },
          { width: "70px", type: "status", headerWidth: "54%" },
          { width: "180px", headerWidth: "58%" },
          { width: "120px", type: "status", headerWidth: "54%" },
          { width: "160px", type: "actions", headerWidth: "54%" }]
          } />
        
      </div>);

  }

  return (
    <div className="leave-page">
      {/* HEADER */}
      <div className="leave-header">
        <div>
          <h2>Leave Management</h2>
          <p>Manage employee leave requests</p>
        </div>
      </div>

      {/* ✅ NEW: SEARCH BAR */}
      <div className="leave-toolbar" aria-label="Leave search and filters">
        <div className="search-bar-container">
        <input
            type="text"
            placeholder="Search by name, ID, type, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input" />
          
        {searchQuery &&
          <button
            className="clear-search-btn"
            onClick={() => setSearchQuery("")}>
            
            ✕
          </button>
          }
        </div>

        {/* FILTERS */}
        <div className="leave-filter-tabs" aria-label="Leave request filters">
        {FILTER_OPTIONS.map((tab) =>
          <button
            key={tab}
            type="button"
            className={filter === tab ? "leave-filter-tab is-active" : "leave-filter-tab"}
            onClick={() => setFilter(tab)}
            aria-pressed={filter === tab}>
            
            {tab}
          </button>
          )}
        </div>

      </div>

      {/* TABLE */}
      <div className="leave-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>LEAVE TYPE</th>
                <th>DURATION</th>
                <th>DAYS</th>
                <th>REASON</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredLeaves.length === 0 ?
              <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    {searchQuery ? "No matching records found" : "No leave records found"}
                  </td>
                </tr> :

              paginatedLeaves.map((leave) => {
                const days = calculateDays(leave.fromDate, leave.toDate);
                const isFinalRequest = isFinalApprovalStatus(leave.status);
                const isRowActionLoading = actionLoading.startsWith(`${leave.id}-`);
                const isRowActionDisabled = isFinalRequest || isRowActionLoading;
                const reasonText = String(leave.reason ?? "").trim();
                const reasonTitle = reasonText || "No reason provided";

                return (
                  <tr
                    key={`${leave.requestType}-${leave.id}`}>
                    

                      <td className="leave-employee-cell">
                        <div className="leave-employee-content">
                          <span
                            className="employee-name-link leave-employee-name"
                            onClick={() => openEmployeeHistory(leave)}>
                            {leave.employeeName || "-"}
                          </span>
                          <span className="leave-employee-id">
                            {leave.employeeId || "-"}
                          </span>
                        </div>
                      </td>

                      <td>{leave.leaveType || "-"}</td>

                      <td>
                        {formatDate(leave.fromDate)} — {formatDate(leave.toDate)}
                      </td>

                      <td className="center">{days}</td>

                      {/* ✅ FIXED: Short reason in table */}
                      <td
                      className="leave-reason-cell"
                      onClick={() => setSelectedLeave(leave)}
                      title={reasonTitle}>
                        <span className="leave-reason-text">
                          {reasonText || "-"}
                        </span>
                      </td>

                      <td>
                          {(() => {
                            const statusValue = leave.status || "Pending";
                            const { display, title } = truncateStatus(
                              formatStatusLabel(statusValue),
                              20
                            );

                            return (
                              <span
                                className={`status ${getStatusGroup(statusValue)}`}
                                title={title}>
                                {display}
                              </span>
                            );
                          })()}
                      </td>

                      <td
                      className="action-cell"
                      onClick={(e) => e.stopPropagation()}>
                      
                        <button
                        className="approve-btn"
                        onClick={() => !isRowActionDisabled && setPendingApproval(leave)}
                        disabled={isRowActionDisabled}>
                        
                          {isRowActionLoading ?
                        "Processing..." :
                        "Approve"}
                        </button>

                        <button
                        className="reject-btn"
                        onClick={() =>
                        !isRowActionDisabled &&
                        (leave.requestType === "WFH" ?
                        updateWFHStatus(
                          leave.id,
                          "Reject"
                        ) :
                        updateStatus(
                          leave.id,
                          "Reject"
                        ))
                        }
                        disabled={isRowActionDisabled}>
                        
                          {actionLoading ===
                        `${leave.id}-Reject` ?
                        "Rejecting..." :
                        "Reject"}
                        </button>
                      </td>
                    </tr>);

              })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <AppPagination
        totalItems={filteredLeaves.length}
        currentPage={currentPage}
        pageSize={ROWS_PER_PAGE}
        onPageChange={setCurrentPage}
        itemLabel="leave requests" />
      

      {/* APPROVAL MODAL */}

      {pendingApproval &&
      (() => {
        const isProcessing = actionLoading.startsWith(`${pendingApproval.id}-`);
        const isFinalRequest = isFinalApprovalStatus(pendingApproval.status);
        const isActionDisabled = isProcessing || isFinalRequest;
        const approvalOptions = getApprovalOptions(pendingApproval.requestType)
        .filter((option) => option.status !== "Reject");

        return (
          <div className="leave-details-overlay" role="presentation">
            <div className="leave-details-container leave-approval-container" role="dialog" aria-modal="true" aria-labelledby="leave-approval-title">
              <button
                type="button"
                className="leave-details-close-icon"
                onClick={() => !isProcessing && setPendingApproval(null)}
                disabled={isProcessing}
                aria-label="Close approval dialog">
                ×
              </button>

              <h3 className="leave-details-title" id="leave-approval-title">
                {pendingApproval.requestType === "WFH" ? "Work From Home Approval" : "Leave Approval"}
              </h3>

              <div className="leave-details-row">
                <span className="leave-details-label">Employee</span>
                <span className="leave-details-value">{pendingApproval.employeeName || "-"}</span>
              </div>

              <div className="leave-details-row">
                <span className="leave-details-label">Employee ID</span>
                <span className="leave-details-value">{pendingApproval.employeeId || "-"}</span>
              </div>

              <div className="leave-details-row">
                <span className="leave-details-label">Request Type</span>
                <span className="leave-details-value">
                  {pendingApproval.requestType === "WFH" ? "Work From Home" : "Leave"}
                </span>
              </div>

              <div className="leave-details-row">
                <span className="leave-details-label">From Date</span>
                <span className="leave-details-value">{formatDate(pendingApproval.fromDate)}</span>
              </div>

              <div className="leave-details-row">
                <span className="leave-details-label">To Date</span>
                <span className="leave-details-value">{formatDate(pendingApproval.toDate)}</span>
              </div>

              <div className="leave-details-reason">
                <span className="leave-details-label">Reason</span>
                <div className="leave-details-reason-text">
                  {pendingApproval.reason || "-"}
                </div>
              </div>

              <div className="leave-approval-actions">
                {approvalOptions.map((option) => {
                  const isCurrentOptionLoading = actionLoading === `${pendingApproval.id}-${option.status}`;

                  return (
                    <button
                      key={option.status}
                      type="button"
                      className={option.status === "Reject" ? "reject-btn" : "approve-btn"}
                      onClick={() => !isActionDisabled && handleApprovalAction(pendingApproval, option.status)}
                      disabled={isActionDisabled}>
                      {isCurrentOptionLoading ? "Processing..." : option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* DETAILS MODAL */}
      {selectedLeave &&
      <div className="leave-details-overlay">
          <div className="leave-details-container">

            <button
            className="leave-details-close-icon"
            onClick={() => setSelectedLeave(null)}>
            
              ×
            </button>
            <h3 className="leave-details-title">Leave Details</h3>

            <div className="leave-details-row">
              <span className="leave-details-label">Emp ID</span>
              <span className="leave-details-value">
                {selectedLeave.employeeId}
              </span>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Name</span>
              <span className="leave-details-value">
                {selectedLeave.employeeName}
              </span>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Type</span>
              <span className="leave-details-value">
                {selectedLeave.leaveType}
              </span>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Duration</span>
              <span className="leave-details-value">
                {formatDate(selectedLeave.fromDate)} —{" "}
                {formatDate(selectedLeave.toDate)}
              </span>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Days</span>
              <span className="leave-details-value">
                {calculateDays(selectedLeave.fromDate, selectedLeave.toDate)}
              </span>
            </div>

            {/* ✅ FULL reason stays in popup */}
            <div className="leave-details-reason">
              <span className="leave-details-label">Reason</span>

              <div className="leave-details-reason-text">
                {selectedLeave.reason || "-"}
              </div>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Applied Date</span>
              <span className="leave-details-value">
                {selectedLeave.appliedDate ?
              formatDate(selectedLeave.appliedDate) :
              "-"}
              </span>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Approved Date</span>
              <span className="leave-details-value">
                {selectedLeave.approvedDate ?
              formatDate(selectedLeave.approvedDate) :
              "-"}
              </span>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Status</span>
              <span
              className={`leave-details-value leave-status-${getStatusGroup(selectedLeave.status)}`}>
              
                {formatStatusLabel(selectedLeave.status)}
              </span>
            </div>

            <div className="leave-details-footer">
              <button
              className="leave-details-close-btn"
              onClick={() => setSelectedLeave(null)}>
              
                Close
              </button>
            </div>
          </div>


        </div>
      }
      {/* -----------History modal----------- */}
      {selectedEmployee &&
      <div className="employee-history-overlay">
          <div className="employee-history-modal">

            <button
            className="history-close-icon"
            onClick={() => setSelectedEmployee(null)}>
            
              ×
            </button>

            <div className="history-header">

              <div className="history-avatar">
                {selectedEmployee.employeeName?.charAt(0)?.toUpperCase()}
              </div>

              <div>
                <h2>{selectedEmployee.employeeName}</h2>
                <p>Emp ID: {selectedEmployee.employeeId}</p>
              </div>

            </div>

            {/* LEAVE BALANCE
            <div className="leave-balance-section">
             <h4>LEAVE BALANCE</h4>
               <div className="leave-balance-grid">
                 <div className="balance-card">
                 <div className="balance-header">
                   <span>Casual</span>
                   <span>
                     {selectedEmployee?.leaveBalances?.casual?.used || 0}/
                     {selectedEmployee?.leaveBalances?.casual?.total || 0}
                   </span>
                 </div>
                   <div className="progress-bar">
                   <div
                     className="progress-fill"
                     style={{
                       width: `${Math.min(
                         (
                           (selectedEmployee?.leaveBalances?.casual?.used || 0) /
                           (selectedEmployee?.leaveBalances?.casual?.total || 1)
                         ) * 100,
                         100
                       )}%`
                     }}
                   />
                 </div>
                   <p>
                   {selectedEmployee?.leaveBalances?.casual?.remaining || 0} remaining
                 </p>
               </div>
                 <div className="balance-card">
                 <div className="balance-header">
                   <span>Sick</span>
                   <span>
                     {selectedEmployee?.leaveBalances?.sick?.used || 0}/
                     {selectedEmployee?.leaveBalances?.sick?.total || 0}
                   </span>
                 </div>
                   <div className="progress-bar">
                   <div
                     className="progress-fill"
                     style={{
                       width: `${Math.min(
                         (
                           (selectedEmployee?.leaveBalances?.sick?.used || 0) /
                           (selectedEmployee?.leaveBalances?.sick?.total || 1)
                         ) * 100,
                         100
                       )}%`
                     }}
                   />
                 </div>
                   <p>
                   {selectedEmployee?.leaveBalances?.sick?.remaining || 0} remaining
                 </p>
               </div>
                 <div className="balance-card">
                 <div className="balance-header">
                   <span>Earned</span>
                   <span>
                     {selectedEmployee?.leaveBalances?.earned?.used || 0}/
                     {selectedEmployee?.leaveBalances?.earned?.total || 0}
                   </span>
                 </div>
                   <div className="progress-bar">
                   <div
                     className="progress-fill"
                     style={{
                       width: `${Math.min(
                         (
                           (selectedEmployee?.leaveBalances?.earned?.used || 0) /
                           (selectedEmployee?.leaveBalances?.earned?.total || 1)
                         ) * 100,
                         100
                       )}%`
                     }}
                   />
                 </div>
                   <p>
                   {selectedEmployee?.leaveBalances?.earned?.remaining || 0} remaining
                 </p>
               </div>
               </div>
            </div> */

          }

            {/* SUMMARY CARDS */}
            <div className="leave-summary-grid">

              <div className="summary-card applied">
                <h2>{selectedEmployee.totalLeavesApplied || 0}</h2>
                <span>Applied</span>
              </div>

              <div className="summary-card approved">
                <h2>
                  {
                selectedEmployee.history.filter(
                  (x) => getStatusGroup(x.status) === "approved"
                ).length
                }
                </h2>
                <span>Approved</span>
              </div>

              <div className="summary-card rejected">
                <h2>
                  {
                selectedEmployee.history.filter(
                  (x) => getStatusGroup(x.status) === "rejected"
                ).length
                }
                </h2>
                <span>Rejected</span>
              </div>

              <div className="summary-card pending">
                <h2>
                  {
                selectedEmployee.history.filter(
                  (x) => getStatusGroup(x.status) === "pending"
                ).length
                }
                </h2>
                <span>Pending</span>
              </div>

            </div>

            <div className="history-section-title">
              FULL HISTORY
            </div>

            {employeeHistoryLoading ?

          <div className="history-loading">
                Loading leave history...
              </div> :

          <div className="history-table-wrapper">

                <table className="history-table">
                  <thead>
                    <tr>
                      <th>APPLIED</th>
                      <th>TYPE</th>
                      <th>DAYS</th>
                      <th>DURATION</th>
                      <th>REASON</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedEmployee.history.map((item) => {
                      const reasonValue = String(item.reason ?? "");
                      const reasonText = reasonValue.trim();

                      return (
                <tr key={`${item.requestType}-${item.id}`}>
                        <td>{formatDate(item.createdAt)}</td>

                        <td>{item.leaveType}</td>

                        <td>
                          {formatDate(item.fromDate)} — {formatDate(item.toDate)}
                        </td>

                        <td>
                          {calculateDays(
                      item.fromDate,
                      item.toDate
                    )}
                        </td>

                        <td
                        className="history-reason-cell"
                        title={reasonText ? reasonValue : undefined}>
                          <span className="history-reason-text">
                            {reasonText || "-"}
                          </span>
                        </td>

                        <td>
                          <span className={`history-status ${getStatusGroup(item.status)}`}>
                            {formatStatusLabel(item.status)}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          }

            <div className="history-footer">
              <button
              className="history-close-btn"
              onClick={() => setSelectedEmployee(null)}>
              
                Close
              </button>
            </div>

          </div>
        </div>
      }
    </div>);

}

export default LeaveManagement;

