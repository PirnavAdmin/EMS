import { BASE_URL, SERVER_URL } from "./config";

const normalizePath = (path) =>
  String(path)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");

const encodePathSegment = (value) => encodeURIComponent(String(value ?? "").trim());

const isUnsafeLocalPath = (value) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return false;
  }

  if (/^file:/i.test(normalizedValue)) {
    return true;
  }

  if (/^[a-zA-Z]:[\\/]/.test(normalizedValue)) {
    return true;
  }

  if (/^\\\\/.test(normalizedValue)) {
    return true;
  }

  return false;
};
export const API = {
  // ================= AUTH =================
  AUTH: {
    SUPER_ADMIN_LOGIN: "/SuperAdmin/login",
    ADMIN_LOGIN: "/Admin/login",
    USER_LOGIN: "/user/login",
    REGISTER: "/user/register",
    ADMIN: {
      FORGOT_PASSWORD: "/Admin/forgot-password",
      VERIFY_OTP: "/Admin/verify-otp",
      RESET_PASSWORD: "/Admin/reset-password",
      CHANGE_PASSWORD: "/Admin/change-password",
    },
    USER: {
      FORGOT_PASSWORD: "/User/forgot-password",
      VERIFY_OTP: "/User/verify-otp",
      RESET_PASSWORD: "/User/reset-password",
      CHANGE_PASSWORD: "/User/change-password",
    },
  },

  // ================= DASHBOARD =================
  DASHBOARD: {
    SUPER_ADMIN: "/SuperAdmin/dashboard",
    ADMIN: "/dashboard",
    USER: "/user-dashboard",
  },

  // ================= SUPER ADMIN =================
  SUPER_ADMIN: {
    LOGIN: "/SuperAdmin/login",
    DASHBOARD: "/SuperAdmin/dashboard",
  },

  // ================= ADMIN MANAGEMENT =================
  ADMIN: {
    CREATE: "/Admin",
    LIST: "/Admin",
    UPDATE_STATUS: (adminId) => `/Admin/${adminId}/status`,
  },

  // ================= ADMIN PERMISSIONS =================
  ADMIN_PERMISSION: {
    SAVE: "/AdminPermission/save",
    GET: (adminId) => `/AdminPermission/${adminId}`,
    ALLOWED_MODULES: "/AdminPermission/allowed-modules",
  },

  // ================= ADMIN SUBSCRIPTIONS =================
  ADMIN_SUBSCRIPTION: {
    CREATE: "/AdminSubscription",
    LIST: "/AdminSubscription",
    GET_BY_ADMIN: (adminId) => `/AdminSubscription/${adminId}`,
    UPDATE: (adminId) => `/AdminSubscription/${adminId}`,
    USAGE: (adminId) => `/AdminSubscription/${adminId}/usage`,
  },

  // ================= ATTENDANCE =================
  ATTENDANCE: {
    CHECKIN: "/Attendance/checkin",
    CHECKOUT: "/Attendance/checkout",

    START_BREAK: "/Attendance/start-break",
    END_BREAK: "/Attendance/end-break",

    WEEKLY: "/Attendance/weekly",
    PREVIOUS_WEEK: "/Attendance/previous-week",
    CURRENT_MONTH: "/Attendance/current-month",
    PREVIOUS_MONTH: "/Attendance/previous-month",
    MONTH: "/Attendance/month",
    MONTHLY: "/Attendance/monthly",
    TODAY: "/Attendance/today",
    UPDATE: "/Attendance/admin/update-attendance",
    DOWNLOAD_MONTHLY: "/Attendance/admin/download-monthly",
    DOWNLOAD_WEEKLY: "/Attendance/admin/download-weekly",
    DOWNLOAD_DAILY: "/Attendance/admin/download-daily",
    STATS_TODAY: "/Attendance/stats/today",
    STATS_YEAR: "/Attendance/stats/year",
    USER_DASHBOARD_OVERVIEW: "/Attendance/dashboard-attendance",
    ADMIN_DASHBOARD_OVERVIEW: "/Attendance/admin-dashboard-overview",
    RUN_ABSENT: "/Attendance/run/absent-check",
    RUN_MISSING: "/Attendance/run/missing-checkout",
    UPLOAD_MONTHLY: "/Attendance/admin/upload-monthly",

    WORKING_HOURS: (employeeId) =>
      `/Attendance/working-hours/${employeeId}`,
  },

  // ================= ADMIN NOTIFICATIONS =================
  ADMIN_NOTIFICATION: {
    LIST: "/admin-notifications",
    COUNT: "/admin-notifications/count",
    READ: (id) => `/admin-notifications/read/${id}`,
    READ_ALL: "/admin-notifications/read-all",
  },

  // ================= USER NOTIFICATIONS =================
  USER_NOTIFICATION: {
    LIST: "/user-notifications",
    READ: (id) => `/user-notifications/${id}/read`,
    MARK_ALL: "/user-notifications/mark-all",
  },

  // ================= ASSETS =================
  ASSETS: {
    LIST: "/Assets",
    CREATE: "/Assets",
    GET_BY_ID: (id) => `/Assets/${id}`,
    UPDATE: (id) => `/Assets/${id}`,
    DELETE: (id) => `/Assets/${id}`,
  },

  // ================= BRANCHES =================
  BRANCHES: {
    LIST: "/Branches",
    CREATE: "/Branches",
    UPDATE: (id) => `/Branches/${id}`,
    DELETE: (id) => `/Branches/${id}`,
  },

  // ================= CLIENTS =================
  CLIENTS: {
    LIST: "/Clients",
    CREATE: "/Clients",
    GET_BY_NAME: (name) => `/Clients/by-name/${name}`,
    PROJECTS: (id) => `/Clients/${id}/projects`,
    UPDATE: (name) => `/Clients/${name}`,
    DELETE: (name) => `/Clients/${name}`,
  },

  // ================= DEPARTMENTS =================
  DEPARTMENTS: {
    LIST: "/Departments",
    CREATE: "/Departments",
    GET_BY_ID: (id) => `/Departments/${id}`,
    UPDATE: (id) => `/Departments/${id}`,
    DELETE: (id) => `/Departments/${id}`,
  },

  // ================= EMPLOYEES =================
  EMPLOYEES: {
    LIST: "/Employees",
    CREATE: "/Employees",
    UPDATE: (id) => `/Employees/${id}`,
    DELETE: (id) => `/Employees/${id}`,
    DOWNLOAD_FULL_MASTER: "/Employees/download-full-master",
    DOWNLOAD_EMPLOYEE_TEMPLATE: "/Employees/download-employee-template",
    BULK_UPLOAD: "/Employees/bulk-upload",
    UPCOMING_BIRTHDAYS: "/Employees/upcoming-birthdays",
    EXPORT_PROFILE_PDF: (employeeId) =>
      `/Employees/export-profile-pdf/${employeeId}`,
  },

  // ================= EMPLOYEE FULL DETAILS =================
  EMPLOYEE_FULL: {
    MY_DETAILS: "/EmployeeFullDetail/my-details",
    UPDATE_MY: "/EmployeeFullDetail/my-details",
    GET_BY_ID: (id) => `/EmployeeFullDetail/${id}`,
  },

  // ================= EMPLOYEE PERSONAL =================
  EMPLOYEE_PERSONAL: {
    // Kept lowercase to match the current working backend path used by the app.
    CREATE: "/employeepersonalinfo",
    LIST: "/employeepersonalinfo",
    GET_BY_ID: (id) => `/employeepersonalinfo/${encodePathSegment(id)}`,
    UPDATE: (id) => `/employeepersonalinfo/${encodePathSegment(id)}`,
    DELETE: (id) => `/employeepersonalinfo/${encodePathSegment(id)}`,
  },

  // ================= BANK DETAILS =================
  BANK: {
    CREATE: "/EmployeeBankDetails",
    LIST: "/EmployeeBankDetails",
    UPDATE: (id) => `/EmployeeBankDetails/${id}`,
    DELETE: (id) => `/EmployeeBankDetails/${id}`,
  },

  EMPLOYEE_SALARY_STRUCTURE: {
    CREATE: "/EmployeeSalaryStructure",
    GET_BY_EMPLOYEE: (employeeId) =>
      `/EmployeeSalaryStructure/${encodePathSegment(employeeId)}`,
    UPDATE: (id) =>
      `/EmployeeSalaryStructure/${encodePathSegment(id)}`,
  },

  // ================= EDUCATION =================
  EDUCATION: {
    CREATE: "/EmployeeEducation",
    GET_BY_ID: (id) => `/EmployeeEducation/${id}`,
    UPDATE: (id) => `/EmployeeEducation/${id}`,
    DELETE: (id) => `/EmployeeEducation/${id}`,
  },

  // ================= EXPERIENCE =================
  EXPERIENCE: {
    CREATE: "/EmployeeExperience",
    UPDATE: (id) => `/EmployeeExperience/${id}`,
    DELETE: (id) => `/EmployeeExperience/${id}`,
  },
  //================== EMPLOYEE DOCUMENTS =================
  EMPLOYEE_DOCUMENTS: {
    UPLOAD: "/EmployeeDocuments/upload",

    GET_BY_EMPLOYEE: (employeeId) =>
      `/EmployeeDocuments/${employeeId}`,

    DELETE: (id) =>
      `/EmployeeDocuments/${id}`,

    VIEW: (id) =>
      `/EmployeeDocuments/view/${id}`,

    DOWNLOAD: (id) =>
      `/EmployeeDocuments/download/${id}`,

    VERIFY: (id) =>
      `/EmployeeDocuments/verify/${id}`,

    REJECT: (id) =>
      `/EmployeeDocuments/reject/${id}`,

    CHECKLIST: (employeeId) =>
      `/EmployeeDocuments/checklist/${employeeId}`,
  },
  //================== ONBOARDING =================
  ONBOARDING_PERSONAL_INFO: {
    LIST: "/OnboardingPersonalInfo",
    CREATE: "/OnboardingPersonalInfo",
    GET_BY_ID: (onboardingId) => `/OnboardingPersonalInfo/${onboardingId}`,
    UPDATE: (onboardingId) => `/OnboardingPersonalInfo/${onboardingId}`,
    DELETE: (onboardingId) => `/OnboardingPersonalInfo/${onboardingId}`,
  },
  ONBOARDING_EDUCATION: {
    LIST: "/OnboardingEducation",
    CREATE: "/OnboardingEducation",
    GET_BY_ID: (onboardingId) => `/OnboardingEducation/${onboardingId}`,
    UPDATE: (onboardingId) => `/OnboardingEducation/${onboardingId}`,
  },
  ONBOARDING_EXPERIENCE: {
    LIST: "/OnboardingExperience",
    CREATE: "/OnboardingExperience",
    GET_BY_ID: (onboardingId) => `/OnboardingExperience/${onboardingId}`,
    UPDATE: (onboardingId) => `/OnboardingExperience/${onboardingId}`,
  },
  ONBOARDING_DOCUMENTS: {
    UPLOAD: "/OnboardingDocuments/upload",
    GET_BY_ONBOARDING: (onboardingId) => `/OnboardingDocuments/${onboardingId}`,
    GET_BY_ID: (id) => `/OnboardingDocuments/${id}`,
    DOWNLOAD: (id) => `/OnboardingDocuments/download/${id}`,
    DELETE: (id) => `/OnboardingDocuments/${id}`,
  },
  //================== EMPLOYEE AGREEMENTS =================
  AGREEMENTS: {
    UPLOAD: "/Agreement/upload",
    SIGN: "/Agreement/sign",
    ADMIN_STATUS: "/Agreement/GetAllAgreements",
    MY_AGREEMENTS: "/Agreement/myagreements",
    VIEW_AGREEMENT: (id) => `/Agreement/view/${id}`,
    VIEW_SIGNED: (id) => `/Agreement/ViewSigned/${id}`,
    DOWNLOAD_SIGNED: (id) => `/Agreement/DownloadSigned/${id}`,
    PENDING: (employeeId) => `/Agreement/Pending/${employeeId}`,
    SIGNED: (employeeId) => `/Agreement/Signed/${employeeId}`,
    DOWNLOAD: (id) => `/Agreement/download/${id}`,
    FILE_PATH: (id) => `/Agreement/filepath/${id}`,
  },
  // ================= LEAVE =================
  LEAVE: {
    CREATE: "/EmployeeLeave",
    LIST: "/EmployeeLeave",
    ALL: "/EmployeeLeave/all",
    APPROVE: (id) => `/EmployeeLeave/approve-reject/${id}`,
    BALANCE: "/EmployeeLeave/balance",
    UPDATE_STATUS: (id) => `/EmployeeLeave/update-status/${id}`,
    employeeLeaveDetails: (employeeId) =>
      `/EmployeeLeave/employee-leave-details/${employeeId}`,
    DELETE: (id) => `/EmployeeLeave/${id}`,
    CANCEL: (id) => `/EmployeeLeave/cancel/${id}`,
    APPLY: "/EmployeeLeave/apply",
    MY_LEAVES: "/EmployeeLeave/my-leaves",
  },

  // ================= WFH =================
  WFH: {
    APPLY: "/EmployeeLeave/apply-wfh",
    ALL: "/EmployeeLeave/all-wfh",
    MY: "/EmployeeLeave/my-wfh",
    UPDATE_STATUS: (id) => `/EmployeeLeave/update-wfh-status/${id}`,
    CANCEL: (id) => `/EmployeeLeave/cancel-wfh/${id}`,
  },

  // ================= SETTINGS =================
  SETTINGS: {
    EMAIL: "/Settings/email",
    ATTENDANCE: "/Settings/attendance",
    LEAVE: "/Settings/leave",
    COMPANY: "/Settings/company",
    NOTIFICATION: "/Settings/notification",
    GENERAL: "/Settings/general",
    POLICIES: "/Settings/policies",
    POLICY: (type) => `/Settings/policy/${type}`,
    UPDATE_POLICY: "/Settings/policy",
    BRANDING: "/Settings/branding",
    BRANDING_UPLOAD: "/Settings/branding/logo",
  },

  // ================= HRMS SETTINGS =================
  APPRAISAL: {
    LIST: "/Appraisal",
    CREATE: "/Appraisal",
    BY_EMPLOYEE: (employeeId) => `/Appraisal/${employeeId}`,
    MANAGER_REVIEW: (id) => `/Appraisal/manager-review/${id}`,
    HR_REVIEW: (id) => `/Appraisal/hr-review/${id}`,
    DELETE: (id) => `/Appraisal/${id}`,
  },

  EMPLOYEE_CLEARANCE: {
    CREATE: "/EmployeeClearance/create",
    DEPARTMENT: "/EmployeeClearance/department",
    BY_RESIGNATION: (resignationId) => `/EmployeeClearance/resignation/${resignationId}`,
    PENDING: "/EmployeeClearance/pending",
    COMPLETED: "/EmployeeClearance/completed",
  },

  EMPLOYEE_GOAL: {
    LIST: "/EmployeeGoal",
    CREATE: "/EmployeeGoal",
    BY_EMPLOYEE: (employeeId) => `/EmployeeGoal/${employeeId}`,
    UPDATE: (id) => `/EmployeeGoal/${id}`,
    DELETE: (id) => `/EmployeeGoal/${id}`,
  },

  EMPLOYEE_RESIGNATION: {
    APPLY: "/EmployeeResignation/apply",
    UPDATE: "/EmployeeResignation/update",
    DELETE: (resignationId) => `/EmployeeResignation/${resignationId}`,
    BY_ID: (resignationId) => `/EmployeeResignation/${resignationId}`,
    LIST: "/EmployeeResignation",
    BY_EMPLOYEE: (employeeId) => `/EmployeeResignation/employee/${employeeId}`,
    PENDING_MANAGER: "/EmployeeResignation/pending-manager",
    MANAGER_APPROVAL: "/EmployeeResignation/manager-approval",
    PENDING_HR: "/EmployeeResignation/pending-hr",
    HR_APPROVAL: "/EmployeeResignation/hr-approval",
  },

  EMPLOYEE_SHIFT: {
    ASSIGN: "/EmployeeShift/assign",
    BULK_ASSIGN: "/EmployeeShift/bulk-assign",
    LIST: "/EmployeeShift",
    BY_EMPLOYEE: (employeeId) => `/EmployeeShift/${employeeId}`,
    DELETE: (assignmentId) => `/EmployeeShift/${assignmentId}`,
  },

  EMPLOYEE_WEEKLY_OFF: {
    LIST: "/EmployeeWeeklyOff",
    CREATE: "/EmployeeWeeklyOff",
    BY_ID: (id) => `/EmployeeWeeklyOff/${id}`,
    UPDATE: (id) => `/EmployeeWeeklyOff/${id}`,
    DELETE: (id) => `/EmployeeWeeklyOff/${id}`,
  },

  EXIT_INTERVIEW: {
    CREATE: "/ExitInterview",
    LIST: "/ExitInterview",
    BY_RESIGNATION: (resignationId) => `/ExitInterview/resignation/${resignationId}`,
    DELETE: (exitInterviewId) => `/ExitInterview/${exitInterviewId}`,
  },

  FULL_FINAL_SETTLEMENT: {
    GENERATE: "/FullFinalSettlement/generate",
    APPROVE: "/FullFinalSettlement/approve",
    LIST: "/FullFinalSettlement",
    BY_EMPLOYEE: (employeeId) => `/FullFinalSettlement/${employeeId}`,
    DELETE: (settlementId) => `/FullFinalSettlement/${settlementId}`,
  },

  GOAL_REVIEW: {
    LIST: "/GoalReview",
    CREATE: "/GoalReview",
    UPDATE: (id) => `/GoalReview/${id}`,
    DELETE: (id) => `/GoalReview/${id}`,
  },

  PERFORMANCE_CYCLE: {
    LIST: "/PerformanceCycle",
    CREATE: "/PerformanceCycle",
    BY_ID: (id) => `/PerformanceCycle/${id}`,
    UPDATE: (id) => `/PerformanceCycle/${id}`,
    DELETE: (id) => `/PerformanceCycle/${id}`,
    DASHBOARD: "/PerformanceDashboard",
  },

  SHIFT: {
    LIST: "/Shift",
    CREATE: "/Shift",
    BY_ID: (id) => `/Shift/${id}`,
    UPDATE: (id) => `/Shift/${id}`,
    DELETE: (id) => `/Shift/${id}`,
  },

  SHIFT_CHANGE_REQUEST: {
    LIST: "/ShiftChangeRequest",
    CREATE: "/ShiftChangeRequest",
    BY_ID: (id) => `/ShiftChangeRequest/${id}`,
    DELETE: (id) => `/ShiftChangeRequest/${id}`,
    APPROVE: "/ShiftChangeRequest/approve",
  },

  SHIFT_PLANNER: {
    LIST: "/ShiftPlanner",
    CREATE: "/ShiftPlanner",
    BY_ID: (id) => `/ShiftPlanner/${id}`,
    UPDATE: (id) => `/ShiftPlanner/${id}`,
    DELETE: (id) => `/ShiftPlanner/${id}`,
    PUBLISH: (id) => `/ShiftPlanner/publish/${id}`,
    COPY_WEEK: "/ShiftPlanner/copy-week",
    COPY_MONTH: "/ShiftPlanner/copy-month",
  },

  SHIFT_ROTATION: {
    LIST: "/ShiftRotation",
    CREATE: "/ShiftRotation",
    BY_ID: (id) => `/ShiftRotation/${id}`,
    UPDATE: (id) => `/ShiftRotation/${id}`,
    DELETE: (id) => `/ShiftRotation/${id}`,
  },

  SHIFT_SWAP: {
    LIST: "/ShiftSwap",
    CREATE: "/ShiftSwap",
    BY_ID: (id) => `/ShiftSwap/${id}`,
    DELETE: (id) => `/ShiftSwap/${id}`,
    APPROVE: "/ShiftSwap/approve",
  },

  SHIFT_ROSTER: {
    LIST: "/ShiftRoster",
    CREATE: "/ShiftRoster",
    BY_ID: (id) => `/ShiftRoster/${id}`,
    UPDATE: (id) => `/ShiftRoster/${id}`,
    DELETE: (id) => `/ShiftRoster/${id}`,
    BY_EMPLOYEE: (employeeId) => `/ShiftRoster/employee/${employeeId}`,
    BULK: "/ShiftRoster/bulk",
  },

  // ================= TAXATION =================
  TAX_DECLARATION: {
    LIST: "/TaxDeclaration",
    CREATE: "/TaxDeclaration",
    UPDATE: "/TaxDeclaration",
    BY_EMPLOYEE: (employeeId) => `/TaxDeclaration/${employeeId}`,
    SUBMIT: (id) => `/TaxDeclaration/submit/${id}`,
    APPROVE: (id) => `/TaxDeclaration/approve/${id}`,
    DELETE: (id) => `/TaxDeclaration/${id}`,
  },

  TAX_DECLARATION_ITEM: {
    CREATE: "/TaxDeclarationItem",
    UPDATE: "/TaxDeclarationItem",
    BY_DECLARATION: (declarationId) => `/TaxDeclarationItem/${declarationId}`,
    DELETE: (id) => `/TaxDeclarationItem/${id}`,
  },

  TAX_PROOF: {
    UPLOAD: "/TaxProof/upload",
    BY_ITEM: (itemId) => `/TaxProof/${itemId}`,
    APPROVE: (id) => `/TaxProof/approve/${id}`,
    REJECT: (id) => `/TaxProof/reject/${id}`,
    DELETE: (id) => `/TaxProof/${id}`,
  },

  TDS: {
    CALCULATE: (employeeId) => `/TDS/calculate/${employeeId}`,
    BY_EMPLOYEE: (employeeId) => `/TDS/${employeeId}`,
  },

  TEMPLATE: {
  LIST: "/Template",
  CREATE: "/Template",
  DELETE: (id) => `/Template/${id}`,
  DOWNLOAD: (id) => `/Template/download/${id}`,
  SET_DEFAULT: (id) => `/Template/set-default/${id}`,
},

  TEMPLATE_MODULE: {
    LIST: "/TemplateModule",
    CREATE: "/TemplateModule",
    UPDATE: (id) => `/TemplateModule/${id}`,
    DELETE: (id) => `/TemplateModule/${id}`,
},

  WORKFLOW: {
    CREATE: "/Workflow/create",
    ADD_STEP: "/Workflow/add-step",
    LIST: "/Workflow",
    STEPS: (workflowId) => `/Workflow/${workflowId}/steps`,
    PENDING: (approverId) => `/Workflow/pending/${approverId}`,
    HISTORY: "/Workflow/history",
    APPROVE: "/Workflow/approve",
  },

  FORM16: {
    GENERATE: (employeeId) => `/Form16/generate/${employeeId}`,
    BY_EMPLOYEE: (employeeId) => `/Form16/${employeeId}`,
    DOWNLOAD: (id) => `/Form16/download/${id}`,
    DELETE: (id) => `/Form16/${id}`,
  },

  // ================= TEAM =================
  TEAM: {
    LIST: "/Team",
    CREATE: "/Team/create",
    GET_BY_ID: (teamId) => `/Team/${teamId}`,
    UPDATE: "/Team/update",
    DELETE: (teamId) => `/Team/${teamId}`,
    ADD_MEMBERS: "/Team/add-members",
    REMOVE_MEMBER: (teamId, employeeId) =>
      `/Team/${teamId}/member/${employeeId}`,
    UPDATE_REPORTING_DAYS: "/Team/update-reporting-days",
    MEMBER_OVERRIDE: "/Team/member-override",
    AVAILABLEEMPLOYEES: "/Team/available-employees",
    MANAGERS: "/Team/managers",
  },

  // ================= HOLIDAYS =================
  HOLIDAYS: {
    LIST: "/Holidays",
    CREATE: "/Holidays",
    UPDATE: (id) => `/Holidays/${id}`,
    DELETE: (id) => `/Holidays/${id}`,
  },

  // ================= JOB OPENINGS =================
  JOBS: {
    LIST: "/JobOpenings",
    CREATE: "/JobOpenings",
    UPDATE: (title) => `/JobOpenings/${title}`,
    DELETE: (title) => `/JobOpenings/${title}`,
  },

  // ================= PROJECTS =================
  PROJECTS: {
    LIST: "/Projects",
    CREATE: "/Projects",
    GET_BY_ID: (id) => `/Projects/${id}`,
    UPDATE: (id) => `/Projects/${id}`,
    DELETE: (id) => `/Projects/${id}`,
  },

  // ================= TICKETS =================
  TICKETS: {
    LIST: "/Ticket/GetAll",
    CREATE: "/Ticket/Create",
    GET_BY_ID: (id) => `/Ticket/${id}`,
    BY_EMPLOYEE: (employeeId) => `/Ticket/employee/${employeeId}`,
    UPDATE: (id) => `/Ticket/Update/${id}`,
    DELETE: (id) => `/Ticket/${id}`,
    UPDATE_STATUS: (id) => `/Ticket/UpdateStatus/${id}`,
    MY_TICKETS: "/Ticket/MyTickets",
    START_WORK: "/Ticket/start-work",
    STOP_WORK: "/Ticket/stop-work",
    AUTO_ASSIGN: "/Ticket/auto-assign",
    EXPORT: "/Ticket/Export",
    DOWNLOAD_TEMPLATE: "/Ticket/DownloadTemplate",
    BULK_UPLOAD: "/Ticket/BulkUpload",
  },

  // ================= ROLES =================
  ROLES: {
    LIST: "/Roles",
    CREATE: "/Roles",
    UPDATE: (id) => `/Roles/${id}`,
    DELETE: (id) => `/Roles/${id}`,
  },

  // ================= ROLE PERMISSION =================
  ROLE_PERMISSION: {
    GET: (roleName) => `/RolePermission/${encodePathSegment(roleName)}`,
    SAVE: "/RolePermission/save",
    MODULES: "/RolePermission/allowed-modules",
    EMPLOYEES: (roleName) => `/RolePermission/employees/${encodePathSegment(roleName)}`,
  },

  // ================= USER PERMISSION =================
  USER_PERMISSION: {
    SAVE: "/UserPermission",
    GET: (employeeId) => `/UserPermission/${employeeId}`,
    ALLOWED: (employeeId) => `/UserPermission/allowed/${employeeId}`,
  },

  // ================= PERMISSION =================
  PERMISSION: {
    GET: "/Permission",
  },

  // ================= REPORTS =================
  REPORTS: {
    ALL: "/reports/all",
  },

  // ================= PAYSLIP =================
  PAYSLIP: {
    // Kept as PaySlip because that is what the current app/backend uses.
    GENERATE: "/PaySlip/generate",
    GENERATE_ALL: "/PaySlip/generate-all",
    SEND_ALL_EMAILS: "/PaySlip/send-all-emails",
    RECENT: "/PaySlip/recent",
    PREVIEW: (id) => `/PaySlip/preview/${id}`,
    DOWNLOAD: (id) => `/PaySlip/download/${id}`,
    DELETE: (id) => `/PaySlip/${id}`,
    SALARY_REGISTER: "/PaySlip/salary-register",
    MY: "/PaySlip/my",
    MANUAL_GENERATE: "/manual-payslip/generate",
  },

  // ================= OFFER LETTER =================
  OFFER: {
    // Kept Generate casing to match the current working backend route.
    GENERATE: "/OfferLetter/Generate",
    LIST: "/OfferLetter/all",
    CALCULATE_BREAKUP: (ctc) =>
      `/OfferLetter/salary-structure/${encodeURIComponent(String(ctc))}`,
    PREVIEW: (id) => `/OfferLetter/preview/${id}`,
    SEND: "/OfferLetter/send",
    SEND_STATUS: (id) => `/OfferLetter/${id}/send-status`,
    DOWNLOAD: (id) => `/OfferLetter/download/${id}`,
    DELETE: (id) => `/OfferLetter/${id}`,
  },

  // ================= RELIEVING LETTER =================
  RELIEVING_LETTER: {
    GENERATE: "/RelievingLetter/generate",
    GET_ALL: "/RelievingLetter/all",
    PREVIEW: (id) => `/RelievingLetter/preview/${id}`,
    SEND: "/RelievingLetter/send",
    SEND_STATUS: (id) => `/RelievingLetter/${id}/send-status`,
    DOWNLOAD: (id) => `/RelievingLetter/download/${id}`,
    DELETE: (id) => `/RelievingLetter/${id}`,
  },

  // ================= EXPERIENCE LETTER =================
  EXPERIENCE_LETTER: {
    GENERATE: "/ExperienceOfferLetter/generate",
    LIST: "/ExperienceOfferLetter/all",
    DOWNLOAD: (id) => `/ExperienceOfferLetter/download/${id}`,
  },

  // ================= SEARCH =================
  SEARCH: {
    MODULE: "/ModuleSearch/search",
  },

  // ================= LEAVE BALANCE =================
  LEAVE_BALANCE: {
    GET: (id) => `/LeaveBalance/${id}`,
    BALANCE: (employeeId) => `/LeaveBalance/balance/${employeeId}`,
    MY_LEAVE_BALANCE: "/LeaveBalance/my-leave-balance",
  },
};

export const API_ENDPOINTS = {
  auth: {
    superAdminLogin: API.AUTH.SUPER_ADMIN_LOGIN,
    adminLogin: API.AUTH.ADMIN_LOGIN,
    userLogin: API.AUTH.USER_LOGIN,
    userRegister: API.AUTH.REGISTER,
    adminForgotPassword: API.AUTH.ADMIN.FORGOT_PASSWORD,
    adminVerifyOtp: API.AUTH.ADMIN.VERIFY_OTP,
    adminResetPassword: API.AUTH.ADMIN.RESET_PASSWORD,
    adminChangePassword: API.AUTH.ADMIN.CHANGE_PASSWORD,
    userForgotPassword: API.AUTH.USER.FORGOT_PASSWORD,
    userVerifyOtp: API.AUTH.USER.VERIFY_OTP,
    userResetPassword: API.AUTH.USER.RESET_PASSWORD,
    userChangePassword: API.AUTH.USER.CHANGE_PASSWORD,
    // Backward-compatible aliases used by current screens.
    forgotPassword: API.AUTH.ADMIN.FORGOT_PASSWORD,
    verifyOtp: API.AUTH.ADMIN.VERIFY_OTP,
    resetPassword: API.AUTH.ADMIN.RESET_PASSWORD,
    forgotPasswordByRole: (role = "admin") =>
      String(role).toLowerCase() === "user"
        ? API.AUTH.USER.FORGOT_PASSWORD
        : API.AUTH.ADMIN.FORGOT_PASSWORD,
    verifyOtpByRole: (role = "admin") =>
      String(role).toLowerCase() === "user"
        ? API.AUTH.USER.VERIFY_OTP
        : API.AUTH.ADMIN.VERIFY_OTP,
    resetPasswordByRole: (role = "admin") =>
      String(role).toLowerCase() === "user"
        ? API.AUTH.USER.RESET_PASSWORD
        : API.AUTH.ADMIN.RESET_PASSWORD,
    changePasswordByRole: (role = "admin") =>
      String(role).toLowerCase() === "user"
        ? API.AUTH.USER.CHANGE_PASSWORD
        : API.AUTH.ADMIN.CHANGE_PASSWORD,
  },
  USER: {
    FORGOT_PASSWORD: API.AUTH.USER.FORGOT_PASSWORD,
    VERIFY_OTP: API.AUTH.USER.VERIFY_OTP,
    RESET_PASSWORD: API.AUTH.USER.RESET_PASSWORD,
    CHANGE_PASSWORD: API.AUTH.USER.CHANGE_PASSWORD,
  },
  rolePermission: {
    allowedModules: API.ROLE_PERMISSION.MODULES,
    get: API.ROLE_PERMISSION.GET,
    byRoleId: API.ROLE_PERMISSION.GET,
    byRoleName: API.ROLE_PERMISSION.GET,
    save: API.ROLE_PERMISSION.SAVE,
    employees: API.ROLE_PERMISSION.EMPLOYEES,
  },
  userPermission: {
    save: API.USER_PERMISSION.SAVE,
    get: API.USER_PERMISSION.GET,
    allowed: API.USER_PERMISSION.ALLOWED,
  },
  permission: {
    get: API.PERMISSION.GET,
  },
  dashboard: API.DASHBOARD.ADMIN,
  superAdmin: {
    login: API.SUPER_ADMIN.LOGIN,
    dashboard: API.SUPER_ADMIN.DASHBOARD,
  },
  adminManagement: {
    create: API.ADMIN.CREATE,
    list: API.ADMIN.LIST,
    updateStatus: API.ADMIN.UPDATE_STATUS,
  },
  adminPermission: {
    save: API.ADMIN_PERMISSION.SAVE,
    get: API.ADMIN_PERMISSION.GET,
    allowedModules: API.ADMIN_PERMISSION.ALLOWED_MODULES,
  },
  adminSubscription: {
    create: API.ADMIN_SUBSCRIPTION.CREATE,
    list: API.ADMIN_SUBSCRIPTION.LIST,
    byAdmin: API.ADMIN_SUBSCRIPTION.GET_BY_ADMIN,
    update: API.ADMIN_SUBSCRIPTION.UPDATE,
    usage: API.ADMIN_SUBSCRIPTION.USAGE,
  },
  userDashboard: API.DASHBOARD.USER,
  departments: {
    list: API.DEPARTMENTS.LIST,
    byId: API.DEPARTMENTS.GET_BY_ID,
  },
  employees: {
    list: API.EMPLOYEES.LIST,
    byId: API.EMPLOYEES.UPDATE,
    downloadFullMaster: API.EMPLOYEES.DOWNLOAD_FULL_MASTER,
    downloadEmployeeTemplate: API.EMPLOYEES.DOWNLOAD_EMPLOYEE_TEMPLATE,
    bulkUpload: API.EMPLOYEES.BULK_UPLOAD,
    upcomingBirthdays: API.EMPLOYEES.UPCOMING_BIRTHDAYS,
    exportProfilePdf: API.EMPLOYEES.EXPORT_PROFILE_PDF,
  },
  employeeFullDetail: {
    byId: API.EMPLOYEE_FULL.GET_BY_ID,
    myDetails: API.EMPLOYEE_FULL.MY_DETAILS,
  },
  employeePersonalInfo: {
    list: API.EMPLOYEE_PERSONAL.LIST,
    byEmployeeId: API.EMPLOYEE_PERSONAL.GET_BY_ID,
  },
  employeeBankDetails: {
    list: API.BANK.LIST,
    byEmployeeId: API.BANK.UPDATE,
  },
  employeeSalaryStructure: {
    list: API.EMPLOYEE_SALARY_STRUCTURE.CREATE,
    byEmployeeId: API.EMPLOYEE_SALARY_STRUCTURE.GET_BY_EMPLOYEE,
    update: API.EMPLOYEE_SALARY_STRUCTURE.UPDATE,
  },
  employeeEducation: {
    list: API.EDUCATION.CREATE,
    byEmployeeId: API.EDUCATION.GET_BY_ID,
  },
  employeeExperience: {
    list: API.EXPERIENCE.CREATE,
    byEmployeeId: API.EXPERIENCE.UPDATE,
  },
  employeeDocuments: {
    upload: API.EMPLOYEE_DOCUMENTS.UPLOAD,
    byEmployeeId: API.EMPLOYEE_DOCUMENTS.GET_BY_EMPLOYEE,
    download: API.EMPLOYEE_DOCUMENTS.DOWNLOAD,
    view: API.EMPLOYEE_DOCUMENTS.VIEW,
    delete: API.EMPLOYEE_DOCUMENTS.DELETE,
    verify: API.EMPLOYEE_DOCUMENTS.VERIFY,
    reject: API.EMPLOYEE_DOCUMENTS.REJECT,
    checklist: API.EMPLOYEE_DOCUMENTS.CHECKLIST,
  },
  onboardingPersonalInfo: {
    list: API.ONBOARDING_PERSONAL_INFO.LIST,
    create: API.ONBOARDING_PERSONAL_INFO.CREATE,
    byOnboardingId: API.ONBOARDING_PERSONAL_INFO.GET_BY_ID,
    update: API.ONBOARDING_PERSONAL_INFO.UPDATE,
    delete: API.ONBOARDING_PERSONAL_INFO.DELETE,
  },
  onboardingEducation: {
    list: API.ONBOARDING_EDUCATION.LIST,
    create: API.ONBOARDING_EDUCATION.CREATE,
    byOnboardingId: API.ONBOARDING_EDUCATION.GET_BY_ID,
    update: API.ONBOARDING_EDUCATION.UPDATE,
  },
  onboardingExperience: {
    list: API.ONBOARDING_EXPERIENCE.LIST,
    create: API.ONBOARDING_EXPERIENCE.CREATE,
    byOnboardingId: API.ONBOARDING_EXPERIENCE.GET_BY_ID,
    update: API.ONBOARDING_EXPERIENCE.UPDATE,
  },
  onboardingDocuments: {
    upload: API.ONBOARDING_DOCUMENTS.UPLOAD,
    byOnboardingId: API.ONBOARDING_DOCUMENTS.GET_BY_ONBOARDING,
    byId: API.ONBOARDING_DOCUMENTS.GET_BY_ID,
    download: API.ONBOARDING_DOCUMENTS.DOWNLOAD,
    delete: API.ONBOARDING_DOCUMENTS.DELETE,
  },
  agreements: {
    upload: API.AGREEMENTS.UPLOAD,
    sign: API.AGREEMENTS.SIGN,

    getAll: API.AGREEMENTS.ADMIN_STATUS,

    myAgreements: API.AGREEMENTS.MY_AGREEMENTS,

    pending: API.AGREEMENTS.PENDING,
    signed: API.AGREEMENTS.SIGNED,

    viewAgreement: API.AGREEMENTS.VIEW_AGREEMENT,
    viewSigned: API.AGREEMENTS.VIEW_SIGNED,
    downloadSigned: API.AGREEMENTS.DOWNLOAD_SIGNED,

    download: API.AGREEMENTS.DOWNLOAD,
    filePath: API.AGREEMENTS.FILE_PATH,
  },
  company: {
    // 🔥 ADD THIS (MAIN COMPANY APIs)
    create: "/Company",
    getById: (id) => `/Company/${id}`,
    update: (id) => `/Company/${id}`,

    // EXISTING
    branches: {
      list: API.BRANCHES.LIST,
      byId: API.BRANCHES.UPDATE,
    },
    holidays: {
      list: API.HOLIDAYS.LIST,
      byId: API.HOLIDAYS.UPDATE,
    },
    projects: {
      list: API.PROJECTS.LIST,
      byId: API.PROJECTS.UPDATE,
    },
  },

  masters: {
    roles: {
      list: API.ROLES.LIST,
      byId: API.ROLES.UPDATE,
    },
    clients: {
      list: API.CLIENTS.LIST,
      byId: API.CLIENTS.UPDATE,
    },
    assets: {
      list: API.ASSETS.LIST,
      byId: API.ASSETS.UPDATE,
    },
  },
  attendance: {
    checkIn: API.ATTENDANCE.CHECKIN,
    checkOut: API.ATTENDANCE.CHECKOUT,

    startBreak: API.ATTENDANCE.START_BREAK,
    endBreak: API.ATTENDANCE.END_BREAK,
    weekly: API.ATTENDANCE.WEEKLY,
    previousWeek: API.ATTENDANCE.PREVIOUS_WEEK,
    previousMonth: API.ATTENDANCE.PREVIOUS_MONTH,
    today: API.ATTENDANCE.TODAY,
    monthly: API.ATTENDANCE.MONTHLY,
    adminUpdate: API.ATTENDANCE.UPDATE,
    dashboardAttendance: API.ATTENDANCE.USER_DASHBOARD_OVERVIEW,
    userDashboardOverview: API.ATTENDANCE.USER_DASHBOARD_OVERVIEW,
    adminDashboardOverview: API.ATTENDANCE.ADMIN_DASHBOARD_OVERVIEW,
    month: API.ATTENDANCE.MONTH,
    currentMonth: API.ATTENDANCE.CURRENT_MONTH,
    downloadMonthly: API.ATTENDANCE.DOWNLOAD_MONTHLY,
    downloadWeekly: API.ATTENDANCE.DOWNLOAD_WEEKLY,
    downloadDaily: API.ATTENDANCE.DOWNLOAD_DAILY,
    uploadMonthly: API.ATTENDANCE.UPLOAD_MONTHLY,

    workingHours: API.ATTENDANCE.WORKING_HOURS,
  },
  leave: {
    list: API.LEAVE.LIST,
    all: API.LEAVE.ALL,
    balance: API.LEAVE.BALANCE,
    byId: API.LEAVE.DELETE,
    updateStatus: API.LEAVE.UPDATE_STATUS,
    employeeLeaveDetails:
      API.LEAVE.employeeLeaveDetails,
  },
  wfh: {
    apply: API.WFH.APPLY,
    all: API.WFH.ALL,
    my: API.WFH.MY,
    myWfh: API.WFH.MY,
    updateStatus: API.WFH.UPDATE_STATUS,
    cancel: API.WFH.CANCEL,
  },
  settings: {
    email: API.SETTINGS.EMAIL,
    attendance: API.SETTINGS.ATTENDANCE,
    leave: API.SETTINGS.LEAVE,
    company: API.SETTINGS.COMPANY,
    notification: API.SETTINGS.NOTIFICATION,
    general: API.SETTINGS.GENERAL,
    policies: API.SETTINGS.POLICIES,
    policy: API.SETTINGS.POLICY,
    updatePolicy: API.SETTINGS.UPDATE_POLICY,
    branding: API.SETTINGS.BRANDING,
brandingUpload: API.SETTINGS.BRANDING_UPLOAD,
  },
  appraisal: {
    list: API.APPRAISAL.LIST,
    create: API.APPRAISAL.CREATE,
    byEmployee: API.APPRAISAL.BY_EMPLOYEE,
    managerReview: API.APPRAISAL.MANAGER_REVIEW,
    hrReview: API.APPRAISAL.HR_REVIEW,
    delete: API.APPRAISAL.DELETE,
  },
  employeeClearance: {
    create: API.EMPLOYEE_CLEARANCE.CREATE,
    department: API.EMPLOYEE_CLEARANCE.DEPARTMENT,
    byResignation: API.EMPLOYEE_CLEARANCE.BY_RESIGNATION,
    pending: API.EMPLOYEE_CLEARANCE.PENDING,
    completed: API.EMPLOYEE_CLEARANCE.COMPLETED,
  },
  employeeGoal: {
    list: API.EMPLOYEE_GOAL.LIST,
    create: API.EMPLOYEE_GOAL.CREATE,
    byEmployee: API.EMPLOYEE_GOAL.BY_EMPLOYEE,
    update: API.EMPLOYEE_GOAL.UPDATE,
    delete: API.EMPLOYEE_GOAL.DELETE,
  },
  employeeResignation: {
    apply: API.EMPLOYEE_RESIGNATION.APPLY,
    update: API.EMPLOYEE_RESIGNATION.UPDATE,
    delete: API.EMPLOYEE_RESIGNATION.DELETE,
    byId: API.EMPLOYEE_RESIGNATION.BY_ID,
    list: API.EMPLOYEE_RESIGNATION.LIST,
    byEmployee: API.EMPLOYEE_RESIGNATION.BY_EMPLOYEE,
    pendingManager: API.EMPLOYEE_RESIGNATION.PENDING_MANAGER,
    managerApproval: API.EMPLOYEE_RESIGNATION.MANAGER_APPROVAL,
    pendingHr: API.EMPLOYEE_RESIGNATION.PENDING_HR,
    hrApproval: API.EMPLOYEE_RESIGNATION.HR_APPROVAL,
  },
  employeeShift: {
    assign: API.EMPLOYEE_SHIFT.ASSIGN,
    bulkAssign: API.EMPLOYEE_SHIFT.BULK_ASSIGN,
    list: API.EMPLOYEE_SHIFT.LIST,
    byEmployee: API.EMPLOYEE_SHIFT.BY_EMPLOYEE,
    delete: API.EMPLOYEE_SHIFT.DELETE,
  },
  employeeWeeklyOff: {
    list: API.EMPLOYEE_WEEKLY_OFF.LIST,
    create: API.EMPLOYEE_WEEKLY_OFF.CREATE,
    byId: API.EMPLOYEE_WEEKLY_OFF.BY_ID,
    update: API.EMPLOYEE_WEEKLY_OFF.UPDATE,
    delete: API.EMPLOYEE_WEEKLY_OFF.DELETE,
  },
  exitInterview: {
    create: API.EXIT_INTERVIEW.CREATE,
    list: API.EXIT_INTERVIEW.LIST,
    byResignation: API.EXIT_INTERVIEW.BY_RESIGNATION,
    delete: API.EXIT_INTERVIEW.DELETE,
  },
  fullFinalSettlement: {
    generate: API.FULL_FINAL_SETTLEMENT.GENERATE,
    approve: API.FULL_FINAL_SETTLEMENT.APPROVE,
    list: API.FULL_FINAL_SETTLEMENT.LIST,
    byEmployee: API.FULL_FINAL_SETTLEMENT.BY_EMPLOYEE,
    delete: API.FULL_FINAL_SETTLEMENT.DELETE,
  },
  goalReview: {
    list: API.GOAL_REVIEW.LIST,
    create: API.GOAL_REVIEW.CREATE,
    update: API.GOAL_REVIEW.UPDATE,
    delete: API.GOAL_REVIEW.DELETE,
  },
  performanceCycle: {
    list: API.PERFORMANCE_CYCLE.LIST,
    create: API.PERFORMANCE_CYCLE.CREATE,
    byId: API.PERFORMANCE_CYCLE.BY_ID,
    update: API.PERFORMANCE_CYCLE.UPDATE,
    delete: API.PERFORMANCE_CYCLE.DELETE,
    dashboard: API.PERFORMANCE_CYCLE.DASHBOARD,
  },
  shift: {
    list: API.SHIFT.LIST,
    create: API.SHIFT.CREATE,
    byId: API.SHIFT.BY_ID,
    update: API.SHIFT.UPDATE,
    delete: API.SHIFT.DELETE,
  },
  shiftChangeRequest: {
    list: API.SHIFT_CHANGE_REQUEST.LIST,
    create: API.SHIFT_CHANGE_REQUEST.CREATE,
    byId: API.SHIFT_CHANGE_REQUEST.BY_ID,
    delete: API.SHIFT_CHANGE_REQUEST.DELETE,
    approve: API.SHIFT_CHANGE_REQUEST.APPROVE,
  },
  shiftPlanner: {
    list: API.SHIFT_PLANNER.LIST,
    create: API.SHIFT_PLANNER.CREATE,
    byId: API.SHIFT_PLANNER.BY_ID,
    update: API.SHIFT_PLANNER.UPDATE,
    delete: API.SHIFT_PLANNER.DELETE,
    publish: API.SHIFT_PLANNER.PUBLISH,
    copyWeek: API.SHIFT_PLANNER.COPY_WEEK,
    copyMonth: API.SHIFT_PLANNER.COPY_MONTH,
  },
  shiftRotation: {
    list: API.SHIFT_ROTATION.LIST,
    create: API.SHIFT_ROTATION.CREATE,
    byId: API.SHIFT_ROTATION.BY_ID,
    update: API.SHIFT_ROTATION.UPDATE,
    delete: API.SHIFT_ROTATION.DELETE,
  },
  shiftSwap: {
    list: API.SHIFT_SWAP.LIST,
    create: API.SHIFT_SWAP.CREATE,
    byId: API.SHIFT_SWAP.BY_ID,
    delete: API.SHIFT_SWAP.DELETE,
    approve: API.SHIFT_SWAP.APPROVE,
  },
  shiftRoster: {
    list: API.SHIFT_ROSTER.LIST,
    create: API.SHIFT_ROSTER.CREATE,
    byId: API.SHIFT_ROSTER.BY_ID,
    update: API.SHIFT_ROSTER.UPDATE,
    delete: API.SHIFT_ROSTER.DELETE,
    byEmployee: API.SHIFT_ROSTER.BY_EMPLOYEE,
    bulk: API.SHIFT_ROSTER.BULK,
  },
  taxDeclaration: {
    list: API.TAX_DECLARATION.LIST,
    create: API.TAX_DECLARATION.CREATE,
    update: API.TAX_DECLARATION.UPDATE,
    byEmployee: API.TAX_DECLARATION.BY_EMPLOYEE,
    submit: API.TAX_DECLARATION.SUBMIT,
    approve: API.TAX_DECLARATION.APPROVE,
    delete: API.TAX_DECLARATION.DELETE,
  },
  taxDeclarationItem: {
    create: API.TAX_DECLARATION_ITEM.CREATE,
    update: API.TAX_DECLARATION_ITEM.UPDATE,
    byDeclaration: API.TAX_DECLARATION_ITEM.BY_DECLARATION,
    delete: API.TAX_DECLARATION_ITEM.DELETE,
  },
  taxProof: {
    upload: API.TAX_PROOF.UPLOAD,
    byItem: API.TAX_PROOF.BY_ITEM,
    approve: API.TAX_PROOF.APPROVE,
    reject: API.TAX_PROOF.REJECT,
    delete: API.TAX_PROOF.DELETE,
  },
  tds: {
    calculate: API.TDS.CALCULATE,
    byEmployee: API.TDS.BY_EMPLOYEE,
  },
  template: {
  list: API.TEMPLATE.LIST,
  create: API.TEMPLATE.CREATE,
  delete: API.TEMPLATE.DELETE,
  download: API.TEMPLATE.DOWNLOAD,
  setDefault: API.TEMPLATE.SET_DEFAULT,
},

  templateModule: {
    list: API.TEMPLATE_MODULE.LIST,
    create: API.TEMPLATE_MODULE.CREATE,
    update: API.TEMPLATE_MODULE.UPDATE,
    delete: API.TEMPLATE_MODULE.DELETE,
},

  workflow: {
    create: API.WORKFLOW.CREATE,
    addStep: API.WORKFLOW.ADD_STEP,
    list: API.WORKFLOW.LIST,
    steps: API.WORKFLOW.STEPS,
    pending: API.WORKFLOW.PENDING,
    history: API.WORKFLOW.HISTORY,
    approve: API.WORKFLOW.APPROVE,
  },
  form16: {
    generate: API.FORM16.GENERATE,
    byEmployee: API.FORM16.BY_EMPLOYEE,
    download: API.FORM16.DOWNLOAD,
    delete: API.FORM16.DELETE,
  },
  team: {
    list: API.TEAM.LIST,
    create: API.TEAM.CREATE,
    byId: API.TEAM.GET_BY_ID,
    update: API.TEAM.UPDATE,
    delete: API.TEAM.DELETE,
    addMembers: API.TEAM.ADD_MEMBERS,
    removeMember: API.TEAM.REMOVE_MEMBER,
    updateReportingDays: API.TEAM.UPDATE_REPORTING_DAYS,
    memberOverride: API.TEAM.MEMBER_OVERRIDE,
    availableEmployees: API.TEAM.AVAILABLEEMPLOYEES,
    managers: API.TEAM.MANAGERS,
    projects: {
      list: API.PROJECTS.LIST,
    }

  },
  tickets: {
    list: API.TICKETS.LIST,
    create: API.TICKETS.CREATE,
    byId: API.TICKETS.GET_BY_ID,
    byEmployee: API.TICKETS.BY_EMPLOYEE,
    update: API.TICKETS.UPDATE,
    delete: API.TICKETS.DELETE,
    updateStatus: API.TICKETS.UPDATE_STATUS,
    startWork: API.TICKETS.START_WORK,
    stopWork: API.TICKETS.STOP_WORK,
    autoAssign: API.TICKETS.AUTO_ASSIGN,
    myTickets: API.TICKETS.MY_TICKETS,
    export: API.TICKETS.EXPORT,
    downloadTemplate: API.TICKETS.DOWNLOAD_TEMPLATE,
    bulkUpload: API.TICKETS.BULK_UPLOAD,
  },
  notifications: {
    admin: API.ADMIN_NOTIFICATION.LIST,
    adminRead: API.ADMIN_NOTIFICATION.READ,
    adminReadAll: API.ADMIN_NOTIFICATION.READ_ALL,
    user: API.USER_NOTIFICATION.LIST,
    userRead: API.USER_NOTIFICATION.READ,
    userReadAll: API.USER_NOTIFICATION.MARK_ALL,
  },
  payroll: {
    employees: API.EMPLOYEES.LIST,
    myPayslips: API.PAYSLIP.MY,
    recent: API.PAYSLIP.RECENT,
    generate: API.PAYSLIP.GENERATE,
    generateAll: API.PAYSLIP.GENERATE_ALL,
    sendAllEmails: API.PAYSLIP.SEND_ALL_EMAILS,
    preview: API.PAYSLIP.PREVIEW,
    download: API.PAYSLIP.DOWNLOAD,
    delete: API.PAYSLIP.DELETE,
    manualGenerate: API.PAYSLIP.MANUAL_GENERATE,
    salaryRegister: API.PAYSLIP.SALARY_REGISTER,
  },
  offerLetters: {
    list: "/OfferLetter",
    all: API.OFFER.LIST,
    generate: API.OFFER.GENERATE,
    calculateBreakup: API.OFFER.CALCULATE_BREAKUP,
    preview: API.OFFER.PREVIEW,
    send: API.OFFER.SEND,
    sendStatus: API.OFFER.SEND_STATUS,
    download: API.OFFER.DOWNLOAD,
    delete: API.OFFER.DELETE,
  },
  relievingLetters: {
    generate: API.RELIEVING_LETTER.GENERATE,
    all: API.RELIEVING_LETTER.GET_ALL,
    preview: API.RELIEVING_LETTER.PREVIEW,
    send: API.RELIEVING_LETTER.SEND,
    sendStatus: API.RELIEVING_LETTER.SEND_STATUS,
    download: API.RELIEVING_LETTER.DOWNLOAD,
    delete: API.RELIEVING_LETTER.DELETE,
  },
  RELIEVING_LETTER: API.RELIEVING_LETTER,
  reports: {
    all: API.REPORTS.ALL,
  },
  leaveBalance: {
    byEmployee: API.LEAVE_BALANCE.BALANCE,
    myLeaveBalance: API.LEAVE_BALANCE.MY_LEAVE_BALANCE,
  },
};

export const buildApiUrl = (path) =>
  `${BASE_URL}/${normalizePath(path)}`;

export const buildServerUrl = (path) =>
  (() => {
    const rawPath = String(path || "").trim();

    if (!rawPath) {
      return "";
    }

    if (/^(https?:|blob:|data:)/i.test(rawPath)) {
      return rawPath;
    }

    if (isUnsafeLocalPath(rawPath)) {
      return "";
    }

    return `${SERVER_URL}/${normalizePath(rawPath)}`;
  })();
