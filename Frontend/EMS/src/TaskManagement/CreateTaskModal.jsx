import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import "./TaskManagement.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import AppDatePicker from "../components/AppDatePicker";
import {
  getInputDateValue,
  getTodayInputValue,
  toIsoDateString,
} from "../utils/date";

const EMPTY_FORM = {
  taskTitle: "",
  assignedTo: "",
  project: "",
  priority: "Medium",
  dueDate: "",
  description: "",
};

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

const normalizeSpaces = (value) => value.replace(/\s+/g, " ").trim();

function CreateTaskModal({ emsTaskClosePopup, editData }) {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const firstInputRef = useRef(null);
  const today = getTodayInputValue();
  const initialEditDueDate = editData?.emsTaskDue
    ? getInputDateValue(new Date(editData.emsTaskDue))
    : "";
  const minDueDate =
    editData && initialEditDueDate && initialEditDueDate < today
      ? initialEditDueDate
      : today;

  const hasEmployeeMatch = (value) => {
    const normalizedAssignee = normalizeSpaces(value).toLowerCase();

    if (!normalizedAssignee || employees.length === 0) {
      return true;
    }

    return employees.some((employee) => {
      const employeeId = String(employee.id || "").trim().toLowerCase();
      const employeeName = String(employee.name || "").trim().toLowerCase();
      return (
        employeeId === normalizedAssignee || employeeName === normalizedAssignee
      );
    });
  };

  const validateField = (fieldName, fieldValue) => {
    switch (fieldName) {
      case "taskTitle": {
        const value = normalizeSpaces(fieldValue);
        if (!value) return "Task title is required";
        if (value.length < 3) return "Task title must be at least 3 characters";
        if (value.length > 100) return "Task title must be 100 characters or less";
        if (!/^[A-Za-z0-9 _-]+$/.test(value)) {
          return "Task title can use letters, numbers, spaces, - and _ only";
        }
        return "";
      }
      case "assignedTo": {
        const value = normalizeSpaces(fieldValue);
        if (!value) return "Assignee is required";
        if (!hasEmployeeMatch(value)) {
          return "Select a valid employee name or employee ID";
        }
        return "";
      }
      case "project": {
        const value = normalizeSpaces(fieldValue);
        if (!value) return "Project name is required";
        if (value.length < 2) return "Project name must be at least 2 characters";
        if (value.length > 100) return "Project name must be 100 characters or less";
        return "";
      }
      case "priority":
        if (!PRIORITY_OPTIONS.includes(fieldValue)) {
          return "Select a valid priority";
        }
        return "";
      case "dueDate":
        if (!fieldValue) return "Due date is required";
        if (fieldValue < today && fieldValue !== initialEditDueDate) {
          return "Due date cannot be earlier than today";
        }
        return "";
      case "description": {
        const value = normalizeSpaces(fieldValue);
        if (!value) return "Description is required";
        if (value.length < 10) return "Description must be at least 10 characters";
        if (value.length > 500) return "Description must be 500 characters or less";
        return "";
      }
      default:
        return "";
    }
  };

  useEffect(() => {
    if (editData) {
      const nextFormData = {
        taskTitle: editData.emsTaskTitle || "",
        assignedTo: editData.emsTaskUser || "",
        project: editData.emsTaskProject || "",
        priority: PRIORITY_OPTIONS.includes(editData.emsTaskPriority)
          ? editData.emsTaskPriority
          : "Medium",
        dueDate: editData.emsTaskDue
          ? getInputDateValue(new Date(editData.emsTaskDue))
          : "",
        description: editData.emsTaskDescription || "",
      };

      setFormData(nextFormData);
    } else {
      setFormData(EMPTY_FORM);
    }

    setErrors({});
  }, [editData]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.employees.list);
        const employeeList = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];

        setEmployees(
          employeeList.map((emp) => ({
            id: emp.employee_Id || emp.employee_id || emp.employeeId || "",
            name: emp.name || "",
          }))
        );
      } catch (error) {
        console.error("Employee list fetch failed:", error);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) {
        emsTaskClosePopup();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [emsTaskClosePopup, saving]);

  useEffect(() => {
    if (!formData.assignedTo || employees.length === 0) {
      return;
    }

    const assigneeError = validateField("assignedTo", formData.assignedTo);

    setErrors((prev) => {
      if (!prev.assignedTo && !assigneeError) {
        return prev;
      }

      if (!assigneeError) {
        const { assignedTo, ...rest } = prev;
        return rest;
      }

      return { ...prev, assignedTo: assigneeError };
    });
  }, [employees, formData.assignedTo, initialEditDueDate, today]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue =
      name === "taskTitle" || name === "project" ? value.replace(/\s+/g, " ") : value;
    const nextFormData = { ...formData, [name]: nextValue };

    setFormData(nextFormData);

    const fieldError = validateField(name, nextValue);
    setErrors((prev) => {
      if (!fieldError && !prev[name]) {
        return prev;
      }

      if (!fieldError) {
        const { [name]: removedError, ...rest } = prev;
        return rest;
      }

      return { ...prev, [name]: fieldError };
    });
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;

    if (!["taskTitle", "assignedTo", "project", "description"].includes(name)) {
      return;
    }

    const trimmedValue = normalizeSpaces(value);
    const nextFormData = { ...formData, [name]: trimmedValue };
    const fieldError = validateField(name, trimmedValue);

    setFormData(nextFormData);
    setErrors((prev) => {
      if (!fieldError && !prev[name]) {
        return prev;
      }

      if (!fieldError) {
        const { [name]: removedError, ...rest } = prev;
        return rest;
      }

      return { ...prev, [name]: fieldError };
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    Object.entries(formData).forEach(([fieldName, fieldValue]) => {
      const fieldError = validateField(fieldName, fieldValue);
      if (fieldError) {
        nextErrors[fieldName] = fieldError;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    console.log("============= TASK SUBMIT START =============");

    if (saving || !validateForm()) {
      console.log("Validation Failed");
      console.log("Errors:", errors);
      return;
    }

    setSaving(true);

    const normalizedAssignee = normalizeSpaces(formData.assignedTo).toLowerCase();

    console.log("Normalized Assignee:", normalizedAssignee);

    const matchedEmployee = employees.find((employee) => {
      const employeeId = String(employee.id || "").trim().toLowerCase();
      const employeeName = String(employee.name || "").trim().toLowerCase();

      return (
        employeeId === normalizedAssignee ||
        employeeName === normalizedAssignee
      );
    });

    console.log("Matched Employee:", matchedEmployee);

    const payload = {
      taskTitle: normalizeSpaces(formData.taskTitle),

      assignedTo:
        matchedEmployee?.id ||
        normalizeSpaces(formData.assignedTo),

      project: normalizeSpaces(formData.project),

      priority: formData.priority,

      dueDate: toIsoDateString(formData.dueDate),

      description: normalizeSpaces(formData.description),

      status: editData?.emsTaskState || "ToDo",
    };

    console.log("FINAL PAYLOAD:");
    console.log(JSON.stringify(payload, null, 2));

    try {
      let response;

      if (editData) {

        console.log("UPDATE API:");
        console.log(API_ENDPOINTS.tasks.byId(editData.emsTaskId));

        response = await api.put(
          API_ENDPOINTS.tasks.byId(editData.emsTaskId),
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("UPDATE SUCCESS RESPONSE:", response);

        toast.success("Task updated successfully");

      } else {

        console.log("CREATE API:");
        console.log(API_ENDPOINTS.tasks.list);

        response = await api.post(
          API_ENDPOINTS.tasks.list,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("CREATE SUCCESS RESPONSE:", response);

        toast.success("Task created successfully");
      }

      setFormData(EMPTY_FORM);
      setErrors({});
      emsTaskClosePopup();

    } catch (error) {

      console.error("============= TASK SUBMIT ERROR =============");

      console.error("FULL ERROR:", error);

      if (error.response) {
        console.error("ERROR STATUS:", error.response.status);
        console.error("ERROR DATA:", error.response.data);
        console.error("ERROR HEADERS:", error.response.headers);
      }

      if (error.request) {
        console.error("ERROR REQUEST:", error.request);
      }

      console.error("ERROR MESSAGE:", error.message);

      toast.error(
        error?.response?.data?.message ||
        "We could not save the task right now. Please try again."
      );

    } finally {
      setSaving(false);

      console.log("============= TASK SUBMIT END =============");
    }
  };

  return (
    <div
      className="ems-task-create-overlay"
      onClick={() => {
        if (!saving) {
          emsTaskClosePopup();
        }
      }}
    >
      <div
        className="ems-task-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ems-task-create-header">
          <div>
            <h3 id="task-modal-title">{editData ? "Edit Task" : "Create Task"}</h3>
            <p>Fill in the task details before assigning it to a team member.</p>
          </div>
          <button
            type="button"
            className="ems-task-modal-close"
            onClick={() => emsTaskClosePopup()}
            disabled={saving}
            aria-label="Close task form"
          >
            ×
          </button>

        </div>

        <form className="ems-task-create-form" onSubmit={handleSubmit} noValidate>
          <div className="ems-task-form-grid">
            <div className="ems-task-field-group">
              <label htmlFor="task-title-input">Task Title</label>
              <input
                ref={firstInputRef}
                id="task-title-input"
                type="text"
                name="taskTitle"
                value={formData.taskTitle}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.taskTitle ? "has-error" : ""}
                aria-invalid={Boolean(errors.taskTitle)}
                aria-describedby={errors.taskTitle ? "task-title-error" : undefined}
                autoComplete="off"
              />
              {errors.taskTitle ? (
                <p id="task-title-error" className="task-error">
                  {errors.taskTitle}
                </p>
              ) : null}
            </div>

            <div className="ems-task-field-group">
              <label htmlFor="task-assigned-input">Assignee</label>
              <input
                id="task-assigned-input"
                type="text"
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                onBlur={handleBlur}
                list="task-assignee-options"
                className={errors.assignedTo ? "has-error" : ""}
                aria-invalid={Boolean(errors.assignedTo)}
                aria-describedby={
                  errors.assignedTo
                    ? "task-assigned-error"
                    : "task-assigned-helper"
                }
                autoComplete="off"
              />
              <datalist id="task-assignee-options">
                {employees.flatMap((employee) => [
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
              <p id="task-assigned-helper" className="task-helper-text">
                Start typing an employee name or ID to see matching suggestions.
              </p>
              {errors.assignedTo ? (
                <p id="task-assigned-error" className="task-error">
                  {errors.assignedTo}
                </p>
              ) : null}
            </div>

            <div className="ems-task-field-group">
              <label htmlFor="task-project-input">Project</label>
              <input
                id="task-project-input"
                type="text"
                name="project"
                value={formData.project}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.project ? "has-error" : ""}
                aria-invalid={Boolean(errors.project)}
                aria-describedby={errors.project ? "task-project-error" : undefined}
                autoComplete="off"
              />
              {errors.project ? (
                <p id="task-project-error" className="task-error">
                  {errors.project}
                </p>
              ) : null}
            </div>

            <div className="ems-task-field-group">
              <label htmlFor="task-priority-select">Priority</label>
              <select
                id="task-priority-select"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={errors.priority ? "has-error" : ""}
                aria-invalid={Boolean(errors.priority)}
                aria-describedby={errors.priority ? "task-priority-error" : undefined}
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              {errors.priority ? (
                <p id="task-priority-error" className="task-error">
                  {errors.priority}
                </p>
              ) : null}
            </div>

            <div className="ems-task-field-group">
              <label htmlFor="task-due-date-input">Due Date</label>
              <AppDatePicker
                id="task-due-date-input"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                minDate={minDueDate}
                className={errors.dueDate ? "has-error" : ""}
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={
                  errors.dueDate ? "task-due-date-error" : "task-due-date-helper"
                }
              />
              <p id="task-due-date-helper" className="task-helper-text">
                Choose today or a future date for the task deadline.
              </p>
              {errors.dueDate ? (
                <p id="task-due-date-error" className="task-error">
                  {errors.dueDate}
                </p>
              ) : null}
            </div>

            <div className="ems-task-field-group ems-task-field-group-full">
              <label htmlFor="task-description-input">Description</label>
              <textarea
                id="task-description-input"
                name="description"
                value={formData.description}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.description ? "has-error" : ""}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={
                  errors.description
                    ? "task-description-error"
                    : "task-description-helper"
                }
              />
              <p id="task-description-helper" className="task-helper-text">
                Add a concise description so the assignee understands the expected work.
              </p>
              {errors.description ? (
                <p id="task-description-error" className="task-error">
                  {errors.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="ems-task-create-buttons">
            <button
              type="button"
              className="ems-task-cancel-btn"
              onClick={emsTaskClosePopup}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="ems-task-submit-btn" type="submit" disabled={saving}>
              {saving ? <span className="ems-task-button-spinner" aria-hidden="true" /> : null}
              {saving ? (editData ? "Updating..." : "Saving...") : editData ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;


