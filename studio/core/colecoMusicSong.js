function stripComment(line) {
  return String(line || "").replace(/;.*/, "").trim();
}

function parseNumber(token) {
  const text = String(token || "").trim();
  if (/^\$[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(1), 16);
  if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(2), 16);
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  return null;
}

function parseDirective(line, directive) {
  const match = stripComment(line).match(new RegExp(`^(?:\\.?${directive}|${directive === "db" ? "defb" : "defw"})\\s+(.+)$`, "i"));
  return match ? match[1].split(",").map((token) => token.trim()).filter(Boolean) : null;
}

function labelLines(lines) {
  const labels = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const match = stripComment(lines[index]).match(/^([A-Za-z_][A-Za-z0-9_]*):$/);
    if (match) labels.set(match[1].toLowerCase(), { name: match[1], line: index });
  }
  return labels;
}

// Decode the compact lib4ksa/Amy song scheduler format used by AMY_TRIGGER_SOUNDS.
// A row is: duration word, one packed trigger-count/index byte, then N-1 indices.
// A zero word ends the song; a label word loops or chains to another song.
export function inspectColecoMusicSongs(sourceText, tables = []) {
  const source = String(sourceText || "");
  const lines = source.split(/\r?\n/);
  const labels = labelLines(lines);
  const tableNames = new Set(tables.map((table) => table.name.toLowerCase()));
  const songs = [];

  for (const label of labels.values()) {
    if (tableNames.has(label.name.toLowerCase())) continue;
    let cursor = label.line + 1;
    const rows = [];
    let frame = 0;
    let terminal = null;
    let invalid = null;

    while (cursor < lines.length) {
      while (cursor < lines.length && !stripComment(lines[cursor])) cursor += 1;
      if (cursor >= lines.length || /^[A-Za-z_][A-Za-z0-9_]*:$/.test(stripComment(lines[cursor]))) break;
      const words = parseDirective(lines[cursor], "dw");
      if (!words || words.length !== 1) break;
      const duration = parseNumber(words[0]);
      if (duration === null) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(words[0])) terminal = { type: "jump", label: words[0] };
        else invalid = `invalid terminal ${words[0]}`;
        cursor += 1;
        break;
      }
      if (duration === 0) {
        terminal = { type: "end" };
        cursor += 1;
        break;
      }
      if (duration > 0x7fff) break;
      cursor += 1;
      while (cursor < lines.length && !stripComment(lines[cursor])) cursor += 1;
      const bytes = cursor < lines.length ? parseDirective(lines[cursor], "db") : null;
      if (!bytes?.length) { invalid = "missing trigger bytes"; break; }
      const values = bytes.map(parseNumber);
      if (values.some((value) => value === null || value < 0 || value > 255)) { invalid = "invalid trigger byte"; break; }
      const count = ((values[0] >> 6) & 3) + 1;
      if (values.length !== count) { invalid = `expected ${count} trigger bytes`; break; }
      const indices = values.map((value) => value & 0x3f);
      if (indices.some((index) => index < 1)) { invalid = "sound index 0 is not playable"; break; }
      rows.push({ startFrame: frame, durationFrames: duration, indices });
      frame += duration;
      cursor += 1;
    }

    if (!rows.length || invalid || !terminal) continue;
    const matchingTables = tables.filter((table) => rows.every((row) => row.indices.every((index) => index <= table.entries.length)));
    if (!matchingTables.length) continue;
    songs.push({
      name: label.name,
      line: label.line + 1,
      rows,
      totalFrames: frame,
      terminal,
      tables: matchingTables.map((table) => table.name)
    });
  }
  return songs;
}

export function scheduleColecoMusicSong(song, table, { scheduleSequence }) {
  if (!song?.rows?.length || !table?.entries?.length || typeof scheduleSequence !== "function") return [];
  const scheduled = [];
  for (let rowIndex = 0; rowIndex < song.rows.length; rowIndex += 1) {
    const row = song.rows[rowIndex];
    const byArea = new Map();
    for (const index of row.indices) {
      const entry = table.entries[index - 1];
      if (entry?.area && entry.stream?.status === "valid") byArea.set(entry.area, entry);
    }
    for (const [area, entry] of byArea) {
      let areaEnd = song.totalFrames;
      for (let next = rowIndex + 1; next < song.rows.length; next += 1) {
        if (song.rows[next].indices.some((index) => table.entries[index - 1]?.area === area)) {
          areaEnd = song.rows[next].startFrame;
          break;
        }
      }
      const sourceEvents = entry.stream.format === "tiny"
        ? entry.stream.tiny.previewEvents
        : scheduleSequence(entry.stream.events);
      const available = Math.max(0, areaEnd - row.startFrame);
      const streamFrames = entry.stream.format === "tiny" ? entry.stream.tiny.totalFrames : Infinity;
      const repeat = entry.stream.format === "tiny" && entry.stream.tiny.loop && streamFrames > 0;
      for (let offset = 0; offset < available; offset += repeat ? streamFrames : available || 1) {
        for (const event of sourceEvents) {
          const start = row.startFrame + offset + (event.startFrame || 0);
          const duration = event.durationFrames ?? event.length ?? 0;
          if (start >= areaEnd || duration <= 0) continue;
          scheduled.push({ ...event, startFrame: start, durationFrames: Math.min(duration, areaEnd - start), songArea: area, soundIndex: entry.index });
        }
        if (!repeat) break;
      }
    }
  }
  return scheduled.sort((a, b) => (a.startFrame - b.startFrame) || ((a.channel || 0) - (b.channel || 0)));
}
