const hasAssignedShift = (employee = {}) => {
  if (!employee || employee.shiftUnassigned) return false;
  const shift = employee.shift ?? employee.currentShift ?? employee.employeeShift ?? employee.assignedShift;
  if (typeof shift === "string") return Boolean(shift.trim());
  if (!shift || typeof shift !== "object") return false;
  const id = shift.shiftId ?? shift.shift_Id ?? shift.id ?? employee.shiftId ?? employee.shift_id;
  const name = shift.shiftName ?? shift.name ?? employee.shiftName ?? employee.currentShiftName;
  return id != null || Boolean(String(name ?? "").trim());
};

/** Resolve timings from the employee's shift, or the company's attendance settings. */
export const getEffectiveTimings = (employee = {}, companySettings = {}) => {
  const shift = employee?.shift ?? employee?.currentShift ?? employee?.employeeShift ?? employee?.assignedShift;
  const shiftTimings = shift?.timings ?? (shift && typeof shift === "object" ? {
    officeStartTime: shift.startTime ?? shift.start_Time ?? "",
    officeEndTime: shift.endTime ?? shift.end_Time ?? "",
    graceMinutes: shift.gracePeriodMinutes ?? shift.graceTimeMinutes ?? null,
    halfDayHours: shift.halfDayHours ?? null,
    fullDayHours: shift.fullDayHours ?? null,
    weeklyOffs: shift.weeklyOffs ?? shift.weeklyOff ?? []
  } : null);
  if (hasAssignedShift(employee) && shiftTimings) return shiftTimings;

  const timings = companySettings?.timings ?? {};
  return {
    officeStartTime: timings.officeStartTime ?? timings.startTime ?? companySettings?.officeStartTime ?? "",
    officeEndTime: timings.officeEndTime ?? timings.endTime ?? companySettings?.officeEndTime ?? "",
    graceMinutes: timings.graceMinutes ?? timings.gracePeriodMinutes ?? companySettings?.graceMinutes ?? companySettings?.gracePeriodMinutes ?? companySettings?.graceTimeMinutes ?? null,
    halfDayHours: timings.halfDayHours ?? companySettings?.halfDayHours ?? null,
    fullDayHours: timings.fullDayHours ?? companySettings?.fullDayHours ?? null,
    weeklyOffs: timings.weeklyOffs ?? companySettings?.weeklyOffs ?? []
  };
};

export const hasEmployeeShift = hasAssignedShift;
