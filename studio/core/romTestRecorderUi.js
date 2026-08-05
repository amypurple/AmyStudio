import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "./gearcolecoTestCore.js?v=20260802-z80-explorer";
import { RomTestRecorder } from "./romTestRecorder.js";
import { RomTestAudioSink } from "./romTestAudioSink.js";
import {
  createRomTestCase,
  listAmyCheckpoints,
  resolveAmyCheckpoint
} from "./romTestCase.js";
import { replayRomTestCase } from "./romTestCaseRunner.js";
import {
  chooseAmySourceMarker,
  classifyAddress,
  decodeVdpRegisters,
  filterSymbols,
  findNearestSymbol,
  listAmySourceMarkers,
  listAmyProcedureSourceMarkers,
  resolveAmySourceBreakpoints,
  formatHex,
  formatHexDump,
  listAmyDebugBreakpoints,
  parseAmySymbols,
  resolveSymbolOrAddress
} from "./romDebuggerModel.js?v=20260801-source-step-procedure-entry";
import { evaluateBreakpointCondition, parseBreakpointCondition } from "./breakpointConditions.js?v=20260803-asm-step-conditional-breakpoints";
import {
  appendRoutineProfileSample,
  createRoutineProfileSession,
  NTSC_CYCLES_PER_FRAME,
  resolveProfileTarget
} from "./routineCycleProfiler.js?v=20260801-profile-readable";
import { createControllerSetupUi } from "./controllerSetupUi.js?v=20260805-steering-combined";

const SEED = 0x19770527;

export function consumeMouseSpinnerTicks(accumulated, limit = 127) {
  const value = Number.isFinite(accumulated) ? accumulated : 0;
  const whole = Math.trunc(value);
  return {
    delta: Math.max(-limit, Math.min(limit, whole)),
    remainder: value - whole
  };
}

export function preferredControllerUiPort(config, selectedPort = 0) {
  return config?.ports?.[0]?.type === "wheel" ? 1 : selectedPort === 1 ? 1 : 0;
}

export function mouseButtonToFireMask(button, inputBits) {
  if (button === 0) return inputBits?.FIRE_LEFT || 0;
  if (button === 2) return inputBits?.FIRE_RIGHT || 0;
  return 0;
}

export function resolveMouseFireTarget(button, config, selectedPort, inputBits) {
  const ports = config?.ports || [];
  if (ports[0]?.type === "wheel") {
    return { portIndex: 0, mask: mouseButtonToFireMask(button, inputBits) };
  }
  const roller = ports[0]?.type === "roller-x" || ports[1]?.type === "roller-y";
  if (roller && config?.rollerMode !== "joystick") {
    if (button === 0) return { portIndex: 1, mask: inputBits?.FIRE_RIGHT || 0 };
    if (button === 2) return { portIndex: 1, mask: inputBits?.FIRE_LEFT || 0 };
    return { portIndex: 1, mask: 0 };
  }
  if (roller) {
    return { portIndex: 0, mask: mouseButtonToFireMask(button, inputBits) };
  }
  return {
    portIndex: selectedPort === 1 ? 1 : 0,
    mask: mouseButtonToFireMask(button, inputBits)
  };
}

export function mapMouseRollerJoystickMask(config, movementX, movementY, inputBits) {
  const ports = config?.ports || [];
  const roller = ports[0]?.type === "roller-x" || ports[1]?.type === "roller-y";
  if (!roller || config?.rollerMode !== "joystick") return 0;
  const x = Number.isFinite(movementX) ? movementX : 0;
  const y = Number.isFinite(movementY) ? movementY : 0;
  let mask = 0;
  if (x < 0) mask |= inputBits?.LEFT || 0;
  if (x > 0) mask |= inputBits?.RIGHT || 0;
  if (y < 0) mask |= inputBits?.UP || 0;
  if (y > 0) mask |= inputBits?.DOWN || 0;
  return mask;
}

export function mapMouseSpinnerMovement(config, selectedPort, movementX, movementY) {
  const ports = config?.ports || [];
  const portIndex = selectedPort === 1 ? 1 : 0;
  const scale = (index) => Math.max(1, Math.min(32, Number(ports[index]?.sensitivity) || 6)) / 6;
  const x = Number.isFinite(movementX) ? movementX : 0;
  const y = Number.isFinite(movementY) ? movementY : 0;
  if (ports[0]?.type === "wheel") {
    return [x ? x * scale(0) : 0, 0];
  }
  const isRoller = ports[0]?.type === "roller-x" || ports[1]?.type === "roller-y";
  if (isRoller && config?.rollerMode === "joystick") return [0, 0];
  if (isRoller) {
    return [x ? x * scale(0) : 0, y ? y * scale(1) : 0];
  }
  const deltas = [0, 0];
  const movement = ports[portIndex]?.type === "roller-y" ? y : x;
  deltas[portIndex] = movement ? movement * scale(portIndex) : 0;
  return deltas;
}

function downloadJson(filename, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function sha256(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", view);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function renderRgb565(canvas, framebuffer) {
  if (canvas.width !== framebuffer.width) canvas.width = framebuffer.width;
  if (canvas.height !== framebuffer.height) canvas.height = framebuffer.height;
  const context = canvas.getContext("2d", { alpha: false });
  const image = context.createImageData(framebuffer.width, framebuffer.height);
  for (let index = 0; index < framebuffer.pixels.length; ++index) {
    const pixel = framebuffer.pixels[index];
    const offset = index * 4;
    image.data[offset] = ((pixel >>> 11) & 0x1F) * 255 / 31;
    image.data[offset + 1] = ((pixel >>> 5) & 0x3F) * 255 / 63;
    image.data[offset + 2] = (pixel & 0x1F) * 255 / 31;
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function ensureStyles() {
  if (document.querySelector("#romTestRecorderStyles")) return;
  const style = document.createElement("style");
  style.id = "romTestRecorderStyles";
  style.textContent = `
    .rom-recorder { width:min(1320px,98vw); max-height:96vh; padding:0; border:1px solid #3a4b55; color:#e8edf0; background:#0b1014; }
    .rom-recorder::backdrop { background:rgba(0,0,0,.82); }
    .rom-recorder__head,.rom-recorder__bar { display:flex; align-items:center; gap:8px; padding:9px 12px; }
    .rom-recorder__head { justify-content:space-between; border-bottom:1px solid #26343c; }
    .rom-recorder__head h2 { margin:0; color:#65dbef; font-size:16px; letter-spacing:.08em; }
    .rom-recorder__head-actions { display:flex; gap:7px; align-items:center; }
    .rom-recorder__icon-button { width:34px; min-width:34px; height:32px; padding:0; display:grid; place-items:center; font-size:17px; line-height:1; }
    .rom-recorder .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    .rom-recorder__body { display:grid; grid-template-columns:minmax(480px,2fr) minmax(520px,1fr); grid-template-rows:auto minmax(0,1fr); gap:10px 12px; padding:10px 12px; height:calc(96vh - 52px); overflow:hidden; box-sizing:border-box; }
    .rom-recorder__stage { grid-row:1 / span 2; display:grid; align-content:start; justify-items:center; gap:6px; min-width:0; min-height:0; }
    .rom-recorder__screen-wrap { position:relative; width:min(100%,512px); aspect-ratio:4 / 3; display:grid; place-items:center; background:#050607; border:1px solid #31424c; overflow:hidden; }
    .rom-recorder__screen { max-width:100%; image-rendering:pixelated; background:#000; border:1px solid #31424c; outline:none; }
    .rom-recorder__screen-wrap .rom-recorder__screen { border:0; }
    .rom-recorder__bios-missing { position:absolute; inset:0; display:grid; place-content:center; justify-items:center; gap:12px; padding:24px; box-sizing:border-box; text-align:center; color:#e8edf0; background:radial-gradient(circle at 50% 38%,#17242b 0,#090e12 58%,#030405 100%); }
    .rom-recorder__bios-missing[hidden] { display:none; }
    .rom-recorder__bios-wordmark { font-weight:700; font-size:clamp(17px,3vw,28px); letter-spacing:.12em; text-shadow:0 2px #000; }
    .rom-recorder__bios-wordmark span:nth-child(1) { color:#58d6c7; } .rom-recorder__bios-wordmark span:nth-child(2) { color:#65dbef; } .rom-recorder__bios-wordmark span:nth-child(3) { color:#6487dd; } .rom-recorder__bios-wordmark span:nth-child(4) { color:#b46bc7; } .rom-recorder__bios-wordmark span:nth-child(5) { color:#d66378; } .rom-recorder__bios-wordmark span:nth-child(6) { color:#d98a58; } .rom-recorder__bios-wordmark span:nth-child(7) { color:#d6c85c; } .rom-recorder__bios-wordmark span:nth-child(8) { color:#78c86a; }
    .rom-recorder__bios-missing strong { color:#fff; font-size:15px; letter-spacing:.05em; }
    .rom-recorder__bios-missing p { max-width:360px; margin:0; color:#a7b4bb; font-size:12px; line-height:1.5; }
    .rom-recorder__bios-missing button { color:#081014; background:#65dbef; border-color:#8ee7f5; }
    .rom-recorder__side { grid-column:2; grid-row:1; display:grid; align-content:start; gap:6px; min-width:0; }
    .rom-recorder__side label { display:grid; gap:4px; color:#99aab4; font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
    .rom-recorder__side select,.rom-recorder__side input { width:100%; box-sizing:border-box; }
    .rom-recorder__tools { display:flex; flex-wrap:wrap; gap:6px; }
    .rom-recorder__tools > * { flex:1 1 auto; }
    .rom-recorder__settings { display:grid; grid-template-columns:minmax(60px,.8fr) minmax(90px,1fr) minmax(100px,1.3fr) minmax(54px,.7fr) repeat(3,34px); gap:6px; align-items:end; }
    .rom-recorder__compact-action[aria-pressed="true"] { color:#081014; background:#65dbef; }
    .rom-recorder__settings .rom-recorder__compact-action { align-self:end; }
    .rom-recorder__controller { display:grid; grid-template-columns:repeat(6,minmax(34px,1fr)); gap:4px; width:100%; }
    .rom-recorder__controller button { min-height:29px; touch-action:none; }
    .rom-recorder__debug { grid-column:2; grid-row:2; display:grid; grid-template-rows:auto minmax(0,1fr); min-height:0; overflow:hidden; border:1px solid #26343c; background:#0d1419; }
    .rom-recorder__tabs { display:flex; gap:3px; padding:6px; border-bottom:1px solid #26343c; overflow:auto; }
    .rom-recorder__tabs button[aria-selected="true"] { color:#081014; background:#65dbef; }
    .rom-recorder__pane { display:none; padding:8px; min-height:0; overflow:auto; }
    .rom-recorder__pane.is-active { display:block; min-height:0; }
    .rom-recorder__pane[data-pane="asm"].is-active,.rom-recorder__pane[data-pane="ram"].is-active,.rom-recorder__pane[data-pane="vram"].is-active,.rom-recorder__pane[data-pane="map"].is-active { display:flex; flex-direction:column; overflow:hidden; }
    .rom-recorder__summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:7px; }
    .rom-recorder__card { padding:8px; border:1px solid #26343c; background:#091015; }
    .rom-recorder__card strong { display:block; color:#65dbef; font-size:11px; text-transform:uppercase; }
    .rom-recorder__registers { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
    .rom-recorder__registers code { padding:4px 6px; border:1px solid #26343c; }
    .rom-recorder__memory-controls { display:grid; grid-template-columns:140px 90px auto; gap:7px; margin-bottom:8px; }
    .rom-recorder__memory-controls--asm { grid-template-columns:34px 34px minmax(0,1fr); align-items:center; }
    .rom-recorder__memory-controls--breakpoint { grid-template-columns:minmax(120px,1fr) minmax(150px,1.4fr) 70px 34px; }
    .rom-recorder__memory-controls--watch { grid-template-columns:minmax(180px,1fr) 70px 34px; }
    .rom-recorder__dump,.rom-recorder__raw-map { overflow:auto; margin:0; padding:8px; color:#d5e2e7; background:#070b0e; border:1px solid #26343c; font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace; white-space:pre; }
    .rom-recorder__dump { flex:1 1 auto; min-height:0; max-height:none; }
    .rom-recorder__symbol-list { flex:1 1 auto; min-height:0; max-height:none; overflow-y:auto; overflow-x:hidden; border:1px solid #26343c; }
    .rom-recorder__symbol-row { display:grid; grid-template-columns:minmax(0,1fr) 36px; min-width:0; border-bottom:1px solid #172229; }
    .rom-recorder__symbol { display:grid; grid-template-columns:66px 68px minmax(0,1fr); min-width:0; width:100%; padding:5px 7px; border:0; text-align:left; background:transparent; color:#d5e2e7; overflow:hidden; }
    .rom-recorder__symbol > * { min-width:0; }
    .rom-recorder__symbol-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rom-recorder__symbol-breakpoint { width:26px; min-width:26px; height:26px; align-self:center; justify-self:center; padding:0; color:#ff7777; font-size:16px; line-height:1; }
    .rom-recorder__symbol:hover { background:#17252d; }
    .rom-recorder__breakpoints { display:grid; gap:5px; margin-top:8px; }
    .rom-recorder__breakpoint { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:5px 7px; border:1px solid #26343c; }
    .rom-recorder__profiler-controls { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:8px; min-width:0; }
    .rom-recorder__profiler-results { display:grid; gap:7px; }
    .rom-recorder__profiler-note { color:#8fa2ac; font-size:11px; line-height:1.4; }
    .rom-recorder__profiler-controls input { flex:1 1 170px; min-width:0; }
    .rom-recorder__profiler-results,.rom-recorder__profiler-results .rom-recorder__card { min-width:0; max-width:100%; box-sizing:border-box; }
    .rom-recorder__profile-value { font-variant-numeric:tabular-nums; white-space:normal; overflow-wrap:anywhere; }
    .rom-recorder__profile-active { color:#ffd36a; }
    .rom-recorder__transport { display:grid; grid-template-columns:repeat(7,auto) minmax(120px,1fr) auto auto; align-items:center; gap:5px; width:min(100%,720px); padding:6px; box-sizing:border-box; border:1px solid #26343c; background:#0d1419; }
    .rom-recorder__transport button { min-width:34px; padding:5px 7px; font-size:15px; }
    .rom-recorder__transport input[type=range] { min-width:90px; width:100%; }
    .rom-recorder__transport select { min-width:66px; }
    .rom-recorder__frame { min-width:72px; color:#65dbef; }
    .rom-recorder__status { min-height:1.5em; color:#a7b4bb; }
    .rom-recorder__compact-action { display:inline-grid; place-items:center; width:34px; min-width:34px; height:34px; padding:0; font-size:15px; line-height:1; }
    @media(max-width:820px) { .rom-recorder__body { display:block; height:auto; max-height:calc(96vh - 52px); overflow:auto; } .rom-recorder__stage,.rom-recorder__side,.rom-recorder__debug { margin-bottom:10px; } .rom-recorder__transport { grid-template-columns:repeat(6,auto); } .rom-recorder__transport input[type=range] { grid-column:1 / -1; } }
  `;
  document.head.append(style);
}

function buildDialog() {
  ensureStyles();
  const dialog = document.createElement("dialog");
  dialog.className = "rom-recorder";
  dialog.innerHTML = `
    <div class="rom-recorder__head">
      <h2>ROM TEST &amp; DEBUG</h2>
      <div class="rom-recorder__head-actions"><button class="rom-recorder__icon-button" type="button" data-action="fullscreen" title="Toggle fullscreen" aria-label="Toggle fullscreen">&#x26F6;</button><button class="rom-recorder__icon-button" type="button" data-action="close" title="Close emulator" aria-label="Close emulator">&#x2715;</button></div>
    </div>
    <div class="rom-recorder__body">
      <div class="rom-recorder__stage">
        <div class="rom-recorder__screen-wrap">
          <canvas class="rom-recorder__screen" width="256" height="192" tabindex="0"></canvas>
          <div class="rom-recorder__bios-missing" data-field="biosMissing" hidden>
            <div class="rom-recorder__bios-wordmark" aria-hidden="true"><span>C</span><span>O</span><span>L</span><span>E</span><span>C</span><span>O</span><span>V</span><span>ISION</span></div>
            <strong>ColecoVision BIOS missing</strong>
            <p>Amy Studio cannot distribute the system BIOS. Add your own 8 KiB BIOS; it remains stored only in this browser.</p>
            <button type="button" data-action="loadBios">Add ColecoVision BIOS...</button>
          </div>
        </div>
        <div class="rom-recorder__transport" aria-label="Video controls">
          <button type="button" data-action="back10" title="Back 10 frames" aria-label="Back 10 frames">&#x23EA;</button><button type="button" data-action="back1" title="Back 1 frame" aria-label="Back 1 frame">&#x23F4;</button><button type="button" data-action="play" title="Pause" aria-label="Pause">&#x23F8;</button><button type="button" data-action="sourceStep" title="Step one Amy source line" aria-label="Step one Amy source line">&#x21E5;</button><button type="button" data-action="forward1" title="Forward 1 frame" aria-label="Forward 1 frame">&#x23F5;</button><button type="button" data-action="forward10" title="Forward 10 frames" aria-label="Forward 10 frames">&#x23E9;</button>
          <label title="Playback speed"><span class="sr-only">Speed</span><select data-field="speed" aria-label="Playback speed"><option value="0.25">0.25x</option><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option><option value="4">4x</option></select></label>
          <input data-field="timeline" type="range" min="0" max="0" value="0" aria-label="Recorded frame timeline"><span class="rom-recorder__frame" data-field="frame" title="Recorded frame">F 0</span><button type="button" data-action="reset" title="Reset recording" aria-label="Reset recording">&#x21BA;</button>
        </div>
        <div class="rom-recorder__controller" aria-label="ColecoVision controller">
          <button data-input="UP" title="Up" aria-label="Up">↑</button><button data-input="FIRE_LEFT" title="Left fire" aria-label="Left fire">L</button><button data-input="FIRE_RIGHT" title="Right fire" aria-label="Right fire">R</button><button data-input="KEYPAD_1">1</button><button data-input="KEYPAD_2">2</button><button data-input="KEYPAD_3">3</button>
          <button data-input="LEFT" title="Left" aria-label="Left">←</button><button data-input="DOWN" title="Down" aria-label="Down">↓</button><button data-input="RIGHT" title="Right" aria-label="Right">→</button><button data-input="KEYPAD_4">4</button><button data-input="KEYPAD_5">5</button><button data-input="KEYPAD_6">6</button>
          <span></span><span></span><span></span><button data-input="KEYPAD_7">7</button><button data-input="KEYPAD_8">8</button><button data-input="KEYPAD_9">9</button>
          <span></span><span></span><span></span><button data-input="KEYPAD_ASTERISK">*</button><button data-input="KEYPAD_0">0</button><button data-input="KEYPAD_HASH">#</button>
        </div>
      </div>
      <div class="rom-recorder__side">
        <div class="rom-recorder__settings">
          <label>Zoom<select data-field="scale"><option value="fit">Fit</option><option value="1">1x</option><option value="2" selected>2x</option><option value="3">3x</option><option value="4">4x</option></select></label>
          <label>Region<select data-field="region"><option value="-1" selected>Auto (BIOS)</option><option value="0">NTSC 60 Hz</option><option value="1">PAL 50 Hz</option></select></label>
          <label>Pad<select data-field="controller"><option value="0" selected>P1</option><option value="1">P2</option></select></label>
          <button class="rom-recorder__compact-action" type="button" data-action="controllerSetup" title="Controller setup" aria-label="Controller setup">&#x2699;</button>
          <button class="rom-recorder__compact-action" type="button" data-action="muteAudio" title="Mute audio" aria-label="Mute audio" aria-pressed="false">&#x1F50A;</button>
          <button class="rom-recorder__compact-action" type="button" data-action="mouseSpinner" title="Enable mouse spinner" aria-label="Enable mouse spinner" aria-pressed="false">&#x1F5B1;</button>
        </div>
        <label>Target<select data-field="checkpoint"><option value="">Current frame</option></select></label>
        <div class="rom-recorder__tools"><button class="rom-recorder__compact-action" type="button" data-action="loadRom" title="Open external ROM" aria-label="Open external ROM">&#x21E7;</button><button class="rom-recorder__compact-action" type="button" data-action="useCompiledRom" title="Return to compiled Amy ROM" aria-label="Return to compiled Amy ROM">&#x21A9;</button><button class="rom-recorder__compact-action" type="button" data-action="arm" title="Run to checkpoint" aria-label="Run to checkpoint">&#x25B6;</button><button class="rom-recorder__compact-action" type="button" data-action="create" title="Save test JSON" aria-label="Save test JSON">&#x21E9;</button><button class="rom-recorder__compact-action" type="button" data-action="replay" title="Open and replay test" aria-label="Open and replay test">&#x21BB;</button></div>
        <label title="Allow a recompiled ROM with a different hash"><span>ROM &#x0394;</span><input data-field="allowRebuilt" type="checkbox" aria-label="Allow ROM hash change"></label>
        <input data-field="romFile" type="file" accept=".rom,.col,.bin,application/octet-stream" hidden>
        <input data-field="testFile" type="file" accept=".amy-rom-test.json,application/json" hidden>
        <div class="rom-recorder__status" data-field="status">Ready.</div>
      </div>
      <section class="rom-recorder__debug">
        <div class="rom-recorder__tabs" role="tablist">
          <button data-tab="state" aria-selected="true">CPU / VDP</button><button data-tab="asm" aria-selected="false" title="Z80 execution and stack">ASM</button><button data-tab="ram" aria-selected="false" title="CPU memory">RAM</button><button data-tab="vram" aria-selected="false">VRAM</button><button data-tab="map" aria-selected="false" title="Memory map">MAP</button><button data-tab="breakpoints" aria-selected="false" title="Breakpoints">BP</button><button data-tab="profiler" aria-selected="false">Cycles</button>
        </div>
        <div class="rom-recorder__pane is-active" data-pane="state"><div data-field="machineState"></div></div>
        <div class="rom-recorder__pane" data-pane="asm"><div class="rom-recorder__memory-controls rom-recorder__memory-controls--asm"><button class="rom-recorder__compact-action" data-action="stepInto" title="Step into: execute one Z80 instruction" aria-label="Step into one Z80 instruction">&#x2193;</button><button class="rom-recorder__compact-action" data-action="stepOver" title="Step over CALL or RST" aria-label="Step over Z80 call">&#x21B7;</button><span title="Instruction stepping does not modify the ROM">Z80 instruction</span></div><pre class="rom-recorder__dump" data-field="asmDump"></pre></div>
        <div class="rom-recorder__pane" data-pane="ram"><div class="rom-recorder__memory-controls"><input data-field="ramAddress" value="$7000" aria-label="CPU memory address"><select data-field="ramLength"><option>64</option><option>128</option><option>256</option><option selected>384</option><option>512</option></select><button class="rom-recorder__compact-action" data-action="refreshRam" title="Refresh CPU memory" aria-label="Refresh CPU memory">&#x21BB;</button></div><pre class="rom-recorder__dump" data-field="ramDump"></pre></div>
        <div class="rom-recorder__pane" data-pane="vram"><div class="rom-recorder__memory-controls"><input data-field="vramAddress" value="$0000" aria-label="VRAM address"><select data-field="vramLength"><option>64</option><option>128</option><option>256</option><option selected>384</option><option>512</option></select><button class="rom-recorder__compact-action" data-action="refreshVram" title="Refresh VRAM" aria-label="Refresh VRAM">&#x21BB;</button></div><pre class="rom-recorder__dump" data-field="vramDump"></pre></div>
        <div class="rom-recorder__pane" data-pane="map"><input data-field="symbolFilter" placeholder="Filter symbols or address, e.g. Player or $70" aria-label="Filter symbols"><div class="rom-recorder__symbol-list" data-field="symbolList"></div><details><summary>Raw linker memory map</summary><pre class="rom-recorder__raw-map" data-field="rawMap"></pre></details></div>
        <div class="rom-recorder__pane" data-pane="breakpoints"><div class="rom-recorder__memory-controls rom-recorder__memory-controls--breakpoint"><input data-field="breakpointAddress" placeholder="Code symbol or $8000" aria-label="Breakpoint code address"><input data-field="breakpointCondition" placeholder="Optional: Score >= 5" aria-label="Optional RAM breakpoint condition"><select data-field="breakpointValueType" aria-label="Condition value type"><option value="auto">auto</option><option value="u8">u8</option><option value="i8">i8</option><option value="u16">u16</option><option value="i16">i16</option></select><button class="rom-recorder__compact-action" data-action="addBreakpoint" title="Add execute breakpoint, optionally conditional" aria-label="Add execute breakpoint">+</button></div><div class="rom-recorder__memory-controls rom-recorder__memory-controls--watch"><input data-field="watchCondition" placeholder="RAM watch: Lives = 0" aria-label="RAM watch condition"><select data-field="watchValueType" aria-label="RAM watch value type"><option value="auto">auto</option><option value="u8">u8</option><option value="i8">i8</option><option value="u16">u16</option><option value="i16">i16</option></select><button class="rom-recorder__compact-action" data-action="addWatch" title="Add RAM watch" aria-label="Add RAM watch">+</button></div><div class="rom-recorder__breakpoints" data-field="breakpointList"></div><button class="rom-recorder__compact-action" data-action="clearBreakpoints" title="Clear all breakpoints and RAM watches" aria-label="Clear all breakpoints and RAM watches">&#x00D7;</button></div>
        <div class="rom-recorder__pane" data-pane="profiler"><div class="rom-recorder__profiler-controls"><input data-field="profileTarget" list="rom-recorder-profile-targets" placeholder="Amy sub, symbol, or $8000" aria-label="Routine to profile"><datalist id="rom-recorder-profile-targets" data-field="profileTargets"></datalist><button class="rom-recorder__compact-action" data-action="profileRoutine" title="Profile next routine entry" aria-label="Profile next routine entry">&#x25B6;</button><button class="rom-recorder__compact-action" data-action="clearProfiles" title="Clear profiles" aria-label="Clear profiles">&#x00D7;</button></div><div class="rom-recorder__profiler-results" data-field="profileResults"></div><p class="rom-recorder__profiler-note" title="Runs include nested calls and recursion. Main execution excludes NMI and IRQ cycles. Own range is diagnostic, not exclusive self-time. Profiling does not modify the ROM.">Inclusive · main excludes NMI/IRQ · ROM unchanged</p></div>
      </section>
    </div>`;
  document.body.append(dialog);
  return dialog;
}

export function createRomTestRecorderUi({
  getCompiledRom,
  getCompiledMemoryMap = () => "",
  getCompiledSymbols,
  getEmulatorBios,
  requestEmulatorBios = () => {},
  getProject,
  setStatus,
  onSourceBreakpointHit = () => {}
}) {
  let dialog = null;
  let core = null;
  let recorder = null;
  let timer = 0;
  let playing = true;
  const controllerMasks = [0, 0];
  const pressedKeys = new Set();
  let controllerSetup = null;
  let stoppedCheckpoint = null;
  let playbackRate = 1;
  let playbackAccumulator = 0;
  let loadedRom = null;
  let externalRom = null;
  let externalRomName = "";
  let renderCounter = 0;
  let symbols = [];
  const activeBreakpoints = new Map();
  const activeWatches = new Map();
  let nextWatchId = 1;
  let unresolvedSourceBreakpoints = [];
  const audioSink = new RomTestAudioSink();
  let audioMuted = false;
  let mouseSpinnerEnabled = false;
  const mouseSpinnerAccum = [0, 0];
  let mouseJoystickMask = 0;
  const SPINNER_DELTA_LIMIT = 127;
  let profileRequest = null;
  let profileRunToken = 0;
  const profileStats = new Map();

  const field = (name) => dialog.querySelector(`[data-field="${name}"]`);
  const action = (name) => dialog.querySelector(`[data-action="${name}"]`);

  function setRecorderStatus(message) {
    field("status").textContent = message;
  }

  function parseAddressField(name, max = 0xFFFF) {
    const value = resolveSymbolOrAddress(field(name).value, symbols);
    return value & max;
  }

  function refreshMachineState() {
    if (!core) return;
    const pc = core.getPc();
    const vdp = decodeVdpRegisters(core.getVdpRegisters());
    field("machineState").innerHTML = `
      <div class="rom-recorder__summary">
        <div class="rom-recorder__card"><strong>Program counter</strong>${formatHex(pc)} · ${findNearestSymbol(pc, symbols) || "no symbol"}</div>
        <div class="rom-recorder__card"><strong>Execution</strong>${playing ? "Running" : "Paused"} · ${core.getRegionName()} ${core.getFramesPerSecond()} Hz</div>
        <div class="rom-recorder__card"><strong>VDP mode</strong>${vdp.mode} · screen ${vdp.displayEnabled ? "on" : "off"} · NMI ${vdp.nmiEnabled ? "on" : "off"}</div>
        <div class="rom-recorder__card"><strong>Sprites</strong>${vdp.sprites16 ? "16×16" : "8×8"}${vdp.spritesMagnified ? " magnified" : ""} · backdrop ${vdp.backdrop}</div>
        <div class="rom-recorder__card"><strong>Name / pattern / color</strong>${formatHex(vdp.nameTable)} / ${formatHex(vdp.patternTable)} / ${formatHex(vdp.colorTable)}</div>
        <div class="rom-recorder__card"><strong>Sprite attributes / patterns</strong>${formatHex(vdp.spriteAttributeTable)} / ${formatHex(vdp.spritePatternTable)}</div>
      </div>
      <div class="rom-recorder__registers">${vdp.registers.map((entry) => `<code>${entry.name}=${entry.text}</code>`).join("")}</div>`;
  }

  function refreshAssembly() {
    if (!core) return;
    try {
      const cpu = core.getCpuState();
      let before = [];
      for (let distance = 1; distance <= 18; distance += 1) {
        let address = (cpu.pc - distance) & 0xFFFF;
        const candidate = [];
        for (let count = 0; count < 8 && address !== cpu.pc; count += 1) {
          const instruction = core.disassemble(address);
          candidate.push(instruction);
          address = (address + instruction.size) & 0xFFFF;
        }
        if (address === cpu.pc && candidate.length > before.length) before = candidate;
      }
      before = before.slice(-5);
      const instructions = [...before];
      let address = cpu.pc;
      for (let count = 0; count < 9; count += 1) {
        const instruction = core.disassemble(address);
        instructions.push(instruction);
        address = (address + instruction.size) & 0xFFFF;
      }
      const line = (instruction) => {
        const marker = instruction.address === cpu.pc ? ">" : " ";
        const bytes = instruction.opcodes.map((value) => value.toString(16).toUpperCase().padStart(2, "0")).join(" ").padEnd(20);
        const symbol = symbols.find((entry) => entry.address === instruction.address)?.name;
        return marker + " " + formatHex(instruction.address) + "  " + bytes + " " + instruction.text + (symbol ? "  ; " + symbol : "");
      };
      const stackBytes = core.readRam(cpu.sp, 16);
      const stackWords = [];
      for (let index = 0; index + 1 < stackBytes.length; index += 2) {
        const value = stackBytes[index] | (stackBytes[index + 1] << 8);
        const symbol = findNearestSymbol(value, symbols);
        stackWords.push(formatHex((cpu.sp + index) & 0xFFFF) + ": " + formatHex(value) + (symbol ? "  " + symbol : ""));
      }
      const regs = [
        "PC=" + formatHex(cpu.pc) + "  SP=" + formatHex(cpu.sp) + "  IM=" + cpu.interruptMode + "  IFF=" + Number(cpu.iff1) + "/" + Number(cpu.iff2) + (cpu.halted ? "  HALT" : ""),
        "AF=" + formatHex(cpu.af) + " BC=" + formatHex(cpu.bc) + " DE=" + formatHex(cpu.de) + " HL=" + formatHex(cpu.hl) + " IX=" + formatHex(cpu.ix) + " IY=" + formatHex(cpu.iy),
        "AF'=" + formatHex(cpu.af2) + " BC'=" + formatHex(cpu.bc2) + " DE'=" + formatHex(cpu.de2) + " HL'=" + formatHex(cpu.hl2) + " I=" + formatHex(cpu.i, 2) + " R=" + formatHex(cpu.r, 2)
      ];
      field("asmDump").textContent = regs.join("\n") + "\n\nZ80 AROUND PC\n" + instructions.map(line).join("\n") + "\n\nSTACK WORDS\n" + stackWords.join("\n");
    } catch (error) {
      field("asmDump").textContent = error.message || String(error);
    }
  }
  function refreshMemory(kind) {
    if (!core) return;
    try {
      const address = parseAddressField(`${kind}Address`, kind === "vram" ? 0x3FFF : 0xFFFF);
      const length = Number(field(`${kind}Length`).value) || 128;
      const bytes = kind === "vram" ? core.readVram(address, length) : core.readRam(address, length);
      field(`${kind}Dump`).textContent = formatHexDump(bytes, address);
    } catch (error) {
      field(`${kind}Dump`).textContent = error.message || String(error);
    }
  }

  function renderSymbolList() {
    const list = field("symbolList");
    list.replaceChildren();
    for (const symbol of filterSymbols(symbols, field("symbolFilter").value)) {
      const row = document.createElement("div");
      row.className = "rom-recorder__symbol-row";
      const sourceMarker = symbol.name.match(/^AMY_SOURCE_LINE_(\d+)(?:_(\d+))?$/);
      const displayName = sourceMarker
        ? `Line ${sourceMarker[1]}${sourceMarker[2] ? ` · instance ${sourceMarker[2]}` : ""}`
        : symbol.name;
      const navigate = document.createElement("button");
      navigate.type = "button";
      navigate.className = "rom-recorder__symbol";
      navigate.innerHTML = `<code>${formatHex(symbol.address)}</code><span>${sourceMarker ? "SOURCE" : classifyAddress(symbol.address)}</span><span class="rom-recorder__symbol-name"></span>`;
      navigate.lastElementChild.textContent = displayName;
      navigate.title = sourceMarker
        ? `${displayName} at ${formatHex(symbol.address)}. Reveal Amy source.`
        : `${symbol.name} at ${formatHex(symbol.address)}. Open CPU memory.`;
      navigate.addEventListener("click", () => {
        if (sourceMarker) {
          onSourceBreakpointHit(Number(sourceMarker[1]));
          setRecorderStatus(`${displayName} begins at ${formatHex(symbol.address)}.`);
          return;
        }
        field("ramAddress").value = formatHex(symbol.address);
        selectTab("ram");
        setRecorderStatus(`Memory at ${symbol.name} (${formatHex(symbol.address)}).`);
      });
      const breakpoint = document.createElement("button");
      breakpoint.type = "button";
      breakpoint.className = "rom-recorder__symbol-breakpoint";
      breakpoint.textContent = "+";
      breakpoint.setAttribute("aria-label", `Add execute breakpoint at ${symbol.name}`);
      breakpoint.title = `Add execute breakpoint at ${symbol.name}`;
      breakpoint.addEventListener("click", () => {
        if (!core) return;
        core.setExecuteBreakpoint(symbol.address);
        activeBreakpoints.set(symbol.address, { label: symbol.name });
        renderBreakpointList();
        setRecorderStatus(`Execute breakpoint added at ${symbol.name} (${formatHex(symbol.address)}).`);
      });
      row.append(navigate, breakpoint);
      list.append(row);
    }
  }

  function renderBreakpointList() {
    const list = field("breakpointList");
    list.replaceChildren();
    for (const [address, breakpoint] of activeBreakpoints) {
      const info = typeof breakpoint === "string" ? { label: breakpoint } : breakpoint;
      const row = document.createElement("div");
      row.className = "rom-recorder__breakpoint";
      const text = document.createElement("code");
      const sourceMembers = Array.isArray(info.sourceMembers) ? info.sourceMembers : [];
      const sourceLabel = sourceMembers.length
        ? `source ${sourceMembers.map((member) => `line ${member.line}${member.condition ? ` when ${member.condition}` : ""}`).join(", ")}${sourceMembers.length > 1 ? " (shared address)" : ""}`
        : `${info.label}${info.condition ? `  when ${info.condition}` : ""}`;
      text.textContent = `${formatHex(address)}  ${sourceLabel}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "rom-recorder__compact-action";
      remove.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      remove.title = "Remove breakpoint at " + formatHex(address);
      remove.setAttribute("aria-label", "Remove breakpoint at " + formatHex(address));
      remove.addEventListener("click", () => {
        core?.clearExecuteBreakpoint(address);
        activeBreakpoints.delete(address);
        renderBreakpointList();
      });
      row.append(text, remove);
      list.append(row);
    }
    for (const breakpoint of unresolvedSourceBreakpoints) {
      const row = document.createElement("div");
      row.className = "rom-recorder__breakpoint rom-recorder__breakpoint--unresolved";
      const text = document.createElement("code");
      text.textContent = `Line ${breakpoint.line}  no executable address in this build`;
      text.title = "This line did not emit an instruction. Move the breakpoint to an executable statement.";
      row.append(text);
      list.append(row);
    }
    for (const [id, watch] of activeWatches) {
      const row = document.createElement("div");
      row.className = "rom-recorder__breakpoint";
      const text = document.createElement("code");
      text.textContent = `RAM watch  ${watch.condition} (${watch.valueType})`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "rom-recorder__compact-action";
      remove.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      remove.title = "Remove RAM watch " + watch.condition;
      remove.setAttribute("aria-label", "Remove RAM watch " + watch.condition);
      remove.addEventListener("click", () => {
        activeWatches.delete(id);
        renderBreakpointList();
      });
      row.append(text, remove);
      list.append(row);
    }
    if (!activeBreakpoints.size && !activeWatches.size && !unresolvedSourceBreakpoints.length) list.textContent = "No breakpoints or RAM watches.";
  }

  function renderProfileResults() {
    const container = field("profileResults");
    container.replaceChildren();
    if (!profileStats.size) {
      container.textContent = profileRequest
        ? profileRequest.waiting
          ? "Waiting for " + profileRequest.target.name + " at " + formatHex(profileRequest.target.start) + "..."
          : "Measuring " + profileRequest.target.name + ": " + (profileRequest.progress?.instructions || 0).toLocaleString() + " instructions..."
        : "No routine measurements yet.";
      return;
    }
    for (const [name, stats] of profileStats) {
      const card = document.createElement("div");
      card.className = "rom-recorder__card";
      const heading = document.createElement("strong");
      heading.textContent = name.replace(/^AMY_UPROC_/i, "");
      heading.title = name;
      card.append(heading);

      const regionName = core?.getRegionName() || "NTSC";
      const framesPerSecond = core?.getFramesPerSecond() || 60;
      const frameCount = stats.framePercent / 100;
      const seconds = frameCount / framesPerSecond;
      const duration = seconds < 1 ? `${(seconds * 1000).toFixed(1)} ms` : `${seconds.toFixed(2)} seconds`;
      const completion = stats.lastCompletionKind === "transfer"
        ? "Amy transfer"
        : stats.lastCompletionKind === "return" ? "return" : "unknown";

      const primary = document.createElement("div");
      primary.className = "rom-recorder__profile-value";
      primary.textContent = `Last run: ${Math.round(stats.last).toLocaleString()} cycles · ${stats.lastInstructions.toLocaleString()} instructions`;
      card.append(primary);

      const addDetail = (text, title = "") => {
        const row = document.createElement("div");
        row.className = "rom-recorder__profiler-note";
        row.textContent = text;
        if (title) row.title = title;
        card.append(row);
      };
      addDetail(`Estimated duration: ${frameCount.toFixed(2)} ${regionName} frames · ${duration}`);
      addDetail(`Main execution: ${Math.round(stats.lastWithoutInterrupt).toLocaleString()} cycles`, "Complete measured execution, including nested calls, with interrupt cycles removed.");
      addDetail(`Interrupts: ${Math.round(stats.lastInterrupt).toLocaleString()} cycles · NMI ${Math.round(stats.lastNmi).toLocaleString()} · IRQ ${Math.round(stats.lastIrq).toLocaleString()}`);
      addDetail(`Own address range: ${Math.round(stats.lastInRange).toLocaleString()} cycles`, "Instructions physically located between this symbol and the next Amy procedure. This is diagnostic address-range time, not exclusive self-time.");
      addDetail(`Exit: ${completion}`);
      addDetail(`${stats.count} measurement${stats.count === 1 ? "" : "s"}: min ${Math.round(stats.min).toLocaleString()} · median ${Math.round(stats.median).toLocaleString()} · average ${Math.round(stats.average).toLocaleString()} · max ${Math.round(stats.max).toLocaleString()} cycles`);
      addDetail("Nested calls and recursion are included.");
      container.append(card);
    }
  }

  function setProfilerTransportLocked(locked) {
    for (const name of ["back10", "back1", "sourceStep", "stepInto", "stepOver", "forward1", "forward10", "reset", "replay"]) {
      action(name).disabled = locked;
    }
    field("timeline").disabled = locked;
    field("region").disabled = locked;
  }

  function setProfileButtonState(cancelling) {
    const button = action("profileRoutine");
    const label = cancelling ? "Cancel routine profile" : "Profile next routine entry";
    button.textContent = cancelling ? "■" : "▶";
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  function renderAudioButton() {
    const button = action("muteAudio");
    button.textContent = audioMuted ? "🔇" : "🔊";
    button.title = audioMuted ? "Unmute audio" : "Mute audio";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", audioMuted ? "true" : "false");
  }

  function updateCheckpointAction() {
    const checkpoint = field("checkpoint").value;
    action("arm").disabled = !checkpoint;
    action("arm").title = checkpoint ? `Run to ${checkpoint}` : "Select a symbolic checkpoint to run to";
    action("arm").setAttribute("aria-label", action("arm").title);
  }
  function renderMouseSpinnerButton() {
    const button = action("mouseSpinner");
    const port = (Number(field("controller").value) || 0) + 1;
    const config = controllerSetup?.getConfig();
    const roller = config?.ports?.[0]?.type === "roller-x" || config?.ports?.[1]?.type === "roller-y";
    const wheel = config?.ports?.[0]?.type === "wheel";
    const rollerMode = config?.rollerMode === "joystick" ? "joystick" : "trackball";
    button.title = wheel
      ? (mouseSpinnerEnabled ? "Disable" : "Enable") + " mouse Steering Wheel (horizontal movement steers P1; left click is the physical pedal, right click is optional P1 Right Fire)"
      : roller
      ? rollerMode === "joystick"
        ? `${mouseSpinnerEnabled ? "Disable" : "Enable"} mouse Roller joystick mode (movement becomes P1 directions)`
        : `${mouseSpinnerEnabled ? "Disable" : "Enable"} mouse Roller trackball mode (P1 horizontal / P2 vertical; left click Fire, right click Thrust on P2)`
      : mouseSpinnerEnabled
        ? `Disable mouse spinner for P${port}`
        : `Enable mouse spinner for P${port}`;
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", mouseSpinnerEnabled ? "true" : "false");
  }

  function clearMouseFireButtons() {
    const fireMask = GEARCOLECO_TEST_INPUT.FIRE_LEFT | GEARCOLECO_TEST_INPUT.FIRE_RIGHT;
    controllerMasks[0] &= ~fireMask;
    controllerMasks[1] &= ~fireMask;
  }

  function setMouseSpinnerEnabled(enabled) {
    mouseSpinnerEnabled = Boolean(enabled);
    mouseJoystickMask = 0;
    if (!mouseSpinnerEnabled) {
      mouseSpinnerAccum[0] = 0;
      mouseSpinnerAccum[1] = 0;
      mouseJoystickMask = 0;
      clearMouseFireButtons();
    }
    renderMouseSpinnerButton();
  }

  function addMouseSpinnerMovement(event) {
    if (!mouseSpinnerEnabled || !playing) return;
    const config = controllerSetup?.getConfig();
    const joystickMask = mapMouseRollerJoystickMask(
      config,
      event.movementX,
      event.movementY,
      GEARCOLECO_TEST_INPUT
    );
    if (joystickMask) {
      mouseJoystickMask = joystickMask;
      return;
    }
    const deltas = mapMouseSpinnerMovement(
      config,
      Number(field("controller").value) || 0,
      event.movementX,
      event.movementY
    );
    mouseSpinnerAccum[0] += deltas[0];
    mouseSpinnerAccum[1] += deltas[1];
  }

  function setMouseFireButton(event, pressed) {
    if (!mouseSpinnerEnabled) return;
    const target = resolveMouseFireTarget(
      event.button,
      controllerSetup?.getConfig(),
      Number(field("controller").value) || 0,
      GEARCOLECO_TEST_INPUT
    );
    if (!target.mask) return;
    event.preventDefault();
    if (pressed) controllerMasks[target.portIndex] |= target.mask;
    else controllerMasks[target.portIndex] &= ~target.mask;
  }

  function consumeMouseSpinnerDelta(portIndex) {
    const consumed = consumeMouseSpinnerTicks(mouseSpinnerAccum[portIndex], SPINNER_DELTA_LIMIT);
    mouseSpinnerAccum[portIndex] = consumed.remainder;
    return consumed.delta;
  }


  function cancelRoutineProfile(message = "Routine profiling cancelled.") {
    profileRunToken += 1;
    if (profileRequest?.temporaryBreakpoint && core) {
      core.clearExecuteBreakpoint(profileRequest.target.start);
    }
    if (profileRequest && core) core.cancelRoutineProfile();
    profileRequest = null;
    setProfileButtonState(false);
    setProfilerTransportLocked(false);
    renderProfileResults();
    setRecorderStatus(message);
  }

  function finishRoutineProfile(sample) {
    profileStats.set(sample.target.name, appendRoutineProfileSample(profileStats.get(sample.target.name), sample));
    profileRequest = null;
    setProfileButtonState(false);
    setProfilerTransportLocked(false);
    renderProfileResults();
    setRecorderStatus(
      `${sample.target.name}: ${sample.inclusiveCycles.toLocaleString()} inclusive, ${sample.inRangeCycles.toLocaleString()} in-range, ${sample.interruptCycles.toLocaleString()} interrupt cycles, ended by ${sample.completionKind || "unknown"} (${sample.framePercent.toFixed(2)}% of a ${core.getRegionName()} frame).`
    );
    render({ forceInspector: true });
  }

  function beginRoutineProfile() {
    if (!core || !profileRequest) return;
    playing = false;
    playbackAccumulator = 0;
    audioSink.flush();
    const request = profileRequest;
    if (request.temporaryBreakpoint) core.clearExecuteBreakpoint(request.target.start);
    request.waiting = false;
    const entrySp = core.getSp();
    const stack = core.readRam(entrySp, 2);
    if (stack.length !== 2) {
      cancelRoutineProfile("Routine profiling failed: could not read the return address.");
      return;
    }
    const exitAddresses = [...new Set(symbols
      .filter((symbol) => /^AMY_UPROC_/i.test(symbol.name) && symbol.address !== request.target.start)
      .map((symbol) => symbol.address))];
    core.beginRoutineProfile({
      target: request.target,
      entrySp,
      returnAddress: stack[0] | (stack[1] << 8),
      exitAddresses
    });
    const token = ++profileRunToken;
    const maxInstructions = 10000000;
    setProfileButtonState(true);
    setRecorderStatus("Measuring " + request.target.name + " in native batches...");

    const runBatch = () => {
      if (!core || token !== profileRunToken) return;
      try {
        const result = core.runRoutineProfileBatch(100000);
        request.progress = result;
        if (result.complete) {
          finishRoutineProfile({
            ...result,
            target: request.target,
            withoutInterruptCycles: Math.max(0, result.inclusiveCycles - result.interruptCycles),
            framePercent: result.inclusiveCycles * 100 / core.getCyclesPerFrame()
          });
          return;
        }
        if (result.instructions >= maxInstructions) {
          cancelRoutineProfile("Profiling stopped after " + maxInstructions.toLocaleString() + " instructions without observing a return or same-level transfer.");
          render({ forceInspector: true });
          return;
        }
        renderProfileResults();
        setTimeout(runBatch, 0);
      } catch (error) {
        cancelRoutineProfile("Routine profiling failed: " + (error.message || error));
        render({ forceInspector: true });
      }
    };
    setTimeout(runBatch, 0);
  }

  function armRoutineProfile() {
    if (!core) return;
    if (profileRequest) {
      cancelRoutineProfile();
      return;
    }
    try {
      const target = resolveProfileTarget(symbols, field("profileTarget").value);
      const temporaryBreakpoint = !activeBreakpoints.has(target.start);
      if (temporaryBreakpoint) core.setExecuteBreakpoint(target.start);
      profileRequest = { target, temporaryBreakpoint, waiting: true };
      setProfileButtonState(true);
      playing = true;
      playbackAccumulator = 0;
      renderProfileResults();
      setRecorderStatus(`Waiting for the next call to ${target.name} at ${formatHex(target.start)}...`);
      render();
    } catch (error) {
      setRecorderStatus(error.message || String(error));
    }
  }

  function refreshActiveInspector(force = false) {
    if (!core) return;
    if (!force && playing && ++renderCounter % 10 !== 0) return;
    refreshMachineState();
    const active = dialog.querySelector("[data-pane].is-active")?.dataset.pane;
    if (active === "asm") refreshAssembly();
    if (active === "ram") refreshMemory("ram");
    if (active === "vram") refreshMemory("vram");
  }

  function applyScale() {
    const canvas = dialog.querySelector("canvas");
    const scale = field("scale").value;
    canvas.style.width = scale === "fit" ? "100%" : `${256 * Number(scale)}px`;
    canvas.style.height = scale === "fit" ? "auto" : `${192 * Number(scale)}px`;
  }

  function render({ forceInspector = false } = {}) {
    const screenCanvas = dialog.querySelector("canvas");
    renderRgb565(screenCanvas, core.getFramebuffer());
    const timeline = recorder.getTimeline();
    const slider = field("timeline");
    slider.min = String(timeline.firstAvailableFrame);
    slider.max = String(timeline.latestFrame);
    slider.value = String(timeline.frame);
    field("frame").textContent = `F ${timeline.frame}`;
    action("play").innerHTML = playing ? "&#x23F8;" : "&#x25B6;";
    action("play").title = playing ? "Pause" : "Play";
    action("play").setAttribute("aria-label", playing ? "Pause" : "Play");
    refreshActiveInspector(forceInspector || !playing);
  }

  function runOneFrame({ renderNow = true } = {}) {
    const timeline = recorder.getTimeline();
    const mappedInput = controllerSetup?.getFrameInput(pressedKeys) || {
      controllerMasks: [0, 0],
      spinnerDeltas: [0, 0]
    };
    const mouseDeltas = timeline.frame < timeline.latestFrame
      ? [0, 0]
      : [consumeMouseSpinnerDelta(0), consumeMouseSpinnerDelta(1)];
    const spinnerDeltas = mappedInput.spinnerDeltas.map((delta, index) =>
      Math.max(-SPINNER_DELTA_LIMIT, Math.min(SPINNER_DELTA_LIMIT, delta + mouseDeltas[index])));
    if (mouseSpinnerEnabled && mouseDeltas[(Number(field("controller").value) || 0)] !== 0) {
      const portIndex = Number(field("controller").value) || 0;
      action("mouseSpinner").dataset.lastDelta = String(mouseDeltas[portIndex]);
    }
    const effectiveMasks = mappedInput.controllerMasks.map((mask, index) => mask | controllerMasks[index]);
    effectiveMasks[0] |= mouseJoystickMask;
    const replaying = timeline.frame < timeline.latestFrame;
    const result = replaying
      ? recorder.replayFrame()
      : recorder.runFrame({ controllerMasks: effectiveMasks, spinnerDeltas });
    if (!replaying) mouseJoystickMask = 0;
    audioSink.push(core.getAudioFrame());
    if (result.breakpointHit) {
      if (profileRequest?.waiting && result.pc === profileRequest.target.start) {
        beginRoutineProfile();
        if (renderNow) render({ forceInspector: true });
        return result;
      }
      const rawBreakpoint = activeBreakpoints.get(result.pc);
      const breakpoint = typeof rawBreakpoint === "string" ? { label: rawBreakpoint } : rawBreakpoint;
      let conditionResult = null;
      let matchedSourceMember = null;
      const candidates = Array.isArray(breakpoint?.sourceMembers)
        ? breakpoint.sourceMembers
        : [breakpoint].filter(Boolean);
      for (const candidate of candidates) {
        if (!candidate.condition) {
          matchedSourceMember = candidate;
          break;
        }
        try {
          conditionResult = evaluateBreakpointCondition({
            condition: candidate.condition,
            valueType: candidate.valueType || "auto",
            symbols,
            sourceText: getProject()?.sourceText || "",
            readMemory: (address, size) => core.readRam(address, size)
          });
          if (conditionResult.matched) {
            matchedSourceMember = candidate;
            break;
          }
        } catch (error) {
          playing = false;
          stoppedCheckpoint = null;
          setRecorderStatus(`Conditional breakpoint error at ${formatHex(result.pc)}: ${error.message || error}`);
          if (renderNow) render({ forceInspector: true });
          return result;
        }
      }
      if (candidates.length && !matchedSourceMember) {
        if (renderNow) render();
        return { ...result, breakpointHit: false, conditionSkipped: true };
      }
      playing = false;
      stoppedCheckpoint = field("checkpoint").value || null;
      const label = matchedSourceMember?.line
        ? `source line ${matchedSourceMember.line}`
        : breakpoint?.label || stoppedCheckpoint || "breakpoint";
      const valueNote = conditionResult ? `; value ${conditionResult.actual} ${conditionResult.operator} ${conditionResult.expected}` : "";
      setRecorderStatus(`Stopped at ${label} (${formatHex(result.pc)}${valueNote}).`);
      const sourceLine = matchedSourceMember?.line || breakpoint?.sourceLine;
      if (sourceLine) onSourceBreakpointHit(sourceLine);
    }
    const watchHit = checkActiveWatches("frame");
    if (renderNow) render({ forceInspector: result.breakpointHit || watchHit });
    return watchHit ? { ...result, breakpointHit: true, watchHit: true } : result;
  }

  function moveFrames(delta) {
    playing = false;
    playbackAccumulator = 0;
    audioSink.flush();
    const timeline = recorder.getTimeline();
    if (delta < 0) recorder.seek(Math.max(timeline.firstAvailableFrame, timeline.frame + delta));
    else for (let index = 0; index < (delta | 0); ++index) if (runOneFrame({ renderNow: false }).breakpointHit) break;
    stoppedCheckpoint = null;
    render({ forceInspector: true });
  }
  function checkActiveWatches(precision = "frame") {
    for (const watch of activeWatches.values()) {
      try {
        const result = evaluateBreakpointCondition({
          condition: watch.condition,
          valueType: watch.valueType,
          symbols,
          sourceText: getProject()?.sourceText || "",
          readMemory: (address, size) => core.readRam(address, size)
        });
        if (!result.matched) continue;
        playing = false;
        stoppedCheckpoint = null;
        setRecorderStatus(`RAM watch matched ${watch.condition}: ${result.actual} ${result.operator} ${result.expected} at ${formatHex(result.address)} (${precision} precision).`);
        return true;
      } catch (error) {
        playing = false;
        setRecorderStatus(`RAM watch error for ${watch.condition}: ${error.message || error}`);
        return true;
      }
    }
    return false;
  }
  function pauseForInstructionStep() {
    playing = false;
    playbackAccumulator = 0;
    stoppedCheckpoint = null;
    audioSink.flush();
  }

  function activeBreakpointMatches(address) {
    const raw = activeBreakpoints.get(address & 0xFFFF);
    if (!raw) return false;
    const info = typeof raw === "string" ? { label: raw } : raw;
    const candidates = Array.isArray(info?.sourceMembers) ? info.sourceMembers : [info];
    for (const candidate of candidates) {
      if (!candidate?.condition) return true;
      const result = evaluateBreakpointCondition({
        condition: candidate.condition,
        valueType: candidate.valueType || "auto",
        symbols,
        sourceText: getProject()?.sourceText || "",
        readMemory: (address, size) => core.readRam(address, size)
      });
      if (result.matched) return true;
    }
    return false;
  }

  function stepAsmInstruction() {
    if (!core) return;
    pauseForInstructionStep();
    const startPc = core.getPc();
    const instruction = core.disassemble(startPc);
    const startCycles = core.getMasterClockCycles();
    try {
      const result = core.stepInstruction();
      const watchHit = checkActiveWatches("instruction");
      if (!watchHit) setRecorderStatus(`Step into ${formatHex(startPc)} ${instruction.text} -> ${formatHex(result.pc)}; ${(core.getMasterClockCycles() - startCycles).toLocaleString()} cycles.`);
    } catch (error) {
      setRecorderStatus(`Step into failed: ${error.message || error}`);
    }
    render({ forceInspector: true });
  }

  function stepAsmOver() {
    if (!core) return;
    pauseForInstructionStep();
    const startPc = core.getPc();
    const instruction = core.disassemble(startPc);
    const startCycles = core.getMasterClockCycles();
    const targetPc = (startPc + instruction.size) & 0xFFFF;
    const isCall = /^(?:call|rst)\b/i.test(instruction.text.trim());
    const maxInstructions = 1000000;
    let result = null;
    try {
      if (!isCall) {
        result = core.stepInstruction();
        if (checkActiveWatches("instruction")) {
          render({ forceInspector: true });
          return;
        }
      } else {
        for (let count = 1; count <= maxInstructions; ++count) {
          result = core.stepInstruction();
          if (checkActiveWatches("instruction")) {
            render({ forceInspector: true });
            return;
          }
          if (result.pc === targetPc || activeBreakpointMatches(result.pc)) {
            const reason = result.pc === targetPc ? "returned" : "hit breakpoint";
            setRecorderStatus(`Step over ${formatHex(startPc)} ${instruction.text} -> ${formatHex(result.pc)} (${reason}) after ${count.toLocaleString()} instructions and ${(core.getMasterClockCycles() - startCycles).toLocaleString()} cycles.`);
            render({ forceInspector: true });
            return;
          }
        }
        setRecorderStatus(`Step over stopped after ${maxInstructions.toLocaleString()} instructions without reaching ${formatHex(targetPc)}.`);
        render({ forceInspector: true });
        return;
      }
      setRecorderStatus(`Step over ${formatHex(startPc)} ${instruction.text} -> ${formatHex(result.pc)}; ${(core.getMasterClockCycles() - startCycles).toLocaleString()} cycles.`);
    } catch (error) {
      setRecorderStatus(`Step over failed: ${error.message || error}`);
    }
    render({ forceInspector: true });
  }
  function stepSourceLine() {
    if (!core) return;
    const sourceMarkers = listAmySourceMarkers(symbols);
    if (!sourceMarkers.length) {
      setRecorderStatus("Amy source stepping requires source markers. Compile the project again to generate them.");
      return;
    }

    const markersByAddress = new Map();
    for (const marker of sourceMarkers) {
      if (!markersByAddress.has(marker.address)) markersByAddress.set(marker.address, []);
      markersByAddress.get(marker.address).push(marker);
    }
    for (const marker of listAmyProcedureSourceMarkers(symbols, getProject()?.sourceText || "")) {
      const entries = markersByAddress.get(marker.address) || [];
      if (!entries.some((entry) => entry.sourceLine === marker.sourceLine)) entries.push(marker);
      markersByAddress.set(marker.address, entries);
    }

    playing = false;
    playbackAccumulator = 0;
    audioSink.flush();
    const startPc = core.getPc();
    const maxInstructions = 500000;
    for (let count = 1; count <= maxInstructions; ++count) {
      let result;
      try {
        result = core.stepInstruction();
      } catch (error) {
        setRecorderStatus(`Source step failed: ${error.message || error}`);
        render({ forceInspector: true });
        return;
      }
      if (checkActiveWatches("instruction")) {
        render({ forceInspector: true });
        return;
      }
      const matches = markersByAddress.get(result.pc);
      if (!matches?.length) continue;
      const lines = [...new Set(matches.map((marker) => marker.sourceLine))];
      const selectedMarker = chooseAmySourceMarker(matches, {
        address: result.pc,
        symbols,
        sourceText: getProject()?.sourceText || ""
      });
      onSourceBreakpointHit(selectedMarker.sourceLine);
      const aliasNote = lines.length > 1 ? `; shared source lines ${lines.join(", ")}` : "";
      const symbolNote = findNearestSymbol(result.pc, symbols);
      setRecorderStatus(`Source step ${formatHex(startPc)} -> line ${selectedMarker.sourceLine} (${formatHex(result.pc)}${symbolNote ? `; ${symbolNote}` : ""}${aliasNote}) after ${count} Z80 instruction${count === 1 ? "" : "s"}.`);
      render({ forceInspector: true });
      return;
    }
    setRecorderStatus(`Source step stopped after the safety limit of ${maxInstructions} Z80 instructions; no new Amy source marker was reached.`);
    render({ forceInspector: true });
  }


  function stopCore() {
    clearInterval(timer);
    timer = 0;
    core?.destroy();
    core = null;
    recorder = null;
    activeBreakpoints.clear();
    profileRunToken += 1;
    profileRequest = null;
    if (dialog) setProfilerTransportLocked(false);
    loadedRom = null;
    unresolvedSourceBreakpoints = [];
    audioSink.flush();
  }

  function startPlaybackTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!playing || !core || !recorder) return;
      playbackAccumulator += playbackRate;
      let advanced = false;
      while (playbackAccumulator >= 1 && playing) {
        const result = runOneFrame({ renderNow: false });
        playbackAccumulator -= 1;
        advanced = true;
        if (result.breakpointHit) break;
      }
      if (advanced) render();
    }, 1000 / (core?.getFramesPerSecond() || 60));
  }
  function removeInstalledSourceBreakpoints() {
    if (!core) return;
    for (const [address, breakpoint] of [...activeBreakpoints]) {
      if (!breakpoint?.sourceMarker) continue;
      core.clearExecuteBreakpoint(address);
      activeBreakpoints.delete(address);
    }
  }


  function installSourceBreakpoints() {
    const configured = Array.isArray(getProject()?.sourceBreakpoints) ? getProject().sourceBreakpoints : [];
    const sourceMarkers = listAmySourceMarkers(symbols);
    removeInstalledSourceBreakpoints();
    const resolved = resolveAmySourceBreakpoints(configured, sourceMarkers);
    unresolvedSourceBreakpoints = resolved.unresolved;
    for (const group of resolved.groups) {
      core.setExecuteBreakpoint(group.address);
      activeBreakpoints.set(group.address, {
        label: `source line ${group.members[0].line}`,
        sourceLine: group.members[0].line,
        sourceMembers: group.members,
        sourceMarker: true
      });
    }
    for (const breakpoint of listAmyDebugBreakpoints(symbols)) {
      core.setExecuteBreakpoint(breakpoint.address);
      const sourceBreakpoint = configured.find((entry) => `ui_${entry.id}` === breakpoint.label);
      activeBreakpoints.set(breakpoint.address, sourceBreakpoint ? {
        label: `source line ${sourceBreakpoint.line}`,
        condition: sourceBreakpoint.condition || "",
        valueType: sourceBreakpoint.valueType || "auto",
        sourceLine: sourceBreakpoint.line
      } : { label: `source: ${breakpoint.label}` });
    }
    renderBreakpointList();
  }

  async function startCore(romOverride = null) {
    stopCore();
    const rom = romOverride || externalRom || getCompiledRom();
    const bios = getEmulatorBios();
    if (!rom || !bios) throw new Error("Compile or open a ROM and load a BIOS first.");
    core = await GearcolecoTestCore.create({ seed: SEED });
    loadedRom = rom;
    core.loadBios(bios);
    core.loadRom(rom, { region: Number(field("region").value) });
    recorder = new RomTestRecorder(core, { keyframeInterval: 12, maxKeyframes: 300 });
    recorder.start();
    if (!externalRom) installSourceBreakpoints();
    playing = true;
    controllerMasks[0] = 0;
    controllerMasks[1] = 0;
    pressedKeys.clear();
    stoppedCheckpoint = null;
    playbackAccumulator = 0;
    renderCounter = 0;
    audioSink.setPlaybackRate(playbackRate);
    await audioSink.resume();
    startPlaybackTimer();
    render({ forceInspector: true });
    dialog.querySelector("canvas").focus();
  }

  function selectTab(name) {
    for (const button of dialog.querySelectorAll("[data-tab]")) button.setAttribute("aria-selected", String(button.dataset.tab === name));
    for (const pane of dialog.querySelectorAll("[data-pane]")) pane.classList.toggle("is-active", pane.dataset.pane === name);
    if (name === "asm") refreshAssembly();
    if (name === "ram") refreshMemory("ram");
    if (name === "vram") refreshMemory("vram");
    if (name === "state") refreshMachineState();
    if (name === "profiler") renderProfileResults();
  }

  function bindInputButton(button) {
    const mask = GEARCOLECO_TEST_INPUT[button.dataset.input];
    const press = (event) => {
      event.preventDefault();
      const controller = Number(field("controller").value) || 0;
      controllerMasks[controller] |= mask;
      button.dataset.activeController = String(controller);
      button.setPointerCapture?.(event.pointerId);
    };
    const release = (event) => {
      event.preventDefault();
      const controller = Number(button.dataset.activeController) || 0;
      controllerMasks[controller] &= ~mask;
      delete button.dataset.activeController;
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }

  function bindDialog() {
    action("close").addEventListener("click", () => dialog.close());
    action("loadBios").addEventListener("click", requestEmulatorBios);
    action("fullscreen").addEventListener("click", async () => {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await dialog.requestFullscreen();
    });
    action("play").addEventListener("click", () => {
      if (!playing) stoppedCheckpoint = null;
      playing = !playing;
      playbackAccumulator = 0;
      if (!playing) audioSink.flush(); else audioSink.resume();
      render({ forceInspector: true });
    });
    action("back10").addEventListener("click", () => moveFrames(-10));
    action("back1").addEventListener("click", () => moveFrames(-1));
    action("forward1").addEventListener("click", () => moveFrames(1));
    action("forward10").addEventListener("click", () => moveFrames(10));
    action("sourceStep").addEventListener("click", stepSourceLine);
    action("stepInto").addEventListener("click", stepAsmInstruction);
    action("stepOver").addEventListener("click", stepAsmOver);
    action("profileRoutine").addEventListener("click", armRoutineProfile);
    action("clearProfiles").addEventListener("click", () => {
      profileStats.clear();
      renderProfileResults();
      setRecorderStatus("Routine cycle measurements cleared.");
    });
    field("speed").addEventListener("change", () => {
      playbackRate = Number(field("speed").value) || 1;
      playbackAccumulator = 0;
      audioSink.setPlaybackRate(playbackRate);
    });
    field("scale").addEventListener("change", applyScale);
    field("region").addEventListener("change", async () => {
      setRecorderStatus("Restarting in the selected video region...");
      try { await startCore(); setRecorderStatus(`Running in ${core.getRegionName()} at ${core.getFramesPerSecond()} Hz.`); }
      catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    field("controller").addEventListener("change", () => {
      controllerMasks[0] = 0;
      controllerMasks[1] = 0;
      renderMouseSpinnerButton();
    });
    action("controllerSetup").addEventListener("click", () => {
      controllerSetup.open(Number(field("controller").value) || 0);
    });
    action("muteAudio").addEventListener("click", () => {
      audioMuted = !audioMuted;
      audioSink.setMuted(audioMuted);
      if (!audioMuted) audioSink.resume();
      renderAudioButton();
    });

    action("mouseSpinner").addEventListener("click", async () => {
      const canvas = dialog.querySelector("canvas");
      const enabled = !mouseSpinnerEnabled;
      setMouseSpinnerEnabled(enabled);
      if (enabled) canvas.focus();
      if (enabled && canvas.requestPointerLock) {
        try { await canvas.requestPointerLock(); }
        catch { setRecorderStatus("Mouse spinner enabled over the game screen."); }
        canvas.focus();
      } else if (!enabled && document.pointerLockElement === canvas) {
        document.exitPointerLock?.();
      }
    });
    const spinnerCanvas = dialog.querySelector("canvas");
    spinnerCanvas.addEventListener("mousedown", (event) => setMouseFireButton(event, true));
    document.addEventListener("mouseup", (event) => setMouseFireButton(event, false));
    spinnerCanvas.addEventListener("contextmenu", (event) => {
      if (mouseSpinnerEnabled) event.preventDefault();
    });
    document.addEventListener("mousemove", addMouseSpinnerMovement);
    document.addEventListener("pointerlockchange", () => {
      if (mouseSpinnerEnabled && !document.pointerLockElement) {
        setRecorderStatus("Mouse spinner remains active; move over the recorder or click its mouse button to recapture.");
      }
    });
    field("checkpoint").addEventListener("change", updateCheckpointAction);
    action("reset").addEventListener("click", async () => {
      setRecorderStatus("Resetting...");
      try { await startCore(); setRecorderStatus("Recording from reset."); }
      catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    field("timeline").addEventListener("input", () => {
      playing = false;
      audioSink.flush();
      recorder.seek(Number(field("timeline").value));
      stoppedCheckpoint = null;
      render({ forceInspector: true });
    });
    for (const button of dialog.querySelectorAll("[data-tab]")) button.addEventListener("click", () => selectTab(button.dataset.tab));
    action("refreshRam").addEventListener("click", () => refreshMemory("ram"));
    action("refreshVram").addEventListener("click", () => refreshMemory("vram"));
    field("symbolFilter").addEventListener("input", renderSymbolList);
    for (const button of dialog.querySelectorAll("[data-input]")) bindInputButton(button);

    action("addBreakpoint").addEventListener("click", () => {
      try {
        const input = field("breakpointAddress").value.trim();
        const condition = field("breakpointCondition").value.trim();
        const valueType = field("breakpointValueType").value || "auto";
        if (condition) parseBreakpointCondition(condition);
        const address = resolveSymbolOrAddress(input, symbols);
        core.setExecuteBreakpoint(address);
        activeBreakpoints.set(address, { label: input || formatHex(address), condition, valueType });
        renderBreakpointList();
        setRecorderStatus(`Execute breakpoint added at ${formatHex(address)}${condition ? ` when ${condition} (${valueType})` : ""}.`);
      } catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    action("addWatch").addEventListener("click", () => {
      try {
        const condition = field("watchCondition").value.trim();
        const valueType = field("watchValueType").value || "auto";
        if (!condition) throw new Error("Enter a RAM condition such as Lives = 0 or $712F > 5.");
        parseBreakpointCondition(condition);
        activeWatches.set(nextWatchId++, { condition, valueType });
        renderBreakpointList();
        setRecorderStatus(`RAM watch added: ${condition} (${valueType}); instruction precision while stepping, frame precision while running.`);
      } catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    action("clearBreakpoints").addEventListener("click", () => {
      core?.clearAllBreakpoints();
      activeBreakpoints.clear();
      activeWatches.clear();
      renderBreakpointList();
    });
    action("arm").addEventListener("click", () => {
      const checkpoint = field("checkpoint").value;
      if (!checkpoint) { setRecorderStatus("Select a symbolic checkpoint first."); return; }
      core.clearAllBreakpoints();
      activeBreakpoints.clear();
      const resolved = resolveAmyCheckpoint(getCompiledSymbols(), checkpoint);
      core.setExecuteBreakpoint(resolved.address);
      activeBreakpoints.set(resolved.address, { label: resolved.symbol });
      renderBreakpointList();
      stoppedCheckpoint = null;
      playing = true;
      setRecorderStatus(`Running to ${resolved.symbol}...`);
      render();
    });
    action("create").addEventListener("click", async () => {
      try {
        playing = false;
        const timeline = recorder.getTimeline();
        const inputs = recorder.getRecordedInputs({ from: 0, to: stoppedCheckpoint ? timeline.frame + 1 : timeline.latestFrame });
        const framebuffer = core.getFramebuffer();
        const frameBytes = new Uint8Array(framebuffer.pixels.buffer, framebuffer.pixels.byteOffset, framebuffer.pixels.byteLength);
        const rom = externalRom || loadedRom || getCompiledRom();
        const bios = getEmulatorBios();
        const test = createRomTestCase({
          name: `${getProject().projectName || "amy"} frame ${inputs.length}`,
          projectName: getProject().projectName,
          seed: SEED,
          biosSha256: await sha256(bios),
          romSha256: await sha256(rom),
          inputs,
          checkpoint: stoppedCheckpoint ? { name: stoppedCheckpoint, occurrence: 1 } : null,
          assertions: {
            framebufferSha256: await sha256(frameBytes),
            vramSha256: await sha256(core.readVram(0, 0x4000)),
            vdpRegisters: [...core.getVdpRegisters()]
          }
        });
        const suffix = stoppedCheckpoint || `frame-${inputs.length}`;
        downloadJson(`${getProject().projectName || "amy"}-${suffix}.amy-rom-test.json`, test);
        setRecorderStatus(stoppedCheckpoint ? `Saved rebuild-stable test at ${stoppedCheckpoint}.` : "Saved frame-based test. Add a checkpoint for rebuild stability.");
      } catch (error) { setRecorderStatus(error.message || String(error)); }
      render({ forceInspector: true });
    });
    action("loadRom").addEventListener("click", () => {
      field("romFile").value = "";
      field("romFile").click();
    });
    field("romFile").addEventListener("change", async () => {
      const file = field("romFile").files?.[0];
      if (!file) return;
      setRecorderStatus(`Loading ${file.name}...`);
      try {
        externalRom = new Uint8Array(await file.arrayBuffer());
        externalRomName = file.name;
        symbols = [];
        profileStats.clear();
        field("checkpoint").replaceChildren(new Option("Current frame", ""));
        field("rawMap").textContent = "External ROM: no Amy linker map.";
        await startCore(externalRom);
        action("useCompiledRom").disabled = !getCompiledRom();
        renderSymbolList();
        renderBreakpointList();
        setRecorderStatus(`Running external ROM ${externalRomName}. Mouse spinner deltas are recorded per frame.`);
      } catch (error) {
        externalRom = null;
        externalRomName = "";
        setRecorderStatus(error.message || String(error));
      }
    });
    action("useCompiledRom").addEventListener("click", async () => {
      const compiledRom = getCompiledRom();
      if (!compiledRom) {
        setRecorderStatus("No compiled Amy ROM is available. Compile the project or open an external ROM.");
        return;
      }
      externalRom = null;
      externalRomName = "";
      symbols = parseAmySymbols(getCompiledSymbols());
      setRecorderStatus("Loading compiled Amy ROM...");
      try {
        await startCore(compiledRom);
        renderSymbolList();
        setRecorderStatus("Running compiled Amy ROM.");
      } catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    action("replay").addEventListener("click", () => { field("testFile").value = ""; field("testFile").click(); });
    field("testFile").addEventListener("change", async () => {
      const file = field("testFile").files?.[0];
      if (!file) return;
      playing = false;
      setRecorderStatus(`Replaying ${file.name}...`);
      try {
        const testCase = JSON.parse(await file.text());
        stopCore();
        const rom = externalRom || loadedRom || getCompiledRom();
        const bios = getEmulatorBios();
        core = await GearcolecoTestCore.create({ seed: testCase.environment?.seed >>> 0 });
        loadedRom = rom;
        core.loadBios(bios);
        const replayRegion = testCase.environment?.region === "pal" ? GEARCOLECO_TEST_REGION.PAL : GEARCOLECO_TEST_REGION.NTSC;
        field("region").value = String(replayRegion);
        core.loadRom(rom, { region: replayRegion });
        const result = await replayRomTestCase(core, testCase, { biosBytes: bios, romBytes: rom, symbolsText: getCompiledSymbols(), allowRebuiltRom: field("allowRebuilt").checked });
        recorder = new RomTestRecorder(core, { keyframeInterval: 12, maxKeyframes: 300 });
        recorder.start();
    if (!externalRom) installSourceBreakpoints();
        playing = false;
        startPlaybackTimer();
        render({ forceInspector: true });
        setRecorderStatus(result.rebuiltRom ? "PASS against rebuilt ROM. Timeline now starts at verified state." : "PASS. Timeline now starts at verified state.");
      } catch (error) { stopCore(); setRecorderStatus(`Replay failed: ${error.message || error}`); }
    });
    dialog.addEventListener("close", () => {
      playing = false;
      playbackAccumulator = 0;
      audioSink.flush();
      controllerMasks[0] = 0;
      controllerMasks[1] = 0;
      if (core) {
        core.setControllerMask(0, 0);
        core.setControllerMask(1, 0);
      }
      setMouseSpinnerEnabled(false);
    });
    window.addEventListener("blur", () => { pressedKeys.clear(); clearMouseFireButtons(); });
    dialog.addEventListener("keydown", (event) => {
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
      if (!controllerSetup.isKeyMapped(event.code)) return;
      event.preventDefault();
      pressedKeys.add(event.code);
    });
    dialog.addEventListener("keyup", (event) => {
      if (!controllerSetup.isKeyMapped(event.code)) return;
      event.preventDefault();
      pressedKeys.delete(event.code);
    });
  }

  async function open() {
    if (!dialog) {
      dialog = buildDialog();
      controllerSetup = createControllerSetupUi({
        inputBits: GEARCOLECO_TEST_INPUT,
        onClose: () => {
          mouseSpinnerAccum[0] = 0;
          mouseSpinnerAccum[1] = 0;
          mouseJoystickMask = 0;
          clearMouseFireButtons();
          field("controller").value = String(preferredControllerUiPort(controllerSetup?.getConfig(), field("controller").value));
          renderMouseSpinnerButton();
          dialog?.querySelector("canvas")?.focus();
        }
      });
      field("controller").value = String(preferredControllerUiPort(controllerSetup.getConfig(), field("controller").value));
      bindDialog();
    }
    symbols = externalRom ? [] : parseAmySymbols(getCompiledSymbols());
    if (loadedRom && loadedRom !== getCompiledRom()) profileStats.clear();
    const checkpoints = listAmyCheckpoints(getCompiledSymbols());
    const select = field("checkpoint");
    select.replaceChildren(new Option("Current frame", ""));
    for (const checkpoint of checkpoints) select.add(new Option(checkpoint, checkpoint));
    field("rawMap").textContent = getCompiledMemoryMap() || "No linker memory map was generated.";
    updateCheckpointAction();
    renderAudioButton();
    const profileTargets = field("profileTargets");
    profileTargets.replaceChildren();
    const routines = symbols.filter((symbol) => /^AMY_UPROC_/i.test(symbol.name));
    for (const routine of routines) profileTargets.append(new Option(routine.name.replace(/^AMY_UPROC_/i, ""), routine.name));
    renderMouseSpinnerButton();
    if (!field("profileTarget").value && routines.length) {
      field("profileTarget").value = routines[0].name.replace(/^AMY_UPROC_/i, "");
    }
    renderProfileResults();
    renderSymbolList();
    renderBreakpointList();
    applyScale();
    action("useCompiledRom").disabled = !getCompiledRom();
    dialog.showModal();
    field("biosMissing").hidden = Boolean(getEmulatorBios());
    if (!getEmulatorBios()) {
      playing = false;
      playbackAccumulator = 0;
      setRecorderStatus("ColecoVision BIOS missing. Add your own 8 KiB BIOS to start emulation.");
      action("loadBios").focus();
      return;
    }
    const canResume = Boolean(core && recorder && (loadedRom === getCompiledRom() || loadedRom === externalRom));
    if (canResume) {
      playing = false;
      playbackAccumulator = 0;
      audioSink.flush();
      render({ forceInspector: true });
      setRecorderStatus(`Session restored at ${formatHex(core.getPc())}. Continue, step, rewind, or inspect memory.`);
      dialog.querySelector("canvas").focus();
      return;
    }
    if (!getCompiledRom() && !externalRom) {
      playing = false;
      playbackAccumulator = 0;
      setRecorderStatus("Open a .rom, .col, or .bin with ⇧. No Amy compilation is required.");
      action("loadRom").focus();
      return;
    }
    setRecorderStatus("Loading deterministic GearColeco core...");
    try { await startCore(); setRecorderStatus("Running."); }
    catch (error) { stopCore(); setRecorderStatus(error.message || String(error)); }
  }

  function syncSourceBreakpoints() {
    if (!core) return;
    if (externalRom) {
      setRecorderStatus("Amy source breakpoints are unavailable for an external ROM without matching symbols.");
      return;
    }
    if (!externalRom) installSourceBreakpoints();
    renderBreakpointList();
    setRecorderStatus("Source breakpoints updated without recompiling the ROM.");
  }

  async function biosChanged() {
    if (!dialog || !dialog.open) return;
    field("biosMissing").hidden = Boolean(getEmulatorBios());
    if (!getEmulatorBios()) return;
    setRecorderStatus("Loading deterministic GearColeco core...");
    try { await startCore(); setRecorderStatus("Running."); }
    catch (error) { stopCore(); setRecorderStatus(error.message || String(error)); }
  }

  return { open, syncSourceBreakpoints, biosChanged };
}
