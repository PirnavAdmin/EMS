import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    FaCloudUploadAlt,
    FaDownload,
    FaEye,
    FaFileAlt,
    FaFolderOpen,
    FaRedo,
    FaSpinner,
    FaTrash,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "./AddEmployee.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import { SERVER_URL } from "../../api/config";
import CompactSearchableDropdown from "../../components/CompactSearchableDropdown";
import {
    extractDocumentRecords,
    areDocumentRecordsEquivalent,
    formatDocumentSize,
    loadStoredDocuments,
    mergeDocumentRecords,
    normalizeDocumentRecord,
    normalizeDocumentTypeKey,
    removeStoredDocument,
    saveStoredDocument,
} from "./documentStore";
import { formatDateTime } from "../../utils/date";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const BASE_DOCUMENT_TYPE_GROUPS = [
    {
        label: "Education Certificates",
        options: [
            { value: "10th Certificate", label: "10th Certificate" },
            {
                value: "Intermediate / 12th Certificate",
                label: "Intermediate / 12th Certificate",
            },
            { value: "Degree Certificate", label: "Degree Certificate" },
            {
                value: "Post-Graduation Certificate",
                label: "Post-Graduation Certificate",
            },
        ],
    },
    {
        label: "Identity Documents",
        options: [
            { value: "Aadhaar Card", label: "Aadhaar Card" },
            { value: "PAN Card", label: "PAN Card" },
            { value: "Passport", label: "Passport" },
            { value: "Passport-size Photo", label: "Passport-size Photo" },
        ],
    },
    {
        label: "Current Company",
        options: [{ value: "Signed Offer Letter", label: "Signed Offer Letter" }],
    },
    {
        label: "Previous Experience / Internship",
        options: [
            { value: "Previous Offer Letter", label: "Previous - Offer Letter" },
            {
                value: "Previous Appointment Letter",
                label: "Previous - Appointment Letter",
            },
            {
                value: "Previous Relieving Letter",
                label: "Previous - Relieving / Experience Letter",
            },
        ],
    },
    {
        label: "Last 3 Months Payslips",
        options: [
            { value: "Payslip Month 1", label: "Payslip - Month 1" },
            { value: "Payslip Month 2", label: "Payslip - Month 2" },
            { value: "Payslip Month 3", label: "Payslip - Month 3" },
        ],
    },
];

const getDocumentTypeScore = (document = {}) => {
    let score = 0;

    if (document.serverId) {
        score += 8;
    }

    if (document.documentType && normalizeDocumentTypeKey(document.documentType) !== "document") {
        score += 6;
    }

    if (document.fileUrl || document.downloadUrl) {
        score += 5;
    }

    if (document.fileName) {
        score += 4;
    }

    if (Number(document.size) > 0) {
        score += 3;
    }

    if (document.uploadedAt) {
        score += 2;
    }

    return score;
};

const getBestMatchingResponseDocument = (responseData, fallbackDocument) => {
    const normalizedFallbackDocument = fallbackDocument
        ? normalizeDocumentRecord(fallbackDocument, fallbackDocument.employeeKey)
        : null;
    const responseDocuments = extractDocumentRecords(responseData).map(
        (document) =>
            normalizeDocumentRecord(
                document,
                normalizedFallbackDocument?.employeeKey
            )
    );

    if (responseDocuments.length === 0) {
        return null;
    }

    const mergedResponseDocuments = mergeDocumentRecords(
        responseDocuments,
        normalizedFallbackDocument ? [normalizedFallbackDocument] : []
    );
    const fallbackDocumentTypeKey = normalizeDocumentTypeKey(
        normalizedFallbackDocument?.documentType
    );

    const matchedDocument =
        mergedResponseDocuments.find((document) =>
            normalizedFallbackDocument
                ? areDocumentRecordsEquivalent(
                    document,
                    normalizedFallbackDocument
                )
                : false
        ) ||
        mergedResponseDocuments.find(
            (document) =>
                fallbackDocumentTypeKey &&
                normalizeDocumentTypeKey(document.documentType) ===
                fallbackDocumentTypeKey
        ) ||
        null;

    if (matchedDocument) {
        return matchedDocument;
    }

    return [...mergedResponseDocuments].sort(
        (left, right) => getDocumentTypeScore(right) - getDocumentTypeScore(left)
    )[0] || null;
};

const buildDocumentTypeGroups = (uploadedDocumentTypes = new Set()) =>
    BASE_DOCUMENT_TYPE_GROUPS.map((group) => ({
        label: group.label,
        options: group.options.map((option) => {
            const normalizedOptionType = normalizeDocumentTypeKey(option.value);
            const isUploaded = uploadedDocumentTypes.has(normalizedOptionType);

            return {
                ...option,
                disabled: isUploaded,
                label: isUploaded
                    ? `${option.label} (Uploaded)`
                    : option.label,
            };
        }),
    }));

const getEmployeeKey = (employeeId, employeeCode) =>
    String(employeeCode || employeeId || "").trim();

const getFileExtension = (fileName = "") => {
    const parts = String(fileName).split(".");
    return parts.length > 1 ? parts.pop().toUpperCase() : "";
};

const getDocumentServerId = (document) =>
    document?.serverId ||
    document?.id ||
    document?.documentId ||
    document?.employeeDocumentId ||
    null;

const buildLocalDocumentRecord = (file, documentType, employeeKey) =>
    normalizeDocumentRecord(
        {
            cacheKey: `local-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`,
            employeeKey,
            documentType: documentType || "Document",
            fileName: file.name,
            fileType: file.type || getFileExtension(file.name),
            size: file.size,
            uploadedAt: new Date().toISOString(),
            lastModified: file.lastModified || 0,
            blob: file,
            source: "local",
        },
        employeeKey
    );

const openBlobInNewTab = (blob) => {
    const url = window.URL.createObjectURL(blob);
    const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
        window.URL.revokeObjectURL(url);
        return;
    }

    window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 2500);
};

const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName || "document";

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 1000);
};

function Documents({
    onBack,
    onNext,
    viewMode,
    employeeId,
    employeeCode,
}) {
    const employeeKey = useMemo(
        () => getEmployeeKey(employeeId, employeeCode),
        [employeeCode, employeeId]
    );

    const [documents, setDocuments] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedDocumentType, setSelectedDocumentType] = useState("");
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [savingNext, setSavingNext] = useState(false);
    const [deletingId, setDeletingId] = useState("");
    const [apiError, setApiError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedDeleteDocument, setSelectedDeleteDocument] = useState(null);

    const fileInputRef = useRef(null);
    const isMountedRef = useRef(true);
    const visibleDocuments = useMemo(
        () => mergeDocumentRecords(documents, []),
        [documents]
    );
    const uploadedDocumentTypes = useMemo(
        () =>
            new Set(
                visibleDocuments
                    .map((document) =>
                        normalizeDocumentTypeKey(document.documentType)
                    )
                    .filter((documentTypeKey) =>
                        documentTypeKey && documentTypeKey !== "document"
                    )
            ),
        [visibleDocuments]
    );
    const documentTypeGroups = useMemo(
        () => buildDocumentTypeGroups(uploadedDocumentTypes),
        [uploadedDocumentTypes]
    );
    const documentProgressGroups = useMemo(
        () =>
            BASE_DOCUMENT_TYPE_GROUPS.map((group) => {
                const options = group.options.map((option) => {
                    const normalizedOptionType = normalizeDocumentTypeKey(
                        option.value
                    );
                    const isUploaded = Boolean(
                        normalizedOptionType &&
                        uploadedDocumentTypes.has(normalizedOptionType)
                    );

                    return {
                        ...option,
                        key: normalizedOptionType || option.value,
                        isUploaded,
                    };
                });

                const uploadedCount = options.filter(
                    (option) => option.isUploaded
                ).length;
                const totalCount = options.length;

                return {
                    label: group.label,
                    options,
                    uploadedCount,
                    totalCount,
                    pendingCount: Math.max(0, totalCount - uploadedCount),
                    completionPercent: totalCount
                        ? Math.round((uploadedCount / totalCount) * 100)
                        : 0,
                };
            }),
        [uploadedDocumentTypes]
    );
    const documentProgressSummary = useMemo(() => {
        const totalTrackedTypes = documentProgressGroups.reduce(
            (total, group) => total + group.totalCount,
            0
        );
        const uploadedTrackedTypes = documentProgressGroups.reduce(
            (total, group) => total + group.uploadedCount,
            0
        );

        return {
            totalTrackedTypes,
            uploadedTrackedTypes,
            remainingTrackedTypes: Math.max(
                0,
                totalTrackedTypes - uploadedTrackedTypes
            ),
            completionPercent: totalTrackedTypes
                ? Math.round((uploadedTrackedTypes / totalTrackedTypes) * 100)
                : 0,
        };
    }, [documentProgressGroups]);
    const selectedDocumentTypeKey = normalizeDocumentTypeKey(
        selectedDocumentType
    );
    const selectedDocumentTypeIsUploaded = Boolean(
        selectedDocumentTypeKey &&
        uploadedDocumentTypes.has(selectedDocumentTypeKey)
    );
    const selectedDocumentTypeError = selectedDocumentTypeIsUploaded
        ? `${selectedDocumentType} has already been uploaded. Delete the existing document before uploading again.`
        : "";
    const documentCount = visibleDocuments.length;

    useEffect(
        () => () => {
            isMountedRef.current = false;
        },
        []
    );

    useEffect(() => {
        if (!successMsg) {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            if (isMountedRef.current) {
                setSuccessMsg("");
            }
        }, 2800);

        return () => window.clearTimeout(timer);
    }, [successMsg]);

    const loadDocuments = useCallback(
        async ({ silent = false } = {}) => {
            if (!employeeKey) {
                if (isMountedRef.current) {
                    setDocuments([]);
                    setLoading(false);
                    setLoadError("");
                }

                return;
            }

            if (!silent && isMountedRef.current) {
                setLoading(true);
            }

            if (isMountedRef.current) {
                setLoadError("");
            }

            let serverError = "";

            try {
                const serverDocuments = await api
                    .get(API_ENDPOINTS.employeeDocuments.byEmployeeId(employeeKey))
                    .then((response) => extractDocumentRecords(response.data))
                    .catch(() => []);

                setDocuments(serverDocuments);

                if (!isMountedRef.current) {
                    return;
                }

                setDocuments(serverDocuments);

                if (serverError && mergedDocuments.length === 0) {
                    setLoadError(serverError);
                } else if (serverError && mergedDocuments.length > 0) {
                    setLoadError("Showing cached documents while refreshing.");
                    toast.info("Showing cached documents while refreshing.");
                } else {
                    setLoadError("");
                }
            } catch (error) {
                if (!isMountedRef.current) {
                    return;
                }

                const message =
                    error?.response?.data?.message || "Failed to load documents";

                setLoadError(message);
            } finally {
                if (!silent && isMountedRef.current) {
                    setLoading(false);
                }
            }
        },
        [employeeKey]
    );

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            setSelectedFile(null);
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            const message = "File size should be less than 10MB";
            setApiError(message);
            toast.error(message);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        setSelectedFile(file);
        setApiError("");
    };

    const handleUpload = async () => {
        if (!employeeKey) {
            const message = "Employee ID missing";
            setApiError(message);
            toast.error(message);
            return;
        }

        if (!selectedDocumentType) {
            const message = "Please select a document type.";
            setApiError(message);
            toast.error(message);
            return;
        }

        if (selectedDocumentTypeIsUploaded) {
            const message = `${selectedDocumentType} has already been uploaded. Delete the existing document before uploading again.`;
            setApiError(message);
            toast.error(message);
            return;
        }

        if (!selectedFile) {
            const message = "Please select a file";
            setApiError(message);
            toast.error(message);
            return;
        }

        try {
            setUploading(true);
            setApiError("");

            const formData = new FormData();
            formData.append("EmployeeId", employeeKey);
            formData.append("DocumentType", selectedDocumentType);
            formData.append("Files", selectedFile);

            const response = await api.post(
                API_ENDPOINTS.employeeDocuments.upload,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            const fallbackDocument = buildLocalDocumentRecord(
                selectedFile,
                selectedDocumentType,
                employeeKey
            );
            const responseDocument = getBestMatchingResponseDocument(
                response.data,
                fallbackDocument
            );
            const storedDocument = normalizeDocumentRecord(
                {
                    ...fallbackDocument,
                    ...(responseDocument || {}),
                    employeeKey,
                    documentType:
                        selectedDocumentType ||
                        responseDocument?.documentType ||
                        fallbackDocument.documentType,
                    fileName:
                        responseDocument?.fileName || fallbackDocument.fileName,
                    fileType:
                        responseDocument?.fileType || fallbackDocument.fileType,
                    size: responseDocument?.size || fallbackDocument.size,
                    uploadedAt:
                        responseDocument?.uploadedAt ||
                        fallbackDocument.uploadedAt,
                    fileUrl: responseDocument?.fileUrl || fallbackDocument.fileUrl,
                    downloadUrl:
                        responseDocument?.downloadUrl ||
                        responseDocument?.fileUrl ||
                        fallbackDocument.downloadUrl,
                    lastModified:
                        responseDocument?.lastModified ||
                        fallbackDocument.lastModified,
                    serverId: responseDocument?.serverId || fallbackDocument.serverId,
                    blob: selectedFile,
                    source: responseDocument?.serverId ? "server" : "local",
                },
                employeeKey
            );

            await saveStoredDocument(employeeKey, storedDocument);

            if (!isMountedRef.current) {
                return;
            }

            setDocuments((currentDocuments) =>
                mergeDocumentRecords([storedDocument], currentDocuments)
            );
            setSelectedFile(null);
            setSelectedDocumentType("");
            setSuccessMsg("Document uploaded successfully.");
            toast.success("Document uploaded successfully.");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            loadDocuments({ silent: true });
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            const message =
                error?.response?.data?.message || "Upload failed";

            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setUploading(false);
            }
        }
    };

    const handleDelete = async (documentToDelete) => {
        if (!documentToDelete) {
            return;
        }

        const snapshot = documents;
        const serverId = getDocumentServerId(documentToDelete);

        try {
            setDeletingId(documentToDelete.cacheKey || serverId || "");
            setApiError("");
            setDocuments((currentDocuments) =>
                currentDocuments.filter(
                    (document) =>
                        !areDocumentRecordsEquivalent(document, documentToDelete)
                )
            );

            await removeStoredDocument(employeeKey, documentToDelete);

            if (serverId) {
                await api.delete(API_ENDPOINTS.employeeDocuments.delete(serverId));
            }

            await loadDocuments({ silent: true }).catch(() => { });

            if (!isMountedRef.current) {
                return;
            }

            setSuccessMsg("Document deleted successfully.");
            toast.success("Document deleted successfully.");
            setShowDeleteModal(false);
            setSelectedDeleteDocument(null);
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            await saveStoredDocument(employeeKey, documentToDelete).catch(() => { });
            setDocuments(snapshot);

            const message =
                error?.response?.data?.message || "Failed to delete document";

            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setDeletingId("");
            }
        }
    };

    const handleView = (doc) => {
        if (!doc) {
            return;
        }

        if (doc.blob instanceof Blob) {
            openBlobInNewTab(doc.blob);
            return;
        }

        if (doc.fileUrl) {
            window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
            return;
        }

        const serverId = getDocumentServerId(doc);

        if (!serverId) {
            toast.error("Document ID missing");
            return;
        }

        const url = `${SERVER_URL}/api/EmployeeDocuments/view/${serverId}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleDownload = (doc) => {
        if (!doc) {
            return;
        }

        if (doc.blob instanceof Blob) {
            downloadBlob(doc.blob, doc.fileName);
            return;
        }

        if (doc.fileUrl) {
            const anchor = window.document.createElement("a");
            anchor.href = doc.fileUrl;
            anchor.download = doc.fileName || "document";
            window.document.body.appendChild(anchor);
            anchor.click();
            window.document.body.removeChild(anchor);
            return;
        }

        const serverId = getDocumentServerId(doc);

        if (!serverId) {
            toast.error("Document ID missing");
            return;
        }

        const anchor = window.document.createElement("a");
        anchor.href = `${SERVER_URL}/api/EmployeeDocuments/download/${serverId}`;
        window.document.body.appendChild(anchor);
        anchor.click();
        window.document.body.removeChild(anchor);
    };

    const handleRetry = () => {
        loadDocuments();
    };

    const handleSaveAndNext = async () => {
        if (documentCount === 0) {
            const message = "Upload documents to continue.";
            setApiError(message);
            toast.warning(message);
            return;
        }

        try {
            setSavingNext(true);
            setApiError("");
            setLoadError("");

            await Promise.resolve(onNext?.());

            if (!isMountedRef.current) {
                return;
            }

            setSuccessMsg(
                viewMode
                    ? "Moving to the next section."
                    : "Documents saved successfully."
            );
            toast.success(
                viewMode
                    ? "Moving to the next section."
                    : "Documents saved successfully."
            );
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            const message =
                error?.response?.data?.message ||
                "Unable to move to the next section.";

            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setSavingNext(false);
            }
        }
    };

    const primaryActionLabel = savingNext
        ? viewMode
            ? "Moving..."
            : "Saving & Moving..."
        : viewMode
            ? "Next"
            : "Save & Next";

    return (
        <div className="documents-wrapper">
            <div className="documents-page-header">
                <div>
                    <h5>Employee Documents</h5>
                    <p>Upload employee files, keep them searchable, and continue without losing progress.</p>
                </div>

                <div className="documents-header-count">
                    Uploaded Documents ({documentCount})
                </div>
            </div>

            {successMsg && (
                <div className="success-message documents-inline-message">
                    {successMsg}
                </div>
            )}

            {apiError && (
                <div className="error-message documents-inline-message">
                    {apiError}
                </div>
            )}

            {loadError && documentCount > 0 && (
                <div className="documents-retry-banner">
                    <div className="documents-retry-copy">
                        <strong>Document refresh issue</strong>
                        <span>{loadError}</span>
                    </div>

                    <button
                        type="button"
                        className="documents-retry-btn"
                        onClick={handleRetry}
                    >
                        <FaRedo aria-hidden="true" />
                        Retry
                    </button>
                </div>
            )}

            <div className="documents-card documents-progress-card">
                <div className="documents-progress-header">
                    <div>
                        <h4>Document Progress Tracker</h4>
                        <p>
                            Auto-updated completion summary based on the visible,
                            deduplicated employee files.
                        </p>
                    </div>
                </div>

                <div className="documents-progress-grid">
                    {documentProgressGroups.map((group) => (
                        <div
                            className="documents-progress-category"
                            key={group.label}
                        >
                            <div className="documents-progress-category-header">
                                <div>
                                    <h5>{group.label}</h5>
                                    <p>
                                        {group.uploadedCount} of {group.totalCount} uploaded
                                    </p>
                                </div>

                            </div>

                            <div className="documents-progress-category-bar">
                                <div
                                    className="documents-progress-category-fill"
                                    style={{
                                        width: `${group.completionPercent}%`,
                                    }}
                                />
                            </div>

                            <div className="documents-progress-type-list">
                                {group.options.map((option) => (
                                    <div
                                        key={option.key}
                                        className={`documents-progress-type-chip ${option.isUploaded
                                            ? "is-uploaded"
                                            : "is-pending"
                                            }`}
                                    >
                                        <span>{option.label}</span>
                                        <small>
                                            {option.isUploaded
                                                ? "Uploaded"
                                                : "Pending"}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {!viewMode && (
                <div className="documents-card premium-upload-card">
                    <div className="premium-upload-top">
                        <div>
                            <h4 className="upload-title">Upload Employee Documents</h4>
                            <p className="upload-subtitle">
                                Upload Aadhaar, PAN, certificates, resumes, passports, and more.
                            </p>
                        </div>

                        {/* <div className="upload-badge">
              Uploaded Documents ({documentCount})
            </div> */}
                    </div>

                    <div className="premium-upload-grid">
                        <div className="premium-input-group">
                            <CompactSearchableDropdown
                                label="Document Type"
                                value={selectedDocumentType}
                                onChange={(value) => {
                                    setSelectedDocumentType(value);
                                    if (apiError) {
                                        setApiError("");
                                    }
                                }}
                                placeholder="Select Document Type"
                                searchPlaceholder="Search document types"
                                groups={documentTypeGroups}
                                disabled={uploading}
                                error={selectedDocumentTypeError}
                                menuMaxHeight={180}
                            />
                        </div>

                        <div className="premium-input-group">
                            <label>Choose File</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="premium-input premium-file-input"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                        </div>
                    </div>

                    {selectedFile && (
                        <div className="selected-file-preview">
                            <div className="selected-file-left">
                                <span className="document-icon">
                                    <FaFileAlt aria-hidden="true" />

                                    <span
                                        className="document-remove-icon"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = "";
                                            }
                                        }}
                                    >
                                        ×
                                    </span>
                                </span>

                                <div className="selected-file-body">
                                    <div className="selected-file-title">{selectedFile.name}</div>

                                    <div className="selected-file-meta">
                                        <span>{selectedDocumentType || "Document type not selected"}</span>
                                        <span>{getFileExtension(selectedFile.name) || selectedFile.type || "File"}</span>
                                        <span>{formatDocumentSize(selectedFile.size)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="premium-upload-actions">
                        <button
                            type="button"
                            className="premium-upload-btn"
                            onClick={handleUpload}
                            disabled={
                                uploading ||
                                !selectedFile ||
                                !selectedDocumentType ||
                                selectedDocumentTypeIsUploaded
                            }
                        >
                            {uploading ? (
                                <>
                                    <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <FaCloudUploadAlt aria-hidden="true" />
                                    Upload Document
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="documents-card documents-summary-card">
                <div className="documents-summary-header">
                    <h4>Uploaded Documents ({documentCount})</h4>
                    <div className="documents-summary-pill">
                        {documentCount} {documentCount === 1 ? "file" : "files"} saved
                    </div>
                </div>

                {loading && documentCount === 0 ? (
                    <div className="documents-skeleton-list" aria-busy="true">
                        {[1, 2, 3].map((item) => (
                            <div className="documents-skeleton-row" key={item}>
                                <div className="documents-skeleton-icon" />
                                <div className="documents-skeleton-body">
                                    <div className="documents-skeleton-line short" />
                                    <div className="documents-skeleton-line" />
                                </div>
                                <div className="documents-skeleton-actions">
                                    <div className="documents-skeleton-chip" />
                                    <div className="documents-skeleton-chip" />
                                    <div className="documents-skeleton-chip" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : loadError && documentCount === 0 ? (
                    <div className="documents-error-state">
                        <div className="documents-empty-icon error">
                            <FaRedo aria-hidden="true" />
                        </div>

                        <h5>{loadError}</h5>
                        <p>We could not refresh documents from the server. Try again or continue with the cached copy if available.</p>

                        <button
                            type="button"
                            className="documents-retry-btn"
                            onClick={handleRetry}
                        >
                            <FaRedo aria-hidden="true" />
                            Retry
                        </button>
                    </div>
                ) : documentCount === 0 ? (
                    <div className="documents-empty-state">
                        <div className="documents-empty-icon">
                            <FaFolderOpen aria-hidden="true" />
                        </div>

                        <h5>No documents uploaded yet</h5>
                        <p>Upload documents to continue</p>
                    </div>
                ) : (
                    <div className="uploaded-documents-list">
                        {visibleDocuments.map((document, index) => (
                            <div
                                key={document.cacheKey || getDocumentServerId(document) || index}
                                className="uploaded-document-item"
                            >
                                <div className="uploaded-document-left">
                                    <span
                                        className="document-icon"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <FaFileAlt
                                            aria-hidden="true"
                                            style={{
                                                display: "block",
                                            }}
                                        />
                                    </span>

                                    <div className="uploaded-document-body">
                                        <div className="document-title">
                                            {document.documentType || "Document"}
                                        </div>

                                        <div className="document-filename">
                                            {document.fileName || "Uploaded file"}
                                        </div>

                                        <div className="document-meta-row">
                                            <span className="document-meta-chip">
                                                {document.fileType || "File"}
                                            </span>
                                            {(document.fileSize || document.size) > 0 && (
                                                <span className="document-meta-chip">
                                                    {formatDocumentSize(document.fileSize || document.size)}
                                                </span>
                                            )}

                                            {document.uploadedAt && (
                                                <span className="document-meta-chip">
                                                    {formatDateTime(document.uploadedAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="uploaded-document-actions">
                                    <button
                                        type="button"
                                        className="document-action-btn view-btn"
                                        onClick={() => handleView(document)}
                                    >
                                        <FaEye aria-hidden="true" />
                                        View
                                    </button>

                                    <button
                                        type="button"
                                        className="document-action-btn download-btn"
                                        onClick={() => handleDownload(document)}
                                    >
                                        <FaDownload aria-hidden="true" />
                                        Download
                                    </button>

                                    <button
                                        type="button"
                                        className="document-action-btn delete-btn"
                                        onClick={() => {
                                            setSelectedDeleteDocument(document);
                                            setShowDeleteModal(true);
                                        }}
                                    >
                                        <FaTrash aria-hidden="true" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showDeleteModal && selectedDeleteDocument && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <h3>Confirm Delete</h3>
                        <p>
                            Are you sure you want to delete this document?
                        </p>

                        <div className="delete-modal-actions">
                            <button
                                type="button"
                                className="delete-cancel-btn"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedDeleteDocument(null);
                                }}
                                disabled={Boolean(deletingId)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="delete-confirm-btn"
                                onClick={() => handleDelete(selectedDeleteDocument)}
                                disabled={Boolean(deletingId)}
                            >
                                {deletingId ? (
                                    <>
                                        <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Yes, Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="documents-footer">
                <div className="progress-info">
                    Uploaded Documents ({documentCount})
                </div>

                <div className="footer-actions">
                    <button type="button" className="secondary-btn" onClick={onBack}>
                        Back
                    </button>

                    <button
                        type="button"
                        className="submit-document-btn"
                        onClick={handleSaveAndNext}
                        disabled={
                            documentCount === 0 ||
                            loading ||
                            uploading ||
                            savingNext
                        }
                    >
                        {savingNext ? (
                            <>
                                <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                {primaryActionLabel}
                            </>
                        ) : (
                            primaryActionLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Documents;
