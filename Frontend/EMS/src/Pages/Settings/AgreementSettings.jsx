import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaCloudUploadAlt,
  FaSpinner,
} from "react-icons/fa";
import { toastSuccess, toastError } from "@/components/common/toast/toastService";
import "../../Employees/AddEmployee/AddEmployee.css";
import AppDatePicker from "../../components/AppDatePicker";
import {
  getAgreementTypes,
  uploadAgreement,
} from "../../services/agreementService";
import { toBoolean } from "../../utils/boolean";
import { getInputDateValue, getTodayInputValue } from "../../utils/date";
import {
  SettingsBanner,
  SettingsCard,
  SettingsField,
} from "./SettingsShared";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const toText = (value, fallback = "") => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || fallback;
};

const normalizeAgreement = (agreement = {}) => {
  const agreementCode = toText(
    agreement.agreementCode ??
    agreement.AgreementCode ??
    agreement.code ??
    agreement.Code
  );
  const agreementName = toText(
    agreement.agreementName ??
    agreement.AgreementName ??
    agreement.name ??
    agreement.Name,
    agreementCode || "Agreement"
  );

  return {
    ...agreement,
    agreementId:
      agreement.agreementId ??
      agreement.AgreementId ??
      agreement.id ??
      agreement.Id ??
      agreementCode,
    agreementName,
    agreementCode,
    description: toText(agreement.description ?? agreement.Description),
    isMandatory: toBoolean(
      agreement.isMandatory ??
      agreement.IsMandatory ??
      agreement.mandatory ??
      agreement.Mandatory,
      false,
      { trueValues: ["mandatory"] }
    ),
    assignToExistingEmployees: toBoolean(
      agreement.assignToExistingEmployees ??
      agreement.AssignToExistingEmployees ??
      agreement.assignedToExistingEmployees
    ),
    createdDate:
      agreement.createdDate ??
      agreement.CreatedDate ??
      agreement.createdAt ??
      agreement.CreatedAt ??
      "",
  };
};

function AgreementSettings({ disabled }) {
  const [agreements, setAgreements] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [customAgreementName, setCustomAgreementName] = useState("");
  const [customAgreementCode, setCustomAgreementCode] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customMandatory, setCustomMandatory] = useState(false);
  const [customAssignExisting, setCustomAssignExisting] = useState(false);
  const [createdDate, setCreatedDate] = useState(getTodayInputValue());
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef(null);

  const selectedAgreement = useMemo(
    () =>
      agreements.find((agreement) => agreement.agreementCode === selectedCode) ||
      null,
    [agreements, selectedCode]
  );

  const loadAgreements = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const result = await getAgreementTypes();
      const nextAgreements = result.map((agreement) =>
        normalizeAgreement(agreement)
      );

      setAgreements(nextAgreements);
      setSelectedCode((currentCode) =>
        nextAgreements.some(
          (agreement) => agreement.agreementCode === currentCode
        )
          ? currentCode
          : ""
      );
    } catch (error) {
      const message =
        error?.response?.data?.message || "We could not load agreements.";

      setLoadError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  useEffect(() => {
    if (selectedAgreement?.createdDate) {
      setCreatedDate(getInputDateValue(selectedAgreement.createdDate));
      return;
    }

    setCreatedDate(getTodayInputValue());
  }, [selectedCode, selectedAgreement]);

  const isOtherAgreement = selectedCode === "__other__";

  const resetFileInput = () => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setSelectedCode("");
    setCustomAgreementName("");
    setCustomAgreementCode("");
    setCustomDescription("");
    setCustomMandatory(false);
    setCustomAssignExisting(false);
    setCreatedDate(getTodayInputValue());
    resetFileInput();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toastError("File size should be less than 10MB");
      resetFileInput();
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    const agreementName = isOtherAgreement
      ? customAgreementName.trim()
      : selectedAgreement?.agreementName || "";
    const agreementCode = isOtherAgreement
      ? customAgreementCode.trim()
      : selectedAgreement?.agreementCode || "";
    const description = isOtherAgreement
      ? customDescription.trim()
      : selectedAgreement?.description || "";
    const isMandatory = isOtherAgreement
      ? customMandatory
      : Boolean(selectedAgreement?.isMandatory);
    const assignExisting = isOtherAgreement
      ? customAssignExisting
      : Boolean(selectedAgreement?.assignToExistingEmployees);

    if (!selectedAgreement && !isOtherAgreement) {
      toastError("Please select an agreement type.");
      return;
    }

    if (!agreementName) {
      toastError("Please enter agreement type name.");
      return;
    }

    if (!agreementCode) {
      toastError("Please enter agreement code.");
      return;
    }

    if (!createdDate) {
      toastError("Please select created date.");
      return;
    }

    if (!selectedFile) {
      toastError("Please choose a file.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("AgreementCode", agreementCode);
      formData.append("AgreementName", agreementName);
      formData.append("Description", description);
      formData.append("IsMandatory", String(isMandatory));
      formData.append("AssignToExistingEmployees", String(assignExisting));
      formData.append("CreatedDate", createdDate);
      formData.append("File", selectedFile);

      await uploadAgreement(formData);
      toastSuccess("Agreement Uploaded Successfully");
      resetForm();
      await loadAgreements();
    } catch (error) {
      toastError(error?.response?.data?.message || "Agreement upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const controlsDisabled = disabled || loading || uploading;
  const agreementCode = isOtherAgreement
    ? customAgreementCode
    : selectedAgreement?.agreementCode || "";
  const agreementDescription = isOtherAgreement
    ? customDescription
    : selectedAgreement?.description || "";
  const isMandatory = isOtherAgreement
    ? customMandatory
    : Boolean(selectedAgreement?.isMandatory);
  const assignExisting = isOtherAgreement
    ? customAssignExisting
    : Boolean(selectedAgreement?.assignToExistingEmployees);

  return (
    <div className="settings-tab-panel">
      <SettingsCard
        title="Agreement Settings"
        description="Manage employee agreements and compliance documents."
      >
        {loadError && (
          <SettingsBanner
            title="Agreement refresh issue"
            message={loadError}
            tone="error"
          />
        )}

        <div className="settings-card agreement-settings-card-inner">
          <div className="settings-card-header settings-header settings-card-head">
            <div className="settings-card-copy">
              <h3 className="settings-card-title">Employee Agreements</h3>
            </div>
          </div>

          {loading ? (
            <div className="document-preview-loading">
              <FaSpinner className="documents-button-spinner" />
              Loading agreements...
            </div>
          ) : (
            <>
              <div className="settings-form-grid settings-grid-2">
                <SettingsField label="Agreement Type">
                  <select
                    className="settings-select"
                    value={selectedCode}
                    onChange={(event) => setSelectedCode(event.target.value)}
                    disabled={controlsDisabled}
                  >
                    <option value="">Select Agreement Type</option>
                    {agreements.map((agreement) => (
                      <option
                        key={agreement.agreementId || agreement.agreementCode}
                        value={agreement.agreementCode}
                      >
                        {agreement.agreementName}
                      </option>
                    ))}
                    <option value="__other__">Other</option>
                  </select>
                </SettingsField>

                {isOtherAgreement && (
                  <SettingsField label="Agreement Type Name">
                    <input
                      className="settings-input"
                      value={customAgreementName}
                      onChange={(event) =>
                        setCustomAgreementName(event.target.value)
                      }
                      disabled={controlsDisabled}
                      placeholder="Agreement Type Name"
                    />
                  </SettingsField>
                )}

                <SettingsField label="Agreement Code">
                  <input
                    className="settings-input"
                    value={agreementCode}
                    onChange={(event) =>
                      setCustomAgreementCode(event.target.value)
                    }
                    readOnly={!isOtherAgreement}
                    disabled={controlsDisabled && isOtherAgreement}
                    placeholder="Agreement Code"
                  />
                </SettingsField>

                <SettingsField label="Description" className="settings-field--full">
                  <textarea
                    className="settings-textarea"
                    value={agreementDescription}
                    onChange={(event) =>
                      setCustomDescription(event.target.value)
                    }
                    readOnly={!isOtherAgreement}
                    disabled={controlsDisabled && isOtherAgreement}
                    placeholder="Description"
                  />
                </SettingsField>

                <SettingsField label="Mandatory">
                  {isOtherAgreement ? (
                    <label className="settings-checkbox-row">
                      <input
                        type="checkbox"
                        checked={customMandatory}
                        onChange={(event) =>
                          setCustomMandatory(event.target.checked)
                        }
                        disabled={controlsDisabled}
                      />
                      <span>Mandatory</span>
                    </label>
                  ) : (
                    <input
                      className="settings-input"
                      value={selectedAgreement ? (isMandatory ? "Yes" : "No") : ""}
                      readOnly
                      placeholder="Mandatory"
                    />
                  )}
                </SettingsField>

                <SettingsField label="Assign Existing Employees">
                  {isOtherAgreement ? (
                    <label className="settings-checkbox-row">
                      <input
                        type="checkbox"
                        checked={customAssignExisting}
                        onChange={(event) =>
                          setCustomAssignExisting(event.target.checked)
                        }
                        disabled={controlsDisabled}
                      />
                      <span>Assign Existing Employees</span>
                    </label>
                  ) : (
                    <input
                      className="settings-input"
                      value={
                        selectedAgreement
                          ? assignExisting
                            ? "Yes"
                            : "No"
                          : ""
                      }
                      readOnly
                      placeholder="Assign Existing Employees"
                    />
                  )}
                </SettingsField>

                <SettingsField label="Created Date">
                  <AppDatePicker
                    name="createdDate"
                    value={createdDate}
                    onChange={(event) => setCreatedDate(event.target.value)}
                    disabled={controlsDisabled}
                    placeholder="Created Date"
                  />
                </SettingsField>

                <SettingsField label="Choose File">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="settings-input"
                    onChange={handleFileChange}
                    disabled={controlsDisabled}
                  />
                </SettingsField>
              </div>

              <div className="agreement-settings-actions">
                <button
                  type="button"
                  className="app-button-primary"
                  onClick={handleUpload}
                  disabled={
                    controlsDisabled ||
                    (!selectedAgreement && !isOtherAgreement) ||
                    !selectedFile
                  }
                >
                  {uploading ? (
                    <>
                      <FaSpinner className="documents-button-spinner" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaCloudUploadAlt />
                      Upload Agreement
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}

export default AgreementSettings;
