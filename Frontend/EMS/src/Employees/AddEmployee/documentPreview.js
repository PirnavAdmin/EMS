const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const DOCX_TARGET_ENTRY = "word/document.xml";
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME_TYPE = "application/msword";
const PDF_MIME_TYPE = "application/pdf";
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const textDecoder = new TextDecoder("utf-8");

const toLowerString = (value) => String(value || "").trim().toLowerCase();

const getFileName = (document) =>
  String(
    document?.fileName ||
      document?.file_Name ||
      document?.name ||
      document?.originalFileName ||
      document?.originalName ||
      ""
  ).trim();

const getExtension = (fileName = "") => {
  const normalizedFileName = String(fileName || "").toLowerCase();
  const parts = normalizedFileName.split(".");
  return parts.length > 1 ? parts.pop() : "";
};

const MIME_BY_EXTENSION = {
  pdf: PDF_MIME_TYPE,
  docx: DOCX_MIME_TYPE,
  doc: DOC_MIME_TYPE,
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  zip: "application/zip",
};

const GENERIC_MIME_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/binary",
]);

const normalizeMimeTypeValue = (value) => {
  const normalizedValue = toLowerString(value);

  if (!normalizedValue || GENERIC_MIME_TYPES.has(normalizedValue)) {
    return "";
  }

  const mimeType = normalizedValue.split(";")[0].trim();

  if (mimeType.includes("/")) {
    return mimeType;
  }

  const extension = mimeType.startsWith(".") ? mimeType.slice(1) : mimeType;

  return MIME_BY_EXTENSION[extension] || "";
};

const getMimeTypeFromExtension = (fileName = "") => {
  const extension = getExtension(fileName);
  return MIME_BY_EXTENSION[extension] || "";
};

const SAFE_WEB_URL_PATTERN = /^(https?:|blob:|data:|\/|\.{1,2}\/)/i;

export const isSafeWebUrl = (value = "") => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return false;
  }

  if (/^file:/i.test(normalizedValue)) {
    return false;
  }

  if (/^[a-zA-Z]:[\\/]/.test(normalizedValue) || /^\\\\/.test(normalizedValue)) {
    return false;
  }

  return SAFE_WEB_URL_PATTERN.test(normalizedValue);
};

export const normalizeDocumentMimeType = (value, fileName = "") =>
  normalizeMimeTypeValue(value) || getMimeTypeFromExtension(fileName);

export const getDocumentFileName = (document) =>
  getFileName(document);

export const getDocumentMimeType = (document = {}) => {
  const fileName = getFileName(document);

  return normalizeDocumentMimeType(
    document?.mimeType ||
      document?.contentType ||
      document?.fileType ||
      document?.fileMimeType ||
      document?.blob?.type,
    fileName
  );
};

export const resolveDocumentMimeType = async ({
  blob = null,
  fileName = "",
  headerMimeType = "",
  documentMimeType = "",
} = {}) => {
  const detectedMimeType = blob
    ? await detectBlobMimeType(blob, fileName)
    : "";

  return (
    detectedMimeType ||
    normalizeDocumentMimeType(documentMimeType, fileName) ||
    normalizeDocumentMimeType(headerMimeType, fileName) ||
    normalizeDocumentMimeType(blob?.type, fileName) ||
    getMimeTypeFromExtension(fileName) ||
    ""
  );
};

const startsWithSignature = (bytes, signature) =>
  signature.every((byte, index) => bytes[index] === byte);

const getBlobBytes = async (source) => {
  if (source instanceof Blob) {
    return new Uint8Array(await source.arrayBuffer());
  }

  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }

  if (ArrayBuffer.isView(source)) {
    return new Uint8Array(
      source.buffer.slice(
        source.byteOffset,
        source.byteOffset + source.byteLength
      )
    );
  }

  return null;
};

export const detectBlobMimeType = async (source, fileName = "") => {
  const bytes = await getBlobBytes(source);
  const extensionMimeType = getMimeTypeFromExtension(fileName);

  if (!bytes || bytes.length === 0) {
    return extensionMimeType;
  }

  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return PDF_MIME_TYPE;
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }

  if (startsWithSignature(bytes, OLE2_SIGNATURE)) {
    return DOC_MIME_TYPE;
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 ||
      bytes[2] === 0x05 ||
      bytes[2] === 0x07) &&
    (bytes[3] === 0x04 ||
      bytes[3] === 0x06 ||
      bytes[3] === 0x08)
  ) {
    try {
      const entries = getZipEntries(bytes);

      if (entries.has(DOCX_TARGET_ENTRY)) {
        return DOCX_MIME_TYPE;
      }
    } catch {
      // Fall back to extension-based detection below.
    }

    return extensionMimeType || "application/zip";
  }

  return extensionMimeType;
};

export const buildOfficeViewerUrl = (sourceUrl = "") => {
  const normalizedSourceUrl = String(sourceUrl || "").trim();

  if (!/^https?:\/\//i.test(normalizedSourceUrl)) {
    return "";
  }

  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    normalizedSourceUrl
  )}`;
};

export const getDocumentPreviewKind = (document) => {
  const fileName = getFileName(document);
  const extension = getExtension(fileName);
  const mimeType = getDocumentMimeType(document);

  if (mimeType === PDF_MIME_TYPE || extension === "pdf") {
    return "pdf";
  }

  if (
    mimeType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension)
  ) {
    return "image";
  }

  if (
    mimeType.includes("wordprocessingml.document") ||
    extension === "docx"
  ) {
    return "docx";
  }

  if (mimeType.includes("msword") || extension === "doc") {
    return "doc";
  }

  if (!fileName) {
    return "unknown";
  }

  return "unsupported";
};

const findEndOfCentralDirectory = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_EOCD_SIGNATURE) {
      return {
        offset,
        view,
      };
    }
  }

  return null;
};

const decodeZipString = (bytes) => {
  try {
    return textDecoder.decode(bytes);
  } catch {
    return "";
  }
};

const getZipEntries = (bytes) => {
  const eocd = findEndOfCentralDirectory(bytes);

  if (!eocd) {
    throw new Error("Invalid ZIP archive");
  }

  const { offset, view } = eocd;
  const totalEntries = view.getUint16(offset + 10, true);
  const centralDirectoryOffset = view.getUint32(offset + 16, true);
  const entries = new Map();

  let cursor = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(cursor, true) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("Invalid ZIP central directory");
    }

    const flags = view.getUint16(cursor + 8, true);
    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const fileName = decodeZipString(
      bytes.slice(cursor + 46, cursor + 46 + fileNameLength),
      flags
    );

    entries.set(fileName, {
      compressionMethod,
      compressedSize,
      localHeaderOffset,
    });

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
};

const decompressRawDeflate = async (bytes) => {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress DOCX files.");
  }

  const compressedBlob = new Blob([bytes]);

  try {
    const stream = compressedBlob
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));

    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    const stream = compressedBlob
      .stream()
      .pipeThrough(new DecompressionStream("deflate"));

    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
};

const readZipEntryBytes = async (bytes, entryName) => {
  const entries = getZipEntries(bytes);
  const entry = entries.get(entryName);

  if (!entry) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (view.getUint32(entry.localHeaderOffset, true) !== ZIP_LOCAL_FILE_SIGNATURE) {
    throw new Error("Invalid ZIP file header");
  }

  const fileNameLength = view.getUint16(entry.localHeaderOffset + 26, true);
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true);
  const dataOffset =
    entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressedBytes = bytes.slice(
    dataOffset,
    dataOffset + entry.compressedSize
  );

  if (entry.compressionMethod === 0) {
    return compressedBytes;
  }

  if (entry.compressionMethod === 8) {
    return decompressRawDeflate(compressedBytes);
  }

  throw new Error("Unsupported DOCX compression method");
};

const collectDocxText = (node) => {
  if (!node) {
    return "";
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const nodeName = node.localName;

  if (nodeName === "t") {
    return node.textContent || "";
  }

  if (nodeName === "tab") {
    return "\t";
  }

  if (nodeName === "br" || nodeName === "cr") {
    return "\n";
  }

  if (nodeName === "tr") {
    const cellValues = Array.from(node.children)
      .filter((child) => child.localName === "tc")
      .map((child) => collectDocxText(child).trim())
      .filter(Boolean);

    return `${cellValues.join(" | ")}\n`;
  }

  if (nodeName === "tc") {
    const lines = Array.from(node.children)
      .filter((child) => child.localName !== "tcPr")
      .map((child) => collectDocxText(child).trim())
      .filter(Boolean);

    return `${lines.join("\n")}\n`;
  }

  return Array.from(node.childNodes)
    .map((child) => collectDocxText(child))
    .join("");
};

export const extractDocxText = async (source) => {
  const bytes =
    source instanceof ArrayBuffer
      ? new Uint8Array(source)
      : source instanceof Blob
        ? new Uint8Array(await source.arrayBuffer())
        : source instanceof Uint8Array
          ? source
          : null;

  if (!bytes) {
    throw new Error("Unable to read DOCX file");
  }

  const documentXmlBytes = await readZipEntryBytes(bytes, DOCX_TARGET_ENTRY);

  if (!documentXmlBytes) {
    throw new Error("DOCX document content not found");
  }

  const xmlText = textDecoder.decode(documentXmlBytes);
  const xmlDoc = new DOMParser().parseFromString(xmlText, "application/xml");

  if (xmlDoc.querySelector("parsererror")) {
    throw new Error("Unable to parse DOCX document");
  }

  const body =
    xmlDoc.getElementsByTagNameNS("*", "body")[0] ||
    xmlDoc.documentElement;

  const lines = Array.from(body.children || [])
    .filter((child) => child.localName !== "sectPr")
    .map((child) => collectDocxText(child).trim())
    .filter(Boolean);

  return lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
};
