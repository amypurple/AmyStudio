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
  let activeDsoundPreviewUrl = "";
  let activeDsoundPreviewAudio = null;

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

  function encodePreviewWav(samples, sampleRate) {
    const frameCount = samples.length;
    const dataSize = frameCount * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeTag = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeTag(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeTag(8, "WAVE");
    writeTag(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeTag(36, "data");
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < frameCount; i += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[i] || 0));
      view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  async function previewProjectFileDsound(entry) {
    const bytes = projectFileBytes(entry);
    if (!bytes.length) {
      setStatus(`No bytes available for ${entry.path}.`);
      return;
    }
    if (!dsoundBytesToPreviewSamples) {
      setStatus("DSOUND preview helper is unavailable in this Studio build.");
      return;
    }
    if (activeDsoundPreviewUrl) {
      URL.revokeObjectURL(activeDsoundPreviewUrl);
      activeDsoundPreviewUrl = "";
    }
    if (activeDsoundPreviewAudio) {
      activeDsoundPreviewAudio.pause?.();
      activeDsoundPreviewAudio = null;
    }
    const sampleRate = Number.isFinite(entry?.dsoundStep) ? Math.trunc(cvSampleRate(entry.dsoundStep)) : 20616;
    const previewSamples = dsoundBytesToPreviewSamples(bytes);
    const wavBlob = encodePreviewWav(previewSamples, sampleRate);
    activeDsoundPreviewUrl = URL.createObjectURL(wavBlob);
    activeDsoundPreviewAudio = new Audio(activeDsoundPreviewUrl);
    try {
      await activeDsoundPreviewAudio.play();
      setStatus(`Playing preview for ${entry.path}.`);
    } catch {
      setStatus(`Preview ready for ${entry.path}, but playback was blocked by the browser.`);
    }
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

  return {
    insertProjectFileAssetSnippet,
    insertProjectFilePlaySnippet,
    previewProjectFileDsound,
    previewProjectFilePicture,
    upsertProjectFile,
    removeProjectFile,
    renderProjectFiles,
    addImportedProjectFiles
  };
}
