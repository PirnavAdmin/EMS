import React, { useEffect, useMemo, useState } from "react";
import "./Assets.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildServerUrl } from "../api/endpoints";
import AppPagination from "../components/AppPagination";
import { extractCollection, sortByNewestIdFirst } from "../utils/collections";
import { formatEmployeeCode, normalizeText } from "../utils/formatters";

const EMPTY_ASSET = {
  name: "",
  serial: "",
  assigned: "",
  status: "Assigned",
  description: "",
  images: [],
};

const ASSET_STATUS_OPTIONS = ["Assigned", "Available", "Under Repair"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const normalizeImagePaths = (value) => {
  let rawImages = [];

  if (Array.isArray(value)) {
    rawImages = value;
  } else if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
      try {
        const parsedValue = JSON.parse(trimmedValue);
        rawImages = Array.isArray(parsedValue) ? parsedValue : [trimmedValue];
      } catch {
        rawImages = trimmedValue.split(",");
      }
    } else {
      rawImages = trimmedValue.split(",");
    }
  }

  return rawImages
    .map((image) =>
      String(image || "")
        .replace(/\\/g, "/")
        .trim()
    )
    .filter((image) => {
      if (!image) return false;

      const normalized = image.toLowerCase();
      return !["0", "1", "null", "undefined", "false"].includes(normalized);
    });
};

const getAssetEmployeeName = (item) =>
  normalizeText(
    item.employeeName ??
    item.EmployeeName ??
    item.employeeFullName ??
    item.EmployeeFullName ??
    item.assignedEmployeeName ??
    item.AssignedEmployeeName ??
    item.assignedToName ??
    item.AssignedToName ??
    item.empName ??
    item.EmpName ??
    ""
  );

const formatAssetAssigneeLabel = (name, code) => {
  if (name && code) {
    return `${name} (${code})`;
  }

  return name || code || "-";
};

const getEmployeeCodeFromRecord = (employee) =>
  formatEmployeeCode(

    employee.employee_Id ??
    employee.employee_id ??

    employee.employeeId ??
    employee.EmployeeId ??

    employee.employeeCode ??
    employee.EmployeeCode ??

    employee.empCode ??
    employee.EmpCode ??

    employee.code ??
    employee.Code ??

    employee.Employee_Id ??

    employee.id ??
    employee.Id ??

    ""

  );

const getEmployeeNameFromRecord = (employee) => {

  if (!employee) {
    return "";
  }

  return normalizeText(

    employee.name ??
    employee.Name ??

    employee.employeeName ??
    employee.EmployeeName ??
    employee.employee_Name ??

    employee.fullName ??
    employee.FullName ??

    employee.employeeFullName ??
    employee.EmployeeFullName ??

    employee.displayName ??
    employee.DisplayName ??

    employee.employeeDisplayName ??
    employee.EmployeeDisplayName ??

    `${employee.firstName ?? employee.FirstName ?? ""} ${employee.lastName ?? employee.LastName ?? ""
    }`

  );
};

const flattenErrorMessages = (value) => {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue ? [trimmedValue] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenErrorMessages(item));
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap((item) => flattenErrorMessages(item));
  }

  return [String(value)];
};

const extractApiErrorDetails = (error) => {
  const data = error?.response?.data;
  const validationMessages = flattenErrorMessages(data?.errors);
  const candidateMessages = [
    data?.message,
    data?.error,
    data?.title,
    ...validationMessages,
    typeof data === "string" ? data : "",
    error?.message,
  ]
    .flatMap((item) => flattenErrorMessages(item))
    .filter(Boolean);

  return {
    status: error?.response?.status ?? null,
    data,
    validationMessages,
    message:
      candidateMessages[0] || "Something went wrong while saving the asset.",
  };
};

const mapApiFieldKeyToAssetField = (key = "") => {
  const normalizedKey = String(key).trim().toLowerCase();

  if (/(assetname|asset_name|name)/.test(normalizedKey)) {
    return "name";
  }

  if (/(serialno|serial_no|serial)/.test(normalizedKey)) {
    return "serial";
  }

  if (/(assignedto|employeecode|employeeid|employee_id|assigned)/.test(normalizedKey)) {
    return "assigned";
  }

  if (/status/.test(normalizedKey)) {
    return "status";
  }

  return "";
};

const getAssetFieldErrorsFromApiError = (error) => {
  const apiErrors = error?.response?.data?.errors;
  const mappedErrors = {};

  if (apiErrors && typeof apiErrors === "object" && !Array.isArray(apiErrors)) {
    Object.entries(apiErrors).forEach(([key, value]) => {
      const mappedField = mapApiFieldKeyToAssetField(key);
      const message = flattenErrorMessages(value)[0];

      if (mappedField && message && !mappedErrors[mappedField]) {
        mappedErrors[mappedField] = message;
      }
    });
  }

  const fallbackMessages = flattenErrorMessages(error?.response?.data);

  fallbackMessages.forEach((message) => {
    const normalizedMessage = String(message).toLowerCase();

    if (!mappedErrors.serial && /serial|duplicate|already exists/.test(normalizedMessage)) {
      mappedErrors.serial = String(message);
    }

    if (!mappedErrors.assigned && /employee|assigned/.test(normalizedMessage)) {
      mappedErrors.assigned = String(message);
    }

    if (!mappedErrors.name && /asset name|name/.test(normalizedMessage)) {
      mappedErrors.name = String(message);
    }

    if (!mappedErrors.status && /status/.test(normalizedMessage)) {
      mappedErrors.status = String(message);
    }
  });

  return mappedErrors;
};

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [employeeLoadError, setEmployeeLoadError] = useState("");
  const [apiError, setApiError] = useState("");

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ASSETS_PER_PAGE = 30;

  const [previewImages, setPreviewImages] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showRepairPopup, setShowRepairPopup] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  const [newAsset, setNewAsset] = useState(EMPTY_ASSET);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");

  const fetchAssets = async () => {
    try {
      console.log("Fetching assets API...");

      const res = await api.get(API_ENDPOINTS.masters.assets.list);

      console.log("Full API Response:", res);
      console.log("Response Data:", res.data);

      const extractedData = extractCollection(res.data);

      console.log("Extracted Collection:", extractedData);

      const formatted = sortByNewestIdFirst(
        extractedData.map((item, index) => {
          console.log(`Processing Asset ${index + 1}:`, item);

          const employeeCode = formatEmployeeCode(
            item.employeeCode ??
            item.EmployeeCode ??
            item.employeeId ??
            item.EmployeeId ??
            item.assignedTo ??
            item.AssignedTo ??
            ""
          );

          const employeeNameFromApi =
            getAssetEmployeeName(item);
          const employeeFromList =
            employees.find((emp) => {

              const empCode =
                formatEmployeeCode(

                  emp.employee_Id ??
                  emp.employee_id ??
                  emp.employeeId ??
                  emp.EmployeeId ??
                  emp.employeeCode ??
                  emp.EmployeeCode ??
                  emp.empCode ??
                  emp.EmpCode ??
                  emp.code ??
                  emp.Code ??
                  ""

                );

              console.log(
                "EMP CODE CHECK:",
                empCode,
                employeeCode
              );

              return (
                empCode === employeeCode
              );

            });

          console.log(
            "Matched Employee:",
            employeeCode,
            employeeFromList
          );

          const employeeName =
            employees.find((emp) => {

              const empCode =
                formatEmployeeCode(

                  emp.employee_Id ??
                  emp.employee_id ??
                  emp.employeeId ??
                  emp.EmployeeId ??
                  emp.employeeCode ??
                  emp.EmployeeCode ??
                  emp.empCode ??
                  emp.EmpCode ??
                  emp.code ??
                  emp.Code ??
                  ""

                );

              return empCode === employeeCode;

            })?.employeeName ||

            employees.find((emp) => {

              const empCode =
                formatEmployeeCode(

                  emp.employee_Id ??
                  emp.employee_id ??
                  emp.employeeId ??
                  emp.EmployeeId ??
                  emp.employeeCode ??
                  emp.EmployeeCode ??
                  emp.empCode ??
                  emp.EmpCode ??
                  emp.code ??
                  emp.Code ??
                  ""

                );

              return empCode === employeeCode;

            })?.employee_Name ||

            employees.find((emp) => {

              const empCode =
                formatEmployeeCode(

                  emp.employee_Id ??
                  emp.employee_id ??
                  emp.employeeId ??
                  emp.EmployeeId ??
                  emp.employeeCode ??
                  emp.EmployeeCode ??
                  emp.empCode ??
                  emp.EmpCode ??
                  emp.code ??
                  emp.Code ??
                  ""

                );

              return empCode === employeeCode;

            })?.name ||

            "";

          const formattedAsset = {
            assetId:
              item.assetId ??
              item.AssetId ??
              item.assetID ??
              item.id ??
              item.Id ??
              null,

            assetName: normalizeText(item.assetName ?? item.AssetName ?? ""),

            serialNo: normalizeText(item.serialNo ?? item.SerialNo ?? ""),

            assignedTo: employeeCode,

            employeeName,

            employeeDisplay: formatAssetAssigneeLabel(
              employeeName,
              employeeCode
            ),

            status: normalizeText(item.status ?? item.Status ?? ""),
            description: normalizeText(
              item.description ??
              item.Description ??
              ""
            ),

            images: normalizeImagePaths(
              item.imagePaths ??
              item.ImagePaths ??
              item.imagePath ??
              item.ImagePath ??
              item.images ??
              item.Images
            ),
          };

          console.log("Formatted Asset:", formattedAsset);

          return formattedAsset;
        }),
        (item) => item.assetId
      );

      console.log("Final Formatted Assets:", formatted);

      setAssets(formatted);
    } catch (err) {
      console.error("Error fetching assets:", err);

      if (err.response) {
        console.error("Error Response Data:", err.response.data);
        console.error("Error Response Status:", err.response.status);
        console.error("Error Response Headers:", err.response.headers);
      }

      toast.error("Failed to load assets.");
    }
  };

  const fetchEmployees = async () => {
    try {
      setEmployeeLoadError("");

      const res = await api.get(API_ENDPOINTS.employees.list);
      const employeeList = extractCollection(res.data);

      employeeList.forEach((emp, index) => {

        console.log(
          `Employee ${index + 1}:`,
          emp
        );

      });

      setEmployees(employeeList);

      return employeeList;
    } catch (error) {
      console.error("Error fetching employees for asset assignment:", error);
      setEmployeeLoadError(
        "Unable to load employee codes. Refresh the page and try again."
      );
      toast.error("Failed to load employee codes for asset assignment.");
    } finally {
      setEmployeesLoaded(true);
    }
  };

  useEffect(() => {

    fetchEmployees();

  }, []);

  useEffect(() => {

    if (employees.length > 0) {

      fetchAssets();

    }

  }, [employees]);

  const employeeOptions = useMemo(() => {
    const uniqueEmployees = new Map();

    employees.forEach((employee) => {
      const code = getEmployeeCodeFromRecord(employee);
      const name = getEmployeeNameFromRecord(employee);

      if (!code) {
        return;
      }

      uniqueEmployees.set(code.toLowerCase(), {
        code,
        name,
        label: formatAssetAssigneeLabel(name, code),
      });
    });

    return Array.from(uniqueEmployees.values()).sort((left, right) =>
      left.code.localeCompare(right.code, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [employees]);

  const employeeCodeLookup = useMemo(
    () =>
      new Map(
        employeeOptions.map((employee) => [employee.code.toLowerCase(), employee])
      ),
    [employeeOptions]
  );

  const matchedAssignedEmployee = useMemo(() => {

    const normalizedCode =
      formatEmployeeCode(
        String(newAsset.assigned || "")
          .split("-")[0]
          .trim()
      ).toLowerCase();

    return normalizedCode
      ? employeeCodeLookup.get(normalizedCode) ?? null
      : null;

  }, [
    employeeCodeLookup,
    newAsset.assigned
  ]);

  const validateField = (name, draft = newAsset) => {
    const value = String(draft[name] ?? "").trim();

    if (name === "name") {
      if (!value) return "Asset Name is required";

      if (value.length > 25) {
        return "Asset Name must not exceed 25 characters";
      }

      if (!/^[A-Za-z0-9 ]+$/.test(value)) {
        return "Special characters are not allowed";
      }

      return "";
    }

    if (name === "serial") {

      if (!value) {
        return "Serial Number is required";
      }

      if (value.length > 20) {
        return "Serial Number must not exceed 20 characters";
      }

      // no spaces and no special characters
      if (!/^[A-Za-z0-9]+$/.test(value)) {
        return "Spaces and special characters are not allowed";
      }

      const duplicate = assets.find(
        (asset) =>
          asset.serialNo?.toLowerCase() === value.toLowerCase() &&
          asset.assetId !== editId
      );

      if (duplicate) return "Serial Number already exists";

      return "";
    }
    if (name === "assigned") {

      // validation for Assigned and Under Repair
      if (
        draft.status === "Assigned" ||
        draft.status === "Under Repair"
      ) {

        if (!value) {
          return "Employee Code is required";
        }

        if (value.length > 10) {
          return "Employee Code must not exceed 10 characters";
        }

        if (!/^[A-Za-z0-9 ]+$/.test(value)) {
          return "Special characters are not allowed";
        }

        return "";
      }

      // no validation only for Available
      return "";
    }


    if (name === "status") {
      if (!value) return "Status is required";

      return ASSET_STATUS_OPTIONS.includes(value)
        ? ""
        : "Select a valid status";
    }

    return "";
  };

  const validateForm = (draft = newAsset) => {
    const nextErrors = {
      name: validateField("name", draft),
      serial: validateField("serial", draft),
      assigned: validateField("assigned", draft),
      status: validateField("status", draft),
    };

    if (
      draft.status === "Under Repair" &&
      previewImages.length === 0 &&
      draft.images.length === 0
    ) {

      nextErrors.images =
        "Image is required for Under Repair assets";

    }

    if (
      draft.status === "Under Repair" &&
      !draft.description?.trim()
    ) {

      nextErrors.description =
        "Description is required for Under Repair assets";

    }

    const cleanedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, value]) => value)
    );

    setErrors(cleanedErrors);
    return Object.keys(cleanedErrors).length === 0;
  };

  useEffect(() => {
    if (newAsset.status !== "Assigned") {
      return;
    }

    const assignedError = validateField("assigned", newAsset);

    setErrors((prev) => {
      if (!assignedError && !prev.assigned) {
        return prev;
      }

      if (!assignedError) {
        const { assigned, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        assigned: assignedError,
      };
    });
  }, [
    employeeCodeLookup,
    employeeLoadError,
    employeeOptions.length,
    employeesLoaded,
    newAsset,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    let sanitizedValue = value.replace(/^\s+/g, "");

    // remove special characters
    // remove special characters
    if (name === "serial") {

      // remove spaces + special chars
      sanitizedValue =
        sanitizedValue.replace(/[^A-Za-z0-9]/g, "");

    } else {

      sanitizedValue =
        sanitizedValue.replace(/[^A-Za-z0-9 ]/g, "");

    }

    // max lengths
    if (name === "name") {
      sanitizedValue = sanitizedValue.slice(0, 25);
    }

    if (name === "serial") {
      sanitizedValue = sanitizedValue.slice(0, 20);
    }

    if (name === "assigned") {
      sanitizedValue = sanitizedValue.slice(0, 10);
    }

    const draft = {
      ...newAsset,
      [name]:
        name === "assigned"
          ? formatEmployeeCode(sanitizedValue)
          : sanitizedValue,
    };

    if (
      name === "status" &&
      value === "Available"
    ) {

      draft.assigned = "";

    }

    if (
      name === "status" &&
      value === "Under Repair"
    ) {

      setShowRepairPopup(true);

    }

    setNewAsset(draft);
    setApiError("");

    setErrors((prev) => {
      const nextErrors = {
        ...prev,
        [name]: validateField(name, draft),
      };

      if (name === "status") {
        nextErrors.assigned = validateField("assigned", draft);
      }

      return Object.fromEntries(
        Object.entries(nextErrors).filter(([, error]) => error)
      );
    });
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
    const oversizedFile = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);

    if (invalidFile) {
      toast.error("Upload valid image files only: PNG, JPG, WEBP, GIF or SVG.");
      event.target.value = "";
      return;
    }

    if (oversizedFile) {
      toast.error(
        `"${oversizedFile.name}" is larger than 5 MB. Upload a smaller image.`
      );
      event.target.value = "";
      return;
    }

    previewImages.forEach((image) => {
      if (String(image).startsWith("blob:")) {
        URL.revokeObjectURL(image);
      }
    });

    setNewAsset((prev) => ({
      ...prev,
      images: files,
    }));
    setApiError("");

    const previews = files.map((file) => URL.createObjectURL(file));
    setPreviewImages(previews);
  };

  const handleSubmit = async () => {
    if (saving) {
      return;
    }

    const trimmedAsset = {
      ...newAsset,
      name: newAsset.name.trim().replace(/\s+/g, " "),
      serial: newAsset.serial.trim(),
      assigned: formatEmployeeCode(newAsset.assigned),
      status: newAsset.status.trim(),
    };

    setNewAsset(trimmedAsset);
    setApiError("");

    if (!validateForm(trimmedAsset)) {
      toast.error("Please correct the highlighted asset fields.");
      return;
    }

    try {
      setSaving(true);

      const normalizedAssignedCode =
        trimmedAsset.status === "Assigned" ||
          trimmedAsset.status === "Under Repair"
          ? matchedAssignedEmployee?.code || trimmedAsset.assigned
          : "";

      if (
        (trimmedAsset.status === "Assigned" ||
          trimmedAsset.status === "Under Repair") &&
        (!normalizedAssignedCode ||
          !employeeCodeLookup.has(normalizedAssignedCode.toLowerCase()))
      ) {
        const employeeError =
          validateField("assigned", {
            ...trimmedAsset,
            assigned: normalizedAssignedCode,
          }) || "Enter a valid employee code from the employee list";

        setErrors((prev) => ({
          ...prev,
          assigned: employeeError,
        }));
        toast.error(employeeError);
        return;
      }

      const formData = new FormData();
      if (editId !== null && editId !== undefined) {
        formData.append("AssetId", String(editId));
        formData.append("Id", String(editId));
      }

      formData.append("AssetName", trimmedAsset.name);
      formData.append("SerialNo", trimmedAsset.serial);
      formData.append("Status", trimmedAsset.status);
      formData.append(
        "Description",
        trimmedAsset.description || ""
      );

      if (
        trimmedAsset.status === "Assigned" ||
        trimmedAsset.status === "Under Repair"
      ) {
        formData.append("AssignedTo", normalizedAssignedCode);
        formData.append("EmployeeCode", normalizedAssignedCode);

        if (matchedAssignedEmployee?.name) {
          formData.append("EmployeeName", matchedAssignedEmployee.name);
        }
      }

      const existingImagePaths = previewImages.filter(
        (image) => typeof image === "string" && image && !image.startsWith("blob:")
      );

      existingImagePaths.forEach((imagePath) => {
        formData.append("ExistingImagePaths", imagePath);
      });

      if (existingImagePaths.length > 0) {
        formData.append("ExistingImagePathsJson", JSON.stringify(existingImagePaths));
      }

      trimmedAsset.images
        .filter((image) => image instanceof File)
        .forEach((image) => {
          formData.append("Images", image, image.name);
        });

      const requestEntries = Array.from(formData.entries()).map(([key, value]) => [
        key,
        value instanceof File
          ? {
            name: value.name,
            type: value.type,
            size: value.size,
          }
          : value,
      ]);

      console.log("Asset save request payload:", requestEntries);

      if (editId) {
        await api.put(API_ENDPOINTS.masters.assets.byId(editId), formData);
      } else {
        await api.post(API_ENDPOINTS.masters.assets.list, formData);
      }

      toast.success(editId ? "Asset updated successfully." : "Asset saved successfully.");
      closeForm();
      await fetchAssets();
    } catch (error) {
      console.error("Error saving asset:", error);
      console.error("Asset save error response:", error?.response?.data);
      console.error("Asset save error status:", error?.response?.status);
      console.error("Asset save error headers:", error?.response?.headers);

      const backendDetails = extractApiErrorDetails(error);
      const fieldErrors = getAssetFieldErrorsFromApiError(error);
      const backendMessage = backendDetails.message;

      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({
          ...prev,
          ...fieldErrors,
        }));
      }

      setApiError(backendMessage);
      toast.error(backendMessage || "Unable to save asset.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (asset) => {
    setEditId(asset.assetId);
    setErrors({});
    setApiError("");
    setNewAsset({
      name: asset.assetName,
      serial: asset.serialNo,
      assigned: asset.assignedTo,
      status: asset.status,
      description: asset.description || "",
      images: [],
    });

    setPreviewImages(asset.images || []);
    setShowForm(true);
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;

    try {
      await api.delete(API_ENDPOINTS.masters.assets.byId(assetToDelete.assetId));
      toast.success("Asset deleted successfully.");
      setShowDeletePopup(false);
      setAssetToDelete(null);
      await fetchAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Unable to delete asset.");
    }
  };

  const closeForm = () => {
    if (saving) return;

    previewImages.forEach((image) => {
      if (String(image).startsWith("blob:")) {
        URL.revokeObjectURL(image);
      }
    });

    setShowForm(false);
    setEditId(null);
    setErrors({});
    setApiError("");
    setPreviewImages([]);
    setNewAsset(EMPTY_ASSET);
  };

  const filteredAssets = assets.filter((asset) => {

    const search =
      searchTerm.toLowerCase();

    const matchesSearch =
      asset.employeeName?.toLowerCase().includes(search) ||
      asset.assignedTo?.toLowerCase().includes(search);

    const matchesStatus =
      !statusFilter ||
      asset.status === statusFilter;

    const matchesAsset =
      asset.assetName
        ?.toLowerCase()
        .includes(assetFilter.toLowerCase());

    return (
      matchesSearch &&
      matchesStatus &&
      matchesAsset
    );

  });
  const indexOfLast = currentPage * ASSETS_PER_PAGE;
  const indexOfFirst = indexOfLast - ASSETS_PER_PAGE;
  const currentAssets =
    filteredAssets.slice(
      indexOfFirst,
      indexOfLast
    );
  const totalPages =
    Math.max(1, Math.ceil(filteredAssets.length / ASSETS_PER_PAGE));

  const imagePreviewItems = useMemo(() => previewImages, [previewImages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, assetFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    return () => {
      previewImages.forEach((image) => {
        if (String(image).startsWith("blob:")) {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, [previewImages]);

  return (
    <div className="assets-page">
      <ToastContainer position="top-right" autoClose={2400} />

      <div className="assets-header">
        <div className="assets-header-copy">
          <h2>Asset Management</h2>
          <p>Track and manage company assets</p>
        </div>

        <button
          className="assets-add-btn app-button-primary"
          type="button"
          onClick={() => {
            setEditId(null);
            setErrors({});
            setApiError("");
            setPreviewImages([]);
            setNewAsset(EMPTY_ASSET);
            setShowForm(true);
          }}
        >
          + Add Asset
        </button>
      </div>
      <div className="assets-toolbar">

        {/* SEARCH */}

        <div className="assets-toolbar-search">

          <input
            type="text"
            placeholder="Search employee name or ID..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            className="assets-toolbar-input app-input"
          />

          {/* <span
            style={{
              position: "absolute",
              left: "18px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px",
              color: "var(--text-muted)",
            }}
          >
            ðŸ”
          </span> */}

        </div>

        {/* STATUS FILTER */}

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          className="assets-toolbar-select app-select"
        >
          <option value="">All Status</option>
          <option value="Assigned">Assigned</option>
          <option value="Available">Available</option>
          <option value="Under Repair">Under Repair</option>
        </select>

        {/* ASSET FILTER */}

        <input
          type="text"
          placeholder="Filter asset name..."
          value={assetFilter}
          onChange={(e) =>
            setAssetFilter(e.target.value)
          }
          className="assets-toolbar-input assets-toolbar-input--compact app-input"
        />

        {/* RESET BUTTON */}

        <button
          type="button"
          className="reset-btn app-button-secondary"
          onClick={() => {
            setSearchTerm("");
            setStatusFilter("");
            setAssetFilter("");
          }}
        >
          Reset
        </button>

      </div>
      <div className="assets-table-wrap app-table-scroll">
        <table className="assets-table">
          <thead>
            <tr>
              <th className="assets-col-employee">Employee Name (Code)</th>
              <th className="assets-col-serial">Serial Number</th>
              <th className="assets-col-asset">Asset Name</th>
              <th className="assets-col-image">Image</th>
              <th className="assets-col-status">Status</th>
              <th className="assets-col-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {currentAssets.length > 0 ? (
              currentAssets.map((asset) => (
                <tr key={asset.assetId ?? asset.serialNo}>
                  <td className="assets-col-employee">

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: "2px",
                        lineHeight: "1.2",
                      }}
                    >

                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--text-strong)",
                          maxWidth: "260px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                        title={asset.employeeName || "-"}
                      >
                        {asset.employeeName || "-"}
                      </span>

                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          fontWeight: "500",
                        }}
                        title={asset.assignedTo || "-"}
                      >
                        {asset.assignedTo || "-"}
                      </span>

                    </div>

                  </td>

                  <td className="assets-col-serial">
                    <span className="asset-cell-text" title={asset.serialNo || "-"}>
                      {asset.serialNo || "-"}
                    </span>
                  </td>

                  <td className="assets-col-asset">
                    <span className="asset-cell-text asset-name-text" title={asset.assetName || "-"}>
                      {asset.assetName || "-"}
                    </span>
                  </td>

                  <td className="assets-col-image">
                    {asset.images && asset.images.length > 0 ? (
                      <button
                        className="assets-view-images-btn"
                        type="button"
                        onClick={() => {

                          setSelectedImages({
                            images: asset.images,
                            description: asset.description || "",
                          });

                          setShowImageModal(true);

                        }}
                      >
                        View Images ({asset.images.length})
                      </button>
                    ) : (
                      <span className="asset-empty-image">No Image</span>
                    )}
                  </td>

                  <td className="assets-col-status">
                    <span
                      className={
                        asset.status === "Assigned"
                          ? "asset-status-badge asset-status-badge--assigned"
                          : asset.status === "Available"
                            ? "asset-status-badge asset-status-badge--available"
                            : "asset-status-badge asset-status-badge--repair"
                      }
                    >
                      {asset.status || "-"}
                    </span>
                  </td>

                  <td className="assets-col-actions assets-action-cell">
                    <div className="assets-action-buttons">
                      <button
                        className="assets-edit-btn app-action-button app-action-button--edit"
                        type="button"
                        onClick={() => handleEdit(asset)}
                      >
                        Edit
                      </button>

                      <button
                        className="assets-delete-btn app-action-button app-action-button--delete"
                        type="button"
                        onClick={() => {
                          setAssetToDelete(asset);
                          setShowDeletePopup(true);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="app-table-empty-cell">
                  No assets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredAssets.length > 0 && (
        <AppPagination
          totalItems={filteredAssets.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemLabel="assets"
        />
      )}

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editId ? "Edit Asset" : "Add Asset"}</h3>

            {apiError && <p className="asset-submit-error">{apiError}</p>}

            {/* EMPLOYEE CODE */}

            <div className="asset-field-group">
              <label htmlFor="asset-assigned-input">Employee Code or Name</label>

              <input
                id="asset-assigned-input"
                type="text"
                name="assigned"
                value={newAsset.assigned}
                onChange={handleChange}
                className={errors.assigned ? "has-error" : ""}
                disabled={newAsset.status === "Available"}
                list="asset-employee-options"
              />

              <datalist id="asset-employee-options">
                {employeeOptions.map((employee) => (
                  <option
                    key={employee.code}
                    value={employee.code}
                    label={employee.name || employee.code}
                  />
                ))}
              </datalist>

              {(newAsset.status === "Assigned" ||
                newAsset.status === "Under Repair") &&
                matchedAssignedEmployee?.name && (
                  <p
                    className="asset-helper"
                    style={{
                      fontWeight: "400",
                    }}
                  >
                    Assigning this asset to{" "}
                    <span
                      style={{
                        fontWeight: "700",
                        color: "var(--text-strong)",
                        display: "inline-block",
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        verticalAlign: "bottom",
                      }}
                      title={matchedAssignedEmployee.name}
                    >
                      {matchedAssignedEmployee.name}
                    </span>
                  </p>
                )}

              {(newAsset.status === "Assigned" ||
                newAsset.status === "Under Repair") &&
                !matchedAssignedEmployee &&
                employeeLoadError && (
                  <p className="asset-helper asset-helper--warning">
                    {employeeLoadError}
                  </p>
                )}

              {errors.assigned && (
                <p className="asset-error">
                  {errors.assigned}
                </p>
              )}
            </div>

            {/* ASSET NAME */}

            <div className="asset-field-group">
              <label htmlFor="asset-name-input">Asset Name</label>

              <input
                id="asset-name-input"
                type="text"
                name="name"
                value={newAsset.name}
                onChange={handleChange}
                className={errors.name ? "has-error" : ""}
              />

              {errors.name && (
                <p className="asset-error">
                  {errors.name}
                </p>
              )}
            </div>

            {/* SERIAL NUMBER */}

            <div className="asset-field-group">
              <label htmlFor="asset-serial-input">Serial Number</label>

              <input
                id="asset-serial-input"
                type="text"
                name="serial"
                value={newAsset.serial}
                onChange={handleChange}
                className={errors.serial ? "has-error" : ""}
              />

              {errors.serial && (
                <p className="asset-error">
                  {errors.serial}
                </p>
              )}
            </div>

            {/* STATUS */}

            <div className="asset-field-group">
              <label htmlFor="asset-status-select">Status</label>

              <select
                id="asset-status-select"
                name="status"
                value={newAsset.status}
                onChange={handleChange}
              >
                {ASSET_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {errors.status && (
                <p className="asset-error">
                  {errors.status}
                </p>
              )}
            </div>

            {/* IMAGES */}

            {/* IMAGES */}

            {/* IMAGES */}

            <div className="asset-field-group">

              <label htmlFor="asset-image-input">

                Images

                {newAsset.status === "Under Repair" && (
                  <span
                    style={{
                      color: "red",
                      marginLeft: "4px",
                    }}
                  >
                    *
                  </span>
                )}

              </label>

              <input
                id="asset-image-input"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
                multiple
                onChange={handleImageChange}
              />

              {errors.images && (
                <p className="asset-error">
                  {errors.images}
                </p>
              )}

            </div>

            <div className="image-preview">
              {imagePreviewItems.map((image, index) =>
                image ? (
                  <img
                    key={index}
                    src={typeof image === "string" ? buildServerUrl(image) : image}
                    alt="preview"
                    style={{ width: "60px", marginRight: "6px" }}
                  />
                ) : null
              )}
            </div>

            {/* UNDER REPAIR DESCRIPTION */}

            {newAsset.status === "Under Repair" && (
              <div className="asset-field-group">

                <label>
                  Repair Description
                </label>

                <textarea
                  name="description"
                  value={newAsset.description || ""}
                  onChange={(e) =>
                    setNewAsset((prev) => ({
                      ...prev,
                      description: e.target.value
                        .replace(/^\s+/g, "")
                        .slice(0, 250),
                    }))
                  }
                  placeholder="Enter repair issue description"
                  rows={4}
                  style={{
                    resize: "none",
                  }}
                />

                {errors.description && (
                  <p className="asset-error">
                    {errors.description}
                  </p>
                )}

              </div>
            )}

            <div className="asset-modal-actions">
              <button
                type="button"
                className="asset-delete-cancel-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="asset-update-btn"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (editId ? "Updating..." : "Saving...") : editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRepairPopup && (
        <div className="asset-delete-overlay">

          <div className="asset-delete-modal">

            <h3>
              Under Repair Asset
            </h3>

            <p
              style={{
                margin: "14px 0",
              }}
            >
              Please upload image and add
              repair description.
            </p>

            <div
              className="asset-delete-actions"
            >

              <button
                type="button"
                className="asset-delete-cancel-btn"
                onClick={() =>
                  setShowRepairPopup(false)
                }
              >
                OK
              </button>

            </div>

          </div>

        </div>
      )}

      {showDeletePopup && (
        <div className="asset-delete-overlay">
          <div className="asset-delete-modal">
            <h3>Confirm Delete</h3>

            <p style={{ margin: "15px 0" }}>
              Are you sure you want to delete this asset?
            </p>

            <div className="asset-delete-actions">
              <button
                onClick={() => setShowDeletePopup(false)}
                className="asset-delete-cancel-btn"
                type="button"
              >
                Cancel
              </button>

              <button className="asset-delete-btn" type="button" onClick={confirmDeleteAsset}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="image-modal-overlay">
          <div className="image-modal">
            <h3>Asset Images</h3>
            {selectedImages?.description && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  background: "var(--bg-muted)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  color: "var(--text-body)",
                  lineHeight: "1.5",
                }}
              >
                <strong>Description:</strong>{" "}
                {selectedImages.description}
              </div>
            )}

            <div className="image-grid">
              {selectedImages?.images?.map((image, index) => (
                <a
                  key={index}
                  href={buildServerUrl(image)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={buildServerUrl(image)}
                    alt="asset"
                    style={{ cursor: "pointer" }}
                  />
                </a>
              ))}
            </div>

            <button
              className="close-image-btn"
              type="button"
              onClick={() => setShowImageModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
