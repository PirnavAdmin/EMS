import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

// ================= PERFORMANCE / APPRAISAL =================

export const getAllAppraisals = (config = {}) =>
  api.get(API_ENDPOINTS.appraisal.list, config);

export const getEmployeeAppraisal = (employeeId, config = {}) =>
  api.get(
    API_ENDPOINTS.appraisal.byEmployee(employeeId),
    config
  );

export const saveAppraisal = (data, config = {}) =>
  api.post(
    API_ENDPOINTS.appraisal.create,
    data,
    config
  );

// ================= MANAGER REVIEW =================

export const managerReview = (
  appraisalId,
  managerRating,
  remarks,
  config = {}
) =>
  api.post(
    API_ENDPOINTS.appraisal.managerReview(appraisalId),
    null,
    {
      ...config,
      params: {
        managerRating,
        remarks,
      },
    }
  );

// ================= HR REVIEW =================

export const hrReview = (
  appraisalId,
  finalRating,
  hike,
  promotion,
  remarks,
  config = {}
) =>
  api.post(
    API_ENDPOINTS.appraisal.hrReview(appraisalId),
    null,
    {
      ...config,
      params: {
        finalRating,
        hike,
        promotion,
        remarks,
      },
    }
  );

// ================= PERFORMANCE CYCLES =================

export const getPerformanceCycles = (
  config = {}
) =>
  api.get(
    API_ENDPOINTS.performanceCycle.list,
    config
  );

// ================= ORIGINAL EMPLOYEE SALARY =================
// Used by HR before the hike is applied.
//
// Backend:
// GET /EmployeeSalaryStructure/{employeeId}

export const getEmployeeSalaryStructure = (
  employeeId,
  config = {}
) =>
  api.get(
    API_ENDPOINTS.employeeSalaryStructure.byEmployeeId(
      employeeId
    ),
    config
  );

// ================= APPRAISAL SALARY =================
// Salary structure associated with a particular appraisal.

export const getAppraisalSalary = (
  employeeId,
  appraisalId,
  config = {}
) =>
  api.get(
    API_ENDPOINTS.appraisalSalary.byAppraisal(
      employeeId,
      appraisalId
    ),
    config
  );

export const saveAppraisalSalary = (
  data,
  config = {}
) =>
  api.post(
    API_ENDPOINTS.appraisalSalary.save,
    data,
    config
  );

// ================= HIKE LETTER =================

export const generateHikeLetter = (
  appraisalId,
  config = {}
) =>
  api.post(
    API_ENDPOINTS.appraisalSalary.generateLetter(
      appraisalId
    ),
    null,
    config
  );

export const downloadHikeLetter = (
  appraisalId,
  config = {}
) =>
  api.get(
    API_ENDPOINTS.appraisalSalary.download(
      appraisalId
    ),
    {
      ...config,
      responseType: "blob",
    }
  );

// ================= EMAIL =================

export const sendHikeEmail = (
  appraisalId,
  config = {}
) =>
  api.post(
    API_ENDPOINTS.appraisalSalary.sendEmail(
      appraisalId
    ),
    null,
    config
  );