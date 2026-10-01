import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
export const generateSettlement = payload => api.post(API_ENDPOINTS.fullFinalSettlement.generate, { Employee_Id: String(payload?.Employee_Id ?? "") });
export const approveSettlement = payload => {
  const settlementId = Number(payload?.settlementId);
  if (!Number.isInteger(settlementId) || settlementId <= 0) {
    return Promise.reject(new Error("A valid SettlementId is required for approval."));
  }
  const requestBody = { settlementId, isApproved: payload?.isApproved === true };
  console.log("FULL FINAL SETTLEMENT APPROVAL", { method: "PUT", settlementId, requestBody });
  return api.put(API_ENDPOINTS.fullFinalSettlement.approve, requestBody);
};
export const getSettlements = () => api.get(API_ENDPOINTS.fullFinalSettlement.list);
export const getSettlementByEmployee = id => api.get(API_ENDPOINTS.fullFinalSettlement.byEmployee(id));
export const deleteSettlement = id => api.delete(API_ENDPOINTS.fullFinalSettlement.delete(id));
export const downloadSettlementPdf = id => {
  const settlementId = Number(id);
  console.log("VIEW SETTLEMENT DEBUG", { settlementId, pdfId: settlementId });
  if (!Number.isInteger(settlementId) || settlementId <= 0) {
    return Promise.reject(new Error("A valid SettlementId is required to generate the PDF."));
  }
  return api.get(API_ENDPOINTS.fullFinalSettlement.pdf(settlementId), { responseType: "blob" });
};
