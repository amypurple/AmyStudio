#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { voxPcmQualityPreset } from "../studio/core/colecoVoxPcm.js";

const root = resolve(import.meta.dirname, "..");
const fasterVoice = String(process.argv[2] || "minimum").toLowerCase() === "faster";
const sourceProjectPath = resolve(root, `build/space-taxi-voxpcm-female-${fasterVoice ? "faster" : "minimum"}/space-taxi-female-dispatch.amy.json`);
const outputDir = resolve(root, `build/space-taxi-captioned-voice-demo${fasterVoice ? "-faster" : ""}`);
const project = JSON.parse(await readFile(sourceProjectPath, "utf8"));
const labelByPath = new Map();
for (const match of project.sourceText.matchAll(/^asset\s+(\w+)\s+from\s+"@project\/([^"]+)"/gm)) {
  labelByPath.set(match[2], match[1]);
}

const assets = project.projectFiles.map(file => {
  const path = file.path.replace(/^@project\//, "");
  const quality = (file.source.match(/VoxPCM\s+([^;]+)/) || [])[1];
  const preset = voxPcmQualityPreset(quality);
  return {
    path,
    label: labelByPath.get(path),
    bytes: Buffer.from(file.base64, "base64"),
    repeatDelay: preset.repeatDelay,
    boundaryDelay: preset.boundaryDelay
  };
});
if (assets.some(asset => !asset.label)) throw new Error("An embedded VoxPCM asset has no source label.");
const byPath = new Map(assets.map(asset => [asset.path, asset]));
const wordParts = word => assets.filter(asset => asset.path.startsWith(`${word}-`)).sort((a, b) => a.path.localeCompare(b.path));
const slightPause = byPath.get("voxslightpause.voxpcm");
const phrasePause = byPath.get("voxphrasepause.voxpcm");
const announcementPause = byPath.get("voxannouncementpause.voxpcm");
if (!slightPause || !phrasePause || !announcementPause) throw new Error("Reusable pause assets are missing.");

const numberWords = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const announcements = [...numberWords, "up"].map((destination, index) => {
  const parts = [
    ...wordParts("hey"), slightPause,
    ...wordParts("taxi"), phrasePause
  ];
  if (destination === "up") parts.push(...wordParts("up"));
  else parts.push(...wordParts("pad"), slightPause, ...wordParts(destination));
  parts.push(slightPause, ...wordParts("please"), phrasePause, ...wordParts("thanks"), announcementPause);
  return {
    label: `VoiceAnnouncement${index + 1}`,
    destination: destination === "up" ? "UP PLEASE" : `PAD ${index + 1} PLEASE`,
    parts
  };
});

const assetLines = assets.map(asset => `asset ${asset.label} from "@project/${asset.path}"`).join("\n");
const playbackLines = `for Destination = 1 to 10
  cls
  print centered at 7, "HEY TAXI!"
  if Destination < 10 then
    print at 11,10, "PAD"
    put char Destination + $30 at 15,10
    print at 17,10, "PLEASE"
  else
    print centered at 10, "UP PLEASE"
  end if
  print centered at 13, "THANKS"
  screen on
  wait 20 frames
  play voxpcm VoiceAnnouncementTable[Destination - 1]
  wait 10 frames
next`;
const tableLines = announcements.map(announcement => [
  `${announcement.label}:`,
  ...announcement.parts.flatMap(part => [`  dw ${part.label}`, `  db ${part.repeatDelay},${part.boundaryDelay}`]),
  "  dw 0,0"
].join("\n")).join("\n\n");
const pointerTable = ["VoiceAnnouncementTable:", `  dw ${announcements.map(item => item.label).join(",")}`].join("\n");
const amySource = `${assetLines}

u8 Destination = 1

text screen
backdrop dark blue
${playbackLines}
cls
print centered at 8, "THANKS FOR LISTENING"
print centered at 11, "TO THIS VOICE DEMO"
screen on
loop forever

asm {
${pointerTable}

${tableLines}
}
`;

function compile(sourcePath, asmPath, romPath) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath,
      "--opt", "balanced", "--project-dir", outputDir
    ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", code => code === 0 ? resolveRun(output) : rejectRun(new Error(output)));
  });
}

await mkdir(outputDir, { recursive: true });
for (const asset of assets) await writeFile(resolve(outputDir, asset.path), asset.bytes);
const outputProject = {
  ...project,
  projectName: "space-taxi-captioned-voice-demo",
  sourceText: amySource,
  projectFiles: assets.map(asset => ({
    path: `@project/${asset.path}`,
    base64: asset.bytes.toString("base64"),
    kind: "audio",
    source: "Reusable adaptive VoxPCM voice fragment"
  }))
};
const sourcePath = resolve(outputDir, "space-taxi-captioned-voice-demo.alexis");
await writeFile(sourcePath, amySource, "utf8");
await writeFile(resolve(outputDir, "space-taxi-captioned-voice-demo.amy.json"), JSON.stringify(outputProject, null, 2), "utf8");
const result = await compile(
  sourcePath,
  resolve(outputDir, "space-taxi-captioned-voice-demo.asm"),
  resolve(outputDir, "space-taxi-captioned-voice-demo.rom")
);
await writeFile(resolve(outputDir, "README.txt"), [
  "Space Taxi captioned VoxPCM voice demo",
  "",
  "The screen identifies each phrase while the matching reused voice fragments play.",
  "Sequence: pad 1 through pad 9, then up, followed by the closing message.",
  "Drag space-taxi-captioned-voice-demo.amy.json into Amy Studio and compile."
].join("\r\n"), "utf8");
console.log(result.trim());
