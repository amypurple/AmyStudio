import { parseBreakpointCondition } from "../breakpointConditions.js?v=20260731-conditional-breakpoints";

const BREAKPOINT_PREFIX = "ui_";
const SOURCE_MARKER_PREFIX = "; @amy-source-line ";
const SOURCE_MARKER_STATEMENT = "debug source marker";

const INTEGER_TYPES = new Set(["auto", "u8", "i8", "u16", "i16"]);

function cleanCondition(value) {
  return String(value || "").trim();
}

export function normalizeSourceBreakpoints(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const normalized = [];
  for (const entry of value) {
    const line = Number(entry?.line);
    const rawId = String(entry?.id || "").replace(/[^A-Za-z0-9_]/g, "");
    if (!Number.isInteger(line) || line < 1 || !rawId || seen.has(rawId)) continue;
    seen.add(rawId);
    const valueType = INTEGER_TYPES.has(entry?.valueType) ? entry.valueType : "auto";
    normalized.push({
      id: rawId,
      line,
      enabled: entry?.enabled !== false,
      condition: cleanCondition(entry?.condition),
      valueType
    });
  }
  return normalized.sort((left, right) => left.line - right.line || left.id.localeCompare(right.id));
}

export function nextSourceBreakpointId(breakpoints) {
  let highest = 0;
  for (const breakpoint of normalizeSourceBreakpoints(breakpoints)) {
    const match = breakpoint.id.match(/^(?:bp_)?(\d+)$/i);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `bp_${highest + 1}`;
}

export function isBreakpointEligibleLine(rawLine) {
  const line = String(rawLine || "").trim();
  if (!line || line.startsWith("'") || /^rem(?:\s|$)/i.test(line)) return false;
  if (/^(?:project|cartridge|memory|asset|const|enum|record|data|end\s+(?:data|enum|record)|include(?:\s+asm)?|define|if\s+defined|else\s+defined|end\s+defined)\b/i.test(line)) return false;
  if (/^(?:u8|i8|u16|i16|u32|i32|fixed|ufixed|fp5|bool|bcd|timer)\b/i.test(line)) return false;
  if (/^(?:end\s+sub|end\s+function)\b/i.test(line)) return false;
  if (/^(?:else|end\s+if)\s*$/i.test(line)) return false;
  if (/^debug\s+breakpoint\b/i.test(line)) return false;
  return true;
}
export function breakpointEligibleLineNumbers(sourceText) {
  const lines = String(sourceText || "").split(/\r?\n/);
  const eligible = new Set();
  let block = "";
  let inRoutine = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (block) {
      if ((block === "asm" && line === "}") || new RegExp(`^end\\s+${block}\\b`, "i").test(line)) block = "";
      continue;
    }
    if (/^asm\s*\{$/i.test(line)) { block = "asm"; continue; }
    if (/^record\b/i.test(line)) { block = "record"; continue; }
    if (/^enum\b/i.test(line)) { block = "enum"; continue; }
    if (/^data\b/i.test(line) && !/=/.test(line)) { block = "data"; continue; }
    if (/^(?:sub|function)\b/i.test(line)) {
      inRoutine = true;
      eligible.add(index + 1);
      continue;
    }
    if (/^end\s+(?:sub|function)\b/i.test(line)) { inRoutine = false; continue; }
    if (!isBreakpointEligibleLine(line)) continue;
    const looksLikeTopLevelDeclaration = /^[A-Za-z_][A-Za-z0-9_]*\s+[A-Za-z_][A-Za-z0-9_]*(?:\s*\[|\s*=|\s*$)/.test(line);
    if (inRoutine || !looksLikeTopLevelDeclaration) eligible.add(index + 1);
  }
  return eligible;
}


function markerFollowsLine(rawLine) {
  const line = String(rawLine || "").trim();
  return /^(?:sub|function)\b/i.test(line)
    || /^[A-Za-z_][A-Za-z0-9_]*:$/.test(line)
    || /^(?:else|elseif|case)\b/i.test(line);
}
export function instrumentAmySourceWithSourceMarkers(sourceText) {
  const lines = String(sourceText || "").split(/\r?\n/);
  const eligibleLines = breakpointEligibleLineNumbers(sourceText);
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    const marker = eligibleLines.has(lineNumber)
      ? `${rawLine.match(/^\s*/)?.[0] || ""}${SOURCE_MARKER_STATEMENT} ${lineNumber}`
      : "";
    if (marker && !markerFollowsLine(rawLine)) output.push(marker);
    output.push(rawLine);
    if (marker && markerFollowsLine(rawLine)) output.push(marker);
  }
  return output.join("\n");
}

export function stripGeneratedSourceMarkers(asmText) {
  return String(asmText || "").split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith(SOURCE_MARKER_PREFIX))
    .join("\n");
}

export function instrumentAmySourceWithBreakpoints(sourceText, breakpoints) {
  const lines = String(sourceText || "").split(/\r?\n/);
  const byLine = new Map();
  const eligibleLines = breakpointEligibleLineNumbers(sourceText);
  for (const breakpoint of normalizeSourceBreakpoints(breakpoints)) {
    if (!breakpoint.enabled || breakpoint.line > lines.length) continue;
    if (!eligibleLines.has(breakpoint.line)) continue;
    byLine.set(breakpoint.line, breakpoint);
  }
  if (!byLine.size) return String(sourceText || "");

  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const breakpoint = byLine.get(index + 1);
    const marker = breakpoint
      ? `${rawLine.match(/^\s*/)?.[0] || ""}debug breakpoint "${BREAKPOINT_PREFIX}${breakpoint.id}"`
      : "";
    if (marker && !markerFollowsLine(rawLine)) output.push(marker);
    output.push(rawLine);
    if (marker && markerFollowsLine(rawLine)) output.push(marker);
  }
  return output.join("\n");
}

export function remapSourceBreakpoints(previousText, nextText, breakpoints) {
  const previous = String(previousText || "").split(/\r?\n/);
  const next = String(nextText || "").split(/\r?\n/);
  let prefix = 0;
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < previous.length - prefix
    && suffix < next.length - prefix
    && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) suffix += 1;

  const oldChangedEnd = previous.length - suffix;
  const newChangedEnd = next.length - suffix;
  const delta = next.length - previous.length;
  const nextSpan = newChangedEnd - prefix;
  return normalizeSourceBreakpoints(breakpoints).flatMap((breakpoint) => {
    if (breakpoint.line <= prefix) return [breakpoint];
    if (breakpoint.line > oldChangedEnd) return [{ ...breakpoint, line: breakpoint.line + delta }];
    if (nextSpan <= 0) return [];
    const relative = Math.max(0, breakpoint.line - prefix - 1);
    return [{ ...breakpoint, line: prefix + Math.min(relative, nextSpan - 1) + 1 }];
  });
}

export function createSourceBreakpointController({
  editor, gutterLines, popover, conditionInput, valueTypeSelect,
  saveButton, removeButton, closeButton, getProject,
  onBreakpointsChanged = () => {}
}) {
  let previousText = editor.value;
  let editingId = "";
  let currentLine = 0;

  function breakpoints() {
    const project = getProject();
    project.sourceBreakpoints = normalizeSourceBreakpoints(project.sourceBreakpoints);
    return project.sourceBreakpoints;
  }

  function commit(next) {
    getProject().sourceBreakpoints = normalizeSourceBreakpoints(next);
    render();
    onBreakpointsChanged();
  }

  function closePopover() {
    editingId = "";
    popover.classList.add("hidden");
  }

  function openPopover(breakpoint, button) {
    editingId = breakpoint.id;
    conditionInput.value = breakpoint.condition || "";
    valueTypeSelect.value = breakpoint.valueType || "auto";
    popover.classList.remove("hidden");
    const shellRect = editor.closest(".editor-shell").getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    popover.style.top = `${Math.max(4, Math.min(shellRect.height - 160, buttonRect.top - shellRect.top))}px`;
    conditionInput.focus();
    conditionInput.select();
  }

  function addAtLine(line, { edit = false, button = null } = {}) {
    const lines = editor.value.split(/\r?\n/);
    if (!breakpointEligibleLineNumbers(editor.value).has(line)) return;
    const current = breakpoints();
    let breakpoint = current.find((entry) => entry.line === line);
    if (!breakpoint) {
      breakpoint = { id: nextSourceBreakpointId(current), line, enabled: true, condition: "", valueType: "auto" };
      commit([...current, breakpoint]);
    }
    if (edit && button) openPopover(breakpoint, button);
  }

  function toggleAtLine(line) {
    const current = breakpoints();
    const existing = current.find((entry) => entry.line === line);
    if (existing) commit(current.filter((entry) => entry.id !== existing.id));
    else addAtLine(line);
  }

  function render() {
    const lines = editor.value.split(/\r?\n/);
    const byLine = new Map(breakpoints().map((entry) => [entry.line, entry]));
    gutterLines.replaceChildren();
    const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || 22.4;
    const paddingTop = Number.parseFloat(getComputedStyle(editor).paddingTop) || 0;
    const eligibleLines = breakpointEligibleLineNumbers(editor.value);
    gutterLines.style.paddingTop = `${paddingTop}px`;
    gutterLines.style.transform = `translateY(${-editor.scrollTop}px)`;
    for (let index = 0; index < lines.length; index += 1) {
      const line = index + 1;
      const breakpoint = byLine.get(line);
      const eligible = eligibleLines.has(line);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "source-breakpoint-gutter__line";
      button.style.height = `${lineHeight}px`;
      button.dataset.line = String(line);
      if (breakpoint) button.dataset.breakpoint = breakpoint.condition ? "conditional" : "active";
      if (line === currentLine) button.classList.add("is-current");
      button.disabled = !eligible;
      button.title = breakpoint
        ? breakpoint.condition
          ? `Conditional breakpoint: ${breakpoint.condition}. Click to remove; Shift+click or right-click to edit.`
          : "Breakpoint. Click to remove; Shift+click or right-click to add a condition."
        : eligible ? "Click to add a breakpoint. Shift+click or right-click for a condition." : "No executable statement on this line.";
      const number = document.createElement("span");
      number.textContent = String(line);
      button.append(number);
      button.addEventListener("click", (event) => {
        if (event.shiftKey) {
          event.preventDefault();
          addAtLine(line, { edit: true, button });
        } else toggleAtLine(line);
      });
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        addAtLine(line, { edit: true, button });
      });
      gutterLines.append(button);
    }
  }

  editor.addEventListener("scroll", () => {
    gutterLines.style.transform = `translateY(${-editor.scrollTop}px)`;
  });
  function sourceChanged() {
    const nextText = editor.value;
    getProject().sourceBreakpoints = remapSourceBreakpoints(previousText, nextText, breakpoints());
    previousText = nextText;
    render();
  }
  editor.addEventListener("input", sourceChanged);
  saveButton.addEventListener("click", () => {
    try {
      parseBreakpointCondition(conditionInput.value);
      conditionInput.setCustomValidity("");
    } catch (error) {
      conditionInput.setCustomValidity(error.message || String(error));
      conditionInput.reportValidity();
      return;
    }
    const current = breakpoints();
    commit(current.map((entry) => entry.id === editingId
      ? { ...entry, condition: cleanCondition(conditionInput.value), valueType: valueTypeSelect.value }
      : entry));
    closePopover();
  });
  removeButton.addEventListener("click", () => {
    commit(breakpoints().filter((entry) => entry.id !== editingId));
    closePopover();
  });
  closeButton.addEventListener("click", closePopover);
  conditionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); saveButton.click(); }
    if (event.key === "Escape") { event.preventDefault(); closePopover(); }
  });
  conditionInput.addEventListener("input", () => conditionInput.setCustomValidity(""));
  window.addEventListener("resize", render);

  function revealLine(line) {
    currentLine = Number(line) || 0;
    if (currentLine < 1) { render(); return; }
    const lines = editor.value.split(/\r?\n/);
    const offset = lines.slice(0, currentLine - 1).reduce((total, value) => total + value.length + 1, 0);
    editor.setSelectionRange(offset, offset + (lines[currentLine - 1]?.length || 0));
    const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || 22.4;
    editor.scrollTop = Math.max(0, (currentLine - 1) * lineHeight - editor.clientHeight / 3);
    render();
  }

  function sync() {
    previousText = editor.value;
    currentLine = 0;
    closePopover();
    render();
  }

  sync();
  return { sync, render, sourceChanged, revealLine };
}
