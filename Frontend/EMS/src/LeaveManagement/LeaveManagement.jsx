import React, { useState, useEffect, useRef } from "react";
import "./LeaveManagement.css";
import AppPagination from "../components/AppPagination";
import { TableSkeleton } from "../components/Skeletons";
import { extractCollection, sortByRecency } from "../utils/collections";
import { formatDate, isDateRangeValid, parseDate } from "../utils/date";
import { FaChevronDown, FaFilter } from "react-icons/fa";
import {
  getAllLeaveRequests,
  getEmployeeLeaveDetails,
  getLeaveBalanceByEmployee,
  getWfhRequests,
  updateLeaveStatus,
  updateWfhStatus,
} from "../services/leaveService";

function LeaveManagement() {
  const [filter, setFilter] = useState("All");
  const [selectedLeave, setSelectedLeave] = useState(null);
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
      setEmployeeBalanceLoading(String(leave.employeeId));

      let leaveBalance = employeeBalanceCache[leave.employeeId];

      if (!leaveBalance) {
        try {
          const balanceResponse = await getLeaveBalanceByEmployee(
            leave.employeeId,
            {
              headers: {
                Authorization: `Bearer ${getToken()}`
              }
            }
          );

          leaveBalance = normalizeLeaveBalanceCards(balanceResponse.data);
          setEmployeeBalanceCache((current) => ({
            ...current,
            [leave.employeeId]: leaveBalance
          }));
        } catch (balanceError) {

          leaveBalance = [];
        }
      }

      const response = await getEmployeeLeaveDetails(
        leave.employeeId,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      const apiData = response.data;

      setSelectedEmployee({
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        leaveBalance,

        totalLeavesApplied:
        apiData.totalLeavesApplied || 0,

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

        history:
        apiData.leaveHistory || []
      });

    } catch (error) {

      setSelectedEmployee({
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        leaveBalance: employeeBalanceCache[leave.employeeId] || [],
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

    try {

      setActionLoading(
        `${leaveId}-${status}`
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

      await fetchLeaves();

      if (
      selectedLeave?.id === leaveId)
      {

        setSelectedLeave((prev) => ({
          ...prev,
          status
        }));

      }

    } catch (error) {

    } finally {

      setActionLoading("");

    }
  };

  const updateWFHStatus = async (
  id,
  status) =>
  {

    try {

      setActionLoading(`${id}-${status}`);

      await updateWfhStatus(
        id,
        null,
        {
          params: { status },
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      await fetchWFH();

    } catch (err) {

    } finally {

      setActionLoading("");

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

  // ✅ NEW: Short reason for table
  const truncateReason = (text, maxLength = 15) => {
    if (!text) return "-";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const combinedData = [
  ...(leaveData || []).map((item, index) =>
  normalizeRequestRecord(item, "Leave", index)
  ),

  ...(wfhData || []).map((item, index) =>
  normalizeRequestRecord(item, "WFH", index)
  )];

  const filteredLeaves = combinedData.filter((item) => {
    const itemStatus = normalizeText(item.status);
    const itemLeaveType = normalizeLeaveType(item.leaveType);

    let matchesFilter = true;

    if (filter === "Leave") {
      matchesFilter = item.requestType === "Leave";
    } else if (filter === "WFH") {
      matchesFilter = item.requestType === "WFH";
    } else if (filter === "Pending") {
      matchesFilter = itemStatus === "pending";
    } else if (filter === "Approved") {
      matchesFilter = itemStatus.includes("approved");
    } else if (filter === "Rejected") {
      matchesFilter = itemStatus.includes("rejected");
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
    item.status,
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
                <th>EMP ID</th>
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
                  <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                    {searchQuery ? "No matching records found" : "No leave records found"}
                  </td>
                </tr> :

              paginatedLeaves.map((leave) => {
                const days = calculateDays(leave.fromDate, leave.toDate);

                return (
                  <tr
                    key={`${leave.requestType}-${leave.id}`}>
                    
                      <td>{leave.employeeId || "-"}</td>

                      <td>
                        <span
                        className="employee-name-link"
                        onClick={() => openEmployeeHistory(leave)}>
                        
                          {leave.employeeName || "-"}
                        </span>
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
                      title="View Leave Details">
                      
                        {truncateReason(leave.reason, 15)}
                      </td>

                      <td>
                        <span className={`status ${leave.status?.toLowerCase()}`}>
                          {leave.status || "Pending"}
                        </span>
                      </td>

                      <td
                      className="action-cell"
                      onClick={(e) => e.stopPropagation()}>
                      
                        <button
                        className="approve-btn"
                        onClick={() =>
                        leave.requestType === "WFH" ?
                        updateWFHStatus(
                          leave.id,
                          "Approved"
                        ) :
                        updateStatus(
                          leave.id,
                          "Approved"
                        )
                        }
                        disabled={
                        actionLoading ===
                        `${leave.id}-Approved`
                        }>
                        
                          {actionLoading ===
                        `${leave.id}-Approved` ?
                        "Approving..." :
                        "Approve"}
                        </button>

                        <button
                        className="reject-btn"
                        onClick={() =>
                        leave.requestType === "WFH" ?
                        updateWFHStatus(
                          leave.id,
                          "Rejected"
                        ) :
                        updateStatus(
                          leave.id,
                          "Rejected"
                        )
                        }
                        disabled={
                        actionLoading ===
                        `${leave.id}-Rejected`
                        }>
                        
                          {actionLoading ===
                        `${leave.id}-Rejected` ?
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
              className={`leave-details-value leave-status-${selectedLeave.status?.toLowerCase()}`}>
              
                {selectedLeave.status}
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

            <div className="leave-balance-section">
              <h4>LEAVE BALANCE</h4>
              {employeeBalanceLoading === String(selectedEmployee.employeeId) ?
            <div className="history-loading">Loading leave balance...</div> :

            <div className="leave-balance-grid">
                  {(selectedEmployee.leaveBalance || []).map((item) =>
              <div className="balance-card" key={item.label}>
                      <div className="balance-header">
                        <span>{item.label}</span>
                        <span>{item.value ?? 0}</span>
                      </div>
                    </div>
              )}
                </div>
            }
            </div>

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
                  (x) => x.status?.toLowerCase().includes("approved")
                ).length
                }
                </h2>
                <span>Approved</span>
              </div>

              <div className="summary-card rejected">
                <h2>
                  {
                selectedEmployee.history.filter(
                  (x) => x.status?.toLowerCase().includes("rejected")
                ).length
                }
                </h2>
                <span>Rejected</span>
              </div>

              <div className="summary-card pending">
                <h2>
                  {
                selectedEmployee.history.filter(
                  (x) => x.status?.toLowerCase().includes("pending")
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
                    {selectedEmployee.history.map((item) =>
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

                        <td>{item.reason}</td>

                        <td>
                          <span
                      className={`history-status ${item.status?.toLowerCase().includes("approved") ?
                      "approved" :
                      item.status?.toLowerCase().includes("rejected") ?
                      "rejected" :
                      "pending"}`
                      }>
                      
                            {item.status}
                          </span>
                        </td>
                      </tr>
                )}
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
