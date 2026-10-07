import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const view = process.argv[2] || "gallery";
const studioUrl = process.argv[3] || "http://localhost:8081/studio/";
const outputPath = path.resolve(process.argv[4] || `docs/images/studio-${view}.png`);
const viewportWidth = Number(process.argv[5] || 1440);
const viewportHeight = Number(process.argv[6] || 1000);
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const debuggingPort = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const profilePath = path.resolve(`.tmp/studio-gallery-edge-${process.pid}-${view}`);

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
  if (view === "new-project-megacart" || view === "megacart-files") {
    await evaluate(`document.getElementById("btnNew")?.click()`);
    await waitFor(`document.getElementById("newProjectDialog")?.open === true`, "new-project dialog");
    await evaluate(`(() => {
      const target = document.querySelector('input[name="newProjectTarget"][value="megacart"]');
      target.checked = true;
      target.dispatchEvent(new Event("change", { bubbles: true }));
      document.getElementById("newProjectName").value = "megacart-guide";
    })()`);
    if (view === "megacart-files") {
      await evaluate(`document.getElementById("btnCreateProject")?.click()`);
      await waitFor(`document.getElementById("newProjectDialog")?.open === false`, "MegaCart project creation");
      await evaluate(`document.getElementById("projectPanelTabFiles")?.click()`);
      await waitFor(
        `Boolean(document.querySelector('#projectFilesList .project-file__name[title*="banks/bank2.amy"]'))`,
        "MegaCart project files"
      );
    }
  } else if (view === "gallery") {
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
  } else if (["sound-inspector", "sound-manager", "sound-fx-editor", "sound-table-creator"].includes(view)) {
    const source = view === "sound-table-creator"
      ? `project "SOUND WORKSHOP"\n\nsub start:\n  text screen\n`
      : view === "sound-fx-editor"
        ? `project "SOUND WORKSHOP"\n\nsub start:\n  set sound table WorkshopSoundTable areas 6\n  text screen\n\nasm {\nWorkshopSoundTable:\n  dw JumpSound,$705D\nJumpSound:\n  db $40,$6B,$00,$09,$50\n}\n`
        : await readFile(path.resolve("studio/examples-src/space-trainer.alexis"), "utf8");
    await evaluate(`(() => {
      const editor = document.getElementById("sourceEditor");
      editor.value = ${JSON.stringify(source)};
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      document.getElementById("btnInspectSourceSounds")?.click();
    })()`);
    await waitFor(
      view === "sound-table-creator"
        ? `document.querySelector(".sound-table-creator-modal") !== null`
        : `document.querySelector(".sound-table-inspector-modal") !== null`,
      view === "sound-table-creator" ? "sound-table creator" : "source sound-table inspector"
    );
    if (view === "sound-fx-editor") {
      await evaluate(`(() => {
        document.querySelector(".sound-library-row")?.click();
        Array.from(document.querySelectorAll(".sound-library-transport button")).find((button) => button.textContent === "Edit")?.click();
      })()`);
      await waitFor(`document.querySelector(".sound-sequence-editor-modal") !== null`, "Sound FX editor");
    }
  } else {
    throw new Error(`Unknown capture view: ${view}`);
  }
  const layout = await evaluate(`(() => {
    const view = ${JSON.stringify(view)};
    const element = view === "megacart-files"
      ? document.getElementById("projectPanel")
      : document.querySelector(".sound-sequence-editor-modal") || document.querySelector(".sound-table-creator-modal") || document.querySelector(".sound-table-inspector-modal") || document.querySelector("#newProjectDialog[open]") || document.getElementById("projectPanelFiles") || document.getElementById("projectPanelDocs");
    const close = element?.querySelector("button[aria-label^='Close']");
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      left: Math.round(rect.left), top: Math.round(rect.top),
      width: Math.round(rect.width), height: Math.round(rect.height),
      scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
      overflowX: style.overflowX, overflowY: style.overflowY,
      closeVisible: !close || (close.getBoundingClientRect().top >= 0 && close.getBoundingClientRect().bottom <= innerHeight)
    };
  })()`);
  const focusedWorkflowView = view === "new-project-megacart" || view === "megacart-files";
  const captureOptions = {
    format: "png",
    captureBeyondViewport: false
  };
  if (focusedWorkflowView && layout) {
    const margin = 12;
    captureOptions.clip = {
      x: Math.max(0, layout.left - margin),
      y: Math.max(0, layout.top - margin),
      width: Math.min(viewportWidth - Math.max(0, layout.left - margin), layout.width + margin * 2),
      height: Math.min(viewportHeight - Math.max(0, layout.top - margin), layout.height + margin * 2),
      scale: 1
    };
  }
  const capture = await client.send("Page.captureScreenshot", captureOptions);
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
