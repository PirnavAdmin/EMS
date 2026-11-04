import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildApiUrl } from "../api/endpoints";

export const getPayrollEmployees = (config = {}) =>
  api.get(API_ENDPOINTS.payroll.employees, config);

export const getRecentPayslips = (config = {}) =>
  api.get(API_ENDPOINTS.payroll.recent, config);

export const getMyPayslips = (config = {}) =>
  api.get(API_ENDPOINTS.payroll.myPayslips, config);

export const getPayslipsByEmployee = (employeeId, config = {}) =>
  api.get(API_ENDPOINTS.payroll.byEmployee(employeeId), config);

export const generateAllPayslips = (payload, config = {}) =>
  api.post(API_ENDPOINTS.payroll.generateAll, payload, config);

export const generateManualPayslip = (payload, config = {}) =>
  api.post(API_ENDPOINTS.payroll.manualGenerate, payload, config);

export const downloadPayslip = (payslipId, config = {}) =>
  api.get(buildApiUrl(API_ENDPOINTS.payroll.download(payslipId)), {
    responseType: "blob",
    ...config,
  });

export const deletePayslip = (payslipId, config = {}) =>
  api.delete(API_ENDPOINTS.payroll.delete(payslipId), config);

export const downloadSalaryRegister = (params, config = {}) =>
  api.get(buildApiUrl(API_ENDPOINTS.payroll.salaryRegister), {
    params,
    responseType: "blob",
    ...config,
  });

export const sendAllPayrollEmails = (payload, config = {}) =>
  api.post(API_ENDPOINTS.payroll.sendAllEmails, payload, config);
