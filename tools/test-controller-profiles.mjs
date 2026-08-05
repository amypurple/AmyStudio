import assert from "node:assert/strict";
import { buildWheelDeviceMarkup } from "../studio/core/controllerSetupUi.js";
import {
  CONTROLLER_STORAGE_KEY,
  SUPER_ACTION_FIRE_ROW,
  buildControllerFrame,
  createDefaultControllerConfig,
  isControllerActionVisible,
  loadControllerConfig,
  saveControllerConfig,
  setControllerBinding,
  setControllerDeviceType
} from "../studio/core/controllerProfiles.js";

assert.deepEqual(
  SUPER_ACTION_FIRE_ROW.map(({ action, label }) => [action, label]),
  [
    ["FIRE_LEFT", "YELLOW"],
    ["FIRE_RIGHT", "RED"],
    ["PURPLE", "PURPLE"],
    ["BLUE", "BLUE"]
  ],
  "Super Action fire buttons must stay in physical yellow/red/purple/blue order"
);

const INPUT = {
  UP: 1 << 0,
  DOWN: 1 << 1,
  LEFT: 1 << 2,
  RIGHT: 1 << 3,
  FIRE_LEFT: 1 << 4,
  FIRE_RIGHT: 1 << 5,
  KEYPAD_0: 1 << 6,
  KEYPAD_1: 1 << 7,
  KEYPAD_2: 1 << 8,
  KEYPAD_3: 1 << 9,
  KEYPAD_4: 1 << 10,
  KEYPAD_5: 1 << 11,
  KEYPAD_6: 1 << 12,
  KEYPAD_7: 1 << 13,
  KEYPAD_8: 1 << 14,
  KEYPAD_9: 1 << 15,
  KEYPAD_ASTERISK: 1 << 16,
  KEYPAD_HASH: 1 << 17,
  BLUE: 1 << 18,
  PURPLE: 1 << 19
};

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value)
};

let config = createDefaultControllerConfig();
config.ports[0].type = "super-action";
config.ports[1].type = "wheel";
config.ports[1].sensitivity = 10;
config = setControllerBinding(config, 0, "BLUE", { kind: "key", code: "KeyC" });
config = setControllerBinding(config, 1, "FIRE_RIGHT", { kind: "key", code: "KeyE" });
config = setControllerBinding(config, 1, "SPINNER_NEG", { kind: "axis", index: 2, direction: -1 });
config = setControllerBinding(config, 1, "SPINNER_POS", { kind: "axis", index: 2, direction: 1 });

saveControllerConfig(config, storage);
assert.ok(values.has(CONTROLLER_STORAGE_KEY), "configuration must persist under a stable key");
config = loadControllerConfig(storage);
assert.equal(config.ports[0].type, "super-action");
assert.equal(config.ports[1].sensitivity, 10);

let frame = buildControllerFrame(config, {
  pressedKeys: new Set(["ArrowUp", "KeyC", "KeyE"]),
  inputBits: INPUT,
  gamepads: []
});
assert.equal(frame.controllerMasks[0], INPUT.UP | INPUT.BLUE);
assert.equal(frame.controllerMasks[1], INPUT.FIRE_RIGHT);
assert.deepEqual(frame.spinnerDeltas, [0, 0]);

const gamepad = {
  id: "Test Pad",
  index: 1,
  buttons: Array.from({ length: 8 }, () => ({ pressed: false })),
  axes: [0, 0, -0.8]
};
frame = buildControllerFrame(config, {
  inputBits: INPUT,
  gamepads: [gamepad]
});
assert.equal(frame.spinnerDeltas[1], -8, "analog wheel movement must preserve magnitude");

gamepad.axes[2] = 0.6;
frame = buildControllerFrame(config, {
  inputBits: INPUT,
  gamepads: [gamepad]
});
assert.equal(frame.spinnerDeltas[1], 6);

config.ports[1].type = "standard";
frame = buildControllerFrame(config, {
  inputBits: INPUT,
  gamepads: [gamepad]
});
assert.equal(frame.spinnerDeltas[1], 0, "standard controllers must ignore spinner input");

assert.equal(isControllerActionVisible("super-action", { group: "super" }), true);
assert.equal(isControllerActionVisible("standard", { group: "super" }), false);
assert.equal(isControllerActionVisible("roller-x", { group: "spinner" }), true);

config = setControllerBinding(config, 0, "UP", null);
frame = buildControllerFrame(config, {
  pressedKeys: new Set(["ArrowUp"]),
  inputBits: INPUT
});
assert.equal(frame.controllerMasks[0] & INPUT.UP, 0, "cleared mappings must stay cleared");

const rollerConfig = createDefaultControllerConfig();
rollerConfig.ports[0].type = "roller-x";
rollerConfig.ports[1].type = "roller-y";
frame = buildControllerFrame(rollerConfig, {
  pressedKeys: new Set(["KeyZ", "KeyX", "KeyQ", "KeyE"]),
  inputBits: INPUT
});
assert.equal(
  frame.controllerMasks[0],
  INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT,
  "Roller Port 1 left/right fire must remain independent"
);
assert.equal(
  frame.controllerMasks[1],
  INPUT.FIRE_LEFT | INPUT.FIRE_RIGHT,
  "Roller Port 2 left/right fire must remain independent"
);

rollerConfig.rollerMode = "joystick";
frame = buildControllerFrame(rollerConfig, {
  pressedKeys: new Set(["BracketRight", "Comma"]),
  inputBits: INPUT
});
assert.equal(
  frame.controllerMasks[0],
  INPUT.RIGHT | INPUT.UP,
  "Roller joystick mode must convert X/Y movement into Port 1 digital directions"
);
assert.deepEqual(frame.spinnerDeltas, [0, 0], "Roller joystick mode must not emit spinner ticks");

const wheelConfig = setControllerDeviceType(createDefaultControllerConfig(), 1, "wheel");
const wheelMarkup = buildWheelDeviceMarkup(wheelConfig);
assert.match(wheelMarkup, /PORT 1 · STEERING \+ PEDAL/);
assert.match(wheelMarkup, /PORT 2 · GEAR \+ KEYPAD/);
assert.match(wheelMarkup, /data-map-port="0"/, "Wheel controls must target Port 1");
assert.match(wheelMarkup, /data-map-port="1"/, "Companion joystick and keypad must target Port 2");
assert.equal(wheelConfig.ports[0].type, "wheel", "Steering Wheel must always occupy Port 1");
assert.equal(wheelConfig.ports[1].type, "standard", "Steering Wheel must preserve a standard companion controller on Port 2");
frame = buildControllerFrame(wheelConfig, {
  pressedKeys: new Set(["BracketRight", "KeyZ", "KeyW", "Numpad3"]),
  inputBits: INPUT
});
assert.equal(frame.spinnerDeltas[0], 6, "Steering Wheel ticks must use the Port 1 spinner channel");
assert.equal(frame.spinnerDeltas[1], 0);
assert.equal(frame.controllerMasks[0], INPUT.FIRE_LEFT, "The gas pedal must use Port 1 Left Fire (hardware pin 6)");
assert.equal(frame.controllerMasks[1], INPUT.UP | INPUT.KEYPAD_3, "Port 2 must retain gear and keypad input");

console.log("Controller profiles PASS");
