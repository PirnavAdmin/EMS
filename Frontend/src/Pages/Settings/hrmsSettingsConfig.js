import { API_ENDPOINTS } from "../../api/endpoints";

const text = (name, label, options = {}) => ({
  name,
  label,
  type: "text",
  ...options,
});

const number = (name, label, options = {}) => ({
  name,
  label,
  type: "number",
  ...options,
});

const date = (name, label, options = {}) => ({
  name,
  label,
  type: "date",
  ...options,
});

const time = (name, label, options = {}) => ({
  name,
  label,
  type: "time",
  ...options,
});

const textarea = (name, label, options = {}) => ({
  name,
  label,
  type: "textarea",
  fullWidth: true,
  ...options,
});

const select = (name, label, options = [], extra = {}) => ({
  name,
  label,
  type: "select",
  options,
  ...extra,
});

const baseAuditColumns = [
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created" },
];

const approvalOptions = [
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export const standaloneSettingsModules = {
  resignation: {
    route: "/settings/resignation",
    title: "Employee Resignation Settings",
    category: "Employee Exit Management",
    moduleName: "Employee Resignation",
    description: "Manage resignations and approval workflows.",

    api: {
      list: API_ENDPOINTS.employeeResignation.list,
      create: API_ENDPOINTS.employeeResignation.apply,
      get: API_ENDPOINTS.employeeResignation.byId,
      update: API_ENDPOINTS.employeeResignation.update,
      delete: API_ENDPOINTS.employeeResignation.delete,
    },

    idKey: "resignationId",

    columns: [
      { key: "employee_Id", label: "Employee" },
      { key: "resignationDate", label: "Resignation Date" },
      { key: "lastWorkingDate", label: "Last Working Date" },
      { key: "managerStatus", label: "Manager Status" },
      { key: "hrStatus", label: "HR Status" },
      { key: "overallStatus", label: "Overall Status" },
    ],

    formFields: [
      text("employee_Id", "Employee", { required: true }),
      date("resignationDate", "Resignation Date", { required: true }),
      date("lastWorkingDate", "Last Working Date", { required: true }),
      textarea("reason", "Reason", { required: true }),
    ],

    searchFields: [
      "employee_Id",
      "employeeName",
      "overallStatus",
      "reason",
    ],

    workflowButtons: [
      {
        key: "managerApproval",
        label: "Manager Approval",
        endpoint: API_ENDPOINTS.employeeResignation.managerApproval,
        method: "put",
        permission: "approve",
        fields: [
          select(
            "isApproved",
            "Decision",
            [
              { value: true, label: "Approve" },
              { value: false, label: "Reject" },
            ],
            { required: true }
          ),
          textarea("remarks", "Remarks"),
        ],
      },
      {
        key: "hrApproval",
        label: "HR Approval",
        endpoint: API_ENDPOINTS.employeeResignation.hrApproval,
        method: "put",
        permission: "approve",
        fields: [
          select(
            "isApproved",
            "Decision",
            [
              { value: true, label: "Approve" },
              { value: false, label: "Reject" },
            ],
            { required: true }
          ),
          textarea("remarks", "Remarks"),
        ],
      },
    ],
  },

  employeeClearance: {
    route: "/settings/employee-clearance",
    title: "Employee Clearance Settings",
    category: "Employee Exit Management",
    moduleName: "Employee Clearance",
    description: "Create and update department clearance records.",

    api: {
      list: API_ENDPOINTS.employeeClearance.pending,
      create: API_ENDPOINTS.employeeClearance.create,
      update: API_ENDPOINTS.employeeClearance.department,
    },

    idKey: "clearanceId",

    columns: [
      { key: "clearanceId", label: "Clearance" },
      { key: "resignationId", label: "Resignation" },
      { key: "itStatus", label: "IT" },
      { key: "adminStatus", label: "Admin" },
      { key: "financeStatus", label: "Finance" },
      { key: "hrStatus", label: "HR" },
      { key: "completedDate", label: "Completed Date" },
    ],

    formFields: [
      number("resignationId", "Resignation", { required: true }),
      text("department", "Department", { required: true }),
      select(
        "isApproved",
        "Decision",
        [
          { value: true, label: "Approve" },
          { value: false, label: "Reject" },
        ],
        { required: true }
      ),
      textarea("remarks", "Remarks"),
    ],

    filters: [
      {
        key: "statusView",
        label: "Status",
        options: [
          {
            value: "pending",
            label: "Pending",
            endpoint: API_ENDPOINTS.employeeClearance.pending,
          },
          {
            value: "completed",
            label: "Completed",
            endpoint: API_ENDPOINTS.employeeClearance.completed,
          },
        ],
      },
    ],

    searchFields: [
      "resignationId",
      "itStatus",
      "adminStatus",
      "financeStatus",
      "hrStatus",
    ],
  },

  exitInterview: {
    route: "/settings/exit-interview",
    title: "Exit Interview Settings",
    category: "Employee Exit Management",
    moduleName: "Exit Interview",
    description: "Capture exit interview notes and feedback.",

    api: {
      list: API_ENDPOINTS.exitInterview.list,
      create: API_ENDPOINTS.exitInterview.create,
      delete: API_ENDPOINTS.exitInterview.delete,
    },

    idKey: "exitInterviewId",

    columns: [
      { key: "resignationId", label: "Resignation" },
      { key: "conductedBy", label: "Conducted By" },
      { key: "interviewDate", label: "Interview Date" },
      { key: "reasonForLeaving", label: "Reason For Leaving" },
      { key: "feedback", label: "Feedback" },
      { key: "suggestions", label: "Suggestions" },
    ],

    formFields: [
      number("resignationId", "Resignation", { required: true }),
      text("conductedBy", "Conducted By"),
      date("interviewDate", "Interview Date", { required: true }),
      textarea("reasonForLeaving", "Reason For Leaving"),
      textarea("feedback", "Feedback"),
      textarea("suggestions", "Suggestions"),
    ],

    searchFields: [
      "resignationId",
      "conductedBy",
      "reasonForLeaving",
      "feedback",
    ],
  },

  fullFinalSettlement: {
    route: "/settings/full-final-settlement",
    title: "Full Final Settlement Settings",
    category: "Employee Exit Management",
    moduleName: "Full Final Settlement",
    description: "Generate and approve full and final settlement records.",

    api: {
      list: API_ENDPOINTS.fullFinalSettlement.list,
      create: API_ENDPOINTS.fullFinalSettlement.generate,
      get: API_ENDPOINTS.fullFinalSettlement.byEmployee,
      delete: API_ENDPOINTS.fullFinalSettlement.delete,
    },

    idKey: "settlementId",

    columns: [
      { key: "employee_Id", label: "Employee" },
      { key: "grossSalary", label: "Gross Salary" },
      { key: "leaveEncashment", label: "Leave Encashment" },
      { key: "bonus", label: "Bonus" },
      { key: "deductions", label: "Deductions" },
      { key: "netSettlement", label: "Net Settlement" },
      { key: "generatedDate", label: "Generated Date" },
      { key: "status", label: "Status" },
    ],

    formFields: [
      text("employee_Id", "Employee", { required: true }),
    ],

    searchFields: [
      "employee_Id",
      "status",
    ],

    workflowButtons: [
      {
        key: "approve",
        label: "Approve / Reject",
        endpoint: API_ENDPOINTS.fullFinalSettlement.approve,
        method: "put",
        permission: "approve",
        fields: [
          select(
            "isApproved",
            "Decision",
            [
              { value: true, label: "Approve" },
              { value: false, label: "Reject" },
            ],
            { required: true }
          ),
        ],
      },
    ],
  },
};

export const shiftModulesConfig = {
  shiftMaster: {
    title: "Shift Master",
    category: "Shift Module",
    moduleName: "Shift Master",
    api: {
      list: API_ENDPOINTS.shift.list,
      create: API_ENDPOINTS.shift.create,
      get: API_ENDPOINTS.shift.byId,
      update: API_ENDPOINTS.shift.update,
      delete: API_ENDPOINTS.shift.delete,
    },
    idKey: "shiftId",
    columns: [
      { key: "shiftName", label: "Shift Name" },
      { key: "shiftCode", label: "Shift Code" },
      { key: "startTime", label: "Start Time" },
      { key: "endTime", label: "End Time" },
      { key: "isActive", label: "Active" },
    ],
    formFields: [
      text("shiftName", "Shift Name", { required: true }),
      text("shiftCode", "Shift Code", { required: true }),
      time("startTime", "Start Time", { required: true }),
      time("endTime", "End Time", { required: true }),
      number("graceTimeMinutes", "Grace Time (Minutes)"),
      textarea("description", "Description"),
    ],
    searchFields: [
      "shiftName",
      "shiftCode",
      "description",
      "startTime",
      "endTime",
    ],
  },

  employeeShift: {
    title: "Employee Shift Assignment",
    category: "Shift Module",
    moduleName: "Employee Shift",
    api: {
      list: API_ENDPOINTS.employeeShift.list,
      create: API_ENDPOINTS.employeeShift.assign,
      get: API_ENDPOINTS.employeeShift.byEmployee,
      delete: API_ENDPOINTS.employeeShift.delete,
    },
    idKey: "assignmentId",
    columns: [
      { key: "employee_Id", label: "Employee" },
      { key: "shiftName", label: "Shift" },
      { key: "shiftCode", label: "Shift Code" },
      { key: "startTime", label: "Start Time" },
      { key: "endTime", label: "End Time" },
      { key: "effectiveFrom", label: "Effective From" },
      { key: "effectiveTo", label: "Effective To" },
      { key: "isActive", label: "Active" },
    ],
    formFields: [
      text("employee_Id", "Employee", { required: true }),
      number("shiftId", "Shift", { required: true }),
      date("effectiveFrom", "Effective From", { required: true }),
      date("effectiveTo", "Effective To"),
    ],
    searchFields: [
      "employee_Id",
      "shiftName",
      "shiftCode",
    ],
  },

  weeklyOff: {
    title: "Weekly Off",
    category: "Shift Module",
    moduleName: "Weekly Off",
    api: {
      list: API_ENDPOINTS.employeeWeeklyOff.list,
      create: API_ENDPOINTS.employeeWeeklyOff.create,
      get: API_ENDPOINTS.employeeWeeklyOff.byId,
      update: API_ENDPOINTS.employeeWeeklyOff.update,
      delete: API_ENDPOINTS.employeeWeeklyOff.delete,
    },
    idKey: "weeklyOffId",
    columns: [
      { key: "employee_Id", label: "Employee" },
      { key: "dayName", label: "Day" },
      { key: "effectiveFrom", label: "Effective From" },
      { key: "effectiveTo", label: "Effective To" },
      { key: "isActive", label: "Active" },
    ],
    formFields: [
      text("employee_Id", "Employee", { required: true }),
      select(
        "dayName",
        "Day",
        [
          { value: "Monday", label: "Monday" },
          { value: "Tuesday", label: "Tuesday" },
          { value: "Wednesday", label: "Wednesday" },
          { value: "Thursday", label: "Thursday" },
          { value: "Friday", label: "Friday" },
          { value: "Saturday", label: "Saturday" },
          { value: "Sunday", label: "Sunday" },
        ],
        { required: true }
      ),
      date("effectiveFrom", "Effective From", { required: true }),
      date("effectiveTo", "Effective To"),
      select(
        "isActive",
        "Active",
        [
          { value: true, label: "Active" },
          { value: false, label: "Inactive" },
        ]
      ),
    ],
    searchFields: [
      "employee_Id",
      "dayName",
    ],
  },

  shiftPlanner: {
    title: "Shift Planner",
    category: "Shift Module",
    moduleName: "Shift Planner",
    api: {
      list: API_ENDPOINTS.shiftPlanner.list,
      create: API_ENDPOINTS.shiftPlanner.create,
      get: API_ENDPOINTS.shiftPlanner.byId,
      update: API_ENDPOINTS.shiftPlanner.update,
      delete: API_ENDPOINTS.shiftPlanner.delete,
    },
    idKey: "plannerId",
    columns: [
      { key: "shiftName", label: "Shift" },
      { key: "department_Id", label: "Department" },
      { key: "fromDate", label: "From Date" },
      { key: "toDate", label: "To Date" },
      { key: "isPublished", label: "Published" },
    ],
    formFields: [
      number("shiftId", "Shift", { required: true }),
      text("department_Id", "Department", { required: true }),
      date("fromDate", "From Date", { required: true }),
      date("toDate", "To Date", { required: true }),
      textarea("remarks", "Remarks"),
      select(
        "isPublished",
        "Published",
        [
          { value: false, label: "Draft" },
          { value: true, label: "Published" },
        ]
      ),
    ],
    searchFields: [
      "shiftName",
      "department_Id",
      "fromDate",
      "toDate",
    ],
    workflowButtons: [
      {
        key: "publish",
        label: "Publish",
        endpoint: API_ENDPOINTS.shiftPlanner.publish,
        method: "post",
        permission: "publish",
      },
      {
        key: "copyWeek",
        label: "Copy Week",
        endpoint: API_ENDPOINTS.shiftPlanner.copyWeek,
        method: "post",
        permission: "copy",
      },
      {
        key: "copyMonth",
        label: "Copy Month",
        endpoint: API_ENDPOINTS.shiftPlanner.copyMonth,
        method: "post",
        permission: "copy",
      },
    ],
  },

  shiftRotation: {
    title: "Shift Rotation",
    category: "Shift Module",
    moduleName: "Shift Rotation",
    api: {
      list: API_ENDPOINTS.shiftRotation.list,
      create: API_ENDPOINTS.shiftRotation.create,
      get: API_ENDPOINTS.shiftRotation.byId,
      update: API_ENDPOINTS.shiftRotation.update,
      delete: API_ENDPOINTS.shiftRotation.delete,
    },
    idKey: "rotationId",
    columns: [
      { key: "employee_Id", label: "Employee" },
      { key: "rotationType", label: "Rotation Type" },
      { key: "shift1Id", label: "Shift 1" },
      { key: "shift2Id", label: "Shift 2" },
      { key: "shift3Id", label: "Shift 3" },
      { key: "effectiveFrom", label: "Effective From" },
      { key: "isActive", label: "Active" },
    ],
    formFields: [
      text("employee_Id", "Employee", { required: true }),
      select(
        "rotationType",
        "Rotation Type",
        [
          { value: "Weekly", label: "Weekly" },
          { value: "Monthly", label: "Monthly" },
        ],
        { required: true }
      ),
      number("shift1Id", "Shift 1", { required: true }),
      number("shift2Id", "Shift 2"),
      number("shift3Id", "Shift 3"),
      date("effectiveFrom", "Effective From", { required: true }),
    ],
    searchFields: [
      "employee_Id",
      "rotationType",
      "shift1Id",
      "shift2Id",
      "shift3Id",
    ],
  },

  shiftSwap: {
    title: "Shift Swap",
    category: "Shift Module",
    moduleName: "Shift Swap",
    api: {
      list: API_ENDPOINTS.shiftSwap.list,
      create: API_ENDPOINTS.shiftSwap.create,
      get: API_ENDPOINTS.shiftSwap.byId,
      delete: API_ENDPOINTS.shiftSwap.delete,
    },
    idKey: "swapId",
    columns: [
      { key: "fromEmployeeId", label: "From Employee" },
      { key: "toEmployeeId", label: "To Employee" },
      { key: "shiftDate", label: "Shift Date" },
      { key: "shiftId", label: "Shift" },
      { key: "reason", label: "Reason" },
      { key: "status", label: "Status" },
    ],
    formFields: [
      text("fromEmployeeId", "From Employee", { required: true }),
      text("toEmployeeId", "To Employee", { required: true }),
      date("shiftDate", "Shift Date", { required: true }),
      number("shiftId", "Shift", { required: true }),
      textarea("reason", "Reason", { required: true }),
    ],
    searchFields: [
      "fromEmployeeId",
      "toEmployeeId",
      "shiftDate",
      "status",
      "reason",
    ],
    workflowButtons: [
      {
        key: "approve",
        label: "Approve / Reject",
        endpoint: API_ENDPOINTS.shiftSwap.approve,
        method: "post",
        permission: "approve",
      },
    ],
  },

  shiftChangeRequest: {
    title: "Shift Change Requests",
    category: "Shift Module",
    moduleName: "Shift Change Request",
    api: {
      list: API_ENDPOINTS.shiftChangeRequest.list,
      create: API_ENDPOINTS.shiftChangeRequest.create,
      get: API_ENDPOINTS.shiftChangeRequest.byId,
      delete: API_ENDPOINTS.shiftChangeRequest.delete,
    },
    idKey: "requestId",
    columns: [
      { key: "employee_Id", label: "Employee" },
      { key: "currentShiftId", label: "Current Shift" },
      { key: "requestedShiftId", label: "Requested Shift" },
      { key: "effectiveFrom", label: "Effective From" },
      { key: "effectiveTo", label: "Effective To" },
      { key: "isPermanent", label: "Permanent" },
      { key: "status", label: "Status" },
    ],
    formFields: [
      text("employee_Id", "Employee", { required: true }),
      number("currentShiftId", "Current Shift", { required: true }),
      number("requestedShiftId", "Requested Shift", { required: true }),
      date("effectiveFrom", "Effective From", { required: true }),
      date("effectiveTo", "Effective To"),
      select(
        "isPermanent",
        "Permanent",
        [
          { value: true, label: "Yes" },
          { value: false, label: "No" },
        ]
      ),
      textarea("reason", "Reason", { required: true }),
    ],
    searchFields: [
      "employee_Id",
      "currentShiftId",
      "requestedShiftId",
      "status",
      "reason",
    ],
    workflowButtons: [
      {
        key: "approve",
        label: "Approve / Reject",
        endpoint: API_ENDPOINTS.shiftChangeRequest.approve,
        method: "post",
        permission: "approve",
      },
    ],
  },

  shiftRoster: {
    title: "Shift Roster",
    category: "Shift Module",
    moduleName: "Shift Roster",
    api: {
      list: API_ENDPOINTS.shiftRoster.list,
      create: API_ENDPOINTS.shiftRoster.create,
      get: API_ENDPOINTS.shiftRoster.byId,
      update: API_ENDPOINTS.shiftRoster.update,
      delete: API_ENDPOINTS.shiftRoster.delete,
    },
    idKey: "rosterId",
    columns: [
      { key: "employee_Id", label: "Employee" },
      { key: "shiftId", label: "Shift" },
      { key: "rosterDate", label: "Date" },
      { key: "remarks", label: "Remarks" },
      { key: "isPublished", label: "Published" },
    ],
    formFields: [
      text("employee_Id", "Employee", { required: true }),
      number("shiftId", "Shift", { required: true }),
      date("rosterDate", "Date", { required: true }),
      textarea("remarks", "Remarks"),
      select(
        "isPublished",
        "Published",
        [
          { value: true, label: "Yes" },
          { value: false, label: "No" },
        ]
      ),
    ],
    searchFields: [
      "employee_Id",
      "shiftId",
      "rosterDate",
      "remarks",
    ],
    workflowButtons: [
      {
        key: "employeeRoster",
        label: "Employee Roster",
        endpoint: API_ENDPOINTS.shiftRoster.byEmployee,
        method: "get",
        permission: "workflow",
        fields: [
          text("employeeId", "Employee", { required: true }),
        ],
      },
    ],
    bulkUpload: {
      label: "Bulk Assign",
      endpoint: API_ENDPOINTS.shiftRoster.bulk,
      permission: "bulkUpload",
    },
  },
};

export const shiftModuleOptions = Object.entries(shiftModulesConfig).map(
  ([key, config]) => ({
    value: key,
    label: config.title,
  })
);
