# Amy Statement Operand Audit — variable/expression parameters & local-variable safety

Date: 2026-07-26
Scope: every Amy statement that takes at least one operand which could be a **variable** or **expression**, and whether each operand position correctly accepts a **local** (IX-frame) variable, a **global** only, or **no variable at all** (constant-only).
Method: inventory from `docs/amy-language.md` + `studio/core/editor/autocompleteCatalog.js` + the `studio/core/compiler/*StatementHelpers.js` handlers, cross-checked by an empirical global-vs-local differential harness (`node tools/amyc.mjs`, ~70 statement/operand combos, asm inspected for `(ix±N)` frame loads vs leaked `AMY_UVAR_*` symbols).

---

## Executive summary

- **Almost every operand that accepts a variable already handles LOCAL variables correctly** — coordinates, sprite fields, array indices, `peek`, loop bounds, conditions, `+= -= << >> % & | ^`, `format`, `play sound`, `vpoke`, single-var `call asm reg =`, etc. All route through the scope-aware resolver `getRuntimeInfo` (`procHelpers.js:289`) and emit `(ix±N)`.
- **One genuine bug class**: runtime **`var * var`** and **`var / var`** in a **direct assignment** (`V = A * B`) or **`call asm reg = A * B`**. It is worse than local-only:
  - **Global operands** → compiles silently but produces a **WRONG ROM** (`ld a,AMY_UVAR_A * AMY_UVAR_B` = product of the two RAM *addresses* at assembly time).
  - **Local operands** → **hard assembler error** (`AMY_UVAR_*` undefined for stack locals).
  - The compound forms **`A *= B` / `A /= B` work correctly** (they route to a real runtime multiply). The direct-assignment path simply fails to route there and falls through to a global-only immediate fallback.
- A set of operand positions are **constant-only by design** (reject a variable for *both* global and local) — not a scope bug, but worth knowing when a variable "isn't accepted."

Legend: **V** = variable/expression accepted · **L** = literal-only · **K** = keyword/fixed token · **LBL** = label/name · **CONST** = compile-time-constant-only.

---

## The bug: `var * var` / `var / var` in direct assignment

### Reproduction

```basic
u8 Qa = 6
u8 Qb = 7
u8 Qv = 0
  Qv = Qa * Qb        ' GLOBAL: builds 214 bytes, emits  ld a,AMY_UVAR_Qa * AMY_UVAR_Qb   (WRONG: address product)
```

```basic
sub T:
  u8 Qa = 6
  u8 Qb = 7
  u8 Qv = 0
  Qv = Qa * Qb        ' LOCAL: assembler hard-errors — "ld A, AMY_UVAR_Qa * AMY_UVAR_Qb - Invalid expression"
  return
```

```basic
u8 Qa = 6
u8 Qv = 7
  Qv *= Qa            ' compound: CORRECT for both global and local (routes to runtime multiply, call ...MUL)
```

### Root cause

- `expressionComputeHelpers.js:425-443` (`emitLoadInt8AstIntoA`, and the 16-bit sibling) handle `*` only when at least one operand is a compile-time constant (the `emitScaleAByConst` path). For `var * var` / `var / var` they return `null`.
- The byte/word loaders then hit their final fallback:
  - `byteLoadHelpers.js:177` — `ld ${register},${symbolOrValue(token)}`
  - `runtimeValueHelpers.js:467` — `ld hl,${symbolOrValue(token)}`
- `symbolOrValue` / `resolveNamedAsmSymbol` (`typeSymbolHelpers.js:161-185`) are **global-only**: they rewrite each identifier to its `AMY_UVAR_*` alias and hand the whole `A * B` string to the assembler as an immediate. For globals the assembler computes the address product (silently wrong); for stack locals no `AMY_UVAR_*` label exists → error.
- The guarded sibling `emitLoadInt8ValueInto` (`byteLoadHelpers.js:312-316`) *does* reject runtime identifiers, but the assignment path reaches the **unguarded** `emitLoadInt8Into` instead.

### Affected forms

| form | global | local | verdict | culprit |
|---|---|---|---|---|
| `V = A * B` (u8) | builds, WRONG | assembler error | **LOCAL-HOSTILE + globally wrong** | `byteLoadHelpers.js:177` |
| `V = A / B` (u8) | builds, WRONG | assembler error | same | `byteLoadHelpers.js:177` |
| `V = A * B` (u16/i16) | builds, WRONG | assembler error | same | `runtimeValueHelpers.js:467` |
| `V = A / B` (u16/i16) | builds, WRONG | assembler error | same | `runtimeValueHelpers.js:467` |
| `call asm LBL with reg = A * B` | builds, WRONG | assembler error | same | `routineRegisterLoadHelpers.js` → `byteLoadHelpers.js:177` |

### Suggested fix

Route `V = A op B` (op ∈ `* /`, both operands runtime) and `call asm reg = A op B` to the same runtime multiply/divide routine the `*=` / `/=` path already uses, instead of falling through to the global-only immediate fallback. Add a regression test (`tools/test-mul-div-assign-codegen.mjs`) asserting a `call`-to-runtime-multiply (not an `AMY_UVAR_* * AMY_UVAR_*` immediate) for both global and local operands. Fixes the silent global corruption **and** the local error together.

---

## Constant-only operand positions (reject a variable for BOTH global and local)

These are limitations, not scope bugs — a variable in these slots errors (or is required constant) regardless of storage:

| position | constraint | ref |
|---|---|---|
| shift count in `V <<= N` / `V >>= N` | literal 1–7 | `mathBitStatementHelpers.js:199` |
| bit index in `set/clear/reset bit B of V`, `set sprite pattern bit B` | literal 0–7 | `mathBitStatementHelpers.js:137,151` |
| `digits N` / `width N` in `print` / `format` | literal | `printFormatStatementHelpers.js:142,193` |
| sprite index in partial setters/getters `set sprite I x/y/…` | constant 0–31 | doc 1636-1638 |
| `move sprite … step S wait F … xor M` | S, F, M constants | doc 2311 |
| `clear/update sprites from FIRST count COUNT` | constants | doc 1620-1622 |
| `copy … count N`, `fill array … count N`, `reverse array from/count`, `shift array N` | constant-only | doc 1018; `vramTextStatementHelpers.js:584` |
| `var * var` / `var / var` as a **sub-expression** (`Arr[A*B]`, `if A*B > n`, `vpoke A*B`) | rejected at transpile for both | (runtime var*var only via `*=`) |

---

## Full inventory — statements with variable/expression operands

All handler citations are `file:line` under `studio/core/compiler/` unless noted. Master dispatch: `transpileAmyCore.js`; assignment entry regex `transpileAmyCore.js:1730`.

### 1. Math / assignment / bit

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `V = EXPR` | RHS full expr (vars, `Arr[I]`, `Rec.F`, `random()`, `min/max/absdiff/sqrt/abs/sgn/int/log/exp`, `peek(P)`, `str$()`, `Table[Idx]`); target addressable | — | `transpileAmyCore.js:1730` → `assignmentArithmeticHelpers.js:603` | ✅ except `var*var`/`var/var` (bug) |
| `V += / -= EXPR` | RHS expr; target | operator | `assignmentArithmeticHelpers.js:653-726` | ✅ |
| `V *= / /= / %= EXPR` | RHS expr; target | operator | `assignmentArithmeticHelpers.js:630,664-704` | ✅ (routes to runtime mul/div) |
| `V <<= N` / `V >>= N` | target | **N = literal 1–7** | `mathBitStatementHelpers.js:199` | n/a (const) |
| `inc V` / `dec V` | V var or `Arr[I]` | — | `mutateStatementHelpers.js:36` | ✅ |
| `clear V` / `toggle V` | V var | — | `printFormatStatementHelpers.js:506`; `mutateStatementHelpers.js:227` | ✅ |
| `clamp V between A and B` | V; A,B bounds expr | — | `mutateStatementHelpers.js:42` | ✅ |
| `bounce V by DELTA between A and B` | V, DELTA, A, B | — | `randomBounceStatementHelpers.js` | ✅ |
| `V = sqrt/sqr/abs/sgn/int/log/exp(EXPR)` | EXPR | — | `printFormatStatementHelpers.js:302,321,378,397,416,340,359` | ✅ |
| `V = random(N)` / `random(A,B)` / `random()` | N / A,B expr | — | `assignmentArithmeticHelpers.js:40` | ✅ |
| `set bit B of V` / `clear bit B of V` | V var | **B = literal 0–7** | `mathBitStatementHelpers.js:137,151` | n/a (const) |
| `swap V with W` | V, W vars/elems | — | `mutateStatementHelpers.js:115` | ✅ |
| `u32 add A to B` / `u32 sub A from B` / `u32 inc V` / `u32 copy A to B` | u32 vars | — | `printFormatStatementHelpers.js:466,482,474,458` | ✅ |
| legacy `multiply/mul/divide/div V by N`, `add/sub/and/or/xor V …`, `min/max V with X` | V; N/X expr | — | `mathBitStatementHelpers.js:23,34,165,207`; `mutateStatementHelpers.js:117-163` | ✅ (blocklisted from autocomplete) |

### 2. Control flow

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `if COND then` / `elseif COND then` | COND full condition | `then` | `ifStatementHelpers.js:48,63` | ✅ |
| `if COND then STMT` (one-line) | COND; trailing STMT | — | `ifStatementHelpers.js:13` | ✅ |
| `if [signed/unsigned] A OP B goto LBL` | A, B expr | signed/unsigned, LBL | `specialIfGotoStatementHelpers.js:83` | ✅ |
| `if V goto LBL` / `if not V goto LBL` | V var | LBL | `specialIfGotoStatementHelpers.js:11` | ✅ |
| `if bit B of V goto LBL` | V var | **B=0–7**, LBL | `specialIfGotoStatementHelpers.js:114` | n/a (const) |
| `select case EXPR` | EXPR / func call | — | `selectCaseStatementHelpers.js:17` | ✅ |
| `case N` / `case N to M` | **N,M literal/const/range** | `case` | `selectCaseStatementHelpers.js:48` | n/a (const) |
| `for V = A to B [step S]` / `downto` | A, B, S expr | V, `to`/`step` | `forStatementHelpers.js:38,73` | ✅ |
| `next [V]` / `exit for` / `continue for` | V name | — | `forStatementHelpers.js:139,206,212` | ✅ |
| `while [signed/unsigned] A OP B` | A, B var/elem | OP | `loopStatementHelpers.js:13` | ✅ |
| `do/loop while/until COND` | COND | `while`/`until` | `loopStatementHelpers.js:68,90` | ✅ |
| `on EXPR goto/gosub L1,L2,…` | EXPR selector | L1… labels | `dispatchLabelStatementHelpers.js:51,63` | ✅ |
| `goto LBL` / `Name:` / `loop forever` | — | label | `dispatchLabelStatementHelpers.js:85,80` | n/a |

### 3. Sub / function / call

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `Name(arg, …)` call | each arg expr (ref args addressable) | Name | `procFunctionStatementHelpers.js` | ✅ |
| `V = Func(args)` | args expr; V target | — | assignment path | ✅ |
| `return EXPR` | EXPR | `return` | `routineStatementHelpers.js` | ✅ |

### 4. Screen / text / VDP

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `print at X,Y, item…` | X,Y coords; numeric items | `at`; string items literal | `printFormatStatementHelpers.js:91` | ✅ |
| `print EXPR at X,Y [digits/width N]` | EXPR, X, Y | **N literal** | `printFormatStatementHelpers.js:142` | ✅ |
| `print hex EXPR at X,Y` | EXPR, X, Y | — | `printFormatStatementHelpers.js:128` | ✅ |
| `print centered at Y, "TEXT"` | Y | TEXT literal | `printFormatStatementHelpers.js:91` | ✅ |
| `print i8/i16/u32/i32/fixed/ufixed V at X,Y` | V, X, Y | type prefix; digits literal | `printFormatStatementHelpers.js:171,249…281` | ✅ |
| `print bcd V at X,Y [tiles T]` | V, X, Y, T | — | `printFormatStatementHelpers.js:530` | ✅ |
| `format EXPR into BUF [digits/width N]` | EXPR; BUF dest | **N literal** | `printFormatStatementHelpers.js:193` | ✅ |
| `format hex/i8/i16/u32/i32/fixed/bcd … into BUF` | value | BUF; digits literal | `printFormatStatementHelpers.js:179,212-289` | ✅ |
| `set number digits/pad to T` | T | — | `dispatchLabelStatementHelpers.js:22,30` | ✅ |
| `put char V at X,Y` | V, X, Y | — | `vramTextStatementHelpers.js:1076` | ✅ (incl. `V+1`) |
| `put NAME count N at X,Y` | N, X, Y | NAME | `vramTextStatementHelpers.js:812` | ✅ |
| `put NAME at X,Y` / `put NAME centered at Y` | X,Y / Y | NAME | `vramTextStatementHelpers.js:839,827` | ✅ |
| `put BUF frame size W,H at X,Y` | W,H,X,Y | BUF/table | `vramTextStatementHelpers.js:847` | ✅ |
| `V = get char at X,Y` | X, Y; V dest | — | `vramTextStatementHelpers.js:1112` | ✅ |
| `BUF = get count N at X,Y` / `get frame size W,H at X,Y` | N/W,H,X,Y; BUF dest | — | `vramTextStatementHelpers.js:1160,1218` | ✅ |
| `fill CHAR count N at X,Y` | CHAR, N, X, Y | — | `vramTextStatementHelpers.js:895` | ✅ |
| `fill row R from C count N with V` | R, C, N, V | — | `vramTextStatementHelpers.js:1246` | ✅ |
| `fill VAL count N to vram.* [+ OFF]` | VAL, N, OFF | vram.* keyword | `vramTextStatementHelpers.js:948` | ✅ |
| `set text colors F [on B] [at N] [count M]` | N, M | color names/bytes | `vramTextStatementHelpers.js:923` | mixed (color const) |
| `backdrop COLOR` | color expr/name | — | `vramTextStatementHelpers.js:265` | n/a (const/name) |
| `copy SRC [count N] to DST [count N]` | SRC/DST addr expr (`+OFF`, `Table[Idx]`) | **count N const** | `vramTextStatementHelpers.js:584` | ✅ addr / n/a count |
| `merge SRC count N to vram.* mask M xor X` | SRC, N, M, X | vram.* keyword | `vramTextStatementHelpers.js:300` | ✅ |
| `read vram ADDR count N into BUF` | ADDR, N; BUF dest | — | `vramTextStatementHelpers.js:751` | ✅ |
| `decompress CODEC NAME to vram.*` | NAME may be `Table[Idx]` | CODEC, vram.* keyword | `vramTextStatementHelpers.js:198,226` | ✅ |
| `define chars/colors NAME at POS [count N]` | POS, N | NAME | `vramTextStatementHelpers.js:768,775` | ✅ |
| `define sprites NAME at POS` | POS | NAME | display file :422 | ✅ |
| `reflect/rotate pattern SRC to DST count N …` | SRC, DST, N | axis / `90` | `vramTextStatementHelpers.js:377,401` | ✅ |
| `set default name table ADDR` | ADDR | — | `vramTextStatementHelpers.js:454` | ✅ |
| `set screen pages A and B` | A, B | — | `vramTextStatementHelpers.js:274` | ✅ |
| `vpoke ADDR, VAL` | ADDR, VAL | — | `vramPixelInputStatementHelpers.js:22` | ✅ |
| `vpeek ADDR into V` | ADDR; V dest | — | `vramPixelInputStatementHelpers.js:33` | ✅ |
| `pset X,Y [color C]` / `preset X,Y` / `pset multicolor X,Y color C` | X, Y, C | multicolor keyword | `vramPixelInputStatementHelpers.js:45` | ✅ |
| `V = pget [multicolor] X,Y` | X, Y; V dest | — | `vramTextStatementHelpers.js:343` | ✅ |
| `line X1,Y1 to X2,Y2 [color C]` | coords, C | — | `vramPixelInputStatementHelpers.js:78` | ✅ |
| `circle X,Y radius R [color C]` | X, Y, R, C | — | `vramPixelInputStatementHelpers.js:133` | ✅ |
| `box X1,Y1 to X2,Y2 color C` | coords, C | — | `vramPixelInputStatementHelpers.js:115` | ✅ |
| `bitmap screen color C` | C | — | `displayGraphicsSpriteStatementHelpers.js:39` | ✅ |
| `wipe/swap/screen on-off/text-tile-bitmap screen/cls/duplicate` | — | keyword-only | `displayGraphicsSpriteStatementHelpers.js:19-233` | n/a |

### 5. Sprites

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `set sprite count N` | N | — | `displayGraphicsSpriteStatementHelpers.js:237` | ✅ |
| `set sprite I to Y,X,PAT,COL` | I, Y, X, PAT, COL | — | `displayGraphicsSpriteStatementHelpers.js:473` | ✅ (incl. `Y-1`) |
| `set sprite I tile TX,TY pattern P color C [offset DX,DY]` | I, TX, TY, P, C, DX, DY | — | `displayGraphicsSpriteStatementHelpers.js:454` | ✅ |
| `set sprite I y/x/pattern/color to VAL` | I, VAL (I const 0–31 today) | field keyword | `displayGraphicsSpriteStatementHelpers.js:307` | ✅ VAL |
| `set sprites 0,1,2,3 x to VAL` | VAL | index list const | `displayGraphicsSpriteStatementHelpers.js:289` | ✅ VAL |
| `set/toggle sprite I pattern bit B` | I | **B literal**, on/off | `displayGraphicsSpriteStatementHelpers.js:326,346` | n/a (const bit) |
| `move sprite I toward tile X,Y step S wait F …` | I, X, Y | **S, F, M const** | `displayGraphicsSpriteStatementHelpers.js:365` | ✅ I,X,Y |
| `hide sprite I` | I | — | `displayGraphicsSpriteStatementHelpers.js:507` | ✅ |
| `clear/update sprites from FIRST count COUNT` | — | **const** | `displayGraphicsSpriteStatementHelpers.js:247,267` | n/a (const) |
| `V = sprite I y/x/pattern/color` | I const; V dest | field keyword | assignment/byte-load | ✅ dest |

### 6. Input / collision / wait

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `read joypad/keypad/spinner/frame/vdp status N into V` | — | **N literal**; V dest | `vramPixelInputStatementHelpers.js:154-201` | ✅ dest |
| `if button B on PAD goto LBL` | — | B=1–4, PAD var, LBL | `specialIfGotoStatementHelpers.js:96` | ✅ PAD |
| `if left/right/up/down on PAD goto LBL` | — | PAD var, LBL | `specialIfGotoStatementHelpers.js:105` | ✅ PAD |
| `if any collision goto LBL` | — | LBL | `specialIfGotoStatementHelpers.js:20` | n/a |
| `hitbox NAME = X,Y size W,H` | X, Y, W, H | NAME | `transpileAmyCore.js:2787` | ✅ |
| `if sprite A hitbox HA collides with sprite B hitbox HB goto LBL` | A, B | HA,HB names, LBL | `specialIfGotoStatementHelpers.js:29` | ✅ |
| `if sprite A collides with sprite B box W,H … goto LBL` | A, B, W, H (and X,Y) | LBL | `specialIfGotoStatementHelpers.js:41,53` | ✅ |
| `if tile under PX,PY is TYPE goto LBL` | PX, PY | TYPE name, LBL | `specialIfGotoStatementHelpers.js:65` | ✅ |
| `if tiles under box PX,PY size W,H contain TYPE goto LBL` | PX, PY, W, H | TYPE, LBL | `specialIfGotoStatementHelpers.js:74` | ✅ |
| `if chars in box TX,TY size W,H contain TYPE/VAL goto LBL` | TX, TY, W, H, VAL | LBL | specialIfGoto (chars-in-box) | ✅ |
| `find tile TYPE under box PX,PY size W,H into TX,TY` | PX, PY, W, H; TX,TY dest | TYPE name | `vramTextStatementHelpers.js:967` | ✅ |
| `wait N frame(s)` / `wait vblank [N]` | N | — | `soundSpinnerStatementHelpers.js:113,115` | ✅ |
| `wait N frames or press [on joypad J]` | N | J=1/2 literal | `vramPixelInputStatementHelpers.js:222` | ✅ N |
| `wait key K [on keypad J]` / `wait key release` | — | **K, J literal** | `vramPixelInputStatementHelpers.js:295,308` | n/a |
| `choose keypad MIN to MAX into V` | MIN, MAX; V dest | — | `vramPixelInputStatementHelpers.js:320` | ✅ |
| `wait fire/no fire`, `pause until press`, `wait`, `halt` | — | J literal / keyword | `vramPixelInputStatementHelpers.js:210,258` | n/a |

### 7. Sound / music / spinner

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `set sound table NAME [areas N]` | N | NAME | `soundSpinnerStatementHelpers.js:17` | ✅ |
| `play sound N` / `stop sound N` | N | — | `soundSpinnerStatementHelpers.js:79,90` | ✅ |
| `play song NAME` / `play dsound NAME [step N]` | step N; NAME | — | `soundSpinnerStatementHelpers.js:32,139` | ✅ |
| `stop song/all`, `mute all`, `sound runtime on/off`, spinner on/off/reset | — | keyword-only | `soundSpinnerStatementHelpers.js:47-105` | n/a |

### 8. Memory / data / arrays / records

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `V = DataName[Index]` (ROM byte) | Index 8-bit expr; V dest | table name | assignment/byte-load | ✅ |
| `P = Table[Index]` (word table) | Index expr; P dest | — | word-table read | ✅ |
| `V = peek(ADDR)` | ADDR u16 expr (`peek(P+1)`) | — | `byteLoadHelpers.js:79` | ✅ |
| `set Rec.Field = EXPR` / `set Arr[I].F = EXPR` | EXPR, I | field/elem target | `inlineStatementHelpers.js:100` | ✅ |
| `fill array ARR with VAL [count N]` | VAL; **N const** | ARR | `arrayBulkStatementHelpers.js:102` | ✅ VAL / n/a count |
| `fill array ARR repeating PAT [count N]` | **count const** | ARR, PAT | `arrayBulkStatementHelpers.js:176` | n/a (const) |
| `shift array ARR up/down N` | — | **N literal** | `mathBitStatementHelpers.js:248` | n/a |
| `reverse array ARR [from I count N]` | **from/count const** | ARR | `arrayBulkStatementHelpers.js:225` | n/a |
| `copy array DST from SRC [count N]` (legacy) | **count const** | DST, SRC | `arrayBulkStatementHelpers.js:138` | n/a |
| `replace TYPE/VAL with CHAR in BUF frame size W,H [into COUNT]` | VAL, CHAR, W, H | BUF, TYPE, COUNT dest | `arrayBulkStatementHelpers.js:40` | ✅ |
| `restore NAME` / `read V1, V2, …` (DATA cursor) | — | NAME; dest vars | `dataCursorStatementHelpers.js:13,27` | ✅ dest |
| `data/asset/const/enum/record/type` decls | array length may be const expr | names/literals | `dataMetaStatementHelpers.js:132-216` | n/a |

### 9. Timers / frame / vblank

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `timer NAME every/after N ticks [stopped]` | N | NAME, every/after | `transpileAmyCore.js:2809` | ✅ |
| `start/stop timer NAME` | — | NAME | `transpileAmyCore.js:2824` | n/a |
| `if timer NAME then …` | trailing STMT | NAME | `transpileAmyCore.js:3338,3350` | ✅ |
| `on vblank SUB` / `on frame SUB` | — | SUB name | `transpileAmyCore.js:2682` | n/a |

### 10. ASM bridge

| form | V/expr positions | literal/keyword-only | handler | local-safe? |
|---|---|---|---|---|
| `call asm LABEL [with reg = VALUE, …]` | each VALUE expr | LABEL; **reg ∈ {a,b,c,d,e,h,l,hl,de,bc}** | `transpileAmyCore.js:2950`; per-arg `:3010`; reg load `:2971` | ✅ except `reg = A*B`/`A/B` (bug) |
| `include asm "path"` / `include "path"` / `asm { … }` | — | path/block literal | `transpileAmyCore.js:2941,3025` | n/a |

---

## How to reproduce the audit

```bash
# global-vs-local differential for any statement:
node tools/amyc.mjs <file>.alexis --asm out.asm
# then inspect out.asm — a correctly-scoped local operand appears as (ix±N);
# a leaked global-only path appears as a bare AMY_UVAR_* symbol (or the assembler errors for locals).
```

Correct resolver: `getRuntimeInfo` (`procHelpers.js:289`, local-first→global). Global-only fallback to watch for: `symbolOrValue` / `resolveNamedAsmSymbol` (`typeSymbolHelpers.js:161-185`).
