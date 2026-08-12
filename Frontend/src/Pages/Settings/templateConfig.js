import { API_ENDPOINTS } from "../../api/endpoints";


const text = (name, label, options = {}) => ({ name, label, type: "text", ...options });
const file = (name, label, options = {}) => ({ name, label, type: "file", ...options });
const select = (name, label, options = {}) => ({name, label, type: "select", ...options });

export const templateModulesConfig = {
  templates: {
    title: "Templates",
    category: "Document & Template Management",
    moduleName: "Templates",
    description: "Upload, view, download, and delete document templates.",
    api: {
      list: API_ENDPOINTS.template.list,
      create: API_ENDPOINTS.template.create,
      delete: API_ENDPOINTS.template.delete,
      contentType: "multipart/form-data",
    },
   idKey: "templateId",
    columns: [
  { key: "templateName", label: "Template Name" },
  { key: "moduleName", label: "Module" },
  { key: "version", label: "Version" },
],

formFields: [
  text("templateName", "Template Name", { required: true }),

  select("moduleId", "Module", {
      required: true,
      options: []
  }),

select("version", "Version", {
    required: true,
    options: [
        { value: "V1", label: "V1" },
        { value: "V2", label: "V2" },
        { value: "V3", label: "V3" },
        { value: "V4", label: "V4" }
    ]
}),

  file("file", "Template File", { required: true }),
],

    uploadSettings: {
      fileField: "file",
      accept: ".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg",
      maxSizeMb: 10,
    },
    searchFields: ["templateName", "code", "category", "version", "company"],
    workflowButtons: [
  {
    key: "download",
    label: "Download",
    method: "download",
    endpoint: API_ENDPOINTS.template.download,
    permission: "download",
  },
  {
    key: "setDefault",
    label: "Set Default",
    method: "put",
    endpoint: API_ENDPOINTS.template.setDefault,
    permission: "edit",
  },
],
  },
};

export const templateModuleOptions = [{ value: "templates", label: "Templates" }];
