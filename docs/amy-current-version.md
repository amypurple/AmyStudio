# Current AMY Version

Current AMY version:
- **AMY pre-release**

Status:
- active version
- pre-release
- current manual and baseline target

Not current release labels:
- **AMY v2.1** as a frozen public compatibility promise
- **AMY v2.2**
- **AMY v3**

Why not `v2.2`:
- the `v2.2` notes are archived future-language notes, not a shipped version
- their main deferred topic is runtime string expressions
- AMY does **not** yet implement:
  - a true `string` type
  - `chr$()`
  - heap-style runtime string concatenation
  - string slicing or dynamic string lifetime management
- AMY does expose lightweight runtime text expressions for numbers: `str$(Value)` and `"LABEL:" + str$(Value)` work in fixed `u8` buffers and direct `print at` output

Therefore:
- the current implemented and documented language line is the live pre-release Amy surface, not a public compatibility line
- a real modernized syntax tranche is already implemented in Studio, but that does not yet promote the language line itself to `v2.2`
- runtime strings should now be treated as a future `v3` feature family instead of the threshold for `v2.2`
- `chr$()`, `left$()`, `right$()`, `mid$()`, and general `+` string concatenation should now be treated as `v3` backlog items, not `v2.2` promises
- `v2.2` should only be declared for a smaller real intermediate release if a narrower, actually implemented feature line justifies it
- the historical 5-byte real is documented as `fp5`
- current docs and examples should use `fp5`, not `float`

Current numeric-formatting split for fp5:
- `print Value ... digits 16` is the exact 16-character fp5 format
- `Buffer = str$(Value)` is the friendly/public decimal format

Current numeric text-expression surface:
- `str$(Value)` works for the current numeric families: `bool`, `u8`, `i8`, `u16`, `i16`, `u32`, `i32`, `fixed`, `ufixed`, `fixed32`, `fp5`, and `bcd`
- `Buffer = str$(Value)` writes formatted numeric text into a fixed `u8` buffer
- `str$(Value, digits N)` and `digits$(Value, N)` write zero-padded numeric fields
- `str$(Value, width N)` and `width$(Value, N)` write right-aligned numeric fields using the configured pad tile
- `Buffer = "LABEL:" + str$(Value)` and `print at X,Y, "LABEL:" + str$(Value)` are lightweight numeric text expressions
- this is still intentionally not a true dynamic string system: no heap allocation, no runtime string variables, no string slicing, and no dynamic lifetime model

Current raw-byte / hex debug surface:
- `copy bytes of Value to Buffer` copies scalar numeric storage bytes into a `u8` buffer
- `print hex Value at X,Y` prints raw little-endian memory bytes as hex pairs
- `format hex Value into Buffer` writes those hex pairs into a `u8` buffer
- fixed-point hex value literals remain value-oriented; use `raw $xxxx` or `raw $xxxxxxxx` only for exact fixed/fixed32 memory bits

Current fp5 control-flow surface:
- direct `if` / `while` / `select case` comparisons now accept fp5 values
- supported current comparisons include fp5-vs-fp5 and fp5-vs-integer-literal cases through the native fp5 compare path

Current verified fp5 helper surface:
- compare is test-backed
- `abs Value into Target` is test-backed
- `sgn Value into Target` is test-backed
- `int Value into Target` is test-backed with floor behavior on negative fractions
- `sqrt Value into Target` and `sqr Value into Target` are test-backed
- fp5 `*=` is test-backed
- fp5 `/=` is routed through the native fp5 divide helper and is test-backed in that form

Current fp5 transcendental surface:
- `log Value into Target` is implemented as a first-pass fp5 helper
- `exp Value into Target` remains experimental and should be treated as deferred backlog work until the range-reduced fp5 version is rebuilt safely
- `log` accuracy improvement remains queued alongside `exp` improvement as backlog work, even though the current first-pass helper is usable and test-backed

Current fp5 example/test step:
- use `Amy FP5 Log Lab` as the active example-program verification step for the current fp5 transcendental tranche
- `Amy FP5 Exp Lab` exists as an experimental smoke test only and should not yet be treated as a release-grade acceptance step
- use `Amy FP5 Sign / Int Lab` as the exact-builtin verification step for current fp5 `sgn` and `int`
- use `Amy FP5 Abs Lab` for raw-byte fp5 sign clearing verification
- use `Amy FP5 Sqrt Lab` for current fp5 sqrt / sqr verification
- some internal catalog IDs still use `amy-float-*` names from earlier development, but the visible example names are normalized to `FP5`

Current parser surface now assumes:
- canonical built-in types only
- explicit `define Alias as CanonicalType` when local type spellings are desired
- direct subroutine calls instead of `call`
- no plain `gosub` / `proc` family
- `on Expr goto` and `on Expr gosub` retained as intentional indexed dispatch

Deferred beyond `v2.1`:
- runtime strings in `v3`
- `chr$()`, `left$()`, `right$()`, `mid$()`, and general runtime string concatenation in `v3`
- broader record growth beyond the current narrow implementation:
  - local records
  - richer record field types beyond the current byte/word/bool plus nested-record subset
  - broader array-of-record support
- fp5 `exp` accuracy/stability improvement remains queued as backlog work rather than a finished current-language promise
- exact text-literal dedup/reuse remains queued as a lower-priority ROM-size optimization behind current fp5/fixed32 runtime splitting and print-path cleanup

Relevant documents:
- [amy-language.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-language.md)
- [amy-removed-forms.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/amy-removed-forms.md)
- [archive/language-history/amy-v2.1-reference-manual.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/archive/language-history/amy-v2.1-reference-manual.md)
- [archive/2026-05-17-historical/amy-language-v2.2-notes.md](C:/Users/Amy/Desktop/ALEXIS-Z80/docs/archive/2026-05-17-historical/amy-language-v2.2-notes.md)
