import { createProjectFileCreationAddon } from "./addons/projectFileCreationAddon.js";
import { createProjectFileDsoundAddon } from "./addons/projectFileDsoundAddon.js";

export function createProjectFileUiHelpers({
  els,
  getProject,
  setProjectFiles,
  clearCompiledArtifacts,
  saveProjectToStorage,
  insertTextIntoSource,
  setStatus,
  ensureProjectFilePathCandidate,
  assetNameFromProjectPath,
  normalizeProjectFilePath,
  normalizeProjectFiles,
  fileKindFromPath,
  formatByteSize,
  projectFileBytes,
  bytesToBase64,
  dsoundBytesToPreviewSamples,
  cvSampleRate,
  detectCodecFromName,
  decompressBytes,
  compressBytes,
  evaluatePictureCompressionCandidates,
  selectPictureCompressionCandidate,
  buildPictureProjectFileEntriesFromCandidate,
  pictureQuickCompressionCodecs,
  imageFileToColecoBitmapTables,
  colecoBitmapTablesToImageData,
  imageFileToPictureProjectFileEntries,
  patternBytesToColecoBitmapTables,
  colorBytesToColecoBitmapTables,
  grpBytesToColecoBitmapTables,
  sc2BytesToColecoBitmapTables,
  isIcvGmDatText,
  icvgmDatTextToColecoTileTables,
  icvgmDatTextToColecoBitmapTables,
  pcBytesToColecoBitmapTables,
  pcFileToPictureProjectFileEntries,
  powerPaintBytesToColecoBitmapTables,
  powerPaintFileToPictureProjectFileEntries,
  isPictureProjectFile,
  pictureComponentFromPath,
  previewPictureProjectFile
}) {
  const TMS_PALETTE = [
    "#000000", "#000000", "#21c842", "#5edc78",
    "#5455ed", "#7d76fc", "#d4524d", "#42ebf5",
    "#fc5554", "#ff7978", "#d4c154", "#e5ce80",
    "#21b03b", "#c95aa9", "#cccccc", "#ffffff"
  ];

  function assetSnippetForEntry(entry, assetName) {
    const normalizedPath = normalizeProjectFilePath(entry.path);
    const codec = String(entry?.codec || ((entry.kind || fileKindFromPath(entry.path)) === "dsound" ? "raw" : "")).toLowerCase();
    return codec && codec !== "raw"
      ? `asset ${assetName} from "${normalizedPath}" codec ${codec}`
      : `asset ${assetName} from "${normalizedPath}"`;
  }

  function insertProjectFileAssetSnippet(entry) {
    const assetName = assetNameFromProjectPath(entry.path);
    const snippet = assetSnippetForEntry(entry, assetName);
    insertTextIntoSource(snippet, { beforeProcedures: true });
    setStatus(`Inserted asset reference for ${entry.path}.`);
  }

  function insertProjectFilePlaySnippet(entry) {
    const assetName = assetNameFromProjectPath(entry.path);
    const stepSuffix = Number.isFinite(entry?.dsoundStep) && entry.dsoundStep > 0
      ? ` step ${entry.dsoundStep}`
      : "";
    const snippet = [
      assetSnippetForEntry(entry, assetName),
      `play dsound ${assetName}${stepSuffix}`
    ].join("\n");
    insertTextIntoSource(snippet, { beforeProcedures: true });
    setStatus(`Inserted dsound reference for ${entry.path}.`);
  }

  function pictureGroupNameFromPath(path) {
    const bare = normalizeProjectFilePath(path).slice("@project/".length).replace(/\\/g, "/");
    const file = bare.split("/").pop() || "Picture";
    const withoutCodec = file.replace(/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster)$/i, "");
    const withoutComponent = withoutCodec.replace(/\.(pc|pattern|pat|chr|color|col|clr|name|nam)$/i, "");
    return assetNameFromProjectPath(withoutComponent || file);
  }

  function insertProjectFilePictureSnippet(entry) {
    const project = getProject();
    const pictureName = pictureGroupNameFromPath(entry.path);
    const targetPrefix = normalizeProjectFilePath(entry.path)
      .replace(/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster)$/i, "")
      .replace(/\.(pc|pattern|pat|chr|color|col|clr|name|nam)$/i, "")
      .toLowerCase();
    const group = (project.projectFiles || []).filter((candidate) => {
      const normalized = normalizeProjectFilePath(candidate.path).toLowerCase();
      const withoutCodec = normalized.replace(/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster)$/i, "");
      return withoutCodec.replace(/\.(pc|pattern|pat|chr|color|col|clr|name|nam)$/i, "") === targetPrefix;
    });
    const patternFile = group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "pattern");
    const colorFile = group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "color");
    const nameFile = group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "name");
    const isIcvGmTileGroup = [patternFile, colorFile, nameFile].every((candidate) => String(candidate?.source || "").startsWith("icvgm-"));
    const isRawShortTileGroup = patternFile && colorFile && nameFile
      && projectFileBytes(patternFile).length === 2048
      && projectFileBytes(colorFile).length === 2048
      && projectFileBytes(nameFile).length === 768;
    if (patternFile && colorFile && nameFile && (isIcvGmTileGroup || isRawShortTileGroup)) {
      insertProjectFileTileScreenSnippet(pictureName, { patternFile, colorFile, nameFile });
      return;
    }
    const componentOrder = ["pc", "pattern", "color", "name"];
    const lines = [`picture ${pictureName}:`];
    for (const component of componentOrder) {
      const found = group.find((candidate) => pictureComponentFromPath?.(candidate.path) === component);
      if (!found) continue;
      const codec = String(found.codec || detectCodecFromName?.(found.path) || "raw").toLowerCase();
      if (component === "pc" && codec !== "raw") {
        setStatus("Compressed .pc picture groups can be previewed, but show picture currently needs separate compressed pattern/color files or a raw .pc file.");
        return;
      }
      const componentName = component === "pc" ? "pattern_color" : component;
      lines.push(codec && codec !== "raw"
        ? `  ${componentName} from "${normalizeProjectFilePath(found.path)}" codec ${codec}`
        : `  ${componentName} from "${normalizeProjectFilePath(found.path)}"`);
    }
    lines.push("end picture", "", `show picture ${pictureName}`);
    insertTextIntoSource(lines.join("\n"), { beforeProcedures: true });
    setStatus(`Inserted picture reference for ${pictureName}.`);
  }

  function insertProjectFileTileScreenSnippet(screenName, { patternFile, colorFile, nameFile }) {
    const patternAsset = assetNameFromProjectPath(patternFile.path);
    const colorAsset = assetNameFromProjectPath(colorFile.path);
    const nameAsset = assetNameFromProjectPath(nameFile.path);
    const assetLine = (entry, assetName) => assetSnippetForEntry(entry, assetName);
    const uploadLine = (entry, assetName, target, count) => {
      const codec = String(entry?.codec || detectCodecFromName?.(entry?.path || "") || "raw").toLowerCase();
      return codec && codec !== "raw"
        ? `decompress ${codec} ${assetName} to ${target}`
        : `copy ${assetName} count ${count} to ${target}`;
    };
    const lines = [
      assetLine(patternFile, patternAsset),
      assetLine(colorFile, colorAsset),
      assetLine(nameFile, nameAsset),
      "",
      "tile screen",
      uploadLine(patternFile, patternAsset, "vram.pattern", 2048),
      "duplicate mode 2 text patterns",
      uploadLine(colorFile, colorAsset, "vram.color", 2048),
      uploadLine(nameFile, nameAsset, "vram.name", 768),
      "screen on"
    ];
    insertTextIntoSource(lines.join("\n"), { beforeProcedures: true });
    setStatus(`Inserted tile-screen asset loading for ${screenName}.`);
  }

  function tileGroupPrefix(path) {
    const normalized = normalizeProjectFilePath(path).toLowerCase();
    const withoutCodec = normalized.replace(/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster)$/i, "");
    return withoutCodec.replace(/\.(pattern|pat|chr|color|col|clr|name|nam)$/i, "");
  }

  function pictureTableGroupPrefix(path) {
    const normalized = normalizeProjectFilePath(path).toLowerCase();
    const withoutCodec = normalized.replace(/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster)$/i, "");
    return withoutCodec.replace(/\.(pc|pattern|pat|chr|color|col|clr|name|nam)$/i, "");
  }

  function pictureTableGroupForEntry(entry) {
    const project = getProject();
    const prefix = pictureTableGroupPrefix(entry.path);
    const group = (project.projectFiles || []).filter((candidate) => pictureTableGroupPrefix(candidate.path) === prefix);
    return {
      pcFile: group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "pc"),
      patternFile: group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "pattern"),
      colorFile: group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "color"),
      nameFile: group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "name")
    };
  }

  function tileGroupForEntry(entry) {
    const project = getProject();
    const prefix = tileGroupPrefix(entry.path);
    const group = (project.projectFiles || []).filter((candidate) => tileGroupPrefix(candidate.path) === prefix);
    const patternFile = group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "pattern");
    const colorFile = group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "color");
    const nameFile = group.find((candidate) => pictureComponentFromPath?.(candidate.path) === "name");
    if (!patternFile || !colorFile || !nameFile) return null;
    return { patternFile, colorFile, nameFile };
  }

  function canOpenTileEditor(entry) {
    return !!tileGroupForEntry(entry);
  }

  function canExportPc(entry) {
    const group = pictureTableGroupForEntry(entry);
    return !!(group.pcFile || (group.patternFile && group.colorFile));
  }

  async function decodedProjectBytes(entry) {
    const bytes = projectFileBytes(entry);
    const codec = String(entry?.codec || detectCodecFromName?.(entry?.path || "") || "raw").toLowerCase();
    if (!codec || codec === "raw") return bytes;
    if (typeof decompressBytes !== "function") throw new Error(`Cannot decode ${entry.path}: no decompressor available.`);
    return await decompressBytes(codec, bytes);
  }

  async function encodedProjectBytes(entry, bytes) {
    const codec = String(entry?.codec || detectCodecFromName?.(entry?.path || "") || "raw").toLowerCase();
    if (!codec || codec === "raw") return { bytes, codec: undefined };
    if (typeof compressBytes !== "function") throw new Error(`Cannot encode ${entry.path}: no compressor available.`);
    return { bytes: await compressBytes(codec, bytes), codec };
  }

  function drawTileToContext(ctx, pattern, color, tileIndex, x, y, scale, options = {}) {
    const base = tileIndex * 8;
    const fallbackColor = options.fallbackColor ?? 0xF0;
    ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < 8; row += 1) {
      const bits = pattern[base + row] || 0;
      const packed = color[base + row] ?? fallbackColor;
      const fg = (packed >> 4) & 0x0F;
      const bg = packed & 0x0F;
      for (let bit = 0; bit < 8; bit += 1) {
        ctx.fillStyle = TMS_PALETTE[(bits & (0x80 >> bit)) ? fg : bg] || "#000";
        ctx.fillRect(x + bit * scale, y + row * scale, scale, scale);
      }
    }
  }

  function icvgmDatTextFromTileTables({ pattern, color, name }) {
    const h2 = (value) => `$${(value & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`;
    const section = (label, data) => {
      const lines = [];
      for (let offset = 0; offset < data.length; offset += 16) {
        const prefix = offset === 0 ? label.padEnd(8) : "        ";
        const bytes = Array.from(data.slice(offset, offset + 16)).map(h2).join(",");
        lines.push(`${prefix}DB      ${bytes}`);
      }
      return lines;
    };
    return [
      ...section("NAME", name.slice(0, 768)),
      ...section("PATTERN", pattern.slice(0, 2048)),
      ...section("MCOLOR", color.slice(0, 2048))
    ].join("\r\n") + "\r\n";
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadBinaryFile(filename, bytes) {
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function datFilenameForTileGroup(group) {
    const base = normalizeProjectFilePath(group?.nameFile?.path || group?.patternFile?.path || "tiles")
      .slice("@project/".length)
      .split("/")
      .pop()
      .replace(/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster)$/i, "")
      .replace(/\.(pattern|pat|chr|color|col|clr|name|nam)$/i, "");
    return `${base || "tiles"}.dat`;
  }

  function pcFilenameForTableGroup(group) {
    const sourcePath = group?.pcFile?.path || group?.nameFile?.path || group?.patternFile?.path || "picture";
    const base = normalizeProjectFilePath(sourcePath)
      .slice("@project/".length)
      .split("/")
      .pop()
      .replace(/\.(zx0|zx7|dan1|dan2|dan3|pletter|lzf|rle|mdkrle|bitbuster)$/i, "")
      .replace(/\.(pc|pattern|pat|chr|color|col|clr|name|nam)$/i, "");
    return `${base || "picture"}.pc`;
  }

  function pcBytesFromPictureTables({ pattern, color, name }) {
    if (pattern.length >= 6144 && color.length >= 6144) {
      const bytes = new Uint8Array(12288);
      bytes.set(pattern.slice(0, 6144), 0);
      bytes.set(color.slice(0, 6144), 6144);
      return bytes;
    }
    if (pattern.length < 2048 || color.length < 2048 || !name || name.length < 768) {
      throw new Error(".pc export needs pattern/color 6144-byte bitmap tables, or pattern=2048, color=2048, name=768 tile tables.");
    }
    const flatPattern = new Uint8Array(6144);
    const flatColor = new Uint8Array(6144);
    for (let charY = 0; charY < 24; charY += 1) {
      for (let charX = 0; charX < 32; charX += 1) {
        const tile = name[charY * 32 + charX] || 0;
        const source = tile * 8;
        const target = charY * 256 + charX * 8;
        for (let row = 0; row < 8; row += 1) {
          flatPattern[target + row] = pattern[source + row] || 0;
          flatColor[target + row] = color[source + row] ?? 0xF0;
        }
      }
    }
    const bytes = new Uint8Array(12288);
    bytes.set(flatPattern, 0);
    bytes.set(flatColor, 6144);
    return bytes;
  }

  function reverseByteBits(byte) {
    let value = byte & 0xFF;
    value = ((value & 0xF0) >> 4) | ((value & 0x0F) << 4);
    value = ((value & 0xCC) >> 2) | ((value & 0x33) << 2);
    value = ((value & 0xAA) >> 1) | ((value & 0x55) << 1);
    return value & 0xFF;
  }

  function rotateTilePatternClockwise(pattern, tileIndex) {
    const source = pattern.slice(tileIndex * 8, tileIndex * 8 + 8);
    for (let y = 0; y < 8; y += 1) {
      let out = 0;
      for (let x = 0; x < 8; x += 1) {
        if (source[7 - x] & (0x80 >> y)) out |= 0x80 >> x;
      }
      pattern[tileIndex * 8 + y] = out;
    }
  }

  async function openProjectTileEditor(entry) {
    const group = tileGroupForEntry(entry);
    if (!group) {
      setStatus(`No complete pattern/color/name tile group found for ${entry.path}.`);
      return;
    }
    try {
      const pattern = new Uint8Array(await decodedProjectBytes(group.patternFile));
      const color = new Uint8Array(await decodedProjectBytes(group.colorFile));
      const name = new Uint8Array(await decodedProjectBytes(group.nameFile));
      if (pattern.length < 2048 || color.length < 2048 || name.length < 768) {
        throw new Error("Tile editor needs raw/decompressed pattern=2048, color=2048, name=768 bytes.");
      }
      await createTileEditorDialog({
        pattern: pattern.slice(0, 2048),
        color: color.slice(0, 2048),
        name: name.slice(0, 768),
        group
      });
    } catch (error) {
      setStatus(`Tile editor failed for ${entry.path}: ${error?.message || error}`);
    }
  }

  async function exportProjectTileGroupAsDat(entry) {
    const group = tileGroupForEntry(entry);
    if (!group) {
      setStatus(`No complete pattern/color/name tile group found for ${entry.path}.`);
      return;
    }
    try {
      const pattern = new Uint8Array(await decodedProjectBytes(group.patternFile));
      const color = new Uint8Array(await decodedProjectBytes(group.colorFile));
      const name = new Uint8Array(await decodedProjectBytes(group.nameFile));
      if (pattern.length < 2048 || color.length < 2048 || name.length < 768) {
        throw new Error("ICVGM export needs raw/decompressed pattern=2048, color=2048, name=768 bytes.");
      }
      downloadTextFile(datFilenameForTileGroup(group), icvgmDatTextFromTileTables({
        pattern: pattern.slice(0, 2048),
        color: color.slice(0, 2048),
        name: name.slice(0, 768)
      }));
      setStatus(`Exported ${datFilenameForTileGroup(group)}.`);
    } catch (error) {
      setStatus(`ICVGM export failed for ${entry.path}: ${error?.message || error}`);
    }
  }

  async function exportProjectGroupAsPc(entry) {
    const group = pictureTableGroupForEntry(entry);
    if (!group.pcFile && (!group.patternFile || !group.colorFile)) {
      setStatus(`No pattern/color table group found for ${entry.path}.`);
      return;
    }
    try {
      if (group.pcFile && pictureComponentFromPath?.(entry.path) === "pc") {
        const pcBytes = new Uint8Array(await decodedProjectBytes(group.pcFile));
        if (pcBytes.length < 12288) throw new Error(`.pc export needs 12288 bytes; got ${pcBytes.length}.`);
        downloadBinaryFile(pcFilenameForTableGroup(group), pcBytes.slice(0, 12288));
        setStatus(`Exported ${pcFilenameForTableGroup(group)}.`);
        return;
      }
      const pattern = new Uint8Array(await decodedProjectBytes(group.patternFile));
      const color = new Uint8Array(await decodedProjectBytes(group.colorFile));
      const name = group.nameFile ? new Uint8Array(await decodedProjectBytes(group.nameFile)) : null;
      const pcBytes = pcBytesFromPictureTables({ pattern, color, name });
      downloadBinaryFile(pcFilenameForTableGroup(group), pcBytes);
      setStatus(`Exported ${pcFilenameForTableGroup(group)}.`);
    } catch (error) {
      setStatus(`PC export failed for ${entry.path}: ${error?.message || error}`);
    }
  }

  async function createTileEditorDialog({ pattern, color, name, group }) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "tile-editor-modal";
      const panel = document.createElement("div");
      panel.className = "tile-editor-modal__panel";

      const header = document.createElement("div");
      header.className = "tile-editor-modal__header";
      const title = document.createElement("h2");
      title.textContent = "ICVGM Tile Editor";
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Close";
      header.appendChild(title);
      header.appendChild(close);
      panel.appendChild(header);

      const help = document.createElement("p");
      help.className = "hint";
      help.textContent = "Screen NAME, charset PATTERN, row colors, and direct hex bytes. Pick a character from the charset, edit it, then stamp it on the screen map.";
      panel.appendChild(help);

      const body = document.createElement("div");
      body.className = "tile-editor-modal__body";
      const left = document.createElement("div");
      left.className = "tile-editor-modal__left tile-editor-screen-area";
      const right = document.createElement("div");
      right.className = "tile-editor-modal__right tile-editor-inspector";
      const bottom = document.createElement("div");
      bottom.className = "tile-editor-charset-area";

      const makeEditorPanel = (headingText, detailText, className = "") => {
        const section = document.createElement("section");
        section.className = `tile-editor-panel${className ? ` ${className}` : ""}`;
        const heading = document.createElement("h3");
        heading.textContent = headingText;
        section.appendChild(heading);
        if (detailText) {
          const detail = document.createElement("p");
          detail.className = "tile-editor-panel__hint";
          detail.textContent = detailText;
          section.appendChild(detail);
        }
        return section;
      };

      const makeArrowButton = (label, className, title) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.className = `tile-editor-arrow ${className}`;
        button.title = title;
        return button;
      };

      const screenCanvas = document.createElement("canvas");
      screenCanvas.width = 512;
      screenCanvas.height = 384;
      screenCanvas.className = "tile-editor-screen";
      const screenWrap = document.createElement("div");
      screenWrap.className = "tile-editor-screen-wrap";
      const screenPickButton = makeArrowButton("⌕", "tile-editor-screen-tool tile-editor-screen-tool--pick", "Pipette: select the character stored at the clicked screen cell.");
      const screenShiftUpButton = makeArrowButton("▲", "tile-editor-screen-arrow tile-editor-screen-arrow--up", "Shift the screen NAME table up.");
      const screenShiftDownButton = makeArrowButton("▼", "tile-editor-screen-arrow tile-editor-screen-arrow--down", "Shift the screen NAME table down.");
      const screenShiftLeftButton = makeArrowButton("◀", "tile-editor-screen-arrow tile-editor-screen-arrow--left", "Shift the screen NAME table left.");
      const screenShiftRightButton = makeArrowButton("▶", "tile-editor-screen-arrow tile-editor-screen-arrow--right", "Shift the screen NAME table right.");
      const screenHoverLabel = document.createElement("div");
      screenHoverLabel.className = "tile-editor-readout";
      screenHoverLabel.textContent = "Screen: hover a cell to see its character.";
      const gridCanvas = document.createElement("canvas");
      gridCanvas.width = 512;
      gridCanvas.height = 128;
      gridCanvas.className = "tile-editor-grid";
      const screenPanel = makeEditorPanel("Screen / NAME table", "Top-left ICVGM screen result. Hover tells which character is really stored at that cell.");
      screenWrap.appendChild(screenPickButton);
      screenWrap.appendChild(screenShiftUpButton);
      screenWrap.appendChild(screenShiftLeftButton);
      screenWrap.appendChild(screenCanvas);
      screenWrap.appendChild(screenShiftRightButton);
      screenWrap.appendChild(screenShiftDownButton);
      screenPanel.appendChild(screenWrap);
      screenPanel.appendChild(screenHoverLabel);
      const charsetPanel = makeEditorPanel("Charset / PATTERN table", "ICVGM layout: 32 columns by 8 rows, 256 characters total.");
      charsetPanel.appendChild(gridCanvas);
      left.appendChild(screenPanel);
      bottom.appendChild(charsetPanel);

      const selectedLabel = document.createElement("div");
      selectedLabel.className = "tile-editor-modal__selected";
      const editCanvas = document.createElement("canvas");
      editCanvas.width = 256;
      editCanvas.height = 256;
      editCanvas.className = "tile-editor-edit";
      const characterGridWrap = document.createElement("div");
      characterGridWrap.className = "tile-editor-character-grid-wrap";
      const shiftUpButton = makeArrowButton("▲", "tile-editor-arrow--up", "Shift character pixels up.");
      const shiftDownButton = makeArrowButton("▼", "tile-editor-arrow--down", "Shift character pixels down.");
      const shiftLeftButton = makeArrowButton("◀", "tile-editor-arrow--left", "Shift character pixels left.");
      const shiftRightButton = makeArrowButton("▶", "tile-editor-arrow--right", "Shift character pixels right.");
      const colorStrip = document.createElement("div");
      colorStrip.className = "tile-editor-color-strip";
      const topColorControls = document.createElement("div");
      topColorControls.className = "tile-editor-top-colors";
      const topFgButton = document.createElement("button");
      topFgButton.type = "button";
      topFgButton.title = "Current foreground color. Click to target FG; double-click to copy this FG/BG to all rows.";
      const topBgButton = document.createElement("button");
      topBgButton.type = "button";
      topBgButton.title = "Current background color. Click to target BG; double-click to copy this FG/BG to all rows.";
      topColorControls.appendChild(topFgButton);
      topColorControls.appendChild(topBgButton);
      const toolControls = document.createElement("div");
      toolControls.className = "tile-editor-toolbar";
      const rowControls = document.createElement("div");
      rowControls.className = "tile-editor-rows";
      const hexEditor = document.createElement("textarea");
      hexEditor.className = "tile-editor-hex";
      hexEditor.rows = 8;
      hexEditor.spellcheck = false;
      hexEditor.title = "Edit the 8 pattern bytes for the selected character. Accepts hex as 00, $00, or 0x00.";
      const characterPanel = makeEditorPanel("Character", "Foreground/background, row colors, 8x8 pixels, hex bytes, and transforms in one ICVGM-style block.");
      const characterStage = document.createElement("div");
      characterStage.className = "tile-editor-character-stage";
      characterPanel.appendChild(topColorControls);
      characterPanel.appendChild(selectedLabel);
      characterStage.appendChild(colorStrip);
      characterStage.appendChild(rowControls);
      characterGridWrap.appendChild(shiftUpButton);
      characterGridWrap.appendChild(shiftLeftButton);
      characterGridWrap.appendChild(editCanvas);
      characterGridWrap.appendChild(shiftRightButton);
      characterGridWrap.appendChild(shiftDownButton);
      characterStage.appendChild(characterGridWrap);
      characterStage.appendChild(hexEditor);
      characterPanel.appendChild(characterStage);
      const spritesPanel = document.createElement("details");
      spritesPanel.className = "tile-editor-panel tile-editor-sprites";
      const spritesSummary = document.createElement("summary");
      spritesSummary.textContent = "Sprites mockup";
      const spritesHint = document.createElement("p");
      spritesHint.className = "tile-editor-panel__hint";
      spritesHint.textContent = "Collapsed like ICVGM. This needs the ICVGM sprite pattern and sprite attribute tables so title screens and mockups can preview sprites with the ColecoVision 4-sprites-per-scanline limit.";
      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = 256;
      spriteCanvas.height = 256;
      spriteCanvas.className = "tile-editor-sprite-canvas";
      const spriteCtx = spriteCanvas.getContext("2d");
      spriteCtx.fillStyle = "#05080c";
      spriteCtx.fillRect(0, 0, spriteCanvas.width, spriteCanvas.height);
      spriteCtx.fillStyle = "#f2f5d0";
      spriteCtx.font = "14px sans-serif";
      spriteCtx.fillText("16x16 sprite editor", 48, 116);
      spriteCtx.fillText("next ICVGM pass", 58, 138);
      spritesPanel.appendChild(spritesSummary);
      spritesPanel.appendChild(spritesHint);
      spritesPanel.appendChild(spriteCanvas);
      characterPanel.appendChild(toolControls);
      right.appendChild(characterPanel);
      right.appendChild(spritesPanel);

      const actions = document.createElement("div");
      actions.className = "tile-editor-modal__actions";
      const save = document.createElement("button");
      save.type = "button";
      save.className = "button--primary";
      save.textContent = "Save project tables";
      const exportDat = document.createElement("button");
      exportDat.type = "button";
      exportDat.textContent = "Export ICVGM .dat";
      const exportPc = document.createElement("button");
      exportPc.type = "button";
      exportPc.textContent = "Export .pc";
      const insert = document.createElement("button");
      insert.type = "button";
      insert.textContent = "Use in source";
      insert.title = "Insert Amy code that loads these project tables into VRAM.";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Close";
      actions.appendChild(save);
      actions.appendChild(exportDat);
      actions.appendChild(exportPc);
      actions.appendChild(insert);
      actions.appendChild(cancel);

      body.appendChild(left);
      body.appendChild(right);
      body.appendChild(bottom);
      panel.appendChild(body);
      panel.appendChild(actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      let selectedTile = name[0] || 0;
      let selectedRow = 0;
      let drawTool = "toggle";
      let mapTool = "select";
      let paletteTarget = "fg";
      let tileClipboard = null;
      let lineStart = null;
      let drawActionActive = false;
      let mapActionActive = false;
      const undoStack = [];
      const redoStack = [];
      let dirty = false;

      const makeToolButton = (label, title, onClick) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        if (title) button.title = title;
        button.addEventListener("click", onClick);
        return button;
      };

      const patternHexForTile = (tile) => Array.from(pattern.slice(tile * 8, tile * 8 + 8))
        .map((value) => `$${value.toString(16).padStart(2, "0").toUpperCase()}`)
        .join("\n");

      const renderHexEditor = () => {
        if (document.activeElement === hexEditor) return;
        hexEditor.value = patternHexForTile(selectedTile);
      };

      const parsePatternHexEditor = () => {
        const tokens = hexEditor.value
          .replace(/;.*$/gm, " ")
          .replace(/#.*$/gm, " ")
          .match(/(?:0x|\$)?[0-9a-fA-F]{1,2}/g) || [];
        if (tokens.length < 8) {
          setStatus("Hex editor needs 8 bytes for the selected character.");
          renderHexEditor();
          return;
        }
        const bytes = tokens.slice(0, 8).map((token) => {
          const clean = token.replace(/^0x/i, "").replace(/^\$/, "");
          return parseInt(clean, 16) & 0xFF;
        });
        const base = selectedTile * 8;
        if (bytes.every((value, index) => pattern[base + index] === value)) {
          renderHexEditor();
          return;
        }
        pushUndo();
        pattern.set(bytes, base);
        dirty = true;
        renderAll();
      };

      const snapshotTables = () => ({
        pattern: pattern.slice(),
        color: color.slice(),
        name: name.slice(),
        selectedTile,
        selectedRow
      });

      const restoreSnapshot = (snapshot) => {
        pattern.set(snapshot.pattern);
        color.set(snapshot.color);
        name.set(snapshot.name);
        selectedTile = snapshot.selectedTile;
        selectedRow = snapshot.selectedRow;
        lineStart = null;
        dirty = true;
        renderAll();
      };

      const pushUndo = () => {
        undoStack.push(snapshotTables());
        if (undoStack.length > 40) undoStack.shift();
        redoStack.length = 0;
      };

      const undo = () => {
        const snapshot = undoStack.pop();
        if (!snapshot) return;
        redoStack.push(snapshotTables());
        restoreSnapshot(snapshot);
      };

      const redo = () => {
        const snapshot = redoStack.pop();
        if (!snapshot) return;
        undoStack.push(snapshotTables());
        restoreSnapshot(snapshot);
      };

      const setPatternPixel = (tile, x, y, value) => {
        const offset = tile * 8 + y;
        const mask = 0x80 >> x;
        if (value) pattern[offset] |= mask;
        else pattern[offset] &= ~mask;
      };

      const getPatternPixel = (tile, x, y) => ((pattern[tile * 8 + y] || 0) & (0x80 >> x)) ? 1 : 0;

      const drawPatternLine = (tile, x0, y0, x1, y1, value) => {
        let dx = Math.abs(x1 - x0);
        let sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0);
        let sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          setPatternPixel(tile, x0, y0, value);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) {
            err += dy;
            x0 += sx;
          }
          if (e2 <= dx) {
            err += dx;
            y0 += sy;
          }
        }
      };

      const floodFillPattern = (tile, x, y, value) => {
        const target = getPatternPixel(tile, x, y);
        if (target === value) return;
        const stack = [[x, y]];
        while (stack.length) {
          const [cx, cy] = stack.pop();
          if (cx < 0 || cx > 7 || cy < 0 || cy > 7 || getPatternPixel(tile, cx, cy) !== target) continue;
          setPatternPixel(tile, cx, cy, value);
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
      };

      const shiftTilePattern = (tile, dx, dy) => {
        const oldRows = Array.from(pattern.slice(tile * 8, tile * 8 + 8));
        const nextRows = new Array(8).fill(0);
        for (let y = 0; y < 8; y += 1) {
          for (let x = 0; x < 8; x += 1) {
            const sourceX = (x - dx + 8) & 7;
            const sourceY = (y - dy + 8) & 7;
            if (oldRows[sourceY] & (0x80 >> sourceX)) nextRows[y] |= 0x80 >> x;
          }
        }
        pattern.set(nextRows, tile * 8);
      };

      const stampTileAt = (col, row) => {
        const offset = row * 32 + col;
        if (name[offset] === selectedTile) return false;
        name[offset] = selectedTile;
        return true;
      };

      const shiftNameTable = (dx, dy) => {
        const oldName = Array.from(name);
        for (let row = 0; row < 24; row += 1) {
          for (let col = 0; col < 32; col += 1) {
            const sourceCol = (col - dx + 32) % 32;
            const sourceRow = (row - dy + 24) % 24;
            name[row * 32 + col] = oldName[sourceRow * 32 + sourceCol] || 0;
          }
        }
      };

      const renderToolControls = () => {
        toolControls.textContent = "";
        const drawGroup = document.createElement("div");
        drawGroup.className = "tile-editor-toolbar__group";
        const mapGroup = document.createElement("div");
        mapGroup.className = "tile-editor-toolbar__group";
        const opsGroup = document.createElement("div");
        opsGroup.className = "tile-editor-toolbar__group";
        const drawButton = makeToolButton("Draw", "Set pixels on the tile editor.", () => { drawTool = "draw"; renderToolControls(); });
        const eraseButton = makeToolButton("Erase", "Clear pixels on the tile editor.", () => { drawTool = "erase"; renderToolControls(); });
        const toggleButton = makeToolButton("Toggle", "Flip pixels on the tile editor.", () => { drawTool = "toggle"; renderToolControls(); });
        const fillButton = makeToolButton("Fill", "Flood-fill connected pixels inside the selected tile.", () => { drawTool = "fill"; lineStart = null; renderToolControls(); });
        const lineButton = makeToolButton("Line", "Click two points in the tile editor to draw a line.", () => { drawTool = "line"; lineStart = null; renderToolControls(); });
        for (const [button, value] of [[drawButton, "draw"], [eraseButton, "erase"], [toggleButton, "toggle"], [fillButton, "fill"], [lineButton, "line"]]) {
          button.classList.toggle("is-active", drawTool === value);
          drawGroup.appendChild(button);
        }
        const selectMapButton = makeToolButton("Pick map", "Click the screen preview to select the tile used there.", () => { mapTool = "select"; renderToolControls(); });
        const stampMapButton = makeToolButton("Stamp map", "Click or drag the screen preview to place the selected tile in the NAME table.", () => { mapTool = "stamp"; renderToolControls(); });
        for (const [button, value] of [[selectMapButton, "select"], [stampMapButton, "stamp"]]) {
          button.classList.toggle("is-active", mapTool === value);
          mapGroup.appendChild(button);
        }
        mapGroup.appendChild(makeToolButton("Fill map", "Fill the whole NAME table with the selected tile.", () => {
          pushUndo();
          name.fill(selectedTile);
          dirty = true;
          renderAll();
        }));
        mapGroup.appendChild(makeToolButton("Clear map", "Fill the NAME table with tile 0.", () => {
          pushUndo();
          name.fill(0);
          dirty = true;
          renderAll();
        }));
        const undoButton = makeToolButton("Undo", "Undo the last tile-editor change.", undo);
        const redoButton = makeToolButton("Redo", "Redo the last undone tile-editor change.", redo);
        undoButton.disabled = !undoStack.length;
        redoButton.disabled = !redoStack.length;
        opsGroup.appendChild(undoButton);
        opsGroup.appendChild(redoButton);
        opsGroup.appendChild(makeToolButton("Clear", "Clear the selected tile pattern.", () => {
          pushUndo();
          pattern.fill(0, selectedTile * 8, selectedTile * 8 + 8);
          dirty = true;
          renderAll();
        }));
        opsGroup.appendChild(makeToolButton("Inv", "Invert the selected tile pattern.", () => {
          pushUndo();
          for (let row = 0; row < 8; row += 1) pattern[selectedTile * 8 + row] ^= 0xFF;
          dirty = true;
          renderAll();
        }));
        opsGroup.appendChild(makeToolButton("Flip H", "Mirror the selected tile horizontally.", () => {
          pushUndo();
          for (let row = 0; row < 8; row += 1) pattern[selectedTile * 8 + row] = reverseByteBits(pattern[selectedTile * 8 + row]);
          dirty = true;
          renderAll();
        }));
        opsGroup.appendChild(makeToolButton("Flip V", "Mirror the selected tile vertically.", () => {
          pushUndo();
          const base = selectedTile * 8;
          for (let row = 0; row < 4; row += 1) {
            const tmp = pattern[base + row];
            pattern[base + row] = pattern[base + 7 - row];
            pattern[base + 7 - row] = tmp;
          }
          dirty = true;
          renderAll();
        }));
        opsGroup.appendChild(makeToolButton("Rot 90", "Rotate the selected tile pattern clockwise.", () => {
          pushUndo();
          rotateTilePatternClockwise(pattern, selectedTile);
          dirty = true;
          renderAll();
        }));
        opsGroup.appendChild(makeToolButton("Copy", "Copy selected tile pattern and colors.", () => {
          tileClipboard = {
            pattern: pattern.slice(selectedTile * 8, selectedTile * 8 + 8),
            color: color.slice(selectedTile * 8, selectedTile * 8 + 8)
          };
          setStatus(`Copied tile ${selectedTile}.`);
          renderToolControls();
        }));
        const pasteButton = makeToolButton("Paste", "Paste copied tile pattern and colors into selected tile.", () => {
          if (!tileClipboard) return;
          pushUndo();
          pattern.set(tileClipboard.pattern, selectedTile * 8);
          color.set(tileClipboard.color, selectedTile * 8);
          dirty = true;
          renderAll();
        });
        pasteButton.disabled = !tileClipboard;
        opsGroup.appendChild(pasteButton);
        toolControls.appendChild(drawGroup);
        toolControls.appendChild(mapGroup);
        toolControls.appendChild(opsGroup);
      };

      const renderScreen = () => {
        const ctx = screenCanvas.getContext("2d");
        ctx.clearRect(0, 0, screenCanvas.width, screenCanvas.height);
        for (let row = 0; row < 24; row += 1) {
          for (let col = 0; col < 32; col += 1) {
            drawTileToContext(ctx, pattern, color, name[row * 32 + col] || 0, col * 16, row * 16, 2);
          }
        }
      };

      const renderGrid = () => {
        const ctx = gridCanvas.getContext("2d");
        ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        for (let tile = 0; tile < 256; tile += 1) {
          const x = (tile & 31) * 16;
          const y = (tile >> 5) * 16;
          drawTileToContext(ctx, pattern, color, tile, x, y, 2);
          if (tile === selectedTile) {
            ctx.strokeStyle = "#ffd15c";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y + 1.5, 13, 13);
          }
        }
      };

      const renderEditor = () => {
        const packed = color[selectedTile * 8 + selectedRow] ?? 0xF0;
        selectedLabel.textContent = "";
        const nav = document.createElement("div");
        nav.className = "tile-editor-nav";
        const prev = makeToolButton("Prev", "Previous tile.", () => {
          selectedTile = (selectedTile + 255) & 0xFF;
          selectedRow = 0;
          renderAll();
        });
        const next = makeToolButton("Next", "Next tile.", () => {
          selectedTile = (selectedTile + 1) & 0xFF;
          selectedRow = 0;
          renderAll();
        });
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "255";
        input.value = String(selectedTile);
        input.title = "Selected tile index.";
        input.addEventListener("change", () => {
          selectedTile = Math.max(0, Math.min(255, Number(input.value) | 0));
          selectedRow = 0;
          renderAll();
        });
        const label = document.createElement("span");
        label.textContent = `Tile $${selectedTile.toString(16).padStart(2, "0").toUpperCase()} · row ${selectedRow} · FG ${(packed >> 4) & 15} / BG ${packed & 15}`;
        nav.appendChild(prev);
        nav.appendChild(input);
        nav.appendChild(next);
        nav.appendChild(label);
        selectedLabel.appendChild(nav);
        const ctx = editCanvas.getContext("2d");
        ctx.clearRect(0, 0, editCanvas.width, editCanvas.height);
        drawTileToContext(ctx, pattern, color, selectedTile, 0, 0, 32);
        ctx.strokeStyle = "#ffd15c";
        ctx.lineWidth = 4;
        ctx.strokeRect(0, selectedRow * 32 + 2, 256, 28);
      };

      const renderPalette = () => {
        colorStrip.textContent = "";
        const packed = color[selectedTile * 8 + selectedRow] ?? 0xF0;
        const currentFg = (packed >> 4) & 15;
        const currentBg = packed & 15;
        topFgButton.style.background = TMS_PALETTE[currentFg] || "#000";
        topFgButton.classList.toggle("is-active", paletteTarget === "fg");
        topFgButton.textContent = "FG";
        topBgButton.style.background = TMS_PALETTE[currentBg] || "#000";
        topBgButton.classList.toggle("is-active", paletteTarget === "bg");
        topBgButton.textContent = "BG";
        for (let i = 0; i < 16; i += 1) {
          const swatch = document.createElement("button");
          swatch.type = "button";
          swatch.title = `TMS color ${i} for selected row ${paletteTarget.toUpperCase()}`;
          swatch.style.background = TMS_PALETTE[i] || "#000";
          swatch.addEventListener("click", () => {
            const base = selectedTile * 8 + selectedRow;
            const oldPacked = color[base] ?? 0xF0;
            pushUndo();
            color[base] = paletteTarget === "fg"
              ? ((i & 15) << 4) | (oldPacked & 15)
              : (oldPacked & 0xF0) | (i & 15);
            dirty = true;
            renderAll();
          });
          colorStrip.appendChild(swatch);
        }
      };

      topFgButton.addEventListener("click", () => {
        paletteTarget = "fg";
        renderPalette();
      });
      topBgButton.addEventListener("click", () => {
        paletteTarget = "bg";
        renderPalette();
      });
      const applySelectedRowColorsToTile = () => {
        pushUndo();
        const rowColor = color[selectedTile * 8 + selectedRow] ?? 0xF0;
        color.fill(rowColor, selectedTile * 8, selectedTile * 8 + 8);
        dirty = true;
        renderAll();
      };
      topFgButton.addEventListener("dblclick", applySelectedRowColorsToTile);
      topBgButton.addEventListener("dblclick", applySelectedRowColorsToTile);

      const renderRows = () => {
        rowControls.textContent = "";
        const base = selectedTile * 8;
        for (let row = 0; row < 8; row += 1) {
          const packed = color[base + row] ?? 0xF0;
          const line = document.createElement("div");
          line.className = `tile-editor-row${row === selectedRow ? " tile-editor-row--active" : ""}`;
          const rowButton = document.createElement("button");
          rowButton.type = "button";
          rowButton.textContent = `Row ${row}`;
          rowButton.addEventListener("click", () => {
            selectedRow = row;
            renderAll();
          });
          const fgValue = (packed >> 4) & 0x0F;
          const bgValue = packed & 0x0F;
          const fg = document.createElement("button");
          fg.type = "button";
          fg.className = "tile-editor-row-color tile-editor-row-color--fg";
          fg.title = `Row ${row} foreground ${fgValue}`;
          fg.style.background = TMS_PALETTE[fgValue] || "#000";
          fg.textContent = String(row);
          fg.addEventListener("click", () => {
            selectedRow = row;
            paletteTarget = "fg";
            renderAll();
          });
          const bg = document.createElement("button");
          bg.type = "button";
          bg.className = "tile-editor-row-color tile-editor-row-color--bg";
          bg.title = `Row ${row} background ${bgValue}`;
          bg.style.background = TMS_PALETTE[bgValue] || "#000";
          bg.addEventListener("click", () => {
            selectedRow = row;
            paletteTarget = "bg";
            renderAll();
          });
          line.appendChild(rowButton);
          line.appendChild(fg);
          line.appendChild(bg);
          rowControls.appendChild(line);
        }
      };

      const renderAll = () => {
        renderToolControls();
        renderScreen();
        renderGrid();
        renderEditor();
        renderHexEditor();
        renderPalette();
        renderRows();
      };

      const screenPointerToCell = (event) => {
        const rect = screenCanvas.getBoundingClientRect();
        const col = Math.max(0, Math.min(31, Math.floor(((event.clientX - rect.left) / rect.width) * 32)));
        const row = Math.max(0, Math.min(23, Math.floor(((event.clientY - rect.top) / rect.height) * 24)));
        return { col, row };
      };

      const handleScreenPaint = (event) => {
        const { col, row } = screenPointerToCell(event);
        const tile = name[row * 32 + col] || 0;
        screenHoverLabel.textContent = `Screen ${col},${row} -> C=${tile} ($${tile.toString(16).padStart(2, "0").toUpperCase()})`;
        if (mapTool === "stamp") {
          if (!mapActionActive) {
            pushUndo();
            mapActionActive = true;
          }
          dirty = stampTileAt(col, row) || dirty;
        } else {
          selectedTile = name[row * 32 + col] || 0;
          selectedRow = 0;
          setStatus(`Picked screen ${col},${row}: character ${selectedTile} ($${selectedTile.toString(16).padStart(2, "0").toUpperCase()}) for editing.`);
        }
        renderAll();
      };

      const handleScreenHover = (event) => {
        const { col, row } = screenPointerToCell(event);
        const tile = name[row * 32 + col] || 0;
        screenHoverLabel.textContent = `Screen ${col},${row} -> C=${tile} ($${tile.toString(16).padStart(2, "0").toUpperCase()})`;
      };

      screenCanvas.addEventListener("click", handleScreenPaint);
      screenCanvas.addEventListener("mousedown", () => { mapActionActive = false; });
      screenCanvas.addEventListener("mousemove", (event) => {
        handleScreenHover(event);
        if (mapTool !== "stamp" || event.buttons !== 1) return;
        handleScreenPaint(event);
      });
      screenPickButton.addEventListener("click", () => {
        mapTool = "select";
        setStatus("Pipette active: click the screen to identify and edit that character.");
        renderToolControls();
      });
      const shiftScreenNameTable = (dx, dy) => {
        pushUndo();
        shiftNameTable(dx, dy);
        dirty = true;
        renderAll();
      };
      screenShiftUpButton.addEventListener("click", () => shiftScreenNameTable(0, -1));
      screenShiftDownButton.addEventListener("click", () => shiftScreenNameTable(0, 1));
      screenShiftLeftButton.addEventListener("click", () => shiftScreenNameTable(-1, 0));
      screenShiftRightButton.addEventListener("click", () => shiftScreenNameTable(1, 0));

      gridCanvas.addEventListener("click", (event) => {
        const rect = gridCanvas.getBoundingClientRect();
        const col = Math.max(0, Math.min(31, Math.floor(((event.clientX - rect.left) / rect.width) * 32)));
        const row = Math.max(0, Math.min(7, Math.floor(((event.clientY - rect.top) / rect.height) * 8)));
        selectedTile = row * 32 + col;
        selectedRow = 0;
        renderAll();
      });

      const editPointerToPixel = (event) => {
        const rect = editCanvas.getBoundingClientRect();
        const bit = Math.max(0, Math.min(7, Math.floor(((event.clientX - rect.left) / rect.width) * 8)));
        const row = Math.max(0, Math.min(7, Math.floor(((event.clientY - rect.top) / rect.height) * 8)));
        return { bit, row };
      };

      const drawTilePixel = (event) => {
        const { bit, row } = editPointerToPixel(event);
        if (drawTool === "line") {
          if (!lineStart) {
            lineStart = { bit, row };
            selectedRow = row;
            renderAll();
            return;
          }
          pushUndo();
          drawPatternLine(selectedTile, lineStart.bit, lineStart.row, bit, row, 1);
          lineStart = null;
        } else {
          if (!drawActionActive) {
            pushUndo();
            drawActionActive = true;
          }
          const value = drawTool === "erase" ? 0 : 1;
          if (drawTool === "fill") floodFillPattern(selectedTile, bit, row, value);
          else if (drawTool === "toggle") setPatternPixel(selectedTile, bit, row, getPatternPixel(selectedTile, bit, row) ? 0 : 1);
          else setPatternPixel(selectedTile, bit, row, value);
        }
        selectedRow = row;
        dirty = true;
        renderAll();
      };

      editCanvas.addEventListener("mousedown", () => { drawActionActive = false; });
      editCanvas.addEventListener("click", drawTilePixel);
      editCanvas.addEventListener("mousemove", (event) => {
        if (event.buttons !== 1 || drawTool === "line" || drawTool === "fill") return;
        drawTilePixel(event);
      });
      const shiftSelectedTile = (dx, dy) => {
        pushUndo();
        shiftTilePattern(selectedTile, dx, dy);
        dirty = true;
        renderAll();
      };
      shiftUpButton.addEventListener("click", () => shiftSelectedTile(0, -1));
      shiftDownButton.addEventListener("click", () => shiftSelectedTile(0, 1));
      shiftLeftButton.addEventListener("click", () => shiftSelectedTile(-1, 0));
      shiftRightButton.addEventListener("click", () => shiftSelectedTile(1, 0));
      hexEditor.addEventListener("change", parsePatternHexEditor);
      hexEditor.addEventListener("blur", parsePatternHexEditor);
      const stopPointerActions = () => {
        drawActionActive = false;
        mapActionActive = false;
      };
      window.addEventListener("mouseup", stopPointerActions);

      const closeDialog = () => {
        window.removeEventListener("mouseup", stopPointerActions);
        overlay.remove();
        resolve(dirty);
      };
      close.addEventListener("click", closeDialog);
      cancel.addEventListener("click", closeDialog);
      insert.addEventListener("click", () => insertProjectFileTileScreenSnippet("TileScreen", group));
      exportDat.addEventListener("click", () => {
        downloadTextFile(datFilenameForTileGroup(group), icvgmDatTextFromTileTables({ pattern, color, name }));
        setStatus("Exported ICVGM .dat from current tile tables.");
      });
      exportPc.addEventListener("click", () => {
        downloadBinaryFile(pcFilenameForTableGroup(group), pcBytesFromPictureTables({ pattern, color, name }));
        setStatus("Exported .pc from current tile screen.");
      });
      save.addEventListener("click", async () => {
        try {
          const encodedPattern = await encodedProjectBytes(group.patternFile, pattern);
          const encodedColor = await encodedProjectBytes(group.colorFile, color);
          const encodedName = await encodedProjectBytes(group.nameFile, name);
          upsertProjectFile({
            ...group.patternFile,
            base64: bytesToBase64(encodedPattern.bytes),
            codec: encodedPattern.codec
          });
          upsertProjectFile({
            ...group.colorFile,
            base64: bytesToBase64(encodedColor.bytes),
            codec: encodedColor.codec
          });
          upsertProjectFile({
            ...group.nameFile,
            base64: bytesToBase64(encodedName.bytes),
            codec: encodedName.codec
          });
          dirty = false;
          setStatus("Saved tile tables back to project files.");
        } catch (error) {
          setStatus(`Saving tile tables failed: ${error?.message || error}`);
        }
      });

      renderAll();
    });
  }

  async function previewProjectFilePicture(entry) {
    try {
      await previewPictureProjectFile(entry, getProject().projectFiles || [], {
        projectFileBytes,
        decompressBytes,
        detectCodecFromName
      });
      setStatus(`Showing picture preview for ${entry.path}.`);
    } catch (error) {
      setStatus(`Picture preview failed for ${entry.path}: ${error?.message || error}`);
    }
  }

  function formatSignedBytes(bytes) {
    const value = Number(bytes) || 0;
    return value >= 0 ? `saves ${formatByteSize(value)}` : `costs ${formatByteSize(-value)}`;
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function createPictureImportOptionsChooser(file) {
    if (typeof document === "undefined") {
      return { resize: "fit", brightness: 0, contrast: 0, saturation: 0, gamma: 100, ditherMode: "error-diffusion", ditherAmount: 75, imageSmoothing: true };
    }
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "9999";
      overlay.style.background = "rgba(8, 13, 18, 0.72)";
      overlay.style.display = "grid";
      overlay.style.placeItems = "center";
      overlay.style.padding = "24px";

      const panel = document.createElement("div");
      panel.style.width = "min(980px, 96vw)";
      panel.style.maxHeight = "90vh";
      panel.style.overflow = "auto";
      panel.style.background = "#eef5ef";
      panel.style.color = "#18202a";
      panel.style.border = "3px solid #18202a";
      panel.style.boxShadow = "10px 10px 0 rgba(0,0,0,0.35)";
      panel.style.padding = "18px";
      panel.style.fontFamily = "Georgia, 'Times New Roman', serif";

      const title = document.createElement("h2");
      title.textContent = `Prepare picture import for ${file.name}`;
      title.style.margin = "0 0 8px";
      panel.appendChild(title);

      const help = document.createElement("p");
      help.textContent = "Choose fit and CV Paint-style color conversion before Coleco/TMS9918 compression. The preview is the final pattern/color result.";
      help.style.margin = "0 0 14px";
      panel.appendChild(help);

      const body = document.createElement("div");
      body.style.display = "grid";
      body.style.gridTemplateColumns = "minmax(260px, 340px) minmax(320px, 1fr)";
      body.style.gap = "16px";

      const form = document.createElement("div");
      form.style.display = "grid";
      form.style.gap = "12px";

      const makeLabel = (text) => {
        const label = document.createElement("label");
        label.style.display = "grid";
        label.style.gap = "4px";
        label.textContent = text;
        return label;
      };

      const resizeLabel = makeLabel("Image fit");
      const resize = document.createElement("select");
      for (const [value, text] of [
        ["fit", "Fit inside 256x192, preserve aspect ratio"],
        ["cover", "Crop to fill 256x192, preserve aspect ratio"],
        ["stretch", "Stretch to 256x192"]
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        resize.appendChild(option);
      }
      resizeLabel.appendChild(resize);
      form.appendChild(resizeLabel);

      const makeRange = (text, min, max, value) => {
        const label = makeLabel(`${text}: ${value}`);
        const input = document.createElement("input");
        input.type = "range";
        input.min = String(min);
        input.max = String(max);
        input.value = String(value);
        input.addEventListener("input", () => {
          label.firstChild.textContent = `${text}: ${input.value}`;
        });
        label.appendChild(input);
        return { label, input };
      };

      const brightness = makeRange("Brightness", -100, 100, 0);
      const contrast = makeRange("Contrast", -100, 100, 0);
      const saturation = makeRange("Saturation", -100, 100, 0);
      const gamma = makeRange("Gamma", 10, 400, 100);
      form.appendChild(brightness.label);
      form.appendChild(contrast.label);
      form.appendChild(saturation.label);
      form.appendChild(gamma.label);

      const ditherLabel = makeLabel("Dithering");
      const ditherMode = document.createElement("select");
      for (const [value, text] of [
        ["error-diffusion", "Error diffusion (CV Paint row 8x1)"],
        ["ordered-4x4", "Ordered Bayer 4x4"],
        ["ordered-2x2", "Ordered Bayer 2x2"],
        ["ordered-8x8", "Ordered Bayer 8x8"],
        ["none", "None / best pair per row"]
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        ditherMode.appendChild(option);
      }
      ditherLabel.appendChild(ditherMode);
      form.appendChild(ditherLabel);

      const ditherAmount = makeRange("Dithering %", 0, 100, 75);
      form.appendChild(ditherAmount.label);

      const smoothingLabel = document.createElement("label");
      smoothingLabel.style.display = "flex";
      smoothingLabel.style.alignItems = "center";
      smoothingLabel.style.gap = "8px";
      const smoothing = document.createElement("input");
      smoothing.type = "checkbox";
      smoothing.checked = true;
      smoothingLabel.appendChild(smoothing);
      smoothingLabel.appendChild(document.createTextNode("Smooth resize"));
      form.appendChild(smoothingLabel);

      const previewWrap = document.createElement("div");
      previewWrap.style.display = "grid";
      previewWrap.style.gap = "8px";
      const previewTitle = document.createElement("strong");
      previewTitle.textContent = "ColecoVision preview";
      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = 512;
      previewCanvas.height = 384;
      previewCanvas.style.width = "min(512px, 100%)";
      previewCanvas.style.border = "2px solid #18202a";
      previewCanvas.style.background = "#000";
      previewCanvas.style.imageRendering = "pixelated";
      const previewStatus = document.createElement("small");
      previewStatus.textContent = "Rendering preview...";
      previewWrap.appendChild(previewTitle);
      previewWrap.appendChild(previewCanvas);
      previewWrap.appendChild(previewStatus);

      body.appendChild(form);
      body.appendChild(previewWrap);
      panel.appendChild(body);

      let previewTimer = 0;
      let previewSeq = 0;
      const currentOptions = () => ({
        resize: resize.value,
        brightness: Number(brightness.input.value),
        contrast: Number(contrast.input.value),
        saturation: Number(saturation.input.value),
        gamma: Number(gamma.input.value),
        ditherMode: ditherMode.value,
        ditherAmount: Number(ditherAmount.input.value),
        imageSmoothing: smoothing.checked
      });
      const renderPreview = () => {
        clearTimeout(previewTimer);
        const seq = ++previewSeq;
        previewStatus.textContent = "Rendering preview...";
        previewTimer = setTimeout(async () => {
          try {
            const tables = await imageFileToColecoBitmapTables(file, currentOptions());
            if (seq !== previewSeq) return;
            const preview = colecoBitmapTablesToImageData?.(tables);
            if (!preview) throw new Error("Preview renderer is unavailable.");
            const temp = document.createElement("canvas");
            temp.width = preview.width;
            temp.height = preview.height;
            temp.getContext("2d").putImageData(new ImageData(preview.data, preview.width, preview.height), 0, 0);
            const ctx = previewCanvas.getContext("2d");
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            ctx.drawImage(temp, 0, 0, previewCanvas.width, previewCanvas.height);
            previewStatus.textContent = "Preview shows the final Coleco pattern/color result before compression.";
          } catch (error) {
            if (seq === previewSeq) previewStatus.textContent = `Preview failed: ${error?.message || error}`;
          }
        }, 250);
      };

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";
      actions.style.flexWrap = "wrap";
      actions.style.marginTop = "16px";

      const closeWith = (value) => {
        overlay.remove();
        resolve(value);
      };
      const convert = document.createElement("button");
      convert.type = "button";
      convert.textContent = "Convert and compare compression";
      convert.style.padding = "8px 10px";
      convert.style.border = "2px solid #18202a";
      convert.style.background = "#ffd15c";
      convert.addEventListener("click", () => closeWith({
        ...currentOptions()
      }));
      actions.appendChild(convert);

      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel import";
      cancel.style.padding = "8px 10px";
      cancel.style.border = "2px solid #18202a";
      cancel.style.background = "#f2b0a2";
      cancel.addEventListener("click", () => closeWith(null));
      actions.appendChild(cancel);
      panel.appendChild(actions);

      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      for (const control of [resize, brightness.input, contrast.input, saturation.input, gamma.input, ditherMode, ditherAmount.input, smoothing]) {
        control.addEventListener("input", renderPreview);
        control.addEventListener("change", renderPreview);
      }
      renderPreview();
    });
  }

  async function evaluatePictureCompressionCandidatesWithWorkers(tables, codecs) {
    const requestedCodecs = Array.isArray(codecs) && codecs.length
      ? codecs
      : ["raw", "mdkrle", "zx0", "zx7", "dan2", "dan1", "dan3", "pletter", "bitbuster", "lzf"];
    if (typeof Worker === "undefined" || typeof URL === "undefined") {
      return evaluatePictureCompressionCandidates(tables, { codecs: requestedCodecs, compressBytes, decompressBytes });
    }
    const rawCodecs = requestedCodecs.filter((codec) => codec === "raw");
    const workerCodecs = requestedCodecs.filter((codec) => codec !== "raw");
    const rawCandidates = rawCodecs.length
      ? await evaluatePictureCompressionCandidates(tables, { codecs: rawCodecs, compressBytes, decompressBytes })
      : [];
    const workerUrl = new URL("./pictureCompressionWorker.js", import.meta.url);
    const jobs = workerCodecs.map((codec, index) => new Promise((resolve) => {
      const worker = new Worker(workerUrl, { type: "module" });
      const id = `${Date.now()}-${index}-${codec}`;
      worker.onmessage = (event) => {
        worker.terminate();
        resolve(event.data?.candidate || { codec, label: codec, error: "Worker returned no candidate." });
      };
      worker.onerror = (event) => {
        worker.terminate();
        resolve({ codec, label: codec, error: event?.message || "Worker compression failed." });
      };
      worker.postMessage({
        id,
        codec,
        pattern: tables.pattern.buffer.slice(tables.pattern.byteOffset, tables.pattern.byteOffset + tables.pattern.byteLength),
        color: tables.color.buffer.slice(tables.color.byteOffset, tables.color.byteOffset + tables.color.byteLength)
      });
    }));
    return [...rawCandidates, ...(await Promise.all(jobs))];
  }

  async function evaluateCompressionComponentsWithWorkers({ components, codecs, optionByCodec, fallbackEvaluate }) {
    const requestedCodecs = Array.isArray(codecs) && codecs.length
      ? codecs
      : Array.from(optionByCodec.keys());
    if (typeof Worker === "undefined" || typeof URL === "undefined") {
      return fallbackEvaluate(requestedCodecs);
    }
    const rawCodecs = requestedCodecs.filter((codec) => codec === "raw");
    const workerCodecs = requestedCodecs.filter((codec) => codec !== "raw");
    const rawCandidates = rawCodecs.length ? await fallbackEvaluate(rawCodecs) : [];
    const workerUrl = new URL("./pictureCompressionWorker.js", import.meta.url);
    const jobs = workerCodecs.map((codec, index) => new Promise((resolve) => {
      const option = optionByCodec.get(codec);
      if (!option) {
        resolve({ codec, label: codec, error: "Unknown compression codec." });
        return;
      }
      const worker = new Worker(workerUrl, { type: "module" });
      const id = `${Date.now()}-${index}-${codec}`;
      worker.onmessage = (event) => {
        worker.terminate();
        resolve(event.data?.candidate || { codec, label: option.label || codec, error: "Worker returned no candidate." });
      };
      worker.onerror = (event) => {
        worker.terminate();
        resolve({ ...option, error: event?.message || "Worker compression failed." });
      };
      worker.postMessage({
        id,
        codec,
        option,
        components: components.map(([name, bytes]) => {
          const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
          return {
            name,
            bytes: input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
          };
        })
      });
    }));
    return [...rawCandidates, ...(await Promise.all(jobs))];
  }

  function createPictureCompressionChooser(file, candidates, options = {}) {
    if (typeof document === "undefined") {
      return selectPictureCompressionCandidate?.(candidates, "smallest-total") || candidates.find((candidate) => !candidate.error);
    }
    const rawLabel = options.rawLabel || "Raw picture data is 12 KB";
    const titleLabel = options.title || "picture compression";
    const usable = candidates.filter((candidate) => !candidate.error);
    if (!usable.length) return null;
    return new Promise((resolve) => {
      let sortMode = "total";
      const overlay = document.createElement("div");
      overlay.className = "picture-compression-modal";

      const panel = document.createElement("div");
      panel.className = "picture-compression-modal__panel";

      const title = document.createElement("h2");
      title.textContent = `Choose ${titleLabel} for ${file.name}`;
      panel.appendChild(title);

      const bestTotal = selectPictureCompressionCandidate?.(usable, "smallest-total");
      const bestData = selectPictureCompressionCandidate?.(usable, "smallest-data");
      const summary = document.createElement("p");
      summary.textContent = `${rawLabel}. Pick a card, or use the quick buttons for the smallest first-use total or smallest data only.`;
      summary.className = "picture-compression-modal__summary";
      panel.appendChild(summary);

      const quick = document.createElement("div");
      quick.className = "picture-compression-modal__quick";
      const closeWith = (candidate) => {
        overlay.remove();
        resolve(candidate || null);
      };
      for (const item of [
        { label: `Best total: ${bestTotal?.label || "n/a"}`, candidate: bestTotal },
        { label: `Smallest data: ${bestData?.label || "n/a"}`, candidate: bestData },
        { label: "Raw/no compression", candidate: usable.find((candidate) => candidate.codec === "raw") || usable[0] }
      ]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = item.label;
        button.className = "picture-compression-modal__quick-button";
        button.addEventListener("click", () => closeWith(item.candidate));
        quick.appendChild(button);
      }
      panel.appendChild(quick);

      const sortBar = document.createElement("div");
      sortBar.className = "picture-compression-modal__sort";
      const sortLabel = document.createElement("span");
      sortLabel.textContent = "Sort:";
      sortBar.appendChild(sortLabel);
      const sortButtons = [
        { mode: "total", label: "Total ROM" },
        { mode: "data", label: "Data only" },
        { mode: "compress", label: "Compress speed" },
        { mode: "decompress", label: "Decompress speed" }
      ];
      panel.appendChild(sortBar);

      const grid = document.createElement("div");
      grid.className = "picture-compression-modal__grid";

      const sortedCandidates = () => {
        const sorted = [...candidates];
        const valueFor = (candidate) => {
          if (candidate.error) return Number.POSITIVE_INFINITY;
          if (sortMode === "data") return candidate.dataBytes;
          if (sortMode === "compress") return candidate.compressionMs ?? Number.POSITIVE_INFINITY;
          if (sortMode === "decompress") return candidate.decompressionMs ?? Number.POSITIVE_INFINITY;
          return candidate.totalFirstUseBytes;
        };
        return sorted.sort((a, b) => valueFor(a) - valueFor(b) || (a.dataBytes ?? 0) - (b.dataBytes ?? 0));
      };

      const renderGrid = () => {
        grid.textContent = "";
        for (const button of sortBar.querySelectorAll("button")) {
          button.classList.toggle("is-active", button.dataset.sortMode === sortMode);
        }
        for (const candidate of sortedCandidates()) {
          const card = document.createElement("button");
          card.type = "button";
          card.className = `picture-compression-card${candidate.error ? " picture-compression-card--error" : ""}`;
          card.disabled = !!candidate.error;
          const badge = candidate === bestTotal ? "BEST TOTAL" : (candidate === bestData ? "SMALLEST DATA" : "");
          card.innerHTML = candidate.error
            ? `<strong>${escapeHtml(candidate.label)}</strong><br><small>${escapeHtml(candidate.error)}</small>`
            : `<strong>${escapeHtml(candidate.label)}</strong> ${badge ? `<small>${badge}</small>` : ""}<br>` +
              `Pattern: ${formatByteSize(candidate.patternBytes)}<br>` +
              `Color: ${formatByteSize(candidate.colorBytes)}<br>` +
              (Number.isFinite(candidate.nameBytes) ? `Name: ${formatByteSize(candidate.nameBytes)}<br>` : "") +
              `Data: ${formatByteSize(candidate.dataBytes)}<br>` +
              `Routine: ${formatByteSize(candidate.routineBytes)}<br>` +
              `<strong>Total: ${formatByteSize(candidate.totalFirstUseBytes)}</strong><br>` +
              `<small>Compress: ${(candidate.compressionMs || 0).toFixed(1)} ms</small><br>` +
              `<small>Decompress: ${(candidate.decompressionMs || 0).toFixed(1)} ms</small><br>` +
              `<small>${formatSignedBytes(candidate.totalSavingsBytes)} vs raw first use</small><br>` +
              `<small>${escapeHtml(candidate.description || "")}</small>`;
          card.addEventListener("click", () => closeWith(candidate));
          grid.appendChild(card);
        }
      };

      for (const item of sortButtons) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.sortMode = item.mode;
        button.textContent = item.label;
        button.addEventListener("click", () => {
          sortMode = item.mode;
          renderGrid();
        });
        sortBar.appendChild(button);
      }
      renderGrid();
      panel.appendChild(grid);

      if (options.allowCompareAll) {
        const compareAll = document.createElement("button");
        compareAll.type = "button";
        compareAll.textContent = "Compare all codecs";
        compareAll.className = "picture-compression-modal__secondary";
        compareAll.addEventListener("click", () => closeWith({ action: "compareAll" }));
        panel.appendChild(compareAll);
      }

      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel import";
      cancel.className = "picture-compression-modal__cancel";
      cancel.addEventListener("click", () => closeWith(null));
      panel.appendChild(cancel);

      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    });
  }

  function createPictureCompressionProgressDialog(file, message) {
    if (typeof document === "undefined") return { close() {} };
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "9999";
    overlay.style.background = "rgba(8, 13, 18, 0.72)";
    overlay.style.display = "grid";
    overlay.style.placeItems = "center";
    overlay.style.padding = "24px";

    const panel = document.createElement("div");
    panel.style.width = "min(560px, 94vw)";
    panel.style.background = "#f6efe2";
    panel.style.color = "#18202a";
    panel.style.border = "3px solid #18202a";
    panel.style.boxShadow = "10px 10px 0 rgba(0,0,0,0.35)";
    panel.style.padding = "18px";
    panel.style.fontFamily = "Georgia, 'Times New Roman', serif";

    const title = document.createElement("h2");
    title.textContent = `Comparing all codecs for ${file.name}`;
    title.style.margin = "0 0 8px";
    const body = document.createElement("p");
    body.textContent = message || "Compression workers are running. This can take a few seconds for slower codecs.";
    body.style.margin = "0";
    panel.appendChild(title);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    return {
      close() {
        overlay.remove();
      },
      setMessage(nextMessage) {
        body.textContent = nextMessage;
      }
    };
  }

  async function buildPictureEntriesFromTablesWithChoice(file, tables, source) {
    const includeNameTable = !!tables.includeNameTable || !isDefaultPictureNameTable(tables.name);
    if (typeof evaluatePictureCompressionCandidates !== "function" || typeof buildPictureProjectFileEntriesFromCandidate !== "function") {
      const builder = source === "pcToPicture"
        ? pcFileToPictureProjectFileEntries
        : (source === "powerPaintToPicture" ? powerPaintFileToPictureProjectFileEntries : imageFileToPictureProjectFileEntries);
      return builder(file, { codec: "raw", resize: "fit" });
    }
    setStatus(`Evaluating picture compression candidates for ${file.name}...`);
    const quickCodecs = Array.isArray(pictureQuickCompressionCodecs) && pictureQuickCompressionCodecs.length
      ? pictureQuickCompressionCodecs
      : ["raw", "mdkrle", "dan1", "lzf", "zx7"];
    const candidates = await evaluatePictureCompressionCandidatesWithWorkers(tables, quickCodecs);
    let selected = await createPictureCompressionChooser(file, candidates, { allowCompareAll: true });
    if (selected?.action === "compareAll") {
      setStatus(`Evaluating all picture compression codecs for ${file.name}...`);
      const progress = createPictureCompressionProgressDialog(file, "Running all compression codecs in parallel workers...");
      try {
        const allCandidates = await evaluatePictureCompressionCandidatesWithWorkers(tables, undefined);
        progress.close();
        selected = await createPictureCompressionChooser(file, allCandidates, { allowCompareAll: false });
      } catch (error) {
        progress.setMessage(`Full comparison failed: ${error?.message || error}`);
        setStatus(`Full picture compression comparison failed for ${file.name}: ${error?.message || error}`);
        return [];
      }
    }
    if (!selected) return [];
    return buildPictureProjectFileEntriesFromCandidate(file?.name || "picture", selected, {
      source,
      includeNameTable,
      nameTable: tables.name
    });
  }

  const tileTableCompressionOptions = [
    { codec: "raw", label: "Raw", description: "No decompressor, largest data, simplest runtime.", routineBytes: 0, extension: "" },
    { codec: "mdkrle", label: "RLE", description: "Tiny 46-byte routine; often good for maps and repeated tiles.", routineBytes: 46, extension: "rle" },
    { codec: "zx0", label: "ZX0", description: "Strong compression with a compact 133-byte routine.", routineBytes: 133, extension: "zx0" },
    { codec: "zx7", label: "ZX7", description: "Older LZ compressor, useful as a comparison point.", routineBytes: 136, extension: "zx7" },
    { codec: "dan2", label: "DAN2", description: "Daniel's LZ codec; good candidate for Coleco table data.", routineBytes: 212, extension: "dan2" },
    { codec: "dan1", label: "DAN1", description: "Legacy DAN family baseline.", routineBytes: 205, extension: "dan1" },
    { codec: "dan3", label: "DAN3", description: "DAN family variant, sometimes wins on structured data.", routineBytes: 205, extension: "dan3" },
    { codec: "pletter", label: "Pletter", description: "Classic MSX/Coleco-friendly LZ compressor.", routineBytes: 212, extension: "pletter" },
    { codec: "bitbuster", label: "BitBuster 1.2", description: "Classic BitBuster stream; Amy source uses codec bitbuster.", routineBytes: 166, extension: "bitbuster" },
    { codec: "lzf", label: "LZF", description: "Fast LZ family candidate.", routineBytes: 117, extension: "lzf" }
  ];

  async function evaluateTileTableCompressionCandidates(tables, codecs) {
    const requested = Array.isArray(codecs) && codecs.length
      ? codecs
      : tileTableCompressionOptions.map((option) => option.codec);
    const optionByCodec = new Map(tileTableCompressionOptions.map((option) => [option.codec, option]));
    const now = () => (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now();
    const components = [
      ["pattern", tables.pattern],
      ["color", tables.color],
      ["name", tables.name]
    ];
    const candidates = [];
    for (const codec of requested) {
      const option = optionByCodec.get(codec);
      if (!option) continue;
      try {
        const encoded = {};
        let dataBytes = 0;
        let compressionMs = 0;
        let decompressionMs = 0;
        for (const [component, bytes] of components) {
          const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
          if (codec === "raw") {
            encoded[component] = input;
            dataBytes += input.length;
            continue;
          }
          if (typeof compressBytes !== "function") throw new Error("No compressor available.");
          const started = now();
          const compressed = new Uint8Array(await compressBytes(codec, input));
          compressionMs += now() - started;
          if (typeof decompressBytes === "function") {
            const decompressStarted = now();
            const roundtrip = new Uint8Array(await decompressBytes(codec, compressed));
            decompressionMs += now() - decompressStarted;
            if (roundtrip.length !== input.length || roundtrip.some((value, index) => value !== input[index])) {
              throw new Error(`${component} roundtrip decompression did not match source bytes.`);
            }
          }
          encoded[component] = compressed;
          dataBytes += compressed.length;
        }
        const rawBytes = (tables.pattern?.length || 0) + (tables.color?.length || 0) + (tables.name?.length || 0);
        candidates.push({
          ...option,
          patternBytes: encoded.pattern.length,
          colorBytes: encoded.color.length,
          nameBytes: encoded.name.length,
          dataBytes,
          totalFirstUseBytes: dataBytes + option.routineBytes,
          dataSavingsBytes: rawBytes - dataBytes,
          totalSavingsBytes: rawBytes - dataBytes - option.routineBytes,
          compressionMs,
          decompressionMs,
          verified: true,
          components: encoded
        });
      } catch (error) {
        candidates.push({
          ...option,
          error: error?.message || String(error)
        });
      }
    }
    return candidates;
  }

  async function buildTileTableEntriesFromTablesWithChoice(file, tables) {
    setStatus(`Evaluating charset/tile compression candidates for ${file.name}...`);
    const quickCodecs = Array.isArray(pictureQuickCompressionCodecs) && pictureQuickCompressionCodecs.length
      ? pictureQuickCompressionCodecs
      : ["raw", "mdkrle", "dan1", "lzf", "zx7"];
    const optionByCodec = new Map(tileTableCompressionOptions.map((option) => [option.codec, option]));
    const components = [
      ["pattern", tables.pattern],
      ["color", tables.color],
      ["name", tables.name]
    ];
    const evaluateTileWithWorkers = (codecs) => evaluateCompressionComponentsWithWorkers({
      components,
      codecs,
      optionByCodec,
      fallbackEvaluate: (requested) => evaluateTileTableCompressionCandidates(tables, requested)
    });
    const quickCandidates = await evaluateTileWithWorkers(quickCodecs);
    let selected = await createPictureCompressionChooser(file, quickCandidates, {
      allowCompareAll: true,
      title: "charset/tile compression",
      rawLabel: "Raw charset/tile data is 4.75 KB"
    });
    if (selected?.action === "compareAll") {
      setStatus(`Evaluating all charset/tile compression codecs for ${file.name}...`);
      const progress = createPictureCompressionProgressDialog(file, "Running all charset/tile compression codecs in parallel workers...");
      try {
        const allCandidates = await evaluateTileWithWorkers(undefined);
        progress.close();
        selected = await createPictureCompressionChooser(file, allCandidates, {
          allowCompareAll: false,
          title: "charset/tile compression",
          rawLabel: "Raw charset/tile data is 4.75 KB"
        });
      } catch (error) {
        progress.setMessage(`Full charset/tile comparison failed: ${error?.message || error}`);
        setStatus(`Full charset/tile compression comparison failed for ${file.name}: ${error?.message || error}`);
        return [];
      }
    }
    if (!selected || selected.error) return [];
    const baseName = String(file?.name || "icvgm-screen.dat")
      .replace(/\.[^.\\/]+$/, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "icvgm-screen";
    const extension = selected.extension || "";
    return ["pattern", "color", "name"].map((component) => ({
      path: extension ? `${baseName}.${component}.${extension}` : `${baseName}.${component}`,
      bytes: selected.components[component],
      codec: selected.codec === "raw" ? "raw" : selected.codec
    }));
  }

  function buildSpriteTableEntries(file, tables, sourcePrefix = tables?.sourceFormat || "sprite") {
    const baseName = String(file?.name || "icvgm-screen.dat")
      .replace(/\.[^.\\/]+$/, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "icvgm-screen";
    const entries = [];
    if (tables?.spritePattern?.length) {
      entries.push({
        path: `${baseName}.sprpat`,
        bytes: tables.spritePattern,
        kind: "sprite",
        source: `${sourcePrefix}:sprpat`
      });
    }
    if (tables?.spriteColor?.length) {
      entries.push({
        path: `${baseName}.sprcolor`,
        bytes: tables.spriteColor,
        kind: "sprite",
        source: `${sourcePrefix}:sprcolor`
      });
    }
    if (tables?.spriteAttributes?.length) {
      entries.push({
        path: `${baseName}.sprattr`,
        bytes: tables.spriteAttributes,
        kind: "sprite",
        source: `${sourcePrefix}:sprattr`
      });
    }
    return entries;
  }

  function isDefaultPictureNameTable(name) {
    if (!name || name.length < 768) return false;
    for (let index = 0; index < 768; index += 1) {
      if ((name[index] & 0xFF) !== (index & 0xFF)) return false;
    }
    return true;
  }

  function upsertProjectFile(entry) {
    const project = getProject();
    const nextPath = normalizeProjectFilePath(entry.path);
    const existing = (project.projectFiles || []).filter((file) => normalizeProjectFilePath(file.path).toLowerCase() !== nextPath.toLowerCase());
    setProjectFiles(normalizeProjectFiles([...existing, { ...entry, path: nextPath }]));
    clearCompiledArtifacts();
    saveProjectToStorage(getProject());
    renderProjectFiles();
  }

  function removeProjectFile(path) {
    const project = getProject();
    const target = normalizeProjectFilePath(path).toLowerCase();
    setProjectFiles(normalizeProjectFiles((project.projectFiles || []).filter((entry) => normalizeProjectFilePath(entry.path).toLowerCase() !== target)));
    clearCompiledArtifacts();
    saveProjectToStorage(getProject());
    renderProjectFiles();
  }

  function renderProjectFiles() {
    if (!els.projectFilesList || !els.projectFilesSummary) return;
    const project = getProject();
    const files = project.projectFiles || [];
    els.projectFilesList.textContent = "";
    if (!files.length) {
      els.projectFilesSummary.textContent = "No embedded project files yet.";
      return;
    }
    const totalBytes = files.reduce((sum, entry) => sum + projectFileBytes(entry).length, 0);
    els.projectFilesSummary.textContent = `${files.length} embedded file${files.length === 1 ? "" : "s"} · ${formatByteSize(totalBytes)} · reference with "@project/..."`;
    for (const entry of files) {
      const row = document.createElement("div");
      row.className = "project-file";

      const top = document.createElement("div");
      top.className = "project-file__top";

      const name = document.createElement("div");
      name.className = "project-file__name";
      name.textContent = entry.path;
      top.appendChild(name);

      const meta = document.createElement("div");
      meta.className = "project-file__meta";
      meta.textContent = `${entry.kind || fileKindFromPath(entry.path)} · ${formatByteSize(projectFileBytes(entry).length)}`;
      top.appendChild(meta);
      row.appendChild(top);

      const actions = document.createElement("div");
      actions.className = "project-file__actions";

      const assetButton = document.createElement("button");
      assetButton.type = "button";
      const kind = entry.kind || fileKindFromPath(entry.path);
      assetButton.textContent = kind === "dsound" ? "Asset+Play" : (isPictureProjectFile?.(entry) ? "Picture" : "Asset");
      assetButton.addEventListener("click", () => (kind === "dsound"
        ? insertProjectFilePlaySnippet(entry)
        : (isPictureProjectFile?.(entry) ? insertProjectFilePictureSnippet(entry) : insertProjectFileAssetSnippet(entry))));
      actions.appendChild(assetButton);

      if (kind === "dsound") {
        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = "Preview";
        playButton.addEventListener("click", () => {
          void previewProjectFileDsound(entry);
        });
        actions.appendChild(playButton);
      }

      if (isPictureProjectFile?.(entry)) {
        const previewButton = document.createElement("button");
        previewButton.type = "button";
        previewButton.textContent = "Preview";
        previewButton.addEventListener("click", () => {
          void previewProjectFilePicture(entry);
        });
        actions.appendChild(previewButton);

        if (canOpenTileEditor(entry)) {
          const tileButton = document.createElement("button");
          tileButton.type = "button";
          tileButton.textContent = "Tiles";
          tileButton.addEventListener("click", () => {
            void openProjectTileEditor(entry);
          });
          actions.appendChild(tileButton);

          const exportDatButton = document.createElement("button");
          exportDatButton.type = "button";
          exportDatButton.textContent = "Export DAT";
          exportDatButton.addEventListener("click", () => {
            void exportProjectTileGroupAsDat(entry);
          });
          actions.appendChild(exportDatButton);
        }

        if (canExportPc(entry)) {
          const exportPcButton = document.createElement("button");
          exportPcButton.type = "button";
          exportPcButton.textContent = "Export PC";
          exportPcButton.addEventListener("click", () => {
            void exportProjectGroupAsPc(entry);
          });
          actions.appendChild(exportPcButton);
        }
      }

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => removeProjectFile(entry.path));
      actions.appendChild(removeButton);

      row.appendChild(actions);
      els.projectFilesList.appendChild(row);
    }
  }

  async function addImportedProjectFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    let addedCount = 0;
    let convertedPictureCount = 0;
    const processed = new Set();
    const pictureSideKey = (name) => String(name || "")
      .replace(/\.(pattern|pat|chr|bin|color|col|clr|name|nam)$/i, "")
      .toLowerCase();
    const isPatternSideFile = (file) => /\.(pattern|pat|chr)$/i.test(file.name || "") || (/\.bin$/i.test(file.name || "") && file.size === 6144);
    const patternSides = new Map();
    const colorSides = new Map();
    const nameSides = new Map();
    for (const file of files) {
      if (isPatternSideFile(file)) patternSides.set(pictureSideKey(file.name), file);
      if (/\.(color|col|clr)$/i.test(file.name || "")) colorSides.set(pictureSideKey(file.name), file);
      if (/\.(name|nam)$/i.test(file.name || "")) nameSides.set(pictureSideKey(file.name), file);
    }
    for (const file of files) {
      if (processed.has(file)) continue;
      const looksLikeImage = /^image\//i.test(file.type || "") || /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name || "");
      const looksLikePattern = isPatternSideFile(file);
      const looksLikeColor = /\.(color|col|clr)$/i.test(file.name || "");
      const looksLikeName = /\.(name|nam)$/i.test(file.name || "");
      const looksLikeGrp = /\.grp$/i.test(file.name || "");
      const looksLikeSc2 = /\.(sc2|sc4)$/i.test(file.name || "");
      const looksLikeIcvGM = /\.dat$/i.test(file.name || "");
      const looksLikePc = /\.pc$/i.test(file.name || "");
      const looksLikePowerPaint = /\.pp$/i.test(file.name || "");
      if (looksLikeIcvGM && typeof icvgmDatTextToColecoTileTables === "function") {
        const datText = await file.text();
        if (typeof isIcvGmDatText === "function" && !isIcvGmDatText(datText)) {
          continue;
        }
        const tables = icvgmDatTextToColecoTileTables(datText);
        const entries = [
          ...await buildTileTableEntriesFromTablesWithChoice(file, tables),
          ...buildSpriteTableEntries(file, tables, tables.sourceFormat || "icvgm-tiles")
        ];
        if (!entries.length) continue;
        for (const entry of entries) {
          upsertProjectFile({
            path: ensureProjectFilePathCandidate(entry.path),
            base64: bytesToBase64(entry.bytes),
            kind: entry.kind || "picture",
            source: entry.source || tables.sourceFormat || "icvgm-tiles",
            codec: entry.codec && entry.codec !== "raw" ? entry.codec : undefined
          });
          addedCount += 1;
        }
        processed.add(file);
        convertedPictureCount += 1;
        continue;
      }
      if ((looksLikePattern || looksLikeColor || (looksLikeName && patternSides.has(pictureSideKey(file.name)))) && typeof patternBytesToColecoBitmapTables === "function" && typeof colorBytesToColecoBitmapTables === "function") {
        const key = pictureSideKey(file.name);
        const patternFile = patternSides.get(key);
        const colorFile = colorSides.get(key);
        const nameFile = nameSides.get(key);
        const patternBytes = patternFile ? new Uint8Array(await patternFile.arrayBuffer()) : undefined;
        const colorBytes = colorFile ? new Uint8Array(await colorFile.arrayBuffer()) : undefined;
        const nameBytes = nameFile ? new Uint8Array(await nameFile.arrayBuffer()) : undefined;
        const tables = patternBytes
          ? patternBytesToColecoBitmapTables(patternBytes, { color: colorBytes })
          : colorBytesToColecoBitmapTables(colorBytes, { pattern: patternBytes });
        if (nameBytes) {
          if (nameBytes.length < 768) throw new Error(`${nameFile.name} must be at least 768 bytes for a picture name table.`);
          tables.name = nameBytes.slice(0, 768);
          tables.includeNameTable = true;
        }
        const sourceFile = patternFile || colorFile || file;
        const entries = await buildPictureEntriesFromTablesWithChoice(sourceFile, tables, "patternColorToPicture");
        if (!entries.length) continue;
        for (const entry of entries) {
          upsertProjectFile({
            path: ensureProjectFilePathCandidate(entry.path),
            base64: bytesToBase64(entry.bytes),
            kind: "picture",
            source: entry.source || "patternColorToPicture",
            codec: entry.codec && entry.codec !== "raw" ? entry.codec : undefined
          });
          addedCount += 1;
        }
        if (patternFile) processed.add(patternFile);
        if (colorFile) processed.add(colorFile);
        if (nameFile) processed.add(nameFile);
        convertedPictureCount += 1;
        continue;
      }
      if (looksLikeGrp && typeof grpBytesToColecoBitmapTables === "function") {
        const tables = grpBytesToColecoBitmapTables(new Uint8Array(await file.arrayBuffer()));
        const entries = [
          ...await buildPictureEntriesFromTablesWithChoice(file, tables, "grpToPicture"),
          ...buildSpriteTableEntries(file, tables, tables.sourceFormat || "grp")
        ];
        if (!entries.length) continue;
        for (const entry of entries) {
          upsertProjectFile({
            path: ensureProjectFilePathCandidate(entry.path),
            base64: bytesToBase64(entry.bytes),
            kind: entry.kind || "picture",
            source: entry.source || "grpToPicture",
            codec: entry.codec && entry.codec !== "raw" ? entry.codec : undefined
          });
          addedCount += 1;
        }
        convertedPictureCount += 1;
        continue;
      }
      if (looksLikeSc2 && typeof sc2BytesToColecoBitmapTables === "function") {
        let bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes[0] === 0x50 && bytes[1] === 0x6C && typeof decompressBytes === "function") {
          bytes = await decompressBytes("pletter", bytes);
        }
        const tables = sc2BytesToColecoBitmapTables(bytes);
        const entries = [
          ...await buildPictureEntriesFromTablesWithChoice(file, tables, "sc2ToPicture"),
          ...buildSpriteTableEntries(file, tables, tables.sourceFormat || "sc2")
        ];
        if (!entries.length) continue;
        for (const entry of entries) {
          upsertProjectFile({
            path: ensureProjectFilePathCandidate(entry.path),
            base64: bytesToBase64(entry.bytes),
            kind: entry.kind || "picture",
            source: entry.source || "sc2ToPicture",
            codec: entry.codec && entry.codec !== "raw" ? entry.codec : undefined
          });
          addedCount += 1;
        }
        convertedPictureCount += 1;
        continue;
      }
      if (looksLikePc && typeof pcBytesToColecoBitmapTables === "function") {
        const tables = pcBytesToColecoBitmapTables(new Uint8Array(await file.arrayBuffer()));
        const entries = await buildPictureEntriesFromTablesWithChoice(file, tables, "pcToPicture");
        if (!entries.length) continue;
        for (const entry of entries) {
          upsertProjectFile({
            path: ensureProjectFilePathCandidate(entry.path),
            base64: bytesToBase64(entry.bytes),
            kind: "picture",
            source: entry.source || "pcToPicture",
            codec: entry.codec && entry.codec !== "raw" ? entry.codec : undefined
          });
          addedCount += 1;
        }
        convertedPictureCount += 1;
        continue;
      }
      if (looksLikePowerPaint && typeof powerPaintBytesToColecoBitmapTables === "function") {
        const tables = powerPaintBytesToColecoBitmapTables(new Uint8Array(await file.arrayBuffer()));
        const entries = await buildPictureEntriesFromTablesWithChoice(file, tables, "powerPaintToPicture");
        if (!entries.length) continue;
        for (const entry of entries) {
          upsertProjectFile({
            path: ensureProjectFilePathCandidate(entry.path),
            base64: bytesToBase64(entry.bytes),
            kind: "picture",
            source: entry.source || "powerPaintToPicture",
            codec: entry.codec && entry.codec !== "raw" ? entry.codec : undefined
          });
          addedCount += 1;
        }
        convertedPictureCount += 1;
        continue;
      }
      if (looksLikeImage && typeof imageFileToColecoBitmapTables === "function") {
        const importOptions = await createPictureImportOptionsChooser(file);
        if (!importOptions) continue;
        const tables = await imageFileToColecoBitmapTables(file, importOptions);
        const entries = await buildPictureEntriesFromTablesWithChoice(file, tables, "imageToPicture");
        if (!entries.length) continue;
        for (const entry of entries) {
          upsertProjectFile({
            path: ensureProjectFilePathCandidate(entry.path),
            base64: bytesToBase64(entry.bytes),
            kind: "picture",
            source: entry.source || "imageToPicture",
            codec: entry.codec && entry.codec !== "raw" ? entry.codec : undefined
          });
          addedCount += 1;
        }
        convertedPictureCount += 1;
        continue;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      upsertProjectFile({
        path: ensureProjectFilePathCandidate(file.name),
        base64: bytesToBase64(bytes),
        kind: fileKindFromPath(file.name),
        source: "imported",
        codec: detectCodecFromName?.(file.name) || undefined
      });
      addedCount += 1;
    }
    if (convertedPictureCount) {
      setStatus(`Converted ${convertedPictureCount} graphics file${convertedPictureCount === 1 ? "" : "s"} into ${addedCount} project file${addedCount === 1 ? "" : "s"}. Use Preview or Insert from the Files tab.`);
    } else {
      setStatus(`Added ${addedCount} project file${addedCount === 1 ? "" : "s"}.`);
    }
  }

  const creationAddon = createProjectFileCreationAddon({
    getProject,
    normalizeProjectFilePath,
    bytesToBase64,
    upsertProjectFile,
    setStatus,
    openProjectTileEditor,
    previewProjectFilePicture
  });
  const dsoundAddon = createProjectFileDsoundAddon({
    projectFileBytes,
    dsoundBytesToPreviewSamples,
    cvSampleRate,
    setStatus
  });

  return {
    insertProjectFileAssetSnippet,
    insertProjectFilePlaySnippet,
    createNewTileSetProjectFiles: creationAddon.createNewTileSetProjectFiles,
    createNewBitmapProjectFiles: creationAddon.createNewBitmapProjectFiles,
    previewProjectFileDsound: dsoundAddon.previewProjectFileDsound,
    previewProjectFilePicture,
    upsertProjectFile,
    removeProjectFile,
    renderProjectFiles,
    addImportedProjectFiles
  };
}
