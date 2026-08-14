import React, { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";

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

  useEffect(() => {
    if (!employeeId) return;
    loadSalary();
  }, [employeeId]);

  useImperativeHandle(ref, () => ({
    validate() {
      return true;
    },
  }));

  const loadSalary = async () => {
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
  };

  const handleSalaryInput = (field, value, setter) => {
    // Remove spaces
    value = value.replace(/\s/g, "");
    // Allow only numbers and commas
    if (!/^[0-9,]*$/.test(value)) {
      return;
    }
    // Count only digits
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

  const saveSalary = async () => {
    const payload = {
      employee_Id: employeeId,
      annualCTC: Number(annualCTC),
      basicSalary: Number(basicSalary),
      hra: Number(hra),
      conveyanceAllowance: Number(conveyanceAllowance),
      medicalAllowance: Number(medicalAllowance),
      specialAllowance: Number(specialAllowance),
      employeePF: Number(employeePF),
      employerPF: Number(employerPF),
      professionalTax: Number(professionalTax),
      tds: Number(tds),
      otherDeduction: Number(otherDeduction),
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

    const finalBankName = bankName === "Other" ? manualBank : bankName;

    setApiError("");
    setSuccessMsg("");
    setSaving(true);

    try {
      const payload = {
        employee_Id: employeeId,
        customer_Id: customerId,
        bank_Name: finalBankName,
        account_Holder_Name: accountHolder,
        account_Number: accountNumber,
        ifsC_Code: ifsc,
        branch_Name: branch,
        uaN_Number: uan,
        pF_Account_Number: pf,
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
      console.error(
        "Bank / Salary API Error:",
        error?.response?.data || error?.message
      );

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
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={viewMode}
            />
          </div>

          <div className="form-group">
            <label>Bank Name</label>
            <select
              value={bankName || ""}
              onChange={(e) => setBankName(e.target.value)}
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
          </div>

          {bankName === "Other" && (
            <div className="form-group full">
              <label>Enter Bank Name</label>
              <input
                value={manualBank || ""}
                onChange={(e) => setManualBank(e.target.value)}
                disabled={viewMode}
              />
            </div>
          )}

          <div className="form-group">
            <label>Account Holder Name</label>
            <input
              value={accountHolder || ""}
              onChange={(e) => setAccountHolder(e.target.value)}
              disabled={viewMode}
            />
          </div>

          <div className="form-group">
            <label>Account Number</label>
            <input
              value={accountNumber || ""}
              onChange={(e) => setAccountNumber(e.target.value)}
              disabled={viewMode}
            />
          </div>

          <div className="form-group">
            <label>IFSC Code</label>
            <input
              value={ifsc || ""}
              onChange={(e) => setIfsc(e.target.value)}
              disabled={viewMode}
            />
          </div>

          <div className="form-group">
            <label>Branch Name</label>
            <input
              value={branch || ""}
              onChange={(e) => setBranch(e.target.value)}
              disabled={viewMode}
            />
          </div>

          <div className="form-group">
            <label>UAN Number</label>
            <input
              value={uan || ""}
              onChange={(e) => setUan(e.target.value)}
              disabled={viewMode}
            />
          </div>

          <div className="form-group">
            <label>PF Account Number</label>
            <input
              value={pf || ""}
              onChange={(e) => setPf(e.target.value)}
              disabled={viewMode}
            />
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
              placeholder="Enter annual CTC (e.g. 600000)"
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
              placeholder="Enter basic salary (e.g. 300000)"
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
              placeholder="Enter HRA amount (e.g. 120000)"
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
              placeholder="Enter conveyance allowance (e.g. 24000)"
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
              placeholder="Enter medical allowance (e.g. 15000)"
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
              placeholder="Enter special allowance (e.g. 50000)"
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
              placeholder="Enter employee PF (e.g. 1800)"
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
              placeholder="Enter employer PF (e.g. 1800)"
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
              placeholder="Enter professional tax (e.g. 200)"
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
              placeholder="Enter TDS amount (e.g. 2500)"
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
              placeholder="Enter other deduction (e.g. 1000)"
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
