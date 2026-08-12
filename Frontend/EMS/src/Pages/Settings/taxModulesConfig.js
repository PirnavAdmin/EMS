import { API_ENDPOINTS } from "../../api/endpoints";

const text = (name, label, options = {}) => ({ name, label, type: "text", ...options });
const number = (name, label, options = {}) => ({ name, label, type: "number", ...options });
const date = (name, label, options = {}) => ({ name, label, type: "date", ...options });
const textarea = (name, label, options = {}) => ({
  name,
  label,
  type: "textarea",
  fullWidth: true,
  ...options,
});
const file = (name, label, options = {}) => ({ name, label, type: "file", ...options });
const select = (name, label, options = [], extra = {}) => ({
  name,
  label,
  type: "select",
  options,
  ...extra,
});

const statusOptions = ["Draft", "Submitted", "Approved", "Rejected"];

export const taxModulesConfig = {
  taxDeclaration: {
    title: "Tax Declaration",
    category: "Tax Management",
    moduleName: "Tax Declaration",
    description: "Manage employee tax declarations, submission, and approval.",
    api: {
      list: API_ENDPOINTS.taxDeclaration.list,
      create: API_ENDPOINTS.taxDeclaration.create,
      update: API_ENDPOINTS.taxDeclaration.update,
      delete: API_ENDPOINTS.taxDeclaration.delete,
    },
    idKey: "id",
    columns: [
      { key: "id", label: "ID" },
      { key: "employeeId", label: "Employee ID" },
      { key: "employeeName", label: "Employee Name" },
      { key: "financialYear", label: "Financial Year" },
      { key: "status", label: "Status" },
      { key: "submittedDate", label: "Submitted Date" },
      { key: "approvedDate", label: "Approved Date" },
    ],
    formFields: [
      text("employeeId", "Employee", { required: true }),
      text("financialYear", "Financial Year", { required: true }),
      select("status", "Status", statusOptions),
      textarea("remarks", "Remarks"),
    ],
    searchFields: ["id", "employeeId", "employeeName", "financialYear", "status"],
    toolbarActions: [
      {
        key: "employeeLookup",
        label: "Employee Declaration",
        method: "get",
        endpoint: API_ENDPOINTS.taxDeclaration.byEmployee,
        paramField: "employeeId",
        permission: "view",
        replaceTable: true,
        fields: [text("employeeId", "Employee", { required: true })],
      },
    ],
    workflowButtons: [
      {
        key: "submit",
        label: "Submit",
        endpoint: API_ENDPOINTS.taxDeclaration.submit,
        permission: "submit",
      },
      {
        key: "approve",
        label: "Approve",
        endpoint: API_ENDPOINTS.taxDeclaration.approve,
        permission: "approve",
        fields: [textarea("remarks", "Approval Remarks")],
      },
    ],
  },
  taxDeclarationItems: {
    title: "Tax Declaration Items",
    category: "Tax Management",
    moduleName: "Tax Declaration Items",
    description: "Manage declaration-wise tax exemption items.",
    api: {
      list: null,
      create: API_ENDPOINTS.taxDeclarationItem.create,
      update: API_ENDPOINTS.taxDeclarationItem.update,
      delete: API_ENDPOINTS.taxDeclarationItem.delete,
    },
    idKey: "id",
    columns: [
      { key: "item", label: "Item" },
      { key: "section", label: "Section" },
      { key: "declaredAmount", label: "Declared Amount" },
      { key: "approvedAmount", label: "Approved Amount" },
    ],
    formFields: [
      text("declarationId", "Declaration", { required: true }),
      text("item", "Item", { required: true }),
      text("section", "Section", { required: true }),
      number("declaredAmount", "Declared Amount", { required: true }),
      number("approvedAmount", "Approved Amount"),
      textarea("remarks", "Remarks"),
    ],
    searchFields: ["item", "section", "declaredAmount", "approvedAmount"],
    toolbarActions: [
      {
        key: "loadItems",
        label: "View Items",
        method: "get",
        endpoint: API_ENDPOINTS.taxDeclarationItem.byDeclaration,
        paramField: "declarationId",
        permission: "view",
        replaceTable: true,
        fields: [text("declarationId", "Declaration", { required: true })],
      },
    ],
  },
  taxProof: {
    title: "Tax Proof",
    category: "Tax Management",
    moduleName: "Tax Proof",
    description: "Upload, review, approve, and reject tax proof documents.",
    api: {
      list: null,
      create: API_ENDPOINTS.taxProof.upload,
      delete: API_ENDPOINTS.taxProof.delete,
      contentType: "multipart/form-data",
    },
    idKey: "id",
    columns: [
      { key: "item", label: "Item" },
      { key: "fileName", label: "File Name" },
      { key: "uploadedDate", label: "Uploaded Date" },
      { key: "status", label: "Status" },
    ],
    formFields: [
      text("itemId", "Item", { required: true }),
      file("file", "Proof File", { required: true }),
      textarea("remarks", "Remarks"),
    ],
    uploadSettings: {
      fileField: "file",
      accept: ".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg",
      maxSizeMb: 10,
    },
    searchFields: ["item", "fileName", "status"],
    toolbarActions: [
      {
        key: "viewProof",
        label: "View Proof",
        method: "get",
        endpoint: API_ENDPOINTS.taxProof.byItem,
        paramField: "itemId",
        permission: "view",
        replaceTable: true,
        fields: [text("itemId", "Item", { required: true })],
      },
    ],
    workflowButtons: [
      {
        key: "approve",
        label: "Approve",
        endpoint: API_ENDPOINTS.taxProof.approve,
        permission: "approve",
      },
      {
        key: "reject",
        label: "Reject",
        endpoint: API_ENDPOINTS.taxProof.reject,
        permission: "approve",
        fields: [textarea("remarks", "Rejection Remarks", { required: true })],
      },
    ],
  },
  tds: {
    title: "TDS",
    category: "Tax Management",
    moduleName: "TDS",
    description: "Calculate and view employee TDS.",
    api: { list: null },
    idKey: "employeeId",
    columns: [
      { key: "employeeName", label: "Employee" },
      { key: "financialYear", label: "Financial Year" },
      { key: "taxableIncome", label: "Taxable Income" },
      { key: "tdsAmount", label: "TDS Amount" },
    ],
    formFields: [],
    searchFields: ["employeeId", "employeeName", "financialYear"],
    toolbarActions: [
      {
        key: "calculate",
        label: "Calculate TDS",
        method: "post",
        endpoint: API_ENDPOINTS.tds.calculate,
        paramField: "employeeId",
        permission: "add",
        fields: [text("employeeId", "Employee", { required: true })],
      },
      {
        key: "view",
        label: "View TDS",
        method: "get",
        endpoint: API_ENDPOINTS.tds.byEmployee,
        paramField: "employeeId",
        permission: "view",
        replaceTable: true,
        fields: [text("employeeId", "Employee", { required: true })],
      },
    ],
  },
  form16: {
    title: "Form16",
    category: "Tax Management",
    moduleName: "Form16",
    description: "Generate, download, and delete employee Form16 records.",
    api: {
      list: null,
      create: API_ENDPOINTS.form16.generate,
      createParamField: "employeeId",
      delete: API_ENDPOINTS.form16.delete,
    },
    idKey: "id",
    columns: [
      { key: "employeeName", label: "Employee" },
      { key: "financialYear", label: "Financial Year" },
      { key: "generatedDate", label: "Generated Date" },
    ],
    formFields: [
      text("employeeId", "Employee", { required: true }),
      text("financialYear", "Financial Year"),
    ],
    searchFields: ["employeeId", "employeeName", "financialYear"],
    toolbarActions: [
      {
        key: "lookup",
        label: "Employee Form16",
        method: "get",
        endpoint: API_ENDPOINTS.form16.byEmployee,
        paramField: "employeeId",
        permission: "view",
        replaceTable: true,
        fields: [text("employeeId", "Employee", { required: true })],
      },
    ],
    workflowButtons: [
      {
        key: "download",
        label: "Download",
        method: "download",
        endpoint: API_ENDPOINTS.form16.download,
        permission: "download",
      },
    ],
  },
};

export const taxModuleOptions = Object.entries(taxModulesConfig).map(([value, config]) => ({
  value,
  label: config.title,
}));
