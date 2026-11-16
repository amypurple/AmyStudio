#!/usr/bin/env node

process.argv.push("--experimental-record-ix");
await import("./test-state-update-benchmark.mjs");
