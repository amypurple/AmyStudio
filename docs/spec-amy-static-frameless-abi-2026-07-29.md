# Spec: Amy frameless static ABI for non-reentrant functions

Date: 2026-07-29
Status: implemented (v1.1 safety-hardened on 2026-07-30).
Motivation: `docs/handoff-claude-reversi-v5-z80-performance-response-2026-07-29.md` — the dominant Reversi cost is the per-call IX-frame ABI of hot leaf functions (`ReversiCountDirFast` et al.). Removing the stack frame **and** the stack parameter traffic on provably non-reentrant functions is a general Amy speed/size win (est. ~30–40% of Reversi thinking time; benefits every project).
Related: `docs/amy-local-variables-review-2026-07-25.md` (item #1, corrected here).

Revision 2 (2026-07-29): added §4.1 (nested-argument marshalling — `F(A, G())` where `G` calls `F`) and §3.4 (ASM-aware call-graph completeness + conservative fences for indirect/opaque ASM), plus safety tests 9 and 10, per Codex review. With these two holes closed the spec is considered implementation-ready.

Revision 3 (2026-07-30): v1.1 closes the adversarial ASM gaps found after implementation. Conditional `call`/`jp`, `jr`, and `djnz` edges to `AMY_UPROC_*` are recognized; unresolved transfers fail closed; plain project includes are accepted only when their complete contents match an explicit data-directive allowlist. Unsupported, aggregate, record, enum, and aliased locals are excluded through a type allowlist rather than a denylist. Browser, CLI, and catalog compilation now provide the same synchronous project-include resolver.

Validation status: analyzer adversarial matrix PASS; static ABI codegen PASS under all five optimizer profiles; 176/176 Amy examples transpile; the ROM self-test compiles under all five profiles and previously displayed `PASS` in the emulator; Reversi v5 remains frameless in its hot `ReversiCountDirFast` path and builds to 9,947 bytes under balanced optimization.

---

## 1. What this changes

Today every Amy `sub`/`function` with parameters or locals uses an **IX stack frame**: caller pushes args, callee does `push ix / ld ix,0 / add ix,sp`, allocates locals below SP, addresses params at `ix+N` and locals at `ix-N`, and restores with `ld sp,ix / pop ix`.

This spec introduces a second, opt-in-by-analysis calling convention — the **static ABI** — for functions the compiler can prove are **non-reentrant**. A static-ABI function:

- has its **parameters** in private static RAM cells (`AMY_SPARM_<fn>_<name>`), written by the caller before the `CALL`;
- has its **locals** in private static RAM cells (`AMY_LVAR_<fn>_<name>`);
- uses **no IX**, no `push ix`, no frame allocation, no `pop ix` — just the body in absolute `(nn)` addressing and a plain `RET`;
- is invoked with a plain `CALL` (after the caller stores the parameter cells).

The two mechanisms are separable and MUST be measured separately:

- **#1a — static locals only.** Locals become static; parameters stay on the stack; IX is still set up to read `ix+N` params. Partial win. Low risk. Ships first as a measurement baseline.
- **#1b — frameless.** Parameters also become static; IX disappears entirely. The target win. Requires the full eligibility analysis below.

The rest of this spec defines eligibility and the safety gates that #1b must pass before it lands.

---

## 2. v1 scope restrictions (hard limits for the first version)

A function is a **static-ABI candidate** in v1 only if ALL of the following hold. Anything outside this list keeps the current IX-frame ABI.

1. **Scalar parameters only**, of type `u8`, `i8`, `u16`, or `i16`. No `ref` parameters, no `record` parameters, no array parameters.
2. **No local records and no local arrays** in the function (scalar locals only). A local array/record forces the IX-frame ABI (it can still be a *stack* function; it is simply not a static-ABI candidate in v1).
3. **No escaped address** of any parameter or local: the function must not take the address of a param/local, pass a param/local by `ref` to another routine, or otherwise expose a pointer to its static cells. (Address-taking of a static cell would not itself crash, but it defeats the reentrancy reasoning and is disallowed in v1 to keep the analysis simple.)
4. The function is **not** `Start` and is **not** an `on frame` / `on vblank` hook target (those have their own contracts).

Return values are unchanged (A / HL / the existing 32-bit return slot); returning a value does not disqualify a function.

Rationale: restricting to scalar params/locals means every parameter and local is a fixed 1- or 2-byte cell with a statically known address, so the caller-writes / callee-reads protocol is trivial and the "escaped address" hazard is closed by rule 3.

---

## 3. Eligibility analysis (the non-reentrancy predicate)

A candidate function `F` may use the **static ABI (#1b)** only if it is proven **non-reentrant**: no activation of `F` can begin while another activation of `F` is live. This requires BOTH of the following, computed over the whole program's call graph.

### 3.1 Not in any recursive cycle

Build the directed call graph of user routines (nodes = `sub`/`function`; edge `A → B` if `A` contains a call to `B`). Compute strongly-connected components (SCC).

- Exclude `F` if it is in an SCC of size > 1 (**mutual recursion**).
- Exclude `F` if it has a self-edge `F → F` (**direct recursion**).
- Equivalently: `F` is eligible on this axis iff `F` is **not reachable from itself** in the call graph.

A recursive routine is therefore never a static-ABI function — but it **may call** a static-ABI leaf. Example: `ReversiAlphaBeta` (recursive, keeps its IX frame) calling `ReversiCountMoveFast` (static ABI) is allowed, because `ReversiCountMoveFast` is not itself reachable from itself and is not otherwise re-enterable.

### 3.2 Not reachable from an NMI entry (conservative)

Amy's NMI handler can preempt mainline code at any instruction. If a static-ABI function `F` could be called from mainline **and** from the NMI handler, the NMI call could clobber `F`'s static param/local cells mid-activation. So:

- Compute the set `NMI_ROOTS` = the `on frame` / `on vblank` hook subroutine (if any) **plus** the runtime updaters the generated NMI handler calls (`AMY_UPDATE_MUSIC`, `PLAY_SOUNDS`, and any others wired in `studio/core/project.js`).
- Compute `NMI_REACHABLE` = all user routines reachable from `NMI_ROOTS` in the call graph.
- **Exclude every function in `NMI_REACHABLE`** from the static ABI, conservatively. (Even if a specific NMI/mainline pair could be proven disjoint, v1 does not attempt that proof.)

This is why the Reversi hot functions qualify: the CPU search runs with **NMI disabled** and none of `ReversiCountDirFast`/`ReversiCountMoveFast`/… is reachable from the `on frame`/sound updaters.

### 3.3 Combined predicate

```
eligible(F) :=
      scalarParamsOnly(F) and noLocalAggregates(F) and noEscapedAddress(F)
  and not inRecursiveCycle(F)          // §3.1 (SCC + self-edge)
  and F not in NMI_REACHABLE           // §3.2 (conservative)
  and F is not Start / on-frame / on-vblank
```

If `eligible(F)` is false, `F` keeps the IX-frame ABI. There is no partial/mixed state for a given function (see §4).

### 3.4 The call graph must include inline-ASM and include-ASM edges

The Amy-source call graph alone is **not** complete: inline `asm { … }` blocks, `include asm "…"`, and any routine reached via the `call asm Label …` bridge can `call`/`jp` an Amy routine label (`AMY_UPROC_<name>`) without the parser ever seeing a call expression. If such a hidden edge is ignored, the SCC and NMI-reachability analyses (§3.1, §3.2) can wrongly classify a function as non-reentrant.

Rules:

1. **Scan every inline `asm { … }` block, every `include asm` body the compiler can read, and every ASM routine reachable from a `call asm` bridge for direct `call`/`jp`/`jr`/`call cc`/`jp cc` targets that name an Amy routine label** (`AMY_UPROC_*`, and the `on frame`/sound-updater roots). Add each as a call-graph edge from the enclosing routine (or, for a free-standing ASM include, from `NMI_ROOTS` if that include is wired into the NMI path, else from a synthetic "asm-origin" node that is treated as able to run at mainline time). These edges feed §3.1 and §3.2 exactly like parsed calls.
2. **If any analysable ASM contains an indirect or computed transfer** (`call (hl)`, `jp (hl)`, `jp (ix)`, `jp (iy)`, a `call`/`jp` to a non-label expression, or a jump table), the compiler cannot know which Amy routine it reaches. Conservatively **exclude from the static ABI every Amy routine whose label is exposed to ASM** — i.e. any routine whose `AMY_UPROC_*` label textually appears in, or could be computed by, any ASM block — and, if exposure cannot be bounded, exclude **all** routines program-wide from the static ABI.
3. **If the program contains an ASM include the compiler cannot read/scan** (an opaque/external file), treat it as case 2: it may perform indirect or hidden calls, so conservatively disable the static ABI for any potentially-exposed routine.

In short: a routine is a static-ABI candidate only if the compiler can *fully* account for who calls it, through Amy **and** ASM. Any unanalysable ASM path forces the safe (IX-frame) ABI for the routines it could reach. This preserves the "fully static call graph" property that §3 relies on (see also §8).

---

## 4. All-or-nothing per function; no ABI mixing

For any given function `F`, **every call site must use the same ABI**. There is no per-call-site choice.

- If `eligible(F)`, `F` is compiled as static-ABI and **all** callers store its static parameter cells and `CALL` it. No caller may push args on the stack for `F`.
- If not, `F` is compiled as IX-frame and all callers push args.

The compiler decides `F`'s ABI once (from `eligible(F)`), records it in the routine table, and emits both the callee and every call site consistently. A build-time assertion should verify that no `F` has mixed call-site conventions.

### 4.1 Argument marshalling and nested calls (mandatory ordering)

Because a static-ABI function's parameters live in **fixed** cells (`AMY_SPARM_<fn>_<name>`), the caller must never write any of `F`'s parameter cells while argument expressions for that same call remain to be evaluated. Consider:

```amy
Result = F(A, G())     ' and G() (directly or transitively) also calls F
```

If the caller wrote `AMY_SPARM_F_p0 = A` first and then evaluated `G()`, the inner call `G() → … → F(…)` would overwrite `AMY_SPARM_F_*`, corrupting the parameters prepared for the outer `F`. (Note this is **not** reentrancy of `F` — the inner `F` completes before the outer `F` begins, so `F` can still be a valid non-reentrant static-ABI function — it is a premature-write hazard in the *caller's* code generation.)

**Rule.** For every call to a static-ABI `F`:

1. Evaluate **all** argument expressions first, into **per-activation safe temporaries** (registers, or values pushed on the stack). Any nested call inside an argument runs entirely during this phase, using and freeing its own parameter cells before returning.
2. Only **after** the last argument is evaluated, populate `AMY_SPARM_F_*` from the temporaries, back-to-back, with no intervening call.
3. `CALL F`.

**Fast path.** If none of `F`'s argument expressions can reach a call that writes `F`'s cells — in practice, if the argument list is call-free (plain variables, literals, `array[i]`, simple arithmetic), which covers the hot cases like `ReversiCountDirFast(Move, Side, D)` — the compiler MAY store each argument directly into its `AMY_SPARM_F_*` cell in order, skipping the staging. The staging in step 1 is required only when a later argument's evaluation can write `F`'s parameter cells (conservatively: when any argument after the first contains a call).

There is no aliasing hazard between *distinct* functions' cells, since each `F` has its own `AMY_SPARM_<fn>_<name>` block; the hazard is solely the same-`F` early-write case above, which the ordering rule closes.

---

## 5. Per-call initialization requirement

Every call MUST (re)initialize **each parameter** and **each local that is read before being written** in `F`.

- **Parameters:** the caller writes all of `F`'s parameter cells before the `CALL`. (This is the argument evaluation; it is mandatory and total.)
- **Locals:** the callee must set, at entry, every local it reads before writing — most importantly counters/accumulators like `Count = 0`. This is the same "read-before-write init" the current frame path performs; with static cells it must NOT be hoisted to program start, because a second call would then see the first call's leftover value. Existing dead-init pruning may remove inits for locals that are provably written before any read, but must **keep** inits for read-before-write locals and must keep them **inside the callee, per call**.

Failing this is the classic static-storage bug (stale value across calls); §6 tests it directly.

---

## 6. Safety-test matrix (must pass before #1b lands)

All tests compile a minimal Amy program and assert on generated ASM and/or observable behaviour. Suggested file: `tools/test-static-frameless-abi-codegen.mjs`.

1. **Two successive calls.** Call an eligible `F(a)` twice with different args; assert the second call's result does not depend on the first (per-call param + local init works; no stale static state). Assert `F`'s body contains **no `push ix`** and addresses params/locals via `(nn)`.
2. **Nested calls (distinct functions).** `A` (static) calls `B` (static) which calls `C` (static), with live locals in `A`/`B` across the inner calls; assert each function's static cells are disjoint and values survive the nested calls correctly. (Distinct functions have distinct cells; this must not corrupt `A`'s locals when `B` runs.)
3. **Recursion excluded.** A directly-recursive function and a mutually-recursive pair must be compiled with **IX frames** (assert `push ix` present, and that they are NOT given static param cells). Confirms §3.1.
4. **NMI excluded.** A function reachable from an `on frame` hook (and one reachable from the sound updaters) must be compiled with the **IX frame** even though it is otherwise a scalar leaf. Confirms §3.2.
5. **Recursive-calls-static-leaf allowed.** A recursive `sub` that calls a static-ABI leaf compiles correctly: the recursive routine keeps its frame, the leaf is frameless, and behaviour is correct across nesting. Confirms §3.1's "recursive may call static leaf" clause.
6. **ASM/behaviour parity.** For a corpus of eligible functions, assert the static-ABI output computes identical results to the IX-frame output (same return values for a sweep of inputs), and that `node tools/check-examples.mjs` stays byte-parity where a function's ABI did not change and passes everywhere.
7. **Type-restriction fences.** A function with a `ref`/record/array parameter, a local array/record, or an escaped param address must **stay** IX-frame (assert not static). Confirms §2.
8. **#1a vs #1b measured separately.** Emit both variants for the same eligible function and record the cycle/ROM/RAM deltas independently. The frameless gain must be credited to #1b (param removal), not to static locals alone.
9. **Nested argument that re-enters the callee (§4.1).** Compile `Result = F(A, G())` where `G()` (directly or transitively) also calls `F`, `F` being static-ABI. Assert correctness: the outer `F` receives `A` and the fully-evaluated `G()` result, uncorrupted by the inner `F` call. Assert the generated caller code evaluates both arguments **before** writing any `AMY_SPARM_F_*` cell (no `AMY_SPARM_F_*` store appears between the start of argument evaluation and the last argument's completion). Include a call-free-args variant to confirm the fast path stores directly.
10. **Inline/`include` ASM call-graph edges and conservative fences (§3.4).** (a) A routine that is otherwise a scalar leaf but is `call`ed from an `asm { … }` block reachable from an `on frame` hook must be excluded from the static ABI (NMI-reachable via the ASM edge). (b) A program containing an ASM indirect transfer (`jp (hl)` / `call (hl)` / jump table) that could reach Amy routines must force the IX-frame ABI for every potentially-exposed routine. (c) A routine `call`ed from ASM inside a recursive ASM/Amy cycle must be excluded. Assert each stays IX-frame.

Additional standing gates: compile the whole examples corpus under `off`, `safe`, `balanced`, `aggressive`, `experimental`; `node tools/check-examples.mjs` zero failures; inspect generated ASM for the Reversi hot functions; record ROM/RAM/frame-size/cycle deltas; and a real emulator play test.

---

## 7. Sequencing

1. Land this spec.
2. Implement and measure **#1a** (static locals only) as a low-risk baseline. It requires only "has a frame + eligible-except-params"; IX stays for params.
3. Implement the eligibility analysis (§3: call graph, SCC, NMI-reachability) and **#1b** (frameless: static params, drop IX). Gate on the §6 matrix.
4. Re-measure Reversi (`ReversiCountDirFast` per-call cost, total thinking time, ROM/RAM), then proceed to the source-side Reversi options (apply/undo, `NextSquare`).

Priority remains **#1b**, but it must not land before this specification and its safety tests. Do not credit the frameless gain to static locals alone.

---

## 8. Open questions (for the implementer, not blocking the spec)

- **Register-passed params** (a later refinement beyond v1): for a 1–3 scalar-arg leaf, passing args in registers would beat static-RAM params (zero memory traffic) but needs a per-function convention + clobber discipline. v1 uses static-RAM params for uniformity and simplicity; register-passing can be a v2 that reuses the same eligibility predicate.
- **RAM budget:** static params+locals consume fixed RAM. Quantify the total for a real project (Reversi) and confirm it fits the user-RAM window; the offsetting stack reduction should keep net RAM modest.
- **Indirect calls / call-through:** Amy source has no function pointers today, so the *parsed* call graph is static. The only way an indirect or hidden transfer enters the program is through inline/`include` ASM — handled conservatively by §3.4 (scan ASM for direct `AMY_UPROC_*` edges; disable the static ABI for exposed routines on any indirect/opaque ASM path). If Amy-level function pointers or computed calls are ever added, extend the same rule: any indirectly-callable routine is reentrant-unknown and excluded.
