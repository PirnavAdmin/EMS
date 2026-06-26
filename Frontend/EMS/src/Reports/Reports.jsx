import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBuilding,
  FaDownload,
  FaPlaneDeparture,
  FaProjectDiagram,
  FaRupeeSign,
  FaSpinner,
  FaTasks,
  FaUserCheck,
  FaUserTimes,
  FaUsers,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Reports.css";

import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { getStoredToken } from "../utils/authStorage";
import {
  downloadBinaryFile,
  getDownloadErrorMessage,
} from "../utils/downloadUtils";
import { formatCurrency } from "../utils/formatters";
import { PageSkeleton } from "../components/Skeletons";
import useTheme from "../theme/useTheme";

function Reports() {
  const token = getStoredToken();
  const navigate = useNavigate();
  const { themeMode } = useTheme();
  const isDarkTheme = themeMode !== "light";

  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingReportKey, setDownloadingReportKey] = useState("");

  const downloadLockRef = useRef("");

  useEffect(() => {
    let isMounted = true;

    const fetchReports = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(API_ENDPOINTS.reports.all, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) {
          return;
        }

        const data = response?.data?.data || response?.data || {};

        const cards = [
          {
            icon: <FaUsers />,
            title: "Employee List",
            desc: "Total number of employees",
            meta: `${data.totalEmployees || 0} records`,
            path: "/employees",
            exportApi: "/Employees/download-full-master",
            fileName: "Employees.xlsx",
          },

          {
            icon: <FaBuilding />,
            title: "Department List",
            desc: "Total number of departments",
            meta: `${data.totalDepartments || 0} records`,
            path: "/departments",
            exportApi: "/api/Departments/export",
            fileName: "Departments.xlsx",
          },

          {
            icon: <FaUserCheck />,
            title: "Present Today",
            desc: "Employees marked present today",
            meta: `${data.presentToday || 0} employees`,
            path: "/attendance",
            filter: "present",

            exportApi: () => {

              const today =
                new Date()
                  .toISOString()
                  .split("T")[0];

              return `/api/Attendance/export-present-late?date=${today}`;
            },

            fileName: "PresentEmployees.xlsx",
          },

          {
            icon: <FaUserTimes />,
            title: "Absent Today",
            desc: "Employees marked absent today",
            meta: `${data.absentToday || 0} employees`,
            path: "/attendance",
            filter: "absent",

            exportApi: () => {

              const today =
                new Date()
                  .toISOString()
                  .split("T")[0];

              return `/api/Attendance/export-absent?date=${today}`;
            },

            fileName: "AbsentEmployees.xlsx",
          },

          {
            icon: <FaTasks />,
            title: "Task Report",
            desc: "Total active and tracked tasks",
            meta: `${data.totalTasks || 0} tasks`,
            path: "/tasks",
            exportApi: "/api/TaskManagement/export",
            fileName: "Tasks.xlsx",
          },

          {
            icon: <FaPlaneDeparture />,
            title: "Leave Report",
            desc: "Total employee leave records",
            meta: `${data.totalLeaves || 0} leaves`,
            path: "/leave-management",
            exportApi: "/api/EmployeeLeave/export",
            fileName: "Leaves.xlsx",
          },

          {
            icon: <FaProjectDiagram />,
            title: "Project Report",
            desc: "Total projects in the system",
            meta: `${data.totalProjects || 0} projects`,
            path: "/projects",
            exportApi: "/api/Projects/export",
            fileName: "Projects.xlsx",
          },

          {
            icon: <FaBuilding />,
            title: "Clients Report",
            desc: "Total clients in the system",
            meta: `${data.totalClients || 0} clients`,
            path: "/clients",
            exportApi: "/api/Clients/export",
            fileName: "Clients.xlsx",
          },

          {
            icon: <FaRupeeSign />,
            title: "Salary Report",
            desc: "Total salary paid for current month",

            meta: formatCurrency(
              data.totalSalaryPaid || 0,
              {
                fallback: "₹0",
                showZero: true,
              }
            ),

            path: "/payroll",

            exportApi: () => {

              const currentDate =
                new Date();

              const month =
                currentDate.toLocaleString(
                  "default",
                  {
                    month: "long",
                  }
                );

              const year =
                currentDate.getFullYear();

              return `/PaySlip/salary-register?month=${month}&year=${year}`;
            },

            fileName: "SalaryReport.xlsx",
          },
        ];

        setReportCards(cards);
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        console.error("Error fetching reports:", fetchError);
        setError("Failed to fetch reports.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReports();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleReportClick = (report) => {
    if (report.filter === "present") {
      navigate("/attendance?status=present");
      return;
    }

    if (report.filter === "absent") {
      navigate("/attendance?status=absent");
      return;
    }

    if (report.path) {
      navigate(report.path);
    }
  };

  const handleDownload = async (event, report) => {
    event.preventDefault();
    event.stopPropagation();

    if (!report.exportApi) {
      return;
    }

    const endpoint =
      typeof report.exportApi === "function"
        ? report.exportApi()
        : report.exportApi;

    const downloadKey = endpoint;

    if (downloadLockRef.current) {
      return;
    }

    downloadLockRef.current = downloadKey;
    setDownloadingReportKey(downloadKey);

    try {
      await downloadBinaryFile({
        endpoint,
        token,
        fallbackFileName: report.fileName || "Report.xlsx",
      });
    } catch (downloadError) {
      if (
        downloadError?.code === "ERR_CANCELED" ||
        /session expired/i.test(downloadError?.message || "")
      ) {
        return;
      }

      const downloadMessage = downloadError?.response
        ? await getDownloadErrorMessage(
          downloadError,
          `Failed to download ${report.title.toLowerCase()}.`
        )
        : downloadError?.message ||
        `Failed to download ${report.title.toLowerCase()}.`;

      console.error(`Download failed for ${report.title}:`, downloadError);
      toast.error(downloadMessage);
    } finally {
      if (downloadLockRef.current === downloadKey) {
        downloadLockRef.current = "";
      }

      setDownloadingReportKey((currentKey) =>
        currentKey === downloadKey ? "" : currentKey
      );
    }
  };

  if (loading) {
    return (
      <div className="reports-container app-page-surface" style={{ padding: "24px" }}>
        <PageSkeleton variant="cards" cardCount={6} />
      </div>
    );
  }

  if (error) {
    return <div className="reports-container error-text">{error}</div>;
  }

  return (
    <div className="reports-page">
      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme={isDarkTheme ? "dark" : "light"}
      />

      <div className="reports-header">
        <h2 className="reports-title">Reports</h2>
        <p className="reports-subtitle">Generate and view reports</p>
      </div>

      <div className="reports-grid">
        {reportCards.map((report) => {
          const isDownloading = downloadingReportKey === report.exportApi;

          return (
            <div
              key={report.title}
              className="report-card"
              onClick={() => handleReportClick(report)}
            >
              <div className="report-card-top">
                <div className="report-icon">{report.icon}</div>

                {report.exportApi ? (
                  <button
                    type="button"
                    className="report-download-btn"
                    onClick={(event) => handleDownload(event, report)}
                    disabled={Boolean(downloadingReportKey)}
                    aria-label={`Download ${report.title}`}
                    title={`Download ${report.title}`}
                  >
                    {isDownloading ? (
                      <FaSpinner className="report-download-icon report-download-spinner" />
                    ) : (
                      <FaDownload className="report-download-icon" />
                    )}
                  </button>
                ) : null}
              </div>

              <h3>{report.title}</h3>
              <p>{report.desc}</p>
              <div className="report-meta">{report.meta}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Reports;
