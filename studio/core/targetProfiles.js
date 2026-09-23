export const TARGET_PROFILES = Object.freeze({
  colecovision_legacy_sdcc: Object.freeze({
    id: "colecovision_legacy_sdcc",
    label: "ColecoVision Legacy SDCC",
    public: true,
    outputKind: "cartridge-rom",
    loadAddress: 0x8000,
    addressLimitExclusive: 0x10000
  }),
  coleco_adam_eos: Object.freeze({
    id: "coleco_adam_eos",
    label: "Coleco ADAM EOS",
    public: false,
    outputKind: "eos-executable",
    loadAddress: 0x0100,
    addressLimitExclusive: 0xd390,
    mediaBlockSize: 1024,
    executableAttribute: 0xc8,
    preferredMedia: "disk-160k"
  })
});

export function getTargetProfile(id, { includeInternal = false } = {}) {
  const profile = TARGET_PROFILES[String(id || "")] || null;
  return profile && (profile.public || includeInternal) ? profile : null;
}

export function listTargetProfiles({ includeInternal = false } = {}) {
  return Object.values(TARGET_PROFILES).filter((profile) => profile.public || includeInternal);
}
