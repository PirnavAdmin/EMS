import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaDownload,
  FaEdit,
  FaPaperclip,
  FaSpinner,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import { toast } from "../components/common/Toast/toastService";

import "./TicketManagement.css";
import EmptyState from "../components/EmptyState";
import { PageSkeleton } from "../components/Skeletons";
import { buildServerUrl } from "../api/endpoints";
import { formatDate, formatDateTime } from "../utils/date";
import {
  canDeleteTicket,
  canEditTicket,
  getStatusTone,
  getTicketPriorityLabel,
  getTicketStatusLabel,
  getTicketStatusOptions,
  normalizeTicketStatus,
} from "./ticketConfig";
import {
  deleteTicket,
  fetchTicketById,
  getTicketApiErrorMessage,
  updateTicketStatus,
} from "../services/ticketService";
import { getStoredRole } from "../utils/authStorage";
import { isAdmin } from "../utils/authorization";

function TicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const role = getStoredRole();
  const isAdminUser = isAdmin();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ticket, setTicket] = useState(null);

  const basePath = location.pathname.startsWith("/employee/")
    ? "/employee/my-tickets"
    : "/admin/tickets";

  const loadTicket = useCallback(async () => {
    if (!ticketId) {
      console.error("Ticket Id is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const record = await fetchTicketById(ticketId);

      setTicket(record);
    } catch (error) {
      console.error(error);

      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to load ticket details."
      );

      toast.error(errorMessage);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) {
      setLoading(false);
      return;
    }

    loadTicket();
  }, [loadTicket, ticketId]);

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

  const canEdit = canEditTicket(role, ticket?.status);
  const canDelete = canDeleteTicket(role, ticket?.status);

  const handleStatusChange = async (value) => {
    if (!ticket) {
      return;
    }

    const nextStatus = normalizeTicketStatus(value);

    if (nextStatus === ticket.status) {
      return;
    }

    try {
      setSaving(true);
      await updateTicketStatus(ticket.ticketId, nextStatus);
      toast.success("Ticket status updated.");
      await loadTicket();
    } catch (error) {
      console.error("Status update failed:", error);
      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to update the ticket status right now."
      );
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket) {
      return;
    }

    try {
      setSaving(true);
      await deleteTicket(ticket.ticketId);
      toast.success("Ticket deleted successfully.");
      navigate(basePath, { replace: true });
    } catch (error) {
      console.error("Delete failed:", error);
      const errorMessage = await getTicketApiErrorMessage(
        error,
        "Unable to delete the ticket right now."
      );
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="ticket-page">
        <PageSkeleton variant="dashboard" cardCount={3} tableRows={0} />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="ticket-page">
        <EmptyState
          className="ticket-empty-state"
          message="Ticket details are unavailable."
        />
      </div>
    );
  }

  return (
    <div className="ticket-page ticket-details-page">
      <div className="ticket-hero">
        <div className="ticket-hero-copy">
          <span className="ticket-eyebrow">
            {basePath === "/admin/tickets" ? "Admin portal" : "Employee portal"}
          </span>
          <h2>{ticket.title || "Ticket Details"}</h2>
          <p>
            {ticket.ticketId || "-"} -{" "}
            {ticket.status || "Open"} ticket overview, timeline, comments, and attachments.
          </p>
        </div>

        <div className="ticket-hero-actions">
          <button
            type="button"
            className="ticket-button secondary"
            onClick={() => navigate(basePath)}
          >
            <FaArrowLeft aria-hidden="true" />
            Back
          </button>

          {canEdit ? (
            <button
              type="button"
              className="ticket-button secondary"
              onClick={() =>
                navigate(
                  basePath === "/employee/my-tickets"
                    ? `/employee/my-tickets/edit/${ticket.ticketId}`
                    : `/admin/tickets/edit/${ticket.ticketId}`
                )
              }
            >
              <FaEdit aria-hidden="true" />
              Edit
            </button>
          ) : null}

          {canDelete ? (
            <button
              type="button"
              className="ticket-button danger"
              onClick={() => setDeleteOpen(true)}
            >
              <FaTrash aria-hidden="true" />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="ticket-details-grid">
        <div className="ticket-surface ticket-details-main">
          <div className="ticket-details-section">
            <div className="ticket-section-heading">
              <h3>Overview</h3>
              <StatusPicker
                ticket={ticket}
                canUpdate={Boolean(role)}
                onChange={handleStatusChange}
                disabled={saving}
                role={isAdminUser ? "admin" : "user"}
              />
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
              <FaPaperclip aria-hidden="true" />
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
                    {attachment.url ? <FaDownload aria-hidden="true" /> : null}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="ticket-details-section">
            <div className="ticket-section-heading">
              <h3>Comments</h3>
              <FaUser aria-hidden="true" />
            </div>

            {commentItems.length === 0 ? (
              <EmptyState
                className="ticket-empty-state compact"
                message="No comments are available for this ticket."
              />
            ) : (
              <div className="ticket-comment-list">
                {commentItems.map((comment) => (
                  <div className="ticket-comment-card" key={comment.key}>
                    <strong>{comment.author}</strong>
                    <span>{formatDateTime(comment.date)}</span>
                    <p>{comment.message || "No comment text provided."}</p>
                  </div>
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
      </div>

      {deleteOpen ? (
        <div className="delete-overlay ticket-delete-overlay" role="presentation">
          <div className="ticket-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="ticket-details-delete-title">
            <div className="ticket-delete-icon">
              <FaTrash aria-hidden="true" />
            </div>
            <h3 id="ticket-details-delete-title">Delete Ticket</h3>
            <p>
              Confirm deletion of ticket <strong>{ticket.ticketId || "-"}</strong>.
            </p>
            <div className="ticket-delete-actions">
              <button
                type="button"
                className="ticket-button secondary"
                onClick={() => setDeleteOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ticket-button danger"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <FaSpinner className="ticket-button-spinner" />
                    Deleting...
                  </>
                ) : (
                  "Delete Ticket"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusPicker({ ticket, onChange, disabled, role }) {
  const options = getTicketStatusOptions(role === "admin" ? "admin" : "user");
  const currentStatus = normalizeTicketStatus(ticket.status);
  const selectOptions = options.includes(currentStatus)
    ? options
    : [currentStatus, ...options];

  return (
    <select
      className="ticket-status-select details"
      disabled={disabled}
      value={currentStatus}
      onChange={(event) => onChange(event.target.value)}
    >
      {selectOptions.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

export default TicketDetails;
