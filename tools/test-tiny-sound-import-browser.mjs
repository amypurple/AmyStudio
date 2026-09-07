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
  `--user-data-dir=${path.resolve(`.tmp/tiny-import-browser-test-${process.pid}`)}`,
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

const candidateAsm = `music_ch1_A:\n  db $44\n  dw sndtiny_1\n  db 8\n  db $02,$60,$19,$22\n  db $28,$00,$01,$FF\n\nmusic_ch2_A:\n  db $84\n  dw sndtiny_2\n  db 8\n  db $02,$50,$13,$33\n  db $23,$00,$01,$FF\n`;

try {
  client = new Client(await debugTarget());
  await client.open();
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Page.navigate", { url: `http://127.0.0.1:${port}/studio/?tiny-import-browser-test=1` });
  await waitFor(`document.getElementById("studioLoading") === null`, "Studio startup");

  // Start from an empty project (no sound table yet) so the "no table" auto-wiring path
  // is what gets exercised end to end.
  await evaluate(`(() => {
    const editor = document.getElementById("sourceEditor");
    editor.value = "sub start:\\n  text screen\\n  screen on\\nMainLoop:\\n  wait 1 frames\\n  goto MainLoop\\nend sub\\n";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("btnInspectSourceSounds").click();
  })()`);
  await waitFor(`document.querySelector(".sound-table-creator-modal")`, "sound table creator (no table yet)");
  await evaluate(`Array.from(document.querySelectorAll(".sound-table-creator-modal button")).find((button) => button.textContent === "Import Tiny Sound instead").click()`);
  await waitFor(`document.querySelector(".tiny-import-modal")`, "Tiny Sound import dialog");

  await evaluate(`(() => {
    const textarea = document.querySelector(".tiny-import-modal textarea");
    textarea.value = ${JSON.stringify(candidateAsm)};
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector(".tiny-import__status").textContent.includes("Found 2")`, "scan finds both streams");

  const preselected = await evaluate(`(() => {
    const selects = document.querySelectorAll(".tiny-import__pickers select");
    return [selects[0].value, selects[1].value];
  })()`);
  assert.deepEqual(preselected, ["music_ch1_A", "music_ch2_A"], "channel selects must auto-preselect by decoded channel number");

  await waitFor(`!document.querySelector(".tiny-import-modal button[disabled]") || true`, "settle");
  const insertEnabledBeforeName = await evaluate(`document.querySelector(".tiny-import-modal .graphics-editor-json-modal__actions button:last-child").disabled === false`);
  assert.ok(insertEnabledBeforeName, "Insert must be enabled once both channels are picked and previewed");

  await evaluate(`(() => {
    const nameInput = Array.from(document.querySelectorAll(".tiny-import-modal label")).find((label) => label.textContent.startsWith("Song name")).querySelector("input");
    nameInput.value = "Commando";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  const fileNameValue = await evaluate(`Array.from(document.querySelectorAll(".tiny-import-modal label")).find((label) => label.textContent.startsWith("Attach as file")).querySelector("input").value`);
  assert.equal(fileNameValue, "commando-tiny-music.asm", "file name must auto-derive from the song name");

  await evaluate(`Array.from(document.querySelectorAll(".tiny-import-modal .graphics-editor-json-modal__actions button")).find((button) => button.textContent === "Insert").click()`);
  await waitFor(`!document.querySelector(".tiny-import-modal")`, "import dialog closes after insert");
  await waitFor(`document.querySelector(".sound-table-inspector-modal")`, "sound inspector opens for the newly imported file");
  await waitFor(`document.querySelector(".tiny-pair-sequencer-modal")`, "two-channel import opens directly in the sequencer");

  const sourceAfter = await evaluate(`document.getElementById("sourceEditor").value`);
  assert.match(sourceAfter, /include "@project\/commando-tiny-music\.asm"/, "Amy source must include the attached file");
  assert.match(sourceAfter, /set sound table Commando_table areas 4/, "no prior table -> setup line auto-inserted");
  assert.match(sourceAfter, /play song Commando_song/, "no prior table -> play line auto-inserted");

  await waitFor(`document.querySelectorAll(".sound-library-row").length === 2`, "imported song shows 2 paired rows");
  const rowText = await evaluate(`Array.from(document.querySelectorAll(".sound-library-row")).map((row) => row.textContent).join(" | ")`);
  assert.match(rowText, /Commando_ch1/);
  assert.match(rowText, /Commando_ch2/);
  assert.match(rowText, /Tiny/);
  await waitFor(`document.querySelectorAll(".tiny-pair-sequencer__block.is-editable, .tiny-pair-sequencer__block.is-sustain, .tiny-pair-sequencer__block.is-silence").length > 0`, "automatic sequencer shows imported stream blocks");
  await evaluate(`document.querySelector(".tiny-pair-sequencer__block.is-editable").click()`);
  await waitFor(`document.querySelector('[aria-label="Play from selection"]')?.disabled === false`, "selection playback becomes available");
  await evaluate(`Array.from(document.querySelectorAll(".tiny-pair-sequencer__popover-actions button")).find((button) => button.textContent === "Apply").click()`);
  await waitFor(`document.querySelector(".tiny-pair-sequencer__block.is-selected")`, "selection highlight survives lane rebuild after Apply");
  await evaluate(`document.querySelector('[aria-label="Play from selection"]').click()`);
  await waitFor(`Array.from(document.querySelectorAll(".tiny-pair-sequencer__playhead")).some((item) => !item.hidden)`, "selection playback shows its playhead");
  await evaluate(`document.querySelector('[aria-label="Stop playback"]').click()`);
  await waitFor(`Array.from(document.querySelectorAll(".tiny-pair-sequencer__playhead")).every((item) => item.hidden)`, "selection playback stops cleanly");
  await evaluate(`document.querySelector(".tiny-pair-sequencer__block.is-selected").click()`);
  await waitFor(`!document.querySelector(".tiny-pair-sequencer__popover").hidden`, "selected note reopens for preview");
  await evaluate(`document.querySelector('[aria-label="Loop selection"]').click()`);
  await delay(600);
  assert.ok(await evaluate(`Array.from(document.querySelectorAll(".tiny-pair-sequencer__playhead")).some((item) => !item.hidden)`), "selection loop must still be playing after one short note duration");
  await evaluate(`Array.from(document.querySelectorAll(".tiny-pair-sequencer__popover-actions button")).find((button) => button.textContent.includes("Preview")).click()`);
  await delay(600);
  assert.ok(await evaluate(`Array.from(document.querySelectorAll(".tiny-pair-sequencer__playhead")).every((item) => item.hidden)`), "note preview must cancel the selection loop without resurrecting it");
  assert.equal(await evaluate(`document.querySelector('[aria-label="Loop selection"]').disabled`), false, "transport returns to idle after note preview interrupts a loop");
  await evaluate(`document.querySelector('[aria-label="Close music sequencer"]').click()`);
  await waitFor(`!document.querySelector(".tiny-pair-sequencer-modal")`, "automatic sequencer closes");

  // Re-importing the same song name must fail closed: automatic file-name suffixing would
  // protect the file, but duplicate assembler labels would still break the project.
  await evaluate(`document.querySelector('[aria-label="Close sound-table inspector"]').click()`);
  await waitFor(`!document.querySelector(".sound-table-inspector-modal")`, "imported inspector closes before collision check");
  await evaluate(`Array.from(document.querySelectorAll('[aria-label^="Inspect sound tables in"]')).find((button) => button.getAttribute("aria-label").includes("commando-tiny-music.asm")).click()`);
  await waitFor(`document.querySelector(".sound-table-inspector-modal")`, "imported sound inspector before collision check");
  await evaluate(`Array.from(document.querySelectorAll(".sound-workspace-tabs button")).find((button) => button.textContent === "Import Tiny Sound").click()`);
  await waitFor(`document.querySelector(".tiny-import-modal")`, "collision import dialog");
  await evaluate(`(() => {
    const textarea = document.querySelector(".tiny-import-modal textarea");
    textarea.value = ${JSON.stringify(candidateAsm)};
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    const name = Array.from(document.querySelectorAll(".tiny-import-modal label")).find((label) => label.textContent.startsWith("Song name")).querySelector("input");
    name.value = "Commando";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    Array.from(document.querySelectorAll(".tiny-import-modal .graphics-editor-json-modal__actions button")).find((button) => button.textContent === "Insert").click();
  })()`);
  await waitFor(`document.querySelector(".tiny-import-modal")`, "symbol collision import remains open");
  assert.equal(await evaluate(`document.getElementById("sourceEditor").value`), sourceAfter, "a name collision must not modify the Amy source");
  await evaluate(`document.querySelector('[aria-label="Close Tiny Sound import"]').click()`);
  await waitFor(`!document.querySelector(".tiny-import-modal")`, "collision dialog closes");
  await evaluate(`document.querySelector('[aria-label="Close sound-table inspector"]').click()`);
  await waitFor(`!document.querySelector(".sound-table-inspector-modal")`, "source inspector closes after collision check");

  // Second pass: a project that ALREADY has a sound table must not get a second
  // "set sound table"/"play song" auto-installed - only the manual snippet shown.
  await evaluate(`(() => {
    const editor = document.getElementById("sourceEditor");
    editor.value = "sub start:\\n  set sound table ExistingTable areas 2\\n  play song ExistingTable\\n  text screen\\n  screen on\\nMainLoop:\\n  wait 1 frames\\n  goto MainLoop\\nend sub\\n\\nasm {\\nExistingTable:\\n    dw ExistingSound,$702B\\n}\\n\\nExistingSound:\\n    db $50\\n";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("btnInspectSourceSounds").click();
  })()`);
  await waitFor(`document.querySelector(".sound-table-inspector-modal")`, "existing-table inspector");
  await evaluate(`Array.from(document.querySelectorAll(".sound-workspace-tabs button")).find((button) => button.textContent === "Import Tiny Sound").click()`);
  await waitFor(`document.querySelector(".tiny-import-modal")`, "import dialog (existing table)");
  assert.match(await evaluate(`document.querySelector(".tiny-import__table-status").textContent`), /already uses a sound table/);
  await evaluate(`(() => {
    const textarea = document.querySelector(".tiny-import-modal textarea");
    textarea.value = ${JSON.stringify(candidateAsm)};
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector(".tiny-import__status").textContent.includes("Found 2")`, "scan finds both streams (existing-table pass)");
  await evaluate(`Array.from(document.querySelectorAll(".tiny-import-modal .graphics-editor-json-modal__actions button")).find((button) => button.textContent === "Insert").click()`);
  await waitFor(`!document.querySelector(".tiny-import-modal")`, "import dialog closes (existing-table pass)");
  const sourceAfterExisting = await evaluate(`document.getElementById("sourceEditor").value`);
  assert.match(sourceAfterExisting, /include "@project\/mymusic-tiny-music\.asm"/, "attaches the file even with an existing table");
  assert.equal((sourceAfterExisting.match(/^\s*set sound table/gm) || []).length, 1, "must NOT silently install a second sound table");
  assert.equal((sourceAfterExisting.match(/^\s*play song/gm) || []).length, 1, "must NOT silently start a second song");
  assert.match(sourceAfterExisting, /' set sound table MyMusic_table areas 4\n' play song MyMusic_song/, "manual activation commands must remain visible in SOURCE");

  console.log("Tiny Sound import browser behavior tests passed.");
} finally {
  if (client) {
    try { await client.send("Browser.close"); } catch { browser.kill(); }
  } else {
    browser.kill();
  }
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}
