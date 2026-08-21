import React, { forwardRef, useCallback, useImperativeHandle, useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import {
  normalizeWhitespace,
  toOptionalAmount,
  validateAccountHolderName,
  validateAnnualCTC,
  validateBankAccountNumber,
  validateBranchName,
  validateCustomerId,
  validateIfscCode,
  validateNonNegativeAmount,
  validatePfAccountNumber,
  validateTextValue,
  validateUanNumber
} from "../../utils/validation";

const BankInfo = forwardRef(({ onNext, onBack, employeeId, viewMode, data }, ref) => {
  const [bankName, setBankName] = useState("");
  const [manualBank, setManualBank] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [branch, setBranch] = useState("");
  const [uan, setUan] = useState("");
  const [pf, setPf] = useState("");
  const [annualCTC, setAnnualCTC] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [hra, setHra] = useState("");
  const [conveyanceAllowance, setConveyanceAllowance] = useState("");
  const [medicalAllowance, setMedicalAllowance] = useState("");
  const [specialAllowance, setSpecialAllowance] = useState("");
  const [employeePF, setEmployeePF] = useState("");
  const [employerPF, setEmployerPF] = useState("");
  const [professionalTax, setProfessionalTax] = useState("");
  const [tds, setTds] = useState("");
  const [otherDeduction, setOtherDeduction] = useState("");

  const [salaryExists, setSalaryExists] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [bankErrors, setBankErrors] = useState({});
  const [salaryErrors, setSalaryErrors] = useState({});
  useEffect(() => {
    if (!data) return;

    setCustomerId(data.customer_Id || "");
    setBankName(data.bank_Name || "");
    setManualBank("");
    setAccountHolder(data.account_Holder_Name || "");
    setAccountNumber(data.account_Number || "");
    setIfsc(data.ifsC_Code || "");
    setBranch(data.branch_Name || "");
    setUan(data.uaN_Number || "");
    setPf(data.pF_Account_Number || "");
  }, [data]);

  useImperativeHandle(ref, () => ({
    validate() {
      return validateBankAndSalary();
    },
  }));

  const loadSalary = useCallback(async () => {
    try {
      const res = await api.get(
        API_ENDPOINTS.employeeSalaryStructure.byEmployeeId(employeeId)
      );
      const s = res.data;
      setSalaryExists(true);
      setAnnualCTC(s.annualCTC || "");
      setBasicSalary(s.basicSalary || "");
      setHra(s.hra || "");
      setConveyanceAllowance(s.conveyanceAllowance || "");
      setMedicalAllowance(s.medicalAllowance || "");
      setSpecialAllowance(s.specialAllowance || "");
      setEmployeePF(s.employeePF || "");
      setEmployerPF(s.employerPF || "");
      setProfessionalTax(s.professionalTax || "");
      setTds(s.tds || "");
      setOtherDeduction(s.otherDeduction || "");
    }
    catch {
      setSalaryExists(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    loadSalary();
  }, [employeeId, loadSalary]);

  const handleSalaryInput = (field, value, setter) => {
    value = value.replace(/\s/g, "");
    if (!/^[0-9,]*(?:\.\d{0,2})?$/.test(value)) {
      setSalaryErrors(prev => ({
        ...prev,
        [field]: field === "professionalTax"
          ? "Please enter a valid Professional Tax amount."
          : "Please enter a valid salary amount."
      }));
      return;
    }

    const digits = value.replace(/,/g, "");
    if (digits.length > 10) {
      setSalaryErrors(prev => ({
        ...prev,
        [field]: "Maximum 10 digits allowed"
      }));
      return;
    }
    setSalaryErrors(prev => ({
      ...prev,
      [field]: ""
    }));
    setter(value);
  };

  const sanitizeDigits = (value, maxLength) =>
    String(value || "").replace(/\D/g, "").slice(0, maxLength);

  const sanitizeUpperAlphaNumeric = (value, maxLength) =>
    String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, maxLength);

  const sanitizeAccountHolderInput = (value) =>
    String(value || "")
      .replace(/[^A-Za-z.'-\s]/g, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 80);

  const validateBankField = (field, value) => {
    const validators = {
      customerId: validateCustomerId,
      accountHolder: validateAccountHolderName,
      accountNumber: validateBankAccountNumber,
      ifsc: validateIfscCode,
      branch: validateBranchName,
      uan: validateUanNumber,
      pf: validatePfAccountNumber
    };

    const validator = validators[field];
    if (!validator) return;

    setBankErrors((prev) => ({
      ...prev,
      [field]: validator(value)
    }));
  };

  const setBankValue = (setter, field, value, transform = (input) => input) => {
    setter(transform(value));
    setBankErrors((prev) => ({
      ...prev,
      [field]: ""
    }));
    setApiError("");
    setSuccessMsg("");
  };

  const validateBankAndSalary = () => {
    const finalBankName = bankName === "Other" ? manualBank : bankName;
    const nextBankErrors = {
      customerId: validateCustomerId(customerId),
      bankName: validateTextValue(finalBankName, {
        label: "Bank Name",
        min: 2,
        max: 80,
        required: false
      }),
      accountHolder: validateAccountHolderName(accountHolder),
      accountNumber: validateBankAccountNumber(accountNumber),
      ifsc: validateIfscCode(ifsc),
      branch: validateBranchName(branch),
      uan: validateUanNumber(uan),
      pf: validatePfAccountNumber(pf)
    };

    const salaryValues = {
      annualCTC,
      basicSalary,
      hra,
      conveyanceAllowance,
      medicalAllowance,
      specialAllowance,
      employeePF,
      employerPF,
      professionalTax,
      tds,
      otherDeduction
    };

    const salaryFields = [
      ["basicSalary", basicSalary, "Basic Salary"],
      ["hra", hra, "HRA"],
      ["conveyanceAllowance", conveyanceAllowance, "Conveyance Allowance"],
      ["medicalAllowance", medicalAllowance, "Medical Allowance"],
      ["specialAllowance", specialAllowance, "Special Allowance"],
      ["employeePF", employeePF, "Employee PF"],
      ["employerPF", employerPF, "Employer PF"],
      ["professionalTax", professionalTax, "Professional Tax"],
      ["tds", tds, "TDS"],
      ["otherDeduction", otherDeduction, "Other Deduction"]
    ];
    const nextSalaryErrors = salaryFields.reduce((acc, [field, value, label]) => {
      acc[field] = validateNonNegativeAmount(value, {
        label,
        required: false,
        maxDigits: 10,
        message: field === "professionalTax"
          ? "Please enter a valid Professional Tax amount."
          : `Please enter a valid ${label} amount.`
      });
      return acc;
    }, {});

    nextSalaryErrors.annualCTC = validateAnnualCTC(annualCTC, salaryValues);

    const compactBankErrors = Object.fromEntries(
      Object.entries(nextBankErrors).filter(([, message]) => message)
    );
    const compactSalaryErrors = Object.fromEntries(
      Object.entries(nextSalaryErrors).filter(([, message]) => message)
    );

    setBankErrors(compactBankErrors);
    setSalaryErrors(compactSalaryErrors);

    return (
      Object.keys(compactBankErrors).length === 0 &&
      Object.keys(compactSalaryErrors).length === 0
    );
  };

  const saveSalary = async () => {
    const payload = {
      employee_Id: employeeId,
      annualCTC: toOptionalAmount(annualCTC),
      basicSalary: toOptionalAmount(basicSalary),
      hra: toOptionalAmount(hra),
      conveyanceAllowance: toOptionalAmount(conveyanceAllowance),
      medicalAllowance: toOptionalAmount(medicalAllowance),
      specialAllowance: toOptionalAmount(specialAllowance),
      employeePF: toOptionalAmount(employeePF),
      employerPF: toOptionalAmount(employerPF),
      professionalTax: toOptionalAmount(professionalTax),
      tds: toOptionalAmount(tds),
      otherDeduction: toOptionalAmount(otherDeduction),
      isActive: true
    };

    if (salaryExists) {
      await api.put(
        API_ENDPOINTS.employeeSalaryStructure.update(employeeId),
        payload
      );
      return;
    }

    try {
      await api.post(
        API_ENDPOINTS.employeeSalaryStructure.list,
        payload
      );
      setSalaryExists(true);
    } catch (error) {
      const status = error?.response?.status;
      const message = String(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data ||
        ""
      ).toLowerCase();

      if (status === 400 && message.includes("already")) {
        await api.put(
          API_ENDPOINTS.employeeSalaryStructure.update(employeeId),
          payload
        );
        setSalaryExists(true);
        return;
      }

      throw error;
    }
  };

  const handleSaveNext = async () => {
    if (saving) return;

    setApiError("");
    setSuccessMsg("");

    if (!validateBankAndSalary()) {
      return;
    }

    const finalBankName = bankName === "Other" ? manualBank : bankName;
    setSaving(true);

    try {
      const payload = {
        employee_Id: employeeId,
        customer_Id: normalizeWhitespace(customerId).toUpperCase(),
        bank_Name: normalizeWhitespace(finalBankName),
        account_Holder_Name: normalizeWhitespace(accountHolder),
        account_Number: String(accountNumber || "").trim(),
        ifsC_Code: sanitizeUpperAlphaNumeric(ifsc, 11),
        branch_Name: normalizeWhitespace(branch),
        uaN_Number: String(uan || "").trim(),
        pF_Account_Number: sanitizeUpperAlphaNumeric(pf, 22),
      };

      const response = data
        ? await api.put(
            API_ENDPOINTS.employeeBankDetails.byEmployeeId(employeeId),
            payload,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
        : await api.post(
            API_ENDPOINTS.employeeBankDetails.list,
            payload,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

      // Save Bank Details + Salary Structure with this single button.
      await saveSalary();

      setSuccessMsg(
        data
          ? "Bank details and salary structure updated successfully!"
          : "Bank details and salary structure saved successfully!"
      );

      setTimeout(() => {
        if (onNext) {
          onNext(response?.data?.employeeId || employeeId);
        }
      }, 800);
    } catch (error) {
      setApiError(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to save bank details and salary structure."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-section bank-info-section">
      <h3>Bank Information</h3>

      <div className="form-card bank-info-card">
        <div className="form-grid bank-info-grid">
          <div className="form-group">
            <label>Customer ID</label>
            <input
              value={customerId || ""}
              placeholder="e.g. 965788262"
              inputMode="numeric"
              maxLength={9}
              onChange={(e) =>
                setBankValue(setCustomerId, "customerId", e.target.value, (value) =>
                  sanitizeDigits(value, 9)
                )
              }
              onBlur={(e) => validateBankField("customerId", e.target.value)}
              disabled={viewMode}
            />
            {bankErrors.customerId && <small className="field-error">{bankErrors.customerId}</small>}
          </div>

          <div className="form-group">
            <label>Bank Name</label>
            <select
              value={bankName || ""}
              onChange={(e) => setBankValue(setBankName, "bankName", e.target.value)}
              disabled={viewMode}
            >
              <option value="">Select Bank</option>
              <option>State Bank of India</option>
              <option>HDFC Bank</option>
              <option>ICICI Bank</option>
              <option>Axis Bank</option>
              <option>Kotak Mahindra Bank</option>
              <option>IDFC First Bank</option>
              <option>Canara Bank</option>
              <option>Federal Bank</option>
              <option>Union Bank</option>
              <option value="Other">Others</option>
            </select>
            {bankErrors.bankName && <small className="field-error">{bankErrors.bankName}</small>}
          </div>

          {bankName === "Other" && (
            <div className="form-group full">
              <label>Enter Bank Name</label>
              <input
                value={manualBank || ""}
                onChange={(e) => setBankValue(setManualBank, "bankName", e.target.value)}
                disabled={viewMode}
              />
              {bankErrors.bankName && <small className="field-error">{bankErrors.bankName}</small>}
            </div>
          )}

          <div className="form-group">
            <label>Account Holder Name</label>
            <input
              value={accountHolder || ""}
              placeholder="e.g. Enter name"
              maxLength={80}
              onChange={(e) =>
                setBankValue(setAccountHolder, "accountHolder", e.target.value, sanitizeAccountHolderInput)
              }
              onBlur={(e) => validateBankField("accountHolder", e.target.value)}
              disabled={viewMode}
            />
            {bankErrors.accountHolder && <small className="field-error">{bankErrors.accountHolder}</small>}
          </div>

          <div className="form-group">
            <label>Account Number</label>
            <input
              value={accountNumber || ""}
              placeholder="e.g. 525020099055561"
              inputMode="numeric"
              maxLength={15}
              onChange={(e) =>
                setBankValue(setAccountNumber, "accountNumber", e.target.value, (value) =>
                  sanitizeDigits(value, 15)
                )
              }
              onBlur={(e) => validateBankField("accountNumber", e.target.value)}
              disabled={viewMode}
            />
            {bankErrors.accountNumber && <small className="field-error">{bankErrors.accountNumber}</small>}
          </div>

          <div className="form-group">
            <label>IFSC Code</label>
            <input
              value={ifsc || ""}
              placeholder="e.g. UTIB0000567"
              maxLength={11}
              onChange={(e) =>
                setBankValue(setIfsc, "ifsc", e.target.value, (value) =>
                  sanitizeUpperAlphaNumeric(value, 11)
                )
              }
              onBlur={(e) => validateBankField("ifsc", e.target.value)}
              disabled={viewMode}
            />
            {bankErrors.ifsc && <small className="field-error">{bankErrors.ifsc}</small>}
          </div>

          <div className="form-group">
            <label>Branch Name</label>
            <input
              value={branch || ""}
              placeholder="e.g. colony or area, Hyd"
              maxLength={80}
              onChange={(e) => setBankValue(setBranch, "branch", e.target.value)}
              onBlur={(e) => validateBankField("branch", e.target.value)}
              disabled={viewMode}
            />
            {bankErrors.branch && <small className="field-error">{bankErrors.branch}</small>}
          </div>

          <div className="form-group">
            <label>UAN Number</label>
            <input
              value={uan || ""}
              placeholder="e.g. 603465679678"
              inputMode="numeric"
              maxLength={12}
              onChange={(e) =>
                setBankValue(setUan, "uan", e.target.value, (value) =>
                  sanitizeDigits(value, 12)
                )
              }
              onBlur={(e) => validateBankField("uan", e.target.value)}
              disabled={viewMode}
            />
            {bankErrors.uan && <small className="field-error">{bankErrors.uan}</small>}
          </div>

          <div className="form-group">
            <label>PF Account Number</label>
            <input
              value={pf || ""}
              placeholder="e.g. APKKP54646730000010070"
              maxLength={22}
              onChange={(e) =>
                setBankValue(setPf, "pf", e.target.value, (value) =>
                  sanitizeUpperAlphaNumeric(value, 22)
                )
              }
              onBlur={(e) => validateBankField("pf", e.target.value)}
              disabled={viewMode}
            />
            {bankErrors.pf && <small className="field-error">{bankErrors.pf}</small>}
          </div>
        </div>
      </div>

      <div className="form-card salary-info-card">
        <h3>Salary Structure</h3>
        <p className="salary-subtitle">
          Fill these fields according to your offer letter salary structure.
        </p>

        <div className="form-grid bank-info-grid">

          {/* Employee ID */}
          <div className="form-group">
            <label>Employee ID</label>
            <input
              type="text"
              value={employeeId || ""}
              disabled
            />
          </div>

          {/* Annual CTC */}
          <div className="form-group">
            <label>Annual CTC (Without Variable Pay)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={annualCTC}
              placeholder="e.g. 720000"
              onChange={(e) =>
                handleSalaryInput(
                  "annualCTC",
                  e.target.value,
                  setAnnualCTC
                )
              }
              disabled={viewMode}
            />
            {salaryErrors.annualCTC && (
              <small className="field-error">
                {salaryErrors.annualCTC}
              </small>)}
          </div>

          {/* Basic Salary */}
          <div className="form-group">
            <label>Basic Salary (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 30000"
              value={basicSalary}
              onChange={(e) =>
                handleSalaryInput(
                  "basicSalary",
                  e.target.value,
                  setBasicSalary
                )}
              disabled={viewMode}
            />
            {salaryErrors.basicSalary && (
              <small className="field-error">
                {salaryErrors.basicSalary}
              </small>
            )}
          </div>

          {/* HRA */}
          <div className="form-group">
            <label>HRA (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={hra}
              placeholder="e.g. 12000"
              onChange={(e) =>
                handleSalaryInput(
                  "hra",
                  e.target.value,
                  setHra
                )}
              disabled={viewMode}
            />
            {salaryErrors.hra && (
              <small className="field-error">
                {salaryErrors.hra}
              </small>
            )}
          </div>

          {/* Conveyance Allowance */}
          <div className="form-group">
            <label>Conveyance Allowance (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={conveyanceAllowance}
              placeholder="e.g. 2400"
              onChange={(e) =>
                handleSalaryInput(
                  "conveyanceAllowance",
                  e.target.value,
                  setConveyanceAllowance
                )
              }
              disabled={viewMode}
            />
            {salaryErrors.conveyanceAllowance && (
              <small className="field-error">
                {salaryErrors.conveyanceAllowance}
              </small>
            )}
          </div>

          {/* Medical Allowance */}
          <div className="form-group">
            <label>Medical Allowance (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={medicalAllowance}
              placeholder="e.g. 1500"
              onChange={(e) => handleSalaryInput(
                "medicalAllowance",
                e.target.value,
                setMedicalAllowance
              )}
              disabled={viewMode}
            />
            {salaryErrors.medicalAllowance && (
              <small className="field-error">
                {salaryErrors.medicalAllowance}
              </small>
            )}
          </div>

          {/* Special Allowance */}
          <div className="form-group">
            <label>Special Allowance (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={specialAllowance}
              placeholder="e.g. 5000"
              onChange={(e) => handleSalaryInput(
                "specialAllowance",
                e.target.value,
                setSpecialAllowance
              )}
              disabled={viewMode}
            />
            {salaryErrors.specialAllowance && (
              <small className="field-error">
                {salaryErrors.specialAllowance}
              </small>
            )}
          </div>

          {/* Employee PF */}
          <div className="form-group">
            <label>Employee PF (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={employeePF}
              placeholder="e.g. 1800"
              onChange={(e) => handleSalaryInput(
                "employeePF",
                e.target.value,
                setEmployeePF
              )}
              disabled={viewMode}
            />
            {salaryErrors.employeePF && (
              <small className="field-error">
                {salaryErrors.employeePF}
              </small>
            )}
          </div>

          {/* Employer PF */}
          <div className="form-group">
            <label>Employer PF (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={employerPF}
              placeholder="e.g. 1800"
              onChange={(e) => handleSalaryInput(
                "employerPF",
                e.target.value,
                setEmployerPF
              )}
              disabled={viewMode}
            />
            {salaryErrors.employerPF && (
              <small className="field-error">
                {salaryErrors.employerPF}
              </small>
            )}
          </div>

          {/* Professional Tax */}
          <div className="form-group">
            <label>Professional Tax (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={professionalTax}
              placeholder="e.g. 200"
              onChange={(e) => handleSalaryInput(
                "professionalTax",
                e.target.value,
                setProfessionalTax
              )}
              disabled={viewMode}
            />
            {salaryErrors.professionalTax && (
              <small className="field-error">
                {salaryErrors.professionalTax}
              </small>
            )}
          </div>

          {/* TDS */}
          <div className="form-group">
            <label>TDS (Monthly If Applicable)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={tds}
              placeholder="e.g. 2500"
              onChange={(e) => handleSalaryInput(
                "tds",
                e.target.value,
                setTds
              )}
              disabled={viewMode}
            />
            {salaryErrors.tds && (
              <small className="field-error">
                {salaryErrors.tds}
              </small>
            )}
          </div>

          {/* Other Deduction */}
          <div className="form-group">
            <label>Other Deduction (Monthly)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={otherDeduction}
              placeholder="e.g. 1000"
              onChange={(e) => handleSalaryInput(
                "otherDeduction",
                e.target.value,
                setOtherDeduction
              )}
              disabled={viewMode}
            />
            {salaryErrors.otherDeduction && (
              <small className="field-error">
                {salaryErrors.otherDeduction}
              </small>
            )}
          </div>

        </div>

       
      </div>

      <div className="step-actions bank-step-actions">
        {successMsg && <p className="workflow-feedback success">{successMsg}</p>}
        {apiError && <p className="workflow-feedback error">{apiError}</p>}

        {!viewMode && (
          <button type="button" className="btn secondary" onClick={onBack} disabled={saving}>
            Back
          </button>
        )}

        {!viewMode && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setApiError("");
              setSuccessMsg("Skipped");

              setTimeout(() => {
                if (onNext) {
                  onNext();
                }
              }, 500);
            }}
            disabled={saving}
          >
            Skip
          </button>
        )}

        {!viewMode && (
          <button
            type="button"
            className="btn primary"
            onClick={handleSaveNext}
            disabled={saving}
          >
            {saving
              ? data
                ? "Updating..."
                : "Saving..."
              : data
                ? "Update & Next"
                : "Save & Next"}
          </button>
        )}
      </div>
    </div>
  );
});

export default BankInfo;
