import React, { useEffect, useState } from "react";
import "./UserTaskManagement.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection, sortByRecency } from "../utils/collections";
import { formatDate } from "../utils/date";
import { getStoredToken } from "../utils/authStorage";
 
function UserTaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
 
  // =========================
  // FETCH TASKS
  // =========================
  const fetchTasks = async () => {
    try {
      const token = getStoredToken();
 
      if (!token) {
        console.error("❌ No token found");
        setTasks([]);
        setLoading(false);
        return;
      }
 
      const res = await api.get(API_ENDPOINTS.tasks.myTasks, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
 
      const data = res.data;
      console.log("📦 Tasks API Response:", data);
 
      // ✅ FIXED: API returns object with tasks array
      const taskList = sortByRecency(
        Array.isArray(data?.tasks)
          ? data.tasks
          : extractCollection(data)
      );
 
      console.log("✅ Final Task List:", taskList);
 
      setTasks(taskList);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };
 
  // =========================
  // UPDATE TASK STATUS
  // =========================
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = getStoredToken();
      setUpdatingId(taskId);
 
      console.log("🛠 Updating Task ID:", taskId);
      console.log("🛠 New Status:", newStatus);
 
      const res = await api.put(
        API_ENDPOINTS.tasks.updateUserStatus(taskId),
        JSON.stringify(newStatus),
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
 
      console.log("📡 Update Status Code:", res.status);
 
      const updatedTask = res.data || null;
      console.log("✅ Update Response:", updatedTask);
 
      // ✅ Update UI instantly
      setTasks((prev) =>
        prev.map((task) =>
          (task.id || task.taskId || task._id) === taskId
            ? {
              ...task,
              status: updatedTask?.status || newStatus,
            }
            : task
        )
      );
    } catch (err) {
      console.error("❌ Status Update Error:", err);
      alert("Failed to update task status");
    } finally {
      setUpdatingId(null);
    }
  };
 
  useEffect(() => {
    fetchTasks();
  }, []);
 
  return (
    <div className="task-page">
      <div className="task-header">
        <div>
          <h2>My Tasks</h2>
          <p>View tasks assigned to you</p>
        </div>
      </div>
 
      <div className="task-table">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
 
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="no-data">
                  Loading...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  No tasks assigned
                </td>
              </tr>
            ) : (
              tasks.map((task, index) => {
                const taskId = task.id || task.taskId || task._id || index;
                const taskStatus = task.status || "Pending";
 
                return (
                  <tr key={taskId}>
                    <td>{task.taskTitle || task.title || "-"}</td>
                    <td>{task.project || task.projectName || "-"}</td>
                    <td>
                      {formatDate(task.dueDate)}
                    </td>
                    <td>
                      <span
                        className={`task-status ${taskStatus
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {taskStatus}
                      </span>
                    </td>
                    <td>
                      <select
                        className="task-action-dropdown"
                        value={taskStatus}
                        disabled={updatingId === taskId}
                        onChange={(e) =>
                          updateTaskStatus(taskId, e.target.value)
                        }
                      >
                        <option value="Pending">Pending</option>
                        {/* <option value="In Progress">In Progress</option> */}
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
export default UserTaskManagement;
 
 