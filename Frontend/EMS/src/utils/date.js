const pad = (value) => String(value).padStart(2, "0");

export const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());

export const parseDate = (value) => {
  if (!value && value !== 0) {
    return null;
  }

  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value.getTime()) : null;
  }

  if (typeof value === "number") {
    const parsedNumberDate = new Date(value);
    return isValidDate(parsedNumberDate) ? parsedNumberDate : null;
  }

  const rawValue = String(value).trim();

  if (!rawValue) {
    return null;
  }

  const isoLikeMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoLikeMatch) {
    const [, year, month, day] = isoLikeMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const slashDateMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDateMatch) {
    const [, day, month, year] = slashDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsedDate = new Date(rawValue);
  return isValidDate(parsedDate) ? parsedDate : null;
};

export const getInputDateValue = (value) => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return "";
  }

  return [
    parsedDate.getFullYear(),
    pad(parsedDate.getMonth() + 1),
    pad(parsedDate.getDate()),
  ].join("-");
};

export const getTodayInputValue = () => getInputDateValue(new Date());

export const formatDate = (value, fallback = "-") => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return fallback;
  }

  return [
    pad(parsedDate.getDate()),
    pad(parsedDate.getMonth() + 1),
    parsedDate.getFullYear(),
  ].join("/");
};

export const formatDateTime = (value, fallback = "-") => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return fallback;
  }

  const timeValue = parsedDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${formatDate(parsedDate, fallback)} ${timeValue}`;
};

export const formatTime = (value, fallback = "-") => {
  if (!value) {
    return fallback;
  }

  const timeOnlyMatch = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (timeOnlyMatch) {
    const [, hours, minutes] = timeOnlyMatch;
    const parsedDate = new Date(2000, 0, 1, Number(hours), Number(minutes));
    return parsedDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatMonthYear = (value, fallback = "-") => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

export const getDayName = (value, fallback = "") => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleDateString("en-US", {
    weekday: "long",
  });
};

const getTimestamp = (value) => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.getTime() : Number.NaN;
};

export const compareDatesDesc = (left, right) => {
  const leftTimestamp = getTimestamp(left);
  const rightTimestamp = getTimestamp(right);

  if (Number.isNaN(leftTimestamp) && Number.isNaN(rightTimestamp)) return 0;
  if (Number.isNaN(leftTimestamp)) return 1;
  if (Number.isNaN(rightTimestamp)) return -1;

  return rightTimestamp - leftTimestamp;
};

export const compareDatesAsc = (left, right) => {
  const leftTimestamp = getTimestamp(left);
  const rightTimestamp = getTimestamp(right);

  if (Number.isNaN(leftTimestamp) && Number.isNaN(rightTimestamp)) return 0;
  if (Number.isNaN(leftTimestamp)) return 1;
  if (Number.isNaN(rightTimestamp)) return -1;

  return leftTimestamp - rightTimestamp;
};

export const toIsoDateString = (value) => {
  const inputDate = getInputDateValue(value);

  if (!inputDate) {
    return null;
  }

  const [year, month, day] = inputDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
};

export const sortDate = compareDatesDesc;

export const timeAgo = (dateString) => {

  if (!dateString) return "Just now";

  const activityDate = new Date(dateString);

  // invalid date check
  if (isNaN(activityDate.getTime())) {
    return "Just now";
  }

  const now = new Date();

  // difference in seconds
  let seconds = Math.floor(
    (now.getTime() - activityDate.getTime()) / 1000
  );

  // prevent negative values
  if (seconds < 0) {
    seconds = Math.abs(seconds);
  }

  // less than 5 sec
  if (seconds < 5) {
    return "Just now";
  }

  // seconds
  if (seconds < 60) {
    return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
  }

  const minutes = Math.floor(seconds / 60);

  // minutes
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }

  const hours = Math.floor(minutes / 60);

  // hours
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);

  // days
  if (days < 30) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  const months = Math.floor(days / 30);

  // months
  if (months < 12) {
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }

  const years = Math.floor(months / 12);

  return `${years} year${years > 1 ? "s" : ""} ago`;
};

export const isDateRangeValid = (fromDate, toDate) => {
  const fromTimestamp = getTimestamp(fromDate);
  const toTimestamp = getTimestamp(toDate);

  if (Number.isNaN(fromTimestamp) || Number.isNaN(toTimestamp)) {
    return false;
  }

  return fromTimestamp <= toTimestamp;
};
