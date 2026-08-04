#!/usr/bin/env node
import assert from "node:assert/strict";

import { alexisRuntimeCatalog } from "../studio/core/alexisRuntimeCatalog.generated.js";

const missing = [];
for (const [symbol, entry] of Object.entries(alexisRuntimeCatalog)) {
  const declared = new Set(entry.deps || []);
  const transfers = String(entry.asm || "").matchAll(/^\s*(?:call|jp|jr)\s+(?:nz\s*,\s*|z\s*,\s*|nc\s*,\s*|c\s*,\s*|po\s*,\s*|pe\s*,\s*|p\s*,\s*|m\s*,\s*)?(AMY_[A-Z0-9_]+)\b/gim);
  for (const match of transfers) {
    const target = match[1].toUpperCase();
    if (target === symbol || !alexisRuntimeCatalog[target]) continue;
    if (!declared.has(target)) missing.push(`${symbol} -> ${target}`);
  }
}

assert.deepEqual(missing, [], `runtime catalog has undeclared direct dependencies:\n${missing.join("\n")}`);
console.log(`runtime catalog dependencies: PASS (${Object.keys(alexisRuntimeCatalog).length} routines)`);