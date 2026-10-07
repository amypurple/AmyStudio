import { getEditorAdapter } from "./editor/editorAdapter.js";
import { previewColecoSoundEvents } from "./colecoSoundPreview.js?v=20260907-selection";
import { buildPsgSoundAsm, convertSamplesToPsgSound, psgSoundToPreviewEvents } from "./wavToPsgSound.js";
import { buildAdamBootDataPack, buildAdamBootDisk, buildAdamExpansionDataPack, buildAdamExpansionDisk, buildAdamNativeProgramDataPack, buildAdamNativeProgramDisk } from "./adamDiskImage.js?v=20261001-native-multiblock1";
import { projectFileBytes } from "./utils/projectFiles.js";
import { buildMegaCartProject, projectFileContentFingerprint } from "./megaCartProjectBuild.js?v=20261007-incremental-bank1";
import { buildMegaCartImportTrampolines } from "./megaCartTrampolines.js?v=20261006-bank-imports1";
import { formatMegaCartDebuggerSymbols } from "./megaCartLinkMap.js?v=20261007-bank-debug-symbols1";
import { resolveAmyBuildContext } from "./projectTargets.js";

export const PROJECT_FILE_PATTERN = /(?:\.amy)?\.json(?:\.gz)?$/i;

export async function readProjectFileText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) return new TextDecoder().decode(bytes);
  if (typeof DecompressionStream !== "function") {
    throw new Error("This browser cannot decompress gzip project files.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function buildTranspileWarningNote(result) {
  const warnings = Array.isArray(result?.warnings) ? result.warnings.filter(Boolean) : [];
  if (!warnings.length) return "";
  return ` Hints: ${warnings.length}.`;
}

export function bindTopUiEvents(ctx) {
  const sourceEditor = getEditorAdapter(ctx.els.sourceEditor);
  let sourceAutosaveTimer = 0;
  let sourceAutosaveProject = null;
  function flushSourceAutosave() {
    if (!sourceAutosaveProject) return;
    clearTimeout(sourceAutosaveTimer);
    const project = sourceAutosaveProject;
    sourceAutosaveProject = null;
    saveProjectToStorage(project);
  }
  function scheduleSourceAutosave(project) {
    sourceAutosaveProject = project;
    clearTimeout(sourceAutosaveTimer);
    sourceAutosaveTimer = setTimeout(flushSourceAutosave, 500);
  }

  const {
    els,
    normalizeOptimizationLevel,
    renderExamplePicker,
    renderExampleMeta,
    getExampleById,
    ensureExamplesLoaded,
    buildProjectFromExample,
    clearCompiledArtifacts,
    closeTopbarMenu,
    closeAutocomplete,
    updateAutocomplete,
    syncAutocompleteSelection,
    applyAutocomplete,
    getAutocompleteState,
    setAutocompleteState,
    refreshProjectGraph,
    refreshSourceCartridgeMeta,
    saveProjectToStorage,
    updateOptimizationHint,
    scheduleEditorInsightsRefresh,
    syncUiFromProject,
    setStatus,
    newProject,
    createProjectFromTemplate,
    openProjectInTab,
    openExampleInTab,
    getProject,
    setProject,
    setLastLibResolution,
    getExpandedAsm,
    setExpandedAsm,
    getAsmViewMode,
    setAsmViewMode,
    createNewTileSetProjectFiles,
    createNewBitmapProjectFiles,
  } = ctx;

  window.addEventListener("beforeunload", flushSourceAutosave);


  els.projectName.addEventListener("input", () => {
    const project = getProject();
    project.projectName = els.projectName.value.trim() || "amy-project";
    saveProjectToStorage(project);
    refreshProjectGraph();
  });

  els.optimizationChoices?.forEach((button) => button.addEventListener("click", () => {
    const project = getProject();
    project.optimizationLevel = normalizeOptimizationLevel(button.dataset.optLevel || "auto");
    clearCompiledArtifacts();
    saveProjectToStorage(project);
    updateOptimizationHint();
    scheduleEditorInsightsRefresh();
    if (els.optimizationMenu) els.optimizationMenu.open = false;
  }));

  els.exampleCategorySelect?.addEventListener("change", () => {
    ctx.setExampleCategoryFilter(els.exampleCategorySelect.value || "all");
    renderExamplePicker();
  });
  els.exampleTagSelect?.addEventListener("change", () => {
    ctx.setExampleTagFilter(els.exampleTagSelect.value || "all");
    renderExamplePicker();
  });
  els.exampleSearchInput?.addEventListener("input", () => {
    ctx.setExampleSearchFilter(els.exampleSearchInput.value || "");
    renderExamplePicker();
  });
  const openExamples = async () => {
    closeTopbarMenu();
    if (typeof ensureExamplesLoaded === "function") {
      try {
        setStatus("Loading examples...");
        await ensureExamplesLoaded({ forceFresh: false });
        setStatus("Examples ready.");
      } catch (error) {
        setStatus(`Cannot load examples: ${error?.message || error}`);
      }
    }
    els.examplesDialog?.showModal();
  };
  els.btnOpenExamples?.addEventListener("click", openExamples);
  els.btnOpenExamplesMenu?.addEventListener("click", openExamples);
  els.exampleSelect.addEventListener("change", () => {
    renderExampleMeta(els.exampleSelect.value);
  });
  els.btnLoadExample.addEventListener("click", async () => {
    flushSourceAutosave();
    const exampleId = els.exampleSelect.value;
    if (exampleId) setStatus("Loading example...");
    let example = null;
    try {
      example = await getExampleById(exampleId);
    } catch (error) {
      setStatus(`Cannot load examples: ${error?.message || error}`);
      return;
    }
    if (!example) {
      setStatus("Choose an example first.");
      return;
    }
    const nextProject = buildProjectFromExample(example);
    nextProject.exampleId = example.id;
    const result = openExampleInTab(nextProject, { clean: true });
    setStatus(result.reused ? `Already open: ${example.label}` : `Loaded: ${example.label}`);
    syncUiFromProject();
    els.examplesDialog?.close();
    closeAutocomplete();
    closeTopbarMenu();
  });

  els.sourceEditor.addEventListener("input", () => {
    const project = getProject();
    const nextText = sourceEditor.getText();
    if (ctx.getActiveSourceFilePath?.()) ctx.updateActiveSourceDocument?.(nextText);
    else project.sourceText = nextText;
    setExpandedAsm("");
    setAsmViewMode("generated");
    clearCompiledArtifacts();
    if (!ctx.getActiveSourceFilePath?.()) refreshSourceCartridgeMeta(project.sourceText);
    scheduleSourceAutosave(project);
    if (ctx.isActiveAmySource?.() !== false) updateAutocomplete();
    else closeAutocomplete();
    updateOptimizationHint();
    scheduleEditorInsightsRefresh();
  });

  function toggleSelectedSourceComments() {
    const text = sourceEditor.getText();
    const selection = sourceEditor.getSelection();
    const selectionStart = selection.start;
    const selectionEnd = selection.end;
    const lineStart = text.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
    let lineEnd = text.indexOf("\n", selectionEnd);
    if (lineEnd < 0) lineEnd = text.length;
    const selectedBlock = text.slice(lineStart, lineEnd);
    const lines = selectedBlock.split("\n");
    const nonBlankLines = lines.filter((line) => line.trim().length);
    const shouldUncomment = nonBlankLines.length > 0 && nonBlankLines.every((line) => /^\s*' ?/.test(line));
    const nextLines = lines.map((line) => {
      if (!line.trim()) return line;
      if (shouldUncomment) return line.replace(/^(\s*)' ?/, "$1");
      return line.replace(/^(\s*)/, "$1' ");
    });
    const replacement = nextLines.join("\n");
    sourceEditor.replaceRange(replacement, lineStart, lineEnd, {
      selection: { start: lineStart, end: lineStart + replacement.length }
    });
  }

  els.sourceEditor.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.code === "Slash") {
      event.preventDefault();
      closeAutocomplete();
      toggleSelectedSourceComments();
      return;
    }
    if (event.ctrlKey && event.code === "Space") {
      event.preventDefault();
      if (ctx.isActiveAmySource?.() === false) return;
      updateAutocomplete({ force: true });
      return;
    }
    if (els.sourceAutocomplete.classList.contains("hidden")) return;
    const state = getAutocompleteState();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAutocompleteState({
        autocompleteIndex: Math.min(state.autocompleteItems.length - 1, state.autocompleteIndex + 1)
      });
      syncAutocompleteSelection();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setAutocompleteState({
        autocompleteIndex: Math.max(0, state.autocompleteIndex - 1)
      });
      syncAutocompleteSelection();
      return;
    }
    if (event.key === "Tab" || event.key === "Enter") {
      const item = state.autocompleteItems[state.autocompleteIndex];
      if (!item) return;
      event.preventDefault();
      applyAutocomplete(item);
      refreshProjectGraph();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeAutocomplete();
    }
  });

  els.sourceEditor.addEventListener("click", () => {
    closeAutocomplete();
  });
  els.sourceEditor.addEventListener("blur", () => {
    setTimeout(() => closeAutocomplete(), 100);
  });

  function selectedNewProjectTarget() {
    return els.newProjectDialog?.querySelector('input[name="newProjectTarget"]:checked')?.value || "cartridge";
  }
  function updateNewProjectDialog() {
    const target = selectedNewProjectTarget();
    const adam = target.startsWith("adam-");
    els.newProjectMediumField.hidden = !adam;
    els.newProjectSupportNote.textContent = adam
      ? "Experimental ADAM target: the project structure is preserved, but native build coverage is still expanding."
      : target === "megacart"
        ? "Experimental bank-switched cartridge target."
        : target === "sgm"
          ? "Experimental Super Game Module target with AY-3-8910 sound and expanded RAM capabilities."
          : "Creates a regular ColecoVision cartridge project.";
  }
  els.newProjectDialog?.querySelectorAll('input[name="newProjectTarget"]').forEach((input) => {
    input.addEventListener("change", updateNewProjectDialog);
  });
  els.btnNew.addEventListener("click", () => {
    els.newProjectName.value = "amy-project";
    updateNewProjectDialog();
    els.newProjectDialog?.showModal();
    closeTopbarMenu();
  });
  els.btnCreateProject?.addEventListener("click", () => {
    const templateId = selectedNewProjectTarget();
    const next = createProjectFromTemplate(newProject(), {
      templateId,
      projectName: els.newProjectName.value,
      medium: els.newProjectMedium.value
    });
    openProjectInTab(next, { clean: true });
    refreshSourceCartridgeMeta(next.sourceText);
    syncUiFromProject();
    els.newProjectDialog.close();
    setStatus(`New ${templateId.startsWith("adam-") ? "ADAM" : "ColecoVision"} project: ${next.projectName}.`);
  });

  els.btnOpen.addEventListener("click", () => {
    els.fileImport.value = "";
    els.fileImport.click();
    closeTopbarMenu();
  });

  els.btnReloadExample?.addEventListener("click", async () => {
    flushSourceAutosave();
    const example = await getExampleById(els.exampleSelect.value);
    if (!example) {
      setStatus("Choose an example first.");
      return;
    }
    const nextProject = buildProjectFromExample(example);
    nextProject.exampleId = example.id;
    const result = openExampleInTab(nextProject, { clean: true, reload: true });
    if (result.cancelled) return;
    syncUiFromProject();
    setStatus(result.reloaded ? `Restored: ${example.label}` : `Loaded: ${example.label}`);
    els.examplesDialog?.close();
    closeAutocomplete();
    closeTopbarMenu();
  });

  els.btnAddProjectFile?.addEventListener("click", () => {
    els.projectFileImport.value = "";
    els.projectFileImport.accept = "";
    els.projectFileImport.multiple = true;
    els.projectFileImport.click();
  });

  els.btnNewTileSet?.addEventListener("click", () => {
    createNewTileSetProjectFiles?.();
  });

  els.btnNewBitmap?.addEventListener("click", () => {
    createNewBitmapProjectFiles?.();
  });

  els.btnProjectPicture?.addEventListener("click", () => {
    els.projectFileImport.value = "";
    els.projectFileImport.accept = ".png,.bmp,.gif,.jpg,.jpeg,.webp,.pc,.sc2,image/*";
    els.projectFileImport.multiple = false;
    els.projectFileImport.click();
  });
}

export function bindStudioRuntimeEvents(ctx) {
  const megaCartIncrementalCache = new Map();
  const adamMediaIncrementalCache = new Map();
  let compiledAdamDisk = null;
  let compiledAdamExtension = ".dsk";
  const {
    els,
    importProjectObject,
    clearCompiledArtifacts,
    syncUiFromProject,
    closeTopbarMenu,
    setStatus,
    getProject,
    setProject,
    setExpandedAsm,
    setAsmViewMode,
    exportProject,
    downloadText,
    transpileSource,
    STUDIO_SOURCE_LANG,
    analyzeLibraryResolution,
    setLastLibResolution,
    setSourceCartridgeMeta,
    updatePreviewActions,
    generateAsm,
    buildSourceMarkedAsm,
    renderLibraryResolution,
    saveProjectToStorage,
    refreshProjectGraph,
    renderProjectFiles,
    appendCartridgeNormalizationWarning,
    getSourceCartridgeMeta,
    getExpandedAsm,
    getAsmViewMode,
    compileGeneratedAsm,
    getOptimizationProfile,
    inspectColecoBinary,
    setCompiledOutputs,
    syncAsmEditor,
    updateEmulatorUi,
    previewColecoBiosTitleScreen,
    previewColecoBiosTitleFromMetadata,
    previewDinaBiosTitleScreen,
    previewDinaBiosTitleFromMetadata,
    getCompiledRom,
    runEmbeddedEmulator,
    setEmulatorBios,
    resetEmbeddedEmulator,
    downloadBinary,
    getCompiledMemoryMap,
    getCompiledSymbols,
    getCompiledListing,
    copyText,
    expandAsmIncludes,
    cvSampleRate,
    wavToDsound,
    audioBufferToDsound,
    dsoundBytesToPreviewSamples,
    samplesToThreeChannelPcm,
    threeChannelPcmBytesToPreviewSamples,
    encodeVoxPcmSegments,
    voxPcmToPreviewSamples,
    voxPcmSequenceAsm,
    decodeAudioBufferToMono,
    parseWavAudio,
    insertTextIntoSource,
    ensureProjectFilePathCandidate,
    upsertProjectFile,
    bytesToBase64,
    addImportedProjectFiles,
    openProjectInTab,
    markActiveProjectClean
  } = ctx;

  let wavRecordStream = null;
  let wavMediaRecorder = null;
  let wavRecordedChunks = [];
  let wavRecordedBlob = null;
  let wavRecordedObjectUrl = "";
  let wavPsgPreview = null;
  let wavPsgBuilt = null;
  let wavDigitalKind = "dsound";
  let wavVoxPcmResult = null;

  function setWavRecordingIdleState(message = "No recording yet.") {
    if (els.btnWavRecordStart) els.btnWavRecordStart.disabled = false;
    if (els.btnWavRecordStop) els.btnWavRecordStop.disabled = true;
    if (els.btnWavUseRecording) els.btnWavUseRecording.disabled = !wavRecordedBlob;
    if (els.btnWavQuickAddRecording) els.btnWavQuickAddRecording.disabled = !wavRecordedBlob;
    if (els.wavRecordStatus) els.wavRecordStatus.textContent = message;
  }

  function clearRecordedPreview() {
    if (wavRecordedObjectUrl) {
      URL.revokeObjectURL(wavRecordedObjectUrl);
      wavRecordedObjectUrl = "";
    }
    if (els.wavRecordingPreview) {
      els.wavRecordingPreview.hidden = true;
      els.wavRecordingPreview.removeAttribute("src");
      els.wavRecordingPreview.load?.();
    }
  }

  let wavDsoundPreviewObjectUrl = "";
  let wavDsoundPreviewSampleRate = 0;

  function clearDsoundPreview() {
    if (wavDsoundPreviewObjectUrl) {
      URL.revokeObjectURL(wavDsoundPreviewObjectUrl);
      wavDsoundPreviewObjectUrl = "";
    }
    wavDsoundPreviewSampleRate = 0;
    if (els.wavDsoundPreview) {
      els.wavDsoundPreview.pause?.();
      els.wavDsoundPreview.currentTime = 0;
      els.wavDsoundPreview.hidden = true;
      els.wavDsoundPreview.removeAttribute("src");
      els.wavDsoundPreview.load?.();
    }
  }

  function encodePreviewWav(samples, sampleRate) {
    const frameCount = samples.length;
    const dataSize = frameCount * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeTag = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeTag(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeTag(8, "WAVE");
    writeTag(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeTag(36, "data");
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < frameCount; i += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[i] || 0));
      view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  async function updateDsoundPreview(bytes, sampleRate) {
    clearDsoundPreview();
    if (!bytes?.length || !els.wavDsoundPreview) return;
    const previewSamples = wavDigitalKind === "tripcm"
      ? await threeChannelPcmBytesToPreviewSamples(bytes)
      : await dsoundBytesToPreviewSamples(bytes);
    const wavBlob = encodePreviewWav(previewSamples, sampleRate);
    wavDsoundPreviewObjectUrl = URL.createObjectURL(wavBlob);
    wavDsoundPreviewSampleRate = sampleRate;
    els.wavDsoundPreview.src = wavDsoundPreviewObjectUrl;
    els.wavDsoundPreview.hidden = false;
  }

  function updateRecordedPreview(blob) {
    clearRecordedPreview();
    if (!blob) return;
    wavRecordedObjectUrl = URL.createObjectURL(blob);
    if (els.wavRecordingPreview) {
      els.wavRecordingPreview.src = wavRecordedObjectUrl;
      els.wavRecordingPreview.hidden = false;
    }
  }

  function stopRecordingTracks() {
    if (wavRecordStream) {
      for (const track of wavRecordStream.getTracks()) track.stop();
      wavRecordStream = null;
    }
  }

  function parseCurrentDsoundBytes() {
    const source = els.wavOutput.value.trim();
    if (!source) return null;
    const bytes = source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^data\s+/i.test(line) && !/^end\s+data$/i.test(line))
      .join(",")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => Number.parseInt(token.replace(/^\$/, ""), 16))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 0xFF);
    return bytes.length ? bytes : null;
  }

  function saveCurrentDigitalProjectFile() {
    const label = els.wavLabel.value.trim() || "SoundData";
    const bytes = parseCurrentDsoundBytes();
    const step = parseInt(els.wavStep.value, 10) || 0;
    const ampPercent = parseInt(els.wavAmp.value, 10) || 125;
    if (!bytes) {
      els.wavStatus.textContent = "No digital audio bytes available yet.";
      return null;
    }
    const path = ensureProjectFilePathCandidate(`${label}.${wavDigitalKind}`);
    upsertProjectFile({
      path,
      base64: bytesToBase64(Uint8Array.from(bytes)),
      kind: wavDigitalKind,
      source: wavDigitalKind === "tripcm" ? "wavToTriPcm" : "wavToDsound",
      dsoundStep: step,
      dsoundAmpPercent: ampPercent,
      tripcmGainPercent: wavDigitalKind === "tripcm" ? ampPercent : undefined,
      tripcmDither: wavDigitalKind === "tripcm" ? Boolean(els.wavTriPcmDither?.checked) : undefined
    });
    return { label, path, step, ampPercent };
  }

  function insertSavedDigitalSnippet(saved) {
    const snippet = [
      `asset ${saved.label} from "${saved.path}"`,
      wavDigitalKind === "tripcm"
        ? `play tripcm ${saved.label}`
        : `play dsound ${saved.label}${saved.step ? ` step ${saved.step}` : ""}`
    ].join("\n");
    insertTextIntoSource(snippet, { beforeProcedures: true });
  }

  async function saveCurrentVoxPcmProject() {
    if (!wavVoxPcmResult?.parts?.length) {
      els.wavStatus.textContent = "Convert audio to VoxPCM first.";
      return null;
    }
    const label = els.wavLabel.value.trim() || "VoiceData";
    const savedParts = wavVoxPcmResult.parts.map((part, index) => {
      const path = ensureProjectFilePathCandidate(`${label}-${String(index + 1).padStart(3, "0")}.voxpcm`);
      upsertProjectFile({ path, base64: bytesToBase64(part.bytes), kind: "voxpcm", source: `VoxPCM ${part.quality}` });
      return { ...part, label: `${label}Part${index + 1}`, path };
    });
    const assets = savedParts.map(part => `asset ${part.label} from "${part.path}"`);
    const table = await voxPcmSequenceAsm(label, savedParts, { loop: false });
    insertTextIntoSource(`${assets.join("\n")}\n\nplay voxpcm ${label}\n\nasm {\n${table}\n}`, { beforeProcedures: true });
    return { label, count: savedParts.length };
  }

  async function convertRecordingBlob(blob) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      throw new Error("This browser does not support AudioContext decoding.");
    }
    const audioContext = new AudioCtx();
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const step = parseInt(els.wavStep.value, 10);
      const ampPercent = parseInt(els.wavAmp.value, 10) || 125;
      const label = els.wavLabel.value.trim() || "SoundData";
      if (els.wavDigitalFormat?.value === "voxpcm") {
        const decoded = await decodeAudioBufferToMono(audioBuffer);
        return encodeVoxPcmSegments(decoded.samples, decoded.sampleRate, {
          segmentMilliseconds: Number(els.wavVoxPcmSegment.value), minimumQuality: els.wavVoxPcmMinimum.value,
          maximumQuality: els.wavVoxPcmMaximum.value, gainPercent: ampPercent,
          dither: Boolean(els.wavTriPcmDither?.checked), labelPrefix: `${label}Part`
        });
      }
      if (els.wavDigitalFormat?.value === "tripcm") {
        const decoded = await decodeAudioBufferToMono(audioBuffer);
        return await samplesToThreeChannelPcm(decoded.samples, decoded.sampleRate, { label, gainPercent: ampPercent, dither: Boolean(els.wavTriPcmDither?.checked) });
      }
      return await audioBufferToDsound(audioBuffer, { step, ampPercent, label });
    } finally {
      await audioContext.close();
    }
  }

  async function convertAudioFile(file) {
    const step = parseInt(els.wavStep.value, 10);
    const ampPercent = parseInt(els.wavAmp.value, 10) || 125;
    const label = els.wavLabel.value.trim() || "SoundData";
    if (els.wavDigitalFormat?.value === "voxpcm") {
      const decoded = await decodeAudioFile(file);
      return encodeVoxPcmSegments(decoded.samples, decoded.sampleRate, {
        segmentMilliseconds: Number(els.wavVoxPcmSegment.value), minimumQuality: els.wavVoxPcmMinimum.value,
        maximumQuality: els.wavVoxPcmMaximum.value, gainPercent: ampPercent,
        dither: Boolean(els.wavTriPcmDither?.checked), labelPrefix: `${label}Part`
      });
    }
    if (els.wavDigitalFormat?.value === "tripcm") {
      const decoded = await decodeAudioFile(file);
      return await samplesToThreeChannelPcm(decoded.samples, decoded.sampleRate, { label, gainPercent: ampPercent, dither: Boolean(els.wavTriPcmDither?.checked) });
    }
    const buffer = await file.arrayBuffer();
    const name = String(file.name || "").toLowerCase();
    const looksLikeWav = name.endsWith(".wav") || file.type === "audio/wav" || file.type === "audio/x-wav";
    if (looksLikeWav) {
      try {
        return await wavToDsound(buffer, { step, ampPercent, label });
      } catch {
        // Fall through to browser audio decoding for non-PCM or unusual WAV variants.
      }
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      throw new Error("This browser does not support AudioContext decoding.");
    }
    const audioContext = new AudioCtx();
    try {
      const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
      return await audioBufferToDsound(audioBuffer, { step, ampPercent, label });
    } finally {
      await audioContext.close();
    }
  }

  async function renderDsoundResult(result, statusText = "Done.") {
    wavDigitalKind = ["tripcm", "voxpcm"].includes(els.wavDigitalFormat?.value) ? els.wavDigitalFormat.value : "dsound";
    wavVoxPcmResult = wavDigitalKind === "voxpcm" ? result : null;
    wavPsgPreview = null;
    wavPsgBuilt = null;
    if (wavDigitalKind === "voxpcm") {
      els.wavOutput.value = `${result.parts.length} project files will be created.\n\n${await voxPcmSequenceAsm(els.wavLabel.value.trim() || "VoiceData", result.parts, { loop: false })}`;
      els.wavStats.textContent = `${result.parts.length} adaptive parts · ${result.durationSeconds.toFixed(2)}s · ${result.byteCount.toLocaleString()} bytes encoded`;
      els.wavOutputWrap.classList.add("visible");
      clearDsoundPreview();
      const wavBlob = encodePreviewWav(await voxPcmToPreviewSamples(result.parts), 22050);
      wavDsoundPreviewObjectUrl = URL.createObjectURL(wavBlob);
      wavDsoundPreviewSampleRate = 22050;
      els.wavDsoundPreview.src = wavDsoundPreviewObjectUrl;
      els.wavDsoundPreview.hidden = false;
      els.wavStatus.textContent = statusText;
      return;
    }
    els.wavOutput.value = result.alexisSource;
    els.wavStats.textContent =
      `${(result.nibbleCount ?? result.unitCount).toLocaleString()} samples · ` +
      `${result.sampleRate.toLocaleString()} Hz · ` +
      `${result.durationSec.toFixed(2)}s · ` +
      `${result.byteCount.toLocaleString()} bytes encoded` +
      (wavDigitalKind === "tripcm" ? ` · ${result.gainPercent}% gain · ${result.dither ? "dithered" : "no dither"}` : "");
    els.wavOutputWrap.classList.add("visible");
    await updateDsoundPreview(result.bytes, result.sampleRate);
    els.wavStatus.textContent = statusText;
  }

  async function quickAddDsoundFromResult(result, statusText = "Saved and inserted playback snippet.") {
    await renderDsoundResult(result, statusText);
    if (wavDigitalKind === "voxpcm") {
      const saved = await saveCurrentVoxPcmProject();
      if (!saved) return;
      els.wavConverterDialog.close();
      setStatus(`Saved ${saved.count} VoxPCM parts and inserted play voxpcm ${saved.label}.`);
      return;
    }
    const saved = saveCurrentDigitalProjectFile();
    if (!saved) return;
    insertSavedDigitalSnippet(saved);
    els.wavConverterDialog.close();
    setStatus(`Saved ${saved.path} and inserted play ${wavDigitalKind} snippet.`);
  }

  async function importProjectFile(file) {
    if (!file) return;
    if (!PROJECT_FILE_PATTERN.test(file.name || "")) {
      setStatus("Import failed: choose an .amy.json, .json, or gzip-compressed JSON project.");
      return;
    }
    try {
      const text = await readProjectFileText(file);
      const obj = JSON.parse(text);
      openProjectInTab(importProjectObject(obj), { clean: true });
      setStatus(`Imported: ${getProject().projectName}`);
      syncUiFromProject();
      closeTopbarMenu();
    } catch (e) {
      setStatus(`Import failed: ${String(e.message || e)}`);
    }
  }

  async function decodeAudioFile(file) {
    const buffer = await file.arrayBuffer();
    if (/\.wav$/i.test(file.name || "") || /audio\/wav/i.test(file.type || "")) {
      try { return await parseWavAudio(buffer); } catch {}
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error("This browser cannot decode this audio file.");
    const context = new AudioCtx();
    try {
      return await decodeAudioBufferToMono(await context.decodeAudioData(buffer.slice(0)));
    } finally {
      await context.close();
    }
  }

  async function convertFileToGameSfx(file) {
    const decoded = await decodeAudioFile(file);
    const result = convertSamplesToPsgSound(decoded.samples, decoded.sampleRate, {
      region: els.wavPsgRegion?.value || "NTSC",
      maxVoices: Number(els.wavPsgVoices?.value || 2),
      allowNoise: Boolean(els.wavPsgNoise?.checked),
      variableNoise: "auto",
      speechMode: Boolean(els.wavPsgSpeech?.checked)
    });
    if (!result.usedVoices) throw new Error("No audible game-sound voice was detected.");
    wavPsgBuilt = buildPsgSoundAsm(result, { label: els.wavLabel.value.trim() || "ImportedSound" });
    wavPsgPreview = { events: psgSoundToPreviewEvents(result), region: result.region };
    els.wavOutput.value = `asm {\n${wavPsgBuilt.asm}\n}`;
    const support = result.usedVoices - result.audibleVoices;
    els.wavStats.textContent = `${result.audibleVoices} audible voice${result.audibleVoices === 1 ? "" : "s"}${support ? ` + ${support} noise-clock slot` : ""} · ${result.frameCount} ${result.region} frames · ${result.streams.reduce((sum, stream) => sum + stream.bytes.length, 0)} sound bytes`;
    els.wavOutputWrap.classList.add("visible");
    els.wavDsoundPreview.hidden = true;
    els.wavStatus.textContent = "Game SFX ready. Replay it before inserting.";
  }

  els.fileImport.addEventListener("change", async () => {
    const file = els.fileImport.files && els.fileImport.files[0];
    await importProjectFile(file);
    els.fileImport.value = "";
  });

  const studioDropTarget = document.getElementById("studioView");
  let projectDragDepth = 0;
  studioDropTarget?.addEventListener("dragenter", (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    projectDragDepth += 1;
    studioDropTarget.classList.add("is-project-dragover");
  });
  studioDropTarget?.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  studioDropTarget?.addEventListener("dragleave", () => {
    projectDragDepth = Math.max(0, projectDragDepth - 1);
    if (!projectDragDepth) studioDropTarget.classList.remove("is-project-dragover");
  });
  studioDropTarget?.addEventListener("drop", async (event) => {
    event.preventDefault();
    projectDragDepth = 0;
    studioDropTarget.classList.remove("is-project-dragover");
    const files = [...(event.dataTransfer?.files || [])];
    const projectFile = files.find((file) => PROJECT_FILE_PATTERN.test(file.name || ""));
    if (projectFile) await importProjectFile(projectFile);
    else setStatus("Drop an .amy.json, .json, or gzip-compressed JSON project here.");
  });

  els.projectFileImport?.addEventListener("change", async () => {
    const files = els.projectFileImport.files;
    if (!files?.length) return;
    try {
      await addImportedProjectFiles(files);
    } catch (e) {
      setStatus(`Project file import failed: ${String(e.message || e)}`);
    }
  });

  els.btnSave.addEventListener("click", () => {
    const project = getProject();
    const out = exportProject(project);
    downloadText(`${project.projectName}.amy.json`, JSON.stringify(out, null, 2));
    markActiveProjectClean?.();
    setStatus("Exported project.");
    closeTopbarMenu();
  });

  const rebuildAsmFromSource = () => {
    const project = getProject();
    const manifest = projectBuildManifest(project);
    let buildContext;
    try {
      buildContext = resolveAmyBuildContext(project, manifest);
    } catch (error) {
      setStatus(error.message || String(error));
      return null;
    }
    const res = transpileSource(STUDIO_SOURCE_LANG, project.sourceText, { buildContext });
    if (!res.ok) {
      setStatus(res.log);
      return null;
    }
    setLastLibResolution(analyzeLibraryResolution(project, res.asmBody));
    setSourceCartridgeMeta(res.metadata?.cartridge || null);
    updatePreviewActions();
    project.generatedAsm = generateAsm(project, res.asmBody, res.assets || [], res.metadata || {});
    setExpandedAsm("");
    setAsmViewMode("generated");
    if (!els.layoutEl?.classList.contains("layout--asm-collapsed")) syncAsmEditor();
    renderLibraryResolution();
    saveProjectToStorage(project);
    return { project, res, buildContext };
  };

  function projectFile(project, path) {
    const wanted = String(path).replace(/^@project\//i, "").toLowerCase();
    return (project.projectFiles || []).find((file) => String(file.path || "").replace(/^@project\//i, "").toLowerCase() === wanted) || null;
  }

  function adamDiskManifest(project) {
    const file = projectFile(project, "project.amy.json");
    if (!file) return null;
    try {
      const manifest = JSON.parse(new TextDecoder().decode(projectFileBytes(file)));
      return ["adam-disk", "adam-data-pack"].includes(manifest?.target?.platform) ? manifest : null;
    } catch { return null; }
  }

  function projectBuildManifest(project) {
    const file = projectFile(project, "project.amy.json");
    if (!file) return null;
    try {
      return JSON.parse(new TextDecoder().decode(projectFileBytes(file)));
    } catch {
      return null;
    }
  }

  function hasAdamDiskSources(project) {
    return Boolean(projectFile(project, "src/boot.asm")
      && projectFile(project, "src/expansion-loader.asm")
      && projectFile(project, "packs/history.wepk")
      && projectFile(project, "packs/milestones.wepk"));
  }

  els.btnTranspile.addEventListener("click", () => {
    const built = rebuildAsmFromSource();
    if (!built) return;
    clearCompiledArtifacts();
    setStatus(appendCartridgeNormalizationWarning(built.res.log, getSourceCartridgeMeta()));
    closeTopbarMenu();
  });

  els.btnGenerate.addEventListener("click", () => {
    const built = rebuildAsmFromSource();
    if (!built) return;
    clearCompiledArtifacts();
    setStatus(appendCartridgeNormalizationWarning(`ASM generated.${buildTranspileWarningNote(built.res)}`, getSourceCartridgeMeta()));
    closeTopbarMenu();
  });

  els.btnCompile.addEventListener("click", async () => {
    const built = rebuildAsmFromSource();
    if (!built) return;
    const project = built.project;
      const buildContext = built.buildContext;
    refreshProjectGraph();
    const asm = project.generatedAsm.trimEnd();

    clearCompiledArtifacts();
    compiledAdamDisk = null;
    setStatus("Compiling with AmysCVAssembly...");

    try {
      const optimizationProfile = getOptimizationProfile(project.optimizationLevel || "auto", project.sourceText || "");
      let asmForCompile = asm;
      let sourceMapNote = "";
      if (["off", "safe", "balanced", "aggressive", "experimental"].includes(optimizationProfile.effectiveLevel)) {
        const markedBuild = buildSourceMarkedAsm(project, asm, built.res);
        if (markedBuild.ok) asmForCompile = markedBuild.asm.trimEnd();
        else sourceMapNote = ` Source debugging unavailable: ${markedBuild.reason}`;
      } else {
        sourceMapNote = " Source debugging is unavailable for this unknown optimization profile.";
      }
      const fixedCompileOptions = {
          optimizerEnabled: optimizationProfile.optimizerEnabled,
          optimizerConfig: optimizationProfile.optimizerConfig,
          projectFiles: project.projectFiles || [],
          amyTarget: buildContext.platform,
          memoryProfile: buildContext.memoryProfile
      };
      const buildManifest = projectBuildManifest(project);
      const isMegaCartBuild = buildManifest?.target?.platform === "colecovision-megacart";
      let result = null;
      let megaCartBuild = null;
      const compileFixed = async ({ linkMap } = {}) => {
        const imports = built.res.metadata?.megaCart?.imports || [];
        const trampolines = isMegaCartBuild
          ? buildMegaCartImportTrampolines({
              imports,
              currentBankLabel: built.res.metadata?.megaCart?.currentBankLabel,
              linkMap
            })
          : "";
        result = await compileGeneratedAsm(
          `${asmForCompile}${trampolines}`,
          `${project.projectName || "main"}.asm`,
          fixedCompileOptions
        );
        if (!result.ok) throw new Error(result.log);
        return {
          bytes: result.binary,
          symbols: result.symbols,
          sourceDebugMap: result.sourceDebugMap
        };
      };
      if (isMegaCartBuild) {
        megaCartBuild = await buildMegaCartProject({
          project,
          manifest: buildManifest,
          fixedBank: null,
          incrementalCache: megaCartIncrementalCache,
          buildSignature: `megacart-bank-v1:${buildContext.memoryProfile || ""}`,
          compileFixed,
          compileAmyBank: async (source, filename, bankInfo) => {
            const bankContext = {
              platform: "colecovision-megacart-bank",
              memoryProfile: buildContext.memoryProfile,
              capabilities: ["os7", "megacart", "bank-local"],
              romSizeKb: buildContext.romSizeKb,
              bank: bankInfo.bank
            };
            const transpiled = transpileAmy(source, { buildContext: bankContext });
            if (!transpiled.ok) throw new Error(`${filename} failed:\n${transpiled.log}`);
            if (transpiled.assets?.length) {
              throw new Error(`${filename} uses external Amy assets. Bank-local asset placement is not available yet; place binary assets directly in the bank output.`);
            }
            return `org $C000\n${transpiled.asmBody}`;
          },
          compileAsm: async (source, filename) => {
            const assembled = await compileGeneratedAsm(source, filename, {
              optimizerEnabled: false,
              optimizerConfig: null,
              projectFiles: project.projectFiles || []
            });
            if (!assembled.ok) throw new Error(`${filename} failed:\n${assembled.log}`);
            return { bytes: assembled.binary, symbols: assembled.symbols, sourceDebugMap: assembled.sourceDebugMap };
          }
        });
      } else {
        try {
          await compileFixed();
        } catch (error) {
          setStatus(`Compile failed.\n${error?.message || error}`);
          return;
        }
      }
      if (!result?.ok) {
        setStatus(`Compile failed.\n${result?.log || "No fixed output was produced."}`);
        return;
      }
      let compiledRom = megaCartBuild?.image || result.binary;
      const compiledMemoryMap = result.memoryMap || "";
      const compiledSymbols = megaCartBuild
        ? formatMegaCartDebuggerSymbols(result.symbolsText || "", megaCartBuild.linkMap)
        : result.symbolsText || "";
      const compiledListing = result.listing || "";
      let megaCartNote = "";
      if (megaCartBuild) {
        compiledRom = megaCartBuild.image;
        const buildSignature = `megacart-bank-v1:${buildContext.memoryProfile || ""}`;
        project.incrementalBuildState = {
          failed: false,
          buildSignature,
          outputFingerprints: megaCartBuild.incremental?.outputFingerprints || {},
          fileFingerprints: Object.fromEntries((project.projectFiles || []).map((entry) => [
            String(entry.path || "").replace(/\\/g, "/").replace(/^@project\//i, "").toLowerCase().replace(/^/, "@project/"),
            projectFileContentFingerprint(entry)
          ]))
        };
        renderProjectFiles?.();
        const reused = megaCartBuild.incremental?.reusedOutputs || [];
        const cacheNote = reused.length ? ` Reused: ${reused.join(", ")}.` : "";
        megaCartNote = ` MegaCart ready: ${megaCartBuild.layout.sizeKb} KB, ${megaCartBuild.layout.bankCount} banks.${cacheNote}`;
      }
      const nativeEosBuild = buildContext.platform === "adam-native-program";
      const compiledColecoHeaderInfo = nativeEosBuild ? null : inspectColecoBinary(compiledRom);
      setCompiledOutputs({
        compiledRom,
        compiledAdamDisk: null,
        compiledMemoryMap,
        compiledSymbols,
        compiledListing,
        compiledColecoHeaderInfo,
        compiledMetadata: built.res.metadata || {}
      });
      const diskManifest = adamDiskManifest(project) || (hasAdamDiskSources(project) ? { target: { platform: "adam-disk" } } : null);
      let diskNote = "";
      if (nativeEosBuild) {
        const dataPackTarget = project?.target?.medium === "ddp" || buildManifest?.target?.medium === "ddp";
        const volume = project.projectName || "AMY EOS";
        const assembleNativeLoader = async (source, filename) => {
          const assembled = await compileGeneratedAsm(source, filename, {
            optimizerEnabled: false,
            optimizerConfig: null,
            projectFiles: project.projectFiles || []
          });
          if (!assembled.ok) throw new Error(`${filename} failed:\n${assembled.log}`);
          return assembled.binary;
        };
        const builtMedia = compiledRom.length <= 1024
          ? (dataPackTarget
              ? buildAdamBootDataPack({ boot: compiledRom, volume })
              : buildAdamBootDisk({ boot: compiledRom, volume }))
          : await (dataPackTarget ? buildAdamNativeProgramDataPack : buildAdamNativeProgramDisk)({
              program: compiledRom,
              volume,
              assemble: assembleNativeLoader,
              incrementalCache: adamMediaIncrementalCache,
              buildSignature: "adam-native-media-v1"
            });
        compiledAdamDisk = builtMedia.media;
        compiledAdamExtension = builtMedia.extension;
        const programNote = builtMedia.programBlocks
          ? `; program ${builtMedia.programBytes} bytes in ${builtMedia.programBlocks} blocks`
          : "";
        const reused = builtMedia.incremental?.reusedOutputs || [];
        const reuseNote = reused.length ? `; reused ${reused.join(", ")}` : "";
        diskNote = ` Native EOS ${dataPackTarget ? "data pack" : "disk"} ready: ${compiledAdamDisk.length} bytes; boot ${builtMedia.bootBytes} bytes${programNote}${reuseNote}.`;
        els.btnDownloadRom.textContent = "↓";
        els.btnDownloadRom.title = `Download bootable native EOS media (${compiledAdamExtension})`;
        els.btnDownloadRom.setAttribute("aria-label", `Download bootable native EOS media (${compiledAdamExtension})`);
      } else if (diskManifest) {
        const bootFile = projectFile(project, "src/boot.asm");
        const loaderFile = projectFile(project, "src/expansion-loader.asm");
        const famousFile = projectFile(project, "packs/famous.wepk");
        const capitalsFile = projectFile(project, "packs/capitals.wepk");
        const historyFile = projectFile(project, "packs/history.wepk");
        const milestonesFile = projectFile(project, "packs/milestones.wepk");
        if (!bootFile || !loaderFile || !famousFile || !capitalsFile || !historyFile || !milestonesFile) {
          throw new Error("ADAM disk target requires its boot, loader, and four WEPK files.");
        }
        const dataPackTarget = diskManifest.target?.platform === "adam-data-pack";
        const buildMedia = dataPackTarget ? buildAdamExpansionDataPack : buildAdamExpansionDisk;
        const builtDisk = await buildMedia({
          rom: compiledRom,
          famous: projectFileBytes(famousFile),
          capitals: projectFileBytes(capitalsFile),
          history: projectFileBytes(historyFile),
          milestones: projectFileBytes(milestonesFile),
          bootSource: new TextDecoder().decode(projectFileBytes(bootFile)),
          loaderSource: new TextDecoder().decode(projectFileBytes(loaderFile)),
          incrementalCache: adamMediaIncrementalCache,
          buildSignature: "adam-hybrid-media-v1",
          assemble: async (source, filename) => {
            const assembled = await compileGeneratedAsm(source, filename, {
              optimizerEnabled: false,
              optimizerConfig: null,
              projectFiles: project.projectFiles || []
            });
            if (!assembled.ok) throw new Error(`${filename} failed:\n${assembled.log}`);
            return assembled.binary;
          }
        });
        compiledAdamDisk = builtDisk.disk;
        compiledAdamExtension = builtDisk.extension;
        els.btnDownloadRom.textContent = "↓";
        els.btnDownloadRom.title = `Download bootable ADAM media (${compiledAdamExtension})`;
        els.btnDownloadRom.setAttribute("aria-label", `Download bootable ADAM media (${compiledAdamExtension})`);
        const reused = builtDisk.incremental?.reusedOutputs || [];
        const reuseNote = reused.length ? ` Reused: ${reused.join(", ")}.` : "";
        diskNote = ` ADAM ${dataPackTarget ? "data pack" : "disk"} ready: ${compiledAdamDisk.length} bytes; ${builtDisk.packs.map((pack) => `${pack.name} ${pack.bytes}`).join("; ")} bytes.${reuseNote}`;
      } else {
        els.btnDownloadRom.textContent = "⤓";
        els.btnDownloadRom.title = "Download .col";
        els.btnDownloadRom.setAttribute("aria-label", "Download .col");
      }
      setCompiledOutputs({
        compiledRom,
        compiledAdamDisk,
        compiledMemoryMap,
        compiledSymbols,
        compiledListing,
        compiledColecoHeaderInfo,
        compiledMetadata: built.res.metadata || {}
      });
      window.alexisLastMemoryMap = compiledMemoryMap;
      window.alexisLastSymbols = compiledSymbols;
      window.alexisLastListing = compiledListing;
      if (getAsmViewMode() === "optimized" || getAsmViewMode() === "memoryMap") syncAsmEditor();
      updatePreviewActions();
      updateEmulatorUi();
      if (!megaCartBuild && built.res.sourceDependencyGraph) {
        project.incrementalBuildState = {
          failed: false,
          sourceDependencyGraph: built.res.sourceDependencyGraph,
          fileFingerprints: Object.fromEntries((project.projectFiles || []).map((entry) => [
            String(entry.path || "").replace(/\\/g, "/").replace(/^@project\//i, "").toLowerCase().replace(/^/, "@project/"),
            projectFileContentFingerprint(entry)
          ]))
        };
        renderProjectFiles?.();
      }
      refreshProjectGraph();
      const symbols = result.stats?.symbolCount ?? Object.keys(result.symbols || {}).length;
      const optimizationNote = `, ${optimizationProfile.note}`;
      const previewNote = compiledColecoHeaderInfo?.valid && compiledColecoHeaderInfo?.usesDefaultScreen
        ? " BIOS previews available."
        : "";
      const targetNote = ` Target: ${buildContext.platform}${buildContext.warnings.length ? ` (${buildContext.warnings.join(" ")})` : ""}.`;
      setStatus(appendCartridgeNormalizationWarning(`Compile OK: ${compiledRom.length} bytes, ${symbols} symbols${optimizationNote}.${targetNote}${previewNote}${megaCartNote}${diskNote}${sourceMapNote}${buildTranspileWarningNote(built.res)}`, getSourceCartridgeMeta()));
      closeTopbarMenu();
    } catch (e) {
      const failedProject = getProject();
      if (failedProject?.target?.platform === "colecovision-megacart") {
        failedProject.incrementalBuildState = { ...(failedProject.incrementalBuildState || {}), failed: true };
        renderProjectFiles?.();
      }
      setStatus(`Compile failed: ${String(e.message || e)}`);
    }
  });

  els.btnPreviewColecoTitle.addEventListener("click", () => {
    if ((getCompiledRom() && previewColecoBiosTitleScreen(getCompiledRom())) || (getSourceCartridgeMeta() && previewColecoBiosTitleFromMetadata(getSourceCartridgeMeta()))) {
      closeTopbarMenu();
      return;
    }
    setStatus("This ROM does not contain a Coleco BIOS title screen header.");
  });

  els.btnPreviewDinaTitle.addEventListener("click", () => {
    if ((getCompiledRom() && previewDinaBiosTitleScreen(getCompiledRom())) || (getSourceCartridgeMeta() && previewDinaBiosTitleFromMetadata(getSourceCartridgeMeta()))) {
      closeTopbarMenu();
      return;
    }
    setStatus("No valid cartridge title metadata is available to preview.");
  });

  els.btnRunEmulator.addEventListener("click", () => {
    runEmbeddedEmulator();
  });

  els.btnLoadBios.addEventListener("click", () => {
    els.biosImport.value = "";
    els.biosImport.click();
  });

  els.biosImport.addEventListener("change", async () => {
    const file = els.biosImport.files && els.biosImport.files[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== 8192) {
      setStatus(`Invalid ColecoVision BIOS: expected 8192 bytes, got ${bytes.length}.`);
      return;
    }
    try {
      setEmulatorBios({
        bytes,
        name: file.name || "colecovision.rom",
        sourceUrl: ""
      });
      updateEmulatorUi();
      setStatus(`Loaded BIOS ${file.name || "colecovision.rom"}. It is stored only in this browser.`);
    } catch (error) {
      setStatus(`Could not store BIOS locally: ${String(error?.message || error)}`);
    }
  });

  els.btnResetEmulator.addEventListener("click", () => {
    resetEmbeddedEmulator({ preserveBios: true });
    setStatus("Emulator reset. BIOS kept in memory.");
  });

  els.btnDownloadRom.addEventListener("click", () => {
    if (compiledAdamDisk) {
      const filename = `${getProject().projectName || "amy"}${compiledAdamExtension}`;
      downloadBinary(filename, compiledAdamDisk);
      setStatus(`Downloaded ${filename} (${compiledAdamDisk.length} bytes).`);
      closeTopbarMenu();
      return;
    }
    const compiledRom = getCompiledRom();
    if (!compiledRom) {
      setStatus("No compiled ROM yet. Click Compile ROM first.");
      return;
    }
    const filename = `${getProject().projectName || "amy"}.col`;
    downloadBinary(filename, compiledRom);
    setStatus(`Downloaded ${filename} (${compiledRom.length} bytes).`);
    closeTopbarMenu();
  });

  async function ensureExpandedStandaloneAsm() {
    const project = getProject();
    const generatedAsm = (project.generatedAsm || "").trimEnd();
    if (!generatedAsm) return "";
    if (!getExpandedAsm()) {
      setExpandedAsm(await expandAsmIncludes(generatedAsm, { projectFiles: project.projectFiles || [] }));
    }
    return getExpandedAsm().trimEnd();
  }

  els.btnDownloadAsm.addEventListener("click", async () => {
    const project = getProject();
    let asm = "";
    try {
      asm = await ensureExpandedStandaloneAsm();
    } catch (e) {
      setStatus(`Expand failed: ${String(e.message || e)}`);
      return;
    }
    if (!asm) {
      setStatus("Nothing to download. Click Generate ASM first.");
      return;
    }
    downloadText(`${project.projectName}.asm`, asm + "\n");
    setStatus("Downloaded expanded .asm.");
    closeTopbarMenu();
  });

  els.btnDownloadMap.addEventListener("click", () => {
    const compiledMemoryMap = getCompiledMemoryMap();
    if (!compiledMemoryMap) {
      setStatus("No memory map yet. Compile ROM first.");
      return;
    }
    downloadText(`${getProject().projectName || "amy"}.map`, compiledMemoryMap.replace(/\s+$/, "") + "\n");
    setStatus("Downloaded .map.");
    closeTopbarMenu();
  });

  els.btnDownloadSymbols?.addEventListener("click", () => {
    const compiledSymbols = getCompiledSymbols?.();
    if (!compiledSymbols) {
      setStatus("No symbols yet. Compile ROM first.");
      return;
    }
    downloadText(`${getProject().projectName || "amy"}.sym`, compiledSymbols.replace(/\s+$/, "") + "\n");
    setStatus("Downloaded .sym for emulator debugging.");
    closeTopbarMenu();
  });

  els.btnDownloadListing.addEventListener("click", () => {
    const compiledListing = getCompiledListing();
    if (!compiledListing) {
      setStatus("No listing yet. Compile ROM first.");
      return;
    }
    downloadText(`${getProject().projectName || "amy"}.lst`, compiledListing.replace(/\s+$/, "") + "\n");
    setStatus("Downloaded .lst.");
    closeTopbarMenu();
  });

  els.btnCopyAsm.addEventListener("click", async () => {
    let asm = "";
    try {
      asm = await ensureExpandedStandaloneAsm();
    } catch (e) {
      setStatus(`Expand failed: ${String(e.message || e)}`);
      return;
    }
    if (!asm) {
      setStatus("Nothing to copy. Click Generate ASM first.");
      return;
    }
    try {
      await copyText(asm + "\n");
      setStatus("Expanded ASM copied.");
      closeTopbarMenu();
    } catch (e) {
      setStatus(`Copy failed: ${String(e)}`);
    }
  });

  els.btnWavConverter.addEventListener("click", () => {
    closeTopbarMenu();
    els.wavConverterDialog.showModal();
  });

  els.btnOpenGraphicsEditors?.addEventListener("click", () => {
    closeTopbarMenu();
    const openEditors = ctx.openGraphicsEditorsFromProject || window.__amyStudioGraphicsEditors?.open;
    if (typeof openEditors !== "function") {
      setStatus("Graphics editor command is not wired in this Studio build.");
      return;
    }
    openEditors();
  });

  els.btnCreateEditorsJson?.addEventListener("click", () => {
    closeTopbarMenu();
    const createEditors = ctx.createEditorsJsonProjectFile || window.__amyStudioGraphicsEditors?.create;
    if (typeof createEditors !== "function") {
      setStatus("Create editors.json command is not wired in this Studio build.");
      return;
    }
    createEditors({ open: true });
  });

  els.btnScanEditorsJson?.addEventListener("click", () => {
    closeTopbarMenu();
    const scanEditors = ctx.scanEditorsJsonProjectFile || window.__amyStudioGraphicsEditors?.scan;
    if (typeof scanEditors !== "function") {
      setStatus("Scan editors.json command is not wired in this Studio build.");
      return;
    }
    scanEditors({ open: true });
  });

  els.btnProjectAudio?.addEventListener("click", () => {
    closeTopbarMenu();
    els.wavConverterDialog.showModal();
  });

  els.wavConverterDialog?.addEventListener("close", () => {
    if (wavMediaRecorder?.state === "recording") {
      wavMediaRecorder.stop();
    }
    stopRecordingTracks();
  });

  els.wavStep.addEventListener("input", () => {
    const step = parseInt(els.wavStep.value, 10);
    els.wavStepValue.textContent = step;
    const rate = Math.round(cvSampleRate(step));
    els.wavSampleRateHint.textContent = `~${rate.toLocaleString()} Hz at step ${step}`;
  });

  function syncDigitalFormatControls() {
    const tripcm = els.wavDigitalFormat.value === "tripcm";
    const voxpcm = els.wavDigitalFormat.value === "voxpcm";
    els.wavStep.disabled = tripcm || voxpcm;
    els.wavStep.closest(".field")?.classList.toggle("field--disabled", tripcm || voxpcm);
    if (els.wavTriPcmDither) {
      els.wavTriPcmDither.disabled = !(tripcm || voxpcm);
      els.wavTriPcmDither.closest(".field")?.classList.toggle("field--disabled", !(tripcm || voxpcm));
    }
    if (els.wavVoxPcmOptions) els.wavVoxPcmOptions.hidden = !voxpcm;
    if (els.btnWavInsertIntoEditor) els.btnWavInsertIntoEditor.disabled = voxpcm;
    if (els.btnWavSaveProjectFile) els.btnWavSaveProjectFile.disabled = voxpcm;
    els.wavStatus.textContent = voxpcm ? "VoxPCM adapts quality by segment and blocks during playback."
      : tripcm ? "TriPCM uses three tone channels. Input gain is applied before encoding."
      : "DSOUND uses three tone channels and blocks during playback.";
  }

  els.wavDigitalFormat?.addEventListener("change", syncDigitalFormatControls);
  syncDigitalFormatControls();

  els.btnWavConvert.addEventListener("click", async () => {
    const file = els.wavFile.files[0];
    if (!file) {
      els.wavStatus.textContent = "Please select an audio file.";
      return;
    }
    els.wavStatus.textContent = "Converting…";
    els.btnWavConvert.disabled = true;
    try {
      const result = await convertAudioFile(file);
      await renderDsoundResult(result, "Done.");
    } catch (err) {
      els.wavStatus.textContent = `Error: ${err.message}`;
      els.wavOutputWrap.classList.remove("visible");
    } finally {
      els.btnWavConvert.disabled = false;
    }
  });

  els.btnWavQuickAddFile?.addEventListener("click", async () => {
    const file = els.wavFile.files[0];
    if (!file) {
      els.wavStatus.textContent = "Please select an audio file.";
      return;
    }
    els.wavStatus.textContent = "Converting and inserting…";
    els.btnWavQuickAddFile.disabled = true;
    try {
      const result = await convertAudioFile(file);
      await quickAddDsoundFromResult(result, "Audio converted.");
    } catch (err) {
      els.wavStatus.textContent = `Error: ${err.message || err}`;
      els.wavOutputWrap.classList.remove("visible");
    } finally {
      els.btnWavQuickAddFile.disabled = false;
    }
  });

  els.btnWavRecordStart?.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      els.wavRecordStatus.textContent = "Microphone recording is not supported in this browser.";
      return;
    }
    clearRecordedPreview();
    wavRecordedBlob = null;
    wavRecordedChunks = [];
    try {
      wavRecordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      wavMediaRecorder = new MediaRecorder(wavRecordStream);
      wavMediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size) wavRecordedChunks.push(event.data);
      };
      wavMediaRecorder.onstop = () => {
        stopRecordingTracks();
        wavRecordedBlob = wavRecordedChunks.length ? new Blob(wavRecordedChunks, { type: wavMediaRecorder.mimeType || "audio/webm" }) : null;
        updateRecordedPreview(wavRecordedBlob);
        setWavRecordingIdleState(wavRecordedBlob ? `Recording ready (${Math.round((wavRecordedBlob.size || 0) / 1024)} KB).` : "Recording stopped.");
      };
      wavMediaRecorder.start();
      els.btnWavRecordStart.disabled = true;
      els.btnWavRecordStop.disabled = false;
      els.btnWavUseRecording.disabled = true;
      els.wavRecordStatus.textContent = "Recording… speak into your microphone, then click Stop.";
    } catch (err) {
      stopRecordingTracks();
      setWavRecordingIdleState(`Microphone access failed: ${err.message || err}`);
    }
  });

  els.btnWavRecordStop?.addEventListener("click", () => {
    if (wavMediaRecorder?.state === "recording") {
      els.wavRecordStatus.textContent = "Stopping recording…";
      wavMediaRecorder.stop();
    }
  });

  els.btnWavUseRecording?.addEventListener("click", async () => {
    if (!wavRecordedBlob) {
      els.wavRecordStatus.textContent = "No recording available yet.";
      return;
    }
    els.wavStatus.textContent = "Converting recording…";
    els.btnWavUseRecording.disabled = true;
    try {
      const result = await convertRecordingBlob(wavRecordedBlob);
      await renderDsoundResult(result, "Recording converted.");
      els.wavRecordStatus.textContent = `Recording converted to ${wavDigitalKind}.`;
    } catch (err) {
      els.wavStatus.textContent = `Error: ${err.message || err}`;
      els.wavOutputWrap.classList.remove("visible");
    } finally {
      els.btnWavUseRecording.disabled = false;
    }
  });

  els.btnWavQuickAddRecording?.addEventListener("click", async () => {
    if (!wavRecordedBlob) {
      els.wavRecordStatus.textContent = "No recording available yet.";
      return;
    }
    els.wavStatus.textContent = "Converting and inserting recording…";
    els.btnWavQuickAddRecording.disabled = true;
    try {
      const result = await convertRecordingBlob(wavRecordedBlob);
      await quickAddDsoundFromResult(result, "Recording converted.");
      els.wavRecordStatus.textContent = "Recording converted and inserted.";
    } catch (err) {
      els.wavStatus.textContent = `Error: ${err.message || err}`;
      els.wavOutputWrap.classList.remove("visible");
    } finally {
      els.btnWavQuickAddRecording.disabled = false;
    }
  });

  setWavRecordingIdleState();

  els.btnWavCopyOutput.addEventListener("click", async () => {
    await copyText(els.wavOutput.value);
    els.wavStatus.textContent = "Copied to clipboard.";
  });

  els.btnWavPreviewOutput?.addEventListener("click", async () => {
    if (wavDigitalKind === "voxpcm" && wavVoxPcmResult) {
      await els.wavDsoundPreview?.play?.();
      els.wavStatus.textContent = "Playing converted VoxPCM preview.";
      return;
    }
    if (wavPsgPreview) {
      try {
        els.wavStatus.textContent = "Playing converted game sound...";
        await previewColecoSoundEvents(wavPsgPreview.events, { region: wavPsgPreview.region });
        els.wavStatus.textContent = "Replay complete.";
      } catch (error) {
        els.wavStatus.textContent = `Preview failed: ${error.message || error}`;
      }
      return;
    }
    const bytes = parseCurrentDsoundBytes();
    if (!bytes) {
      els.wavStatus.textContent = "Convert audio first.";
      return;
    }
    const sampleRate = wavDsoundPreviewSampleRate || (wavDigitalKind === "tripcm" ? 17500 : Math.trunc(cvSampleRate(parseInt(els.wavStep.value, 10) || 0)));
    await updateDsoundPreview(bytes, sampleRate);
    try {
      await els.wavDsoundPreview?.play?.();
      els.wavStatus.textContent = `Playing converted ${wavDigitalKind} preview.`;
    } catch {
      els.wavStatus.textContent = "Converted preview is ready below.";
    }
  });

  els.btnWavInsertIntoEditor.addEventListener("click", () => {
    const block = els.wavOutput.value;
    const insert = wavPsgBuilt ? `${wavPsgBuilt.setup}\n${wavPsgBuilt.play}\n\n${block}` : block;
    insertTextIntoSource(insert, { beforeProcedures: true });
    els.wavConverterDialog.close();
    setStatus(wavPsgBuilt
      ? `Inserted ${wavPsgBuilt.soundCount}-voice game sound and playback commands.`
      : `Inserted "${els.wavLabel.value.trim() || "SoundData"}" data block into source.`);
  });

  els.btnWavSaveProjectFile?.addEventListener("click", async () => {
    if (!els.wavOutput.value.trim()) {
      els.wavStatus.textContent = "Convert audio first.";
      return;
    }
    if (wavDigitalKind === "voxpcm") {
      const saved = await saveCurrentVoxPcmProject();
      if (saved) els.wavStatus.textContent = `Saved ${saved.count} VoxPCM parts and inserted the sequence.`;
      return;
    }
    const saved = saveCurrentDigitalProjectFile();
    if (!saved) return;
    els.wavStatus.textContent = `Saved ${saved.path} to project files.`;
  });

  els.btnWavSaveAndInsertPlay?.addEventListener("click", async () => {
    if (!els.wavOutput.value.trim()) {
      els.wavStatus.textContent = "Convert audio first.";
      return;
    }
    if (wavDigitalKind === "voxpcm") {
      const saved = await saveCurrentVoxPcmProject();
      if (!saved) return;
      els.wavConverterDialog.close();
      setStatus(`Saved ${saved.count} VoxPCM parts and inserted playback.`);
      return;
    }
    const saved = saveCurrentDigitalProjectFile();
    if (!saved) return;
    insertSavedDigitalSnippet(saved);
    els.wavConverterDialog.close();
    setStatus(`Saved ${saved.path} and inserted ${wavDigitalKind} playback.`);
  });

  els.btnWavConvertPsg?.addEventListener("click", async () => {
    const file = els.wavFile.files && els.wavFile.files[0];
    if (!file) {
      els.wavStatus.textContent = "Choose an audio file first.";
      return;
    }
    els.btnWavConvertPsg.disabled = true;
    els.wavStatus.textContent = "Analyzing tones and noise...";
    try {
      await convertFileToGameSfx(file);
    } catch (error) {
      els.wavStatus.textContent = `Error: ${error.message || error}`;
      els.wavOutputWrap.classList.remove("visible");
    } finally {
      els.btnWavConvertPsg.disabled = false;
    }
  });
}

export function bindAsmViewEvents(ctx) {
  const {
    els,
    getProject,
    getExpandedAsm,
    setExpandedAsm,
    getAsmViewMode,
    setAsmViewMode,
    syncAsmEditor,
    expandAsmIncludes,
    setStatus
  } = ctx;

  els.btnViewGeneratedAsm.addEventListener("click", () => {
    setAsmViewMode("generated");
    syncAsmEditor();
  });

  els.btnShowAsm?.addEventListener("click", syncAsmEditor);

  els.btnViewExpandedAsm.addEventListener("click", async () => {
    const asm = (getProject().generatedAsm || "").trimEnd();
    if (!asm) {
      setStatus("Nothing to expand. Generate ASM first.");
      return;
    }
    if (!getExpandedAsm()) {
      try {
        setExpandedAsm(await expandAsmIncludes(asm, { projectFiles: getProject().projectFiles || [] }));
      } catch (e) {
        setStatus(`Expand failed: ${String(e.message || e)}`);
        return;
      }
    }
    setAsmViewMode("expanded");
    syncAsmEditor();
  });

  els.btnViewOptimizedAsm.addEventListener("click", () => {
    setAsmViewMode("optimized");
    syncAsmEditor();
  });

  els.btnViewMemoryMap.addEventListener("click", () => {
    setAsmViewMode("memoryMap");
    syncAsmEditor();
  });
}
