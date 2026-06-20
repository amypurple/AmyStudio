export function createPreviewShellHelpers({
  els,
  getProject,
  getOptimizationProfile,
  optimizationLevels,
  getCompiledColecoHeaderInfo,
  getCompiledRom,
  getSourceCartridgeMeta,
  transpileSource,
  studioSourceLang,
  getCartridgeNormalizationWarning,
  setSourceCartridgeMeta,
  setStatus
}) {
  function updateOptimizationHint() {
    if (!els.optimizationHint) return;
    const project = getProject();
    const profile = getOptimizationProfile(project?.optimizationLevel || "auto", project?.sourceText || "");
    const levelInfo = optimizationLevels[profile.requestedLevel] || optimizationLevels.auto;
    const effectiveInfo = optimizationLevels[profile.effectiveLevel] || levelInfo;
    const suffix = profile.requestedLevel === profile.effectiveLevel
      ? ""
      : ` Using: ${effectiveInfo.label}.`;
    const passText = effectiveInfo.passes?.length ? ` Active: ${effectiveInfo.passes.join(", ")}.` : "";
    els.optimizationHint.textContent = `${levelInfo.description}${suffix}${passText}`;
    if (els.optimizationSummary) {
      els.optimizationSummary.textContent = `Optimize: ${effectiveInfo.label}`;
      els.optimizationSummary.title = els.optimizationHint.textContent;
    }
  }

  function updatePreviewActions() {
    const previewable = !!(
      (getCompiledColecoHeaderInfo()?.valid && getCompiledColecoHeaderInfo()?.usesDefaultScreen && getCompiledRom()) ||
      getSourceCartridgeMeta()
    );
    const sourcePreviewable = !!getSourceCartridgeMeta();
    if (els.btnPreviewColecoTitle) {
      els.btnPreviewColecoTitle.classList.toggle("hidden", !sourcePreviewable);
      els.btnPreviewColecoTitle.disabled = !previewable;
    }
    if (els.btnPreviewDinaTitle) {
      els.btnPreviewDinaTitle.classList.toggle("hidden", !sourcePreviewable);
      els.btnPreviewDinaTitle.disabled = !previewable;
    }
  }

  function refreshSourceCartridgeMeta(sourceText = getProject()?.sourceText || "") {
    const result = transpileSource(studioSourceLang, sourceText);
    setSourceCartridgeMeta(result.ok ? (result.metadata?.cartridge || null) : null);
    updatePreviewActions();
    const warning = getCartridgeNormalizationWarning(getSourceCartridgeMeta());
    if (warning) setStatus(warning);
  }

  return {
    updateOptimizationHint,
    updatePreviewActions,
    refreshSourceCartridgeMeta
  };
}
