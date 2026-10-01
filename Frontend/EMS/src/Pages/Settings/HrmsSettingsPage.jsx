// import React, { useEffect, useMemo, useState } from "react";
// import {
//   FaCheck,
//   FaEdit,
//   FaEye,
//   FaFileUpload,
//   FaPlus,
//   FaRedo,
//   FaSearch,
//   FaSync,
//   FaTimes,
//   FaTrash } from
// "react-icons/fa";
// import AppPagination from "../../components/AppPagination";
// import { toastError, toastSuccess } from "@/components/common/toast/toastService";
// import {
//   createHrmsSettingsRecord,
//   deleteHrmsSettingsRecord,
//   extractHrmsCollection,
//   getHrmsErrorMessage,
//   listHrmsSettings,
//   runHrmsWorkflowAction,
//   updateHrmsSettingsRecord,
//   uploadHrmsBulkRecords } from
// "../../services/hrmsSettingsService";
// import {
//   hasAddPermission,
//   hasDeletePermission,
//   hasEditPermission,
//   hasModulePermission,
//   hasViewPermission } from
// "../../utils/authorization";
// import { SettingsBanner, SettingsCard, SettingsField, SettingsStatPill } from "./SettingsShared";
// import { shiftModuleOptions, shiftModulesConfig, standaloneSettingsModules } from "./hrmsSettingsConfig";
// import { templateModuleOptions, templateModulesConfig } from "./templateConfig";
// import "./Settings.css";
// import templateModuleService from "../../services/templateModuleService";

// const PAGE_SIZE_OPTIONS = [10, 20, 50];

// const getRecordId = (record, config) =>
// record?.[config.idKey] ??
// record?.[`${config.idKey?.charAt(0).toUpperCase()}${config.idKey?.slice(1)}`] ??
// record?.id ??
// record?.Id ??
// record?.employeeId ??
// record?.EmployeeId ??
// record?.resignationId ??
// record?.ResignationId ??
// record?.assignmentId ??
// record?.AssignmentId;

// const normalizeDisplayValue = (value) => {
//   if (value === null || value === undefined || value === "") {
//     return "-";
//   }

//   if (typeof value === "boolean") {
//     return value ? "Yes" : "No";
//   }

//   if (typeof value === "object") {
//     return JSON.stringify(value);
//   }

//   return String(value);
// };

// const coerceFieldValue = (field, value) => {
//   if (field.type === "file") {
//     return value || null;
//   }

//   if (field.type === "number") {
//     if (value === "" || value === null || value === undefined) {
//       return null;
//     }

//     const numberValue = Number(value);
//     return Number.isFinite(numberValue) ? numberValue : value;
//   }

//   return value ?? "";
// };

// const buildInitialValues = (fields = [], record = null) => {
//   const safeRecord = record ?? {};

//   return fields.reduce((values, field) => {
//     if (!field || !field.name) {
//       return values;
//     }

//     values[field.name] =
//     field.type === "file" ?
//     null :
//     safeRecord?.[field.name] ??
//     safeRecord?.[
//     field.name.charAt(0).toUpperCase() +
//     field.name.slice(1)] ??

//     "";

//     return values;
//   }, {});
// };

// const buildPayload = (fields = [], values = {}) =>
// fields.reduce((payload, field) => {
//   payload[field.name] = coerceFieldValue(field, values[field.name]);
//   return payload;
// }, {});

// const validateValues = (fields = [], values = {}) =>
// fields.reduce((errors, field) => {
//   if (field.required && !String(values[field.name] ?? "").trim()) {
//     if (field.type === "file" && values[field.name]) {
//       return errors;
//     }

//     errors[field.name] = `${field.label} is required.`;
//   }

//   return errors;
// }, {});

// const filterRecords = (records, config, search, filterValues) => {
//   const normalizedSearch = String(search || "").trim().toLowerCase();
//   const searchFields = config.searchFields?.length ?
//   config.searchFields :
//   config.columns.map((column) => column.key);

//   return records.filter((record) => {
//     const matchesSearch =
//     !normalizedSearch ||
//     searchFields.some((field) =>
//     normalizeDisplayValue(record?.[field]).toLowerCase().includes(normalizedSearch)
//     );

//     if (!matchesSearch) {
//       return false;
//     }

//     return (config.filters || []).every((filter) => {
//       const selectedValue = filterValues[filter.key];

//       if (!selectedValue || filter.endpoint) {
//         return true;
//       }

//       return String(record?.[filter.key] ?? "").toLowerCase() ===
//       String(selectedValue).toLowerCase();
//     });
//   });
// };

// function DynamicFormFields({ fields, values, errors, onChange, disabled = false }) {
//   return (
//     <div className="settings-form-grid settings-grid settings-grid-2">
//       {fields.map((field) =>
//       <SettingsField
//         key={field.name}
//         label={field.label}
//         required={field.required}
//         error={errors[field.name]}
//         className={field.fullWidth ? "settings-field--full" : ""}>
        
//           {field.type === "textarea" ?
//         <textarea
//           className="settings-textarea"
//           name={field.name}
//           value={values[field.name] ?? ""}
//           onChange={onChange}
//           disabled={disabled}
//           rows={5} /> :

//         field.type === "select" ?
//         <select
//           className="settings-select"
//           name={field.name}
//           value={values[field.name] ?? ""}
//           onChange={onChange}
//           disabled={disabled}>
          
//               <option value="">Select {field.label}</option>
//               {(field.options || []).map((option) => {
//             const optionValue =
//             typeof option === "string" ? option : option.value;
//             const optionLabel =
//             typeof option === "string" ? option : option.label;

//             return (
//               <option key={optionValue} value={optionValue}>
//                     {optionLabel}
//                   </option>);

//           })}
//             </select> :
//         field.type === "file" ?
//         <input
//           className="settings-input"
//           type="file"
//           name={field.name}
//           accept={field.accept}
//           onChange={onChange}
//           disabled={disabled} /> :

//         <input
//           className={field.type === "time" ? "settings-time-input" : "settings-input"}
//           type={field.type || "text"}
//           name={field.name}
//           value={values[field.name] ?? ""}
//           onChange={onChange}
//           disabled={disabled} />

//         }
//         </SettingsField>
//       )}
//     </div>);

// }

// function ModalShell({ title, children, footer, onClose }) {
//   return (
//     <div className="settings-modal-overlay">
//       <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
//         <div className="settings-modal-head">
//           <h3 id="settings-modal-title">{title}</h3>
//           <button type="button" className="settings-icon-button" onClick={onClose} aria-label="Close">
//             <FaTimes />
//           </button>
//         </div>
//         <div className="settings-modal-body">{children}</div>
//         {footer && <div className="settings-modal-footer">{footer}</div>}
//       </div>
//     </div>);

// }

// function RecordModal({ mode, config, record, onClose, onSubmit, saving }) {
//   const readOnly = mode === "view";
//   const safeRecord = record ?? {};

//   const [values, setValues] = useState(() =>
//   buildInitialValues(config.formFields ?? [], safeRecord)
//   );
//   const [errors, setErrors] = useState({});

//   const handleChange = (event) => {
//     const { name, type, value, files } = event.target;
//     const nextValues = {
//       ...values,
//       [name]: type === "file" ? files?.[0] || null : value
//     };
//     setValues(nextValues);
//     setErrors(validateValues(config.formFields, nextValues));
//   };

//   const handleSubmit = () => {
//     const validationErrors = validateValues(config.formFields, values);

//     if (Object.keys(validationErrors).length > 0) {
//       setErrors(validationErrors);
//       toastError("Please correct the highlighted fields.");
//       return;
//     }

//     const payload = buildPayload(config.formFields, values);

//     onSubmit(payload);
//   };

//   return (
//     <ModalShell
//       title={`${mode === "edit" ? "Edit" : mode === "view" ? "View" : "Add"} ${config.title}`}
//       onClose={onClose}
//       footer={
//       <>
//           <button type="button" className="app-button-ghost" onClick={onClose} disabled={saving}>
//             Cancel
//           </button>
//           {!readOnly &&
//         <button type="button" className="app-button-primary" onClick={handleSubmit} disabled={saving}>
//               {saving ? "Saving..." : "Save"}
//             </button>
//         }
//         </>
//       }>
      
//       <DynamicFormFields
//         fields={config.formFields}
//         values={values}
//         errors={errors}
//         onChange={handleChange}
//         disabled={saving || readOnly} />
      
//     </ModalShell>);

// }

// function WorkflowModal({ action, record, onClose, onSubmit, saving }) {
//   const [values, setValues] = useState(() => buildInitialValues(action.fields || []));
//   const [errors, setErrors] = useState({});

//   const handleChange = (event) => {
//     const { name, type, value, files } = event.target;
//     const nextValues = {
//       ...values,
//       [name]: type === "file" ? files?.[0] || null : value
//     };
//     setValues(nextValues);
//     setErrors(validateValues(action.fields || [], nextValues));
//   };

//   const handleSubmit = () => {
//     const fields = action.fields || [];
//     const validationErrors = validateValues(fields, values);

//     if (Object.keys(validationErrors).length > 0) {
//       setErrors(validationErrors);
//       toastError("Please correct the highlighted fields.");
//       return;
//     }

//     onSubmit(buildPayload(fields, values), record);
//   };

//   return (
//     <ModalShell
//       title={action.label}
//       onClose={onClose}
//       footer={
//       <>
//           <button type="button" className="app-button-ghost" onClick={onClose} disabled={saving}>
//             Cancel
//           </button>
//           <button type="button" className="app-button-primary" onClick={handleSubmit} disabled={saving}>
//             {saving ? "Working..." : action.label}
//           </button>
//         </>
//       }>
      
//       {action.fields?.length ?
//       <DynamicFormFields
//         fields={action.fields}
//         values={values}
//         errors={errors}
//         onChange={handleChange}
//         disabled={saving} /> :

//       <SettingsBanner
//         title="Confirm action"
//         message={`Run ${action.label} for this record?`}
//         tone="info" />

//       }
//     </ModalShell>);

// }

// function BulkUploadModal({ config, onClose, onUploaded, uploading }) {
//   const [file, setFile] = useState(null);

//   return (
//     <ModalShell
//       title={config.bulkUpload.label}
//       onClose={onClose}
//       footer={
//       <>
//           <button type="button" className="app-button-ghost" onClick={onClose} disabled={uploading}>
//             Cancel
//           </button>
//           <button
//           type="button"
//           className="app-button-primary"
//           onClick={() => onUploaded(file)}
//           disabled={!file || uploading}>
          
//             {uploading ? "Uploading..." : "Upload"}
//           </button>
//         </>
//       }>
      
//       <SettingsField label="Upload File" required>
//         <input
//           className="settings-input"
//           type="file"
//           onChange={(event) => setFile(event.target.files?.[0] || null)}
//           disabled={uploading} />
        
//       </SettingsField>
//       {uploading &&
//       <SettingsBanner
//         title="Upload in progress"
//         message="Validating and uploading records."
//         tone="info" />

//       }
//     </ModalShell>);

// }

// function HrmsSettingsPage({
//   moduleKey,
//   config: providedConfig,
//   shiftMode = false,
//   configMap,
//   moduleOptions,
//   initialModuleKey,
//   pageTitle,
//   pageDescription
// }) {
//   const [selectedShiftModule, setSelectedShiftModule] = useState("shiftMaster");
//   const [selectedConfigModule, setSelectedConfigModule] = useState(
//     initialModuleKey || moduleOptions?.[0]?.value || ""
//   );
//   const activeConfig = shiftMode ?
//   shiftModulesConfig[selectedShiftModule] :
//   configMap ?
//   configMap[selectedConfigModule] :
//   providedConfig || standaloneSettingsModules[moduleKey];
//   const [records, setRecords] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [actionLoading, setActionLoading] = useState(false);
//   const [loadError, setLoadError] = useState("");
//   const [search, setSearch] = useState("");
//   const [filterValues, setFilterValues] = useState({});
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(10);
//   const [modalState, setModalState] = useState(null);
//   const [workflowState, setWorkflowState] = useState(null);
//   const [showBulkUpload, setShowBulkUpload] = useState(false);
//   const [templateModules, setTemplateModules] = useState([]);

//   const modulePermissionName = activeConfig?.moduleName || "";
//   const canView = activeConfig ? hasViewPermission(modulePermissionName) : false;
//   const canAdd = activeConfig ? hasAddPermission(modulePermissionName) : false;
//   const canEdit = activeConfig ? hasEditPermission(modulePermissionName) : false;
//   const canDelete = activeConfig ? hasDeletePermission(modulePermissionName) : false;
//   const permissionActionMap = {
//     view: "canView",
//     add: "canAdd",
//     edit: "canEdit",
//     delete: "canDelete",
//     upload: "canUpload",
//     download: "canDownload",
//     submit: "canSubmit",
//     approve: "canApprove",
//     workflow: "canEdit",
//     publish: "canEdit",
//     copy: "canEdit",
//     bulkUpload: "canAdd"
//   };
//   const canWorkflow = (permission) =>
//   hasModulePermission(
//     modulePermissionName,
//     permissionActionMap[permission] || permission || "canEdit"
//   );

//   const fetchRecords = async () => {
//     setLoading(true);
//     setLoadError("");

//     try {
//       const endpointFilter = (activeConfig.filters || []).
//       map((filter) => filter.options?.find((option) => option.value === filterValues[filter.key])).
//       find((option) => option?.endpoint);
//       const listConfig = endpointFilter ?
//       { ...activeConfig, api: { ...activeConfig.api, list: endpointFilter.endpoint } } :
//       activeConfig;
//       const nextRecords = await listHrmsSettings(listConfig);

//       setRecords(
//         Array.isArray(nextRecords) ?
//         nextRecords :
//         nextRecords ?
//         [nextRecords] :
//         []
//       );
//     } catch (error) {
//       const message = getHrmsErrorMessage(error, `Unable to load ${activeConfig.title}.`);
//       setLoadError(message);
//       toastError(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     setRecords([]);
//     setSearch("");
//     setFilterValues({});
//     setPage(1);
//     setModalState(null);
//     setWorkflowState(null);
//     setShowBulkUpload(false);
//   }, [activeConfig.title]);

//   useEffect(() => {
//     fetchRecords();
//   }, [activeConfig.title, JSON.stringify(filterValues)]);

//   useEffect(() => {
//     if (activeConfig.moduleName !== "Templates") return;

//     templateModuleService.getAll().then((res) => {
//       setTemplateModules(
//         res.data.map((x) => ({
//           value: x.moduleId,
//           label: x.moduleName
//         }))
//       );
//     });
//   }, [activeConfig.moduleName]);

//   const filteredRecords = useMemo(
//     () => filterRecords(records, activeConfig, search, filterValues),
//     [records, activeConfig, search, filterValues]
//   );

//   const pagedRecords = useMemo(() => {
//     const start = (page - 1) * pageSize;
//     return filteredRecords.slice(start, start + pageSize);
//   }, [filteredRecords, page, pageSize]);

//   useEffect(() => {
//     setPage(1);
//   }, [search, pageSize, activeConfig.title]);

//   const handleSubmitRecord = async (payload) => {
//     const isEdit = modalState?.mode === "edit";
//     const recordId = getRecordId(modalState?.record, activeConfig);

//     setActionLoading(true);

//     try {
//       if (isEdit) {
//         await updateHrmsSettingsRecord(activeConfig, recordId, payload);
//       } else {
//         await createHrmsSettingsRecord(activeConfig, payload);
//       }

//       toastSuccess(`${activeConfig.title} saved successfully.`);
//       setModalState(null);
//       await fetchRecords();
//     } catch (error) {
//       toastError(getHrmsErrorMessage(error, `Unable to save ${activeConfig.title}.`));
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleDelete = async (record) => {
//     const recordId = getRecordId(record, activeConfig);

//     if (!recordId || !window.confirm(`Delete this ${activeConfig.title} record?`)) {
//       return;
//     }

//     setActionLoading(true);

//     try {
//       await deleteHrmsSettingsRecord(activeConfig, recordId);
//       toastSuccess(`${activeConfig.title} deleted successfully.`);
//       await fetchRecords();
//     } catch (error) {
//       toastError(getHrmsErrorMessage(error, `Unable to delete ${activeConfig.title}.`));
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleWorkflow = async (payload, record, actionOverride) => {
//     const action = actionOverride || workflowState?.action;
//     const recordId = getRecordId(record, activeConfig);

//     if (!action) {
//       return;
//     }

//     setActionLoading(true);

//     try {
//       if (action.method === "get") {
//         const response = await runHrmsWorkflowAction(action, payload, recordId);
//         if (action.replaceTable) {
//           const nextRecords = extractHrmsCollection(response?.data);
//           setRecords(nextRecords.length ? nextRecords : [response?.data].filter(Boolean));
//         }
//         toastSuccess(`${action.label} loaded successfully.`);
//       } else if (action.method === "download") {
//         const response = await runHrmsWorkflowAction(action, payload, recordId);
//         const blob = new Blob([response.data]);
//         const url = window.URL.createObjectURL(blob);
//         const link = document.createElement("a");
//         link.href = url;
//         link.download = action.fileName || `${activeConfig.title}.download`;
//         link.click();
//         window.URL.revokeObjectURL(url);
//         toastSuccess(`${action.label} completed successfully.`);
//       } else {
//         await runHrmsWorkflowAction(
//           action,
//           { id: recordId, ...payload },
//           recordId
//         );
//         toastSuccess(`${action.label} completed successfully.`);
//         await fetchRecords();
//       }

//       setWorkflowState(null);
//     } catch (error) {
//       toastError(getHrmsErrorMessage(error, `Unable to complete ${action.label}.`));
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleToolbarAction = (action) => {
//     if (action.fields?.length) {
//       setWorkflowState({ action, record: null });
//       return;
//     }

//     handleWorkflow({}, null, action);
//   };

//   const handleBulkUpload = async (file) => {
//     if (!file) {
//       toastError("Please choose a file to upload.");
//       return;
//     }

//     setActionLoading(true);

//     try {
//       await uploadHrmsBulkRecords(activeConfig, file);
//       toastSuccess(`${activeConfig.bulkUpload.label} completed successfully.`);
//       setShowBulkUpload(false);
//       await fetchRecords();
//     } catch (error) {
//       toastError(getHrmsErrorMessage(error, "Bulk upload failed."));
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   if (!activeConfig) {
//     return (
//       <div className="settings-page">
//         <SettingsBanner
//           title="Module not found"
//           message="The requested settings module is not configured." />
        
//       </div>);

//   }

//   if (!canView) {
//     return (
//       <div className="settings-page">
//         <SettingsBanner
//           title="Access denied"
//           message="You do not have permission to view this settings module." />
        
//       </div>);

//   }

//   return (

//     <div className="hrms-settings-page">
//       <SettingsCard
//         title={activeConfig.title}
//         description={activeConfig.description}
//         meta={null}
//         className="hrms-settings-card hrms-settings-card-no-top">
        
//         <div className="hrms-settings-toolbar">
//           {shiftMode &&
//           <>
//               <SettingsField label="Category">
//                 <select className="settings-select" value="shift" disabled>
//                   <option value="shift">Shift Module</option>
//                 </select>
//               </SettingsField>
//               <SettingsField label="Module">
//                 <select
//                 className="settings-select"
//                 value={selectedShiftModule}
//                 onChange={(event) => setSelectedShiftModule(event.target.value)}>
                
//                   {shiftModuleOptions.map((option) =>
//                 <option key={option.value} value={option.value}>
//                       {option.label}
//                     </option>
//                 )}
//                 </select>
//               </SettingsField>
//             </>
//           }

//           {configMap && moduleOptions?.length > 0 &&
//           <SettingsField label="Module">
//               <select
//               className="settings-select"
//               value={selectedConfigModule}
//               onChange={(event) => setSelectedConfigModule(event.target.value)}>
              
//                 {moduleOptions.map((option) =>
//               <option key={option.value} value={option.value}>
//                     {option.label}
//                   </option>
//               )}
//               </select>
//             </SettingsField>
//           }

//           {(activeConfig?.filters ?? []).map((filter) =>
//           <SettingsField key={filter.key} label={filter.label}>
//               <select
//               className="settings-select"
//               value={filterValues[filter.key] || ""}
//               onChange={(event) =>
//               setFilterValues((previous) => ({
//                 ...previous,
//                 [filter.key]: event.target.value
//               }))
//               }>
              
//                 <option value="">All</option>
//                 {(filter.options || []).map((option) =>
//               <option key={option.value} value={option.value}>
//                     {option.label}
//                   </option>
//               )}
//               </select>
//             </SettingsField>
//           )}

//           <SettingsField label="Search" className="hrms-search-field">
//             <div className="hrms-search-input">
//               <FaSearch />
//               <input
//                 type="search"
//                 value={search}
//                 onChange={(event) => setSearch(event.target.value)}
//                 placeholder="Search"
//                 disabled={loading} />
              
//             </div>
//           </SettingsField>

//           <div className="hrms-settings-actions">
//             <button type="button" className="app-button-ghost" onClick={fetchRecords} disabled={loading}>
//                <FaSync />
//                Refresh
//               </button>
//             {activeConfig.bulkUpload && canWorkflow(activeConfig.bulkUpload.permission) &&
//             <button
//               type="button"
//               className="app-button-ghost"
//               onClick={() => setShowBulkUpload(true)}
//               disabled={actionLoading}>
              
//                 <FaFileUpload />
//                 {activeConfig.bulkUpload.label}
//               </button>
//             }
//             {(activeConfig?.toolbarActions ?? []).map((action) =>
//             canWorkflow(action.permission || "workflow") ?
//             <button
//               key={action.key}
//               type="button"
//               className="app-button-ghost"
//               onClick={() => handleToolbarAction(action)}
//               disabled={actionLoading}>
              
//                   {action.label}
//                 </button> :
//             null
//             )}
//             {canAdd && activeConfig.api.create &&
//             <button
//               type="button"
//               className="app-button-primary"
//               onClick={() => setModalState({ mode: "add", record: null })}
//               disabled={actionLoading}>
              
//                 <FaPlus />
//                 Add
//               </button>
//             }
//           </div>
//         </div>

//         {loadError &&
//         <SettingsBanner title="Unable to load records" message={loadError} tone="error" />
//         }

//         <div className="hrms-table-wrap">
//           <table className="hrms-settings-table">
//             <thead>
//               <tr>
//                 {activeConfig.columns.map((column) =>
//                 <th key={column.key}>{column.label}</th>
//                 )}
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {loading ?
//               <tr>
//                   <td colSpan={activeConfig.columns.length + 1} className="hrms-table-state">
//                     Loading records...
//                   </td>
//                 </tr> :
//               pagedRecords.length === 0 ?
//               <tr>
//                   <td colSpan={activeConfig.columns.length + 1} className="hrms-table-state">
//                     No records found.
//                   </td>
//                 </tr> :

//               (Array.isArray(pagedRecords) ?
//               pagedRecords :
//               []).
//               map((record, index) => {
//                 const recordId = getRecordId(record, activeConfig) || index;

//                 return (
//                   <tr key={`${recordId}-${index}`}>
//                       {activeConfig.columns.map((column) =>
//                     <td key={column.key}>{normalizeDisplayValue(record?.[column.key])}</td>
//                     )}
//                       <td>
//                         <div className="hrms-row-actions">
//                           <button
//                           type="button"
//                           className="settings-icon-button"
//                           onClick={() => setModalState({ mode: "view", record })}
//                           title="View"
//                           aria-label="View">
                          
//                             <FaEye />
//                           </button>
//                           {canEdit && activeConfig.api.update &&
//                         <button
//                           type="button"
//                           className="settings-icon-button"
//                           onClick={() =>
//                           setModalState({ mode: "edit", record })
//                           }
//                           title="Edit"
//                           aria-label="Edit">
                          
//                               <FaEdit />
//                             </button>
//                         }
//                           {canDelete && activeConfig.api.delete &&
//                         <button
//                           type="button"
//                           className="settings-icon-button is-danger"
//                           onClick={() => handleDelete(record)}
//                           title="Delete"
//                           aria-label="Delete"
//                           disabled={actionLoading}>
                          
//                               <FaTrash />
//                             </button>
//                         }
//                          {(activeConfig?.workflowButtons ?? []).map((action) =>
//                         activeConfig.moduleName === "Templates" || canWorkflow(action.permission) ?
//                         <button
//                           key={action.key}
//                           type="button"
//                           className="app-button-ghost hrms-workflow-button"
//                           onClick={() =>
//                           action.fields?.length ?
//                           setWorkflowState({ action, record }) :
//                           handleWorkflow({}, record, action)
//                           }
//                           disabled={actionLoading}>
                          
//                                 {action.label}
//                               </button> :
//                         null
//                         )}

                          
//                         </div>
//                       </td>
//                     </tr>);

//               })
//               }
//             </tbody>
//           </table>
//         </div>

//         <AppPagination
//           totalItems={filteredRecords.length}
//           currentPage={page}
//           pageSize={pageSize}
//           onPageChange={setPage}
//           onPageSizeChange={setPageSize}
//           pageSizeOptions={PAGE_SIZE_OPTIONS}
//           itemLabel="records" />
        
//       </SettingsCard>

//       {modalState &&
//       activeConfig &&
//       activeConfig.formFields &&
//       Array.isArray(activeConfig.formFields) &&
//       <RecordModal
//         mode={modalState.mode}
//         config={{
//           ...activeConfig,
//           formFields: activeConfig.formFields.map((field) =>
//           field.name === "moduleId" ?
//           { ...field, options: templateModules } :
//           field
//           )
//         }}
//         record={modalState.record}
//         onClose={() => setModalState(null)}
//         onSubmit={handleSubmitRecord}
//         saving={actionLoading} />

//       }

//       {workflowState &&
//       <WorkflowModal
//         action={workflowState.action}
//         record={workflowState.record}
//         onClose={() => setWorkflowState(null)}
//         onSubmit={handleWorkflow}
//         saving={actionLoading} />

//       }

//       {showBulkUpload &&
//       <BulkUploadModal
//         config={activeConfig}
//         onClose={() => setShowBulkUpload(false)}
//         onUploaded={handleBulkUpload}
//         uploading={actionLoading} />

//       }
//     </div>);

// }

// export const TemplateSettingsPage = () =>
// <HrmsSettingsPage
//   configMap={templateModulesConfig}
//   moduleOptions={templateModuleOptions}
//   initialModuleKey="templates"
//   pageTitle="Template Settings"
//   pageDescription="Manage document templates with upload, download, delete, and live template listing." />;

// export default HrmsSettingsPage;







import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCheck,
  FaEdit,
  FaEye,
  FaFileUpload,
  FaPlus,
  FaRedo,
  FaSearch,
  FaSync,
  FaTimes,
  FaTrash
} from "react-icons/fa";
import CreateShiftModal from "../../Teams/CreateShiftModal";
import AppPagination from "../../components/AppPagination";
import { toastError, toastSuccess } from "@/components/common/toast/toastService";
import {
  createHrmsSettingsRecord,
  deleteHrmsSettingsRecord,
  extractHrmsCollection,
  getHrmsErrorMessage,
  listHrmsSettings,
  runHrmsWorkflowAction,
  updateHrmsSettingsRecord,
  uploadHrmsBulkRecords
} from "../../services/hrmsSettingsService";
import {
  hasAddPermission,
  hasDeletePermission,
  hasEditPermission,
  hasModulePermission,
  hasViewPermission
} from "../../utils/authorization";
import { SettingsBanner, SettingsCard, SettingsField, SettingsStatPill } from "./SettingsShared";
import { shiftModuleOptions, shiftModulesConfig, standaloneSettingsModules } from "./hrmsSettingsConfig";
import { templateModuleOptions, templateModulesConfig } from "./templateConfig";
import "./Settings.css";
import templateModuleService from "../../services/templateModuleService";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const getTemplateModuleRows = (response) => {
  const queue = [response?.data, response];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (Array.isArray(current)) return current;
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    ["data", "items", "results", "result", "modules"].forEach((key) => {
      if (current[key] !== undefined) queue.push(current[key]);
    });
  }

  return [];
};

const getTemplateModuleId = (response) => {
  const idKeys = [
    "moduleId",
    "ModuleId",
    "ModuleID",
    "moduleID",
    "module_id",
    "id",
    "Id",
    "ID",
    "templateModuleId",
    "TemplateModuleId",
    "templateModuleID"
  ];
  const queue = [response];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    for (const key of idKeys) {
      const id = current[key];
      if ((typeof id === "string" && id.trim()) || (typeof id === "number" && Number.isFinite(id))) {
        return id;
      }
    }

    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }

  return null;
};

const normalizeModuleMatchValue = (value) => String(value ?? "").trim().toLowerCase();

const getRecordId = (record, config) =>
  record?.[config.idKey] ??
  record?.[`${config.idKey?.charAt(0).toUpperCase()}${config.idKey?.slice(1)}`] ??
  record?.id ??
  record?.Id ??
  record?.employeeId ??
  record?.EmployeeId ??
  record?.resignationId ??
  record?.ResignationId ??
  record?.assignmentId ??
  record?.AssignmentId;

const formatShiftTime = (value) => {
  const time = String(value ?? "-");
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
};

const normalizeDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const coerceFieldValue = (field, value) => {
  if (field.type === "file") {
    return value || null;
  }

  if (field.type === "number") {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : value;
  }

  return value ?? "";
};

const buildInitialValues = (fields = [], record = null) => {
  const safeRecord = record ?? {};

  return fields.reduce((values, field) => {
    if (!field || !field.name) {
      return values;
    }

    values[field.name] =
      field.type === "file"
        ? null
        : safeRecord?.[field.name] ??
          safeRecord?.[
            field.name.charAt(0).toUpperCase() + field.name.slice(1)
          ] ??
          "";

    return values;
  }, {});
};

const buildPayload = (fields = [], values = {}) =>
  fields.reduce((payload, field) => {
    payload[field.name] = coerceFieldValue(field, values[field.name]);
    return payload;
  }, {});

const validateValues = (fields = [], values = {}) =>
  fields.reduce((errors, field) => {
    if (field.required && !String(values[field.name] ?? "").trim()) {
      if (field.type === "file" && values[field.name]) {
        return errors;
      }

      errors[field.name] = `${field.label} is required.`;
    }

    return errors;
  }, {});

const filterRecords = (records, config, search, filterValues) => {
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const searchFields = config.searchFields?.length
    ? config.searchFields
    : config.columns.map((column) => column.key);

  return records.filter((record) => {
    const matchesSearch =
      !normalizedSearch ||
      searchFields.some((field) =>
        normalizeDisplayValue(record?.[field]).toLowerCase().includes(normalizedSearch)
      );

    if (!matchesSearch) {
      return false;
    }

    return (config.filters || []).every((filter) => {
      const selectedValue = filterValues[filter.key];

      if (!selectedValue || filter.endpoint) {
        return true;
      }

      return (
        String(record?.[filter.key] ?? "").toLowerCase() ===
        String(selectedValue).toLowerCase()
      );
    });
  });
};

function DynamicFormFields({
  fields,
  values,
  errors,
  onChange,
  disabled = false,
  showCustomModuleName = false,
  customModuleName = "",
  customModuleNameError = "",
  customModuleCode = "",
  customModuleCodeError = "",
  onCustomModuleNameChange,
  onCustomModuleCodeChange
}) {
  return (
    <div className="settings-form-grid settings-grid settings-grid-2">
      {fields.map((field) => (
        <React.Fragment key={field.name}>
          <SettingsField
            label={field.label}
            required={field.required}
            error={errors[field.name]}
            className={field.fullWidth ? "settings-field--full" : ""}
          >
            {field.type === "textarea" ? (
              <textarea
                className="settings-textarea"
                name={field.name}
                value={values[field.name] ?? ""}
                onChange={onChange}
                disabled={disabled}
                rows={5}
              />
            ) : field.type === "select" ? (
              <select
                className="settings-select"
                name={field.name}
                value={values[field.name] ?? ""}
                onChange={onChange}
                disabled={disabled}
              >
                <option value="">Select {field.label}</option>
                {(field.options || []).map((option) => {
                  const optionValue = typeof option === "string" ? option : option.value;
                  const optionLabel = typeof option === "string" ? option : option.label;

                  return (
                    <option key={optionValue} value={optionValue}>
                      {optionLabel}
                    </option>
                  );
                })}
              </select>
            ) : field.type === "file" ? (
              <input
                className="settings-input"
                type="file"
                name={field.name}
                accept={field.accept}
                onChange={onChange}
                disabled={disabled}
              />
            ) : (
              <input
                className={field.type === "time" ? "settings-time-input" : "settings-input"}
                type={field.type || "text"}
                name={field.name}
                value={values[field.name] ?? ""}
                onChange={onChange}
                disabled={disabled}
              />
            )}
          </SettingsField>
          {field.name === "moduleId" && showCustomModuleName && (
            <>
              <SettingsField label="Module name" required error={customModuleNameError}>
                <input
                  className="settings-input"
                  type="text"
                  value={customModuleName}
                  onChange={onCustomModuleNameChange}
                  placeholder="Experience Letter"
                  disabled={disabled}
                />
              </SettingsField>
              <SettingsField label="Module code" required error={customModuleCodeError}>
                <input
                  className="settings-input"
                  type="text"
                  value={customModuleCode}
                  onChange={onCustomModuleCodeChange}
                  placeholder="EXP_LETTER"
                  disabled={disabled}
                />
              </SettingsField>
            </>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ModalShell({ title, children, footer, onClose }) {
  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        <div className="settings-modal-head">
          <h3 id="settings-modal-title">{title}</h3>
          <button type="button" className="settings-icon-button" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>
        <div className="settings-modal-body">{children}</div>
        {footer && <div className="settings-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function RecordModal({ mode, config, record, onClose, onSubmit, saving }) {
  const readOnly = mode === "view";
  const safeRecord = record ?? {};

  const [values, setValues] = useState(() =>
    buildInitialValues(config.formFields ?? [], safeRecord)
  );
  const [errors, setErrors] = useState({});
  const [customModuleName, setCustomModuleName] = useState("");
  const [customModuleNameError, setCustomModuleNameError] = useState("");
  const [customModuleCode, setCustomModuleCode] = useState("");
  const [customModuleCodeError, setCustomModuleCodeError] = useState("");
  const isTemplateForm = config.moduleName === "Templates";
  const isAddModule = isTemplateForm && values.moduleId === "add";

  const handleChange = (event) => {
    const { name, type, value, files } = event.target;
    const nextValues = {
      ...values,
      [name]: type === "file" ? files?.[0] || null : value
    };
    setValues(nextValues);
    setErrors(validateValues(config.formFields, nextValues));
    if (name === "moduleId" && value !== "add") {
      setCustomModuleName("");
      setCustomModuleNameError("");
      setCustomModuleCode("");
      setCustomModuleCodeError("");
    }
  };

  const handleCustomModuleNameChange = (event) => {
    setCustomModuleName(event.target.value);
    setCustomModuleNameError("");
  };

  const handleCustomModuleCodeChange = (event) => {
    setCustomModuleCode(event.target.value);
    setCustomModuleCodeError("");
  };

  const handleSubmit = () => {
    const validationErrors = validateValues(config.formFields, values);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toastError("Please correct the highlighted fields.");
      return;
    }

    if (isAddModule && !customModuleName.trim()) {
      setCustomModuleNameError("Enter a module name");
    }

    if (isAddModule && !customModuleCode.trim()) {
      setCustomModuleCodeError("Enter a module code");
    }

    if (isAddModule && (!customModuleName.trim() || !customModuleCode.trim())) {
      return;
    }

    const payload = buildPayload(config.formFields, values);
    onSubmit(
      payload,
      isAddModule
        ? { moduleName: customModuleName.trim(), moduleCode: customModuleCode.trim() }
        : null
    );
  };

  return (
    <ModalShell
      title={`${mode === "edit" ? "Edit" : mode === "view" ? "View" : "Add"} ${config.title}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="app-button-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {!readOnly && (
            <button type="button" className="app-button-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </>
      }
    >
      <DynamicFormFields
        fields={config.formFields}
        values={values}
        errors={errors}
        onChange={handleChange}
        disabled={saving || readOnly}
        showCustomModuleName={isAddModule}
        customModuleName={customModuleName}
        customModuleNameError={customModuleNameError}
        customModuleCode={customModuleCode}
        customModuleCodeError={customModuleCodeError}
        onCustomModuleNameChange={handleCustomModuleNameChange}
        onCustomModuleCodeChange={handleCustomModuleCodeChange}
      />
    </ModalShell>
  );
}

function WorkflowModal({ action, record, onClose, onSubmit, saving }) {
  const [values, setValues] = useState(() => buildInitialValues(action.fields || []));
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, type, value, files } = event.target;
    const nextValues = {
      ...values,
      [name]: type === "file" ? files?.[0] || null : value
    };
    setValues(nextValues);
    setErrors(validateValues(action.fields || [], nextValues));
  };

  const handleSubmit = () => {
    const fields = action.fields || [];
    const validationErrors = validateValues(fields, values);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toastError("Please correct the highlighted fields.");
      return;
    }

    onSubmit(buildPayload(fields, values), record);
  };

  return (
    <ModalShell
      title={action.label}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="app-button-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="app-button-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Working..." : action.label}
          </button>
        </>
      }
    >
      {action.fields?.length ? (
        <DynamicFormFields
          fields={action.fields}
          values={values}
          errors={errors}
          onChange={handleChange}
          disabled={saving}
        />
      ) : (
        <SettingsBanner
          title="Confirm action"
          message={`Run ${action.label} for this record?`}
          tone="info"
        />
      )}
    </ModalShell>
  );
}

function BulkUploadModal({ config, onClose, onUploaded, uploading }) {
  const [file, setFile] = useState(null);

  return (
    <ModalShell
      title={config.bulkUpload.label}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="app-button-ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            type="button"
            className="app-button-primary"
            onClick={() => onUploaded(file)}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </>
      }
    >
      <SettingsField label="Upload File" required>
        <input
          className="settings-input"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          disabled={uploading}
        />
      </SettingsField>
      {uploading && (
        <SettingsBanner
          title="Upload in progress"
          message="Validating and uploading records."
          tone="info"
        />
      )}
    </ModalShell>
  );
}

function HrmsSettingsPage({
  moduleKey,
  config: providedConfig,
  shiftMode = false,
  configMap,
  moduleOptions,
  initialModuleKey,
  pageTitle,
  pageDescription
}) {
  const [selectedShiftModule, setSelectedShiftModule] = useState("shiftMaster");
  const [selectedConfigModule, setSelectedConfigModule] = useState(
    initialModuleKey || moduleOptions?.[0]?.value || ""
  );
  const activeConfig = shiftMode
    ? shiftModulesConfig[selectedShiftModule]
    : configMap
    ? configMap[selectedConfigModule]
    : providedConfig || standaloneSettingsModules[moduleKey];

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalState, setModalState] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const deleteRequestInFlight = useRef(false);
  const [createShiftOpen, setCreateShiftOpen] = useState(false);
  const createShiftRequestInFlight = useRef(false);
  const [workflowState, setWorkflowState] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [templateModules, setTemplateModules] = useState([]);
  const createdTemplateModulesRef = useRef(new Map());
  const recordSubmitInFlightRef = useRef(false);

  // ==========================================
  // 🔑 PERMISSION & ADMIN ROLE CHECK (UPDATED)
  // ==========================================
  const currentUser = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null") ||
        {}
      );
    } catch {
      return {};
    }
  }, []);

  const userRole = (
    currentUser?.role ||
    currentUser?.roleName ||
    currentUser?.userRole ||
    localStorage.getItem("role") ||
    ""
  ).toLowerCase().trim();

  // Allow admins and HR admins full access to settings
  const isAdminUser = [
    "admin",
    "superadmin",
    "hr admin",
    "hr",
    "super admin"
  ].includes(userRole);

  const modulePermissionName = activeConfig?.moduleName || "";

  // If the user is admin/hr admin, grant access automatically.
  // Otherwise, fall back to authorization utility.
  const canView = activeConfig
    ? isAdminUser || !modulePermissionName || hasViewPermission(modulePermissionName)
    : false;
  const canAdd = activeConfig
    ? isAdminUser || hasAddPermission(modulePermissionName)
    : false;
  const canEdit = activeConfig
    ? isAdminUser || hasEditPermission(modulePermissionName)
    : false;
  const canDelete = activeConfig
    ? isAdminUser || hasDeletePermission(modulePermissionName)
    : false;

  const permissionActionMap = {
    view: "canView",
    add: "canAdd",
    edit: "canEdit",
    delete: "canDelete",
    upload: "canUpload",
    download: "canDownload",
    submit: "canSubmit",
    approve: "canApprove",
    workflow: "canEdit",
    publish: "canEdit",
    copy: "canEdit",
    bulkUpload: "canAdd"
  };

  const canWorkflow = (permission) =>
    isAdminUser ||
    hasModulePermission(
      modulePermissionName,
      permissionActionMap[permission] || permission || "canEdit"
    );
  // ==========================================

  const fetchRecords = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const endpointFilter = (activeConfig.filters || [])
        .map((filter) =>
          filter.options?.find((option) => option.value === filterValues[filter.key])
        )
        .find((option) => option?.endpoint);

      const listConfig = endpointFilter
        ? { ...activeConfig, api: { ...activeConfig.api, list: endpointFilter.endpoint } }
        : activeConfig;

      const nextRecords = await listHrmsSettings(
        listConfig,
        {},
        activeConfig === shiftModulesConfig.shiftMaster ? { cacheTTL: 0 } : {}
      );

      const normalizedRecords = Array.isArray(nextRecords)
        ? nextRecords
        : nextRecords
        ? [nextRecords]
        : [];
      setRecords(normalizedRecords);
      return normalizedRecords;
    } catch (error) {
      const message = getHrmsErrorMessage(error, `Unable to load ${activeConfig?.title || "records"}.`);
      setLoadError(message);
      toastError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRecords([]);
    setSearch("");
    setFilterValues({});
    setPage(1);
    setModalState(null);
    setWorkflowState(null);
    setShowBulkUpload(false);
  }, [activeConfig?.title]);

  useEffect(() => {
    if (activeConfig) {
      fetchRecords();
    }
  }, [activeConfig?.title, JSON.stringify(filterValues)]);

  const loadTemplateModules = async () => {
    const response = await templateModuleService.getAll();
    const modules = getTemplateModuleRows(response).map((module) => ({
      value: module.moduleId ?? module.ModuleId ?? module.ModuleID ?? module.moduleID ?? module.module_id ?? module.id ?? module.Id ?? module.ID,
      label: module.moduleName ?? module.ModuleName ?? module.name ?? module.Name ?? "",
      code: module.moduleCode ?? module.ModuleCode ?? module.ModuleCODE ?? module.moduleCODE ?? module.module_code ?? module.code ?? module.Code ?? ""
    }));
    setTemplateModules(modules);
    return modules;
  };

  useEffect(() => {
    if (activeConfig?.moduleName !== "Templates") return;

    loadTemplateModules().catch((error) => {
      toastError(getHrmsErrorMessage(error, "Unable to load template modules."));
    });
  }, [activeConfig?.moduleName]);

  const filteredRecords = useMemo(
    () => (activeConfig ? filterRecords(records, activeConfig, search, filterValues) : []),
    [records, activeConfig, search, filterValues]
  );

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, activeConfig?.title]);

  const handleSubmitRecord = async (payload, customModule = null) => {
    if (recordSubmitInFlightRef.current) return null;
    recordSubmitInFlightRef.current = true;

    const isEdit = modalState?.mode === "edit";
    const recordId = getRecordId(modalState?.record, activeConfig);
    const moduleKey = customModule
      ? `${normalizeModuleMatchValue(customModule.moduleCode)}|${normalizeModuleMatchValue(customModule.moduleName)}`
      : "";
    let moduleCreated = false;
    let moduleId = null;

    setActionLoading(true);

    try {
      if (customModule && activeConfig?.moduleName === "Templates") {
        const cachedModule = createdTemplateModulesRef.current.get(moduleKey);

        if (cachedModule) {
          moduleCreated = true;
          moduleId = cachedModule.moduleId;
        } else {
          const createResponse = await templateModuleService.create({
            moduleName: customModule.moduleName,
            moduleCode: customModule.moduleCode
          });
          if (createResponse?.data?.success === false || createResponse?.success === false) {
            throw new Error(
              createResponse?.data?.message || createResponse?.data?.error || "Unable to create module."
            );
          }
          moduleCreated = true;
          moduleId = getTemplateModuleId(createResponse);
          createdTemplateModulesRef.current.set(moduleKey, { moduleId });
        }

        if (moduleId === null || moduleId === undefined || String(moduleId).trim() === "") {
          const refreshedModules = await loadTemplateModules();
          const codeMatch = refreshedModules.filter(
            (module) => normalizeModuleMatchValue(module.code) === normalizeModuleMatchValue(customModule.moduleCode)
          );
          let matchingModules = codeMatch;

          if (codeMatch.length === 0) {
            matchingModules = refreshedModules.filter(
              (module) => normalizeModuleMatchValue(module.label) === normalizeModuleMatchValue(customModule.moduleName)
            );
          }

          if (
            matchingModules.length === 1 &&
            matchingModules[0].value !== undefined &&
            matchingModules[0].value !== null &&
            String(matchingModules[0].value).trim()
          ) {
            moduleId = matchingModules[0].value;
            createdTemplateModulesRef.current.set(moduleKey, { moduleId });
          } else {
            toastError("Module was created but its ID couldn't be found. Select it from the Module list and save again.");
            return { moduleCreated: true, moduleId: null };
          }
        }

        payload = { ...payload, moduleId: String(moduleId) };
      }

      if (isEdit) {
        await updateHrmsSettingsRecord(activeConfig, recordId, payload);
      } else {
        await createHrmsSettingsRecord(activeConfig, payload);
      }

      toastSuccess(`${activeConfig.title} saved successfully.`);
      setModalState(null);
      await fetchRecords();
      if (customModule && activeConfig?.moduleName === "Templates") {
        try {
          await loadTemplateModules();
        } catch (error) {
          toastError(getHrmsErrorMessage(error, "Template saved, but modules could not be refreshed."));
        }
      }
      return { moduleCreated, moduleId, success: true };
    } catch (error) {
      toastError(getHrmsErrorMessage(error, `Unable to save ${activeConfig.title}.`));
      return { moduleCreated, moduleId };
    } finally {
      recordSubmitInFlightRef.current = false;
      setActionLoading(false);
    }
  };

  const handleDelete = async (record) => {
    const recordId = getRecordId(record, activeConfig);

    if (!recordId) {
      return;
    }

    if (activeConfig === shiftModulesConfig.shiftMaster) {
      setDeleteRecord(record);
      return;
    }

    if (!window.confirm(`Delete this ${activeConfig.title} record?`)) return;

    await confirmDeleteRecord(record, recordId);
  };

  const confirmDeleteRecord = async (record, recordId = getRecordId(record, activeConfig)) => {
    if (!recordId || deleteRequestInFlight.current) return;

    deleteRequestInFlight.current = true;
    setActionLoading(true);

    try {
      const deleteResponse = await deleteHrmsSettingsRecord(activeConfig, recordId);
      const refreshedRecords = await fetchRecords();
      if (activeConfig === shiftModulesConfig.shiftMaster) {
        if (!refreshedRecords) {
          toastError("The delete request succeeded, but the refreshed Shift Master list could not be verified.");
          return;
        }
        const stillExists = refreshedRecords.some((item) => String(getRecordId(item, activeConfig)) === String(recordId));
        if (stillExists) {
          if (import.meta.env.DEV) {
            console.error("Shift DELETE returned success but fresh GET /Shift still contains the shift", {
              shiftId: recordId,
              deleteStatus: deleteResponse?.status,
              deleteResponse: deleteResponse?.data,
              refreshedRecord: refreshedRecords.find((item) => String(getRecordId(item, activeConfig)) === String(recordId))
            });
          }
          toastError("The delete request succeeded, but a fresh GET /Shift still returns this shift. Check the backend delete persistence.");
          return;
        }
      }

      toastSuccess(activeConfig === shiftModulesConfig.shiftMaster ? "Shift deleted successfully." : `${activeConfig.title} deleted successfully.`);
      setDeleteRecord(null);
    } catch (error) {
      toastError(getHrmsErrorMessage(error, `Unable to delete ${activeConfig.title}.`));
    } finally {
      deleteRequestInFlight.current = false;
      setActionLoading(false);
    }
  };

  const handleCreateShift = async (payload) => {
    if (createShiftRequestInFlight.current) return false;
    createShiftRequestInFlight.current = true;
    setActionLoading(true);
    try {
      await createHrmsSettingsRecord(shiftModulesConfig.shiftMaster, payload);
      toastSuccess("Shift created successfully.");
      setCreateShiftOpen(false);
      await fetchRecords();
      return true;
    } catch (error) {
      toastError(getHrmsErrorMessage(error, "Unable to create shift."));
      return false;
    } finally {
      createShiftRequestInFlight.current = false;
      setActionLoading(false);
    }
  };

  const handleWorkflow = async (payload, record, actionOverride) => {
    const action = actionOverride || workflowState?.action;
    const recordId = getRecordId(record, activeConfig);

    if (!action) {
      return;
    }

    setActionLoading(true);

    try {
      if (action.method === "get") {
        const response = await runHrmsWorkflowAction(action, payload, recordId);
        if (action.replaceTable) {
          const nextRecords = extractHrmsCollection(response?.data);
          setRecords(nextRecords.length ? nextRecords : [response?.data].filter(Boolean));
        }
        toastSuccess(`${action.label} loaded successfully.`);
      } else if (action.method === "download") {
        const response = await runHrmsWorkflowAction(action, payload, recordId);
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = action.fileName || `${activeConfig.title}.download`;
        link.click();
        window.URL.revokeObjectURL(url);
        toastSuccess(`${action.label} completed successfully.`);
      } else {
        await runHrmsWorkflowAction(
          action,
          { id: recordId, ...payload },
          recordId
        );
        toastSuccess(`${action.label} completed successfully.`);
        await fetchRecords();
      }

      setWorkflowState(null);
    } catch (error) {
      if (!error?.shiftSwapApiReported) {
        toastError(getHrmsErrorMessage(error, `Unable to complete ${action.label}.`));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleToolbarAction = (action) => {
    if (action.fields?.length) {
      setWorkflowState({ action, record: null });
      return;
    }

    handleWorkflow({}, null, action);
  };

  const handleBulkUpload = async (file) => {
    if (!file) {
      toastError("Please choose a file to upload.");
      return;
    }

    setActionLoading(true);

    try {
      await uploadHrmsBulkRecords(activeConfig, file);
      toastSuccess(`${activeConfig.bulkUpload.label} completed successfully.`);
      setShowBulkUpload(false);
      await fetchRecords();
    } catch (error) {
      toastError(getHrmsErrorMessage(error, "Bulk upload failed."));
    } finally {
      setActionLoading(false);
    }
  };

  if (!activeConfig) {
    return (
      <div className="settings-page">
        <SettingsBanner
          title="Module not found"
          message="The requested settings module is not configured."
        />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="settings-page">
        <SettingsBanner
          title="Access denied"
          message="You do not have permission to view this settings module."
        />
      </div>
    );
  }

  return (
    <div className="hrms-settings-page">
      <SettingsCard
        title={activeConfig.title}
        description={activeConfig.description}
        meta={null}
        className="hrms-settings-card hrms-settings-card-no-top"
      >
        <div className="hrms-settings-toolbar">
          {shiftMode && (
            <>
              <SettingsField label="Category">
                <select className="settings-select" value="shift" disabled>
                  <option value="shift">Shift Module</option>
                </select>
              </SettingsField>
              <SettingsField label="Module">
                <select
                  className="settings-select"
                  value={selectedShiftModule}
                  onChange={(event) => setSelectedShiftModule(event.target.value)}
                >
                  {shiftModuleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SettingsField>
            </>
          )}

          {configMap && moduleOptions?.length > 0 && (
            <SettingsField label="Module">
              <select
                className="settings-select"
                value={selectedConfigModule}
                onChange={(event) => setSelectedConfigModule(event.target.value)}
              >
                {moduleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </SettingsField>
          )}

          {(activeConfig?.filters ?? []).map((filter) => (
            <SettingsField key={filter.key} label={filter.label}>
              <select
                className="settings-select"
                value={filterValues[filter.key] || ""}
                onChange={(event) =>
                  setFilterValues((previous) => ({
                    ...previous,
                    [filter.key]: event.target.value
                  }))
                }
              >
                <option value="">All</option>
                {(filter.options || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </SettingsField>
          ))}

          <SettingsField label="Search" className="hrms-search-field">
            <div className="hrms-search-input">
              <FaSearch />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                disabled={loading}
              />
            </div>
          </SettingsField>

          <div className="hrms-settings-actions">
            <button type="button" className="app-button-ghost" onClick={fetchRecords} disabled={loading}>
              <FaSync />
              Refresh
            </button>
            {activeConfig.bulkUpload && canWorkflow(activeConfig.bulkUpload.permission) && (
              <button
                type="button"
                className="app-button-ghost"
                onClick={() => setShowBulkUpload(true)}
                disabled={actionLoading}
              >
                <FaFileUpload />
                {activeConfig.bulkUpload.label}
              </button>
            )}
            {(activeConfig?.toolbarActions ?? []).map((action) =>
              canWorkflow(action.permission || "workflow") ? (
                <button
                  key={action.key}
                  type="button"
                  className="app-button-ghost"
                  onClick={() => handleToolbarAction(action)}
                  disabled={actionLoading}
                >
                  {action.label}
                </button>
              ) : null
            )}
            {canAdd && activeConfig.api?.create && activeConfig === shiftModulesConfig.shiftMaster && (
              <button
                type="button"
                className="app-button-primary"
                onClick={() => setCreateShiftOpen(true)}
                disabled={actionLoading}
              >
                <FaPlus />
                Create Shift
              </button>
            )}
            {canAdd && activeConfig.api?.create && activeConfig !== shiftModulesConfig.shiftMaster && (
              <button
                type="button"
                className="app-button-primary"
                onClick={() => setModalState({ mode: "add", record: null })}
                disabled={actionLoading}
              >
                <FaPlus />
                Add
              </button>
            )}
          </div>
        </div>

        {loadError && (
          <SettingsBanner title="Unable to load records" message={loadError} tone="error" />
        )}

        {activeConfig === shiftModulesConfig.shiftMaster ? (
          <div className="team-shift-table-wrap">
            <table className="team-shift-table">
              <thead><tr><th>Shift Name</th><th>Time</th><th>Shift Code</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="hrms-table-state">Loading shifts...</td></tr>
                ) : pagedRecords.length === 0 ? (
                  <tr><td colSpan={4} className="hrms-table-state">No shifts found.</td></tr>
                ) : pagedRecords.map((record, index) => {
                  const recordId = getRecordId(record, activeConfig) || index;
                  const start = record.startTime ?? record.start_Time ?? "-";
                  const end = record.endTime ?? record.end_Time ?? "-";
                  return (
                    <tr key={`${recordId}-${index}`}>
                      <td className="team-shift-name-cell" title={record.shiftName ?? record.name}>{record.shiftName ?? record.name ?? "Unnamed Shift"}</td>
                      <td>{formatShiftTime(start)} to {formatShiftTime(end)}</td>
                      <td>{record.shiftCode ?? record.shift_Code ?? record.code ?? "-"}</td>
                      <td>
                        {canDelete && activeConfig.api?.delete && (
                          <button type="button" className="settings-icon-button is-danger" onClick={() => handleDelete(record)} title="Delete shift" aria-label={`Delete ${record.shiftName ?? record.name ?? "shift"}`} disabled={actionLoading}>
                            <FaTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="hrms-table-wrap">
          <table className="hrms-settings-table">
            <thead>
              <tr>
                {activeConfig.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeConfig.columns.length + 1} className="hrms-table-state">
                    Loading records...
                  </td>
                </tr>
              ) : pagedRecords.length === 0 ? (
                <tr>
                  <td colSpan={activeConfig.columns.length + 1} className="hrms-table-state">
                    No records found.
                  </td>
                </tr>
              ) : (
                (Array.isArray(pagedRecords) ? pagedRecords : []).map((record, index) => {
                  const recordId = getRecordId(record, activeConfig) || index;

                  return (
                    <tr key={`${recordId}-${index}`}>
                      {activeConfig.columns.map((column) => (
                        <td key={column.key}>{normalizeDisplayValue(record?.[column.key])}</td>
                      ))}
                      <td>
                        <div className="hrms-row-actions">
                          <button
                            type="button"
                            className="settings-icon-button"
                            onClick={() => setModalState({ mode: "view", record })}
                            title="View"
                            aria-label="View"
                          >
                            <FaEye />
                          </button>
                          {canEdit && activeConfig.api?.update && (
                            <button
                              type="button"
                              className="settings-icon-button"
                              onClick={() => setModalState({ mode: "edit", record })}
                              title="Edit"
                              aria-label="Edit"
                            >
                              <FaEdit />
                            </button>
                          )}
                          {canDelete && activeConfig.api?.delete && (
                            <button
                              type="button"
                              className="settings-icon-button is-danger"
                              onClick={() => handleDelete(record)}
                              title="Delete"
                              aria-label="Delete"
                              disabled={actionLoading}
                            >
                              <FaTrash />
                            </button>
                          )}
                          {(activeConfig?.workflowButtons ?? []).map((action) =>
                            activeConfig.moduleName === "Templates" || canWorkflow(action.permission) ? (
                              <button
                                key={action.key}
                                type="button"
                                className="app-button-ghost hrms-workflow-button"
                                onClick={() =>
                                  action.fields?.length
                                    ? setWorkflowState({ action, record })
                                    : handleWorkflow({}, record, action)
                                }
                                disabled={actionLoading}
                              >
                                {action.label}
                              </button>
                            ) : null
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>}

        <AppPagination
          totalItems={filteredRecords.length}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          itemLabel="records"
        />
      </SettingsCard>

      {modalState &&
        activeConfig &&
        activeConfig.formFields &&
        Array.isArray(activeConfig.formFields) && (
          <RecordModal
            mode={modalState.mode}
            config={{
              ...activeConfig,
              formFields: activeConfig.formFields.map((field) =>
                field.name === "moduleId"
                  ? {
                      ...field,
                      options:
                        activeConfig.moduleName === "Templates"
                          ? [...templateModules, { value: "add", label: "Add new module" }]
                          : templateModules
                    }
                  : field
              )
            }}
            record={modalState.record}
            onClose={() => setModalState(null)}
            onSubmit={handleSubmitRecord}
            saving={actionLoading}
          />
        )}

      {deleteRecord && activeConfig === shiftModulesConfig.shiftMaster && (
        <ModalShell
          title="Delete Shift"
          onClose={() => {
            if (!actionLoading) setDeleteRecord(null);
          }}
          footer={(
            <>
              <button type="button" className="app-button-secondary" onClick={() => setDeleteRecord(null)} disabled={actionLoading}>Cancel</button>
              <button type="button" className="app-button-danger" onClick={() => confirmDeleteRecord(deleteRecord)} disabled={actionLoading}>
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        >
          <p>Are you sure you want to delete this shift?</p>
          <p><strong>Shift:</strong> {deleteRecord.shiftName ?? deleteRecord.name ?? "Unnamed Shift"}</p>
          <p><strong>Code:</strong> {deleteRecord.shiftCode ?? deleteRecord.shift_Code ?? deleteRecord.code ?? "-"}</p>
          <p><strong>Time:</strong> {formatShiftTime(deleteRecord.startTime ?? deleteRecord.start_Time)} - {formatShiftTime(deleteRecord.endTime ?? deleteRecord.end_Time)}</p>
          <p>This action cannot be undone.</p>
        </ModalShell>
      )}

      {activeConfig === shiftModulesConfig.shiftMaster && createShiftOpen && (
        <CreateShiftModal
          open={createShiftOpen}
          saving={actionLoading}
          onClose={() => {
            if (!createShiftRequestInFlight.current) setCreateShiftOpen(false);
          }}
          onCreate={handleCreateShift}
        />
      )}

      {workflowState && (
        <WorkflowModal
          action={workflowState.action}
          record={workflowState.record}
          onClose={() => setWorkflowState(null)}
          onSubmit={handleWorkflow}
          saving={actionLoading}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          config={activeConfig}
          onClose={() => setShowBulkUpload(false)}
          onUploaded={handleBulkUpload}
          uploading={actionLoading}
        />
      )}
    </div>
  );
}

export const TemplateSettingsPage = () => (
  <HrmsSettingsPage
    configMap={templateModulesConfig}
    moduleOptions={templateModuleOptions}
    initialModuleKey="templates"
    pageTitle="Template Settings"
    pageDescription="Manage document templates with upload, download, delete, and live template listing."
  />
);

export default HrmsSettingsPage;
