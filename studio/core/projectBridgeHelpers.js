export function createProjectBridgeHelpers({
  manifestDefaults,
  sourceLang,
  memoryProfile,
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
  storageKey,
  localStorageObj,
  legacyWarriorTemplateMarker,
  exampleSources,
  normalizeProjectFiles,
  normalizeProjectFilePath,
  normalizeOptimizationLevel,
  getProject
}) {
  function defaultSourceText() {
    return defaultSourceTextCore();
  }

  function newProject() {
    return newProjectCore({
      manifestDefaults,
      sourceLang,
      memoryProfile,
      defaultSourceTextValue: defaultSourceText()
    });
  }

  function buildProjectFromExample(example) {
    return buildProjectFromExampleCore(example, { newProjectFn: newProject });
  }

  function migrateProject(project) {
    return migrateProjectCore(project, {
      normalizeProjectFiles,
      legacyWarriorTemplateMarker,
      exampleSources
    });
  }

  function loadProject() {
    return loadProjectCore({
      storageKey,
      localStorageObj,
      newProjectFn: newProject,
      migrateProjectFn: migrateProject
    });
  }

  function ensureProjectFilePathCandidate(filename) {
    const project = getProject();
    return ensureProjectFilePathCandidateCore(filename, {
      projectFiles: project?.projectFiles || [],
      normalizeProjectFilePath
    });
  }

  function saveProjectToStorage(project) {
    return saveProjectToStorageCore(project, { storageKey, localStorageObj });
  }

  function refreshProjectGraph() {
    return refreshProjectGraphCore();
  }

  function exportProject(project) {
    return exportProjectCore(project, { normalizeProjectFiles, normalizeOptimizationLevel });
  }

  function importProjectObject(obj) {
    return importProjectObjectCore(obj, { newProject, normalizeProjectFiles, normalizeOptimizationLevel });
  }

  return {
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
  };
}
