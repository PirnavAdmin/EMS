import { compareDatesAsc, compareDatesDesc } from "./date";

const DATE_FIELD_PRIORITY = [
  [
    "Updated_On",
    "updated_On",
    "updated_on",
    "UpdatedOn",
    "updatedOn",
    "updatedAt",
    "UpdatedAt",
  ],
  [
    "Created_On",
    "created_On",
    "created_on",
    "CreatedOn",
    "createdOn",
    "createdAt",
    "CreatedAt",
  ],
  [
    "Generated_On",
    "generated_On",
    "generated_on",
    "GeneratedOn",
    "generatedOn",
    "generatedAt",
    "GeneratedAt",
  ],
];

const isSortableRecord = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date);

const getFirstPresentValue = (record, keys) => {
  for (const key of keys) {
    if (!(key in record)) {
      continue;
    }

    const value = record[key];

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string" && !value.trim()) {
      continue;
    }

    return value;
  }

  return undefined;
};

const getFallbackIdValue = (record) => {
  const directId = getFirstPresentValue(record, ["Id", "id", "ID"]);

  if (directId !== undefined) {
    return directId;
  }

  const matchingEntry = Object.entries(record).find(([key, value]) => {
    if (!/(^|_|-)?id$/i.test(key) || value === null || value === undefined) {
      return false;
    }

    if (typeof value === "string" && !value.trim()) {
      return false;
    }

    return true;
  });

  return matchingEntry?.[1];
};

const hasRecencySortKey = (record) =>
  isSortableRecord(record) &&
  (
    DATE_FIELD_PRIORITY.some((keys) => getFirstPresentValue(record, keys) !== undefined) ||
    getFallbackIdValue(record) !== undefined
  );

const compareIdDesc = (leftValue, rightValue) => {
  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  const leftIsNumeric = Number.isFinite(leftNumber);
  const rightIsNumeric = Number.isFinite(rightNumber);

  if (leftIsNumeric && rightIsNumeric) {
    return rightNumber - leftNumber;
  }

  return String(rightValue ?? "").localeCompare(String(leftValue ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

export const compareByRecency = (left, right) => {
  const leftIsRecord = isSortableRecord(left);
  const rightIsRecord = isSortableRecord(right);

  if (!leftIsRecord || !rightIsRecord) {
    return 0;
  }

  for (const keys of DATE_FIELD_PRIORITY) {
    const leftValue = getFirstPresentValue(left, keys);
    const rightValue = getFirstPresentValue(right, keys);
    const leftHasValue = leftValue !== undefined;
    const rightHasValue = rightValue !== undefined;

    if (leftHasValue && !rightHasValue) {
      return -1;
    }

    if (!leftHasValue && rightHasValue) {
      return 1;
    }

    if (!leftHasValue && !rightHasValue) {
      continue;
    }

    const dateComparison = compareDatesDesc(leftValue, rightValue);

    if (dateComparison !== 0) {
      return dateComparison;
    }
  }

  const leftId = getFallbackIdValue(left);
  const rightId = getFallbackIdValue(right);
  const leftHasId = leftId !== undefined;
  const rightHasId = rightId !== undefined;

  if (leftHasId && !rightHasId) {
    return -1;
  }

  if (!leftHasId && rightHasId) {
    return 1;
  }

  if (!leftHasId && !rightHasId) {
    return 0;
  }

  return compareIdDesc(leftId, rightId);
};

export const extractCollection = (payload) => {
  const candidates = [
    payload,
    payload?.data,
    payload?.items,
    payload?.records,
    payload?.tasks,
    payload?.data?.data,
    payload?.data?.items,
    payload?.data?.records,
    payload?.data?.tasks,
    payload?.data?.data?.$values,
    payload?.data?.data?.items,
    payload?.data?.data?.records,
    payload?.data?.data?.tasks,
    payload?.data?.$values,
    payload?.$values,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return sortByRecency(candidate);
    }
  }

  return [];
};

export const stableSort = (items, compare) =>
  [...items]
    .map((item, index) => ({
      item,
      index,
    }))
    .sort((left, right) => {
      const comparedValue = compare(left.item, right.item);
      return comparedValue === 0 ? left.index - right.index : comparedValue;
    })
    .map(({ item }) => item);

export const sortByRecency = (items) => {
  const safeItems = Array.isArray(items) ? items : [];

  // Optimization: skip stable sorting when records have no date/id fields, preserving current order.
  if (!safeItems.some(hasRecencySortKey)) {
    return safeItems;
  }

  return stableSort(safeItems, compareByRecency);
};

export const sortByDateDesc = (items, selector) =>
  stableSort(items, (left, right) =>
    compareDatesDesc(selector(left), selector(right))
  );

export const sortByDateAsc = (items, selector) =>
  stableSort(items, (left, right) =>
    compareDatesAsc(selector(left), selector(right))
  );

export const sortByNewestIdFirst = (items, selector) =>
  stableSort(items, (left, right) => {
    const leftValue = Number(selector(left) || 0);
    const rightValue = Number(selector(right) || 0);
    return rightValue - leftValue;
  });

export const sortNestedCollectionsByRecency = (value, seen = new WeakMap()) => {
  if (Array.isArray(value)) {
    const normalizedItems = value.map((item) => sortNestedCollectionsByRecency(item, seen));
    return sortByRecency(normalizedItems);
  }

  if (!isSortableRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  const normalizedObject = {};
  seen.set(value, normalizedObject);

  Object.entries(value).forEach(([key, nestedValue]) => {
    normalizedObject[key] = sortNestedCollectionsByRecency(nestedValue, seen);
  });

  return normalizedObject;
};
