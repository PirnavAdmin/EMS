import React, { memo, useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./AttendanceTable.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import AppDatePicker from "../components/AppDatePicker";
import {
  downloadMonthlyAttendanceReport,
  downloadWeeklyAttendanceReport,
  getDownloadErrorMessage,
} from "./attendanceDownloads";
import {
  formatMonthYear,
  formatTime,
  getInputDateValue,
  getTodayInputValue,
} from "../utils/date";
import { getStoredToken } from "../utils/authStorage";
import {
  endPerformanceTimer,
  logPerformanceError,
  startPerformanceTimer,
} from "../utils/performance";

const reportMonthFormatter =
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  });

const reportMonthNameFormatter =
  new Intl.DateTimeFormat("en-US", {
    month: "long",
  });

const getReportMonthValue = (yearValue, monthValue) =>
  `${yearValue}-${String(monthValue).padStart(2, "0")}`;

const parseReportMonthValue = (monthValue) => {
  const [selectedYear, selectedMonth] =
    String(monthValue || "")
      .split("-")
      .map(Number);

  if (!selectedYear || !selectedMonth) {
    return null;
  }

  return {
    year: selectedYear,
    month: selectedMonth,
  };
};

const getReportMonthLabel = (yearValue, monthValue) =>
  reportMonthFormatter.format(
    new Date(yearValue, monthValue - 1, 1)
  );

const getReportMonthName = (yearValue, monthValue) =>
  reportMonthNameFormatter.format(
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

const buildReportMonthOptions = (yearValue) =>
  Array.from({ length: 12 }, (item, monthIndex) => {
    const monthValue = monthIndex + 1;

    return {
      value: getReportMonthValue(yearValue, monthValue),
      label: getReportMonthLabel(yearValue, monthValue),
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
        `weekly-attendance-${getReportDateFilePart(startDate)}-to-${getReportDateFilePart(endDate)}.xlsx`,
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
  const [isDailyDownloading, setIsDailyDownloading] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadReportType, setDownloadReportType] = useState("Monthly");
  const [downloadReportMonth, setDownloadReportMonth] = useState("");
  const [downloadReportYear, setDownloadReportYear] = useState(
    new Date().getFullYear()
  );
  const [selectedReportWeekId, setSelectedReportWeekId] = useState("");
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
      emp?.employee_Id ||     // <-- add this
      emp?.employeeId ||
      emp?.id ||
      emp?._id ||
      emp?.empId ||
      emp?.staffId ||
      emp?.userId ||
      emp?.employee?.employee_Id ||  // <-- add this too
      emp?.employee?.employeeId ||
      emp?.employee?.id ||
      emp?.employee?._id ||
      ""
    );
  };

  const getEmployeeName = (emp) => {
    return (
      emp?.name ||
      emp?.employeeName ||
      emp?.fullName ||
      emp?.employee?.name ||
      emp?.user?.name ||
      "Unknown"
    );
  };

  const getEmployeeDept = (emp) => {
    return (
      emp?.department ||
      emp?.designation ||
      emp?.employee?.department ||
      emp?.user?.department ||
      "Employee"
    );
  };

  const getCheckIn = (emp) => {
    return emp?.checkIn || emp?.checkInTime || emp?.inTime || null;
  };

  const getCheckOut = (emp) => {
    return emp?.checkOut || emp?.checkOutTime || emp?.outTime || null;
  };

  const getNumericHoursValue = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
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
        hoursMatch
          ? Number(hoursMatch[1])
          : 0;

      const minutes =
        minutesMatch
          ? Number(minutesMatch[1])
          : 0;

      const combinedHours =
        hours + (minutes / 60);

      return Number.isFinite(combinedHours)
        ? Number(combinedHours.toFixed(1))
        : null;
    }

    const numericMatch =
      normalizedValue.match(/-?\d+(\.\d+)?/);

    if (!numericMatch) {
      return null;
    }

    const parsedValue =
      Number(numericMatch[0]);

    return Number.isFinite(parsedValue)
      ? parsedValue
      : null;
  };

  const getAttendanceDateTime = (value, attendanceRecord) => {
    if (!value) {
      return null;
    }

    try {

      if (
        value instanceof Date &&
        !Number.isNaN(value.getTime())
      ) {
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
            parsedDay
          ] = trimmedValue.split("-").map(Number);

          const parsedDate =
            new Date(
              parsedYear,
              parsedMonth - 1,
              parsedDay
            );

          return Number.isNaN(parsedDate.getTime())
            ? null
            : parsedDate;
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
              !Number.isNaN(baseDate.getTime())
            ) {

              const [
                hours = "0",
                minutes = "0",
                seconds = "0"
              ] = trimmedValue.split(":");

              baseDate.setHours(
                Number(hours),
                Number(minutes),
                Number(seconds),
                0
              );

              return Number.isNaN(baseDate.getTime())
                ? null
                : baseDate;
            }
          }

          const dayNumber =
            Number(attendanceRecord?.day);

          if (
            monthNum &&
            yearNum &&
            dayNumber
          ) {

            const [
              hours = "0",
              minutes = "0",
              seconds = "0"
            ] = trimmedValue.split(":");

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

            return Number.isNaN(parsedDate.getTime())
              ? null
              : parsedDate;
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

      return Number.isNaN(parsedDate.getTime())
        ? null
        : parsedDate;

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
      dayNumber
    ) {

      const parsedDate =
        new Date(
          yearNum,
          monthNum - 1,
          dayNumber
        );

      return Number.isNaN(parsedDate.getTime())
        ? null
        : parsedDate;
    }

    return null;
  };

  const getMonthValue = (value) => {
    const inputDateValue =
      getInputDateValue(value);

    return inputDateValue
      ? inputDateValue.slice(0, 7)
      : "";
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
      checkOutDate
    ) {

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
        emp.days.length > 0
        ? emp.days
        : (
          getAttendanceRecordDate(emp) ||
          getCheckIn(emp) ||
          getCheckOut(emp) ||
          emp?.status ||
          emp?.attendanceStatus ||
          emp?.markStatus ||
          emp?.dayStatus ||
          emp?.dailyStatus
        )
          ? [emp]
          : [];

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
      attendanceDate > new Date()
    ) {
      return "--";
    }

    const checkIn =
      getCheckIn(emp);

    const checkOut =
      getCheckOut(emp);

    // NO CHECK IN
    if (!checkIn) {
      return "0h 0m";
    }

    try {

      const checkInDate =
        new Date(checkIn);

      // IF CHECK OUT EXISTS
      // USE FINAL TIME
      const endTime =
        checkOut
          ? new Date(checkOut)
          : new Date();

      // INVALID DATE
      if (
        isNaN(checkInDate.getTime()) ||
        isNaN(endTime.getTime())
      ) {
        return "0h 0m";
      }

      // DIFFERENCE
      const diffMs =
        endTime - checkInDate;

      // TOTAL MINUTES
      const totalMinutes =
        Math.floor(diffMs / (1000 * 60));

      // HOURS
      const hours =
        Math.floor(totalMinutes / 60);

      // MINUTES
      const minutes =
        totalMinutes % 60;

      return `${hours}h ${minutes}m`;

    } catch (error) {

      logPerformanceError(
        "Hours Calculate Error:",
        error
      );

      return "0h 0m";
    }
  };

  const formatCheckTime = (value) => {

    if (!value) {
      return "-";
    }

    try {

      // If backend already sends HH:mm
      if (
        typeof value === "string" &&
        /^\d{2}:\d{2}$/.test(value)
      ) {

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
        "❌ Time Format Error:",
        error
      );

      return "-";
    }
  };

  const getProgressWidth = (emp) => {
    const rawHours =
      emp?.hoursWorked ||
      emp?.totalHours ||
      emp?.workingHours ||
      emp?.hours ||
      "0";

    const match = String(rawHours).match(/(\d+(\.\d+)?)/);
    const hours = match ? parseFloat(match[1]) : 0;

    if (!hours || isNaN(hours)) return 0;

    return Math.min((hours / 9) * 100, 100);
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
    const normalizedStatus = String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

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
      normalizedStatus === "halfday"
    ) {
      return "Half Day";
    }

    if (
      normalizedStatus === "ol" ||
      normalizedStatus === "on leave" ||
      normalizedStatus === "leave"
    ) {
      return "On Leave";
    }

    if (
      normalizedStatus === "loss of pay" ||
      normalizedStatus === "lop"
    ) {
      return "Loss Of Pay";
    }

    if (
      normalizedStatus === "missed checkout" ||
      normalizedStatus === "missed check out" ||
      normalizedStatus === "mc"
    ) {
      return "Missed Checkout";
    }

    if (
      normalizedStatus === "late & missed checkout" ||
      normalizedStatus === "late & missed check out" ||
      normalizedStatus === "lmc"
    ) {
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
      attendanceDate > new Date()
    ) {

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
        futureStatus === "Holiday"
      ) {
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
      getCheckOut(employeeRecord)
    ) {
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

      setLiveTimer(prev => prev + 1);

    }, 60000);

    return () => clearInterval(interval);

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

      const res = await api.get(
        API_ENDPOINTS.attendance.today,
        {
          signal,
          params: {
            date: todayDate,
            status: filter || "All"
          },
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );

      const raw = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

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
      toast.error("Failed to fetch daily attendance");
    } finally {
      endPerformanceTimer(timerLabel);

      if (!canceled && requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  }, [token, selectedDate, filter]);

  const fetchMonthlyAttendance = useCallback(async (requestId, signal) => {
    let canceled = false;
    const timerLabel = "attendance:monthly-fetch";

    try {
      setLoading(true);
      startPerformanceTimer(timerLabel);

      const res = await api.get(API_ENDPOINTS.attendance.monthly, {
        signal,
        params: { month: monthNum, year: yearNum },
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      const raw = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

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
      toast.error("Failed to fetch monthly attendance");
    } finally {
      endPerformanceTimer(timerLabel);

      if (!canceled && requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  }, [monthNum, yearNum, token]);

  useEffect(() => {
    const requestId = ++activeRequestRef.current;
    const controller = new AbortController();

    if (viewMode === "daily") {
      fetchTodayAttendance(requestId, controller.signal);
    }
    else if (
      viewMode === "monthly" &&
      monthNum &&
      yearNum
    ) {
      fetchMonthlyAttendance(requestId, controller.signal);
    }

    return () => controller.abort();

  }, [
    fetchMonthlyAttendance,
    fetchTodayAttendance,
    viewMode,
    monthNum,
    yearNum,
    selectedDate
  ]);

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

  // =========================
  // NORMALIZE MONTHLY DATA ONCE
  // =========================
  const normalizedMonthlyData = useMemo(() => {

    if (viewMode !== "monthly") {
      return [];
    }

    // SAFE ARRAY CHECK
    const safeAttendanceData =
      Array.isArray(attendanceData)
        ? attendanceData
        : [];

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

        if (normalizedDay.status === "Present") present++;
        else if (normalizedDay.status === "Absent") absent++;
        else if (normalizedDay.status === "On Leave") onLeave++;
        else if (normalizedDay.status === "Late") late++;
        else if (normalizedDay.status === "Loss Of Pay") lossOfPay++;
        else if (normalizedDay.status === "Missed Checkout") missedCheckout++;
        else if (normalizedDay.status === "Late & Missed Checkout") lateMissedCheckout++;
        else if (normalizedDay.status === "Weekend") weekend++;
        else if (normalizedDay.status === "Half Day") halfDay++;
        else if (normalizedDay.status === "Holiday") holiday++;
      });

      return {
        ...emp,
        __dayMap: dayMap,
        __counts: {
          present,
          absent,
          onLeave,
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
  const filteredDailyData = useMemo(() => {

    if (viewMode !== "daily") {
      return [];
    }

    const safeAttendanceData =
      Array.isArray(attendanceData)
        ? attendanceData
        : [];

    return safeAttendanceData.filter((item) => {

      const finalStatus = getResolvedStatus(item);

      // SEARCH MATCH
      const searchMatch =
        matchesSearch(item);

      // FILTER MATCH
      const filterMatch =
        filter === "All"
        ||
        finalStatus?.trim().toLowerCase() ===
        filter?.trim().toLowerCase();

      return searchMatch && filterMatch;

    });

  }, [
    attendanceData,
    filter,
    matchesSearch,
    viewMode
  ]);

  const filteredMonthlyData = useMemo(() => {

    if (viewMode !== "monthly") return [];

    return normalizedMonthlyData.filter((emp) => {

      if (!matchesSearch(emp)) return false;

      if (filter === "All") return true;

      const normalizedFilter =
        normalizeStatus(filter);

      if (!normalizedFilter) {
        return false;
      }

      const monthlyStatusCountKeyMap = {
        Present: "present",
        Absent: "absent",
        "On Leave": "onLeave",
        Late: "late",
        "Half Day": "halfDay",
        "Loss Of Pay": "lossOfPay",
        "Missed Checkout": "missedCheckout",
        "Late & Missed Checkout": "late&MissedCheckout"
      };

      const countKey =
        monthlyStatusCountKeyMap[
        normalizedFilter
        ];

      if (countKey) {

        const today = new Date().getDate();

        const currentDayStatus =
          emp?.__dayMap?.[today]?.status;

        return (
          normalizeStatus(currentDayStatus) ===
          normalizedFilter
        );
      }

      return Object.values(
        emp?.__dayMap || {}
      ).some((dayRecord) =>
        normalizeStatus(
          dayRecord?.status
        ) === normalizedFilter
      );

    });

  }, [
    normalizedMonthlyData,
    filter,
    matchesSearch,
    viewMode
  ]);

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
    ATTENDANCE_PAGE_SIZE
  ]);

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
    ATTENDANCE_PAGE_SIZE
  ]);

  const employeeDirectory = useMemo(() => {
    const source =
      viewMode === "monthly"
        ? normalizedMonthlyData
        : Array.isArray(attendanceData)
          ? attendanceData
          : [];
    const uniqueEmployees = new Map();

    source.forEach((emp) => {
      const employeeId = String(getEmployeeId(emp) || "").trim();
      if (!employeeId || uniqueEmployees.has(employeeId)) return;

      uniqueEmployees.set(employeeId, {
        id: employeeId,
        name: getEmployeeName(emp),
      });
    });

    return Array.from(uniqueEmployees.values());
  }, [attendanceData, normalizedMonthlyData, viewMode]);

  const resolveEmployeeId = useCallback(
    (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized) return "";

      const matchedEmployee = employeeDirectory.find((employee) => {
        const employeeId = String(employee.id).toLowerCase();
        const employeeName = String(employee.name).toLowerCase();

        return employeeId === normalized || employeeName === normalized;
      });

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
    yearNum,
  ]);

  const reportMonthOptions = useMemo(() => {
    return buildReportMonthOptions(downloadReportYear);
  }, [downloadReportYear]);

  const reportYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 5 }, (_, index) => {
      const year = currentYear - index;

      return {
        value: year,
        label: year,
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
    selectedReportWeekId,
  ]);

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
    downloadModalOpen,
  ]);

  useEffect(() => {
    setSelectedReportWeekId("");
  }, [
    downloadReportMonth,
    downloadReportType,
  ]);

  const openDownloadModal = useCallback(() => {
    setDownloadReportType("Monthly");
    setDownloadReportMonth(defaultReportMonth);
    setSelectedReportWeekId("");
    setDownloadModalOpen(true);
  }, [defaultReportMonth]);

  const closeDownloadModal = useCallback(() => {
    if (downloadingReport) {
      return;
    }

    setDownloadModalOpen(false);
  }, [downloadingReport]);

  const handleAttendanceReportDownload = useCallback(async () => {
    if (!selectedReportMonthMeta) {
      toast.warning("Select a month to download attendance.");
      return;
    }

    if (
      downloadReportType === "Weekly" &&
      !selectedReportWeek
    ) {
      toast.warning("Select a week to download attendance.");
      return;
    }

    try {
      setDownloadingReport(downloadReportType.toLowerCase());

      if (downloadReportType === "Monthly") {
        await downloadMonthlyAttendanceReport({
          month: selectedReportMonthMeta.month,
          year: selectedReportMonthMeta.year,
          token,
          fallbackFileName:
            `monthly-attendance-${getReportMonthName(
              selectedReportMonthMeta.year,
              selectedReportMonthMeta.month
            )}-${selectedReportMonthMeta.year}.xlsx`,
        });

        toast.success("Monthly attendance downloaded successfully.");
      } else {
        await downloadWeeklyAttendanceReport({
          token,
          params: {
            weekStartDate: selectedReportWeek.fromDate,
          },
          fallbackFileName:
            `weekly-attendance-${selectedReportWeek.fromDate}.xlsx`,
          forceFallbackFileName: true,
        });

        toast.success("Weekly attendance downloaded successfully.");
      }

      setDownloadModalOpen(false);
    } catch (error) {
      logPerformanceError(
        "Attendance report download failed:",
        error?.response?.data || error.message
      );

      toast.error(
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
  ]);

  // =========================
  // ADMIN UPDATE ATTENDANCE
  // =========================
  const openEditModal = (emp) => {
    detailsRequestRef.current += 1;
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
      toast.warning("You cannot edit attendance for a future date");
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
      toast.warning("You cannot edit attendance for a future date");
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
    setEditForm({
      employeeId: "",
      date: "",
      checkIn: "",
      checkOut: ""
    });
  };
  const openAttendanceDetails = async (emp) => {

    const employeeId =
      getEmployeeId(emp);

    const requestId =
      ++detailsRequestRef.current;

    const baseAttendanceDetails =
      buildAttendanceDetailsData(emp);

    setDetailsMonth("");
    setSelectedAttendance(baseAttendanceDetails);
    setDetailsLoading(true);
    setDetailsModalOpen(true);

    try {

      const response =
        await api.get(
          API_ENDPOINTS.attendance.workingHours(employeeId),
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

      const workingHoursData =
        response?.data || {};

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

      if (requestId !== detailsRequestRef.current) {
        return;
      }

      logPerformanceError(
        "Working Hours API Error:",
        error
      );

      toast.error(
        "Failed to fetch attendance details"
      );

    }
    finally {

      if (requestId === detailsRequestRef.current) {
        setDetailsLoading(false);
      }

    }

  };

  const closeAttendanceDetails = useCallback(() => {
    detailsRequestRef.current += 1;
    setDetailsMonth("");
    setDetailsLoading(false);
    setDetailsModalOpen(false);
    setSelectedAttendance(null);
  }, []);

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    if (name === "date" && isFutureDate(value)) {
      toast.warning("Future attendance cannot be edited");
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
        toast.warning("Employee ID and Date are required");
        return;

      }

      if (isFutureDate(editForm.date)) {
        toast.error("You cannot update attendance for a future date");
        return;
      }

      if (
        editForm.checkIn &&
        editForm.checkOut &&
        editForm.checkOut < editForm.checkIn
      ) {
        toast.error("Check Out time cannot be earlier than Check In time");
        return;
      }

      setUpdateLoading(true);

      const isAbsent =
        editForm.checkIn === "00:00" &&
        editForm.checkOut === "00:00";

      const checkInDateTime =
        isAbsent
          ? null
          : editForm.checkIn
            ? `${editForm.date}T${editForm.checkIn}:00`
            : null;

      const checkOutDateTime =
        isAbsent
          ? null
          : editForm.checkOut
            ? `${editForm.date}T${editForm.checkOut}:00`
            : null;

      await api.post(
        API_ENDPOINTS.attendance.adminUpdate,
        {},
        {
          params: {
            employeeId: resolvedEmployeeId,
            date: editForm.date,
            checkIn: checkInDateTime,
            checkOut: checkOutDateTime
          },
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );

      toast.success("Attendance updated successfully");
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
        String(backendMessage || "")
          .toLowerCase()
          .includes("future")
      ) {
        toast.error("You cannot update attendance for a future date");
      } else {
        toast.error(
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
        String(currentDate.getMonth() + 1)
          .padStart(2, "0");

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
      )
    ) {
      return detailsMonth;
    }

    if (
      availableDetailMonths.some(
        (monthOption) =>
          monthOption.value === defaultDetailsMonth
      )
    ) {
      return defaultDetailsMonth;
    }

    return (
      availableDetailMonths[0]?.value ||
      defaultDetailsMonth
    );
  }, [
    detailsMonth,
    availableDetailMonths,
    defaultDetailsMonth
  ]);

  const selectedDetailsMonthMeta = useMemo(() => {
    const [selectedYear, selectedMonthNumber] =
      String(selectedDetailsMonth || "")
        .split("-")
        .map(Number);

    if (
      !selectedYear ||
      !selectedMonthNumber
    ) {
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
        )
      ) {
        return selectedMonth;
      }

      if (
        currentMonth &&
        availableDetailMonths.some(
          (monthOption) =>
            monthOption.value === currentMonth
        )
      ) {
        return currentMonth;
      }

      return defaultDetailsMonth;
    });
  }, [
    availableDetailMonths,
    defaultDetailsMonth
  ]);

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
    yearNum
  ]);

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
      !availableDetailMonths.length
    ) {
      return;
    }

    setDetailsMonth((currentMonth) => {
      if (
        currentMonth &&
        availableDetailMonths.some(
          (monthOption) =>
            monthOption.value === currentMonth
        )
      ) {
        return currentMonth;
      }

      if (
        availableDetailMonths.some(
          (monthOption) =>
            monthOption.value === defaultDetailsMonth
        )
      ) {
        return defaultDetailsMonth;
      }

      return availableDetailMonths[0].value;
    });

  }, [
    detailsModalOpen,
    availableDetailMonths,
    defaultDetailsMonth
  ]);

  useEffect(() => {

    if (
      !selectedDetailsMonthMeta
    ) return;

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

    }

    else {

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
    detailsDaysInSelectedMonth
  ]);

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
          !detailsToDate
        ) {
          return true;
        }

        return (
          formattedDate >= detailsFromDate &&
          formattedDate <= detailsToDate
        );
      }

      // MONTHLY FILTER
      if (
        detailsFromDate &&
        detailsToDate
      ) {

        return (
          formattedDate >= detailsFromDate &&
          formattedDate <= detailsToDate
        );
      }

      return true;

    });

  }, [
    selectedAttendance,
    detailsFilter,
    detailsFromDate,
    detailsToDate,
    yearNum,
    monthNum
  ]);

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
      if (status === "Late & Missed Checkout") late & MissedCheckout++;
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
        shouldUseDefaultMonthlyTotal
          ? selectedAttendance.totalHours
          : `${totalHours.toFixed(1)} hrs`,
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
    defaultDetailsMonth
  ]);

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
    onNext
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        margin: "18px 0 24px 0"
      }}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage === 1}
        style={{
          border: "1px solid #d1d5db",
          background: currentPage === 1 ? "#f8fafc" : "#fff",
          color: "#334155",
          padding: "8px 14px",
          borderRadius: "10px",
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
          fontWeight: 600
        }}
      >
        Previous
      </button>

      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#334155"
        }}
      >
        Page {currentPage} of {totalPages}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages}
        style={{
          border: "1px solid #d1d5db",
          background: currentPage === totalPages ? "#f8fafc" : "#fff",
          color: "#334155",
          padding: "8px 14px",
          borderRadius: "10px",
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          fontWeight: 600
        }}
      >
        Next
      </button>
    </div>
  );

  const getDayName = (day) => {
    if (!monthNum || !yearNum || !day) return "";

    const date = new Date(yearNum, monthNum - 1, day);

    return date.toLocaleDateString("en-US", {
      weekday: "short",
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
    value
  ) => {

    const current =
      editForm[field] || "00:00";

    const [hour, minute] =
      current.split(":");

    const newHour =
      type === "hour"
        ? value
        : hour;

    const newMinute =
      type === "minute"
        ? value
        : minute;

    setEditForm((prev) => ({
      ...prev,
      [field]: `${newHour}:${newMinute}`
    }));
  };

  useEffect(() => {

    const scrollToActive = (
      ref,
      activeValue
    ) => {

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

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />

      <div className="attendance-table">
        {/* =========================================
    TOP SECTION
========================================= */}

        <div className="attendance-top-section">

          {/* LEFT SIDE SUMMARY CARDS */}

          {viewMode === "daily" ? (

            loading ? (

              <div className="attendance-summary-skeleton">

                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
                  <div
                    key={item}
                    className="attendance-summary-box skeleton-card"
                  >
                    <div className="skeleton skeleton-label"></div>
                    <div className="skeleton skeleton-number"></div>
                  </div>
                ))}

              </div>

            ) : (

              <div className="attendance-summary-top">

                {/* DAILY SUMMARY CARDS */}

                <div className="attendance-summary-box present">
                  <span className="summary-label">Present</span>
                  <h3>
                    {
                      filteredDailyData.filter(
                        (emp) =>
                          getResolvedStatus(emp) === "Present"
                      ).length
                    }
                  </h3>
                </div>

                <div className="attendance-summary-box absent">
                  <span className="summary-label">Absent</span>
                  <h3>
                    {
                      filteredDailyData.filter(
                        (emp) =>
                          getResolvedStatus(emp) === "Absent"
                      ).length
                    }
                  </h3>
                </div>

                <div className="attendance-summary-box leave">
                  <span className="summary-label">On Leave</span>
                  <h3>
                    {
                      filteredDailyData.filter(
                        (emp) =>
                          getResolvedStatus(emp) === "On Leave"
                      ).length
                    }
                  </h3>
                </div>

                <div className="attendance-summary-box late">
                  <span className="summary-label">Late</span>
                  <h3>
                    {
                      filteredDailyData.filter(
                        (emp) =>
                          getResolvedStatus(emp) === "Late"
                      ).length
                    }
                  </h3>
                </div>

                <div className="attendance-summary-box halfday">
                  <span className="summary-label">Half Day</span>
                  <h3>
                    {
                      filteredDailyData.filter(
                        (emp) =>
                          getResolvedStatus(emp) === "Half Day"
                      ).length
                    }
                  </h3>
                </div>

                <div className="attendance-summary-box lop">
                  <span className="summary-label">Loss Of Pay</span>
                  <h3>
                    {
                      filteredDailyData.filter(
                        (emp) =>
                          getResolvedStatus(emp) === "Loss Of Pay"
                      ).length
                    }
                  </h3>
                </div>

                <div className="attendance-summary-box mc">
                  <span className="summary-label">Missed Checkout</span>
                  <h3>
                    {
                      filteredDailyData.filter(
                        (emp) =>
                          getResolvedStatus(emp) === "Missed Checkout"
                      ).length
                    }
                  </h3>
                </div>

                <div className="attendance-summary-box lmc">
                  <span className="summary-label">Late & Missed Checkout</span>
                  <h3>
                    {
                      filteredDailyData.filter(
                        (emp) =>
                          getResolvedStatus(emp) === "Late & Missed Checkout"
                      ).length
                    }
                  </h3>
                </div>

                <div className="attendance-summary-box total">
                  <span className="summary-label">Total</span>
                  <h3>{filteredDailyData.length}</h3>
                </div>
              </div>

            )

          ) : (

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

            </div>

          )}

          {/* RIGHT SIDE BUTTONS */}

          <div className="attendance-table-actions">

            <button
              type="button"
              className="attendance-download-btn attendance-primary-report-btn"
              disabled={isDailyDownloading}
              onClick={async () => {
                try {

                  setIsDailyDownloading(true);

                  const now = new Date();

                  const todayDate =
                    `${now.getFullYear()}-${String(
                      now.getMonth() + 1
                    ).padStart(2, "0")}-${String(
                      now.getDate()
                    ).padStart(2, "0")}`;

                  const response = await api.get(
                    API_ENDPOINTS.attendance.downloadDaily,
                    {
                      params: {
                        date: todayDate,
                      },
                      responseType: "arraybuffer",
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    }
                  );

                  const blob = new Blob(
                    [response.data],
                    {
                      type:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    }
                  );

                  const downloadUrl =
                    window.URL.createObjectURL(blob);

                  const link =
                    document.createElement("a");

                  link.href = downloadUrl;

                  link.download =
                    `daily-attendance-${todayDate}.xlsx`;

                  document.body.appendChild(link);

                  link.click();

                  document.body.removeChild(link);

                  window.URL.revokeObjectURL(downloadUrl);

                  toast.success(
                    "Daily attendance downloaded successfully."
                  );

                } catch (error) {

                  logPerformanceError(
                    "Daily attendance download error:",
                    error
                  );

                  toast.error(
                    "Failed to download daily attendance."
                  );

                } finally {

                  setIsDailyDownloading(false);

                }
              }}
            >
              {isDailyDownloading
                ? "Downloading..."
                : "Download Daily"}
            </button>

            <button
              type="button"
              className="attendance-download-btn attendance-primary-report-btn"
              onClick={openDownloadModal}
            >
              Download Attendance
            </button>

          </div>

        </div>

        {viewMode === "daily" ? (
          <>
            <div className="attendance-table-header attendance-table-header-5">
              <span>EMPLOYEE</span>
              <span>STATUS</span>
              <span>CHECK IN</span>
              <span>CHECK OUT</span>
              <span>HOURS WORKED</span>
            </div>

            {loading ? (
              <p className="attendance-empty">Loading...</p>
            ) : filteredDailyData.length === 0 ? (
              <p className="attendance-empty">No Data</p>
            ) : (
              <>
                {paginatedDailyData.map((emp, i) => {
                  const progressWidth = getProgressWidth(emp);
                  const finalStatus = getResolvedStatus(emp);
                  return (
                    <div
                      key={`${getEmployeeId(emp)}-${getEmployeeName(emp)}-${i}`}
                      className="attendance-row attendance-row-5"
                      onClick={() => {
                        if (viewMode === "monthly") {
                          openAttendanceDetails(emp);
                        }
                      }}
                    >
                      <div className="attendance-employee">
                        <div className="avatar">
                          {getEmployeeName(emp).charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="emp-name" title={getEmployeeName(emp)}>
                            {getEmployeeName(emp)}
                          </div>

                          <div className="emp-dept">
                            EMP ID: {getEmployeeId(emp)}
                          </div>

                          <div className="emp-dept">
                            {getEmployeeDept(emp)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className={`status-badge ${getStatusClass(finalStatus)}`}>
                          {finalStatus}
                        </span>
                      </div>

                      <div className="time-text">{formatCheckTime(getCheckIn(emp))}</div>

                      <div className="time-text">{formatCheckTime(getCheckOut(emp))}</div>

                      <div className="hours-worked">
                        <div className="progress-bar">
                          <div
                            className="progress progress-blue"
                            style={{ width: `${progressWidth}%` }}
                          />
                        </div>
                        <span className="hours-text">
                          {formatHoursWorked(emp)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {renderPaginationControls(
                  dailyPage,
                  dailyTotalPages,
                  () => setDailyPage((prev) => Math.max(prev - 1, 1)),
                  () => setDailyPage((prev) => Math.min(prev + 1, dailyTotalPages))
                )}
              </>
            )}
          </>
        ) : (
          <div className="monthly-wrapper">
            <div className="monthly-title-row">
              <h3>Monthly Attendance</h3>
              <span className="monthly-month-label">{monthLabel}</span>
            </div>

            {loading ? (
              <p className="attendance-empty">Loading monthly attendance...</p>
            ) : filteredMonthlyData.length === 0 ? (
              <p className="attendance-empty">No monthly data found</p>
            ) : (
              <>
                <div className="monthly-scroll">
                  <div
                    className="monthly-grid"
                    style={{
                      gridTemplateColumns: `260px repeat(${daysArray.length}, 34px) 42px 42px 42px 42px 42px 46px 46px 52px 42px 42px 76px`
                    }}
                  >
                    <div
                      className="monthly-head employee-col sticky-col"
                      style={{
                        position: "sticky",
                        top: 0,
                        left: 0,
                        zIndex: 9999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderBottom: "1px solid #e5e7eb",
                        boxSizing: "border-box",
                      }}
                    >
                      EMPLOYEE
                    </div>

                    {daysArray.map((day) => (
                      <div
                        key={day}
                        className="monthly-head day-head"
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 999,
                          background: "#f8fafc",
                          height: "72px",
                          minHeight: "72px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <span className="monthly-day-number">
                          {day}
                        </span>

                        <span className="monthly-day-name">
                          {getDayName(day)}
                        </span>
                      </div>
                    ))}
                    <div
                      className="monthly-head summary-head present-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      P
                    </div>

                    <div
                      className="monthly-head summary-head absent-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      A
                    </div>

                    <div
                      className="monthly-head summary-head late-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      L
                    </div>

                    <div
                      className="monthly-head summary-head halfday-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      HD
                    </div>

                    <div
                      className="monthly-head summary-head leave-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      OL
                    </div>

                    <div
                      className="monthly-head summary-head lop-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      LOP
                    </div>

                    <div
                      className="monthly-head summary-head mc-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      MC
                    </div>

                    <div
                      className="monthly-head summary-head lmc-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      LMC
                    </div>

                    <div
                      className="monthly-head summary-head weekend-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      W
                    </div>

                    <div
                      className="monthly-head summary-head holiday-text"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      H
                    </div>

                    <div
                      className="monthly-head summary-head"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 999,
                        background: "#f8fafc",
                        height: "72px",
                        minHeight: "72px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ACTION
                    </div>

                    {paginatedMonthlyData.map((emp, index) => {
                      const counts = emp.__counts || {};

                      return (
                        <React.Fragment
                          key={`${getEmployeeId(emp)}-${getEmployeeName(emp)}-${index}`}
                        >
                          <div
                            className="monthly-employee-cell sticky-col attendance-employee-click"
                            onClick={() => openAttendanceDetails(emp)}
                          >
                            <div className="attendance-employee">
                              <div className="avatar">
                                {getEmployeeName(emp).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div
                                  className="emp-name"
                                  title={getEmployeeName(emp)}
                                >
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
                                !normalizeStatus(dayObj?.status)
                                ? "Upcoming"
                                : normalizeStatus(dayObj?.status);

                            return (
                              <div
                                key={`${getEmployeeId(emp)}-${day}`}
                                className={`monthly-day-cell ${futureDay ? "disabled-future-day" : "clickable-day"
                                  }`}
                                title={
                                  futureDay
                                    ? `Day ${day}: Future date cannot be edited`
                                    : `Day ${day}: ${status || "-"} (Click to Edit)`
                                }
                                onClick={() => {

                                  if (
                                    status === "Weekend" ||
                                    status === "Holiday"
                                  ) {

                                    toast.error(
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

                                    toast.warning(
                                      "You cannot edit attendance for a future date"
                                    );
                                  }
                                }}
                              >
                                <span
                                  className={
                                    futureDay && !status
                                      ? "monthly-status empty"
                                      : getDayCellClass(dayObj, futureDay)
                                  }
                                >
                                  {futureDay &&
                                    !normalizeStatus(dayObj?.status)
                                    ? ""
                                    : getDayCellText(dayObj, futureDay)}
                                </span>
                              </div>
                            );
                          })}

                          <div
                            className="monthly-count present-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.present || 0}
                          </div>
                          <div
                            className="monthly-count absent-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.absent || 0}
                          </div>

                          <div
                            className="monthly-count late-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.late || 0}
                          </div>

                          <div
                            className="monthly-count halfday-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.halfDay || 0}
                          </div>

                          <div
                            className="monthly-count leave-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.onLeave || 0}
                          </div>

                          <div
                            className="monthly-count lop-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.lossOfPay || 0}
                          </div>

                          <div
                            className="monthly-count mc-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.missedCheckout || 0}
                          </div>

                          <div
                            className="monthly-count lmc-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.lateMissedCheckout || 0}
                          </div>

                          <div
                            className="monthly-count weekend-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.weekend || 0}
                          </div>

                          <div
                            className="monthly-count holiday-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            {counts.holiday || 0}
                          </div>

                          <div
                            className="monthly-count"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: "58px",
                              background: "#fff",
                              borderBottom: "1px solid #eef2f7",
                              marginTop: "-1px",
                            }}
                          >
                            <button
                              className="attendance-edit-btn monthly-edit-btn"
                              onClick={() => openEditModal(emp)}
                            >
                              Edit
                            </button>
                          </div>
                        </React.Fragment>
                      );
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
            )}
          </div>
        )}
      </div>

      {downloadModalOpen && (
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
                aria-label="Close download attendance report"
              >
                ×
              </button>
            </div>

            <div className="attendance-report-body">
              <div className="attendance-report-section">
                <label className="attendance-report-label">
                  Download Type
                </label>

                <div className="attendance-report-type-grid">
                  {["Monthly", "Weekly"].map((reportType) => (
                    <button
                      type="button"
                      key={reportType}
                      className={`attendance-report-type-btn ${downloadReportType === reportType
                        ? "active"
                        : ""
                        }`}
                      onClick={() => setDownloadReportType(reportType)}
                      disabled={Boolean(downloadingReport)}
                    >
                      {reportType}
                    </button>
                  ))}
                </div>
              </div>

              <div className="attendance-report-section">
                <label className="attendance-report-label">
                  Month & Year
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px",
                    gap: "12px",
                  }}
                >
                  {/* MONTH */}
                  <select
                    id="attendance-report-month"
                    className="attendance-report-select"
                    value={downloadReportMonth}
                    onChange={(event) =>
                      setDownloadReportMonth(event.target.value)
                    }
                    disabled={Boolean(downloadingReport)}
                  >
                    {reportMonthOptions.map((monthOption) => (
                      <option
                        key={monthOption.value}
                        value={monthOption.value}
                      >
                        {monthOption.label}
                      </option>
                    ))}
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
                    disabled={Boolean(downloadingReport)}
                  >
                    {reportYearOptions.map((yearOption) => (
                      <option
                        key={yearOption.value}
                        value={yearOption.value}
                      >
                        {yearOption.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {downloadReportType === "Weekly" && (
                <div className="attendance-report-section">
                  <label className="attendance-report-label">
                    Select Week
                  </label>

                  <div className="attendance-report-week-list">
                    {reportWeeks.map((week) => (
                      <button
                        type="button"
                        key={week.id}
                        className={`attendance-report-week-card ${selectedReportWeekId === week.id
                          ? "active"
                          : ""
                          }`}
                        onClick={() => setSelectedReportWeekId(week.id)}
                        disabled={Boolean(downloadingReport)}
                      >
                        <span className="attendance-report-week-check" />

                        <span>
                          Week {week.week}
                        </span>

                        <strong>
                          {week.rangeLabel}
                        </strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="attendance-report-footer">
              <button
                type="button"
                className="attendance-report-cancel-btn"
                onClick={closeDownloadModal}
                disabled={Boolean(downloadingReport)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="attendance-report-download-btn"
                onClick={handleAttendanceReportDownload}
                disabled={Boolean(downloadingReport)}
              >
                {downloadingReport
                  ? "Downloading..."
                  : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}

      {editModalOpen && (
        <div className="attendance-modal-overlay">
          <div className="attendance-modal">
            <div className="attendance-modal-header">
              <h3>Update Attendance</h3>
              <button className="attendance-modal-close" onClick={closeEditModal}>
                ×
              </button>
            </div>

            <div className="attendance-modal-body">
              <div className="attendance-modal-employee">
                <div className="avatar large">
                  {getEmployeeName(selectedEmployee).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="emp-name">{getEmployeeName(selectedEmployee)}</div>
                  <div className="emp-dept">
                    {getEmployeeId(selectedEmployee)} •{" "}
                    {getEmployeeDept(selectedEmployee)}
                  </div>
                </div>
              </div>

              <div className="attendance-form-grid">
                <div className="attendance-form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={editForm.employeeId}
                    onChange={handleEditChange}
                    placeholder="Employee ID or name"
                    list="attendance-employee-options"
                  />
                  <datalist id="attendance-employee-options">
                    {employeeDirectory.flatMap((employee) => [
                      <option
                        key={`${employee.id}-name`}
                        value={employee.name}
                        label={employee.id}
                      />,
                      <option
                        key={`${employee.id}-id`}
                        value={employee.id}
                        label={employee.name}
                      />,
                    ])}
                  </datalist>
                </div>

                <div className="attendance-form-group">
                  <label>Date</label>
                  <AppDatePicker
                    name="date"
                    value={editForm.date}
                    onChange={handleEditChange}
                    maxDate={todayString}
                  />
                </div>

                <div className="attendance-form-group">
                  <label>Check In</label>

                  <div className="time-picker-wheel">

                    <div className="time-wheel-column">
                      <div className="wheel-label">
                        Hour
                      </div>

                      <div className="time-wheel-scroll"
                        ref={checkInHourRef}
                      >
                        {Array.from(
                          { length: 24 },
                          (item, hour) => hour
                        ).map((hour) => {

                          const value =
                            String(hour).padStart(2, "0");

                          return (
                            <div
                              key={value}
                              data-value={value}
                              className={`time-wheel-item ${getHour(editForm.checkIn) === value
                                ? "active"
                                : ""
                                }`}
                              onClick={() =>
                                updateTime(
                                  "checkIn",
                                  "hour",
                                  value
                                )
                              }
                            >
                              {value}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="time-wheel-column">
                      <div className="wheel-label">
                        Minute
                      </div>


                      <div
                        className="time-wheel-scroll"
                        ref={checkInMinuteRef}
                      >
                        {Array.from(
                          { length: 60 },
                          (item, minute) => minute
                        ).map((minute) => {

                          const value =
                            String(minute).padStart(2, "0");

                          return (
                            <div
                              key={value}
                              data-value={value}
                              className={`time-wheel-item ${getMinute(editForm.checkIn) === value
                                ? "active"
                                : ""
                                }`}
                              onClick={() =>
                                updateTime(
                                  "checkIn",
                                  "minute",
                                  value
                                )
                              }
                            >
                              {value}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="attendance-form-group">
                  <label>Check Out</label>

                  <div className="time-picker-wheel">

                    <div className="time-wheel-column">
                      <div className="wheel-label">
                        Hour
                      </div>

                      <div className="time-wheel-scroll"
                        ref={checkOutHourRef}
                      >
                        {Array.from(
                          { length: 24 },
                          (item, hour) => hour
                        ).map((hour) => {

                          const value =
                            String(hour).padStart(2, "0");

                          return (
                            <div
                              key={value}
                              data-value={value}
                              className={`time-wheel-item ${getHour(editForm.checkOut) === value
                                ? "active"
                                : ""
                                }`}
                              onClick={() =>
                                updateTime(
                                  "checkOut",
                                  "hour",
                                  value
                                )
                              }
                            >
                              {value}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="time-wheel-column">
                      <div className="wheel-label">
                        Minute
                      </div>

                      <div className="time-wheel-scroll"
                        ref={checkOutMinuteRef}
                      >
                        {Array.from(
                          { length: 60 },
                          (item, minute) => minute
                        ).map((minute) => {

                          const value =
                            String(minute).padStart(2, "0");

                          return (
                            <div
                              key={value}
                              data-value={value}
                              className={`time-wheel-item ${getMinute(editForm.checkOut) === value
                                ? "active"
                                : ""
                                }`}
                              onClick={() =>
                                updateTime(
                                  "checkOut",
                                  "minute",
                                  value
                                )
                              }
                            >
                              {value}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <div className="attendance-modal-footer">
              <button className="attendance-cancel-btn" onClick={closeEditModal}>
                Cancel
              </button>
              <button
                className="attendance-save-btn"
                onClick={handleUpdateAttendance}
                disabled={updateLoading}
              >
                {updateLoading ? "Updating..." : "Update Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}

      {/* DETAILS MODAL */}

      {detailsModalOpen && selectedAttendance && (

        <div className="attendance-details-overlay">

          <div className="attendance-details-modal compact-modal">

            {/* HEADER */}

            <div className="attendance-details-header">

              <div className="attendance-details-profile">

                <div className="attendance-details-avatar">
                  {getEmployeeName(
                    selectedAttendance.employee
                  ).charAt(0).toUpperCase()}
                </div>

                <div>
                  <h2>
                    {getEmployeeName(
                      selectedAttendance.employee
                    )}
                  </h2>

                  <p>
                    {getEmployeeId(
                      selectedAttendance.employee
                    )}
                  </p>
                </div>

              </div>

              <div className="attendance-details-header-actions">

                <button
                  type="button"
                  className="attendance-details-close"
                  onClick={closeAttendanceDetails}
                  aria-label="Close attendance details"
                >
                  ×
                </button>

              </div>

            </div>

            {/* FILTER */}

            <div className="attendance-filter-row">

              <div className="attendance-filter-left">

                <div className="attendance-filter-group">

                  <label>Filter</label>

                  <div className="attendance-filter-buttons">

                    <button
                      className={
                        detailsFilter === "Monthly"
                          ? "active"
                          : ""
                      }
                      onClick={() => setDetailsFilter("Monthly")}
                    >
                      Monthly
                    </button>

                    <button
                      className={
                        detailsFilter === "Weekly"
                          ? "active"
                          : ""
                      }
                      onClick={() => setDetailsFilter("Weekly")}
                    >
                      Weekly
                    </button>
                  </div>

                </div>

                <div className="attendance-filter-group">

                  <label>Month</label>

                  <div className="attendance-date-picker-box">

                    <select
                      value={selectedDetailsMonth}
                      onChange={handleDetailsMonthChange}
                      style={{
                        width: "100%",
                        minWidth: "180px",
                        padding: "10px 12px",
                        borderRadius: "12px",
                        border: "1px solid #d7dee9",
                        background: "#fff",
                        color: "#0f172a",
                        fontSize: "14px",
                        outline: "none"
                      }}
                    >
                      {availableDetailMonths.map((monthOption) => (
                        <option
                          key={monthOption.value}
                          value={monthOption.value}
                        >
                          {monthOption.label}
                        </option>
                      ))}
                    </select>

                  </div>

                </div>

              </div>

            </div>

            {detailsLoading ? (

              <div className="attendance-details-table">
                <p>Loading attendance...</p>
              </div>

            ) : (

              <>

                {/* SUMMARY */}

                <div className="attendance-summary-grid">

                  <div className="summary-card blue">
                    <span>Total Hours</span>
                    <h3>{detailSummary.totalHours}</h3>
                  </div>

                  <div className="summary-card green">
                    <span>Present</span>
                    <h3>{detailSummary.present}</h3>
                  </div>

                  <div className="summary-card red">
                    <span>Absent</span>
                    <h3>{detailSummary.absent}</h3>
                  </div>

                  <div className="summary-card purple">
                    <span>On Leave</span>
                    <h3>{detailSummary.onLeave}</h3>
                  </div>

                  <div className="summary-card orange">
                    <span>Late</span>
                    <h3>{detailSummary.late}</h3>
                  </div>

                  <div className="summary-card blue">
                    <span>Half Day</span>
                    <h3>{detailSummary.halfDay}</h3>
                  </div>

                  <div className="summary-card gray">
                    <span>Loss Of Pay</span>
                    <h3>{detailSummary.lossOfPay}</h3>
                  </div>

                  <div className="summary-card amber">
                    <span>Missed Checkout</span>
                    <h3>{detailSummary.missedCheckout}</h3>
                  </div>

                  <div className="summary-card rose">
                    <span>Late & Missed Checkout</span>
                    <h3>{detailSummary.lateMissedCheckout}</h3>
                  </div>

                  <div className="summary-card gray">
                    <span>Weekends</span>
                    <h3>{detailSummary.weekends}</h3>
                  </div>

                  <div className="summary-card gray">
                    <span>Holidays</span>
                    <h3>{detailSummary.holidays}</h3>
                  </div>

                  <div className="summary-card gray">
                    <span>Days</span>
                    <h3>
                      {detailsFilter === "Weekly"
                        ? 7
                        : detailsDaysInSelectedMonth}
                    </h3>
                  </div>

                </div>

                {/* WEEKLY BREAKDOWN ONLY MONTHLY */}

                {detailsFilter === "Monthly" && (

                  <div className="attendance-weekly-box">

                    <h4>Weekly Hours Breakdown</h4>

                    <div className="attendance-week-grid">

                      {filteredWeeklyBreakdown.map((week, index) => (

                        <div
                          className="attendance-week-card"
                          key={index}
                        >

                          <span className="attendance-week-label">
                            Week {week.week}
                          </span>

                          <p>
                            {week.start.toLocaleDateString()} -{" "}
                            {week.end.toLocaleDateString()}
                          </p>

                          <h3>
                            {Number(week.hours || 0).toFixed(1)}h
                          </h3>

                        </div>

                      ))}

                    </div>

                  </div>

                )}

                {/* TABLE */}

                <div className="attendance-details-table">

                  <table>

                    <thead>

                      <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Status</th>
                        <th>Hours</th>
                      </tr>

                    </thead>

                    <tbody>

                      {filteredDetailDays.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="attendance-empty"
                          >
                            No attendance data available for selected month
                          </td>
                        </tr>
                      )}

                      {filteredDetailDays.map((d, index) => {

                        const status =
                          d?.resolvedStatus ||
                          getResolvedStatus(d);

                        const date =
                          d?.resolvedDate ||
                          getAttendanceRecordDate(d);

                        const dateLabel =
                          date
                            ? date.toLocaleDateString()
                            : "-";

                        const dayLabel =
                          date
                            ? date.toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short"
                              }
                            )
                            : "-";

                        const resolvedHours =
                          Number(d?.resolvedHours || 0);

                        const checkInLabel =
                          formatTime(
                            d?.resolvedCheckIn ||
                            getCheckIn(d)
                          );

                        const checkOutLabel =
                          formatTime(
                            d?.resolvedCheckOut ||
                            getCheckOut(d)
                          );

                        return (

                          <tr
                            key={index}
                            title={`Check In: ${checkInLabel} | Check Out: ${checkOutLabel}`}
                          >

                            <td>
                              {dateLabel}
                            </td>

                            <td>
                              {dayLabel}
                            </td>

                            <td>

                              <span
                                className={`status-badge ${getStatusClass(status)}`}
                              >
                                {status || "No data"}
                              </span>

                            </td>

                            <td>

                              {resolvedHours > 0
                                ? `${resolvedHours.toFixed(1)}h`
                                : "0h"}

                            </td>

                          </tr>

                        );

                      })}

                    </tbody>

                  </table>

                </div>

              </>

            )}

          </div>

        </div>

      )}
    </>
  );
}

// Optimization: memoize the table so unrelated parent renders do not redraw large attendance grids.
export default memo(AttendanceTable);
