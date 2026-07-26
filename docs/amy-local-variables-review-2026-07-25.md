# Review — Amy Local Variables Strategic Plan

Date: 2026-07-25
Reviewer: Claude (architecture + risk pass, requested in the plan's "Claude Investigation Handoff")
Subject: `docs/amy-local-variables-strategic-plan-2026-07-25.md`
Method: full read of `studio/core/compiler/`, plus empirical compiles via `tools/amyc.mjs`.

---

## TL;DR

**The plan mostly describes features that already ship.** Local-by-default variables inside `sub`, `function ... as Type` with return values, `ref` parameters, local arrays, and recursion are all implemented, working, and self-tested today. The plan's core premise — "declarations inside a `sub` are currently global" — is **incorrect**.

The Reversi/DacMan bug is real, but its cause is different: scratch is declared **at top level (global)** and shared across subs, not "subs cannot have locals." The fix is to *move* those declarations into the subs — a migration, not a new language feature.

So the plan should be **reframed**: stop building what exists, and spend the effort on the genuine gaps (a cheaper static-RAM local path, shadowing policy, a first-pass wart, local records, 32-bit/float recursion safety, and a symbol map for locals).

---

## What already exists (verified)

| Plan item | Reality | Evidence |
|---|---|---|
| Phase 1 — locals in `sub` | **Done**, local-by-default | `declarationStatementHelpers.js:300-301` |
| Phase 2 — `function Name(...) as Type` returning a value | **Done + self-tested** | `studio/examples-src/amy-function-selftest.alexis` |
| Phase 3 — recursion | **Works** (IX frame ⇒ recursion-safe) | `studio/examples-src/amy-recursive-selftest.alexis`; empirical `SumTo(N-1)` → 117 bytes |
| `ref` parameters | **Done** (caller passes address, callee derefs) | `runtimeValueHelpers.js:729-836`, `test-ref-param-codegen.mjs` |
| Local arrays | **Done** | `u8 Digits[5]`, `u32 Steps[2]` in the function selftest |

### How locality actually works today

`declarationStatementHelpers.js:300-301`:

```js
const inferredLocal = !scopeKeyword && !!state.currentProc;
const isLocalDecl = scopeKeyword === "local" || inferredLocal;
```

- A **bare** declaration inside a `sub`/`function` body ⇒ **local** (stack, IX-relative), mangled `${currentProc}_${name}`, `scope: currentProc`.
- Explicit `local` keyword ⇒ same.
- Explicit `ram`/`dim` ⇒ forced global.
- A top-level declaration ⇒ global (`AMY_UVAR_*`, fixed RAM via the bump allocator).

This is **better** than the plan's proposed "static RAM locals": IX-frame locals are recursion-safe from day one. Introduced in commits `e3d005a4` / `cb9daef0`.

### The stack-frame ABI is already complete

- Frame object: `procHelpers.js:21-33` (`ensureProcFrame`).
- Prologue spliced at finalize: `transpileFinalizationHelpers.js:609-625` (`push ix / ld ix,0 / add ix,sp`, then `ld hl,-size / add hl,sp / ld sp,hl`).
- Epilogue: `procHelpers.js:47-63` (`ld sp,ix / pop ix / ret`).
- Params at **positive** IX offsets from +4 (`firstPassScanHelpers.js:83-121`); locals at **negative** offsets (`declarationStatementHelpers.js:196, 391`).
- Args pushed right-to-left, **caller-cleans-stack** (`valueParseHelpers.js:226-237`, `routineStatementHelpers.js:200-205`).
- `ref` = a 2-byte pointer slot in the frame, addressed identically; ref-forwarding through call chains works (`runtimeValueHelpers.js:729-783`).

### Symbol resolution is already scope-aware

The central resolver is **local-first → global**, not global-first:

`procHelpers.js:289-298` (`getRuntimeInfo`):

```js
function getRuntimeInfo(token, scope = currentProcRef.get()) {
  if (scope) {
    const scoped = ensureProcLocalMapStorage.get(scope)?.get(token);
    if (scoped) { const info = runtimeVars.get(scoped); if (info) return info; }
  }
  return runtimeVars.get(token) || null; // global fallback
}
```

All real load/store/address sites route through `getRuntimeInfo` and branch on `info.storage === "stack"` (⇒ IX offset) vs global (⇒ `asmName`/`address`). The only global-only resolvers are `symbolOrValue` / `resolveNamedAsmSymbol` (`typeSymbolHelpers.js:161-179`), used for immediates, EQU expressions, and label arithmetic — the fallback when `getRuntimeInfo` returns nothing.

---

## The real gaps (reframed roadmap)

### 1. Cheaper static-RAM locals for non-recursive routines — *the plan's one genuinely valuable idea*

Today **every** in-sub local forces an IX frame, even a param-less `sub` that just wants one scratch byte. Empirically, `sub Foo` + `u8 Scratch = 0` emits `push ix / ld ix,0 / add ix,sp` + `(ix-1)` access + `ld sp,ix / pop ix` epilogue — expensive for a leaf routine.

A non-recursive routine could instead allocate locals to **private static RAM** (`AMY_LVAR_Foo_Scratch: rb 1`, absolute `ld a,(AMY_LVAR_Foo_Scratch)`) — smaller and faster, directly serving Amy's "simple, predictable, small Z80" value. Keep the IX frame only when the routine has params, `ref`, needs address-taking of a local, or is (mutually) recursive.

This is the plan's "static first" instinct, correctly positioned as an **optimization on top of** the existing stack locals — not as the foundation.

### 2. Shadowing a global name is forbidden — decide policy

`declarationStatementHelpers.js:319` rejects a local when `describeGlobalNameCollision(name)` is truthy. **The plan's Phase-1 Test Case 1** (`u8 X` local shadowing `u8 X` global) **does not compile today** — it errors `Invalid local variable declaration`.

Pick one and document it:
- **Keep the ban** (safer, forces distinct names, avoids the exact confusion that caused the Reversi bug). If kept, rewrite Test Case 1.
- **Allow shadowing** (matches most languages, matches the plan). Costs: the first-pass wart (#4) must be fixed first, and the symbol map (#7) must disambiguate.

Recommendation: **keep the ban** for now; it is cheap safety and aligns with the project's "clean modern rule over dangerous ambiguity" stance in the plan's own Compatibility section.

### 3. Local records — the legitimate Phase 1b

Local records are explicitly rejected (`declarationStatementHelpers.js:228`). Local scalars, arrays, bcd, fp5, u32/i32 already work. Records are the one missing local kind.

### 4. First-pass flattening wart

`firstPassScanHelpers.js:173-187` registers **every** declaration name (including would-be sub-locals) as a **global** `AMY_UVAR` asm symbol, with no `currentProc` tracking. The second pass then correctly treats in-sub declarations as scoped stack locals. This inconsistency is latent — it does not break the corpus today only because such names aren't *also* declared globally — but it is the root of collision fragility and blocks clean shadowing. Make the first pass scope-aware (skip global registration for names that will resolve as locals).

### 5. 32-bit / float recursion is not safe

int8/int16 params, locals, and returns are recursion-clean. But:
- u32/i32 **returns** and **argument passing** route through the shared static slot `AMY_CMP_LEFT32` (`routineStatementHelpers.js:134-145`, `runtimeValueHelpers.js:793-803`).
- fp5 runtime state (`FPA*`) and various 32-bit helpers use fixed scratch memory.

A recursive (or mutually recursive) function using 32-bit/float can clobber these mid-sequence. Either make these per-activation, or emit a warning when a function is self/mutually recursive **and** touches 32-bit/fp. Do **not** paper over it with a `recursive` keyword (see syntax note).

### 6. Symbol map / debug display of locals

No debug output distinguishes `Sub.Local`. Add:
- Static locals: `Sub.Local = $XXXX`.
- Frame locals: `Sub.Local = ix-N`.
- Disambiguate when a global and a local share a source name (only relevant if #2 allows shadowing).

### 7. Migration lint (the Reversi/DacMan lever)

Not "local referenced outside scope" (already a hard error). The useful lint: **"top-level global X is written/read only within a single sub ⇒ candidate to localize."** Corpus data below shows this is the real cleanup target.

---

## Corpus reality (for migration planning)

- **170 `.alexis` files.** Only **6** declare any variable inside a sub body (23 lines, **0** using the explicit `local` keyword) — all self-tests. **Zero** files read an in-sub declaration outside its sub. ⇒ Making local-by-default "explicit" breaks **nothing**.
- Shared-**global** scratch is the dominant idiom: **33 of 142** files share ≥1 global across ≥2 subs. Heaviest: `dacman` (`Tmp` across 15 subs), `explosion` (`CellIndex` across 16), `reversi` (40 globals, 20 shared).
- **Caution:** some shared globals are *genuine cross-sub state* (e.g. `reversi` `CursorX` is the persistent cursor position, read/written in `ReversiNewGame`/`ReversiPlayerTurn`/`ReversiDrawCursor`) and must **stay global**. Only *transient* scratch (`Tmp`, `CellIndex`, `ScanX`, `Dir`) whose lifetime is within one sub's computation should be localized. The lint in #7 must distinguish these, and note that the shadow ban (#2) means you must **delete** the global before localizing.

---

## Answers to the plan's 8 questions

1. **Where is resolution too global-first, which functions need a scoped resolver?**
   It already is scope-aware — `getRuntimeInfo` (`procHelpers.js:289`) is local-first→global; `scopedRuntimeName`, `resolveAddressSymbol`, and all real load/store sites go through it. Only `symbolOrValue`/`resolveNamedAsmSymbol` are global-only, and only as immediate/label fallbacks. No resolver rewrite needed.

2. **Can Phase 1 static locals be done without touching stack-frame code?**
   Moot — locals are already stack. The *new* static-RAM path (#1) is an added, optional allocation strategy that avoids the frame for non-recursive routines; it's independent of the frame code.

3. **Which tests break if in-sub declarations become local?**
   None in the corpus (they're already local). Sensitive harnesses for any frame/scope change: `check-examples` (baseline asm hashes), `check-routine-abi`, `check-routine-byte-inputs`, `test-ref-param-codegen`.

4. **Minimal migration warning/fix-it?**
   The "localizable global" lint (#7), not an out-of-scope error (that already exists).

5. **Is `ref` reusable for recursive stack locals?**
   Yes — it's the *same* IX-frame mechanism. Refs are 2-byte slots at IX+ offsets; locals are IX− offsets. Nothing to reinvent.

6. **Smallest useful `function ... as Type`?**
   Already shipped and composed with expression codegen (`valueParseHelpers.js:239-261`; result in A / HL / `AMY_CMP_LEFT32`).

7. **Local arrays/records in Phase 1 or 1b?**
   Arrays: already done. Records: 1b (currently rejected).

8. **Symbol map for `Sub.Local` and frame offsets?**
   See #6 — add both static (`$addr`) and frame (`ix-N`) forms.

---

## Syntax opinion

- **`function Foo(...) as u8` — keep it.** Already the shipped, tested syntax. Do **not** switch to `func Foo(...) -> u8`; it would break the corpus and selftests for no gain.
- **`end function` is already removed** (functions end at their `return`); `sub` still closes with `end sub`. This asymmetry exists today — document it, don't re-litigate it.
- **`recursive` keyword — do not add.** int8/int16 recursion already works with no keyword. A keyword's only value would be gating the 32-bit/float static-slot fix (#5) — better to make recursion always-correct (or warn) and keep the language surface small.

---

## Recommended implementation order (reframed)

1. **Document and lock down what exists** (recursion, functions, locals, ref params) in `docs/amy-language.md` — the real gap is that this isn't written down. Add regression coverage if any path is untested.
2. **Static-RAM local path** for non-recursive routines (#1) — keep the IX frame only when needed (params / ref / address-of-local / recursion).
3. **Decide shadowing policy** (#2) — recommend keeping the ban; fix the plan's Test Case 1 accordingly.
4. **Fix the first-pass flattening wart** (#4).
5. **Local records** (#3).
6. **32-bit/float recursion safety** (#5) — per-activation slots or a targeted warning.
7. **Symbol map for locals** (#6).
8. **Migrate Reversi/DacMan scratch** to locals, guided by the "localizable global" lint (#7), carefully preserving genuine cross-sub state.

## Non-goals (agree with the plan)

No implicit recursion by keyword, no heap, no closures, no local `data` blocks, no register-allocation of locals before the model and symbol map are stable.
