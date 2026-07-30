import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms`)), timeoutMs);
    })
  ]);
}

function parseToolPayload(result) {
  if (result?.isError) {
    const message = (result.content || []).map((item) => item?.text || "").filter(Boolean).join("\n");
    throw new Error(message || "GearColeco MCP tool failed");
  }
  const content = Array.isArray(result?.content) ? result.content : [];
  const text = content.find((item) => item?.type === "text")?.text;
  if (typeof text === "string") {
    try { return JSON.parse(text); } catch { return text; }
  }
  return result;
}

export class GearColecoMcpClient {
  constructor({ executable, rom = null, symbolFile = null, cwd = null, timeoutMs = 10000 } = {}) {
    this.executable = executable;
    this.rom = rom;
    this.symbolFile = symbolFile;
    this.cwd = cwd;
    this.timeoutMs = timeoutMs;
    this.process = null;
    this.nextId = 1;
    this.pending = new Map();
    this.logs = [];
  }

  async start() {
    if (this.process) return this;
    const args = ["--headless", "--mcp-stdio"];
    if (this.rom) args.push(this.rom);
    if (this.symbolFile) args.push(this.symbolFile);
    const child = spawn(this.executable, args, {
      cwd: this.cwd || undefined,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.process = child;
    child.once("error", (error) => this.#rejectAll(error));
    child.once("exit", (code, signal) => {
      if (this.pending.size) this.#rejectAll(new Error(`GearColeco exited (${code ?? signal ?? "unknown"})`));
    });
    createInterface({ input: child.stdout }).on("line", (line) => this.#handleLine(line));
    createInterface({ input: child.stderr }).on("line", (line) => this.logs.push(line));

    await this.request("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "amy-rom-test", version: "0.1.0" }
    });
    this.notify("notifications/initialized", {});
    return this;
  }

  #handleLine(line) {
    const trimmed = String(line || "").trim();
    if (!trimmed) return;
    let message;
    try { message = JSON.parse(trimmed); } catch {
      this.logs.push(trimmed);
      return;
    }
    if (message.id == null) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
    else pending.resolve(message.result);
  }

  #rejectAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  request(method, params = {}) {
    if (!this.process?.stdin?.writable) return Promise.reject(new Error("GearColeco MCP is not running"));
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.process.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    return withTimeout(promise, this.timeoutMs, method);
  }

  notify(method, params = {}) {
    if (!this.process?.stdin?.writable) return;
    this.process.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }

  async listTools() {
    const result = await this.request("tools/list", {});
    return result?.tools || [];
  }

  async callTool(name, args = {}) {
    return parseToolPayload(await this.request("tools/call", { name, arguments: args }));
  }

  async close() {
    const child = this.process;
    this.process = null;
    if (!child) return;
    if (child.stdin.writable) child.stdin.end();
    child.kill();
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1500))
    ]);
    if (child.exitCode == null) child.kill("SIGKILL");
  }
}
