import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const view = process.argv[2] || "gallery";
const studioUrl = process.argv[3] || "http://localhost:8081/studio/";
const outputPath = path.resolve(process.argv[4] || `docs/images/studio-${view}.png`);
const viewportWidth = Number(process.argv[5] || 1440);
const viewportHeight = Number(process.argv[6] || 1000);
const debuggingPort = 9333;
const profilePath = path.resolve(".tmp/studio-gallery-edge");

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(profilePath, { recursive: true });

const browser = spawn(edgePath, [
  "--headless=new",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profilePath}`,
  "--disable-gpu",
  "--autoplay-policy=no-user-gesture-required",
  "--hide-scrollbars",
  `--window-size=${viewportWidth},${viewportHeight}`,
  "about:blank"
], { stdio: "ignore", windowsHide: true });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebugTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Edge may need a moment to expose its debugging endpoint.
    }
    await delay(100);
  }
  throw new Error("Edge DevTools endpoint did not become available.");
}

class DevToolsClient {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
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
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function evaluate(expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || "Browser evaluation failed.");
  }
  return response.result?.value;
}

async function waitFor(expression, description, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

let client;
try {
  client = new DevToolsClient(await waitForDebugTarget());
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: false
  });
  await client.send("Page.navigate", { url: studioUrl });
  await waitFor(
    `document.readyState === "complete" && document.getElementById("projectPanelTabDocs")`,
    "Amy Studio shell"
  );
  await waitFor(
    `document.getElementById("studioLoading") === null`,
    "Amy Studio startup"
  );
  if (view === "gallery") {
    await evaluate(`document.getElementById("projectPanelTabDocs")?.click()`);
    await waitFor(
      `Array.from(document.getElementById("docsSelect")?.options || []).some((option) => option.value === "studio-tools")`,
      "documentation catalog"
    );
    await evaluate(`(() => {
      const select = document.getElementById("docsSelect");
      if (!select) throw new Error("Documentation selector is missing.");
      select.value = "studio-tools";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await waitFor(
      `document.getElementById("docsContent")?.textContent.includes("Studio Tools Gallery") === true`,
      "Studio Tools Gallery"
    );
  } else if (view === "sound-inspector") {
    const source = await readFile(path.resolve("studio/examples-src/space-trainer.alexis"), "utf8");
    await evaluate(`(() => {
      const editor = document.getElementById("sourceEditor");
      editor.value = ${JSON.stringify(source)};
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      document.getElementById("btnInspectSourceSounds")?.click();
    })()`);
    await waitFor(
      `document.querySelector(".sound-table-inspector-modal")?.textContent.includes("SpaceTrainerSoundTable") === true`,
      "source sound-table inspector"
    );
    await evaluate(`(() => {
      const envelope = document.querySelector('[data-sound-field="envelope"] select');
      envelope.value = "Echo tail";
      envelope.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await evaluate(`Array.from(document.querySelectorAll(".sound-command-builder button")).find((button) => button.textContent.includes("Listen"))?.click()`);
    await waitFor(
      `Array.from(document.querySelectorAll(".sound-command-builder button")).some((button) => button.textContent.includes("Playing"))`,
      "sound preview playback start",
      20
    );
    await waitFor(
      `Array.from(document.querySelectorAll(".sound-command-builder button")).some((button) => button.textContent.includes("Listen") && !button.disabled)`,
      "sound preview playback completion",
      50
    );
  } else {
    throw new Error(`Unknown capture view: ${view}`);
  }
  const layout = await evaluate(`(() => {
    const element = document.querySelector(".sound-table-inspector-modal") || document.getElementById("projectPanelDocs");
    const close = element?.querySelector("button[aria-label^='Close']");
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      width: Math.round(rect.width), height: Math.round(rect.height),
      scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
      overflowX: style.overflowX, overflowY: style.overflowY,
      closeVisible: !close || (close.getBoundingClientRect().top >= 0 && close.getBoundingClientRect().bottom <= innerHeight)
    };
  })()`);
  const capture = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  await writeFile(outputPath, Buffer.from(capture.data, "base64"));
  console.log(`Captured ${outputPath}`);
  console.log(`Layout ${JSON.stringify(layout)}`);
} finally {
  if (client) {
    try {
      await client.send("Browser.close");
    } catch {
      browser.kill();
    }
  } else {
    browser.kill();
  }
}
