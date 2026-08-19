import React, { useEffect, useMemo, useRef, useState } from "react";
import "./UserAttendance.css";
import { toastSuccess, toastError, toastWarning } from "@/components/common/toast/toastService";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import {
  formatDate,
  getDayName,
  getInputDateValue } from
"../utils/date";
import { getStoredIdentityParams } from "../utils/authStorage";
import {
  acquireReliableLocation,
  getGeolocationErrorMessage } from
"./gpsLocation";
import {
  FaSignInAlt,
  FaSignOutAlt,
  FaClock,
  FaRegCalendarAlt,
  FaArrowRight,
  FaArrowLeft,
  FaTimes,
  FaSpinner } from
"react-icons/fa";

/* eslint-disable react-hooks/exhaustive-deps */

function UserAttendance() {
  const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

  const today = new Date();
  const attendanceIdentityParams = useMemo(
    () => getStoredIdentityParams(),
    []
  );

  // --- NEW STATES FOR LOCATION REASON POPUP ---
  const [showReasonPopup, setShowReasonPopup] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingCheckoutData, setPendingCheckoutData] = useState(null);
  const [reasonSubmitting, setReasonSubmitting] = useState(false);
  // --------------------------------------------

  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [viewType, setViewType] = useState("week");
  const [attendanceData, setAttendanceData] = useState([]);
  const attendanceRequestRef = useRef(0);

  const [stats, setStats] = useState({
    checkIn: "--",
    breakStart: "--",
    breakEnd: "--",
    checkOut: "--",
    workedHours: "--"
  });

  const formattedDate = formatDate(today);
  const ATTENDANCE_HISTORY_CACHE_TTL = 30000;

  const formatTime = (value) => {
    if (!value) return "--";

    try {
      const stringValue = String(value).trim();

      // Already formatted AM/PM
      if (
      stringValue.toUpperCase().includes("AM") ||
      stringValue.toUpperCase().includes("PM"))
      {
        return stringValue;
      }

      // Handle 24-hour time from backend
      const parts = stringValue.split(":");

      const hours = Number(parts[0] || 0);
      const minutes = Number(parts[1] || 0);

      const period = hours >= 12 ? "PM" : "AM";

      const formattedHour =
      hours % 12 === 0 ? 12 : hours % 12;

      return `${String(formattedHour).padStart(
        2,
        "0"
      )}:${String(minutes).padStart(2, "0")} ${period}`;
    } catch {
      return value;
    }
  };

  const formatHoursFromMinutes = (minutes) => {
    if (minutes === null || minutes === undefined) return "-";

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const normalizeStatus = (status) => {
    const value = (status || "").toString().trim().toUpperCase();

    if (value === "P") return "Present";
    if (value === "A") return "Absent";
    if (value === "W") return "Weekend";
    if (value === "L") return "Late";
    if (value === "HD") return "Half Day";
    if (value === "OL") return "On Leave";
    if (value === "LOP") return "Loss Of Pay";
    if (value === "MC") return "Missed Checkout";
    if (value === "LMC") return "Late & Missed Checkout";
    if (value === "H") return "Holiday";
    if (value === "UP") return "Upcoming";

    return status || "-";
  };
  const formatDateLabel = (item) => {
    if (item.date) {
      return formatDate(item.date);
    }

    if (item.day) {
      return `Day ${item.day}`;
    }

    return "";
  };

  const formatDayName = (item) => {
    if (item.date) {
      return getDayName(item.date, "-").slice(0, 3);
    }

    if (item.dayName) return item.dayName;
    return "-";
  };

  const mapApiData = (data) => {
    return (Array.isArray(data) ? data : []).map((item, index) => ({
      id: item.id || `${item.date || item.day || index}-${index}`,
      rawDate: item.date || "",
      day: formatDayName(item),
      dateLabel: formatDateLabel(item),
      checkIn: formatTime(item.checkIn),
      checkOut: formatTime(
        item.checkOut ||
        item.checkOutTime ||
        item.checkoutTime ||
        item.checkout ||
        item.outTime
      ),
      hours: item.hours || formatHoursFromMinutes(item.workingMinutes),
      status: normalizeStatus(item.status)
    }));
  };

  const updateTopStats = (rows) => {
    if (!rows.length) {
      setStats({
        checkIn: "--",
        breakStart: "--",
        breakEnd: "--",
        checkOut: "--",
        workedHours: "--"
      });
      return;
    }

    const todayStr = getInputDateValue(new Date());

    const todayRow = rows.find((row) => {
      if (!row.rawDate) return false;
      return getInputDateValue(row.rawDate) === todayStr;
    });

    if (todayRow) {
      setStats((prev) => ({
        ...prev,
        checkIn: todayRow.checkIn || "--",
        checkOut: todayRow.checkOut || "--",
        workedHours: todayRow.hours || "--"
      }));
    } else {
      setStats((prev) => ({
        ...prev,
        checkIn: "--",
        checkOut: "--",
        workedHours: "--"
      }));
    }
  };

  const updateTodayAttendanceState = (rows) => {

    const todayStr =
    getInputDateValue(new Date());

    const todayRow =
    rows.find((row) => {

      if (!row.rawDate) {
        return false;
      }

      return (
        getInputDateValue(row.rawDate) ===
        todayStr);

    });

    if (todayRow) {

      const hasCheckIn =
      todayRow.checkIn &&
      todayRow.checkIn !== "--";

      const hasCheckOut =
      todayRow.checkOut &&
      todayRow.checkOut !== "--";

      setCheckedIn(!!hasCheckIn);
      setCheckedOut(!!hasCheckOut);

      // LIVE HOURS BEFORE CHECKOUT
      if (
      hasCheckIn &&
      !hasCheckOut)
      {

        const checkInTime =
        todayRow.checkIn;

        setStats((prev) => ({
          ...prev,
          checkIn: checkInTime,
          checkOut: "--"
        }));
      }

    } else {

      setCheckedIn(false);
      setCheckedOut(false);

    }
  };

  const fetchAttendanceHistory = async (type, forceRefresh = false) => {
    const requestId = ++attendanceRequestRef.current;

    try {
      setHistoryLoading(true);

      let apiUrl = API_ENDPOINTS.attendance.weekly;

      if (type === "lastWeek") {
        apiUrl = API_ENDPOINTS.attendance.previousWeek;
      } else if (type === "month") {
        apiUrl = API_ENDPOINTS.attendance.currentMonth;
      } else if (type === "lastMonth") {
        apiUrl = API_ENDPOINTS.attendance.previousMonth;
      }

      const res = await api.get(apiUrl, {
        params: attendanceIdentityParams,
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
        dedupe: !forceRefresh,
        cacheTTL: forceRefresh ? 0 : ATTENDANCE_HISTORY_CACHE_TTL
      });

      if (requestId !== attendanceRequestRef.current) {
        return;
      }

      const data = res.data;
      const mapped = mapApiData(data);
      setAttendanceData(mapped);

      if (type === "week") {
        updateTopStats(mapped);
        updateTodayAttendanceState(mapped);
      }
    } catch {
      if (requestId !== attendanceRequestRef.current) {
        return;
      }

      setAttendanceData([]);
    } finally {
      if (requestId === attendanceRequestRef.current) {
        setHistoryLoading(false);
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAttendanceHistory(viewType);
  }, [viewType]);

  // --- SHARED: Resolve a reliable GPS location, or show the appropriate ---
  // error/warning toast and return null when the location cannot be used.
  // Returns the { latitude, longitude, accuracy } payload on success -
  // this shape is intentionally identical to the original API contract.
  const resolveAccurateLocation = async () => {
    if (!navigator.geolocation) {
      toastError("Geolocation is not supported by your browser.");
      return null;
    }

    try {
      const result = await acquireReliableLocation();

      // > 200m accuracy -> reject submission entirely
      if (!result.allowed) {
        toastError(result.warning);
        return null;
      }

      // 100m < accuracy <= 200m -> accept, but warn the user
      if (result.warning) {
        toastWarning(result.warning);
      }

      const { latitude, longitude, accuracy } = result;

      if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude))
      {
        toastError("Latitude and Longitude are required for this action.");
        return null;
      }

      // Payload kept identical to the existing API contract.
      return { latitude, longitude, accuracy };
    } catch (error) {

      toastError(getGeolocationErrorMessage(error));
      return null;
    }
  };
  // -------------------------------------------------------------------------

  const handleCheckIn = async () => {

    if (checkedIn) {
      toastWarning("Already checked in");
      return;
    }

    setCheckInLoading(true);

    const payload = await resolveAccurateLocation();

    if (!payload) {
      setCheckInLoading(false);
      return;
    }

    try {
      await api.post(
        API_ENDPOINTS.attendance.checkIn,
        payload,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json"
          }
        }
      );

      toastSuccess("Checked in successfully");

      setCheckedIn(true);
      setCheckedOut(false);

      await fetchAttendanceHistory(viewType, true);

    } catch (err) {

      toastError(
        err?.response?.data?.message ||
        err?.response?.data ||
        "Check-in failed"
      );
    }

    setCheckInLoading(false);
  };

  // --- HANDLE CHECKOUT WITH RELIABLE GEOLOCATION ---
  const handleCheckOut = async () => {
    setCheckOutLoading(true);

    const payload = await resolveAccurateLocation();

    if (!payload) {
      setCheckOutLoading(false);
      return;
    }

    try {
      await api.post(
        API_ENDPOINTS.attendance.checkOut,
        payload,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json"
          }
        }
      );

      toastSuccess("Checked out successfully");
      setCheckedOut(true);
      await fetchAttendanceHistory(viewType, true);
    }
    catch (err) {
      const responseData =
      err?.response?.data?.data ||
      err?.response?.data ||
      {};

      const needsReason =
      responseData?.requiresReason === true;

      if (needsReason) {
        setPendingCheckoutData(payload);
        setShowReasonPopup(true);
        return;
      }

      const errorMsg = responseData?.errors ?
      Object.values(responseData.errors).flat().join(", ") :
      responseData?.message || "Server error during check-out";

      toastError(errorMsg);
    } finally {
      setCheckOutLoading(false);
    }
  };
  // ------------------------------------------------

  // --- NEW FUNCTION TO SUBMIT REASON AND COMPLETE CHECKOUT ---
  const submitCheckoutReason = async () => {
    if (reasonSubmitting) {
      return;
    }

    const trimmedReason = reason.trim();

    if (trimmedReason.length < 10) {
      toastError("Reason must be at least 10 characters.");
      return;
    }

    if (trimmedReason.length > 500) {
      toastError("Reason must be 500 characters or less.");
      return;
    }

    setReasonSubmitting(true);

    try {
      await api.post(
        API_ENDPOINTS.attendance.checkOut,
        {
          ...pendingCheckoutData,
          locationChangeReason: trimmedReason
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json"
          }
        }
      );

      toastSuccess("Checked out successfully");
      setCheckedOut(true);
      setShowReasonPopup(false);
      setReason("");
      setPendingCheckoutData(null);

      await fetchAttendanceHistory(viewType, true);
    }
    catch (err) {
      const responseData =
      err?.response?.data?.data ||
      err?.response?.data ||
      {};

      const errorMsg = responseData?.errors ?
      Object.values(responseData.errors).flat().join(", ") :
      responseData?.message || "Failed to submit checkout reason";
      toastError(errorMsg);
    } finally {
      setReasonSubmitting(false);
    }
  };
  // ---------------------------------------------------------

  const currentTime = new Date();
  const isBefore855 =
  currentTime.getHours() < 8 ||

  currentTime.getHours() === 8 &&
  currentTime.getMinutes() < 55;

  // const isAfter615 =
  //   currentTime.getHours() > 18 ||
  //   (
  //     currentTime.getHours() === 18 &&
  //     currentTime.getMinutes() >= 15
  //   );
  const getStatusClass = (status) => {
    const value = normalizeStatus(status).toLowerCase().replace(/\s+/g, "");

    if (value === "present") return "present";
    if (value === "absent") return "absent";
    if (value === "late") return "late";
    if (value === "halfday") return "halfday";
    if (value === "onleave") return "leave";
    if (value === "weekend") return "weekend";
    if (value === "lossofpay") return "lop";
    if (value === "missedcheckout") return "missed-checkout";
    if (value === "late&missedcheckout") return "late-missed";
    if (value === "holiday") return "holiday";
    if (value === "upcoming") return "upcoming";

    return "default";
  };

  return (
    <>
      <div className="attendance-page">
        {/* --- REASON POPUP OVERLAY --- */}
        {showReasonPopup &&
        <div className="reason-popup-overlay">
            <div className="reason-popup">
              <div className="reason-popup-header">
                <h3>Location Change Detected</h3>
                <button
                className="close-popup-btn"
                onClick={() => {
                  if (reasonSubmitting) {
                    return;
                  }
                  setShowReasonPopup(false);
                  setReason("");
                  setPendingCheckoutData(null);
                }}
                disabled={reasonSubmitting}>
                
                  <FaTimes />
                </button>
              </div>

              <p className="reason-popup-message">
                Your checkout location is more than 500 meters away from your check-in location.
                Please provide a reason for this change.
              </p>

              <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              minLength={10}
              maxLength={500}
              placeholder="Enter reason for location change..."
              autoFocus />
            

              <div className="reason-popup-actions">
                <button
                className="btn-cancel"
                onClick={() => {
                  if (reasonSubmitting) {
                    return;
                  }
                  setShowReasonPopup(false);
                  setReason("");
                  setPendingCheckoutData(null);
                }}
                disabled={reasonSubmitting}>
                
                  Cancel
                </button>
                <button
                className="btn-submit"
                onClick={submitCheckoutReason}
                disabled={reasonSubmitting || reason.trim().length < 10}>
                
                  {reasonSubmitting ?
                <>
                      <FaSpinner className="attendance-button-spinner" aria-hidden="true" />
                      Submitting...
                    </> :

                "Submit Reason"
                }
                </button>
              </div>
            </div>
          </div>
        }
        {/* ----------------------------- */}

        <h1 className="attendance-page-title">My Attendance</h1>

        <div className="attendance-card">
          {(initialLoading || historyLoading) &&
          <div className="card-loader">
              <div className="loader-spinner"></div>
            </div>
          }
          <h3>Mark Attendance</h3>
          <h1>{formattedDate}</h1>

          <div className="attendance-actions-custom">
            <button
              className="checkin-btn"
              onClick={handleCheckIn}
              style={{
                transform: "none",
                border: "none",
                outline: "none",
                textDecoration: "none"
              }}
              disabled={
              checkedIn ||
              checkInLoading ||
              checkOutLoading ||
              isBefore855
              }
              title={
              isBefore855 ?
              "Check-in opens at 8:55 AM" :
              ""
              }>
              
              <FaSignInAlt />

              {/* {isBefore855
                 ? "Check In Opens 8:55 AM" :*/}
              {checkInLoading ?
              "Processing..." :
              "Check In"}
            </button>

            <button
              className="checkout-btn"
              onClick={handleCheckOut}
              style={{
                transform: "none",
                border: "none",
                outline: "none",
                textDecoration: "none"
              }}
              disabled={
              !checkedIn ||
              checkedOut ||
              checkInLoading ||
              checkOutLoading
              }
              title="">
              
              <FaSignOutAlt />

              {checkOutLoading ?
              "Processing..." :
              "Check Out"}
            </button>

          </div>

          <div className="attendance-stats-row">
            <div className="attendance-stat-box">
              <div className="stat-icon checkin-icon">
                <FaArrowRight />
              </div>
              <div className="stat-label">Check In</div>
              <div className="stat-value">{stats.checkIn}</div>
            </div>

            <div className="attendance-stat-box">
              <div className="stat-icon checkout-icon">
                <FaArrowLeft />
              </div>
              <div className="stat-label">Check Out</div>
              <div className="stat-value">{stats.checkOut}</div>
            </div>

            <div className="attendance-stat-box">
              <div className="stat-icon hours-icon">
                <FaClock />
              </div>
              <div className="stat-label">Hours</div>
              <div className="stat-value">{stats.workedHours}</div>
            </div>
          </div>
        </div>

        <div className="week-card">
          <div className="week-header">
            <h3>
              <FaRegCalendarAlt className="week-title-icon" />
              {viewType === "week" ?
              "This Week" :
              viewType === "lastWeek" ?
              "Last Week" :
              viewType === "month" ?
              "This Month" :
              "Last Month"}
            </h3>

            <div className="week-toggle">
              <button
                className={viewType === "week" ? "active" : ""}
                onClick={() => setViewType("week")}>
                
                Week
              </button>

              <button
                className={viewType === "lastWeek" ? "active" : ""}
                onClick={() => setViewType("lastWeek")}>
                
                Last Week
              </button>

              <button
                className={viewType === "month" ? "active" : ""}
                onClick={() => setViewType("month")}>
                
                Month
              </button>

              <button
                className={viewType === "lastMonth" ? "active" : ""}
                onClick={() => setViewType("lastMonth")}>
                
                Last Month
              </button>
            </div>
          </div>

          <div
            className="week-table-header">
            
            <span>DAY</span>
            <span>CHECK IN</span>
            <span>CHECK OUT</span>
            <span>HOURS</span>
            <span>STATUS</span>
          </div>

          {historyLoading ?
          <div className="attendance-empty">
              Loading attendance...
            </div> :
          !attendanceData || attendanceData.length === 0 ?
          <div className="attendance-empty">
              No attendance records found.
            </div> :

          attendanceData.map((item) =>
          <div
            key={item.id}
            className="week-row">
            
                <div className="week-day-cell">
                  <div>{item.day}</div>
                  <small>{item.dateLabel}</small>
                </div>

                <span>{item.checkIn}</span>
                <span>{item.checkOut}</span>
                <span>{item.hours}</span>

                <span className={`status ${getStatusClass(item.status)}`}>
                  {item.status}
                </span>
              </div>
          )
          }
        </div>
      </div>
    </>);

}

export default UserAttendance;
