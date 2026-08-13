import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPaperclip, FaSpinner } from "react-icons/fa";
import { toast } from "../components/common/Toast/toastService";

import "./TicketManagement.css";
import AppDatePicker from "../components/AppDatePicker";
import CompactSearchableDropdown from "../components/CompactSearchableDropdown";
import { PageSkeleton } from "../components/Skeletons";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import { getInputDateValue, getTodayInputValue } from "../utils/date";
import {
  buildTicketPayload,
  createEmptyTicketForm,
  getTicketCategoryOptions,
  normalizeEmployeeOption,
  normalizeTicketFieldText,
  normalizeTicketPriority,
  normalizeTicketRecord,
  TICKET_FORM_LIMITS,
  TICKET_PRIORITY_OPTIONS } from
"./ticketConfig";
import {
  createTicket,
  fetchTicketById,
  getTicketApiErrorMessage,
  updateTicket } from
"../services/ticketService";
import { isAdmin } from "../utils/authorization";

const normalizeEmployeeList = (response) =>
extractCollection(response).map((employee) => normalizeEmployeeOption(employee));

function TicketForm({
  mode = "create",
  role = "admin",
  basePath = "/admin/tickets",
  ticketId = ""
}) {
  const navigate = useNavigate();
  const isEditMode = mode === "edit" && Boolean(ticketId);
  const isAdminUser = isAdmin(role);

  const firstInputRef = useRef(null);

  const [loadingTicket, setLoadingTicket] = useState(isEditMode);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ticketStatus, setTicketStatus] = useState("Open");
  const [ticketRecord, setTicketRecord] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(() => createEmptyTicketForm(role));
  const [errors, setErrors] = useState({});
  const [attachmentLabel, setAttachmentLabel] = useState("");

  const categoryOptions = useMemo(() => getTicketCategoryOptions(), []);
  const today = getTodayInputValue();

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const response = await api.get(API_ENDPOINTS.employees.list);
        setEmployees(normalizeEmployeeList(response.data));
      } catch (error) {

        toast.error("Unable to load employee list.");
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setFormData(createEmptyTicketForm(role));
      setTicketStatus("Open");
      setTicketRecord(null);
      setLoadingTicket(false);
      setErrors({});
      setAttachmentLabel("");
      return;
    }

    if (!ticketId) {
      setLoadingTicket(false);
      setTicketRecord(null);
      return;
    }

    const loadTicket = async () => {
      try {
        setLoadingTicket(true);
        const ticket = await fetchTicketById(ticketId);
        const normalizedTicket = normalizeTicketRecord(ticket.raw || ticket);

        setTicketRecord(normalizedTicket);
        setTicketStatus(normalizedTicket.status || "Open");
        setFormData({
          title: normalizedTicket.title || "",
          description: normalizedTicket.description || "",
          category: normalizedTicket.category || "",
          priority: normalizedTicket.priority || "Medium",
          assignedToEmployee:
          normalizedTicket.assignedTo ||
          normalizedTicket.createdBy ||
          "",
          assignedToEmployeeId:
          normalizedTicket.assignedToId ||
          normalizedTicket.createdById ||
          "",
          dueDate: normalizedTicket.dueDate ?
          getInputDateValue(normalizedTicket.dueDate) :
          "",
          attachmentFile: null,
          notes: "",
          status: normalizedTicket.status || "Open"
        });

        const existingAttachment =
        normalizedTicket.attachments?.[0]?.fileName ||
        normalizedTicket.attachments?.[0]?.name ||
        normalizedTicket.attachments?.[0]?.file_name ||
        normalizedTicket.attachments?.[0]?.FileName ||
        "";

        setAttachmentLabel(existingAttachment);
      } catch (error) {

        toast.error(
          error?.response?.data?.message ||
          "Unable to load the ticket details."
        );
      } finally {
        setLoadingTicket(false);
      }
    };

    loadTicket();
  }, [isEditMode, role, ticketId]);

  useEffect(() => {
    if (!loadingTicket) {
      firstInputRef.current?.focus();
    }
  }, [loadingTicket]);

  const validateField = (fieldName, fieldValue) => {
    switch (fieldName) {
      case "title":{
          const value = normalizeTicketFieldText(fieldValue);
          if (!value) return "Title is required.";
          if (value.length < 3) return "Title must be at least 3 characters.";
          if (value.length > TICKET_FORM_LIMITS.title) {
            return `Title must be ${TICKET_FORM_LIMITS.title} characters or less.`;
          }
          return "";
        }
      case "description":{
          const value = normalizeTicketFieldText(fieldValue);
          if (!value) return "Description is required.";
          if (value.length < 10) {
            return "Description must be at least 10 characters.";
          }
          if (value.length > TICKET_FORM_LIMITS.description) {
            return `Description must be ${TICKET_FORM_LIMITS.description} characters or less.`;
          }
          return "";
        }
      case "category":
        if (!normalizeTicketFieldText(fieldValue)) {
          return "Category is required.";
        }
        return "";
      case "priority":{
          const normalized = normalizeTicketPriority(fieldValue);
          if (!TICKET_PRIORITY_OPTIONS.includes(normalized)) {
            return "Select a valid priority.";
          }
          return "";
        }
      case "assignedToEmployee":
        if (!normalizeTicketFieldText(fieldValue)) {
          return "Assign the ticket to an employee.";
        }
        return "";
      case "dueDate":
        if (fieldValue && fieldValue < today && !isEditMode) {
          return "Due date cannot be earlier than today.";
        }
        return "";
      default:
        return "";
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    ["title", "description", "category", "priority", "assignedToEmployee", "dueDate"].forEach(
      (fieldName) => {
        const fieldError = validateField(fieldName, formData[fieldName]);
        if (fieldError) {
          nextErrors[fieldName] = fieldError;
        }
      }
    );

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = (fieldName, value) => {
    setFormData((current) => ({
      ...current,
      [fieldName]:
      fieldName === "title" || fieldName === "description" ?
      value.replace(/\s+/g, " ") :
      value
    }));

    const nextError = validateField(fieldName, value);
    setErrors((current) => {
      if (!nextError && !current[fieldName]) {
        return current;
      }

      if (!nextError) {
        const { [fieldName]: _removedError, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [fieldName]: nextError
      };
    });
  };

  const handleEmployeeSelect = (value) => {
    const matchedEmployee = employees.find(
      (employee) =>
      employee.id === value ||
      employee.name === value ||
      employee.label === value
    );

    setFormData((current) => ({
      ...current,
      assignedToEmployee: matchedEmployee?.name || value,
      assignedToEmployeeId: matchedEmployee?.id || value
    }));

    setErrors((current) => {
      if (!current.assignedToEmployee) {
        return current;
      }

      const { assignedToEmployee: _assignedToEmployee, ...rest } = current;
      return rest;
    });
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormData((current) => ({
      ...current,
      attachmentFile: file
    }));
    setAttachmentLabel(file?.name || ticketRecord?.attachments?.[0]?.name || "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validateForm()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildTicketPayload(formData, {
        status: ticketStatus || "Open"
      });

      if (isEditMode) {
        await updateTicket(ticketId, payload);
        toast.success("Ticket updated successfully.");
      } else {
        await createTicket(payload);
        toast.success("Ticket created successfully.");
      }

      navigate(basePath, { replace: true });
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "We could not save the ticket right now."
      );
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loadingTicket) {
    return (
      <div className="ticket-page">
        <PageSkeleton variant="form" formFields={6} formColumns={2} />
      </div>);

  }

  return (
    <div className="ticket-page ticket-form-page">
      <div className="ticket-hero">
        <div className="ticket-hero-copy">
          <span className="ticket-eyebrow">
            {isAdminUser ? "Admin portal" : "Employee portal"}
          </span>
          <h2>{isEditMode ? "Edit Ticket" : "Create Ticket"}</h2>
          <p>
            {isEditMode ?
            "Update the ticket details, assignee, and supporting information." :
            "Capture the request with enough detail for the right team to act on it."}
          </p>
        </div>

        <div className="ticket-hero-actions">
          <button
            type="button"
            className="ticket-button secondary"
            onClick={() => navigate(basePath, { replace: true })}>
            
            Back to Tickets
          </button>

          <button
            type="submit"
            form="ticket-form"
            className="ticket-button primary"
            disabled={saving || loadingEmployees}>
            
            {saving ?
            <>
                <FaSpinner className="ticket-button-spinner" />
                Saving...
              </> :
            isEditMode ?
            "Update Ticket" :

            "Create Ticket"
            }
          </button>
        </div>
      </div>

      <div className="ticket-surface ticket-form-surface">
        <form id="ticket-form" className="ticket-form-grid" onSubmit={handleSubmit} noValidate>
          <div className="ticket-field">
            <label htmlFor="ticket-title">Title</label>
            <input
              ref={firstInputRef}
              id="ticket-title"
              type="text"
              name="title"
              value={formData.title}
              onChange={(event) => updateField("title", event.target.value)}
              className={errors.title ? "has-error" : ""}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "ticket-title-error" : undefined}
              maxLength={TICKET_FORM_LIMITS.title}
              autoComplete="off" />
            
            {errors.title ?
            <p id="ticket-title-error" className="ticket-error">
                {errors.title}
              </p> :

            <p className="ticket-help">
                Keep the title short, specific, and action focused.
              </p>
            }
          </div>

          <div className="ticket-field">
            <label htmlFor="ticket-category">Category</label>
            <select
              id="ticket-category"
              name="category"
              value={formData.category}
              onChange={(event) => updateField("category", event.target.value)}
              className={errors.category ? "has-error" : ""}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? "ticket-category-error" : undefined}>
              
              <option value="">Select category</option>
              {categoryOptions.map((category) =>
              <option key={category} value={category}>
                  {category}
                </option>
              )}
            </select>
            {errors.category ?
            <p id="ticket-category-error" className="ticket-error">
                {errors.category}
              </p> :

            <p className="ticket-help">
                Route the request to the right queue from the start.
              </p>
            }
          </div>

          <div className="ticket-field ticket-field-full">
            <label htmlFor="ticket-description">Description</label>
            <textarea
              id="ticket-description"
              name="description"
              value={formData.description}
              onChange={(event) =>
              updateField("description", event.target.value)
              }
              className={errors.description ? "has-error" : ""}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
              errors.description ? "ticket-description-error" : undefined
              }
              maxLength={TICKET_FORM_LIMITS.description} />
            
            {errors.description ?
            <p id="ticket-description-error" className="ticket-error">
                {errors.description}
              </p> :

            <p className="ticket-help">
                Explain the issue, request, or outcome you need.
              </p>
            }
          </div>

          <div className="ticket-field">
            <label htmlFor="ticket-priority">Priority</label>
            <select
              id="ticket-priority"
              name="priority"
              value={formData.priority}
              onChange={(event) => updateField("priority", event.target.value)}
              className={errors.priority ? "has-error" : ""}
              aria-invalid={Boolean(errors.priority)}
              aria-describedby={errors.priority ? "ticket-priority-error" : undefined}>
              
              {TICKET_PRIORITY_OPTIONS.map((priority) =>
              <option key={priority} value={priority}>
                  {priority}
                </option>
              )}
            </select>
            {errors.priority ?
            <p id="ticket-priority-error" className="ticket-error">
                {errors.priority}
              </p> :

            <p className="ticket-help">
                Pick the urgency level that matches the request.
              </p>
            }
          </div>

          <div className="ticket-field">
            <label htmlFor="ticket-due-date">Due Date</label>
            <AppDatePicker
              id="ticket-due-date"
              name="dueDate"
              value={formData.dueDate}
              onChange={(event) => updateField("dueDate", event.target.value)}
              minDate={today}
              className={errors.dueDate ? "has-error" : ""}
              aria-invalid={Boolean(errors.dueDate)}
              aria-describedby={errors.dueDate ? "ticket-due-date-error" : undefined}
              placeholder="Select due date" />
            
            {errors.dueDate ?
            <p id="ticket-due-date-error" className="ticket-error">
                {errors.dueDate}
              </p> :

            <p className="ticket-help">
                Optional, but useful when the ticket needs follow-up.
              </p>
            }
          </div>

          <div className="ticket-field ticket-field-full">
            <label htmlFor="ticket-assignee">Assign To Employee</label>
            <CompactSearchableDropdown
              id="ticket-assignee"
              value={formData.assignedToEmployeeId || formData.assignedToEmployee}
              onChange={handleEmployeeSelect}
              groups={[
              {
                label: "Employees",
                options: employees.map((employee) => ({
                  value: employee.id || employee.name,
                  label: employee.label
                }))
              }]
              }
              placeholder={
              loadingEmployees ? "Loading employees..." : "Select employee"
              }
              searchPlaceholder="Search employee name or ID"
              disabled={loadingEmployees}
              helperText="Choose the employee who will receive or own the ticket."
              error={errors.assignedToEmployee} />
            
          </div>

          <div className="ticket-field ticket-field-full">
            <label htmlFor="ticket-attachment">Attachment</label>
            <div className="ticket-upload-row">
              <label className="ticket-upload-button" htmlFor="ticket-attachment">
                <FaPaperclip aria-hidden="true" />
                {attachmentLabel ? "Replace attachment" : "Upload attachment"}
              </label>

              <input
                id="ticket-attachment"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                onChange={handleAttachmentChange} />
              

              <div className="ticket-upload-meta">
                <strong>
                  {attachmentLabel || "No attachment selected"}
                </strong>
                <span>
                  Attach a supporting file if the backend and request need it.
                </span>
              </div>
            </div>
          </div>

          {ticketRecord?.attachments?.length ?
          <div className="ticket-field ticket-field-full">
              <label>Existing Attachments</label>
              <div className="ticket-attachment-list">
                {ticketRecord.attachments.map((attachment, index) =>
              <div className="ticket-attachment-item" key={`${attachment?.name || attachment?.fileName || index}`}>
                    <span>{attachment?.name || attachment?.fileName || attachment?.FileName || `Attachment ${index + 1}`}</span>
                    <small>{attachment?.size || attachment?.length || ""}</small>
                  </div>
              )}
              </div>
            </div> :
          null}
        </form>

        <div className="ticket-form-footer">
          <button
            type="button"
            className="ticket-button secondary"
            onClick={() => navigate(basePath, { replace: true })}
            disabled={saving}>
            
            Cancel
          </button>

          <button
            type="submit"
            form="ticket-form"
            className="ticket-button primary"
            disabled={saving || loadingEmployees}>
            
            {saving ?
            <>
                <FaSpinner className="ticket-button-spinner" />
                Saving...
              </> :
            isEditMode ?
            "Update Ticket" :

            "Create Ticket"
            }
          </button>
        </div>
      </div>
    </div>);

}

export default TicketForm;