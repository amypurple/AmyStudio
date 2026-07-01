const DOCS = [
  {
    id: "language",
    label: "Language Reference",
    path: "../docs/amy-language.md"
  },
  {
    id: "version",
    label: "Current Version",
    path: "../docs/amy-current-version.md"
  },
  {
    id: "heritage",
    label: "Heritage",
    path: "../docs/amy-studio-heritage.md"
  },
  {
    id: "colecovision",
    label: "ColecoVision Essentials",
    path: "../docs/colecovision-essentials.md"
  },
  {
    id: "removed",
    label: "Removed Forms",
    path: "../docs/amy-removed-forms.md"
  }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const cleanHref = normalizeDocHref(href);
      return `<a href="${cleanHref}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
    });
}

function normalizeDocHref(href) {
  const raw = String(href || "").trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("#")) return escapeHtml(raw);
  if (/^[A-Za-z]:[\\/]/.test(raw)) return "#";
  if (raw.startsWith("../") || raw.startsWith("./")) return escapeHtml(raw);
  if (raw.startsWith("docs/")) return escapeHtml(`../${raw}`);
  if (raw.endsWith(".md") || raw.startsWith("archive/") || raw.startsWith("audits/")) {
    return escapeHtml(`../docs/${raw}`);
  }
  return escapeHtml(raw);
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inCode = false;
  let inList = false;
  let inTable = false;
  let paragraph = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    out.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!inList) return;
    out.push("</ul>");
    inList = false;
  }

  function closeTable() {
    if (!inTable) return;
    out.push("</tbody></table>");
    inTable = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    const codeFence = line.match(/^```/);
    if (codeFence) {
      flushParagraph();
      closeList();
      closeTable();
      out.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(rawLine));
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      closeTable();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      closeTable();
      const level = Math.min(heading[1].length + 1, 5);
      out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (/^\|.+\|$/.test(line)) {
      flushParagraph();
      closeList();
      if (/^\|\s*-+/.test(line)) continue;
      const cells = line.slice(1, -1).split("|").map((cell) => inlineMarkdown(cell.trim()));
      if (!inTable) {
        out.push("<table><tbody>");
        inTable = true;
      }
      out.push(`<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      closeTable();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    closeList();
    closeTable();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  closeTable();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

function filterMarkdown(markdown, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return markdown;
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const matches = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.toLowerCase().includes(q)) continue;
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    if (matches.length) matches.push("");
    matches.push(...lines.slice(start, end));
  }
  return matches.length ? matches.join("\n") : `No matches for "${query}".`;
}

export function createDocsUi({ els, setStatus }) {
  const cache = new Map();

  function selectedDoc() {
    const id = els.docsSelect?.value || "language";
    return DOCS.find((doc) => doc.id === id) || DOCS[0];
  }

  async function loadDoc(doc) {
    if (cache.has(doc.id)) return cache.get(doc.id);
    const response = await fetch(doc.path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Cannot load ${doc.path}: HTTP ${response.status}`);
    const text = await response.text();
    cache.set(doc.id, text);
    return text;
  }

  async function renderDocs() {
    if (!els.docsContent || !els.docsStatus) return;
    const doc = selectedDoc();
    els.docsStatus.textContent = `Loading ${doc.label}...`;
    try {
      const markdown = await loadDoc(doc);
      const filtered = filterMarkdown(markdown, els.docsSearch?.value || "");
      els.docsContent.innerHTML = markdownToHtml(filtered);
      els.docsStatus.textContent = `${doc.label} · live from ${doc.path}`;
    } catch (error) {
      els.docsContent.innerHTML = `<p>Documentation could not be loaded from the local repo server.</p><pre><code>${escapeHtml(error?.message || error)}</code></pre>`;
      els.docsStatus.textContent = "Documentation unavailable.";
      setStatus?.(`Documentation unavailable: ${error?.message || error}`);
    }
  }

  function bind() {
    if (!els.docsSelect || !els.docsContent) return;
    els.docsSelect.textContent = "";
    for (const doc of DOCS) {
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = doc.label;
      els.docsSelect.appendChild(option);
    }
    els.docsSelect.addEventListener("change", () => renderDocs());
    els.docsSearch?.addEventListener("input", () => renderDocs());
    els.btnDocsRefresh?.addEventListener("click", () => {
      cache.clear();
      renderDocs();
    });
    renderDocs();
  }

  return { bind, renderDocs };
}
