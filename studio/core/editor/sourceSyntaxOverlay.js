import { getEditorAdapter } from "./editorAdapter.js";
import { tokenizeAmySource } from "./amySyntaxTokenizer.js?v=20260804-vdp-toggle-colors";

export const AMY_SYNTAX_COLORS_STORAGE_KEY = "amy_studio_syntax_colors_v1";

export function amySyntaxColorWord(language = globalThis.navigator?.language || "") {
  return /^en-US(?:$|-)/i.test(language) ? "color" : "colour";
}

export function loadAmySyntaxColorsPreference(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(AMY_SYNTAX_COLORS_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function saveAmySyntaxColorsPreference(enabled, storage = globalThis.localStorage) {
  try {
    storage?.setItem(AMY_SYNTAX_COLORS_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Storage can be unavailable in private or embedded browser contexts.
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderTokenLines(tokenLines) {
  return tokenLines
    .map((tokens) => tokens.map(({ type, text }) => {
      const escaped = escapeHtml(text);
      return type === "plain" || type === "identifier"
        ? escaped
        : '<span class="amy-token amy-token--' + type + '">' + escaped + "</span>";
    }).join(""))
    .join("\n");
}

export function renderAmySyntaxHtml(source, { startLine = 0, endLine = Infinity } = {}) {
  const tokenLines = tokenizeAmySource(source);
  return renderTokenLines(tokenLines.slice(startLine, endLine));
}

export function createAmySyntaxOverlay(editorElement, { enabled: initiallyEnabled = true } = {}) {
  if (!editorElement) throw new TypeError("Syntax overlay requires the source textarea.");
  const adapter = getEditorAdapter(editorElement);
  const documentRef = editorElement.ownerDocument;
  const overlay = documentRef.createElement("div");
  overlay.className = "amy-syntax-overlay";
  overlay.setAttribute("aria-hidden", "true");
  const content = documentRef.createElement("pre");
  content.className = "amy-syntax-overlay__content";
  overlay.appendChild(content);
  editorElement.parentNode.insertBefore(overlay, editorElement);

  let renderFrame = 0;
  let scrollFrame = 0;
  let lastText = null;
  let tokenLines = [];
  let enabled = Boolean(initiallyEnabled);

  function syncGeometry() {
    overlay.style.left = editorElement.offsetLeft + "px";
    overlay.style.top = editorElement.offsetTop + "px";
    overlay.style.width = editorElement.offsetWidth + "px";
    overlay.style.height = editorElement.offsetHeight + "px";
  }
  function renderViewport() {
    if (!enabled) return;
    const style = documentRef.defaultView?.getComputedStyle(editorElement);
    const lineHeight = Number.parseFloat(style?.lineHeight) || 22.4;
    const { top, left } = adapter.getScroll();
    const startLine = Math.max(0, Math.floor(top / lineHeight) - 6);
    const visibleLines = Math.ceil(editorElement.clientHeight / lineHeight) + 12;
    const endLine = Math.min(tokenLines.length, startLine + visibleLines);
    content.innerHTML = renderTokenLines(tokenLines.slice(startLine, endLine)) + "\n";
    content.style.transform = "translate(" + (-left) + "px," + (startLine * lineHeight - top) + "px)";
  }

  function renderNow() {
    renderFrame = 0;
    if (!enabled) return;
    const text = adapter.getText();
    if (text !== lastText) {
      lastText = text;
      tokenLines = tokenizeAmySource(text);
    }
    renderViewport();
  }

  function scheduleRender() {
    if (!enabled || renderFrame) return;
    renderFrame = requestAnimationFrame(renderNow);
  }

  function syncScrollNow() {
    scrollFrame = 0;
    renderViewport();
  }

  function scheduleScrollSync() {
    if (!enabled || scrollFrame) return;
    scrollFrame = requestAnimationFrame(syncScrollNow);
  }

  const unsubscribeText = adapter.onTextChange(scheduleRender);
  const unsubscribeInput = adapter.onChange(scheduleRender);
  editorElement.addEventListener("scroll", scheduleScrollSync, { passive: true });

  const ResizeObserverConstructor = documentRef.defaultView?.ResizeObserver;
  const resizeObserver = ResizeObserverConstructor
    ? new ResizeObserverConstructor(() => {
        syncGeometry();
        scheduleScrollSync();
      })
    : null;
  resizeObserver?.observe(editorElement);

  function setEnabled(nextEnabled) {
    const next = Boolean(nextEnabled);
    if (enabled === next && overlay.hidden === !next) return;
    enabled = next;
    overlay.hidden = !enabled;
    editorElement.classList.toggle("source-editor--syntax-disabled", !enabled);
    if (!enabled) {
      if (renderFrame) cancelAnimationFrame(renderFrame);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      renderFrame = 0;
      scrollFrame = 0;
      lastText = null;
      tokenLines = [];
      content.textContent = "";
      return;
    }
    syncGeometry();
    renderNow();
  }

  overlay.hidden = !enabled;
  editorElement.classList.toggle("source-editor--syntax-disabled", !enabled);
  if (enabled) renderNow();

  return {
    element: overlay,
    refresh: scheduleRender,
    isEnabled: () => enabled,
    setEnabled,
    destroy() {
      if (renderFrame) cancelAnimationFrame(renderFrame);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      unsubscribeText();
      unsubscribeInput();
      resizeObserver?.disconnect();
      editorElement.removeEventListener("scroll", scheduleScrollSync);
      overlay.remove();
    }
  };
}