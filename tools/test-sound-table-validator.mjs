import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateSoundTable } from "./validate-sound-table.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

async function main() {
  const commandoPath = path.join(repoRoot, "examples/vendor/music-bank/commando-music-data.asm");
  const commando = await fs.readFile(commandoPath, "utf8");
  const result = validateSoundTable(commando, {
    table: "_snd_table",
    areas: 8,
    music: ["intro_music", "ingame_music", "end_level_music", "high_score_music"],
    sfx: range(43, 55)
  });
  assert.equal(result.ok, true);
  assert.equal(result.entryCount, 59);
  assert.equal(result.firstEntry.address, 0x702b);
  assert.equal(result.areaSummary.at(-1).area, 8);

  const badFirstEntry = `
snd_1:
  db $50
snd_2:
  db $90
_snd_table:
  dw snd_1,$7035
  dw snd_2,$702B
`;
  const badResult = validateSoundTable(badFirstEntry, { table: "_snd_table", areas: 2 });
  assert.equal(badResult.ok, false);
  assert.ok(badResult.errors.some((error) => error.includes("entry 1 targets $7035")));
  assert.ok(badResult.errors.some((error) => error.includes("lowest is $702B")));

  const badSfxArea = `
snd_1:
  db $50
snd_2:
  db $90
song:
  dw 1
  db $01
  dw 0
_snd_table:
  dw snd_1,$702B
  dw snd_2,$7035
`;
  const sfxResult = validateSoundTable(badSfxArea, {
    table: "_snd_table",
    areas: 8,
    music: ["song"],
    sfx: [2]
  });
  assert.equal(sfxResult.ok, false);
  assert.ok(sfxResult.errors.some((error) => error.includes("SFX sound index 2 uses area 2")));

  console.log(JSON.stringify({ ok: true, tests: 3 }, null, 2));
}

function range(start, end) {
  const values = [];
  for (let value = start; value <= end; value += 1) values.push(value);
  return values;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
