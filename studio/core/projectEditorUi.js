export function createProjectEditorUiHelpers({
  els,
  getProject,
  setProject,
  getExpandedAsm,
  setExpandedAsm,
  getAsmViewMode,
  setAsmViewMode,
  getExampleCategoryFilter,
  getExampleTagFilter,
  getExampleSearchFilter,
  exampleCategoryOrder,
  exampleManifest,
  getActiveExampleId,
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
}) {
  function commitProjectSourceText(nextText) {
    const project = getProject();
    project.sourceText = nextText;
    els.sourceEditor.value = nextText;
    setExpandedAsm("");
    setAsmViewMode("generated");
    clearCompiledArtifacts();
    refreshSourceCartridgeMeta(project.sourceText);
    saveProjectToStorage(project);
    updateAutocomplete();
    updateOptimizationHint();
    scheduleEditorInsightsRefresh();
  }

  function insertTextIntoSource(block, { beforeProcedures = false } = {}) {
    const existing = els.sourceEditor.value;
    const insertAt = beforeProcedures ? existing.search(/^(?:sub|function)\b/m) : -1;
    const target = beforeProcedures && insertAt >= 0 ? insertAt : existing.length;
    const before = existing.slice(0, target);
    const after = existing.slice(target);
    const next = before.replace(/\n*$/, "\n\n") + block + "\n\n" + after.replace(/^\n*/, "");
    commitProjectSourceText(next);
  }

  function syncUiFromProject() {
    const project = getProject();
    els.projectName.value = project.projectName;
    if (els.exampleCategorySelect) {
      const categories = ["all", ...exampleCategoryOrder.filter((category) => exampleManifest.some((item) => item.category === category))];
      els.exampleCategorySelect.textContent = "";
      for (const category of categories) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category === "all" ? `All examples (${exampleManifest.length})` : category;
        if (category === getExampleCategoryFilter()) option.selected = true;
        els.exampleCategorySelect.appendChild(option);
      }
    }
    if (els.exampleTagSelect) {
      const tags = ["all", ...getExampleTagOrder()];
      els.exampleTagSelect.textContent = "";
      for (const tag of tags) {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag === "all" ? "All tags" : `Tag: ${tag}`;
        if (tag === getExampleTagFilter()) option.selected = true;
        els.exampleTagSelect.appendChild(option);
      }
    }
    if (els.exampleSearchInput) {
      els.exampleSearchInput.value = getExampleSearchFilter();
    }
    renderExamplePicker();
    renderProjectFiles();
    renderLibraryResolution();
    els.sourceEditor.value = project.sourceText;
    closeAutocomplete();
    syncAsmEditor();
    refreshSourceCartridgeMeta(project.sourceText);
    refreshEditorInsights();
    updateOptimizationHint();
    saveProjectToStorage(project);
    refreshProjectGraph();
    updateEmulatorUi();
  }

  return {
    commitProjectSourceText,
    insertTextIntoSource,
    syncUiFromProject
  };
}
