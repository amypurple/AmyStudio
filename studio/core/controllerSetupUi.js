import {
  CONTROLLER_ACTIONS,
  CONTROLLER_DEVICE_TYPES,
  SUPER_ACTION_FIRE_ROW,
  buildControllerFrame,
  createDefaultControllerConfig,
  describeControllerBinding,
  isControllerActionVisible,
  loadControllerConfig,
  saveControllerConfig,
  setControllerBinding,
  setControllerDeviceType
} from "./controllerProfiles.js?v=20260805-steering-pair";

function ensureStyles() {
  if (document.querySelector("#controllerSetupStyles")) return;
  const style = document.createElement("style");
  style.id = "controllerSetupStyles";
  style.textContent = `
    .controller-setup { width:min(760px,96vw); max-height:94vh; box-sizing:border-box; padding:0; overflow:hidden; color:#eef4f5; background:#0b1014; border:1px solid #40535e; }
    .controller-setup::backdrop { background:rgba(0,0,0,.78); }
    .controller-setup__head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 14px; border-bottom:1px solid #293942; }
    .controller-setup__head h2 { margin:0; color:#65dbef; font:700 16px/1.2 ui-monospace,Consolas,monospace; letter-spacing:.08em; }
    .controller-setup__close { width:34px; height:32px; padding:0; font-size:17px; }
    .controller-setup__body { display:grid; grid-template-columns:minmax(176px,190px) minmax(0,1fr); gap:14px; padding:14px; max-height:calc(94vh - 57px); overflow:auto; }
    .controller-setup__sidebar { min-width:0; display:grid; align-content:start; gap:10px; }
    .controller-setup__ports { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
    .controller-setup__ports button[aria-selected=true] { color:#081014; background:#65dbef; }
    .controller-setup label { min-width:0; display:grid; gap:4px; color:#9babb4; font:11px/1.3 ui-monospace,Consolas,monospace; text-transform:uppercase; letter-spacing:.06em; }
    .controller-setup [hidden] { display:none !important; }
    .controller-setup select,.controller-setup input { width:100%; min-width:0; box-sizing:border-box; }
    .controller-setup input[type="range"] { margin-inline:0; }
    .controller-setup select { padding-inline:8px 22px; font-size:11px; letter-spacing:0; }
    .controller-setup__saved { color:#72d69b; font:11px/1.4 ui-monospace,Consolas,monospace; }
    .controller-setup__note { color:#90a1aa; font:11px/1.45 ui-monospace,Consolas,monospace; }
    .controller-setup__main { min-width:0; }
    .controller-setup__device { position:relative; min-height:425px; padding:20px 54px; box-sizing:border-box; border:1px solid #273740; background:radial-gradient(circle at 50% 20%,#26313a,#111820 65%); overflow:hidden; }
    .controller-setup__shell { position:relative; display:grid; grid-template-columns:minmax(0,126px) minmax(0,1fr); gap:22px; width:100%; min-width:0; min-height:330px; box-sizing:border-box; padding:26px 25px; border:4px solid #78838b; border-radius:38px 38px 20px 20px; background:linear-gradient(145deg,#262c30,#090c0e 72%); box-shadow:inset 0 0 0 2px #080a0b,0 12px 22px #0009; }
    .controller-setup__fire { position:absolute; top:90px; width:45px; min-height:118px; padding:7px 4px; border:3px solid #7e898f; border-radius:16px; color:#f4f4e7; background:#24292d; font-size:10px; }
    .controller-setup__fire--left { left:-51px; }
    .controller-setup__fire--right { right:-51px; }
    .controller-setup__stick { display:grid; grid-template-columns:repeat(3,38px); grid-template-rows:repeat(3,38px); align-content:start; justify-content:center; padding-top:13px; }
    .controller-setup__stick button { padding:0; min-width:0; background:#dadbd3; color:#101416; border-color:#f5f5ea; }
    .controller-setup__stick .up { grid-column:2; }
    .controller-setup__stick .left { grid-column:1; grid-row:2; }
    .controller-setup__stick .disc { grid-column:2; grid-row:2; border-radius:50%; background:radial-gradient(circle at 35% 30%,#fff,#9da2a3 58%,#4f5558); }
    .controller-setup__stick .right { grid-column:3; grid-row:2; }
    .controller-setup__stick .down { grid-column:2; grid-row:3; }
    .controller-setup__keypad { min-width:0; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; align-content:start; }
    .controller-setup__keypad button { min-height:49px; padding:4px; font-size:18px; background:#d9ddd8; color:#111; border-color:#f4f5ef; }
    .controller-setup__super { grid-column:1 / -1; min-width:0; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
    .controller-setup__super button { width:100%; min-width:0; padding-inline:6px; overflow:hidden; }
    .controller-setup__super .yellow { color:#191300; background:#f0d632; }
    .controller-setup__super .red { color:#fff; background:#cb3f3f; }
    .controller-setup__super .purple { color:#fff; background:#8b56b7; }
    .controller-setup__super .blue { color:#07192c; background:#55aaff; }
    .controller-setup__spinner { grid-column:1 / -1; min-width:0; display:grid; grid-template-columns:minmax(0,1fr) 108px minmax(0,1fr); gap:10px; align-items:center; }
    .controller-setup__spinner button { width:100%; min-width:0; padding-inline:6px; overflow:hidden; }
    .controller-setup__spinner-core { aspect-ratio:1; border-radius:50%; border:7px solid #adb6b9; background:radial-gradient(circle at 38% 32%,#eef1ed,#6e777b 55%,#171c20 57%); }
    .controller-setup__roller-fire-bank { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; margin-bottom:10px; }
    .controller-setup__roller-fire-bank button { min-width:0; padding:7px 4px; color:#eef4f5; background:#18232a; }
    .controller-setup__roller-fire-bank strong { display:block; color:#65dbef; font-size:10px; }
    .controller-setup__binding { display:block; margin-top:3px; color:#377485; font:9px/1.1 ui-monospace,Consolas,monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .controller-setup button.is-capturing { outline:3px solid #ffd36a; box-shadow:0 0 14px #ffd36a99; }
    .controller-setup__capture { margin-top:9px; min-height:38px; padding:8px; border:1px solid #3d505a; color:#ffd36a; background:#101820; font:12px/1.4 ui-monospace,Consolas,monospace; }
    .controller-setup__actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:9px; }
    .controller-setup__actions button { flex:1 1 auto; }
    @media(max-height:700px) and (min-width:651px) {
      .controller-setup__device { min-height:0; padding-block:12px; }
      .controller-setup__shell { min-height:0; padding-block:20px; }
      .controller-setup__spinner { grid-template-columns:minmax(0,1fr) 96px minmax(0,1fr); }
      .controller-setup__capture { min-height:32px; margin-top:6px; padding:6px 8px; }
    }

    @media(max-width:650px) {

      .controller-setup__body { grid-template-columns:1fr; }
      .controller-setup__device { padding:16px 48px; }
      .controller-setup__shell { grid-template-columns:minmax(0,105px) minmax(0,1fr); gap:14px; padding:20px 16px; }
      .controller-setup__keypad { gap:5px; }
    }
  `;
  document.head.append(style);
}

function buttonMarkup(actionId, label, port, targetPort = null) {
  const bindings = port.bindings[actionId] || [];
  const description = bindings.length
    ? bindings.map(describeControllerBinding).join(" / ")
    : "Unassigned";
  const portAttribute = Number.isInteger(targetPort) ? ` data-map-port="${targetPort}"` : "";
  return `<button type="button" data-map-action="${actionId}"${portAttribute} title="${label}: ${description}">${label}<span class="controller-setup__binding">${description}</span></button>`;
}

function rollerFireMarkup(config) {
  const controls = [
    [0, "FIRE_LEFT", "P1", "LEFT FIRE"],
    [0, "FIRE_RIGHT", "P1", "RIGHT FIRE"],
    [1, "FIRE_LEFT", "P2", "LEFT FIRE"],
    [1, "FIRE_RIGHT", "P2", "RIGHT FIRE"]
  ];
  return `<div class="controller-setup__roller-fire-bank">${controls.map(([targetPort, action, portLabel, label]) =>
    buttonMarkup(action, `<strong>${portLabel}</strong>${label}`, config.ports[targetPort], targetPort)
  ).join("")}</div>`;
}

function deviceMarkup(port, { hideFire = false } = {}) {
  const arrows = [
    ["UP", "&#x2191;", "up"],
    ["LEFT", "&#x2190;", "left"],
    ["RIGHT", "&#x2192;", "right"],
    ["DOWN", "&#x2193;", "down"]
  ].map(([id, label, className]) => {
    return buttonMarkup(id, label, port).replace("<button ", `<button class="${className}" `);
  }).join("");
  const keypad = ["1","2","3","4","5","6","7","8","9","ASTERISK","0","HASH"]
    .map((key) => buttonMarkup(`KEYPAD_${key}`, key === "ASTERISK" ? "*" : key === "HASH" ? "#" : key, port))
    .join("");
  const superButtons = port.type === "super-action"
    ? `<div class="controller-setup__super">${SUPER_ACTION_FIRE_ROW.map(({ action, label, className }) => {
        return buttonMarkup(action, label, port).replace("<button ", `<button class="${className}" `);
      }).join("")}</div>`
    : "";
  const spinner = port.type !== "standard"
    ? `<div class="controller-setup__spinner">${buttonMarkup("SPINNER_NEG", "&#x21BA;", port)}<div class="controller-setup__spinner-core" aria-hidden="true"></div>${buttonMarkup("SPINNER_POS", "&#x21BB;", port)}</div>`
    : "";
  return `
    <div class="controller-setup__shell">
      ${port.type === "super-action" || hideFire ? "" : buttonMarkup("FIRE_LEFT", "LEFT<br>FIRE", port).replace("<button ", '<button class="controller-setup__fire controller-setup__fire--left" ')}
      ${port.type === "super-action" || hideFire ? "" : buttonMarkup("FIRE_RIGHT", port.type === "wheel" ? "GAS<br>PEDAL" : "RIGHT<br>FIRE", port).replace("<button ", '<button class="controller-setup__fire controller-setup__fire--right" ')}
      <div class="controller-setup__stick">${arrows}<div class="disc" aria-hidden="true"></div></div>
      <div class="controller-setup__keypad">${keypad}</div>
      ${superButtons}
      ${spinner}
    </div>`;
}

function wheelDeviceMarkup(port) {
  const pedal = buttonMarkup("FIRE_LEFT", "GAS<br>PEDAL", port)
    .replace("<button ", '<button class="controller-setup__fire controller-setup__fire--right" ');
  const spinner = '<div class="controller-setup__spinner">' +
    buttonMarkup("SPINNER_NEG", "&#x21BA;", port) +
    '<div class="controller-setup__spinner-core" aria-hidden="true"></div>' +
    buttonMarkup("SPINNER_POS", "&#x21BB;", port) +
    "</div>";
  return '<div class="controller-setup__shell">' + pedal +
    '<div class="controller-setup__note">STEERING WHEEL · PORT 1<br>Pedal = Left Fire. Use PORT 2 for gears and keypad.</div>' +
    spinner + "</div>";
}

function connectedGamepads(gamepads = navigator.getGamepads?.() || []) {
  return [...gamepads].filter(Boolean);
}

export function createControllerSetupUi({
  inputBits,
  storage = globalThis.localStorage,
  getGamepads = () => navigator.getGamepads?.() || [],
  onClose = () => {}
} = {}) {
  ensureStyles();
  let config = loadControllerConfig(storage);
  let portIndex = 0;
  let capturePortIndex = 0;
  let captureAction = "";
  let captureFrame = 0;
  const pressedKeys = new Set();

  const dialog = document.createElement("dialog");
  dialog.className = "controller-setup";
  dialog.innerHTML = `
    <div class="controller-setup__head"><h2>CONTROLLER SETUP</h2><button class="controller-setup__close" data-close type="button" title="Close" aria-label="Close">&#x2715;</button></div>
    <div class="controller-setup__body">
      <aside class="controller-setup__sidebar">
        <div class="controller-setup__ports"><button type="button" data-port="0">PORT 1</button><button type="button" data-port="1">PORT 2</button></div>
        <label>Controller type<select data-field="type"></select></label>
        <label data-roller-mode>Roller mode<select data-field="rollerMode"><option value="trackball">Trackball</option><option value="joystick">Joystick</option></select></label>
        <label>Gamepad<select data-field="gamepad"></select></label>
        <label data-spinner-setting>Wheel / roller sensitivity<input data-field="sensitivity" type="range" min="1" max="32"></label>
        <div class="controller-setup__saved">Saved automatically in this browser.</div>
        <div class="controller-setup__note" data-field="note"></div>
        <div class="controller-setup__actions"><button type="button" data-clear>Clear selected</button><button type="button" data-reset>Reset port</button></div>
      </aside>
      <main class="controller-setup__main">
        <div class="controller-setup__device" data-field="device"></div>
        <div class="controller-setup__capture" data-field="capture">Click a physical control, then press a keyboard key or move/press a connected gamepad control.</div>
      </main>
    </div>`;
  document.body.append(dialog);

  const field = (name) => dialog.querySelector(`[data-field="${name}"]`);
  const typeSelect = field("type");
  for (const type of CONTROLLER_DEVICE_TYPES.filter(({ id }) => id !== "roller-y")) {
    typeSelect.add(new Option(type.id === "roller-x" ? "Roller Controller (both ports)" : type.label, type.id));
  }

  function persist() {
    config = saveControllerConfig(config, storage);
  }

  function cancelCapture(message = "Mapping cancelled.") {
    captureAction = "";
    cancelAnimationFrame(captureFrame);
    captureFrame = 0;
    field("capture").textContent = message;
    dialog.querySelectorAll(".is-capturing").forEach((button) => button.classList.remove("is-capturing"));
  }

  function refreshGamepads() {
    const select = field("gamepad");
    const port = config.ports[portIndex];
    select.replaceChildren(new Option("Keyboard only / auto", ""));
    for (const gamepad of connectedGamepads(getGamepads())) {
      select.add(new Option(`${gamepad.index}: ${gamepad.id}`, String(gamepad.index)));
    }
    const selected = connectedGamepads(getGamepads()).find((gamepad) => {
      return port.gamepadId ? gamepad.id === port.gamepadId : gamepad.index === port.gamepadIndex;
    });
    select.value = selected ? String(selected.index) : "";
  }

  function render() {
    const port = config.ports[portIndex];
    for (const button of dialog.querySelectorAll("[data-port]")) {
      button.setAttribute("aria-selected", String(Number(button.dataset.port) === portIndex));
    }
    typeSelect.value = port.type === "roller-y" ? "roller-x" : port.type;
    const roller = port.type === "roller-x" || port.type === "roller-y";
    const wheelCompanion = portIndex === 1 && config.ports[0].type === "wheel";
    typeSelect.disabled = wheelCompanion;
    field("rollerMode").value = config.rollerMode || "trackball";
    dialog.querySelector("[data-roller-mode]").hidden = !roller;
    field("sensitivity").value = String(port.sensitivity);
    dialog.querySelector("[data-spinner-setting]").hidden = port.type === "standard";
    field("note").textContent = roller
      ? config.rollerMode === "joystick"
        ? "Joystick mode converts Roller movement into Port 1 digital directions for games such as Centipede and Jeepers Creepers. No spinner ticks are sent."
        : "Trackball mode sends native P1 horizontal and P2 vertical spinner ticks for Slither and Victory. All four fire inputs remain independent."
      : port.type === "wheel"
        ? "Steering and the gas pedal use Port 1. Port 2 supplies the joystick, UP/DOWN gear selection, keypad, and menu input."
        : wheelCompanion
          ? "Steering Wheel companion controller: UP/DOWN commonly select gears; its keypad handles game and menu options."
        : port.type === "super-action"
          ? "Yellow, red, purple, and blue fire buttons share one row. The speed roller is available below them."
          : "Standard joystick, two side fire buttons, and the 12-key keypad.";
    field("device").innerHTML = port.type === "wheel"
      ? wheelDeviceMarkup(port)
      : roller
        ? rollerFireMarkup(config) + deviceMarkup(port, { hideFire: true })
        : deviceMarkup(port);
    refreshGamepads();
  }

  function saveCapturedBinding(binding, gamepad = null) {
    config = setControllerBinding(config, capturePortIndex, captureAction, binding);
    if (gamepad) {
      config.ports[capturePortIndex].gamepadId = gamepad.id;
      config.ports[capturePortIndex].gamepadIndex = gamepad.index;
    }
    persist();
    const label = CONTROLLER_ACTIONS.find(({ id }) => id === captureAction)?.label || captureAction;
    cancelCapture(`${label} mapped to ${describeControllerBinding(binding)}.`);
    render();
  }

  function pollGamepadCapture() {
    if (!captureAction) return;
    for (const gamepad of connectedGamepads(getGamepads())) {
      const buttonIndex = gamepad.buttons.findIndex((button) => button.pressed);
      if (buttonIndex >= 0) {
        saveCapturedBinding({ kind: "button", index: buttonIndex }, gamepad);
        return;
      }
      const axisIndex = gamepad.axes.findIndex((value) => Math.abs(value) >= 0.65);
      if (axisIndex >= 0) {
        saveCapturedBinding({
          kind: "axis",
          index: axisIndex,
          direction: gamepad.axes[axisIndex] < 0 ? -1 : 1
        }, gamepad);
        return;
      }
    }
    captureFrame = requestAnimationFrame(pollGamepadCapture);
  }

  function beginCapture(actionId, button, targetPort = portIndex) {
    cancelCapture("");
    captureAction = actionId;
    capturePortIndex = targetPort === 1 ? 1 : 0;
    button.classList.add("is-capturing");
    const label = CONTROLLER_ACTIONS.find(({ id }) => id === actionId)?.label || actionId;
    field("capture").textContent = `Mapping P${capturePortIndex + 1} ${label}: press a key, gamepad button, or move an axis. Escape cancels.`;
    captureFrame = requestAnimationFrame(pollGamepadCapture);
  }

  dialog.addEventListener("click", (event) => {
    const mapButton = event.target.closest("[data-map-action]");
    if (mapButton) {
      const targetPort = mapButton.hasAttribute("data-map-port")
        ? Number(mapButton.dataset.mapPort)
        : portIndex;
      beginCapture(mapButton.dataset.mapAction, mapButton, targetPort);
      return;
    }
    const portButton = event.target.closest("[data-port]");
    if (portButton) {
      cancelCapture();
      portIndex = Number(portButton.dataset.port) || 0;
      render();
    }
  });
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    cancelCapture("Controller setup closed.");
    onClose();
  });
  typeSelect.addEventListener("change", () => {
    const type = typeSelect.value;
    config = setControllerDeviceType(config, portIndex, type);
    if (type === "roller-x" || type === "wheel") {
      portIndex = 0;
    }
    persist();
    render();
  });
  field("rollerMode").addEventListener("change", () => {
    config.rollerMode = field("rollerMode").value === "joystick" ? "joystick" : "trackball";
    persist();
    render();
  });
  field("gamepad").addEventListener("change", () => {
    const selected = connectedGamepads(getGamepads()).find((gamepad) => String(gamepad.index) === field("gamepad").value);
    config.ports[portIndex].gamepadId = selected?.id || "";
    config.ports[portIndex].gamepadIndex = selected?.index ?? portIndex;
    persist();
  });
  field("sensitivity").addEventListener("input", () => {
    config.ports[portIndex].sensitivity = Number(field("sensitivity").value) || 6;
    persist();
  });
  dialog.querySelector("[data-clear]").addEventListener("click", () => {
    if (!captureAction) {
      field("capture").textContent = "Click a control first, then Clear selected.";
      return;
    }
    const actionId = captureAction;
    config = setControllerBinding(config, capturePortIndex, actionId, null);
    persist();
    cancelCapture("Mapping cleared.");
    render();
  });
  dialog.querySelector("[data-reset]").addEventListener("click", () => {
    const defaults = createDefaultControllerConfig();
    config.ports[portIndex] = defaults.ports[portIndex];
    persist();
    cancelCapture("Port reset to defaults.");
    render();
  });
  window.addEventListener("gamepadconnected", () => { if (dialog.open) render(); });
  window.addEventListener("gamepaddisconnected", () => { if (dialog.open) render(); });
  window.addEventListener("keydown", (event) => {
    if (!captureAction || !dialog.open) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.code === "Escape") {
      cancelCapture();
      return;
    }
    saveCapturedBinding({ kind: "key", code: event.code });
  }, true);

  function open(selectedPort = 0) {
    portIndex = selectedPort === 1 ? 1 : 0;
    cancelCapture("Click a physical control, then press a keyboard key or move/press a connected gamepad control.");
    render();
    if (!dialog.open) dialog.showModal();
  }

  function getFrameInput(keys = pressedKeys) {
    return buildControllerFrame(config, {
      pressedKeys: keys,
      gamepads: getGamepads(),
      inputBits
    });
  }

  function isKeyMapped(code) {
    return config.ports.some((port) => {
      return CONTROLLER_ACTIONS.some((action) => {
        if (!isControllerActionVisible(port.type, action)) return false;
        return (port.bindings[action.id] || []).some((binding) => binding.kind === "key" && binding.code === code);
      });
    });
  }

  return {
    open,
    getConfig: () => config,
    getFrameInput,
    isKeyMapped,
    isCapturing: () => Boolean(captureAction && dialog.open)
  };
}
