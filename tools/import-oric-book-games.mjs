#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const downloads = resolve(process.env.USERPROFILE || "C:/Users/Amy", "Downloads");
const examples = join(root, "studio", "examples-src");
const indexPath = join(examples, "index.json");

const projects = [
  {
    zip: "CHIENDEBERGER-cv.zip", member: "sehan-chien-de-berger/chien.alexis",
    id: "chien-de-berger", title: "Chien de Berger", author: "Jean-Francois Sehan",
    publication: "L'Oric a l'affiche", year: 1984,
  },
  {
    zip: "MOONLANDING-cv.zip", member: "03-moon-landing/moonlanding.alexis",
    id: "moon-landing", title: "Moon Landing", author: "Czes Kosniowski",
    publication: "Games to Play on Your Oric-1", year: 1983,
  },
  {
    zip: "BIRDCAT-cv.zip", member: "04-bird-and-caterpillar/build/birdcat.alexis",
    id: "bird-and-caterpillar", title: "Bird and Caterpillar", author: "Czes Kosniowski",
    publication: "Games to Play on Your Oric-1", year: 1983,
    replacements: [["game by Chris\n' (Czes) Kosniowski", "game by Czes\n' Kosniowski"]],
  },
  {
    zip: "CANADAIR-cv.zip", member: "sehan-canadair/canadair.alexis",
    id: "canadair", title: "Canadair", author: "Jean-Francois Sehan",
    publication: "L'Oric a l'affiche", year: 1984,
  },
  {
    zip: "GRENOUILLE-cv-v2.zip", member: "sehan-grenouille/grenouille.alexis",
    id: "grenouille", title: "Grenouille", author: "Jean-Francois Sehan",
    publication: "L'Oric a l'affiche", year: 1984,
  },
  {
    zip: "INCENDIE-cv.zip", member: "incendie.alexis",
    id: "incendie", title: "Incendie", author: "Jean-Francois Sehan",
    publication: "L'Oric a l'affiche", year: 1984,
  },
  {
    zip: "PIRANHAS-cv.zip", member: "sehan-piranhas/piranhas.alexis",
    id: "piranhas", title: "Piranhas", author: "Jean-Francois Sehan",
    publication: "L'Oric a l'affiche", year: 1984,
  },
  {
    zip: "DONTCRYWOLF-cv-v3.zip", member: "02-dont-cry-wolf/dontcrywolf.alexis",
    id: "dont-cry-wolf", title: "Don't Cry Wolf", author: "Czes Kosniowski",
    publication: "Games to Play on Your Oric-1", year: 1983,
  },
];

const index = JSON.parse(readFileSync(indexPath, "utf8"));
for (const project of projects) {
  let source = execFileSync("tar", ["-xOf", join(downloads, project.zip), project.member]).toString("utf8");
  for (const [before, after] of project.replacements || []) source = source.replace(before, after);
  writeFileSync(join(examples, `${project.id}.alexis`), source);
  let entry = index.find(candidate => candidate.id === project.id);
  const metadata = {
    id: project.id,
    originKind: "reimagined-adaptation",
    label: `${project.title} (${project.year})`,
    detail: `${project.author}'s Oric game from ${project.publication}, reimagined for ColecoVision with Amy Studio.`,
    projectName: project.title,
    sourceLang: "amy",
    memoryProfile: "colecovision_legacy_sdcc",
    category: "Games",
    tags: ["amy", "oric", "book", "reimagined-adaptation", "game"],
  };
  if (entry) Object.assign(entry, metadata);
  else index.push(metadata);
}

writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Imported ${projects.length} Oric book adaptations.`);
