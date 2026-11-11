export const WEEKLY_OFF_DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const DAY_ALIASES = new Map([
  ["mon", "Monday"], ["monday", "Monday"],
  ["tue", "Tuesday"], ["tues", "Tuesday"], ["tuesday", "Tuesday"],
  ["wed", "Wednesday"], ["wednesday", "Wednesday"],
  ["thu", "Thursday"], ["thur", "Thursday"], ["thurs", "Thursday"], ["thursday", "Thursday"],
  ["fri", "Friday"], ["friday", "Friday"],
  ["sat", "Saturday"], ["saturday", "Saturday"],
  ["sun", "Sunday"], ["sunday", "Sunday"]
]);

export const normalizeWeeklyOffDays = (value) => {
  const days = Array.isArray(value)
    ? value
    : Array.isArray(value?.$values)
      ? value.$values
      : [];
  const selected = new Set();

  days.forEach((value) => {
    const label = String(
      value?.dayName ?? value?.day ?? value?.name ?? value ?? ""
    ).trim().toLowerCase();
    const day = DAY_ALIASES.get(label);
    if (day) selected.add(day);
  });

  return WEEKLY_OFF_DAY_OPTIONS.filter((day) => selected.has(day));
};

export const getWeeklyOffDays = (record = {}) =>
  normalizeWeeklyOffDays(
    record.weeklyOffDays ??
      record.WeeklyOffDays ??
      record.weekly_off_days ??
      record.weeklyOff_Days
  );
