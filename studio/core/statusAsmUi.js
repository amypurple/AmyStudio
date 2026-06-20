export function createStatusAsmUiHelpers({
  els,
  getLastStatusText,
  setLastStatusText,
  getLastLibResolution,
  getAsmViewMode,
  getExpandedAsm,
  getCompiledListing,
  getCompiledMemoryMap,
  getProject,
  transpileSource,
  inferAmyMemoryCapabilities,
  sourceHintsTinySound,
  studioSourceLang,
  studioMemoryProfile,
  getRamLayout,
  formatHex16,
  formatRamBytes,
  getCompressionCatalog,
  onUpdateStatusPanel
}) {
  function setStatus(text) {
    setLastStatusText(text);
    updateStatusPanel();
  }

  function classifyStatusText(text) {
    const lower = String(text || "").toLowerCase();
    if (lower.includes("compile failed") || lower.includes("failed:") || lower.includes("[error]")) return "error";
    if (lower.includes("[warn]") || lower.includes("warning") || lower.includes("migration hints")) return "warn";
    if (lower.startsWith("compile ok") || lower.startsWith("asm generated") || lower.startsWith("ready")) return "ok";
    return "info";
  }

  function summarizeStatusText(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!normalized) return "Ready.";
    const firstLine = normalized.split("\n").find((line) => line.trim())?.trim() || "Ready.";
    if (firstLine.startsWith("Compile OK:")) {
      const firstSentence = firstLine.split(". ")[0].trim();
      return firstSentence.length <= 150 ? firstSentence : `${firstSentence.slice(0, 147)}...`;
    }
    return firstLine.length <= 150 ? firstLine : `${firstLine.slice(0, 147)}...`;
  }

  function renderLibraryResolution() {
    if (!els.libResolution) return;
    const replacements = getLastLibResolution()?.replacements || [];
    if (!replacements.length) {
      els.libResolution.textContent = "Method 2: no rewrite detected yet.";
      return;
    }
    els.libResolution.textContent = replacements
      .map((item) => `${item.umbrella} -> ${item.resolved.join(", ")}`)
      .join("\n");
  }

  function getAsmViewState() {
    const project = getProject();
    switch (getAsmViewMode()) {
      case "expanded":
        return {
          text: getExpandedAsm() || project.generatedAsm || "",
          hint: "Generated ASM with includes expanded inline."
        };
      case "optimized":
        return {
          text: getCompiledListing() || "; Compile ROM to generate the post-optimization assembler listing.\n",
          hint: "Post-opt ASM listing from AmysCVAssembly."
        };
      case "memoryMap":
        return {
          text: getCompiledMemoryMap() || "; Compile ROM to generate the memory map.\n",
          hint: "Build summary, file map, and symbols."
        };
      case "generated":
      default:
        return {
          text: project.generatedAsm || "",
          hint: "ASM generated from the current source."
        };
    }
  }

  function buildRamSummary(projectState, transpileResult = null) {
    const inferredCaps = studioSourceLang === "amy"
      ? inferAmyMemoryCapabilities(projectState.sourceText || "", sourceHintsTinySound)
      : null;
    const ramLayout = getRamLayout(studioMemoryProfile, inferredCaps);
    if (!ramLayout) {
      return {
        windowText: "Unknown",
        usedText: "-",
        freeText: "-",
        detailText: "No RAM layout is associated with the selected memory profile."
      };
    }
    const totalBytes = ramLayout.userRamEndExclusive - ramLayout.userRamStart;
    const windowText = `${formatHex16(ramLayout.userRamStart)}-${formatHex16(ramLayout.userRamEndExclusive - 1)}`;
    if (studioSourceLang !== "amy") {
      return {
        windowText,
        usedText: "manual",
        freeText: formatRamBytes(totalBytes),
        detailText: `Z80 ASM projects do not expose RAM allocations automatically yet. User window: ${formatRamBytes(totalBytes)}.`
      };
    }
    if (!transpileResult || !transpileResult.ok || !transpileResult.ramUsage) {
      return {
        windowText,
        usedText: "-",
        freeText: formatRamBytes(totalBytes),
        detailText: transpileResult?.ok === false
          ? `RAM estimate unavailable until the source transpiles cleanly: ${transpileResult.log}`
          : `Available user RAM: ${formatRamBytes(totalBytes)}.`
      };
    }
    const usedBytes = transpileResult.ramUsage.usedBytes;
    const freeBytes = Math.max(0, totalBytes - usedBytes);
    const vars = transpileResult.ramUsage.variableCount;
    const packs = transpileResult.ramUsage.booleanPackCount;
    const percent = totalBytes ? Math.round((usedBytes / totalBytes) * 100) : 0;
    return {
      windowText,
      usedText: `${formatRamBytes(usedBytes)} (${percent}%)`,
      freeText: formatRamBytes(freeBytes),
      detailText: `${vars} RAM symbol${vars === 1 ? "" : "s"} allocated${packs ? `, including ${packs} packed boolean byte${packs === 1 ? "" : "s"}` : ""}.`
    };
  }

  function renderRamSummary(summary) {
    if (els.ramWindow) els.ramWindow.textContent = summary.windowText;
    if (els.ramUsed) els.ramUsed.textContent = summary.usedText;
    if (els.ramFree) els.ramFree.textContent = summary.freeText;
    if (els.ramDetail) els.ramDetail.textContent = summary.detailText;
    updateStatusPanel(summary);
  }

  function updateStatusPanel(summary = null) {
    const project = getProject();
    const currentSummary = summary || buildRamSummary(project, transpileSource(studioSourceLang, project.sourceText));
    const ramLine = `RAM: ${currentSummary.usedText} used, ${currentSummary.freeText} free, window ${currentSummary.windowText}`;
    const statusText = getLastStatusText();
    const fullText = statusText ? `${statusText}\n${ramLine}` : ramLine;
    if (els.status) els.status.textContent = fullText;
    if (els.statusSummary) {
      const statusKind = classifyStatusText(statusText || ramLine);
      els.statusSummary.textContent = statusText ? summarizeStatusText(statusText) : ramLine;
      els.statusSummary.className = `status-summary status-summary--${statusKind}`;
    }
    if (els.statusDetails) {
      const statusKind = classifyStatusText(statusText || "");
      els.statusDetails.open = statusKind === "error";
    }
    if (onUpdateStatusPanel) onUpdateStatusPanel(currentSummary);
  }

  function refreshEditorInsights() {
    const project = getProject();
    const result = transpileSource(studioSourceLang, project.sourceText);
    renderRamSummary(buildRamSummary(project, result));
  }

  function syncAsmEditor() {
    const view = getAsmViewState();
    els.asmEditor.value = view.text;
    if (els.asmViewHint) els.asmViewHint.textContent = view.hint;
    els.btnViewGeneratedAsm.classList.toggle("button--active", getAsmViewMode() === "generated");
    els.btnViewExpandedAsm.classList.toggle("button--active", getAsmViewMode() === "expanded");
    els.btnViewOptimizedAsm.classList.toggle("button--active", getAsmViewMode() === "optimized");
    els.btnViewMemoryMap.classList.toggle("button--active", getAsmViewMode() === "memoryMap");
  }

  function codecStatusLine() {
    const catalog = getCompressionCatalog();
    const names = catalog.map((c) => c.name || c.codecId).join(", ");
    return `RetroCompress engines loaded: ${names}`;
  }

  return {
    setStatus,
    renderLibraryResolution,
    getAsmViewState,
    buildRamSummary,
    renderRamSummary,
    updateStatusPanel,
    refreshEditorInsights,
    syncAsmEditor,
    codecStatusLine
  };
}
