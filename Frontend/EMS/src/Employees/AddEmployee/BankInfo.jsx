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
  const [successMsg, setSuccessMsg] = useState("");
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);

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
      return true;
    },
  }));

  const handleSaveNext = async () => {
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
        : await api.post(API_ENDPOINTS.employeeBankDetails.list, payload, {
            headers: {
              "Content-Type": "application/json",
            },
          });

      setSuccessMsg(data ? "Bank details updated!" : "Bank details saved!");

      setTimeout(() => {
        onNext(response?.data?.employeeId || employeeId);
      }, 800);
    } catch (error) {
      console.error("Bank API Error:", error.response?.data || error.message);
      setApiError("Failed to save bank details.");
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
