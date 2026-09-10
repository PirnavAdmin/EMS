import React, { forwardRef, useCallback, useImperativeHandle, useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS, buildApiUrl } from "../../api/endpoints";

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
  const [bankErrors, setBankErrors] = useState({});
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

  const loadSalary = useCallback(async () => {
    const requestUrl = buildApiUrl(
      API_ENDPOINTS.employeeSalaryStructure.byEmployeeId(employeeId)
    );

    console.log("[BankInfo] Salary lookup request", {
      method: "GET",
      url: requestUrl,
      payload: null
    });

    try {
      const res = await api.get(
        API_ENDPOINTS.employeeSalaryStructure.byEmployeeId(employeeId)
      );
      const s = res.data;

      console.log("[BankInfo] Salary lookup response", {
        method: "GET",
        url: requestUrl,
        status: res?.status,
        data: res?.data
      });

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
    catch (error) {
      console.log("[BankInfo] Salary lookup error", {
        method: "GET",
        url: requestUrl,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      setSalaryExists(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    if (!data) {
      console.log("[BankInfo] Skipping salary lookup because no existing bank data is loaded yet.", {
        employeeId
      });
      return;
    }

    loadSalary();
  }, [employeeId, data, loadSalary]);

  const validateBankFields = () => {
    const errors = {};

    const customerIdValue = String(customerId || "").trim();
    const accountHolderValue = String(accountHolder || "").trim();
    const accountNumberValue = String(accountNumber || "").trim();
    const ifscValue = String(ifsc || "").trim().toUpperCase();
    const branchValue = String(branch || "").trim();
    const uanValue = String(uan || "").trim();
    const pfValue = String(pf || "").trim();
    const finalBankName = bankName === "Other"
      ? String(manualBank || "").trim()
      : String(bankName || "").trim();

    // -------------------------
    // Bank Name
    // -------------------------
    if (!finalBankName) {
      errors.bankName = "Please select a bank.";
    }

    if (bankName === "Other" && finalBankName) {
      if (finalBankName.length < 2 || finalBankName.length > 100) {
        errors.manualBank = "Bank name must be between 2 and 100 characters.";
      } else if (!/^[A-Za-z0-9 .,'&()/-]+$/.test(finalBankName)) {
        errors.manualBank =
          "Bank name can contain letters, numbers, spaces and basic punctuation only.";
      }
    }

    // -------------------------
    // Customer ID
    // -------------------------
    if (!customerIdValue) {
      errors.customerId = "Customer ID is required.";
    } else if (!/^[A-Za-z0-9]+$/.test(customerIdValue)) {
      errors.customerId =
        "Customer ID can contain only letters and numbers.";
    } else if (customerIdValue.length < 5 || customerIdValue.length > 20) {
      errors.customerId =
        "Customer ID must be between 5 and 20 characters.";
    } else if (/^0+$/.test(customerIdValue)) {
      errors.customerId = "Customer ID cannot contain only zeros.";
    }

    // -------------------------
    // Account Holder Name
    // -------------------------
    if (!accountHolderValue) {
      errors.accountHolder = "Account holder name is required.";
    } else if (
      !/^[A-Za-z]+(?:[A-Za-z .'-]*[A-Za-z])?$/.test(accountHolderValue)
    ) {
      errors.accountHolder =
        "Account holder name can contain letters, spaces, '.', apostrophe and hyphen only.";
    } else if (
      accountHolderValue.length < 2 ||
      accountHolderValue.length > 100
    ) {
      errors.accountHolder =
        "Account holder name must be between 2 and 100 characters.";
    }

    // -------------------------
    // Account Number
    // -------------------------
    if (!accountNumberValue) {
      errors.accountNumber = "Account number is required.";
    } else if (!/^[A-Za-z0-9]+$/.test(accountNumberValue)) {
      errors.accountNumber =
        "Account number can contain only letters and numbers.";
    } else if (
      accountNumberValue.length < 6 ||
      accountNumberValue.length > 18
    ) {
      errors.accountNumber =
        "Account number must be between 6 and 18 characters.";
    } else if (/^0+$/.test(accountNumberValue)) {
      errors.accountNumber = "Account number cannot contain only zeros.";
    }

    // -------------------------
    // IFSC Code
    // -------------------------
    if (!ifscValue) {
      errors.ifsc = "IFSC code is required.";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscValue)) {
      errors.ifsc =
        "IFSC code must be exactly 11 characters in the format ABCD0XXXXXX.";
    }

    // -------------------------
    // Branch Name
    // -------------------------
    if (!branchValue) {
      errors.branch = "Branch name is required.";
    } else if (
      !/^[A-Za-z0-9]+(?:[A-Za-z0-9 .,'&()/-]*[A-Za-z0-9])?$/.test(branchValue)
    ) {
      errors.branch =
        "Branch name contains invalid characters.";
    } else if (branchValue.length < 2 || branchValue.length > 100) {
      errors.branch = "Branch name must be between 2 and 100 characters.";
    } else if (/^0+$/.test(branchValue)) {
      errors.branch = "Branch name cannot contain only zeros.";
    }

    // -------------------------
    // UAN Number
    // -------------------------
    if (!uanValue) {
      errors.uan = "UAN number is required.";
    } else if (!/^\d+$/.test(uanValue)) {
      errors.uan = "UAN number must contain numbers only.";
    } else if (uanValue.length !== 12) {
      errors.uan = "UAN number must be exactly 12 digits.";
    } else if (/^0+$/.test(uanValue)) {
      errors.uan = "UAN number cannot contain only zeros.";
    }

    // -------------------------
    // PF Account Number
    // -------------------------
    if (!pfValue) {
      errors.pf = "PF account number is required.";
    } else if (!/^[A-Za-z0-9/-]+$/.test(pfValue)) {
      errors.pf =
        "PF account number can contain letters, numbers, '/' and '-' only.";
    } else if (pfValue.length < 5 || pfValue.length > 22) {
      errors.pf =
        "PF account number must be between 5 and 22 characters.";
    } else if (/^0+$/.test(pfValue)) {
      errors.pf = "PF account number cannot contain only zeros.";
    }

    setBankErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const validateSalaryFields = () => {
    const errors = {};

    const annual = Number(annualCTC);
    const basic = Number(basicSalary);
    const hraValue = Number(hra);
    const conveyance = Number(conveyanceAllowance);
    const medical = Number(medicalAllowance);
    const special = Number(specialAllowance);
    const employeePFValue = Number(employeePF);
    const employerPFValue = Number(employerPF);
    const professionalTaxValue = Number(professionalTax);
    const tdsValue = Number(tds);
    const otherDeductionValue = Number(otherDeduction);

    // -------------------------
    // Annual CTC
    // -------------------------
    if (!annualCTC) {
      errors.annualCTC = "Annual CTC is required.";
    } else if (!/^\d+$/.test(String(annualCTC))) {
      errors.annualCTC = "Annual CTC must contain numbers only.";
    } else if (annual < 12000) {
      errors.annualCTC = "Annual CTC must be at least ₹12,000.";
    }

    // -------------------------
    // Basic Salary
    // -------------------------
    if (!basicSalary) {
      errors.basicSalary = "Basic Salary is required.";
    } else if (!/^\d+$/.test(String(basicSalary))) {
      errors.basicSalary = "Basic Salary must contain numbers only.";
    } else if (basic < 1000) {
      errors.basicSalary = "Basic Salary must be at least ₹1,000.";
    }

    // -------------------------
    // HRA
    // -------------------------
    if (!hra) {
      errors.hra = "HRA is required.";
    } else if (!/^\d+$/.test(String(hra))) {
      errors.hra = "HRA must contain numbers only.";
    } else if (hraValue < 100) {
      errors.hra = "HRA must be at least ₹100.";
    }

    // -------------------------
    // Conveyance Allowance
    // -------------------------
    if (!conveyanceAllowance) {
      errors.conveyanceAllowance =
        "Conveyance Allowance is required.";
    } else if (!/^\d+$/.test(String(conveyanceAllowance))) {
      errors.conveyanceAllowance =
        "Conveyance Allowance must contain numbers only.";
    } else if (conveyance < 100) {
      errors.conveyanceAllowance =
        "Conveyance Allowance must be at least ₹100.";
    }

    // -------------------------
    // Medical Allowance
    // -------------------------
    if (!medicalAllowance) {
      errors.medicalAllowance =
        "Medical Allowance is required.";
    } else if (!/^\d+$/.test(String(medicalAllowance))) {
      errors.medicalAllowance =
        "Medical Allowance must contain numbers only.";
    } else if (medical < 100) {
      errors.medicalAllowance =
        "Medical Allowance must be at least ₹100.";
    }

    // -------------------------
    // Special Allowance
    // -------------------------
    if (!specialAllowance) {
      errors.specialAllowance =
        "Special Allowance is required.";
    } else if (!/^\d+$/.test(String(specialAllowance))) {
      errors.specialAllowance =
        "Special Allowance must contain numbers only.";
    } else if (special < 100) {
      errors.specialAllowance =
        "Special Allowance must be at least ₹100.";
    }

    // -------------------------
    // Employee PF
    // -------------------------
    if (!employeePF) {
      errors.employeePF = "Employee PF is required.";
    } else if (!/^\d+$/.test(String(employeePF))) {
      errors.employeePF =
        "Employee PF must contain numbers only.";
    } else if (employeePFValue < 100) {
      errors.employeePF =
        "Employee PF must be at least ₹100.";
    }

    // -------------------------
    // Employer PF
    // -------------------------
    if (!employerPF) {
      errors.employerPF = "Employer PF is required.";
    } else if (!/^\d+$/.test(String(employerPF))) {
      errors.employerPF =
        "Employer PF must contain numbers only.";
    } else if (employerPFValue < 100) {
      errors.employerPF =
        "Employer PF must be at least ₹100.";
    }

    // -------------------------
    // Professional Tax
    // -------------------------
    if (!professionalTax) {
      errors.professionalTax =
        "Professional Tax is required.";
    } else if (!/^\d+$/.test(String(professionalTax))) {
      errors.professionalTax =
        "Professional Tax must contain numbers only.";
    } else if (
      professionalTaxValue !== 0 &&
      professionalTaxValue < 100
    ) {
      errors.professionalTax =
        "Professional Tax must be 0 or at least ₹100.";
    }

    // -------------------------
    // TDS - Optional
    // -------------------------
    if (tds && !/^\d+$/.test(String(tds))) {
      errors.tds = "TDS must contain numbers only.";
    } else if (tds && tdsValue < 0) {
      errors.tds = "TDS cannot be negative.";
    }

    // -------------------------
    // Other Deduction - Optional
    // -------------------------
    if (otherDeduction && !/^\d+$/.test(String(otherDeduction))) {
      errors.otherDeduction =
        "Other Deduction must contain numbers only.";
    } else if (otherDeduction && otherDeductionValue < 0) {
      errors.otherDeduction =
        "Other Deduction cannot be negative.";
    }

    // -------------------------
    // Annual CTC consistency
    // -------------------------
    if (
      annualCTC &&
      basicSalary &&
      hra &&
      conveyanceAllowance &&
      medicalAllowance &&
      specialAllowance &&
      employerPF
    ) {
      const calculatedAnnualCTC =
        (
          basic +
          hraValue +
          conveyance +
          medical +
          special +
          employerPFValue
        ) * 12;

      if (annual !== calculatedAnnualCTC) {
        errors.annualCTC =
          `Annual CTC must match the salary structure. Expected ₹${calculatedAnnualCTC.toLocaleString("en-IN")}.`;
      }
    }

    setSalaryErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const validateAllFields = () => {
    const bankValid = validateBankFields();
    const salaryValid = validateSalaryFields();

    if (!bankValid || !salaryValid) {
      setApiError(
        "Please correct all highlighted bank and salary details before proceeding."
      );
      return false;
    }

    setApiError("");
    return true;
  };

  useImperativeHandle(ref, () => ({
    validate() {
      return validateAllFields();
    },
  }));

  const handleSalaryInput = (field, value, setter) => {
    // Numbers only
    if (!/^\d*$/.test(value)) {
      return;
    }

    // Maximum 10 digits
    if (value.length > 10) {
      setSalaryErrors((prev) => ({
        ...prev,
        [field]: "Maximum 10 digits allowed.",
      }));
      return;
    }

    // Clear error while typing
    setSalaryErrors((prev) => ({
      ...prev,
      [field]: "",
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

    const requestUrl = salaryExists
      ? buildApiUrl(API_ENDPOINTS.employeeSalaryStructure.update(employeeId))
      : buildApiUrl(API_ENDPOINTS.employeeSalaryStructure.list);
    const requestMethod = salaryExists ? "PUT" : "POST";

    console.log("[BankInfo] Salary save request", {
      method: requestMethod,
      url: requestUrl,
      payload
    });

    if (salaryExists) {
      const response = await api.put(
        API_ENDPOINTS.employeeSalaryStructure.update(employeeId),
        payload
      );
      console.log("[BankInfo] Salary save response", {
        method: requestMethod,
        url: requestUrl,
        status: response?.status,
        data: response?.data
      });
      return;
    }

    try {
      const response = await api.post(
        API_ENDPOINTS.employeeSalaryStructure.list,
        payload
      );
      console.log("[BankInfo] Salary save response", {
        method: requestMethod,
        url: requestUrl,
        status: response?.status,
        data: response?.data
      });
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
        const fallbackUrl = buildApiUrl(
          API_ENDPOINTS.employeeSalaryStructure.update(employeeId)
        );

        console.log("[BankInfo] Salary save fallback request", {
          method: "PUT",
          url: fallbackUrl,
          payload
        });

        const response = await api.put(
          API_ENDPOINTS.employeeSalaryStructure.update(employeeId),
          payload
        );
        console.log("[BankInfo] Salary save fallback response", {
          method: "PUT",
          url: fallbackUrl,
          status: response?.status,
          data: response?.data
        });
        setSalaryExists(true);
        return;
      }

      console.log("[BankInfo] Salary save error", {
        method: requestMethod,
        url: requestUrl,
        status,
        data: error?.response?.data,
        message: error?.message
      });

      throw error;
    }
  };

  const handleSaveNext = async () => {
    if (saving) return;

    setApiError("");
    setSuccessMsg("");

    // Validate all fields before proceeding
    const isValid = validateAllFields();

    if (!isValid) {
      return;
    }

    const finalBankName =
      bankName === "Other"
        ? manualBank.trim()
        : bankName.trim();

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

      const requestUrl = data
        ? buildApiUrl(API_ENDPOINTS.employeeBankDetails.byEmployeeId(employeeId))
        : buildApiUrl(API_ENDPOINTS.employeeBankDetails.list);
      const requestMethod = data ? "PUT" : "POST";

      console.log("[BankInfo] Bank save request", {
        method: requestMethod,
        url: requestUrl,
        payload
      });

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

      console.log("[BankInfo] Bank save response", {
        method: requestMethod,
        url: requestUrl,
        status: response?.status,
        data: response?.data
      });

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
              maxLength={20}
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, "");

                if (/^[A-Za-z0-9]*$/.test(value)) {
                  setCustomerId(value);
                  setBankErrors((prev) => ({
                    ...prev,
                    customerId: "",
                  }));
                }
              }}
              disabled={viewMode}
            />

            {bankErrors.customerId && (
              <small className="field-error">
                {bankErrors.customerId}
              </small>
            )}
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
                maxLength={100}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^[A-Za-z0-9 .,'&()/-]*$/.test(value)) {
                    setManualBank(value);
                    setBankErrors((prev) => ({
                      ...prev,
                      manualBank: "",
                    }));
                  }
                }}
                disabled={viewMode}
              />

              {bankErrors.manualBank && (
                <small className="field-error">
                  {bankErrors.manualBank}
                </small>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Account Holder Name</label>
            <input
              value={accountHolder || ""}
              onChange={(e) => {
                const value = e.target.value;

                if (/^[A-Za-z .'-]*$/.test(value)) {
                  setAccountHolder(value);
                  setBankErrors((prev) => ({
                    ...prev,
                    accountHolder: "",
                  }));
                }
              }}
              maxLength={100}
              disabled={viewMode}
            />
            {bankErrors.accountHolder && (
              <small className="field-error">
                {bankErrors.accountHolder}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Account Number</label>
            <input
              value={accountNumber || ""}
              maxLength={18}
              inputMode="text"
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, "");

                if (/^[A-Za-z0-9]*$/.test(value)) {
                  setAccountNumber(value);
                  setBankErrors((prev) => ({
                    ...prev,
                    accountNumber: "",
                  }));
                }
              }}
              disabled={viewMode}
            />

            {bankErrors.accountNumber && (
              <small className="field-error">
                {bankErrors.accountNumber}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>IFSC Code</label>
            <input
              value={ifsc || ""}
              maxLength={11}
              style={{ textTransform: "uppercase" }}
              onChange={(e) => {
                const value = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");

                if (value.length <= 11) {
                  setIfsc(value);
                  setBankErrors((prev) => ({
                    ...prev,
                    ifsc: "",
                  }));
                }
              }}
              disabled={viewMode}
            />

            {bankErrors.ifsc && (
              <small className="field-error">
                {bankErrors.ifsc}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Branch Name</label>
            <input
              value={branch || ""}
              maxLength={100}
              onChange={(e) => {
                const value = e.target.value;

                if (/^[A-Za-z0-9 .,'&()/-]*$/.test(value)) {
                  setBranch(value);
                  setBankErrors((prev) => ({
                    ...prev,
                    branch: "",
                  }));
                }
              }}
              disabled={viewMode}
            />

            {bankErrors.branch && (
              <small className="field-error">
                {bankErrors.branch}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>UAN Number</label>
            <input
              value={uan || ""}
              maxLength={12}
              inputMode="numeric"
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");

                if (value.length <= 12) {
                  setUan(value);
                  setBankErrors((prev) => ({
                    ...prev,
                    uan: "",
                  }));
                }
              }}
              disabled={viewMode}
            />

            {bankErrors.uan && (
              <small className="field-error">
                {bankErrors.uan}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>PF Account Number</label>
            <input
              value={pf || ""}
              maxLength={22}
              onChange={(e) => {
                const value = e.target.value
                  .toUpperCase()
                  .replace(/\s/g, "");

                if (/^[A-Z0-9/-]*$/.test(value)) {
                  setPf(value);
                  setBankErrors((prev) => ({
                    ...prev,
                    pf: "",
                  }));
                }
              }}
              disabled={viewMode}
            />

            {bankErrors.pf && (
              <small className="field-error">
                {bankErrors.pf}
              </small>
            )}
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
              maxLength={10}
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
              maxLength={10}
              placeholder="Enter basic salary (e.g. 30000)"
              value={basicSalary}
              onChange={(e) =>
                handleSalaryInput(
                  "basicSalary",
                  e.target.value,
                  setBasicSalary
                )
              }
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
              maxLength={10}
              value={hra}
              placeholder="Enter HRA amount (e.g. 12000)"
              onChange={(e) =>
                handleSalaryInput(
                  "hra",
                  e.target.value,
                  setHra
                )
              }
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
              maxLength={10}
              value={conveyanceAllowance}
              placeholder="Enter conveyance allowance (e.g. 2400)"
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
              maxLength={10}
              value={medicalAllowance}
              placeholder="Enter medical allowance (e.g. 1500)"
              onChange={(e) =>
                handleSalaryInput(
                  "medicalAllowance",
                  e.target.value,
                  setMedicalAllowance
                )
              }
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
              maxLength={10}
              value={specialAllowance}
              placeholder="Enter special allowance (e.g. 5000)"
              onChange={(e) =>
                handleSalaryInput(
                  "specialAllowance",
                  e.target.value,
                  setSpecialAllowance
                )
              }
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
              maxLength={10}
              value={employeePF}
              placeholder="Enter employee PF (e.g. 1800)"
              onChange={(e) =>
                handleSalaryInput(
                  "employeePF",
                  e.target.value,
                  setEmployeePF
                )
              }
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
              maxLength={10}
              value={employerPF}
              placeholder="Enter employer PF (e.g. 1800)"
              onChange={(e) =>
                handleSalaryInput(
                  "employerPF",
                  e.target.value,
                  setEmployerPF
                )
              }
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
              maxLength={10}
              value={professionalTax}
              placeholder="Enter professional tax (e.g. 200)"
              onChange={(e) =>
                handleSalaryInput(
                  "professionalTax",
                  e.target.value,
                  setProfessionalTax
                )
              }
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
              maxLength={10}
              value={tds}
              placeholder="Enter TDS amount (e.g. 2500)"
              onChange={(e) =>
                handleSalaryInput(
                  "tds",
                  e.target.value,
                  setTds
                )
              }
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
              maxLength={10}
              value={otherDeduction}
              placeholder="Enter other deduction (e.g. 1000)"
              onChange={(e) =>
                handleSalaryInput(
                  "otherDeduction",
                  e.target.value,
                  setOtherDeduction
                )
              }
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
