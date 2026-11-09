import { INSTRUMENTS, PITCHES, bassPitchNameForTone3Period, buildGearcolecoAuditionAsm, createSong, decodeEditableOs7Bytes, encodeEditableOs7Events, exportAsm, mixedPreviewCycleFrames, prepareTinyImportSource, resizeSong, validateSong } from "./core.js?v=18";
import { decodeTinySoundSource, scanTinySoundStreams } from "../../studio/core/colecoTinySound.js";
import { decodeColecoSoundSegment } from "../../studio/core/colecoSoundSequence.js";
import { eventDurationFrames, scheduleColecoSoundSequence } from "../../studio/core/colecoSoundPreview.js";
import { startGearcolecoAudition } from "./gearcolecoPreview.js?v=15";

const $ = (id) => document.getElementById(id);
$("status").textContent = "Loading composer...";
let song = createSong(32);
let selectedInstrument = INSTRUMENTS[0].id;
let selectedChannel = 0;
let painting = false;
let eraseMode = false;
let playback = null;
let companionTracks = [];
let companionLabels = [];
let noteMode = "normal";
let pendingArpeggio = null;
let companionEvents = { noise: [], tone3: [] };

function formatBytes(bytes) {
  return bytes.map((value) => `$${value.toString(16).toUpperCase().padStart(2, "0")}`).join(", ");
}

function parseBytes(text) {
  const tokens = String(text || "").match(/\$[0-9a-f]+|0x[0-9a-f]+|\b\d+\b/gi) || [];
  if (!tokens.length) throw new Error("Enter at least one byte.");
  return tokens.map((token) => {
    const value = token.startsWith("$") ? Number.parseInt(token.slice(1), 16) : /^0x/i.test(token) ? Number.parseInt(token.slice(2), 16) : Number.parseInt(token, 10);
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error(`Invalid byte ${token}.`);
    return value;
  });
}

function syncCompanionEditor() {
  const tone3 = companionTracks.find((track) => track.channel === 3)?.bytes || [0xd0];
  const noise = companionTracks.find((track) => track.channel === 0)?.bytes || [0x10];
  $("tone3Bytes").value = formatBytes(tone3);
  $("noiseBytes").value = formatBytes(noise);
  try { companionEvents = { tone3: decodeEditableOs7Bytes(tone3), noise: decodeEditableOs7Bytes(noise) }; } catch { companionEvents = { tone3: [], noise: [] }; }
  renderCompanionEvents();
  renderMixTimeline();
}

function companionDuration(events) {
  return events.filter((event) => !["end", "repeat"].includes(event.type)).reduce((sum, event) => sum + eventDurationFrames(event), 0);
}

function tinyCellLabel(cell) {
  if (!cell) return "rest";
  if (cell.hold) return "hold";
  const plain = (((cell.code - 4) & 0x3f) + 4);
  return PITCHES.find((pitch) => pitch.code === plain)?.name || `$${plain.toString(16)}`;
}

function drumLabel(event) {
  return ["P-hi","P-mid","P-low","Bass","W-hi","Snare","W-low","W-tuned"][event.noise] || `N${event.noise}`;
}

function timelineEvent(lane, start, duration, total, label, className, title, onClick = null) {
  const item = document.createElement(onClick ? "button" : "span");
  item.className = `timeline-event ${className}`;
  item.style.left = `${(start / total) * 100}%`;
  item.style.width = `${(duration / total) * 100}%`;
  item.textContent = label;
  item.title = title;
  if (onClick) item.onclick = onClick;
  lane.append(item);
}

function renderMixTimeline() {
  const host = $("mixTimeline");
  const tinyDuration = Math.max(1, song.length * song.tempo);
  const bassDuration = Math.max(1, companionDuration(companionEvents.tone3));
  const drumDuration = Math.max(1, companionDuration(companionEvents.noise));
  const total = mixedPreviewCycleFrames([
    { durationFrames: tinyDuration }, { durationFrames: tinyDuration },
    { durationFrames: bassDuration }, { durationFrames: drumDuration }
  ]);
  host.style.setProperty("--timeline-beats", Math.max(1, total / song.tempo));
  host.replaceChildren();
  const title = document.createElement("div");
  title.className = "timeline-title";
  title.innerHTML = `<span>Full mix · frame-based alignment</span><span>${total} frames · Tiny ${tinyDuration} · clock ${bassDuration} · Noise ${drumDuration}</span>`;
  host.append(title);
  const addTrack = (name, className, duration, renderLoop) => {
    const row = document.createElement("div"); row.className = "timeline-track";
    const label = document.createElement("strong"); label.textContent = name;
    const lane = document.createElement("div"); lane.className = "timeline-lane";
    for (let offset = 0; offset < total; offset += duration) renderLoop(lane, offset);
    row.append(label, lane); host.append(row);
  };
  song.channels.forEach((channel, channelIndex) => addTrack(`Tiny ${channelIndex + 1}`, `tiny${channelIndex + 1}`, tinyDuration, (lane, offset) => {
    channel.forEach((cell, step) => timelineEvent(lane, offset + step * song.tempo, song.tempo, total, tinyCellLabel(cell), `tiny${channelIndex + 1}${cell ? "" : " rest"}`, `Tiny ${channelIndex + 1} · frame ${offset + step * song.tempo}`));
  }));
  for (const [kind, name, className] of [["tone3","Bass clock","bass"],["noise","Noise","drum"]]) {
    const events = companionEvents[kind].filter((event) => !["end", "repeat"].includes(event.type));
    const duration = kind === "tone3" ? bassDuration : drumDuration;
    addTrack(name, className, duration, (lane, offset) => {
      let cursor = offset;
      events.forEach((event, index) => {
        const frames = eventDurationFrames(event);
        const label = kind === "tone3" ? bassPitchNameForTone3Period(event.period).name : drumLabel(event);
        timelineEvent(lane, cursor, frames, total, label, className, `${name} · ${frames} frames · starts ${cursor}`, () => document.querySelector(`[data-os7-kind="${kind}"][data-os7-index="${index}"] input, [data-os7-kind="${kind}"][data-os7-index="${index}"] select`)?.focus());
        cursor += frames;
      });
    });
  }
}

function applyCompanionEvents() {
  const tone3 = encodeEditableOs7Events(companionEvents.tone3);
  const noise = encodeEditableOs7Events(companionEvents.noise);
  $("tone3Bytes").value = formatBytes(tone3);
  $("noiseBytes").value = formatBytes(noise);
  companionTracks = [
    { channel: 0, bytes: noise, durationFrames: companionDuration(companionEvents.noise), loop: true },
    { channel: 3, bytes: tone3, durationFrames: companionDuration(companionEvents.tone3), loop: true }
  ];
  song.companionStreams = { noise, tone3 };
  companionLabels = ["Edited Noise", "Edited Tone 3"];
  $("companions").textContent = "Accompaniment: edited Noise drums + Tone 3 bass";
  updateAsm();
  renderMixTimeline();
}

function numericField(value, min, max, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = min;
  input.max = max;
  input.value = value;
  input.onchange = () => onChange(Math.max(min, Math.min(max, Number(input.value) || min)));
  return input;
}

function renderCompanionEvents() {
  const host = $("semanticCompanions");
  host.replaceChildren();
  for (const [kind, title] of [["tone3", "Tone 3 noise-clock sequence"], ["noise", "Audible Noise bass and drum sequence"]]) {
    const section = document.createElement("section");
    section.className = "os7-track";
    section.innerHTML = `<h3>${title}</h3>`;
    const table = document.createElement("table");
    table.className = "os7-events";
    table.innerHTML = `<thead><tr>${kind === "tone3" ? "<th>Resulting bass / Tone 3 period</th><th>Tone 3</th>" : "<th>Noise voice</th><th>Audible volume</th>"}<th>Length</th>${kind === "noise" ? "<th>Fade step</th><th>Fade count</th>" : ""}<th></th></tr></thead>`;
    const body = document.createElement("tbody");
    const playable = companionEvents[kind].map((event, index) => ({ event, index })).filter(({ event }) => !["end", "repeat"].includes(event.type));
    for (const { event, index } of playable) {
      const row = document.createElement("tr");
      row.dataset.os7Kind = kind;
      row.dataset.os7Index = index;
      const refresh = () => { applyCompanionEvents(); renderCompanionEvents(); };
      if (kind === "tone3") {
        const cell = document.createElement("td");
        const bass = bassPitchNameForTone3Period(event.period);
        const name = document.createElement("strong"); name.textContent = `${bass.name} (${bass.frequency.toFixed(1)} Hz) `;
        cell.append(name, numericField(event.period, 1, 1023, (value) => { event.period = value; refresh(); })); row.append(cell);
      } else {
        const cell = document.createElement("td");
        const select = document.createElement("select");
        [[0,"Periodic high"],[1,"Periodic mid"],[2,"Periodic low"],[3,"Tuned bass"],[4,"White high"],[5,"Snare"],[6,"White low"],[7,"Tuned white"]].forEach(([value, label]) => select.add(new Option(label, value, false, event.noise === value)));
        select.onchange = () => { event.noise = Number(select.value); refresh(); }; cell.append(select); row.append(cell);
      }
      const volume = document.createElement("td");
      if (kind === "tone3") {
        volume.textContent = "Muted clock";
      } else {
        volume.append(numericField(15 - event.attenuation, 0, 15, (value) => { event.attenuation = 15 - value; refresh(); }));
      }
      row.append(volume);
      const length = document.createElement("td"); length.append(numericField(event.length, 1, 256, (value) => { event.length = value; refresh(); })); row.append(length);
      if (kind === "noise") {
        if (!event.volumeSweep) event.volumeSweep = { step: 1, count: 1, stepLength: 1, firstLength: 1 };
        for (const key of ["step", "count"]) { const cell = document.createElement("td"); cell.append(numericField(event.volumeSweep[key], 1, 15, (value) => { event.volumeSweep[key] = value; refresh(); })); row.append(cell); }
      }
      const removeCell = document.createElement("td");
      const remove = document.createElement("button"); remove.textContent = "Remove"; remove.onclick = () => { companionEvents[kind].splice(index, 1); refresh(); }; removeCell.append(remove); row.append(removeCell);
      body.append(row);
    }
    table.append(body); section.append(table);
    const add = document.createElement("button"); add.textContent = kind === "tone3" ? "Add Tone 3 clock step" : "Add Noise hit";
    add.onclick = () => {
      const terminal = companionEvents[kind].findIndex((event) => ["end", "repeat"].includes(event.type));
      const event = kind === "tone3"
        ? { type: "note", channel: 3, period: 136, attenuation: 15, length: 6 }
        : { type: "volume-sweep", channel: 0, noise: 5, attenuation: 3, length: 6, volumeSweep: { step: 1, count: 12, stepLength: 1, firstLength: 1 } };
      companionEvents[kind].splice(terminal < 0 ? companionEvents[kind].length : terminal, 0, event);
      applyCompanionEvents(); renderCompanionEvents();
    };
    section.append(add); host.append(section);
  }
}

function instrument(id) {
  if (id === "custom") return { id: "custom", icon: "◆", ...song.customInstrument };
  const imported = song.importedInstruments?.find((item) => item.id === id);
  if (imported) return imported;
  return INSTRUMENTS.find((item) => item.id === id) || INSTRUMENTS[0];
}

function renderInstruments() {
  $("instruments").replaceChildren(...[...INSTRUMENTS, ...(song.importedInstruments || []), instrument("custom")].map((item) => {
    const button = document.createElement("button");
    button.className = `instrument ${item.id === selectedInstrument ? "selected" : ""}`;
    button.style.setProperty("--instrument", item.color);
    button.innerHTML = `<span>${item.icon}</span><strong>${item.name}</strong>`;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(item.id === selectedInstrument));
    button.onclick = () => { selectedInstrument = item.id; renderInstruments(); };
    return button;
  }));
  $("customEditor").classList.toggle("visible", selectedInstrument === "custom");
  $("customVolume").value = song.customInstrument.bytes[0] >> 4;
  $("customDecay").value = song.customInstrument.bytes[1].toString(16).toUpperCase().padStart(2, "0");
  $("customRate").value = song.customInstrument.bytes[2].toString(16).toUpperCase().padStart(2, "0");
}

function setCell(channel, step, code, erase = false) {
  if (erase) {
    song.channels[channel][step] = null;
    pendingArpeggio = null;
  } else if (noteMode === "arpeggio") {
    const pending = pendingArpeggio;
    if (pending && pending.channel === channel && pending.step === step) {
      song.channels[channel][step] = { code: pending.code | 0x40, arpeggioCode: code, instrument: selectedInstrument };
      pendingArpeggio = null;
      $("noteModeHelp").textContent = "Arpeggio complete. Click a base pitch for another.";
    } else {
      song.channels[channel][step] = { code, instrument: selectedInstrument };
      pendingArpeggio = { channel, step, code };
      $("noteModeHelp").textContent = "Now click the second pitch in the same column.";
    }
  } else {
    song.channels[channel][step] = { code: noteMode === "vibrato" ? code | 0x80 : code, instrument: selectedInstrument };
    pendingArpeggio = null;
  }
  renderScore();
  updateAsm();
}

function renderScore() {
  document.documentElement.style.setProperty("--steps", song.length);
  const ruler = $("ruler");
  ruler.replaceChildren(...Array.from({ length: song.length }, (_, step) => {
    const mark = document.createElement("span");
    mark.textContent = step % 4 === 0 ? String(step + 1) : "";
    return mark;
  }));
  const score = $("score");
  score.replaceChildren();
  const channelSwitch = document.createElement("div");
  channelSwitch.className = "channel-switch";
  for (let channel = 0; channel < 2; channel += 1) {
    const channelButton = document.createElement("button");
    channelButton.className = `channel-label channel-${channel + 1} ${selectedChannel === channel ? "active" : ""}`;
    channelButton.textContent = `CH ${channel + 1}`;
    channelButton.onclick = () => { selectedChannel = channel; renderScore(); };
    channelSwitch.append(channelButton);
  }
  score.append(channelSwitch);
  const lane = document.createElement("div");
  lane.className = `lane channel-${selectedChannel + 1}`;
  const restLabel = document.createElement("span");
  restLabel.className = "pitch rest-pitch";
  restLabel.textContent = "REST";
  lane.append(restLabel);
  for (let step = 0; step < song.length; step += 1) {
    const rest = document.createElement("button");
    const silent = song.channels[selectedChannel][step] === null;
    rest.className = `cell rest ${step % 4 === 0 ? "beat" : ""} ${silent ? "active" : ""}`;
    rest.dataset.channel = selectedChannel;
    rest.dataset.step = step;
    rest.textContent = silent ? "𝄽" : "";
    rest.title = silent ? "Silence" : "Set silence";
    rest.onclick = () => setCell(selectedChannel, step, 0, true);
    lane.append(rest);
  }
  for (const note of PITCHES) {
      const label = document.createElement("span");
      label.className = `pitch ${note.name.includes("#") ? "sharp" : ""}`;
      label.textContent = note.name;
      lane.append(label);
      for (let step = 0; step < song.length; step += 1) {
        const button = document.createElement("button");
        const cell = song.channels[selectedChannel][step];
        const plainCode = cell ? (((cell.code - 4) & 0x3f) + 4) : null;
        const arpeggioCode = cell?.arpeggioCode === undefined ? null : (((cell.arpeggioCode - 4) & 0x3f) + 4);
        const baseMatch = cell?.hold !== true && plainCode === note.code;
        const arpeggioMatch = cell?.hold !== true && arpeggioCode === note.code;
        const match = baseMatch || arpeggioMatch;
        const vibrato = cell ? (((cell.code - 4) & 0x80) !== 0) : false;
        button.className = `cell ${step % 4 === 0 ? "beat" : ""} ${match ? "note" : ""} ${arpeggioCode === null || !match ? "" : baseMatch ? "arpeggio-base" : "arpeggio-second"} ${vibrato && baseMatch ? "vibrato" : ""}`;
        button.dataset.channel = selectedChannel;
        button.dataset.step = step;
        button.dataset.code = note.code;
        if (match) {
          const voice = instrument(cell.instrument);
          button.style.setProperty("--note", voice.color);
          button.textContent = vibrato && baseMatch ? "∿" : voice.icon;
          button.title = `${note.name} · ${voice.name}${arpeggioCode === null ? "" : baseMatch ? " · arpeggio base" : " · arpeggio second note"}${vibrato && baseMatch ? " · vibrato" : ""}`;
        }
        button.onpointerdown = (event) => {
          event.preventDefault();
          painting = true;
          eraseMode = event.button === 2 || (match && noteMode !== "arpeggio");
          setCell(selectedChannel, step, note.code, eraseMode);
        };
        button.onpointerenter = (event) => {
          if (event.buttons === 0) painting = false;
          if (painting) setCell(selectedChannel, step, note.code, eraseMode);
        };
        button.oncontextmenu = (event) => event.preventDefault();
        lane.append(button);
      }
  }
  score.append(lane);
  if ($("mixTimeline")) renderMixTimeline();
}

function updateAsm() {
  song.name = $("songName").value;
  song.tempo = Number($("tempo").value);
  song.loop = $("loop").checked;
  $("tempoOut").value = song.tempo;
  $("asm").value = exportAsm(song);
  localStorage.setItem("amyTinySoundComposer", JSON.stringify(song));
}

function stop() {
  if (playback) playback.stop();
  playback = null;
  document.querySelectorAll(".playing").forEach((cell) => cell.classList.remove("playing"));
}

async function play() {
  stop();
  try {
    const tracks = [
      { durationFrames: song.length * song.tempo },
      { durationFrames: song.length * song.tempo },
      ...companionTracks
    ];
    const cycleFrames = mixedPreviewCycleFrames(tracks);
    const noiseBytes = companionTracks.find((track) => track.channel === 0)?.bytes || [0x10];
    const tone3Bytes = companionTracks.find((track) => track.channel === 3)?.bytes || [0xd0];
    $("status").textContent = "Building GearColeco audition ROM...";
    playback = await startGearcolecoAudition(buildGearcolecoAuditionAsm(song, { noiseBytes, tone3Bytes }), { frames: cycleFrames });
    playback.previewCycleFrames = cycleFrames;
    $("status").textContent = "Playing through GearColeco.";
  } catch (error) {
    $("status").textContent = `Preview failed: ${error.message}`;
    return;
  }
  const tick = () => {
    if (!playback) return;
    const frame = playback.currentFrame();
    const step = Math.floor(frame / song.tempo) % song.length;
    document.querySelectorAll(".playing").forEach((cell) => cell.classList.remove("playing"));
    if (frame >= playback.previewCycleFrames) {
      if (song.loop) { stop(); play(); } else stop();
      return;
    }
    document.querySelectorAll(`[data-step="${step}"]`).forEach((cell) => cell.classList.add("playing"));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function download(name, text, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

document.addEventListener("pointerup", () => { painting = false; }, true);
document.addEventListener("pointercancel", () => { painting = false; }, true);
window.addEventListener("blur", () => { painting = false; });
$("play").onclick = play;
$("stop").onclick = stop;
$("clear").onclick = () => { if (confirm("Clear every note?")) { song = createSong(song.length); syncControls(); } };
$("tempo").oninput = updateAsm;
$("loop").onchange = updateAsm;
$("songName").oninput = updateAsm;
$("length").onchange = () => { resizeSong(song, Number($("length").value)); renderScore(); updateAsm(); };
document.querySelectorAll('input[name="noteMode"]').forEach((input) => {
  input.onchange = () => {
    noteMode = input.value;
    pendingArpeggio = null;
    $("noteModeHelp").textContent = noteMode === "arpeggio" ? "Click the base pitch, then the second pitch in the same column." : noteMode === "vibrato" ? "Paint a vibrato note." : "Paint one pitch.";
  };
});
$("applyCompanions").onclick = () => {
  try {
    const tone3 = parseBytes($("tone3Bytes").value);
    const noise = parseBytes($("noiseBytes").value);
    companionTracks = [
      { channel: 0, bytes: noise, durationFrames: song.length * song.tempo, loop: true },
      { channel: 3, bytes: tone3, durationFrames: song.length * song.tempo, loop: true }
    ];
    song.companionStreams = { noise, tone3 };
    companionEvents = { noise: decodeEditableOs7Bytes(noise), tone3: decodeEditableOs7Bytes(tone3) };
    companionLabels = ["Edited Noise", "Edited Tone 3"];
    $("companions").textContent = "Accompaniment: edited Noise drums + Tone 3 bass";
    $("companionStatus").textContent = "Applied. Press Play to audition through GearColeco.";
    updateAsm();
    renderCompanionEvents();
  } catch (error) {
    $("companionStatus").textContent = error.message;
  }
};
$("applyCustom").onclick = () => {
  const volume = Math.max(0, Math.min(15, Number($("customVolume").value) || 0));
  const parseHex = (id) => Math.max(0, Math.min(255, Number.parseInt($(id).value, 16) || 0));
  song.customInstrument.bytes = [volume << 4, parseHex("customDecay"), parseHex("customRate")];
  selectedInstrument = "custom";
  renderInstruments();
  updateAsm();
};
$("copyAsm").onclick = async () => { await navigator.clipboard.writeText($("asm").value); $("status").textContent = "ASM copied."; };
$("saveAsm").onclick = () => download(`${song.name || "tiny-song"}.asm`, $("asm").value, "text/plain");
$("saveJson").onclick = () => download(`${song.name || "tiny-song"}.tiny.json`, JSON.stringify(song, null, 2), "application/json");
$("openJson").onchange = async (event) => {
  try { song = validateSong(JSON.parse(await event.target.files[0].text())); syncControls(); $("status").textContent = "Project loaded."; }
  catch (error) { $("status").textContent = error.message; }
};
async function importAsmSource(source) {
    const importSource = prepareTinyImportSource(source);
    const streams = scanTinySoundStreams(importSource);
    const pair = [streams.find((item) => item.channel === 1), streams.find((item) => item.channel === 2)];
    if (pair.some((item) => !item)) throw new Error("The ASM needs one sndtiny_1 and one sndtiny_2 stream.");
    const decoded = pair.map((item) => decodeTinySoundSource(importSource, item.label));
    companionTracks = [];
    companionLabels = [];
    const labels = new Map([...importSource.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*):\s*$/gm)].map((match) => [match[1].toLowerCase(), match[1]]));
    const parts = pair.map((item) => item.label.match(/^(.*)_ch[12]_(.+)$/i));
    if (parts.every(Boolean) && parts[0][1].toLowerCase() === parts[1][1].toLowerCase() && parts[0][2].toLowerCase() === parts[1][2].toLowerCase()) {
      for (const channel of [0, 3]) {
        const wanted = `${parts[0][1]}_ch${channel}_${parts[0][2]}`;
        const label = labels.get(wanted.toLowerCase());
        if (!label) continue;
        try {
          const regular = decodeColecoSoundSegment(importSource, label);
          const events = scheduleColecoSoundSequence(regular.events);
          const durationFrames = events.reduce((end, event) => Math.max(end, (event.startFrame || 0) + eventDurationFrames(event)), 0);
          companionTracks.push({ channel, bytes: regular.bytes, durationFrames, loop: regular.events.some((event) => event.type === "repeat") });
          companionLabels.push(label);
        } catch {
          // A similarly named label is not necessarily an OS7 sound stream.
        }
      }
    }
    const timed = decoded.map((item) => item.commands.filter((command) => ["note", "sustain", "silence"].includes(command.type)));
    const sourceLength = Math.max(...timed.map((commands) => commands.length));
    const length = Math.min(64, sourceLength);
    song = createSong(length);
    song.name = pair[0].label.replace(/_ch1$/i, "") || "ImportedTinySong";
    song.tempo = decoded[0].tempo;
    song.loop = decoded.some((item) => item.loop);
    decoded.forEach((stream, channel) => {
      let step = 0;
      let currentInstrument = "custom";
      let lastCell = null;
      for (const command of stream.commands) {
        if (command.type === "instrument") {
          const values = [command.attenuation << 4, ...command.values.slice(1)];
          const match = INSTRUMENTS.find((item) => item.bytes.every((value, index) => value === values[index]));
          if (match) {
            currentInstrument = match.id;
          } else {
            const key = values.map((value) => value.toString(16).padStart(2, "0")).join("");
            currentInstrument = `imported_${key}`;
            if (!song.importedInstruments.some((item) => item.id === currentInstrument)) {
              song.importedInstruments.push({ id: currentInstrument, name: `Imported $${key.toUpperCase()}`, icon: "◇", bytes: values, color: "#69b3a2" });
            }
          }
        } else if (command.type === "note" && step < length) {
          lastCell = { code: command.code, instrument: currentInstrument, ...(command.arpeggioCode === null ? {} : { arpeggioCode: command.arpeggioCode }) };
          song.channels[channel][step++] = lastCell;
        } else if (command.type === "sustain" && step < length) {
          song.channels[channel][step++] = lastCell ? { ...lastCell, hold: true } : null;
        } else if (command.type === "silence" && step < length) {
          song.channels[channel][step++] = null;
          lastCell = null;
        }
      }
    });
    syncControls();
    $("status").textContent = `Imported ${pair[0].label} + ${pair[1].label}.${companionLabels.length ? ` Playing companions: ${companionLabels.join(" + ")}.` : ""}${sourceLength > 64 ? " Truncated to 64 steps." : ""}`;
    $("companions").textContent = companionLabels.length ? `Accompaniment: ${companionLabels.join(" + ")}` : "No Tone 3 / Noise accompaniment imported";
    const noise = companionTracks.find((track) => track.channel === 0)?.bytes;
    const tone3 = companionTracks.find((track) => track.channel === 3)?.bytes;
    song.companionStreams = noise && tone3 ? { noise: [...noise], tone3: [...tone3] } : null;
    syncCompanionEditor();
}
$("openAsm").onchange = async (event) => {
  try {
    await importAsmSource(await event.target.files[0].text());
  } catch (error) {
    $("status").textContent = error.message;
  }
};
$("importPastedAsm").onclick = async () => {
  try {
    const source = $("pastedAsm").value.trim();
    if (!source) throw new Error("Paste ASM source before importing.");
    await importAsmSource(source);
  } catch (error) {
    $("status").textContent = error.message;
  }
};
$("exampleSong").onchange = async () => {
  const url = $("exampleSong").value;
  if (!url) return;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load example (${response.status}).`);
    await importAsmSource(await response.text());
  } catch (error) {
    $("status").textContent = error.message;
  }
};

function syncControls() {
  $("songName").value = song.name;
  $("tempo").value = song.tempo;
  $("length").value = song.length;
  $("loop").checked = song.loop;
  if (song.companionStreams) {
    companionTracks = [
      { channel: 0, bytes: [...song.companionStreams.noise], durationFrames: song.length * song.tempo, loop: true },
      { channel: 3, bytes: [...song.companionStreams.tone3], durationFrames: song.length * song.tempo, loop: true }
    ];
    companionLabels = ["Saved Noise", "Saved Tone 3"];
  }
  renderInstruments();
  $("status").textContent = "Loading score...";
  renderScore();
  updateAsm();
  syncCompanionEditor();
  $("status").textContent = "Choose an instrument, then paint notes.";
}

try { if (localStorage.getItem("amyTinySoundComposer")) song = validateSong(JSON.parse(localStorage.getItem("amyTinySoundComposer"))); } catch {}
syncControls();
