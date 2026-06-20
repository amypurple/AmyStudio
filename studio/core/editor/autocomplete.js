export function currentLineInfo(text, caret) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, caret - 1)) + 1;
  const lineEndRaw = text.indexOf("\n", caret);
  const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
  const line = text.slice(lineStart, lineEnd);
  return { lineStart, lineEnd, line };
}

export function currentWordInfo(text, caret) {
  let start = caret;
  let end = caret;
  while (start > 0 && /[A-Za-z0-9_$]/.test(text[start - 1])) start -= 1;
  while (end < text.length && /[A-Za-z0-9_$]/.test(text[end])) end += 1;
  return {
    start,
    end,
    word: text.slice(start, end)
  };
}

export function createAutocompleteController(ctx) {
  const {
    els,
    stripAmyInlineComment,
    isSupportedSourceTypeName,
    autocompleteCommandBias,
    AMY_AUTOCOMPLETE,
    getState,
    setState,
    onSourceMutated,
    onAutocompleteApplied,
    onScheduleInsightsRefresh
  } = ctx;

  function extractProjectAutocompleteItems(sourceText) {
    const items = [];
    const seen = new Set();
    const pushItem = (snippet, detail) => {
      if (!snippet || seen.has(snippet)) return;
      seen.add(snippet);
      items.push({ snippet, detail });
    };
    const lines = String(sourceText || "").split(/\r?\n/);
    for (const rawLine of lines) {
      let line = stripAmyInlineComment(rawLine).trim();
      if (!line) continue;
      let match = line.match(/^(?:local\s+)?(?:ram|dim)?\s*(?:bcd\s+[23]\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
      if (match && isSupportedSourceTypeName(match[1])) {
        pushItem(match[2], "RAM variable");
        continue;
      }
      match = line.match(/^(?:data|sub|function)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
      if (match) {
        const lower = line.toLowerCase();
        pushItem(
          match[1],
          lower.startsWith("data ") ? "ROM data block" : lower.startsWith("function ") ? "Function" : "Subroutine"
        );
        continue;
      }
      match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*$/);
      if (match) {
        pushItem(match[1], "Label");
      }
    }
    return items;
  }

  function closeAutocomplete() {
    setState({
      autocompleteItems: [],
      autocompleteIndex: 0,
      autocompleteWordStart: 0,
      autocompleteWordEnd: 0
    });
    els.sourceAutocomplete.innerHTML = "";
    els.sourceAutocomplete.classList.add("hidden");
  }

  function applyAutocomplete(item) {
    const editor = els.sourceEditor;
    const caretPos = editor.selectionStart;
    const state = getState();
    if (item.mode === "symbol") {
      editor.value = `${editor.value.slice(0, state.autocompleteWordStart)}${item.snippet}${editor.value.slice(state.autocompleteWordEnd)}`;
      const caret = state.autocompleteWordStart + item.snippet.length;
      editor.selectionStart = caret;
      editor.selectionEnd = caret;
    } else {
      const { lineStart, lineEnd } = currentLineInfo(editor.value, caretPos);
      const indent = (/^\s*/.exec(editor.value.slice(lineStart, lineEnd)) || [""])[0];
      const replacement = `${indent}${item.snippet}`;
      editor.value = `${editor.value.slice(0, lineStart)}${replacement}${editor.value.slice(lineEnd)}`;
      const caret = lineStart + replacement.length;
      editor.selectionStart = caret;
      editor.selectionEnd = caret;
    }
    onSourceMutated(editor.value);
    closeAutocomplete();
    onScheduleInsightsRefresh();
    if (onAutocompleteApplied) onAutocompleteApplied(item);
  }

  function renderAutocomplete(items) {
    setState({
      autocompleteItems: items,
      autocompleteIndex: 0
    });
    if (!items.length) {
      closeAutocomplete();
      return;
    }
    els.sourceAutocomplete.innerHTML = "";
    for (const [index, item] of items.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `autocomplete__item${index === 0 ? " autocomplete__item--active" : ""}`;
      button.innerHTML = `<div class="autocomplete__label">${item.snippet}</div><div class="autocomplete__detail">${item.detail}</div>`;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        applyAutocomplete(item);
      });
      els.sourceAutocomplete.appendChild(button);
    }
    els.sourceAutocomplete.classList.remove("hidden");
  }

  function syncAutocompleteSelection() {
    const { autocompleteIndex } = getState();
    const buttons = [...els.sourceAutocomplete.querySelectorAll(".autocomplete__item")];
    buttons.forEach((button, index) => {
      button.classList.toggle("autocomplete__item--active", index === autocompleteIndex);
    });
  }

  function updateAutocomplete({ force = false } = {}) {
    const editor = els.sourceEditor;
    const caret = editor.selectionStart;
    const { line } = currentLineInfo(editor.value, caret);
    const wordInfo = currentWordInfo(editor.value, caret);
    setState({
      autocompleteWordStart: wordInfo.start,
      autocompleteWordEnd: wordInfo.end
    });
    const trimmed = line.trim();
    if ((!trimmed && !force && !wordInfo.word) || /[:{}]$/.test(trimmed)) {
      closeAutocomplete();
      return;
    }
    const linePrefix = trimmed.toLowerCase();
    const wordPrefix = wordInfo.word.toLowerCase();
    const commandMatches = AMY_AUTOCOMPLETE
      .filter((item) => {
        const snippet = item.snippet.toLowerCase();
        if (linePrefix) return snippet.startsWith(linePrefix) && snippet !== linePrefix;
        return force;
      })
      .map((item) => ({
        ...item,
        mode: "command",
        score: (linePrefix ? 0 : 2) + autocompleteCommandBias(item.snippet) + Math.min(item.snippet.length / 120, 0.9)
      }));
    const symbolMatches = extractProjectAutocompleteItems(editor.value)
      .filter((item) => {
        if (!wordPrefix) return force;
        return item.snippet.toLowerCase().startsWith(wordPrefix) && item.snippet.toLowerCase() !== wordPrefix;
      })
      .map((item) => ({ ...item, mode: "symbol", score: 1 }));
    const merged = [...commandMatches, ...symbolMatches]
      .sort((a, b) => a.score - b.score || a.snippet.localeCompare(b.snippet))
      .slice(0, 10);
    const matches = [];
    const seen = new Set();
    for (const item of merged) {
      if (seen.has(item.snippet)) continue;
      seen.add(item.snippet);
      matches.push(item);
    }
    renderAutocomplete(matches);
  }

  return {
    currentLineInfo,
    currentWordInfo,
    closeAutocomplete,
    applyAutocomplete,
    renderAutocomplete,
    syncAutocompleteSelection,
    updateAutocomplete
  };
}
