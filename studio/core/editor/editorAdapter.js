const adapters = new WeakMap();

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

export function createEditorAdapter(element) {
  if (!element) throw new TypeError("Editor adapter requires a textarea element.");

  const textChangeListeners = new Set();

  function notifyTextChange() {
    for (const listener of textChangeListeners) listener();
  }

  function dispatchInput() {
    const EventConstructor = element.ownerDocument?.defaultView?.Event || globalThis.Event;
    if (!EventConstructor) return;
    element.dispatchEvent(new EventConstructor("input", { bubbles: true }));
  }

  function getSelection() {
    const length = String(element.value || "").length;
    return {
      start: clamp(element.selectionStart, 0, length),
      end: clamp(element.selectionEnd, 0, length),
      direction: element.selectionDirection || "none"
    };
  }

  function setSelection(start, end = start, direction = "none") {
    const length = String(element.value || "").length;
    const safeStart = clamp(start, 0, length);
    const safeEnd = clamp(end, safeStart, length);
    element.setSelectionRange(safeStart, safeEnd, direction);
  }

  const adapter = {
    element,
    getText() {
      return String(element.value || "");
    },
    setText(text, { preserveSelection = false, notify = false } = {}) {
      const selection = preserveSelection ? getSelection() : null;
      element.value = String(text ?? "");
      notifyTextChange();
      if (selection) setSelection(selection.start, selection.end, selection.direction);
      if (notify) dispatchInput();
    },
    getSelection,
    setSelection,
    replaceRange(text, start, end = start, { selection = "end", notify = true } = {}) {
      const currentLength = String(element.value || "").length;
      const safeStart = clamp(start, 0, currentLength);
      const safeEnd = clamp(end, safeStart, currentLength);
      const replacement = String(text ?? "");
      element.setRangeText(replacement, safeStart, safeEnd, "preserve");
      notifyTextChange();
      if (selection === "select") {
        setSelection(safeStart, safeStart + replacement.length);
      } else if (selection === "start") {
        setSelection(safeStart);
      } else if (selection === "end") {
        setSelection(safeStart + replacement.length);
      } else if (selection && typeof selection === "object") {
        setSelection(selection.start, selection.end, selection.direction);
      }
      if (notify) dispatchInput();
    },
    focus(options) {
      element.focus(options);
    },
    getScroll() {
      return { top: element.scrollTop || 0, left: element.scrollLeft || 0 };
    },
    setScroll({ top = element.scrollTop || 0, left = element.scrollLeft || 0 } = {}) {
      element.scrollTop = top;
      element.scrollLeft = left;
    },
    onChange(listener) {
      element.addEventListener("input", listener);
      return () => element.removeEventListener("input", listener);
    },
    onTextChange(listener) {
      textChangeListeners.add(listener);
      return () => textChangeListeners.delete(listener);
    },
    dispatchInput
  };

  return adapter;
}

export function getEditorAdapter(element) {
  let adapter = adapters.get(element);
  if (!adapter) {
    adapter = createEditorAdapter(element);
    adapters.set(element, adapter);
  }
  return adapter;
}