export function isEditableProjectTextPath(path) {
  return /\.(?:asm|s|inc)$/i.test(String(path || "").trim());
}

export function replaceTextSelection(value, start, end, insertion) {
  const text = String(value ?? "");
  const from = Math.max(0, Math.min(text.length, Number(start) || 0));
  const to = Math.max(from, Math.min(text.length, Number(end) || from));
  const inserted = String(insertion ?? "");
  return {
    value: text.slice(0, from) + inserted + text.slice(to),
    selectionStart: from + inserted.length,
    selectionEnd: from + inserted.length
  };
}

export function openProjectTextEditor({ entry, text, onSave, setStatus }) {
  const originalText = String(text ?? "");
  let dirty = false;

  const overlay = document.createElement("div");
  overlay.className = "graphics-editor-modal-backdrop";
  const panel = document.createElement("section");
  panel.className = "graphics-editor-modal graphics-editor-json-modal";

  const header = document.createElement("div");
  header.className = "graphics-editor-modal__header";
  const title = document.createElement("h3");
  title.textContent = entry?.path || "Project ASM";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  header.append(title, closeButton);

  const hint = document.createElement("p");
  hint.className = "graphics-editor-modal__note";
  hint.textContent = "Embedded project source. Save updates the file used by @project includes and invalidates the previous build. Ctrl+S saves; Tab inserts spaces.";

  const textarea = document.createElement("textarea");
  textarea.className = "graphics-editor-json-modal__textarea project-file-text-modal__textarea";
  textarea.spellcheck = false;
  textarea.value = originalText;

  const actions = document.createElement("div");
  actions.className = "graphics-editor-json-modal__actions";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Save";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  actions.append(saveButton, cancelButton);

  function closeEditor() {
    if (dirty && !window.confirm(`Discard unsaved changes to ${entry?.path || "project ASM"}?`)) return;
    overlay.remove();
  }

  function saveEditor() {
    onSave(textarea.value);
    dirty = false;
    setStatus?.(`Saved ${entry?.path || "project ASM"}.`);
    overlay.remove();
  }

  textarea.addEventListener("input", () => { dirty = textarea.value !== originalText; });
  textarea.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveEditor();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const replacement = replaceTextSelection(textarea.value, textarea.selectionStart, textarea.selectionEnd, "  ");
      textarea.value = replacement.value;
      textarea.setSelectionRange(replacement.selectionStart, replacement.selectionEnd);
      dirty = textarea.value !== originalText;
    }
  });

  saveButton.addEventListener("click", saveEditor);
  closeButton.addEventListener("click", closeEditor);
  cancelButton.addEventListener("click", closeEditor);

  panel.append(header, hint, textarea, actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  textarea.focus();
}
