# Graphics Editors and Editable Assets

Use `editors.json` to make source-owned graphics reversible and understandable in
Amy Studio. Generated previews do not replace ownership metadata.

## Canonical references

- `docs/amy-graphics-editors-guide.md`: supported editor forms and round trips.
- `studio/examples-src/afterglow-garden.editors.json`: compact charset and animated
  16x16 sprite example.
- `studio/examples-src/dacman-2.editors.json`: larger multi-editor project.

## Recipe

- Set schema `version` to `1` and give every editor a unique descriptive name.
- Use `inline` references for Amy data blocks and `file` references for project
  assets. Names must identify the actual owner, not a generated preview.
- Declare dimensions and counts explicitly; never let an editor silently resize a
  gameplay table.
- Use `charset` for pixels/colors, `tilemap` for NAME-table layouts, `frames` or
  `metatiles` for tile compositions, and `sprite-patterns` for hardware sprites.
- For compressed files, require decode-edit-recompress-decode equivalence.
- Add notes when runtime color, base pattern, layer ordering, or grouped 2x2 tiles
  are not obvious from the bytes.

Start from an exact validator-compatible object, not inferred field names:

```json
{
  "version": 1,
  "editors": [
    {
      "kind": "charset",
      "name": "Gameplay tiles",
      "pattern": { "from": "inline", "name": "TilePatterns" },
      "baseTile": 128,
      "tileCount": 8,
      "width": 8,
      "height": 8
    }
  ]
}
```

Hardware sprite patterns use `spriteSize`, not guessed `width`/`height` fields:

```json
{
  "version": 1,
  "editors": [
    {
      "kind": "sprite-patterns",
      "name": "Player sprites",
      "pattern": { "from": "inline", "name": "PlayerPatterns" },
      "spriteSize": [8, 8],
      "frameCount": 4
    }
  ]
}
```

## Proof

Run `tools/amy-author-editors-check.mjs <editors.json>` and
`tools/test-afterglow-garden-editors.mjs`. Saving an unchanged asset must round-trip
to identical decoded bytes.
