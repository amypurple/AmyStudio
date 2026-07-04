const DOCS = [
  {
    id: "language",
    label: "Language Reference",
    path: "../docs/amy-language.md"
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
      const link = normalizeDocHref(href);
      const attrs = [`href="${link.href}"`];
      if (link.internalAnchor) attrs.push(`data-doc-anchor="${link.internalAnchor}"`);
      if (link.external) attrs.push('target="_blank"', 'rel="noreferrer"');
      return `<a ${attrs.join(" ")}>${escapeHtml(label)}</a>`;
    });
}

function normalizeDocHref(href) {
  const raw = String(href || "").trim();
  if (!raw) return { href: "#" };
  if (raw.startsWith("#")) {
    const anchor = slugifyHeading(raw.slice(1));
    return { href: `#${escapeHtml(anchor)}`, internalAnchor: escapeHtml(anchor) };
  }
  if (/^https?:\/\//i.test(raw)) return { href: escapeHtml(raw), external: true };
  if (/^[A-Za-z]:[\\/]/.test(raw)) return { href: "#" };
  if (raw.startsWith("../") || raw.startsWith("./")) return { href: escapeHtml(raw), external: true };
  if (raw.startsWith("docs/")) return { href: escapeHtml(`../${raw}`), external: true };
  if (raw.endsWith(".md") || raw.startsWith("archive/") || raw.startsWith("audits/")) {
    return { href: escapeHtml(`../docs/${raw}`), external: true };
  }
  return { href: escapeHtml(raw), external: true };
}

function slugifyHeading(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
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
      const id = slugifyHeading(heading[2]);
      out.push(`<h${level} id="${escapeHtml(id)}">${inlineMarkdown(heading[2])}</h${level}>`);
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
    const text = prepareReleaseDoc(await response.text(), doc);
    cache.set(doc.id, text);
    return text;
  }

  function prepareReleaseDoc(markdown, doc) {
    let text = String(markdown || "");
    if (doc?.id === "language") {
      text = text.replace(/\n## Removed Forms Reference[\s\S]*$/i, "\n");
    }
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
      bindRenderedDocLinks();
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

  function bindRenderedDocLinks() {
    if (!els.docsContent) return;
    for (const link of els.docsContent.querySelectorAll("a[data-doc-anchor]")) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const id = link.getAttribute("data-doc-anchor");
        if (!id) return;
        const target = els.docsContent.querySelector(`#${CSS.escape(id)}`);
        if (!target) {
          els.docsStatus.textContent = `No section named #${id} in this filtered view.`;
          return;
        }
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
  }

  return { bind, renderDocs };
}
