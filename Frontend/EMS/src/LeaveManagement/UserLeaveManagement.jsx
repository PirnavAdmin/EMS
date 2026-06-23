import React, { useState, useEffect } from "react";
import "./LeaveManagement.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  FaUserInjured,
  FaBookOpen,
  FaRegCalendarAlt,
  FaTrash
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppDatePicker from "../components/AppDatePicker";
import { formatDate, isDateRangeValid } from "../utils/date";
import { extractCollection, sortByRecency } from "../utils/collections";
 
const getLeaveRecordId = (leave) => {
  const value =
    leave?.id ??
    leave?.leaveId ??
    leave?.leave_Id ??
    leave?.leaveID ??
    leave?.leaveRequestId ??
    leave?.leave_Request_Id ??
    null;
 
  if (value === null || value === undefined) {
    return null;
  }
 
  if (
    typeof value === "string" &&
    !value.trim()
  ) {
    return null;
  }
 
  return value;
};
 
const buildLeaveIdentifierFields = (
  value
) => {
  const resolvedLeaveId =
    getLeaveRecordId(
      typeof value === "object" &&
        value !== null
        ? value
        : { id: value }
    );
 
  if (resolvedLeaveId === null) {
    return {};
  }
 
  return {
    id: resolvedLeaveId,
    leaveId: resolvedLeaveId,
    leave_Id: resolvedLeaveId,
  };
};
 
function UserLeaveManagement() {
  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");
 
  // ✅ use backend values here
  const [form, setForm] = useState({
    leaveType: "Casual",
    fromDate: "",
    toDate: "",
    reason: ""
  });
 
  const [leaveData, setLeaveData] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
 
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };
 
  const fetchBalance = async () => {
    const token = getToken();
    if (!token) {
      console.log("❌ No token found for leave balance");
      return;
    }
 
    try {
      console.log("📡 Fetching leave balance...");
      console.log("🔗 Balance API:", API_ENDPOINTS.leave.balance);
 
      const res = await api.get(API_ENDPOINTS.leave.balance, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });
 
      console.log("📄 Raw Balance Response:", res.data);
 
      const data = res.data || {};
      console.log("✅ Parsed Balance Data:", data);
 
      const formattedBalance = {
        sick: data?.sick ?? { used: 0, total: 0, remaining: 0 },
        earned: data?.earned ?? { used: 0, total: 0, remaining: 0 },
        casual: data?.casual ?? { used: 0, total: 0, remaining: 0 }
      };
 
      console.log("🎯 Final Balance Set to State:", formattedBalance);
 
      setBalance(formattedBalance);
    } catch (error) {
      console.error("❌ Error fetching leave balance:", error);
      toast.error("Failed to fetch balance");
    }
  };
 
  const fetchLeaves = async () => {
    const token = getToken();
    if (!token) return;
 
    try {
      const res = await api.get(API_ENDPOINTS.leave.list, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
 
      const data = extractCollection(res.data);
      console.log("📥 Leave List:", data);
      setLeaveData(
        sortByRecency(data).map(
          (leave) => ({
            ...leave,
            ...buildLeaveIdentifierFields(
              leave
            ),
          })
        )
      );
    }catch (err) {
  console.error("Apply leave error:", err.response?.data || err);

  const message =
    err.response?.data?.message ||
    err.response?.data ||
    "Error applying leave";

  toast.error(message);
}
  };
 
  useEffect(() => {
    fetchLeaves();
    fetchBalance();
  }, []);
  const isWeekendOnlyRange = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();

    // Monday to Friday exists
    if (day !== 0 && day !== 6) {
      return false;
    }
  }

  return true;
};
 
  const handleSubmit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      toast.error("Please fill all fields");
      return;
    }
 
    if (!isDateRangeValid(form.fromDate, form.toDate)) {
      toast.error("From date cannot be after To date");
      return;
    }
    if (isWeekendOnlyRange(form.fromDate, form.toDate)) {
  toast.error("Leave cannot be applied for weekends");
  return;
}
 
    const token = getToken();
    if (!token) {
      toast.error("User not authenticated");
      return;
    }
 
    // ✅ safer date formatting for backend
    const payload = {
      leaveType: form.leaveType,
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason.trim()
    };
 
    console.log("📤 Sending Leave Payload:", payload);
 
    try {
      setLoading(true);
 
      const res = await api.post(API_ENDPOINTS.leave.list, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });
 
      console.log("📄 Apply Leave Response:", res.data);
 
      toast.success("Leave applied successfully ✅");
 
      await fetchLeaves();
      await fetchBalance();
 
      setForm({
        leaveType: "Casual",
        fromDate: "",
        toDate: "",
        reason: ""
      });
    } catch (err) {
  console.error("Apply leave error:", err.response?.data || err);

  const message =
    err.response?.data?.message ||
    err.response?.data ||
    "Error applying leave";

  toast.error(message);
} finally {
  setLoading(false);
}
  };
 
  const deleteLeave = async (
    leaveRecord
  ) => {
    const confirmDelete = window.confirm("Delete this leave request?");
    if (!confirmDelete) return;
 
    const token = getToken();
    if (!token) {
      toast.error("User not authenticated");
      return;
    }
 
    const leaveIdentifierFields =
      buildLeaveIdentifierFields(
        leaveRecord
      );
 
    const resolvedLeaveId =
      leaveIdentifierFields.id;
 
    if (!resolvedLeaveId) {
      toast.error("Unable to delete leave");
      return;
    }
 
    try {
      await api.delete(API_ENDPOINTS.leave.byId(resolvedLeaveId), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: leaveIdentifierFields,
        data: leaveIdentifierFields,
      });
 
      toast.success("Leave deleted successfully 🗑️");
 
      await fetchLeaves();
      await fetchBalance();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
        "Error deleting leave"
      );
    }
  };
 
  // ✅ show proper label in cards/history if backend sends enum values
  const formatLeaveType = (type) => {
    if (type === "Sick") return "Sick Leave";
    if (type === "Casual") return "Casual Leave";
    if (type === "Earned") return "Earned Leave";
    return type;
  };
 
  const leaveCards = balance ? [
    {
      title: "Sick Leave",
      used: balance.sick.used,
      total: balance.sick.total,
      remaining: balance.sick.remaining,
      icon: <FaUserInjured />,
      className: "sick"
    },
    {
      title: "Earned Leave",
      used: balance.earned.used,
      total: balance.earned.total,
      remaining: balance.earned.remaining,
      icon: <FaBookOpen />,
      className: "earned"
    },
    {
      title: "Casual Leave",
      used: balance.casual.used,
      total: balance.casual.total,
      remaining: balance.casual.remaining,
      icon: <FaRegCalendarAlt />,
      className: "casual"
    }
  ] : [];
 
  return (
    <div
      className="leave-page"
      style={{
        paddingTop: "0px",
        marginTop: "-20px",
      }}
    >
      <ToastContainer position="top-right" autoClose={3000} />
 
      <h2
        className="leave-main-title"
        style={{
          marginTop: "0px",
          marginBottom: "18px",
        }}
      >
        Leave Management
      </h2>
 
      <div className="leave-top-cards">
 
        {!balance ? (
 
          <p>Loading leave balance...</p>
 
        ) : (
 
          leaveCards.map((card, index) => {
 
            const progress =
              card.total > 0
                ? Math.min(
                  (card.used / card.total) * 100,
                  100
                )
                : 0;
 
            return (
 
              <div
                className="leave-summary-card"
                key={index}
              >
 
                <div className="leave-card-header">
 
                  <div
                    className={`leave-icon-box ${card.className}`}
                  >
                    {card.icon}
                  </div>
 
                  <h4>{card.title}</h4>
 
                </div>
 
                <div className="leave-card-info">
 
                  <span>
                    Used {card.used} / {card.total}
                  </span>
 
                  <span>
                    {card.remaining} left
                  </span>
 
                </div>
 
                <div className="leave-progress">
 
                  <div
                    className={`leave-progress-fill ${card.className}`}
                    style={{
                      width: `${progress}%`
                    }}
                  ></div>
 
                </div>
 
              </div>
 
            );
 
          })
 
        )}
 
      </div>
 
      <div className="apply-card">
        <h2>Apply Leave</h2>
 
        <label>Leave Type</label>
        <select
          name="leaveType"
          value={form.leaveType}
          onChange={handleChange}
        >
          {/* ✅ backend values */}
           <option value="Select">Select Leave</option>
          <option value="Casual">Casual Leave</option>
          <option value="Sick">Sick Leave</option>
          <option value="Earned">Earned Leave</option>
        </select>
 
        <div
          className="date-row"
          style={{
            overflow: "visible",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              overflow: "visible",
              position: "relative",
            }}
          >
            <label>From</label>
 
            <AppDatePicker
              name="fromDate"
              value={form.fromDate}
              onChange={handleChange}
            />
          </div>
 
          <div
            style={{
              overflow: "visible",
              position: "relative",
            }}
          >
            <label>To</label>
 
            <AppDatePicker
              name="toDate"
              value={form.toDate}
              onChange={handleChange}
            />
          </div>
        </div>
 
        <label>Reason</label>
        <textarea
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Enter reason for leave..."
        />
 
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Application"}
        </button>
      </div>
 
      <div className="leave-history">
        <h3>My Leave Requests</h3>
 
        <table>
          <thead>
            <tr>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
 
          <tbody>
            {leaveData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No Leave Requests
                </td>
              </tr>
            ) : (
              leaveData.map((leave) => (
                <tr key={leave.id}>
                  <td>{formatLeaveType(leave.leaveType)}</td>
                  <td>{formatDate(leave.fromDate)}</td>
                  <td>{formatDate(leave.toDate)}</td>
                  <td>{leave.reason}</td>
 
                  <td>
                    <span className={`status ${leave.status?.toLowerCase()}`}>
                      {leave.status}
                    </span>
                  </td>
 
                  <td>
                    {leave.status === "Pending" && (
                      <button
                        className="icon-delete-btn"
                        onClick={() => deleteLeave(leave)}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
export default UserLeaveManagement;
 
 
 
 