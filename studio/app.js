import { manifest } from "./manifest.js";
import { getRamLayout } from "./ramLayouts.js";
import { exampleCatalog, exampleCategoryOrder, exampleManifest, exampleSources } from "./examples.js?v=20260620-release-docs-cleanup";
import { lexZ80Source, summarizeTokens } from "./core/amyscvassembly.js";
import { compressBytes, decompressBytes, detectCodecFromName, getCompressionCatalog } from "./core/compression.js";
import { createAutocompleteController } from "./core/editor/autocomplete.js";
import { AMY_AUTOCOMPLETE, autocompleteCommandBias, isAutocompleteSourceTypeName } from "./core/editor/autocompleteCatalog.js?v=20260609-text-colors1";
import {
  DEFAULT_BIOS_CANDIDATES,
  getActiveEmulatorBackend,
  resolveEmulatorBackendUrls
} from "./core/emulatorBackends.js";
import { createEmulatorShellHelpers } from "./core/emulatorShell.js";
import { createExamplePickerHelpers } from "./core/examplePicker.js";
import {
  inferAmyMemoryCapabilities,
  parseCartridgeDirective as parseCartridgeDirectiveCore,
  parseExpressionAst as parseExpressionAstCore,
  renderExpressionAst as renderExpressionAstCore,
  rewriteImmediateByteTempCoordinateUses as rewriteImmediateByteTempCoordinateUsesCore
} from "./core/compilerFrontend.js?v=20260609-show-picture-nmi1";
import { emitSafeCall as emitSafeCallCore } from "./core/compiler/runtimeCallHelpers.js";
import { createBcdHelpers } from "./core/compiler/bcdHelpers.js";
import { createAddressHelpers } from "./core/compiler/addressHelpers.js";
import { handleArrayBulkStatement } from "./core/compiler/arrayBulkStatementHelpers.js";
import { createAssignmentArithmeticHelpers } from "./core/compiler/assignmentArithmeticHelpers.js";
import { createFx16Helpers } from "./core/compiler/fx16Helpers.js";
import { createByteLoadHelpers } from "./core/compiler/byteLoadHelpers.js";
import { createCompareLiteralHelpers } from "./core/compiler/compareLiteralHelpers.js";
import { createCompilerShellHelpers } from "./core/compiler/compilerShellHelpers.js";
import { createDataHelpers } from "./core/compiler/dataHelpers.js";
import { handleDataMetaStatement } from "./core/compiler/dataMetaStatementHelpers.js?v=20260605-dsound-asset-fix";
import { handleDataCursorStatement } from "./core/compiler/dataCursorStatementHelpers.js";
import { handleDeclarationStatement } from "./core/compiler/declarationStatementHelpers.js";
import { createControlFlowHelpers } from "./core/compiler/controlFlowHelpers.js";
import { createExpressionComputeHelpers } from "./core/compiler/expressionComputeHelpers.js";
import { scanAmyFirstPass } from "./core/compiler/firstPassScanHelpers.js?v=20260605-dsound-asset-fix";
import { handleDisplayGraphicsSpriteStatement } from "./core/compiler/displayGraphicsSpriteStatementHelpers.js";
import { handleForStatement } from "./core/compiler/forStatementHelpers.js";
import { handleIfStatement } from "./core/compiler/ifStatementHelpers.js";
import { createInlineStatementCompiler } from "./core/compiler/inlineStatementHelpers.js";
import { createLoadStoreHelpers } from "./core/compiler/loadStoreHelpers.js";
import { handleDoStatement, handleWhileStatement } from "./core/compiler/loopStatementHelpers.js";
import { handleMathBitStatement } from "./core/compiler/mathBitStatementHelpers.js";
import { handleMutateStatement } from "./core/compiler/mutateStatementHelpers.js";
import { createPrintHelpers } from "./core/compiler/printHelpers.js";
import { handlePrintFormatStatement } from "./core/compiler/printFormatStatementHelpers.js";
import { createProcHelpers } from "./core/compiler/procHelpers.js";
import { handleProcFunctionStatement } from "./core/compiler/procFunctionStatementHelpers.js";
import { handleDispatchLabelStatement } from "./core/compiler/dispatchLabelStatementHelpers.js";
import { handleRandomBounceStatement } from "./core/compiler/randomBounceStatementHelpers.js";
import { handleRoutineStatement } from "./core/compiler/routineStatementHelpers.js";
import { handleSpecialIfGotoStatement } from "./core/compiler/specialIfGotoStatementHelpers.js";
import { createRuntimeValueHelpers } from "./core/compiler/runtimeValueHelpers.js";
import { handleSelectCaseStatement } from "./core/compiler/selectCaseStatementHelpers.js";
import { createSimpleArithmeticHelpers } from "./core/compiler/simpleArithmeticHelpers.js";
import { handleSoundSpinnerStatement } from "./core/compiler/soundSpinnerStatementHelpers.js?v=20260605-dsound-asset-fix";
import { createTypeSymbolHelpers } from "./core/compiler/typeSymbolHelpers.js?v=20260605-dsound-asset-fix";
import { createU32Helpers } from "./core/compiler/u32Helpers.js";
import { createValueParseHelpers } from "./core/compiler/valueParseHelpers.js";
import { finalizeAmyTranspile } from "./core/compiler/transpileFinalizationHelpers.js";
import { handleVramTextStatement } from "./core/compiler/vramTextStatementHelpers.js?v=20260609-text-colors1";
import { handleVramPixelInputStatement } from "./core/compiler/vramPixelInputStatementHelpers.js";
import { transpileAmySource } from "./core/amyCompiler.js";
import { compileGeneratedAsm, expandAsmIncludes } from "./core/internalCompiler.js";
import {
  getOptimizationProfile,
  normalizeOptimizationLevel,
  OPTIMIZATION_LEVELS,
  sourceHintsTinySound
} from "./core/optimization.js";
import {
  inspectColecoBinary,
  previewColecoBiosTitleScreen,
  previewDinaBiosTitleScreen,
  previewColecoBiosTitleFromMetadata,
  previewDinaBiosTitleFromMetadata
} from "./core/colecoBiosPreview.js";
import { analyzeLibraryResolution, generateAsm } from "./core/project.js?v=20260616-frame-runtime3";
import { createProjectFileUiHelpers } from "./core/projectFileUi.js";
import { createProjectFileAddonBundle } from "./core/addons/projectFileAddonBundle.js";
import { createProjectEditorUiHelpers } from "./core/projectEditorUi.js";
import { createProjectBridgeHelpers } from "./core/projectBridgeHelpers.js";
import {
  buildProjectFromExample as buildProjectFromExampleCore,
  defaultSourceText as defaultSourceTextCore,
  ensureProjectFilePathCandidate as ensureProjectFilePathCandidateCore,
  loadProject as loadProjectCore,
  migrateProject as migrateProjectCore,
  newProject as newProjectCore,
  refreshProjectGraph as refreshProjectGraphCore,
  saveProjectToStorage as saveProjectToStorageCore
} from "./core/projectLifecycle.js";
import { createPreviewShellHelpers } from "./core/previewShell.js";
import { exportProject as exportProjectCore, importProjectObject as importProjectObjectCore } from "./core/projectPersistence.js";
import { createStatusAsmUiHelpers } from "./core/statusAsmUi.js";
import { createDocsUi } from "./core/docsUi.js?v=20260620-release-docs-cleanup";
import { transpileAmyCore } from "./core/compiler/transpileAmyCore.js?v=20260609-picture-start1";
import { bindAsmViewEvents, bindTopUiEvents, bindStudioRuntimeEvents } from "./core/uiEvents.js";
import { bindStudioShellEvents } from "./core/bindStudioEvents.js";
import { wavToDsound, cvSampleRate, audioBufferToDsound, dsoundBytesToPreviewSamples } from "./core/wavToDsound.js";
import { bytesToBase64, formatByteSize } from "./core/utils/bytes.js";
import { getCartridgeNormalizationWarning, appendCartridgeNormalizationWarning } from "./core/utils/cartridgeMeta.js";
import { bytesToDataUrl } from "./core/utils/dataUrls.js";
import { downloadBinary, downloadText } from "./core/utils/downloads.js";
import { formatHex16, formatRamBytes } from "./core/utils/formatters.js";
import {
  PROJECT_FILE_PREFIX,
  normalizeProjectFilePath,
  projectFileBytes,
  assetNameFromProjectPath,
  fileKindFromPath,
  normalizeProjectFiles
} from "./core/utils/projectFiles.js";

const els = {
  btnNew: document.getElementById("btnNew"),
  btnOpen: document.getElementById("btnOpen"),
  btnSave: document.getElementById("btnSave"),
  btnTranspile: document.getElementById("btnTranspile"),
  btnGenerate: document.getElementById("btnGenerate"),
  btnCompile: document.getElementById("btnCompile"),
  btnDownloadRom: document.getElementById("btnDownloadRom"),
  btnRunEmulator: document.getElementById("btnRunEmulator"),
  btnLoadBios: document.getElementById("btnLoadBios"),
  btnResetEmulator: document.getElementById("btnResetEmulator"),
  btnDownloadAsm: document.getElementById("btnDownloadAsm"),
  btnDownloadMap: document.getElementById("btnDownloadMap"),
  btnDownloadSymbols: document.getElementById("btnDownloadSymbols"),
  btnDownloadListing: document.getElementById("btnDownloadListing"),
  btnPreviewColecoTitle: document.getElementById("btnPreviewColecoTitle"),
  btnPreviewDinaTitle: document.getElementById("btnPreviewDinaTitle"),
  btnCopyAsm: document.getElementById("btnCopyAsm"),
  btnOpenAssembler: document.getElementById("btnOpenAssembler"),
  btnViewGeneratedAsm: document.getElementById("btnViewGeneratedAsm"),
  btnViewExpandedAsm: document.getElementById("btnViewExpandedAsm"),
  btnViewOptimizedAsm: document.getElementById("btnViewOptimizedAsm"),
  btnViewMemoryMap: document.getElementById("btnViewMemoryMap"),
  btnToggleAsm: document.getElementById("btnToggleAsm"),
  btnShowAsm: document.getElementById("btnShowAsm"),
  layoutEl: document.querySelector(".layout"),
  topbarMenu: document.querySelector(".topbar__menu--quiet"),
  optimizationMenu: document.querySelector(".topbar__menu--opt"),
  optimizationSummary: document.getElementById("optimizationSummary"),
  optimizationChoices: document.querySelectorAll("[data-opt-level]"),
  btnOpenExamples: document.getElementById("btnOpenExamples"),
  examplesDialog: document.getElementById("examplesDialog"),
  currentExampleSummary: document.getElementById("currentExampleSummary"),
  exampleSearchInput: document.getElementById("exampleSearchInput"),
  exampleCategorySelect: document.getElementById("exampleCategorySelect"),
  exampleTagSelect: document.getElementById("exampleTagSelect"),
  exampleSelect: document.getElementById("exampleSelect"),
  btnLoadExample: document.getElementById("btnLoadExample"),
  exampleDetail: document.getElementById("exampleDetail"),
  exampleMeta: document.getElementById("exampleMeta"),
  projectPanelTabProject: document.getElementById("projectPanelTabProject"),
  projectPanelTabFiles: document.getElementById("projectPanelTabFiles"),
  projectPanelTabDocs: document.getElementById("projectPanelTabDocs"),
  projectPanelProject: document.getElementById("projectPanelProject"),
  projectPanelFiles: document.getElementById("projectPanelFiles"),
  projectPanelDocs: document.getElementById("projectPanelDocs"),
  projectFilesSummary: document.getElementById("projectFilesSummary"),
  projectFilesList: document.getElementById("projectFilesList"),
  docsSelect: document.getElementById("docsSelect"),
  docsSearch: document.getElementById("docsSearch"),
  docsStatus: document.getElementById("docsStatus"),
  docsContent: document.getElementById("docsContent"),
  btnDocsRefresh: document.getElementById("btnDocsRefresh"),
  btnAddProjectFile: document.getElementById("btnAddProjectFile"),
  btnNewTileSet: document.getElementById("btnNewTileSet"),
  btnNewBitmap: document.getElementById("btnNewBitmap"),
  btnProjectAudio: document.getElementById("btnProjectAudio"),
  btnProjectPicture: document.getElementById("btnProjectPicture"),
  libResolution: document.getElementById("libResolution"),
  ramWindow: document.getElementById("ramWindow"),
  ramUsed: document.getElementById("ramUsed"),
  ramFree: document.getElementById("ramFree"),
  ramDetail: document.getElementById("ramDetail"),
  projectName: document.getElementById("projectName"),
  optimizationHint: document.getElementById("optimizationHint"),
  projectGraph: document.getElementById("projectGraph"),
  sourceEditor: document.getElementById("sourceEditor"),
  sourceAutocomplete: document.getElementById("sourceAutocomplete"),
  asmEditor: document.getElementById("asmEditor"),
  asmViewHint: document.getElementById("asmViewHint"),
  emulatorMeta: document.getElementById("emulatorMeta"),
  emulatorHost: document.getElementById("emulatorHost"),
  emulatorPlaceholder: document.getElementById("emulatorPlaceholder"),
  emulatorFrame: document.getElementById("emulatorFrame"),
  statusSummary: document.getElementById("statusSummary"),
  statusDetails: document.getElementById("statusDetails"),
  status: document.getElementById("status"),
  fileImport: document.getElementById("fileImport"),
  projectFileImport: document.getElementById("projectFileImport"),
  biosImport: document.getElementById("biosImport"),
  studioView: document.getElementById("studioView"),
  btnWavConverter: document.getElementById("btnWavConverter"),
  wavConverterDialog: document.getElementById("wavConverterDialog"),
  wavFile: document.getElementById("wavFile"),
  btnWavQuickAddFile: document.getElementById("btnWavQuickAddFile"),
  btnWavRecordStart: document.getElementById("btnWavRecordStart"),
  btnWavRecordStop: document.getElementById("btnWavRecordStop"),
  btnWavUseRecording: document.getElementById("btnWavUseRecording"),
  btnWavQuickAddRecording: document.getElementById("btnWavQuickAddRecording"),
  wavRecordStatus: document.getElementById("wavRecordStatus"),
  wavRecordingPreview: document.getElementById("wavRecordingPreview"),
  wavStep: document.getElementById("wavStep"),
  wavStepValue: document.getElementById("wavStepValue"),
  wavSampleRateHint: document.getElementById("wavSampleRateHint"),
  wavAmp: document.getElementById("wavAmp"),
  wavLabel: document.getElementById("wavLabel"),
  btnWavConvert: document.getElementById("btnWavConvert"),
  wavStatus: document.getElementById("wavStatus"),
  wavOutputWrap: document.getElementById("wavOutputWrap"),
  wavStats: document.getElementById("wavStats"),
  wavDsoundPreview: document.getElementById("wavDsoundPreview"),
  wavOutput: document.getElementById("wavOutput"),
  btnWavPreviewOutput: document.getElementById("btnWavPreviewOutput"),
  btnWavCopyOutput: document.getElementById("btnWavCopyOutput"),
  btnWavInsertIntoEditor: document.getElementById("btnWavInsertIntoEditor"),
  btnWavSaveProjectFile: document.getElementById("btnWavSaveProjectFile"),
  btnWavSaveAndInsertPlay: document.getElementById("btnWavSaveAndInsertPlay"),
};

const STORAGE_KEY = "alexis_studio_project_v1";
const LEGACY_WARRIOR_TEMPLATE_MARKER = "project \"RLE Picture Demo\"";
const STUDIO_SOURCE_LANG = "pseudo_alexis";
const STUDIO_MEMORY_PROFILE = manifest.defaults?.memoryProfile || "colecovision_legacy_sdcc";
let compiledRom = null;
let compiledMemoryMap = "";
let compiledSymbols = "";
let compiledListing = "";
let expandedAsm = "";
let asmViewMode = "generated";
let exampleCategoryFilter = "all";
let exampleTagFilter = "all";
let emulatorRomObjectUrl = "";
let exampleSearchFilter = "";
let autocompleteItems = [];
let autocompleteIndex = 0;
let autocompleteWordStart = 0;
let autocompleteWordEnd = 0;
let lastStatusText = "";
let lastLibResolution = null;
let emulatorBios = null;
let emulatorBiosName = "";
let emulatorBiosSourceUrl = "";
let emulatorWindow = null;
let insightRefreshTimer = 0;
let compiledColecoHeaderInfo = null;
let sourceCartridgeMeta = null;

const {
  updateOptimizationHint,
  updatePreviewActions,
  refreshSourceCartridgeMeta
} = createPreviewShellHelpers({
  els,
  getProject: () => project,
  getOptimizationProfile,
  optimizationLevels: OPTIMIZATION_LEVELS,
  getCompiledColecoHeaderInfo: () => compiledColecoHeaderInfo,
  getCompiledRom: () => compiledRom,
  getSourceCartridgeMeta: () => sourceCartridgeMeta,
  transpileSource: (...args) => transpileSource(...args),
  studioSourceLang: STUDIO_SOURCE_LANG,
  getCartridgeNormalizationWarning,
  setSourceCartridgeMeta: (next) => { sourceCartridgeMeta = next; },
  setStatus: (...args) => setStatus(...args)
});


function setupProjectPanelTabs() {
  const tabs = [
    { button: els.projectPanelTabProject, panel: els.projectPanelProject },
    { button: els.projectPanelTabFiles, panel: els.projectPanelFiles },
    { button: els.projectPanelTabDocs, panel: els.projectPanelDocs }
  ];
  if (tabs.some((tab) => !tab.button || !tab.panel)) return;

  function activate(targetButton) {
    for (const tab of tabs) {
      const active = tab.button === targetButton;
      tab.button.classList.toggle("side-tab--active", active);
      tab.button.setAttribute("aria-selected", active ? "true" : "false");
      tab.panel.classList.toggle("hidden", !active);
    }
  }

  for (const tab of tabs) {
    tab.button.addEventListener("click", () => activate(tab.button));
  }
}


function getExampleById(id) {
  return exampleCatalog.find((item) => item.id === id) || null;
}

function getExampleManifestById(id) {
  return exampleManifest.find((item) => item.id === id) || null;
}

function getManifestLabels(section, ids = []) {
  const entries = Array.isArray(manifest?.[section]) ? manifest[section] : [];
  const labels = new Map(entries.map((item) => [item.id, item.label || item.id]));
  return ids.map((id) => labels.get(id) || id);
}

const {
  getExampleTagOrder,
  getFilteredExampleManifest,
  renderExampleMeta,
  renderExamplePicker
} = createExamplePickerHelpers({
  els,
  exampleCatalog,
  exampleManifest,
  getManifestLabels,
  getExampleManifestById,
  getProjectSourceText: () => project.sourceText,
  getExampleCategoryFilter: () => exampleCategoryFilter,
  getExampleTagFilter: () => exampleTagFilter,
  getExampleSearchFilter: () => exampleSearchFilter
});

function stripAmyInlineComment(rawLine) {
  const text = String(rawLine || "");
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === "\"") {
      if (inString && text[index + 1] === "\"") {
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "'" || ch === ";") return text.slice(0, index).trimEnd();
    if ((ch === "r" || ch === "R") && text.slice(index, index + 3).toLowerCase() === "rem") {
      const prev = index === 0 ? "" : text[index - 1];
      const next = index + 3 >= text.length ? "" : text[index + 3];
      const prevOk = !prev || /\s/.test(prev);
      const nextOk = !next || /\s/.test(next);
      if (prevOk && nextOk) return text.slice(0, index).trimEnd();
    }
  }
  return text;
}

const autocompleteController = createAutocompleteController({
  els,
  stripAmyInlineComment,
  isSupportedSourceTypeName: isAutocompleteSourceTypeName,
  autocompleteCommandBias,
  AMY_AUTOCOMPLETE,
  getState: () => ({
    autocompleteItems,
    autocompleteIndex,
    autocompleteWordStart,
    autocompleteWordEnd
  }),
  setState: (next) => {
    if (Object.prototype.hasOwnProperty.call(next, "autocompleteItems")) autocompleteItems = next.autocompleteItems;
    if (Object.prototype.hasOwnProperty.call(next, "autocompleteIndex")) autocompleteIndex = next.autocompleteIndex;
    if (Object.prototype.hasOwnProperty.call(next, "autocompleteWordStart")) autocompleteWordStart = next.autocompleteWordStart;
    if (Object.prototype.hasOwnProperty.call(next, "autocompleteWordEnd")) autocompleteWordEnd = next.autocompleteWordEnd;
  },
  onSourceMutated: (nextText) => {
    project.sourceText = nextText;
    expandedAsm = "";
    asmViewMode = "generated";
    clearCompiledArtifacts();
    refreshSourceCartridgeMeta(project.sourceText);
    saveProjectToStorage(project);
  },
  onScheduleInsightsRefresh: () => {
    scheduleEditorInsightsRefresh();
  }
});

const {
  closeAutocomplete,
  applyAutocomplete,
  syncAutocompleteSelection,
  updateAutocomplete
} = autocompleteController;

function scheduleEditorInsightsRefresh() {
  clearTimeout(insightRefreshTimer);
  insightRefreshTimer = window.setTimeout(() => {
    refreshEditorInsights();
  }, 120);
}

function closeTopbarMenu() {
  if (els.topbarMenu) els.topbarMenu.open = false;
  if (els.optimizationMenu) els.optimizationMenu.open = false;
}

const {
  setStatus,
  renderLibraryResolution,
  getAsmViewState,
  buildRamSummary,
  renderRamSummary,
  updateStatusPanel,
  refreshEditorInsights,
  syncAsmEditor,
  codecStatusLine
} = createStatusAsmUiHelpers({
  els,
  getLastStatusText: () => lastStatusText,
  setLastStatusText: (next) => { lastStatusText = next; },
  getLastLibResolution: () => lastLibResolution,
  getAsmViewMode: () => asmViewMode,
  getExpandedAsm: () => expandedAsm,
  getCompiledListing: () => compiledListing,
  getCompiledMemoryMap: () => compiledMemoryMap,
  getProject: () => project,
  transpileSource: (...args) => transpileSource(...args),
  inferAmyMemoryCapabilities,
  sourceHintsTinySound,
  studioSourceLang: STUDIO_SOURCE_LANG,
  studioMemoryProfile: STUDIO_MEMORY_PROFILE,
  getRamLayout,
  formatHex16,
  formatRamBytes,
  getCompressionCatalog
});

const {
  defaultSourceText,
  newProject,
  buildProjectFromExample,
  migrateProject,
  loadProject,
  ensureProjectFilePathCandidate,
  saveProjectToStorage,
  refreshProjectGraph,
  exportProject,
  importProjectObject
} = createProjectBridgeHelpers({
  manifestDefaults: manifest.defaults,
  sourceLang: STUDIO_SOURCE_LANG,
  memoryProfile: STUDIO_MEMORY_PROFILE,
  defaultSourceTextCore,
  newProjectCore,
  buildProjectFromExampleCore,
  migrateProjectCore,
  loadProjectCore,
  ensureProjectFilePathCandidateCore,
  saveProjectToStorageCore,
  refreshProjectGraphCore,
  exportProjectCore,
  importProjectObjectCore,
  storageKey: STORAGE_KEY,
  localStorageObj: localStorage,
  legacyWarriorTemplateMarker: LEGACY_WARRIOR_TEMPLATE_MARKER,
  exampleSources,
  normalizeProjectFiles,
  normalizeProjectFilePath,
  normalizeOptimizationLevel,
  getProject: () => project
});

const {
  updateEmulatorUi,
  revokeEmulatorRomObjectUrl,
  bytesToObjectUrl,
  resetEmbeddedEmulator,
  clearCompiledArtifacts,
  buildEmulatorSrcdoc,
  runEmbeddedEmulator,
  tryAutoLoadBios,
  setView
} = createEmulatorShellHelpers({
  els,
  getCompiledRom: () => compiledRom,
  setCompiledRom: (next) => { compiledRom = next; },
  getCompiledMemoryMap: () => compiledMemoryMap,
  setCompiledMemoryMap: (next) => { compiledMemoryMap = next; },
  getCompiledSymbols: () => compiledSymbols,
  setCompiledSymbols: (next) => { compiledSymbols = next; },
  getCompiledListing: () => compiledListing,
  setCompiledListing: (next) => { compiledListing = next; },
  getCompiledColecoHeaderInfo: () => compiledColecoHeaderInfo,
  setCompiledColecoHeaderInfo: (next) => { compiledColecoHeaderInfo = next; },
  getEmulatorBios: () => emulatorBios,
  setEmulatorBios: (next) => { emulatorBios = next; },
  getEmulatorBiosName: () => emulatorBiosName,
  setEmulatorBiosName: (next) => { emulatorBiosName = next; },
  getEmulatorBiosSourceUrl: () => emulatorBiosSourceUrl,
  setEmulatorBiosSourceUrl: (next) => { emulatorBiosSourceUrl = next; },
  getEmulatorWindow: () => emulatorWindow,
  setEmulatorWindow: (next) => { emulatorWindow = next; },
  getEmulatorRomObjectUrl: () => emulatorRomObjectUrl,
  setEmulatorRomObjectUrl: (next) => { emulatorRomObjectUrl = next; },
  getProject: () => project,
  updatePreviewActions,
  refreshProjectGraph,
  setStatus,
  getActiveEmulatorBackend,
  resolveEmulatorBackendUrls,
  bytesToDataUrl,
  defaultBiosCandidates: DEFAULT_BIOS_CANDIDATES
});

const transpileSource = (sourceLang, sourceText) => transpileAmySource({
  sourceLang,
  sourceText,
  transpileAmy,
  lexZ80Source,
  summarizeTokens
});
function transpileAmy(sourceText) {
  return transpileAmyCore(sourceText, {
    rewriteImmediateByteTempCoordinateUsesCore,
    inferAmyMemoryCapabilities,
    sourceHintsTinySound,
    getRamLayout,
    emitSafeCallCore,
    parseCartridgeDirectiveCore,
    parseExpressionAstCore,
    renderExpressionAstCore,
    createTypeSymbolHelpers,
    createProcHelpers,
    createValueParseHelpers,
    createExpressionComputeHelpers,
    createRuntimeValueHelpers,
    createCompareLiteralHelpers,
    createPrintHelpers,
    createBcdHelpers,
    createControlFlowHelpers,
    createCompilerShellHelpers,
    createDataHelpers,
    createLoadStoreHelpers,
    createByteLoadHelpers,
    createAddressHelpers,
    createU32Helpers,
    createFx16Helpers,
    createSimpleArithmeticHelpers,
    createAssignmentArithmeticHelpers,
    scanAmyFirstPass,
    handleDataMetaStatement,
    handleDeclarationStatement,
    handleProcFunctionStatement,
    handleDisplayGraphicsSpriteStatement,
    handleSoundSpinnerStatement,
    handleVramTextStatement,
    handlePrintFormatStatement,
    handleVramPixelInputStatement,
    handleDataCursorStatement,
    handleWhileStatement,
    handleDoStatement,
    handleIfStatement,
    handleSelectCaseStatement,
    handleForStatement,
    handleRandomBounceStatement,
    handleSpecialIfGotoStatement,
    handleDispatchLabelStatement,
    handleRoutineStatement,
    handleMutateStatement,
    handleMathBitStatement,
    handleArrayBulkStatement,
    createInlineStatementCompiler,
    finalizeAmyTranspile,
    stripAmyInlineComment
  });
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function openAssembler() {
  // If the user has the project laid out like on Amy's Desktop, this relative path works.
  // Otherwise, the user can open their AmysCVAssembly HTML manually.
  const p = manifest.assembler.amysCvAssemblyDefaultPath.replace(/\\/g, "/");
  window.open(p, "_blank", "noopener,noreferrer");
}

let project = loadProject();

const projectFileAddons = createProjectFileAddonBundle();

const {
  insertProjectFileAssetSnippet,
  insertProjectFilePlaySnippet,
  createNewTileSetProjectFiles,
  createNewBitmapProjectFiles,
  upsertProjectFile,
  removeProjectFile,
  renderProjectFiles,
  addImportedProjectFiles
} = createProjectFileUiHelpers({
  els,
  getProject: () => project,
  setProjectFiles: (files) => { project.projectFiles = files; },
  clearCompiledArtifacts,
  saveProjectToStorage,
  insertTextIntoSource: (...args) => insertTextIntoSource(...args),
  setStatus: (...args) => setStatus(...args),
  ensureProjectFilePathCandidate,
  assetNameFromProjectPath,
  normalizeProjectFilePath,
  normalizeProjectFiles,
  fileKindFromPath,
  formatByteSize,
  projectFileBytes,
  bytesToBase64,
  dsoundBytesToPreviewSamples,
  cvSampleRate,
  detectCodecFromName,
  decompressBytes,
  compressBytes,
  ...projectFileAddons
});

const docsUi = createDocsUi({
  els,
  setStatus: (...args) => setStatus(...args)
});

const {
  commitProjectSourceText,
  insertTextIntoSource,
  syncUiFromProject
} = createProjectEditorUiHelpers({
  els,
  getProject: () => project,
  setProject: (next) => { project = next; },
  getExpandedAsm: () => expandedAsm,
  setExpandedAsm: (next) => { expandedAsm = next; },
  getAsmViewMode: () => asmViewMode,
  setAsmViewMode: (next) => { asmViewMode = next; },
  getExampleCategoryFilter: () => exampleCategoryFilter,
  getExampleTagFilter: () => exampleTagFilter,
  getExampleSearchFilter: () => exampleSearchFilter,
  exampleCategoryOrder,
  exampleManifest,
  clearCompiledArtifacts,
  refreshSourceCartridgeMeta,
  saveProjectToStorage,
  updateAutocomplete,
  updateOptimizationHint,
  scheduleEditorInsightsRefresh,
  renderExamplePicker,
  getExampleTagOrder,
  renderProjectFiles,
  renderLibraryResolution,
  closeAutocomplete,
  syncAsmEditor,
  refreshEditorInsights,
  refreshProjectGraph,
  updateEmulatorUi
});

function bindEvents() {
  bindStudioShellEvents({
    bindAsmViewEvents,
    bindTopUiEvents,
    bindStudioRuntimeEvents,
    args: {
      els,
      projectState: {
        getProject: () => project,
        setProject: (next) => { project = next; }
      },
      autocompleteState: {
        get: () => ({
          autocompleteItems,
          autocompleteIndex,
          autocompleteWordStart,
          autocompleteWordEnd
        }),
        set: (next) => {
          if (Object.prototype.hasOwnProperty.call(next, "autocompleteItems")) autocompleteItems = next.autocompleteItems;
          if (Object.prototype.hasOwnProperty.call(next, "autocompleteIndex")) autocompleteIndex = next.autocompleteIndex;
          if (Object.prototype.hasOwnProperty.call(next, "autocompleteWordStart")) autocompleteWordStart = next.autocompleteWordStart;
          if (Object.prototype.hasOwnProperty.call(next, "autocompleteWordEnd")) autocompleteWordEnd = next.autocompleteWordEnd;
        }
      },
      helpers: {
        normalizeOptimizationLevel,
        renderExamplePicker,
        renderExampleMeta,
        getExampleById,
        buildProjectFromExample,
        clearCompiledArtifacts,
        closeTopbarMenu,
        closeAutocomplete,
        updateAutocomplete,
        syncAutocompleteSelection,
        applyAutocomplete,
        refreshProjectGraph,
        refreshSourceCartridgeMeta,
        saveProjectToStorage,
        updateOptimizationHint,
        scheduleEditorInsightsRefresh,
        syncUiFromProject,
        setStatus: (...args) => setStatus(...args),
        newProject,
        expandAsmIncludes,
        syncAsmEditor,
        importProjectObject,
        exportProject,
        downloadText,
        transpileSource: (...args) => transpileSource(...args),
        analyzeLibraryResolution,
        updatePreviewActions,
        generateAsm,
        renderLibraryResolution,
        appendCartridgeNormalizationWarning,
        compileGeneratedAsm,
        getOptimizationProfile,
        inspectColecoBinary,
        updateEmulatorUi,
        previewColecoBiosTitleScreen,
        previewColecoBiosTitleFromMetadata,
        previewDinaBiosTitleScreen,
        previewDinaBiosTitleFromMetadata,
        runEmbeddedEmulator,
        resetEmbeddedEmulator,
        downloadBinary,
        copyText,
        openAssembler,
        cvSampleRate,
        wavToDsound,
        audioBufferToDsound,
        dsoundBytesToPreviewSamples,
        insertTextIntoSource: (...args) => insertTextIntoSource(...args),
        ensureProjectFilePathCandidate,
        upsertProjectFile,
        bytesToBase64,
        createNewTileSetProjectFiles,
        createNewBitmapProjectFiles,
        addImportedProjectFiles
      },
      runtime: {
        getExpandedAsm: () => expandedAsm,
        setExpandedAsm: (next) => { expandedAsm = next; },
        getAsmViewMode: () => asmViewMode,
        setAsmViewMode: (next) => { asmViewMode = next; },
        setLastLibResolution: (next) => { lastLibResolution = next; },
        setExampleCategoryFilter: (next) => { exampleCategoryFilter = next; },
        setExampleTagFilter: (next) => { exampleTagFilter = next; },
        setExampleSearchFilter: (next) => { exampleSearchFilter = next; },
        setSourceCartridgeMeta: (next) => { sourceCartridgeMeta = next; },
        getSourceCartridgeMeta: () => sourceCartridgeMeta,
        setCompiledOutputs: ({ compiledRom: nextRom, compiledMemoryMap: nextMap, compiledSymbols: nextSymbols, compiledListing: nextListing, compiledColecoHeaderInfo: nextHeader }) => {
          compiledRom = nextRom;
          compiledMemoryMap = nextMap;
          compiledSymbols = nextSymbols;
          compiledListing = nextListing;
          compiledColecoHeaderInfo = nextHeader;
        },
        getCompiledRom: () => compiledRom,
        setEmulatorBios: ({ bytes, name, sourceUrl }) => {
          emulatorBios = bytes;
          emulatorBiosName = name;
          emulatorBiosSourceUrl = sourceUrl;
        },
        getCompiledMemoryMap: () => compiledMemoryMap,
        getCompiledSymbols: () => compiledSymbols,
        getCompiledListing: () => compiledListing
      },
      constants: {
        studioSourceLang: STUDIO_SOURCE_LANG
      }
    }
  });
}

setupProjectPanelTabs();
docsUi.bind();
bindEvents();

(function setupAsmPanelToggle() {
  const layout = els.layoutEl;
  const STORAGE_KEY = "alexis_asm_panel_collapsed";
  function setCollapsed(collapsed) {
    layout.classList.toggle("layout--asm-collapsed", collapsed);
    try { localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); } catch (_) {}
  }
  if (els.btnToggleAsm) els.btnToggleAsm.addEventListener("click", () => setCollapsed(true));
  if (els.btnShowAsm) els.btnShowAsm.addEventListener("click", () => setCollapsed(false));
  try { if (localStorage.getItem(STORAGE_KEY) !== "0") setCollapsed(true); } catch (_) {}
})();

syncUiFromProject();
setView("studio");
setStatus(`Ready. ${codecStatusLine()}\nTip: Generate ASM, then compile the ROM in Amy.`);
tryAutoLoadBios();
