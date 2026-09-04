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
const debugPort = 9444;
const browser = spawn(edgePath, [
  "--headless=new",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${path.resolve(".tmp/sound-fx-browser-test")}`,
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
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
    Array.from(document.querySelectorAll(".sound-sequence-editor__action-group button")).find((button) => button.textContent === "Replace selected").click();
  })()`);
  await waitFor(`document.querySelector(".sound-sequence-editor__events").textContent.includes("9 frames") && document.querySelector(".sound-sequence-editor__events").textContent.includes("freq +3 every 2 frames")`, "replaced command");
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
  await new Promise((resolve) => server.close(resolve));
}
