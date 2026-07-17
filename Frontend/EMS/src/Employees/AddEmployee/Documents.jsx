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
import DocumentPreviewModal from "./DocumentPreviewModal";
import { getStoredEmployeeId } from "../../utils/authStorage";
import {
    extractDocumentRecords,
    areDocumentRecordsEquivalent,
    formatDocumentSize,
    mergeDocumentRecords,
    normalizeDocumentRecord,
    normalizeDocumentTypeKey,
    removeStoredDocument,
    saveStoredDocument,
} from "./documentStore";
import { formatDateTime } from "../../utils/date";
import {
    downloadSignedAgreement,
    getAgreementTypes,
    getPendingAgreementCount,
    getSignedAgreementCount,
    signAgreement,
    viewAgreement,
    viewSignedAgreement,
} from "../../services/agreementService";
import {
    extractDownloadFileName,
    getDownloadErrorMessage,
} from "../../utils/downloadUtils";
import {
    resolveDocumentMimeType,
    isSafeWebUrl,
} from "./documentPreview";

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

const toText = (value, fallback = "") => {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue || fallback;
};

const toNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeAgreement = (agreement = {}) => {
    const agreementCode = toText(
        agreement.agreementCode ??
        agreement.AgreementCode ??
        agreement.code ??
        agreement.Code
    );

    const agreementName = toText(
        agreement.agreementName ??
        agreement.AgreementName ??
        agreement.name ??
        agreement.Name,
        agreementCode || "Agreement"
    );

    const assignedEmployees = toNumber(
        agreement.assignedEmployees ??
        agreement.AssignedEmployees ??
        agreement.assignExistingEmployees ??
        agreement.AssignToExistingEmployees ??
        agreement.totalEmployees
    );

    const signedEmployees = toNumber(
        agreement.signedEmployees ??
        agreement.SignedEmployees ??
        agreement.signedCount
    );

    const pendingEmployees = toNumber(
        agreement.pendingEmployees ??
        agreement.PendingEmployees ??
        Math.max(0, assignedEmployees - signedEmployees)
    );

    const status = toText(
        agreement.status ??
        agreement.Status ??
        (pendingEmployees > 0 ? "Pending" : signedEmployees > 0 ? "Signed" : "")
    );

    return {
        ...agreement,

        agreementId:
            agreement.agreementId ??
            agreement.AgreementId ??
            agreement.id ??
            agreement.Id ??
            "",

        employeeAgreementId:
            agreement.employeeAgreementId ??
            agreement.EmployeeAgreementId ??
            agreement.employeeAgreementID ??
            agreement.EmployeeAgreementID ??
            agreement.employeeagreementid ??
            agreement.Employeeagreementid ??
            agreement.employee_AgreementId ??
            agreement.Employee_AgreementId ??
            agreement.agreementId ??
            agreement.AgreementId ??
            agreement.id ??
            agreement.Id ??
            "",

        agreementName,
        agreementCode,

        description: toText(
            agreement.description ??
            agreement.Description
        ),

        assignedEmployees,
        signedEmployees,
        pendingEmployees,

        createdDate:
            agreement.createdDate ??
            agreement.CreatedDate ??
            agreement.createdAt ??
            agreement.CreatedAt ??
            agreement.assignedDate ??
            agreement.AssignedDate ??
            "",

        assignedDate:
            agreement.assignedDate ??
            agreement.AssignedDate ??
            agreement.createdDate ??
            agreement.CreatedDate ??
            "",

        status,
    };
};

const normalizeAgreementIdentityValue = (value) =>
    String(value ?? "").trim();

const getAgreementIdentityCandidates = (
    agreement = {},
    preferredFields = [
        "pendingEmployeeAgreementId",
        "signedEmployeeAgreementId",
        "employeeAgreementId",
        "agreementId",
        "agreementCode",
        "documentId",
        "id",
    ]
) => {
    if (agreement === null || agreement === undefined) {
        return [];
    }

    if (typeof agreement !== "object") {
        const value = normalizeAgreementIdentityValue(agreement);
        return value ? [value] : [];
    }

    const fieldAliases = {
        pendingEmployeeAgreementId: [
            "pendingEmployeeAgreementId",
            "PendingEmployeeAgreementId",
        ],
        signedEmployeeAgreementId: [
            "signedEmployeeAgreementId",
            "SignedEmployeeAgreementId",
        ],
        employeeAgreementId: [
            "employeeAgreementId",
            "EmployeeAgreementId",
            "employeeAgreementID",
            "EmployeeAgreementID",
            "employeeagreementid",
            "Employeeagreementid",
            "employee_AgreementId",
            "Employee_AgreementId",
        ],
        agreementId: ["agreementId", "AgreementId"],
        agreementCode: ["agreementCode", "AgreementCode", "code", "Code"],
        documentId: ["documentId", "DocumentId"],
        id: ["id", "Id"],
    };

    const candidates = [];

    preferredFields.forEach((field) => {
        const aliases = fieldAliases[field] || [field];

        aliases.forEach((alias) => {
            const candidate = normalizeAgreementIdentityValue(agreement[alias]);

            if (candidate) {
                candidates.push(candidate);
            }
        });
    });

    return [...new Set(candidates)];
};

const buildAgreementIdentityIndex = (agreements = []) => {
    const index = new Map();

    agreements.forEach((agreement) => {
        const normalizedAgreement = normalizeAgreement(agreement);

        getAgreementIdentityCandidates(normalizedAgreement).forEach((candidate) => {
            if (!index.has(candidate)) {
                index.set(candidate, normalizedAgreement);
            }
        });
    });

    return index;
};

const findAgreementMatch = (agreementIndex, agreement) => {
    const candidates = getAgreementIdentityCandidates(agreement);

    for (const candidate of candidates) {
        if (agreementIndex.has(candidate)) {
            return agreementIndex.get(candidate);
        }
    }

    return null;
};

const mergeAgreementLifecycleIds = (
    agreement,
    pendingMatch = null,
    signedMatch = null
) => {
    const normalizedAgreement = normalizeAgreement(agreement);
    const normalizedPendingMatch = pendingMatch
        ? normalizeAgreement(pendingMatch)
        : null;
    const normalizedSignedMatch = signedMatch
        ? normalizeAgreement(signedMatch)
        : null;

    const pendingEmployeeAgreementId =
        normalizedPendingMatch?.employeeAgreementId ||
        normalizedPendingMatch?.agreementId ||
        "";

    const signedEmployeeAgreementId =
        normalizedSignedMatch?.employeeAgreementId ||
        normalizedSignedMatch?.agreementId ||
        "";

    const employeeAgreementId =
        signedEmployeeAgreementId ||
        pendingEmployeeAgreementId ||
        normalizedAgreement.employeeAgreementId ||
        normalizedAgreement.agreementId ||
        "";

    const agreementId =
        normalizedAgreement.agreementId ||
        normalizedPendingMatch?.agreementId ||
        normalizedSignedMatch?.agreementId ||
        "";

    const agreementCode =
        normalizedAgreement.agreementCode ||
        normalizedPendingMatch?.agreementCode ||
        normalizedSignedMatch?.agreementCode ||
        "";

    return normalizeAgreement({
        ...normalizedAgreement,
        agreementId,
        employeeAgreementId,
        agreementCode,
        pendingEmployeeAgreementId,
        signedEmployeeAgreementId,
    });
};

const getAgreementFileName = (agreement) =>
    `${agreement?.agreementName || agreement?.agreementCode || "Agreement"}`;

const getAgreementDownloadFileName = (agreement) => {
    const agreementCode = String(
        agreement?.agreementCode ||
        agreement?.AgreementCode ||
        agreement?.code ||
        agreement?.Code ||
        ""
    ).trim();

    return agreementCode
        ? `Agreement_${agreementCode}.pdf`
        : "Agreement.pdf";
};

const getResponseHeaderValue = (headers, key) =>
    headers?.[key] ||
    headers?.[key.toLowerCase()] ||
    headers?.[key.toUpperCase()] ||
    "";

const buildAgreementPreviewDocument = async (
    response,
    agreement,
    fallbackFileName
) => {
    const rawContentType = getResponseHeaderValue(
        response.headers,
        "content-type"
    );
    const initialFileName = extractDownloadFileName(
        response.headers,
        fallbackFileName,
        rawContentType
    );
    const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: rawContentType || "" });
    const contentType = await resolveDocumentMimeType({
        blob,
        fileName: initialFileName,
        headerMimeType: rawContentType,
        documentMimeType: agreement?.fileType || agreement?.mimeType || "",
    });
    const fileName = extractDownloadFileName(
        response.headers,
        fallbackFileName,
        contentType
    );

    return {
        ...agreement,
        fileName,
        originalFileName: fileName,
        fileType: contentType,
        mimeType: contentType,
        contentType,
        blob,
        uploadedAt: agreement.createdDate || agreement.assignedDate,
    };
};

const triggerAgreementBlobDownload = async (
    response,
    fallbackFileName
) => {
    const rawContentType = getResponseHeaderValue(
        response.headers,
        "content-type"
    );
    const fileName = extractDownloadFileName(
        response.headers,
        fallbackFileName,
        rawContentType
    );
    const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: rawContentType || "" });
    const contentType = await resolveDocumentMimeType({
        blob,
        fileName,
        headerMimeType: rawContentType,
    });
    const resolvedFileName = extractDownloadFileName(
        response.headers,
        fallbackFileName,
        contentType
    );

    downloadBlob(blob, resolvedFileName);
};

const buildAgreementPreviewFromResponse = async (response, agreement) => {
    const fallbackFileName = getAgreementDownloadFileName(agreement);
    const rawContentType = getResponseHeaderValue(
        response.headers,
        "content-type"
    );
    const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: rawContentType || "application/pdf",
        });

    try {
        return await buildAgreementPreviewDocument(
            {
                headers: response.headers,
                data: blob,
            },
            agreement,
            fallbackFileName
        );
    } catch (error) {
        console.warn("[Agreement] Failed to build preview document", error);

        return {
            ...agreement,
            fileName: fallbackFileName,
            originalFileName: fallbackFileName,
            fileType: rawContentType || "application/pdf",
            mimeType: rawContentType || "application/pdf",
            contentType: rawContentType || "application/pdf",
            blob,
            uploadedAt: agreement.createdDate || agreement.assignedDate,
        };
    }
};

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
    const [previewDocument, setPreviewDocument] = useState(null);
    const storedEmployeeId = useMemo(() => getStoredEmployeeId(), []);
    const [agreementCategory, setAgreementCategory] = useState("documents");
    const [agreementLoading, setAgreementLoading] = useState(false);
    const [agreementList, setAgreementList] = useState([]);
    const [pendingAgreementCount, setPendingAgreementCount] = useState(0);
    const [signedAgreementCount, setSignedAgreementCount] = useState(0);
    const [selectedAgreement, setSelectedAgreement] = useState(null);
    const [signatureName, setSignatureName] = useState("");
    const [signedLocation, setSignedLocation] = useState("");
    const [signatureImage, setSignatureImage] = useState(null);
    const [signingAgreement, setSigningAgreement] = useState(false);
    const [agreementActionLoading, setAgreementActionLoading] = useState("");
    const [agreementDownloadLoading, setAgreementDownloadLoading] = useState("");

    const fileInputRef = useRef(null);
    const signatureImageInputRef = useRef(null);
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
    const isAgreementCategory = agreementCategory === "agreements";
    const normalizedAgreementList = useMemo(
        () => agreementList.map((agreement) => normalizeAgreement(agreement)),
        [agreementList]
    );
    const selectedAgreementDetails = useMemo(
        () => selectedAgreement ? normalizeAgreement(selectedAgreement) : null,
        [selectedAgreement]
    );

    const isAgreementSelected = !!selectedAgreementDetails;

    const isAgreementSigned =
        String(selectedAgreementDetails?.status || "").toLowerCase() === "signed";

    const isSignatureFormValid =
        signatureName.trim() !== "" &&
        signedLocation.trim() !== "" &&
        signatureImage;

    const canViewAgreement = isAgreementSelected;

    const canSubmitAgreement =
        isAgreementSelected &&
        !isAgreementSigned &&
        isSignatureFormValid;

    // Enable ONLY after agreement is signed
    const canViewSigned =
        isAgreementSelected && isAgreementSigned;

    const canDownloadSigned =
        isAgreementSelected && isAgreementSigned;

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
                setLoadError("");
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

    const loadAgreements = useCallback(
        async ({ silent = false } = {}) => {
            if (!isAgreementCategory) {
                return;
            }

            const employeeIdForAgreements = employeeKey || storedEmployeeId;

            if (!employeeIdForAgreements) {
                setAgreementList([]);
                setPendingAgreementCount(0);
                setSignedAgreementCount(0);
                return;
            }

            if (!silent && isMountedRef.current) {
                setAgreementLoading(true);
            }

            if (isMountedRef.current) {
                setLoadError("");
            }

            try {
                const [pendingAgreements, signedAgreements, allAgreements] =
                    await Promise.all([
                        getPendingAgreementCount(employeeIdForAgreements),
                        getSignedAgreementCount(employeeIdForAgreements),
                        getAgreementTypes(),
                    ]);
                const pendingCodes = new Set(
                    pendingAgreements
                        .map((agreement) => normalizeAgreement(agreement).agreementCode)
                        .filter(Boolean)
                );
                const signedCodes = new Set(
                    signedAgreements
                        .map((agreement) => normalizeAgreement(agreement).agreementCode)
                        .filter(Boolean)
                );
                const pendingAgreementIndex = buildAgreementIdentityIndex(
                    pendingAgreements
                );
                const signedAgreementIndex = buildAgreementIdentityIndex(
                    signedAgreements
                );
                console.log("Pending Agreements:", pendingAgreements);
                console.log("Signed Agreements:", signedAgreements);
                console.log("All Agreements:", allAgreements);


                const normalizedAgreements = allAgreements.map((agreement) => {
                    const normalizedAgreement = normalizeAgreement(agreement);
                    const pendingMatch = findAgreementMatch(
                        pendingAgreementIndex,
                        normalizedAgreement
                    );
                    const signedMatch = findAgreementMatch(
                        signedAgreementIndex,
                        normalizedAgreement
                    );
                    const agreementStatus = signedCodes.has(normalizedAgreement.agreementCode)
                        ? "Signed"
                        : pendingCodes.has(normalizedAgreement.agreementCode)
                            ? "Pending"
                            : normalizedAgreement.status || "Pending";

                    const mergedAgreement = mergeAgreementLifecycleIds(
                        {
                            ...normalizedAgreement,
                            status: agreementStatus,
                        },
                        pendingMatch,
                        signedMatch
                    );

                    console.log("[Agreement] normalized agreement", {
                        agreementCode: mergedAgreement.agreementCode,
                        agreementId: mergedAgreement.agreementId,
                        employeeAgreementId: mergedAgreement.employeeAgreementId,
                        pendingEmployeeAgreementId:
                            mergedAgreement.pendingEmployeeAgreementId,
                        signedEmployeeAgreementId:
                            mergedAgreement.signedEmployeeAgreementId,
                        status: mergedAgreement.status,
                    });

                    return normalizeAgreement({
                        ...normalizedAgreement,
                        ...mergedAgreement,
                        status: agreementStatus,
                    });
                });

                if (!isMountedRef.current) {
                    return;
                }

                setAgreementList(normalizedAgreements);
                setPendingAgreementCount(pendingAgreements.length);
                setSignedAgreementCount(signedAgreements.length);
                setSelectedAgreement((currentAgreement) => {
                    if (!normalizedAgreements.length) {
                        return null;
                    }

                    const currentId = normalizeAgreement(currentAgreement || {}).agreementId;

                    return (
                        normalizedAgreements.find(
                            (agreement) => agreement.agreementId === currentId
                        ) || null
                    );
                });
                setLoadError("");
            } catch (error) {
                if (!isMountedRef.current) {
                    return;
                }

                const message =
                    error?.response?.data?.message || "Failed to load agreements";

                setAgreementList([]);
                setSelectedAgreement(null);
                setPendingAgreementCount(0);
                setSignedAgreementCount(0);
                setLoadError(message);
                toast.error(message);
            } finally {
                if (!silent && isMountedRef.current) {
                    setAgreementLoading(false);
                }
            }
        },
        [employeeKey, isAgreementCategory, storedEmployeeId]
    );

    useEffect(() => {
        if (isAgreementCategory) {
            loadAgreements();
        }
    }, [isAgreementCategory, loadAgreements]);

    useEffect(() => {
        setSignatureName("");
        setSignedLocation("");
        setSignatureImage(null);

        if (signatureImageInputRef.current) {
            signatureImageInputRef.current.value = "";
        }
    }, [selectedAgreementDetails?.agreementId]);

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

    const handleSignatureImageChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            setSignatureImage(null);
            return;
        }

        if (!file.type?.startsWith("image/")) {
            const message = "Please upload a valid signature image.";
            setApiError(message);
            toast.error(message);
            event.target.value = "";
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            const message = "Signature image should be less than 10MB";
            setApiError(message);
            toast.error(message);
            event.target.value = "";
            return;
        }

        setSignatureImage(file);
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

        setPreviewDocument(doc);
    };

    const handleDownload = (doc) => {
        if (!doc) {
            return;
        }

        if (doc.blob instanceof Blob) {
            downloadBlob(doc.blob, doc.fileName);
            return;
        }

        const safeDocumentUrl = isSafeWebUrl(doc.fileUrl)
            ? doc.fileUrl
            : isSafeWebUrl(doc.downloadUrl)
                ? doc.downloadUrl
                : "";

        if (safeDocumentUrl) {
            const anchor = window.document.createElement("a");
            anchor.href = safeDocumentUrl;
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

    const handleViewAgreement = async (agreement) => {
        const normalizedAgreement = normalizeAgreement(agreement);
        const viewKey =
            normalizedAgreement.agreementId ||
            normalizedAgreement.employeeAgreementId ||
            normalizedAgreement.agreementCode ||
            "";

        console.log("Selected Agreement:", normalizedAgreement);
        console.log("[Agreement] View Agreement request", {
            agreementId: normalizedAgreement.agreementId,
            employeeAgreementId: normalizedAgreement.employeeAgreementId,
            pendingEmployeeAgreementId:
                normalizedAgreement.pendingEmployeeAgreementId,
            signedEmployeeAgreementId:
                normalizedAgreement.signedEmployeeAgreementId,
            agreementCode: normalizedAgreement.agreementCode,
        });

        if (!viewKey) {
            toast.error("Agreement ID missing");
            return;
        }

        try {
            setAgreementActionLoading(`view-${viewKey}`);
            setApiError("");

            const response = await viewAgreement(normalizedAgreement);

            if (!isMountedRef.current) return;

            const previewDocument = await buildAgreementPreviewFromResponse(
                response,
                normalizedAgreement
            );

            if (!isMountedRef.current) return;

            setPreviewDocument(previewDocument);
        } catch (error) {
            if (!isMountedRef.current) return;

            console.error("[Agreement] View Agreement failed", error);

            const message = "Unable to preview this agreement.";

            setPreviewDocument({
                ...normalizedAgreement,
                fileName: getAgreementFileName(normalizedAgreement),
                originalFileName: getAgreementFileName(normalizedAgreement),
                errorMessage: message,
                blob: null,
            });
            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setAgreementActionLoading("");
            }
        }
    };

    const handleViewSignedAgreement = async (agreement) => {
        const normalizedAgreement = normalizeAgreement(agreement);
        const previewKey =
            normalizedAgreement.agreementId ||
            normalizedAgreement.employeeAgreementId ||
            normalizedAgreement.agreementCode ||
            "";
        const requestUrl = API_ENDPOINTS.agreements.viewSigned(
            normalizedAgreement.signedEmployeeAgreementId ||
            normalizedAgreement.employeeAgreementId ||
            normalizedAgreement.agreementId ||
            normalizedAgreement.agreementCode ||
            normalizedAgreement.id ||
            ""
        );

        console.log("Agreement:", normalizedAgreement);
        console.log("AgreementId:", normalizedAgreement.agreementId);
        console.log(
            "SignedAgreementId:",
            normalizedAgreement.signedEmployeeAgreementId
        );
        console.log("Request URL:", requestUrl);

        if (!previewKey) {
            toast.error("Agreement ID missing");
            return;
        }

        try {
            setAgreementActionLoading(`signed-${previewKey}`);
            setApiError("");

            const response = await viewSignedAgreement(normalizedAgreement);

            if (!isMountedRef.current) return;

            setPreviewDocument(
                await buildAgreementPreviewDocument(
                    response,
                    normalizedAgreement,
                    `Signed-${getAgreementFileName(normalizedAgreement)}`
                )
            );
        } catch (error) {
            if (!isMountedRef.current) return;

            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Unable to load agreement.";

            setPreviewDocument({
                ...normalizedAgreement,
                fileName: `Signed-${getAgreementFileName(normalizedAgreement)}`,
                originalFileName: `Signed-${getAgreementFileName(normalizedAgreement)}`,
                errorMessage: "Unable to load agreement.",
                blob: null,
            });
            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setAgreementActionLoading("");
            }
        }
    };

    const handleDownloadSignedAgreement = async (agreement) => {
        const normalizedAgreement = normalizeAgreement(agreement);
        const downloadKey =
            normalizedAgreement.agreementId ||
            normalizedAgreement.employeeAgreementId ||
            normalizedAgreement.agreementCode ||
            "";

        console.log("Selected Agreement:", normalizedAgreement);
        console.log("[Agreement] Download Signed request", {
            agreementId: normalizedAgreement.agreementId,
            employeeAgreementId: normalizedAgreement.employeeAgreementId,
            pendingEmployeeAgreementId:
                normalizedAgreement.pendingEmployeeAgreementId,
            signedEmployeeAgreementId:
                normalizedAgreement.signedEmployeeAgreementId,
            agreementCode: normalizedAgreement.agreementCode,
        });

        if (!downloadKey) {
            toast.error("Agreement ID missing");
            return;
        }

        try {
            setAgreementDownloadLoading(downloadKey);
            setApiError("");

            const response = await downloadSignedAgreement(normalizedAgreement);

            await triggerAgreementBlobDownload(
                response,
                `Signed-${getAgreementFileName(normalizedAgreement)}`
            );
        } catch (error) {
            const message = await getDownloadErrorMessage(
                error,
                "Signed agreement download failed"
            );

            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setAgreementDownloadLoading("");
            }
        }
    };

    const handleSubmitSignature = async () => {
        const agreement = selectedAgreementDetails;
        const employeeIdForSignature = employeeKey || storedEmployeeId;

        if (!employeeIdForSignature) {
            const message = "Employee ID missing";
            setApiError(message);
            toast.error(message);
            return;
        }

        if (!agreement?.agreementCode) {
            const message = "Agreement code missing";
            setApiError(message);
            toast.error(message);
            return;
        }

        if (!signatureName.trim()) {
            const message = "Please enter signature name.";
            setApiError(message);
            toast.error(message);
            return;
        }

        if (!signedLocation.trim()) {
            const message = "Please enter signed location.";
            setApiError(message);
            toast.error(message);
            return;
        }

        if (!signatureImage) {
            const message = "Please upload signature image.";
            setApiError(message);
            toast.error(message);
            return;
        }

        try {
            setSigningAgreement(true);
            setApiError("");

            const response = await signAgreement({
                employeeId: employeeIdForSignature,
                agreementCode: agreement.agreementCode,
                signatureName: signatureName.trim(),
                signedLocation: signedLocation.trim(),
                signatureImage,
            });

            const responseData = response?.data ?? {};
            console.log(
                "Generated PDF Path:",
                responseData.generatedPdfPath ||
                responseData.GeneratedPdfPath ||
                responseData.generatedPdf ||
                responseData.GeneratedPdf ||
                ""
            );
            console.log(
                "Signed Agreement Id:",
                responseData.signedAgreementId ||
                responseData.SignedAgreementId ||
                responseData.signedEmployeeAgreementId ||
                responseData.SignedEmployeeAgreementId ||
                ""
            );
            console.log(
                "Agreement Id:",
                agreement.agreementId ||
                agreement.AgreementId ||
                agreement.id ||
                agreement.Id ||
                ""
            );

            if (!isMountedRef.current) {
                return;
            }

            setSignatureName("");
            setSignedLocation("");
            setSignatureImage(null);
            setSuccessMsg("Agreement Signed Successfully");
            toast.success("Agreement Signed Successfully");
            await loadAgreements({ silent: true });
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            const message =
                error?.response?.data?.message || "Agreement signing failed";

            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setSigningAgreement(false);
            }
        }
    };

    const handleRetry = () => {
        if (isAgreementCategory) {
            loadAgreements();
        }

        loadDocuments();
    };

    const handleSaveAndNext = async () => {
        if (agreementCategory === "documents" && documentCount === 0) {
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
                    {isAgreementCategory
                        ? `Agreements (${normalizedAgreementList.length})`
                        : `Uploaded Documents (${documentCount})`}
                </div>
            </div>

            <div className="documents-card premium-upload-card">
                <div className="premium-upload-grid">
                    <div className="premium-input-group">
                        <label>Category</label>
                        <select
                            className="premium-input"
                            value={agreementCategory}
                            onChange={(event) => {
                                setAgreementCategory(event.target.value);
                                setApiError("");
                                setLoadError("");
                            }}
                        >
                            <option value="documents">Employee Documents</option>
                            <option value="agreements">Employee Agreements</option>
                        </select>
                    </div>
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

            {loadError && (isAgreementCategory || documentCount > 0) && (
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

            {agreementCategory === "documents" && (
                <>
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
                </>
            )}

            {isAgreementCategory && (
                <>
                    <div className="documents-card documents-summary-card">
                        <div className="documents-summary-header">
                            <div>
                                <h4>Employee Agreements</h4>
                                <p>Review and Sign Company Agreements assigned to you.</p>
                            </div>
                            <div className="uploaded-document-actions">
                                <div className="documents-summary-pill">
                                    Pending Agreements: {pendingAgreementCount}
                                </div>
                                <div className="documents-summary-pill">
                                    Signed Agreements: {signedAgreementCount}
                                </div>
                            </div>
                        </div>

                        {agreementLoading ? (
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
                        ) : loadError && normalizedAgreementList.length === 0 ? (
                            <div className="documents-error-state">
                                <div className="documents-empty-icon error">
                                    <FaRedo aria-hidden="true" />
                                </div>
                                <h5>{loadError}</h5>
                                <p>We could not refresh agreements from the server.</p>
                                <button
                                    type="button"
                                    className="documents-retry-btn"
                                    onClick={handleRetry}
                                >
                                    <FaRedo aria-hidden="true" />
                                    Retry
                                </button>
                            </div>
                        ) : normalizedAgreementList.length === 0 ? (
                            <div className="documents-empty-state">
                                <div className="documents-empty-icon">
                                    <FaFolderOpen aria-hidden="true" />
                                </div>
                                <h5>No agreements found</h5>
                                <p>Assigned agreements will appear here.</p>
                            </div>
                        ) : (
                            <div>
                                <div className="premium-upload-grid" style={{ textAlign: "left" }}>
                                    <div className="premium-input-group">
                                        <label>Agreement Type</label>
                                        <select
                                            className="premium-input"
                                            value={selectedAgreementDetails?.agreementId || ""}
                                            onChange={(event) => {
                                                const selectedId = event.target.value;

                                                // Reset when placeholder is selected
                                                if (!selectedId) {
                                                    setSelectedAgreement(null);
                                                    setApiError("");
                                                    return;
                                                }

                                                const nextAgreement =
                                                    normalizedAgreementList.find(
                                                        (agreement) =>
                                                            String(agreement.agreementId) === String(selectedId)
                                                    ) || null;

                                                setSelectedAgreement(nextAgreement);
                                                setApiError("");
                                            }}
                                            disabled={agreementLoading || signingAgreement}
                                        >
                                            <option value="">Select Agreement</option>

                                            {normalizedAgreementList.map((agreement) => (
                                                <option
                                                    key={agreement.agreementId}
                                                    value={agreement.agreementId}
                                                >
                                                    {agreement.agreementName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="premium-input-group">
                                        <label>Agreement Name</label>
                                        <input
                                            className="premium-input"
                                            value={selectedAgreementDetails?.agreementName || ""}
                                            readOnly
                                        />
                                    </div>

                                    <div className="premium-input-group">
                                        <label>Employee ID</label>
                                        <input
                                            className="premium-input"
                                            value={employeeKey || storedEmployeeId || ""}
                                            readOnly
                                        />
                                    </div>

                                    <div className="premium-input-group">
                                        <label>Agreement Code</label>
                                        <input
                                            className="premium-input"
                                            value={selectedAgreementDetails?.agreementCode || ""}
                                            readOnly
                                        />
                                    </div>

                                    <div className="premium-input-group">
                                        <label>Status</label>
                                        <input
                                            className="premium-input"
                                            value={selectedAgreementDetails?.status || ""}
                                            readOnly
                                        />
                                    </div>

                                    <div className="premium-input-group">
                                        <label>
                                            Signature Name <span className="required">*</span>
                                        </label>

                                        <input
                                            className="premium-input"
                                            value={signatureName}
                                            required
                                            onChange={(event) => setSignatureName(event.target.value)}
                                            disabled={
                                                !selectedAgreementDetails ||
                                                signingAgreement ||
                                                String(selectedAgreementDetails?.status).toLowerCase() === "signed"
                                            }
                                            placeholder="Signature Name"
                                        />
                                    </div>

                                    <div className="premium-input-group">
                                        <label>
                                            Signed Location <span className="required">*</span>
                                        </label>

                                        <input
                                            className="premium-input"
                                            value={signedLocation}
                                            required
                                            onChange={(event) => setSignedLocation(event.target.value)}
                                            disabled={
                                                !selectedAgreementDetails ||
                                                signingAgreement ||
                                                String(selectedAgreementDetails?.status).toLowerCase() === "signed"
                                            }
                                            placeholder="Signed Location"
                                        />
                                    </div>

                                    <div className="premium-input-group">
                                        <label>
                                            Upload Signature Image <span className="required">*</span>
                                        </label>

                                        <input
                                            ref={signatureImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            required
                                            className="premium-input premium-file-input"
                                            onChange={handleSignatureImageChange}
                                            disabled={
                                                !selectedAgreementDetails ||
                                                signingAgreement ||
                                                String(selectedAgreementDetails?.status).toLowerCase() === "signed"
                                            }
                                        />
                                    </div>
                                </div>

                                {String(selectedAgreementDetails?.status).toLowerCase() === "signed" && (
                                    <div className="documents-inline-message success-message">
                                        Signed Badge
                                    </div>
                                )}

                                {signatureImage && (
                                    <p>
                                        {signatureImage.name} ({formatDocumentSize(signatureImage.size)})
                                    </p>
                                )}

                                <div className="uploaded-document-actions">
                                    <button
                                        type="button"
                                        className="document-action-btn view-btn"
                                        disabled={!canViewAgreement}
                                        onClick={() => handleViewAgreement(selectedAgreementDetails)}
                                    >
                                        {agreementActionLoading === `view-${selectedAgreementDetails?.agreementId}` ? (
                                            <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                        ) : (
                                            <FaEye aria-hidden="true" />
                                        )}
                                        View Agreement
                                    </button>

                                    <button
                                        type="button"
                                        className="document-action-btn view-btn"
                                        disabled={!canViewSigned}
                                        onClick={() => handleViewSignedAgreement(selectedAgreementDetails)}
                                    >
                                        {agreementActionLoading === `signed-${selectedAgreementDetails?.agreementId}` ? (
                                            <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                        ) : (
                                            <FaEye aria-hidden="true" />
                                        )}
                                        View Signed
                                    </button>

                                    <button
                                        type="button"
                                        className="document-action-btn download-btn"
                                        disabled={!canDownloadSigned}
                                        onClick={() => handleDownloadSignedAgreement(selectedAgreementDetails)}
                                    >
                                        {agreementDownloadLoading === selectedAgreementDetails?.agreementId ? (
                                            <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                        ) : (
                                            <FaDownload aria-hidden="true" />
                                        )}
                                        Download Signed
                                    </button>

                                    <button
                                        type="button"
                                        className="document-action-btn download-btn"
                                        disabled={!canSubmitAgreement || signingAgreement}
                                        onClick={handleSubmitSignature}

                                    >
                                        {signingAgreement ? (
                                            <>
                                                <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <FaFileAlt aria-hidden="true" />
                                                Submit Agreement
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )
            }

            {
                showDeleteModal && selectedDeleteDocument && (
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
                )
            }

            <DocumentPreviewModal
                open={Boolean(previewDocument)}
                document={previewDocument}
                onClose={() => setPreviewDocument(null)}
            />

            <div className="documents-footer">
                <div className="progress-info">
                    {isAgreementCategory
                        ? `Employee Agreements (${normalizedAgreementList.length})`
                        : `Uploaded Documents (${documentCount})`}
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
                            (agreementCategory === "documents" && documentCount === 0) ||
                            loading ||
                            uploading ||
                            agreementLoading ||
                            signingAgreement ||
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
        </div >
    );
};
export default Documents;