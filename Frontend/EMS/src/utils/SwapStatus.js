const compact = (value) => String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");

export function normalizeStatus(input) {
  const status = compact(typeof input === "object" && input !== null
    ? input.status ?? input.currentStatus ?? input.requestStatus ?? input.statusName
    : input);
  if (!status) return null;
  if (status === "rejectedbyemployee") return "rejectedbyemployee";
  if (status.startsWith("rejectedbyadmin")) return "rejectedbyadmin";
  if (status.startsWith("rejected")) {
    const receiverName = compact(input?.toEmployeeName);
    if (receiverName) return status.includes(receiverName) ? "rejectedbyemployee" : "rejectedbyadmin";
    return status.startsWith("rejectedbyemployee") ? "rejectedbyemployee" : "rejectedbyadmin";
  }
  if (status === "approved" || status === "accepted" || status.includes("approved")) return "approved";
  if (status.startsWith("pendingadmin") || status.includes("waitingforadmin") || status.includes("waitingadmin") || status.startsWith("awaitingadmin")) return "pendingadmin";
  if (status.startsWith("pendingemployee") || status.includes("waitingforemployee") || status.includes("waitingemployee") || status.startsWith("awaitingemployee") || status.includes("employeeapprovalpending")) return "pendingemployee";
  return null;
}

export function canEmployeeRespond(request, myId) {
  return normalizeStatus(request) === "pendingemployee" &&
    String(request?.toEmployeeId ?? "") === String(myId ?? "");
}

export function canAdminDecide(request, isAdmin) {
  return Boolean(isAdmin) && normalizeStatus(request) === "pendingadmin";
}
