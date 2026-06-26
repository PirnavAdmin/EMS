import React, { useState, useEffect } from "react";
import "./LeaveManagement.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import AppPagination from "../components/AppPagination";
import { TableSkeleton } from "../components/Skeletons";
import { extractCollection, sortByRecency } from "../utils/collections";
import { formatDate, isDateRangeValid, parseDate } from "../utils/date";

function LeaveManagement() {
  const [filter, setFilter] = useState("All");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [leaveData, setLeaveData] = useState([]);
  const [actionLoading, setActionLoading] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeHistoryLoading, setEmployeeHistoryLoading] = useState(false);
  const [wfhData, setWfhData] = useState([]);
  const ROWS_PER_PAGE = 30;

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  /* ================= FETCH LEAVES ================= */
  const fetchLeaves = async () => {
    try {
      setLoading(true);

      const res = await api.get(API_ENDPOINTS.leave.all, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = extractCollection(res.data);
      console.log("📦 Leave API Response:", data);

      setLeaveData(sortByRecency(data));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWFH = async () => {
    try {
      const res = await api.get(
        API_ENDPOINTS.wfh.all,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      const data = extractCollection(res.data);

      setWfhData(sortByRecency(data));

    } catch (err) {
      console.error("WFH Fetch Error", err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchWFH();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const openEmployeeHistory = async (leave) => {
    try {
      setEmployeeHistoryLoading(true);

      const response = await api.get(
        API_ENDPOINTS.leave.employeeLeaveDetails(
          leave.employeeId
        ),
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      const apiData = response.data;

      console.log("Leave History Response", apiData);

      setSelectedEmployee({
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,

        totalLeavesApplied:
          apiData.totalLeavesApplied || 0,

        leaveBalances: {
          casual:
            apiData.leaveBalance?.casual ||
            apiData.leaveBalance?.Casual ||
            {},

          sick:
            apiData.leaveBalance?.sick ||
            apiData.leaveBalance?.Sick ||
            {},

          earned:
            apiData.leaveBalance?.earned ||
            apiData.leaveBalance?.Earned ||
            {}
        },

        history:
          apiData.leaveHistory || []
      });

    } catch (error) {
      console.error(
        "Failed to fetch employee leave history",
        error
      );

      setSelectedEmployee({
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        history: []
      });

    } finally {
      setEmployeeHistoryLoading(false);
    }
  };

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (
    leaveId,
    status
  ) => {

    try {

      setActionLoading(
        `${leaveId}-${status}`
      );

      await api.put(
        API_ENDPOINTS.leave.updateStatus(leaveId),
        null,
        {
          params: { status },
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      console.log(
        "✅ Leave Updated Successfully"
      );

      await fetchLeaves();

      if (
        selectedLeave?.id === leaveId
      ) {

        setSelectedLeave((prev) => ({
          ...prev,
          status,
        }));

      }

    } catch (error) {

      console.error(
        "Update failed:",
        error
      );

    } finally {

      setActionLoading("");

    }
  };

  const updateWFHStatus = async (
    id,
    status
  ) => {

    try {

      setActionLoading(`${id}-${status}`);

      await api.put(
        API_ENDPOINTS.wfh.updateStatus(id),
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

      console.error(err);

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
    ...(leaveData || []).map(item => ({
      ...item,
      requestType: "Leave"
    })),

    ...(wfhData || []).map(item => ({
      ...item,
      requestType: "WFH"
    }))
  ];

  const filteredLeaves =
    combinedData.filter(item => {

      if (filter === "Leave")
        return item.requestType === "Leave";

      if (filter === "WFH")
        return item.requestType === "WFH";

      if (filter === "Pending")
        return item.status === "Pending";

      if (filter === "Approved")
        return item.status === "Approved";

      if (filter === "Rejected")
        return item.status === "Rejected";

      return true;
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

        <div className="tabs">
          {["All", "Leave", "WFH", "Pending", "Approved", "Rejected"].map((tab) => (
            <button
              key={tab}
              className={filter === tab ? "tab active" : "tab"}
              disabled
            >
              {tab}
            </button>
          ))}
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
            { width: "160px", type: "actions", headerWidth: "54%" },
          ]}
        />
      </div>
    );
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

      {/* FILTERS */}
      <div className="tabs">
        {["All", "Pending", "Approved", "Rejected"].map((tab) => (
          <button
            key={tab}
            className={filter === tab ? "tab active" : "tab"}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
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
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                    No leave records found
                  </td>
                </tr>
              ) : (
                paginatedLeaves.map((leave) => {
                  const days = calculateDays(leave.fromDate, leave.toDate);

                  return (
                    <tr
                      key={leave.id}

                    >
                      <td>{leave.employeeId || "-"}</td>

                      <td>
                        <span
                          className="employee-name-link"
                          onClick={() => openEmployeeHistory(leave)}
                        >
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
                        title="View Leave Details"
                      >
                        {truncateReason(leave.reason, 15)}
                      </td>

                      <td>
                        <span className={`status ${leave.status?.toLowerCase()}`}>
                          {leave.status || "Pending"}
                        </span>
                      </td>

                      <td
                        className="action-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="approve-btn"
                          onClick={() =>
                            leave.requestType === "WFH"
                              ? updateWFHStatus(
                                leave.id,
                                "Approved"
                              )
                              : updateStatus(
                                leave.id,
                                "Approved"
                              )
                          }
                          disabled={
                            actionLoading ===
                            `${leave.id}-Approved`
                          }
                        >
                          {actionLoading ===
                            `${leave.id}-Approved`
                            ? "Approving..."
                            : "Approve"}
                        </button>

                        <button
                          className="reject-btn"
                          onClick={() =>
                            leave.requestType === "WFH"
                              ? updateWFHStatus(
                                leave.id,
                                "Rejected"
                              )
                              : updateStatus(
                                leave.id,
                                "Rejected"
                              )
                          }
                          disabled={
                            actionLoading ===
                            `${leave.id}-Rejected`
                          }
                        >
                          {actionLoading ===
                            `${leave.id}-Rejected`
                            ? "Rejecting..."
                            : "Reject"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <AppPagination
        totalItems={filteredLeaves.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemLabel="leave requests"
      />

      {/* DETAILS MODAL */}
      {selectedLeave && (
        <div className="leave-details-overlay">
          <div className="leave-details-container">

            <button
              className="leave-details-close-icon"
              onClick={() => setSelectedLeave(null)}
            >
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
                {selectedLeave.appliedDate
                  ? formatDate(selectedLeave.appliedDate)
                  : "-"}
              </span>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Approved Date</span>
              <span className="leave-details-value">
                {selectedLeave.approvedDate
                  ? formatDate(selectedLeave.approvedDate)
                  : "-"}
              </span>
            </div>

            <div className="leave-details-row">
              <span className="leave-details-label">Status</span>
              <span
                className={`leave-details-value leave-status-${selectedLeave.status?.toLowerCase()}`}
              >
                {selectedLeave.status}
              </span>
            </div>

            <div className="leave-details-footer">
              <button
                className="leave-details-close-btn"
                onClick={() => setSelectedLeave(null)}
              >
                Close
              </button>
            </div>
          </div>


        </div>
      )}
      {/* -----------History modal----------- */}
      {selectedEmployee && (
        <div className="employee-history-overlay">
          <div className="employee-history-modal">

            <button
              className="history-close-icon"
              onClick={() => setSelectedEmployee(null)}
            >
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

            {/* LEAVE BALANCE */}
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
                      x => x.status?.toLowerCase().includes("approved")
                    ).length
                  }
                </h2>
                <span>Approved</span>
              </div>

              <div className="summary-card rejected">
                <h2>
                  {
                    selectedEmployee.history.filter(
                      x => x.status?.toLowerCase().includes("rejected")
                    ).length
                  }
                </h2>
                <span>Rejected</span>
              </div>

              <div className="summary-card pending">
                <h2>
                  {
                    selectedEmployee.history.filter(
                      x => x.status?.toLowerCase().includes("pending")
                    ).length
                  }
                </h2>
                <span>Pending</span>
              </div>

            </div>

            <div className="history-section-title">
              FULL HISTORY
            </div>

            {employeeHistoryLoading ? (

              <div className="history-loading">
                Loading leave history...
              </div>

            ) : (

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
                    {selectedEmployee.history.map((item) => (
                      <tr key={item.id}>
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
                            className={`history-status ${item.status?.toLowerCase().includes("approved")
                              ? "approved"
                              : item.status?.toLowerCase().includes("rejected")
                                ? "rejected"
                                : "pending"
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="history-footer">
              <button
                className="history-close-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveManagement;

