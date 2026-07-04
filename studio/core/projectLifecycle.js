export function defaultSourceText() {
  return [
    "' Amy starter",
    "text screen",
    "print at 13,11, \"HELLO\"",
    "screen on"
  ].join("\n");
}

export function newProject({ manifestDefaults, sourceLang, memoryProfile, defaultSourceTextValue }) {
  const d = manifestDefaults;
  return {
    version: 2,
    projectName: d.projectName,
    sourceLang,
    memoryProfile,
    selectedLibs: [...d.selectedLibs],
    selectedBundles: [...d.selectedBundles],
    selectedCompression: [...d.selectedCompression],
    selectedAssets: [...d.selectedAssets],
    projectFiles: [],
    optimizationLevel: "auto",
    sourceText: defaultSourceTextValue,
    generatedAsm: ""
  };
}

export function buildProjectFromExample(example, { newProjectFn }) {
  const base = newProjectFn();
  return {
    ...base,
    projectName: example.projectName || base.projectName,
    sourceLang: example.sourceLang || base.sourceLang,
    memoryProfile: base.memoryProfile,
    selectedLibs: example.selectedLibs ? [...example.selectedLibs] : [...base.selectedLibs],
    selectedBundles: example.selectedBundles ? [...example.selectedBundles] : [...base.selectedBundles],
    selectedCompression: example.selectedCompression ? [...example.selectedCompression] : [...base.selectedCompression],
    selectedAssets: example.selectedAssets ? [...example.selectedAssets] : [...base.selectedAssets],
    projectFiles: example.projectFiles ? example.projectFiles.map((entry) => ({ ...entry })) : [...base.projectFiles],
    optimizationLevel: "auto",
    sourceText: example.sourceText || base.sourceText,
    generatedAsm: ""
  };
}

export function migrateProject(project, {
  normalizeProjectFiles,
  legacyWarriorTemplateMarker,
  exampleSources
}) {
  project.projectFiles = normalizeProjectFiles(project.projectFiles || []);
  const source = project.sourceText || "";
  const isOldWarriorDemo =
    source.includes(legacyWarriorTemplateMarker) &&
    source.includes("assets/compressed/warrior/color.zx7") &&
    source.includes("fill vram.name with 0 count 32");

  if (isOldWarriorDemo) {
    return {
      ...project,
      projectName: "warrior-demo",
      sourceLang: "amy",
      selectedCompression: ["src/compression/zx0_vram.asm"],
      selectedAssets: ["assets/compressed/warrior/pattern.zx0", "assets/compressed/warrior/color.zx0"],
      sourceText: exampleSources.amy,
      generatedAsm: ""
    };
  }

  const isCompressedPictureDemo =
    source.includes("decompress zx0 WarriorPattern to vram.pattern") ||
    source.includes("decompress zx0 BarbarianPattern to vram.pattern");
  if (isCompressedPictureDemo && !/^\s*graphics\s+(?:mode\s+)?bitmap\s*$/im.test(source)) {
    return {
      ...project,
      sourceText: source.replace(/^(\s*screen\s+off\s*)$/im, "$1\n  graphics bitmap"),
      generatedAsm: ""
    };
  }

  return {
    ...project,
    sourceLang: project.sourceLang || "amy"
  };
}

export function loadProject({ storageKey, localStorageObj, newProjectFn, migrateProjectFn }) {
  const raw = localStorageObj.getItem(storageKey);
  if (!raw) return newProjectFn();
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return newProjectFn();
    return migrateProjectFn({ ...newProjectFn(), ...p });
  } catch {
    return newProjectFn();
  }
}

export function ensureProjectFilePathCandidate(filename, { projectFiles, normalizeProjectFilePath }) {
  const taken = new Set((projectFiles || []).map((entry) => normalizeProjectFilePath(entry.path).toLowerCase()));
  const source = String(filename || "asset.bin").replace(/\\/g, "/").split("/").pop() || "asset.bin";
  const dot = source.lastIndexOf(".");
  const stem = dot > 0 ? source.slice(0, dot) : source;
  const ext = dot > 0 ? source.slice(dot) : "";
  let attempt = normalizeProjectFilePath(source);
  let counter = 2;
  while (taken.has(attempt.toLowerCase())) {
    attempt = normalizeProjectFilePath(`${stem}-${counter}${ext}`);
    counter += 1;
  }
  return attempt;
}

export function saveProjectToStorage(project, { storageKey, localStorageObj }) {
  const saved = {
    ...project,
    sourceLang: project.sourceLang || "amy"
  };
  localStorageObj.setItem(storageKey, JSON.stringify(saved, null, 2));
}

export function refreshProjectGraph() {
  return;
}
