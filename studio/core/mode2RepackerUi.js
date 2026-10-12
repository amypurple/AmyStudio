import {
  repackTms9918Mode2,
  TMS9918_MODE2_REPACK_STRATEGIES
} from "./tms9918Mode2Repacker.js?v=20261012-mode2-repacker1";
import { TMS9918_PALETTE } from "./graphicsTms9918.js?v=20260724-compact-mode2-colors";

const COMPONENT_RE = /\.(pattern|pat|chr|color|col|clr)(?:\.(zx0|zx1|zx2|zx7|aplib|mlz|megalz|exo|exomizer|msc1|dan1|dan2|dan3|pletter|plet5|lzf|rle|mdkrle|pck|bitbuster|nibble|raw))?$/i;

function normalizedPath(entry) {
  return String(entry?.path || "").replace(/^@project\//i, "").replace(/\\/g, "/");
}

function componentInfo(entry) {
  const path = normalizedPath(entry);
  const match = path.match(COMPONENT_RE);
  if (!match) return null;
  const component = /^(pattern|pat|chr)$/i.test(match[1]) ? "pattern" : "color";
  return { component, prefix: path.slice(0, match.index), codec: match[2]?.toLowerCase() || null };
}

function findProjectPairs(files) {
  const groups = new Map();
  for (const entry of files || []) {
    const info = componentInfo(entry);
    if (!info) continue;
    const key = info.prefix.toLowerCase();
    if (!groups.has(key)) groups.set(key, { label: info.prefix });
    groups.get(key)[info.component] = entry;
  }
  return [...groups.values()].filter(group => group.pattern && group.color);
}

function codecFor(entry, detectCodecFromName) {
  return String(entry?.codec || detectCodecFromName(entry?.path) || "raw").toLowerCase();
}

function canvasBitmap(canvas, pattern, color) {
  const context = canvas.getContext("2d");
  const bitmap = pattern.length === 6144;
  const width = bitmap ? 256 : 128;
  const rows = bitmap ? 192 : Math.ceil(pattern.length / 128) * 8;
  canvas.width = width;
  canvas.height = Math.max(8, rows);
  const image = context.createImageData(canvas.width, canvas.height);
  for (let address = 0; address < pattern.length; address += 1) {
    let x;
    let y;
    if (bitmap) {
      const third = address >> 11;
      const tile = (address & 2047) >> 3;
      x = (tile & 31) * 8;
      y = third * 64 + (tile >> 5) * 8 + (address & 7);
    } else {
      const tile = address >> 3;
      x = (tile & 15) * 8;
      y = (tile >> 4) * 8 + (address & 7);
    }
    const foreground = color[address] >> 4;
    const background = color[address] & 15;
    for (let bit = 0; bit < 8; bit += 1) {
      const hex = TMS9918_PALETTE[pattern[address] & (0x80 >> bit) ? foreground : background];
      const rgb = Number.parseInt(hex.slice(1), 16);
      const offset = (y * width + x + bit) * 4;
      image.data[offset] = rgb >> 16;
      image.data[offset + 1] = (rgb >> 8) & 255;
      image.data[offset + 2] = rgb & 255;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function element(tag, className, text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function createDialog() {
  const dialog = element("dialog", "mode2-repacker");
  dialog.innerHTML = `
    <form method="dialog" class="mode2-repacker__header">
      <div><strong>MODE 2 REPACKER</strong><span>Lossless TMS9918 pattern/color re-encoding</span></div>
      <button value="close" aria-label="Close">CLOSE</button>
    </form>
    <div class="mode2-repacker__body">
      <label>Project graphics pair<select data-role="pair"></select></label>
      <p class="mode2-repacker__note">Every candidate must render the same color index for every pixel. Sizes include the files' current codecs.</p>
      <div class="mode2-repacker__previews">
        <figure><figcaption>Original</figcaption><canvas data-role="before"></canvas></figure>
        <figure><figcaption>Selected result</figcaption><canvas data-role="after"></canvas></figure>
      </div>
      <div class="mode2-repacker__status" data-role="status">Choose a pattern/color pair.</div>
      <div class="mode2-repacker__table-wrap">
        <table><thead><tr><th>Strategy</th><th>Pattern</th><th>Color</th><th>Total</th><th>Saved</th></tr></thead><tbody data-role="results"></tbody></table>
      </div>
      <div class="mode2-repacker__actions">
        <button type="button" data-role="analyze">Analyze</button>
        <button type="button" data-role="apply" disabled>Apply best lossless result</button>
      </div>
    </div>`;
  document.body.append(dialog);
  return dialog;
}

function yieldToBrowser() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export function createMode2RepackerUi({
  button,
  getProject,
  projectFileBytes,
  detectCodecFromName,
  decompressBytes,
  compressBytes,
  upsertProjectFile,
  bytesToBase64,
  closeTopbarMenu,
  setStatus
}) {
  if (!button || typeof document === "undefined") return { open() {} };
  const dialog = createDialog();
  const pairSelect = dialog.querySelector('[data-role="pair"]');
  const resultsBody = dialog.querySelector('[data-role="results"]');
  const status = dialog.querySelector('[data-role="status"]');
  const analyzeButton = dialog.querySelector('[data-role="analyze"]');
  const applyButton = dialog.querySelector('[data-role="apply"]');
  const beforeCanvas = dialog.querySelector('[data-role="before"]');
  const afterCanvas = dialog.querySelector('[data-role="after"]');
  let pairs = [];
  let analysis = null;
  let runId = 0;

  function refreshPairs() {
    pairs = findProjectPairs(getProject()?.projectFiles || []);
    pairSelect.replaceChildren();
    for (let index = 0; index < pairs.length; index += 1) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = pairs[index].label;
      pairSelect.append(option);
    }
    analyzeButton.disabled = pairs.length === 0;
    status.textContent = pairs.length
      ? `${pairs.length} compatible pattern/color pair${pairs.length === 1 ? "" : "s"} found.`
      : "No matching .pattern/.color project files were found.";
  }

  async function decodePair(pair) {
    const patternCodec = codecFor(pair.pattern, detectCodecFromName);
    const colorCodec = codecFor(pair.color, detectCodecFromName);
    const [pattern, color] = await Promise.all([
      decompressBytes(patternCodec, projectFileBytes(pair.pattern)),
      decompressBytes(colorCodec, projectFileBytes(pair.color))
    ]);
    const normalizedPattern = new Uint8Array(pattern);
    const normalizedColor = new Uint8Array(color);
    if (normalizedPattern.length !== normalizedColor.length || normalizedPattern.length % 8 !== 0) {
      throw new Error(`Expected equal pattern/color tables aligned to 8-byte tiles; got ${normalizedPattern.length} and ${normalizedColor.length}.`);
    }
    return { pattern: normalizedPattern, color: normalizedColor, patternCodec, colorCodec };
  }

  function renderRows(rows, originalTotal) {
    resultsBody.replaceChildren();
    for (const row of rows) {
      const tr = document.createElement("tr");
      if (row === rows[0]) tr.className = "mode2-repacker__best";
      for (const value of [row.label, row.patternBytes, row.colorBytes, row.totalBytes, originalTotal - row.totalBytes]) {
        const td = document.createElement("td");
        td.textContent = typeof value === "number" ? value.toLocaleString() : value;
        tr.append(td);
      }
      tr.addEventListener("click", () => {
        resultsBody.querySelectorAll("tr").forEach(candidate => candidate.classList.remove("mode2-repacker__selected"));
        tr.classList.add("mode2-repacker__selected");
        canvasBitmap(afterCanvas, row.repacked.pattern, row.repacked.color);
      });
      resultsBody.append(tr);
    }
  }

  async function analyze() {
    const thisRun = ++runId;
    analysis = null;
    applyButton.disabled = true;
    resultsBody.replaceChildren();
    const pair = pairs[Number(pairSelect.value) || 0];
    if (!pair) return;
    analyzeButton.disabled = true;
    status.textContent = "Analyzing lossless encodings and measuring compressed sizes...";
    try {
      const decoded = await decodePair(pair);
      canvasBitmap(beforeCanvas, decoded.pattern, decoded.color);
      const rows = [];
      for (const strategy of TMS9918_MODE2_REPACK_STRATEGIES) {
        if (thisRun !== runId) return;
        const repacked = repackTms9918Mode2(decoded.pattern, decoded.color, strategy.id);
        const [packedPattern, packedColor] = await Promise.all([
          compressBytes(decoded.patternCodec, repacked.pattern),
          compressBytes(decoded.colorCodec, repacked.color)
        ]);
        rows.push({
          ...strategy,
          repacked,
          packedPattern: new Uint8Array(packedPattern),
          packedColor: new Uint8Array(packedColor),
          patternBytes: packedPattern.length,
          colorBytes: packedColor.length,
          totalBytes: packedPattern.length + packedColor.length
        });
        await yieldToBrowser();
      }
      rows.sort((left, right) => left.totalBytes - right.totalBytes || left.id.localeCompare(right.id));
      const original = rows.find(row => row.id === "original");
      const best = rows[0];
      renderRows(rows, original.totalBytes);
      canvasBitmap(afterCanvas, best.repacked.pattern, best.repacked.color);
      analysis = { pair, decoded, rows, best, original };
      const saved = original.totalBytes - best.totalBytes;
      status.textContent = saved > 0
        ? `${best.label} saves ${saved} bytes (${original.totalBytes} -> ${best.totalBytes}) with zero changed pixels.`
        : `No lossless strategy improves the current ${original.totalBytes}-byte encoding.`;
      applyButton.disabled = saved <= 0;
    } catch (error) {
      status.textContent = `Cannot analyze this pair: ${error?.message || error}`;
    } finally {
      analyzeButton.disabled = false;
    }
  }

  function applyBest() {
    if (!analysis || analysis.best.totalBytes >= analysis.original.totalBytes) return;
    const { pair, best, original } = analysis;
    upsertProjectFile({
      ...pair.pattern,
      base64: bytesToBase64(best.packedPattern),
      source: `${pair.pattern.source || "project"}:mode2-${best.id}`
    });
    upsertProjectFile({
      ...pair.color,
      base64: bytesToBase64(best.packedColor),
      source: `${pair.color.source || "project"}:mode2-${best.id}`
    });
    const saved = original.totalBytes - best.totalBytes;
    status.textContent = `Applied ${best.label}. Saved ${saved} compressed bytes; every displayed pixel is unchanged.`;
    applyButton.disabled = true;
    setStatus(`Mode 2 repacker saved ${saved} bytes in ${pair.label}.`);
  }

  analyzeButton.addEventListener("click", analyze);
  applyButton.addEventListener("click", applyBest);
  pairSelect.addEventListener("change", () => {
    analysis = null;
    applyButton.disabled = true;
    resultsBody.replaceChildren();
    status.textContent = "Choose Analyze to compare lossless encodings.";
  });
  button.addEventListener("click", () => {
    closeTopbarMenu?.();
    refreshPairs();
    dialog.showModal();
  });
  return { open() { button.click(); } };
}
