import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCloudUploadAlt,
  FaDownload,
  FaFileExcel,
  FaSpinner,
} from "react-icons/fa";
import { toast } from "../components/common/Toast/toastService";

import "./TicketManagement.css";
import { buildServerUrl } from "../api/endpoints";
import EmptyState from "../components/EmptyState";
import {
  downloadTicketTemplate,
  getTicketApiErrorMessage,
  uploadTicketBulkFile,
} from "../services/ticketService";

const ACCEPTED_EXTENSIONS = [".xls", ".xlsx"];

const isExcelFile = (file) => {
  if (!file) {
    return false;
  }

  const name = String(file.name || "").toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
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
  skipped: Number(payload.skippedCount ?? payload.ignoredCount ?? 0),
});

function BulkUploadTickets() {
  const navigate = useNavigate();
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
      { label: "Skipped", value: summary?.skipped ?? 0, tone: "progress" },
    ],
    [summary]
  );

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
      console.error("Template download failed:", error);
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


    try {
      setUploading(true);
      setSummary(null);
      setErrorFileUrl("");

      const response = await uploadTicketBulkFile(formData);
      const data = response?.data?.data || response?.data || {};
      console.log("Parsed Data:", data);

      console.log("Total:", data.totalRecords);
      console.log("Success:", data.successCount);
      console.log("Failed:", data.failedCount);
      console.log("Errors:", data.errors);

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
    } catch (error) {
      console.error("Bulk upload failed:", error);
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
    <div className="ticket-page ticket-upload-page">
      <div className="ticket-hero">
        <div className="ticket-hero-copy">
          <span className="ticket-eyebrow">Admin portal</span>
          <h2>Bulk Upload Tickets</h2>
          <p>
            Download the template, fill in the rows, and upload the completed file
            to create multiple tickets at once.
          </p>
        </div>

        <div className="ticket-hero-actions">
          <button
            type="button"
            className="ticket-button secondary"
            onClick={() => navigate("/admin/tickets")}
            disabled={uploading}
          >
            Back to Tickets
          </button>

          <button
            type="button"
            className="ticket-button secondary"
            onClick={handleTemplateDownload}
            disabled={uploading}
          >
            <FaDownload aria-hidden="true" />
            Download Template
          </button>
        </div>
      </div>

      <div className="ticket-surface ticket-upload-surface">
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
          onDrop={handleDrop}
        >
          <div className="ticket-dropzone-icon">
            <FaCloudUploadAlt aria-hidden="true" />
          </div>

          <h3>Drag and drop your Excel file here</h3>
          <p>Supported formats: .xls and .xlsx</p>

          <label className="ticket-button primary" htmlFor="ticket-bulk-file">
            <FaFileExcel aria-hidden="true" />
            Choose File
          </label>

          <input
            ref={fileInputRef}
            id="ticket-bulk-file"
            type="file"
            accept=".xls,.xlsx"
            onChange={handleInputChange}
          />
        </div>

        {selectedFile ? (
          <div className="ticket-upload-selected">
            <div>
              <strong>{selectedFile.name}</strong>
              <span>{Math.round(selectedFile.size / 1024)} KB</span>
            </div>

            <button
              type="button"
              className="ticket-button ghost"
              onClick={clearFile}
              disabled={uploading}
            >
              Remove File
            </button>
          </div>
        ) : null}

        <div className="ticket-form-footer">
          <button
            type="button"
            className="ticket-button secondary"
            onClick={clearFile}
            disabled={uploading}
          >
            Reset
          </button>

          <button
            type="button"
            className="ticket-button primary"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? (
              <>
                <FaSpinner className="ticket-button-spinner" />
                Uploading...
              </>
            ) : (
              <>
                <FaCloudUploadAlt aria-hidden="true" />
                Upload Tickets
              </>
            )}
          </button>
        </div>

        {summary ? (
          <div className="ticket-upload-summary">
            {summaryCards.map((card) => (
              <div className={`ticket-metric-card tone-${card.tone}`} key={card.label}>
                <div>
                  <span className="ticket-metric-label">{card.label}</span>
                  <strong className="ticket-metric-value">{card.value}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="ticket-empty-state compact"
            message="Upload a completed template to see the summary here."
          />
        )}

        {errorFileUrl ? (
          <div className="ticket-error-download">
            <strong>Failed rows file available</strong>
            <a href={errorFileUrl} target="_blank" rel="noreferrer" className="ticket-button secondary">
              <FaDownload aria-hidden="true" />
              Download Error File
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default BulkUploadTickets;
