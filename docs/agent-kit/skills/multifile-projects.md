# Multi-File Projects and Publication

Use multiple files when subsystems or generated assets have clear ownership. Do not
split a tiny program merely to imitate a large project.

## Canonical references

- `studio/examples-src/adam-multifile-adventure-demo.amy.json`: complete project
  container with four included Amy files.
- `studio/README.md`: `@project/...` source and asset resolution.
- `docs/adam-project-forms-reference-2026-09-29.md`: cartridge, DSK, DDP, and ADAM
  project forms.

## Recipe

- Keep one entry source and include owned code with
  `include amy "@project/src/name.amy"`.
- Use `@project/...` for binary/ASM assets too; never depend on the current shell
  directory or an absolute author-machine path.
- Give globals, labels, and routines subsystem prefixes because Amy symbols are
  case-insensitive across included files.
- Put test-only sources behind an explicit define such as `ROM_TEST_CHECKPOINTS`.
- Declare every source and output in project metadata. Delivery must recursively
  include referenced project files and prove the shipped ROM against them.
- Apply the 32K limit only to ordinary cartridges; MegaCart and ADAM media use
  their target-specific constraints.

## Proof

Run `tools/test-adam-multifile-demo.mjs` and
`tools/amy-author-project-proof.mjs <project>`. Then inspect the delivery manifest
to ensure no included source or asset was omitted.
