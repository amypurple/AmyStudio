"use strict";
const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const model = require("./project-model");

let output, diagnostics, status, lastBuild = null, compiling = false;
const config = () => vscode.workspace.getConfiguration("amyStudio");
const roots = () => (vscode.workspace.workspaceFolders || []).map((folder) => folder.uri.fsPath);
const activePath = (resource) => resource?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath || roots()[0] || null;

function resolveProject(resource, forcedProfile) {
  const selected = activePath(resource);
  if (!selected) throw new Error("Open an Amy source file or project folder first.");
  const manifestPath = model.findManifest(selected, roots());
  const project = manifestPath ? model.readProject(manifestPath) : model.standaloneProject(selected, config().get("optimization", "balanced"));
  if (!/\.(?:alexis|amy)$/i.test(project.entry)) throw new Error("The project entry must be an .alexis or .amy file.");
  if (forcedProfile) project.optimization = forcedProfile;
  return project;
}

function resolveCompiler(context) {
  const configured = String(config().get("compilerPath", "") || "").trim();
  const candidates = [
    configured,
    path.join(context.extensionPath, "toolchain", "tools", "amyc.mjs"),
    ...roots().map((root) => path.join(root, "tools", "amyc.mjs")),
    path.resolve(context.extensionPath, "..", "..", "tools", "amyc.mjs")
  ].filter(Boolean);
  const compiler = candidates.find((candidate) => fs.existsSync(candidate));
  if (!compiler) throw new Error("Amy compiler not found. Set amyStudio.compilerPath or open an Amy Studio checkout.");
  return compiler;
}

function diagnosticSeverity(value) {
  if (value === "warning") return vscode.DiagnosticSeverity.Warning;
  if (value === "information") return vscode.DiagnosticSeverity.Information;
  return vscode.DiagnosticSeverity.Error;
}

function publishDiagnostics(report) {
  diagnostics.clear();
  const groups = new Map();
  for (const item of report?.diagnostics || []) {
    const file = path.resolve(item.file || report.source || "");
    if (!file) continue;
    const line = Math.max(0, Number(item.line || 1) - 1);
    const column = Math.max(0, Number(item.column || 1) - 1);
    const diagnostic = new vscode.Diagnostic(new vscode.Range(line, column, line, column + 1), String(item.message || "Amy compiler diagnostic"), diagnosticSeverity(item.severity));
    diagnostic.source = "Amy";
    diagnostic.code = item.code || item.stage || undefined;
    const uri = vscode.Uri.file(file);
    const key = uri.toString();
    if (!groups.has(key)) groups.set(key, { uri, values: [] });
    groups.get(key).values.push(diagnostic);
  }
  for (const group of groups.values()) diagnostics.set(group.uri, group.values);
}

function sourceDiagnostics(document) {
  if (!document || document.languageId !== "amy") return [];
  return model.sourceDiagnostics(document.getText(), document.uri.fsPath);
}

function publishDocumentDiagnostics(document) {
  const items = sourceDiagnostics(document);
  const values = items.map((item) => {
    const line = Math.max(0, Number(item.line || 1) - 1);
    const column = Math.max(0, Number(item.column || 1) - 1);
    const diagnostic = new vscode.Diagnostic(new vscode.Range(line, column, line, column + 1), item.message, diagnosticSeverity(item.severity));
    diagnostic.source = "Amy";
    diagnostic.code = item.code;
    return diagnostic;
  });
  diagnostics.set(document.uri, values);
}

function runProcess(executable, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", (data) => { const text = data.toString(); stdout += text; output.append(text); });
    child.stderr.on("data", (data) => { const text = data.toString(); stderr += text; output.append(text); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function compile(context, resource, forcedProfile) {
  if (compiling) { vscode.window.showInformationMessage("Amy compilation is already running."); return null; }
  compiling = true;
  status.text = "$(sync~spin) Amy";
  try {
    const project = resolveProject(resource, forcedProfile);
    const compiler = resolveCompiler(context);
    const buildDir = path.join(project.root, ".amy", "build");
    fs.mkdirSync(buildDir, { recursive: true });
    const profile = forcedProfile || project.optimization || config().get("optimization", "balanced");
    const args = model.buildArguments(project, compiler, buildDir, profile);
    const reportPath = args[args.indexOf("--report-json") + 1];
    output.clear();
    output.show(true);
    output.appendLine("Amy: " + (project.manifest.name || path.basename(project.entry)) + " [" + profile + "]");
    output.appendLine("Compiler: " + compiler);
    const nodePath = String(config().get("nodePath", "") || "").trim() || "node";
    const result = await runProcess(nodePath, args, project.root);
    let report = null;
    if (fs.existsSync(reportPath)) {
      try { report = JSON.parse(fs.readFileSync(reportPath, "utf8")); }
      catch (error) { output.appendLine("Invalid compiler report: " + error.message); }
    }
    const entryDocument = vscode.workspace.textDocuments.find((document) => path.resolve(document.uri.fsPath) === path.resolve(project.entry));
    const localDiagnostics = entryDocument
      ? sourceDiagnostics(entryDocument)
      : model.sourceDiagnostics(fs.readFileSync(project.entry, "utf8"), project.entry);
    if (report) publishDiagnostics({ ...report, diagnostics: [...(report.diagnostics || []), ...localDiagnostics] });
    else if (entryDocument) publishDocumentDiagnostics(entryDocument);
    if (result.code !== 0 || report?.ok === false) {
      status.text = "$(error) Amy";
      vscode.window.showErrorMessage(report?.diagnostics?.[0]?.message || "Compilation failed. See Amy output.");
      return report;
    }
    lastBuild = { project, report, buildDir };
    const used = report?.ramUsage?.usedBytes;
    status.text = "$(check) Amy " + (report?.romBytes ?? "?") + " B" + (Number.isFinite(used) ? " | RAM " + used + " B" : "");
    status.tooltip = (project.manifest.name || "Amy project") + " · " + profile;
    vscode.window.showInformationMessage("Amy compiled: " + (report?.romBytes ?? "?") + " bytes, " + profile + ".");
    return report;
  } catch (error) {
    status.text = "$(error) Amy";
    output.appendLine(error.stack || error.message);
    vscode.window.showErrorMessage(error.message);
    return null;
  } finally { compiling = false; }
}

async function createProject(resource) {
  const base = resource?.fsPath || roots()[0];
  if (!base) return vscode.window.showErrorMessage("Open a folder before creating an Amy project.");
  const name = await vscode.window.showInputBox({ prompt: "Amy project name", value: "My Amy Game", validateInput: (value) => value.trim() ? null : "Enter a project name." });
  if (!name) return;
  const root = path.resolve(base), srcDir = path.join(root, "src");
  const manifestPath = path.join(root, model.MANIFEST);
  if (fs.existsSync(manifestPath)) return vscode.window.showErrorMessage("This folder already contains amy.project.json.");
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "asm"), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify({ name: name.trim(), entry: "src/main.alexis", target: "colecovision-cartridge", memoryProfile: "colecovision_legacy_sdcc", optimization: "balanced" }, null, 2) + "\n");
  const safeName = name.trim().replaceAll('"', "'");
  fs.writeFileSync(path.join(srcDir, "main.alexis"), 'project "' + safeName + '"\n\nsub start:\n  text screen\n  print at 8,11, "HELLO FROM AMY"\n  screen on\n  loop forever\nend sub\n');
  await vscode.window.showTextDocument(vscode.Uri.file(path.join(srcDir, "main.alexis")));
}

async function openArtifact(kind) {
  const artifact = lastBuild?.report?.artifacts?.[kind];
  if (!artifact || !fs.existsSync(artifact)) return vscode.window.showErrorMessage("No generated " + kind + " is available. Compile first.");
  await vscode.window.showTextDocument(vscode.Uri.file(artifact), { preview: false });
}

function activate(context) {
  output = vscode.window.createOutputChannel("Amy Studio");
  diagnostics = vscode.languages.createDiagnosticCollection("amy");
  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 80);
  status.command = "amyStudio.compile";
  status.text = "$(tools) Amy";
  status.tooltip = "Compile the active Amy project";
  status.show();
  context.subscriptions.push(output, diagnostics, status);
  context.subscriptions.push(vscode.commands.registerCommand("amyStudio.createProject", (resource) => createProject(resource)));
  context.subscriptions.push(vscode.commands.registerCommand("amyStudio.compile", (resource) => compile(context, resource)));
  context.subscriptions.push(vscode.commands.registerCommand("amyStudio.compileOff", (resource) => compile(context, resource, "off")));
  context.subscriptions.push(vscode.commands.registerCommand("amyStudio.compileAggressive", (resource) => compile(context, resource, "aggressive")));
  context.subscriptions.push(vscode.commands.registerCommand("amyStudio.openGeneratedAsm", () => openArtifact("optimizedAsm")));
  context.subscriptions.push(vscode.commands.registerCommand("amyStudio.revealRom", async () => {
    const rom = lastBuild?.report?.artifacts?.rom;
    if (!rom || !fs.existsSync(rom)) return vscode.window.showErrorMessage("No compiled ROM is available.");
    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(rom));
  }));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "amy" && config().get("compileOnSave", false)) compile(context, document.uri);
  }));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(publishDocumentDiagnostics));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(({ document }) => publishDocumentDiagnostics(document)));
  for (const document of vscode.workspace.textDocuments) publishDocumentDiagnostics(document);
}
function deactivate() {}
module.exports = { activate, deactivate };
