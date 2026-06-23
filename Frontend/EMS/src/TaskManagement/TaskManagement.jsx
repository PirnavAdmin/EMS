import React, { useState, useEffect } from "react";
import "./TaskManagement.css";
import CreateTaskModal from "./CreateTaskModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { formatDate } from "../utils/date";
import { extractCollection } from "../utils/collections";

function TaskManagement() {
  const [emsTaskFilter, setEmsTaskFilter] = useState("All");
  const [emsTaskShowPopup, setEmsTaskShowPopup] = useState(false);
  const [emsTaskSelected, setEmsTaskSelected] = useState(null);
  const [emsTaskData, setEmsTaskData] = useState([]);
  const [viewTask, setViewTask] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  const formatTaskDate = (value) => {
    return formatDate(value);
  };

  /* ================= NORMALIZE STATUS ================= */

  const normalizeStatus = (status) => {
    if (!status) return "ToDo";

    const clean = status.toString().toLowerCase().replace(/\s/g, "");

    if (clean.includes("todo")) return "ToDo";
    if (clean.includes("inprogress")) return "InProgress";
    if (clean.includes("completed")) return "Completed";
    if (clean.includes("overdue")) return "Overdue";

    return "ToDo";
  };

  /* ================= FETCH TASKS ================= */

  const fetchTasks = async (showToast = false) => {
    try {
      const res = await api.get(API_ENDPOINTS.tasks.list);

      const formatted = extractCollection(res.data).map((task) => ({
        emsTaskId: task.id ?? task.Id,
        emsTaskTitle: task.taskTitle ?? task.TaskTitle,
        emsTaskUser: task.assignedTo ?? task.AssignedTo,
        emsTaskProject: task.project ?? task.Project,
        emsTaskDescription: task.description ?? task.Description,
        emsTaskPriority: task.priority ?? task.Priority,
        emsTaskDue: task.dueDate ?? task.DueDate,
        emsTaskState: normalizeStatus(task.status ?? task.Status)
      }));

      setEmsTaskData(formatted);

    } catch (error) {
      console.error("Fetch failed:", error);
      toast.error("Something went wrong while fetching tasks");
    }
  };

  useEffect(() => {
    fetchTasks(true);
  }, []);

  useEffect(() => {

    const slider = document.querySelector(
      ".ems-task-horizontal-scroll-wrapper"
    );

    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    const mouseDown = (e) => {
      isDown = true;
      slider.classList.add("active");
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const mouseLeave = () => {
      isDown = false;
    };

    const mouseUp = () => {
      isDown = false;
    };

    const mouseMove = (e) => {

      if (!isDown) return;

      e.preventDefault();

      const x = e.pageX - slider.offsetLeft;

      const walk = (x - startX) * 1.5;

      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener("mousedown", mouseDown);
    slider.addEventListener("mouseleave", mouseLeave);
    slider.addEventListener("mouseup", mouseUp);
    slider.addEventListener("mousemove", mouseMove);

    return () => {

      slider.removeEventListener("mousedown", mouseDown);
      slider.removeEventListener("mouseleave", mouseLeave);
      slider.removeEventListener("mouseup", mouseUp);
      slider.removeEventListener("mousemove", mouseMove);

    };

  }, []);

  /* ================= DELETE TASK ================= */
  const handleDeleteTask = async (id) => {

    if (!id) {
      toast.error("Task ID not found");
      return;
    }

    try {

      console.log("Deleting Task ID:", id);
      console.log(
        "Delete URL:",
        API_ENDPOINTS.tasks.byId(id)
      );

      await api.delete(
        API_ENDPOINTS.tasks.byId(id),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") ||
              sessionStorage.getItem("token")
              }`,
          },
        }
      );

      setEmsTaskSelected(null);
      setDeleteTaskId(null);

      toast.success("Task deleted successfully");

      fetchTasks();

    } catch (error) {

      console.error(
        "Delete failed:",
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message ||
        "Something went wrong while deleting task"
      );
    }
  };

  /* ================= FILTER ================= */

  const emsFilteredTaskData =
    emsTaskFilter === "All"
      ? emsTaskData
      : emsTaskData.filter(
        (task) =>
          task.emsTaskState.toLowerCase() ===
          emsTaskFilter.toLowerCase()
      );

  return (
    <div
      className="ems-task-page-wrapper"
      style={{
        padding: "18px"
      }}
    >
      <ToastContainer position="top-right" autoClose={2500} />

      {/* =======================================================
        HEADER
      ======================================================= */}

      <div
        className="ems-task-header-wrapper"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "18px",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color: "#0f172a",
              marginBottom: "4px",
              lineHeight: "1.1"
            }}
          >
            Task Management
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "#64748b",
              fontWeight: "500",
              margin: "0"
            }}
          >
            Create, assign and monitor tasks
          </p>
        </div>

        <button
          className="ems-task-create-action-button"
          onClick={() => {
            setEmsTaskSelected(null);
            setEmsTaskShowPopup(true);
          }}
          style={{
            border: "none",
            background: "#12c7c7",
            color: "#001219",
            padding: "10px 18px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
            height: "42px",
            minWidth: "140px",
            boxShadow: "0 6px 18px rgba(18,199,199,0.15)"
          }}
        >
          + Create Task
        </button>
      </div>

      {/* =======================================================
    SUMMARY CARDS
======================================================= */}

      <div
        className="ems-task-summary-card-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "14px",
          marginBottom: "18px"
        }}
      >
        {/* TODO */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "10px 22px",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            border: "1px solid #e5edf5",
            minHeight: "58px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <p
            style={{
              color: "#475569",
              fontSize: "15px",
              margin: 0,
              fontWeight: "600"
            }}
          >
            To Do
          </p>

          <h3
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#0f172a",
              margin: 0,
              lineHeight: 1
            }}
          >
            {
              emsTaskData.filter(
                (t) => t.emsTaskState.toLowerCase() === "todo"
              ).length
            }
          </h3>
        </div>

        {/* IN PROGRESS */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "10px 22px",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            border: "1px solid #e5edf5",
            minHeight: "58px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <p
            style={{
              color: "#475569",
              fontSize: "15px",
              margin: 0,
              fontWeight: "600"
            }}
          >
            In Progress
          </p>

          <h3
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#2563eb",
              margin: 0,
              lineHeight: 1
            }}
          >
            {
              emsTaskData.filter(
                (t) => t.emsTaskState.toLowerCase() === "inprogress"
              ).length
            }
          </h3>
        </div>

        {/* COMPLETED */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "10px 22px",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            border: "1px solid #e5edf5",
            minHeight: "58px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <p
            style={{
              color: "#475569",
              fontSize: "15px",
              margin: 0,
              fontWeight: "600"
            }}
          >
            Completed
          </p>

          <h3
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#16a34a",
              margin: 0,
              lineHeight: 1
            }}
          >
            {
              emsTaskData.filter(
                (t) => t.emsTaskState.toLowerCase() === "completed"
              ).length
            }
          </h3>
        </div>

        {/* OVERDUE */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "10px 22px",
            boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            border: "1px solid #e5edf5",
            minHeight: "58px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <p
            style={{
              color: "#475569",
              fontSize: "15px",
              margin: 0,
              fontWeight: "600"
            }}
          >
            Overdue
          </p>

          <h3
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#ef4444",
              margin: 0,
              lineHeight: 1
            }}
          >
            {
              emsTaskData.filter(
                (t) => t.emsTaskState.toLowerCase() === "overdue"
              ).length
            }
          </h3>
        </div>
      </div>

      {/* =======================================================
        FILTER BUTTONS
      ======================================================= */}

      <div
        className="ems-task-filter-tab-container"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "18px"
        }}
      >
        {["All", "ToDo", "InProgress", "Completed", "Overdue"].map((tab) => (
          <button
            key={tab}
            onClick={() => setEmsTaskFilter(tab)}
            style={{
              border: "none",
              padding: "8px 16px",
              borderRadius: "999px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "13px",
              height: "38px",
              transition: ".2s ease",
              background:
                emsTaskFilter === tab ? "#12c7c7" : "#e2e8f0",
              color:
                emsTaskFilter === tab ? "#ffffff" : "#334155"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* =======================================================
        TABLE
      ======================================================= */}

      <div
        className="ems-task-horizontal-scroll-wrapper"

      >

        {/* SCROLL NOTICE */}

        <div
          style={{
            background: "#ecfeff",
            color: "#17889c",
            padding: "10px",
            textAlign: "center",
            fontWeight: "700",
            fontSize: "14px",
            borderBottom: "1px solid #d9fafa"
          }}
        >
          ← Scroll horizontally to view more task details →
        </div>
        <div
          className="ems-task-horizontal-scroll-wrapper"
          style={{
            width: "100%",
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: "500px",
            WebkitOverflowScrolling: "touch",
            cursor: "grab"
          }}
        >
          <table
            className="ems-task-data-main-table"
            style={{
              width: "100%",
              minWidth: "1450px",
              borderCollapse: "collapse",
              tableLayout: "auto"
            }}
          >
            <thead>
              <tr>
                {[
                  "TASK",
                  "ASSIGNEE",
                  "PROJECT",
                  "DESCRIPTION",
                  "PRIORITY",
                  "DUE",
                  "STATUS",
                  "ACTIONS"
                ].map((head) => (
                  <th
                    key={head}
                    className="task-table-heading"
                  >
                    <span>{head}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {emsFilteredTaskData.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      fontWeight: "600",
                      color: "#64748b"
                    }}
                  >
                    No tasks found for the selected filter.
                  </td>
                </tr>
              ) : (
                emsFilteredTaskData.map((task) => (
                  <tr
                    key={task.emsTaskId}
                    onClick={() => setViewTask(task)}
                    style={{
                      borderBottom: "1px solid #edf2f7",
                      cursor: "pointer"
                    }}
                  >
                    {/* TASK */}
                    <td
                      style={{
                        padding: "14px 18px",
                        fontWeight: "700",
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "visible",
                        textOverflow: "ellipsis",
                        maxWidth: "220px",
                        fontSize: "14px"
                      }}
                      title={task.emsTaskTitle}
                    >
                      {task.emsTaskTitle}
                    </td>

                    {/* ASSIGNEE */}

                    <td
                      style={{
                        padding: "14px 18px",
                        color: "#334155",
                        fontWeight: "600",
                        fontSize: "14px"
                      }}
                    >
                      {task.emsTaskUser}
                    </td>

                    {/* PROJECT */}

                    <td
                      style={{
                        padding: "14px 18px",
                        color: "#334155",
                        fontWeight: "600",
                        fontSize: "14px"
                      }}
                    >
                      {task.emsTaskProject}
                    </td>

                    {/* DESCRIPTION */}

                    <td
                      onClick={() => setViewTask(task)}
                      title={task.emsTaskDescription}
                      style={{
                        padding: "14px 18px",
                        cursor: "pointer",
                        color: "#64748b",
                        maxWidth: "240px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        fontSize: "14px"
                      }}
                    >
                      {task.emsTaskDescription}
                    </td>

                    {/* PRIORITY */}

                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          padding: "7px 12px",
                          borderRadius: "999px",
                          fontWeight: "700",
                          fontSize: "12px",
                          display: "inline-flex",
                          background:
                            task.emsTaskPriority?.toLowerCase() === "high"
                              ? "#fee2e2"
                              : task.emsTaskPriority?.toLowerCase() === "medium"
                                ? "#dbeafe"
                                : "#e5e7eb",
                          color:
                            task.emsTaskPriority?.toLowerCase() === "high"
                              ? "#991b1b"
                              : task.emsTaskPriority?.toLowerCase() === "medium"
                                ? "#1d4ed8"
                                : "#374151"
                        }}
                      >
                        {task.emsTaskPriority}
                      </span>
                    </td>

                    {/* DUE */}

                    <td
                      style={{
                        padding: "14px 18px",
                        color: "#334155",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                        fontSize: "14px"
                      }}
                    >
                      {formatTaskDate(task.emsTaskDue)}
                    </td>

                    {/* STATUS */}

                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          fontWeight: "800",
                          fontSize: "14px",
                          color:
                            task.emsTaskState === "Completed"
                              ? "#16a34a"
                              : task.emsTaskState === "Overdue"
                                ? "#ef4444"
                                : task.emsTaskState === "InProgress"
                                  ? "#2563eb"
                                  : "#64748b"
                        }}
                      >
                        {task.emsTaskState}
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td
                      style={{
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <button
                        className="ems-task-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmsTaskSelected(task);
                          setEmsTaskShowPopup(true);
                        }}
                        style={{
                          border: "1px solid #bae6fd",
                          background: "#ecfeff",
                          color: "#0f3b52",
                          minWidth: "78px",
                          height: "40px",
                          borderRadius: "10px",
                          fontWeight: "700",
                          cursor: "pointer",
                          fontSize: "13px"
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="ems-task-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTaskId(task.emsTaskId);
                        }}
                        style={{
                          border: "1px solid #fecdd3",
                          background: "#fff1f2",
                          color: "#dc2626",
                          minWidth: "78px",
                          height: "40px",
                          borderRadius: "10px",
                          fontWeight: "700",
                          cursor: "pointer",
                          fontSize: "13px"
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW TASK POPUP */}

      {viewTask && (

        <div
          className="ems-task-view-overlay"
          onClick={() => setViewTask(null)}
        >

          <div
            className="ems-task-view-popup"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="ems-task-view-header">

              <h3>
                Task Details
              </h3>

              <button
                type="button"
                className="ems-task-view-close"
                onClick={() => setViewTask(null)}
              >
                ×
              </button>

            </div>

            <div className="ems-task-view-content">

              <div className="ems-task-view-row">
                <strong>Task</strong>
                <span>{viewTask.emsTaskTitle}</span>
              </div>

              <div className="ems-task-view-row">
                <strong>Assignee</strong>
                <span>{viewTask.emsTaskUser}</span>
              </div>

              <div className="ems-task-view-row">
                <strong>Project</strong>
                <span>{viewTask.emsTaskProject}</span>
              </div>

              <div className="ems-task-view-row">
                <strong>Description</strong>
                <span>{viewTask.emsTaskDescription}</span>
              </div>

              <div className="ems-task-view-row">
                <strong>Priority</strong>
                <span>{viewTask.emsTaskPriority}</span>
              </div>

              <div className="ems-task-view-row">
                <strong>Due Date</strong>
                <span>
                  {formatTaskDate(viewTask.emsTaskDue)}
                </span>
              </div>

              <div className="ems-task-view-row">
                <strong>Status</strong>
                <span>{viewTask.emsTaskState}</span>
              </div>

            </div>

          </div>

        </div>

      )}

      {/* DELETE CONFIRM POPUP */}

      {deleteTaskId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
        >
          <div
            style={{
              width: "520px",
              background: "#ffffff",
              borderRadius: "22px",
              padding: "34px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "800",
                color: "#0f172a",
                marginBottom: "26px"
              }}
            >
              Confirm Delete
            </h2>

            <p
              style={{
                fontSize: "17px",
                color: "#475569",
                marginBottom: "38px",
                lineHeight: "1.5"
              }}
            >
              Are you sure you want to delete this task?
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "14px"
              }}
            >
              <button
                onClick={() => setDeleteTaskId(null)}
                style={{
                  border: "1px solid #dbe2ea",
                  background: "#f8fafc",
                  color: "#334155",
                  minWidth: "105px",
                  height: "52px",
                  borderRadius: "14px",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => handleDeleteTask(deleteTaskId)}
                style={{
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  minWidth: "138px",
                  height: "52px",
                  borderRadius: "14px",
                  fontSize: "16px",
                  fontWeight: "800",
                  cursor: "pointer"
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}

      {emsTaskShowPopup && (
        <CreateTaskModal
          emsTaskClosePopup={() => setEmsTaskShowPopup(false)}
          editData={emsTaskSelected}
          refreshTasks={fetchTasks}
        />
      )}

    </div>
  );
}

export default TaskManagement;
