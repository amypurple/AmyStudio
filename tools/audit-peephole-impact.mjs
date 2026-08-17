#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(`Usage:
  node tools/audit-peephole-impact.mjs --before <audit.json> --after <audit.json> [options]

Options:
  --expect-pattern <text>       MDL pattern message expected to decrease. Repeatable.
  --expect-remove-regex <re>    Removed ASM line expected from this peephole. Repeatable.
  --md-out <file>               Write Markdown report.
  --json-out <file>             Write JSON report.
  --fail-on-review              Exit non-zero when unexpected removals are found.

Purpose:
  Compare two post-built-in oracle audits after adding an optimizer rule. The
  report separates expected peephole effects from collateral ASM removals and
  highlights high-risk removals that need manual review before the rule should
  be trusted in Safe/Balanced.`);
}

function parseArgs(argv) {
  const out = {
    expectPatterns: [],
    expectRemoveRegexes: [],
    failOnReview: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--before":
        out.before = argv[++i];
        break;
      case "--after":
        out.after = argv[++i];
        break;
      case "--expect-pattern":
        out.expectPatterns.push(argv[++i]);
        break;
      case "--expect-remove-regex":
        out.expectRemoveRegexes.push(argv[++i]);
        break;
      case "--md-out":
        out.mdOut = argv[++i];
        break;
      case "--json-out":
        out.jsonOut = argv[++i];
        break;
      case "--fail-on-review":
        out.failOnReview = true;
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function byId(audit) {
  return new Map((audit.examples || []).map((example) => [example.id, example]));
}

function patternTotals(audit) {
  const totals = new Map();
  for (const example of audit.examples || []) {
    for (const pattern of example.mdlPatterns || []) {
      const prior = totals.get(pattern.message) || { message: pattern.message, count: 0, bytes: 0 };
      prior.count += 1;
      prior.bytes += Number(pattern.bytes || 0);
      totals.set(pattern.message, prior);
    }
  }
  return totals;
}

function normalizeAsmLine(line) {
  const withoutComment = line.split(";", 1)[0].trim();
  if (!withoutComment) return "";
  return withoutComment.replace(/\s+/g, " ").toLowerCase();
}

function isExecutableLine(normalized) {
  if (!normalized) return false;
  if (/^[a-z_.$?][\w.$?]*:$/.test(normalized)) return false;
  if (/^(org|equ|defb|defw|defs|db|dw|ds|include|incbin|macro|endm|section)\b/.test(normalized)) return false;
  return true;
}

function asmLineCounts(file) {
  if (!file || !fs.existsSync(file)) return { counts: new Map(), samples: new Map(), missing: true };
  const counts = new Map();
  const samples = new Map();
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const normalized = normalizeAsmLine(line);
    if (!isExecutableLine(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
    if (!samples.has(normalized)) samples.set(normalized, line.trim());
  }
  return { counts, samples, missing: false };
}

function removedLineCounts(beforeFile, afterFile) {
  const before = asmLineCounts(beforeFile);
  const after = asmLineCounts(afterFile);
  const removed = [];
  if (before.missing || after.missing) {
    return { removed, missing: before.missing || after.missing };
  }
  for (const [line, count] of before.counts.entries()) {
    const afterCount = after.counts.get(line) || 0;
    if (count > afterCount) {
      removed.push({
        line,
        sample: before.samples.get(line) || line,
        count: count - afterCount
      });
    }
  }
  return { removed, missing: false };
}

function regexes(patterns) {
  return patterns.map((pattern) => new RegExp(pattern, "i"));
}

function matchesAny(line, compiled) {
  return compiled.some((re) => re.test(line));
}

function isHighRiskRemoval(line) {
  return /^(push af|pop af|call\b|rst\b|ret\b|reti\b|retn\b|jp\b|jr\b|djnz\b|in\b|out\b|ldir\b|lddr\b|ldi\b|ldd\b|exx\b|ex\b|sub\b|cp\b|add a\b|adc\b|sbc\b|and\b|or\b|xor\b|rla\b|rra\b|rlca\b|rrca\b|rl\b|rr\b|sla\b|sra\b|srl\b|bit\b|set\b|res\b)/i.test(line);
}

function resolveAuditPath(auditFile, repoPath) {
  if (!repoPath) return null;
  if (path.isAbsolute(repoPath)) return repoPath;
  return path.resolve(process.cwd(), repoPath);
}

function markdownTable(headers, rows) {
  const escape = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`)
  ].join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.before || !options.after) {
    usage();
    process.exit(options.help ? 0 : 1);
  }

  const before = readJson(options.before);
  const after = readJson(options.after);
  const beforeById = byId(before);
  const afterById = byId(after);
  const expectedPatterns = new Set(options.expectPatterns.map((p) => p.toLowerCase()));
  const expectedRemoveRegexes = regexes(options.expectRemoveRegexes);

  const beforePatterns = patternTotals(before);
  const afterPatterns = patternTotals(after);
  const allPatternMessages = new Set([...beforePatterns.keys(), ...afterPatterns.keys()]);
  const patternDeltas = [...allPatternMessages].map((message) => {
    const b = beforePatterns.get(message) || { count: 0, bytes: 0 };
    const a = afterPatterns.get(message) || { count: 0, bytes: 0 };
    return {
      message,
      beforeCount: b.count,
      afterCount: a.count,
      countDelta: a.count - b.count,
      beforeBytes: b.bytes,
      afterBytes: a.bytes,
      bytesDelta: a.bytes - b.bytes,
      expected: expectedPatterns.has(message.toLowerCase())
    };
  }).sort((a, b) => Math.abs(b.bytesDelta) - Math.abs(a.bytesDelta));

  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort();
  const sizeDeltas = [];
  const removedSummary = [];
  const unexpectedRemovals = [];
  const highRiskRemovals = [];
  const statusChanges = [];
  let missingAsm = 0;

  for (const id of ids) {
    const b = beforeById.get(id);
    const a = afterById.get(id);
    if (!b || !a) {
      statusChanges.push({ id, before: b ? b.status : "missing", after: a ? a.status : "missing" });
      continue;
    }
    if (b.status !== a.status) {
      statusChanges.push({ id, before: b.status, after: a.status });
    }
    const sizeDelta = Number(a.builtinRomSize || 0) - Number(b.builtinRomSize || 0);
    if (sizeDelta !== 0) {
      sizeDeltas.push({
        id,
        before: b.builtinRomSize,
        after: a.builtinRomSize,
        delta: sizeDelta
      });
    }

    const bAsm = resolveAuditPath(options.before, b.builtinAsmPath);
    const aAsm = resolveAuditPath(options.after, a.builtinAsmPath);
    const diff = removedLineCounts(bAsm, aAsm);
    if (diff.missing) {
      missingAsm += 1;
      continue;
    }
    for (const removed of diff.removed) {
      const expected = matchesAny(removed.line, expectedRemoveRegexes);
      const highRisk = isHighRiskRemoval(removed.line);
      removedSummary.push({ id, ...removed, expected, highRisk });
      if (!expected) {
        unexpectedRemovals.push({ id, ...removed, highRisk });
      }
      if (highRisk && !expected) {
        highRiskRemovals.push({ id, ...removed });
      }
    }
  }

  const beforeResidual = Number(before.totals?.mdlResidualBytes || 0);
  const afterResidual = Number(after.totals?.mdlResidualBytes || 0);
  const beforeCoptChanged = Number(before.totals?.coptChangedRuns || 0);
  const afterCoptChanged = Number(after.totals?.coptChangedRuns || 0);
  const afterFailures = Number(after.failed || 0);
  const beforeFailures = Number(before.failed || 0);
  const netSizeDelta = sizeDeltas.reduce((sum, row) => sum + row.delta, 0);
  const reviewNeeded = statusChanges.length > 0 || afterFailures > beforeFailures || afterCoptChanged > beforeCoptChanged || unexpectedRemovals.length > 0 || highRiskRemovals.length > 0;

  const report = {
    generatedAt: new Date().toISOString(),
    before: options.before,
    after: options.after,
    gate: reviewNeeded ? "REVIEW" : "PASS",
    summary: {
      beforeOk: before.ok,
      afterOk: after.ok,
      beforeFailed: beforeFailures,
      afterFailed: afterFailures,
      beforeMdlResidualBytes: beforeResidual,
      afterMdlResidualBytes: afterResidual,
      mdlResidualDelta: afterResidual - beforeResidual,
      beforeCoptChangedRuns: beforeCoptChanged,
      afterCoptChangedRuns: afterCoptChanged,
      netBuiltinRomSizeDelta: netSizeDelta,
      changedExamples: sizeDeltas.length,
      removedExecutableLines: removedSummary.reduce((sum, item) => sum + item.count, 0),
      unexpectedRemovedExecutableLines: unexpectedRemovals.reduce((sum, item) => sum + item.count, 0),
      highRiskUnexpectedRemovedLines: highRiskRemovals.reduce((sum, item) => sum + item.count, 0),
      missingAsm
    },
    expectedPatterns: options.expectPatterns,
    expectedRemoveRegexes: options.expectRemoveRegexes,
    statusChanges,
    sizeDeltas,
    patternDeltas,
    unexpectedRemovals: unexpectedRemovals.slice(0, 100),
    highRiskRemovals: highRiskRemovals.slice(0, 100)
  };

  if (options.jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(options.jsonOut)), { recursive: true });
    fs.writeFileSync(options.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (options.mdOut) {
    const expectedPatternRows = patternDeltas
      .filter((row) => row.expected || row.bytesDelta !== 0)
      .slice(0, 40)
      .map((row) => [
        row.expected ? "expected" : "collateral",
        row.message,
        `${row.beforeCount} -> ${row.afterCount}`,
        `${row.beforeBytes} -> ${row.afterBytes}`,
        row.bytesDelta
      ]);
    const sizeRows = sizeDeltas
      .sort((a, b) => a.delta - b.delta)
      .map((row) => [row.id, row.before, row.after, row.delta]);
    const unexpectedRows = unexpectedRemovals
      .slice(0, 40)
      .map((row) => [row.highRisk ? "HIGH" : "review", row.id, row.count, `\`${row.sample}\``]);
    const highRiskRows = highRiskRemovals
      .slice(0, 40)
      .map((row) => [row.id, row.count, `\`${row.sample}\``]);

    const md = [
      `# Peephole Impact Audit - ${new Date().toISOString().slice(0, 10)}`,
      "",
      `Before: \`${options.before}\``,
      `After: \`${options.after}\``,
      "",
      `Gate: **${report.gate}**`,
      "",
      "## Summary",
      "",
      markdownTable(
        ["Metric", "Before", "After", "Delta"],
        [
          ["Examples OK", before.ok, after.ok, Number(after.ok || 0) - Number(before.ok || 0)],
          ["Examples failed", beforeFailures, afterFailures, afterFailures - beforeFailures],
          ["MDL residual bytes", beforeResidual, afterResidual, afterResidual - beforeResidual],
          ["copt changed runs", beforeCoptChanged, afterCoptChanged, afterCoptChanged - beforeCoptChanged],
          ["Built-in ROM bytes", "", "", netSizeDelta],
          ["Changed examples", "", "", sizeDeltas.length],
          ["Unexpected removed executable lines", "", "", report.summary.unexpectedRemovedExecutableLines],
          ["High-risk unexpected removals", "", "", report.summary.highRiskUnexpectedRemovedLines]
        ]
      ),
      "",
      "## MDL Pattern Deltas",
      "",
      expectedPatternRows.length
        ? markdownTable(["Class", "Pattern", "Count", "Bytes", "Delta"], expectedPatternRows)
        : "No MDL pattern deltas.",
      "",
      "## Built-In ROM Size Deltas",
      "",
      sizeRows.length ? markdownTable(["Example", "Before", "After", "Delta"], sizeRows) : "No built-in ROM size changes.",
      "",
      "## Unexpected Removed ASM Lines",
      "",
      unexpectedRows.length
        ? markdownTable(["Risk", "Example", "Count", "Removed line"], unexpectedRows)
        : "No unexpected executable ASM removals beyond the configured expected regexes.",
      "",
      "## High-Risk Unexpected Removals",
      "",
      highRiskRows.length
        ? markdownTable(["Example", "Count", "Removed line"], highRiskRows)
        : "No high-risk unexpected removals.",
      "",
      "## Interpretation Rule",
      "",
      "- `PASS` means the after audit still compiles, copt did not start rewriting extra code, and all removed executable lines matched the expected peephole regexes.",
      "- `REVIEW` means at least one collateral removal, status change, copt change, or high-risk line needs manual inspection before trusting the new rule.",
      "- High-risk means the removed line can affect flags, control flow, I/O, calls, or AF preservation unless a separate liveness proof exists.",
      "",
      "## Re-run Command Shape",
      "",
      "```powershell",
      "node tools/audit-peephole-impact.mjs --before <old-audit.json> --after <new-audit.json> `",
      "  --expect-pattern \"Remove duplicate ld d,0\" `",
      "  --expect-remove-regex \"^\\\\s*ld\\\\s+d\\\\s*,\\\\s*0\\\\s*$\" `",
      "  --md-out docs/audits/optimizer-peephole-impact-YYYY-MM-DD.md",
      "```",
      ""
    ].join("\n");

    fs.mkdirSync(path.dirname(path.resolve(options.mdOut)), { recursive: true });
    fs.writeFileSync(options.mdOut, md);
  }

  console.log(JSON.stringify({
    gate: report.gate,
    summary: report.summary,
    mdOut: options.mdOut || null,
    jsonOut: options.jsonOut || null
  }, null, 2));

  if (options.failOnReview && reviewNeeded) {
    process.exit(2);
  }
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exit(1);
}
