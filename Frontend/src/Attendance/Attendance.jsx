import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import AppMonthPicker from "../components/AppMonthPicker";
import AttendanceTable from "./AttendanceTable";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "./AttendanceTable.css";

const ATTENDANCE_TABS = [
  "All",
  "Present",
  "Late",
  "Absent",
  "Half Day",
  "On Leave",
  "Loss Of Pay",
  "Missed Checkout",
  "Late & Missed Checkout"
];

const normalizeStatusQueryValue = (value) => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalizedValue) {
    return "";
  }

  if (["present", "p"].includes(normalizedValue)) {
    return "Present";
  }

  if (["late", "l", "lt"].includes(normalizedValue)) {
    return "Late";
  }

  if (["absent", "a"].includes(normalizedValue)) {
    return "Absent";
  }

  if (["half day", "halfday", "hd"].includes(normalizedValue)) {
    return "Half Day";
  }

  if (["on leave", "leave", "ol"].includes(normalizedValue)) {
    return "On Leave";
  }

  if (["loss of pay", "lop"].includes(normalizedValue)) {
    return "Loss Of Pay";
  }

  if (
    ["missed checkout", "missed check out", "mc"].includes(
      normalizedValue
    )
  ) {
    return "Missed Checkout";
  }

  if (
    ["late & missed checkout", "late & missed check out", "lmc"].includes(
      normalizedValue
    )
  ) {
    return "Late & Missed Checkout";
  }

  return "";
};

const getInitialAttendanceState = (searchString) => {
  const params = new URLSearchParams(searchString);

  const status = normalizeStatusQueryValue(params.get("status"));

  if (status) {
    return {
      viewMode: "daily",
      filter: status,
    };
  }

  return {
    viewMode: "monthly",
    filter: "All",
  };
};

function Attendance() {

  const location = useLocation();

  const [viewMode, setViewMode] = useState(
    () =>
      String(getInitialAttendanceState(location.search).viewMode)
        .trim()
        .toLowerCase()
  );

  const [filter, setFilter] = useState(
    () => getInitialAttendanceState(location.search).filter
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  // Optimization: keep date boundaries stable instead of recreating them on every keystroke render.
  const today = useMemo(() => new Date(), []);

  const [month, setMonth] = useState(
    today.getMonth() + 1
  );

  const [year, setYear] = useState(
    today.getFullYear()
  );

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();

    return `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
  });

  // ================= URL FILTER HANDLING =================

  useEffect(() => {

    if (!location.search) {
      return;
    }

    const nextState =
      getInitialAttendanceState(
        location.search
      );

    const nextViewMode =
      String(nextState.viewMode)
        .trim()
        .toLowerCase();

    // Optimization: avoid no-op state updates that would rerender the full attendance table.
    setViewMode((currentViewMode) =>
      currentViewMode === nextViewMode ? currentViewMode : nextViewMode
    );

    setFilter((currentFilter) =>
      currentFilter === nextState.filter ? currentFilter : nextState.filter
    );

  }, [location.search]);

  return (

    <div className="attendance-page">

      {/* ================= HEADER ================= */}

      <div className="attendance-header">

        <div>

          <h2>
            Attendance
          </h2>

          <p className="attendance-subtitle">
            Monitoring employees
          </p>

        </div>

        <div className="attendance-top-controls">

          {/* ================= VIEW SELECT ================= */}

          <select
            className="attendance-select"
            value={String(viewMode)
              .trim()
              .toLowerCase()}
            onChange={(e) =>
              setViewMode(
                String(e.target.value)
                  .trim()
                  .toLowerCase()
              )
            }
          >

            <option value="daily">
              Daily
            </option>

            <option value="monthly">
              Monthly
            </option>

          </select>

          {viewMode === "daily" && (
            <select
              className="attendance-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              {Array.from({ length: 365 }, (_, i) => {
                const date = new Date(new Date().getFullYear(), 0, 1);
                date.setDate(date.getDate() + i);

                const value = `${date.getFullYear()}-${String(
                  date.getMonth() + 1
                ).padStart(2, "0")}-${String(
                  date.getDate()
                ).padStart(2, "0")}`;

                return (
                  <option key={value} value={value}>
                    {date.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </option>
                );
              })}
            </select>
          )}
          {/* ================= MONTH PICKER ================= */}

          {String(viewMode)
            .trim()
            .toLowerCase() === "monthly" && (

              <AppMonthPicker
                month={month}
                year={year}
                onMonthChange={setMonth}
                onYearChange={setYear}
                minYear={2020}
                maxYear={today.getFullYear() + 2}
                disabled={false}
              />

            )}

        </div>

      </div>

      {/* ================= TOOLBAR ================= */}

      <div className="attendance-toolbar">

        <input
          className="attendance-search"
          type="text"
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <div className="attendance-filters">

          {ATTENDANCE_TABS.map((tab) => (

            <button
              key={tab}
              className={
                filter === tab
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(tab)
              }
            >
              {tab}
            </button>

          ))}

        </div>

      </div>

      {/* ================= TABLE ================= */}

      <AttendanceTable
        viewMode={String(viewMode)
          .trim()
          .toLowerCase()}
        filter={filter}
        search={debouncedSearch}
        month={month}
        year={year}
        selectedDate={selectedDate}
      />

    </div>
  );
}

// Optimization: memoize the page wrapper so parent route renders do not redraw the table unnecessarily.
export default React.memo(Attendance);
