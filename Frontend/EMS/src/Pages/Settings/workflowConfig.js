import { API_ENDPOINTS } from "../../api/endpoints";

const text = (name, label, options = {}) => ({ name, label, type: "text", ...options });
const number = (name, label, options = {}) => ({ name, label, type: "number", ...options });
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

export const workflowModulesConfig = {
  workflow: {
    title: "Workflow",
    category: "Workflow Management",
    moduleName: "Workflow",
    description: "Create workflows, manage steps, and process approvals.",
    api: {
      list: API_ENDPOINTS.workflow.list,
      create: API_ENDPOINTS.workflow.create,
    },
    idKey: "workflowId",
    columns: [
      { key: "workflowName", label: "Workflow Name" },
      { key: "steps", label: "Steps" },
      { key: "active", label: "Active" },
    ],
    formFields: [
      text("workflowName", "Workflow Name", { required: true }),
      text("moduleName", "Module", { required: true }),
      textarea("description", "Description"),
      select("active", "Active", [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ]),
    ],
    searchFields: ["workflowName", "moduleName", "active"],
    toolbarActions: [
      {
        key: "pending",
        label: "Pending Requests",
        method: "get",
        endpoint: API_ENDPOINTS.workflow.pending,
        paramField: "approverId",
        permission: "view",
        replaceTable: true,
        fields: [text("approverId", "Approver", { required: true })],
      },
      {
        key: "history",
        label: "History",
        method: "get",
        endpoint: API_ENDPOINTS.workflow.history,
        permission: "view",
        replaceTable: true,
      },
    ],
    workflowButtons: [
      {
        key: "viewSteps",
        label: "View Steps",
        method: "get",
        endpoint: API_ENDPOINTS.workflow.steps,
        permission: "view",
        replaceTable: true,
      },
      {
        key: "addStep",
        label: "Add Step",
        endpoint: API_ENDPOINTS.workflow.addStep,
        permission: "add",
        fields: [
          text("workflowId", "Workflow", { required: true }),
          number("stepOrder", "Step Order", { required: true }),
          text("approverId", "Approver", { required: true }),
          text("approverRole", "Approver Role"),
        ],
      },
      {
        key: "approve",
        label: "Approve",
        endpoint: API_ENDPOINTS.workflow.approve,
        permission: "approve",
        fields: [
          text("requestId", "Request", { required: true }),
          select("status", "Status", ["Approved", "Rejected"], { required: true }),
          textarea("remarks", "Approval Remarks"),
        ],
      },
    ],
  },
};

export const workflowModuleOptions = [{ value: "workflow", label: "Workflow" }];
