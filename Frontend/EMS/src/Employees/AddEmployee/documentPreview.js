const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const DOCX_TARGET_ENTRY = "word/document.xml";

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

export const getDocumentPreviewKind = (document) => {
  const fileName = getFileName(document);
  const extension = getExtension(fileName);
  const mimeType = toLowerString(
    document?.fileType ||
      document?.mimeType ||
      document?.contentType ||
      document?.fileMimeType ||
      document?.blob?.type
  );

  if (mimeType.includes("pdf") || extension === "pdf") {
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
