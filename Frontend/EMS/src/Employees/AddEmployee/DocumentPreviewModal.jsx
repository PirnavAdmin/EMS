import React, { useEffect, useMemo, useState } from "react";
import {
  FaDownload,
  FaExternalLinkAlt,
  FaFileAlt,
  FaFileImage,
  FaFilePdf,
  FaFileWord,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import { formatDateTime } from "../../utils/date";
import {
  extractDocxText,
  getDocumentPreviewKind,
} from "./documentPreview";

const PREVIEW_UNAVAILABLE_MESSAGE = "Document preview unavailable.";

const createPreviewState = (overrides = {}) => ({
  status: "idle",
  previewUrl: "",
  previewText: "",
  error: "",
  sourceUrl: "",
  objectUrl: "",
  ...overrides,
});

const getDocumentFileName = (document) =>
  String(
    document?.fileName ||
      document?.file_Name ||
      document?.name ||
      document?.originalFileName ||
      document?.originalName ||
      "Document"
  ).trim();

const getDocumentSizeLabel = (document) => {
  const sizeValue = Number(document?.size || document?.fileSize || 0);

  if (!Number.isFinite(sizeValue) || sizeValue <= 0) {
    return "-";
  }

  if (sizeValue < 1024) {
    return `${sizeValue} B`;
  }

  if (sizeValue < 1024 * 1024) {
    return `${(sizeValue / 1024).toFixed(1)} KB`;
  }

  return `${(sizeValue / (1024 * 1024)).toFixed(1)} MB`;
};

const getPreviewIcon = (kind) => {
  if (kind === "pdf") return FaFilePdf;
  if (kind === "image") return FaFileImage;
  if (kind === "docx") return FaFileWord;
  return FaFileAlt;
};

const openWindow = (url) => {
  if (!url) return;

  window.open(url, "_blank", "noopener,noreferrer");
};

function DocumentPreviewModal({ document: selectedDocument, open, onClose }) {
  const hasDocument = Boolean(
    selectedDocument && typeof selectedDocument === "object"
  );
  const document = useMemo(
    () => (hasDocument ? selectedDocument : {}),
    [hasDocument, selectedDocument]
  );
  const [state, setState] = useState(() => createPreviewState());

  const previewKind = useMemo(
    () => (hasDocument ? getDocumentPreviewKind(document) : "unknown"),
    [document, hasDocument]
  );

  useEffect(() => {
    if (!open) {
      setState(createPreviewState());
      return undefined;
    }

    if (!hasDocument) {
      setState(
        createPreviewState({
          status: "empty",
          error: PREVIEW_UNAVAILABLE_MESSAGE,
        })
      );
      return undefined;
    }

    if (previewKind === "unknown") {
      setState(
        createPreviewState({
          status: "empty",
          error: PREVIEW_UNAVAILABLE_MESSAGE,
        })
      );
      return undefined;
    }

    let active = true;
    let objectUrl = "";

    const sourceUrl =
      document?.fileUrl ||
      document?.downloadUrl ||
      document?.url ||
      document?.fileURL ||
      "";

    const loadPreview = async () => {
      try {
        setState(
          createPreviewState({
            status: "loading",
            sourceUrl,
          })
        );

        if (previewKind === "pdf" || previewKind === "image") {
          if (document?.blob instanceof Blob) {
            objectUrl = window.URL.createObjectURL(document.blob);

            if (!active) {
              window.URL.revokeObjectURL(objectUrl);
              return;
            }

            setState(
              createPreviewState({
                status: "ready",
                previewUrl: objectUrl,
                sourceUrl,
                objectUrl,
              })
            );
            return;
          }

          if (sourceUrl) {
            setState(
              createPreviewState({
                status: "ready",
                previewUrl: sourceUrl,
                sourceUrl,
              })
            );
            return;
          }

          throw new Error("Preview source not available");
        }

        if (previewKind === "docx") {
          const docxSource =
            document?.blob instanceof Blob
              ? document.blob
              : sourceUrl
                ? await fetch(sourceUrl, {
                  credentials: "include",
                }).then((response) => {
                  if (!response.ok) {
                    throw new Error("Unable to load DOCX file");
                  }

                  return response.blob();
                })
                : null;

          if (!docxSource) {
            throw new Error("Preview source not available");
          }

          const text = await extractDocxText(docxSource);

          if (!active) {
            return;
          }

          setState(
            createPreviewState({
              status: "ready",
              previewText:
                text || "No text could be extracted from this document.",
              sourceUrl,
            })
          );
          return;
        }

        throw new Error("This document type cannot be previewed.");
      } catch (error) {
        if (!active) {
          return;
        }

        setState(
          createPreviewState({
            status: "error",
            error: error?.message || PREVIEW_UNAVAILABLE_MESSAGE,
            sourceUrl,
          })
        );
      }
    };

    loadPreview();

    return () => {
      active = false;

      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [document, hasDocument, open, previewKind]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const PreviewIcon = hasDocument ? getPreviewIcon(previewKind) : FaFileAlt;
  const fileName = hasDocument
    ? getDocumentFileName(document)
    : PREVIEW_UNAVAILABLE_MESSAGE;
  const fileType = hasDocument
    ? String(
        document?.fileType ||
          document?.mimeType ||
          document?.contentType ||
          previewKind ||
          "Document"
      ).trim()
    : PREVIEW_UNAVAILABLE_MESSAGE;
  const uploadedAt = hasDocument
    ? document?.uploadedAt || document?.createdAt || ""
    : "";
  const sourceUrl = hasDocument
    ? state.sourceUrl ||
      document?.fileUrl ||
      document?.downloadUrl ||
      document?.url ||
      document?.fileURL ||
      ""
    : "";
  const canOpenSource = hasDocument && Boolean(sourceUrl);
  const canDownload =
    hasDocument && (Boolean(sourceUrl) || document?.blob instanceof Blob);

  const handleDownload = () => {
    if (document?.blob instanceof Blob) {
      const objectUrl = window.URL.createObjectURL(document.blob);
      const anchor = window.document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = fileName || "document";

      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);

      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      return;
    }

    if (sourceUrl) {
      const anchor = window.document.createElement("a");

      anchor.href = sourceUrl;
      anchor.download = fileName || "document";
      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);
    }
  };

  return (
    <div
      className="document-preview-overlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="document-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Document preview"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="document-preview-header">
          <div className="document-preview-title-group">
            <div className="document-preview-icon">
              <PreviewIcon aria-hidden="true" />
            </div>

            <div className="document-preview-title-copy">
              <h3>{fileName}</h3>
              <p>
                {fileType}
                {uploadedAt ? ` • ${formatDateTime(uploadedAt)}` : ""}
                {document.size ? ` • ${getDocumentSizeLabel(document)}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="document-preview-close"
            onClick={onClose}
            aria-label="Close document preview"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="document-preview-body">
          {!hasDocument && (
            <div className="document-preview-error">
              <strong>{PREVIEW_UNAVAILABLE_MESSAGE}</strong>
              <p>The selected document is not available yet.</p>
            </div>
          )}

          {state.status === "loading" && (
            <div className="document-preview-loading">
              <FaSpinner className="document-preview-spinner" aria-hidden="true" />
              Loading preview...
            </div>
          )}

          {state.status === "empty" && hasDocument && (
            <div className="document-preview-error">
              <strong>{PREVIEW_UNAVAILABLE_MESSAGE}</strong>
              <p>The selected document is not available yet.</p>
            </div>
          )}

          {state.status === "error" && (
            <div className="document-preview-error">
              <strong>Preview unavailable</strong>
              <p>{state.error}</p>
            </div>
          )}

          {state.status === "ready" && previewKind === "pdf" && state.previewUrl && (
            <iframe
              className="document-preview-frame"
              src={state.previewUrl}
              title={fileName}
            />
          )}

          {state.status === "ready" && previewKind === "image" && state.previewUrl && (
            <div className="document-preview-image-shell">
              <img
                className="document-preview-image"
                src={state.previewUrl}
                alt={fileName}
              />
            </div>
          )}

          {state.status === "ready" && previewKind === "docx" && (
            <div className="document-preview-docx">
              <pre>{state.previewText || "No text available."}</pre>
            </div>
          )}

          {state.status === "ready" && previewKind === "unsupported" && (
            <div className="document-preview-error">
              <strong>Unsupported file type</strong>
              <p>
                This file can be downloaded, but it cannot be previewed in the browser.
              </p>
            </div>
          )}
        </div>

        <div className="document-preview-footer">
          <button
            type="button"
            className="document-preview-secondary-btn"
            onClick={onClose}
          >
            Close
          </button>

          {canOpenSource && (
            <button
              type="button"
              className="document-preview-secondary-btn"
              onClick={() => openWindow(sourceUrl)}
            >
              <FaExternalLinkAlt aria-hidden="true" />
              Open Source
            </button>
          )}

          {canDownload && (
            <button
              type="button"
              className="document-preview-primary-btn"
              onClick={handleDownload}
            >
              <FaDownload aria-hidden="true" />
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentPreviewModal;
