// import { createWorker } from "tesseract.js";
// import * as pdfjsLib from "pdfjs-dist";

// if (pdfjsLib?.GlobalWorkerOptions) {
//   pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//     "pdfjs-dist/build/pdf.worker.min.mjs",
//     import.meta.url
//   ).toString();
// }

// const CERTIFICATE_KEYWORDS = {
//   "10th": [
//     "SSC",
//     "SECONDARY SCHOOL CERTIFICATE",
//     "BOARD OF SECONDARY EDUCATION",
//     "10TH",
//     "X CLASS"
//   ],
//   inter: [
//     "INTERMEDIATE",
//     "HSC",
//     "12TH",
//     "BOARD OF INTERMEDIATE EDUCATION",
//     "XII"
//   ],
//   degree: [
//     "BACHELOR",
//     "DEGREE",
//     "UNIVERSITY",
//     "B.TECH",
//     "B.SC",
//     "B.COM",
//     "PROVISIONAL CERTIFICATE",
//     "CONVOCATION"
//   ],
//   pg: [
//     "MASTER",
//     "POST GRADUATE",
//     "POSTGRADUATE",
//     "M.TECH",
//     "M.SC",
//     "M.COM",
//     "M.A.",
//     "MBA",
//     "PG CERTIFICATE"
//   ]
// };

// const PAYSLIP_KEYWORDS = [
//   "PAYSLIP",
//   "SALARY SLIP",
//   "PAY SLIP",
//   "GROSS PAY",
//   "GROSS SALARY",
//   "NET PAY",
//   "NET SALARY",
//   "BASIC SALARY",
//   "DEDUCTIONS",
//   "EARNINGS",
//   "EMPLOYEE ID",
//   "EMPLOYEE CODE",
//   "PAY PERIOD",
//   "PF",
//   "PROVIDENT FUND",
//   "TDS",
//   "HRA",
//   "INCOME TAX"
// ];

// const ocrResultCache = new WeakMap();
// const NO_DOCUMENT_TEXT_MESSAGE =
//   "This file doesn't appear to contain a document - please upload the actual certificate/document, not a photo.";
// const OCR_WARNING_MESSAGE =
//   "Couldn't verify this document automatically - please confirm it's correct.";

// const getMatches = (text, keywords) =>
//   keywords.filter((keyword) => text.includes(keyword));

// const renderFirstPdfPage = async (file) => {
//   const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
//   const page = await pdf.getPage(1);
//   const viewport = page.getViewport({ scale: 2 });
//   const canvas = document.createElement("canvas");
//   canvas.width = viewport.width;
//   canvas.height = viewport.height;
//   await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
//   return canvas;
// };

// /**
//  * Reads images with Tesseract and renders the first PDF page before OCR.
//  * A failed or unreadable scan is reported to callers instead of throwing.
//  */
// const runDocumentOcr = async (file) => {
//   if (!file) {
//     return { text: "", readable: false, technicalFailure: true, error: OCR_WARNING_MESSAGE };
//   }

//   const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
//   const isImage = file.type?.startsWith("image/") || /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(file.name || "");

//   if (!isPdf && !isImage) {
//     return { text: "", readable: false, technicalFailure: true, error: OCR_WARNING_MESSAGE };
//   }

//   try {
//     const source = isPdf ? await renderFirstPdfPage(file) : file;
//     const worker = await createWorker("eng", 1, { logger: () => {} });
//     let result;
//     try {
//       result = await worker.recognize(source);
//     } finally {
//       await worker.terminate();
//     }
//     const text = String(result?.data?.text || "").toUpperCase();
//     const readable = text.replace(/[^A-Z0-9]/g, "").length >= 20;

//     return {
//       text,
//       readable,
//       technicalFailure: false,
//       error: readable ? "" : NO_DOCUMENT_TEXT_MESSAGE
//     };
//   } catch (error) {
//     console.warn("Document OCR could not read the selected file:", error);
//     return {
//       text: "",
//       readable: false,
//       technicalFailure: true,
//       error: OCR_WARNING_MESSAGE
//     };
//   }
// };

// export const readDocumentText = (file) => {
//   if (!file) return runDocumentOcr(file);
//   if (!ocrResultCache.has(file)) {
//     ocrResultCache.set(file, runDocumentOcr(file));
//   }
//   return ocrResultCache.get(file);
// };

// export const getOcrValidationType = (documentType = "") => {
//   const type = String(documentType).toLowerCase();
//   if (type.includes("payslip")) return "payslip";
//   if (type.includes("10th") || type.includes("ssc") || type.includes("secondary")) return "10th";
//   if (type.includes("intermediate") || type.includes("12th") || type.includes("hsc")) return "inter";
//   if (type.includes("post-graduation") || type.includes("post graduation")) return "pg";
//   if (type.includes("degree") || type.includes("graduation")) return "degree";
//   return "";
// };

// export const validateCertificateDocument = async (file, certificateType) => {
//   const expectedType = getOcrValidationType(certificateType) || certificateType;
//   const expectedKeywords = CERTIFICATE_KEYWORDS[expectedType];
//   if (!expectedKeywords) {
//     return { valid: true, warning: false, reason: "" };
//   }

//   const { text, readable, technicalFailure, error } = await readDocumentText(file);
//   if (!readable) {
//     return technicalFailure
//       ? { valid: true, warning: true, reason: error }
//       : { valid: false, warning: false, reason: error };
//   }

//   const expectedMatches = getMatches(text, expectedKeywords);
//   const otherMatches = Object.entries(CERTIFICATE_KEYWORDS)
//     .filter(([type]) => type !== expectedType)
//     .map(([type, keywords]) => ({ type, matches: getMatches(text, keywords) }))
//     .sort((left, right) => right.matches.length - left.matches.length)[0];
//   const expectedOnlyHasGenericDegreeKeyword =
//     expectedType === "degree" &&
//     expectedMatches.length === 1 &&
//     expectedMatches[0] === "UNIVERSITY";

//   if (
//     expectedMatches.length === 0 ||
//     (expectedOnlyHasGenericDegreeKeyword && otherMatches?.matches.length > 0) ||
//     (otherMatches?.matches.length >= 2 &&
//       otherMatches.matches.length > expectedMatches.length)
//   ) {
//     return {
//       valid: false,
//       warning: false,
//       reason: `This doesn't look like a valid ${expectedType === "inter" ? "Intermediate" : expectedType.toUpperCase()} certificate. Please upload the correct document.`
//     };
//   }

//   return { valid: true, warning: false, reason: "", matches: expectedMatches };
// };

// export const validatePayslipDocument = async (file) => {
//   const { text, readable, technicalFailure, error } = await readDocumentText(file);
//   if (!readable) {
//     return technicalFailure
//       ? { valid: true, warning: true, reason: error }
//       : { valid: false, warning: false, reason: error };
//   }

//   const matches = getMatches(text, PAYSLIP_KEYWORDS);
//   if (matches.length < 3) {
//     return {
//       valid: false,
//       warning: false,
//       reason: "This doesn't look like a valid payslip. Please upload the correct document."
//     };
//   }

//   return { valid: true, warning: false, reason: "", matches };
// };

// export const validateOcrDocumentType = (file, documentType) => {
//   const validationType = getOcrValidationType(documentType);
//   if (validationType === "payslip") return validatePayslipDocument(file);
//   if (validationType) return validateCertificateDocument(file, validationType);
//   return Promise.resolve(null);
// };
