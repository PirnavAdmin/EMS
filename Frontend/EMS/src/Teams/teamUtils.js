import { TEAM_DAY_OPTIONS } from "./teamsData";

const DISPLAY_DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_ALIASES = new Map([
  ["mon", "Mon"], ["monday", "Mon"],
  ["tue", "Tue"], ["tues", "Tue"], ["tuesday", "Tue"],
  ["wed", "Wed"], ["wednesday", "Wed"],
  ["thu", "Thu"], ["thur", "Thu"], ["thurs", "Thu"], ["thursday", "Thu"],
  ["fri", "Fri"], ["friday", "Fri"]
]);

const normalizeDisplayDays = (days) => {
  if (!Array.isArray(days)) return [];

  const normalized = new Set();
  days.forEach((day) => {
    const label = String(day ?? "").trim().toLowerCase();
    const canonicalDay = DAY_ALIASES.get(label);
    if (canonicalDay) normalized.add(canonicalDay);
  });

  return DISPLAY_DAY_ORDER.filter((day) => normalized.has(day));
};

export const getDisplayDays = (wfoDays, wfhDays) => {
  const normalizedWfoDays = normalizeDisplayDays(wfoDays);
  const wfoSet = new Set(normalizedWfoDays);
  const normalizedWfhDays = normalizeDisplayDays(wfhDays).filter((day) => !wfoSet.has(day));

  return { wfoDays: normalizedWfoDays, wfhDays: normalizedWfhDays };
};

const toScheduleDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [value.getUTCFullYear(), String(value.getUTCMonth() + 1).padStart(2, "0"), String(value.getUTCDate()).padStart(2, "0")].join("-");
  }
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!match) return "";
  const [, year, month, day] = match;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
    ? [year, month, day].join("-")
    : "";
};

const scheduleWeekStart = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
};

const scheduleDayForDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
};

const actualDateValue = (value) => {
  if (typeof value === "string" || value instanceof Date) return value;
  if (!isPlainObject(value)) return null;
  return value.actualDate ?? value.scheduledDate ?? value.date ?? value.dateValue ?? value.value ?? null;
};

const reportingDayName = (record) => normalizeReportingDaysForUi([
  record?.dayName ?? record?.day ?? record?.name ?? record?.value
])[0] || "";

const scheduleDateIsInEffect = (dateString, record) => {
  const effectiveFrom = toScheduleDate(record?.effectiveFrom);
  const effectiveTo = toScheduleDate(record?.effectiveTo);
  return (!effectiveFrom || dateString >= effectiveFrom) && (!effectiveTo || dateString <= effectiveTo);
};

const getTodayDateOnly = () => {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
};

export const getReportingDayDateMap = (scheduleRecords, targetDays = []) => {
  const records = normalizeCollection(scheduleRecords);
  const candidates = [];
  const isFlatDateInEffect = (dateString, dayName) => {
    const daySchedules = records.filter((record) =>
      isPlainObject(record) &&
      reportingDayName(record) === dayName &&
      (record.effectiveFrom || record.effectiveTo)
    );
    return !daySchedules.length || daySchedules.some((record) => scheduleDateIsInEffect(dateString, record));
  };

  records.forEach((record) => {
    if (!isPlainObject(record)) return;
    const dayName = reportingDayName(record);
    if (!dayName) return;

    normalizeCollection(record.actualDates).forEach((actualDate) => {
      const dateString = toScheduleDate(actualDateValue(actualDate));
      if (!dateString || !scheduleDateIsInEffect(dateString, record) || scheduleDayForDate(dateString) !== dayName) return;
      candidates.push({ dayName, dateString, weekStart: scheduleWeekStart(dateString) });
    });
  });

  // Some responses expose actualDates as flat weekday/date records instead of
  // nesting them beneath each reportingDays item.
  records.forEach((record) => {
    if (typeof record === "string" || record instanceof Date) {
      const dateString = toScheduleDate(record);
      const dayName = dateString ? scheduleDayForDate(dateString) : "";
      if (dateString && isFlatDateInEffect(dateString, dayName)) candidates.push({ dayName, dateString, weekStart: scheduleWeekStart(dateString) });
      return;
    }
    if (!isPlainObject(record)) return;
    const dayName = record.dayName ? reportingDayName(record) : scheduleDayForDate(toScheduleDate(actualDateValue(record)));
    const dateString = toScheduleDate(actualDateValue(record));
    if (!dayName || !dateString || !scheduleDateIsInEffect(dateString, record) || !isFlatDateInEffect(dateString, dayName) || scheduleDayForDate(dateString) !== dayName) return;
    candidates.push({ dayName, dateString, weekStart: scheduleWeekStart(dateString) });
  });

  if (!candidates.length) return {};

  const targetSet = new Set(normalizeDisplayDays(targetDays));
  const weeks = [...new Set(candidates.map((candidate) => candidate.weekStart))].sort();
  const currentWeek = scheduleWeekStart(getTodayDateOnly());
  const upcomingWeeks = weeks.filter((week) => week >= currentWeek);
  const eligibleWeeks = upcomingWeeks.length ? upcomingWeeks : [...weeks].reverse();
  const weekCoverage = (week) => new Set(candidates
    .filter((candidate) => candidate.weekStart === week && (!targetSet.size || targetSet.has(candidate.dayName)))
    .map((candidate) => candidate.dayName)).size;
  const selectedWeek = eligibleWeeks.reduce((best, week) => {
    if (best == null || weekCoverage(week) > weekCoverage(best)) return week;
    return best;
  }, null);

  return candidates
    .filter((candidate) => candidate.weekStart === selectedWeek)
    .reduce((dateMap, candidate) => {
      if (!dateMap[candidate.dayName] || candidate.dateString < dateMap[candidate.dayName]) {
        dateMap[candidate.dayName] = candidate.dateString;
      }
      return dateMap;
    }, {});
};

export const formatReportingDayDate = (dateString) => {
  const match = String(dateString ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
};

export const collectReportingDateRecords = (...sources) => {
  const records = [];
  const visited = new WeakSet();

  const visit = (value, depth = 0) => {
    if (depth > 10 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (!isPlainObject(value) || visited.has(value)) return;
    visited.add(value);

    const dayName = reportingDayName(value);
    const actualDates = value.actualDates ?? value.ActualDates;
    const directDate = value.actualDate ?? value.scheduledDate ?? value.date ?? value.dateValue;
    if (dayName && actualDates != null) {
      records.push(value);
    } else if (dayName && directDate != null) {
      records.push(value);
    }

    if (actualDates != null && !dayName) {
      normalizeCollection(actualDates).forEach((item) => records.push(item));
    }

    Object.entries(value).forEach(([key, child]) => {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey !== "actualdates" && !["members", "teammembers", "projectteammembers", "employees", "teamemployees", "employeedetails"].includes(normalizedKey)) {
        visit(child, depth + 1);
      }
    });
  };

  sources.forEach((source) => visit(source));
  return records;
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalizedValue = String(value ?? "").trim();

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
};

export const toNumberId = (value) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const COLLECTION_KEYS = [
  "$values",
  "data",
  "list",
  "items",
  "result",
  "value",
  "records",
  "rows",
  "teams",
  "teamList",
  "teamData"
];

const findWrappedCollection = (value, depth = 0, seen = new WeakSet()) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isPlainObject(value) || depth > 3) {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }

  seen.add(value);

  for (const key of COLLECTION_KEYS) {
    const candidate = value[key];

    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  for (const key of COLLECTION_KEYS) {
    const candidate = value[key];
    const nestedCollection = findWrappedCollection(candidate, depth + 1, seen);

    if (nestedCollection) {
      return nestedCollection;
    }
  }

  return null;
};

export const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = payload?.data ?? payload ?? {};

  if (Array.isArray(root)) {
    return root;
  }

  if (!isPlainObject(root)) {
    return [];
  }

  const candidates = [
    root,
    root.data,
    root.list,
    root.items,
    root.result,
    root.value,
    root.records,
    root.rows,
    root.teams,
    root.teamList,
    root.teamData,
    root.data?.data,
    root.data?.list,
    root.data?.items,
    root.data?.result,
    root.data?.value,
    root.data?.records,
    root.data?.rows,
    root.data?.teams,
    root.data?.teamList,
    root.data?.teamData,
  ];

  for (const candidate of candidates) {
    const wrappedCollection = findWrappedCollection(candidate);

    if (wrappedCollection) {
      return wrappedCollection;
    }
  }

  const looksLikeRecord =
    "teamId" in root ||
    "team_Id" in root ||
    "teamID" in root ||
    "teamNumber" in root ||
    "team_Number" in root ||
    "teamName" in root ||
    "team_Name" in root ||
    "projectId" in root ||
    "project_Id" in root ||
    "projectID" in root ||
    "projectName" in root ||
    "project_Name" in root ||
    "employeeId" in root ||
    "employee_Id" in root ||
    "employeeID" in root ||
    "employeeName" in root;

  return looksLikeRecord ? [root] : [];
};

const normalizeIdentityValue = (value) => String(value ?? "").trim().toLowerCase();

const getIdentityRecords = (record = {}) => {
  const source = isPlainObject(record) ? record : {};
  return [
    source,
    source.employee,
    source.Employee,
    source.user,
    source.User,
    source.userData,
    source.authUser,
    source.employeeDetails,
    source.employeeFullDetail,
    source.data,
    source.profile,
    source.raw
  ].filter(isPlainObject);
};

const getIdentityValues = (record, keys) =>
  getIdentityRecords(record).flatMap((source) =>
    keys.map((key) => normalizeIdentityValue(source[key])).filter(Boolean)
  );

const getMemberIdentityValues = (member) => ({
  employeeIds: getIdentityValues(member, [
    "employeeId", "employee_Id", "employeeID", "EmployeeId", "Employee_Id",
    "employeeCode", "employee_code", "EmployeeCode", "empCode", "empId", "EmpId"
  ]),
  userIds: getIdentityValues(member, ["userId", "user_Id", "userID", "UserId", "User_Id"]),
  emails: getIdentityValues(member, ["email", "Email", "employeeEmail", "userEmail"])
});

const readCachedIdentityRecords = () => {
  if (typeof window === "undefined") return [];

  const records = [];
  const storages = [];
  try {
    if (window.localStorage) storages.push(window.localStorage);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  try {
    if (window.sessionStorage) storages.push(window.sessionStorage);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  for (const storage of storages) {
    if (!storage) continue;
    for (const key of ["user", "currentUser", "userData", "userInfo", "authUser"]) {
      try {
        const value = storage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          if (isPlainObject(parsed)) records.push(parsed);
        }
      } catch {
        // Ignore malformed cached auth records and keep checking other keys.
      }
    }
  }
  return records;
};

/** Resolve the signed-in employee against the roster, including employee-code auth sessions. */
export const resolveLoggedInEmployee = (members = [], currentUser = {}) => {
  if (!Array.isArray(members) || members.length === 0) return null;

  const authRecords = [currentUser, ...readCachedIdentityRecords()];
  const authEmployeeIds = authRecords.flatMap((record) => getIdentityValues(record, [
    "employeeId", "employee_Id", "employeeID", "EmployeeId", "Employee_Id",
    "employeeCode", "employee_code", "EmployeeCode", "empCode", "empId", "EmpId"
  ]));
  const authUserIds = authRecords.flatMap((record) => getIdentityValues(record, [
    "userId", "user_Id", "userID", "UserId", "User_Id", "id", "Id"
  ]));
  const authEmails = authRecords.flatMap((record) => getIdentityValues(record, [
    "email", "Email", "employeeEmail", "userEmail"
  ]));
  const employeeIdMatch = members.find((member) => {
    const identity = getMemberIdentityValues(member);
    return authEmployeeIds.some((id) => identity.employeeIds.includes(id));
  });
  if (employeeIdMatch) return employeeIdMatch;

  const userIdMatch = members.find((member) => {
    const identity = getMemberIdentityValues(member);
    return authUserIds.some((id) => identity.userIds.includes(id));
  });
  if (userIdMatch) return userIdMatch;

  // Email is a fallback only when the session has no employee or user identifier.
  if (authEmployeeIds.length || authUserIds.length) return null;
  return members.find((member) => {
    const identity = getMemberIdentityValues(member);
    return authEmails.some((email) => identity.emails.includes(email));
  }) || null;
};

export const normalizeReportingDays = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((day) => {
      if (typeof day === "string") {
        return day.trim();
      }

      if (!isPlainObject(day)) {
        return "";
      }

      return firstNonEmpty(
        day.dayName,
        day.day,
        day.name,
        day.value,
        day.label
      );
    })
    .filter(Boolean);
};

const normalizeReportingDayLabel = (value, target = "ui") => {
  if (typeof value === "string") {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return "";
    }

    const lookupKey = normalizedValue.toLowerCase();

    if (target === "api") {
      switch (lookupKey) {
        case "mon":
        case "monday":
          return "Monday";
        case "tue":
        case "tuesday":
          return "Tuesday";
        case "wed":
        case "wednesday":
          return "Wednesday";
        case "thu":
        case "thursday":
          return "Thursday";
        case "fri":
        case "friday":
          return "Friday";
        case "sat":
        case "saturday":
          return "Saturday";
        case "sun":
        case "sunday":
          return "Sunday";
        default:
          return normalizedValue;
      }
    }

    switch (lookupKey) {
      case "mon":
      case "monday":
        return "Mon";
      case "tue":
      case "tuesday":
        return "Tue";
      case "wed":
      case "wednesday":
        return "Wed";
      case "thu":
      case "thursday":
        return "Thu";
      case "fri":
      case "friday":
        return "Fri";
      case "sat":
      case "saturday":
        return "Sat";
      case "sun":
      case "sunday":
        return "Sun";
      default:
        return normalizedValue;
    }
  }

  if (!isPlainObject(value)) {
    return "";
  }

  return normalizeReportingDayLabel(
    firstNonEmpty(value.dayName, value.day, value.name, value.value, value.label),
    target
  );
};

export const normalizeReportingDaysForUi = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((day) => normalizeReportingDayLabel(day, "ui")).filter(Boolean);
};

export const normalizeReportingDaysForApi = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((day) => normalizeReportingDayLabel(day, "api")).filter(Boolean);
};

const resolveDisplayName = (value, depth = 0) => {
  if (depth > 3) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (!isPlainObject(value)) {
    return "";
  }

  const nestedCandidates = [
    value.name,
    value.employeeName,
    value.fullName,
    value.displayName,
    value.managerName,
    value.reportingManagerName,
    value.value,
    value.label,
    value.employee,
    value.manager,
    value.reportingManager,
    value.data,
    value.details
  ];

  for (const candidate of nestedCandidates) {
    const resolvedValue = resolveDisplayName(candidate, depth + 1);

    if (resolvedValue) {
      return resolvedValue;
    }
  }

  return "";
};

export const getComplementDays = (days = []) =>
  TEAM_DAY_OPTIONS.filter((day) => !days.includes(day));

const sameDayList = (leftDays = [], rightDays = []) =>
  normalizeReportingDaysForUi(leftDays)
    .sort((left, right) => TEAM_DAY_OPTIONS.indexOf(left) - TEAM_DAY_OPTIONS.indexOf(right))
    .join("|") ===
  normalizeReportingDaysForUi(rightDays)
    .sort((left, right) => TEAM_DAY_OPTIONS.indexOf(left) - TEAM_DAY_OPTIONS.indexOf(right))
    .join("|");

const resolveMemberEmployeeId = (member = {}) =>
  firstNonEmpty(
    member.employeeId,
    member.employee_Id,
    member.employeeID,
    member.EmployeeId,
    member.EmployeeID,
    member.employee?.id,
    member.employee?.employeeId,
    member.employee?.employee_Id,
    member.employee?.employeeID,
    member.employee?.EmployeeId,
    member.employee?.EmployeeID
  );

const resolveMemberTeamMemberId = (member = {}) =>
  toNumberId(
    member.teamMemberId ??
      member.id ??
      member.teamMember?.id ??
      member.teamMember?.teamMemberId
  );

const resolveOverrideReportingDays = (...candidates) => {
  for (const candidate of candidates) {
    const normalizedDays = normalizeReportingDaysForUi(candidate);

    if (normalizedDays.length > 0) {
      return normalizedDays;
    }
  }

  return [];
};

export const normalizeEmployeeRecord = (employee = {}) => {
  const record = employee?.employee ?? employee?.Employee ?? employee;

  if (!isPlainObject(record)) {
    return null;
  }

  const employeeId = firstNonEmpty(
    record.employee_Id,
    record.employeeId,
    record.employeeID,
    record.id,
    record.EmployeeId,
    record.EmployeeID,
    record.Employee_Id
  );

  const employeeName = firstNonEmpty(
    resolveDisplayName(record.name),
    resolveDisplayName(record.employee_Name),
    resolveDisplayName(record.employeeName),
    resolveDisplayName(record.fullName),
    resolveDisplayName(record.employeeFullName),
    resolveDisplayName(record.displayName)
  );

  const designation = firstNonEmpty(
    record.designation,
    record.designationName,
    record.roleName,
    record.role
  );

  return {
    id: toNumberId(record.id) ?? employeeId,
    employeeId,
    employeeName,
    name: employeeName,
    fullName: employeeName,
    designation,
    role: designation,
    department: firstNonEmpty(record.department, record.departmentName),
    email: firstNonEmpty(record.email, record.employeeEmail),
    status: firstNonEmpty(record.status),
    userId: firstNonEmpty(record.userId, record.user_Id, record.id),
    raw: record
  };
};

export const normalizeProjectRecord = (project = {}) => {
  const record = project?.project ?? project?.Project ?? project;

  if (!isPlainObject(record)) {
    return null;
  }

  const projectId = toNumberId(
    firstNonEmpty(
      record.projectId,
      record.project_Id,
      record.id,
      record.projectID
    )
  );

  const projectName = firstNonEmpty(
    record.project_Name,
    record.projectName,
    record.name
  );

  return {
    id: projectId ?? firstNonEmpty(record.project_Id, record.projectId, record.id),
    projectId,
    projectName,
    name: projectName,
    projectCode: firstNonEmpty(record.projectCode, record.project_Code),
    client: firstNonEmpty(record.client),
    clientId: toNumberId(record.clientId),
    status: firstNonEmpty(record.status),
    teamExists: Boolean(record.teamExists ?? record.TeamExists),
    teamId: toNumberId(record.teamId ?? record.TeamId),
    teamNumber: firstNonEmpty(record.teamNumber, record.team_Number),
    teamName: firstNonEmpty(record.teamName),
    reportingManagerId: firstNonEmpty(record.reportingManagerId),
    reportingManagerName: firstNonEmpty(
      record.reportingManagerName,
      record.reportingManager?.name,
      record.reportingManager?.employeeName,
      record.reportingManager?.fullName
    ),
    engagementType: firstNonEmpty(record.engagementType),
    isActive: Boolean(record.isActive ?? record.IsActive),
    members: normalizeCollection(record.projectTeamMembers ?? record.members),
    raw: record
  };
};

const normalizeMemberOverride = (override = {}) => {
  const record = override?.teamMemberOverride ?? override?.TeamMemberOverride ?? override;

  if (!isPlainObject(record)) {
    return null;
  }

  const overrideProject = normalizeProjectRecord(
    record.overrideProject ?? record.project ?? {}
  );
  const overrideReportingDays = resolveOverrideReportingDays(
    record.overrideReportingDays,
    record.overrideWfoDays,
    record.wfoDays,
    record.reportingDays
  );
  const overrideWfhDays = normalizeReportingDaysForUi(record.overrideWfhDays);

  return {
    id: toNumberId(record.id),
    teamMemberId: toNumberId(record.teamMemberId),
    isCrossMapped: Boolean(
      record.isCrossMapped ??
        record.differentProject ??
        record.crossTeam ??
        record.isCrossMapped
    ),
    differentProject: Boolean(
      record.differentProject ??
        record.isCrossMapped ??
        record.crossTeam ??
        record.differentProject
    ),
    customReportingDays: Boolean(
      record.customReportingDays ??
        record.customReportingDaysEnabled ??
        record.isCustomReportingDays
    ),
    overrideProjectId: toNumberId(
      record.overrideProjectId ??
        record.overrideProjectID ??
        overrideProject?.projectId ??
        record.projectId
    ),
    overrideProjectName: firstNonEmpty(
      record.overrideProjectName,
      overrideProject?.projectName
    ),
    reportingDays: overrideReportingDays,
    overrideReportingDays,
    overrideWfoDays: overrideReportingDays,
    overrideWfhDays:
      overrideWfhDays.length > 0
        ? overrideWfhDays
        : getComplementDays(overrideReportingDays),
    overrideProject,
    raw: record
  };
};

const normalizeShift = (value = {}) => {
  const record = value?.shift ?? value?.teamShift ?? value?.employeeShift ?? value?.currentShift ?? value?.assignedShift ?? value;

  if (!isPlainObject(record)) {
    return null;
  }

  const shiftId = toNumberId(record.shiftId ?? record.shift_Id ?? record.id);
  const shiftName = firstNonEmpty(record.shiftName, record.name);
  const startTime = firstNonEmpty(record.startTime, record.start_Time);
  const endTime = firstNonEmpty(record.endTime, record.end_Time);

  if (shiftId == null && !shiftName && !startTime && !endTime) {
    return null;
  }

  return {
    shiftId,
    shiftName,
    shiftCode: firstNonEmpty(record.shiftCode, record.shift_Code, record.code),
    startTime,
    endTime
  };
};

export const normalizeTeamMemberRecord = (member = {}, teamContext = {}) => {
  const sourceRecord = member;
  const record = member?.teamMember ?? member?.TeamMember ?? member;

  if (!isPlainObject(record)) {
    return null;
  }

  const employee = normalizeEmployeeRecord(record.employee ?? record.Employee ?? {});
  const override = normalizeMemberOverride(record.teamMemberOverride ?? record.override ?? {});
  const memberShiftRecord =
    record.shiftOverride ??
    override?.raw?.shiftOverride ??
    override?.raw?.overrideShift ??
    record.employeeShift ??
    record.currentShift ??
    record.shift ??
    record.assignedShift ??
    employee?.raw?.employeeShift ??
    employee?.raw?.currentShift ??
    employee?.raw?.shift ??
    employee?.raw?.assignedShift ??
    ((record.overrideShiftId ?? record.overrideShiftName ?? record.shiftName ?? record.currentShiftName) != null
      ? {
          shiftId: record.overrideShiftId ?? record.shiftId ?? record.currentShiftId,
          shiftName: record.overrideShiftName ?? record.shiftName ?? record.currentShiftName,
          startTime: record.shiftStartTime,
          endTime: record.shiftEndTime
        }
      : null);
  const memberShift = normalizeShift(memberShiftRecord);
  const teamReportingDays = normalizeReportingDaysForUi(
    teamContext.reportingDays ?? record.reportingDays
  );
  const overrideReportingDays = resolveOverrideReportingDays(
    override?.overrideReportingDays,
    override?.overrideWfoDays,
    override?.wfoDays,
    override?.reportingDays,
    record.overrideReportingDays,
    record.overrideWfoDays,
    record.wfoDays,
    record.reportingDays
  );
  const teamProjectId = toNumberId(teamContext.projectId);
  const resolvedProjectId = toNumberId(
    override?.overrideProjectId ??
      override?.overrideProject?.projectId ??
      record.projectId
  );
  const hasProjectOverride = Boolean(
    override?.differentProject ??
      override?.isCrossMapped ??
      (resolvedProjectId != null &&
        (teamProjectId == null || resolvedProjectId !== teamProjectId))
  );
  const hasCustomReportingDays = Boolean(
    override?.customReportingDays ??
      override?.customReportingDaysEnabled ??
      override?.isCustomReportingDays
  ) ||
    (overrideReportingDays.length > 0 &&
      !sameDayList(overrideReportingDays, teamReportingDays));
  const effectiveReportingDays =
    hasCustomReportingDays && overrideReportingDays.length > 0
      ? overrideReportingDays
      : teamReportingDays;
  const projectName = firstNonEmpty(
    override?.overrideProjectName,
    override?.overrideProject?.projectName,
    record.projectName,
    teamContext.projectName,
    employee?.projectName
  );

  return {
    id:
      toNumberId(record.id) ??
      record.id ??
      record.employeeId ??
      record.userId ??
      employee?.employeeId ??
      employee?.userId ??
      "",
    teamMemberId:
      resolveMemberTeamMemberId(record) ??
      resolveMemberTeamMemberId(override?.raw || {}) ??
      null,
    teamId: toNumberId(record.teamId ?? teamContext.teamId),
    employeeId: resolveMemberEmployeeId({
      employeeId: record.employeeId,
      employee,
      userId: record.userId
    }),
    employee_Id: firstNonEmpty(
      record.employee_Id,
      record.employeeId,
      record.employeeID,
      record.EmployeeId,
      record.EmployeeID,
      employee?.employee_Id,
      employee?.employeeId,
      employee?.employeeID,
      employee?.EmployeeId,
      employee?.EmployeeID
    ),
    employeeCode: firstNonEmpty(
      record.employeeCode,
      record.employee_code,
      record.EmployeeCode,
      record.empCode,
      employee?.employeeCode,
      employee?.employee_code,
      employee?.EmployeeCode,
      employee?.empCode
    ),
    userId: firstNonEmpty(
      record.userId,
      record.user_Id,
      record.userID,
      employee?.userId,
      employee?.user_Id,
      employee?.userID
    ),
    employeeName: firstNonEmpty(
      employee?.employeeName,
      employee?.name,
      record.employeeName,
      record.name
    ),
    name: firstNonEmpty(
      employee?.employeeName,
      employee?.name,
      record.employeeName,
      record.name
    ),
    designation: firstNonEmpty(
      employee?.designation,
      employee?.role,
      record.designation,
      record.role
    ),
    role: firstNonEmpty(
      employee?.designation,
      employee?.role,
      record.designation,
      record.role
    ),
    department: firstNonEmpty(employee?.department, record.department),
    technology: firstNonEmpty(record.technology, record.Technology, employee?.raw?.technology, employee?.raw?.Technology) || null,
    projectId:
      hasProjectOverride && resolvedProjectId != null
        ? resolvedProjectId
        : teamProjectId ?? resolvedProjectId,
    projectName,
    engagementType: firstNonEmpty(
      teamContext.engagementType,
      record.engagementType,
      employee?.engagementType
    ),
    reportingDays: effectiveReportingDays,
    wfoDays: effectiveReportingDays,
    wfhDays: getComplementDays(effectiveReportingDays),
    baseReportingDays: teamReportingDays,
    overrideReportingDays: hasCustomReportingDays ? overrideReportingDays : [],
    overrideWfoDays: hasCustomReportingDays ? overrideReportingDays : [],
    overrideWfhDays:
      hasCustomReportingDays
        ? override?.overrideWfhDays?.length > 0
          ? override.overrideWfhDays
          : getComplementDays(overrideReportingDays)
        : getComplementDays(teamReportingDays),
    overrideProjectId: hasProjectOverride ? resolvedProjectId ?? null : null,
    overrideProjectName: hasProjectOverride
      ? firstNonEmpty(
          override?.overrideProjectName,
          override?.overrideProject?.projectName,
          record.projectName
        )
      : "",
    differentProject: hasProjectOverride,
    isCrossMapped: hasProjectOverride,
    customReportingDays: hasCustomReportingDays,
    // A team-level shift is not an employee assignment. Keep an absent member
    // mapping empty so the roster can show the company attendance default.
    shift: memberShift,
    shiftName: firstNonEmpty(memberShift?.shiftName),
    shiftUnassigned: !memberShift,
    shiftEffectiveTo: firstNonEmpty(
      record.shiftEffectiveTo,
      record.effectiveTo,
      record.currentShift?.effectiveTo,
      record.shift?.effectiveTo,
      record.employeeShift?.effectiveTo
    ),
    isTemporaryShift: Boolean(
      record.isTemporaryShift ??
      record.currentShift?.isTemporary ??
      record.shift?.isTemporary ??
      record.employeeShift?.isTemporary ??
      ((record.shiftEffectiveTo ?? record.effectiveTo ?? record.currentShift?.effectiveTo ?? record.shift?.effectiveTo) &&
        !(record.isPermanent ?? record.currentShift?.isPermanent ?? record.shift?.isPermanent))
    ),
    hasShiftOverride: Boolean(memberShift),
    teamMemberOverride: override?.raw || null,
    raw: record,
    rawResponse: sourceRecord,
    employee
  };
};

export const normalizeTeamRecord = (team = {}) => {
  const sourceRecord = team;
  let record = team;
  for (let depth = 0; depth < 4 && isPlainObject(record); depth += 1) {
    const wrapped = record.team ?? record.Team ?? record.data;
    if (!isPlainObject(wrapped)) break;
    record = wrapped;
  }

  if (!isPlainObject(record)) {
    return null;
  }

  const project = normalizeProjectRecord(
    record.project ??
      record.projectDetails ??
      record.projectData ??
      record.projectInfo ??
      {}
  );
  const reportingManager = normalizeEmployeeRecord(
    record.reportingManager ?? record.manager ?? record.reportingManagerRecord ?? {}
  );
  const reportingManagerName = firstNonEmpty(
    reportingManager?.employeeName,
    resolveDisplayName(record.reportingManagerName),
    resolveDisplayName(record.reportingManager_Name),
    resolveDisplayName(record.reportingManager),
    resolveDisplayName(record.manager),
    resolveDisplayName(record.reportingManagerRecord),
    resolveDisplayName(record.reportingManagerDetails),
    resolveDisplayName(record.managerDetails),
    resolveDisplayName(record.reportingManagerDto),
    resolveDisplayName(record.managerDto),
    resolveDisplayName(record.reportingManager?.name),
    resolveDisplayName(record.reportingManager?.employeeName),
    resolveDisplayName(record.reportingManager?.fullName),
    resolveDisplayName(record.manager?.name),
    resolveDisplayName(record.manager?.employeeName),
    resolveDisplayName(record.manager?.fullName),
    record.managerName
  );
  const reportingDays = normalizeReportingDaysForUi(
    record.reportingDays ??
      record.teamReportingDays ??
      record.teamReportingDaysList ??
      record.reporting_days ??
      []
  );
  const shift = normalizeShift(
    record.shift ?? record.teamShift ?? record.assignedShift ?? record.defaultShift ?? record
  );
  const rawMembers =
    record.members ??
    record.teamMembers ??
    record.team_members ??
    record.projectTeamMembers ??
    record.employees ??
    record.teamEmployees ??
    record.employeeDetails;
  const members = normalizeCollection(rawMembers?.$values ?? rawMembers)
    .map((member) =>
      normalizeTeamMemberRecord(member, {
        teamId: toNumberId(record.teamId ?? record.team_Id ?? record.teamID ?? record.id),
        projectId: project?.projectId,
        projectName: project?.projectName,
        reportingDays,
        shift,
        engagementType: firstNonEmpty(record.engagementType, project?.status)
      })
    )
    .filter(Boolean);

  const teamId = toNumberId(record.teamId ?? record.team_Id ?? record.teamID ?? record.id);
  const teamNumber = firstNonEmpty(record.teamNumber, record.team_Number, record.teamNo);
  const teamName = firstNonEmpty(record.teamName, record.team_Name, record.name);
  const memberCount =
    members.length ||
    toNumberId(
      record.membersCount ??
        record.memberCount ??
        record.teamMembersCount ??
        record.teamMemberCount
    ) ||
    0;

  return {
    id: teamId ?? record.teamId ?? record.id ?? teamNumber ?? teamName,
    teamId,
    teamNumber,
    teamName,
    reportingManagerId: firstNonEmpty(
      record.reportingManagerId,
      record.reportingManager_Id,
      record.reportingManagerID,
      reportingManager?.employeeId
    ),
    reportingManagerName,
    reportingManager: reportingManagerName,
    reportingManagerRecord: reportingManager,
    engagementType: firstNonEmpty(record.engagementType),
    projectId: project?.projectId ?? toNumberId(record.projectId ?? record.project_Id ?? record.projectID),
    projectName: firstNonEmpty(
      project?.projectName,
      record.projectName,
      record.project_Name,
      record.project?.project_Name,
      record.project?.projectName,
      record.project?.name
    ),
    project,
    isActive: Boolean(record.isActive ?? record.IsActive),
    createdAt: record.createdAt ?? record.createdOn ?? null,
    members,
    memberCount,
    membersCount: memberCount,
    reportingDays,
    reportingDayRecords: normalizeCollection(record.reportingDays),
    shift,
    shiftId: shift?.shiftId ?? null,
    shiftName: shift?.shiftName ?? "",
    shiftCode: shift?.shiftCode ?? "",
    shiftStartTime: shift?.startTime ?? "",
    shiftEndTime: shift?.endTime ?? "",
    raw: record,
    rawResponse: sourceRecord
  };
};

const TEAM_MEMBER_COLLECTION_KEYS = [
  "members",
  "teamMembers",
  "team_members",
  "projectTeamMembers",
  "memberDetails",
  "teamMemberDetails",
  "teamMemberList",
  "teamMembersList",
  "teamMemberDtos",
  "employees",
  "teamEmployees",
  "employeeDetails"
];

const extractTeamMemberCollection = (value, depth = 0, seen = new WeakSet()) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isPlainObject(value) || depth > 3) {
    return [];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  for (const key of TEAM_MEMBER_COLLECTION_KEYS) {
    const candidate = value[key];
    const normalizedCandidate = normalizeCollection(candidate);

    if (normalizedCandidate.length > 0) {
      return normalizedCandidate;
    }
  }

  const nestedSources = [
    value.team,
    value.Team,
    value.data,
    value.teamData,
    value.teamDetails,
    value.details
  ];

  for (const nestedSource of nestedSources) {
    const nestedCollection = extractTeamMemberCollection(
      nestedSource,
      depth + 1,
      seen
    );

    if (nestedCollection.length > 0) {
      return nestedCollection;
    }
  }

  return [];
};

export const getTeamMemberCount = (team = {}) => {
  const record = team?.raw ?? team?.team ?? team?.Team ?? team?.data ?? team;
  const memberCollection = extractTeamMemberCollection(record);

  if (memberCollection.length > 0) {
    return memberCollection.length;
  }

  const normalizedCount = Number(team?.memberCount ?? team?.membersCount ?? 0);

  if (Number.isFinite(normalizedCount) && normalizedCount > 0) {
    return normalizedCount;
  }

  return Array.isArray(team?.members) ? team.members.length : 0;
};

export const normalizeProjectTeamRecord = (project = {}) => {
  const record = project?.project ?? project?.Project ?? project;

  if (!isPlainObject(record)) {
    return null;
  }

  const normalizedProject = normalizeProjectRecord(record);
  const teamId = toNumberId(record.teamId ?? record.teamID ?? normalizedProject?.teamId);
  const teamExists = Boolean(
    record.teamExists ??
      record.TeamExists ??
      (teamId !== null || normalizedProject?.teamExists)
  );

  return {
    id: normalizedProject?.projectId ?? normalizedProject?.id,
    projectId: normalizedProject?.projectId ?? toNumberId(record.projectId),
    projectName: normalizedProject?.projectName,
    teamExists,
    teamId,
    teamNumber: firstNonEmpty(record.teamNumber, normalizedProject?.teamNumber),
    teamName: firstNonEmpty(record.teamName, normalizedProject?.teamName),
    reportingManagerId: firstNonEmpty(record.reportingManagerId),
    reportingManagerName: firstNonEmpty(
      record.reportingManagerName,
      record.reportingManager?.name,
      record.reportingManager?.employeeName,
      record.reportingManager?.fullName
    ),
    engagementType: firstNonEmpty(record.engagementType),
    isActive: Boolean(record.isActive ?? record.IsActive),
    members: normalizeCollection(record.projectTeamMembers ?? record.members).map((member) =>
      normalizeTeamMemberRecord(member, {
        teamId,
        projectId: normalizedProject?.projectId,
        projectName: normalizedProject?.projectName,
        reportingDays: normalizeReportingDaysForUi(record.reportingDays ?? [])
      })
    ).filter(Boolean),
    raw: record
  };
};

export const extractApiErrorMessage = (error, fallback = "Something went wrong") => {
  const responseData = error?.response?.data;

  const inspectValue = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const message = inspectValue(item);
        if (message) {
          return message;
        }
      }
      return "";
    }

    if (!isPlainObject(value)) {
      return "";
    }

    const directMessage =
      value.message ||
      value.Message ||
      value.error ||
      value.Error ||
      value.title ||
      value.Title ||
      value.detail ||
      value.Detail ||
      value.exceptionMessage ||
      "";

    if (directMessage) {
      return String(directMessage).trim();
    }

    const errors = value.errors || value.Errors;

    if (errors && typeof errors === "object") {
      for (const item of Object.values(errors)) {
        const message = inspectValue(item);
        if (message) {
          return message;
        }
      }
    }

    return "";
  };

  return inspectValue(responseData) || error?.message || fallback;
};

export const buildCreateTeamPayload = (form = {}) => ({
  teamNumber: String(form.teamNumber ?? "").trim().toUpperCase(),
  teamName: String(form.teamName ?? "").trim(),
  reportingManagerId: String(form.reportingManagerId ?? "").trim(),
  engagementType: String(form.engagementType ?? "").trim(),
  projectId: toNumberId(form.projectId),
  reportingDays: normalizeReportingDaysForApi(form.reportingDays),
  employeeIds: Array.isArray(form.employeeIds)
    ? form.employeeIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : []
});

export const buildUpdateTeamPayload = (form = {}) => ({
  teamId: toNumberId(form.teamId),
  teamNumber: String(form.teamNumber ?? "").trim().toUpperCase(),
  teamName: String(form.teamName ?? "").trim(),
  reportingManagerId: String(form.reportingManagerId ?? "").trim(),
  engagementType: String(form.engagementType ?? "").trim(),
  projectId: toNumberId(form.projectId),
  shiftId: toNumberId(form.shiftId),
  reportingDays: normalizeReportingDays(form.reportingDays),
  employeeIds: Array.isArray(form.employeeIds)
    ? form.employeeIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : []
});

export const buildAddMembersPayload = (teamId, employeeIds = []) => ({
  teamId: toNumberId(teamId),
  employeeIds: Array.isArray(employeeIds)
    ? employeeIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : []
});

export const buildUpdateReportingDaysPayload = (teamId, reportingDays = []) => ({
  teamId: toNumberId(teamId),
  reportingDays: normalizeReportingDays(reportingDays)
});

export const buildMemberOverridePayload = (teamId, member = {}, form = {}) => ({
  teamId: toNumberId(teamId),
  employeeId: resolveMemberEmployeeId(member),
  teamMemberId: resolveMemberTeamMemberId(member),
  customShift: Boolean(form.customShift),
  overrideShiftId: form.customShift ? toNumberId(form.overrideShiftId) : null,
  differentProject: Boolean(form.differentProject),
  projectId: form.differentProject ? toNumberId(form.projectId) : null,
  customReportingDays: Boolean(form.customReportingDays),
  isCrossMapped: Boolean(form.differentProject),
  reportingDays: form.customReportingDays
    ? normalizeReportingDaysForApi(form.reportingDays)
    : []
});
