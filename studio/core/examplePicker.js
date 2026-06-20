export function createExamplePickerHelpers({
  els,
  exampleCatalog,
  exampleManifest,
  getManifestLabels,
  getExampleManifestById,
  getProjectSourceText,
  getExampleCategoryFilter,
  getExampleTagFilter,
  getExampleSearchFilter
}) {
  function getExampleTagOrder() {
    return [...new Set(exampleManifest.flatMap((item) => item.tags || []))].sort((a, b) => a.localeCompare(b));
  }

  function getFilteredExampleManifest() {
    const search = getExampleSearchFilter().trim().toLowerCase();
    return exampleManifest.filter((item) => {
      const categoryOk = !getExampleCategoryFilter() || getExampleCategoryFilter() === "all" || item.category === getExampleCategoryFilter();
      const tagOk = !getExampleTagFilter() || getExampleTagFilter() === "all" || (item.tags || []).includes(getExampleTagFilter());
      const searchOk = !search || [
        item.label,
        item.detail,
        item.category,
        item.projectName,
        ...(item.tags || [])
      ].some((value) => String(value || "").toLowerCase().includes(search));
      return categoryOk && tagOk && searchOk;
    });
  }

  function renderExampleMeta(exampleId) {
    if (!els.exampleDetail || !els.exampleMeta) return;
    const meta = getExampleManifestById(exampleId);
    if (!meta) {
      els.exampleDetail.textContent = "Load a built-in demo.";
      els.exampleMeta.textContent = "";
      if (els.currentExampleSummary) {
        els.currentExampleSummary.textContent = "Open examples to load a demo.";
      }
      return;
    }
    els.exampleDetail.textContent = meta.detail || "Load a built-in demo.";
    const parts = [`Category: ${meta.category}`];
    if (meta.benchmark) parts.push("Benchmark: ROM/RAM panel");
    if (meta.tags?.length) parts.push(`Tags: ${meta.tags.join(", ")}`);
    if (meta.selectedLibs?.length) parts.push(`Libs: ${getManifestLabels("libs", meta.selectedLibs).join(", ")}`);
    if (meta.selectedBundles?.length) parts.push(`Bundles: ${getManifestLabels("bundles", meta.selectedBundles).join(", ")}`);
    els.exampleMeta.textContent = parts.join(" | ");
    if (els.currentExampleSummary) {
      els.currentExampleSummary.textContent = `${meta.label} | ${meta.category}${meta.benchmark ? " | benchmark" : ""}`;
    }
  }

  function renderExamplePicker() {
    if (!els.exampleSelect) return;
    const activeExample = exampleCatalog.find((item) => item.sourceText === getProjectSourceText());
    const filtered = getFilteredExampleManifest();
    els.exampleSelect.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = filtered.length ? "Choose example..." : "No examples match.";
    els.exampleSelect.appendChild(placeholder);
    for (const meta of filtered) {
      const option = document.createElement("option");
      option.value = meta.id;
      option.textContent = meta.label;
      if (activeExample?.id === meta.id) option.selected = true;
      els.exampleSelect.appendChild(option);
    }
    renderExampleMeta(activeExample && filtered.some((item) => item.id === activeExample.id) ? activeExample.id : "");
  }

  return {
    getExampleTagOrder,
    getFilteredExampleManifest,
    renderExampleMeta,
    renderExamplePicker
  };
}
