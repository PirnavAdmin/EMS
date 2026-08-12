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
  previewDocumentFromUrl,
  previewEmployeeDocument,
} from "../../services/documentPreviewService";
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
const EMPTY_PREVIEW_MESSAGE = "No preview available.";

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

const getDocumentPreviewId = (document = {}) =>
  document?.serverId ||
  document?.id ||
  document?.documentId ||
  document?.employeeDocumentId ||
  document?.employeeDocumentID ||
  document?.fileId ||
  "";

const getDocumentSourceUrl = (document = {}) =>
  String(
    document?.fileUrl ||
      document?.downloadUrl ||
      document?.url ||
      document?.fileURL ||
      ""
  ).trim();

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
  const documentId = useMemo(
    () => getDocumentPreviewId(document),
    [document]
  );
  const sourceUrl = useMemo(
    () => getDocumentSourceUrl(document),
    [document]
  );
  const safeSourceUrl = useMemo(
    () => (isSafeWebUrl(sourceUrl) ? sourceUrl : ""),
    [sourceUrl]
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
          error: EMPTY_PREVIEW_MESSAGE,
        })
      );
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    let objectUrl = "";

    const applyReadyState = async (
      previewBlob,
      previewSourceUrl = "",
      responseContentType = "",
      responseContentLength = 0
    ) => {
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
      const nextSourceUrl = previewSourceUrl || safeSourceUrl || sourceUrl || "";

      if (!active) {
        return;
      }

      if (resolvedKind === "pdf" || resolvedKind === "image") {
        objectUrl = window.URL.createObjectURL(previewBlob);

        if (!active) {
          window.URL.revokeObjectURL(objectUrl);
          return;
        }

        setState(
          createPreviewState({
            status: "ready",
            previewUrl: objectUrl,
            sourceUrl: nextSourceUrl,
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
        const officeViewerUrl = buildOfficeViewerUrl(nextSourceUrl);

        setState(
          createPreviewState({
            status: "ready",
            sourceUrl: nextSourceUrl,
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
          sourceUrl: nextSourceUrl,
          previewKind: resolvedKind,
          previewMimeType: resolvedMimeType || blobType,
          blob: previewBlob,
          contentType: resolvedMimeType || responseContentType || blobType,
          contentLength: responseContentLength || blobSize,
        })
      );
    };

    const loadPreview = async () => {
      try {
        const previewBlob = document?.blob instanceof Blob ? document.blob : null;

        if (previewBlob) {
          await applyReadyState(
            previewBlob,
            safeSourceUrl || sourceUrl || "",
            previewBlob.type || "",
            previewBlob.size || 0
          );
          return;
        }

        if (!documentId && !safeSourceUrl) {
          setState(
            createPreviewState({
              status: "empty",
              error: EMPTY_PREVIEW_MESSAGE,
            })
          );
          return;
        }

        setState(
          createPreviewState({
            status: "loading",
            sourceUrl: safeSourceUrl || sourceUrl || "",
          })
        );

        const response = documentId
          ? await previewEmployeeDocument(documentId, {
              signal: controller.signal,
            })
          : await previewDocumentFromUrl(safeSourceUrl, {
              signal: controller.signal,
            });

        const responseBlob = response?.blob instanceof Blob
          ? response.blob
          : response?.data instanceof Blob
            ? response.data
            : new Blob([response?.data ?? []], {
                type:
                  response?.contentType ||
                  response?.headers?.["content-type"] ||
                  "",
              });

        const responseContentType = String(
          response?.contentType ||
            response?.headers?.["content-type"] ||
            response?.headers?.["Content-Type"] ||
            responseBlob.type ||
            ""
        ).trim();
        const responseContentLength =
          Number(
            response?.headers?.["content-length"] ||
              response?.headers?.["Content-Length"] ||
              0
          ) || responseBlob.size || 0;

        await applyReadyState(
          responseBlob,
          safeSourceUrl || sourceUrl || "",
          responseContentType,
          responseContentLength
        );
      } catch (error) {
        if (
          !active ||
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError"
        ) {
          return;
        }

        setState(
          createPreviewState({
            status: "error",
            error: error?.message || document?.errorMessage || PREVIEW_UNAVAILABLE_MESSAGE,
            sourceUrl: safeSourceUrl || sourceUrl || "",
          })
        );
      }
    };

    loadPreview();

    return () => {
      active = false;
      controller.abort();

      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    document,
    documentId,
    hasDocument,
    open,
    safeSourceUrl,
    sourceUrl,
  ]);

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
    : EMPTY_PREVIEW_MESSAGE;
  const fileType = hasDocument
    ? String(
        state.previewMimeType ||
        document?.fileType ||
          document?.mimeType ||
          document?.contentType ||
          previewKind ||
          "Document"
      ).trim()
    : EMPTY_PREVIEW_MESSAGE;
  const uploadedAt = hasDocument
    ? document?.uploadedAt || document?.createdAt || ""
    : "";
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
              <strong>{EMPTY_PREVIEW_MESSAGE}</strong>
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
              <strong>{state.error || EMPTY_PREVIEW_MESSAGE}</strong>
              <p>The selected document is not available yet.</p>
            </div>
          )}

          {state.status === "error" && (
            <div className="document-preview-error">
              <strong>{state.error || PREVIEW_UNAVAILABLE_MESSAGE}</strong>
              <p>We could not load the selected document preview.</p>
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
