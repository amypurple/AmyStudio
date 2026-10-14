#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

const studioUrl = process.env.AMY_STUDIO_URL || "http://127.0.0.1:8080/studio/?test=mobile-new-project";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const profilePath = mkdtempSync(join(tmpdir(), "amy-mobile-project-"));
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));

const browser = spawn(edgePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profilePath}`, "--disable-gpu", "--window-size=390,667", "about:blank"], { stdio: "ignore", windowsHide: true });
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let socket;
let nextId = 1;
const pending = new Map();

async function targetUrl() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find((entry) => entry.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await delay(100);
  }
  throw new Error("Edge DevTools endpoint did not start.");
}

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || "Browser evaluation failed.");
  return response.result?.value;
}

async function waitFor(expression, description) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function touch(selector) {
  const point = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: "center", inline: "center" });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  assert.ok(point, `missing touch target ${selector}`);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, radiusX: 2, radiusY: 2, force: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

try {
  socket = new WebSocket(await targetUrl());
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    });
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 667, deviceScaleFactor: 2, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Page.navigate", { url: studioUrl });
  await waitFor(`document.readyState === "complete" && document.getElementById("studioLoading") === null`, "Amy Studio startup");

  await touch("#btnNew");
  await waitFor(`document.getElementById("newProjectDialog")?.open === true`, "new-project dialog");
  await evaluate(`(() => { const input = document.getElementById("newProjectName"); input.value = "phone-enter-project"; input.focus(); })()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await waitFor(`document.getElementById("newProjectDialog")?.open === false`, "Enter project creation");
  assert.equal(await evaluate(`document.getElementById("projectName")?.value`), "phone-enter-project");

  await touch("#btnNew");
  await waitFor(`document.getElementById("newProjectDialog")?.open === true`, "second new-project dialog");
  await evaluate(`(() => {
    const target = document.querySelector('input[name="newProjectTarget"][value="megacart"]');
    target.checked = true;
    target.dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("newProjectName").value = "phone-touch-project";
  })()`);
  await touch("#btnCreateProject");
  await waitFor(`document.getElementById("newProjectDialog")?.open === false`, "touch project creation");
  assert.equal(await evaluate(`document.getElementById("projectName")?.value`), "phone-touch-project");
  assert.match(await evaluate(`document.getElementById("sourceEditor")?.value || ""`), /bank rom 128/i);
  console.log("Mobile new-project workflow: PASS (Enter and touch, 390x667).");
} finally {
  try { socket?.close(); } catch {}
  if (browser.exitCode === null) {
    browser.kill();
    await new Promise((resolve) => browser.once("exit", resolve));
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try { rmSync(profilePath, { recursive: true, force: true }); break; }
    catch (error) { if (attempt === 9) throw error; await delay(100); }
  }
}
