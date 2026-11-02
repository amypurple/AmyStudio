#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const indexPath = resolve(root, "studio", "examples-src", "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const gazetteIds = new Set([
  "alfabug", "basketball-sam-ed", "blam", "bowling-champ", "canyon-cruiser",
  "cave-in", "chicken-little", "cylon-zap", "defend", "demon-star",
  "hardhat-climber", "improvisor", "martian-prisoner", "oil-tycoon", "omicron",
  "potholes", "saucer-shooter", "skidders", "skydiver", "snake-escape",
  "space-duel", "spike", "squeeze", "timepiece", "treasure-diver",
  "treasure-diver-ocean-expedition", "viper"
]);

const found = new Set();
for (const entry of index) {
  if (!gazetteIds.has(entry.id)) continue;
  entry.tags = [...new Set([...(entry.tags || []), "gazette"])];
  found.add(entry.id);
}

const missing = [...gazetteIds].filter((id) => !found.has(id));
if (missing.length) throw new Error(`Missing Gazette examples: ${missing.join(", ")}`);

writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Normalized Gazette tags for ${found.size} examples.`);
