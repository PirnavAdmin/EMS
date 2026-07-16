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
  buildOfficeViewerUrl,
  getDocumentFileName,
  getDocumentMimeType,
  getDocumentPreviewKind,
  isSafeWebUrl,
  normalizeDocumentMimeType,
  resolveDocumentMimeType,
} from "./documentPreview";

const PREVIEW_UNAVAILABLE_MESSAGE = "Document preview unavailable.";

const createPreviewState = (overrides = {}) => ({
  status: "idle",
  previewUrl: "",
  error: "",
  sourceUrl: "",
  objectUrl: "",
  previewKind: "unknown",
  previewMimeType: "",
  officeViewerUrl: "",
  blob: null,
  contentType: "",
  contentLength: 0,
  ...overrides,
});

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
  if (kind === "docx" || kind === "doc") return FaFileWord;
  return FaFileAlt;
};

const openWindow = (url) => {
  if (!isSafeWebUrl(url)) return;

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

  const initialPreviewKind = useMemo(
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

    const sourceUrl =
      document?.fileUrl ||
      document?.downloadUrl ||
      document?.url ||
      document?.fileURL ||
      "";
    const safeSourceUrl = isSafeWebUrl(sourceUrl) ? sourceUrl : "";

    if (!safeSourceUrl && !(document?.blob instanceof Blob)) {
      setState(
        createPreviewState({
          status: document?.errorMessage ? "error" : "empty",
          error: document?.errorMessage || PREVIEW_UNAVAILABLE_MESSAGE,
        })
      );
      return undefined;
    }

    let active = true;
    let objectUrl = "";

    const loadPreview = async () => {
      try {
        setState(
          createPreviewState({
            status: "loading",
            sourceUrl: safeSourceUrl,
          })
        );

        let previewBlob = document?.blob instanceof Blob ? document.blob : null;
        let responseContentType = "";
        let responseContentLength = 0;

        if (!previewBlob && safeSourceUrl) {
          const response = await fetch(safeSourceUrl, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Unable to load document preview.");
          }

          responseContentType = response.headers.get("content-type") || "";
          responseContentLength =
            Number(response.headers.get("content-length")) || 0;
          previewBlob = await response.blob();
        }

        if (!previewBlob) {
          throw new Error("Preview source not available");
        }

        const fileName = getDocumentFileName(document);
        const headerMimeType = normalizeDocumentMimeType(
          responseContentType,
          fileName
        );
        const documentMimeType = getDocumentMimeType(document);
        const resolvedMimeType = await resolveDocumentMimeType({
          blob: previewBlob,
          fileName,
          headerMimeType,
          documentMimeType,
        });

        const resolvedKind = getDocumentPreviewKind({
          ...document,
          fileName,
          fileType: resolvedMimeType,
          mimeType: resolvedMimeType,
          contentType: resolvedMimeType,
          fileMimeType: resolvedMimeType,
          blob: previewBlob,
        });

        const blobSize = previewBlob.size || 0;
        const blobType = previewBlob.type || resolvedMimeType || "";

        console.info("[DocumentPreview] Loaded preview source", {
          fileName,
          contentType: resolvedMimeType || responseContentType || "",
          contentLength: responseContentLength || blobSize,
          blobSize,
          blobType,
          previewKind: resolvedKind,
        });

        if (!active) {
          return;
        }

        if (resolvedKind === "pdf" || resolvedKind === "image") {
          objectUrl = window.URL.createObjectURL(previewBlob);
          console.info("[DocumentPreview] Object URL", objectUrl);

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
              previewKind: resolvedKind,
              previewMimeType: resolvedMimeType || blobType,
              blob: previewBlob,
              contentType: resolvedMimeType || responseContentType || blobType,
              contentLength: responseContentLength || blobSize,
            })
          );
          return;
        }

        if (resolvedKind === "docx" || resolvedKind === "doc") {
          const officeViewerUrl = buildOfficeViewerUrl(sourceUrl);

          console.info("[DocumentPreview] Word document detected", {
            officeViewerUrl: officeViewerUrl || "",
            previewKind: resolvedKind,
            contentType: resolvedMimeType || responseContentType || blobType,
            contentLength: responseContentLength || blobSize,
            blobSize,
            blobType,
          });

          setState(
            createPreviewState({
              status: "ready",
              sourceUrl,
              previewKind: resolvedKind,
              previewMimeType: resolvedMimeType || blobType,
              officeViewerUrl,
              blob: previewBlob,
              contentType: resolvedMimeType || responseContentType || blobType,
              contentLength: responseContentLength || blobSize,
            })
          );
          return;
        }

        setState(
          createPreviewState({
            status: "ready",
            sourceUrl,
            previewKind: resolvedKind,
            previewMimeType: resolvedMimeType || blobType,
            blob: previewBlob,
            contentType: resolvedMimeType || responseContentType || blobType,
            contentLength: responseContentLength || blobSize,
          })
        );
      } catch (error) {
        if (!active) {
          return;
        }

        const fallbackMimeType = getDocumentMimeType(document);

        if (
          safeSourceUrl &&
          (initialPreviewKind === "pdf" || initialPreviewKind === "image")
        ) {
          setState(
            createPreviewState({
              status: "ready",
              previewUrl: safeSourceUrl,
              sourceUrl: safeSourceUrl,
              previewKind: initialPreviewKind,
              previewMimeType: fallbackMimeType,
              contentType: fallbackMimeType,
              contentLength: Number(document?.size || document?.fileSize || 0) || 0,
              blob: document?.blob instanceof Blob ? document.blob : null,
            })
          );
          return;
        }

        if (safeSourceUrl && (initialPreviewKind === "docx" || initialPreviewKind === "doc")) {
          const officeViewerUrl = buildOfficeViewerUrl(safeSourceUrl);

          setState(
            createPreviewState({
              status: "ready",
              sourceUrl: safeSourceUrl,
              previewKind: initialPreviewKind,
              previewMimeType: fallbackMimeType,
              officeViewerUrl,
              contentType: fallbackMimeType,
              contentLength: Number(document?.size || document?.fileSize || 0) || 0,
              blob: document?.blob instanceof Blob ? document.blob : null,
            })
          );
          return;
        }

        setState(
          createPreviewState({
            status: "error",
            error: error?.message || document?.errorMessage || PREVIEW_UNAVAILABLE_MESSAGE,
            sourceUrl: safeSourceUrl,
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
  }, [document, hasDocument, open, initialPreviewKind]);

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

  const previewKind =
    state.previewKind !== "unknown"
      ? state.previewKind
      : initialPreviewKind;
  const PreviewIcon = hasDocument ? getPreviewIcon(previewKind) : FaFileAlt;
  const fileName = hasDocument
    ? getDocumentFileName(document)
    : PREVIEW_UNAVAILABLE_MESSAGE;
  const fileType = hasDocument
    ? String(
        state.previewMimeType ||
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
  const safeSourceUrl = isSafeWebUrl(sourceUrl) ? sourceUrl : "";
  const canOpenSource = hasDocument && Boolean(safeSourceUrl);
  const canOpenOfficeViewer =
    hasDocument && Boolean(state.officeViewerUrl);
  const canDownload =
    hasDocument &&
    (state.blob instanceof Blob ||
      document?.blob instanceof Blob ||
      Boolean(safeSourceUrl));

  const handleDownload = () => {
    const blob = state.blob instanceof Blob
      ? state.blob
      : document?.blob instanceof Blob
        ? document.blob
        : null;

    if (blob) {
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = fileName || "document";

      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);

      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      return;
    }

    if (safeSourceUrl) {
      const anchor = window.document.createElement("a");

      anchor.href = safeSourceUrl;
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
              <p>{state.error || document?.errorMessage || PREVIEW_UNAVAILABLE_MESSAGE}</p>
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

          {state.status === "ready" &&
            (previewKind === "docx" || previewKind === "doc") && (
            <div className="document-preview-docx">
              <strong>Word document detected</strong>
              <p>
                This file cannot be rendered in the PDF viewer. Open it in
                Microsoft Office Online or download it instead.
              </p>
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

          {canOpenOfficeViewer && (
            <button
              type="button"
              className="document-preview-secondary-btn"
              onClick={() => openWindow(state.officeViewerUrl)}
            >
              <FaExternalLinkAlt aria-hidden="true" />
              Open in Office Viewer
            </button>
          )}

          {canOpenSource && !canOpenOfficeViewer && (
            <button
              type="button"
              className="document-preview-secondary-btn"
              onClick={() => openWindow(safeSourceUrl)}
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
