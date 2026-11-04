export const APP_CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const APP_CALENDAR_DEFAULT_MIN_YEAR = 1900;
export const APP_CALENDAR_DEFAULT_MAX_YEAR_OFFSET = 20;

export function getCalendarYearBounds(minDate, maxDate) {
  const currentYear = new Date().getFullYear();

  return {
    minYear: minDate?.getFullYear?.() ?? APP_CALENDAR_DEFAULT_MIN_YEAR,
    maxYear:
      maxDate?.getFullYear?.() ??
      currentYear + APP_CALENDAR_DEFAULT_MAX_YEAR_OFFSET,
  };
}

export function getCalendarYearOptions(minYear, maxYear) {
  const startYear = Math.min(minYear, maxYear);
  const endYear = Math.max(minYear, maxYear);

  return Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => startYear + index
  );
}
