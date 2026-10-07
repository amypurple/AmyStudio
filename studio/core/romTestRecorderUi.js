import {
  GearcolecoTestCore,
  GEARCOLECO_ADAM_MEDIA,
  GEARCOLECO_ADAM_SLOT,
  GEARCOLECO_MACHINE,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "./gearcolecoTestCore.js?v=20261006-megacart-active-bank1";
import { clearAdamFirmwareFromBrowser, loadAdamFirmwareFromBrowser, loadLocalAdamFirmware, saveAdamFirmwareToBrowser } from "./adamFirmwareStorage.js?v=20260925-adam-local-firmware2";
import { RomTestRecorder } from "./romTestRecorder.js";
import { RomTestAudioSink } from "./romTestAudioSink.js?v=20260817-lazy-audio-copy";
import { GameplayRecordingSession } from "./gameplayRecordingSession.js?v=20260918-unbounded-input-log";
import { downloadGameplayVideo, exportGameplayGifSession, exportGameplaySession } from "./romGameplayVideoExport.js?v=20261007-animated-gif1";
import { createDevelopmentRouteStore, expandRouteInputs } from "./developmentCheckpointRoutes.js?v=20260919-route-replay";
import {
  createRomTestCase,
  listAmyCheckpoints,
  resolveAmyCheckpoint
} from "./romTestCase.js";
import { replayRomTestCase } from "./romTestCaseRunner.js";
import {
  annotateOverlaySymbols,
  breakpointMatchesBank,
  mergeBreakpointCandidates,
  chooseAmySourceMarker,
  classifyAddress,
  decodeVdpRegisters,
  filterSymbols,
  findNearestSymbol,
  listAmySourceMarkers,
  listAmyProcedureSourceMarkers,
  resolveAmySourceBreakpoints,
  formatBankAddress,
  formatHex,
  formatHexDump,
  inspectOverlaySymbolDebugState,
  listAmyDebugBreakpoints,
  parseAmySymbols,
  resolveSymbolOrAddress,
  resolveSymbolReference
} from "./romDebuggerModel.js?v=20261006-megacart-bank-debug1";
import { evaluateBreakpointCondition, parseBreakpointCondition } from "./breakpointConditions.js?v=20260803-asm-step-conditional-breakpoints";
import {
  appendRoutineProfileSample,
  createRoutineProfileSession,
  NTSC_CYCLES_PER_FRAME,
  resolveProfileTarget
} from "./routineCycleProfiler.js?v=20260801-profile-readable";
import { createControllerSetupUi } from "./controllerSetupUi.js?v=20261004-keyboard-port-routing1";
import { detectEmulatorMedia, EMULATOR_MEDIA_KIND, isKnownEmulatorMediaName } from "./emulatorMediaDetection.js?v=20261002-adam-media-autodetect1";

const SEED = 0x19770527;
const PLAYBACK_MAX_CATCHUP_FRAMES = 4;
const PLAYBACK_MAX_ELAPSED_MS = 100;
const INSPECTOR_REFRESH_MS = 250;
const framebufferRenderCache = new WeakMap();
const rgb5To8 = Uint8Array.from({ length: 32 }, (_, value) => value * 255 / 31);
const rgb6To8 = Uint8Array.from({ length: 64 }, (_, value) => value * 255 / 63);

const ADAM_KEY = Object.freeze({
  SPACE: 36, MINUS: 37, PLUS: 38, CARET: 39, SEMICOLON: 40, QUOTE: 41,
  OPEN_BRACKET: 42, CLOSE_BRACKET: 43, BACKSLASH: 44, COMMA: 45, PERIOD: 46, SLASH: 47,
  RETURN: 48, ESCAPE: 49, BACKSPACE: 50, TAB: 51, HOME: 52,
  SMART_1: 53, SMART_2: 54, SMART_3: 55, SMART_4: 56, SMART_5: 57, SMART_6: 58,
  WILD_CARD: 59, UNDO: 60, MOVE: 61, STORE: 62, INSERT: 63, PRINT: 64, CLEAR: 65,
  DELETE: 66, UP: 67, RIGHT: 68, DOWN: 69, LEFT: 70, SHIFT: 71, CONTROL: 72, LOCK: 73
});

const ADAM_KEY_BY_CODE = Object.freeze({
  Space: ADAM_KEY.SPACE, Minus: ADAM_KEY.MINUS, Equal: ADAM_KEY.PLUS, Backquote: ADAM_KEY.CARET,
  Semicolon: ADAM_KEY.SEMICOLON, Quote: ADAM_KEY.QUOTE, BracketLeft: ADAM_KEY.OPEN_BRACKET,
  BracketRight: ADAM_KEY.CLOSE_BRACKET, Backslash: ADAM_KEY.BACKSLASH, Comma: ADAM_KEY.COMMA,
  Period: ADAM_KEY.PERIOD, Slash: ADAM_KEY.SLASH, Enter: ADAM_KEY.RETURN,
  NumpadEnter: ADAM_KEY.RETURN, Escape: ADAM_KEY.ESCAPE, Backspace: ADAM_KEY.BACKSPACE,
  Tab: ADAM_KEY.TAB, Home: ADAM_KEY.HOME, F1: ADAM_KEY.SMART_1, F2: ADAM_KEY.SMART_2,
  F3: ADAM_KEY.SMART_3, F4: ADAM_KEY.SMART_4, F5: ADAM_KEY.SMART_5, F6: ADAM_KEY.SMART_6,
  F7: ADAM_KEY.UNDO, F8: ADAM_KEY.WILD_CARD, PageUp: ADAM_KEY.MOVE, PageDown: ADAM_KEY.STORE,
  Insert: ADAM_KEY.INSERT, PrintScreen: ADAM_KEY.PRINT, End: ADAM_KEY.CLEAR,
  Delete: ADAM_KEY.DELETE, ArrowUp: ADAM_KEY.UP, ArrowRight: ADAM_KEY.RIGHT,
  ArrowDown: ADAM_KEY.DOWN, ArrowLeft: ADAM_KEY.LEFT, ShiftLeft: ADAM_KEY.SHIFT,
  ShiftRight: ADAM_KEY.SHIFT, ControlLeft: ADAM_KEY.CONTROL, ControlRight: ADAM_KEY.CONTROL,
  CapsLock: ADAM_KEY.LOCK
});

export function adamKeyFromKeyboardCode(code) {
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3) - 65;
  if (/^Digit[0-9]$/.test(code)) return 26 + Number(code.slice(5));
  if (/^Numpad[0-9]$/.test(code)) return 26 + Number(code.slice(6));
  return ADAM_KEY_BY_CODE[code] ?? null;
}

export function formatAdamPrinterText(bytes) {
  let text = "";
  for (const value of bytes || []) {
    if (value === 0x0D) text += "\n";
    else if (value === 0x0A) {
      if (!text.endsWith("\n")) text += "\n";
    }
    else if (value === 0x09 || (value >= 0x20 && value <= 0x7E)) text += String.fromCharCode(value);
    else text += `\\x${value.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return text;
}

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

function downloadBytes(filename, bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
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
  let image = framebufferRenderCache.get(canvas);
  if (!image || image.width !== framebuffer.width || image.height !== framebuffer.height) {
    image = context.createImageData(framebuffer.width, framebuffer.height);
    framebufferRenderCache.set(canvas, image);
  }
  for (let index = 0; index < framebuffer.pixels.length; ++index) {
    const pixel = framebuffer.pixels[index];
    const offset = index * 4;
    image.data[offset] = rgb5To8[(pixel >>> 11) & 0x1F];
    image.data[offset + 1] = rgb6To8[(pixel >>> 5) & 0x3F];
    image.data[offset + 2] = rgb5To8[pixel & 0x1F];
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
    .rom-recorder__body { display:grid; grid-template-columns:minmax(530px,2fr) minmax(510px,1fr); grid-template-rows:auto minmax(0,1fr); gap:8px 10px; padding:4px; height:calc(95vh - 44px); overflow:hidden; box-sizing:border-box; }
    .rom-recorder__stage { grid-row:1 / span 2; display:grid; align-content:start; justify-items:center; gap:6px; min-width:0; min-height:0; }
    .rom-recorder__screen-wrap { position:relative; width:auto; max-width:100%; aspect-ratio:4 / 3; display:grid; place-items:center; background:#050607; border:1px solid #31424c; overflow:hidden; }
    .rom-recorder__screen { max-width:100%; image-rendering:pixelated; background:#000; border:1px solid #31424c; outline:none; }
    .rom-recorder__screen-wrap .rom-recorder__screen { border:0; }
    .rom-recorder__screen-wrap:fullscreen { width:100vw !important; height:100vh; max-width:none; aspect-ratio:auto; border:0; background:#000; cursor:none; }
    .rom-recorder__screen-wrap:fullscreen .rom-recorder__screen { width:min(100vw,133.333vh) !important; height:min(100vh,75vw) !important; max-width:none; }
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
    .rom-recorder__settings { display:grid; grid-template-columns:minmax(126px,1.1fr) minmax(70px,.65fr) minmax(58px,.6fr) minmax(70px,.75fr) minmax(116px,1fr); gap:6px; align-items:end; }
    .rom-recorder__settings-actions { grid-column:1 / -1; display:flex; justify-content:flex-end; gap:6px; }
    .rom-recorder__region-toggle { min-height:32px; color:#65dbef; font-weight:700; letter-spacing:.06em; }
    .rom-recorder__compact-action[aria-pressed="true"] { color:#081014; background:#65dbef; }
    .rom-recorder__record-action { color:#fff; background:#7c1720; border-color:#db4452; font-weight:700; }
    .rom-recorder__record-action.is-recording { background:#d51f2f; box-shadow:0 0 0 2px rgba(213,31,47,.25),0 0 14px rgba(213,31,47,.65); }
    .rom-recorder__settings .rom-recorder__compact-action { align-self:end; }
    .rom-recorder__controller { display:flex; justify-content:center; width:100%; padding:3px 0; }
    .rom-recorder__controller-display { display:grid; justify-items:center; gap:5px; }
    .rom-recorder__controller-shell { position:relative; display:grid; grid-template-rows:74px auto; gap:5px; width:116px; padding:7px 11px 10px; border:1px solid #52616b; border-radius:8px 8px 14px 14px; background:linear-gradient(145deg,#69747a 0%,#343d43 48%,#20282d 100%); box-shadow:inset 1px 1px 0 #8f9ba0,inset -2px -2px 3px #11171a,0 5px 10px #0008; }
    .rom-recorder__controller-stick { position:relative; width:66px; height:66px; margin:0 auto; border:3px solid #929da2; border-radius:50%; background:radial-gradient(circle at 38% 32%,#eef1f1 0 8%,#aab1b3 10% 28%,#515b60 31% 47%,#1b2226 50% 100%); box-shadow:inset 0 0 0 2px #151b1e,0 2px 4px #000a; }
    .rom-recorder__controller-stick button { position:absolute; display:grid; place-items:center; width:22px; min-width:22px; height:20px; min-height:20px; padding:0; border-color:#6f7d84; background:#151d22d9; font-size:11px; line-height:1; }
    .rom-recorder__controller-stick [data-input="UP"] { top:-5px; left:22px; }
    .rom-recorder__controller-stick [data-input="DOWN"] { bottom:-5px; left:22px; }
    .rom-recorder__controller-stick [data-input="LEFT"] { top:23px; left:-7px; }
    .rom-recorder__controller-stick [data-input="RIGHT"] { top:23px; right:-7px; }
    .rom-recorder__controller-stick [data-input-combo="UP LEFT"] { top:2px; left:1px; }
    .rom-recorder__controller-stick [data-input-combo="UP RIGHT"] { top:2px; right:1px; }
    .rom-recorder__controller-stick [data-input-combo="DOWN LEFT"] { bottom:2px; left:1px; }
    .rom-recorder__controller-stick [data-input-combo="DOWN RIGHT"] { right:1px; bottom:2px; }
    .rom-recorder__controller-stick [data-input-combo] { width:18px; min-width:18px; height:17px; min-height:17px; font-size:9px; }
    .rom-recorder__fire { position:absolute; top:52px; width:18px; min-width:18px; height:27px; min-height:27px; padding:0; border-color:#9b9b8a; border-radius:3px; background:linear-gradient(#e6e2c8,#8d8c7e); color:#111; font-size:9px; font-weight:900; box-shadow:inset 1px 1px 0 #fff8,0 1px 2px #000b; }
    .rom-recorder__fire--left { left:-7px; }
    .rom-recorder__fire--right { right:-7px; }
    .rom-recorder__keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; padding:5px; border:1px solid #151b1e; border-radius:3px; background:#242d32; box-shadow:inset 0 2px 5px #000a; }
    .rom-recorder__keypad button { min-width:0; min-height:18px; padding:0; border:1px solid #8c969a; border-radius:2px; background:linear-gradient(#f0f1ee,#aeb4b4); color:#15191b; font:700 9px/1 monospace; box-shadow:inset 1px 1px 0 #fff,0 1px 1px #000a; touch-action:none; }
    .rom-recorder__controller-profile { position:absolute; top:5px; left:25px; right:25px; z-index:2; color:#d7e1e4; font:700 8px/1 ui-monospace,Consolas,monospace; text-align:center; letter-spacing:.08em; text-transform:uppercase; text-shadow:0 1px #000; pointer-events:none; }
    .rom-recorder__super-buttons { display:grid; grid-template-columns:repeat(4,1fr); gap:3px; margin-top:5px; }
    .rom-recorder__super-buttons button { min-width:0; min-height:19px; padding:0; border-radius:50%; color:transparent; }
    .rom-recorder__super-buttons [data-input="FIRE_LEFT"] { background:#e2ca2f; }
    .rom-recorder__super-buttons [data-input="FIRE_RIGHT"] { background:#c84242; }
    .rom-recorder__super-buttons [data-input="PURPLE"] { background:#9255b7; }
    .rom-recorder__super-buttons [data-input="BLUE"] { background:#4a9deb; }
    .rom-recorder__super-spinner { display:grid; grid-template-columns:24px 1fr 24px; align-items:center; gap:4px; margin-top:4px; }
    .rom-recorder__super-spinner button { min-width:24px; min-height:20px; padding:0; font-size:11px; }
    .rom-recorder__super-spinner span { height:22px; border:3px solid #8e999d; border-radius:50%; background:radial-gradient(circle at 38% 32%,#e9ece8,#737d81 54%,#171d20 58%); box-shadow:0 1px 2px #000; }
    .rom-recorder__controller-shell[data-profile="super-action"] { width:122px; grid-template-rows:74px auto auto; }
    .rom-recorder__controller-shell[data-profile="super-action"] > .rom-recorder__fire { display:none; }
    .rom-recorder__controller-shell[data-profile="wheel"] .rom-recorder__controller-stick { border-radius:44% 44% 50% 50%; background:radial-gradient(circle,#111 0 28%,#9da7aa 30% 38%,#161d21 40% 68%,#879297 70% 76%,#111 78%); }
    .rom-recorder__controller-shell[data-profile="wheel"] { width:178px; border-radius:16px 16px 8px 8px; }
    .rom-recorder__controller-shell[data-profile="roller"] { width:210px; border-radius:13px; background:linear-gradient(#343d42,#161d21); }
    .rom-recorder__controller-shell[data-profile="roller"] .rom-recorder__controller-stick { background:radial-gradient(circle at 38% 32%,#f0ead4 0 15%,#aaa48e 30%,#55584f 49%,#151b1f 52%); }
    .rom-recorder__controller-shell[data-profile="roller"] > .rom-recorder__fire { border-color:#7f2727; background:linear-gradient(#e34b43,#8c211f); color:#fff; }
    .rom-recorder__controller-shell:not([data-profile="super-action"]) .rom-recorder__super-buttons { display:none; }
    .rom-recorder__controller-ports { display:grid; grid-template-columns:1fr 1fr; gap:4px; width:100%; }
    .rom-recorder__controller-ports button { min-width:0; padding:4px 7px; border-color:#43545e; color:#8fa2ac; background:#11191e; font:700 9px/1.2 ui-monospace,Consolas,monospace; text-transform:uppercase; }
    .rom-recorder__controller-ports button[aria-selected="true"] { border-color:#65dbef; color:#071014; background:#65dbef; }
    .rom-recorder__controller-display { display:flex; align-items:flex-start; justify-content:center; gap:22px; width:100%; }
    .rom-recorder__controller-unit { display:grid; justify-items:center; gap:3px; }
    .rom-recorder__controller-unit > strong { color:#9fb0b8; font:700 9px/1.2 ui-monospace,Consolas,monospace; letter-spacing:.06em; text-transform:uppercase; }
    .rom-recorder__controller-unit[aria-selected="true"] > strong { color:#65dbef; }
    .rom-recorder__controller-unit .rom-recorder__controller-shell { width:116px; padding-inline:11px; cursor:pointer; }
    .rom-recorder__controller-unit[aria-selected="true"] .rom-recorder__controller-shell { outline:2px solid #65dbef; outline-offset:1px; }
    .rom-recorder__wheel-set { display:grid; grid-template-columns:280px 88px; align-items:end; gap:8px; }
    .rom-recorder__wheel-console { position:relative; width:280px; height:190px; box-sizing:border-box; padding:8px; border:2px solid #606b70; border-radius:8px; background:linear-gradient(145deg,#465158,#151b1f 72%); box-shadow:inset 2px 2px #879196,0 5px 9px #0009; }
    .rom-recorder__wheel-console > strong,.rom-recorder__roller-panel > strong { display:block; color:#d3dcdf; font:700 9px/1.2 ui-monospace,Consolas,monospace; text-align:center; text-transform:uppercase; }
    .rom-recorder__wheel-console > .rom-recorder__controller-unit { position:absolute; top:19px; right:16px; transform:scale(.72); transform-origin:top right; }
    .rom-recorder__wheel-rim { position:absolute; top:28px; left:31px; width:118px; height:118px; border:12px solid #111719; border-radius:50%; background:radial-gradient(circle,#69757a 0 13%,#171d20 15% 22%,transparent 24%),conic-gradient(transparent 0 13%,#8e9698 14% 18%,transparent 19% 47%,#8e9698 48% 52%,transparent 53% 80%,#8e9698 81% 85%,transparent 86%); box-shadow:0 2px 5px #000,inset 0 0 0 2px #657176; }
    .rom-recorder__wheel-rim button { position:absolute; min-width:23px; width:23px; min-height:20px; height:20px; padding:0; font-size:10px; }
    .rom-recorder__wheel-rim [data-input="UP"] { top:-5px; left:47px; }.rom-recorder__wheel-rim [data-input="DOWN"] { bottom:-5px; left:47px; }.rom-recorder__wheel-rim [data-input="LEFT"] { top:46px; left:-5px; }.rom-recorder__wheel-rim [data-input="RIGHT"] { top:46px; right:-5px; }
    .rom-recorder__pedal { display:grid; align-content:end; height:128px; padding:8px; border:2px solid #59656a; border-radius:5px; background:repeating-linear-gradient(0deg,#21292d 0 10px,#4b565b 11px 14px); box-shadow:0 5px 8px #0009; }
    .rom-recorder__pedal button { min-width:0; padding:6px 2px; font-size:9px; }
    .rom-recorder__roller-panel { position:relative; display:grid; grid-template-columns:116px 116px; justify-content:space-between; gap:96px; width:348px; padding:9px; border:2px solid #5f6b70; border-radius:8px; background:linear-gradient(#3c464b,#151b1e); box-shadow:inset 2px 2px #879196,0 5px 9px #0009; }
    .rom-recorder__roller-panel > strong { position:absolute; top:8px; left:122px; width:124px; }
    .rom-recorder__roller-trackball { position:absolute; top:31px; left:141px; width:66px; height:66px; border:7px solid #11181c; border-radius:50%; background:radial-gradient(circle at 38% 32%,#f4efd8,#b5af95 48%,#6e6b5d 70%); box-shadow:0 2px 5px #000; }
    .rom-recorder__roller-actions { position:absolute; top:112px; left:123px; display:grid; grid-template-columns:repeat(2,43px); gap:7px 16px; }
    .rom-recorder__roller-actions button { min-width:43px; min-height:24px; padding:0; border-color:#8e2b27; background:#d6463e; color:#fff; font-size:9px; }
    @media(max-width:760px) { .rom-recorder__wheel-set { grid-template-columns:280px 68px; }.rom-recorder__wheel-rim { left:24px; }.rom-recorder__wheel-console > .rom-recorder__controller-unit { right:12px; transform:scale(.68); }.rom-recorder__roller-panel { transform:scale(.9); transform-origin:top center; margin-bottom:-22px; } }
    .rom-recorder__controller button:active,.rom-recorder__controller button.is-active { transform:translateY(1px); filter:brightness(.75); }
    .rom-recorder__capture { width:100%; }
    .rom-recorder__development { display:grid; grid-template-columns:minmax(220px,.9fr) minmax(160px,1.1fr); gap:6px; padding:7px; border:1px solid #26343c; background:#091015; }
    .rom-recorder__development-actions { grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:6px; }
    .rom-recorder__development-actions button { flex:1 1 auto; }
    .rom-recorder__auto-route[aria-pressed="true"] { color:#081014; background:#65dbef; }
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
    .rom-recorder__dump,.rom-recorder__raw-map { overflow:auto; margin:0; padding:0; color:#d5e2e7; background:#070b0e; border:1px solid #26343c; font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace; white-space:pre; }
    .rom-recorder__dump { flex:1 1 auto; min-height:0; max-height:none; }
    .rom-recorder__symbol-list { flex:1 1 auto; min-height:0; max-height:none; overflow-y:auto; overflow-x:hidden; border:1px solid #26343c; }
    .rom-recorder__symbol-row { display:grid; grid-template-columns:minmax(0,1fr) 36px; min-width:0; border-bottom:1px solid #172229; }
    .rom-recorder__symbol { display:grid; grid-template-columns:66px 68px minmax(0,1fr); min-width:0; width:100%; padding:5px 7px; border:0; text-align:left; background:transparent; color:#d5e2e7; overflow:hidden; }
    .rom-recorder__symbol > * { min-width:0; }
    .rom-recorder__symbol-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rom-recorder__symbol-row--poison .rom-recorder__symbol { background:rgba(255,202,76,.09); }
    .rom-recorder__symbol-row--poison .rom-recorder__symbol > span:nth-child(2) { color:#ffca4c; }
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
    .rom-recorder.is-rom-dragover { outline:3px solid #65dbef; outline-offset:-5px; }
    @media(max-width:1080px) { .rom-recorder__body { display:block; height:auto; max-height:calc(96vh - 52px); overflow:auto; } .rom-recorder__stage,.rom-recorder__side,.rom-recorder__debug { margin-bottom:10px; } .rom-recorder__transport { grid-template-columns:repeat(6,auto); } .rom-recorder__transport input[type=range] { grid-column:1 / -1; } }
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
      <div class="rom-recorder__head-actions"><button class="rom-recorder__icon-button" type="button" data-action="fullscreen" title="Play fullscreen (Alt+Enter)" aria-label="Play emulator fullscreen">&#x26F6;</button><button class="rom-recorder__icon-button" type="button" data-action="close" title="Close emulator" aria-label="Close emulator">&#x2715;</button></div>
    </div>
    <div class="rom-recorder__body">
      <div class="rom-recorder__stage">
        <div class="rom-recorder__screen-wrap">
          <canvas class="rom-recorder__screen" width="256" height="192" tabindex="0" aria-label="Emulator display; click to capture controller or ADAM keyboard input" title="Click here to use the controller or ADAM keyboard. F1-F6: SmartKeys; F7: Undo; F8: Wild Card."></canvas>
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
          <div class="rom-recorder__controller-display" data-field="controllerDisplay"></div>
        </div>
        <div class="rom-recorder__tools rom-recorder__capture" aria-label="Deterministic video recording"><button class="rom-recorder__record-action" type="button" data-action="recordBoot" title="Reset and record from the first boot frame">&#x25CF; RECORD BOOT</button><button class="rom-recorder__record-action" type="button" data-action="recordVideo" title="Start recording from the current frame">&#x25CF; RECORD NOW</button><button type="button" data-action="stopVideo" title="Stop gameplay recording" disabled>&#x25A0; STOP</button><button class="button--primary" type="button" data-action="exportVideo" title="Replay all frames and export Motion-JPEG video with PCM audio" disabled>Export AVI</button><button type="button" data-action="exportGif" title="Replay the recording and export a silent animated GIF at about 15 frames per second" disabled>Export GIF</button></div>
      </div>
      <div class="rom-recorder__side">
        <div class="rom-recorder__settings">
          <label>Machine<select data-field="machine"><option value="colecovision" selected>ColecoVision</option><option value="adam-computer">ADAM disk/data pack</option></select></label>
          <label>Zoom<select data-field="scale"><option value="fit">Fit</option><option value="1">1x</option><option value="2" selected>2x</option><option value="3">3x</option><option value="4">4x</option></select></label>
          <label>Region<button class="rom-recorder__region-toggle" type="button" data-field="region" value="-1" title="Cycle video region">AUTO</button></label>
          <label>Pad<select data-field="controller"><option value="0" selected>P1</option><option value="1">P2</option></select></label>
          <label>Keys<select data-field="keyboardTarget" title="Route the computer keyboard to the ADAM keyboard or a joystick port"><option value="adam" selected>ADAM</option><option value="joy1">JOY P1</option><option value="joy2">JOY P2</option></select></label>
          <label>Video chip<select data-field="videoChip"><option value="auto" selected>Auto</option><option value="tms9918a">TMS9918A</option><option value="f18a">F18A v1.9</option></select></label>
          <label>Voice module<select data-field="voiceModule"><option value="lundy" selected>Lundy</option><option value="eve">EVE SS-CC</option><option value="absent">Absent</option></select></label>
          <label>ADAM sound<select data-field="adamSound"><option value="none" selected>None</option><option value="enhancer">Sound Enhancer</option><option value="sgm">Opcode SGM</option></select></label>
          <label>ADAM serial<select data-field="adamSerial"><option value="none" selected>None</option><option value="adamlink-offline">AdamLink offline</option><option value="adamlink-loopback">AdamLink loopback</option><option value="adamlink-hayes">AdamLink Hayes modem</option><option value="eve-offline">Eve/Orphanware offline</option><option value="eve-loopback">Eve/Orphanware loopback</option><option value="eve-hayes">Eve Hayes modem</option><option value="micro-offline">MicroInnovations offline</option><option value="micro-loopback">MicroInnovations loopback</option><option value="micro-hayes">MicroInnovations Hayes modem</option></select></label>
          <label>Serial line<select data-field="adamSerialBaud"><option value="0">Instant test bridge</option><option value="300">300 baud 8N1</option><option value="1200">1200 baud 8N1</option><option value="2400">2400 baud 8N1</option><option value="9600">9600 baud 8N1</option><option value="19200">19200 baud 8N1</option></select></label>
          <div class="rom-recorder__settings-actions"><button class="rom-recorder__compact-action" type="button" data-action="controllerSetup" title="Controller setup" aria-label="Controller setup">&#x2699;</button><button class="rom-recorder__compact-action" type="button" data-action="muteAudio" title="Mute audio" aria-label="Mute audio" aria-pressed="false">&#x1F50A;</button><button class="rom-recorder__compact-action" type="button" data-action="mouseSpinner" title="Enable mouse spinner" aria-label="Enable mouse spinner" aria-pressed="false">&#x1F5B1;</button></div>
        </div>
        <div class="rom-recorder__development" aria-label="Development checkpoints">
          <label>Checkpoint<select data-field="checkpoint"><option value="">No checkpoints</option></select></label>
          <label>Recorded route<select data-field="developmentRoute"><option value="">No recorded routes</option></select></label>
          <div class="rom-recorder__development-actions"><button type="button" data-action="arm" title="Arm checkpoint and continue playing">Arm</button><button type="button" data-action="recordRoute" title="Reset and record how you play to this checkpoint">Record route</button><button type="button" data-action="replayRoute" title="Fast replay the selected route">Fast replay</button><button class="rom-recorder__auto-route" type="button" data-action="autoRoute" title="Return here automatically after recompiling" aria-pressed="false">After compile</button><button type="button" data-action="deleteRoute" title="Delete selected route">Delete</button></div>
        </div>
        <div class="rom-recorder__tools"><button type="button" data-action="loadAdamFirmware">Configure ADAM firmware...</button><button type="button" data-action="clearAdamFirmware">Forget ADAM firmware</button></div>
        <input data-field="adamFirmwareFiles" type="file" accept=".rom,application/octet-stream" multiple hidden>
        <div class="rom-recorder__tools"><button class="rom-recorder__compact-action" type="button" data-action="loadRom" title="Open external ROM or ADAM media" aria-label="Open external ROM or ADAM media">&#x21E7;</button><button class="rom-recorder__compact-action" type="button" data-action="useCompiledRom" title="Return to compiled Amy output" aria-label="Return to compiled Amy output">&#x21A9;</button><button class="rom-recorder__compact-action" type="button" data-action="create" title="Save test JSON at the current frame" aria-label="Save test JSON at current frame">&#x21E9;</button><button class="rom-recorder__compact-action" type="button" data-action="replay" title="Open and replay test" aria-label="Open and replay test">&#x21BB;</button></div>
        <label title="Allow a recompiled ROM with a different hash"><span>ROM &#x0394;</span><input data-field="allowRebuilt" type="checkbox" aria-label="Allow ROM hash change"></label>
        <input data-field="romFile" type="file" accept=".rom,.col,.dsk,.ddp" hidden>
        <input data-field="testFile" type="file" accept=".amy-rom-test.json,application/json" hidden>
        <div class="rom-recorder__status" data-field="status">Ready.</div>
      </div>
      <section class="rom-recorder__debug">
        <div class="rom-recorder__tabs" role="tablist">
          <button data-tab="state" aria-selected="true">CPU / VDP</button><button data-tab="asm" aria-selected="false" title="Z80 execution and stack">ASM</button><button data-tab="ram" aria-selected="false" title="CPU memory">RAM</button><button data-tab="vram" aria-selected="false">VRAM</button><button data-tab="map" aria-selected="false" title="Memory map">MAP</button><button data-tab="adam" aria-selected="false" title="ADAMnet devices and printer output">ADAM</button><button data-tab="breakpoints" aria-selected="false" title="Breakpoints">BP</button><button data-tab="profiler" aria-selected="false">Cycles</button>
        </div>
        <div class="rom-recorder__pane is-active" data-pane="state"><div data-field="machineState"></div></div>
        <div class="rom-recorder__pane" data-pane="asm"><div class="rom-recorder__memory-controls rom-recorder__memory-controls--asm"><button class="rom-recorder__compact-action" data-action="stepInto" title="Step into: execute one Z80 instruction" aria-label="Step into one Z80 instruction">&#x2193;</button><button class="rom-recorder__compact-action" data-action="stepOver" title="Step over CALL or RST" aria-label="Step over Z80 call">&#x21B7;</button><span title="Instruction stepping does not modify the ROM">Z80 instruction</span></div><pre class="rom-recorder__dump" data-field="asmDump"></pre></div>
        <div class="rom-recorder__pane" data-pane="ram"><div class="rom-recorder__memory-controls"><input data-field="ramAddress" value="$7000" aria-label="CPU memory address"><select data-field="ramLength"><option>64</option><option>128</option><option>256</option><option selected>384</option><option>512</option></select><button class="rom-recorder__compact-action" data-action="refreshRam" title="Refresh CPU memory" aria-label="Refresh CPU memory">&#x21BB;</button></div><pre class="rom-recorder__dump" data-field="ramDump"></pre></div>
        <div class="rom-recorder__pane" data-pane="vram"><div class="rom-recorder__memory-controls"><input data-field="vramAddress" value="$0000" aria-label="VRAM address"><select data-field="vramLength"><option>64</option><option>128</option><option>256</option><option selected>384</option><option>512</option></select><button class="rom-recorder__compact-action" data-action="refreshVram" title="Refresh VRAM" aria-label="Refresh VRAM">&#x21BB;</button></div><pre class="rom-recorder__dump" data-field="vramDump"></pre></div>
        <div class="rom-recorder__pane" data-pane="map"><input data-field="symbolFilter" placeholder="Filter symbols or address, e.g. Player or $70" aria-label="Filter symbols"><div class="rom-recorder__symbol-list" data-field="symbolList"></div><details><summary>Raw linker memory map</summary><pre class="rom-recorder__raw-map" data-field="rawMap"></pre></details></div>
        <div class="rom-recorder__pane" data-pane="adam"><div class="rom-recorder__memory-controls"><button class="rom-recorder__compact-action" data-action="refreshAdam" title="Refresh ADAMnet state" aria-label="Refresh ADAMnet state">&#x21BB;</button><button class="rom-recorder__compact-action" data-action="clearAdamPrinter" title="Clear captured printer output" aria-label="Clear captured printer output">Clear printer</button><button class="rom-recorder__compact-action" data-action="saveAdamMedia" title="Download the current writable DSK or DDP image" aria-label="Save modified ADAM media">Save media</button></div><div data-field="adamState"></div><pre class="rom-recorder__dump" data-field="adamPrinterOutput">ADAM machine not running.</pre></div>
        <div class="rom-recorder__pane" data-pane="breakpoints"><div class="rom-recorder__memory-controls rom-recorder__memory-controls--breakpoint"><input data-field="breakpointAddress" placeholder="Code symbol or $8000" aria-label="Breakpoint code address"><input data-field="breakpointCondition" placeholder="Optional: Score >= 5" aria-label="Optional RAM breakpoint condition"><select data-field="breakpointValueType" aria-label="Condition value type"><option value="auto">auto</option><option value="u8">u8</option><option value="i8">i8</option><option value="u16">u16</option><option value="i16">i16</option></select><button class="rom-recorder__compact-action" data-action="addBreakpoint" title="Add execute breakpoint, optionally conditional" aria-label="Add execute breakpoint">+</button></div><div class="rom-recorder__memory-controls rom-recorder__memory-controls--watch"><input data-field="watchCondition" placeholder="RAM watch: Lives = 0" aria-label="RAM watch condition"><select data-field="watchValueType" aria-label="RAM watch value type"><option value="auto">auto</option><option value="u8">u8</option><option value="i8">i8</option><option value="u16">u16</option><option value="i16">i16</option></select><button class="rom-recorder__compact-action" data-action="addWatch" title="Add RAM watch" aria-label="Add RAM watch">+</button></div><div class="rom-recorder__breakpoints" data-field="breakpointList"></div><button class="rom-recorder__compact-action" data-action="clearBreakpoints" title="Clear all breakpoints and RAM watches" aria-label="Clear all breakpoints and RAM watches">&#x00D7;</button></div>
        <div class="rom-recorder__pane" data-pane="profiler"><div class="rom-recorder__profiler-controls"><input data-field="profileTarget" list="rom-recorder-profile-targets" placeholder="Amy sub, symbol, or $8000" aria-label="Routine to profile"><datalist id="rom-recorder-profile-targets" data-field="profileTargets"></datalist><button class="rom-recorder__compact-action" data-action="profileRoutine" title="Profile next routine entry" aria-label="Profile next routine entry">&#x25B6;</button><button class="rom-recorder__compact-action" data-action="clearProfiles" title="Clear profiles" aria-label="Clear profiles">&#x00D7;</button></div><div class="rom-recorder__profiler-results" data-field="profileResults"></div><p class="rom-recorder__profiler-note" title="Runs include nested calls and recursion. Main execution excludes NMI and IRQ cycles. Own range is diagnostic, not exclusive self-time. Profiling does not modify the ROM.">Inclusive · main excludes NMI/IRQ · ROM unchanged</p></div>
      </section>
    </div>`;
  document.body.append(dialog);
  return dialog;
}

export function createRomTestRecorderUi({
  getCompiledRom,
  getCompiledAdamDisk = () => null,
  getCompiledMemoryMap = () => "",
  getCompiledSymbols,
  getCompiledMetadata = () => ({}),
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
  let playbackTimestamp = 0;
  let playing = true;
  const controllerMasks = [0, 0];
  const pressedKeys = new Set();
  const pressedAdamCodes = new Map();
  let controllerSetup = null;
  let stoppedCheckpoint = null;
  let stoppedCheckpointBank = null;
  let playbackRate = 1;
  let playbackAccumulator = 0;
  let loadedRom = null;
  let loadedAdamMedia = null;
  let externalRom = null;
  let externalRomName = "";
  let externalAdamMedia = null;
  let externalAdamMediaType = null;
  let adamFirmware = loadAdamFirmwareFromBrowser();
  let lastInspectorRefresh = 0;
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
  const gameplayRecording = new GameplayRecordingSession();
  let videoExporting = false;
  const developmentRoutes = createDevelopmentRouteStore(window.localStorage);
  let routeRecording = null;

  function releaseAdamKeyboard() {
    if (core) {
      for (const key of new Set(pressedAdamCodes.values())) core.setAdamKey(key, false);
    }
    pressedAdamCodes.clear();
  }

  function keyboardJoystickPort() {
    const target = field("keyboardTarget")?.value;
    if (target === "joy1") return 0;
    if (target === "joy2") return 1;
    return field("machine")?.value === "adam-computer" ? -1 : null;
  }

  function releaseComputerKeyboard() {
    pressedKeys.clear();
    releaseAdamKeyboard();
  }
  let routeReplayActive = false;

  const field = (name) => dialog.querySelector(`[data-field="${name}"]`);
  const action = (name) => dialog.querySelector(`[data-action="${name}"]`);

  function setRecorderStatus(message) {
    field("status").textContent = message;
  }

  function developmentProjectId() {
    const project = getProject() || {};
    return project.projectName || project.name || "untitled-project";
  }

  function parseAddressField(name, max = 0xFFFF) {
    const value = resolveSymbolOrAddress(field(name).value, symbols);
    return value & max;
  }

  function currentLogicalBank(address = core?.getPc()) {
    if (!core || !Number.isInteger(address)) return null;
    if (!core.isMegaCart()) return null;
    if ((address & 0xFFFF) < 0xC000) return 0;
    const physicalBank = core.getRomBank();
    return physicalBank == null ? null : physicalBank + 1;
  }

  function refreshMachineState() {
    if (!core) return;
    const pc = core.getPc();
    const vdp = decodeVdpRegisters(core.getVdpRegisters());
    field("machineState").innerHTML = `
      <div class="rom-recorder__summary">
        <div class="rom-recorder__card"><strong>Program counter</strong>${formatBankAddress(pc, currentLogicalBank(pc))} · ${findNearestSymbol(pc, symbols, currentLogicalBank(pc)) || "no symbol"}</div>
        <div class="rom-recorder__card"><strong>VDP mode</strong>${vdp.mode} · screen ${vdp.displayEnabled ? "on" : "off"} · NMI ${vdp.nmiEnabled ? "on" : "off"}</div>
        <div class="rom-recorder__card"><strong>Sprites</strong>${vdp.sprites16 ? "16×16" : "8×8"}${vdp.spritesMagnified ? " magnified" : ""} · backdrop ${vdp.backdrop}</div>
        <div class="rom-recorder__card"><strong>External hardware</strong>SP0256 ${field("voiceModule").value} · ADAM sound ${field("adamSound").value} · serial ${field("adamSerial").value}</div>
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
        const instructionBank = currentLogicalBank(instruction.address);
        const symbol = symbols.find((entry) => entry.address === instruction.address
          && (entry.bank == null || entry.bank === instructionBank))?.name;
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
        : symbol.overlay?.qualifiedName || symbol.name;
      const activeWhen = symbol.overlay?.activeWhen;
      const activeSymbol = activeWhen && symbols.find((entry) => entry.name.toLowerCase() === activeWhen.symbol.toLowerCase());
      const activeValue = activeSymbol && core ? core.readRam(activeSymbol.address, 1)[0] : null;
      const debugState = inspectOverlaySymbolDebugState(symbol, symbols, (address, length) => core?.readRam(address, length));
      const overlayState = !symbol.overlay
        ? ""
        : !activeWhen
          ? "active part unknown"
          : debugState.active
            ? "active part"
            : `inactive part (selector ${activeValue ?? "?"}, requires ${activeWhen.equals})`;
      if (debugState.poisoned) row.classList.add("rom-recorder__symbol-row--poison");
      const navigate = document.createElement("button");
      navigate.type = "button";
      navigate.className = "rom-recorder__symbol";
      const addressClass = debugState.poisoned ? "POISON" : symbol.overlay ? "OVERLAY" : sourceMarker ? "SOURCE" : classifyAddress(symbol.address);
      navigate.innerHTML = `<code>${formatHex(symbol.address)}</code><span>${addressClass}</span><span class="rom-recorder__symbol-name"></span>`;
      navigate.lastElementChild.textContent = displayName;
      navigate.title = sourceMarker
        ? `${displayName} at ${formatHex(symbol.address)}. Reveal Amy source.`
        : symbol.overlay
          ? `${displayName} (${symbol.overlay.type}, ${symbol.overlay.width} byte${symbol.overlay.width === 1 ? "" : "s"}) at ${formatHex(symbol.address)}. RAM is shared by overlay ${symbol.overlay.overlayName}; ${overlayState}.${debugState.poisoned ? " Value still matches debug poison $CD; initialization may be missing." : ""}`
          : `${symbol.name} at ${formatHex(symbol.address)}. Open CPU memory.`;
      navigate.addEventListener("click", () => {
        if (sourceMarker) {
          onSourceBreakpointHit(Number(sourceMarker[1]));
          setRecorderStatus(`${displayName} begins at ${formatHex(symbol.address)}.`);
          return;
        }
        field("ramAddress").value = formatHex(symbol.address);
        selectTab("ram");
        setRecorderStatus(symbol.overlay
          ? `Memory at ${displayName} (${formatHex(symbol.address)}). Shared overlay address; ${overlayState}.${debugState.poisoned ? " WARNING: value still matches debug poison $CD." : ""}`
          : `Memory at ${symbol.name} (${formatHex(symbol.address)}).`);
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
        activeBreakpoints.set(symbol.address, mergeBreakpointCandidates(
          activeBreakpoints.get(symbol.address),
          { label: symbol.name, bank: symbol.bank ?? null }
        ));
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
      text.textContent = `${formatBankAddress(address, info.bank)}  ${sourceLabel}`;
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
      heading.textContent = (stats.targetName || name).replace(/^AMY_UPROC_/i, "");
      heading.title = `${formatBankAddress(stats.targetStart, stats.targetBank)} ${stats.targetName || name}`;
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

  function refreshAdamState() {
    const state = field("adamState");
    const output = field("adamPrinterOutput");
    if (!core || core.getMachine() !== GEARCOLECO_MACHINE.ADAM) {
      state.innerHTML = '<div class="rom-recorder__card"><strong>ADAM hardware</strong>Select ADAM disk/data pack and boot ADAM media to inspect AdamNet.</div>';
      output.textContent = "No ADAM printer output.";
      return;
    }
    try {
      const mioc = core.getAdamMioc();
      const summary = core.getAdamNetSummary();
      const transfer = summary.transfer;
      const serial = summary.serial;
      const activeDcbs = summary.dcbs.filter((dcb) => dcb.status || dcb.device || dcb.length);
      const printer = core.getAdamPrinterData();
      state.innerHTML = `<div class="rom-recorder__summary">
        <div class="rom-recorder__card"><strong>MIOC</strong>${formatHex(mioc, 2)}</div>
        <div class="rom-recorder__card"><strong>AdamNet controller</strong>state ${formatHex(summary.controllerState, 2)} · PCB ${formatHex(summary.pcbAddress)} · status ${formatHex(summary.pcbStatus, 2)}</div>
        <div class="rom-recorder__card"><strong>Device control blocks</strong>${activeDcbs.length} active of ${summary.dcbCount}</div>
        <div class="rom-recorder__card"><strong>Transfer</strong>${transfer.active ? `device ${formatHex(transfer.device, 2)} · command ${formatHex(transfer.command, 2)} · block ${transfer.block} · ${transfer.length} bytes` : "idle"}${transfer.error ? ` · error ${formatHex(transfer.error, 2)}` : ""}</div>
        <div class="rom-recorder__card"><strong>Serial / modem</strong>${serial.profile ? `profile ${serial.profile} · RX ${serial.rxSize} · TX ${serial.txSize} · carrier ${serial.carrier ? "on" : "off"}${serial.hayes ? ` · Hayes${serial.commandLength ? ` (${serial.commandLength} pending)` : ""}` : serial.loopback ? " · loopback" : ""}` : "not installed"}</div>
      </div>`;
      const text = formatAdamPrinterText(printer);
      output.textContent = `PRINTER SPOOL (${printer.length} bytes)\n${text || "(empty)"}\n\nRAW BYTES\n${printer.length ? formatHexDump(printer, 0) : "(empty)"}`;
    } catch (error) {
      state.textContent = error.message || String(error);
      output.textContent = "Unable to read ADAM printer output.";
    }
  }

  function renderRegionToggle() {
    const button = field("region");
    const labels = { "-1": "AUTO", "0": "NTSC", "1": "PAL" };
    button.textContent = labels[button.value] || "AUTO";
    button.title = button.value === "-1"
      ? "Video region follows the BIOS; click for NTSC"
      : `Forced ${button.textContent} video region; click to change`;
    button.setAttribute("aria-label", `Video region: ${button.textContent}`);
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
    action("recordRoute").disabled = !checkpoint || routeReplayActive;
    action("arm").title = checkpoint ? `Arm ${checkpoint} and continue playing` : "Add a test checkpoint to the Amy source first";
    action("arm").setAttribute("aria-label", action("arm").title);
    updateDevelopmentRouteActions();
  }

  function selectedDevelopmentRoute() {
    return developmentRoutes.get(developmentProjectId(), field("developmentRoute").value);
  }

  function updateDevelopmentRouteActions() {
    if (!dialog) return;
    const route = selectedDevelopmentRoute();
    const autoRouteId = developmentRoutes.getAutoRouteId(developmentProjectId());
    action("replayRoute").disabled = !route || routeReplayActive;
    action("deleteRoute").disabled = !route || routeReplayActive;
    action("autoRoute").disabled = !route || routeReplayActive;
    action("autoRoute").setAttribute("aria-pressed", String(Boolean(route && route.id === autoRouteId)));
    action("autoRoute").textContent = route && route.id === autoRouteId ? "After compile: ON" : "After compile";
  }

  function refreshDevelopmentRoutes(preferredRouteId = "") {
    const select = field("developmentRoute");
    const routes = developmentRoutes.list(developmentProjectId());
    select.replaceChildren(new Option(routes.length ? "Select a route" : "No recorded routes", ""));
    for (const route of routes) {
      select.add(new Option(`${route.name} (${route.frameCount} frames)`, route.id));
    }
    const selectedId = preferredRouteId || select.value || developmentRoutes.getAutoRouteId(developmentProjectId());
    if (routes.some((route) => route.id === selectedId)) select.value = selectedId;
    updateDevelopmentRouteActions();
  }

  function armDevelopmentCheckpoint(checkpoint, bank = null) {
    const resolved = resolveAmyCheckpoint(getCompiledSymbols(), checkpoint, bank);
    core.clearAllBreakpoints();
    activeBreakpoints.clear();
    core.setExecuteBreakpoint(resolved.address);
    activeBreakpoints.set(resolved.address, { label: resolved.symbol, bank: resolved.bank });
    renderBreakpointList();
    stoppedCheckpoint = null;
    stoppedCheckpointBank = null;
    return resolved;
  }

  async function beginRouteRecording() {
    const checkpoint = field("checkpoint").value;
    if (!checkpoint) throw new Error("Select a symbolic checkpoint before recording a route.");
    await startCore();
    const resolved = armDevelopmentCheckpoint(checkpoint);
    const existingCount = developmentRoutes.list(developmentProjectId())
      .filter((route) => route.checkpoint === checkpoint).length;
    routeRecording = {
      checkpoint,
      checkpointBank: resolved.bank,
      name: existingCount ? `${checkpoint} route ${existingCount + 1}` : checkpoint,
      inputs: []
    };
    playing = true;
    setRecorderStatus(`Recording route to ${resolved.symbol}. Play normally; recording stops at the checkpoint.`);
  }

  function completeRouteRecording() {
    if (!routeRecording) return null;
    const completed = routeRecording;
    routeRecording = null;
    const route = developmentRoutes.save(developmentProjectId(), {
      ...completed,
      environment: {
        region: field("region").value,
        videoChip: field("videoChip").value,
        voiceModule: field("voiceModule").value,
        adamSound: field("adamSound").value,
        adamSerial: field("adamSerial").value
      }
    });
    refreshDevelopmentRoutes(route.id);
    return route;
  }

  async function fastReplayDevelopmentRoute(route) {
    if (!route) throw new Error("Select a recorded route first.");
    routeReplayActive = true;
    updateDevelopmentRouteActions();
    try {
      await startCore();
      playing = false;
      audioSink.flush();
      const resolved = armDevelopmentCheckpoint(route.checkpoint, route.checkpointBank);
      const inputs = expandRouteInputs(route.inputRuns);
      setRecorderStatus(`Fast replaying ${route.name}: 0/${inputs.length} frames...`);
      let reached = false;
      for (let index = 0; index < inputs.length; ++index) {
        const result = recorder.runFrame(inputs[index]);
        if (result.breakpointHit) {
          reached = result.pc === resolved.address && breakpointMatchesBank(resolved, currentLogicalBank(result.pc));
          if (!reached) throw new Error(`Route stopped at unexpected address ${formatHex(result.pc)}.`);
          break;
        }
        if (index > 0 && (index % 600) === 0) {
          setRecorderStatus(`Fast replaying ${route.name}: ${index}/${inputs.length} frames...`);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }
      if (!reached) throw new Error(`Route ended before reaching ${resolved.symbol}. Record it again for the recompiled game.`);
      stoppedCheckpoint = route.checkpoint;
      stoppedCheckpointBank = resolved.bank;
      render({ forceInspector: true });
      setRecorderStatus(`Returned to ${route.checkpoint} using ${route.frameCount} recorded frames.`);
    } finally {
      routeReplayActive = false;
      updateCheckpointAction();
    }
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

  function renderControllerVisual() {
    const selectedPort = Number(field("controller").value) || 0;
    const config = controllerSetup?.getConfig();
    const isWheel = config?.ports?.[0]?.type === "wheel";
    const isRoller = config?.ports?.[0]?.type === "roller-x" || config?.ports?.[1]?.type === "roller-y";
    const display = field("controllerDisplay");
    const describePort = (portIndex, type = config?.ports?.[portIndex]?.type || "standard") => {
      if (isWheel) return portIndex === 0 ? "Steering wheel" : type === "super-action" ? "Super Action" : "Hand controller";
      if (isRoller) return type === "super-action" ? "Super Action" : "Standard";
      if (type === "super-action") return "Super Action";
      return "Standard";
    };
    const input = (port, name, text, title = text) => `<button data-input="${name}" data-input-port="${port}" title="${title}" aria-label="${title}">${text}</button>`;
    const diagonal = (port, names, text, title) => `<button data-input-combo="${names}" data-input-port="${port}" title="${title}" aria-label="${title}">${text}</button>`;
    const keypad = (port) => ["1","2","3","4","5","6","7","8","9","ASTERISK","0","HASH"].map((key) =>
      input(port, `KEYPAD_${key}`, key === "ASTERISK" ? "*" : key === "HASH" ? "#" : key)
    ).join("");
    const controllerUnit = (port, forcedType = null, hideSideFire = false) => {
      const type = forcedType || config?.ports?.[port]?.type || "standard";
      const profile = type === "roller-x" || type === "roller-y" || type === "wheel" ? "standard" : type;
      return `<div class="rom-recorder__controller-unit" data-controller-port="${port}" aria-selected="${port === selectedPort}">
        <strong>P${port + 1}</strong>
        <div class="rom-recorder__controller-shell" data-profile="${profile}">
          ${hideSideFire ? "" : `<button class="rom-recorder__fire rom-recorder__fire--left" data-input="FIRE_LEFT" data-input-port="${port}" title="Left fire">L</button>`}
          <div class="rom-recorder__controller-stick" aria-label="P${port + 1} eight-way joystick">${input(port,"UP","↑","Up")}${diagonal(port,"UP LEFT","↖","Up-left")}${diagonal(port,"UP RIGHT","↗","Up-right")}${input(port,"LEFT","←","Left")}${input(port,"RIGHT","→","Right")}${diagonal(port,"DOWN LEFT","↙","Down-left")}${diagonal(port,"DOWN RIGHT","↘","Down-right")}${input(port,"DOWN","↓","Down")}</div>
          ${hideSideFire ? "" : `<button class="rom-recorder__fire rom-recorder__fire--right" data-input="FIRE_RIGHT" data-input-port="${port}" title="Right fire">R</button>`}
          <div class="rom-recorder__super-buttons" aria-label="P${port + 1} Super Action buttons">${input(port,"FIRE_LEFT","Y","Yellow button")}${input(port,"FIRE_RIGHT","R","Red button")}${input(port,"PURPLE","P","Purple button")}${input(port,"BLUE","B","Blue button")}</div>
          <div class="rom-recorder__keypad" aria-label="P${port + 1} numeric keypad">${keypad(port)}</div>
          ${profile === "super-action" ? `<div class="rom-recorder__super-spinner" aria-label="P${port + 1} speed roller"><button data-spinner-port="${port}" data-spinner-direction="-1" title="Roll spinner left">↺</button><span aria-hidden="true"></span><button data-spinner-port="${port}" data-spinner-direction="1" title="Roll spinner right">↻</button></div>` : ""}
        </div></div>`;
    };
    if (isWheel) {
      display.innerHTML = `<div class="rom-recorder__wheel-set">
        <div class="rom-recorder__wheel-console"><strong>P1</strong>${controllerUnit(1,config?.wheelCompanionType || "standard",true)}<div class="rom-recorder__wheel-rim" title="Analog steering; configure keys, gamepad axis, or mouse spinner"></div></div>
        <div class="rom-recorder__pedal"><button data-input="FIRE_LEFT" data-input-port="0" title="Accelerator pedal (controller port 1, game-visible left fire)">P1<br>PEDAL</button></div></div>`;
    } else if (isRoller) {
      display.innerHTML = `<div class="rom-recorder__roller-panel"><strong>P1 + P2</strong>
        ${controllerUnit(0,config?.rollerControllers?.[0] || "standard",true)}<div class="rom-recorder__roller-trackball" aria-label="Trackball"></div>${controllerUnit(1,config?.rollerControllers?.[1] || "standard",true)}
        <div class="rom-recorder__roller-actions">${input(0,"FIRE_LEFT","P1 L")}${input(0,"FIRE_RIGHT","P1 R")}${input(1,"FIRE_LEFT","P2 L")}${input(1,"FIRE_RIGHT","P2 R")}</div></div>`;
    } else {
      display.innerHTML = controllerUnit(0) + controllerUnit(1);
    }
    display.querySelectorAll("[data-input],[data-input-combo]").forEach(bindInputButton);
    display.querySelectorAll("[data-spinner-port]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const port = Number(button.dataset.spinnerPort) || 0;
        const direction = Number(button.dataset.spinnerDirection) < 0 ? -1 : 1;
        const sensitivity = controllerSetup?.getConfig()?.ports?.[port]?.sensitivity || 6;
        mouseSpinnerAccum[port] += direction * sensitivity;
      });
    });
    display.querySelectorAll("[data-controller-port]").forEach((element) => {
      element.addEventListener("click", (event) => {
        if (event.target.closest("[data-input],[data-input-combo]")) return;
        field("controller").value = element.dataset.controllerPort;
        field("controller").dispatchEvent(new Event("change"));
      });
    });
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
    const profileKey = formatBankAddress(sample.target.start, sample.target.bank) + ":" + sample.target.name;
    profileStats.set(profileKey, appendRoutineProfileSample(profileStats.get(profileKey), sample));
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
      .filter((symbol) => /^AMY_UPROC_/i.test(symbol.name)
        && symbol.address !== request.target.start
        && (request.target.bank == null || symbol.bank === request.target.bank))
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
    const now = performance.now();
    if (!force && playing && now - lastInspectorRefresh < INSPECTOR_REFRESH_MS) return;
    lastInspectorRefresh = now;
    const active = dialog.querySelector("[data-pane].is-active")?.dataset.pane;
    if (active === "state") refreshMachineState();
    if (active === "map" && force) renderSymbolList();
    if (active === "asm") refreshAssembly();
    if (active === "ram") refreshMemory("ram");
    if (active === "vram") refreshMemory("vram");
    if (active === "adam") refreshAdamState();
  }

  function applyScale() {
    const canvas = dialog.querySelector("canvas");
    const screenWrap = dialog.querySelector(".rom-recorder__screen-wrap");
    const scale = field("scale").value;
    screenWrap.style.width = scale === "fit" ? "100%" : `${256 * Number(scale)}px`;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }

  function render({ forceInspector = false } = {}) {
    const screenCanvas = dialog.querySelector("canvas");
    renderRgb565(screenCanvas, core.getFramebufferView());
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
    const mappedInput = controllerSetup?.getFrameInput(pressedKeys, {
      keyboardPort: keyboardJoystickPort()
    }) || {
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
    const frameBefore = timeline.frame;
    const result = replaying
      ? recorder.replayFrame()
      : recorder.runFrame({ controllerMasks: effectiveMasks, spinnerDeltas });
    if (routeRecording && !replaying) {
      routeRecording.inputs.push({ controllerMasks: [...effectiveMasks], spinnerDeltas: [...spinnerDeltas] });
    }
    if (replaying && gameplayRecording.recording) {
      gameplayRecording.stop();
      action("recordVideo").classList.remove("is-recording");
      action("recordVideo").disabled = false;
      action("recordBoot").classList.remove("is-recording");
      action("recordBoot").disabled = false;
      action("stopVideo").disabled = true;
      action("exportVideo").disabled = gameplayRecording.inputs.length === 0;
      action("exportGif").disabled = gameplayRecording.inputs.length === 0;
      setRecorderStatus("Video recording stopped because the rewind timeline was used.");
    } else if (!replaying && recorder.frame > frameBefore) {
      gameplayRecording.append({ controllerMasks: effectiveMasks, spinnerDeltas });
    }
    if (!replaying) mouseJoystickMask = 0;
    if (audioSink.acceptsFrames()) audioSink.push(core.getAudioFrame());
    if (result.breakpointHit) {
      if (profileRequest?.waiting && result.pc === profileRequest.target.start
          && breakpointMatchesBank(profileRequest.target, currentLogicalBank(result.pc))) {
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
      const activeBank = currentLogicalBank(result.pc);
      for (const candidate of candidates.filter((entry) => breakpointMatchesBank(entry, activeBank))) {
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
      stoppedCheckpointBank = stoppedCheckpoint ? currentLogicalBank(result.pc) : null;
      const label = matchedSourceMember?.line
        ? `source line ${matchedSourceMember.line}`
        : breakpoint?.label || stoppedCheckpoint || "breakpoint";
      const valueNote = conditionResult ? `; value ${conditionResult.actual} ${conditionResult.operator} ${conditionResult.expected}` : "";
      setRecorderStatus(`Stopped at ${label} (${formatHex(result.pc)}${valueNote}).`);
      if (routeRecording) {
        try {
          const route = completeRouteRecording();
          setRecorderStatus(`Route ${route.name} recorded: ${route.frameCount} frames to ${route.checkpoint}.`);
        } catch (error) {
          routeRecording = null;
          setRecorderStatus(`Checkpoint reached, but the route could not be saved: ${error.message || error}`);
        }
      }
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
    cancelAnimationFrame(timer);
    timer = 0;
    playbackTimestamp = 0;
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
    cancelAnimationFrame(timer);
    playbackTimestamp = 0;
    const tick = (timestamp) => {
      if (!core || !recorder) return;
      if (!playbackTimestamp) playbackTimestamp = timestamp;
      const elapsed = Math.min(PLAYBACK_MAX_ELAPSED_MS, Math.max(0, timestamp - playbackTimestamp));
      playbackTimestamp = timestamp;
      if (!playing) {
        playbackAccumulator = 0;
        timer = requestAnimationFrame(tick);
        return;
      }
      const framesPerSecond = core.getFramesPerSecond() || 60;
      playbackAccumulator += elapsed * framesPerSecond * playbackRate / 1000;
      let advanced = false;
      let catchupFrames = 0;
      while (playbackAccumulator >= 1 && playing && catchupFrames < PLAYBACK_MAX_CATCHUP_FRAMES) {
        const result = runOneFrame({ renderNow: false });
        playbackAccumulator -= 1;
        catchupFrames += 1;
        advanced = true;
        if (result.breakpointHit) break;
      }
      if (catchupFrames === PLAYBACK_MAX_CATCHUP_FRAMES && playbackAccumulator > 1) {
        playbackAccumulator = 1;
      }
      if (advanced) render();
      timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
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
      const existing = activeBreakpoints.get(group.address);
      const existingMembers = Array.isArray(existing?.sourceMembers) ? existing.sourceMembers : [];
      const sourceMembers = [...existingMembers, ...group.members];
      activeBreakpoints.set(group.address, {
        label: `source line ${sourceMembers[0].line}`,
        sourceLine: sourceMembers[0].line,
        sourceMembers,
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

  async function startCore(romOverride = null, { recordGameplayFromBoot = false } = {}) {
    stopCore();
    routeRecording = null;
    const rom = romOverride || externalRom || getCompiledRom();
    const bios = getEmulatorBios();
    const adam = field("machine").value === "adam-computer";
    if (adam && !adamFirmware) {
      try { adamFirmware = await loadLocalAdamFirmware(); }
      catch { throw new Error("Configure OS7.ROM, EOS.ROM, and WP.ROM before starting ADAM."); }
    }
    const adamMediaBytes = externalAdamMedia || getCompiledAdamDisk();
    if (adam && !adamMediaBytes) throw new Error("Compile, open, or drop an ADAM .dsk or .ddp file first.");
    if (!adam && (!rom || !bios)) throw new Error("Compile or open a ROM and load a BIOS first.");
    core = await GearcolecoTestCore.create({ seed: SEED });
    loadedRom = rom;
    loadedAdamMedia = adam ? adamMediaBytes : null;
    core.setVideoChip(field("videoChip").value);
    const serialSetting = field("adamSerial").value;
    core.setAdamSoundExpansion(field("adamSound").value);
    const serialProfile = serialSetting.split("-")[0];
    core.setAdamSerialProfile(serialProfile);
    core.setAdamSerialLoopback(serialSetting.endsWith("-loopback"));
    core.setAdamSerialHayes(serialSetting.endsWith("-hayes"));
    core.setAdamSerialTiming(Number(field("adamSerialBaud").value), 10);
    core.setAdamSerialCarrier(serialSetting.endsWith("-loopback"));
    if (adam) {
      core.loadAdamFirmware(adamFirmware);
      core.startAdam();
      core.loadAdamMedia(adamMediaBytes, {
        slot: externalAdamMediaType === GEARCOLECO_ADAM_MEDIA.DATA_PACK ? GEARCOLECO_ADAM_SLOT.DATA_PACK_1 : GEARCOLECO_ADAM_SLOT.DISK_1,
        type: externalAdamMediaType,
        writeProtected: false
      });
      core.reset();
    } else {
      core.loadBios(bios);
      core.loadRom(rom, { region: Number(field("region").value) });
    }
    core.setVoiceModuleProfile(field("voiceModule").value);
    recorder = new RomTestRecorder(core, { keyframeInterval: 30, maxKeyframes: 120 });
    recorder.start();
    gameplayRecording.clear();
    action("recordVideo").classList.remove("is-recording");
    action("recordVideo").disabled = false;
    action("recordBoot").classList.remove("is-recording");
    action("recordBoot").disabled = false;
    action("stopVideo").disabled = true;
    action("exportVideo").disabled = true;
    action("exportGif").disabled = true;
    if (recordGameplayFromBoot) {
      gameplayRecording.start(core, { controllerMasks });
      action("recordBoot").classList.add("is-recording");
      action("recordBoot").disabled = true;
      action("recordVideo").disabled = true;
      action("stopVideo").disabled = false;
    }
    if (!externalRom) installSourceBreakpoints();
    playing = true;
    controllerMasks[0] = 0;
    controllerMasks[1] = 0;
    pressedKeys.clear();
    stoppedCheckpoint = null;
    playbackAccumulator = 0;
    lastInspectorRefresh = 0;
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
    if (name === "adam") refreshAdamState();
    if (name === "map") renderSymbolList();
    if (name === "profiler") renderProfileResults();
  }

  function bindInputButton(button) {
    const inputNames = button.dataset.inputCombo?.split(/\s+/).filter(Boolean) || [button.dataset.input];
    const mask = inputNames.reduce((combined, name) => combined | (GEARCOLECO_TEST_INPUT[name] || 0), 0);
    const press = (event) => {
      event.preventDefault();
      const controller = button.dataset.inputPort === undefined
        ? Number(field("controller").value) || 0
        : Number(button.dataset.inputPort) || 0;
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

  async function loadExternalRomFile(file) {
    setRecorderStatus(`Loading ${file.name}...`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const media = detectEmulatorMedia(file?.name, bytes);
    if (!media) throw new Error("Open an uncompressed .rom, .col, .dsk, or .ddp file. Standard 160 KiB DSK and 256 KiB DDP images are auto-detected.");
    const adamMedia = media.kind !== EMULATOR_MEDIA_KIND.ROM;
    externalRom = adamMedia ? null : bytes;
    externalAdamMedia = adamMedia ? bytes : null;
    externalAdamMediaType = media.kind === EMULATOR_MEDIA_KIND.ADAM_DATA_PACK ? GEARCOLECO_ADAM_MEDIA.DATA_PACK
      : (media.kind === EMULATOR_MEDIA_KIND.ADAM_DISK ? GEARCOLECO_ADAM_MEDIA.DISK : null);
    field("machine").value = adamMedia ? "adam-computer" : "colecovision";
    externalRomName = file.name;
    symbols = [];
    profileStats.clear();
    field("checkpoint").replaceChildren(new Option("Current frame", ""));
    field("rawMap").textContent = "External ROM: no Amy linker map.";
    await startCore(externalRom);
    action("useCompiledRom").disabled = !(getCompiledRom() || getCompiledAdamDisk());
    renderSymbolList();
    renderBreakpointList();
    const detection = media.detectedBy === "geometry" ? " (type auto-detected)" : "";
    setRecorderStatus(adamMedia ? `Running ADAM media ${externalRomName}${detection}.` : `Running external ROM ${externalRomName}. Mouse spinner deltas are recorded per frame.`);
  }

  function bindDialog() {
    action("close").addEventListener("click", () => dialog.close());
    action("loadBios").addEventListener("click", requestEmulatorBios);
    action("loadAdamFirmware").addEventListener("click", () => {
      field("adamFirmwareFiles").value = "";
      field("adamFirmwareFiles").click();
    });
    action("clearAdamFirmware").addEventListener("click", () => {
      clearAdamFirmwareFromBrowser();
      adamFirmware = null;
      setRecorderStatus("ADAM firmware removed from this browser.");
    });
    field("adamFirmwareFiles").addEventListener("change", async () => {
      try {
        const images = {};
        for (const file of [...field("adamFirmwareFiles").files]) {
          const name = file.name.toLowerCase();
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (name === "os7.rom") images.os7 = bytes;
          else if (name === "eos.rom") images.eos = bytes;
          else if (name === "wp.rom") images.smartwriter = bytes;
          else if (bytes.length === 32768 && !images.smartwriter) images.smartwriter = bytes;
          else if (bytes.length === 8192 && !images.os7) images.os7 = bytes;
          else if (bytes.length === 8192 && !images.eos) images.eos = bytes;
        }
        adamFirmware = saveAdamFirmwareToBrowser(images);
        setRecorderStatus("ADAM firmware stored locally in this browser. Drop a .dsk or .ddp file.");
      } catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    const screenWrap = dialog.querySelector(".rom-recorder__screen-wrap");
    async function toggleGameFullscreen() {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await screenWrap.requestFullscreen();
        dialog.querySelector("canvas").focus();
      }
    }
    action("fullscreen").addEventListener("click", toggleGameFullscreen);
    screenWrap.addEventListener("dblclick", toggleGameFullscreen);
    document.addEventListener("fullscreenchange", () => {
      const active = document.fullscreenElement === screenWrap;
      action("fullscreen").setAttribute("aria-pressed", String(active));
      action("fullscreen").title = active ? "Exit fullscreen (Esc)" : "Play fullscreen (Alt+Enter)";
      action("fullscreen").setAttribute("aria-label", active ? "Exit emulator fullscreen" : "Play emulator fullscreen");
      if (!active) applyScale();
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
    action("recordBoot").addEventListener("click", async () => {
      setRecorderStatus("Resetting and arming gameplay recording from boot...");
      try {
        await startCore(null, { recordGameplayFromBoot: true });
        setRecorderStatus("Gameplay video recording started at boot frame 0.");
      } catch (error) {
        action("recordBoot").classList.remove("is-recording");
        action("recordBoot").disabled = false;
        setRecorderStatus(error.message || String(error));
      }
    });
    action("recordVideo").addEventListener("click", () => {
      gameplayRecording.start(core, { controllerMasks: recorder?.controllerMasks || controllerMasks });
      action("recordVideo").classList.add("is-recording");
      action("recordVideo").disabled = true;
      action("recordBoot").disabled = true;
      action("stopVideo").disabled = false;
      action("exportVideo").disabled = true;
      action("exportGif").disabled = true;
      setRecorderStatus("Gameplay video recording started. The rewind buffer no longer limits its duration.");
    });
    action("stopVideo").addEventListener("click", () => {
      const frames = gameplayRecording.stop();
      action("recordVideo").classList.remove("is-recording");
      action("recordVideo").disabled = false;
      action("recordBoot").classList.remove("is-recording");
      action("recordBoot").disabled = false;
      action("stopVideo").disabled = true;
      action("exportVideo").disabled = frames === 0;
      action("exportGif").disabled = frames === 0;
      setRecorderStatus(`Gameplay video recording stopped after ${frames} frames.`);
    });
    async function exportRecording(format) {
      if (videoExporting) return;
      videoExporting = true;
      const exportButton = action(format === "gif" ? "exportGif" : "exportVideo");
      action("exportVideo").disabled = true;
      action("exportGif").disabled = true;
      const screenCanvas = dialog.querySelector("canvas.rom-recorder__screen");
      const screenContext = screenCanvas.getContext("2d", { alpha: false });
      const screenSnapshot = screenContext.getImageData(0, 0, screenCanvas.width, screenCanvas.height);
      playing = false;
      playbackAccumulator = 0;
      audioSink.flush();
      try {
        if (gameplayRecording.recording) gameplayRecording.stop();
        action("recordVideo").classList.remove("is-recording");
        action("recordVideo").disabled = false;
        action("recordBoot").classList.remove("is-recording");
        action("recordBoot").disabled = false;
        action("stopVideo").disabled = true;
        const result = await (format === "gif" ? exportGameplayGifSession : exportGameplaySession)({
          core,
          session: gameplayRecording,
          restoreControllerMasks: recorder?.controllerMasks || controllerMasks,
          onProgress({ completed, total, encoded }) {
            setRecorderStatus(format === "gif"
              ? `Encoding animated GIF ${completed}/${total} source frames (${encoded || 0} kept)...`
              : `Encoding deterministic video ${completed}/${total} frames...`);
          }
        });
        const sourceName = externalRomName || getProject()?.name || "amy-studio-gameplay";
        const stem = sourceName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "amy-studio-gameplay";
        downloadGameplayVideo(result.blob, `${stem}-${result.frameCount}-frames.${format}`);
        setRecorderStatus(format === "gif"
          ? `Exported ${result.frameCount} GIF frames at ${result.fps.toFixed(2)} Hz (silent).`
          : `Exported ${result.frameCount} frames at ${result.fps} Hz with ${result.sampleRate} Hz PCM audio.`);
      } catch (error) {
        setRecorderStatus(error.message || String(error));
      } finally {
        videoExporting = false;
        const hasRecording = gameplayRecording.inputs.length > 0;
        action("exportVideo").disabled = !hasRecording;
        action("exportGif").disabled = !hasRecording;
        render({ forceInspector: true });
        screenContext.putImageData(screenSnapshot, 0, 0);
      }
    }
    action("exportVideo").addEventListener("click", () => exportRecording("avi"));
    action("exportGif").addEventListener("click", () => exportRecording("gif"));
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
    field("region").addEventListener("click", async () => {
      const regions = ["-1", "0", "1"];
      field("region").value = regions[(regions.indexOf(field("region").value) + 1) % regions.length];
      renderRegionToggle();
      setRecorderStatus("Restarting in the selected video region...");
      try { await startCore(); setRecorderStatus(`Running in ${core.getRegionName()} at ${core.getFramesPerSecond()} Hz.`); }
      catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    field("videoChip").addEventListener("change", async () => {
      const chip = field("videoChip").selectedOptions[0]?.textContent || field("videoChip").value;
      setRecorderStatus(`Restarting with video hardware: ${chip}...`);
      try {
        await startCore();
        setRecorderStatus(`Video hardware is ${chip}; recording restarted.`);
      } catch (error) {
        setRecorderStatus(error.message || String(error));
      }
    });
    field("voiceModule").addEventListener("change", async () => {
      const profile = field("voiceModule").selectedOptions[0]?.textContent || field("voiceModule").value;
      setRecorderStatus(`Restarting with voice hardware: ${profile}...`);
      try {
        await startCore();
        setRecorderStatus(`Voice hardware is ${profile}; recording restarted for hardware detection.`);
      } catch (error) {
        setRecorderStatus(error.message || String(error));
      }
    });
    field("adamSerial").addEventListener("change", async () => {
      const profile = field("adamSerial").selectedOptions[0]?.textContent || field("adamSerial").value;
      setRecorderStatus(`Restarting with ADAM serial hardware: ${profile}...`);
      try {
        await startCore();
        setRecorderStatus(`ADAM serial hardware is ${profile}; recording restarted.`);
      } catch (error) {
        setRecorderStatus(error.message || String(error));
      }
    });
    field("adamSound").addEventListener("change", async () => {
      const profile = field("adamSound").selectedOptions[0]?.textContent || field("adamSound").value;
      setRecorderStatus(`Restarting with ADAM sound hardware: ${profile}...`);
      try {
        await startCore();
        setRecorderStatus(`ADAM sound hardware is ${profile}; recording restarted.`);
      } catch (error) {
        setRecorderStatus(error.message || String(error));
      }
    });
    field("controller").addEventListener("change", () => {
      controllerMasks[0] = 0;
      controllerMasks[1] = 0;
      renderControllerVisual();
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
    field("developmentRoute").addEventListener("change", () => {
      const route = selectedDevelopmentRoute();
      if (route && [...field("checkpoint").options].some((option) => option.value === route.checkpoint)) {
        field("checkpoint").value = route.checkpoint;
      }
      updateCheckpointAction();
    });
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
    action("refreshAdam").addEventListener("click", refreshAdamState);
    action("clearAdamPrinter").addEventListener("click", () => {
      if (!core || core.getMachine() !== GEARCOLECO_MACHINE.ADAM) {
        setRecorderStatus("Start ADAM media before clearing its printer spool.");
        return;
      }
      core.clearAdamPrinterData();
      refreshAdamState();
      setRecorderStatus("ADAM printer spool cleared.");
    });
    action("saveAdamMedia").addEventListener("click", () => {
      try {
        if (!core || core.getMachine() !== GEARCOLECO_MACHINE.ADAM) {
          throw new Error("Start ADAM media before saving it.");
        }
        const dataPack = externalAdamMediaType === GEARCOLECO_ADAM_MEDIA.DATA_PACK;
        const slot = dataPack ? GEARCOLECO_ADAM_SLOT.DATA_PACK_1 : GEARCOLECO_ADAM_SLOT.DISK_1;
        const extension = dataPack ? ".ddp" : ".dsk";
        const sourceName = externalRomName || getProject()?.projectName || getProject()?.name || "amy-adam";
        const stem = sourceName.replace(/\.(?:dsk|ddp)$/i, "");
        downloadBytes(`${stem}-saved${extension}`, core.readAdamMedia(slot));
        setRecorderStatus(`Saved writable ADAM media as ${stem}-saved${extension}.`);
      } catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    field("symbolFilter").addEventListener("input", renderSymbolList);

    action("addBreakpoint").addEventListener("click", () => {
      try {
        const input = field("breakpointAddress").value.trim();
        const condition = field("breakpointCondition").value.trim();
        const valueType = field("breakpointValueType").value || "auto";
        if (condition) parseBreakpointCondition(condition);
        const resolved = resolveSymbolReference(input, symbols);
        const address = resolved.address;
        core.setExecuteBreakpoint(address);
        activeBreakpoints.set(address, mergeBreakpointCandidates(
          activeBreakpoints.get(address),
          { label: input || formatHex(address), bank: resolved.bank ?? null, condition, valueType }
        ));
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
      const resolved = armDevelopmentCheckpoint(checkpoint);
      playing = true;
      setRecorderStatus(`Running to ${resolved.symbol}...`);
      render();
    });
    action("recordRoute").addEventListener("click", async () => {
      try { await beginRouteRecording(); }
      catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    action("replayRoute").addEventListener("click", async () => {
      try { await fastReplayDevelopmentRoute(selectedDevelopmentRoute()); }
      catch (error) { setRecorderStatus(error.message || String(error)); }
    });
    action("autoRoute").addEventListener("click", () => {
      const route = selectedDevelopmentRoute();
      if (!route) return;
      const current = developmentRoutes.getAutoRouteId(developmentProjectId());
      developmentRoutes.setAutoRouteId(developmentProjectId(), current === route.id ? "" : route.id);
      updateDevelopmentRouteActions();
      setRecorderStatus(current === route.id
        ? "Automatic replay after compile disabled."
        : `${route.name} will be replayed when the recompiled ROM is opened.`);
    });
    action("deleteRoute").addEventListener("click", () => {
      const route = selectedDevelopmentRoute();
      if (!route) return;
      developmentRoutes.remove(developmentProjectId(), route.id);
      refreshDevelopmentRoutes();
      setRecorderStatus(`Deleted development route ${route.name}.`);
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
          checkpoint: stoppedCheckpoint ? { name: stoppedCheckpoint, bank: stoppedCheckpointBank, occurrence: 1 } : null,
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
      try {
        await loadExternalRomFile(file);
      } catch (error) {
        externalRom = null;
        externalRomName = "";
        setRecorderStatus(error.message || String(error));
      }
    });
    let romDragDepth = 0;
    dialog.addEventListener("dragenter", (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      romDragDepth += 1;
      dialog.classList.add("is-rom-dragover");
    });
    dialog.addEventListener("dragover", (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    dialog.addEventListener("dragleave", () => {
      romDragDepth = Math.max(0, romDragDepth - 1);
      if (!romDragDepth) dialog.classList.remove("is-rom-dragover");
    });
    dialog.addEventListener("drop", async (event) => {
      if (!event.dataTransfer?.files?.length) return;
      event.preventDefault();
      event.stopPropagation();
      romDragDepth = 0;
      dialog.classList.remove("is-rom-dragover");
      const files = [...event.dataTransfer.files];
      const romFile = files.find((file) => isKnownEmulatorMediaName(file.name)) || (files.length === 1 ? files[0] : null);
      if (!romFile) {
        setRecorderStatus("Drop one uncompressed .rom, .col, .dsk, or .ddp file here.");
        return;
      }
      try {
        await loadExternalRomFile(romFile);
      } catch (error) {
        externalRom = null;
        externalRomName = "";
        setRecorderStatus(error.message || String(error));
      }
    });
    action("useCompiledRom").addEventListener("click", async () => {
      const compiledRom = getCompiledRom();
      const compiledDisk = getCompiledAdamDisk();
      if (!compiledRom && !compiledDisk) {
        setRecorderStatus("No compiled Amy output is available. Compile the project or open external media.");
        return;
      }
      externalRom = null;
      externalRomName = "";
      externalAdamMedia = null;
      externalAdamMediaType = compiledDisk ? GEARCOLECO_ADAM_MEDIA.DISK : null;
      field("machine").value = compiledDisk ? "adam-computer" : "colecovision";
      symbols = annotateOverlaySymbols(parseAmySymbols(getCompiledSymbols()), getCompiledMetadata()?.ramOverlays);
      setRecorderStatus(compiledDisk ? "Mounting compiled Amy ADAM disk..." : "Loading compiled Amy ROM...");
      try {
        await startCore(compiledRom);
        renderSymbolList();
        setRecorderStatus(compiledDisk ? "Running compiled Amy ADAM disk." : "Running compiled Amy ROM.");
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
        core.setVideoChip(testCase.environment?.videoChip || field("videoChip").value);
        core.loadBios(bios);
        const replayRegion = testCase.environment?.region === "pal" ? GEARCOLECO_TEST_REGION.PAL : GEARCOLECO_TEST_REGION.NTSC;
        field("region").value = String(replayRegion);
        renderRegionToggle();
        core.loadRom(rom, { region: replayRegion });
        const result = await replayRomTestCase(core, testCase, { biosBytes: bios, romBytes: rom, symbolsText: getCompiledSymbols(), allowRebuiltRom: field("allowRebuilt").checked });
        recorder = new RomTestRecorder(core, { keyframeInterval: 30, maxKeyframes: 120 });
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
      releaseAdamKeyboard();
      controllerMasks[0] = 0;
      controllerMasks[1] = 0;
      if (core) {
        core.setControllerMask(0, 0);
        core.setControllerMask(1, 0);
      }
      setMouseSpinnerEnabled(false);
    });
    field("keyboardTarget").addEventListener("change", () => {
      releaseComputerKeyboard();
      const target = field("keyboardTarget").value;
      setRecorderStatus(target === "adam"
        ? "Computer keyboard controls the ADAM keyboard."
        : `Computer keyboard controls joystick ${target === "joy2" ? "P2" : "P1"}.`);
      dialog.querySelector("canvas")?.focus();
    });
    window.addEventListener("blur", () => { releaseComputerKeyboard(); clearMouseFireButtons(); });
    dialog.addEventListener("keydown", (event) => {
      if (event.altKey && event.key === "Enter") {
        event.preventDefault();
        toggleGameFullscreen();
        return;
      }
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
      const canvas = dialog.querySelector("canvas.rom-recorder__screen");
      if (field("machine").value === "adam-computer" && field("keyboardTarget").value === "adam" && document.activeElement === canvas) {
        const adamKey = adamKeyFromKeyboardCode(event.code);
        if (adamKey !== null) {
          event.preventDefault();
          if (!pressedAdamCodes.has(event.code)) {
            core?.setAdamKey(adamKey, true);
            pressedAdamCodes.set(event.code, adamKey);
          }
          return;
        }
      }
      const keyboardPort = keyboardJoystickPort();
      if (!controllerSetup.isKeyMapped(event.code, keyboardPort)) return;
      event.preventDefault();
      pressedKeys.add(event.code);
    });
    dialog.addEventListener("keyup", (event) => {
      const adamKey = pressedAdamCodes.get(event.code);
      if (adamKey !== undefined) {
        event.preventDefault();
        pressedAdamCodes.delete(event.code);
        if (![...pressedAdamCodes.values()].includes(adamKey)) core?.setAdamKey(adamKey, false);
        return;
      }
      const keyboardPort = keyboardJoystickPort();
      if (!controllerSetup.isKeyMapped(event.code, keyboardPort)) return;
      event.preventDefault();
      pressedKeys.delete(event.code);
    });
  }

  async function open() {
    const compiledDisk = getCompiledAdamDisk();
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
          renderControllerVisual();
          renderMouseSpinnerButton();
          dialog?.querySelector("canvas")?.focus();
        }
      });
      field("controller").value = String(preferredControllerUiPort(controllerSetup.getConfig(), field("controller").value));
      renderControllerVisual();
      bindDialog();
    }
    symbols = externalRom ? [] : annotateOverlaySymbols(parseAmySymbols(getCompiledSymbols()), getCompiledMetadata()?.ramOverlays);
    if (!externalRom && getCompiledAdamDisk()) {
      externalAdamMedia = null;
      externalAdamMediaType = GEARCOLECO_ADAM_MEDIA.DISK;
      field("machine").value = "adam-computer";
    }
    if (loadedRom && loadedRom !== getCompiledRom()) profileStats.clear();
    const checkpoints = listAmyCheckpoints(getCompiledSymbols());
    const select = field("checkpoint");
    const previousCheckpoint = select.value;
    select.replaceChildren(new Option(checkpoints.length ? "Select checkpoint" : "No checkpoints in source", ""));
    for (const checkpoint of checkpoints) select.add(new Option(checkpoint, checkpoint));
    if (checkpoints.includes(previousCheckpoint)) select.value = previousCheckpoint;
    refreshDevelopmentRoutes();
    field("rawMap").textContent = getCompiledMemoryMap() || "No linker memory map was generated.";
    updateCheckpointAction();
    renderRegionToggle();
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
    action("useCompiledRom").disabled = !(getCompiledRom() || compiledDisk);
    dialog.showModal();
    // ADAM firmware is resolved from browser storage or the local ignored ROM folder in startCore().
    field("biosMissing").hidden = Boolean(compiledDisk || getEmulatorBios());
    if (!compiledDisk && !getEmulatorBios()) {
      playing = false;
      playbackAccumulator = 0;
      setRecorderStatus("ColecoVision BIOS missing. Add your own 8 KiB BIOS to start emulation.");
      action("loadBios").focus();
      return;
    }
    const requestedAdamMedia = externalAdamMedia || compiledDisk;
    const canResume = Boolean(core && recorder && (
      requestedAdamMedia
        ? loadedAdamMedia === requestedAdamMedia
        : loadedRom === (externalRom || getCompiledRom())
    ));
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
    try {
      await startCore();
      const autoRoute = developmentRoutes.get(developmentProjectId(), developmentRoutes.getAutoRouteId(developmentProjectId()));
      if (autoRoute && !externalRom) await fastReplayDevelopmentRoute(autoRoute);
      else setRecorderStatus("Running.");
    }
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
