import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS, buildApiUrl } from "../../api/endpoints";
import {
  getStoredEmployeeId,
  getStoredToken,
} from "../../utils/authStorage";
import {
  downloadBinaryFile,
  getDownloadErrorMessage,
} from "../../utils/downloadUtils";
import Stepper from "./Stepper";
import PersonalInfo from "./PersonalInfo";
import BankInfo from "./BankInfo";
import Education from "./Education";
import Experience from "./Experience";
import Documents from "./Documents";
import ReviewSubmit from "./ReviewSubmit";
import "./AddEmployee.css";

function AddEmployee() {
  const { id } = useParams();

  const viewMode = Boolean(id);

  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [employeeId, setEmployeeId] = useState(
    id || getStoredEmployeeId() || ""
  );
  const [employeeData, setEmployeeData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noDataMessage, setNoDataMessage] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [profileDownloadStatus, setProfileDownloadStatus] = useState({
    type: "",
    message: "",
  });
  const [profilePdfLoading, setProfilePdfLoading] = useState(false);

  const bankRef = useRef(null);

  const fetchEmployeeDetails = useCallback(
    async ({ showLoader = true } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const token = getStoredToken();
        const config = {
          headers: {
            "ngrok-skip-browser-warning": "true",
            ...(token && {
              Authorization: `Bearer ${token}`,
            }),
          },
        };

        const response = id
          ? await api.get(API_ENDPOINTS.employeeFullDetail.byId(id), config)
          : await api.get(API_ENDPOINTS.employeeFullDetail.myDetails, config);

        const employee = response.data || {};

        setEmployeeData(employee);

        const resolvedEmployeeId =
          employee?.employeeId ||
          employee?.employee_Id ||
          employee?.personalInfo?.employee_Id ||
          employee?.personalInfo?.employeeId ||
          employee?.personalInfo?.id ||
          employee?.id ||
          id ||
          getStoredEmployeeId();

        if (resolvedEmployeeId) {
          setEmployeeId(String(resolvedEmployeeId));
        }

        const hasData = Boolean(
          employee?.personalInfo ||
          employee?.bankDetails ||
          employee?.education?.length > 0 ||
          employee?.experience?.length > 0
        );

        setNoDataMessage(
          hasData ? "" : "Employee has not filled profile details yet."
        );

        return employee;
      } catch (error) {
        console.error("Employee fetch error:", error);

        const role = localStorage.getItem("role");

        if (role?.toLowerCase() !== "admin") {
          setNoDataMessage("Unable to load employee details.");
        } else {
          setNoDataMessage("");
        }

        return null;
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [id]
  );

  useEffect(() => {
    fetchEmployeeDetails();
  }, [fetchEmployeeDetails]);

  useEffect(() => {
    if (viewMode) {
      setMaxStep(6);
    }
  }, [viewMode]);

  const goToStep = async (nextStep) => {
    await fetchEmployeeDetails({ showLoader: false });
    setStep(nextStep);
    setMaxStep((prev) => Math.max(prev, nextStep));
  };

  const nextFromPersonal = async (empId) => {
    setEmployeeId(empId);
    setReviewSuccess("");
    setReviewError("");
    await goToStep(2);
  };

  const nextFromBank = async () => {
    if (bankRef.current?.validate?.()) {
      setReviewSuccess("");
      setReviewError("");
      await goToStep(3);
    }
  };

  const nextFromEducation = async () => {
    setReviewSuccess("");
    setReviewError("");
    await goToStep(4);
  };

  const nextFromExperience = async () => {
    setReviewSuccess("");
    setReviewError("");
    await goToStep(5);
  };

  const nextFromDocuments = async () => {
    setReviewSuccess("");
    setReviewError("");
    await goToStep(6);
  };

  const handleEditToggle = () => {
    setReviewSuccess("");
    setReviewError("");
    setIsEditing((prev) => !prev);
  };

  const handleReviewEdit = (targetStep) => {
    setReviewSuccess("");
    setReviewError("");
    setIsEditing(true);
    setStep(targetStep);
    setMaxStep((prev) => Math.max(prev, 6, targetStep));
  };

  const handleReviewBack = () => {
    setReviewSuccess("");
    setReviewError("");
    setStep(5);
  };

  const handleFinalSubmit = async () => {
    setReviewSubmitting(true);
    setReviewSuccess("");
    setReviewError("");

    try {
      const latestEmployee = await fetchEmployeeDetails({ showLoader: false });

      if (!latestEmployee) {
        setReviewError("Unable to refresh the latest employee details.");
        toast.error("Unable to refresh the latest employee details.");
        return;
      }

      setIsEditing(false);
      setMaxStep((prev) => Math.max(prev, 6));
      setReviewSuccess("Profile reviewed and submitted successfully.");
      toast.success("Profile reviewed and submitted successfully.");
      setTimeout(() => {
        setStep(1);
        setMaxStep(1);
      }, 2000);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const profileEmployeeId =
    employeeId ||
    employeeData?.personalInfo?.employee_Id ||
    employeeData?.personalInfo?.employeeId ||
    employeeData?.employeeId ||
    employeeData?.id ||
    id ||
    getStoredEmployeeId();

  const handleDownloadProfilePdf = async () => {
    if (profilePdfLoading) {
      return;
    }

    if (!profileEmployeeId) {
      const message = "Employee ID not found for PDF download.";
      setProfileDownloadStatus({
        type: "success",
        message,
      });

      setTimeout(() => {
        setProfileDownloadStatus({
          type: "",
          message: "",
        });
      }, 3000);
      toast.error(message);
      return;
    }

    const token = getStoredToken();

    if (!token) {
      const message = "Session expired. Please login again.";
      setProfileDownloadStatus({
        type: "error",
        message,
      });
      toast.error(message);
      return;
    }

    setProfilePdfLoading(true);
    setProfileDownloadStatus({
      type: "loading",
      message: "Preparing profile PDF download...",
    });

    try {
      await downloadBinaryFile({
        endpoint: buildApiUrl(
          API_ENDPOINTS.employees.exportProfilePdf(profileEmployeeId)
        ),
        token,
        fallbackFileName: `EmployeeProfile_${profileEmployeeId}.pdf`,
        accept:
          "application/pdf, application/octet-stream;q=0.9, */*;q=0.1",
      });
      const message = "Profile PDF downloaded successfully.";

      setProfileDownloadStatus({
        type: "success",
        message,
      });

      setTimeout(() => {
        setProfileDownloadStatus({
          type: "",
          message: "",
        });
      }, 3000);

      toast.success(message);
    } catch (error) {
      const message = error?.response
        ? await getDownloadErrorMessage(
          error,
          "Failed to download employee profile PDF."
        )
        : error?.message || "Failed to download employee profile PDF.";

      setProfileDownloadStatus({
        type: "error",
        message,
      });
      toast.error(message);
    } finally {
      setProfilePdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="employee-loader-container">
        <div className="employee-loader"></div>
        <p>Loading employee details...</p>
      </div>
    );
  }

  return (
    <div className="add-employee">
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar
        newestOnTop
        closeButton={false}
        pauseOnHover
        theme="light"
      />

      <div className="page-header-row profile-card">
        <div className="profile-header-copy">
          <h2 className="page-title profile-title">{viewMode ? "Employee Details" : "My Profile"}</h2>

          <p className="page-subtitle">
            {viewMode
              ? "Admin can navigate all steps directly"
              : isEditing
                ? "You can now edit your profile details"
                : "Complete your profile step by step"}
          </p>

          {noDataMessage && <div className="employee-empty-message">{noDataMessage}</div>}
        </div>

        <div className="profile-header-actions">
          <div className="profile-header-buttons">

            <button
              type="button"
              className="profile-download-btn"
              onClick={handleDownloadProfilePdf}
              disabled={profilePdfLoading || !profileEmployeeId}
            >
              {profilePdfLoading ? "Downloading..." : "Download PDF"}
            </button>

            <button
              type="button"
              className="edit-profile-btn"
              onClick={handleEditToggle}
            >
              {isEditing ? "Cancel Edit" : "Edit"}
            </button>

            {profileDownloadStatus.message && (
              <div
                className={`profile-download-status ${profileDownloadStatus.type}`}
              >
                {profileDownloadStatus.message}

              </div>
            )}

          </div>
        </div>
      </div>

      <Stepper step={step} setStep={setStep} maxStep={viewMode ? 6 : maxStep} />

      <div className="step-content">
        {step === 1 && (
          <PersonalInfo
            onNext={nextFromPersonal}
            employeeId={employeeId}
            viewMode={!isEditing}
            data={employeeData?.personalInfo || null}
            selfProfile={!id}
            updateUrl={buildApiUrl(API_ENDPOINTS.employeeFullDetail.myDetails)}
          />
        )}

        {step === 2 && (
          <BankInfo
            ref={bankRef}
            onBack={() => setStep(1)}
            onNext={nextFromBank}
            employeeId={employeeId}
            viewMode={!isEditing}
            data={employeeData?.bankDetails || null}
            selfProfile={!id}
            updateUrl={buildApiUrl(API_ENDPOINTS.employeeFullDetail.myDetails)}
          />
        )}

        {step === 3 && (
          <Education
            onBack={() => setStep(2)}
            onNext={nextFromEducation}
            employeeId={employeeId}
            viewMode={!isEditing}
            data={employeeData?.education || []}
            selfProfile={!id}
            updateUrl={buildApiUrl(API_ENDPOINTS.employeeFullDetail.myDetails)}
          />
        )}

        {step === 4 && (
          <Experience
            onBack={() => setStep(3)}
            onNext={nextFromExperience}
            employeeId={employeeId}
            viewMode={!isEditing}
            data={employeeData?.experience || []}
            selfProfile={!id}
            updateUrl={buildApiUrl(API_ENDPOINTS.employeeFullDetail.myDetails)}
          />
        )}

        {step === 5 && (
          <Documents
            onBack={() => setStep(4)}
            onNext={nextFromDocuments}
            employeeId={employeeId}
            viewMode={!isEditing}
          />
        )}

        {step === 6 && (
          <ReviewSubmit
            data={employeeData}
            employeeId={employeeId}
            viewMode={!isEditing}
            submitting={reviewSubmitting}
            successMsg={reviewSuccess}
            errorMsg={reviewError}
            onBack={handleReviewBack}
            onEditSection={handleReviewEdit}
            onFinalSubmit={handleFinalSubmit}
          />
        )}
      </div>
    </div>
  );
}

export default AddEmployee;
