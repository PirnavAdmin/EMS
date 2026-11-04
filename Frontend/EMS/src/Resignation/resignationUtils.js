export const value = (item, ...keys) => {
  const sources = [item, item?.employee, item?.Employee, item?.employeeDetails, item?.EmployeeDetails].filter(Boolean);
  return keys.map((key) => sources.map((source) => source?.[key]).find((v) => v !== undefined && v !== null && v !== "")).find((v) => v !== undefined && v !== null && v !== "");
};
export const unwrap = (data) => data?.data ?? data?.result ?? data?.items ?? data;
export const resignationRecord = (data) => { const value = unwrap(data); if (Array.isArray(value)) return value[0] ?? null; if (Array.isArray(value?.data)) return value.data[0] ?? null; if (Array.isArray(value?.items)) return value.items[0] ?? null; return value; };
export const listFrom = (data) => { const v = unwrap(data); return Array.isArray(v) ? v : (v?.items || v?.records || v?.data || []); };
export const idOf = (r) => value(r, "resignationId", "ResignationId", "id", "Id", "resignationID", "ResignationID");
export const statusOf = (r) => value(r, "status", "Status", "overallStatus", "OverallStatus", "managerStatus", "ManagerStatus") || "Pending";
export const errorMessage = (error) => { const s = error?.response?.status; const body = error?.response?.data; const validation = body?.errors && typeof body.errors === "object" ? Object.entries(body.errors).flatMap(([key, messages]) => (Array.isArray(messages) ? messages : [messages]).map(message => `${key}: ${message}`)).join(" ") : ""; return validation || body?.message || body?.detail || body?.title || (typeof body === "string" ? body : "") || (s === 400 ? "The resignation data is invalid. Please check the required fields." : s === 401 ? "Your session has expired." : s === 403 ? "You do not have permission to access resignations." : s === 404 ? "Resignation not found." : s === 409 ? "This resignation conflicts with an existing record." : s >= 500 ? "The server could not process the request." : error?.request ? "Network error. Check your connection." : "Unable to complete the request."); };
export const dateValue = (v) => v ? String(v).slice(0, 10) : "";
