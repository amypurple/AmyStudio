#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const prelude = `project "BRANCH TAIL FACTORING"
memory "colecovision_legacy_sdcc"
data Frame0 bytes
  1,2,3,4,5,6,7,8
end data
data Frame1 bytes
  9,10,11,12,13,14,15,16
end data
u8 Choice = 1
u8 SideEffect = 0
`;

const cases = [
  {
    id: "positive",
    calls: 1,
    body: `if Choice = 0 then
  put Frame0 frame size 2,2 at 4,5
else
  put Frame1 frame size 2,2 at 4,5
end if`
  },
  {
    id: "different-dimensions",
    calls: 2,
    body: `if Choice = 0 then
  put Frame0 frame size 2,2 at 4,5
else
  put Frame1 frame size 4,2 at 4,5
end if`
  },
  {
    id: "different-coordinate",
    calls: 2,
    body: `if Choice = 0 then
  put Frame0 frame size 2,2 at 4,5
else
  put Frame1 frame size 2,2 at 5,5
end if`
  },
  {
    id: "side-effect",
    calls: 2,
    body: `if Choice = 0 then
  SideEffect += 1
  put Frame0 frame size 2,2 at 4,5
else
  put Frame1 frame size 2,2 at 4,5
end if`
  },
  {
    id: "elseif-chain",
    calls: 2,
    body: `if Choice = 0 then
  put Frame0 frame size 2,2 at 4,5
elseif Choice = 1 then
  put Frame0 frame size 2,2 at 4,5
else
  put Frame1 frame size 2,2 at 4,5
end if`,
    verify(asm) {
      const shared = asm.match(/^(AMY_FACTORED_TAIL_[0-9]+):$/im)?.[1];
      assert.ok(shared, "elseif-chain: missing private factored-tail label");
      const sharedAt = asm.indexOf(`${shared}:`);
      const callAt = asm.indexOf("call PUT_FRAME", sharedAt);
      const endAt = asm.indexOf("AMY_IF_END_", callAt);
      assert.ok(sharedAt < callAt && callAt < endAt,
        "elseif-chain: common call must precede the original end label");
    }
  }
];

function compile(source, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`${profile} compile failed:\n${output}`)));
  });
}

const temp = await mkdtemp(join(tmpdir(), "amy-branch-factor-"));
try {
  for (const profile of profiles) {
    for (const fixture of cases) {
      const source = join(temp, `${fixture.id}-${profile}.alexis`);
      const asmPath = join(temp, `${fixture.id}-${profile}.asm`);
      const rom = join(temp, `${fixture.id}-${profile}.rom`);
      await writeFile(source, `${prelude}${fixture.body}\nloop forever\n`);
      await compile(source, asmPath, rom, profile);
      const asm = await readFile(asmPath, "utf8");
      const calls = (asm.match(/^\s*call PUT_FRAME\s*$/gim) || []).length;
      assert.equal(calls, fixture.calls, `${profile}/${fixture.id}: unexpected PUT_FRAME call count`);
      fixture.verify?.(asm);
    }
  }
  console.log(`branch-tail factoring PASS (${cases.length} cases x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_OUTPUT) console.log(`kept test output: ${temp}`);
  else await rm(temp, { recursive: true, force: true });
}
