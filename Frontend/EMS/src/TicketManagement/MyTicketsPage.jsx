import React, {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FaCheck,
  FaEye,
  FaFilter,
  FaPen,
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaSpinner,
  FaTicketAlt,
  FaTimes,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./TicketManagement.css";
import AppPagination from "../components/AppPagination";
import EmptyState from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeletons";
import useTheme from "../theme/useTheme";
import {
  compareDatesAsc,
  compareDatesDesc,
  formatDate,
  formatDateTime,
  parseDate,
} from "../utils/date";
import { buildServerUrl } from "../api/endpoints";
import {
  buildTicketPayload,
  getPriorityTone,
  getStatusTone,
  getTicketPriorityLabel,
  getTicketSearchText,
  getTicketSortValue,
  getTicketStatusLabel,
  getTicketStatusOptions,
  normalizeTicketRecord,
  normalizeTicketStatus,
} from "./ticketConfig";
import {
  fetchMyTickets,
  fetchTicketById,
  getTicketApiErrorMessage,
  updateTicket,
  updateTicketStatus,
} from "../services/ticketService";

const PAGE_SIZE = 10;

const TABLE_COLUMNS = [
  { key: "ticketId", label: "Ticket ID", width: "90px" },
  { key: "title", label: "Title", width: "220px" },
  { key: "description", label: "Description", width: "270px" },
  { key: "category", label: "Category", width: "180px" },
  { key: "priority", label: "Priority", width: "120px" },
  { key: "status", label: "Status", width: "140px" },
  { key: "assignedBy", label: "Assigned By", width: "140px" },
  { key: "createdDate", label: "Created Date", width: "140px" },
  { key: "dueDate", label: "Due Date", width: "140px" },
  { key: "actions", label: "Actions", width: "300px" },
];

const DEFAULT_SORT = {
  key: "createdDate",
  direction: "desc",
};

const STATUS_OPTIONS = ["All", ...getTicketStatusOptions("user")];

const getDefaultSortDirection = (key) =>
  ["ticketId", "createdDate", "dueDate"].includes(key) ? "desc" : "asc";

const compareValues = (left, right, key, direction) => {
  const leftValue = getTicketSortValue(left, key);
  const rightValue = getTicketSortValue(right, key);

  if (key === "createdDate" || key === "dueDate") {
    return direction === "asc"
      ? compareDatesAsc(leftValue, rightValue)
      : compareDatesDesc(leftValue, rightValue);
  }

  if (key === "status" || key === "priority") {
    const comparison = Number(leftValue) - Number(rightValue);
    return direction === "asc" ? comparison : -comparison;
  }

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
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
    </span>
  );
}

function PriorityPill({ value }) {
  const tone = getPriorityTone(value);

  return (
    <span className={`ticket-pill priority-pill priority-${tone}`}>
      {getTicketPriorityLabel(value)}
    </span>
  );
}

function ModalShell({
  open,
  title,
  subtitle,
  headerActions,
  onClose,
  children,
  footer,
  className = "",
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
      }}
    >
      <div
        className={`ticket-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ticket-modal-head">
          <div className="ticket-modal-heading">
            <span className="ticket-eyebrow">Employee portal</span>
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
              aria-label="Close dialog"
            >
              <FaTimes aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="ticket-modal-body">{children}</div>

        {footer ? <div className="ticket-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

function TicketWorkModal({ open, ticketId, mode = "view", onClose, onSaved }) {
  const remarksRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [remarksText, setRemarksText] = useState("");

  useEffect(() => {
    if (!open || !ticketId) {
      setLoading(false);
      setSaving(false);
      setTicket(null);
      setRemarksText("");
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
          setRemarksText("");
        }
      } catch (error) {
        console.error("Unable to load ticket details:", error);
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
  }, [open, ticketId]);

  useEffect(() => {
    if (open && mode === "remarks" && !loading) {
      remarksRef.current?.focus();
    }
  }, [loading, mode, open]);

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
        "",
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
          "",
      };
    });
  }, [ticket]);

  const timelineItems = useMemo(() => {
    if (!ticket) {
      return [];
    }

    const rawTimeline = Array.isArray(ticket.raw?.timeline)
      ? ticket.raw.timeline
      : Array.isArray(ticket.raw?.Timeline)
        ? ticket.raw.Timeline
        : [];

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
          "",
      }));
    }

    return [
      {
        label: "Created",
        detail: ticket.createdBy || "Ticket submitted",
        date: ticket.createdDate,
      },
      {
        label: "Updated",
        detail: ticket.status || "Latest status change",
        date: ticket.updatedDate,
      },
      {
        label: getTicketStatusLabel(ticket.status),
        detail: "Current ticket state",
        date: ticket.updatedDate || ticket.createdDate,
      },
    ];
  }, [ticket]);

  const handleSaveRemarks = async () => {
    if (!ticket) {
      return;
    }

    const nextRemarks = String(remarksText || "").trim();

    if (!nextRemarks) {
      toast.error("Add a remark before saving.");
      return;
    }

    try {
      setSaving(true);

      const combinedNotes = [ticket.notes, nextRemarks].filter(Boolean).join("\n\n");

      const payload = buildTicketPayload(
        {
          title: ticket.title || "",
          description: ticket.description || "",
          category: ticket.category || "",
          priority: ticket.priority || "Medium",
          assignedToEmployee: ticket.assignedTo || ticket.createdBy || "",
          assignedToEmployeeId: ticket.assignedToId || ticket.createdById || "",
          dueDate: ticket.dueDate || "",
          notes: combinedNotes,
          attachmentFile: null,
          status: ticket.status || "Open",
        },
        {
          status: ticket.status || "Open",
        }
      );

      await updateTicket(ticket.ticketId, payload);
      toast.success("Remarks saved.");
      await onSaved?.();
      onClose?.();
    } catch (error) {
      console.error("Unable to save remarks:", error);
      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to save remarks right now."
      );
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const body = loading ? (
    <div className="ticket-modal-loading">
      <FaSpinner className="ticket-button-spinner" />
      Loading ticket details...
    </div>
  ) : ticket ? (
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
            <h3>Notes and Remarks</h3>
          </div>

          {ticket.notes ? (
            <div className="ticket-description-block ticket-remarks-block">
              <p>{ticket.notes}</p>
            </div>
          ) : (
            <EmptyState
              className="ticket-empty-state compact"
              message="No remarks have been added yet."
            />
          )}

          {commentItems.length > 0 ? (
            <div className="ticket-comment-list">
              {commentItems.map((comment) => (
                <div className="ticket-comment-card" key={comment.key}>
                  <strong>{comment.author}</strong>
                  <span>{formatDateTime(comment.date)}</span>
                  <p>{comment.message || "No comment text provided."}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {mode === "remarks" ? (
          <div className="ticket-details-section">
            <div className="ticket-section-heading">
              <h3>Add Remarks</h3>
            </div>

            <textarea
              ref={remarksRef}
              className="ticket-remarks-textarea"
              value={remarksText}
              onChange={(event) => setRemarksText(event.target.value)}
              placeholder="Write a note about the work, blockers, or completion details."
              rows={6}
            />
          </div>
        ) : null}

        <div className="ticket-details-section">
          <div className="ticket-section-heading">
            <h3>Attachments</h3>
          </div>

          {attachmentItems.length === 0 ? (
            <EmptyState
              className="ticket-empty-state compact"
              message="No attachments were included with this ticket."
            />
          ) : (
            <div className="ticket-attachment-list">
              {attachmentItems.map((attachment) => (
                <a
                  className="ticket-attachment-item ticket-attachment-link"
                  href={attachment.url || "#"}
                  target={attachment.url ? "_blank" : undefined}
                  rel="noreferrer"
                  key={attachment.key}
                >
                  <span>{attachment.label}</span>
                  <small>{attachment.size || "File"}</small>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ticket-details-aside">
        <div className="ticket-surface ticket-details-panel">
          <h3>Ticket Info</h3>
          <div className="ticket-info-list">
            <div>
              <span>Assigned By</span>
              <strong>{ticket.assignedBy || ticket.createdBy || "-"}</strong>
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
            {timelineItems.map((item, index) => (
              <div className="ticket-timeline-item" key={`${item.label}-${index}`}>
                <div className="ticket-timeline-dot" />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail || "-"}</span>
                  <small>{formatDateTime(item.date)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <EmptyState
      className="ticket-empty-state compact"
      message="Ticket details are unavailable."
    />
  );

  return (
    <ModalShell
      open={open}
      title={mode === "remarks" ? "Ticket Remarks" : "Ticket Details"}
      subtitle={ticket?.title || "Review the ticket and work updates."}
      headerActions={
        mode === "remarks" ? (
          <span className="ticket-modal-badge">Add remarks</span>
        ) : (
          <span className="ticket-modal-badge">View only</span>
        )
      }
      onClose={onClose}
      className="ticket-modal-wide ticket-details-modal"
      footer={
        <>
          <button type="button" className="ticket-button secondary" onClick={onClose}>
            Close
          </button>
          {mode === "remarks" ? (
            <button
              type="button"
              className="ticket-button primary"
              onClick={handleSaveRemarks}
              disabled={saving || !String(remarksText || "").trim()}
            >
              {saving ? (
                <>
                  <FaSpinner className="ticket-button-spinner" />
                  Saving...
                </>
              ) : (
                "Save Remarks"
              )}
            </button>
          ) : null}
        </>
      }
    >
      {body}
    </ModalShell>
  );
}

function MyTicketsPage() {
  const { themeMode } = useTheme();
  const isDarkTheme = themeMode !== "light";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionTicketId, setActionTicketId] = useState("");
  const [workState, setWorkState] = useState({
    open: false,
    ticketId: "",
    mode: "view",
  });

  const deferredSearch = useDeferredValue(search);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await fetchMyTickets();
      setTickets(data);
    } catch (error) {
      console.error("Failed to load my tickets:", error);
      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to load your tickets right now."
      );
      toast.error(errorMessage);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortConfig.key, sortConfig.direction]);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch || getTicketSearchText(ticket).includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "All" || normalizeTicketStatus(ticket.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, deferredSearch, statusFilter]);

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
      { label: "Completed", value: completed, tone: "resolved" },
    ];
  }, [filteredTickets]);

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === "asc"
            ? "desc"
            : "asc"
          : getDefaultSortDirection(key),
    }));
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
      await loadTickets();
    } catch (error) {
      console.error("Status update failed:", error);
      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to update the ticket status right now."
      );
      toast.error(errorMessage);
    } finally {
      setActionTicketId("");
    }
  };

  const handleQuickComplete = (ticket) =>
    handleStatusUpdate(ticket, "Completed");

  const loadingView = loading ? (
    <div className="ticket-page">
      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme={isDarkTheme ? "dark" : "light"}
      />
      <TableSkeleton rows={8} columns={TABLE_COLUMNS.length} />
    </div>
  ) : null;

  if (loadingView) {
    return loadingView;
  }

  return (
    <div className="ticket-page ticket-user-page">
      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme={isDarkTheme ? "dark" : "light"}
      />

      <div className="ticket-hero">
        <div className="ticket-hero-copy">
          <span className="ticket-eyebrow">Employee portal</span>
          <h2>My Tickets</h2>
          <p>
            Track the tickets assigned to you, update status as work progresses,
            and add work notes without leaving the page.
          </p>
        </div>
      </div>

      <div className="ticket-metric-grid">
        {summaryCards.map((card) => (
          <div className={`ticket-metric-card tone-${card.tone}`} key={card.label}>
            <div>
              <span className="ticket-metric-label">{card.label}</span>
              <strong className="ticket-metric-value">{card.value}</strong>
            </div>
            <FaTicketAlt aria-hidden="true" />
          </div>
        ))}
      </div>

      <div className="ticket-toolbar">
        <div className="ticket-search-group">
          <FaSearch aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ticket ID, title, or assigned by"
          />
        </div>

        <div className="ticket-filter-chip">
          <FaFilter aria-hidden="true" />
          <span>Filters</span>
        </div>

        <div className="ticket-filter-row">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ticket-table-card ticket-user-table-card">
        <div className="ticket-table-scroll">
          <table className="ticket-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      width: column.width,
                      minWidth: column.width,
                      maxWidth: column.width,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} className="ticket-empty-cell">
                    <EmptyState
                      className="ticket-empty-state"
                      message="No tickets match the current filters."
                    />
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => {
                  const isUpdating = actionTicketId === ticket.ticketId;
                  const currentStatus = normalizeTicketStatus(ticket.status);
                  const rowStatusOptions = getTicketStatusOptions("user");
                  const statusSelectOptions = rowStatusOptions.includes(currentStatus)
                    ? rowStatusOptions
                    : [currentStatus, ...rowStatusOptions];

                  return (
                    <tr key={ticket.ticketId}>
                      <td>{ticket.ticketId || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="ticket-inline-link"
                          onClick={() =>
                            setWorkState({
                              open: true,
                              ticketId: ticket.ticketId,
                              mode: "view",
                            })
                          }
                          title="View ticket"
                        >
                          {ticket.title || "-"}
                        </button>
                      </td>
                      <td
                        className="ticket-description-cell"
                        title={ticket.description || ""}
                      >
                        {ticket.description || "-"}
                      </td>
                      <td>{ticket.category || "-"}</td>
                      <td>
                        <PriorityPill value={ticket.priority} />
                      </td>
                      <td>
                        <StatusPill value={ticket.status} />
                      </td>
                      <td>{ticket.assignedBy || ticket.createdBy || "-"}</td>
                      <td>{formatDate(ticket.createdDate)}</td>
                      <td>{formatDate(ticket.dueDate)}</td>
                      <td>
                        <div className="ticket-row-actions">
                          <button
                            type="button"
                            className="ticket-action-button view"
                            onClick={() =>
                              setWorkState({
                                open: true,
                                ticketId: ticket.ticketId,
                                mode: "view",
                              })
                            }
                            title="View ticket"
                          >
                            <FaEye aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            className="ticket-action-button remarks"
                            onClick={() =>
                              setWorkState({
                                open: true,
                                ticketId: ticket.ticketId,
                                mode: "remarks",
                              })
                            }
                            title="Add remarks"
                          >
                            <FaPen aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            className="ticket-action-button complete"
                            onClick={() => handleQuickComplete(ticket)}
                            title="Mark work as completed"
                            disabled={isUpdating || currentStatus === "Completed"}
                          >
                            <FaCheck aria-hidden="true" />
                          </button>

                          <select
                            className="ticket-status-select"
                            value={currentStatus}
                            disabled={isUpdating}
                            onChange={(event) =>
                              handleStatusUpdate(ticket, event.target.value)
                            }
                          >
                            {statusSelectOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>

                          {isUpdating ? (
                            <FaSpinner
                              className="ticket-row-spinner"
                              aria-hidden="true"
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
        className="ticket-pagination"
      />

      <TicketWorkModal
        open={workState.open}
        ticketId={workState.ticketId}
        mode={workState.mode}
        onClose={() =>
          setWorkState({
            open: false,
            ticketId: "",
            mode: "view",
          })
        }
        onSaved={loadTickets}
      />
    </div>
  );
}

export default MyTicketsPage;
