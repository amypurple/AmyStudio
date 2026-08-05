import assert from "node:assert/strict";
import {
  consumeMouseSpinnerTicks,
  mapMouseRollerJoystickMask,
  mapMouseSpinnerMovement,
  mouseButtonToFireMask,
  resolveMouseFireTarget
} from "../studio/core/romTestRecorderUi.js";

const roller = {
  ports: [
    { type: "roller-x", sensitivity: 6 },
    { type: "roller-y", sensitivity: 12 }
  ]
};

assert.deepEqual(mapMouseSpinnerMovement(roller, 0, 5, -3), [5, -6]);
assert.deepEqual(mapMouseSpinnerMovement(roller, 1, 5, -3), [5, -6],
  "Roller mouse input must drive both ports regardless of the selected setup tab.");
const wheelMovement = {
  ports: [{ type: "wheel", sensitivity: 3 }, { type: "standard", sensitivity: 6 }]
};
assert.deepEqual(mapMouseSpinnerMovement(wheelMovement, 0, 8, 20), [4, 0]);
assert.deepEqual(mapMouseSpinnerMovement(wheelMovement, 1, 8, 20), [4, 0],
  "Steering Wheel mouse movement must always target Port 1.");
assert.deepEqual(mapMouseSpinnerMovement({
  ports: [{ type: "standard", sensitivity: 6 }, { type: "super-action", sensitivity: 6 }]
}, 1, -7, 20), [0, -7]);
assert.deepEqual(mapMouseSpinnerMovement(roller, 0, Number.NaN, undefined), [0, 0]);
const fireBits = { FIRE_LEFT: 0x20, FIRE_RIGHT: 0x10 };
assert.equal(mouseButtonToFireMask(0, fireBits), 0x20);
assert.equal(mouseButtonToFireMask(2, fireBits), 0x10);
assert.equal(mouseButtonToFireMask(1, fireBits), 0);
const wheel = { ports: [{ type: "wheel", sensitivity: 6 }, { type: "standard", sensitivity: 6 }] };
assert.deepEqual(
  resolveMouseFireTarget(0, wheel, 1, fireBits),
  { portIndex: 0, mask: fireBits.FIRE_LEFT },
  "Steering Wheel left mouse must drive the physical Port 1 pedal"
);
assert.deepEqual(
  resolveMouseFireTarget(2, wheel, 0, fireBits),
  { portIndex: 0, mask: fireBits.FIRE_RIGHT },
  "Steering Wheel right mouse may expose the independent Port 1 Right Fire for testing"
);
assert.deepEqual(
  resolveMouseFireTarget(0, roller, 0, fireBits),
  { portIndex: 1, mask: fireBits.FIRE_RIGHT },
  "Roller left mouse must drive Victory Fire on the lower-right P2 action button"
);
assert.deepEqual(
  resolveMouseFireTarget(2, roller, 0, fireBits),
  { portIndex: 1, mask: fireBits.FIRE_LEFT },
  "Roller right mouse must drive Victory Thrust on the upper-right P2 action button"
);
const rollerJoystick = { ...roller, rollerMode: "joystick" };
assert.deepEqual(
  resolveMouseFireTarget(0, rollerJoystick, 1, fireBits),
  { portIndex: 0, mask: fireBits.FIRE_LEFT },
  "Roller joystick mode mouse fire must behave as a Port 1 joystick"
);
assert.deepEqual(mapMouseSpinnerMovement(rollerJoystick, 0, 5, -3), [0, 0],
  "Roller joystick mode must suppress native spinner ticks");
assert.equal(
  mapMouseRollerJoystickMask(
    rollerJoystick,
    5,
    -3,
    { LEFT: 1, RIGHT: 2, UP: 4, DOWN: 8 }
  ),
  2 | 4,
  "Mouse right/up movement must become Port 1 digital directions"
);
assert.deepEqual(
  resolveMouseFireTarget(0, { ports: [{ type: "standard" }, { type: "standard" }] }, 0, fireBits),
  { portIndex: 0, mask: fireBits.FIRE_LEFT },
  "Standard controller mouse mapping must remain unchanged"
);
assert.deepEqual(consumeMouseSpinnerTicks(300), { delta: 127, remainder: 0 },
  "A large movement must saturate once, not leak into later frames.");
assert.deepEqual(consumeMouseSpinnerTicks(-300), { delta: -127, remainder: 0 });
assert.deepEqual(consumeMouseSpinnerTicks(0.6), { delta: 0, remainder: 0.6 });
assert.deepEqual(consumeMouseSpinnerTicks(1.6), { delta: 1, remainder: 0.6000000000000001 });

console.log("Mouse spinner input PASS");
