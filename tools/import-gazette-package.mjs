#!/usr/bin/env node
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageRoot = resolve(process.argv[2] || join(root, "artifacts", "gazette"));
const examplesRoot = join(root, "studio", "examples-src");
const indexPath = join(examplesRoot, "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));

const projects = [
  ["3-d-Labyrinth", "lab3d", "3-D Labyrinth", "John Stilwell", "December 1984"],
  ["3-d-Speedway", "speed3d", "3-D Speedway", "Chris Ulmer", "April 1988"],
  ["3-d-Tic-Tac-Toe", "t3d", "3-D Tic Tac Toe", null, "June 1984"],
  ["Aardvark-Attack", "aard", "Aardvark Attack", "Todd Heimarck", "October 1983"],
  ["Alien-Armada", "armada", "Alien Armada", "John Matias", "May 1985"],
  ["Alpha-Anxiety", "alphanx", "Alpha Anxiety", null, "March 1985"],
  ["Alpha-shoot", "ashoot", "Alpha-Shoot", null, "January 1984"],
  ["Animal-Match", "amatch", "Animal Match", null, "December 1987"],
  ["Apple-Hunt", "ahunt", "Apple Hunt", null, "April 1985"],
  ["Apple-Willie", "willie", "Apple Willie", null, "April 1990"],
  ["Arcade-Baseball", "abase", "Arcade Baseball", null, "May 1986"],
  ["Arcade-Volleyball", "volley", "Arcade Volleyball", "Rhett Anderson and David Hensley Jr.", "June 1988"],
  ["Astro-panic", "apanic", "Astro-Panic!", "Charles Brannon", "February 1984"],
  ["Atom-Shoot", "atoms", "Atom Shoot", null, "October 1985"],
  ["Atom-Shoot-64", "quarks", "Atom Shoot 64", null, "October 1985"],
  ["Bacteria", "bact", "Bacteria", null, "March 1989"],
  ["Bagdad", "bagdad", "Bagdad", "Kevin Martin and Bryan Files", "November 1984"],
  ["Bagger", "bagger", "Bagger", null, "July 1988"],
  ["Balloon-Blitz", "bblitz", "Balloon Blitz", "Michael T. Bohn", "August 1984"],
  ["Bb-Barrage", "bbbar", "BB Barrage", "William Chin", "August 1988"],
  ["Beekeeper", "beekpr", "Beekeeper", null, "July 1984"],
  ["Beezone", "beezone", "Beezone", null, "September 1987"],
  ["Binary-Castle", "binc", "Binary Castle", null, "November 1983"],
  ["Bingo-64", "bingo64", "Bingo 64", "Richard L. Witkover", "April 1984"],
  ["Block-Battle", "bbattle", "Block Battle!", null, "September 1989"],
  ["Block-Out", "blockout", "Block Out", null, "November 1988"],
  ["Backgammon", "bgammon", "Backgammon", null, "November 1985"],
  ["Bombardment", "bombard", "Bombardment", null, "January 1989"],
  ["Bonking-Barrels", "bonk", "Bonking Barrels", null, "July 1984"],
  ["Boom-And-Bust", "boombust", "Boom and Bust", null, "September 1988"],
  ["Boomerang", "boomer", "Boomerang", null, "August 1989"],
  ["Bounty-Hunter", "bounty", "Bounty Hunter", null, "August 1987"],
  ["Brusher", "brusher", "Brusher", "Leonard Morris", "April 1989"],
  ["Bump-N-Run", "bumprun", "Bump 'n Run", null, "November 1986"],
  ["Cabby", "cabby", "Cabby", null, "October 1984"],
  ["Campaign-Manager", "campaign", "Campaign Manager", "Todd Heimarck", "August 1984"],
  ["Castle-Dungeon", "cdung", "Castle Dungeon", null, "June 1984"],
  ["Cats-N-Dogs", "catsdogs", "Cats 'n Dogs", null, "January 1988"],
  ["Cell-Runner", "cellrun", "Cell Runner", "John Krutch", "September 1986"],
  ["Charlemagnes-Sword", "charle", "Charlemagne's Sword", null, "May 1985"],
  ["Checkers", "gzchk", "Checkers", null, "February 1984"],
  ["Chomper", "chomper", "Chomper", null, "January 1985"]
];

const knownIds = new Set(index.map((entry) => entry.id));
let added = 0;
let updated = 0;
for (const [folder, id, title, author, date] of projects) {
  copyFileSync(join(packageRoot, folder, `${id}.alexis`), join(examplesRoot, `${id}.alexis`));
  let entry = index.find((candidate) => candidate.id === id);
  if (!entry) {
    entry = {
      id,
      originKind: "reimagined-adaptation",
      label: `${title} (${date})`,
      detail: author
        ? `${author}'s COMPUTE!'s Gazette game, adapted for ColecoVision with Amy Studio.`
        : `A COMPUTE!'s Gazette game from ${date}, adapted for ColecoVision with Amy Studio; no original author is named in the available listing.`,
      projectName: title,
      sourceLang: "amy",
      memoryProfile: "colecovision_legacy_sdcc",
      category: "Games",
      tags: ["amy", "gazette", "reimagined-adaptation", "game", "commodore-64"]
    };
    if (knownIds.has(id)) throw new Error(`Duplicate example id ${id}.`);
    index.push(entry);
    knownIds.add(id);
    added += 1;
  } else {
    entry.tags = [...new Set([...(entry.tags || []), "gazette"])];
    updated += 1;
  }
}

writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(JSON.stringify({ projects: projects.length, added, updated }, null, 2));
