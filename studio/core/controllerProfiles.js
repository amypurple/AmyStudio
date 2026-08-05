export const CONTROLLER_STORAGE_KEY = "amyStudio.controllerProfiles.v1";

export const CONTROLLER_DEVICE_TYPES = Object.freeze([
  { id: "standard", label: "Standard Controller" },
  { id: "super-action", label: "Super Action Controller" },
  { id: "wheel", label: "Steering Wheel + Pedal" },
  { id: "roller-x", label: "Roller Controller X" },
  { id: "roller-y", label: "Roller Controller Y" }
]);

export const SUPER_ACTION_FIRE_ROW = Object.freeze([
  { action: "FIRE_LEFT", label: "YELLOW", className: "yellow" },
  { action: "FIRE_RIGHT", label: "RED", className: "red" },
  { action: "PURPLE", label: "PURPLE", className: "purple" },
  { action: "BLUE", label: "BLUE", className: "blue" }
]);

export const CONTROLLER_ACTIONS = Object.freeze([
  { id: "UP", label: "Up", group: "stick" },
  { id: "DOWN", label: "Down", group: "stick" },
  { id: "LEFT", label: "Left", group: "stick" },
  { id: "RIGHT", label: "Right", group: "stick" },
  { id: "FIRE_LEFT", label: "Left fire", group: "fire" },
  { id: "FIRE_RIGHT", label: "Right fire", group: "fire" },
  { id: "BLUE", label: "Blue trigger", group: "super" },
  { id: "PURPLE", label: "Purple trigger", group: "super" },
  ...["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => ({
    id: `KEYPAD_${key}`, label: key, group: "keypad"
  })),
  { id: "KEYPAD_ASTERISK", label: "*", group: "keypad" },
  { id: "KEYPAD_0", label: "0", group: "keypad" },
  { id: "KEYPAD_HASH", label: "#", group: "keypad" },
  { id: "SPINNER_NEG", label: "Roller / wheel left", group: "spinner" },
  { id: "SPINNER_POS", label: "Roller / wheel right", group: "spinner" }
]);

const ACTION_IDS = new Set(CONTROLLER_ACTIONS.map(({ id }) => id));
const DEVICE_IDS = new Set(CONTROLLER_DEVICE_TYPES.map(({ id }) => id));

const key = (code) => ({ kind: "key", code });
const button = (index) => ({ kind: "button", index });
const axis = (index, direction) => ({ kind: "axis", index, direction });

function defaultPortOne() {
  return {
    type: "standard",
    gamepadId: "",
    gamepadIndex: 0,
    sensitivity: 6,
    bindings: {
      UP: [key("ArrowUp"), axis(1, -1)],
      DOWN: [key("ArrowDown"), axis(1, 1)],
      LEFT: [key("ArrowLeft"), axis(0, -1)],
      RIGHT: [key("ArrowRight"), axis(0, 1)],
      FIRE_LEFT: [key("KeyZ"), button(1)],
      FIRE_RIGHT: [key("KeyX"), button(0)],
      BLUE: [key("KeyC"), button(2)],
      PURPLE: [key("KeyV"), button(3)],
      KEYPAD_0: [key("Digit0")],
      KEYPAD_1: [key("Digit1")],
      KEYPAD_2: [key("Digit2")],
      KEYPAD_3: [key("Digit3")],
      KEYPAD_4: [key("Digit4")],
      KEYPAD_5: [key("Digit5")],
      KEYPAD_6: [key("Digit6")],
      KEYPAD_7: [key("Digit7")],
      KEYPAD_8: [key("Digit8")],
      KEYPAD_9: [key("Digit9")],
      KEYPAD_ASTERISK: [key("NumpadMultiply")],
      KEYPAD_HASH: [key("NumpadDivide")],
      SPINNER_NEG: [key("BracketLeft"), axis(2, -1)],
      SPINNER_POS: [key("BracketRight"), axis(2, 1)]
    }
  };
}

function defaultPortTwo() {
  return {
    type: "standard",
    gamepadId: "",
    gamepadIndex: 1,
    sensitivity: 6,
    bindings: {
      UP: [key("KeyW"), axis(1, -1)],
      DOWN: [key("KeyS"), axis(1, 1)],
      LEFT: [key("KeyA"), axis(0, -1)],
      RIGHT: [key("KeyD"), axis(0, 1)],
      FIRE_LEFT: [key("KeyQ"), button(1)],
      FIRE_RIGHT: [key("KeyE"), button(0)],
      BLUE: [key("KeyR"), button(2)],
      PURPLE: [key("KeyT"), button(3)],
      KEYPAD_0: [key("Numpad0")],
      KEYPAD_1: [key("Numpad1")],
      KEYPAD_2: [key("Numpad2")],
      KEYPAD_3: [key("Numpad3")],
      KEYPAD_4: [key("Numpad4")],
      KEYPAD_5: [key("Numpad5")],
      KEYPAD_6: [key("Numpad6")],
      KEYPAD_7: [key("Numpad7")],
      KEYPAD_8: [key("Numpad8")],
      KEYPAD_9: [key("Numpad9")],
      KEYPAD_ASTERISK: [key("NumpadMultiply")],
      KEYPAD_HASH: [key("NumpadDivide")],
      SPINNER_NEG: [key("Comma"), axis(2, -1)],
      SPINNER_POS: [key("Period"), axis(2, 1)]
    }
  };
}

export function createDefaultControllerConfig() {
  return {
    version: 1,
    rollerMode: "trackball",
    ports: [defaultPortOne(), defaultPortTwo()]
  };
}

function normalizeBinding(value) {
  if (!value || typeof value !== "object") return null;
  if (value.kind === "key" && typeof value.code === "string") {
    return { kind: "key", code: value.code };
  }
  if (value.kind === "button" && Number.isInteger(value.index) && value.index >= 0) {
    return { kind: "button", index: value.index };
  }
  if (
    value.kind === "axis" &&
    Number.isInteger(value.index) &&
    value.index >= 0 &&
    (value.direction === -1 || value.direction === 1)
  ) {
    return { kind: "axis", index: value.index, direction: value.direction };
  }
  return null;
}

export function normalizeControllerConfig(value) {
  const defaults = createDefaultControllerConfig();
  const sourcePorts = Array.isArray(value?.ports) ? value.ports : [];
  return {
    version: 1,
    rollerMode: value?.rollerMode === "joystick" ? "joystick" : "trackball",
    ports: defaults.ports.map((fallback, portIndex) => {
      const source = sourcePorts[portIndex] || {};
      const bindings = {};
      for (const action of CONTROLLER_ACTIONS) {
        const candidates = Array.isArray(source.bindings?.[action.id])
          ? source.bindings[action.id]
          : fallback.bindings[action.id] || [];
        bindings[action.id] = candidates.map(normalizeBinding).filter(Boolean);
      }
      return {
        type: DEVICE_IDS.has(source.type) ? source.type : fallback.type,
        gamepadId: typeof source.gamepadId === "string" ? source.gamepadId : fallback.gamepadId,
        gamepadIndex: Number.isInteger(source.gamepadIndex) ? source.gamepadIndex : fallback.gamepadIndex,
        sensitivity: Math.max(1, Math.min(32, Number(source.sensitivity) || fallback.sensitivity)),
        bindings
      };
    })
  };
}

export function loadControllerConfig(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(CONTROLLER_STORAGE_KEY);
    return normalizeControllerConfig(raw ? JSON.parse(raw) : null);
  } catch {
    return createDefaultControllerConfig();
  }
}

export function saveControllerConfig(config, storage = globalThis.localStorage) {
  const normalized = normalizeControllerConfig(config);
  storage?.setItem(CONTROLLER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function describeControllerBinding(binding) {
  if (!binding) return "Unassigned";
  if (binding.kind === "key") return binding.code.replace(/^Key/, "").replace(/^Digit/, "");
  if (binding.kind === "button") return `Gamepad B${binding.index}`;
  if (binding.kind === "axis") return `Gamepad A${binding.index} ${binding.direction < 0 ? "−" : "+"}`;
  return "Unassigned";
}

export function isControllerActionVisible(type, action) {
  if (action.group === "super") return type === "super-action";
  if (action.group === "spinner") return type !== "standard";
  return true;
}

function findGamepad(port, gamepads) {
  const connected = [...(gamepads || [])].filter(Boolean);
  if (port.gamepadId) {
    const exact = connected.find((candidate) => candidate.id === port.gamepadId);
    if (exact) return exact;
  }
  return connected.find((candidate) => candidate.index === port.gamepadIndex) || null;
}

function bindingActive(binding, pressedKeys, gamepad, deadzone) {
  if (binding.kind === "key") return pressedKeys.has(binding.code);
  if (binding.kind === "button") return Boolean(gamepad?.buttons?.[binding.index]?.pressed);
  if (binding.kind === "axis") {
    const value = Number(gamepad?.axes?.[binding.index]) || 0;
    return binding.direction < 0 ? value <= -deadzone : value >= deadzone;
  }
  return false;
}

function actionActive(port, actionId, pressedKeys, gamepad, deadzone) {
  return (port.bindings[actionId] || []).some((binding) => {
    return bindingActive(binding, pressedKeys, gamepad, deadzone);
  });
}

function spinnerBindingValue(binding, pressedKeys, gamepad, deadzone) {
  if (binding.kind === "key") return pressedKeys.has(binding.code) ? 1 : 0;
  if (binding.kind === "button") return gamepad?.buttons?.[binding.index]?.pressed ? 1 : 0;
  if (binding.kind === "axis") {
    const value = Number(gamepad?.axes?.[binding.index]) || 0;
    if (binding.direction < 0) return value <= -deadzone ? -value : 0;
    return value >= deadzone ? value : 0;
  }
  return 0;
}

function spinnerActionValue(port, actionId, pressedKeys, gamepad, deadzone) {
  return Math.max(0, ...(port.bindings[actionId] || []).map((binding) => {
    return spinnerBindingValue(binding, pressedKeys, gamepad, deadzone);
  }));
}

export function buildControllerFrame(config, {
  pressedKeys = new Set(),
  gamepads = [],
  inputBits,
  deadzone = 0.45
} = {}) {
  const normalized = normalizeControllerConfig(config);
  const controllerMasks = [0, 0];
  const spinnerDeltas = [0, 0];
  for (let portIndex = 0; portIndex < 2; ++portIndex) {
    const port = normalized.ports[portIndex];
    const gamepad = findGamepad(port, gamepads);
    for (const action of CONTROLLER_ACTIONS) {
      const mask = inputBits?.[action.id];
      if (!mask || !isControllerActionVisible(port.type, action)) continue;
      if (actionActive(port, action.id, pressedKeys, gamepad, deadzone)) {
        controllerMasks[portIndex] |= mask;
      }
    }
    if (port.type !== "standard") {
      const negative = spinnerActionValue(port, "SPINNER_NEG", pressedKeys, gamepad, deadzone);
      const positive = spinnerActionValue(port, "SPINNER_POS", pressedKeys, gamepad, deadzone);
      spinnerDeltas[portIndex] = Math.round((positive - negative) * port.sensitivity);
    }
  }
  const roller = normalized.ports[0].type === "roller-x" || normalized.ports[1].type === "roller-y";
  if (roller && normalized.rollerMode === "joystick") {
    const horizontal = spinnerDeltas[0];
    const vertical = spinnerDeltas[1];
    if (horizontal < 0) controllerMasks[0] |= inputBits?.LEFT || 0;
    if (horizontal > 0) controllerMasks[0] |= inputBits?.RIGHT || 0;
    if (vertical < 0) controllerMasks[0] |= inputBits?.UP || 0;
    if (vertical > 0) controllerMasks[0] |= inputBits?.DOWN || 0;
    spinnerDeltas[0] = 0;
    spinnerDeltas[1] = 0;
  }
  return { controllerMasks, spinnerDeltas };
}

export function setControllerBinding(config, portIndex, actionId, binding) {
  if (portIndex < 0 || portIndex > 1 || !ACTION_IDS.has(actionId)) return normalizeControllerConfig(config);
  const next = normalizeControllerConfig(config);
  next.ports[portIndex].bindings[actionId] = binding ? [normalizeBinding(binding)].filter(Boolean) : [];
  return next;
}

