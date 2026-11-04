const COLLECTION_KEYS = [
  "data",
  "items",
  "records",
  "result",
  "results",
  "letters",
  "offerLetters",
  "relievingLetters",
  "statuses",
  "sendStatuses",
  "sentOfferLetterIds",
  "sentRelievingLetterIds",
  "sentEmployeeIds",
  "ids",
  "rows",
  "$values",
];

const DEFAULT_SENT_VALUES = [
  "true",
  "1",
  "yes",
  "sent",
  "sent to employee",
  "mail sent",
  "email sent",
  "already sent",
  "delivered",
  "completed",
  "processed",
  "success",
];

const DEFAULT_UNSENT_VALUES = [
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
];

const DEFAULT_STATUS_KEYS = [
  "isSent",
  "sent",
  "sentStatus",
  "status",
  "state",
];

const DEFAULT_SENT_DATE_KEYS = [
  "sentDate",
  "sentAt",
  "sentOn",
  "mailSentOn",
  "emailSentOn",
  "deliveryDate",
  "deliveredOn",
];

const isRecordLike = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date);

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return Boolean(value.trim());
  }

  return true;
};

const getFirstPresentValue = (record, keys) => {
  for (const key of keys) {
    if (!(key in record)) {
      continue;
    }

    const value = record[key];

    if (!hasMeaningfulValue(value)) {
      continue;
    }

    return value;
  }

  return undefined;
};

const normalizeLookupValue = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.toLowerCase() : "";
};

const collectCandidates = (value, seen = new WeakSet(), depth = 0) => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return [value];
  }

  if (!isRecordLike(value)) {
    return [value];
  }

  if (seen.has(value) || depth > 4) {
    return [];
  }

  seen.add(value);

  const candidates = [value];

  COLLECTION_KEYS.forEach((key) => {
    const nestedValue = value[key];

    if (nestedValue && (Array.isArray(nestedValue) || isRecordLike(nestedValue))) {
      candidates.push(...collectCandidates(nestedValue, seen, depth + 1));
    }
  });

  return candidates;
};

const getFallbackIdentifierValues = (record) =>
  Object.entries(record).flatMap(([key, value]) => {
    if (!hasMeaningfulValue(value)) {
      return [];
    }

    if (/(^|_|-)?id$/i.test(key) || /employee.*id$/i.test(key)) {
      return [value];
    }

    return [];
  });

const recordHasStatusField = (record, statusKeys, sentDateKeys) =>
  statusKeys.some((key) => key in record) ||
  sentDateKeys.some((key) => key in record);

export const normalizeLetterStatusKey = normalizeLookupValue;
export const normalizeDocumentStatusKey = normalizeLookupValue;

export const buildLetterSendStatusLookup = (payload, options = {}) => {
  const idKeys = options.idKeys ?? [
    "id",
    "offerLetterId",
    "offer_letter_id",
    "offerLetterID",
    "letterId",
  ];
  const employeeIdKeys = options.employeeIdKeys ?? [
    "employeeId",
    "employee_Id",
    "employee_id",
    "employeeID",
    "employeeCode",
  ];
  const statusKeys = options.statusKeys ?? DEFAULT_STATUS_KEYS;
  const sentDateKeys = options.sentDateKeys ?? DEFAULT_SENT_DATE_KEYS;
  const sentValues = new Set(
    (options.sentValues ?? DEFAULT_SENT_VALUES).map(normalizeLookupValue)
  );
  const unsentValues = new Set(
    (options.unsentValues ?? DEFAULT_UNSENT_VALUES).map(normalizeLookupValue)
  );
  const includeFallbackIdentifiers =
    options.includeFallbackIdentifiers ?? true;

  const lookup = new Set();
  const addLookupValue = (value) => {
    const normalizedValue = normalizeLookupValue(value);

    if (normalizedValue) {
      lookup.add(normalizedValue);
    }
  };

  const processRecord = (record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      if (hasMeaningfulValue(record)) {
        addLookupValue(record);
      }

      return;
    }

    const statusValues = statusKeys
      .map((key) => record[key])
      .filter(hasMeaningfulValue)
      .map(normalizeLookupValue);

    if (statusValues.some((value) => unsentValues.has(value))) {
      return;
    }

    const hasExplicitSentState =
      statusValues.some((value) => sentValues.has(value)) ||
      sentDateKeys.some((key) => hasMeaningfulValue(record[key]));

    const primaryIdentifier = getFirstPresentValue(record, idKeys);
    const employeeIdentifier = getFirstPresentValue(record, employeeIdKeys);
    const fallbackIdentifiers = getFallbackIdentifierValues(record);
    const recordLooksLikeStatusEntry =
      Boolean(primaryIdentifier) ||
      Boolean(employeeIdentifier) ||
      fallbackIdentifiers.length > 0 ||
      recordHasStatusField(record, statusKeys, sentDateKeys);

    if (!recordLooksLikeStatusEntry) {
      return;
    }

    if (!hasExplicitSentState && !includeFallbackIdentifiers) {
      return;
    }

    if (primaryIdentifier !== undefined) {
      addLookupValue(primaryIdentifier);
    }

    if (employeeIdentifier !== undefined) {
      addLookupValue(employeeIdentifier);
    }

    if (includeFallbackIdentifiers) {
      fallbackIdentifiers.forEach(addLookupValue);
    }
  };

  collectCandidates(payload).forEach((candidate) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(processRecord);
      return;
    }

    processRecord(candidate);
  });

  return lookup;
};

export const buildDocumentSendStatusLookup = buildLetterSendStatusLookup;
