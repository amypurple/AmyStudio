export function exportProject(project, { normalizeProjectFiles, normalizeOptimizationLevel }) {
  return {
    version: project.version,
    projectName: project.projectName,
    sourceLang: project.sourceLang,
    memoryProfile: project.memoryProfile,
    selectedLibs: project.selectedLibs,
    selectedBundles: project.selectedBundles,
    selectedCompression: project.selectedCompression,
    selectedAssets: project.selectedAssets,
    projectFiles: normalizeProjectFiles(project.projectFiles || []),
    optimizationLevel: normalizeOptimizationLevel(project.optimizationLevel || project.optimizerMode || "auto"),
    sourceText: project.sourceText
  };
}

export function importProjectObject(obj, { newProject, normalizeProjectFiles, normalizeOptimizationLevel }) {
  const p = newProject();
  if (!obj || typeof obj !== "object") return p;
  p.projectName = typeof obj.projectName === "string" ? obj.projectName : p.projectName;
  p.selectedLibs = Array.isArray(obj.selectedLibs) ? obj.selectedLibs : p.selectedLibs;
  p.selectedBundles = Array.isArray(obj.selectedBundles) ? obj.selectedBundles : p.selectedBundles;
  p.selectedCompression = Array.isArray(obj.selectedCompression) ? obj.selectedCompression : p.selectedCompression;
  p.selectedAssets = Array.isArray(obj.selectedAssets) ? obj.selectedAssets : p.selectedAssets;
  p.projectFiles = normalizeProjectFiles(Array.isArray(obj.projectFiles) ? obj.projectFiles : p.projectFiles);
  p.optimizationLevel = normalizeOptimizationLevel(obj.optimizationLevel || obj.optimizerMode || "auto");
  p.sourceText = typeof obj.sourceText === "string" ? obj.sourceText : p.sourceText;
  return p;
}
