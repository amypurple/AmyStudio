export function createGraphicsProjectAssetAccess({
  getProject,
  normalizeProjectFilePath,
  assetNameFromProjectPath,
  projectFileBytes,
  detectCodecFromName,
  decompressBytes
}) {
  async function decodedProjectFileBytes(entry) {
    const bytes = projectFileBytes(entry);
    const codec = String(entry?.codec || detectCodecFromName(entry?.path) || "raw").toLowerCase();
    if (!codec || codec === "raw") return bytes;
    return decompressBytes(codec, bytes);
  }

  function projectFileName(entry) {
    return normalizeProjectFilePath(entry?.path || "").slice("@project/".length).toLowerCase();
  }

  function findFileByProjectName(files, wantedFile) {
    const wanted = String(wantedFile || "").toLowerCase();
    if (!wanted) return null;
    return files.find((file) => projectFileName(file) === wanted) || null;
  }

  function findFileByRef(files, ref) {
    if (!ref || !ref.name) return null;
    if (ref.from === "file") return findFileByProjectName(files, ref.name);
    if (ref.from === "asset") {
      const wantedAsset = String(ref.name || "").toLowerCase();
      return files.find((file) => assetNameFromProjectPath(file.path).toLowerCase() === wantedAsset) || null;
    }
    return null;
  }

  function findEditorTilesetFile(editor) {
    const project = getProject();
    const files = project.projectFiles || [];
    const byRef = findFileByRef(files, editor.tilesetRef) || findFileByRef(files, editor.patternRef);
    if (byRef) return byRef;
    const direct = findFileByProjectName(files, editor.tilesetFile || editor.patternFile);
    if (direct) return direct;
    const wantedAsset = String(editor.tileset || "").toLowerCase();
    return files.find((file) => assetNameFromProjectPath(file.path).toLowerCase() === wantedAsset) || null;
  }

  function findEditorColorFile(editor) {
    const project = getProject();
    const files = project.projectFiles || [];
    const byRef = findFileByRef(files, editor.colorRef);
    if (byRef) return byRef;
    const direct = findFileByProjectName(files, editor.colorFile);
    if (direct) return direct;
    const wantedAsset = String(editor.colorAsset || "").toLowerCase();
    if (wantedAsset) {
      const asset = files.find((file) => assetNameFromProjectPath(file.path).toLowerCase() === wantedAsset);
      if (asset) return asset;
    }
    return files.find((file) => /\.color\./i.test(file.path || "") || /\.color$/i.test(file.path || "")) || null;
  }

  function findEditorDataFile(editor) {
    const project = getProject();
    const files = project.projectFiles || [];
    const sourceRef = editor.sourceRef || editor.source || editor.dataRef || editor.data;
    const byRef = findFileByRef(files, sourceRef);
    if (byRef) return byRef;
    return findFileByProjectName(files, editor.sourceFile || editor.dataFile);
  }

  function patternFileForCharsetEditor(editor) {
    const project = getProject();
    const files = project.projectFiles || [];
    const byRef = findFileByRef(files, editor.patternRef);
    if (byRef) return byRef;
    const direct = findFileByProjectName(files, editor.patternFile || editor.tilesetFile);
    if (direct) return direct;
    return findEditorTilesetFile(editor);
  }

  return {
    decodedProjectFileBytes,
    findEditorTilesetFile,
    findEditorColorFile,
    findEditorDataFile,
    patternFileForCharsetEditor
  };
}
