function buildTranspileWarningNote(result) {
  const warnings = Array.isArray(result?.warnings) ? result.warnings.filter(Boolean) : [];
  if (!warnings.length) return "";
  return ` Hints: ${warnings.length}.`;
}

export function bindTopUiEvents(ctx) {
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
    getProject,
    setProject,
    setLastLibResolution,
    getExpandedAsm,
    setExpandedAsm,
    getAsmViewMode,
    setAsmViewMode,
    createNewTileSetProjectFiles,
    createNewBitmapProjectFiles
  } = ctx;

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
  els.btnOpenExamples?.addEventListener("click", async () => {
    closeTopbarMenu();
    if (typeof ensureExamplesLoaded === "function") {
      try {
        setStatus("Loading examples...");
        await ensureExamplesLoaded({ forceFresh: true });
        setStatus("Examples ready.");
      } catch (error) {
        setStatus(`Cannot load examples: ${error?.message || error}`);
      }
    }
    els.examplesDialog?.showModal();
  });
  els.exampleSelect.addEventListener("change", () => {
    renderExampleMeta(els.exampleSelect.value);
  });
  els.btnLoadExample.addEventListener("click", async () => {
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
    setProject(nextProject);
    clearCompiledArtifacts();
    setLastLibResolution(null);
    setExpandedAsm("");
    setAsmViewMode("generated");
    setStatus(`Loaded: ${example.label}`);
    syncUiFromProject();
    els.examplesDialog?.close();
    closeAutocomplete();
    closeTopbarMenu();
  });

  els.sourceEditor.addEventListener("input", () => {
    const project = getProject();
    project.sourceText = els.sourceEditor.value;
    setExpandedAsm("");
    setAsmViewMode("generated");
    clearCompiledArtifacts();
    refreshSourceCartridgeMeta(project.sourceText);
    saveProjectToStorage(project);
    updateAutocomplete();
    updateOptimizationHint();
    scheduleEditorInsightsRefresh();
  });

  function toggleSelectedSourceComments() {
    const editor = els.sourceEditor;
    const text = editor.value;
    const selectionStart = editor.selectionStart ?? 0;
    const selectionEnd = editor.selectionEnd ?? selectionStart;
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
    editor.value = text.slice(0, lineStart) + replacement + text.slice(lineEnd);
    editor.selectionStart = lineStart;
    editor.selectionEnd = lineStart + replacement.length;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
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

  els.btnNew.addEventListener("click", () => {
    setProject(newProject());
    clearCompiledArtifacts();
    setExpandedAsm("");
    setAsmViewMode("generated");
    refreshSourceCartridgeMeta(getProject().sourceText);
    setStatus("New project.");
    syncUiFromProject();
    closeTopbarMenu();
  });

  els.btnOpen.addEventListener("click", () => {
    els.fileImport.value = "";
    els.fileImport.click();
    closeTopbarMenu();
  });

  els.btnAddProjectFile?.addEventListener("click", () => {
    els.projectFileImport.value = "";
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
    els.projectFileImport.click();
  });
}

export function bindStudioRuntimeEvents(ctx) {
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
    renderLibraryResolution,
    saveProjectToStorage,
    refreshProjectGraph,
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
    insertTextIntoSource,
    ensureProjectFilePathCandidate,
    upsertProjectFile,
    bytesToBase64,
    addImportedProjectFiles
  } = ctx;

  let wavRecordStream = null;
  let wavMediaRecorder = null;
  let wavRecordedChunks = [];
  let wavRecordedBlob = null;
  let wavRecordedObjectUrl = "";

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
    const previewSamples = await dsoundBytesToPreviewSamples(bytes);
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

  function saveCurrentDsoundProjectFile() {
    const label = els.wavLabel.value.trim() || "SoundData";
    const bytes = parseCurrentDsoundBytes();
    const step = parseInt(els.wavStep.value, 10) || 0;
    const ampPercent = parseInt(els.wavAmp.value, 10) || 125;
    if (!bytes) {
      els.wavStatus.textContent = "No dsound bytes available yet.";
      return null;
    }
    const path = ensureProjectFilePathCandidate(`${label}.dsound`);
    upsertProjectFile({
      path,
      base64: bytesToBase64(Uint8Array.from(bytes)),
      kind: "dsound",
      source: "wavToDsound",
      dsoundStep: step,
      dsoundAmpPercent: ampPercent
    });
    return { label, path, step, ampPercent };
  }

  function insertSavedDsoundSnippet(saved) {
    const snippet = [
      `asset ${saved.label} from "${saved.path}"`,
      `play dsound ${saved.label}${saved.step ? ` step ${saved.step}` : ""}`
    ].join("\n");
    insertTextIntoSource(snippet, { beforeProcedures: true });
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
      return await audioBufferToDsound(audioBuffer, { step, ampPercent, label });
    } finally {
      await audioContext.close();
    }
  }

  async function convertAudioFile(file) {
    const step = parseInt(els.wavStep.value, 10);
    const ampPercent = parseInt(els.wavAmp.value, 10) || 125;
    const label = els.wavLabel.value.trim() || "SoundData";
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
    els.wavOutput.value = result.alexisSource;
    els.wavStats.textContent =
      `${result.nibbleCount.toLocaleString()} samples · ` +
      `${result.sampleRate.toLocaleString()} Hz · ` +
      `${result.durationSec.toFixed(2)}s · ` +
      `${result.byteCount.toLocaleString()} bytes encoded`;
    els.wavOutputWrap.classList.add("visible");
    await updateDsoundPreview(result.bytes, result.sampleRate);
    els.wavStatus.textContent = statusText;
  }

  async function quickAddDsoundFromResult(result, statusText = "Saved and inserted play dsound snippet.") {
    await renderDsoundResult(result, statusText);
    const saved = saveCurrentDsoundProjectFile();
    if (!saved) return;
    insertSavedDsoundSnippet(saved);
    els.wavConverterDialog.close();
    setStatus(`Saved ${saved.path} and inserted play dsound snippet.`);
  }

  els.fileImport.addEventListener("change", async () => {
    const file = els.fileImport.files && els.fileImport.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const obj = JSON.parse(text);
      setProject(importProjectObject(obj));
      clearCompiledArtifacts();
      setExpandedAsm("");
      setAsmViewMode("generated");
      setStatus(`Imported: ${getProject().projectName}`);
      syncUiFromProject();
      closeTopbarMenu();
    } catch (e) {
      setStatus(`Import failed: ${String(e)}`);
    }
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
    setStatus("Exported project.");
    closeTopbarMenu();
  });

  const rebuildAsmFromSource = () => {
    const project = getProject();
    const res = transpileSource(STUDIO_SOURCE_LANG, project.sourceText);
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
    syncAsmEditor();
    renderLibraryResolution();
    saveProjectToStorage(project);
    return { project, res };
  };

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
    refreshProjectGraph();
    const asm = project.generatedAsm.trimEnd();

    clearCompiledArtifacts();
    setStatus("Compiling with AmysCVAssembly...");

    try {
      const optimizationProfile = getOptimizationProfile(project.optimizationLevel || "auto", project.sourceText || "");
      const result = await compileGeneratedAsm(
        asm,
        `${project.projectName || "main"}.asm`,
        {
          optimizerEnabled: optimizationProfile.optimizerEnabled,
          optimizerConfig: optimizationProfile.optimizerConfig,
          projectFiles: project.projectFiles || []
        }
      );
      if (!result.ok) {
        setStatus(`Compile failed.\n${result.log}`);
        return;
      }
      const compiledRom = result.binary;
      const compiledMemoryMap = result.memoryMap || "";
      const compiledSymbols = result.symbolsText || "";
      const compiledListing = result.listing || "";
      const compiledColecoHeaderInfo = inspectColecoBinary(compiledRom);
      setCompiledOutputs({
        compiledRom,
        compiledMemoryMap,
        compiledSymbols,
        compiledListing,
        compiledColecoHeaderInfo
      });
      window.alexisLastMemoryMap = compiledMemoryMap;
      window.alexisLastSymbols = compiledSymbols;
      window.alexisLastListing = compiledListing;
      if (getAsmViewMode() === "optimized" || getAsmViewMode() === "memoryMap") syncAsmEditor();
      updatePreviewActions();
      updateEmulatorUi();
      refreshProjectGraph();
      const symbols = result.stats?.symbolCount ?? Object.keys(result.symbols || {}).length;
      const netOptimizerDelta = Number.isFinite(result.netOptimizerDelta) ? result.netOptimizerDelta : null;
      const estimatedBytesSaved = result.stats?.optimizer?.bytesSaved ?? 0;
      const optimizationNote = optimizationProfile.optimizerEnabled
        ? netOptimizerDelta === null
          ? `, ${optimizationProfile.note}`
          : netOptimizerDelta > 0
            ? `, ${optimizationProfile.note}, net -${netOptimizerDelta} bytes vs raw`
            : netOptimizerDelta < 0
              ? `, ${optimizationProfile.note}, net +${Math.abs(netOptimizerDelta)} bytes vs raw`
              : `, ${optimizationProfile.note}, net unchanged vs raw`
        : `, ${optimizationProfile.note}`;
      const previewNote = compiledColecoHeaderInfo?.valid && compiledColecoHeaderInfo?.usesDefaultScreen
        ? " BIOS previews available."
        : "";
      setStatus(appendCartridgeNormalizationWarning(`Compile OK: ${compiledRom.length} bytes, ${symbols} symbols${optimizationNote}.${previewNote}${buildTranspileWarningNote(built.res)}`, getSourceCartridgeMeta()));
      closeTopbarMenu();
    } catch (e) {
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
    setEmulatorBios({
      bytes: new Uint8Array(await file.arrayBuffer()),
      name: file.name || "colecovision.rom",
      sourceUrl: ""
    });
    updateEmulatorUi();
    setStatus(`Loaded BIOS ${file.name || "colecovision.rom"}. Compile a ROM, then click Run Emulator.`);
  });

  els.btnResetEmulator.addEventListener("click", () => {
    resetEmbeddedEmulator({ preserveBios: true });
    setStatus("Emulator reset. BIOS kept in memory.");
  });

  els.btnDownloadRom.addEventListener("click", () => {
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
      els.wavRecordStatus.textContent = "Recording converted to dsound.";
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
    const bytes = parseCurrentDsoundBytes();
    if (!bytes) {
      els.wavStatus.textContent = "Convert audio first.";
      return;
    }
    const sampleRate = wavDsoundPreviewSampleRate || Math.trunc(cvSampleRate(parseInt(els.wavStep.value, 10) || 0));
    await updateDsoundPreview(bytes, sampleRate);
    try {
      await els.wavDsoundPreview?.play?.();
      els.wavStatus.textContent = "Playing converted dsound preview.";
    } catch {
      els.wavStatus.textContent = "Converted preview is ready below.";
    }
  });

  els.btnWavInsertIntoEditor.addEventListener("click", () => {
    const block = els.wavOutput.value;
    insertTextIntoSource(block, { beforeProcedures: true });
    els.wavConverterDialog.close();
    setStatus(`Inserted "${els.wavLabel.value.trim() || "SoundData"}" data block into source.`);
  });

  els.btnWavSaveProjectFile?.addEventListener("click", () => {
    if (!els.wavOutput.value.trim()) {
      els.wavStatus.textContent = "Convert audio first.";
      return;
    }
    const saved = saveCurrentDsoundProjectFile();
    if (!saved) return;
    els.wavStatus.textContent = `Saved ${saved.path} to project files.`;
  });

  els.btnWavSaveAndInsertPlay?.addEventListener("click", () => {
    if (!els.wavOutput.value.trim()) {
      els.wavStatus.textContent = "Convert audio first.";
      return;
    }
    const saved = saveCurrentDsoundProjectFile();
    if (!saved) return;
    insertSavedDsoundSnippet(saved);
    els.wavConverterDialog.close();
    setStatus(`Saved ${saved.path} and inserted play dsound snippet.`);
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
