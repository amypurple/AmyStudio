import { createGraphicsEditorModal } from "./editorShell.js?v=20260719-graphics-crt-overlay";
import { addGraphicsEntryToConfig, nextGraphicsEntryName, validateNewGraphicsEntryName } from "./graphicsEditorEntryOps.js?v=20260719-graphics-entry-ops";
import { appendAmyByteDataBlock, appendAmyWordTableEntry, describeGraphicsEditor, parseAmyByteDataBlocks, parseGraphicsEditorsConfig, replaceAmyByteDataBlock } from "./graphicsEditorMetadata.js?v=20260721-sprite16-editors";
import { computeTilesetImpact } from "./graphicsImpact.js?v=20260718-graphics-impact";
import { createGraphicsProjectAssetAccess } from "./projectAssetAccess.js?v=20260729-file-backed-tilemap";
import { drawTileGridEditorOverlay, drawTilePattern, renderTileGrid, tileColorOffsetForValue, tileColorRowsForValue, tilePatternBytesForValue } from "./graphicsTms9918.js?v=20260724-compact-mode2-colors";
import { applyGraphicsPreviewFilter, normalizePreviewFilter } from "./graphicsPreviewFilters.js?v=20260721-preview-filters";
import { copyTilemapSelection, fillTilemapSelection, normalizeTilemapSelection, pasteTilemapSelection } from "./graphicsTilemapSelection.js?v=20260729-tilemap-clipboard";

export function createGraphicsEditorUi({
  TMS_PALETTE,
  getProject,
  normalizeProjectFilePath,
  assetNameFromProjectPath,
  projectFileBytes,
  bytesToBase64,
  detectCodecFromName,
  decompressBytes,
  compressBytes,
  commitProjectSourceText,
  upsertProjectFile,
  setStatus
}) {
  let tilemapClipboard = null;

  function dispatchGraphicsTileSelected(value) {
    window.dispatchEvent(new CustomEvent("amy-graphics-tile-selected", { detail: { value: Number(value) & 0xFF } }));
  }

  function parseAmyEditorNumber(token) {
    const raw = String(token || "").trim();
    if (/^\$[0-9a-f]+$/i.test(raw)) return parseInt(raw.slice(1), 16);
    if (/^0x[0-9a-f]+$/i.test(raw)) return parseInt(raw.slice(2), 16);
    if (/^-?[0-9]+$/.test(raw)) return parseInt(raw, 10);
    return null;
  }

  function spriteSourceSymbols(source) {
    const symbols = new Map();
    const lines = String(source || "").split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      const line = String(rawLine || "").replace(/'.*$/, "").trim();
      const match = /^(?:const\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\$[0-9a-f]+|0x[0-9a-f]+|-?[0-9]+)\b/i.exec(line);
      if (match) symbols.set(match[1].toLowerCase(), { value: parseAmyEditorNumber(match[2]), lineIndex, oldToken: match[2], name: match[1] });
    }
    return symbols;
  }

  function spritePatternTokenMatches(token, patternValue, symbols) {
    const raw = String(token || "").trim();
    const numeric = parseAmyEditorNumber(raw);
    if (numeric != null) return (numeric & 0xFF) === (patternValue & 0xFF);
    return symbols.get(raw.toLowerCase())?.value === (patternValue & 0xFF);
  }

  function formatSpriteColorTokenLike(oldToken, color) {
    const value = color & 0x0F;
    const raw = String(oldToken || "").trim();
    if (/^\$/i.test(raw)) return "$" + value.toString(16).toUpperCase();
    if (/^0x/i.test(raw)) return "0x" + value.toString(16).toUpperCase();
    return String(value);
  }

  function collectSpriteColorSourceMatches(editor, patternValue) {
    const source = String(getProject().sourceText || "");
    const symbols = spriteSourceSymbols(source);
    const matches = [];
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      let match = /^(\s*set\s+sprite\s+\d+\s+tile\s+.+?\s+pattern\s+([^\s,]+)\s+color\s+)(\$[0-9a-fA-F]+|0x[0-9a-fA-F]+|[0-9]+|[A-Za-z_][A-Za-z0-9_]*)(\s*(?:'.*)?)$/i.exec(rawLine);
      if (match && spritePatternTokenMatches(match[2], patternValue, symbols)) {
        const colorSymbol = symbols.get(String(match[3] || "").toLowerCase()) || null;
        const colorValue = parseAmyEditorNumber(match[3]) ?? colorSymbol?.value;
        if (colorValue != null) matches.push({ lineIndex: index, prefix: match[1], oldToken: match[3], suffix: match[4] || "", color: colorValue & 0x0F, colorSymbol });
        continue;
      }
      match = /^(\s*set\s+sprite\s+\d+\s+to\s+[^,]+,\s*[^,]+,\s*([^,]+),\s*)(\$[0-9a-fA-F]+|0x[0-9a-fA-F]+|[0-9]+|[A-Za-z_][A-Za-z0-9_]*)(\s*(?:'.*)?)$/i.exec(rawLine);
      if (match && spritePatternTokenMatches(match[2], patternValue, symbols)) {
        const colorSymbol = symbols.get(String(match[3] || "").toLowerCase()) || null;
        const colorValue = parseAmyEditorNumber(match[3]) ?? colorSymbol?.value;
        if (colorValue != null) matches.push({ lineIndex: index, prefix: match[1], oldToken: match[3], suffix: match[4] || "", color: colorValue & 0x0F, colorSymbol });
      }
    }
    return matches;
  }

  function inferSpriteColorFromSource(editor, patternValue) {
    const matches = collectSpriteColorSourceMatches(editor, patternValue);
    return matches.length ? matches[0].color : null;
  }

  function writeInferredSpriteAttributeColors(editor, patternValue, color) {
    const source = String(getProject().sourceText || "");
    const newline = source.includes("\r\n") ? "\r\n" : "\n";
    const lines = source.split(/\r?\n/);
    const matches = collectSpriteColorSourceMatches(editor, patternValue);
    if (!matches.length) throw new Error("Cannot find source sprite color lines for " + editor.name + ".");
    const colorSymbols = [...new Set(matches.map((match) => match.colorSymbol?.name).filter(Boolean))];
    if (colorSymbols.length === 1 && matches.every((match) => match.colorSymbol?.name === colorSymbols[0])) {
      const symbol = matches[0].colorSymbol;
      const line = lines[symbol.lineIndex];
      const escaped = symbol.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const re = new RegExp("^(\\s*(?:const\\s+)?" + escaped + "\\s*=\\s*)(\\$[0-9a-fA-F]+|0x[0-9a-fA-F]+|-?[0-9]+)(\\s*(?:'.*)?)$", "i");
      lines[symbol.lineIndex] = String(line || "").replace(re, (_, prefix, oldToken, suffix) => prefix + formatSpriteColorTokenLike(oldToken, color) + (suffix || ""));
    } else {
      for (const match of matches) {
        lines[match.lineIndex] = match.prefix + formatSpriteColorTokenLike(match.oldToken, color) + match.suffix;
      }
    }
    commitProjectSourceText(lines.join(newline));
    return matches.length;
  }


  const assetAccess = createGraphicsProjectAssetAccess({
    getProject,
    normalizeProjectFilePath,
    assetNameFromProjectPath,
    projectFileBytes,
    detectCodecFromName,
    decompressBytes
  });
  const {
    decodedProjectFileBytes,
    findEditorTilesetFile,
    findEditorColorFile,
    findEditorDataFile,
    patternFileForCharsetEditor
  } = assetAccess;
  function tilePaletteValues(editor, patternBytes) {
    const values = [];
    const seen = new Set();
    const add = (value) => {
      const tile = Number(value) & 0xFF;
      if (!seen.has(tile)) {
        seen.add(tile);
        values.push(tile);
      }
    };
    add(editor.blankTile ?? 0);
    const base = Number(editor.baseTile || 0) & 0xFF;
    const tileCount = Math.floor(patternBytes.length / 8);
    for (let index = 0; index < tileCount; index += 1) add(base + index);
    return values;
  }

  async function openCharsetGraphicsEditor(editor) {
    const inlinePatternName = editor.patternRef?.from === "inline" ? editor.patternRef.name : "";
    const patternFile = inlinePatternName ? null : patternFileForCharsetEditor(editor);
    if (!patternFile && !inlinePatternName) {
      setStatus("Cannot open " + editor.name + ": missing pattern file " + (editor.patternFile || editor.tilesetFile || "") + ".");
      return;
    }
    let decodedPatternBytes;
    try {
      if (inlinePatternName) {
        const blocks = parseAmyByteDataBlocks(getProject().sourceText || "", [inlinePatternName]);
        decodedPatternBytes = blocks.get(inlinePatternName);
        if (!decodedPatternBytes) throw new Error("Cannot find data " + inlinePatternName + " bytes block.");
      } else {
        decodedPatternBytes = await decodedProjectFileBytes(patternFile);
      }
    } catch (error) {
      setStatus(error.message || ("Cannot decode " + (patternFile?.path || inlinePatternName) + " for tileset patterns."));
      return;
    }
    const patternBytes = Uint8Array.from(decodedPatternBytes);
    const inlineColorName = editor.colorRef?.from === "inline" ? editor.colorRef.name : "";
    let colorFile = inlineColorName ? null : findEditorColorFile(editor);
    let colorBytes = null;
    let writableColorBytes = null;
    if (inlineColorName) {
      try {
        const blocks = parseAmyByteDataBlocks(getProject().sourceText || "", [inlineColorName]);
        colorBytes = blocks.get(inlineColorName);
        if (!colorBytes) throw new Error("Cannot find data " + inlineColorName + " bytes block.");
        writableColorBytes = Uint8Array.from(colorBytes);
        colorBytes = writableColorBytes;
      } catch (error) {
        setStatus(error.message || ("Cannot decode " + inlineColorName + " for tileset colors; using fallback colors."));
      }
    } else if (colorFile) {
      try {
        colorBytes = await decodedProjectFileBytes(colorFile);
        writableColorBytes = Uint8Array.from(colorBytes);
        colorBytes = writableColorBytes;
      } catch (error) {
        setStatus("Cannot decode " + colorFile.path + " for tileset colors; using fallback colors.");
      }
    }

    const baseTile = Number(editor.baseTile || 0) & 0xFF;
    const sourceBaseTile = Number(editor.sourceBaseTile ?? baseTile) & 0xFF;
    const sourceStartIndex = baseTile - sourceBaseTile;
    const availableTileCount = Math.max(0, Math.floor(patternBytes.length / 8) - sourceStartIndex);
    const tileCount = Math.min(Number(editor.tileCount || availableTileCount) || 0, availableTileCount);
    if (sourceStartIndex < 0) {
      setStatus("Cannot open " + editor.name + ": baseTile precedes sourceBaseTile.");
      return;
    }
    if (tileCount <= 0) {
      setStatus("Cannot open " + editor.name + ": no tiles found.");
      return;
    }
    let activeIndex = 0;
    let activeColor = 1;
    let dirty = false;
    let dirtyColor = false;
    const undoStack = [];
    const redoStack = [];
    let paintingPointerId = null;
    let dragSnapshotCaptured = false;
    const editScale = 24;
    const paletteScale = 2;

    const modal = createGraphicsEditorModal({
      title: editor.name,
      className: "graphics-editor-modal--charset",
      onCloseRequest: () => (dirty || dirtyColor) ? confirm("Close without saving tileset changes?") : true
    });
    const { backdrop, dialog } = modal;

    const toolbar = document.createElement("div");
    toolbar.className = "graphics-editor-toolbar";
    const selectedLabel = document.createElement("span");
    selectedLabel.className = "graphics-editor-selected-tile";
    const modeLabel = document.createElement("span");
    modeLabel.className = "graphics-editor-hover-tile";
    modeLabel.textContent = "Left click paints. Right click erases. Drag continues the stroke.";
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = inlinePatternName ? "Save Source Data" : "Save Pattern File";
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.textContent = "Undo";
    const redoButton = document.createElement("button");
    redoButton.type = "button";
    redoButton.textContent = "Redo";
    toolbar.append(selectedLabel, modeLabel, saveButton, undoButton, redoButton);
    dialog.appendChild(toolbar);

    const body = document.createElement("div");
    body.className = "graphics-editor-charset-body";
    const editorPane = document.createElement("div");
    editorPane.className = "graphics-editor-charset-pane";
    const editCanvas = document.createElement("canvas");
    editCanvas.width = 8 * editScale;
    editCanvas.height = 8 * editScale;
    editCanvas.className = "graphics-editor-charset-canvas";
    const colorRow = document.createElement("div");
    colorRow.className = "graphics-editor-color-row";
    for (let color = 0; color < 16; color += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "graphics-editor-color-swatch";
      button.style.background = TMS_PALETTE[color];
      button.title = "$" + color.toString(16).toUpperCase();
      button.setAttribute("aria-label", "Color $" + color.toString(16).toUpperCase());
      button.addEventListener("click", () => {
        activeColor = color;
        renderActiveTile();
      });
      colorRow.appendChild(button);
    }
    editorPane.append(editCanvas, colorRow);
    const tileList = document.createElement("div");
    tileList.className = "graphics-editor-palette graphics-editor-charset-list";
    body.append(editorPane, tileList);
    dialog.appendChild(body);

    const note = document.createElement("p");
    note.className = "graphics-editor-modal__note";
    note.textContent = "Edits pattern bytes and linked color bytes when a color file is declared; compressed color files are verified before save.";
    dialog.appendChild(note);

    function tileValueForIndex(index) {
      return (baseTile + index) & 0xFF;
    }

    function tilePatternForIndex(index) {
      const offset = (sourceStartIndex + index) * 8;
      return patternBytes.slice(offset, offset + 8);
    }

    function colorRowsForIndex(index) {
      return tileColorRowsForValue(colorBytes, patternBytes, tileValueForIndex(index), baseTile, editor.previewScreenAt?.[1] || 0);
    }

    function updateSelectedLabel() {
      selectedLabel.textContent = "Tile $" + tileValueForIndex(activeIndex).toString(16).toUpperCase().padStart(2, "0") + " / index " + activeIndex + ((dirty || dirtyColor) ? " · modified" : "");
    }

    function updateCharsetHistoryButtons() {
      undoButton.disabled = undoStack.length === 0;
      redoButton.disabled = redoStack.length === 0;
    }

    function charsetSnapshot() {
      return {
        pattern: Uint8Array.from(patternBytes),
        color: writableColorBytes ? Uint8Array.from(writableColorBytes) : null,
        activeIndex,
        activeColor
      };
    }

    function pushCharsetUndoSnapshot() {
      undoStack.push(charsetSnapshot());
      if (undoStack.length > 64) undoStack.shift();
      redoStack.length = 0;
      updateCharsetHistoryButtons();
    }

    function restoreCharsetSnapshot(snapshot) {
      patternBytes.set(snapshot.pattern);
      if (writableColorBytes && snapshot.color) writableColorBytes.set(snapshot.color);
      activeIndex = snapshot.activeIndex;
      activeColor = snapshot.activeColor;
      dirty = true;
      if (snapshot.color) dirtyColor = true;
      renderTileList();
      renderActiveTile();
      updateCharsetHistoryButtons();
    }

    function renderActiveTile() {
      const ctx = editCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      const pattern = tilePatternForIndex(activeIndex);
      const colors = colorRowsForIndex(activeIndex);
      drawTilePattern(ctx, pattern, 0, 0, editScale, TMS_PALETTE[activeColor], "#000000", colors);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      for (let pos = 0; pos <= 8; pos += 1) {
        ctx.beginPath();
        ctx.moveTo(pos * editScale + 0.5, 0);
        ctx.lineTo(pos * editScale + 0.5, editCanvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos * editScale + 0.5);
        ctx.lineTo(editCanvas.width, pos * editScale + 0.5);
        ctx.stroke();
      }
      updateSelectedLabel();
    }

    function renderTileList() {
      tileList.textContent = "";
      for (let index = 0; index < tileCount; index += 1) {
        const value = tileValueForIndex(index);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "graphics-editor-palette__tile";
        if (index === activeIndex) button.classList.add("selected");
        button.title = "$" + value.toString(16).toUpperCase().padStart(2, "0");
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = 8 * paletteScale;
        tileCanvas.height = 8 * paletteScale;
        const tileCtx = tileCanvas.getContext("2d");
        tileCtx.imageSmoothingEnabled = false;
        drawTilePattern(tileCtx, tilePatternForIndex(index), 0, 0, paletteScale, "#66a6ff", "#000000", colorRowsForIndex(index));
        const label = document.createElement("span");
        label.textContent = "$" + value.toString(16).toUpperCase().padStart(2, "0");
        button.append(tileCanvas, label);
        button.addEventListener("click", () => {
          activeIndex = index;
          dispatchGraphicsTileSelected(value);
          renderTileList();
          renderActiveTile();
        });
        tileList.appendChild(button);
      }
    }

    function setPixel(col, row, enabled) {
      const offset = (sourceStartIndex + activeIndex) * 8 + row;
      const mask = 0x80 >> col;
      patternBytes[offset] = enabled ? (patternBytes[offset] | mask) : (patternBytes[offset] & (~mask & 0xFF));
      dirty = true;
      renderActiveTile();
      renderTileList();
    }

    function paintPixelColor(col, row) {
      if (!writableColorBytes) {
        setPixel(col, row, true);
        return;
      }
      const patternOffset = (sourceStartIndex + activeIndex) * 8 + row;
      const mask = 0x80 >> col;
      const bitIsSet = (patternBytes[patternOffset] & mask) !== 0;
      const tileValue = tileValueForIndex(activeIndex);
      const colorOffset = tileColorOffsetForValue(writableColorBytes, tileValue, baseTile, editor.previewScreenAt?.[1] || 0);
      if (colorOffset < 0) {
        setPixel(col, row, true);
        return;
      }
      const rowOffset = colorOffset + row;
      const colorByte = writableColorBytes[rowOffset] || 0;
      const fg = (colorByte >> 4) & 0x0F;
      const bg = colorByte & 0x0F;
      if (activeColor === fg) {
        patternBytes[patternOffset] |= mask;
        dirty = true;
      } else if (activeColor === bg) {
        patternBytes[patternOffset] &= (~mask & 0xFF);
        dirty = true;
      } else if (bitIsSet) {
        writableColorBytes[rowOffset] = ((activeColor & 0x0F) << 4) | bg;
        dirtyColor = true;
      } else {
        writableColorBytes[rowOffset] = (fg << 4) | (activeColor & 0x0F);
        dirtyColor = true;
      }
      renderActiveTile();
      renderTileList();
    }

    function pixelFromEditPointerEvent(event) {
      const rect = editCanvas.getBoundingClientRect();
      const col = Math.floor((event.clientX - rect.left) / editScale);
      const row = Math.floor((event.clientY - rect.top) / editScale);
      if (col < 0 || row < 0 || col >= 8 || row >= 8) return null;
      return { col, row };
    }

    function paintEditorPixel(event) {
      const cell = pixelFromEditPointerEvent(event);
      if (!cell) return;
      if (!dragSnapshotCaptured) {
        pushCharsetUndoSnapshot();
        dragSnapshotCaptured = true;
      }
      if (event.button === 2 || (event.buttons & 2)) {
        setPixel(cell.col, cell.row, false);
      } else {
        paintPixelColor(cell.col, cell.row);
      }
    }

    function stopCharsetPainting() {
      paintingPointerId = null;
      dragSnapshotCaptured = false;
    }

    editCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
    editCanvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.button !== 2) return;
      paintingPointerId = event.pointerId;
      dragSnapshotCaptured = false;
      editCanvas.setPointerCapture?.(event.pointerId);
      paintEditorPixel(event);
    });
    editCanvas.addEventListener("pointermove", (event) => {
      if (paintingPointerId !== event.pointerId) return;
      if ((event.buttons & 3) === 0) {
        stopCharsetPainting();
        return;
      }
      paintEditorPixel(event);
    });
    editCanvas.addEventListener("pointerup", stopCharsetPainting);
    editCanvas.addEventListener("pointercancel", stopCharsetPainting);
    editCanvas.addEventListener("pointerleave", (event) => {
      if (paintingPointerId === event.pointerId && (event.buttons & 3) === 0) stopCharsetPainting();
    });

    saveButton.addEventListener("click", async () => {
      try {
        if (inlinePatternName) {
          const nextSource = replaceAmyByteDataBlock(getProject().sourceText || "", inlinePatternName, patternBytes, Number(editor.rowWidth || 16));
          commitProjectSourceText(nextSource);
        } else {
          const patternCodec = String(patternFile.codec || detectCodecFromName(patternFile.path) || "raw").toLowerCase();
          const encodedPattern = !patternCodec || patternCodec === "raw" ? patternBytes : await compressBytes(patternCodec, patternBytes);
          const verifiedPattern = !patternCodec || patternCodec === "raw" ? encodedPattern : await decompressBytes(patternCodec, encodedPattern);
          if (verifiedPattern.length !== patternBytes.length || verifiedPattern.some((value, index) => value !== patternBytes[index])) {
            throw new Error("Pattern recompression verification failed for " + patternFile.path + ".");
          }
          upsertProjectFile({
            ...patternFile,
            codec: patternCodec,
            base64: bytesToBase64(encodedPattern)
          });
        }
        if (dirtyColor && inlineColorName && writableColorBytes) {
          const nextSource = replaceAmyByteDataBlock(getProject().sourceText || "", inlineColorName, writableColorBytes, Number(editor.rowWidth || 16));
          commitProjectSourceText(nextSource);
        } else if (dirtyColor && colorFile && writableColorBytes) {
          const codec = String(colorFile.codec || detectCodecFromName(colorFile.path) || "raw").toLowerCase();
          const encodedColor = !codec || codec === "raw" ? writableColorBytes : await compressBytes(codec, writableColorBytes);
          const verifiedColor = !codec || codec === "raw" ? encodedColor : await decompressBytes(codec, encodedColor);
          if (verifiedColor.length !== writableColorBytes.length || verifiedColor.some((value, index) => value !== writableColorBytes[index])) {
            throw new Error("Color recompression verification failed for " + colorFile.path + ".");
          }
          upsertProjectFile({
            ...colorFile,
            codec,
            base64: bytesToBase64(encodedColor)
          });
        }
        dirty = false;
        dirtyColor = false;
        undoStack.length = 0;
        redoStack.length = 0;
        dragSnapshotCaptured = false;
        updateCharsetHistoryButtons();
        updateSelectedLabel();
        setStatus("Saved " + (inlinePatternName || patternFile.path) + ((inlineColorName || (colorFile && writableColorBytes)) ? " and " + (inlineColorName || colorFile.path) : "") + " from tileset editor.");
      } catch (error) {
        setStatus(error.message || "Cannot save tileset.");
      }
    });
    undoButton.addEventListener("click", () => {
      if (!undoStack.length) return;
      redoStack.push(charsetSnapshot());
      restoreCharsetSnapshot(undoStack.pop());
      setStatus("Undo " + editor.name + " tileset edit.");
    });

    redoButton.addEventListener("click", () => {
      if (!redoStack.length) return;
      undoStack.push(charsetSnapshot());
      restoreCharsetSnapshot(redoStack.pop());
      setStatus("Redo " + editor.name + " tileset edit.");
    });

    updateCharsetHistoryButtons();
    renderTileList();
    renderActiveTile();
    modal.mount();
    setStatus("Opened charset editor for " + editor.name + ".");
  }


  async function openSpritePatternGraphicsEditor(editor) {
    const inlinePatternName = editor.patternRef?.from === "inline" ? editor.patternRef.name : "";
    const spriteFile = inlinePatternName ? null : patternFileForCharsetEditor(editor);
    if (!spriteFile && !inlinePatternName) {
      setStatus("Cannot open " + editor.name + ": missing sprite pattern source " + (editor.patternFile || editor.pattern?.name || "") + ".");
      return;
    }
    let decoded;
    try {
      if (inlinePatternName) {
        const blocks = parseAmyByteDataBlocks(getProject().sourceText || "", [inlinePatternName]);
        decoded = blocks.get(inlinePatternName);
        if (!decoded) throw new Error("Cannot find data " + inlinePatternName + " bytes block.");
      } else {
        decoded = await decodedProjectFileBytes(spriteFile);
      }
    } catch (error) {
      setStatus(error.message || ("Cannot decode sprite data for " + editor.name + "."));
      return;
    }
    const patternBytes = Uint8Array.from(decoded);
    let backgroundPatternBytes = null;
    let backgroundColorBytes = null;
    let backgroundTile = Number(editor.backgroundTile ?? editor.blankTile ?? 0) & 0xFF;
    let backgroundBaseTile = Number(editor.backgroundBaseTile ?? editor.baseTile ?? 0) & 0xFF;
    let backgroundScreenY = Array.isArray(editor.backgroundScreenAt) ? Number(editor.backgroundScreenAt[1]) || 0 : 0;
    const backgroundFile = findEditorTilesetFile(editor);
    if (backgroundFile && (!spriteFile || backgroundFile !== spriteFile)) {
      try {
        backgroundPatternBytes = await decodedProjectFileBytes(backgroundFile);
      } catch (error) {
        setStatus("Cannot decode " + backgroundFile.path + " for sprite background; using black background.");
      }
    }
    const backgroundColorFile = findEditorColorFile(editor);
    if (backgroundColorFile) {
      try {
        backgroundColorBytes = await decodedProjectFileBytes(backgroundColorFile);
      } catch (error) {
        setStatus("Cannot decode " + backgroundColorFile.path + " for sprite background colors; using fallback colors.");
      }
    }
    const spriteSize = Array.isArray(editor.spriteSize) ? editor.spriteSize : [16, 16];
    const spriteWidth = Math.max(8, Number(spriteSize[0]) || 16);
    const spriteHeight = Math.max(8, Number(spriteSize[1]) || 16);
    const bytesPerSprite = spriteWidth <= 8 && spriteHeight <= 8 ? 8 : 32;
    const patternStep = bytesPerSprite / 8;
    const sourceBasePattern = Number(editor.sourceBasePattern ?? editor.dataBasePattern ?? editor.basePattern ?? 0) & 0xFF;
    const basePattern = Number(editor.basePattern ?? sourceBasePattern) & 0xFF;
    const spriteColorDefault = Number(editor.spriteColor ?? editor.previewColor ?? inferSpriteColorFromSource(editor, basePattern) ?? 15) & 0x0F;
    const attributeColorBinding = editor.attributeColor || editor.spriteAttributeColor || null;
    const inferredAttributeColorMatches = attributeColorBinding ? [] : collectSpriteColorSourceMatches(editor, basePattern);
    let spriteColor = readBoundSpriteAttributeColor(attributeColorBinding) ?? spriteColorDefault;
    let dirtyAttributeColor = false;
    const patternMask = spriteWidth >= 16 ? 0xFC : 0xFF;
    const firstPatternByteOffset = Math.max(0, ((basePattern & patternMask) - (sourceBasePattern & patternMask)) * 8);
    const availablePatternGroups = Math.max(0, Math.floor((patternBytes.length - firstPatternByteOffset) / bytesPerSprite));
    const spriteCount = Math.min(Number(editor.spriteCount || availablePatternGroups) || 0, availablePatternGroups);
    if (spriteCount <= 0) {
      setStatus("Cannot open " + editor.name + ": no sprite patterns found.");
      return;
    }
    const patternTableName = String(editor.patternTable || editor.vdpPatternTable || (inlinePatternName ? "inline data" : "vram.spr_pat"));
    const usesCharacterPatternTable = /vram\.pattern/i.test(patternTableName);

    let activeIndex = 0;
    let dirty = false;
    const undoStack = [];
    const redoStack = [];
    let paintingPointerId = null;
    let dragSnapshotCaptured = false;
    const editScale = spriteWidth >= 16 ? 16 : 24;
    const paletteScale = spriteWidth >= 16 ? 1 : 2;

    const modal = createGraphicsEditorModal({
      title: editor.name,
      className: "graphics-editor-modal--charset graphics-editor-modal--sprites",
      onCloseRequest: () => (dirty || dirtyAttributeColor) ? confirm("Close without saving sprite editor changes?") : true
    });
    const { dialog } = modal;

    const toolbar = document.createElement("div");
    toolbar.className = "graphics-editor-toolbar";
    const selectedLabel = document.createElement("span");
    selectedLabel.className = "graphics-editor-selected-tile";
    const modeLabel = document.createElement("span");
    modeLabel.className = "graphics-editor-hover-tile";
    modeLabel.textContent = "Left click draws. Right click erases. Drag continues the stroke.";
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save Sprite File";
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.textContent = "Undo";
    const redoButton = document.createElement("button");
    redoButton.type = "button";
    redoButton.textContent = "Redo";
    const colorControl = document.createElement("div");
    colorControl.className = "graphics-editor-sprite-color-control";
    colorControl.title = (attributeColorBinding || inferredAttributeColorMatches.length) ? "Source-bound TMS9918 sprite attribute color." : "Preview only: TMS9918 sprite color is an attribute, not pattern data.";
    const colorText = document.createElement("span");
    colorText.textContent = "Attribute color preview";
    const colorChoices = document.createElement("span");
    colorChoices.className = "graphics-editor-sprite-color-choices";
    const colorButtons = [];
    function updateSpriteColorButtons() {
      for (const button of colorButtons) {
        button.classList.toggle("selected", Number(button.dataset.color) === spriteColor);
      }
    }
    for (let color = 0; color < 16; color += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "graphics-editor-sprite-color-swatch";
      button.dataset.color = String(color);
      button.title = ((attributeColorBinding || inferredAttributeColorMatches.length) ? "Bound attribute color $" : "Preview attribute color $") + color.toString(16).toUpperCase();
      button.setAttribute("aria-label", button.title);
      button.style.background = TMS_PALETTE[color] || "#000000";
      button.addEventListener("click", () => {
        spriteColor = color & 0x0F;
        dirtyAttributeColor = (attributeColorBinding || inferredAttributeColorMatches.length) ? true : dirtyAttributeColor;
        updateSpriteColorButtons();
        renderActiveSprite();
        renderSpriteList();
      });
      colorButtons.push(button);
      colorChoices.appendChild(button);
    }
    updateSpriteColorButtons();
    colorControl.append(colorText, colorChoices);
    toolbar.append(selectedLabel, modeLabel, colorControl, saveButton, undoButton, redoButton);
    dialog.appendChild(toolbar);

    const body = document.createElement("div");
    body.className = "graphics-editor-charset-body";
    const editorPane = document.createElement("div");
    editorPane.className = "graphics-editor-charset-pane";
    const editCanvas = document.createElement("canvas");
    editCanvas.width = spriteWidth * editScale;
    editCanvas.height = spriteHeight * editScale;
    editCanvas.className = "graphics-editor-charset-canvas";
    editorPane.appendChild(editCanvas);
    const spriteList = document.createElement("div");
    spriteList.className = "graphics-editor-palette graphics-editor-charset-list";
    body.append(editorPane, spriteList);
    dialog.appendChild(body);

    const note = document.createElement("p");
    note.className = "graphics-editor-modal__note";
    note.textContent = "Edits raw TMS9918 sprite pattern bytes. 16x16 sprites are shown as four 8x8 VDP quadrants. Source table: " + patternTableName + (usesCharacterPatternTable ? " (sprites share character patterns)." : ".");
    dialog.appendChild(note);

    function spritePatternNumber(index) {
      return (basePattern + index * patternStep) & 0xFF;
    }

    function alignedSpritePatternNumber(index) {
      const patternNumber = spritePatternNumber(index);
      return spriteWidth >= 16 ? (patternNumber & 0xFC) : patternNumber;
    }

    function spritePatternByteBase(index) {
      const sourceAligned = spriteWidth >= 16 ? (sourceBasePattern & 0xFC) : sourceBasePattern;
      const activeAligned = alignedSpritePatternNumber(index);
      return Math.max(0, (activeAligned - sourceAligned) * 8);
    }

    function spriteAttributeColorRegex(binding) {
      if (!binding || String(binding.from || "").toLowerCase() !== "source-set-sprite") return null;
      const sprite = Number(binding.sprite || 0);
      if (!Number.isInteger(sprite) || sprite < 0 || sprite > 31) return null;
      return new RegExp("^(\\s*set\\s+sprite\\s+" + sprite + "\\s+to\\s+[^\\n']*?,\\s*)(\\$[0-9a-fA-F]+|0x[0-9a-fA-F]+|[0-9]+)(\\s*(?:'.*)?)$", "i");
    }

    function sourceLineMatchesBinding(line, binding) {
      const contains = String(binding?.lineContains || "").trim();
      return !contains || String(line || "").includes(contains);
    }

    function parseBoundColorToken(token) {
      const raw = String(token || "").trim();
      if (/^\$[0-9a-f]+$/i.test(raw)) return parseInt(raw.slice(1), 16) & 0x0F;
      if (/^0x[0-9a-f]+$/i.test(raw)) return parseInt(raw.slice(2), 16) & 0x0F;
      if (/^[0-9]+$/.test(raw)) return parseInt(raw, 10) & 0x0F;
      return null;
    }

    function readBoundSpriteAttributeColor(binding) {
      const regex = spriteAttributeColorRegex(binding);
      if (!regex) return null;
      const lines = String(getProject().sourceText || "").split(/\r?\n/);
      for (const line of lines) {
        if (!sourceLineMatchesBinding(line, binding)) continue;
        const match = line.match(regex);
        if (match) return parseBoundColorToken(match[2]);
      }
      return null;
    }

    function writeBoundSpriteAttributeColor(binding, color) {
      const regex = spriteAttributeColorRegex(binding);
      if (!regex) throw new Error("Sprite attribute color is preview-only; no source binding is declared.");
      const lines = String(getProject().sourceText || "").split(/\r?\n/);
      let changed = false;
      const nextLines = lines.map((line) => {
        if (changed || !sourceLineMatchesBinding(line, binding)) return line;
        const match = line.match(regex);
        if (!match) return line;
        changed = true;
        const oldToken = match[2];
        const nextToken = /^\$/.test(oldToken) ? "$" + (color & 0x0F).toString(16).toUpperCase() : (/^0x/i.test(oldToken) ? "0x" + (color & 0x0F).toString(16).toUpperCase() : String(color & 0x0F));
        return match[1] + nextToken + match[3];
      });
      if (!changed) throw new Error("Cannot find bound set sprite color line for " + editor.name + ".");
      commitProjectSourceText(nextLines.join("\n"));
    }

    function spriteByteOffset(index, col, row) {
      const base = spritePatternByteBase(index);
      if (bytesPerSprite === 8) return base + row;
      // TMS9918 16x16 sprites are four 8x8 patterns in TL, BL, TR, BR order.
      return base + (row >= 8 ? 8 : 0) + (col >= 8 ? 16 : 0) + (row & 7);
    }

    function spritePixel(index, col, row) {
      const offset = spriteByteOffset(index, col, row);
      return (patternBytes[offset] & (0x80 >> (col & 7))) !== 0;
    }

    function setSpritePixel(index, col, row, enabled) {
      const offset = spriteByteOffset(index, col, row);
      const mask = 0x80 >> (col & 7);
      patternBytes[offset] = enabled ? (patternBytes[offset] | mask) : (patternBytes[offset] & (~mask & 0xFF));
      dirty = true;
    }

    function updateSpriteLabel() {
      const patternNumber = spritePatternNumber(activeIndex);
      const alignedPattern = alignedSpritePatternNumber(activeIndex);
      const range = bytesPerSprite === 32 ? "-$" + ((alignedPattern + 3) & 0xFF).toString(16).toUpperCase().padStart(2, "0") : "";
      selectedLabel.textContent = "VDP $" + alignedPattern.toString(16).toUpperCase().padStart(2, "0") + range + " / frame " + activeIndex + (patternNumber !== alignedPattern ? " (attr $" + patternNumber.toString(16).toUpperCase().padStart(2, "0") + ")" : "") + (dirty || dirtyAttributeColor ? " · modified" : "");
    }

    function spriteSnapshot() {
      return { bytes: Uint8Array.from(patternBytes), activeIndex };
    }

    function updateSpriteHistoryButtons() {
      undoButton.disabled = undoStack.length === 0;
      redoButton.disabled = redoStack.length === 0;
    }

    function pushSpriteUndoSnapshot() {
      undoStack.push(spriteSnapshot());
      if (undoStack.length > 64) undoStack.shift();
      redoStack.length = 0;
      updateSpriteHistoryButtons();
    }

    function restoreSpriteSnapshot(snapshot) {
      patternBytes.set(snapshot.bytes);
      activeIndex = snapshot.activeIndex;
      dirty = true;
      renderSpriteList();
      renderActiveSprite();
      updateSpriteHistoryButtons();
    }

    function drawSpriteBackground(ctx, scale) {
      ctx.fillStyle = "#050509";
      ctx.fillRect(0, 0, spriteWidth * scale, spriteHeight * scale);
      if (!backgroundPatternBytes) {
        const checker = Math.max(2, Math.floor(scale / 2));
        for (let y = 0; y < spriteHeight * scale; y += checker) {
          for (let x = 0; x < spriteWidth * scale; x += checker) {
            ctx.fillStyle = ((x / checker + y / checker) & 1) ? "#171722" : "#08080d";
            ctx.fillRect(x, y, checker, checker);
          }
        }
        return;
      }
      const tilesX = Math.ceil(spriteWidth / 8);
      const tilesY = Math.ceil(spriteHeight / 8);
      for (let ty = 0; ty < tilesY; ty += 1) {
        for (let tx = 0; tx < tilesX; tx += 1) {
          const pattern = tilePatternBytesForValue(backgroundPatternBytes, backgroundTile, backgroundBaseTile);
          const colors = tileColorRowsForValue(backgroundColorBytes, backgroundPatternBytes, backgroundTile, backgroundBaseTile, backgroundScreenY + ty);
          drawTilePattern(ctx, pattern, tx * 8 * scale, ty * 8 * scale, scale, "#333333", "#000000", colors, TMS_PALETTE);
        }
      }
    }

    function drawSpritePatternToCanvas(ctx, index, scale) {
      ctx.imageSmoothingEnabled = false;
      drawSpriteBackground(ctx, scale);
      ctx.fillStyle = TMS_PALETTE[spriteColor] || "#ffffff";
      for (let row = 0; row < spriteHeight; row += 1) {
        for (let col = 0; col < spriteWidth; col += 1) {
          if (spritePixel(index, col, row)) {
            ctx.fillRect(col * scale, row * scale, scale, scale);
            if (spriteColor === 0 && scale >= 4) {
              ctx.strokeStyle = "rgba(255,255,255,0.34)";
              ctx.lineWidth = 1;
              ctx.strokeRect(col * scale + 0.5, row * scale + 0.5, Math.max(1, scale - 1), Math.max(1, scale - 1));
            }
          }
        }
      }
    }

    function renderActiveSprite() {
      const ctx = editCanvas.getContext("2d");
      drawSpritePatternToCanvas(ctx, activeIndex, editScale);
      ctx.strokeStyle = "rgba(255,255,255,0.20)";
      ctx.lineWidth = 1;
      for (let col = 0; col <= spriteWidth; col += 1) {
        ctx.beginPath();
        ctx.moveTo(col * editScale + 0.5, 0);
        ctx.lineTo(col * editScale + 0.5, editCanvas.height);
        ctx.stroke();
      }
      for (let row = 0; row <= spriteHeight; row += 1) {
        ctx.beginPath();
        ctx.moveTo(0, row * editScale + 0.5);
        ctx.lineTo(editCanvas.width, row * editScale + 0.5);
        ctx.stroke();
      }
      if (bytesPerSprite === 32) {
        ctx.strokeStyle = "rgba(87,255,106,0.65)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(8 * editScale + 0.5, 0);
        ctx.lineTo(8 * editScale + 0.5, editCanvas.height);
        ctx.moveTo(0, 8 * editScale + 0.5);
        ctx.lineTo(editCanvas.width, 8 * editScale + 0.5);
        ctx.stroke();
      }
      updateSpriteLabel();
    }

    function renderSpriteList() {
      spriteList.textContent = "";
      for (let index = 0; index < spriteCount; index += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "graphics-editor-palette__tile";
        if (index === activeIndex) button.classList.add("selected");
        const patternNumber = spritePatternNumber(index);
        const alignedPattern = alignedSpritePatternNumber(index);
        button.title = bytesPerSprite === 32
          ? "16x16 sprite uses VDP patterns $" + alignedPattern.toString(16).toUpperCase().padStart(2, "0") + "-$" + ((alignedPattern + 3) & 0xFF).toString(16).toUpperCase().padStart(2, "0")
          : "8x8 sprite uses VDP pattern $" + patternNumber.toString(16).toUpperCase().padStart(2, "0");
        const canvas = document.createElement("canvas");
        canvas.width = spriteWidth * paletteScale;
        canvas.height = spriteHeight * paletteScale;
        drawSpritePatternToCanvas(canvas.getContext("2d"), index, paletteScale);
        const label = document.createElement("span");
        label.textContent = "$" + alignedSpritePatternNumber(index).toString(16).toUpperCase().padStart(2, "0");
        button.append(canvas, label);
        button.addEventListener("click", () => {
          activeIndex = index;
          renderSpriteList();
          renderActiveSprite();
        });
        spriteList.appendChild(button);
      }
    }

    function spriteCellFromEvent(event) {
      const rect = editCanvas.getBoundingClientRect();
      const col = Math.floor((event.clientX - rect.left) / editScale);
      const row = Math.floor((event.clientY - rect.top) / editScale);
      if (col < 0 || row < 0 || col >= spriteWidth || row >= spriteHeight) return null;
      return { col, row };
    }

    function paintSpritePixel(event) {
      const cell = spriteCellFromEvent(event);
      if (!cell) return;
      if (!dragSnapshotCaptured) {
        pushSpriteUndoSnapshot();
        dragSnapshotCaptured = true;
      }
      setSpritePixel(activeIndex, cell.col, cell.row, !(event.button === 2 || (event.buttons & 2)));
      renderActiveSprite();
      renderSpriteList();
    }

    function stopSpritePainting() {
      paintingPointerId = null;
      dragSnapshotCaptured = false;
    }

    editCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
    editCanvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.button !== 2) return;
      paintingPointerId = event.pointerId;
      dragSnapshotCaptured = false;
      editCanvas.setPointerCapture?.(event.pointerId);
      paintSpritePixel(event);
    });
    editCanvas.addEventListener("pointermove", (event) => {
      if (paintingPointerId !== event.pointerId) return;
      if ((event.buttons & 3) === 0) {
        stopSpritePainting();
        return;
      }
      paintSpritePixel(event);
    });
    editCanvas.addEventListener("pointerup", stopSpritePainting);
    editCanvas.addEventListener("pointercancel", stopSpritePainting);

    saveButton.addEventListener("click", async () => {
      try {
        if (dirty) {
          if (inlinePatternName) {
            const nextSource = replaceAmyByteDataBlock(getProject().sourceText || "", inlinePatternName, patternBytes, Number(editor.rowWidth || 16));
            commitProjectSourceText(nextSource);
          } else {
            const codec = String(spriteFile.codec || detectCodecFromName(spriteFile.path) || "raw").toLowerCase();
            const encoded = !codec || codec === "raw" ? patternBytes : await compressBytes(codec, patternBytes);
            const verified = !codec || codec === "raw" ? encoded : await decompressBytes(codec, encoded);
            if (verified.length !== patternBytes.length || verified.some((value, index) => value !== patternBytes[index])) {
              throw new Error("Sprite recompression verification failed for " + spriteFile.path + ".");
            }
            upsertProjectFile({ ...spriteFile, codec, base64: bytesToBase64(encoded) });
          }
        }
        if (dirtyAttributeColor) {
          if (attributeColorBinding) writeBoundSpriteAttributeColor(attributeColorBinding, spriteColor);
          else writeInferredSpriteAttributeColors(editor, basePattern, spriteColor);
        }
        dirty = false;
        dirtyAttributeColor = false;
        undoStack.length = 0;
        redoStack.length = 0;
        updateSpriteHistoryButtons();
        updateSpriteLabel();
        setStatus("Saved " + (inlinePatternName || spriteFile.path) + ((attributeColorBinding || inferredAttributeColorMatches.length) ? " and bound sprite attribute color" : "") + " from sprite editor.");
      } catch (error) {
        setStatus(error.message || "Cannot save sprite patterns.");
      }
    });

    undoButton.addEventListener("click", () => {
      if (!undoStack.length) return;
      redoStack.push(spriteSnapshot());
      restoreSpriteSnapshot(undoStack.pop());
      setStatus("Undo " + editor.name + " sprite edit.");
    });
    redoButton.addEventListener("click", () => {
      if (!redoStack.length) return;
      undoStack.push(spriteSnapshot());
      restoreSpriteSnapshot(redoStack.pop());
      setStatus("Redo " + editor.name + " sprite edit.");
    });

    updateSpriteHistoryButtons();
    renderSpriteList();
    renderActiveSprite();
    modal.mount();
    setStatus("Opened sprite pattern editor for " + editor.name + ".");
  }


  async function openMetatileGraphicsEditor(editor, sourceBlocks) {
    const entryName = editor.entries?.[0] || editor.source?.name || editor.data?.name || "";
    if (!entryName) {
      setStatus("Cannot open " + editor.name + ": missing metatile data entry.");
      return;
    }
    let frameBytes = Uint8Array.from(sourceBlocks.get(entryName) || []);
    if (!frameBytes.length) {
      try {
        const blocks = parseAmyByteDataBlocks(getProject().sourceText || "", [entryName]);
        frameBytes = Uint8Array.from(blocks.get(entryName) || []);
      } catch (error) {
        setStatus(error.message || ("Cannot parse " + entryName + " for metatile editor."));
        return;
      }
    }
    if (!frameBytes.length) {
      setStatus("Cannot open " + editor.name + ": missing data " + entryName + ".");
      return;
    }

    const frameSize = Array.isArray(editor.frameSize || editor.metatileSize) ? (editor.frameSize || editor.metatileSize) : [2, 2];
    const frameWidth = Math.max(1, Number(frameSize[0]) || 2);
    const frameHeight = Math.max(1, Number(frameSize[1]) || 2);
    const bytesPerFrame = frameWidth * frameHeight;
    const frameCount = Math.min(Number(editor.frameCount || Math.floor(frameBytes.length / bytesPerFrame)) || 0, Math.floor(frameBytes.length / bytesPerFrame));
    if (frameCount <= 0) {
      setStatus("Cannot open " + editor.name + ": metatile data length is smaller than one frame.");
      return;
    }

    async function bytesForEditorRef(ref) {
      const normalized = ref && typeof ref === "object" ? ref : null;
      if (!normalized?.name) return null;
      if (String(normalized.from || "").toLowerCase() === "inline") {
        const blocks = parseAmyByteDataBlocks(getProject().sourceText || "", [normalized.name]);
        return Uint8Array.from(blocks.get(normalized.name) || []);
      }
      const file = patternFileForCharsetEditor({ patternRef: normalized, pattern: normalized });
      return file ? Uint8Array.from(await decodedProjectFileBytes(file)) : null;
    }

    const sourceSets = [];
    const rawSets = Array.isArray(editor.patternSets) && editor.patternSets.length ? editor.patternSets : [{
      pattern: editor.patternRef || editor.pattern,
      color: editor.colorRef || editor.color,
      baseTile: editor.baseTile || 0,
      tileCount: editor.tileCount || 0
    }];
    for (const set of rawSets) {
      const pattern = await bytesForEditorRef(set.patternRef || set.pattern || editor.patternRef || editor.pattern);
      if (!pattern) continue;
      let color = null;
      try {
        color = await bytesForEditorRef(set.colorRef || set.color || null);
      } catch {}
      const baseTile = Number(set.baseTile ?? editor.baseTile ?? 0) & 0xFF;
      const tileCount = Math.min(Number(set.tileCount || Math.floor(pattern.length / 8)) || 0, Math.floor(pattern.length / 8));
      if (tileCount > 0) sourceSets.push({ pattern, color, baseTile, tileCount });
    }
    if (!sourceSets.length) {
      setStatus("Cannot open " + editor.name + ": missing pattern source for metatile preview.");
      return;
    }

    function sourceSetForTile(value) {
      const tile = Number(value) & 0xFF;
      return sourceSets.find((set) => tile >= set.baseTile && tile < set.baseTile + set.tileCount) || sourceSets[0];
    }

    function patternForTile(value) {
      const set = sourceSetForTile(value);
      return tilePatternBytesForValue(set.pattern, value, set.baseTile);
    }

    function colorsForTile(value, screenRow = 0) {
      const set = sourceSetForTile(value);
      return tileColorRowsForValue(set.color, set.pattern, value, set.baseTile, screenRow);
    }

    function buildPaletteValues() {
      const values = [];
      const seen = new Set();
      const add = (value) => {
        const tile = Number(value) & 0xFF;
        if (!seen.has(tile)) {
          seen.add(tile);
          values.push(tile);
        }
      };
      if (Array.isArray(editor.paletteTiles)) {
        for (const value of editor.paletteTiles) add(value);
      } else {
        for (const value of frameBytes) add(value);
        for (const set of sourceSets) {
          for (let index = 0; index < set.tileCount; index += 1) add(set.baseTile + index);
        }
      }
      return values;
    }

    const paletteValues = buildPaletteValues();
    let activeFrame = 0;
    let selectedTile = frameBytes[0] ?? paletteValues[0] ?? 0;
    let dirty = false;
    const undoStack = [];
    const redoStack = [];
    const editScale = 12;
    const paletteScale = 2;

    const modal = createGraphicsEditorModal({
      title: editor.name,
      className: "graphics-editor-modal--charset graphics-editor-modal--metatiles",
      onCloseRequest: () => dirty ? confirm("Close without saving metatile changes?") : true
    });
    const { dialog } = modal;

    const toolbar = document.createElement("div");
    toolbar.className = "graphics-editor-toolbar";
    const selectedLabel = document.createElement("span");
    selectedLabel.className = "graphics-editor-selected-tile";
    const modeLabel = document.createElement("span");
    modeLabel.className = "graphics-editor-hover-tile";
    modeLabel.textContent = frameWidth + "x" + frameHeight + " chars metatile. Pick a char, click a quadrant.";
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save Source Data";
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.textContent = "Undo";
    const redoButton = document.createElement("button");
    redoButton.type = "button";
    redoButton.textContent = "Redo";
    toolbar.append(selectedLabel, modeLabel, saveButton, undoButton, redoButton);
    dialog.appendChild(toolbar);

    const body = document.createElement("div");
    body.className = "graphics-editor-charset-body";
    const editorPane = document.createElement("div");
    editorPane.className = "graphics-editor-charset-pane";
    const editCanvas = document.createElement("canvas");
    editCanvas.width = frameWidth * 8 * editScale;
    editCanvas.height = frameHeight * 8 * editScale;
    editCanvas.className = "graphics-editor-charset-canvas";
    editorPane.appendChild(editCanvas);
    const frameList = document.createElement("div");
    frameList.className = "graphics-editor-palette graphics-editor-charset-list";
    const tileList = document.createElement("div");
    tileList.className = "graphics-editor-palette graphics-editor-charset-list";
    const side = document.createElement("div");
    side.className = "graphics-editor-charset-pane";
    side.append(frameList, tileList);
    body.append(editorPane, side);
    dialog.appendChild(body);

    const note = document.createElement("p");
    note.className = "graphics-editor-modal__note";
    note.textContent = "Edits " + entryName + " as " + frameCount + " frames of " + frameWidth + "x" + frameHeight + " NAME-table chars. Pixel artwork remains in the charset editors.";
    dialog.appendChild(note);

    function frameOffset(index) {
      return index * bytesPerFrame;
    }

    function snapshot() {
      return { bytes: Uint8Array.from(frameBytes), activeFrame, selectedTile };
    }

    function updateHistoryButtons() {
      undoButton.disabled = undoStack.length === 0;
      redoButton.disabled = redoStack.length === 0;
    }

    function pushUndoSnapshot() {
      undoStack.push(snapshot());
      if (undoStack.length > 64) undoStack.shift();
      redoStack.length = 0;
      updateHistoryButtons();
    }

    function restoreSnapshot(state) {
      frameBytes.set(state.bytes);
      activeFrame = state.activeFrame;
      selectedTile = state.selectedTile;
      dirty = true;
      renderAll();
    }

    function drawMetatileFrame(ctx, frameIndex, scale) {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, frameWidth * 8 * scale, frameHeight * 8 * scale);
      const offset = frameOffset(frameIndex);
      for (let row = 0; row < frameHeight; row += 1) {
        for (let col = 0; col < frameWidth; col += 1) {
          const tile = frameBytes[offset + row * frameWidth + col] || 0;
          drawTilePattern(ctx, patternForTile(tile), col * 8 * scale, row * 8 * scale, scale, "#66a6ff", "#000000", colorsForTile(tile, row), TMS_PALETTE);
        }
      }
    }

    function drawGrid(ctx, widthPx, heightPx, scale) {
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.lineWidth = 1;
      for (let col = 0; col <= frameWidth; col += 1) {
        ctx.beginPath();
        ctx.moveTo(col * 8 * scale + 0.5, 0);
        ctx.lineTo(col * 8 * scale + 0.5, heightPx);
        ctx.stroke();
      }
      for (let row = 0; row <= frameHeight; row += 1) {
        ctx.beginPath();
        ctx.moveTo(0, row * 8 * scale + 0.5);
        ctx.lineTo(widthPx, row * 8 * scale + 0.5);
        ctx.stroke();
      }
    }

    function renderActiveFrame() {
      const ctx = editCanvas.getContext("2d");
      drawMetatileFrame(ctx, activeFrame, editScale);
      drawGrid(ctx, editCanvas.width, editCanvas.height, editScale);
      selectedLabel.textContent = "Frame " + activeFrame + " / " + frameCount + " · selected " + hexByte(selectedTile) + (dirty ? " · modified" : "");
    }

    function renderFrameList() {
      frameList.textContent = "";
      for (let index = 0; index < frameCount; index += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "graphics-editor-palette__tile";
        if (index === activeFrame) button.classList.add("selected");
        const canvas = document.createElement("canvas");
        canvas.width = frameWidth * 8 * paletteScale;
        canvas.height = frameHeight * 8 * paletteScale;
        drawMetatileFrame(canvas.getContext("2d"), index, paletteScale);
        const label = document.createElement("span");
        label.textContent = "Frame " + index;
        button.append(canvas, label);
        button.addEventListener("click", () => {
          activeFrame = index;
          renderAll();
        });
        frameList.appendChild(button);
      }
    }

    function renderTileList() {
      tileList.textContent = "";
      for (const value of paletteValues) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "graphics-editor-palette__tile";
        if ((value & 0xFF) === selectedTile) button.classList.add("selected");
        button.title = hexByte(value);
        const canvas = document.createElement("canvas");
        canvas.width = 8 * paletteScale;
        canvas.height = 8 * paletteScale;
        drawTilePattern(canvas.getContext("2d"), patternForTile(value), 0, 0, paletteScale, "#66a6ff", "#000000", colorsForTile(value), TMS_PALETTE);
        const label = document.createElement("span");
        label.textContent = hexByte(value);
        button.append(canvas, label);
        button.addEventListener("click", () => {
          selectedTile = value & 0xFF;
          renderTileList();
          renderActiveFrame();
        });
        tileList.appendChild(button);
      }
    }

    function renderAll() {
      renderActiveFrame();
      renderFrameList();
      renderTileList();
      updateHistoryButtons();
    }

    editCanvas.addEventListener("click", (event) => {
      const rect = editCanvas.getBoundingClientRect();
      const col = Math.floor((event.clientX - rect.left) / (8 * editScale));
      const row = Math.floor((event.clientY - rect.top) / (8 * editScale));
      if (col < 0 || row < 0 || col >= frameWidth || row >= frameHeight) return;
      const offset = frameOffset(activeFrame) + row * frameWidth + col;
      if (frameBytes[offset] === selectedTile) return;
      pushUndoSnapshot();
      frameBytes[offset] = selectedTile;
      dirty = true;
      renderAll();
    });

    saveButton.addEventListener("click", () => {
      try {
        const nextSource = replaceAmyByteDataBlock(getProject().sourceText || "", entryName, frameBytes, Number(editor.rowWidth || bytesPerFrame));
        commitProjectSourceText(nextSource);
        dirty = false;
        undoStack.length = 0;
        redoStack.length = 0;
        renderAll();
        setStatus("Saved " + entryName + " from metatile editor.");
      } catch (error) {
        setStatus(error.message || "Cannot save metatile data.");
      }
    });

    undoButton.addEventListener("click", () => {
      if (!undoStack.length) return;
      redoStack.push(snapshot());
      restoreSnapshot(undoStack.pop());
    });
    redoButton.addEventListener("click", () => {
      if (!redoStack.length) return;
      undoStack.push(snapshot());
      restoreSnapshot(redoStack.pop());
    });

    renderAll();
    modal.mount();
    setStatus("Opened metatile editor for " + editor.name + ".");
  }

  async function openTilemapGraphicsEditor(editor, sourceBlocks, configEntry = null, config = null) {
    if (editor.kind !== "tilemap") {
      setStatus(editor.kind + " editors are planned after the Dacman tilemap MVP.");
      return;
    }
    let tilesetFile = findEditorTilesetFile(editor);
    if (!tilesetFile) {
      setStatus("Cannot open " + editor.name + ": missing tileset file " + (editor.tilesetFile || editor.tileset || "") + ".");
      return;
    }
    let patternBytes;
    try {
      patternBytes = await decodedProjectFileBytes(tilesetFile);
    } catch (error) {
      setStatus(error.message || ("Cannot decode " + tilesetFile.path + " for tilemap patterns."));
      return;
    }
    let colorFile = findEditorColorFile(editor);
    let colorBytes = null;
    if (colorFile) {
      try {
        colorBytes = await decodedProjectFileBytes(colorFile);
      } catch (error) {
        setStatus("Cannot decode " + colorFile.path + " for tile colors; using fallback colors.");
      }
    }
    const width = editor.canvas[0];
    const height = editor.canvas[1];
    const expectedBytes = width * height;
    let tilemapFile = findEditorDataFile(editor);
    const fileBacked = !!tilemapFile;
    let entries = fileBacked
      ? [String(editor.source?.name || editor.sourceRef?.name || editor.sourceFile || editor.dataFile || tilemapFile.path || "Tilemap")]
      : (Array.isArray(editor.entries) ? [...editor.entries] : []);
    let activeName = entries[0] || "";
    let activeBytes;
    try {
      activeBytes = fileBacked
        ? Uint8Array.from(await decodedProjectFileBytes(tilemapFile))
        : Uint8Array.from(sourceBlocks.get(activeName) || []);
    } catch (error) {
      setStatus(error.message || ("Cannot decode " + (tilemapFile?.path || activeName) + " for tilemap data."));
      return;
    }
    if (activeBytes.length !== expectedBytes) {
      setStatus("Cannot open " + activeName + ": expected " + expectedBytes + " bytes, got " + activeBytes.length + ".");
      return;
    }

    let selectedTile = activeBytes.find((value) => value !== editor.blankTile) ?? (Number(editor.baseTile) & 0xFF);
    let dirty = false;
    const undoStack = [];
    const redoStack = [];
    let dragSnapshotCaptured = false;
    let selection = null;
    let selectionAnchor = null;
    let selectingPointerId = null;
    let movingSelectionPointerId = null;
    let moveStartCell = null;
    let moveStartSelection = null;
    let moveClipboard = null;
    let pastePlacement = false;
    let showOverscanOverlay = false;
    let previewFilter = "clean";
    const scale = 3;
    const paletteScale = 2;

    const cleanupTilemapEditor = () => {
      window.removeEventListener("amy-project-file-updated", refreshAfterProjectFileUpdate);
      window.removeEventListener("amy-graphics-tile-selected", syncSelectedTileFromExternal);
      window.removeEventListener("keydown", handleTilemapClipboardKeydown);
    };
    const modal = createGraphicsEditorModal({
      title: editor.name,
      className: "graphics-editor-modal--tilemap",
      onCloseRequest: () => dirty ? confirm("Close without saving tilemap changes?") : true,
      onAfterClose: cleanupTilemapEditor
    });
    const { backdrop, dialog } = modal;

    const toolbar = document.createElement("div");
    toolbar.className = "graphics-editor-toolbar graphics-editor-toolbar--tilemap";
    const boardGroup = document.createElement("div");
    boardGroup.className = "graphics-editor-toolbar__group graphics-editor-toolbar__group--board";
    const actionGroup = document.createElement("div");
    actionGroup.className = "graphics-editor-toolbar__group";
    const historyGroup = document.createElement("div");
    historyGroup.className = "graphics-editor-toolbar__group";
    const viewGroup = document.createElement("div");
    viewGroup.className = "graphics-editor-toolbar__group graphics-editor-toolbar__group--view";
    const boardSelect = document.createElement("select");
    for (const name of entries) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      boardSelect.appendChild(option);
    }
    const selectedLabel = document.createElement("span");
    selectedLabel.className = "graphics-editor-selected-tile";
    const hoverLabel = document.createElement("span");
    hoverLabel.className = "graphics-editor-hover-tile";
    hoverLabel.textContent = "Hover: --";
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = fileBacked ? "Save Tilemap File" : "Save to Source";
    const addBlankButton = document.createElement("button");
    addBlankButton.type = "button";
    addBlankButton.textContent = "Add Blank";
    const duplicateButton = document.createElement("button");
    duplicateButton.type = "button";
    duplicateButton.textContent = "Duplicate";
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Clear";
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.textContent = "Undo";
    const redoButton = document.createElement("button");
    redoButton.type = "button";
    redoButton.textContent = "Redo";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy";
    const cutButton = document.createElement("button");
    cutButton.type = "button";
    cutButton.textContent = "Cut";
    const pasteButton = document.createElement("button");
    pasteButton.type = "button";
    pasteButton.textContent = "Paste";
    if (fileBacked) {
      boardSelect.disabled = true;
      addBlankButton.hidden = true;
      duplicateButton.hidden = true;
    }
    const overscanLabel = document.createElement("label");
    overscanLabel.className = "graphics-editor-toggle";
    overscanLabel.title = "Show the first 8 screen pixels hidden by many CRT-TV sets.";
    const overscanToggle = document.createElement("input");
    overscanToggle.type = "checkbox";
    overscanLabel.append(overscanToggle, document.createTextNode(" CRT left hide"));
    const filterLabel = document.createElement("label");
    filterLabel.className = "graphics-editor-toggle";
    filterLabel.title = "Optional CRT/TV preview look. Visual only — does not change data.";
    const filterSelect = document.createElement("select");
    for (const [value, text] of [["clean", "Clean"], ["rf", "RF"], ["composite", "Composite"], ["crt-tv", "CRT TV"], ["crt-monitor", "CRT monitor"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      filterSelect.appendChild(option);
    }
    filterLabel.append(document.createTextNode("Filter "), filterSelect);
    boardGroup.append(boardSelect);
    actionGroup.append(saveButton, addBlankButton, duplicateButton, clearButton);
    historyGroup.append(undoButton, redoButton, copyButton, cutButton, pasteButton);
    viewGroup.append(overscanLabel, filterLabel);
    toolbar.append(boardGroup, actionGroup, historyGroup, viewGroup);
    dialog.appendChild(toolbar);

    const body = document.createElement("div");
    body.className = "graphics-editor-tilemap-body";
    const canvas = document.createElement("canvas");
    canvas.width = width * 8 * scale;
    canvas.height = height * 8 * scale;
    canvas.className = "graphics-editor-tilemap-canvas";
    const palette = document.createElement("div");
    palette.className = "graphics-editor-palette";
    body.append(canvas, palette);
    dialog.appendChild(body);

    const statusBar = document.createElement("div");
    statusBar.className = "graphics-editor-statusbar";
    const statusInfo = document.createElement("div");
    statusInfo.className = "graphics-editor-statusbar__info";
    statusInfo.append(selectedLabel, hoverLabel);
    const helpLabel = document.createElement("span");
    helpLabel.className = "graphics-editor-statusbar__help";
    helpLabel.textContent = "Left drag paints · Shift+drag selects · Drag selection moves · Paste then click · Right click picks · Ctrl+C/X/V";
    const warning = document.createElement("span");
    warning.className = "graphics-editor-statusbar__warning";
    warning.textContent = "CRT: board X=" + editor.screenAt[0] + ", outside hidden left 8px.";
    const statusHints = document.createElement("div");
    statusHints.className = "graphics-editor-statusbar__hints";
    statusHints.append(helpLabel, warning);
    statusBar.append(statusInfo, statusHints);
    dialog.appendChild(statusBar);

    function fallbackTileForeground(value) {
      if (typeof editor.fallbackFg === "string") return editor.fallbackFg;
      if (editor.fallbackFgByRange && typeof editor.fallbackFgByRange === "object") {
        for (const [range, color] of Object.entries(editor.fallbackFgByRange)) {
          const match = /^(\$[0-9a-f]+|0x[0-9a-f]+|\d+)-(\$[0-9a-f]+|0x[0-9a-f]+|\d+)$/i.exec(range.trim());
          if (!match) continue;
          const min = Number(match[1].startsWith("$") ? parseInt(match[1].slice(1), 16) : Number(match[1]));
          const max = Number(match[2].startsWith("$") ? parseInt(match[2].slice(1), 16) : Number(match[2]));
          if (Number.isFinite(min) && Number.isFinite(max) && value >= min && value <= max) return String(color);
        }
      }
      return "#66a6ff";
    }
    function usageCountForTile(tileValue) {
      let count = 0;
      for (const value of activeBytes) if ((value & 0xFF) === (tileValue & 0xFF)) count += 1;
      return count;
    }

    function updateSelectedLabel() {
      const selectionText = selection ? " · area " + selection.width + "x" + selection.height + " at " + selection.x + "," + selection.y : "";
      selectedLabel.textContent = "Selected $" + selectedTile.toString(16).toUpperCase().padStart(2, "0") + " · used " + usageCountForTile(selectedTile) + "x" + selectionText + (dirty ? " · modified" : "");
    }

    function renderMap(options = {}) {
      const ctx = canvas.getContext("2d");
      let renderedBytes = activeBytes;
      if (movingSelectionPointerId != null && moveStartSelection && moveClipboard && selection) {
        renderedBytes = Uint8Array.from(activeBytes);
        fillTilemapSelection(renderedBytes, width, moveStartSelection, Number(editor.blankTile || 0));
        pasteTilemapSelection(renderedBytes, width, height, selection.x, selection.y, moveClipboard);
      } else if (pastePlacement && tilemapClipboard && selection) {
        renderedBytes = Uint8Array.from(activeBytes);
        pasteTilemapSelection(renderedBytes, width, height, selection.x, selection.y, tilemapClipboard);
      }
      renderTileGrid(ctx, {
        bytes: renderedBytes,
        width,
        height,
        patternBytes,
        colorBytes,
        baseTile: editor.baseTile || 0,
        blankTile: editor.blankTile,
        screenX: editor.screenAt?.[0] || 0,
        screenY: editor.screenAt?.[1] || 0,
        showOverscan: false,
        scale,
        palette: TMS_PALETTE,
        fallbackFgForTile: fallbackTileForeground,
        fallbackBg: "#000000",
        selectedTile: null,
        showGrid: false
      });
      if (!options.fast) {
        applyGraphicsPreviewFilter(ctx, canvas.width, canvas.height, {
          filter: previewFilter,
          screenX: editor.screenAt?.[0] || 0,
          scale
        });
      }
      drawTileGridEditorOverlay(ctx, {
        bytes: renderedBytes,
        width,
        height,
        screenX: editor.screenAt?.[0] || 0,
        showOverscan: showOverscanOverlay,
        scale,
        selectedTile
      });
      if (selection) {
        ctx.save();
        ctx.strokeStyle = "#5cff72";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(
          selection.x * 8 * scale + 1,
          selection.y * 8 * scale + 1,
          selection.width * 8 * scale - 2,
          selection.height * 8 * scale - 2
        );
        ctx.restore();
      }
      updateSelectedLabel();
      updateSelectionButtons();
    }

    function updateHistoryButtons() {
      undoButton.disabled = undoStack.length === 0;
      redoButton.disabled = redoStack.length === 0;
    }

    function updateSelectionButtons() {
      copyButton.disabled = !selection;
      cutButton.disabled = !selection;
      pasteButton.disabled = !tilemapClipboard;
      pasteButton.textContent = pastePlacement ? "Cancel Paste" : "Paste";
      pasteButton.title = tilemapClipboard ? "Place the copied " + tilemapClipboard.width + "x" + tilemapClipboard.height + " block with the next canvas click" : "Copy a tilemap area first";
    }

    function pushUndoSnapshot() {
      undoStack.push(Uint8Array.from(activeBytes));
      if (undoStack.length > 64) undoStack.shift();
      redoStack.length = 0;
      updateHistoryButtons();
    }

    function restoreTilemapSnapshot(snapshot) {
      activeBytes = Uint8Array.from(snapshot);
      dirty = true;
      renderPalette();
      renderMap();
      updateHistoryButtons();
    }

    function renderPalette() {
      palette.textContent = "";
      for (const value of tilePaletteValues(editor, patternBytes)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "graphics-editor-palette__tile";
        button.title = "$" + value.toString(16).toUpperCase().padStart(2, "0");
        button.setAttribute("aria-label", "Tile " + button.title);
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = 8 * paletteScale;
        tileCanvas.height = 8 * paletteScale;
        const tileCtx = tileCanvas.getContext("2d");
        tileCtx.imageSmoothingEnabled = false;
        drawTilePattern(tileCtx, tilePatternBytesForValue(patternBytes, value, editor.baseTile || 0), 0, 0, paletteScale, fallbackTileForeground(value), "#000000", tileColorRowsForValue(colorBytes, patternBytes, value, editor.baseTile || 0, editor.screenAt?.[1] || 0), TMS_PALETTE);
        const label = document.createElement("span");
        label.textContent = "$" + value.toString(16).toUpperCase().padStart(2, "0");
        button.append(tileCanvas, label);
        button.addEventListener("click", () => {
          selectedTile = value;
          dispatchGraphicsTileSelected(value);
          for (const item of palette.querySelectorAll(".graphics-editor-palette__tile")) item.classList.remove("selected");
          button.classList.add("selected");
          renderMap();
          updateSelectedLabel();
        });
        if (value === selectedTile) button.classList.add("selected");
        palette.appendChild(button);
      }
    }

    async function refreshTilemapAssets() {
      const nextTilesetFile = findEditorTilesetFile(editor);
      if (nextTilesetFile) {
        tilesetFile = nextTilesetFile;
        patternBytes = await decodedProjectFileBytes(tilesetFile);
      }
      colorFile = findEditorColorFile(editor);
      colorBytes = null;
      if (colorFile) {
        try {
          colorBytes = await decodedProjectFileBytes(colorFile);
        } catch (error) {
          setStatus("Cannot decode " + colorFile.path + " after project file update; using fallback colors.");
        }
      }
    }
    function loadActiveBoard(nextName) {
      if (fileBacked) return;
      if (dirty && !confirm("Discard unsaved tilemap changes?")) {
        boardSelect.value = activeName;
        return;
      }
      activeName = nextName;
      activeBytes = Uint8Array.from(sourceBlocks.get(activeName) || []);
      dirty = false;
      undoStack.length = 0;
      redoStack.length = 0;
      dragSnapshotCaptured = false;
      selection = null;
      selectionAnchor = null;
      selectingPointerId = null;
      movingSelectionPointerId = null;
      moveStartCell = null;
      moveStartSelection = null;
      moveClipboard = null;
      pastePlacement = false;
      updateHistoryButtons();
      if (activeBytes.length !== expectedBytes) {
        setStatus(activeName + " has " + activeBytes.length + " bytes; expected " + expectedBytes + ".");
      }
      renderMap();
    }

    function cellFromPointerEvent(event) {
      const rect = canvas.getBoundingClientRect();
      const col = Math.floor((event.clientX - rect.left) / (8 * scale));
      const row = Math.floor((event.clientY - rect.top) / (8 * scale));
      if (col < 0 || row < 0 || col >= width || row >= height) return null;
      return { col, row, offset: row * width + col };
    }

    function updateHoverLabel(cell) {
      if (!cell) {
        hoverLabel.textContent = "Hover: --";
        return;
      }
      const value = activeBytes[cell.offset] || 0;
      hoverLabel.textContent = "Hover " + cell.col + "," + cell.row + " offset $" + cell.offset.toString(16).toUpperCase().padStart(3, "0") + " = $" + value.toString(16).toUpperCase().padStart(2, "0");
    }

    function pickTileAtCell(cell) {
      selectedTile = activeBytes[cell.offset] & 0xFF;
      dispatchGraphicsTileSelected(selectedTile);
      renderPalette();
      renderMap();
    }

    function paintTileAtCell(cell) {
      if ((activeBytes[cell.offset] & 0xFF) === (selectedTile & 0xFF)) return;
      if (!dragSnapshotCaptured) {
        pushUndoSnapshot();
        dragSnapshotCaptured = true;
      }
      activeBytes[cell.offset] = selectedTile & 0xFF;
      dirty = true;
      renderMap({ fast: true });
    }

    function copySelectionToClipboard() {
      if (!selection) {
        setStatus("Shift-drag a tilemap area before copying.");
        return false;
      }
      tilemapClipboard = copyTilemapSelection(activeBytes, width, selection);
      updateSelectionButtons();
      setStatus("Copied " + selection.width + "x" + selection.height + " tiles from " + activeName + ".");
      return true;
    }

    function cutSelectionToClipboard() {
      if (!copySelectionToClipboard()) return;
      pushUndoSnapshot();
      fillTilemapSelection(activeBytes, width, selection, Number(editor.blankTile || 0));
      dirty = true;
      renderMap();
      setStatus("Cut " + selection.width + "x" + selection.height + " tiles from " + activeName + ".");
    }

    function selectionForClipboardAt(cell) {
      const selectionWidth = Math.min(tilemapClipboard.width, width);
      const selectionHeight = Math.min(tilemapClipboard.height, height);
      return {
        x: Math.max(0, Math.min(cell.col, width - selectionWidth)),
        y: Math.max(0, Math.min(cell.row, height - selectionHeight)),
        width: selectionWidth,
        height: selectionHeight
      };
    }

    function beginPastePlacement() {
      if (!tilemapClipboard) {
        setStatus("Copy or cut a tilemap area before pasting.");
        return;
      }
      pastePlacement = !pastePlacement;
      if (pastePlacement) {
        const anchor = selection ? { col: selection.x, row: selection.y } : { col: 0, row: 0 };
        selection = selectionForClipboardAt(anchor);
        setStatus("Paste ready: move over the tilemap and click the destination.");
      } else {
        setStatus("Paste cancelled.");
      }
      renderMap();
    }

    function placeClipboardAt(cell) {
      selection = selectionForClipboardAt(cell);
      pushUndoSnapshot();
      selection = pasteTilemapSelection(activeBytes, width, height, selection.x, selection.y, tilemapClipboard);
      dirty = true;
      pastePlacement = false;
      renderMap();
      setStatus("Pasted " + selection.width + "x" + selection.height + " tiles into " + activeName + ".");
    }

    function cellInsideSelection(cell, targetSelection = selection) {
      return !!targetSelection
        && cell.col >= targetSelection.x
        && cell.col < targetSelection.x + targetSelection.width
        && cell.row >= targetSelection.y
        && cell.row < targetSelection.y + targetSelection.height;
    }

    function handleTilemapClipboardKeydown(event) {
      const target = event.target;
      if (target?.matches?.("input, textarea, select, [contenteditable=true]")) return;
      const key = String(event.key || "").toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        pastePlacement = false;
        selection = null;
        renderMap();
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (key === "c") {
        event.preventDefault();
        copySelectionToClipboard();
      } else if (key === "x") {
        event.preventDefault();
        cutSelectionToClipboard();
      } else if (key === "v") {
        event.preventDefault();
        beginPastePlacement();
      }
    }

    let paintingPointerId = null;

    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    canvas.addEventListener("mousemove", (event) => {
      updateHoverLabel(cellFromPointerEvent(event));
    });
    canvas.addEventListener("mouseleave", () => {
      hoverLabel.textContent = "Hover: --";
    });

    canvas.addEventListener("pointerdown", (event) => {
      const cell = cellFromPointerEvent(event);
      if (!cell) return;
      updateHoverLabel(cell);
      if (event.button === 2) {
        if (pastePlacement) {
          pastePlacement = false;
          renderMap();
          setStatus("Paste cancelled.");
          return;
        }
        pickTileAtCell(cell);
        return;
      }
      if (event.button !== 0) return;
      if (pastePlacement) {
        placeClipboardAt(cell);
        return;
      }
      if (event.shiftKey) {
        selectingPointerId = event.pointerId;
        selectionAnchor = cell;
        selection = normalizeTilemapSelection(cell, cell, width, height);
        canvas.setPointerCapture?.(event.pointerId);
        renderMap();
        return;
      }
      if (cellInsideSelection(cell)) {
        movingSelectionPointerId = event.pointerId;
        moveStartCell = cell;
        moveStartSelection = { ...selection };
        moveClipboard = copyTilemapSelection(activeBytes, width, selection);
        canvas.setPointerCapture?.(event.pointerId);
        canvas.style.cursor = "move";
        return;
      }
      selection = null;
      paintingPointerId = event.pointerId;
      dragSnapshotCaptured = false;
      canvas.setPointerCapture?.(event.pointerId);
      paintTileAtCell(cell);
    });

    canvas.addEventListener("pointermove", (event) => {
      const cell = cellFromPointerEvent(event);
      updateHoverLabel(cell);
      if (pastePlacement && cell) {
        selection = selectionForClipboardAt(cell);
        renderMap();
        return;
      }
      if (movingSelectionPointerId === event.pointerId && cell) {
        const maxX = width - moveStartSelection.width;
        const maxY = height - moveStartSelection.height;
        selection = {
          ...moveStartSelection,
          x: Math.max(0, Math.min(maxX, moveStartSelection.x + cell.col - moveStartCell.col)),
          y: Math.max(0, Math.min(maxY, moveStartSelection.y + cell.row - moveStartCell.row))
        };
        renderMap();
        return;
      }
      if (selectingPointerId === event.pointerId && cell) {
        selection = normalizeTilemapSelection(selectionAnchor, cell, width, height);
        renderMap();
        return;
      }
      if (paintingPointerId !== event.pointerId || !cell || (event.buttons & 1) === 0) return;
      paintTileAtCell(cell);
    });

    function stopPainting(event) {
      if (movingSelectionPointerId === event.pointerId) {
        canvas.releasePointerCapture?.(event.pointerId);
        movingSelectionPointerId = null;
        canvas.style.cursor = "";
        const moved = selection.x !== moveStartSelection.x || selection.y !== moveStartSelection.y;
        if (moved) {
          pushUndoSnapshot();
          fillTilemapSelection(activeBytes, width, moveStartSelection, Number(editor.blankTile || 0));
          pasteTilemapSelection(activeBytes, width, height, selection.x, selection.y, moveClipboard);
          dirty = true;
          setStatus("Moved " + selection.width + "x" + selection.height + " tiles in " + activeName + ".");
        }
        moveStartCell = null;
        moveStartSelection = null;
        moveClipboard = null;
        renderMap();
        return;
      }
      if (selectingPointerId === event.pointerId) {
        canvas.releasePointerCapture?.(event.pointerId);
        selectingPointerId = null;
        selectionAnchor = null;
        renderMap();
        setStatus("Selected " + selection.width + "x" + selection.height + " tiles in " + activeName + ".");
        return;
      }
      if (paintingPointerId !== event.pointerId) return;
      const hadPainted = dragSnapshotCaptured;
      canvas.releasePointerCapture?.(event.pointerId);
      paintingPointerId = null;
      dragSnapshotCaptured = false;
      if (hadPainted) renderMap();
    }
    canvas.addEventListener("pointerup", stopPainting);
    canvas.addEventListener("pointercancel", stopPainting);

    const refreshAfterProjectFileUpdate = () => {
      void refreshTilemapAssets()
        .then(() => {
          renderPalette();
          renderMap();
        })
        .catch((error) => setStatus(error.message || "Cannot refresh tilemap editor assets."));
    };
    const syncSelectedTileFromExternal = (event) => {
      const value = Number(event?.detail?.value);
      if (!Number.isInteger(value)) return;
      selectedTile = value & 0xFF;
      renderPalette();
      renderMap();
    };
    window.addEventListener("amy-project-file-updated", refreshAfterProjectFileUpdate);
    window.addEventListener("amy-graphics-tile-selected", syncSelectedTileFromExternal);
    window.addEventListener("keydown", handleTilemapClipboardKeydown);


    function nextTilemapEntryName() {
      return nextGraphicsEntryName(entries, {
        prefix: editor.addEntry?.prefix || "",
        activeName,
        fallback: "Tilemap"
      });
    }

    function askNewTilemapEntryName(defaultName) {
      const entered = prompt("New tilemap data name:", defaultName);
      if (entered == null) return null;
      const name = String(entered).trim();
      return validateNewGraphicsEntryName(name, entries);
    }

    function updateEditorConfigEntry(newName) {
      if (!configEntry || !config || !Array.isArray(config.editors)) return;
      addGraphicsEntryToConfig(config, editor.name, newName);
      const bytes = new TextEncoder().encode(JSON.stringify(config, null, 2));
      upsertProjectFile({ ...configEntry, base64: bytesToBase64(bytes) });
    }

    function addBoardOption(name) {
      entries = [...entries, name];
      editor.entries = entries;
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      boardSelect.appendChild(option);
    }

    function createTilemapEntry(newName, bytes) {
      const tableName = String(editor.addEntry?.addToTable || editor.wordTable || "").trim();
      if (!tableName) throw new Error(editor.name + ": missing addEntry.addToTable or wordTable metadata.");
      let nextSource = appendAmyByteDataBlock(getProject().sourceText || "", newName, bytes, width, { beforeWordTable: tableName });
      nextSource = appendAmyWordTableEntry(nextSource, tableName, newName);
      commitProjectSourceText(nextSource);
      sourceBlocks.set(newName, Uint8Array.from(bytes));
      addBoardOption(newName);
      updateEditorConfigEntry(newName);
      activeName = newName;
      activeBytes = Uint8Array.from(bytes);
      boardSelect.value = newName;
      dirty = false;
      undoStack.length = 0;
      redoStack.length = 0;
      dragSnapshotCaptured = false;
      updateHistoryButtons();
      renderPalette();
      renderMap();
      setStatus("Added " + newName + " to " + editor.name + ".");
    }

    function ensureCanReplaceActiveBeforeNewEntry() {
      if (!dirty) return true;
      return confirm("Discard unsaved changes before creating a new tilemap entry?");
    }

    addBlankButton.addEventListener("click", () => {
      try {
        if (!ensureCanReplaceActiveBeforeNewEntry()) return;
        const newName = askNewTilemapEntryName(nextTilemapEntryName());
        if (!newName) return;
        const blank = new Uint8Array(expectedBytes);
        blank.fill(Number(editor.blankTile || 0) & 0xFF);
        createTilemapEntry(newName, blank);
      } catch (error) {
        setStatus(error.message || "Cannot add blank tilemap.");
      }
    });

    clearButton.addEventListener("click", () => {
      if (!confirm("Clear " + activeName + " with blank tile $" + (Number(editor.blankTile || 0) & 0xFF).toString(16).toUpperCase().padStart(2, "0") + "?")) return;
      pushUndoSnapshot();
      activeBytes.fill(Number(editor.blankTile || 0) & 0xFF);
      dirty = true;
      renderPalette();
      renderMap();
      setStatus("Cleared " + activeName + " in tilemap editor.");
    });

    duplicateButton.addEventListener("click", () => {
      try {
        if (!ensureCanReplaceActiveBeforeNewEntry()) return;
        const newName = askNewTilemapEntryName(nextTilemapEntryName());
        if (!newName) return;
        createTilemapEntry(newName, activeBytes);
      } catch (error) {
        setStatus(error.message || "Cannot duplicate tilemap.");
      }
    });

    undoButton.addEventListener("click", () => {
      if (!undoStack.length) return;
      redoStack.push(Uint8Array.from(activeBytes));
      restoreTilemapSnapshot(undoStack.pop());
      setStatus("Undo " + activeName + ".");
    });

    redoButton.addEventListener("click", () => {
      if (!redoStack.length) return;
      undoStack.push(Uint8Array.from(activeBytes));
      restoreTilemapSnapshot(redoStack.pop());
      setStatus("Redo " + activeName + ".");
    });

    copyButton.addEventListener("click", copySelectionToClipboard);
    cutButton.addEventListener("click", cutSelectionToClipboard);
    pasteButton.addEventListener("click", beginPastePlacement);

    overscanToggle.addEventListener("change", () => {
      showOverscanOverlay = overscanToggle.checked;
      renderMap();
    });
    filterSelect.addEventListener("change", () => {
      previewFilter = normalizePreviewFilter(filterSelect.value);
      renderMap();
    });

    boardSelect.addEventListener("change", () => loadActiveBoard(boardSelect.value));
    saveButton.addEventListener("click", async () => {
      try {
        if (fileBacked) {
          const codec = String(tilemapFile.codec || detectCodecFromName(tilemapFile.path) || "raw").toLowerCase();
          const encoded = !codec || codec === "raw" ? activeBytes : await compressBytes(codec, activeBytes);
          const verified = !codec || codec === "raw" ? encoded : await decompressBytes(codec, encoded);
          if (verified.length !== activeBytes.length || verified.some((value, index) => value !== activeBytes[index])) {
            throw new Error("Tilemap recompression verification failed for " + tilemapFile.path + ".");
          }
          tilemapFile = upsertProjectFile({ ...tilemapFile, codec, base64: bytesToBase64(encoded) }) || tilemapFile;
        } else {
          const project = getProject();
          const nextSource = replaceAmyByteDataBlock(project.sourceText || "", activeName, activeBytes, width);
          commitProjectSourceText(nextSource);
          sourceBlocks.set(activeName, Uint8Array.from(activeBytes));
        }
        dirty = false;
        undoStack.length = 0;
        redoStack.length = 0;
        updateHistoryButtons();
        renderMap();
        setStatus("Saved " + activeName + " from graphics editor.");
      } catch (error) {
        setStatus(error.message || "Cannot save tilemap.");
      }
    });
    updateHistoryButtons();
    renderPalette();
    renderMap();
    modal.mount();
    setStatus("Opened tilemap editor for " + editor.name + ".");
  }

  function hexByte(value) {
    return "$" + (Number(value) & 0xFF).toString(16).toUpperCase().padStart(2, "0");
  }

  function appendImpactSection(parent, title, lines) {
    const section = document.createElement("div");
    section.className = "graphics-editor-modal__item";
    const heading = document.createElement("strong");
    heading.textContent = title;
    section.appendChild(heading);
    if (!lines.length) {
      const empty = document.createElement("span");
      empty.textContent = "None.";
      section.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      list.className = "graphics-editor-impact-list";
      for (const line of lines) {
        const item = document.createElement("li");
        item.textContent = line;
        list.appendChild(item);
      }
      section.appendChild(list);
    }
    parent.appendChild(section);
  }

  function openImpactReport(editor) {
    let impact;
    try {
      impact = computeTilesetImpact({ editor, sourceText: getProject().sourceText || "" });
    } catch (error) {
      setStatus(error.message || "Cannot compute graphics editor impact.");
      return;
    }

    const modal = createGraphicsEditorModal({ title: "Impact: " + editor.name });
    const { dialog } = modal;

    const summary = document.createElement("p");
    summary.textContent = "Read-only analysis. Studio may edit owned data, but gameplay code and ASM are reported only.";
    dialog.appendChild(summary);

    const range = document.createElement("p");
    range.className = "graphics-editor-modal__note";
    range.textContent = "Tile range " + hexByte(impact.range.oldBase) + "-" + hexByte(impact.range.oldEnd) + " (" + impact.range.oldCount + " tiles).";
    dialog.appendChild(range);

    appendImpactSection(dialog, "Zone A uploads", impact.uploadedBy.map((site) => {
      const count = site.count == null ? "unknown count" : site.count + " bytes";
      const offset = site.vramOffset == null ? "unknown offset" : "$" + site.vramOffset.toString(16).toUpperCase().padStart(4, "0");
      return "line " + site.line + ": " + site.operation + " " + site.source + " -> vram." + site.target + " + " + offset + ", " + count + (site.partial ? " (partial upload)" : "") + (site.zone === "B" ? " (non-constant)" : "");
    }));

    appendImpactSection(dialog, "Owned tilemaps", impact.usedBy.map((map) => {
      if (map.missing) return map.name + ": missing data block";
      return map.name + ": " + map.bytes + " bytes, " + map.oldRangeUses + " values in tile range" + (map.outOfNewRangeUses ? ", " + map.outOfNewRangeUses + " would leave the new range" : "");
    }));

    appendImpactSection(dialog, "Zone B suspects", impact.suspectLiterals.map((item) => {
      return "line " + item.line + ": " + item.literal.toUpperCase() + " near `" + item.statement + "`";
    }));

    appendImpactSection(dialog, "Zone C blind spots", impact.blindSpots.map((spot) => {
      return "line " + spot.line + ": " + spot.type + " `" + spot.statement + "`";
    }));

    appendImpactSection(dialog, "Incoherences", impact.incoherences.map((issue) => {
      if (issue.type === "upload-count-mismatch") return "line " + issue.line + ": upload count " + issue.actual + " bytes, expected " + issue.expected + " bytes";
      if (issue.type === "vram-overflow") return "line " + issue.line + ": upload ends at $" + issue.end.toString(16).toUpperCase() + ", limit $" + issue.limit.toString(16).toUpperCase();
      if (issue.type === "tile-range-overflow") return "tile range exceeds $FF";
      if (issue.type === "tilemap-values-outside-new-range") return issue.name + ": " + issue.count + " tile values outside proposed range";
      return issue.type || "unknown issue";
    }));

    modal.mount();
    setStatus("Computed graphics impact report for " + editor.name + ".");
  }
  function sourceBlocksForGraphicsConfig(config) {
    const project = getProject();
    const allEntryNames = config.editors.flatMap((editor) => editor.entries || []);
    try {
      return parseAmyByteDataBlocks(project.sourceText || "", allEntryNames);
    } catch (error) {
      setStatus(error.message || "Cannot parse Amy data blocks for editor metadata.");
      return new Map();
    }
  }

  function openGraphicsEditorDefinition(entry, editor, config) {
    const sourceBlocks = sourceBlocksForGraphicsConfig(config);
    if (editor.kind === "charset") return void openCharsetGraphicsEditor(editor);
    if (editor.kind === "sprite-patterns" || editor.kind === "sprites") return void openSpritePatternGraphicsEditor(editor);
    if (editor.kind === "metatiles" || editor.kind === "frames") return void openMetatileGraphicsEditor(editor, sourceBlocks);
    return void openTilemapGraphicsEditor(editor, sourceBlocks, entry, config);
  }

  function openGraphicsEditorFromConfig(entry, editorName) {
    let config;
    try {
      config = parseGraphicsEditorsConfig(entry, projectFileBytes(entry));
    } catch (error) {
      setStatus(error.message || "Cannot open " + entry.path + ".");
      return;
    }
    const wanted = String(editorName || "").trim().toLowerCase();
    const editor = config.editors.find((item) => String(item.name || "").trim().toLowerCase() === wanted);
    if (!editor) {
      setStatus("Cannot find graphics editor " + editorName + ".");
      return;
    }
    openGraphicsEditorDefinition(entry, editor, config);
  }

  function openGraphicsEditorsConfig(entry) {
    let config;
    try {
      config = parseGraphicsEditorsConfig(entry, projectFileBytes(entry));
    } catch (error) {
      setStatus(error.message || "Cannot open " + entry.path + ".");
      return;
    }

    const modal = createGraphicsEditorModal({ title: "Graphics editors: " + entry.path });
    const { backdrop, dialog } = modal;

    const intro = document.createElement("p");
    intro.textContent = "Open one of the graphics editors defined in editors.json.";
    dialog.appendChild(intro);

    const sourceBlocks = sourceBlocksForGraphicsConfig(config);

    const list = document.createElement("div");
    list.className = "graphics-editor-modal__list";
    for (const editor of config.editors) {
      const item = document.createElement("div");
      item.className = "graphics-editor-modal__item";
      const itemName = document.createElement("strong");
      itemName.textContent = editor.name;
      const itemMeta = document.createElement("span");
      itemMeta.textContent = describeGraphicsEditor(editor);
      item.append(itemName, itemMeta);
      const openEditorButton = document.createElement("button");
      openEditorButton.type = "button";
      openEditorButton.textContent = "Open Editor";
      openEditorButton.addEventListener("click", () => {
        openGraphicsEditorDefinition(entry, editor, config);
      });
      item.append(openEditorButton);
      if (editor.entries.length) {
        const frameSize = Array.isArray(editor.frameSize || editor.metatileSize) ? (editor.frameSize || editor.metatileSize) : null;
        const frameBytes = frameSize ? Math.max(1, Number(frameSize[0]) || 1) * Math.max(1, Number(frameSize[1]) || 1) : 0;
        const expectedBytes = (editor.kind === "metatiles" || editor.kind === "frames") && frameBytes
          ? (Number(editor.frameCount || 0) ? frameBytes * Number(editor.frameCount || 0) : null)
          : editor.canvas[0] * editor.canvas[1];
        const blockSummary = document.createElement("span");
        blockSummary.textContent = "Source data: " + editor.entries.map((name) => {
          const bytes = sourceBlocks.get(name);
          return name + "=" + (bytes ? bytes.length : "missing") + (bytes && expectedBytes && bytes.length !== expectedBytes ? " (expected " + expectedBytes + ")" : "");
        }).join(", ");
        item.appendChild(blockSummary);
      }
      list.appendChild(item);
    }
    dialog.appendChild(list);

    const note = document.createElement("p");
    note.className = "graphics-editor-modal__note";
    note.textContent = "This sidecar keeps editor intent outside the Amy syntax for now, so legacy listings and compressed files remain stable.";
    dialog.appendChild(note);

    modal.mount();
    setStatus("Opened graphics editor metadata from " + entry.path + ".");
  }


  return {
    openGraphicsEditorsConfig,
    openGraphicsEditorFromConfig
  };
}
