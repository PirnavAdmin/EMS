import React, { memo, useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./AttendanceTable.css";
import { toastSuccess, toastError, toastWarning } from "@/components/common/toast/toastService";
import AppDatePicker from "../components/AppDatePicker";
import {
  downloadMonthlyAttendanceReport,
  downloadWeeklyAttendanceReport,
  getDownloadErrorMessage } from
"./attendanceReports";
import {
  downloadDailyAttendance,
  getMonthlyAttendance,
  getTodayAttendance,
  getWorkingHours,
  updateAttendance,
  uploadMonthlyAttendance } from
"../services/attendanceService";
import {
  formatMonthYear,
  formatDate,
  formatTime,
  getInputDateValue,
  getTodayInputValue } from
"../utils/date";
import { getStoredToken } from "../utils/authStorage";
import {
  endPerformanceTimer,
  logPerformanceError,
  startPerformanceTimer } from
"../utils/performance";

const reportMonthFormatter =
new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
});

const reportMonthNameFormatter =
new Intl.DateTimeFormat("en-US", {
  month: "long"
});

const getReportMonthValue = (yearValue, monthValue) =>
`${yearValue}-${String(monthValue).padStart(2, "0")}`;

const parseReportMonthValue = (monthValue) => {
  const [selectedYear, selectedMonth] =
  String(monthValue || "").
  split("-").
  map(Number);

  if (!selectedYear || !selectedMonth) {
    return null;
  }

  return {
    year: selectedYear,
    month: selectedMonth
  };
};

const getReportMonthLabel = (yearValue, monthValue) =>
reportMonthFormatter.format(
  new Date(yearValue, monthValue - 1, 1)
);

const getReportDateLabel = (dateValue) =>
`${reportMonthNameFormatter.format(dateValue)} ${dateValue.getDate()}`;

const getReportDateFilePart = (dateValue) =>
`${reportMonthNameFormatter.format(dateValue)}-${String(
  dateValue.getDate()
).padStart(2, "0")}`;

// Optimization: ignore aborted duplicate/stale requests without showing error toasts.
const isCanceledRequest = (error) =>
error?.code === "ERR_CANCELED" ||
error?.name === "CanceledError";

const pickFirstNumericValue = (values = []) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
};

const hasOwn = (value, key) =>
Boolean(value) &&
typeof value === "object" &&
Object.prototype.hasOwnProperty.call(value, key);

const pickFirstPresentNumericValue = (sources = []) => {
  for (const [source, key] of sources) {
    if (!hasOwn(source, key)) {
      continue;
    }

    const value = source[key];

    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  return null;
};

const getUsedLeavesForMonth = (emp, counts = {}) => {
  const backendUsedLeaves = pickFirstNumericValue([
  emp?.ul,
  emp?.UL,
  emp?.usedLeaves,
  emp?.UsedLeaves,
  emp?.usedLeave,
  emp?.UsedLeave,
  emp?.monthlyUsedLeaves,
  emp?.MonthlyUsedLeaves,
  emp?.totalLeavesUsed,
  emp?.TotalLeavesUsed,
  emp?.takenLeaves,
  emp?.TakenLeaves,
  emp?.leavesTaken,
  emp?.LeavesTaken,
  emp?.leaveDaysUsed,
  emp?.LeaveDaysUsed,
  emp?.approvedLeaveDays,
  emp?.ApprovedLeaveDays,
  emp?.leaveBalance?.used,
  emp?.leaveBalance?.Used,
  emp?.LeaveBalance?.used,
  emp?.LeaveBalance?.Used,
  emp?.employee?.usedLeaves,
  emp?.employee?.UsedLeaves,
  emp?.employee?.leaveBalance?.used,
  emp?.employee?.leaveBalance?.Used]
  );

  return backendUsedLeaves ?? (counts.onLeave || 0);
};

const getBackendLeaveMetric = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getTotalLeavesForEmployee = (emp) =>
pickFirstPresentNumericValue([
[emp, "tl"],
[emp, "TL"],
[emp, "totalLeaves"],
[emp, "TotalLeaves"],
[emp?.leaveBalance, "total"],
[emp?.leaveBalance, "Total"],
[emp?.employee, "tl"],
[emp?.employee, "TL"],
[emp?.employee?.leaveBalance, "total"],
[emp?.employee?.leaveBalance, "Total"]]
) ?? getBackendLeaveMetric(emp?.tl);

const getBalanceLeavesForEmployee = (emp, leaveSummary = {}) => {
  const backendBalanceLeaves = pickFirstPresentNumericValue([
  [emp, "bl"],
  [emp, "BL"],
  [emp, "balanceLeaves"],
  [emp, "BalanceLeaves"],
  [emp?.leaveBalance, "balance"],
  [emp?.leaveBalance, "Balance"],
  [emp?.employee, "bl"],
  [emp?.employee, "BL"],
  [emp?.employee?.leaveBalance, "balance"],
  [emp?.employee?.leaveBalance, "Balance"]]
  );

  if (backendBalanceLeaves !== null) {
    return Math.max(0, backendBalanceLeaves);
  }

  const totalLeaves = Number(leaveSummary.totalLeaves) || 0;
  const usedLeaves = Number(leaveSummary.usedLeaves) || 0;

  return Math.max(0, totalLeaves - usedLeaves);
};

const getTotalWorkingDaysForEmployee = (emp, counts = {}) => {
  const backendWorkingDays = pickFirstPresentNumericValue([
  [emp, "tw"],
  [emp, "TW"],
  [emp, "totalWorkingDays"],
  [emp, "TotalWorkingDays"],
  [emp, "workingDays"],
  [emp, "WorkingDays"]]
  );

  if (backendWorkingDays !== null) {
    return Math.max(0, backendWorkingDays);
  }

  return [
  counts.present,
  counts.absent,
  counts.late,
  counts.halfDay,
  counts.onLeave,
  counts.lossOfPay,
  counts.missedCheckout,
  counts.lateMissedCheckout].
  reduce((total, value) => total + (Number(value) || 0), 0);
};

const formatLeaveSummaryValue = (value) =>
value === null || value === undefined ? 0 : value;

const buildReportMonthOptions = (yearValue) =>
Array.from({ length: 12 }, (item, monthIndex) => {
  const monthValue = monthIndex + 1;

  return {
    value: getReportMonthValue(yearValue, monthValue),
    label: getReportMonthLabel(yearValue, monthValue)
  };
});

const buildReportWeeks = (monthValue) => {
  const selectedMonthMeta =
  parseReportMonthValue(monthValue);

  if (!selectedMonthMeta) {
    return [];
  }

  const { year: selectedYear, month: selectedMonth } =
  selectedMonthMeta;

  const daysInSelectedMonth =
  new Date(selectedYear, selectedMonth, 0).getDate();

  const weeks = [];
  let startDay = 1;

  while (startDay <= daysInSelectedMonth) {
    const startDate =
    new Date(selectedYear, selectedMonth - 1, startDay);

    const daysUntilMonday =
    (1 - startDate.getDay() + 7) % 7;

    const endDay =
    Math.min(
      daysInSelectedMonth,
      startDay + daysUntilMonday
    );

    const endDate =
    new Date(selectedYear, selectedMonth - 1, endDay);

    const fromDate =
    getInputDateValue(startDate);

    const toDate =
    getInputDateValue(endDate);

    weeks.push({
      id: `${fromDate}-${toDate}`,
      week: weeks.length + 1,
      start: startDate,
      end: endDate,
      fromDate,
      toDate,
      rangeLabel:
      `${getReportDateLabel(startDate)} - ${getReportDateLabel(endDate)}`,
      fallbackFileName:
      `weekly-attendance-${getReportDateFilePart(startDate)}-to-${getReportDateFilePart(endDate)}.xlsx`
    });

    startDay = endDay + 1;
  }

  return weeks;
};

function AttendanceTable({
  viewMode = "daily",
  filter = "All",
  search = "",
  month,
  year,
  selectedDate
}) {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState("");
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadReportType, setDownloadReportType] = useState("Daily");
  const [downloadReportMonth, setDownloadReportMonth] = useState("");
  const [downloadReportYear, setDownloadReportYear] = useState(
    new Date().getFullYear()
  );
  const [selectedReportWeekId, setSelectedReportWeekId] = useState("");
  // New state for Daily download date
  const [downloadReportDate, setDownloadReportDate] = useState(getTodayInputValue());

  const [, setLiveTimer] = useState(0);
  const [dailyPage, setDailyPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);

  // ENSURE month/year ARE NUMBERS (fixes AWS server issue)
  const monthNum = month ? Number(month) : null;
  const yearNum = year ? Number(year) : null;
  const ATTENDANCE_PAGE_SIZE = 10;

  // =========================
  // ADMIN EDIT STATES
  // =========================
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [detailsFilter, setDetailsFilter] = useState("Monthly");
  const [detailsMonth, setDetailsMonth] = useState("");
  const [detailsFromDate, setDetailsFromDate] = useState("");
  const [detailsToDate, setDetailsToDate] = useState("");
  const activeRequestRef = useRef(0);
  const detailsRequestRef = useRef(0);
  const detailsAbortRef = useRef(null);
  const checkInHourRef = useRef(null);
  const checkInMinuteRef = useRef(null);

  const checkOutHourRef = useRef(null);
  const checkOutMinuteRef = useRef(null);

  const [editForm, setEditForm] = useState({
    employeeId: "",
    date: "",
    checkIn: "",
    checkOut: ""
  });

  // =========================
  // LOCATION MODAL STATE
  // =========================
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationModalData, setLocationModalData] = useState(null);
  const [locationAddressLoading, setLocationAddressLoading] = useState(false);
  const locationRequestRef = useRef(0);
  const token = getStoredToken();

  // =========================
  // DEFAULT OFFICE TIME
  // =========================
  const DEFAULT_CHECKIN = "09:00";
  const DEFAULT_CHECKOUT = "18:00";
  // =========================
  // HELPERS
  // =========================
  const getEmployeeId = (emp) => {
    return (
      emp?.employee_Id || // <-- add this
      emp?.employeeId ||
      emp?.id ||
      emp?._id ||
      emp?.empId ||
      emp?.staffId ||
      emp?.userId ||
      emp?.employee?.employee_Id || // <-- add this too
      emp?.employee?.employeeId ||
      emp?.employee?.id ||
      emp?.employee?._id ||
      "");

  };

  const getEmployeeName = (emp) => {
    return (
      emp?.name ||
      emp?.employeeName ||
      emp?.fullName ||
      emp?.employee?.name ||
      emp?.user?.name ||
      "Unknown");

  };

  const getEmployeeDept = (emp) => {
    return (
      emp?.department ||
      emp?.designation ||
      emp?.employee?.department ||
      emp?.user?.department ||
      "Employee");

  };

  const getCheckIn = (emp) => {
    return emp?.checkIn || emp?.checkInTime || emp?.inTime || null;
  };

  const getCheckOut = (emp) => {
    return emp?.checkOut || emp?.checkOutTime || emp?.outTime || null;
  };

  // =========================
  // LOCATION HELPERS
  // =========================
  const parseLatLngFromUrl = (url) => {
    if (!url) return null;

    const match = String(url).match(
      /q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/
    );

    if (!match) return null;

    const lat = Number(match[1]);
    const lng = Number(match[2]);

    return Number.isFinite(lat) && Number.isFinite(lng) ?
    { lat, lng } :
    null;
  };

  // FIX: The check-in/check-out map link (checkInMapUrl / checkOutMapUrl) is the
  // value captured live at the moment of check-in/check-out, so it is the most
  // accurate source of truth. Any separately stored lat/lng style fields can go
  // stale (e.g. overwritten by a later location update), which caused the modal
  // to show the wrong / "current" location instead of the location recorded at
  // the time of attendance. We now prefer the map-url coordinates first and only
  // fall back to the other fields if no map url is present.
  const getLocationCoords = (emp, prefix) => {
    const mapUrl =
    prefix === "checkIn" ? emp?.checkInMapUrl : emp?.checkOutMapUrl;

    const urlCoords = parseLatLngFromUrl(mapUrl);

    if (urlCoords) {
      return urlCoords;
    }

    const lat =
    emp?.[`${prefix}Lat`] ??
    emp?.[`${prefix}Latitude`] ??
    emp?.[`${prefix}Location`]?.lat ??
    emp?.[`${prefix}Location`]?.latitude ??
    emp?.[`${prefix}Coordinates`]?.lat ??
    emp?.[`${prefix}Coordinates`]?.latitude ??
    emp?.[`${prefix}GeoLocation`]?.lat ??
    emp?.[`${prefix}GeoLocation`]?.latitude ??
    null;

    const lng =
    emp?.[`${prefix}Lng`] ??
    emp?.[`${prefix}Long`] ??
    emp?.[`${prefix}Longitude`] ??
    emp?.[`${prefix}Location`]?.lng ??
    emp?.[`${prefix}Location`]?.longitude ??
    emp?.[`${prefix}Coordinates`]?.lng ??
    emp?.[`${prefix}Coordinates`]?.longitude ??
    emp?.[`${prefix}GeoLocation`]?.lng ??
    emp?.[`${prefix}GeoLocation`]?.longitude ??
    null;

    if (
    lat !== null &&
    lat !== undefined &&
    lng !== null &&
    lng !== undefined &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)))
    {
      return { lat: Number(lat), lng: Number(lng) };
    }

    return null;
  };

  const getLocationAddress = (emp, prefix) => {
    return (
      emp?.[`${prefix}Address`] ||
      emp?.[`${prefix}FullAddress`] ||
      emp?.[`${prefix}Location`]?.address ||
      emp?.[`${prefix}Location`]?.fullAddress ||
      "");

  };

  const getNumericHoursValue = (value) => {
    if (
    value === null ||
    value === undefined ||
    value === "")
    {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const normalizedValue =
    String(value).trim().toLowerCase();

    if (!normalizedValue) {
      return null;
    }

    const hoursMatch =
    normalizedValue.match(/(-?\d+(\.\d+)?)\s*h/i);

    const minutesMatch =
    normalizedValue.match(/(\d+(\.\d+)?)\s*m/i);

    if (hoursMatch || minutesMatch) {

      const hours =
      hoursMatch ?
      Number(hoursMatch[1]) :
      0;

      const minutes =
      minutesMatch ?
      Number(minutesMatch[1]) :
      0;

      const combinedHours =
      hours + minutes / 60;

      return Number.isFinite(combinedHours) ?
      Number(combinedHours.toFixed(1)) :
      null;
    }

    const numericMatch =
    normalizedValue.match(/-?\d+(\.\d+)?/);

    if (!numericMatch) {
      return null;
    }

    const parsedValue =
    Number(numericMatch[0]);

    return Number.isFinite(parsedValue) ?
    parsedValue :
    null;
  };

  const getAttendanceDateTime = (value, attendanceRecord) => {
    if (!value) {
      return null;
    }

    try {

      if (
      value instanceof Date &&
      !Number.isNaN(value.getTime()))
      {
        return value;
      }

      if (typeof value === "string") {

        const trimmedValue =
        value.trim();

        if (!trimmedValue) {
          return null;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {

          const [
          parsedYear,
          parsedMonth,
          parsedDay] =
          trimmedValue.split("-").map(Number);

          const parsedDate =
          new Date(
            parsedYear,
            parsedMonth - 1,
            parsedDay
          );

          return Number.isNaN(parsedDate.getTime()) ?
          null :
          parsedDate;
        }

        if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmedValue)) {

          const baseDateValue =
          attendanceRecord?.date ||
          attendanceRecord?.attendanceDate ||
          attendanceRecord?.currentDate ||
          null;

          if (baseDateValue) {

            const baseDate =
            getAttendanceDateTime(baseDateValue);

            if (
            baseDate &&
            !Number.isNaN(baseDate.getTime()))
            {

              const [
              hours = "0",
              minutes = "0",
              seconds = "0"] =
              trimmedValue.split(":");

              baseDate.setHours(
                Number(hours),
                Number(minutes),
                Number(seconds),
                0
              );

              return Number.isNaN(baseDate.getTime()) ?
              null :
              baseDate;
            }
          }

          const dayNumber =
          Number(attendanceRecord?.day);

          if (
          monthNum &&
          yearNum &&
          dayNumber)
          {

            const [
            hours = "0",
            minutes = "0",
            seconds = "0"] =
            trimmedValue.split(":");

            const parsedDate =
            new Date(
              yearNum,
              monthNum - 1,
              dayNumber,
              Number(hours),
              Number(minutes),
              Number(seconds),
              0
            );

            return Number.isNaN(parsedDate.getTime()) ?
            null :
            parsedDate;
          }
        }

        const parsedStringDate =
        new Date(trimmedValue);

        if (!Number.isNaN(parsedStringDate.getTime())) {
          return parsedStringDate;
        }
      }

      const parsedDate =
      new Date(value);

      return Number.isNaN(parsedDate.getTime()) ?
      null :
      parsedDate;

    } catch {
      return null;
    }
  };

  const getAttendanceRecordDate = (attendanceRecord) => {

    const directDate =
    getAttendanceDateTime(
      attendanceRecord?.date ||
      attendanceRecord?.attendanceDate ||
      attendanceRecord?.currentDate ||
      null,
      attendanceRecord
    );

    if (directDate) {
      return directDate;
    }

    const checkInDate =
    getAttendanceDateTime(
      getCheckIn(attendanceRecord),
      attendanceRecord
    );

    if (checkInDate) {
      return checkInDate;
    }

    const checkOutDate =
    getAttendanceDateTime(
      getCheckOut(attendanceRecord),
      attendanceRecord
    );

    if (checkOutDate) {
      return checkOutDate;
    }

    const dayNumber =
    Number(attendanceRecord?.day);

    if (
    monthNum &&
    yearNum &&
    dayNumber)
    {

      const parsedDate =
      new Date(
        yearNum,
        monthNum - 1,
        dayNumber
      );

      return Number.isNaN(parsedDate.getTime()) ?
      null :
      parsedDate;
    }

    return null;
  };

  const getMonthValue = (value) => {
    const inputDateValue =
    getInputDateValue(value);

    return inputDateValue ?
    inputDateValue.slice(0, 7) :
    "";
  };

  const getResolvedAttendanceHours = (attendanceRecord) => {

    const workingHours =
    getNumericHoursValue(
      attendanceRecord?.workingHours
    );

    if (workingHours !== null) {
      return workingHours;
    }

    const checkIn =
    getCheckIn(attendanceRecord);

    const checkOut =
    getCheckOut(attendanceRecord);

    const checkInDate =
    getAttendanceDateTime(
      checkIn,
      attendanceRecord
    );

    const checkOutDate =
    getAttendanceDateTime(
      checkOut,
      attendanceRecord
    );

    if (
    checkInDate &&
    checkOutDate)
    {

      const diffMs =
      checkOutDate.getTime() -
      checkInDate.getTime();

      if (diffMs > 0) {

        const calculatedHours =
        diffMs / (1000 * 60 * 60);

        if (Number.isFinite(calculatedHours)) {
          return Number(
            calculatedHours.toFixed(1)
          );
        }
      }
    }

    const hours =
    getNumericHoursValue(
      attendanceRecord?.hours
    );

    if (hours !== null) {
      return hours;
    }

    const totalHours =
    getNumericHoursValue(
      attendanceRecord?.totalHours
    );

    if (totalHours !== null) {
      return totalHours;
    }

    return 0;
  };

  const buildAttendanceDetailsData = (emp) => {

    const attendanceDays =
    Array.isArray(emp?.days) &&
    emp.days.length > 0 ?
    emp.days :

    getAttendanceRecordDate(emp) ||
    getCheckIn(emp) ||
    getCheckOut(emp) ||
    emp?.status ||
    emp?.attendanceStatus ||
    emp?.markStatus ||
    emp?.dayStatus ||
    emp?.dailyStatus ?

    [emp] :
    [];

    let totalHours = 0;
    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let late = 0;
    let halfDay = 0;
    let weekends = 0;

    const weeklyMap = {};

    const resolvedDays =
    attendanceDays.map((d) => {

      const status =
      getResolvedStatus(d);

      if (status === "Present") present++;
      if (status === "Absent") absent++;
      if (status === "On Leave") onLeave++;
      if (status === "Late") late++;
      if (status === "Half Day") halfDay++;
      if (status === "Weekend") weekends++;

      const resolvedHours =
      getResolvedAttendanceHours(d);

      totalHours += resolvedHours;

      const currentDate =
      getAttendanceRecordDate(d);

      if (currentDate) {

        const firstDay =
        new Date(currentDate);

        firstDay.setDate(
          currentDate.getDate() -
          currentDate.getDay() + 1
        );

        const weekKey =
        firstDay.toDateString();

        if (!weeklyMap[weekKey]) {

          weeklyMap[weekKey] = {
            week:
            Object.keys(weeklyMap).length + 18,
            start: firstDay,
            end: new Date(firstDay),
            hours: 0
          };

          weeklyMap[weekKey].end.setDate(
            firstDay.getDate() + 6
          );
        }

        weeklyMap[weekKey].hours +=
        resolvedHours;
      }

      return {
        ...d,
        resolvedDate: currentDate,
        resolvedStatus: status,
        resolvedCheckIn: getCheckIn(d),
        resolvedCheckOut: getCheckOut(d),
        resolvedHours
      };
    });

    return {
      employee: emp,
      totalHours:
      `${totalHours.toFixed(1)} hrs`,
      weeklyHours: "0 hrs",
      present,
      absent,
      onLeave,
      late,
      halfDay,
      weekends,
      days: resolvedDays,
      weeklyBreakdown:
      Object.values(weeklyMap)
    };
  };

  const formatHoursWorked = (emp) => {
    const attendanceDate =
    getAttendanceRecordDate(emp);

    if (
    attendanceDate &&
    attendanceDate > new Date())
    {
      return "--";
    }

    const employeeId =
    getEmployeeId(emp);
    const employeeName =
    getEmployeeName(emp);
    const apiWorkingHours =
    emp?.workingHours;

    console.log("Attendance working hours API value:", {
      employeeId,
      employeeName,
      workingHours: apiWorkingHours
    });

    if (
    apiWorkingHours === null ||
    apiWorkingHours === undefined ||
    apiWorkingHours === "")
    {
      return "--";
    }

    return String(apiWorkingHours);
  };

  const formatCheckTime = (value) => {

    if (!value) {
      return "-";
    }

    try {

      // If backend already sends HH:mm
      if (
      typeof value === "string" &&
      /^\d{2}:\d{2}$/.test(value))
      {

        const [hours, minutes] = value.split(":");

        const h = Number(hours);

        const ampm =
        h >= 12 ? "pm" : "am";

        const formattedHour =
        h % 12 || 12;

        return `${formattedHour}:${minutes} ${ampm}`;
      }

      // ISO Date support
      const date = new Date(value);

      if (isNaN(date.getTime())) {
        return "-";
      }

      let hours = date.getHours();

      const minutes = String(
        date.getMinutes()
      ).padStart(2, "0");

      const ampm =
      hours >= 12 ? "pm" : "am";

      hours =
      hours % 12 || 12;

      return `${hours}:${minutes} ${ampm}`;

    }
    catch (error) {

      logPerformanceError(
        "âŒ Time Format Error:",
        error
      );

      return "-";
    }
  };

  const buildGoogleMapsUrl = (coords, address = "") => {
    if (coords?.lat !== undefined && coords?.lat !== null && coords?.lng !== undefined && coords?.lng !== null) {
      return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    }

    const normalizedAddress = String(address || "").trim();

    if (normalizedAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`;
    }

    return "";
  };

  const formatCoordinate = (value) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "-";
    }

    return numericValue.
    toFixed(6).
    replace(/\.?0+$/, "");
  };

  // =========================
  // LOCATION MODAL HANDLERS
  // =========================
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );

      const data = await res.json();

      return data?.display_name || "";
    } catch (error) {
      logPerformanceError("Reverse Geocode Error:", error);
      return "";
    }
  };

  const openLocationModal = async (emp) => {
    const requestId = ++locationRequestRef.current;
    const employeeId = getEmployeeId(emp);
    const employeeName = getEmployeeName(emp);

    const checkInCoords = getLocationCoords(emp, "checkIn");
    const checkOutCoords = getLocationCoords(emp, "checkOut");
    const checkInAddress = getLocationAddress(emp, "checkIn");
    const checkOutAddress = getLocationAddress(emp, "checkOut");
    const attendanceDate =
    getAttendanceRecordDate(emp) ||
    emp?.date ||
    emp?.attendanceDate ||
    emp?.currentDate ||
    null;
    const hasLocationData = Boolean(
      checkInCoords ||
      checkOutCoords ||
      checkInAddress ||
      checkOutAddress
    );
    const baseData = {
      employeeId,
      employeeName,
      dateLabel: formatDate(attendanceDate),
      hasLocationData,
      emptyMessage:
      "No location information available for this attendance record.",
      checkIn: {
        time: formatCheckTime(getCheckIn(emp)),
        coords: checkInCoords,
        address: checkInAddress
      },
      checkOut: {
        time: formatCheckTime(getCheckOut(emp)),
        coords: checkOutCoords,
        address: checkOutAddress
      }
    };

    if (!hasLocationData) {

    }

    setLocationModalData(baseData);
    setLocationModalOpen(true);

    const needsCheckInAddress =
    checkInCoords && !baseData.checkIn.address;

    const needsCheckOutAddress =
    checkOutCoords && !baseData.checkOut.address;

    if (needsCheckInAddress || needsCheckOutAddress) {
      setLocationAddressLoading(true);

      const [inAddr, outAddr] = await Promise.all([
      needsCheckInAddress ?
      reverseGeocode(checkInCoords.lat, checkInCoords.lng) :
      Promise.resolve(baseData.checkIn.address),
      needsCheckOutAddress ?
      reverseGeocode(checkOutCoords.lat, checkOutCoords.lng) :
      Promise.resolve(baseData.checkOut.address)]
      );

      if (requestId !== locationRequestRef.current) {
        return;
      }

      setLocationModalData((prev) =>
      prev ?
      {
        ...prev,
        checkIn: { ...prev.checkIn, address: inAddr },
        checkOut: { ...prev.checkOut, address: outAddr }
      } :
      prev
      );

      setLocationAddressLoading(false);
    }
  };

  const closeLocationModal = () => {
    locationRequestRef.current += 1;
    setLocationModalOpen(false);
    setLocationModalData(null);
    setLocationAddressLoading(false);
  };

  // safer local YYYY-MM-DD formatter
  const formatDateForInput = (value) => {
    try {
      return getInputDateValue(value || new Date());
    } catch {
      return "";
    }
  };

  // TIME ONLY FOR INPUT
  const formatTimeForInput = (value) => {
    if (!value) return "";

    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return "";

      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const buildDateFromDay = useCallback((dayNumber) => {
    try {
      if (!monthNum || !yearNum || !dayNumber) return "";

      const pad = (n) => String(n).padStart(2, "0");
      return `${yearNum}-${pad(monthNum)}-${pad(dayNumber)}`;
    } catch {
      return "";
    }
  }, [monthNum, yearNum]);

  const getDefaultEditTimes = (checkIn, checkOut) => {
    return {
      checkIn: formatTimeForInput(checkIn) || DEFAULT_CHECKIN,
      checkOut: formatTimeForInput(checkOut) || DEFAULT_CHECKOUT
    };
  };

  // =========================
  // DATE HELPERS
  // =========================
  const todayString = useMemo(() => {
    return getTodayInputValue();
  }, []);

  const isFutureDate = useCallback(
    (dateStr) => {
      if (!dateStr) return false;
      return dateStr > todayString; // safe because YYYY-MM-DD
    },
    [todayString]
  );

  const isFutureDay = useCallback(
    (dayNumber) => {
      const dateStr = buildDateFromDay(dayNumber);
      return isFutureDate(dateStr);
    },
    [buildDateFromDay, isFutureDate]
  );

  // =========================
  // STATUS NORMALIZATION (FIXED)
  // =========================
  const normalizeStatus = (status) => {
    const normalizedStatus = String(status || "").
    trim().
    toLowerCase().
    replace(/[_-]+/g, " ").
    replace(/\s+/g, " ");

    if (!normalizedStatus) {
      return "";
    }

    if (normalizedStatus === "p" || normalizedStatus === "present") {
      return "Present";
    }

    if (normalizedStatus === "a" || normalizedStatus === "absent") {
      return "Absent";
    }

    if (normalizedStatus === "l" || normalizedStatus === "late" || normalizedStatus === "lt") {
      return "Late";
    }

    if (
    normalizedStatus === "hd" ||
    normalizedStatus === "half day" ||
    normalizedStatus === "halfday")
    {
      return "Half Day";
    }

    if (
    normalizedStatus === "ol" ||
    normalizedStatus === "on leave" ||
    normalizedStatus === "leave")
    {
      return "On Leave";
    }

    if (
    normalizedStatus === "loss of pay" ||
    normalizedStatus === "lop")
    {
      return "Loss Of Pay";
    }

    if (
    normalizedStatus === "missed checkout" ||
    normalizedStatus === "missed check out" ||
    normalizedStatus === "mc")
    {
      return "Missed Checkout";
    }

    if (
    normalizedStatus === "late & missed checkout" ||
    normalizedStatus === "late & missed check out" ||
    normalizedStatus === "lmc")
    {
      return "Late & Missed Checkout";
    }

    if (normalizedStatus === "w" || normalizedStatus === "weekend") {
      return "Weekend";
    }

    if (normalizedStatus === "h" || normalizedStatus === "holiday") {
      return "Holiday";
    }

    if (normalizedStatus === "upcoming") {
      return "Upcoming";
    }

    return "";
  };

  const getResolvedStatus = (employeeRecord) => {

    const attendanceDate =
    getAttendanceRecordDate(employeeRecord);

    // FUTURE DATE CHECK
    if (
    attendanceDate &&
    attendanceDate > new Date())
    {

      const futureStatus =
      normalizeStatus(
        employeeRecord?.status ??
        employeeRecord?.attendanceStatus ??
        employeeRecord?.markStatus ??
        employeeRecord?.dayStatus ??
        employeeRecord?.dailyStatus
      );

      // ALLOW WEEKEND/HOLIDAY FROM API
      if (
      futureStatus === "Weekend" ||
      futureStatus === "Holiday")
      {
        return futureStatus;
      }

      return "Upcoming";
    }

    const apiStatus =
    employeeRecord?.status ??
    employeeRecord?.attendanceStatus ??
    employeeRecord?.markStatus ??
    employeeRecord?.dayStatus ??
    employeeRecord?.dailyStatus;

    const normalizedStatus =
    normalizeStatus(apiStatus);

    if (normalizedStatus) {
      return normalizedStatus;
    }

    if (
    getCheckIn(employeeRecord) ||
    getCheckOut(employeeRecord))
    {
      return "Present";
    }

    return "Absent";
  };

  const getStatusClass = (status) => {
    const s = normalizeStatus(status);

    if (s === "Present") return "badge-present";
    if (s === "Absent") return "badge-absent";
    if (s === "On Leave") return "badge-leave";
    if (s === "Late") return "badge-late";
    if (s === "Half Day") return "badge-halfday";
    if (s === "Weekend") return "badge-weekend";
    if (s === "Upcoming") return "badge-upcoming";
    if (s === "Holiday") return "badge-holiday";
    if (s === "Loss Of Pay") return "badge-lop";
    if (s === "Missed Checkout") return "badge-missed-checkout";
    if (s === "Late & Missed Checkout") return "badge-late-missed-checkout";

    return "badge-default";
  };

  const getDayCellText = (dayObj, futureDay = false) => {

    const status =
    normalizeStatus(dayObj?.status || "");

    // SHOW WEEKEND/HOLIDAY FROM API
    if (status === "Weekend") return "W";
    if (status === "Holiday") return "H";
    if (status === "On Leave") return "OL";
    if (status === "Loss Of Pay") return "LOP";
    if (status === "Missed Checkout") return "MC";
    if (status === "Late & Missed Checkout") return "LMC";

    // FUTURE DATES
    if (futureDay) {
      return "";
    }

    if (status === "Present") return "P";
    if (status === "Absent") return "A";
    if (status === "Late") return "L";
    if (status === "Half Day") return "HD";

    return "";
  };

  const getDayCellClass = (dayObj, futureDay = false) => {

    const status =
    normalizeStatus(dayObj?.status || "");

    // FUTURE EMPTY DAYS
    if (futureDay && !status) {
      return "monthly-status upcoming";
    }

    if (status === "Present") return "monthly-status present";
    if (status === "Absent") return "monthly-status absent";
    if (status === "On Leave") return "monthly-status leave";
    if (status === "Late") return "monthly-status late";
    if (status === "Weekend") return "monthly-status weekend";
    if (status === "Half Day") return "monthly-status halfday";
    if (status === "Holiday") return "monthly-status holiday";
    if (status === "Loss Of Pay") return "monthly-status lop";
    if (status === "Missed Checkout") return "monthly-status mc";
    if (status === "Late & Missed Checkout") return "monthly-status lmc";

    return "monthly-status empty";
  };

  useEffect(() => {

    const interval = setInterval(() => {

      setLiveTimer((prev) => prev + 1);

    }, 60000);

    return () => clearInterval(interval);

  }, []);

  useEffect(() => () => {
    detailsAbortRef.current?.abort();
  }, []);
  // =========================
  // FETCH DAILY / MONTHLY
  // =========================
  const fetchTodayAttendance = useCallback(async (requestId, signal) => {
    let canceled = false;
    const timerLabel = "attendance:daily-fetch";

    try {
      setLoading(true);
      startPerformanceTimer(timerLabel);

      const todayDate = selectedDate || getTodayInputValue();

      const res = await getTodayAttendance({
        signal,
        params: {
          date: todayDate
        }
      });

      const raw = Array.isArray(res.data) ?
      res.data :
      Array.isArray(res.data?.data) ?
      res.data.data :
      [];

      if (requestId !== activeRequestRef.current) {
        return;
      }

      setAttendanceData(raw);
    } catch (err) {
      canceled = isCanceledRequest(err);

      if (canceled) {
        return;
      }

      if (requestId !== activeRequestRef.current) {
        return;
      }

      logPerformanceError("Daily Error:", err?.response?.data || err.message);
      setAttendanceData([]);
      toastError("Failed to fetch daily attendance");
    } finally {
      endPerformanceTimer(timerLabel);

      if (!canceled && requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  const fetchMonthlyAttendance = useCallback(async (requestId, signal) => {
    let canceled = false;
    const timerLabel = "attendance:monthly-fetch";

    try {
      setLoading(true);
      startPerformanceTimer(timerLabel);

      const res = await getMonthlyAttendance({
        signal,
        params: { month: monthNum, year: yearNum }
      });

      const raw = Array.isArray(res.data) ?
      res.data :
      Array.isArray(res.data?.data) ?
      res.data.data :
      [];

      if (requestId !== activeRequestRef.current) {
        return;
      }

      setAttendanceData(raw);
    } catch (err) {
      canceled = isCanceledRequest(err);

      if (canceled) {
        return;
      }

      if (requestId !== activeRequestRef.current) {
        return;
      }

      logPerformanceError("Monthly Error:", err?.response?.data || err.message);
      setAttendanceData([]);
      toastError("Failed to fetch monthly attendance");
    } finally {
      endPerformanceTimer(timerLabel);

      if (!canceled && requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  }, [monthNum, yearNum]);

  useEffect(() => {
    const requestId = ++activeRequestRef.current;
    const controller = new AbortController();

    if (viewMode === "daily") {
      fetchTodayAttendance(requestId, controller.signal);
    } else
    if (
    viewMode === "monthly" &&
    monthNum &&
    yearNum)
    {
      fetchMonthlyAttendance(requestId, controller.signal);
    }

    return () => controller.abort();

  }, [
  fetchMonthlyAttendance,
  fetchTodayAttendance,
  viewMode,
  monthNum,
  yearNum,
  selectedDate]
  );

  // =========================
  // FAST FILTERING
  // =========================
  const normalizedSearch = useMemo(
    () => search.toLowerCase().trim(),
    [search]
  );

  const matchesSearch = useCallback(
    (emp) => {
      const name = getEmployeeName(emp).toLowerCase();
      const id = String(getEmployeeId(emp)).toLowerCase();

      // Optimization: reuse normalized search text across every row filter pass.
      if (!normalizedSearch) return true;
      return name.includes(normalizedSearch) || id.includes(normalizedSearch);
    },
    [normalizedSearch]
  );

  const normalizedAttendanceFilter = useMemo(() => {
    const normalizedValue = String(filter || "").
    trim().
    toLowerCase().
    replace(/[_-]+/g, " ").
    replace(/\s+/g, " ");

    if (!normalizedValue || normalizedValue === "all") {
      return "All";
    }

    return normalizedValue;
  }, [filter]);

  const dailySummaryCounts = useMemo(() => {
    const summary = {
      present: 0,
      absent: 0,
      onLeave: 0,
      late: 0,
      halfDay: 0,
      lossOfPay: 0,
      missedCheckout: 0,
      lateMissedCheckout: 0,
      total: 0
    };

    if (viewMode !== "daily") {
      return summary;
    }

    const safeAttendanceData = Array.isArray(attendanceData) ?
    attendanceData :
    [];

    safeAttendanceData.forEach((item) => {
      const status = getResolvedStatus(item);

      summary.total += 1;

      if (status === "Present") summary.present += 1;else
      if (status === "Absent") summary.absent += 1;else
      if (status === "On Leave") summary.onLeave += 1;else
      if (status === "Late") summary.late += 1;else
      if (status === "Half Day") summary.halfDay += 1;else
      if (status === "Loss Of Pay") summary.lossOfPay += 1;else
      if (status === "Missed Checkout") summary.missedCheckout += 1;else
      if (status === "Late & Missed Checkout") summary.lateMissedCheckout += 1;
    });

    return summary;
  }, [attendanceData, viewMode]);

  // =========================
  // NORMALIZE MONTHLY DATA ONCE
  // =========================
  const normalizedMonthlyData = useMemo(() => {

    if (viewMode !== "monthly") {
      return [];
    }

    // SAFE ARRAY CHECK
    const safeAttendanceData =
    Array.isArray(attendanceData) ?
    attendanceData :
    [];

    return safeAttendanceData.map((emp) => {
      const rawDays = Array.isArray(emp?.days) ? emp.days : [];

      const dayMap = {};
      let present = 0;
      let absent = 0;
      let onLeave = 0;
      let late = 0;
      let lossOfPay = 0;
      let missedCheckout = 0;
      let lateMissedCheckout = 0;
      let weekend = 0;
      let halfDay = 0;
      let holiday = 0;

      rawDays.forEach((d) => {
        const dayNum = Number(d?.day);
        if (!dayNum) return;

        const normalizedDay = {
          ...d,
          status: normalizeStatus(d?.status)
        };

        dayMap[dayNum] = normalizedDay;

        if (normalizedDay.status === "Present") present++;else
        if (normalizedDay.status === "Absent") absent++;else
        if (normalizedDay.status === "On Leave") onLeave++;else
        if (normalizedDay.status === "Late") late++;else
        if (normalizedDay.status === "Loss Of Pay") lossOfPay++;else
        if (normalizedDay.status === "Missed Checkout") missedCheckout++;else
        if (normalizedDay.status === "Late & Missed Checkout") lateMissedCheckout++;else
        if (normalizedDay.status === "Weekend") weekend++;else
        if (normalizedDay.status === "Half Day") halfDay++;else
        if (normalizedDay.status === "Holiday") holiday++;
      });

      const totalLeaves = getTotalLeavesForEmployee(emp);
      const usedLeaves = getUsedLeavesForMonth(emp, { onLeave });
      const balanceLeaves = getBalanceLeavesForEmployee(emp, {
        totalLeaves,
        usedLeaves
      });
      const totalWorkingDays = getTotalWorkingDaysForEmployee(emp, {
        present,
        absent,
        onLeave,
        late,
        halfDay,
        lossOfPay,
        missedCheckout,
        lateMissedCheckout
      });

      return {
        ...emp,
        __dayMap: dayMap,
        __counts: {
          present,
          absent,
          onLeave,
          totalLeaves,
          usedLeaves,
          balanceLeaves,
          totalWorkingDays,
          late,
          lossOfPay,
          missedCheckout,
          lateMissedCheckout,
          weekend,
          halfDay,
          holiday
        }
      };
    });
  }, [attendanceData, viewMode]);

  // =========================
  // FILTERED DATA
  // =========================
  const dailyStatusFilteredData = useMemo(() => {
    if (viewMode !== "daily") {
      return [];
    }

    const safeAttendanceData = Array.isArray(attendanceData) ?
    attendanceData :
    [];

    if (normalizedAttendanceFilter === "All") {
      return safeAttendanceData;
    }

    if (!normalizedAttendanceFilter) {
      return [];
    }

    return safeAttendanceData.filter((item) =>
    getResolvedStatus(item).trim().toLowerCase() === normalizedAttendanceFilter
    );
  }, [attendanceData, normalizedAttendanceFilter, viewMode]);

  const filteredDailyData = useMemo(() => {
    if (viewMode !== "daily") {
      return [];
    }

    return dailyStatusFilteredData.filter(matchesSearch);
  }, [dailyStatusFilteredData, matchesSearch, viewMode]);

  const monthlyStatusFilteredData = useMemo(() => {
    if (viewMode !== "monthly") return [];

    if (normalizedAttendanceFilter === "All") {
      return normalizedMonthlyData;
    }

    if (!normalizedAttendanceFilter) {
      return [];
    }

    return normalizedMonthlyData.filter((emp) =>
    Object.values(emp?.__dayMap || {}).some((dayRecord) =>
    normalizeStatus(dayRecord?.status || "").trim().toLowerCase() === normalizedAttendanceFilter
    )
    );
  }, [normalizedAttendanceFilter, normalizedMonthlyData, viewMode]);

  const filteredMonthlyData = useMemo(() => {
    if (viewMode !== "monthly") return [];

    return monthlyStatusFilteredData.filter(matchesSearch);
  }, [monthlyStatusFilteredData, matchesSearch, viewMode]);

  const dailyTotalPages = useMemo(() => {
    return Math.max(
      1,
      Math.ceil(
        filteredDailyData.length /
        ATTENDANCE_PAGE_SIZE
      )
    );
  }, [filteredDailyData.length, ATTENDANCE_PAGE_SIZE]);

  const monthlyTotalPages = useMemo(() => {
    return Math.max(
      1,
      Math.ceil(
        filteredMonthlyData.length /
        ATTENDANCE_PAGE_SIZE
      )
    );
  }, [filteredMonthlyData.length, ATTENDANCE_PAGE_SIZE]);

  const paginatedDailyData = useMemo(() => {
    const startIndex =
    (dailyPage - 1) *
    ATTENDANCE_PAGE_SIZE;

    return filteredDailyData.slice(
      startIndex,
      startIndex + ATTENDANCE_PAGE_SIZE
    );
  }, [
  filteredDailyData,
  dailyPage,
  ATTENDANCE_PAGE_SIZE]
  );

  const paginatedMonthlyData = useMemo(() => {
    const startIndex =
    (monthlyPage - 1) *
    ATTENDANCE_PAGE_SIZE;

    return filteredMonthlyData.slice(
      startIndex,
      startIndex + ATTENDANCE_PAGE_SIZE
    );
  }, [
  filteredMonthlyData,
  monthlyPage,
  ATTENDANCE_PAGE_SIZE]
  );

  const employeeDirectory = useMemo(() => {
    const source =
    viewMode === "monthly" ?
    normalizedMonthlyData :
    Array.isArray(attendanceData) ?
    attendanceData :
    [];
    const lookup = new Map();

    source.forEach((emp) => {
      const employeeId = String(getEmployeeId(emp) || "").trim();
      if (!employeeId) return;

      const employeeName = String(getEmployeeName(emp) || "").trim();
      const normalizedId = employeeId.toLowerCase();

      if (!lookup.has(normalizedId)) {
        lookup.set(normalizedId, {
          id: employeeId,
          name: employeeName
        });
      }

      if (employeeName) {
        const normalizedName = employeeName.toLowerCase();

        if (!lookup.has(normalizedName)) {
          lookup.set(normalizedName, {
            id: employeeId,
            name: employeeName
          });
        }
      }
    });

    return lookup;
  }, [attendanceData, normalizedMonthlyData, viewMode]);

  const resolveEmployeeId = useCallback(
    (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized) return "";

      const matchedEmployee =
      employeeDirectory.get(normalized);

      return matchedEmployee?.id || String(value).trim();
    },
    [employeeDirectory]
  );

  const defaultReportMonth = useMemo(() => {
    const currentDate = new Date();

    return getReportMonthValue(
      yearNum || currentDate.getFullYear(),
      monthNum || currentDate.getMonth() + 1
    );
  }, [
  monthNum,
  yearNum]
  );

  const reportMonthOptions = useMemo(() => {
    return buildReportMonthOptions(downloadReportYear);
  }, [downloadReportYear]);

  const reportYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 5 }, (_, index) => {
      const year = currentYear - index;

      return {
        value: year,
        label: year
      };
    });
  }, []);

  const selectedReportMonthMeta = useMemo(() => {
    return parseReportMonthValue(downloadReportMonth);
  }, [downloadReportMonth]);

  const reportWeeks = useMemo(() => {
    return buildReportWeeks(downloadReportMonth);
  }, [downloadReportMonth]);

  const selectedReportWeek = useMemo(() => {
    return reportWeeks.find(
      (week) => week.id === selectedReportWeekId
    ) || null;
  }, [
  reportWeeks,
  selectedReportWeekId]
  );

  useEffect(() => {
    if (!downloadModalOpen) {
      setDownloadReportMonth(
        getReportMonthValue(
          downloadReportYear,
          new Date().getMonth() + 1
        )
      );
    }
  }, [
  defaultReportMonth,
  downloadModalOpen]
  );

  useEffect(() => {
    setSelectedReportWeekId("");
  }, [
  downloadReportMonth,
  downloadReportType]
  );

  const openDownloadModal = useCallback(() => {
    setDownloadReportType("Daily");
    setDownloadReportMonth(defaultReportMonth);
    setSelectedReportWeekId("");
    setDownloadReportDate(getTodayInputValue());
    setDownloadModalOpen(true);
  }, [defaultReportMonth]);

  const closeDownloadModal = useCallback(() => {
    if (downloadingReport) {
      return;
    }

    setDownloadModalOpen(false);
  }, [downloadingReport]);

  const handleAttendanceReportDownload = useCallback(async () => {
    if (!selectedReportMonthMeta && downloadReportType !== "Daily") {
      toastWarning("Select a month to download attendance.");
      return;
    }

    if (
    downloadReportType === "Weekly" &&
    !selectedReportWeek)
    {
      toastWarning("Select a week to download attendance.");
      return;
    }

    try {
      setDownloadingReport(downloadReportType.toLowerCase());

      if (downloadReportType === "Daily") {
        const targetDate = downloadReportDate || getTodayInputValue();

        const response = await downloadDailyAttendance({
          params: { date: targetDate },
          responseType: "arraybuffer"
        });

        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `daily-attendance-${targetDate}.xlsx`;
        link.click();

        window.URL.revokeObjectURL(url);

        toastSuccess("Daily attendance downloaded successfully.");

      } else
      if (downloadReportType === "Monthly") {

        await downloadMonthlyAttendanceReport({
          month: selectedReportMonthMeta.month,
          year: selectedReportMonthMeta.year,
          token
        });

      } else
      if (downloadReportType === "Weekly") {

        if (!selectedReportWeek) {
          toastWarning("Select a week");
          return;
        }

        await downloadWeeklyAttendanceReport({
          token,
          params: {
            weekStartDate: selectedReportWeek.fromDate
          }
        });

      } else {
        await downloadWeeklyAttendanceReport({
          token,
          params: {
            weekStartDate: selectedReportWeek.fromDate
          },
          fallbackFileName:
          `weekly-attendance-${selectedReportWeek.fromDate}.xlsx`,
          forceFallbackFileName: true
        });

        toastSuccess("Weekly attendance downloaded successfully.");
      }

      setDownloadModalOpen(false);
    } catch (error) {
      logPerformanceError(
        "Attendance report download failed:",
        error?.response?.data || error.message
      );

      toastError(
        await getDownloadErrorMessage(
          error,
          "Failed to download attendance report."
        )
      );
    } finally {
      setDownloadingReport("");
    }
  }, [
  downloadReportType,
  selectedReportMonthMeta,
  selectedReportWeek,
  token,
  downloadReportDate]
  );

  // =========================
  // ADMIN UPDATE ATTENDANCE
  // =========================
  const openEditModal = (emp) => {
    detailsRequestRef.current += 1;
    detailsAbortRef.current?.abort();
    detailsAbortRef.current = null;
    setDetailsLoading(false);
    setDetailsModalOpen(false);
    setSelectedAttendance(null);

    const employeeId = getEmployeeId(emp);
    const checkIn = getCheckIn(emp);
    const checkOut = getCheckOut(emp);
    const { checkIn: defaultIn, checkOut: defaultOut } = getDefaultEditTimes(
      checkIn,
      checkOut
    );

    const selectedDate = formatDateForInput(checkIn || checkOut || new Date());

    if (isFutureDate(selectedDate)) {
      toastWarning("You cannot edit attendance for a future date");
      return;
    }

    setSelectedEmployee(emp);
    setEditForm({
      employeeId,
      date: selectedDate,
      checkIn: defaultIn,
      checkOut: defaultOut
    });
    setEditModalOpen(true);
  };

  const openMonthlyDayEditModal = (emp, dayObj, dayNumber) => {
    detailsRequestRef.current += 1;
    setDetailsLoading(false);
    setDetailsModalOpen(false);
    setSelectedAttendance(null);

    const employeeId = getEmployeeId(emp);
    const selectedDate = buildDateFromDay(dayNumber);

    if (isFutureDate(selectedDate)) {
      toastWarning("You cannot edit attendance for a future date");
      return;
    }

    const checkIn =
    dayObj?.checkIn || dayObj?.checkInTime || dayObj?.inTime || null;

    const checkOut =
    dayObj?.checkOut || dayObj?.checkOutTime || dayObj?.outTime || null;

    const { checkIn: defaultIn, checkOut: defaultOut } = getDefaultEditTimes(
      checkIn,
      checkOut
    );

    setSelectedEmployee(emp);
    setEditForm({
      employeeId,
      date: selectedDate,
      checkIn: defaultIn,
      checkOut: defaultOut
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedEmployee(null);
    setUpdateLoading(false);
    setEditForm({
      employeeId: "",
      date: "",
      checkIn: "",
      checkOut: ""
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const openAttendanceDetails = async (emp) => {

    const employeeId =
    getEmployeeId(emp);

    const requestId =
    ++detailsRequestRef.current;
    detailsAbortRef.current?.abort();
    const controller = new AbortController();
    detailsAbortRef.current = controller;

    const baseAttendanceDetails =
    buildAttendanceDetailsData(emp);

    setDetailsMonth("");
    setSelectedAttendance(baseAttendanceDetails);
    setDetailsLoading(true);
    setDetailsModalOpen(true);

    try {

      const response =
      await getWorkingHours(employeeId, {
        signal: controller.signal
      });

      const workingHoursData =
      response?.data || {};

      if (controller.signal.aborted) {
        return;
      }

      if (requestId !== detailsRequestRef.current) {
        return;
      }

      setSelectedAttendance({
        ...baseAttendanceDetails,
        totalHours:
        workingHoursData?.monthlyWorkingHours ||
        baseAttendanceDetails.totalHours,
        weeklyHours:
        workingHoursData?.weeklyWorkingHours ||
        baseAttendanceDetails.weeklyHours
      });

    }
    catch (error) {

      if (controller.signal.aborted) {
        return;
      }

      if (requestId !== detailsRequestRef.current) {
        return;
      }

      logPerformanceError(
        "Working Hours API Error:",
        error
      );

      toastError(
        "Failed to fetch attendance details"
      );

    } finally
    {

      if (
      requestId === detailsRequestRef.current &&
      detailsAbortRef.current === controller)
      {
        detailsAbortRef.current = null;
        setDetailsLoading(false);
      }

    }

  };

  const closeAttendanceDetails = useCallback(() => {
    detailsRequestRef.current += 1;
    detailsAbortRef.current?.abort();
    detailsAbortRef.current = null;
    setDetailsMonth("");
    setDetailsLoading(false);
    setDetailsModalOpen(false);
    setSelectedAttendance(null);
  }, []);

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    if (name === "date" && isFutureDate(value)) {
      toastWarning("Future attendance cannot be edited");
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateAttendance = async () => {
    try {
      const resolvedEmployeeId = resolveEmployeeId(editForm.employeeId);

      if (!resolvedEmployeeId || !editForm.date) {
        toastWarning("Employee ID and Date are required");
        return;

      }

      if (isFutureDate(editForm.date)) {
        toastError("You cannot update attendance for a future date");
        return;
      }

      if (
      editForm.checkIn &&
      editForm.checkOut &&
      editForm.checkOut < editForm.checkIn)
      {
        toastError("Check Out time cannot be earlier than Check In time");
        return;
      }

      setUpdateLoading(true);

      const isAbsent =
      editForm.checkIn === "00:00" &&
      editForm.checkOut === "00:00";

      const checkInDateTime =
      isAbsent ?
      null :
      editForm.checkIn ?
      `${editForm.date}T${editForm.checkIn}:00` :
      null;

      const checkOutDateTime =
      isAbsent ?
      null :
      editForm.checkOut ?
      `${editForm.date}T${editForm.checkOut}:00` :
      null;

      await updateAttendance(
        {},
        {
          params: {
            employeeId: resolvedEmployeeId,
            date: editForm.date,
            checkIn: checkInDateTime,
            checkOut: checkOutDateTime
          }
        }
      );

      toastSuccess("Attendance updated successfully");
      closeEditModal();

      if (viewMode === "daily") {
        const requestId = ++activeRequestRef.current;
        await fetchTodayAttendance(requestId);
      } else {
        const requestId = ++activeRequestRef.current;
        await fetchMonthlyAttendance(requestId);
      }
    } catch (err) {
      logPerformanceError(
        "Update Attendance Error:",
        err?.response?.data || err.message
      );

      const backendMessage =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data;

      if (
      String(backendMessage || "").
      toLowerCase().
      includes("future"))
      {
        toastError("You cannot update attendance for a future date");
      } else {
        toastError(
          backendMessage || "Failed to update attendance. Please check the values."
        );
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  // =========================
  // MONTHLY HELPERS
  // =========================
  const daysInMonth = useMemo(() => {
    if (!monthNum || !yearNum) return 31;
    return new Date(yearNum, monthNum, 0).getDate();
  }, [monthNum, yearNum]);

  const daysArray = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const monthLabel = useMemo(() => {
    if (!monthNum || !yearNum) return "";
    return formatMonthYear(new Date(yearNum, monthNum - 1, 1), "");
  }, [monthNum, yearNum]);

  const defaultDetailsMonth = useMemo(() => {
    if (monthNum && yearNum) {
      return `${yearNum}-${String(monthNum).padStart(2, "0")}`;
    }

    return getMonthValue(new Date());
  }, [monthNum, yearNum]);

  const availableDetailMonths = useMemo(() => {

    if (!selectedAttendance?.days) {
      return [];
    }

    const uniqueMonths = new Map();

    selectedAttendance.days.forEach((day) => {

      const currentDate =
      day?.resolvedDate ||
      getAttendanceRecordDate(day);

      if (!currentDate) return;

      const year =
      currentDate.getFullYear();

      const month =
      String(currentDate.getMonth() + 1).
      padStart(2, "0");

      const value =
      `${year}-${month}`;

      if (!uniqueMonths.has(value)) {

        uniqueMonths.set(value, {
          value,
          label: formatMonthYear(
            new Date(year, Number(month) - 1, 1),
            value
          )
        });

      }

    });

    return Array.from(
      uniqueMonths.values()
    ).sort((a, b) =>
    b.value.localeCompare(a.value)
    );

  }, [selectedAttendance]);

  const selectedDetailsMonth = useMemo(() => {
    if (
    detailsMonth &&
    availableDetailMonths.some(
      (monthOption) =>
      monthOption.value === detailsMonth
    ))
    {
      return detailsMonth;
    }

    if (
    availableDetailMonths.some(
      (monthOption) =>
      monthOption.value === defaultDetailsMonth
    ))
    {
      return defaultDetailsMonth;
    }

    return (
      availableDetailMonths[0]?.value ||
      defaultDetailsMonth);

  }, [
  detailsMonth,
  availableDetailMonths,
  defaultDetailsMonth]
  );

  const selectedDetailsMonthMeta = useMemo(() => {
    const [selectedYear, selectedMonthNumber] =
    String(selectedDetailsMonth || "").
    split("-").
    map(Number);

    if (
    !selectedYear ||
    !selectedMonthNumber)
    {
      return null;
    }

    return {
      year: selectedYear,
      month: selectedMonthNumber
    };
  }, [selectedDetailsMonth]);

  const handleDetailsMonthChange = useCallback((e) => {
    const selectedMonth =
    e?.target?.value || "";

    setDetailsMonth((currentMonth) => {
      if (
      selectedMonth &&
      availableDetailMonths.some(
        (monthOption) =>
        monthOption.value === selectedMonth
      ))
      {
        return selectedMonth;
      }

      if (
      currentMonth &&
      availableDetailMonths.some(
        (monthOption) =>
        monthOption.value === currentMonth
      ))
      {
        return currentMonth;
      }

      return defaultDetailsMonth;
    });
  }, [
  availableDetailMonths,
  defaultDetailsMonth]
  );

  const detailsDaysInSelectedMonth = useMemo(() => {
    if (!selectedDetailsMonthMeta) {
      return daysInMonth;
    }

    return new Date(
      selectedDetailsMonthMeta.year,
      selectedDetailsMonthMeta.month,
      0
    ).getDate();
  }, [selectedDetailsMonthMeta, daysInMonth]);

  useEffect(() => {

    setDailyPage(1);
    setMonthlyPage(1);

  }, [
  search,
  filter,
  viewMode,
  monthNum,
  yearNum]
  );

  useEffect(() => {
    if (dailyPage > dailyTotalPages) {
      setDailyPage(dailyTotalPages);
    }
  }, [dailyPage, dailyTotalPages]);

  useEffect(() => {
    if (monthlyPage > monthlyTotalPages) {
      setMonthlyPage(monthlyTotalPages);
    }
  }, [monthlyPage, monthlyTotalPages]);

  useEffect(() => {

    if (
    !detailsModalOpen ||
    !availableDetailMonths.length)
    {
      return;
    }

    setDetailsMonth((currentMonth) => {
      if (
      currentMonth &&
      availableDetailMonths.some(
        (monthOption) =>
        monthOption.value === currentMonth
      ))
      {
        return currentMonth;
      }

      if (
      availableDetailMonths.some(
        (monthOption) =>
        monthOption.value === defaultDetailsMonth
      ))
      {
        return defaultDetailsMonth;
      }

      return availableDetailMonths[0].value;
    });

  }, [
  detailsModalOpen,
  availableDetailMonths,
  defaultDetailsMonth]
  );

  useEffect(() => {

    if (
    !selectedDetailsMonthMeta)
    return;

    if (detailsFilter === "Weekly") {

      const today = new Date();
      const anchorDate = new Date(
        selectedDetailsMonthMeta.year,
        selectedDetailsMonthMeta.month - 1,
        Math.min(
          today.getDate(),
          detailsDaysInSelectedMonth
        )
      );

      const day =
      anchorDate.getDay();

      const firstDay = new Date(anchorDate);
      const diff =
      anchorDate.getDate() - day + (day === 0 ? -6 : 1);

      firstDay.setDate(diff);

      const lastDay =
      new Date(firstDay);

      lastDay.setDate(
        firstDay.getDate() + 6
      );

      setDetailsFromDate(
        getInputDateValue(firstDay)
      );

      setDetailsToDate(
        getInputDateValue(lastDay)
      );

    } else

    {

      setDetailsFromDate(
        `${selectedDetailsMonthMeta.year}-${String(selectedDetailsMonthMeta.month).padStart(2, "0")}-01`
      );

      setDetailsToDate(
        `${selectedDetailsMonthMeta.year}-${String(selectedDetailsMonthMeta.month).padStart(2, "0")}-${String(detailsDaysInSelectedMonth).padStart(2, "0")}`
      );

    }

  }, [
  detailsFilter,
  selectedDetailsMonthMeta,
  detailsDaysInSelectedMonth]
  );

  const filteredDetailDays = useMemo(() => {

    if (!selectedAttendance?.days) {
      return [];
    }

    return selectedAttendance.days.filter((d) => {

      const currentDate =
      d?.resolvedDate ||
      getAttendanceRecordDate(d);

      const formattedDate =
      getInputDateValue(currentDate);

      if (!formattedDate) {
        return true;
      }

      // WEEKLY FILTER
      if (detailsFilter === "Weekly") {

        if (
        !detailsFromDate ||
        !detailsToDate)
        {
          return true;
        }

        return (
          formattedDate >= detailsFromDate &&
          formattedDate <= detailsToDate);

      }

      // MONTHLY FILTER
      if (
      detailsFromDate &&
      detailsToDate)
      {

        return (
          formattedDate >= detailsFromDate &&
          formattedDate <= detailsToDate);

      }

      return true;

    });

  }, [
  selectedAttendance,
  detailsFilter,
  detailsFromDate,
  detailsToDate,
  yearNum,
  monthNum]
  );

  const detailSummary = useMemo(() => {
    let totalHours = 0;
    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let late = 0;
    let halfDay = 0;
    let lossOfPay = 0;
    let missedCheckout = 0;
    let lateMissedCheckout = 0;
    let weekends = 0;
    let holidays = 0;

    filteredDetailDays.forEach((dayRecord) => {
      const status =
      dayRecord?.resolvedStatus ||
      getResolvedStatus(dayRecord);

      if (status === "Present") present++;
      if (status === "Absent") absent++;
      if (status === "On Leave") onLeave++;
      if (status === "Late") late++;
      if (status === "Half Day") halfDay++;
      if (status === "Loss Of Pay") lossOfPay++;
      if (status === "Missed Checkout") missedCheckout++;
      if (status === "Late & Missed Checkout") lateMissedCheckout++;
      if (status === "Weekend") weekends++;
      if (status === "Holiday") holidays++;

      totalHours +=
      Number(dayRecord?.resolvedHours || 0);
    });

    const shouldUseDefaultMonthlyTotal =
    detailsFilter === "Monthly" &&
    selectedDetailsMonth === defaultDetailsMonth &&
    selectedAttendance?.totalHours;

    return {
      totalHours:
      shouldUseDefaultMonthlyTotal ?
      selectedAttendance.totalHours :
      `${totalHours.toFixed(1)} hrs`,
      present,
      absent,
      onLeave,
      late,
      halfDay,
      lossOfPay,
      missedCheckout,
      lateMissedCheckout,
      weekends,
      holidays
    };
  }, [
  filteredDetailDays,
  selectedAttendance,
  detailsFilter,
  selectedDetailsMonth,
  defaultDetailsMonth]
  );

  const filteredWeeklyBreakdown = useMemo(() => {
    if (detailsFilter !== "Monthly") {
      return [];
    }

    const weeklyMap = {};

    filteredDetailDays.forEach((dayRecord) => {
      const currentDate =
      dayRecord?.resolvedDate;

      if (!currentDate) {
        return;
      }

      const firstDay =
      new Date(currentDate);

      firstDay.setDate(
        currentDate.getDate() -
        currentDate.getDay() + 1
      );

      const weekKey =
      firstDay.toDateString();

      if (!weeklyMap[weekKey]) {

        weeklyMap[weekKey] = {
          week:
          Object.keys(weeklyMap).length + 18,
          start: firstDay,
          end: new Date(firstDay),
          hours: 0
        };

        weeklyMap[weekKey].end.setDate(
          firstDay.getDate() + 6
        );
      }

      weeklyMap[weekKey].hours +=
      Number(dayRecord?.resolvedHours || 0);
    });

    return Object.values(weeklyMap);
  }, [filteredDetailDays, detailsFilter]);

  const renderPaginationControls = (
  currentPage,
  totalPages,
  onPrevious,
  onNext) =>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      margin: "18px 0 24px 0"
    }}>
    
      <button
      type="button"
      onClick={onPrevious}
      disabled={currentPage === 1}
      style={{
        border: "1px solid var(--attendance-border)",
        background:
        currentPage === 1 ?
        "var(--attendance-summary)" :
        "var(--attendance-card)",
        color: "var(--attendance-text)",
        padding: "8px 14px",
        borderRadius: "10px",
        cursor: currentPage === 1 ? "not-allowed" : "pointer",
        fontWeight: 600
      }}>
      
        Previous
      </button>

      <span
      style={{
        fontSize: "14px",
        fontWeight: 600,
        color: "var(--attendance-muted)"
      }}>
      
        Page {currentPage} of {totalPages}
      </span>

      <button
      type="button"
      onClick={onNext}
      disabled={currentPage === totalPages}
      style={{
        border: "1px solid var(--attendance-border)",
        background:
        currentPage === totalPages ?
        "var(--attendance-summary)" :
        "var(--attendance-card)",
        color: "var(--attendance-text)",
        padding: "8px 14px",
        borderRadius: "10px",
        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
        fontWeight: 600
      }}>
      
        Next
      </button>
    </div>;

  const getDayName = (day) => {
    if (!monthNum || !yearNum || !day) return "";

    const date = new Date(yearNum, monthNum - 1, day);

    return date.toLocaleDateString("en-US", {
      weekday: "short"
    });
  };

  const getHour = (time) => {
    return time?.split(":")[0] || "09";
  };

  const getMinute = (time) => {
    return time?.split(":")[1] || "00";
  };

  const updateTime = (
  field,
  type,
  value) =>
  {

    const current =
    editForm[field] || "00:00";

    const [hour, minute] =
    current.split(":");

    const newHour =
    type === "hour" ?
    value :
    hour;

    const newMinute =
    type === "minute" ?
    value :
    minute;

    setEditForm((prev) => ({
      ...prev,
      [field]: `${newHour}:${newMinute}`
    }));
  };

  useEffect(() => {

    const scrollToActive = (
    ref,
    activeValue) =>
    {

      if (!ref?.current) return;

      const activeElement =
      ref.current.querySelector(
        `[data-value="${activeValue}"]`
      );

      if (activeElement) {

        activeElement.scrollIntoView({
          block: "center",
          behavior: "smooth"
        });
      }
    };

    scrollToActive(
      checkInHourRef,
      getHour(editForm.checkIn)
    );

    scrollToActive(
      checkInMinuteRef,
      getMinute(editForm.checkIn)
    );

    scrollToActive(
      checkOutHourRef,
      getHour(editForm.checkOut)
    );

    scrollToActive(
      checkOutMinuteRef,
      getMinute(editForm.checkOut)
    );

  }, [editForm]);

  // Small inline map-pin SVG icon used on the location/view button so it
  // renders consistently across OS/browsers (emoji rendering varies a lot,
  // which was part of why the button looked misaligned).
  const MapPinIcon = () =>
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>;

  return (
    <>
<div className="attendance-table">
        {/* =========================================
          TOP SECTION
          ========================================= */}

        <div className="attendance-top-section">

          {/* LEFT SIDE SUMMARY CARDS */}

          {viewMode === "daily" ?

          loading ?

          <div className="attendance-summary-skeleton">

                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) =>
            <div
              key={item}
              className="attendance-summary-box skeleton-card">
              
                    <div className="skeleton skeleton-label"></div>
                    <div className="skeleton skeleton-number"></div>
                  </div>
            )}

              </div> :

          <div className="attendance-summary-top">

                {/* DAILY SUMMARY CARDS */}

                <div className="attendance-summary-box present">
                  <span className="summary-label">Present</span>
                  <h3>{dailySummaryCounts.present}</h3>
                </div>

                <div className="attendance-summary-box absent">
                  <span className="summary-label">Absent</span>
                  <h3>{dailySummaryCounts.absent}</h3>
                </div>

                <div className="attendance-summary-box leave">
                  <span className="summary-label">On Leave</span>
                  <h3>{dailySummaryCounts.onLeave}</h3>
                </div>

                <div className="attendance-summary-box late">
                  <span className="summary-label">Late</span>
                  <h3>{dailySummaryCounts.late}</h3>
                </div>

                <div className="attendance-summary-box halfday">
                  <span className="summary-label">Half Day</span>
                  <h3>{dailySummaryCounts.halfDay}</h3>
                </div>

                <div className="attendance-summary-box lop">
                  <span className="summary-label">Loss Of Pay</span>
                  <h3>{dailySummaryCounts.lossOfPay}</h3>
                </div>

                <div className="attendance-summary-box mc">
                  <span className="summary-label">Missed Checkout</span>
                  <h3>{dailySummaryCounts.missedCheckout}</h3>
                </div>

                <div className="attendance-summary-box lmc">
                  <span className="summary-label">Late & Missed Checkout</span>
                  <h3>{dailySummaryCounts.lateMissedCheckout}</h3>
                </div>

                <div className="attendance-summary-box total">
                  <span className="summary-label">Total</span>
                  <h3>{dailySummaryCounts.total}</h3>
                </div>
              </div> :

          <div className="monthly-legend-top">

              <span><i className="legend-dot present"></i> Present</span>

              <span><i className="legend-dot absent"></i> Absent</span>

              <span><i className="legend-dot late"></i> Late</span>

              <span><i className="legend-dot halfday"></i> Half Day</span>

              <span><i className="legend-dot leave"></i> On Leave</span>

              <span><i className="legend-dot lop"></i> Loss Of Pay</span>

              <span><i className="legend-dot mc"></i> Missed Checkout</span>

              <span><i className="legend-dot lmc"></i> Late & Missed Checkout</span>

              <span><i className="legend-dot weekend"></i> Weekend</span>

              <span><i className="legend-dot holiday"></i> Holiday</span>

              <span><i className="legend-dot upcoming"></i> Upcoming</span>

              <span><i className="legend-dot leave-total"></i> TL - Total Leaves</span>

              <span><i className="legend-dot leave-on-leave"></i> OL - On Leave</span>

              <span><i className="legend-dot leave-used"></i> UL - Used Leaves</span>

              <span><i className="legend-dot leave-balance"></i> BL - Balance Leaves</span>

              <span><i className="legend-dot working-days"></i> TW - Total Working Days</span>

            </div>

          }

          {/* RIGHT SIDE BUTTONS */}

          <div className="attendance-table-actions">

            <button
              type="button"
              className="attendance-download-btn attendance-primary-report-btn"
              onClick={openDownloadModal}>
              
              Download
            </button>

            <button
              type="button"
              className="attendance-download-btn attendance-primary-report-btn"
              onClick={() =>
              document.
              getElementById("monthlyAttendanceUpload")?.
              click()
              }>
              
              Upload Monthly
            </button>

            <input
              id="monthlyAttendanceUpload"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={async (e) => {
                try {

                  const file = e.target.files?.[0];

                  if (!file) return;

                  const formData = new FormData();
                  formData.append("file", file);

                  await uploadMonthlyAttendance(formData, {
                    params: {
                      month: monthNum || new Date().getMonth() + 1,
                      year: yearNum || new Date().getFullYear()
                    },
                    headers: {
                      "Content-Type": "multipart/form-data"
                    }
                  });

                  toastSuccess(
                    "Monthly attendance uploaded successfully"
                  );

                } catch (error) {

                  toastError(
                    "Failed to upload monthly attendance"
                  );

                }
              }} />
            

          </div>

        </div>

        {viewMode === "daily" ?
        <>
            <div className="attendance-table-scroll">
              <table className="attendance-daily-table">
                <colgroup>
                  <col className="attendance-col-employee" />
                  <col className="attendance-col-status" />
                  <col className="attendance-col-time" />
                  <col className="attendance-col-time" />
                  <col className="attendance-col-hours" />
                  <col className="attendance-col-location" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className="attendance-daily-employee-cell">
                      Employee
                    </th>
                    <th scope="col" className="attendance-daily-status-cell">
                      Status
                    </th>
                    <th scope="col" className="attendance-daily-time-cell">
                      Check In
                    </th>
                    <th scope="col" className="attendance-daily-time-cell">
                      Check Out
                    </th>
                    <th scope="col" className="attendance-daily-hours-cell">
                      Hours Worked
                    </th>
                    <th scope="col" className="attendance-daily-location-cell">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ?
                <tr>
                      <td
                    className="attendance-empty attendance-empty-table"
                    colSpan={6}>
                    
                        Loading...
                      </td>
                    </tr> :
                filteredDailyData.length === 0 ?
                <tr>
                      <td
                    className="attendance-empty attendance-empty-table"
                    colSpan={6}>
                    
                        No Data
                      </td>
                    </tr> :

                paginatedDailyData.map((emp, i) => {
                  const finalStatus = getResolvedStatus(emp);
                  const employeeName = getEmployeeName(emp);
                  const employeeId = getEmployeeId(emp);
                  const employeeDept = getEmployeeDept(emp);

                  return (
                    <tr
                      key={`${employeeId}-${employeeName}-${i}`}
                      className="attendance-daily-row">
                      
                          <td className="attendance-daily-employee-cell">
                            <div className="attendance-daily-employee">
                              <div className="attendance-daily-avatar">
                                {employeeName.charAt(0).toUpperCase()}
                              </div>

                              <div className="attendance-daily-employee-meta">
                                <div
                              className="attendance-daily-employee-name"
                              title={employeeName}>
                              
                                  {employeeName}
                                </div>

                                <div className="attendance-daily-employee-id">
                                  EMP ID: {employeeId}
                                </div>

                                <div className="attendance-daily-employee-designation">
                                  {employeeDept}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="attendance-daily-status-cell">
                            <span className={`status-badge ${getStatusClass(finalStatus)}`}>
                              {finalStatus}
                            </span>
                          </td>

                          <td className="attendance-daily-time-cell">
                            <span className="attendance-daily-time-value">
                              {formatCheckTime(getCheckIn(emp))}
                            </span>
                          </td>

                          <td className="attendance-daily-time-cell">
                            <span className="attendance-daily-time-value">
                              {formatCheckTime(getCheckOut(emp))}
                            </span>
                          </td>

                          <td className="attendance-daily-hours-cell">
                            <div className="attendance-daily-hours-value">
                              <span className="attendance-daily-hours-text">
                                {formatHoursWorked(emp)}
                              </span>
                            </div>
                          </td>

                          <td className="attendance-daily-location-cell">
                            <button
                          type="button"
                          className="attendance-location-btn attendance-daily-view-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            openLocationModal(emp);
                          }}>
                          
                              <MapPinIcon />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>);

                })
                }
                </tbody>
              </table>
            </div>

            {!loading && filteredDailyData.length > 0 && renderPaginationControls(
            dailyPage,
            dailyTotalPages,
            () => setDailyPage((prev) => Math.max(prev - 1, 1)),
            () => setDailyPage((prev) => Math.min(prev + 1, dailyTotalPages))
          )}
          </> :

        <div className="monthly-wrapper">
            <div className="monthly-title-row">
              <h3>Monthly Attendance</h3>
              <span className="monthly-month-label">{monthLabel}</span>
            </div>

            {loading ?
          <p className="attendance-empty">Loading monthly attendance...</p> :
          filteredMonthlyData.length === 0 ?
          <p className="attendance-empty">No monthly data found</p> :

          <>
                <div className="monthly-scroll">
                  <div
                className="monthly-grid"
                style={{
                  gridTemplateColumns: `260px repeat(${daysArray.length}, 34px) 42px 42px 42px 42px 42px 42px 42px 42px 46px 46px 52px 42px 42px 42px 76px`
                }}>
                
                    <div
                  className="monthly-head employee-col sticky-col"
                  style={{
                    position: "sticky",
                    top: 0,
                    left: 0,
                    zIndex: 9999,
                    background: "var(--attendance-header)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: "1px solid var(--attendance-border)",
                    boxSizing: "border-box",
                    color: "var(--attendance-text)"
                  }}>
                  
                      EMPLOYEE
                    </div>

                    {daysArray.map((day) =>
                <div
                  key={day}
                  className="monthly-head day-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-header)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    color: "var(--attendance-text)"
                  }}>
                  
                        <span className="monthly-day-number">
                          {day}
                        </span>

                        <span className="monthly-day-name">
                          {getDayName(day)}
                        </span>
                      </div>
                )}
                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      P
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      A
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      L
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      HD
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      TL
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      OL
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      UL
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      BL
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      LOP
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      MC
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      LMC
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      W
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      H
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      TW
                    </div>

                    <div
                  className="monthly-head summary-head"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 999,
                    background: "var(--attendance-summary)",
                    height: "72px",
                    minHeight: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--attendance-text)"
                  }}>
                  
                      ACTION
                    </div>

                    {paginatedMonthlyData.map((emp, index) => {
                  const counts = emp.__counts || {};

                  return (
                    <React.Fragment
                      key={`${getEmployeeId(emp)}-${getEmployeeName(emp)}-${index}`}>
                      
                          <div
                        className="monthly-employee-cell sticky-col attendance-employee-click"
                        onClick={() => openAttendanceDetails(emp)}>
                        
                            <div className="attendance-employee">
                              <div className="avatar">
                                {getEmployeeName(emp).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div
                              className="emp-name"
                              title={getEmployeeName(emp)}>
                              
                                  {getEmployeeName(emp)}
                                </div>
                                <div className="emp-dept">
                                  {getEmployeeId(emp) || getEmployeeDept(emp)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {daysArray.map((day) => {
                        const dayObj = emp.__dayMap?.[day];
                        const futureDay = isFutureDay(day);

                        const status =
                        futureDay &&
                        !normalizeStatus(dayObj?.status) ?
                        "Upcoming" :
                        normalizeStatus(dayObj?.status);

                        return (
                          <div
                            key={`${getEmployeeId(emp)}-${day}`}
                            className={`monthly-day-cell ${futureDay ? "disabled-future-day" : "clickable-day"}`
                            }
                            title={
                            futureDay ?
                            `Day ${day}: Future date cannot be edited` :
                            `Day ${day}: ${status || "-"} (Click to Edit)`
                            }
                            onClick={() => {

                              if (
                              status === "Weekend" ||
                              status === "Holiday")
                              {

                                toastError(
                                  `${status} attendance cannot be edited`
                                );

                                return;
                              }

                              if (!futureDay) {

                                openMonthlyDayEditModal(
                                  emp,
                                  dayObj,
                                  day
                                );

                              } else {

                                toastWarning(
                                  "You cannot edit attendance for a future date"
                                );
                              }
                            }}>
                            
                                <span
                              className={
                              futureDay && !status ?
                              "monthly-status empty" :
                              getDayCellClass(dayObj, futureDay)
                              }>
                              
                                  {futureDay &&
                              !normalizeStatus(dayObj?.status) ?
                              "" :
                              getDayCellText(dayObj, futureDay)}
                                </span>
                              </div>);

                      })}

                          <div
                        className="monthly-count">
                        
                            {counts.present || 0}
                          </div>
                          <div
                        className="monthly-count">
                        
                            {counts.absent || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {counts.late || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {counts.halfDay || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {formatLeaveSummaryValue(counts.totalLeaves)}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {counts.onLeave || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {formatLeaveSummaryValue(counts.usedLeaves)}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {formatLeaveSummaryValue(counts.balanceLeaves)}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {counts.lossOfPay || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {counts.missedCheckout || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {counts.lateMissedCheckout || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {counts.weekend || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {counts.holiday || 0}
                          </div>

                          <div
                        className="monthly-count">
                        
                            {formatLeaveSummaryValue(counts.totalWorkingDays)}
                          </div>

                          <div
                        className="monthly-count"
                        style={{
                          background: "var(--attendance-summary)",
                          borderBottom: "1px solid var(--attendance-border)",
                          marginTop: "-1px"
                        }}>
                        
                            <button
                          className="attendance-edit-btn monthly-edit-btn"
                          onClick={() => openEditModal(emp)}>
                          
                              Edit
                            </button>
                          </div>
                        </React.Fragment>);

                })}
                  </div>
                </div>

                {renderPaginationControls(
              monthlyPage,
              monthlyTotalPages,
              () => setMonthlyPage((prev) => Math.max(prev - 1, 1)),
              () => setMonthlyPage((prev) => Math.min(prev + 1, monthlyTotalPages))
            )}
              </>
          }
          </div>
        }
      </div>

      {downloadModalOpen &&
      <div className="attendance-report-overlay">
          <div className="attendance-report-modal">
            <div className="attendance-report-header">
              <div>
                <h3>Download Attendance Report</h3>
              </div>

              <button
              type="button"
              className="attendance-report-close"
              onClick={closeDownloadModal}
              disabled={Boolean(downloadingReport)}
              aria-label="Close download attendance report">
              
                &times;
              </button>
            </div>

            <div className="attendance-report-body">
              <div className="attendance-report-section">
                <label className="attendance-report-label">
                  Download Type
                </label>

                <div className="attendance-report-type-grid">
                  <button
                  className={`attendance-report-type-btn ${downloadReportType === "Daily" ? "active" : ""}`
                  }
                  onClick={() => setDownloadReportType("Daily")}>
                  
                    Daily
                  </button>

                  <button
                  className={`attendance-report-type-btn ${downloadReportType === "Monthly" ? "active" : ""}`
                  }
                  onClick={() => setDownloadReportType("Monthly")}>
                  
                    Monthly
                  </button>

                  <button
                  className={`attendance-report-type-btn ${downloadReportType === "Weekly" ? "active" : ""}`
                  }
                  onClick={() => setDownloadReportType("Weekly")}>
                  
                    Weekly
                  </button>
                </div>
              </div>

              {/* Daily View: Select Date Only */}
              {downloadReportType === "Daily" &&
            <div className="attendance-report-section">
                  <label className="attendance-report-label">
                    Select Date
                  </label>
                  <input
                type="date"
                className="attendance-report-select"
                value={downloadReportDate}
                max={todayString}
                onChange={(e) => setDownloadReportDate(e.target.value)}
                disabled={Boolean(downloadingReport)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid var(--attendance-border)",
                  background: "var(--attendance-card)",
                  color: "var(--attendance-text)",
                  fontSize: "14px",
                  outline: "none"
                }} />
              
                </div>
            }

              {/* Monthly/Weekly View: Month & Year Selectors */}
              {downloadReportType !== "Daily" &&
            <div className="attendance-report-section">
                  <label className="attendance-report-label">
                    Month & Year
                  </label>

                  <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px",
                  gap: "12px"
                }}>
                
                    {/* MONTH */}
                    <select
                  id="attendance-report-month"
                  className="attendance-report-select"
                  value={downloadReportMonth}
                  onChange={(event) =>
                  setDownloadReportMonth(event.target.value)
                  }
                  disabled={Boolean(downloadingReport)}>
                  
                      {reportMonthOptions.map((monthOption) =>
                  <option
                    key={monthOption.value}
                    value={monthOption.value}>
                    
                          {monthOption.label}
                        </option>
                  )}
                    </select>

                    {/* YEAR */}
                    <select
                  className="attendance-report-select"
                  value={downloadReportYear}
                  onChange={(event) => {
                    const selectedYear = Number(event.target.value);

                    setDownloadReportYear(selectedYear);

                    const currentMonth =
                    parseReportMonthValue(downloadReportMonth);

                    setDownloadReportMonth(
                      getReportMonthValue(
                        selectedYear,
                        currentMonth?.month || 1
                      )
                    );
                  }}
                  disabled={Boolean(downloadingReport)}>
                  
                      {reportYearOptions.map((yearOption) =>
                  <option
                    key={yearOption.value}
                    value={yearOption.value}>
                    
                          {yearOption.label}
                        </option>
                  )}
                    </select>
                  </div>
                </div>
            }

              {downloadReportType === "Weekly" &&
            <div className="attendance-report-section">
                  <label className="attendance-report-label">
                    Select Week
                  </label>

                  <div className="attendance-report-week-list">
                    {reportWeeks.map((week) =>
                <button
                  type="button"
                  key={week.id}
                  className={`attendance-report-week-card ${selectedReportWeekId === week.id ?
                  "active" :
                  ""}`
                  }
                  onClick={() => setSelectedReportWeekId(week.id)}
                  disabled={Boolean(downloadingReport)}>
                  
                        <span className="attendance-report-week-check" />

                        <span>
                          Week {week.week}
                        </span>

                        <strong>
                          {week.rangeLabel}
                        </strong>
                      </button>
                )}
                  </div>
                </div>
            }
            </div>

            <div className="attendance-report-footer">
              <button
              type="button"
              className="attendance-report-cancel-btn"
              onClick={closeDownloadModal}
              disabled={Boolean(downloadingReport)}>
              
                Cancel
              </button>

              <button
              type="button"
              className="attendance-report-download-btn"
              onClick={handleAttendanceReportDownload}
              disabled={Boolean(downloadingReport)}>
              
                {downloadingReport ?
              "Downloading..." :
              "Download"}
              </button>
            </div>
          </div>
        </div>
      }

      {/* EDIT MODAL */}

      {editModalOpen &&
      <div className="attendance-modal-overlay" onClick={closeEditModal}>
          <div
          className="attendance-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-edit-modal-title">
          
            <div className="attendance-modal-header">
              <h3 id="attendance-edit-modal-title">Update Attendance</h3>
              <button
              type="button"
              className="attendance-modal-close"
              onClick={closeEditModal}
              disabled={updateLoading}
              aria-label="Close update attendance modal">
              
                &times;
              </button>
            </div>

            <div className="attendance-modal-body">
              <div className="attendance-modal-employee">
                <div className="avatar large">
                  {getEmployeeName(selectedEmployee).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="emp-name">
                    {getEmployeeName(selectedEmployee)}
                  </div>
                  <div className="emp-dept">
                    {getEmployeeId(selectedEmployee) || editForm.employeeId}
                  </div>
                </div>
              </div>

              <div className="attendance-form-grid">
                <div className="attendance-form-group">
                  <label htmlFor="attendance-edit-employee-id">
                    Employee ID
                  </label>
                  <input
                  id="attendance-edit-employee-id"
                  type="text"
                  value={editForm.employeeId}
                  readOnly />
                
                </div>

                <div className="attendance-form-group">
                  <label htmlFor="attendance-edit-date">Date</label>
                  <input
                  id="attendance-edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(event) =>
                  handleEditFormChange("date", event.target.value)
                  }
                  disabled={updateLoading} />
                
                </div>

                <div className="attendance-form-group">
                  <label htmlFor="attendance-edit-check-in">Check In</label>
                  <input
                  id="attendance-edit-check-in"
                  type="time"
                  value={editForm.checkIn}
                  onChange={(event) =>
                  handleEditFormChange("checkIn", event.target.value)
                  }
                  disabled={updateLoading} />
                
                </div>

                <div className="attendance-form-group">
                  <label htmlFor="attendance-edit-check-out">Check Out</label>
                  <input
                  id="attendance-edit-check-out"
                  type="time"
                  value={editForm.checkOut}
                  onChange={(event) =>
                  handleEditFormChange("checkOut", event.target.value)
                  }
                  disabled={updateLoading} />
                
                </div>
              </div>
            </div>

            <div className="attendance-modal-footer">
              <button
              type="button"
              className="attendance-cancel-btn"
              onClick={closeEditModal}
              disabled={updateLoading}>
              
                Cancel
              </button>

              <button
              type="button"
              className="attendance-save-btn"
              onClick={handleUpdateAttendance}
              disabled={updateLoading}>
              
                {updateLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      }

      {/* LOCATION MODAL */}

      {locationModalOpen && locationModalData &&
      <div
        className="attendance-modal-overlay location-modal-overlay"
        onClick={closeLocationModal}>
        
          <div
          className="location-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-modal-title">
          
            <div className="location-modal-header">
              <div className="location-modal-title-group">
                <h3 id="location-modal-title">Location Details</h3>
                <p>
                  {locationModalData.employeeName}
                  {locationModalData.employeeId ?
                ` | ${locationModalData.employeeId}` :
                ""}
                  {locationModalData.dateLabel ?
                ` | ${locationModalData.dateLabel}` :
                ""}
                </p>
              </div>

              <button
              type="button"
              className="location-modal-close"
              onClick={closeLocationModal}
              aria-label="Close location details modal">
              
                &times;
              </button>
            </div>

            <div className="location-modal-body">
              <div className="attendance-location-summary">
                <div className="attendance-location-summary-grid">
                  <div className="attendance-location-summary-item">
                    <span>Date</span>
                    <strong>{locationModalData.dateLabel}</strong>
                  </div>
                  <div className="attendance-location-summary-item">
                    <span>Check In Time</span>
                    <strong>{locationModalData.checkIn.time}</strong>
                  </div>
                  <div className="attendance-location-summary-item">
                    <span>Check Out Time</span>
                    <strong>{locationModalData.checkOut.time}</strong>
                  </div>
                </div>
              </div>

              {!locationModalData.hasLocationData ?
            <div className="location-modal-empty-state">
                  <p>{locationModalData.emptyMessage}</p>
                </div> :

            <div className="attendance-location-card-grid">
                  {["checkIn", "checkOut"].map((type) => {
                const entry = locationModalData[type];
                const label =
                type === "checkIn" ? "Check In" : "Check Out";
                const mapsUrl = buildGoogleMapsUrl(
                  entry.coords,
                  entry.address
                );
                const mapSrc = entry.coords ?
                `https://maps.google.com/maps?q=${entry.coords.lat},${entry.coords.lng}&z=16&output=embed` :
                "";

                return (
                  <section key={type} className="attendance-location-card">
                        <div className="attendance-location-card-header">
                          <div>
                            <h4>{label}</h4>
                            <p>{entry.time}</p>
                          </div>

                          <span className="attendance-location-card-pill">
                            {mapsUrl ? "Location Recorded" : "No Coordinates"}
                          </span>
                        </div>

                        <div className="attendance-location-details">
                          <div className="attendance-location-field">
                            <span>Latitude</span>
                            <strong>
                              {formatCoordinate(entry.coords?.lat)}
                            </strong>
                          </div>

                          <div className="attendance-location-field">
                            <span>Longitude</span>
                            <strong>
                              {formatCoordinate(entry.coords?.lng)}
                            </strong>
                          </div>

                          <div className="attendance-location-field attendance-location-field-full">
                            <span>Address</span>
                            <strong>
                              {locationAddressLoading && !entry.address ?
                          "Loading address..." :
                          entry.address || "Address not available"}
                            </strong>
                          </div>

                          <div className="attendance-location-field attendance-location-field-full">
                            <span>Google Maps Link</span>

                            {mapsUrl ?
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer">
                          
                                Open in Google Maps
                              </a> :

                        <strong>Not available</strong>
                        }
                          </div>
                        </div>

                        <div className="attendance-location-map-shell">
                          {mapSrc ?
                      <iframe
                        title={`${type}-map`}
                        src={mapSrc}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade" /> :

                      <div className="attendance-location-map-empty">
                              Location not available
                            </div>
                      }
                        </div>
                      </section>);

              })}
                </div>
            }
            </div>
          </div>
        </div>
      }
    </>);

}

// Optimization: memoize the table so unrelated parent renders do not redraw large attendance grids.
export default memo(AttendanceTable);
