import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toastError } from "@/components/common/toast/toastService";
import { getOfferLetterApiErrorMessage } from "../services/offerLetterService";

const SENT_STATUS_VALUES = new Set([
  "true",
  "1",
  "yes",
  "sent",
  "already sent",
  "mail sent",
  "email sent",
  "delivered",
  "completed",
  "processed",
  "success",
]);

const UNSENT_STATUS_VALUES = new Set([
  "false",
  "0",
  "no",
  "pending",
  "unsent",
  "not sent",
  "draft",
  "generated",
  "created",
  "queued",
  "processing",
]);

const STATUS_KEYS = [
  "isSent",
  "sent",
  "sentStatus",
  "status",
  "state",
  "sendStatus",
  "alreadySent",
  "isAlreadySent",
];

const SENT_DATE_KEYS = [
  "sentDate",
  "sentAt",
  "sentOn",
  "mailSentOn",
  "emailSentOn",
  "deliveryDate",
  "deliveredOn",
  "lastSentAt",
  "lastSentDate",
];

const TEXT_KEYS = [
  "message",
  "Message",
  "error",
  "Error",
  "title",
  "Title",
  "detail",
  "Detail",
  "statusMessage",
  "stateMessage",
  "description",
];

const WRAPPER_KEYS = ["data", "result", "item", "record", "payload", "value"];

const normalizeId = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || "";
};

const normalizeStatusText = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || "";
};

const isRecordLike = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof Blob);

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return Boolean(value.trim());
  }

  return true;
};

const extractPrimitiveStatus = (value) => {
  if (typeof value === "boolean") {
    return {
      status: value ? "sent" : "not_sent",
      isSent: value,
      rawStatus: value,
    };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const isSent = value !== 0;

    return {
      status: isSent ? "sent" : "not_sent",
      isSent,
      rawStatus: value,
    };
  }

  const normalized = normalizeStatusText(value);

  if (!normalized) {
    return {
      status: "unknown",
      isSent: false,
      rawStatus: value,
    };
  }

  if (SENT_STATUS_VALUES.has(normalized)) {
    return {
      status: "sent",
      isSent: true,
      rawStatus: value,
    };
  }

  if (UNSENT_STATUS_VALUES.has(normalized)) {
    return {
      status: "not_sent",
      isSent: false,
      rawStatus: value,
    };
  }

  return {
    status: "unknown",
    isSent: false,
    rawStatus: value,
  };
};

const mergeStatusResult = (result = {}, overrides = {}) => ({
  status: result.status || "unknown",
  isSent: Boolean(result.isSent),
  rawStatus: result.rawStatus,
  lastSentAt: result.lastSentAt || "",
  statusText: result.statusText || "",
  error: result.error || "",
  ...overrides,
});

const extractSendStatus = (payload, seen = new WeakSet()) => {
  if (payload === null || payload === undefined) {
    return mergeStatusResult();
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const result = extractSendStatus(item, seen);

      if (result.status !== "unknown") {
        return result;
      }
    }

    return mergeStatusResult();
  }

  if (!isRecordLike(payload)) {
    return extractPrimitiveStatus(payload);
  }

  if (seen.has(payload)) {
    return mergeStatusResult();
  }

  seen.add(payload);

  for (const key of STATUS_KEYS) {
    if (!(key in payload) || !hasMeaningfulValue(payload[key])) {
      continue;
    }

    const result = extractSendStatus(payload[key], seen);

    if (result.status !== "unknown") {
      return mergeStatusResult(result, {
        rawStatus: payload[key],
      });
    }
  }

  for (const key of SENT_DATE_KEYS) {
    if (hasMeaningfulValue(payload[key])) {
      return mergeStatusResult(
        {
          status: "sent",
          isSent: true,
          rawStatus: payload[key],
          lastSentAt: String(payload[key]),
        },
        {
          lastSentAt: String(payload[key]),
        }
      );
    }
  }

  for (const key of TEXT_KEYS) {
    if (!hasMeaningfulValue(payload[key])) {
      continue;
    }

    const result = extractPrimitiveStatus(payload[key]);

    if (result.status !== "unknown") {
      return mergeStatusResult(result, {
        statusText: String(payload[key]),
      });
    }
  }

  for (const key of WRAPPER_KEYS) {
    if (!(key in payload) || payload[key] === null || payload[key] === undefined) {
      continue;
    }

    const result = extractSendStatus(payload[key], seen);

    if (result.status !== "unknown") {
      return result;
    }
  }

  for (const value of Object.values(payload)) {
    if (!isRecordLike(value) && !Array.isArray(value)) {
      continue;
    }

    const result = extractSendStatus(value, seen);

    if (result.status !== "unknown") {
      return result;
    }
  }

  return mergeStatusResult();
};

const resolveDocumentLabel = (label) =>
  String(label || "Document").trim() || "Document";

const isAbortLikeError = (error, signal) =>
  Boolean(signal?.aborted) ||
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

export const useDocumentSendStatus = ({
  documents = [],
  getDocumentId,
  fetchSendStatus,
  documentLabel = "Document",
  errorLabel,
  onError,
} = {}) => {
  const [statusById, setStatusById] = useState({});
  const [loadingById, setLoadingById] = useState({});
  const requestVersionByIdRef = useRef(new Map());
  const bulkRequestVersionRef = useRef(0);

  const normalizedDocumentLabel = useMemo(
    () => resolveDocumentLabel(documentLabel),
    [documentLabel]
  );

  const normalizedErrorLabel = useMemo(
    () => String(errorLabel || normalizedDocumentLabel).trim() || "Document",
    [errorLabel, normalizedDocumentLabel]
  );

  const extractDocumentId = useCallback(
    (document) => normalizeId(getDocumentId?.(document)),
    [getDocumentId]
  );

  const markDocumentLoading = useCallback((documentId, isLoading) => {
    const normalizedId = normalizeId(documentId);

    if (!normalizedId) {
      return;
    }

    setLoadingById((prev) => {
      const next = { ...prev };

      if (isLoading) {
        next[normalizedId] = true;
      } else {
        delete next[normalizedId];
      }

      return next;
    });
  }, []);

  const setDocumentStatus = useCallback((documentId, nextStatus) => {
    const normalizedId = normalizeId(documentId);

    if (!normalizedId) {
      return;
    }

    setStatusById((prev) => ({
      ...prev,
      [normalizedId]: mergeStatusResult(prev[normalizedId], nextStatus),
    }));
  }, []);

  const isDocumentSent = useCallback(
    (document) => {
      const documentId = extractDocumentId(document);
      return Boolean(statusById[documentId]?.isSent || statusById[documentId]?.status === "sent");
    },
    [extractDocumentId, statusById]
  );

  const isDocumentLoading = useCallback(
    (document) => {
      const documentId = extractDocumentId(document);
      return Boolean(loadingById[documentId]);
    },
    [extractDocumentId, loadingById]
  );

  const getDocumentStatus = useCallback(
    (document) => {
      const documentId = extractDocumentId(document);
      return (
        statusById[documentId] ||
        mergeStatusResult({
          status: "unknown",
          isSent: false,
          rawStatus: "",
          lastSentAt: "",
          statusText: "",
          error: "",
        })
      );
    },
    [extractDocumentId, statusById]
  );

  const readDocumentSendStatus = useCallback(
    async (
      document,
      {
        markLoading = true,
        updateState = true,
        signal,
      } = {}
    ) => {
      const documentId = extractDocumentId(document);

      if (!documentId) {
        return null;
      }

      const requestVersion =
        (requestVersionByIdRef.current.get(documentId) || 0) + 1;

      requestVersionByIdRef.current.set(documentId, requestVersion);

      if (markLoading) {
        markDocumentLoading(documentId, true);
      }

      try {
        const response = await fetchSendStatus?.(document, {
          signal,
          dedupe: false,
        });

        const rawPayload = response?.data ?? response;
        const statusState = extractSendStatus(rawPayload);

        if (requestVersionByIdRef.current.get(documentId) !== requestVersion) {
          return {
            documentId,
            requestVersion,
            statusState,
          };
        }

        if (updateState) {
          setDocumentStatus(documentId, statusState);
        }

        return {
          documentId,
          requestVersion,
          statusState,
        };
      } catch (error) {
        if (isAbortLikeError(error, signal)) {
          return null;
        }

        error.__documentSendStatusRequestVersion = requestVersion;
        error.__documentSendStatusDocumentId = documentId;

        const message = await getOfferLetterApiErrorMessage(
          error,
          `Unable to load ${normalizedErrorLabel.toLowerCase()} send status.`,
          normalizedErrorLabel
        );

        if (updateState) {
          setDocumentStatus(documentId, {
            status: "unknown",
            isSent: false,
            rawStatus: "",
            lastSentAt: "",
            statusText: "",
            error: message,
          });
        }

        throw error;
      } finally {
        if (markLoading && requestVersionByIdRef.current.get(documentId) === requestVersion) {
          markDocumentLoading(documentId, false);
        }
      }
    },
    [
      extractDocumentId,
      fetchSendStatus,
      markDocumentLoading,
      normalizedErrorLabel,
      setDocumentStatus,
    ]
  );

  const refreshDocumentSendStatus = useCallback(
    async (document, options = {}) =>
      readDocumentSendStatus(document, {
        markLoading: options.markLoading ?? true,
        updateState: options.updateState ?? true,
        signal: options.signal,
      }),
    [readDocumentSendStatus]
  );

  const refreshDocumentsSendStatus = useCallback(
    async (targetDocuments = documents, options = {}) => {
      const list = Array.isArray(targetDocuments) ? targetDocuments : [];
      const normalizedDocuments = list
        .map((document) => {
          const documentId = extractDocumentId(document);
          return documentId ? { document, documentId } : null;
        })
        .filter(Boolean);

      if (normalizedDocuments.length === 0) {
        setStatusById({});
        setLoadingById({});
        return [];
      }

      bulkRequestVersionRef.current += 1;
      const bulkVersion = bulkRequestVersionRef.current;
      const controller = new AbortController();

      setLoadingById((prev) => {
        const next = { ...prev };

        normalizedDocuments.forEach(({ documentId }) => {
          next[documentId] = true;
        });

        return next;
      });

      const results = await Promise.allSettled(
        normalizedDocuments.map(({ document }) =>
          readDocumentSendStatus(document, {
            markLoading: false,
            updateState: false,
            signal: controller.signal,
          })
        )
      );

      if (bulkRequestVersionRef.current !== bulkVersion) {
        return results;
      }

      const nextStatusById = {};
      const loadingIdsToClear = new Set();
      let firstError = null;

      results.forEach((result, index) => {
        const { documentId } = normalizedDocuments[index];
        const currentVersion =
          requestVersionByIdRef.current.get(documentId) || 0;

        if (result.status === "fulfilled" && result.value?.statusState) {
          if (currentVersion === result.value.requestVersion) {
            nextStatusById[documentId] = result.value.statusState;
            loadingIdsToClear.add(documentId);
          }
          return;
        }

        const rejectedVersion =
          result.reason?.__documentSendStatusRequestVersion || 0;

        if (result.status === "rejected" && currentVersion === rejectedVersion) {
          loadingIdsToClear.add(documentId);
        }

        if (!firstError && currentVersion === rejectedVersion) {
          firstError = result.reason;
        }
      });

      setStatusById((prev) => {
        const next = { ...prev };

        Object.entries(nextStatusById).forEach(([documentId, statusState]) => {
          next[documentId] = mergeStatusResult(next[documentId], statusState);
        });

        return next;
      });

      setLoadingById((prev) => {
        const next = { ...prev };

        loadingIdsToClear.forEach((documentId) => {
          delete next[documentId];
        });

        return next;
      });

      if (firstError && options.suppressErrors !== true) {
        const message = await getOfferLetterApiErrorMessage(
          firstError,
          `Unable to load ${normalizedErrorLabel.toLowerCase()} send status.`,
          normalizedErrorLabel
        );

        toastError(message);

        if (typeof onError === "function") {
          onError(firstError, message);
        }
      }

      return results;
    },
    [
      documents,
      extractDocumentId,
      normalizedErrorLabel,
      onError,
      readDocumentSendStatus,
    ]
  );

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!active) {
        return;
      }

      await refreshDocumentsSendStatus(documents, {
        suppressErrors: false,
      });
    };

    run();

    return () => {
      active = false;
      bulkRequestVersionRef.current += 1;
    };
  }, [documents, refreshDocumentsSendStatus]);

  return {
    statusById,
    loadingById,
    isDocumentSent,
    isDocumentLoading,
    getDocumentStatus,
    refreshDocumentSendStatus,
    refreshDocumentsSendStatus,
    setDocumentStatus,
    markDocumentLoading,
    documentLabel: normalizedDocumentLabel,
  };
};

export default useDocumentSendStatus;
