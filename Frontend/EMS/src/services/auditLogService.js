import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";

const defined = (value) => value !== undefined && value !== null;

export const auditLogField = (record, ...keys) => {
  for (const key of keys) {
    if (defined(record?.[key])) return record[key];
  }
  return "";
};

export const normalizeAuditLog = (record = {}) => ({
  id: auditLogField(record, "id", "Id", "auditLogId", "AuditLogId", "logId", "LogId"),
  userId: auditLogField(record, "userId", "UserId"),
  userName: auditLogField(record, "userName", "UserName", "employeeName", "EmployeeName", "name", "Name"),
  role: auditLogField(record, "userRole", "UserRole", "role", "Role", "roleName", "RoleName"),
  organizationCode: auditLogField(record, "organizationCode", "OrganizationCode", "orgCode", "OrgCode"),
  action: auditLogField(record, "action", "Action", "actionName", "ActionName"),
  module: auditLogField(record, "module", "Module", "moduleName", "ModuleName"),
  entityName: auditLogField(record, "entityName", "EntityName", "entity", "Entity"),
  entityId: auditLogField(record, "entityId", "EntityId"),
  description: auditLogField(record, "description", "Description", "activityDescription", "ActivityDescription"),
  dateTime: auditLogField(record, "dateTime", "DateTime", "timestamp", "Timestamp", "createdAt", "CreatedAt", "activityDate", "ActivityDate"),
  ipAddress: auditLogField(record, "ipAddress", "IpAddress", "IPAddress"),
  userAgent: auditLogField(record, "userAgent", "UserAgent"),
  requestMethod: auditLogField(record, "requestMethod", "RequestMethod", "httpMethod", "HttpMethod"),
  requestPath: auditLogField(record, "requestPath", "RequestPath", "path", "Path"),
  statusCode: auditLogField(record, "statusCode", "StatusCode"),
  status: auditLogField(record, "status", "Status", "operationStatus", "OperationStatus"),
  correlationId: auditLogField(record, "correlationId", "CorrelationId"),
  oldValues: auditLogField(record, "oldValues", "OldValues"),
  newValues: auditLogField(record, "newValues", "NewValues"),
  raw: record,
});

const normalizePage = (payload = {}, fallback = {}) => {
  const root = payload?.data ?? payload;
  const pagination = root?.pagination ?? root?.Pagination ?? root?.meta ?? root?.Meta ?? {};
  const items = extractCollection(root).map(normalizeAuditLog);
  return {
    items,
    total: Number(root?.totalCount ?? root?.TotalCount ?? root?.totalRecords ?? root?.TotalRecords ?? root?.total ?? root?.Total ?? pagination?.totalCount ?? pagination?.TotalCount ?? pagination?.totalRecords ?? pagination?.TotalRecords ?? items.length),
    page: Number(root?.page ?? root?.Page ?? root?.pageNumber ?? root?.PageNumber ?? pagination?.page ?? pagination?.Page ?? pagination?.pageNumber ?? pagination?.PageNumber ?? fallback.page ?? 1),
    pageSize: Number(root?.pageSize ?? root?.PageSize ?? root?.limit ?? root?.Limit ?? pagination?.pageSize ?? pagination?.PageSize ?? fallback.pageSize ?? 20),
  };
};

export const getAuditLogs = async (params, config = {}) =>
  normalizePage((await api.get(API_ENDPOINTS.auditLogs.list, { params, ...config })).data, params);

export const getAuditLogSummary = async (config = {}) => {
  const response = await api.get(API_ENDPOINTS.auditLogs.summary, config);
  return response.data?.data ?? response.data;
};

export const getAuditLog = async (id, config = {}) => {
  const response = await api.get(API_ENDPOINTS.auditLogs.byId(id), config);
  return normalizeAuditLog(response.data?.data ?? response.data);
};

export const exportAuditLogs = async (params, config = {}) =>
  api.get(API_ENDPOINTS.auditLogs.export, {
    params,
    responseType: "blob",
    ...config,
  });

export const normalizeAuditLogPage = normalizePage;
