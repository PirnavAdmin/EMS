import React, { useEffect, useRef, useState } from "react";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaDownload,
  FaExclamationTriangle,
  FaFileAlt,
  FaSpinner,
  FaTimes } from
"react-icons/fa";
import "./BulkUploadModal.css";

import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

const EXCEL_MIME_TYPE =
"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls"];

const isExcelFile = (file) => {
  if (!file) {
    return false;
  }

  const fileName = String(file.name || "").toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => fileName.endsWith(extension));
};

const formatFileSize = (size = 0) => {
  if (!Number.isFinite(size) || size <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

function BulkUploadModal({
  open,
  onClose,
  onUploaded
}) {
  const fileInputRef = useRef(null);
  const uploadLockRef = useRef(false);
  const templateDownloadLockRef = useRef(false);
  const dragDepthRef = useRef(0);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusType, setStatusType] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    setDragActive(false);
    setUploading(false);
    setUploadProgress(0);
    setStatusType("idle");
    setStatusMessage("");
    setIsTemplateDownloading(false);
    uploadLockRef.current = false;
    dragDepthRef.current = 0;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    resetState();
  }, [open]);

  if (!open) {
    return null;
  }

  const setValidationError = (message) => {
    setStatusType("error");
    setStatusMessage(message);
  };

  const handleFile = (file) => {
    if (!file) {
      return;
    }

    if (!isExcelFile(file)) {
      setSelectedFile(null);
      setValidationError("Please upload a valid Excel file (.xlsx or .xls).");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedFile(file);
    setStatusType("idle");
    setStatusMessage("");
    setUploadProgress(0);
  };

  const handleInputChange = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const closeModal = () => {
    if (uploading) {
      return;
    }

    onClose?.();
  };

  const handleUpload = async () => {
    if (uploadLockRef.current || uploading) {
      return;
    }

    if (!selectedFile) {
      setValidationError("Choose an Excel file before uploading.");
      return;
    }

    uploadLockRef.current = true;
    setUploading(true);
    setStatusType("idle");
    setStatusMessage("");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.post(
        API_ENDPOINTS.employees.bulkUpload,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || progressEvent.loaded || 0;
            const loaded = progressEvent.loaded || 0;

            if (!total) {
              return;
            }

            const nextProgress = Math.min(
              99,
              Math.round(loaded / total * 100)
            );

            setUploadProgress(nextProgress);
          }
        }
      );

      const refreshResult = await onUploaded?.(response.data || {});

      setUploadProgress(100);

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (refreshResult === false) {
        setStatusType("error");
        setStatusMessage(
          "Upload completed, but the employee list could not be refreshed."
        );
      } else {
        setStatusType("success");
        setStatusMessage(
          response?.data?.message ||
          "Employees uploaded successfully. The employee list has been refreshed."
        );
      }
    } catch (error) {
      const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      "Employee bulk upload failed.";

      setStatusType("error");
      setStatusMessage(String(message));
      setUploadProgress(0);
    } finally {
      setUploading(false);
      uploadLockRef.current = false;
    }
  };

  const handleDownloadTemplate = async () => {
    if (templateDownloadLockRef.current || isTemplateDownloading) {
      return;
    }

    templateDownloadLockRef.current = true;
    setIsTemplateDownloading(true);

    try {
      const response = await api.get(
        API_ENDPOINTS.employees.downloadEmployeeTemplate,
        {
          responseType: "blob"
        }
      );

      const blob = new Blob([response.data], {
        type: EXCEL_MIME_TYPE
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "employee-bulk-upload-template.xlsx";

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatusType("success");
      setStatusMessage("Employee template downloaded successfully.");
    } catch (error) {

      setStatusType("error");
      setStatusMessage("Failed to download employee template.");
    } finally {
      setIsTemplateDownloading(false);
      templateDownloadLockRef.current = false;
    }
  };

  return (
    <div
      className="bulk-upload-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}>
      
      <div className="bulk-upload-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-upload-title">
        <div className="bulk-upload-header">
          <div>
            <h3 id="bulk-upload-title">Bulk Upload Employees</h3>
            <p>
              Upload a single Excel file to add or update employees in one
              enterprise-ready flow.
            </p>
          </div>

          <button
            type="button"
            className="bulk-upload-close"
            onClick={closeModal}
            disabled={uploading}
            aria-label="Close bulk upload modal">
            
            <FaTimes />
          </button>
        </div>

        <div className="bulk-upload-template-actions">
          <button
            type="button"
            className="bulk-upload-primary bulk-upload-template-btn"
            onClick={handleDownloadTemplate}
            disabled={isTemplateDownloading}>
            
            {isTemplateDownloading ?
            <>
                <FaSpinner className="bulk-upload-spinner" aria-hidden="true" />
                Downloading...
              </> :

            <>
                <FaDownload aria-hidden="true" />
                Download Template
              </>
            }
          </button>
        </div>

        {statusMessage &&
        <div className={`bulk-upload-feedback ${statusType}`}>
            {statusType === "success" ?
          <FaCheckCircle aria-hidden="true" /> :
          statusType === "error" ?
          <FaExclamationTriangle aria-hidden="true" /> :

          <FaFileAlt aria-hidden="true" />
          }
            <span>{statusMessage}</span>
          </div>
        }

        <div
          className={`bulk-upload-dropzone ${dragActive ? "is-active" : ""} ${
          selectedFile ? "has-file" : ""}`
          }
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="bulk-upload-input"
            onChange={handleInputChange}
            disabled={uploading} />
          

          <div className="bulk-upload-icon">
            <FaCloudUploadAlt aria-hidden="true" />
          </div>

          <div className="bulk-upload-copy">
            <strong>Drag and drop your Excel file here</strong>
            <span>Only `.xlsx` and `.xls` files are accepted.</span>
          </div>

          <button
            type="button"
            className="bulk-upload-choose-btn"
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={uploading}>
            
            Choose File
          </button>
        </div>

        <div className="bulk-upload-meta">
          <span>Supported formats: .xlsx, .xls</span>
          <span>Secure upload with immediate table refresh</span>
        </div>

        <div className="bulk-upload-file-card">
          <div className="bulk-upload-file-copy">
            <FaFileAlt aria-hidden="true" />
            <div>
              <strong>
                {selectedFile ? selectedFile.name : "No file selected yet"}
              </strong>
              <span>
                {selectedFile ? formatFileSize(selectedFile.size) : "Select an Excel file to continue"}
              </span>
            </div>
          </div>

          <span className="bulk-upload-file-type">
            {selectedFile ? selectedFile.name.split(".").pop().toUpperCase() : "XLSX"}
          </span>
        </div>

        <div className="bulk-upload-progress-shell" aria-live="polite">
          <div className="bulk-upload-progress-label">
            <span>Upload progress</span>
            <strong>{uploading ? `${uploadProgress}%` : statusType === "success" ? "100%" : "0%"}</strong>
          </div>

          <div className="bulk-upload-progress-bar">
            <div
              className="bulk-upload-progress-fill"
              style={{ width: `${uploading ? uploadProgress : statusType === "success" ? 100 : 0}%` }} />
            
          </div>
        </div>

        <div className="bulk-upload-footer">
          <button
            type="button"
            className="bulk-upload-secondary"
            onClick={closeModal}
            disabled={uploading}>
            
            Cancel
          </button>

          <button
            type="button"
            className="bulk-upload-primary"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}>
            
            {uploading ?
            <>
                <FaSpinner className="bulk-upload-spinner" aria-hidden="true" />
                Uploading...
              </> :

            "Upload Employees"
            }
          </button>
        </div>
      </div>
    </div>);

}

export default BulkUploadModal;