import React, { memo, useEffect, useMemo, useState } from "react";
import "./Dashboard.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import {
  compareDatesAsc,
  compareDatesDesc,
  formatDate,
  getTodayInputValue,
} from "../utils/date";
import { logPerformanceError } from "../utils/performance";

const sortHolidays = (items) => {
  const today = getTodayInputValue();

  return [...items].sort((left, right) => {
    const leftIsUpcoming = left.date >= today;
    const rightIsUpcoming = right.date >= today;

    if (leftIsUpcoming && !rightIsUpcoming) return -1;
    if (!leftIsUpcoming && rightIsUpcoming) return 1;

    return leftIsUpcoming
      ? compareDatesAsc(left.date, right.date)
      : compareDatesDesc(left.date, right.date);
  });
};

const normalizeHoliday = (holiday) => {
  const rawDate =
    holiday.date ||
    holiday.holiday_Date ||
    holiday.Holiday_Date ||
    holiday.Date ||
    "";

  return {
    ...holiday,
    holiday_Name: holiday.holiday_Name || holiday.holidayName || holiday.HolidayName || "",
    date: String(rawDate).split("T")[0],
  };
};

function Holidays({ holidays: dashboardHolidays }) {
  const [holidays, setHolidays] = useState([]);

  const normalizedDashboardHolidays = useMemo(() => {
    if (!Array.isArray(dashboardHolidays)) {
      return [];
    }

    // Optimization: reuse dashboard response holidays instead of making a second dashboard-side API call.
    return sortHolidays(dashboardHolidays.map(normalizeHoliday))
      .filter((holiday) => holiday.date >= getTodayInputValue())
      .slice(0, 3);
  }, [dashboardHolidays]);

  useEffect(() => {
    if (dashboardHolidays !== undefined) {
      setHolidays(normalizedDashboardHolidays);
      return undefined;
    }

    const controller = new AbortController();

    const fetchHolidays = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.company.holidays.list, {
          signal: controller.signal,
        });

        const data = extractCollection(res.data);

        const upcomingHolidays = sortHolidays(
          data
            .filter(
              (holiday) =>
                holiday.holiday_Name &&
                holiday.holiday_Date !== "0001-01-01T00:00:00"
            )
            .map(normalizeHoliday)
        )
          .filter((holiday) => holiday.date >= getTodayInputValue())
          .slice(0, 3);

        setHolidays(upcomingHolidays);
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }

        logPerformanceError("Holiday fetch error:", error);
        setHolidays([]);
      }
    };

    fetchHolidays();

    return () => controller.abort();
  }, [dashboardHolidays, normalizedDashboardHolidays]);

  return (
    <div className="holidays">
      <h3>Upcoming Holidays</h3>

      <div className="holiday-list">
        {holidays.length === 0 ? (
          <p>No upcoming holidays</p>
        ) : (
          holidays.map((holiday, index) => (
            <div className="holiday-item" key={index}>
              <span className="holiday-name">
                {holiday.holiday_Name}
              </span>

              <span className="holiday-date">
                {formatDate(holiday.date)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(Holidays);
