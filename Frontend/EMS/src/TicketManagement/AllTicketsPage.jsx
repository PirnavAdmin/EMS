import React, {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState } from
"react";
import {
  FaDownload,
  FaEye,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaPaperclip,
  FaPen,
  FaPlay,
  FaPlus,
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaSpinner,
  FaStop,
  FaSyncAlt,
  FaTicketAlt,
  FaTimes,
  FaTrash,
  FaUpload } from
"react-icons/fa";
import { toast } from "../components/common/Toast/toastService";

import "./TicketManagement.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildServerUrl } from "../api/endpoints";
import AppDatePicker from "../components/AppDatePicker";
import AppPagination from "../components/AppPagination";
import CompactSearchableDropdown from "../components/CompactSearchableDropdown";
import EmptyState from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeletons";
import { extractCollection } from "../utils/collections";
import { hasRole } from "../utils/authorization";
import {
  compareDatesAsc,
  compareDatesDesc,
  formatDate,
  formatDateTime,
  getInputDateValue,
  getTodayInputValue,
  parseDate } from
"../utils/date";
import {
  buildTicketPayload,
  createEmptyTicketForm,
  getPriorityTone,
  getStatusTone,
  getTicketCategoryOptions,
  getTicketPriorityLabel,
  getTicketSearchText,
  getTicketSortValue,
  getTicketStatusLabel,
  getTicketStatusOptions,
  normalizeEmployeeOption,
  normalizeTicketFieldText,
  normalizeTicketPriority,
  normalizeTicketRecord,
  normalizeTicketStatus,
  TICKET_FORM_LIMITS,
  TICKET_PRIORITY_OPTIONS,
  truncateTicketText } from
"./ticketConfig";
import AutoAssignConfirmModal from "./AutoAssignConfirmModal";
import {
  AUTO_ASSIGN_SUCCESS_MESSAGE,
  autoAssignTickets,
  buildAutoAssignPayload,
  createTicket,
  deleteTicket,
  downloadTicketTemplate,
  exportTickets,
  fetchMyTickets,
  fetchTicketById,
  fetchTickets,
  getAutoAssignErrorMessage,
  getTicketApiErrorMessage,
  startTicketWork,
  stopTicketWork,
  updateTicket,
  updateTicketStatus,
  uploadTicketBulkFile } from
"../services/ticketService";

const PAGE_SIZE = 10;

const TABLE_COLUMNS = [
{ key: "ticketId", label: "Ticket ID", width: "130px" },
{ key: "title", label: "Title", width: "240px" },
{ key: "description", label: "Description", width: "280px" },
{ key: "category", label: "Category", width: "150px" },
{ key: "priority", label: "Priority", width: "120px" },
{ key: "status", label: "Status", width: "140px" },
{ key: "createdBy", label: "Created By", width: "180px" },
{ key: "assignedTo", label: "Assigned To", width: "180px" },
{ key: "createdDate", label: "Created Date", width: "130px" },
{ key: "updatedDate", label: "Updated Date", width: "130px" },
{ key: "actions", label: "Actions", width: "380px" }];

const DEFAULT_SORT = {
  key: "updatedDate",
  direction: "desc"
};

const STATUS_OPTIONS = ["All", ...getTicketStatusOptions("admin")];
const PRIORITY_OPTIONS = ["All", ...TICKET_PRIORITY_OPTIONS];
const CATEGORY_OPTIONS = ["All", ...getTicketCategoryOptions()];

const ACCEPTED_EXTENSIONS = [".xls", ".xlsx"];

const ACTIVE_WORK_STATUSES = new Set(["In Progress", "On Hold"]);
const EMPLOYEE_WORK_STATUS_OPTIONS = getTicketStatusOptions("user");

const isExcelFile = (file) => {
  if (!file) {
    return false;
  }

  const name = String(file.name || "").toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
};

const isTicketCompleted = (ticket) =>
normalizeTicketStatus(ticket?.status) === "Completed";

const isTicketAssigned = (ticket) =>
normalizeTicketStatus(ticket?.status) === "Assigned";

const hasTicketWorkStarted = (ticket) =>
Boolean(ticket?.workStarted || ticket?.startedDate);

const hasTicketWorkStopped = (ticket) =>
Boolean(ticket?.stoppedDate || ticket?.completedDate);

const isTicketWorkActive = (ticket) => {
  if (!ticket || isTicketCompleted(ticket) || hasTicketWorkStopped(ticket)) {
    return false;
  }

  return Boolean(
    ticket.workActive ||
    hasTicketWorkStarted(ticket) ||
    ACTIVE_WORK_STATUSES.has(normalizeTicketStatus(ticket.status))
  );
};

const getEmployeeRowStatusOptions = (ticket) => {
  const currentStatus = normalizeTicketStatus(ticket?.status);
  const options = [...EMPLOYEE_WORK_STATUS_OPTIONS];

  if (currentStatus && !options.includes(currentStatus)) {
    options.unshift(currentStatus);
  }

  return options;
};

const normalizeSummary = (payload = {}) => ({
  total: Number(
    payload.totalRecords ??
    payload.total ??
    payload.records ??
    payload.rowCount ??
    0
  ),
  success: Number(
    payload.successCount ??
    payload.insertedCount ??
    payload.createdCount ??
    payload.succeeded ??
    0
  ),
  failed: Number(
    payload.failedCount ??
    payload.failureCount ??
    payload.invalidCount ??
    payload.rejectedCount ??
    0
  ),
  skipped: Number(payload.skippedCount ?? payload.ignoredCount ?? 0)
});

const getDefaultSortDirection = (key) =>
["createdDate", "updatedDate", "ticketId"].includes(key) ? "desc" : "asc";

const isDateInRange = (value, fromDate, toDate) => {
  if (!fromDate && !toDate) {
    return true;
  }

  const parsedValue = parseDate(value);
  if (!parsedValue) {
    return true;
  }

  const from = fromDate ? parseDate(fromDate) : null;
  const to = toDate ? parseDate(toDate) : null;

  if (from && parsedValue < from) {
    return false;
  }

  if (to) {
    const endOfDay = new Date(to.getTime());
    endOfDay.setHours(23, 59, 59, 999);

    if (parsedValue > endOfDay) {
      return false;
    }
  }

  return true;
};

const compareValues = (left, right, key, direction) => {
  const leftValue = getTicketSortValue(left, key);
  const rightValue = getTicketSortValue(right, key);

  if (key === "createdDate" || key === "updatedDate") {
    return direction === "asc" ?
    compareDatesAsc(leftValue, rightValue) :
    compareDatesDesc(leftValue, rightValue);
  }

  if (key === "status" || key === "priority") {
    const comparison = Number(leftValue) - Number(rightValue);
    return direction === "asc" ? comparison : -comparison;
  }

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base"
  });

  const comparison = collator.compare(
    String(leftValue || ""),
    String(rightValue || "")
  );
  return direction === "asc" ? comparison : -comparison;
};

function StatusPill({ value }) {
  const normalized = normalizeTicketStatus(value);
  const tone = getStatusTone(normalized);

  return (
    <span className={`ticket-pill status-pill status-${tone}`}>
      {getTicketStatusLabel(normalized)}
    </span>);

}

function PriorityPill({ value }) {
  const tone = getPriorityTone(value);

  return (
    <span className={`ticket-pill priority-pill priority-${tone}`}>
      {getTicketPriorityLabel(value)}
    </span>);

}

function ModalShell({
  open,
  title,
  subtitle,
  headerActions,
  onClose,
  children,
  footer,
  className = ""
}) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  return (
    <div
      className="delete-overlay ticket-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}>
      
      <div
        className={`ticket-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}>
        
        <div className="ticket-modal-head">
          <div className="ticket-modal-heading">
            <span className="ticket-eyebrow">Tickets</span>
            <div>
              <h3 id={titleId}>{title}</h3>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>

          <div className="ticket-modal-head-actions">
            {headerActions}

            <button
              type="button"
              className="ticket-modal-close"
              onClick={onClose}
              aria-label="Close dialog">
              
              <FaTimes aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="ticket-modal-body">{children}</div>

        {footer ? <div className="ticket-modal-footer">{footer}</div> : null}
      </div>
    </div>);

}

function TicketEditorModal({
  open,
  mode,
  ticketId,
  employees,
  loadingEmployees,
  onClose,
  onSaved
}) {
  const isEditMode = mode === "edit" && Boolean(ticketId);
  const firstInputRef = useRef(null);

  const [loadingTicket, setLoadingTicket] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [ticketRecord, setTicketRecord] = useState(null);
  const [formData, setFormData] = useState(() => createEmptyTicketForm("admin"));
  const [errors, setErrors] = useState({});
  const [attachmentLabel, setAttachmentLabel] = useState("");

  const categoryOptions = useMemo(() => getTicketCategoryOptions(), []);
  const today = getTodayInputValue();

  useEffect(() => {
    if (!open) {
      setLoadingTicket(false);
      setSaving(false);
      setTicketRecord(null);
      setFormData(createEmptyTicketForm("admin"));
      setErrors({});
      setAttachmentLabel("");
      return undefined;
    }

    if (!isEditMode) {
      setLoadingTicket(false);
      setTicketRecord(null);
      setFormData(createEmptyTicketForm("admin"));
      setErrors({});
      setAttachmentLabel("");
      return undefined;
    }

    if (!ticketId) {
      setLoadingTicket(false);
      setTicketRecord(null);
      return undefined;
    }

    let active = true;

    const loadTicket = async () => {
      try {
        setLoadingTicket(true);
        const record = await fetchTicketById(ticketId);
        const normalized = normalizeTicketRecord(record.raw || record);

        if (!active) {
          return;
        }

        setTicketRecord(normalized);
        setFormData({
          projectId: normalized.projectId || 0,
          technology: normalized.technology || "",
          startDate: normalized.startDate ?
          getInputDateValue(normalized.startDate) :
          "",
          estimatedHours: normalized.estimatedHours || "",

          title: normalized.title || "",
          description: normalized.description || "",
          category: normalized.category || "",
          priority: normalized.priority || "Medium",

          assignedToEmployee:
          normalized.assignedTo || normalized.createdBy || "",

          assignedToEmployeeId:
          normalized.assignedToId || normalized.createdById || "",

          dueDate: normalized.dueDate ?
          getInputDateValue(normalized.dueDate) :
          "",

          attachmentFile: null,
          notes: "",
          status: normalized.status || "Open"
        });

        const existingAttachment =
        normalized.attachments?.[0]?.fileName ||
        normalized.attachments?.[0]?.name ||
        normalized.attachments?.[0]?.FileName ||
        "";

        setAttachmentLabel(existingAttachment);
      } catch (error) {

        const message = await getTicketApiErrorMessage(
          error,
          "Unable to load the ticket details."
        );
        toast.error(message);
        if (active) {
          setTicketRecord(null);
        }
      } finally {
        if (active) {
          setLoadingTicket(false);
        }
      }
    };

    loadTicket();

    return () => {
      active = false;
    };
  }, [isEditMode, open, ticketId]);

  useEffect(() => {
    if (open && !loadingTicket) {
      firstInputRef.current?.focus();
    }
  }, [loadingTicket, open]);

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
        const { [fieldName]: removedError, ...rest } = current;
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

      const { assignedToEmployee, ...rest } = current;
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validateForm()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildTicketPayload(formData, {
        status: ticketRecord?.status || "Open"
      });

      if (isEditMode) {
        await updateTicket(ticketId, payload);
        toast.success("Ticket updated successfully.");
      } else {

        await createTicket(payload);
        toast.success("Ticket created successfully.");
      }

      await onSaved?.();
      onClose?.();
    } catch (error) {

      if (error.response) {

      }

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "We could not save the ticket right now."
      );

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const headerActions = isEditMode ?
  <span className="ticket-modal-badge">Edit mode</span> :

  <span className="ticket-modal-badge">New ticket</span>;

  if (!open) {
    return null;
  }

  return (
    <ModalShell
      open={open}
      title={isEditMode ? "Edit Ticket" : "Create Ticket"}
      subtitle={
      isEditMode ?
      "Update the ticket details and assignee." :
      "Capture the request and assign it to an employee."
      }
      headerActions={headerActions}
      onClose={onClose}
      className="ticket-modal-wide"
      footer={
      <>
          <button
          type="button"
          className="ticket-button secondary"
          onClick={onClose}
          disabled={saving}>
          
            Cancel
          </button>

          <button
          type="submit"
          form="ticket-editor-form"
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
        </>
      }>
      
      {loadingTicket ?
      <div className="ticket-modal-loading">
          <FaSpinner className="ticket-button-spinner" />
          Loading ticket details...
        </div> :

      <form
        id="ticket-editor-form"
        className="ticket-form-grid ticket-modal-form"
        onSubmit={handleSubmit}
        noValidate>
        
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
            value={
            formData.assignedToEmployeeId || formData.assignedToEmployee
            }
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
            helperText="Choose the employee who will receive the ticket."
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
                  Attach a supporting file if the ticket needs one.
                </span>
              </div>
            </div>
          </div>

          {isEditMode && ticketRecord?.attachments?.length ?
        <div className="ticket-field ticket-field-full">
              <label>Existing Attachment</label>
              <div className="ticket-attachment-list">
                {ticketRecord.attachments.map((attachment, index) =>
            <div
              className="ticket-attachment-item"
              key={`${attachment?.name || attachment?.fileName || index}`}>
              
                    <span>
                      {attachment?.name ||
                attachment?.fileName ||
                attachment?.FileName ||
                `Attachment ${index + 1}`}
                    </span>
                    <small>{attachment?.size || attachment?.length || ""}</small>
                  </div>
            )}
              </div>
            </div> :
        null}
        </form>
      }
    </ModalShell>);

}

function BulkUploadModal({ open, onClose, onUploaded }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [errorFileUrl, setErrorFileUrl] = useState("");

  const summaryCards = useMemo(
    () => [
    { label: "Total Rows", value: summary?.total ?? 0, tone: "total" },
    { label: "Successful", value: summary?.success ?? 0, tone: "resolved" },
    { label: "Failed", value: summary?.failed ?? 0, tone: "open" },
    { label: "Skipped", value: summary?.skipped ?? 0, tone: "progress" }],

    [summary]
  );

  useEffect(() => {
    if (!open) {
      setDragActive(false);
      setSelectedFile(null);
      setUploading(false);
      setSummary(null);
      setErrorFileUrl("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  const clearFile = () => {
    setSelectedFile(null);
    setSummary(null);
    setErrorFileUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFile = (file) => {
    if (!file) {
      return;
    }

    if (!isExcelFile(file)) {
      toast.error("Please select an Excel file (.xls or .xlsx).");
      return;
    }

    setSelectedFile(file);
    setSummary(null);
    setErrorFileUrl("");
  };

  const handleInputChange = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadTicketTemplate();
      toast.success("Template download started.");
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to download the template right now."
      );
      toast.error(errorMessage);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Choose a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("uploadFile", selectedFile);

    try {
      setUploading(true);
      setSummary(null);
      setErrorFileUrl("");

      const response = await uploadTicketBulkFile(formData);
      const data = response?.data?.data || response?.data || {};

      setSummary(normalizeSummary(data.summary || data.result || data));

      const downloadUrl =
      data.errorFileUrl ||
      data.failedFileUrl ||
      data.errorFilePath ||
      data.errorFile ||
      "";

      if (downloadUrl) {
        setErrorFileUrl(buildServerUrl(downloadUrl));
      }

      toast.success("Ticket file processed successfully.");
      await onUploaded?.();
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to upload the ticket file right now."
      );
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell
      open={open}
      title="Bulk Upload Tickets"
      subtitle="Download the template, fill it out, and upload multiple tickets at once."
      headerActions={
      <button
        type="button"
        className="ticket-button secondary ticket-modal-header-button"
        onClick={handleTemplateDownload}
        disabled={uploading}>
        
          <FaDownload aria-hidden="true" />
          Download Template
        </button>
      }
      onClose={onClose}
      className="ticket-modal-wide ticket-upload-modal"
      footer={
      <>
          <button
          type="button"
          className="ticket-button secondary"
          onClick={clearFile}
          disabled={uploading}>
          
            Reset
          </button>

          <button
          type="button"
          className="ticket-button primary"
          onClick={handleUpload}
          disabled={uploading || !selectedFile}>
          
            {uploading ?
          <>
                <FaSpinner className="ticket-button-spinner" />
                Uploading...
              </> :

          <>
                <FaUpload aria-hidden="true" />
                Upload Tickets
              </>
          }
          </button>
        </>
      }>
      
      <div className="ticket-upload-modal-body">
        <div
          className={`ticket-dropzone ${dragActive ? "is-active" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}>
          
          <div className="ticket-dropzone-icon">
            <FaUpload aria-hidden="true" />
          </div>

          <h3>Drag and drop your Excel file here</h3>
          <p>Supported formats: .xls and .xlsx</p>

          <label className="ticket-button primary" htmlFor="ticket-bulk-file">
            <FaUpload aria-hidden="true" />
            Choose File
          </label>

          <input
            ref={fileInputRef}
            id="ticket-bulk-file"
            type="file"
            accept=".xls,.xlsx"
            onChange={handleInputChange} />
          
        </div>

        {selectedFile ?
        <div className="ticket-upload-selected">
            <div>
              <strong>{selectedFile.name}</strong>
              <span>{Math.round(selectedFile.size / 1024)} KB</span>
            </div>

            <button
            type="button"
            className="ticket-button ghost"
            onClick={clearFile}
            disabled={uploading}>
            
              Remove File
            </button>
          </div> :
        null}

        {summary ?
        <div className="ticket-upload-summary">
            {summaryCards.map((card) =>
          <div
            className={`ticket-metric-card tone-${card.tone}`}
            key={card.label}>
            
                <div>
                  <span className="ticket-metric-label">{card.label}</span>
                  <strong className="ticket-metric-value">{card.value}</strong>
                </div>
              </div>
          )}
          </div> :

        <EmptyState
          className="ticket-empty-state compact"
          message="Upload a completed template to see the summary here." />

        }

        {errorFileUrl ?
        <div className="ticket-error-download">
            <strong>Failed rows file available</strong>
            <a
            href={errorFileUrl}
            target="_blank"
            rel="noreferrer"
            className="ticket-button secondary">
            
              <FaDownload aria-hidden="true" />
              Download Error File
            </a>
          </div> :
        null}
      </div>
    </ModalShell>);

}

function TicketDetailsModal({ open, ticketId, refreshKey = 0, onClose }) {
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    if (!open || !ticketId) {
      setTicket(null);
      setLoading(false);
      return undefined;
    }

    let active = true;

    const loadTicket = async () => {
      try {
        setLoading(true);
        const record = await fetchTicketById(ticketId);
        const normalized = normalizeTicketRecord(record.raw || record);

        if (active) {
          setTicket(normalized);
        }
      } catch (error) {

        const errorMessage = await getTicketApiErrorMessage(
          error,
          "Unable to load ticket details right now."
        );
        toast.error(errorMessage);
        if (active) {
          setTicket(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTicket();

    return () => {
      active = false;
    };
  }, [open, ticketId, refreshKey]);

  const commentItems = useMemo(() => {
    if (!ticket) {
      return [];
    }

    return (ticket.comments || []).map((comment, index) => ({
      key: comment?.id || comment?.commentId || `${index}`,
      author:
      comment?.author ||
      comment?.createdBy ||
      comment?.userName ||
      comment?.name ||
      "Comment",
      message:
      comment?.message ||
      comment?.comment ||
      comment?.text ||
      comment?.description ||
      "",
      date:
      comment?.createdAt ||
      comment?.date ||
      comment?.timestamp ||
      ""
    }));
  }, [ticket]);

  const attachmentItems = useMemo(() => {
    if (!ticket) {
      return [];
    }

    return (ticket.attachments || []).map((attachment, index) => {
      const rawPath =
      attachment?.url ||
      attachment?.fileUrl ||
      attachment?.path ||
      attachment?.filePath ||
      attachment?.downloadUrl ||
      attachment?.FileUrl ||
      attachment?.FilePath ||
      "";

      return {
        key: attachment?.id || attachment?.attachmentId || `${index}`,
        label:
        attachment?.name ||
        attachment?.fileName ||
        attachment?.FileName ||
        `Attachment ${index + 1}`,
        url: rawPath ? buildServerUrl(rawPath) : "",
        size:
        attachment?.size ||
        attachment?.fileSize ||
        attachment?.FileSize ||
        ""
      };
    });
  }, [ticket]);

  const timelineItems = useMemo(() => {
    if (!ticket) {
      return [];
    }

    const rawTimeline = Array.isArray(ticket.raw?.timeline) ?
    ticket.raw.timeline :
    Array.isArray(ticket.raw?.Timeline) ?
    ticket.raw.Timeline :
    [];

    if (rawTimeline.length > 0) {
      return rawTimeline.map((item, index) => ({
        label:
        item?.label ||
        item?.stage ||
        item?.status ||
        `Step ${index + 1}`,
        detail:
        item?.detail ||
        item?.message ||
        item?.description ||
        item?.note ||
        "",
        date:
        item?.date ||
        item?.createdAt ||
        item?.updatedAt ||
        item?.timestamp ||
        ""
      }));
    }

    return [
    {
      label: "Created",
      detail: ticket.createdBy || "Ticket submitted",
      date: ticket.createdDate
    },
    {
      label: "Updated",
      detail: ticket.status || "Latest status change",
      date: ticket.updatedDate
    },
    {
      label: getTicketStatusLabel(ticket.status),
      detail: "Current ticket state",
      date: ticket.updatedDate || ticket.createdDate
    }];

  }, [ticket]);

  const body = loading ?
  <div className="ticket-modal-loading">
      <FaSpinner className="ticket-button-spinner" />
      Loading ticket details...
    </div> :
  ticket ?
  <div className="ticket-details-grid ticket-modal-details-grid">
      <div className="ticket-surface ticket-details-main">
        <div className="ticket-details-section">
          <div className="ticket-section-heading">
            <h3>Overview</h3>
            <StatusPill value={ticket.status} />
          </div>

          <div className="ticket-detail-chips">
            <span className="ticket-pill detail-chip">
              Ticket ID: {ticket.ticketId || "-"}
            </span>
            <span className="ticket-pill detail-chip">
              <strong>Priority</strong> {getTicketPriorityLabel(ticket.priority)}
            </span>
            <span className="ticket-pill detail-chip">
              <strong>Category</strong> {ticket.category || "-"}
            </span>
          </div>

          <div className="ticket-description-block">
            <p>{ticket.description || "No description provided."}</p>
          </div>
        </div>

        <div className="ticket-details-section">
          <div className="ticket-section-heading">
            <h3>Attachments</h3>
          </div>

          {attachmentItems.length === 0 ?
        <EmptyState
          className="ticket-empty-state compact"
          message="No attachments were included with this ticket." /> :

        <div className="ticket-attachment-list">
              {attachmentItems.map((attachment) =>
          <a
            className="ticket-attachment-item ticket-attachment-link"
            href={attachment.url || "#"}
            target={attachment.url ? "_blank" : undefined}
            rel="noreferrer"
            key={attachment.key}>
            
                  <span>{attachment.label}</span>
                  <small>{attachment.size || "File"}</small>
                  {attachment.url ? <FaDownload aria-hidden="true" /> : null}
                </a>
          )}
            </div>
        }
        </div>

        <div className="ticket-details-section">
          <div className="ticket-section-heading">
            <h3>Comments</h3>
          </div>

          {commentItems.length === 0 ?
        <EmptyState
          className="ticket-empty-state compact"
          message="No comments are available for this ticket." /> :

        <div className="ticket-comment-list">
              {commentItems.map((comment) =>
          <div className="ticket-comment-card" key={comment.key}>
                  <strong>{comment.author}</strong>
                  <span>{formatDateTime(comment.date)}</span>
                  <p>{comment.message || "No comment text provided."}</p>
                </div>
          )}
            </div>
        }
        </div>
      </div>

      <div className="ticket-details-aside">
        <div className="ticket-surface ticket-details-panel">
          <h3>Ticket Info</h3>
          <div className="ticket-info-list">
            <div>
              <span>Created By</span>
              <strong>{ticket.createdBy || "-"}</strong>
            </div>
            <div>
              <span>Assigned To</span>
              <strong>{ticket.assignedTo || "-"}</strong>
            </div>
            <div>
              <span>Created Date</span>
              <strong>{formatDateTime(ticket.createdDate)}</strong>
            </div>
            <div>
              <span>Updated Date</span>
              <strong>{formatDateTime(ticket.updatedDate)}</strong>
            </div>
            <div>
              <span>Due Date</span>
              <strong>{formatDate(ticket.dueDate)}</strong>
            </div>
            <div>
              <span>Current Status</span>
              <strong className={`ticket-status-copy status-${getStatusTone(ticket.status)}`}>
                {getTicketStatusLabel(ticket.status)}
              </strong>
            </div>
          </div>
        </div>

        <div className="ticket-surface ticket-details-panel">
          <h3>Status Timeline</h3>
          <div className="ticket-timeline">
            {timelineItems.map((item, index) =>
          <div className="ticket-timeline-item" key={`${item.label}-${index}`}>
                <div className="ticket-timeline-dot" />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail || "-"}</span>
                  <small>{formatDateTime(item.date)}</small>
                </div>
              </div>
          )}
          </div>
        </div>

        <div className="ticket-surface ticket-details-panel">
          <h3>People</h3>
          <div className="ticket-info-list">
            <div>
              <span>Requester ID</span>
              <strong>{ticket.createdById || "-"}</strong>
            </div>
            <div>
              <span>Assignee ID</span>
              <strong>{ticket.assignedToId || "-"}</strong>
            </div>
          </div>
        </div>
      </div>
    </div> :

  <EmptyState
    className="ticket-empty-state compact"
    message="Ticket details are unavailable." />;

  return (
    <ModalShell
      open={open}
      title="Ticket Details"
      subtitle={ticket?.title || "View the full ticket record."}
      onClose={onClose}
      className="ticket-modal-wide ticket-details-modal"
      footer={
      <button type="button" className="ticket-button secondary" onClick={onClose}>
          Close
        </button>
      }>
      
      {body}
    </ModalShell>);

}

function AllTicketsPage({ scope = "admin" }) {
  const isEmployeeScope = scope === "employee";
  const portalLabel = isEmployeeScope ? "Employee portal" : "Admin portal";
  const pageTitle = isEmployeeScope ? "My Tickets" : "All Tickets";
  const pageDescription = isEmployeeScope ?
  "Review your assigned tickets, track status updates, and open details when needed." :
  "Manage tickets, assign work, upload spreadsheets, and review status updates from one place.";

  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionTicketId, setActionTicketId] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [editorState, setEditorState] = useState({
    open: false,
    mode: "create",
    ticketId: ""
  });
  const [detailsState, setDetailsState] = useState({
    open: false,
    ticketId: ""
  });
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignSaving, setAutoAssignSaving] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const canAutoAssignTickets = !isEmployeeScope && !hasRole("employee", "user");

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = isEmployeeScope ? await fetchMyTickets() : await fetchTickets();
      setTickets(data);
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to load tickets right now."
      );
      toast.error(errorMessage);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [isEmployeeScope]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setEmployeesLoading(true);
        const response = await api.get(API_ENDPOINTS.employees.list);
        const records = extractCollection(response.data).map((employee) =>
        normalizeEmployeeOption(employee)
        );
        setEmployees(records);
      } catch (error) {

        const errorMessage = await getTicketApiErrorMessage(
          error,
          "Unable to load employee list."
        );
        toast.error(errorMessage);
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    };

    loadEmployees();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
  search,
  statusFilter,
  priorityFilter,
  categoryFilter,
  createdFrom,
  createdTo,
  sortConfig.key,
  sortConfig.direction]
  );

  const filteredTickets = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
      !normalizedSearch || getTicketSearchText(ticket).includes(normalizedSearch);
      const matchesStatus =
      statusFilter === "All" || normalizeTicketStatus(ticket.status) === statusFilter;
      const matchesPriority =
      priorityFilter === "All" || ticket.priority === priorityFilter;
      const matchesCategory =
      categoryFilter === "All" || ticket.category === categoryFilter;
      const matchesDateRange = isDateInRange(
        ticket.createdDate,
        createdFrom,
        createdTo
      );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCategory &&
        matchesDateRange);

    });
  }, [
  tickets,
  deferredSearch,
  statusFilter,
  priorityFilter,
  categoryFilter,
  createdFrom,
  createdTo]
  );

  const sortedTickets = useMemo(() => {
    const items = [...filteredTickets];
    const { key, direction } = sortConfig;

    return items.sort((left, right) => compareValues(left, right, key, direction));
  }, [filteredTickets, sortConfig]);

  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedTickets.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, sortedTickets]);

  const summaryCards = useMemo(() => {
    const total = filteredTickets.length;
    const open = filteredTickets.filter((ticket) => ticket.status === "Open").length;
    const inProgress = filteredTickets.filter(
      (ticket) => ticket.status === "In Progress"
    ).length;
    const completed = filteredTickets.filter(
      (ticket) => ticket.status === "Completed"
    ).length;

    return [
    { label: "Total Tickets", value: total, tone: "total" },
    { label: "Open", value: open, tone: "open" },
    { label: "In Progress", value: inProgress, tone: "progress" },
    { label: "Completed", value: completed, tone: "resolved" }];

  }, [filteredTickets]);

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
      current.key === key ?
      current.direction === "asc" ?
      "desc" :
      "asc" :
      getDefaultSortDirection(key)
    }));
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCategoryFilter("All");
    setCreatedFrom("");
    setCreatedTo("");
  };

  const buildExportParams = () => ({
    search: deferredSearch || undefined,
    status: statusFilter !== "All" ? statusFilter : undefined,
    priority: priorityFilter !== "All" ? priorityFilter : undefined,
    category: categoryFilter !== "All" ? categoryFilter : undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    sortBy: sortConfig.key,
    sortDirection: sortConfig.direction
  });

  const handleExportTickets = async () => {
    if (exporting) {
      return;
    }

    setExporting(true);

    try {
      await exportTickets(buildExportParams());
      toast.success("Tickets export is downloading.");
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to export tickets right now."
      );
      toast.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!deleteCandidate) {
      return;
    }

    try {
      setActionTicketId(deleteCandidate.ticketId);
      await deleteTicket(deleteCandidate.ticketId);
      toast.success("Ticket deleted successfully.");
      setDeleteCandidate(null);
      await loadTickets();
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to delete the ticket right now."
      );
      toast.error(errorMessage);
    } finally {
      setActionTicketId("");
    }
  };

  const refreshTicketsAndDetails = async (ticketId) => {
    await loadTickets();

    if (
    detailsState.open &&
    String(detailsState.ticketId) === String(ticketId))
    {
      setDetailsRefreshKey((current) => current + 1);
    }
  };

  const runAutoAssignAfterCompletion = async (ticket) => {
    try {
      await autoAssignTickets(buildAutoAssignPayload(ticket?.projectId));
    } catch (error) {

      const message = await getAutoAssignErrorMessage(error);
      toast.error(message);
    }
  };

  const handleStatusUpdate = async (ticket, nextStatus) => {
    const normalizedStatus = normalizeTicketStatus(nextStatus);

    if (normalizedStatus === ticket.status) {
      return;
    }

    try {
      setActionTicketId(ticket.ticketId);
      await updateTicketStatus(ticket.ticketId, normalizedStatus);
      toast.success("Ticket status updated.");
      await refreshTicketsAndDetails(ticket.ticketId);
      if (isEmployeeScope && normalizedStatus === "Completed") {
        await runAutoAssignAfterCompletion(ticket);
        await loadTickets();
      }
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to update the ticket status right now."
      );
      toast.error(errorMessage);
    } finally {
      setActionTicketId("");
    }
  };

  const handleStartWork = async (ticket) => {
    if (!ticket?.ticketId) {
      return;
    }

    try {
      setActionTicketId(ticket.ticketId);
      await startTicketWork(ticket);
      await updateTicketStatus(ticket.ticketId, "In Progress");
      toast.success("Work started.");
      await refreshTicketsAndDetails(ticket.ticketId);
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to start work on this ticket right now."
      );
      toast.error(errorMessage);
    } finally {
      setActionTicketId("");
    }
  };

  const handleStopWork = async (ticket) => {
    if (!ticket?.ticketId) {
      return;
    }

    try {
      setActionTicketId(ticket.ticketId);
      await stopTicketWork(ticket);
      await updateTicketStatus(ticket.ticketId, "Completed");
      toast.success("Work stopped.");
      await refreshTicketsAndDetails(ticket.ticketId);
      if (isEmployeeScope) {
        await runAutoAssignAfterCompletion(ticket);
        await loadTickets();
      }
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to stop work on this ticket right now."
      );
      toast.error(errorMessage);
    } finally {
      setActionTicketId("");
    }
  };

  const handleUploadComplete = async () => {
    await loadTickets();
  };

  const handleAutoAssignConfirm = async () => {
    if (autoAssignSaving) {
      return;
    }

    try {
      setAutoAssignSaving(true);
      await autoAssignTickets(buildAutoAssignPayload());
      toast.success(AUTO_ASSIGN_SUCCESS_MESSAGE);
      setAutoAssignOpen(false);
      await loadTickets();
      setDetailsRefreshKey((current) => current + 1);
    } catch (error) {

      const message = await getAutoAssignErrorMessage(error);
      toast.error(message);
    } finally {
      setAutoAssignSaving(false);
    }
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadTicketTemplate();
      toast.success("Template download started.");
    } catch (error) {

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to download the template right now."
      );
      toast.error(errorMessage);
    }
  };

  const loadingView = loading ?
  <div className="ticket-page">
      <TableSkeleton rows={8} columns={TABLE_COLUMNS.length} />
    </div> :
  null;

  if (loadingView) {
    return loadingView;
  }

  return (
    <div className="ticket-page ticket-admin-page">
      <div className="ticket-hero">
        <div className="ticket-hero-copy">
          <span className="ticket-eyebrow">{portalLabel}</span>
          <h2>{pageTitle}</h2>
          <p>{pageDescription}</p>
        </div>

        <div className="ticket-hero-actions">
          {!isEmployeeScope ?
          <>
              <button
              type="button"
              className="ticket-button secondary"
              onClick={() =>
              setEditorState({
                open: true,
                mode: "create",
                ticketId: ""
              })
              }>
              
                <FaPlus aria-hidden="true" />
                Create Ticket
              </button>

              <button
              type="button"
              className="ticket-button secondary"
              onClick={() => setBulkOpen(true)}>
              
                <FaUpload aria-hidden="true" />
                Bulk Upload
              </button>

              <button
              type="button"
              className="ticket-button secondary"
              onClick={handleTemplateDownload}>
              
                <FaDownload aria-hidden="true" />
                Download Template
              </button>

              {canAutoAssignTickets ?
            <button
              type="button"
              className="ticket-button primary"
              onClick={() => setAutoAssignOpen(true)}
              disabled={autoAssignSaving}>
              
                  {autoAssignSaving ?
              <>
                      <FaSpinner className="ticket-button-spinner" />
                      Auto Assigning...
                    </> :

              <>
                      <FaSyncAlt aria-hidden="true" />
                      Auto Assign
                    </>
              }
                </button> :
            null}

              <button
              type="button"
              className="ticket-button primary"
              onClick={handleExportTickets}
              disabled={exporting}>
              
                {exporting ?
              <>
                    <FaSpinner className="ticket-button-spinner" />
                    Exporting...
                  </> :

              <>
                    <FaDownload aria-hidden="true" />
                    Export Tickets
                  </>
              }
              </button>
            </> :
          null}
        </div>
      </div>

      <div className="ticket-metric-grid">
        {summaryCards.map((card) =>
        <div className={`ticket-metric-card tone-${card.tone}`} key={card.label}>
            <div>
              <span className="ticket-metric-label">{card.label}</span>
              <strong className="ticket-metric-value">{card.value}</strong>
            </div>
            <FaTicketAlt aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="ticket-toolbar-new">

        <div className="ticket-search-group">

          <FaSearch />

          <input
            type="text"
            placeholder="Search by title, employee, or ticket ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)} />
          

        </div>

        <button
          className="ticket-filter-toggle"
          onClick={() => setFiltersOpen(!filtersOpen)}>
          
          <FaFilter />

          <span>Filters</span>

          {filtersOpen ?
          <FaChevronUp className="ticket-filter-arrow" /> :

          <FaChevronDown className="ticket-filter-arrow" />
          }
        </button>

      </div>

      {
      filtersOpen &&

      <div className="ticket-filter-panel">

            <div className="ticket-filter-grid">

              <div>

                <label>Status</label>

                <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
              

                  {
              STATUS_OPTIONS.map((item) =>

              <option
                key={item}
                value={item}>
                

                        {item}

                      </option>

              )

              }

                </select>

              </div>

              <div>

                <label>Category</label>

                <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}>
              

                  {
              CATEGORY_OPTIONS.map((item) =>

              <option
                key={item}
                value={item}>
                

                        {item}

                      </option>

              )

              }

                </select>

              </div>

              <div>

                <label>Priority</label>

                <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}>
              

                  {
              PRIORITY_OPTIONS.map((item) =>

              <option
                key={item}
                value={item}>
                

                        {item}

                      </option>

              )

              }

                </select>

              </div>

              <div>

                <label>From Date</label>

                <AppDatePicker

              value={createdFrom}

              onChange={(e) => setCreatedFrom(e.target.value)}

              placeholder="From date" />

            

              </div>

              <div>

                <label>To Date</label>

                <AppDatePicker

              value={createdTo}

              onChange={(e) => setCreatedTo(e.target.value)}

              placeholder="To date" />

            

              </div>

            </div>

            <div className="ticket-filter-footer">

              <button
            className="ticket-button secondary"
            onClick={handleResetFilters}>
            
                Reset
              </button>
            </div>
          </div>

      }

      <div className={`ticket-table-card ${isEmployeeScope ? "ticket-user-table-card" : ""}`.trim()}>
        <div className="ticket-table-scroll">
          {/* Title and Description cells use a fixed 20-character display cap with full-value tooltips. */}
          <table className="ticket-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map((column) => {
                  if (column.key === "actions") {
                    return (
                      <th
                        key={column.key}
                        className="ticket-table-actions-cell"
                        style={{
                          width: column.width,
                          minWidth: column.width,
                          maxWidth: column.width
                        }}>
                        
                        <div className="ticket-table-head-actions">
                          <span>{column.label}</span>
                        </div>
                      </th>);

                  }

                  return (
                    <th
                      key={column.key}
                      style={{
                        width: column.width,
                        minWidth: column.width,
                        maxWidth: column.width
                      }}>
                      
                      {column.label}
                    </th>);

                })}
              </tr>
            </thead>

            <tbody>
              {filteredTickets.length === 0 ?
              <tr>
                  <td colSpan={TABLE_COLUMNS.length} className="ticket-empty-cell">
                    <EmptyState
                    className="ticket-empty-state"
                    message="No tickets match the current filters." />
                  
                  </td>
                </tr> :

              paginatedTickets.map((ticket) => {
                const isUpdating = actionTicketId === ticket.ticketId;
                const rowStatusOptions = isEmployeeScope ?
                getEmployeeRowStatusOptions(ticket) :
                getTicketStatusOptions("admin");
                const showStartWork =
                isEmployeeScope &&
                isTicketAssigned(ticket) &&
                !isTicketCompleted(ticket);
                const showStopWork =
                isEmployeeScope &&
                isTicketWorkActive(ticket);

                return (
                  <tr key={ticket.ticketId}>
                      <td>{ticket.ticketId || "-"}</td>
                      <td>
                        <button
                        type="button"
                        className="ticket-inline-link"
                        title={ticket.title || ""}
                        onClick={() =>
                        setDetailsState({
                          open: true,
                          ticketId: ticket.ticketId
                        })
                        }>
                        
                          <span className="ticket-table-text-truncate">
                            {truncateTicketText(ticket.title, 20)}
                          </span>
                        </button>
                      </td>
                      <td className="ticket-description-cell" title={ticket.description || ""}>
                        <span className="ticket-table-text-truncate">
                          {truncateTicketText(ticket.description, 20)}
                        </span>
                      </td>
                      <td>{ticket.category || "-"}</td>
                      <td>
                        <PriorityPill value={ticket.priority} />
                      </td>
                      <td>
                        <StatusPill value={ticket.status} />
                      </td>
                      <td>{ticket.createdBy || "-"}</td>
                      <td>{ticket.assignedTo || "-"}</td>
                      <td>{formatDate(ticket.createdDate)}</td>
                      <td>{formatDate(ticket.updatedDate)}</td>
                      <td className="ticket-table-actions-cell">
                        <div className="ticket-row-actions">
                          <button
                          type="button"
                          className="ticket-action-button view"
                          onClick={() =>
                          setDetailsState({
                            open: true,
                            ticketId: ticket.ticketId
                          })
                          }
                          title="View ticket">
                          
                            <FaEye aria-hidden="true" />
                          </button>

                          <button
                          type="button"
                          className="ticket-action-button edit"
                          onClick={() =>
                          setEditorState({
                            open: true,
                            mode: "edit",
                            ticketId: ticket.ticketId
                          })
                          }
                          title="Edit ticket">
                          
                            <FaPen aria-hidden="true" />
                          </button>

                          <button
                          type="button"
                          className="ticket-action-button delete"
                          onClick={() => setDeleteCandidate(ticket)}
                          title="Delete ticket">
                          
                            <FaTrash aria-hidden="true" />
                          </button>

                          {showStartWork ?
                        <button
                          type="button"
                          className="ticket-action-button start"
                          onClick={() => handleStartWork(ticket)}
                          title="Start Work"
                          disabled={isUpdating}>
                          
                              <FaPlay aria-hidden="true" />
                            </button> :
                        null}

                          {showStopWork ?
                        <button
                          type="button"
                          className="ticket-action-button stop"
                          onClick={() => handleStopWork(ticket)}
                          title="Stop Work"
                          disabled={isUpdating}>
                          
                              <FaStop aria-hidden="true" />
                            </button> :
                        null}

                          <select
                          className="ticket-status-select"
                          value={ticket.status}
                          disabled={isUpdating}
                          onChange={(event) =>
                          handleStatusUpdate(ticket, event.target.value)
                          }>
                          
                            {rowStatusOptions.map((status) =>
                          <option key={status} value={status}>
                                {status}
                              </option>
                          )}
                          </select>

                          {isUpdating ?
                        <FaSpinner
                          className="ticket-row-spinner"
                          aria-hidden="true" /> :

                        null}
                        </div>
                      </td>
                    </tr>);

              })
              }
            </tbody>
          </table>
        </div>
      </div>

      <AppPagination
        totalItems={filteredTickets.length}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="tickets"
        className="ticket-pagination" />
      

      <TicketEditorModal
        open={editorState.open}
        mode={editorState.mode}
        ticketId={editorState.ticketId}
        employees={employees}
        loadingEmployees={employeesLoading}
        onClose={() =>
        setEditorState({
          open: false,
          mode: "create",
          ticketId: ""
        })
        }
        onSaved={loadTickets} />
      

      <TicketDetailsModal
        open={detailsState.open}
        ticketId={detailsState.ticketId}
        refreshKey={detailsRefreshKey}
        onClose={() =>
        setDetailsState({
          open: false,
          ticketId: ""
        })
        } />
      

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onUploaded={handleUploadComplete} />
      

      <AutoAssignConfirmModal
        open={autoAssignOpen}
        saving={autoAssignSaving}
        badge="All Tickets"
        onClose={() => {
          if (!autoAssignSaving) {
            setAutoAssignOpen(false);
          }
        }}
        onConfirm={handleAutoAssignConfirm} />
      

      {deleteCandidate ?
      <ModalShell
        open
        title="Delete Ticket"
        subtitle={`Are you sure you want to delete ticket ${deleteCandidate.ticketId || "-"}?`}
        onClose={() => setDeleteCandidate(null)}
        className="ticket-modal-narrow"
        footer={
        <>
              <button
            type="button"
            className="ticket-button secondary"
            onClick={() => setDeleteCandidate(null)}
            disabled={Boolean(actionTicketId)}>
            
                Cancel
              </button>

              <button
            type="button"
            className="ticket-button danger"
            onClick={handleDeleteTicket}
            disabled={Boolean(actionTicketId)}>
            
                {actionTicketId === deleteCandidate.ticketId ?
            <>
                    <FaSpinner className="ticket-button-spinner" />
                    Deleting...
                  </> :

            "Delete Ticket"
            }
              </button>
            </>
        }>
        
          <div className="ticket-delete-icon">
            <FaTrash aria-hidden="true" />
          </div>
          <p className="ticket-delete-message">
            This action cannot be undone.
          </p>
        </ModalShell> :
      null}
    </div>);

}

export default AllTicketsPage;