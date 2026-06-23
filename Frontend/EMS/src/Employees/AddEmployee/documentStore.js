import { parseDate } from "../../utils/date";

const DB_NAME = "ems_add_employee_documents";
const DB_VERSION = 1;
const STORE_NAME = "documents";
const GENERIC_DOCUMENT_TYPE_LABEL = "Document";

const isIndexedDbAvailable = () =>
  typeof window !== "undefined" && "indexedDB" in window;

const toSafeString = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || fallback;
};

const normalizeLower = (value) => toSafeString(value).toLowerCase();

const hasMeaningfulDocumentType = (value) => {
  const normalizedValue = toSafeString(value);

  if (!normalizedValue) {
    return false;
  }

  return normalizeLower(normalizedValue) !== GENERIC_DOCUMENT_TYPE_LABEL.toLowerCase();
};

export const normalizeDocumentTypeKey = (value) => normalizeLower(value);

const isGenericDocumentRecord = (document = {}) =>
  !hasMeaningfulDocumentType(
    document.documentType ||
      document.documentTypeName ||
      document.document_type ||
      document.category ||
      document.type
  );

const getDocumentFileIdentityKey = (document = {}) => {
  const normalizedDocument = normalizeDocumentRecord(document);
  const fileName = normalizeLower(normalizedDocument.fileName);
  const fileSize = String(Number(normalizedDocument.size || 0));

  if (!fileName) {
    return "";
  }

  return `${fileName}|${fileSize}`;
};

const createFallbackKey = (employeeKey, document) => {
  const seed = [
    employeeKey,
    toSafeString(document.fileName || document.file_Name),
    toSafeString(document.documentType),
    toSafeString(document.fileType),
    String(document.size || document.fileSize || 0),
    String(document.uploadedAt || document.createdAt || Date.now()),
  ].join("|");

  return `doc_${btoa(unescape(encodeURIComponent(seed))).replace(/=+$/g, "")}`;
};

const getTimestamp = (value) => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.getTime() : Number.NaN;
};

const getDocumentServerId = (document = {}) =>
  document.serverId ??
  document.id ??
  document.documentId ??
  document.employeeDocumentId ??
  null;

const getDocumentFileName = (document = {}) =>
  toSafeString(
    document.file_Name ||
    document.fileName ||
    document.name ||
    document.originalFileName ||
    document.originalName
  );

const getDocumentType = (document = {}) =>
  toSafeString(
    document.documentType ||
    document.documentTypeName ||
    document.document_type ||
    document.category ||
    document.type
  );

const getDocumentFileType = (document = {}, fileName = "") =>
  toSafeString(
    document.fileType ||
    document.mimeType ||
    document.contentType ||
    document.fileMimeType ||
    (fileName.includes(".") ? fileName.split(".").pop() : "")
  );

const getDocumentSize = (document = {}) =>
  Number(
    document.size ??
    document.fileSize ??
    document.file_Size ??
    document.file_size ??
    0
  ) || 0;

const getDocumentUploadedAt = (document = {}) =>
  document.uploadedAt ||
  document.createdAt ||
  document.uploadDate ||
  document.created_At ||
  document.updatedAt ||
  "";

const getDocumentFileUrl = (document = {}) =>
  toSafeString(
    document.fileUrl ||
    document.url ||
    document.fileURL ||
    document.downloadUrl ||
    document.downloadURL ||
    ""
  );

const getDocumentLastModified = (document = {}) =>
  Number(document.lastModified ?? document.fileLastModified ?? 0) || 0;

const getDocumentIdentitySignatures = (document = {}) => {
  const normalizedDocument = normalizeDocumentRecord(document);
  const signatures = new Set();

  if (normalizedDocument.serverId) {
    signatures.add(`server:${normalizeLower(normalizedDocument.serverId)}`);
  }

  if (normalizedDocument.cacheKey) {
    signatures.add(`cache:${normalizeLower(normalizedDocument.cacheKey)}`);
  }

  if (normalizedDocument.fileName && normalizedDocument.documentType) {
    signatures.add(
      `type-file-size:${normalizeLower(normalizedDocument.documentType)}|${normalizeLower(normalizedDocument.fileName)}|${String(Number(normalizedDocument.size || 0))}`
    );
  }

  return Array.from(signatures);
};

export const areDocumentRecordsEquivalent = (left = {}, right = {}) => {
  const leftNormalized = normalizeDocumentRecord(left);
  const rightNormalized = normalizeDocumentRecord(right);

  if (
    leftNormalized.serverId &&
    rightNormalized.serverId &&
    String(leftNormalized.serverId) === String(rightNormalized.serverId)
  ) {
    return true;
  }

  if (
    leftNormalized.cacheKey &&
    rightNormalized.cacheKey &&
    leftNormalized.cacheKey === rightNormalized.cacheKey
  ) {
    return true;
  }

  const leftSignatures = new Set(getDocumentIdentitySignatures(leftNormalized));

  return getDocumentIdentitySignatures(rightNormalized).some((signature) =>
    leftSignatures.has(signature)
  );
};

const isGenericPlaceholderMatch = (storedDocument = {}, targetDocument = {}) => {
  const storedNormalized = normalizeDocumentRecord(storedDocument);
  const targetNormalized = normalizeDocumentRecord(targetDocument);

  if (!isGenericDocumentRecord(storedNormalized)) {
    return false;
  }

  const storedKey = getDocumentFileIdentityKey(storedNormalized);
  const targetKey = getDocumentFileIdentityKey(targetNormalized);

  return Boolean(storedKey && targetKey && storedKey === targetKey);
};

const pickPreferredTextValue = (currentValue, candidateValue) => {
  const normalizedCurrentValue = toSafeString(currentValue);
  const normalizedCandidateValue = toSafeString(candidateValue);

  if (!normalizedCurrentValue && normalizedCandidateValue) {
    return normalizedCandidateValue;
  }

  if (hasMeaningfulDocumentType(normalizedCandidateValue) && !hasMeaningfulDocumentType(normalizedCurrentValue)) {
    return normalizedCandidateValue;
  }

  return normalizedCurrentValue || normalizedCandidateValue;
};

const pickPreferredDocumentType = (currentValue, candidateValue) => {
  const normalizedCurrentValue = toSafeString(currentValue);
  const normalizedCandidateValue = toSafeString(candidateValue);
  const currentIsMeaningful = hasMeaningfulDocumentType(normalizedCurrentValue);
  const candidateIsMeaningful = hasMeaningfulDocumentType(normalizedCandidateValue);

  if (candidateIsMeaningful && !currentIsMeaningful) {
    return normalizedCandidateValue;
  }

  if (currentIsMeaningful && !candidateIsMeaningful) {
    return normalizedCurrentValue;
  }

  if (currentIsMeaningful && candidateIsMeaningful) {
    return normalizedCurrentValue || normalizedCandidateValue;
  }

  return normalizedCurrentValue || normalizedCandidateValue || GENERIC_DOCUMENT_TYPE_LABEL;
};

const pickPreferredNumber = (currentValue, candidateValue) => {
  const currentNumber = Number(currentValue) || 0;
  const candidateNumber = Number(candidateValue) || 0;

  if (currentNumber > 0) {
    return currentNumber;
  }

  if (candidateNumber > 0) {
    return candidateNumber;
  }

  return 0;
};

const pickPreferredUploadedAt = (currentValue, candidateValue) => {
  const currentTimestamp = getTimestamp(currentValue);
  const candidateTimestamp = getTimestamp(candidateValue);

  if (Number.isFinite(currentTimestamp)) {
    return currentValue;
  }

  if (Number.isFinite(candidateTimestamp)) {
    return candidateValue;
  }

  return toSafeString(currentValue) || candidateValue || "";
};

const pickPreferredSource = (currentValue, candidateValue) => {
  if (currentValue === "server" || candidateValue === "server") {
    return "server";
  }

  return currentValue || candidateValue || "local";
};

const compareDocumentRichness = (left, right) => {
  const scoreLeft = getDocumentRichnessScore(left);
  const scoreRight = getDocumentRichnessScore(right);

  if (scoreLeft !== scoreRight) {
    return scoreRight - scoreLeft;
  }

  const leftSourcePriority = Number(left?.sourcePriority || 0);
  const rightSourcePriority = Number(right?.sourcePriority || 0);

  if (leftSourcePriority !== rightSourcePriority) {
    return rightSourcePriority - leftSourcePriority;
  }

  const leftTime = Number.isFinite(left?.uploadedAtTimestamp)
    ? left.uploadedAtTimestamp
    : 0;
  const rightTime = Number.isFinite(right?.uploadedAtTimestamp)
    ? right.uploadedAtTimestamp
    : 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return Number(left?.inputIndex || 0) - Number(right?.inputIndex || 0);
};

const getDocumentRichnessScore = (document = {}) => {
  const normalizedDocument = normalizeDocumentRecord(document);
  let score = 0;

  if (normalizedDocument.serverId) {
    score += 20;
  }

  if (normalizedDocument.cacheKey) {
    score += 6;
  }

  if (normalizedDocument.fileName) {
    score += 10;
  }

  if (normalizedDocument.fileType) {
    score += 8;
  }

  if (Number(normalizedDocument.size) > 0) {
    score += 8;
  }

  if (Number.isFinite(normalizedDocument.uploadedAtTimestamp)) {
    score += 10;
  }

  if (normalizedDocument.fileUrl || normalizedDocument.downloadUrl) {
    score += 12;
  }

  if (normalizedDocument.blob instanceof Blob) {
    score += 8;
  }

  if (hasMeaningfulDocumentType(normalizedDocument.documentType)) {
    score += 16;
  }

  if (normalizedDocument.source === "server") {
    score += 4;
  }

  if (Number(normalizedDocument.lastModified) > 0) {
    score += 4;
  }

  return score;
};

const mergeDocumentPair = (currentDocument = {}, candidateDocument = {}) => {
  const current = normalizeDocumentRecord(currentDocument);
  const candidate = normalizeDocumentRecord(candidateDocument);

  const merged = {
    ...current,
    ...candidate,
    cacheKey:
      current.cacheKey ||
      candidate.cacheKey ||
      createFallbackKey(current.employeeKey || candidate.employeeKey, {
        fileName: current.fileName || candidate.fileName,
        documentType: current.documentType || candidate.documentType,
        fileType: current.fileType || candidate.fileType,
        size: current.size || candidate.size,
        uploadedAt: current.uploadedAt || candidate.uploadedAt,
      }),
    employeeKey: current.employeeKey || candidate.employeeKey,
    serverId: current.serverId || candidate.serverId || null,
    documentType: pickPreferredDocumentType(
      current.documentType,
      candidate.documentType
    ),
    fileName: pickPreferredTextValue(current.fileName, candidate.fileName),
    fileType: pickPreferredTextValue(current.fileType, candidate.fileType),
    size: pickPreferredNumber(current.size, candidate.size),
    uploadedAt: pickPreferredUploadedAt(
      current.uploadedAt,
      candidate.uploadedAt
    ),
    fileUrl: pickPreferredTextValue(current.fileUrl, candidate.fileUrl),
    downloadUrl: pickPreferredTextValue(
      current.downloadUrl,
      candidate.downloadUrl || candidate.fileUrl
    ),
    blob: current.blob || candidate.blob || null,
    source: pickPreferredSource(current.source, candidate.source),
    lastModified: pickPreferredNumber(
      current.lastModified,
      candidate.lastModified
    ),
  };

  merged.uploadedAtTimestamp = getTimestamp(merged.uploadedAt);
  merged.fileSize = merged.size;
  merged.documentTypeIsGeneric = !hasMeaningfulDocumentType(merged.documentType);
  delete merged.sourcePriority;
  delete merged.inputIndex;

  return merged;
};

const mergeDocumentGroup = (documents = []) => {
  if (documents.length === 0) {
    return null;
  }

  const sortedDocuments = [...documents].sort(compareDocumentRichness);
  const [firstDocument, ...remainingDocuments] = sortedDocuments;

  return remainingDocuments.reduce(
    (mergedDocument, candidateDocument) =>
      mergeDocumentPair(mergedDocument, candidateDocument),
    firstDocument
  );
};

const createUnionFind = (size) => {
  const parent = Array.from({ length: size }, (_, index) => index);
  const rank = Array.from({ length: size }, () => 0);

  const find = (index) => {
    if (parent[index] !== index) {
      parent[index] = find(parent[index]);
    }

    return parent[index];
  };

  const union = (leftIndex, rightIndex) => {
    const leftRoot = find(leftIndex);
    const rightRoot = find(rightIndex);

    if (leftRoot === rightRoot) {
      return;
    }

    if (rank[leftRoot] < rank[rightRoot]) {
      parent[leftRoot] = rightRoot;
      return;
    }

    if (rank[leftRoot] > rank[rightRoot]) {
      parent[rightRoot] = leftRoot;
      return;
    }

    parent[rightRoot] = leftRoot;
    rank[leftRoot] += 1;
  };

  return {
    find,
    union,
  };
};

const openDatabase = () => {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "cacheKey",
        });

        store.createIndex("employeeKey", "employeeKey", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const extractDocumentRecords = (responseData) => {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.documents)) {
    return responseData.documents;
  }

  if (Array.isArray(responseData?.data?.documents)) {
    return responseData.data.documents;
  }

  if (responseData?.document) {
    return [responseData.document];
  }

  if (responseData?.data?.document) {
    return [responseData.data.document];
  }

  if (responseData && typeof responseData === "object") {
    return [responseData];
  }

  return [];
};

export const formatDocumentSize = (size) => {
  const numericSize = Number(size);

  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    return "-";
  }

  if (numericSize < 1024) {
    return `${numericSize} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = numericSize / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

export const normalizeDocumentRecord = (
  document = {},
  employeeKey = ""
) => {
  const fileName = getDocumentFileName(document);
  const documentType = getDocumentType(document);
  const fileType = getDocumentFileType(document, fileName);
  const size = getDocumentSize(document);
  const uploadedAt = getDocumentUploadedAt(document);
  const fileUrl = getDocumentFileUrl(document);
  const downloadUrl = toSafeString(
    document.downloadUrl ||
    document.downloadURL ||
    fileUrl
  );
  const blob = document.blob instanceof Blob ? document.blob : null;
  const serverId = getDocumentServerId(document);
  const cacheKey =
    toSafeString(
      document.cacheKey ||
      document.localId ||
      serverId ||
      document.documentId ||
      document.employeeDocumentId
    ) ||
    createFallbackKey(employeeKey, {
      fileName,
      documentType,
      fileType,
      size,
      uploadedAt,
      lastModified: getDocumentLastModified(document),
    });
  const normalizedEmployeeKey = toSafeString(
    document.employeeKey || employeeKey
  );
  const lastModified = getDocumentLastModified(document);

  return {
    ...document,
    cacheKey,
    employeeKey: normalizedEmployeeKey,
    serverId: serverId ? String(serverId) : null,
    documentType: documentType || GENERIC_DOCUMENT_TYPE_LABEL,
    fileName,
    fileType,
    size,
    fileSize: size,
    uploadedAt,
    uploadedAtTimestamp: getTimestamp(uploadedAt),
    fileUrl,
    downloadUrl,
    blob,
    lastModified,
    source: document.source || (blob ? "local" : "server"),
    documentTypeIsGeneric: !hasMeaningfulDocumentType(documentType),
  };
};

export const mergeDocumentRecords = (
  serverDocuments = [],
  cachedDocuments = []
) => {
  const normalizedDocuments = [
    ...serverDocuments.map((document, inputIndex) => ({
      ...normalizeDocumentRecord(document),
      sourcePriority: 2,
      inputIndex,
    })),
    ...cachedDocuments.map((document, inputIndex) => ({
      ...normalizeDocumentRecord(document),
      sourcePriority: 1,
      inputIndex: serverDocuments.length + inputIndex,
    })),
  ];

  if (normalizedDocuments.length === 0) {
    return [];
  }

  const { find, union } = createUnionFind(normalizedDocuments.length);
  const signatureMap = new Map();

  normalizedDocuments.forEach((document, documentIndex) => {
    getDocumentIdentitySignatures(document).forEach((signature) => {
      if (signatureMap.has(signature)) {
        union(documentIndex, signatureMap.get(signature));
        return;
      }

      signatureMap.set(signature, documentIndex);
    });
  });

  const groupedDocuments = new Map();

  normalizedDocuments.forEach((document, documentIndex) => {
    const rootIndex = find(documentIndex);

    if (!groupedDocuments.has(rootIndex)) {
      groupedDocuments.set(rootIndex, []);
    }

    groupedDocuments.get(rootIndex).push(document);
  });

  return Array.from(groupedDocuments.values())
    .map((documents) => mergeDocumentGroup(documents))
    .filter(Boolean)
    .filter((document, _, allDocuments) => {
      if (!isGenericDocumentRecord(document)) {
        return true;
      }

      const fileIdentityKey = getDocumentFileIdentityKey(document);

      return !allDocuments.some(
        (candidate) =>
          candidate !== document &&
          !isGenericDocumentRecord(candidate) &&
          getDocumentFileIdentityKey(candidate) === fileIdentityKey
      );
    })
    .map((document) => {
      const cleanDocument = { ...document };
      delete cleanDocument.sourcePriority;
      delete cleanDocument.inputIndex;
      return cleanDocument;
    })
    .sort((left, right) => {
      const leftTime = Number.isFinite(left.uploadedAtTimestamp)
        ? left.uploadedAtTimestamp
        : 0;
      const rightTime = Number.isFinite(right.uploadedAtTimestamp)
        ? right.uploadedAtTimestamp
        : 0;

      return rightTime - leftTime;
    });
};

const readAllStoredDocuments = async (db, employeeKey) => {
  if (!db || !employeeKey) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("employeeKey");
    const request = index.getAll(employeeKey);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => reject(request.error);
  });
};

const writeStoredDocument = async (db, document) => {
  if (!db) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(document);

    request.onsuccess = () => resolve(document);
    request.onerror = () => reject(request.error);
  });
};

const removeStoredDocumentByKey = async (db, cacheKey) => {
  if (!db || !cacheKey) {
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(cacheKey);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const loadStoredDocuments = async (employeeKey) => {
  const normalizedEmployeeKey = toSafeString(employeeKey);

  if (!normalizedEmployeeKey) {
    return [];
  }

  const db = await openDatabase();

  if (!db) {
    return [];
  }

  const storedDocuments = await readAllStoredDocuments(
    db,
    normalizedEmployeeKey
  );

  return mergeDocumentRecords(storedDocuments, []);
};

export const saveStoredDocument = async (employeeKey, document) => {
  const normalizedEmployeeKey = toSafeString(employeeKey);

  if (!normalizedEmployeeKey) {
    return null;
  }

  const db = await openDatabase();

  if (!db) {
    return null;
  }

  const normalizedDocument = normalizeDocumentRecord(
    {
      ...document,
      employeeKey: normalizedEmployeeKey,
    },
    normalizedEmployeeKey
  );

  const storedDocuments = await readAllStoredDocuments(
    db,
    normalizedEmployeeKey
  );

  const matchingDocuments = storedDocuments.filter((storedDocument) =>
    areDocumentRecordsEquivalent(storedDocument, normalizedDocument) ||
    isGenericPlaceholderMatch(storedDocument, normalizedDocument)
  );

  await Promise.all(
    matchingDocuments.map((storedDocument) =>
      removeStoredDocumentByKey(db, storedDocument.cacheKey)
    )
  );

  await writeStoredDocument(db, normalizedDocument);
  return normalizedDocument;
};

export const saveStoredDocuments = async (employeeKey, documents = []) => {
  const normalizedEmployeeKey = toSafeString(employeeKey);

  if (!normalizedEmployeeKey || !Array.isArray(documents)) {
    return [];
  }

  const db = await openDatabase();

  if (!db) {
    return [];
  }

  const normalizedDocuments = documents.map((document) =>
    normalizeDocumentRecord(
      {
        ...document,
        employeeKey: normalizedEmployeeKey,
      },
      normalizedEmployeeKey
    )
  );

  for (const document of normalizedDocuments) {
    await saveStoredDocument(normalizedEmployeeKey, document);
  }

  return normalizedDocuments;
};

export const removeStoredDocument = async (
  employeeKey,
  targetDocument
) => {
  const normalizedEmployeeKey = toSafeString(employeeKey);

  if (!normalizedEmployeeKey) {
    return null;
  }

  const db = await openDatabase();

  if (!db) {
    return null;
  }

  const storedDocuments = await readAllStoredDocuments(
    db,
    normalizedEmployeeKey
  );

  const normalizedTarget = normalizeDocumentRecord(
    targetDocument,
    normalizedEmployeeKey
  );

  const matches = storedDocuments.filter((document) =>
    areDocumentRecordsEquivalent(document, normalizedTarget) ||
    isGenericPlaceholderMatch(document, normalizedTarget)
  );

  if (matches.length === 0) {
    return null;
  }

  await Promise.all(
    matches.map((document) => removeStoredDocumentByKey(db, document.cacheKey))
  );

  return mergeDocumentRecords(matches, [normalizedTarget])[0] || normalizeDocumentRecord(matches[0], normalizedEmployeeKey);
};
