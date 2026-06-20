export function createProjectFileCreationAddon({
  getProject,
  normalizeProjectFilePath,
  bytesToBase64,
  upsertProjectFile,
  setStatus,
  openProjectTileEditor,
  previewProjectFilePicture
}) {
  function availableProjectStem(preferredStem, extensions) {
    const project = getProject();
    const taken = new Set((project.projectFiles || []).map((entry) => normalizeProjectFilePath(entry.path).toLowerCase()));
    const cleanStem = String(preferredStem || "asset").replace(/\\/g, "/").split("/").pop().replace(/\.+$/g, "") || "asset";
    let suffix = "";
    let counter = 2;
    while (extensions.some((extension) => taken.has(normalizeProjectFilePath(`${cleanStem}${suffix}${extension}`).toLowerCase()))) {
      suffix = `-${counter}`;
      counter += 1;
    }
    return `${cleanStem}${suffix}`;
  }

  function createBlankTileTables() {
    const pattern = new Uint8Array(2048);
    const color = new Uint8Array(2048);
    const name = new Uint8Array(768);
    color.fill(0xF0);
    for (let i = 0; i < name.length; i += 1) name[i] = i & 0xFF;
    return { pattern, color, name };
  }

  function createBlankBitmapTables() {
    const pattern = new Uint8Array(6144);
    const color = new Uint8Array(6144);
    const name = new Uint8Array(768);
    color.fill(0xF0);
    for (let i = 0; i < name.length; i += 1) name[i] = i & 0xFF;
    return { pattern, color, name };
  }

  function createNewTileSetProjectFiles() {
    const stem = availableProjectStem("new-tiles", [".pattern", ".color", ".name"]);
    const tables = createBlankTileTables();
    const patternEntry = {
      path: normalizeProjectFilePath(`${stem}.pattern`),
      base64: bytesToBase64(tables.pattern),
      kind: "picture",
      source: "new-tiles"
    };
    upsertProjectFile(patternEntry);
    upsertProjectFile({
      path: normalizeProjectFilePath(`${stem}.color`),
      base64: bytesToBase64(tables.color),
      kind: "picture",
      source: "new-tiles"
    });
    upsertProjectFile({
      path: normalizeProjectFilePath(`${stem}.name`),
      base64: bytesToBase64(tables.name),
      kind: "picture",
      source: "new-tiles"
    });
    setStatus(`Created blank tile set ${stem}.`);
    void openProjectTileEditor(patternEntry);
  }

  function createNewBitmapProjectFiles() {
    const stem = availableProjectStem("new-bitmap", [".pattern", ".color", ".name"]);
    const tables = createBlankBitmapTables();
    const patternEntry = {
      path: normalizeProjectFilePath(`${stem}.pattern`),
      base64: bytesToBase64(tables.pattern),
      kind: "picture",
      source: "new-bitmap"
    };
    upsertProjectFile(patternEntry);
    upsertProjectFile({
      path: normalizeProjectFilePath(`${stem}.color`),
      base64: bytesToBase64(tables.color),
      kind: "picture",
      source: "new-bitmap"
    });
    upsertProjectFile({
      path: normalizeProjectFilePath(`${stem}.name`),
      base64: bytesToBase64(tables.name),
      kind: "picture",
      source: "new-bitmap"
    });
    setStatus(`Created blank bitmap ${stem}. Use Preview or Export PC from its file row.`);
    void previewProjectFilePicture(patternEntry);
  }

  return {
    createNewTileSetProjectFiles,
    createNewBitmapProjectFiles
  };
}
