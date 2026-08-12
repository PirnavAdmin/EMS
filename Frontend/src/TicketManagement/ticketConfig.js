const normalizeSpace = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const titleCaseWord = (word) =>
  String(word || "")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());

const normalizePermissionName = (value = "") =>
  normalizeSpace(value).toLowerCase().replace(/[^a-z0-9]/g, "");

const TICKET_PERMISSION_GROUPS = [
  {
    canonical: "All Tickets",
    aliases: ["All Tickets", "Ticket Management", "Task Management"],
  },
  {
    canonical: "My Tickets",
    aliases: ["My Tickets", "User Task Management"],
  },
];

const getPermissionGroup = (value = "") => {
  const normalizedValue = normalizePermissionName(value);

  const matchedGroup = TICKET_PERMISSION_GROUPS.find((group) =>
    group.aliases.some(
      (alias) => normalizePermissionName(alias) === normalizedValue
    )
  );

  return matchedGroup?.canonical || normalizedValue;
};

export const ticketPermissionMatches = (left, right) =>
  getPermissionGroup(left) === getPermissionGroup(right);

export const TICKET_CATEGORY_OPTIONS = [
  "HR",
  "IT Support",
  "Payroll",
  "Admin",
  "General Queries",
];

export const TICKET_PRIORITY_OPTIONS = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

export const ADMIN_TICKET_STATUS_OPTIONS = [
  "Assigned",
  "Open",
  "In Progress",
  "On Hold",
  "Completed",
  "Closed",
  "Pending",
  "Resolved",
  "Rejected",
];

export const EMPLOYEE_TICKET_STATUS_OPTIONS = [
  "In Progress",
  "On Hold",
  "Completed",
];

export const TICKET_STATUS_META = {
  Open: {
    tone: "open",
    label: "Open",
    order: 1,
  },
  Assigned: {
    tone: "open",
    label: "Assigned",
    order: 2,
  },
  "In Progress": {
    tone: "progress",
    label: "In Progress",
    order: 3,
  },
  "On Hold": {
    tone: "pending",
    label: "On Hold",
    order: 4,
  },
  Completed: {
    tone: "completed",
    label: "Completed",
    order: 5,
  },
  Pending: {
    tone: "pending",
    label: "Pending",
    order: 6,
  },
  Resolved: {
    tone: "resolved",
    label: "Resolved",
    order: 7,
  },
  Closed: {
    tone: "closed",
    label: "Closed",
    order: 8,
  },
  Rejected: {
    tone: "rejected",
    label: "Rejected",
    order: 9,
  },
};

export const TICKET_PRIORITY_META = {
  Low: {
    tone: "low",
    label: "Low",
    order: 1,
  },
  Medium: {
    tone: "medium",
    label: "Medium",
    order: 2,
  },
  High: {
    tone: "high",
    label: "High",
    order: 3,
  },
  Critical: {
    tone: "critical",
    label: "Critical",
    order: 4,
  },
};

export const TICKET_FORM_LIMITS = {
  title: 120,
  description: 1500,
  category: 60,
  priority: 20,
};

export const TICKET_SEARCH_HINT =
  "Search by ticket ID, title, employee, or assignee";

export const getTicketStatusOptions = (role = "admin") =>
  role === "user" ? EMPLOYEE_TICKET_STATUS_OPTIONS : ADMIN_TICKET_STATUS_OPTIONS;

export const getTicketCategoryOptions = () => [...TICKET_CATEGORY_OPTIONS];

export const normalizeTicketPriority = (value) => {
  const normalized = normalizeSpace(value).toLowerCase();

  if (!normalized) {
    return "Medium";
  }

  if (normalized.includes("critical")) return "Critical";
  if (normalized.includes("high")) return "High";
  if (normalized.includes("low")) return "Low";
  if (normalized.includes("medium")) return "Medium";

  return titleCaseWord(normalized);
};

export const normalizeTicketStatus = (value) => {
  const normalized = normalizeSpace(value).toLowerCase().replace(/[-_]/g, " ");
  const compact = normalized.replace(/\s+/g, "");

  if (!normalized) {
    return "Open";
  }

  if (compact === "open" || compact === "todo" || compact === "new") {
    return "Open";
  }

  if (compact === "assigned") {
    return "Assigned";
  }

  if (compact === "inprogress" || normalized.includes("progress")) {
    return "In Progress";
  }

  if (compact === "onhold" || normalized.includes("hold")) {
    return "On Hold";
  }

  if (
    compact === "completed" ||
    compact === "complete" ||
    compact === "done" ||
    compact === "resolved"
  ) {
    return "Completed";
  }

  if (compact === "closed" || compact === "close") {
    return "Closed";
  }

  if (compact === "pending" || normalized.includes("waiting")) {
    return "Pending";
  }

  if (compact === "rejected" || compact === "declined" || compact === "cancelled") {
    return "Rejected";
  }

  return titleCaseWord(normalized);
};

export const normalizeTicketCategory = (value) => {
  const normalized = normalizeSpace(value);

  if (!normalized) {
    return "General Queries";
  }

  const matchedCategory = TICKET_CATEGORY_OPTIONS.find(
    (option) => option.toLowerCase() === normalized.toLowerCase()
  );

  return matchedCategory || normalized;
};

export const getStatusTone = (status) =>
  TICKET_STATUS_META[normalizeTicketStatus(status)]?.tone || "open";

export const getPriorityTone = (priority) =>
  TICKET_PRIORITY_META[normalizeTicketPriority(priority)]?.tone || "medium";

export const getStatusOrder = (status) =>
  TICKET_STATUS_META[normalizeTicketStatus(status)]?.order ?? 99;

export const getPriorityOrder = (priority) =>
  TICKET_PRIORITY_META[normalizeTicketPriority(priority)]?.order ?? 99;

export const getTicketStatusLabel = (status) =>
  TICKET_STATUS_META[normalizeTicketStatus(status)]?.label || normalizeTicketStatus(status);

export const getTicketPriorityLabel = (priority) =>
  TICKET_PRIORITY_META[normalizeTicketPriority(priority)]?.label || normalizeTicketPriority(priority);

export const normalizeEmployeeOption = (employee = {}) => {
  const id =
    employee.employee_Id ??
    employee.employee_id ??
    employee.employeeId ??
    employee.id ??
    employee.Id ??
    "";

  const firstName = normalizeSpace(employee.firstName || employee.FirstName);
  const lastName = normalizeSpace(employee.lastName || employee.LastName);

  const name =
    normalizeSpace(employee.name || employee.Name || `${firstName} ${lastName}`) ||
    "Employee";

  return {
    id: String(id || "").trim(),
    name,
    label: `${name}${id ? ` (${id})` : ""}`,
  };
};

export const createEmptyTicketForm = (role = "admin") => ({
  title: "",
  description: "",
  category: "",
  priority: "Medium",
  assignedToEmployee: "",
  assignedToEmployeeId: "",
  dueDate: "",
  attachmentFile: null,
  notes: "",
  status: role === "user" ? "Open" : "Open",
});

export const normalizeTicketFieldText = (value) => normalizeSpace(value);

export const truncateTicketText = (value, maxLength = 20, fallback = "-") => {
  const text = normalizeTicketFieldText(value);

  if (!text) {
    return fallback;
  }

  const characters = Array.from(text);
  if (characters.length <= maxLength) {
    return text;
  }

  return `${characters.slice(0, maxLength).join("")}...`;
};

export const buildTicketPayload = (formData = {}, options = {}) => {
  const normalized = {
    title: normalizeTicketFieldText(formData.title),
    description: normalizeTicketFieldText(formData.description),
    category: normalizeTicketCategory(formData.category),
    priority: normalizeTicketPriority(formData.priority),
    assignedToEmployee: normalizeTicketFieldText(formData.assignedToEmployee),
    assignedToEmployeeId: normalizeTicketFieldText(formData.assignedToEmployeeId),
    dueDate: normalizeTicketFieldText(formData.dueDate),
    notes: normalizeTicketFieldText(formData.notes),
    status: normalizeTicketStatus(options.status || formData.status),
  };

  const file = formData.attachmentFile;
  const hasAttachment =
    typeof File !== "undefined" && file instanceof File && file.size > 0;
  return {
    projectId: formData.projectId || 0,

    title: normalized.title,

    description: normalized.description,

    technology: formData.technology || "",

    priority: normalized.priority,

    assignedTo:
      normalized.assignedToEmployeeId ||
      normalized.assignedToEmployee,

    startDate: formData.startDate || null,

    dueDate: normalized.dueDate || null,

    estimatedHours: formData.estimatedHours || null,

    // keep your existing fields
    ticketTitle: normalized.title,
    ticketDescription: normalized.description,
    category: normalized.category,
    ticketCategory: normalized.category,
    ticketPriority: normalized.priority,
    assignedToEmployee: normalized.assignedToEmployee,
    assignedToEmployeeId: normalized.assignedToEmployeeId,
    assignee: normalized.assignedToEmployee,
    assigneeId: normalized.assignedToEmployeeId,
    notes: normalized.notes,
    remarks: normalized.notes,
    remark: normalized.notes,
    status: normalized.status,
    ticketStatus: normalized.status,
  };

  const payload = new FormData();

  [
    ["title", normalized.title],
    ["ticketTitle", normalized.title],
    ["description", normalized.description],
    ["ticketDescription", normalized.description],
    ["category", normalized.category],
    ["ticketCategory", normalized.category],
    ["priority", normalized.priority],
    ["ticketPriority", normalized.priority],
    ["assignedToEmployee", normalized.assignedToEmployee],
    ["assignedToEmployeeId", normalized.assignedToEmployeeId],
    ["assignee", normalized.assignedToEmployee],
    ["assigneeId", normalized.assignedToEmployeeId],
    ["dueDate", normalized.dueDate],
    ["ticketDueDate", normalized.dueDate],
    ["notes", normalized.notes],
    ["remarks", normalized.notes],
    ["remark", normalized.notes],
    ["status", normalized.status],
    ["ticketStatus", normalized.status],
  ].forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      payload.append(key, value);
    }
  });

  payload.append("attachmentFile", file);
  payload.append("attachment", file);

  return payload;
};

export const normalizeTicketId = (ticket = {}) =>
  ticket.ticketId ??
  ticket.ticketID ??
  ticket.ticket_Id ??
  ticket.id ??
  ticket.Id ??
  ticket.ticketNo ??
  ticket.ticketNumber ??
  ticket.referenceNo ??
  "";

export const normalizeTicketRecord = (ticket = {}) => {
  const rawTicketId = normalizeTicketId(ticket);
  const title =
    ticket.title ??
    ticket.Title ??
    ticket.ticketTitle ??
    ticket.subject ??
    ticket.Subject ??
    "";

  const description =
    ticket.description ??
    ticket.Description ??
    ticket.ticketDescription ??
    ticket.details ??
    ticket.Details ??
    "";

  const category = normalizeTicketCategory(
    ticket.category ??
    ticket.Category ??
    ticket.ticketCategory ??
    ticket.type ??
    ticket.Type
  );

  const priority = normalizeTicketPriority(
    ticket.priority ??
    ticket.Priority ??
    ticket.ticketPriority ??
    ticket.severity ??
    ticket.Severity
  );

  const status = normalizeTicketStatus(
    ticket.status ??
    ticket.Status ??
    ticket.ticketStatus ??
    ticket.state ??
    ticket.State
  );

  const createdBy =
    ticket.createdBy ??
    ticket.CreatedBy ??
    ticket.createdByName ??
    ticket.requestedBy ??
    ticket.requestedByName ??
    ticket.employeeName ??
    ticket.EmployeeName ??
    "";

  const assignedBy =
    ticket.assignedBy ??
    ticket.AssignedBy ??
    ticket.assignedByName ??
    ticket.assignedByEmployee ??
    createdBy;

  const createdById =
    ticket.createdById ??
    ticket.CreatedById ??
    ticket.requestedById ??
    ticket.employeeId ??
    ticket.EmployeeId ??
    "";

  const assignedTo =
    ticket.assignedTo ??
    ticket.AssignedTo ??
    ticket.assignedToName ??
    ticket.assignee ??
    ticket.Assignee ??
    ticket.assignedEmployee ??
    ticket.assignedEmployeeName ??
    "";

  const assignedToId =
    ticket.assignedToId ??
    ticket.AssignedToId ??
    ticket.assigneeId ??
    ticket.AssigneeId ??
    ticket.assignedEmployeeId ??
    ticket.assignedEmployee_Id ??
    "";

  const createdDate =
    ticket.createdDate ??
    ticket.CreatedDate ??
    ticket.createdAt ??
    ticket.CreatedAt ??
    ticket.submittedAt ??
    ticket.SubmittedAt ??
    "";

  const updatedDate =
    ticket.updatedDate ??
    ticket.UpdatedDate ??
    ticket.updatedAt ??
    ticket.UpdatedAt ??
    ticket.modifiedAt ??
    ticket.ModifiedAt ??
    createdDate;

  const dueDate =
    ticket.dueDate ??
    ticket.DueDate ??
    ticket.ticketDueDate ??
    ticket.dueOn ??
    ticket.DueOn ??
    "";

  const assignedDate =
    ticket.assignedDate ??
    ticket.AssignedDate ??
    ticket.assignedAt ??
    ticket.AssignedAt ??
    ticket.assignedOn ??
    ticket.AssignedOn ??
    "";

  const startedDate =
    ticket.startedDate ??
    ticket.StartedDate ??
    ticket.startedAt ??
    ticket.StartedAt ??
    ticket.workStartedAt ??
    ticket.WorkStartedAt ??
    "";

  const completedDate =
    ticket.completedDate ??
    ticket.CompletedDate ??
    ticket.completedAt ??
    ticket.CompletedAt ??
    ticket.workCompletedAt ??
    ticket.WorkCompletedAt ??
    "";

  const stoppedDate =
    ticket.stoppedDate ??
    ticket.StoppedDate ??
    ticket.stoppedAt ??
    ticket.StoppedAt ??
    ticket.workStoppedAt ??
    ticket.WorkStoppedAt ??
    ticket.stopWorkAt ??
    ticket.StopWorkAt ??
    "";

  const workStarted =
    ticket.workStarted ??
    ticket.WorkStarted ??
    ticket.isWorkStarted ??
    ticket.IsWorkStarted ??
    ticket.hasStartedWork ??
    ticket.HasStartedWork ??
    false;

  const workActive =
    ticket.workActive ??
    ticket.WorkActive ??
    ticket.isWorkActive ??
    ticket.IsWorkActive ??
    ticket.isWorking ??
    ticket.IsWorking ??
    false;

  const spentHours =
    ticket.spentHours ??
    ticket.SpentHours ??
    ticket.timeSpent ??
    ticket.TimeSpent ??
    ticket.actualHours ??
    ticket.ActualHours ??
    ticket.workHours ??
    ticket.WorkHours ??
    "";

  const notes =
    ticket.notes ??
    ticket.Notes ??
    ticket.remarks ??
    ticket.Remarks ??
    ticket.remark ??
    ticket.Remark ??
    "";

  return {
    raw: ticket,
    ticketId: String(rawTicketId || "").trim(),

    // ADD THESE 4 LINES
    projectId:
      ticket.projectId ??
      ticket.ProjectId ??
      ticket.projectID ??
      0,

    technology:
      ticket.technology ??
      ticket.Technology ??
      "",

    startDate:
      ticket.startDate ??
      ticket.StartDate ??
      "",

    estimatedHours:
      ticket.estimatedHours ??
      ticket.EstimatedHours ??
      null,

    // Existing fields
    title: normalizeSpace(title),
    description: normalizeSpace(description),
    category,
    priority,
    status,
    createdBy: normalizeSpace(createdBy),
    createdById: normalizeSpace(createdById),
    assignedBy: normalizeSpace(assignedBy),
    assignedTo: normalizeSpace(assignedTo),
    assignedToId: normalizeSpace(assignedToId),
    createdDate,
    updatedDate,
    dueDate,
    assignedDate,
    startedDate,
    stoppedDate,
    completedDate,
    workStarted: Boolean(workStarted || startedDate),
    workActive: Boolean(workActive),
    spentHours,
    notes: normalizeSpace(notes),
    remarks: normalizeSpace(notes),
    comments: Array.isArray(ticket.comments)
      ? ticket.comments
      : Array.isArray(ticket.Comments)
        ? ticket.Comments
        : [],
    attachments: Array.isArray(ticket.attachments)
      ? ticket.attachments
      : Array.isArray(ticket.Attachments)
        ? ticket.Attachments
        : [],
    timeline: Array.isArray(ticket.timeline)
      ? ticket.timeline
      : Array.isArray(ticket.Timeline)
        ? ticket.Timeline
        : [],
    rawStatus: ticket.status ?? ticket.Status ?? ticket.ticketStatus ?? "",
  };
};

export const getTicketSearchText = (ticket) =>
  [
    ticket.ticketId,
    ticket.title,
    ticket.createdBy,
    ticket.assignedBy,
    ticket.assignedTo,
    ticket.category,
    ticket.priority,
    ticket.status,
    ticket.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const getTicketSortValue = (ticket, field) => {
  switch (field) {
    case "ticketId":
      return ticket.ticketId || "";
    case "title":
      return ticket.title || "";
    case "description":
      return ticket.description || "";
    case "category":
      return ticket.category || "";
    case "priority":
      return getPriorityOrder(ticket.priority);
    case "status":
      return getStatusOrder(ticket.status);
    case "createdBy":
      return ticket.createdBy || "";
    case "assignedBy":
      return ticket.assignedBy || ticket.createdBy || "";
    case "assignedTo":
      return ticket.assignedTo || "";
    case "createdDate":
      return ticket.createdDate || "";
    case "updatedDate":
      return ticket.updatedDate || "";
    default:
      return ticket[field] || "";
  }
};

export const canEditTicket = (role, status) => {
  const normalizedStatus = normalizeTicketStatus(status);

  if (role === "admin") {
    return true;
  }

  return ["Open", "Pending"].includes(normalizedStatus);
};

export const canDeleteTicket = (role, status) => {
  const normalizedStatus = normalizeTicketStatus(status);

  if (role === "admin") {
    return true;
  }

  return normalizedStatus === "Open";
};

export const canUpdateTicketStatus = (role) => {
  if (role === "admin") {
    return true;
  }

  return true;
};
