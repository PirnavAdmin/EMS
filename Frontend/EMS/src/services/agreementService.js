import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

const normalizeLookupValue = (value) => String(value ?? "").trim();

const getAgreementRequestCandidates = (agreementOrId, preferredFields = []) => {
  if (agreementOrId === null || agreementOrId === undefined) {
    return [];
  }

  if (typeof agreementOrId !== "object") {
    const value = normalizeLookupValue(agreementOrId);
    return value ? [value] : [];
  }

  const fieldAliases = {
    pendingEmployeeAgreementId: [
    "pendingEmployeeAgreementId",
    "PendingEmployeeAgreementId"],

    signedEmployeeAgreementId: [
    "signedEmployeeAgreementId",
    "SignedEmployeeAgreementId"],

    employeeAgreementId: [
    "employeeAgreementId",
    "EmployeeAgreementId",
    "employeeAgreementID",
    "EmployeeAgreementID",
    "employeeagreementid",
    "Employeeagreementid",
    "employee_AgreementId",
    "Employee_AgreementId"],

    agreementId: ["agreementId", "AgreementId"],
    documentId: ["documentId", "DocumentId"],
    agreementCode: ["agreementCode", "AgreementCode", "code", "Code"],
    id: ["id", "Id"]
  };

  const lookupOrder =
  preferredFields.length > 0 ?
  preferredFields :
  [
  "pendingEmployeeAgreementId",
  "signedEmployeeAgreementId",
  "employeeAgreementId",
  "agreementId",
  "documentId",
  "agreementCode",
  "id"];

  const candidates = [];

  lookupOrder.forEach((field) => {
    const aliases = fieldAliases[field] || [field];

    aliases.forEach((alias) => {
      const candidate = normalizeLookupValue(agreementOrId[alias]);

      if (candidate) {
        candidates.push(candidate);
      }
    });
  });

  return [...new Set(candidates)];
};

const requestAgreementBlob = async ({
  label,
  agreementOrId,
  preferredFields = [],
  buildPath
}) => {
  const candidates = getAgreementRequestCandidates(
    agreementOrId,
    preferredFields
  );
  let lastError = null;

  for (const candidate of candidates) {
    const path = buildPath(candidate);

    try {
      const response = await api.get(path, {
        responseType: "blob",
        dedupe: false
      });

      return response;
    } catch (error) {
      lastError = error;

    }
  }

  throw lastError || new Error(`${label} request failed`);
};

const getCollection = (responseData) => {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.agreements)) {
    return responseData.agreements;
  }

  if (Array.isArray(responseData?.data?.agreements)) {
    return responseData.data.agreements;
  }

  if (responseData?.agreement) {
    return [responseData.agreement];
  }

  if (responseData?.data?.agreement) {
    return [responseData.data.agreement];
  }

  return [];
};

export const uploadAgreement = (formData) =>
api.post(API_ENDPOINTS.agreements.upload, formData, {
  headers: {
    "Content-Type": "multipart/form-data"
  }
});

export const getAgreementTemplates = async (requestConfig = {}) => {
  const response = await api.get(
    API_ENDPOINTS.agreements.getAll,
    requestConfig
  );

  return getCollection(response.data);
};

export const getAgreementStatus = getAgreementTemplates;
export const getAgreementTypes = getAgreementTemplates;

export const getPendingAgreementCount = async (
  employeeId,
  requestConfig = {}
) => {
  const response = await api.get(
    API_ENDPOINTS.agreements.pending(employeeId),
    requestConfig
  );
  return getCollection(response.data);
};

export const getSignedAgreementCount = async (
  employeeId,
  requestConfig = {}
) => {
  const response = await api.get(
    API_ENDPOINTS.agreements.signed(employeeId),
    requestConfig
  );
  return getCollection(response.data);
};

export const viewAgreement = (agreementOrId) =>
requestAgreementBlob({
  label: "View Agreement",
  agreementOrId,
  preferredFields: [
  "pendingEmployeeAgreementId",
  "employeeAgreementId",
  "agreementId",
  "documentId",
  "agreementCode",
  "id"],

  buildPath: (candidate) => API_ENDPOINTS.agreements.viewAgreement(candidate)
});

export const viewSignedAgreement = (agreementOrId) =>
requestAgreementBlob({
  label: "View Signed Agreement",
  agreementOrId,
  preferredFields: [
  "signedEmployeeAgreementId",
  "employeeAgreementId",
  "agreementId",
  "documentId",
  "agreementCode",
  "id"],

  buildPath: (candidate) => API_ENDPOINTS.agreements.viewSigned(candidate)
});

export const downloadSignedAgreement = (agreementOrId) =>
requestAgreementBlob({
  label: "Download Signed Agreement",
  agreementOrId,
  preferredFields: [
  "signedEmployeeAgreementId",
  "employeeAgreementId",
  "agreementId",
  "documentId",
  "agreementCode",
  "id"],

  buildPath: (candidate) =>
  API_ENDPOINTS.agreements.downloadSigned(candidate)
});

export const signAgreement = ({
  employeeId,
  onboardingId,
  agreementCode,
  signatureName,
  signedLocation,
  signatureImage
}) => {
  const formData = new FormData();
  const params = {
    AgreementCode: agreementCode,
    SignatureName: signatureName,
    SignedLocation: signedLocation
  };

  formData.append("SignatureImage", signatureImage);

  if (onboardingId) {
    params.OnboardingId = onboardingId;
  } else {
    params.EmployeeId = employeeId;
  }

  return api.post(API_ENDPOINTS.agreements.sign, formData, {
    params,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

export const getAdminAgreements = getAgreementTemplates;
export const getMyAgreements = async (requestConfig = {}) => {
  const response = await api.get(
    API_ENDPOINTS.agreements.myAgreements,
    requestConfig
  );
  return getCollection(response.data);
};

export const getPendingCount = getPendingAgreementCount;
export const getSignedCount = getSignedAgreementCount;

export const downloadAgreement = (agreementId) =>
api.get(API_ENDPOINTS.agreements.download(agreementId), {
  responseType: "blob",
  dedupe: false
});

export const getAgreementFile = async (agreementId) => {
  const response = await api.get(API_ENDPOINTS.agreements.filePath(agreementId), {
    dedupe: false
  });

  return response.data;
};
