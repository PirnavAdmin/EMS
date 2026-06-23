import React, { useEffect, useMemo, useState } from "react";
import { formatDate, formatDateTime, parseDate } from "../../utils/date";
import {
  formatDocumentSize,
  loadStoredDocuments,
  mergeDocumentRecords,
} from "./documentStore";
import "./AddEmployee.css";

const getDisplayValue = (value, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || fallback;
};

const getFullName = (personalInfo) =>
  [
    personalInfo?.firstName,
    personalInfo?.middleName,
    personalInfo?.lastName,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

const getAddress = (personalInfo) =>
  [
    personalInfo?.houseNo,
    personalInfo?.street,
    personalInfo?.city,
    personalInfo?.district,
    personalInfo?.state,
    personalInfo?.country,
    personalInfo?.pincode,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getDaysInMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

const normalizeDate = (value) => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return null;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );
};

const getTodayDate = () => {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
};

const addYearsClamped = (date, years) => {
  const year = date.getFullYear() + years;
  const month = date.getMonth();
  const day = Math.min(date.getDate(), getDaysInMonth(year, month));

  return new Date(year, month, day);
};

const addMonthsClamped = (date, months) => {
  const totalMonths = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(date.getDate(), getDaysInMonth(year, month));

  return new Date(year, month, day);
};

const formatDurationUnit = (value, label) =>
  `${value} ${value === 1 ? label : `${label}s`}`;

const formatExperienceDuration = (fromValue, toValue) => {
  const startDate = normalizeDate(fromValue);

  if (!startDate) {
    return "";
  }

  const endDate = normalizeDate(toValue) ?? getTodayDate();

  if (endDate < startDate) {
    return "";
  }

  let years = endDate.getFullYear() - startDate.getFullYear();

  if (
    endDate.getMonth() < startDate.getMonth() ||
    (endDate.getMonth() === startDate.getMonth() &&
      endDate.getDate() < startDate.getDate())
  ) {
    years -= 1;
  }

  if (years < 0) {
    years = 0;
  }

  const afterYears = addYearsClamped(startDate, years);

  let months =
    (endDate.getFullYear() - afterYears.getFullYear()) * 12 +
    (endDate.getMonth() - afterYears.getMonth());

  if (endDate.getDate() < afterYears.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    months = 0;
  }

  const afterMonths = addMonthsClamped(afterYears, months);
  const days = Math.max(
    0,
    Math.floor(
      (Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
      ) -
        Date.UTC(
          afterMonths.getFullYear(),
          afterMonths.getMonth(),
          afterMonths.getDate()
        )) /
        ONE_DAY_MS
    )
  );

  const parts = [];

  if (years > 0) {
    parts.push(formatDurationUnit(years, "Year"));
  }

  if (months > 0) {
    parts.push(formatDurationUnit(months, "Month"));
  }

  if (days > 0 || parts.length === 0) {
    parts.push(formatDurationUnit(days, "Day"));
  }

  return parts.join(" ");
};

const getExperienceDurationValue = (item) => {
  const durationLabel = formatExperienceDuration(item.fromDate, item.toDate);

  return durationLabel || getDisplayValue(item.years);
};


function ReviewField({ label, value }) {
  return (
    <div className="review-item">
      <span className="review-label">{label}</span>
      <span className="review-value">{getDisplayValue(value)}</span>
    </div>
  );
}

function ReviewSection({
  title,
  stepNumber,
  onEditSection,
  children,
}) {
  return (
    <div className="form-card review-section-card">
      <div className="review-section-header">
        <h4>{title}</h4>

        <button
          type="button"
          className="btn secondary review-edit-btn"
          onClick={() => onEditSection(stepNumber)}
        >
          Edit
        </button>
      </div>

      {children}
    </div>
  );
}

function ReviewSubmit({
  data,
  employeeId,
  viewMode,
  submitting,
  successMsg,
  errorMsg,
  onBack,
  onEditSection,
  onFinalSubmit,
}) {
  const personalInfo = data?.personalInfo || {};
  const bankDetails = data?.bankDetails || {};
  const education = Array.isArray(data?.education) ? data.education : [];
  const experience = Array.isArray(data?.experience) ? data.experience : [];
  const [cachedDocuments, setCachedDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(Boolean(employeeId));

  const serverDocuments = Array.isArray(data?.documents) ? data.documents : [];

  useEffect(() => {
    let active = true;

    const loadCachedDocuments = async () => {
      if (!employeeId) {
        if (active) {
          setCachedDocuments([]);
          setDocumentsLoading(false);
        }

        return;
      }

      if (active) {
        setDocumentsLoading(true);
      }

      try {
        const storedDocuments = await loadStoredDocuments(employeeId);

        if (active) {
          setCachedDocuments(storedDocuments);
          setDocumentsLoading(false);
        }
      } catch {
        if (active) {
          setCachedDocuments([]);
          setDocumentsLoading(false);
        }
      }
    };

    loadCachedDocuments();

    return () => {
      active = false;
    };
  }, [employeeId]);

  const documents = useMemo(
    () => mergeDocumentRecords(serverDocuments, cachedDocuments),
    [cachedDocuments, serverDocuments]
  );

  return (
    <div className="form-section">
      <h3>Review & Submit</h3>
      <p className="review-intro">
        Review the saved employee details below before final submission.
      </p>

      <ReviewSection
        title="Personal Information"
        stepNumber={1}
        onEditSection={onEditSection}
      >
        <div className="review-item-grid">
          <ReviewField label="Employee ID" value={personalInfo.employee_Id} />
          <ReviewField label="Full Name" value={getFullName(personalInfo)} />
          <ReviewField label="Date of Birth" value={formatDate(personalInfo.dateOfBirth)} />
          <ReviewField label="Gender" value={personalInfo.gender} />
          <ReviewField label="Marital Status" value={personalInfo.marital_Status} />
          <ReviewField label="Phone Number" value={personalInfo.phoneNumber} />
          <ReviewField label="Email" value={personalInfo.email} />
          <ReviewField label="Aadhaar Number" value={personalInfo.aadhaarNumber} />
          <ReviewField label="PAN Number" value={personalInfo.panNumber} />
          <ReviewField label="Department" value={personalInfo.department} />
          <ReviewField label="Designation" value={personalInfo.designation} />
          <ReviewField label="Date of Joining" value={formatDate(personalInfo.joiningDate)} />
          <ReviewField label="Experience (Years)" value={personalInfo.workExperience} />
          <ReviewField label="Blood Group" value={personalInfo.bloodGroup} />
          <div className="review-item review-item-full">
            <span className="review-label">Address</span>
            <span className="review-value">{getDisplayValue(getAddress(personalInfo))}</span>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection
        title="Bank Information"
        stepNumber={2}
        onEditSection={onEditSection}
      >
        <div className="review-item-grid">
          <ReviewField label="Customer ID" value={bankDetails.customer_Id} />
          <ReviewField label="Bank Name" value={bankDetails.bank_Name} />
          <ReviewField label="Account Holder Name" value={bankDetails.account_Holder_Name} />
          <ReviewField label="Account Number" value={bankDetails.account_Number} />
          <ReviewField label="IFSC Code" value={bankDetails.ifsC_Code} />
          <ReviewField label="Branch Name" value={bankDetails.branch_Name} />
          <ReviewField label="UAN Number" value={bankDetails.uaN_Number} />
          <ReviewField label="PF Account Number" value={bankDetails.pF_Account_Number} />
        </div>
      </ReviewSection>

      <ReviewSection
        title="Education"
        stepNumber={3}
        onEditSection={onEditSection}
      >
        {education.length > 0 ? (
          <div className="review-stack">
            {education.map((item, index) => (
              <div className="review-list-card" key={`${item.degree || "education"}-${index}`}>
                <div className="review-section-subtitle">Education {index + 1}</div>

                <div className="review-item-grid">
                  <ReviewField label="Qualification" value={item.degree} />
                  <ReviewField label="Institution" value={item.universityBoard} />
                  <ReviewField label="Year" value={item.yearOfPassing} />
                  <ReviewField label="Percentage" value={item.percentageCGPA} />
                  <div className="review-item review-item-full">
                    <span className="review-label">Specialization</span>
                    <span className="review-value">{getDisplayValue(item.specialization)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="review-empty-state">No education details added.</div>
        )}
      </ReviewSection>

      <ReviewSection
        title="Experience"
        stepNumber={4}
        onEditSection={onEditSection}
      >
        {experience.length > 0 ? (
          <div className="review-stack">
            {experience.map((item, index) => (
              <div
                className="review-list-card"
                key={`${item.companyName || "experience"}-${index}`}
              >
                <div className="review-section-subtitle">Experience {index + 1}</div>

                <div className="review-item-grid">
                  <ReviewField label="Company Name" value={item.companyName} />
                  <ReviewField label="Designation" value={item.designation} />
                  <ReviewField label="From Date" value={formatDate(item.fromDate)} />
                  <ReviewField label="To Date" value={formatDate(item.toDate)} />
                  <ReviewField
                    label="Years of Experience"
                    value={getExperienceDurationValue(item)}
                  />
                  <ReviewField label="Reason for Leaving" value={item.reasonForLeaving} />
                  <div className="review-item review-item-full">
                    <span className="review-label">Description</span>
                    <span className="review-value">{getDisplayValue(item.description)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="review-empty-state">No experience details added.</div>
        )}
      </ReviewSection>

      <ReviewSection
        title={`Uploaded Documents (${documents.length})`}
        stepNumber={5}
        onEditSection={onEditSection}
      >
        {documentsLoading && documents.length === 0 ? (
          <div className="review-empty-state">Loading uploaded documents...</div>
        ) : documents.length > 0 ? (
          <div className="review-stack">
            {documents.map((doc, index) => (
              <div
                className="review-list-card"
                key={`${doc.documentType || "document"}-${index}`}
              >
                <div className="review-section-subtitle">
                  Document {index + 1}
                </div>

                <div className="review-item-grid">
                  <ReviewField
                    label="Document Type"
                    value={
                      doc.documentType ||
                      "Document"
                    }
                  />

                  <ReviewField
                    label="File Name"
                    value={
                      doc.fileName ||
                      doc.file_Name
                    }
                  />

                  <ReviewField
                    label="File Type"
                    value={doc.fileType}
                  />

                  <ReviewField
                    label="Size"
                    value={formatDocumentSize(doc.size)}
                  />

                  {/* <ReviewField
                    label="Uploaded Date"
                    value={formatDateTime(doc.uploadedAt || doc.createdAt)}
                  /> */}

                  {doc.fileUrl && (
                    <div className="review-item review-item-full">
                      <span className="review-label">File</span>

                      <span className="review-value">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="document-link"
                        >
                          View Document
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="review-empty-state">
            No documents uploaded.
          </div>
        )}
      </ReviewSection>

      <div className="step-actions">
        <button type="button" className="btn secondary" onClick={onBack} disabled={submitting}>
          Back
        </button>

        {successMsg && <p className="education-feedback success">{successMsg}</p>}
        {errorMsg && <p className="education-feedback error">{errorMsg}</p>}

        {!viewMode && (
          <button
            type="button"
            className="btn primary"
            onClick={onFinalSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Final Submit"}
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewSubmit;
