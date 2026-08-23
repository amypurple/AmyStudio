#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-state-machine-"));

function compile(name, body, expectSuccess = true, optimization = "balanced") {
  const source = join(temp, `${name}-${optimization}.alexis`);
  const asm = join(temp, `${name}-${optimization}.asm`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${body}\n`);
  const result = spawnSync(process.execPath, [amyc, source, "--asm", asm, "--opt", optimization], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}${result.error ? `\n${result.error.stack || result.error}` : ""}${result.signal ? `\nsignal=${result.signal}` : ""}`;
  if (expectSuccess) {
    assert.equal(result.status, 0, `${name} should compile:\n${output}`);
    return readFileSync(asm, "utf8");
  }
  assert.notEqual(result.status, 0, `${name} should be rejected`);
  return output;
}

const machine = `
state machine BossBehavior:
  Sleeping calls BossSleep
  Walking calls BossWalk
  Charging calls BossCharge
  Attacking calls BossAttack
end state machine
`;
const handlerStubs = `
sub BossSleep:
  return
end sub
sub BossWalk:
  return
end sub
sub BossCharge:
  return
end sub
sub BossAttack:
  return
end sub
`;

try {
  const valid = compile("state-machine-valid", `${machine}
u8 BossState = BossBehavior.Sleeping
u8 Result = 0
sub BossSleep:
  Result += 1
  BossState = BossBehavior.Walking
  return
end sub
sub BossWalk:
  Result += 2
  BossState = BossBehavior.Charging
  return
end sub
sub BossCharge:
  Result += 4
  BossState = BossBehavior.Attacking
  return
end sub
sub BossAttack:
  Result += 8
  BossState = BossBehavior.Sleeping
  return
end sub
dispatch BossState using BossBehavior
loop forever`);
  assert.match(valid, /AMY_UCONST_BossBehavior_Sleeping\s+equ\s+1/i, "first state constant missing");
  assert.match(valid, /AMY_UCONST_BossBehavior_Attacking\s+equ\s+4/i, "last state constant missing");
  assert.match(valid, /AMY_UPROC_BossSleep/i, "dispatch target missing");
  assert.match(valid, /AMY_UPROC_BossAttack/i, "last dispatch target missing");

  for (const optimization of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const optimized = compile("state-machine-profile", `${machine}${handlerStubs}
u8 BossState = BossBehavior.Sleeping
dispatch BossState using BossBehavior
loop forever`, true, optimization);
    const dispatchPairs = optimized.match(/dec a\s+jp z,AMY_UPROC_Boss(?:Sleep|Walk|Charge|Attack)/gi) || [];
    assert.equal(dispatchPairs.length, 4, `${optimization} must retain all four state branches`);
    assert.match(optimized, /ld hl,AMY_ON_DISPATCH_DONE_[0-9]+\s+push hl/i, `${optimization} must retain the synthetic return address`);
    assert.doesNotMatch(optimized, /AMY_ON_DISPATCH_TABLE_/i, `${optimization} should keep the compact linear dispatch`);
  }

  const largeMachine = compile("state-machine-large", `
state machine Large:
  S1 calls H1
  S2 calls H2
  S3 calls H3
  S4 calls H4
  S5 calls H5
  S6 calls H6
  S7 calls H7
  S8 calls H8
  S9 calls H9
end state machine
u8 State = Large.S1
dispatch State using Large
loop forever
sub H1:\n return\nend sub
sub H2:\n return\nend sub
sub H3:\n return\nend sub
sub H4:\n return\nend sub
sub H5:\n return\nend sub
sub H6:\n return\nend sub
sub H7:\n return\nend sub
sub H8:\n return\nend sub
sub H9:\n return\nend sub`);
  assert.match(largeMachine, /AMY_ON_DISPATCH_TABLE_/i, "nine states should use the compact address table");
  assert.match(largeMachine, /ld de,AMY_ON_DISPATCH_DONE_[0-9]+\s+push de\s+jp \(hl\)/i, "table dispatch should synthesize CALL (HL) without a trampoline");

  const duplicate = compile("state-machine-duplicate", `${machine.replace("  Walking calls BossWalk\n", "  Sleeping calls BossWalk\n")}
loop forever`, false);
  assert.match(duplicate, /Duplicate state 'Sleeping'/i);

  const empty = compile("state-machine-empty", `state machine Empty:\nend state machine\nloop forever`, false);
  assert.match(empty, /must declare at least one state/i);

  const unknownState = compile("state-machine-unknown-state", `${machine}${handlerStubs}
u8 BossState = BossBehavior.Unknown
loop forever`, false);
  assert.match(unknownState, /Unknown state 'BossBehavior\.Unknown'/i);

  const unknownMachine = compile("state-machine-unknown-machine", `${machine}${handlerStubs}
u8 BossState = 0
dispatch BossState using Missing
loop forever`, false);
  assert.match(unknownMachine, /Unknown state machine 'Missing'/i);

  const unknownHandler = compile("state-machine-unknown-handler", `state machine Broken:\n  Idle calls MissingSub\nend state machine\nloop forever`, false);
  assert.match(unknownHandler, /calls unknown subroutine 'MissingSub'/i);

  const unclosed = compile("state-machine-unclosed", `state machine Broken:\n  Idle calls Idle`, false);
  assert.match(unclosed, /missing end state machine/i);

  console.log("State machine codegen: PASS (lowering, constants, dispatch, diagnostics)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
