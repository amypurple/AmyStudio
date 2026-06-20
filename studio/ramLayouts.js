const ramLayouts = {
  colecovision_legacy_sdcc: {
    id: "colecovision_legacy_sdcc",
    label: "ColecoVision Legacy SDCC",
    userRamStart: 0x7132,
    userRamEndExclusive: 0x73B8,
    reserved: [
      { start: 0x7000, endExclusive: 0x7020, label: "_buffer32" },
      { start: 0x7020, endExclusive: 0x702B, label: "snd_addr" },
      { start: 0x702B, endExclusive: 0x707C, label: "snd_areas (8 x 10-byte slots + terminator)" },
      { start: 0x707C, endExclusive: 0x7080, label: "reserved gap / alignment" },
      { start: 0x7080, endExclusive: 0x7091, label: "Amy runtime state" },
      { start: 0x7091, endExclusive: 0x7092, label: "Amy sprite count" },
      { start: 0x7092, endExclusive: 0x7112, label: "Amy sprite shadow" },
      { start: 0x7112, endExclusive: 0x7132, label: "Amy tiny sound state (2 x 16-byte slots)" },
      { start: 0x73C4, endExclusive: 0x73FC, label: "BIOS/getput11 shadow state" }
    ]
  }
};

function cloneLayout(layout) {
  return {
    ...layout,
    reserved: (layout.reserved || []).map((region) => ({ ...region }))
  };
}

export function buildColecoLegacyRuntimeMap(capabilities = null) {
  const caps = capabilities || {};
  const needsSound = !!caps.needsSound;
  const needsMusic = !!caps.needsMusic;
  const needsSprites = !!caps.needsSprites;
  const needsControllers = !!caps.needsControllers;
  const needsSpinner = !!caps.needsSpinner;
  const needsFrameCounter = !!caps.needsFrameCounter;
  const needsVdpStatusShadow = !!caps.needsVdpStatusShadow;
  const needsTinySound = !!caps.needsTinySound || !!caps.usesTinySound;
  const needsRuntimeState =
    needsControllers ||
    needsSpinner ||
    needsSound ||
    needsMusic ||
    needsFrameCounter ||
    needsVdpStatusShadow;
  const needsSoundState = !!caps.needsSoundState || needsSound || needsMusic;

  const reserved = [
    { start: 0x7000, endExclusive: 0x7020, label: "_buffer32" }
  ];
  const addresses = {
    buffer32: 0x7000
  };
  let current = 0x7020;

  if (needsSound) {
    addresses.snd_addr = 0x7020;
    addresses.snd_areas = 0x702B;
    reserved.push(
      { start: 0x7020, endExclusive: 0x702B, label: "snd_addr" },
      { start: 0x702B, endExclusive: 0x707C, label: "snd_areas (8 x 10-byte slots + terminator)" },
      { start: 0x707C, endExclusive: 0x7080, label: "reserved gap / alignment" }
    );
    current = 0x7080;
  }

  if (needsRuntimeState) {
    addresses.no_nmi = current;
    addresses.vdp_status = current + 1;
    addresses.nmi_flag = current + 2;
    reserved.push({ start: current, endExclusive: current + 3, label: "Amy runtime state" });
    current += 3;
  }

  if (needsControllers) {
    addresses.joypad_1 = current;
    addresses.keypad_1 = current + 1;
    addresses.joypad_2 = current + 2;
    addresses.keypad_2 = current + 3;
    reserved.push({ start: current, endExclusive: current + 4, label: "Amy controller state" });
    current += 4;
  }

  if (needsSpinner) {
    addresses.spinner_enabled = current;
    reserved.push({ start: current, endExclusive: current + 1, label: "Amy spinner enable flag" });
    current += 1;
  }

  if (needsSoundState) {
    addresses.sound_enabled = current;
    addresses.music_enabled = current + 1;
    addresses.music_pointer = current + 2;
    addresses.music_counter = current + 4;
    addresses.sound_area_count = current + 6;
    addresses.sound_table_pointer = current + 7;
    addresses.screen_view_pointer = current + 9;
    reserved.push({ start: current, endExclusive: current + 11, label: "Amy sound/music runtime state" });
    current += 11;
  }

  const lowRuntimeEnd = current;

  if (needsSprites) {
    addresses.sprite_count = current;
    addresses.sprite_table = current + 1;
    reserved.push(
      { start: current, endExclusive: current + 1, label: "Amy sprite count" },
      { start: current + 1, endExclusive: current + 0x81, label: "Amy sprite shadow" }
    );
    current += 0x81;
  }

  if (needsTinySound) {
    addresses.tinysound_slot_1 = current;
    addresses.tinysound_slot_2 = current + 0x10;
    reserved.push({ start: current, endExclusive: current + 0x20, label: "Amy tiny sound state (2 x 16-byte slots)" });
    current += 0x20;
  }

  if (needsFrameCounter) {
    addresses.frame_counter = 0x73BA;
    reserved.push({ start: 0x73BA, endExclusive: 0x73BC, label: "Amy frame counter (reusing Pascal parameter area)" });
  }

  reserved.push({ start: 0x73C4, endExclusive: 0x73FC, label: "BIOS/getput11 shadow state" });

  return {
    addresses,
    lowRuntimeEnd,
    reserved,
    userRamStart: current,
    userRamEndExclusive: 0x73B8
  };
}

function buildColecoLegacyLayout(capabilities = null) {
  if (!capabilities) {
    return cloneLayout(ramLayouts.colecovision_legacy_sdcc);
  }
  const runtime = buildColecoLegacyRuntimeMap(capabilities);
  return {
    ...ramLayouts.colecovision_legacy_sdcc,
    userRamStart: runtime.userRamStart,
    userRamEndExclusive: runtime.userRamEndExclusive,
    reserved: runtime.reserved.map((region) => ({ ...region }))
  };
}

export function getRamLayout(profileId, capabilities = null) {
  if (profileId === "colecovision_legacy_sdcc") {
    return buildColecoLegacyLayout(capabilities);
  }
  return ramLayouts[profileId] ? cloneLayout(ramLayouts[profileId]) : null;
}

export { ramLayouts };
