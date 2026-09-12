import { scheduleColecoSoundSequence, sliceColecoPreviewEvents } from "./colecoSoundPreview.js";

function eventFrames(event) {
  if (["end", "repeat", "tiny"].includes(event?.type)) return 0;
  return Math.max(0, Number(event?.length) || 0);
}

export function buildColecoBiosArrangement(table) {
  const lanes = (table?.entries || [])
    .filter((entry) => entry.stream?.status === "valid" && entry.stream?.format !== "tiny")
    .map((entry) => {
      const events = entry.stream.events || [];
      const scheduled = scheduleColecoSoundSequence(events);
      const totalFrames = scheduled.reduce((maximum, event) =>
        Math.max(maximum, (event.startFrame || 0) + eventFrames(event)), 0);
      return {
        index: entry.index,
        label: entry.label,
        area: entry.area,
        entry,
        events,
        scheduled,
        totalFrames
      };
    });
  return {
    table,
    lanes,
    totalFrames: lanes.reduce((maximum, lane) => Math.max(maximum, lane.totalFrames), 0)
  };
}

function laneOffset(offsets, index) {
  const value = offsets instanceof Map ? offsets.get(index) : offsets?.[index];
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function colecoBiosArrangementFrames(arrangement, selectedIndexes, offsets = {}) {
  const selected = selectedIndexes instanceof Set ? selectedIndexes : new Set(selectedIndexes || []);
  return arrangement.lanes
    .filter((lane) => selected.has(lane.index))
    .reduce((maximum, lane) => Math.max(maximum, laneOffset(offsets, lane.index) + lane.totalFrames), 0);
}

export function scheduleColecoBiosArrangement(arrangement, selectedIndexes, offsets = {}) {
  const selected = selectedIndexes instanceof Set ? selectedIndexes : new Set(selectedIndexes || []);
  const selectedLanes = arrangement.lanes.filter((lane) => selected.has(lane.index));
  const starts = selectedLanes.map((lane) => ({ lane, offset: laneOffset(offsets, lane.index) }));
  starts.sort((left, right) => left.offset - right.offset || left.lane.index - right.lane.index);
  return starts.flatMap(({ lane, offset }, position) => {
    const areaKey = lane.area ?? `entry-${lane.index}`;
    const next = starts.slice(position + 1).find((candidate) =>
      (candidate.lane.area ?? `entry-${candidate.lane.index}`) === areaKey);
    const relativeEnd = next ? next.offset - offset : Infinity;
    if (relativeEnd <= 0) return [];
    const events = Number.isFinite(relativeEnd)
      ? sliceColecoPreviewEvents(lane.scheduled, 0, relativeEnd)
      : lane.scheduled;
    return events.map((event) => ({
      ...event,
      startFrame: (event.startFrame || 0) + offset,
      soundIndex: lane.index,
      soundArea: lane.area
    }));
  });
}
