import { filterMarkdown, markdownToHtml } from "../studio/core/docsUi.js";

const documents = [
  ["current", "Current Amy Version", "amy-current-version.md"],
  ["language", "Amy Language Reference", "amy-language.md"],
  ["optimization", "Optimization Cookbook", "amy-optimization-cookbook.md"],
  ["graphics", "Graphics Editors Guide", "amy-graphics-editors-guide.md"],
  ["workflow", "Studio Workflow", "studio-workflow.md"],
  ["colecovision", "ColecoVision Essentials", "colecovision-essentials.md"],
  ["controllers", "Official Controller Routines", "colecovision-official-controller-routines.md"],
  ["compression", "Compression Suite", "compression-suite.md"],
  ["debugging", "ROM Runtime Testing", "rom-runtime-testing.md"],
  ["heritage", "Amy Studio Heritage", "amy-studio-heritage.md"]
].map(([id, label, path]) => ({ id, label, path }));

const select = document.querySelector("#docSelect");
const search = document.querySelector("#docSearch");
const content = document.querySelector("#docContent");
const title = document.querySelector("#documentTitle");
const rawLink = document.querySelector("#rawDocument");
const cache = new Map();

for (const doc of documents) {
  const option = document.createElement("option");
  option.value = doc.id;
  option.textContent = doc.label;
  select.append(option);
}

function selectedDocument() {
  return documents.find((doc) => doc.id === select.value) || documents[1];
}

async function loadDocument(doc) {
  if (!cache.has(doc.id)) {
    const response = await fetch(doc.path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Cannot load ${doc.path} (HTTP ${response.status})`);
    cache.set(doc.id, await response.text());
  }
  return cache.get(doc.id);
}

async function render({ updateUrl = true } = {}) {
  const doc = selectedDocument();
  title.textContent = doc.label;
  document.title = `${doc.label} | Amy Studio`;
  rawLink.href = `./${doc.path}`;
  content.textContent = "Loading documentation...";
  try {
    const markdown = await loadDocument(doc);
    content.innerHTML = markdownToHtml(filterMarkdown(markdown, search.value));
    if (updateUrl) history.replaceState(null, "", `?doc=${encodeURIComponent(doc.id)}`);
  } catch (error) {
    content.textContent = error.message;
  }
}

const requested = new URLSearchParams(location.search).get("doc");
select.value = documents.some((doc) => doc.id === requested) ? requested : "language";
select.addEventListener("change", () => { search.value = ""; render(); });
search.addEventListener("input", () => render({ updateUrl: false }));
render({ updateUrl: false });
