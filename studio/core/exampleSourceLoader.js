// Loads Amy example listings from standalone .alexis files under studio/examples-src/.
// The example catalog keeps only metadata + a stable id; the source text lives in a
// real, individually editable/compilable file. Works in the browser (fetch) and in
// Node tooling (fs). Nothing here mutates project data.

const IS_NODE = typeof process !== "undefined" && !!(process.versions && process.versions.node);

function sourceUrl(id) {
  return new URL("../examples-src/" + id + ".alexis", import.meta.url);
}

// The example manifest (ordered metadata list) lives in examples-src/index.json.
// This is the browser's "directory" of examples — it cannot list a folder over http.
export async function loadExamplesIndex() {
  const url = new URL("../examples-src/index.json", import.meta.url);
  if (IS_NODE) {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(url, "utf8"));
  }
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Cannot load examples index: HTTP " + response.status);
  }
  return response.json();
}

export async function loadExampleSource(id) {
  const url = sourceUrl(id);
  if (IS_NODE) {
    const { readFile } = await import("node:fs/promises");
    return readFile(url, "utf8");
  }
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Cannot load example source '" + id + "': HTTP " + response.status);
  }
  return response.text();
}

// Load many sources concurrently; returns a Map(id -> sourceText). Missing files
// resolve to null so one bad id cannot break the whole catalog load.
export async function loadExampleSources(ids) {
  const out = new Map();
  await Promise.all((ids || []).map(async (id) => {
    try {
      out.set(id, await loadExampleSource(id));
    } catch (_) {
      out.set(id, null);
    }
  }));
  return out;
}
