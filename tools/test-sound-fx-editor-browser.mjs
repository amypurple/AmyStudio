import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const mime = new Map([[".html", "text/html"], [".js", "text/javascript"], [".css", "text/css"], [".json", "application/json"], [".wasm", "application/wasm"]]);
const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let file = path.resolve(root, `.${requested}`);
    if (!file.startsWith(root)) throw new Error("outside root");
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    response.setHeader("Content-Type", mime.get(path.extname(file)) || "application/octet-stream");
    response.end(await readFile(file));
  } catch {
    response.statusCode = 404;
    response.end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const debugProbe = createServer();
await new Promise((resolve) => debugProbe.listen(0, "127.0.0.1", resolve));
const debugPort = debugProbe.address().port;
await new Promise((resolve) => debugProbe.close(resolve));
const browser = spawn(edgePath, [
  "--headless=new",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${path.resolve(`.tmp/sound-fx-browser-test-${process.pid}`)}`,
  "--disable-gpu",
  "--autoplay-policy=no-user-gesture-required",
  "about:blank"
], { stdio: "ignore", windowsHide: true });
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function debugTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
      const page = targets.find((target) => target.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await delay(100);
  }
  throw new Error("Edge debugging endpoint did not start.");
}

class Client {
  constructor(url) {
    this.id = 0;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

let client;
async function evaluate(expression) {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Browser evaluation failed.");
  return result.result?.value;
}
async function waitFor(expression, description) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

try {
  client = new Client(await debugTarget());
  await client.open();
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Page.navigate", { url: `http://127.0.0.1:${port}/studio/?sound-fx-browser-test=1` });
  await waitFor(`document.getElementById("studioLoading") === null`, "Studio startup");
  assert.equal(await evaluate(`document.querySelector(".panel-bar--cyan").querySelectorAll("button").length`), 0, "SOURCE title bar contains no controls");
  assert.ok(await evaluate(`document.getElementById("btnInspectSourceSounds").closest(".source-toolbar") !== null`), "SOUND belongs to the source toolbar");
  assert.notEqual(await evaluate(`getComputedStyle(document.getElementById("btnInspectSourceSounds")).display`), "none", "SOUND stays visible while the ASM panel is open");
  await evaluate(`(() => {
    const editor = document.getElementById("sourceEditor");
    editor.value = "sub start:\\n  text screen\\n";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("btnInspectSourceSounds").click();
  })()`);
  await waitFor(`document.querySelector(".sound-table-creator-modal")`, "sound table creator");
  await evaluate(`Array.from(document.querySelectorAll(".sound-table-creator-modal button")).find((button) => button.textContent === "New Tiny Song").click()`);
  await waitFor(`document.querySelector(".tiny-import-modal")`, "new Tiny song starter");
  assert.equal(await evaluate(`document.querySelector(".tiny-import-modal h3").textContent`), "New Tiny Song");
  assert.equal(await evaluate(`document.querySelectorAll(".tiny-import__pickers select:not([disabled])").length`), 2, "starter exposes two valid channels");
  assert.equal(await evaluate(`document.querySelector(".tiny-import-modal .graphics-editor-json-modal__actions button:last-child").disabled`), false, "starter is ready to insert");
  await evaluate(`document.querySelector(".tiny-import-modal .graphics-editor-json-modal__actions button:last-child").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer-modal")`, "new Tiny song opens in sequencer");
  assert.match(await evaluate(`document.getElementById("sourceEditor").value`), /play song MySong_song/, "new Tiny song is installed in the project");
  await evaluate(`document.querySelector('[aria-label="Close music sequencer"]').click()`);
  await waitFor(`!document.querySelector(".tiny-pair-sequencer-modal")`, "new Tiny song sequencer closes");
  assert.doesNotMatch(await evaluate(`document.querySelector(".sound-table-inspector-modal").textContent`), /should target/, "generated Tiny table uses canonical sound slots");
  await evaluate(`Array.from(document.querySelectorAll(".sound-workspace-tabs button")).find((button) => button.textContent === "New Tiny Song").click()`);
  await waitFor(`document.querySelector(".tiny-import-modal")`, "second Tiny song starter");
  assert.equal(await evaluate(`Array.from(document.querySelectorAll(".tiny-import-modal label")).find((label) => label.textContent.startsWith("Song name")).querySelector("input").value`), "MySong2", "a second starter receives a collision-free name");
  await evaluate(`document.querySelector('[aria-label="Close Tiny Sound import"]').click()`);
  await waitFor(`!document.querySelector(".tiny-import-modal")`, "second Tiny song starter closes");
  await evaluate(`document.querySelector('[aria-label="Close sound-table inspector"]').click()`);
  await waitFor(`!document.querySelector(".sound-table-inspector-modal")`, "new Tiny song inspector closes");
  await evaluate(`(() => {
    const editor = document.getElementById("sourceEditor");
    editor.value = "sub start:\\n  set sound table GameSoundTable areas 6\\n  text screen\\n";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("btnInspectSourceSounds").click();
  })()`);
  await waitFor(`document.querySelector(".sound-table-creator-modal")`, "sound table creator reopens");
  await evaluate(`Array.from(document.querySelectorAll(".sound-table-creator-modal button")).find((button) => button.textContent === "+ Sound effect").click()`);
  await waitFor(`document.querySelectorAll(".sound-table-creator__row").length === 3`, "third sound row");
  await evaluate(`Array.from(document.querySelectorAll(".sound-table-creator-modal button")).find((button) => button.textContent === "Create table").click()`);
  await waitFor(`!document.querySelector(".sound-table-creator-modal")`, "sound table creation");
  const created = await evaluate(`document.getElementById("sourceEditor").value`);
  assert.match(created, /sub start:\n  set sound table GameSoundTable areas 6\n  text screen/);
  assert.equal((created.match(/set sound table GameSoundTable areas 6/g) || []).length, 1, "repair must keep one setup command");
  assert.match(created, /dw MusicVoice1,\$702B ; music · slot 1/);
  assert.match(created, /dw SoundEffect1,\$705D ; sfx · slot 6/);
  assert.match(created, /dw SoundEffect2,\$705D ; sfx · slot 6/);
  await evaluate(`document.getElementById("btnInspectSourceSounds").click()`);
  await waitFor(`document.querySelector(".sound-table-inspector-modal")`, "created sound library");
  await evaluate(`Array.from(document.querySelectorAll(".sound-workspace-tabs button")).find((button) => button.textContent === "+ Sound").click()`);
  await waitFor(`document.querySelector(".sound-add-modal")`, "add sound dialog");
  await evaluate(`(() => {
    const name = document.querySelector('.sound-add-modal input');
    name.value = "ExtraSound";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    Array.from(document.querySelectorAll(".sound-add-modal button")).find((button) => button.textContent === "Add sound").click();
  })()`);
  await waitFor(`!document.querySelector(".sound-add-modal") && !document.querySelector(".sound-table-inspector-modal")`, "existing table update");
  const extended = await evaluate(`document.getElementById("sourceEditor").value`);
  assert.match(extended, /dw ExtraSound,\$705D ; sfx · slot 6/);
  assert.match(extended, /ExtraSound:\n    db \$50/);
  const tinyFixture = `TinyTable:\n    dw TestMusic_ch1,$702B\n    dw TestMusic_ch2,$7035\nTestMusic_ch1:\n    db $44\n    dw sndtiny_1\n    db $08,$02,$60,$19,$22,$1F,$00,$01,$FF\nTestMusic_ch2:\n    db $84\n    dw sndtiny_2\n    db $08,$02,$80,$19,$22,$13,$00,$01,$FF\n`;
  await evaluate(`(() => {
    const editor = document.getElementById("sourceEditor");
    editor.value = ${JSON.stringify(tinyFixture)};
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("btnInspectSourceSounds").click();
  })()`);
  await waitFor(`document.querySelector(".sound-table-inspector-modal")`, "Tiny Sound library");
  await evaluate(`(() => {
    Array.from(document.querySelectorAll(".sound-library-row")).find((item) => item.textContent.includes("TestMusic_ch1")).click();
    Array.from(document.querySelectorAll(".sound-library-transport button")).find((button) => button.textContent === "Sequencer").click();
  })()`);
  await waitFor(`document.querySelectorAll(".tiny-pair-sequencer__column > strong.is-editable").length === 2`, "Tiny channel instrument headings");
  assert.equal(await evaluate(`document.querySelector(".tiny-pair-sequencer__popover").hidden`), true, "popover starts hidden");

  // Inline instrument-envelope edit: click the channel heading, edit fields in the shared
  // popover, Apply, and verify both the popover's own byte preview and the Amy source text.
  await evaluate(`document.querySelectorAll(".tiny-pair-sequencer__column > strong.is-editable")[0].click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__popover").hidden === false`, "instrument popover open");
  assert.match(await evaluate(`document.querySelector(".tiny-pair-sequencer__popover-body code").textContent`), /^\$02,\$60,\$19,\$22$/);
  await evaluate(`(() => {
    const body = document.querySelector(".tiny-pair-sequencer__popover-body");
    const input = (name) => Array.from(body.querySelectorAll("label")).find((label) => label.firstChild.textContent === name).querySelector("input,select");
    input("Volume").value = "12";
    input("Step").value = "2";
    input("Count").value = "15";
    input("First").value = "4";
    input("Every").value = "16";
  })()`);
  await evaluate(`Array.from(document.querySelectorAll(".tiny-pair-sequencer__popover-actions button")).find((button) => button.textContent === "Apply").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__popover").hidden === true`, "instrument popover closes after apply");
  assert.match(await evaluate(`document.getElementById("sourceEditor").value`), /db \$08,\$02,\$30,\$2F,\$04,\$1F/);

  // Inline note-pitch edit: click the one plain-note block, change its pitch, cancel via
  // Escape (must restore the block's original text AND leave the Amy source untouched),
  // then re-open and Apply for real.
  await waitFor(`document.querySelector(".tiny-pair-sequencer__block.is-editable")`, "editable note block");
  const originalNoteText = await evaluate(`document.querySelector(".tiny-pair-sequencer__block.is-editable").textContent`);
  const beforeCancelApplySource = await evaluate(`document.getElementById("sourceEditor").value`);
  await evaluate(`document.querySelector(".tiny-pair-sequencer__block.is-editable").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__popover").hidden === false`, "note popover open");
  const liveEditedText = await evaluate(`(() => {
    const select = document.querySelector(".tiny-pair-sequencer__popover-body select");
    const otherOption = Array.from(select.options).find((option) => option.value !== select.value);
    select.value = otherOption.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    return document.querySelector(".tiny-pair-sequencer__block.is-editable").textContent;
  })()`);
  assert.notEqual(liveEditedText, originalNoteText, "selecting a different pitch must update the block optimistically before Apply");
  await evaluate(`document.querySelector(".tiny-pair-sequencer__popover").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__popover").hidden === true`, "note popover closes on Escape");
  assert.equal(await evaluate(`document.querySelector(".tiny-pair-sequencer__block.is-editable").textContent`), originalNoteText, "Escape must restore the block's original text");
  assert.equal(await evaluate(`document.getElementById("sourceEditor").value`), beforeCancelApplySource, "Escape/Cancel must not touch the Amy source");
  await evaluate(`document.querySelector(".tiny-pair-sequencer__block.is-editable").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__popover").hidden === false`, "note popover reopen");
  await evaluate(`(() => {
    const select = document.querySelector(".tiny-pair-sequencer__popover-body select");
    const otherOption = Array.from(select.options).find((option) => option.value !== select.value);
    select.value = otherOption.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await evaluate(`Array.from(document.querySelectorAll(".tiny-pair-sequencer__popover-actions button")).find((button) => button.textContent === "Apply").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__popover").hidden === true`, "note popover closes after apply");
  const afterApplySource = await evaluate(`document.getElementById("sourceEditor").value`);
  assert.notEqual(afterApplySource, beforeCancelApplySource, "applying a pitch edit must change the Amy source");

  // Playback after edits must use freshly decoded events, not any pre-edit cache: reopening
  // the note editor right after Apply must reflect the new code, and Play must not throw.
  await evaluate(`document.querySelector(".tiny-pair-sequencer__block.is-editable").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__popover").hidden === false`, "note popover reopen after apply");
  const reopenedBlockText = await evaluate(`document.querySelector(".tiny-pair-sequencer__block.is-editable").textContent`);
  assert.equal(reopenedBlockText, await evaluate(`document.querySelector(".tiny-pair-sequencer__popover-body select option:checked").textContent`).then((text) => text.split(" · ")[0]), "reopened editor must show the just-applied pitch, not stale data");
  await evaluate(`document.querySelector(".tiny-pair-sequencer__popover-actions button:nth-child(2)").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__popover").hidden === true`, "note popover closes on cancel");
  await evaluate(`document.querySelector('[aria-label="Play complete song"]').click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__playhead").hidden === false`, "playback starts using post-edit decoded events");
  await evaluate(`Array.from(document.querySelectorAll(".graphics-editor-json-modal__actions button")).find((button) => button.textContent === "■ Stop").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__playhead").hidden === true`, "playback stop clears playhead");

  await evaluate(`document.querySelector('[aria-label="Close music sequencer"]').click()`);
  await waitFor(`!document.querySelector(".tiny-pair-sequencer-modal")`, "Tiny sequencer close");
  await evaluate(`document.querySelector('[aria-label="Close sound-table inspector"]').click()`);
  await waitFor(`!document.querySelector(".sound-table-inspector-modal")`, "Tiny library close");
  const terminalFixture = `SoundTable:\n    dw EndOnly,$703F\nEndOnly:\n    db $50\n`;
  await evaluate(`(() => {
    const editor = document.getElementById("sourceEditor");
    editor.value = ${JSON.stringify(terminalFixture)};
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("btnInspectSourceSounds").click();
  })()`);
  await waitFor(`document.querySelector(".sound-table-inspector-modal")`, "terminal-only sound library");
  await evaluate(`(() => {
    const row = Array.from(document.querySelectorAll(".sound-library-row")).find((item) => item.textContent.includes("EndOnly"));
    row.click();
    Array.from(document.querySelectorAll(".sound-library-transport button")).find((button) => button.textContent === "Edit").click();
  })()`);
  await waitFor(`document.querySelector(".sound-sequence-editor-modal")`, "terminal-only Sound FX editor");
  await evaluate(`(() => {
    const input = document.querySelector('[data-sound-field="frames"] input');
    input.value = "9";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll(".sound-command-builder__actions button")).find((button) => button.textContent === "Apply changes").disabled`), true, "terminal commands cannot be overwritten by the composer");
  assert.match(await evaluate(`document.querySelector(".sound-sequence-editor__events").textContent`), /End/);
  await evaluate(`Array.from(document.querySelectorAll(".sound-sequence-editor-modal button")).find((button) => button.textContent === "Cancel").click()`);
  await waitFor(`!document.querySelector(".sound-sequence-editor-modal")`, "terminal-only editor close");
  await evaluate(`document.querySelector('[aria-label="Close sound-table inspector"]').click()`);
  await waitFor(`!document.querySelector(".sound-table-inspector-modal")`, "terminal-only library close");
  const fixture = `SoundTable:\n    dw TestSfx,$703F\nTestSfx:\n    db $40,$6B,$00,$02,$50\n`;
  await evaluate(`(() => {
    const editor = document.getElementById("sourceEditor");
    editor.value = ${JSON.stringify(fixture)};
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("btnInspectSourceSounds").click();
  })()`);
  await waitFor(`document.querySelector(".sound-table-inspector-modal")`, "sound library");
  await evaluate(`(() => {
    const row = Array.from(document.querySelectorAll(".sound-library-row")).find((item) => item.textContent.includes("TestSfx"));
    row.click();
    Array.from(document.querySelectorAll(".sound-library-transport button")).find((button) => button.textContent === "Edit").click();
  })()`);
  await waitFor(`document.querySelector(".sound-sequence-editor-modal")`, "Sound FX editor");
  assert.equal(await evaluate(`document.querySelector('[data-sound-field="frames"] input').value`), "2");
  await evaluate(`(() => {
    const set = (field, value) => {
      const input = document.querySelector('[data-sound-field="' + field + '"] input, [data-sound-field="' + field + '"] select');
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("frames", "9");
    set("pitch sweep", "On");
    set("pitch step", "3");
    set("pitch every", "2");
    set("pitch first", "1");
    Array.from(document.querySelectorAll(".sound-command-builder__actions button")).find((button) => button.textContent === "Apply changes").click();
  })()`);
  await waitFor(`document.querySelector(".sound-sequence-editor__events").textContent.includes("9 sweep counts") && document.querySelector(".sound-sequence-editor__events").textContent.includes("17 rendered frames") && document.querySelector(".sound-sequence-editor__events").textContent.includes("freq +3 every 2 frames")`, "replaced command");
  await evaluate(`Array.from(document.querySelectorAll(".sound-sequence-editor__action-group button")).find((button) => button.textContent === "Undo").click()`);
  await waitFor(`document.querySelector('[data-sound-field="frames"] input').value === "2"`, "undo command edit");
  await evaluate(`Array.from(document.querySelectorAll(".sound-sequence-editor__action-group button")).find((button) => button.textContent === "Redo").click()`);
  await waitFor(`document.querySelector('[data-sound-field="frames"] input').value === "9"`, "redo command edit");
  await evaluate(`Array.from(document.querySelectorAll(".sound-sequence-editor__action-group button")).find((button) => button.textContent === "Save").click()`);
  await waitFor(`!document.querySelector(".sound-sequence-editor-modal")`, "editor save");
  const saved = await evaluate(`document.getElementById("sourceEditor").value`);
  assert.match(saved, /db \$41,\$6B,\$00,\$09,\$21,\$03,\$50/, "Replace must write the edited BIOS command into Amy source");
  console.log("Sound FX editor browser behavior tests passed.");
} finally {
  if (client) {
    try { await client.send("Browser.close"); } catch { browser.kill(); }
  } else {
    browser.kill();
  }
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}
