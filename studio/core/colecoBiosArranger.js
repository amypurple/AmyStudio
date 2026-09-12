import { scheduleColecoSoundSequence } from "./colecoSoundPreview.js";

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

export function scheduleColecoBiosArrangement(arrangement, selectedIndexes) {
  const selected = selectedIndexes instanceof Set ? selectedIndexes : new Set(selectedIndexes || []);
  const selectedLanes = arrangement.lanes.filter((lane) => selected.has(lane.index));
  // BIOS entries mapped to one work area interrupt each other. The table is triggered
  // in index order, so the last selected entry assigned to an area owns that area.
  const ownerByArea = new Map();
  for (const lane of selectedLanes) ownerByArea.set(lane.area ?? `entry-${lane.index}`, lane);
  return selectedLanes
    .filter((lane) => ownerByArea.get(lane.area ?? `entry-${lane.index}`) === lane)
    .flatMap((lane) => lane.scheduled.map((event) => ({ ...event, soundIndex: lane.index, soundArea: lane.area })));
}
