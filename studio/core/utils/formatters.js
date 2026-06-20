export function formatHex16(value) {
  return `$${(value & 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
}

export function formatRamBytes(count) {
  return `${count} byte${count === 1 ? "" : "s"}`;
}
