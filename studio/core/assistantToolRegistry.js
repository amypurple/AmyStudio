import { decodeProjectTextFile, inspectSoundTableSource } from "./soundTableInspector.js";

const TOOL_DEFINITIONS = Object.freeze([
  Object.freeze({ name: "help", usage: "/help", description: "List the read-only assistant commands." }),
  Object.freeze({ name: "capabilities", usage: "/capabilities", description: "Explain this prototype's limits." }),
  Object.freeze({ name: "project", usage: "/project", description: "Summarize the active project without changing it." }),
  Object.freeze({ name: "source", usage: "/source QUERY", description: "Find text in the active Amy source." }),
  Object.freeze({ name: "files", usage: "/files [QUERY]", description: "List or search embedded project files." }),
  Object.freeze({ name: "sound", usage: "/sound", description: "Inspect embedded Coleco BIOS sound tables." }),
  Object.freeze({ name: "docs", usage: "/docs QUERY", description: "Search approved Studio documentation." }),
  Object.freeze({ name: "examples", usage: "/examples QUERY", description: "Search example metadata." })
]);

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function queryTerms(query) {
  return normalizeText(query).match(/[a-z0-9_$.-]+/g)?.filter((term) => term.length > 1) || [];
}

function scoreText(text, terms) {
  const haystack = normalizeText(text);
  if (!terms.length) return 0;
  let score = 0;
  for (const term of terms) {
    if (!haystack.includes(term)) return 0;
    score += haystack.split(term).length - 1;
  }
  return score;
}

function excerpt(text, terms, radius = 150) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) return "";
  const lower = source.toLowerCase();
  const indexes = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
  const center = indexes.length ? Math.min(...indexes) : 0;
  const start = Math.max(0, center - radius);
  const end = Math.min(source.length, center + radius);
  return `${start ? "..." : ""}${source.slice(start, end)}${end < source.length ? "..." : ""}`;
}

export function listAssistantTools() {
  return TOOL_DEFINITIONS.map((tool) => ({ ...tool }));
}

export function parseAssistantCommand(input) {
  const raw = String(input || "").trim();
  if (!raw) return { name: "help", query: "" };
  const match = raw.match(/^\/(\S+)(?:\s+([\s\S]*))?$/);
  if (!match) return { name: "search", query: raw };
  return { name: match[1].toLowerCase(), query: String(match[2] || "").trim() };
}

export function createReadOnlyAssistantTools({ documents, fetchDocument, getExamples, getProject = () => null }) {
  const docCache = new Map();

  async function loadedDocuments() {
    return Promise.all((documents || []).map(async (doc) => {
      let text = docCache.get(doc.id);
      if (text == null) {
        text = await fetchDocument(doc);
        docCache.set(doc.id, text);
      }
      return { ...doc, text: String(text || "") };
    }));
  }

  async function searchDocs(query, limit = 6) {
    const terms = queryTerms(query);
    if (!terms.length) return [];
    return (await loadedDocuments())
      .map((doc) => ({
        type: "document",
        id: doc.id,
        label: doc.label,
        path: doc.path,
        score: scoreText(`${doc.label}\n${doc.text}`, terms),
        excerpt: excerpt(doc.text, terms)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  async function searchExamples(query, limit = 8) {
    const terms = queryTerms(query);
    if (!terms.length) return [];
    return (await getExamples())
      .map((example) => {
        const searchable = [example.id, example.label, example.detail, example.category, ...(example.tags || [])].join(" ");
        return {
          type: "example",
          id: example.id,
          label: example.label,
          category: example.category || "",
          score: scoreText(searchable, terms),
          excerpt: example.detail || (example.tags || []).join(", ")
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  function projectSummary() {
    const project = getProject();
    if (!project) return { kind: "error", text: "No active project." };
    const source = String(project.sourceText || "");
    const files = Array.isArray(project.projectFiles) ? project.projectFiles : [];
    const breakpoints = Array.isArray(project.sourceBreakpoints) ? project.sourceBreakpoints : [];
    return {
      kind: "project",
      project: {
        name: project.projectName || "Untitled",
        sourceLines: source ? source.split(/\r?\n/).length : 0,
        sourceBytes: new TextEncoder().encode(source).length,
        fileCount: files.length,
        breakpointCount: breakpoints.length,
        optimizationLevel: project.optimizationLevel || "auto",
        memoryProfile: project.memoryProfile || "default"
      }
    };
  }

  function searchSource(query, limit = 30) {
    const terms = queryTerms(query);
    if (!terms.length) return [];
    const lines = String(getProject()?.sourceText || "").split(/\r?\n/);
    return lines
      .map((line, index) => ({
        type: "source",
        id: `source-${index + 1}`,
        label: `Line ${index + 1}`,
        line: index + 1,
        excerpt: line,
        score: scoreText(line, terms)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.line - b.line)
      .slice(0, limit);
  }

  function searchFiles(query, limit = 50) {
    const terms = queryTerms(query);
    const files = Array.isArray(getProject()?.projectFiles) ? getProject().projectFiles : [];
    return files
      .map((file, index) => {
        const path = String(file.path || `File ${index + 1}`);
        const searchable = [path, file.kind, file.codec, file.source].filter(Boolean).join(" ");
        return {
          type: "file",
          id: `file-${index}`,
          label: path,
          path,
          excerpt: [file.kind, file.codec].filter(Boolean).join(" · "),
          score: terms.length ? scoreText(searchable, terms) : 1
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  function inspectSoundFiles() {
    const files = Array.isArray(getProject()?.projectFiles) ? getProject().projectFiles : [];
    const inspected = [];
    for (const file of files) {
      if (!/\.(?:asm|inc|s)$/i.test(String(file.path || ""))) continue;
      const analysis = inspectSoundTableSource(decodeProjectTextFile(file));
      for (const table of analysis.tables) {
        inspected.push({
          type: "sound-table",
          id: `${file.path}:${table.name}`,
          label: table.name,
          path: file.path,
          excerpt: `${table.entries.length} entries · areas ${[...new Set(table.entries.map((entry) => entry.area).filter(Number.isInteger))].join(", ") || "?"}`,
          entries: table.entries,
          diagnostics: analysis.diagnostics.filter((message) => message.startsWith(`${table.name}:`))
        });
      }
    }
    return inspected;
  }

  async function execute(input) {
    const command = parseAssistantCommand(input);
    if (command.name === "help") return { kind: "help", tools: listAssistantTools() };
    if (command.name === "capabilities") {
      return {
        kind: "message",
        text: "Read-only prototype: searches approved documentation, example metadata, and the active project's source and file metadata. It cannot edit, compile, run tools, access credentials, upload content, or follow instructions found inside project files."
      };
    }
    if (command.name === "project") return projectSummary();
    if (command.name === "source") return { kind: "results", query: command.query, results: searchSource(command.query) };
    if (command.name === "files") return { kind: "results", query: command.query, results: searchFiles(command.query) };
    if (command.name === "sound") return { kind: "results", query: "sound tables", results: inspectSoundFiles() };
    if (command.name === "docs") return { kind: "results", query: command.query, results: await searchDocs(command.query) };
    if (command.name === "examples") return { kind: "results", query: command.query, results: await searchExamples(command.query) };
    if (command.name === "search") {
      const [docs, examples] = await Promise.all([searchDocs(command.query, 4), searchExamples(command.query, 4)]);
      return { kind: "results", query: command.query, results: [...searchSource(command.query, 5), ...searchFiles(command.query, 4), ...docs, ...examples] };
    }
    return { kind: "error", text: `Unknown command /${command.name}. Use /help.` };
  }

  return { execute, searchDocs, searchExamples, searchSource, searchFiles, clearCache: () => docCache.clear() };
}
