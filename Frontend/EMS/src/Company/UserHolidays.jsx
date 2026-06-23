import React, { useState, useEffect } from "react";
import "./Holidays.css";
import { FaCalendarAlt } from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import TruncatedText from "../components/TruncatedText";
import { extractCollection } from "../utils/collections";
import { formatDate } from "../utils/date";
import { getStoredToken } from "../utils/authStorage";

function UserHolidays() {

  const token = getStoredToken();

  const [holidays, setHolidays] = useState([]);

  /* ================= FETCH HOLIDAYS ================= */

  const fetchHolidays = async () => {

    try {

      const res = await api.get(
        API_ENDPOINTS.company.holidays.list,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = extractCollection(res.data);

      if (!Array.isArray(data)) {

        setHolidays([]);
        return;
      }

      const formatted = data
        .filter(
          (item) =>
            item.holiday_Name &&
            item.holiday_Name.trim() !== "" &&
            item.holiday_Date !== "0001-01-01T00:00:00"
        )
        .sort(
          (a, b) =>
            new Date(a.holiday_Date) -
            new Date(b.holiday_Date)
        )
        .map((item) => ({
          id: item.id,
          name: item.holiday_Name,
          date: item.holiday_Date
            ? item.holiday_Date.split("T")[0]
            : "",
          day: item.day || "",
          type: item.type || "",
        }));

      setHolidays(formatted);

    }
    catch (err) {

      console.error(
        "Fetch error:",
        err
      );
    }
  };

  useEffect(() => {

    fetchHolidays();

  }, []);

  /* ================= UI ================= */

  return (

    <div
      className="holiday-page holiday-page--user"
      style={{
        padding: "16px",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >

      <div
        className="holiday-header"
        style={{
          marginBottom: "12px",
        }}
      >

        <div className="holiday-header-copy">

          <h2
            style={{
              margin: "0",
              fontSize: "24px",
              fontWeight: "700",
              color: "#0f172a",
            }}
          >
            Company Holidays
          </h2>

          <p
            style={{
              marginTop: "4px",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            {holidays.length} Holidays This Year
          </p>

        </div>
      </div>

      <div
        className="holiday-table-wrapper app-table-scroll"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >

        <table
          className="holiday-table holiday-table--user"
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >

          <colgroup>
            <col className="holiday-width-sno" />
            <col className="holiday-width-name" />
            <col className="holiday-width-date" />
            <col className="holiday-width-day" />
            <col className="holiday-width-type" />
          </colgroup>

          <thead>

            <tr
              style={{
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
              }}
            >

              <th
                className="holiday-col-sno"
                style={{
                  padding: "14px 20px",
                  textAlign: "left",
                }}
              >
                S.No
              </th>

              <th
                className="holiday-col-name"
                style={{
                  padding: "14px 20px",
                  textAlign: "left",
                }}
              >
                Holiday Name
              </th>

              <th
                className="holiday-col-date"
                style={{
                  padding: "14px 20px",
                  textAlign: "left",
                }}
              >
                Date
              </th>

              <th
                className="holiday-col-day"
                style={{
                  padding: "14px 20px",
                  textAlign: "left",
                }}
              >
                Day
              </th>

              <th
                className="holiday-col-type"
                style={{
                  padding: "14px 20px",
                  textAlign: "left",
                }}
              >
                Type
              </th>

            </tr>

          </thead>

          <tbody>

            {holidays.length === 0 ? (

              <tr>

                <td
                  colSpan="5"
                  className="app-table-empty-cell"
                  style={{
                    padding: "28px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  No Holidays Found
                </td>

              </tr>

            ) : (

              holidays.map((h, i) => (

                <tr
                  key={h.id}
                  style={{
                    borderBottom: "1px solid #eef2f7",
                    transition: "0.2s ease",
                  }}
                >

                  <td
                    className="holiday-col-sno"
                    style={{
                      padding: "16px 20px",
                      fontSize: "14px",
                      color: "#0f172a",
                    }}
                  >
                    {i + 1}
                  </td>

                  <td
                    className="holiday-col-name"
                    style={{
                      padding: "16px 20px",
                    }}
                  >

                    <div
                      className="holiday-name-cell"
                      title={h.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >

                      <FaCalendarAlt
                        className="holiday-icon"
                        style={{
                          color: "#0f172a",
                          minWidth: "14px",
                          fontSize: "14px",
                        }}
                      />

                      <TruncatedText
                        className="holiday-name-text"
                        value={h.name}
                      />

                    </div>

                  </td>

                  <td
                    className="holiday-col-date"
                    style={{
                      padding: "16px 20px",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    {formatDate(h.date)}
                  </td>

                  <td
                    className="holiday-col-day"
                    style={{
                      padding: "16px 20px",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    {h.day}
                  </td>

                  <td
                    className="holiday-col-type"
                    style={{
                      padding: "16px 20px",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    {h.type}
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

export default UserHolidays;
