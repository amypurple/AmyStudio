const PICTURE_QUICK_COMPRESSION_CODECS = ["raw", "mdkrle", "nibble", "bitbuster", "zx7", "dan1"];
const CODEC_EXTENSIONS = new Set(["zx0", "zx7", "dan1", "dan2", "dan3", "pletter", "plet5", "lzf", "rle", "mdkrle", "bitbuster", "nibble"]);

let pictureConvertPromise = null;
let pictureCompressionPromise = null;
let picturePreviewPromise = null;

function loadPictureConvert() {
  if (!pictureConvertPromise) pictureConvertPromise = import("../pictureConvert.js");
  return pictureConvertPromise;
}

function loadPictureCompression() {
  if (!pictureCompressionPromise) pictureCompressionPromise = import("../pictureCompressionReport.js");
  return pictureCompressionPromise;
}

function loadPicturePreview() {
  if (!picturePreviewPromise) picturePreviewPromise = import("../picturePreview.js?v=20260729-editor-picture-groups");
  return picturePreviewPromise;
}

function stripProjectPrefix(path) {
  return String(path || "").replace(/\\/g, "/").replace(/^@project\//i, "");
}

function normalizePreviewCodec(codec) {
  const normalized = String(codec || "").toLowerCase();
  return normalized === "plet5" ? "pletter" : normalized;
}

function splitPicturePath(path) {
  const bare = stripProjectPrefix(path);
  const parts = bare.split("/");
  const file = parts.pop() || "";
  const fileParts = file.split(".");
  const codec = fileParts.length > 1 && CODEC_EXTENSIONS.has(fileParts[fileParts.length - 1].toLowerCase())
    ? normalizePreviewCodec(fileParts.pop())
    : "";
  const component = fileParts.length > 1 ? fileParts[fileParts.length - 1].toLowerCase() : "";
  if (component === "pc") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "picture"].join("/"), component: "pc", codec };
  }
  if (component === "pattern" || component === "pat" || component === "chr") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "picture"].join("/"), component: "pattern", codec };
  }
  if (component === "color" || component === "col" || component === "clr") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "picture"].join("/"), component: "color", codec };
  }
  if (component === "name" || component === "nam") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "picture"].join("/"), component: "name", codec };
  }
  return { group: "", component: "", codec };
}

function pictureComponentFromPath(path) {
  return splitPicturePath(path).component;
}

function isPictureProjectFile(entry) {
  return Boolean(pictureComponentFromPath(entry?.path));
}

function selectPictureCompressionCandidate(candidates, criterion = "smallest-total") {
  const usable = (candidates || []).filter((candidate) => !candidate.error);
  if (!usable.length) return null;
  if (criterion === "raw") return usable.find((candidate) => candidate.codec === "raw") || usable[0];
  if (criterion === "smallest-data") {
    return [...usable].sort((a, b) => a.dataBytes - b.dataBytes || a.totalFirstUseBytes - b.totalFirstUseBytes)[0];
  }
  return [...usable].sort((a, b) => a.totalFirstUseBytes - b.totalFirstUseBytes || a.dataBytes - b.dataBytes)[0];
}

function lazyConvert(name) {
  return async (...args) => (await loadPictureConvert())[name](...args);
}

function lazyCompression(name) {
  return async (...args) => (await loadPictureCompression())[name](...args);
}

export function createProjectFileAddonBundle() {
  return {
    buildPictureProjectFileEntriesFromCandidate: lazyCompression("buildPictureProjectFileEntriesFromCandidate"),
    evaluatePictureCompressionCandidates: lazyCompression("evaluatePictureCompressionCandidates"),
    selectPictureCompressionCandidate,
    pictureQuickCompressionCodecs: PICTURE_QUICK_COMPRESSION_CODECS,
    imageFileToColecoBitmapTables: lazyConvert("imageFileToColecoBitmapTables"),
    colecoBitmapTablesToImageData: lazyConvert("colecoBitmapTablesToImageData"),
    imageFileToPictureProjectFileEntries: lazyConvert("imageFileToPictureProjectFileEntries"),
    patternBytesToColecoBitmapTables: lazyConvert("patternBytesToColecoBitmapTables"),
    colorBytesToColecoBitmapTables: lazyConvert("colorBytesToColecoBitmapTables"),
    grpBytesToColecoBitmapTables: lazyConvert("grpBytesToColecoBitmapTables"),
    sc2BytesToColecoBitmapTables: lazyConvert("sc2BytesToColecoBitmapTables"),
    isIcvGmDatText: async (...args) => (await loadPictureConvert()).isIcvGmDatText(...args),
    icvgmDatTextToColecoTileTables: lazyConvert("icvgmDatTextToColecoTileTables"),
    icvgmDatTextToColecoBitmapTables: lazyConvert("icvgmDatTextToColecoBitmapTables"),
    pcBytesToColecoBitmapTables: lazyConvert("pcBytesToColecoBitmapTables"),
    pcFileToPictureProjectFileEntries: lazyConvert("pcFileToPictureProjectFileEntries"),
    powerPaintBytesToColecoBitmapTables: lazyConvert("powerPaintBytesToColecoBitmapTables"),
    powerPaintFileToPictureProjectFileEntries: lazyConvert("powerPaintFileToPictureProjectFileEntries"),
    isPictureProjectFile,
    pictureComponentFromPath,
    previewPictureProjectFile: async (...args) => (await loadPicturePreview()).previewPictureProjectFile(...args)
  };
}
