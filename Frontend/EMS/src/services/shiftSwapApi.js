import api from "../api/axiosInstance";
import { BASE_URL } from "../api/config";
import { API_ENDPOINTS } from "../api/endpoints";
import { getApiErrorMessage } from "./superAdminService";
import { normalizeStatus } from "../utils/SwapStatus";

const asRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  const value = payload?.data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["items", "list", "records", "rows", "result", "value"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const rowEmployeeId = (row, side) => String(
  side === "from"
    ? row?.fromEmployeeId ?? row?.FromEmployeeId ?? row?.fromEmployee?.employeeId
    : row?.toEmployeeId ?? row?.ToEmployeeId ?? row?.toEmployee?.employeeId
).trim().toLowerCase();

const buildRequestUrl = (path, params) => {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString();
  return `${BASE_URL}${path}${suffix ? `?${suffix}` : ""}`;
};

async function request(method, path, { params, data } = {}) {
  try {
    const response = await api.request({
      method,
      url: path,
      ...(params ? { params } : {}),
      ...(data !== undefined ? { data } : {}),
      ...(method.toLowerCase() === "get" ? { dedupe: false } : {})
    });
    return response.data;
  } catch (error) {
    console.error("Shift swap API request failed", {
      url: buildRequestUrl(path, params),
      status: error?.response?.status ?? "network error",
      message: getApiErrorMessage(error, "Shift swap request failed.")
    });
    throw error;
  }
}

const logSwapFetch = (params, rows) => {
  if (import.meta.env.DEV) {
    console.debug("[ShiftSwap] GET /ShiftSwap", {
      params,
      rowsReturned: rows.length,
      statuses: rows.reduce((counts, row) => {
        const status = String(row?.status ?? row?.currentStatus ?? "(missing)");
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      }, {})
    });
  }
};

export async function getAdminQueue() {
  const params = { forAdmin: true, includePendingEmployee: true };
  const rows = asRows(await request("get", API_ENDPOINTS.shiftSwap.list, { params }))
    .filter((row) => normalizeStatus(row) === "pendingadmin");
  logSwapFetch(params, rows);
  return rows;
}

export async function getEmployeeSwaps(employeeId) {
  const myId = String(employeeId ?? "").trim();
  if (!myId) return [];
  const params = { employeeId: myId, includePendingEmployee: true };
  const rows = asRows(await request("get", API_ENDPOINTS.shiftSwap.list, { params }))
    .filter((row) => rowEmployeeId(row, "from") === myId.toLowerCase() || rowEmployeeId(row, "to") === myId.toLowerCase());
  logSwapFetch(params, rows);
  return rows;
}

export function createSwap(payload) {
  return request("post", API_ENDPOINTS.shiftSwap.create, { data: payload });
}

export function employeeAccept(id) {
  return request("post", API_ENDPOINTS.shiftSwap.employeeAccept(id));
}

export function employeeReject(id, remarks) {
  return request("post", API_ENDPOINTS.shiftSwap.employeeReject(id), {
    data: { remarks: String(remarks ?? "").trim() }
  });
}

export function adminApprove(id) {
  return request("post", API_ENDPOINTS.shiftSwap.adminApprove(id));
}

export function adminReject(id, remarks) {
  return request("post", API_ENDPOINTS.shiftSwap.adminReject(id), {
    data: { remarks: String(remarks ?? "").trim() }
  });
}
