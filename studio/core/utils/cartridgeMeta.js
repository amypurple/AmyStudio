export function getCartridgeNormalizationWarning(meta) {
  return meta?.normalizedLowercase
    ? "Cartridge title screen is uppercase-only; lowercase was normalized."
    : "";
}

export function appendCartridgeNormalizationWarning(baseText, meta) {
  const warning = getCartridgeNormalizationWarning(meta);
  if (!warning) return baseText;
  if (!baseText) return warning;
  return String(baseText).includes(warning) ? baseText : `${baseText}\n${warning}`;
}
