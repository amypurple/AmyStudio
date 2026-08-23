# Handoff: Amy Scenes and RAM Overlays Implementation Review

Date: 2026-08-23

Please adversarially review:

- `docs/spec-amy-scenes-ram-overlays-2026-08-23.md`
- `studio/examples-src/amy-scenes-overlays-design.alexis`
- `docs/handoff-claude-amy-scenes-ram-overlays-analysis-response-2026-08-20.md`
- `docs/spec-amy-static-frameless-abi-2026-07-29.md`

No implementation is requested yet. Find assumptions that could cause silent RAM
corruption, incorrect NMI behavior, misleading symbols/watches, or wrong RAM estimates.

## Questions

1. Is record-backed `overlay Group / Part as Record` the smallest safe primitive?
2. Can one-based scene IDs reuse typed state-machine lowering without creating a second
   control-flow system?
3. Is setting active scene to `0` before initialization sufficient when VDP NMI has been
   disabled and acknowledged?
4. Which forms of `ref`, local/static ABI storage, inline ASM, include ASM, or ROM word
   tables can make an overlay address escape?
5. What exact metadata must survive the assembler so aliases remain distinguishable in
   the debugger and conditional-breakpoint resolver?
6. Should scene-bound routines permit short field names in v1, or should all accesses
   remain qualified to reduce parser and debugger ambiguity?
7. Can a scene enter routine call another scene's ordinary routines safely if those
   routines cannot touch that scene's overlay part?
8. Is debug poison-fill useful and deterministic on 1 KB ColecoVision RAM, or should the
   ROM self-test use explicit sentinels only?
9. Does the RAM formula remain correct with alignment, nested records, local arrays, and
   compiler-generated static ABI cells?
10. Which tests are missing before implementation can be called safe?

Please return findings by severity, proposed corrections, a revised implementation order,
and an explicit go/no-go verdict for Phase A.
