export function exportProject(project, { normalizeProjectFiles, normalizeOptimizationLevel }) {
  const exported = {
    version: project.version,
    projectName: project.projectName,
    sourceLang: project.sourceLang || "amy",
    memoryProfile: project.memoryProfile,
    selectedLibs: project.selectedLibs,
    selectedBundles: project.selectedBundles,
    selectedCompression: project.selectedCompression,
    selectedAssets: project.selectedAssets,
    projectFiles: normalizeProjectFiles(project.projectFiles || []),
    optimizationLevel: normalizeOptimizationLevel(project.optimizationLevel || project.optimizerMode || "auto"),
    sourceBreakpoints: Array.isArray(project.sourceBreakpoints) ? project.sourceBreakpoints.map((entry) => ({ ...entry })) : [],
    sourceText: project.sourceText
  };
  if (project.target && typeof project.target === "object") exported.target = structuredCloneValue(project.target);
  if (Array.isArray(project.outputs)) exported.outputs = structuredCloneValue(project.outputs);
  return exported;
}

export function importProjectObject(obj, { newProject, normalizeProjectFiles, normalizeOptimizationLevel }) {
  const p = newProject();
  if (!obj || typeof obj !== "object") return p;
  p.projectName = typeof obj.projectName === "string" ? obj.projectName : p.projectName;
  p.sourceLang = typeof obj.sourceLang === "string" ? obj.sourceLang : p.sourceLang;
  p.selectedLibs = Array.isArray(obj.selectedLibs) ? obj.selectedLibs : p.selectedLibs;
  p.selectedBundles = Array.isArray(obj.selectedBundles) ? obj.selectedBundles : p.selectedBundles;
  p.selectedCompression = Array.isArray(obj.selectedCompression) ? obj.selectedCompression : p.selectedCompression;
  p.selectedAssets = Array.isArray(obj.selectedAssets) ? obj.selectedAssets : p.selectedAssets;
  p.projectFiles = normalizeProjectFiles(Array.isArray(obj.projectFiles) ? obj.projectFiles : p.projectFiles);
  p.optimizationLevel = normalizeOptimizationLevel(obj.optimizationLevel || obj.optimizerMode || "auto");
  p.sourceBreakpoints = Array.isArray(obj.sourceBreakpoints) ? obj.sourceBreakpoints.map((entry) => ({ ...entry })) : [];
  p.sourceText = typeof obj.sourceText === "string" ? obj.sourceText : p.sourceText;
  if (obj.target && typeof obj.target === "object") p.target = structuredCloneValue(obj.target);
  if (Array.isArray(obj.outputs)) p.outputs = structuredCloneValue(obj.outputs);
  return p;
}

function structuredCloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
