import { DOCS } from "./docsUi.js";
import { createReadOnlyAssistantTools, listAssistantTools } from "./assistantToolRegistry.js";
import { loadExamplesIndex } from "./exampleSourceLoader.js";

function appendText(parent, tag, text, className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  parent.appendChild(node);
  return node;
}

export function createAssistantUi({ els, setStatus, openDocument, inspectExample, openExample, getProject, goToSourceLine, showProjectFiles }) {
  let examplesPromise = null;
  const tools = createReadOnlyAssistantTools({
    documents: DOCS,
    fetchDocument: async (doc) => {
      const response = await fetch(doc.path, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Cannot load ${doc.path}: HTTP ${response.status}`);
      return response.text();
    },
    getExamples: async () => {
      if (!examplesPromise) examplesPromise = loadExamplesIndex();
      return examplesPromise;
    },
    getProject
  });

  function appendResult(result, query) {
    const card = document.createElement("div");
    card.className = "assistant-result";
    const heading = document.createElement("div");
    heading.className = "assistant-result__heading";
    appendText(heading, "strong", result.label);
    const meta = result.type === "example" && result.category
      ? `Example · ${result.category}`
      : ({ example: "Example", source: `Amy source · line ${result.line}`, file: "Project file", document: "Documentation" }[result.type] || "Result");
    appendText(heading, "small", meta);
    card.appendChild(heading);
    if (result.excerpt) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Show matching context";
      details.appendChild(summary);
      appendText(details, result.type === "source" ? "pre" : "p", result.excerpt);
      card.appendChild(details);
    }
    const actions = document.createElement("div");
    actions.className = "assistant-result__actions";
    const addAction = (label, handler) => {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "assistant-result__action";
      action.textContent = label;
      action.addEventListener("click", handler);
      actions.appendChild(action);
    };
    if (result.type === "example") {
      addAction("Inspect", () => void inspectExample?.(result.id));
      addAction("Open in new tab", () => void openExample?.(result.id));
    } else if (result.type === "source") {
      addAction("Go to line", () => goToSourceLine?.(result.line));
    } else if (result.type === "file") {
      addAction("Show in Files", () => showProjectFiles?.(result.path));
    } else {
      addAction("Open in Docs", () => void openDocument?.(result.id, query));
    }
    card.appendChild(actions);
    els.assistantOutput.appendChild(card);
  }

  function renderResponse(response) {
    els.assistantOutput.textContent = "";
    if (response.kind === "help") {
      appendText(els.assistantOutput, "p", "Available read-only commands:");
      for (const tool of response.tools) appendText(els.assistantOutput, "code", `${tool.usage} - ${tool.description}`);
      return;
    }
    if (response.kind === "message" || response.kind === "error") {
      appendText(els.assistantOutput, "p", response.text, response.kind === "error" ? "assistant-error" : "");
      return;
    }
    if (response.kind === "project") {
      const project = response.project;
      appendText(els.assistantOutput, "strong", project.name);
      appendText(els.assistantOutput, "p", `${project.sourceLines} source lines · ${project.sourceBytes.toLocaleString()} UTF-8 bytes`);
      appendText(els.assistantOutput, "p", `${project.fileCount} embedded files · ${project.breakpointCount} breakpoints`);
      appendText(els.assistantOutput, "p", `Optimization: ${project.optimizationLevel} · Memory: ${project.memoryProfile}`);
      return;
    }
    if (!response.results.length) {
      appendText(els.assistantOutput, "p", `No approved documentation or example metadata matched "${response.query}".`);
      return;
    }
    appendText(els.assistantOutput, "p", `${response.results.length} result${response.results.length === 1 ? "" : "s"} for "${response.query}".`, "assistant-result-count");
    for (const result of response.results) appendResult(result, response.query);
  }

  async function submit() {
    const input = els.assistantInput.value.trim();
    els.assistantRun.disabled = true;
    els.assistantStatus.textContent = "Searching local Amy Studio knowledge...";
    try {
      renderResponse(await tools.execute(input));
      els.assistantStatus.textContent = "Read-only · local files only · no AI service connected";
    } catch (error) {
      renderResponse({ kind: "error", text: error?.message || String(error) });
      els.assistantStatus.textContent = "Assistant search failed.";
      setStatus?.(`Assistant search failed: ${error?.message || error}`);
    } finally {
      els.assistantRun.disabled = false;
    }
  }

  function bind() {
    els.assistantRun.addEventListener("click", submit);
    els.assistantInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void submit();
    });
    els.assistantInput.value = "/help";
    els.assistantInput.disabled = false;
    els.assistantRun.disabled = false;
    renderResponse({ kind: "help", tools: listAssistantTools() });
    els.assistantStatus.textContent = "Read-only · local files only · no AI service connected";
  }

  return { bind };
}
