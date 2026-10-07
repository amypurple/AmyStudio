const TEMPLATES = Object.freeze({
  cartridge: {
    label: "ColecoVision Cartridge",
    platform: "colecovision-cartridge",
    memoryProfile: "colecovision_legacy_sdcc",
    medium: "rom",
    source: ["' ColecoVision cartridge", "text screen", "print at 10,11, \"NEW PROJECT\"", "screen on"].join("\n")
  },
  sgm: {
    label: "ColecoVision + Super Game Module",
    platform: "colecovision-cartridge",
    memoryProfile: "colecovision_legacy_sdcc",
    medium: "rom",
    experimental: true,
    source: ["' ColecoVision Super Game Module project", "' AY channels A, B and C are provided by the SGM.", "text screen", "print at 8,11, \"SUPER GAME MODULE\"", "ay mute", "screen on"].join("\n")
  },
  megacart: {
    label: "ColecoVision MegaCart",
    platform: "colecovision-megacart",
    memoryProfile: "colecovision_legacy_sdcc",
    medium: "rom",
    experimental: true,
    source: ["' MegaCart project", "bank rom 128", "' Safe calls resolve an exported no-argument sub in the selected bank.", "call bank 2, Bank2Setup", "text screen", "print at 9,11, \"MEGACART PROJECT\"", "screen on"].join("\n")
  },
  "adam-eos": {
    label: "ADAM Native EOS",
    platform: "adam-native-program",
    memoryProfile: "adam-eos-application",
    medium: "dsk",
    experimental: true,
    source: ["' Native Coleco ADAM EOS project", "' BOOT and GAME are separate outputs; OS7 is not assumed.", "sub start:", "  ' Add native EOS application code in the project source files.", "end sub"].join("\n")
  },
  "adam-hybrid": {
    label: "ADAM OS7 + EOS Hybrid",
    platform: "adam-disk",
    memoryProfile: "adam-os7-eos-drivers",
    medium: "dsk",
    experimental: true,
    source: ["' ADAM hybrid project", "' OS7 supplies the game runtime; EOS supplies storage and ADAM devices.", "text screen", "print at 8,11, \"OS7 + EOS PROJECT\"", "screen on"].join("\n")
  },
  "adam-compatibility": {
    label: "ADAM Compatibility Media",
    platform: "adam-disk",
    memoryProfile: "colecovision_legacy_sdcc",
    medium: "dsk",
    experimental: true,
    source: ["' ColecoVision-compatible program packaged for ADAM", "text screen", "print at 7,11, \"ADAM COMPATIBILITY\"", "screen on"].join("\n")
  }
});

export function listNewProjectTemplates() {
  return Object.entries(TEMPLATES).map(([id, value]) => ({ id, ...value }));
}

export function createProjectFromTemplate(baseProject, { templateId = "cartridge", projectName, medium } = {}) {
  const template = TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown project template '${templateId}'.`);
  const name = String(projectName || "amy-project").trim() || "amy-project";
  const selectedMedium = normalizeMedium(template, medium);
  const target = {
    platform: selectedMedium === "ddp" && template.platform === "adam-disk" ? "adam-data-pack" : template.platform,
    medium: selectedMedium
  };
  if (templateId === "sgm") target.hardware = ["sgm1"];
  if (templateId === "megacart") target.romSizeKb = 128;
  const project = {
    ...baseProject,
    projectName: name,
    memoryProfile: template.memoryProfile,
    target,
    sourceText: template.source,
    projectFiles: [],
    generatedAsm: ""
  };
  if (templateId === "megacart") {
    const manifest = {
      version: 2,
      projectName: name,
      target,
      outputs: [
        { name: "FIXED", type: "fixed-bank", sources: [{ path: "main.amy", kind: "amy" }] },
        { name: "BANK1", type: "switchable-bank", bank: 1, sources: [{ path: "banks/bank1.asm", kind: "asm" }] },
        { name: "BANK2", type: "switchable-bank", bank: 2, exports: ["Bank2Setup", "Bank2Data"], sources: [{ path: "banks/bank2.amy", kind: "amy" }] }
      ]
    };
    project.projectFiles.push(textProjectFile("project.amy.json", JSON.stringify(manifest, null, 2), "json"));
    project.projectFiles.push(textProjectFile("banks/bank1.asm", "; Logical BANK 1 is visible at $C000 after BANK SELECT 1\norg $C000\nBank1Data: db \"BANK ONE\"", "asm-source"));
    project.projectFiles.push(textProjectFile("banks/bank2.amy", "' Bank-local Amy files contain procedures and ROM data only.\nsub Bank2Setup:\n  return\nend sub\n\ndata Bank2Data bytes = 66,65,78,75,32,84,87,79", "amy-source"));
  } else if (target.platform.startsWith("adam-")) {
    const manifest = {
      version: 2,
      projectName: name,
      target,
      memoryProfile: template.memoryProfile,
      outputs: defaultAdamOutputs(templateId, template.memoryProfile)
    };
    project.projectFiles.push(textProjectFile("project.amy.json", JSON.stringify(manifest, null, 2), "json"));
  }
  return project;
}

function normalizeMedium(template, medium) {
  const value = String(medium || template.medium).toLowerCase();
  if (template.platform.startsWith("colecovision-")) return "rom";
  return value === "ddp" ? "ddp" : "dsk";
}

function defaultAdamOutputs(templateId, memoryProfile) {
  const outputs = [{ name: "BOOT", type: "boot", memoryProfile: "adam-eos-boot-block", sources: [] }];
  if (templateId !== "adam-eos") {
    outputs.push({ name: "GAME", type: "program", memoryProfile, sources: [{ path: "main.amy", kind: "amy" }] });
  } else {
    outputs.push({ name: "GAME", type: "program", memoryProfile: "adam-eos-application", sources: [{ path: "main.amy", kind: "amy" }] });
  }
  return outputs;
}

function textProjectFile(path, text, kind) {
  const bytes = new TextEncoder().encode(`${text}\n`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { path, kind, source: "generated", base64: btoa(binary) };
}
