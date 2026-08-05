export function createGraphicsEditorModal({ title, className = "", onCloseRequest = null, onAfterClose = null } = {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "graphics-editor-modal-backdrop";

  const dialog = document.createElement("div");
  dialog.className = ["graphics-editor-modal", className].filter(Boolean).join(" ");

  const header = document.createElement("div");
  header.className = "graphics-editor-modal__header";
  const titleElement = document.createElement("h3");
  titleElement.textContent = title || "Graphics editor";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "graphics-editor-modal__close";
  closeButton.textContent = "✕";
  closeButton.title = "Close";
  closeButton.setAttribute("aria-label", "Close");
  header.append(titleElement, closeButton);
  dialog.appendChild(header);

  function canClose() {
    return typeof onCloseRequest === "function" ? onCloseRequest() !== false : true;
  }

  function close() {
    if (!canClose()) return false;
    if (typeof onAfterClose === "function") onAfterClose();
    backdrop.remove();
    return true;
  }

  closeButton.addEventListener("click", () => close());
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });

  function mount() {
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
  }

  return { backdrop, dialog, closeButton, close, mount };
}