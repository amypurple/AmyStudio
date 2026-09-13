SolarPlayCompressedVoice:
  push ix
  add a,a
  ld e,a
  ld d,0
  ld hl,SolarCompressedVoiceTable
  add hl,de
  ld e,(hl)
  inc hl
  ld d,(hl)
  push de
  pop ix
SolarPlayCompressedVoicePart:
  ld l,(ix+0)
  ld h,(ix+1)
  ld a,h
  or l
  jr nz,SolarPlayCompressedVoiceReady
  pop ix
  ret
SolarPlayCompressedVoiceReady:
  inc ix
  inc ix
  ld de,AMY_UVAR_SolarFrames
  call SolarZx0ToRam
  ld hl,AMY_UVAR_SolarFrames+504
  ld de,AMY_UVAR_SolarFrames
  ld (hl),e
  inc hl
  ld (hl),d
  inc hl
  ld a,(ix+0)
  ld (hl),a
  inc hl
  ld a,(ix+1)
  ld (hl),a
  inc hl
  xor a
  ld (hl),a
  inc hl
  ld (hl),a
  inc hl
  ld (hl),a
  inc hl
  ld (hl),a
  inc ix
  inc ix
  push ix
  ld hl,AMY_UVAR_SolarFrames+504
  call AMY_PLAY_TRIPCM_SEQUENCE
  pop ix
  jr SolarPlayCompressedVoicePart

SolarCompressedVoiceTable:
  dw SolarVoiceSun,SolarVoiceMercury,SolarVoiceVenus,SolarVoiceEarth,SolarVoiceMoon,SolarVoiceMars,SolarVoiceJupiter,SolarVoiceSaturn,SolarVoiceUranus,SolarVoiceNeptune,SolarVoicePluto

SolarVoiceSun:
  dw Asset_SolarVoiceSunPart1Packed
  db 57,56
  dw Asset_SolarVoiceSunPart2Packed
  db 57,56
  dw 0

SolarVoiceMercury:
  dw Asset_SolarVoiceMercuryPart1Packed
  db 57,56
  dw Asset_SolarVoiceMercuryPart2Packed
  db 57,56
  dw Asset_SolarVoiceMercuryPart3Packed
  db 57,56
  dw 0

SolarVoiceVenus:
  dw Asset_SolarVoiceVenusPart1Packed
  db 37,33
  dw Asset_SolarVoiceVenusPart2Packed
  db 37,33
  dw Asset_SolarVoiceVenusPart3Packed
  db 37,33
  dw Asset_SolarVoiceVenusPart4Packed
  db 37,33
  dw 0

SolarVoiceEarth:
  dw Asset_SolarVoiceEarthPart1Packed
  db 57,56
  dw Asset_SolarVoiceEarthPart2Packed
  db 57,56
  dw 0

SolarVoiceMoon:
  dw Asset_SolarVoiceMoonPart1Packed
  db 57,56
  dw Asset_SolarVoiceMoonPart2Packed
  db 57,56
  dw 0

SolarVoiceMars:
  dw Asset_SolarVoiceMarsPart1Packed
  db 57,56
  dw Asset_SolarVoiceMarsPart2Packed
  db 57,56
  dw Asset_SolarVoiceMarsPart3Packed
  db 57,56
  dw 0

SolarVoiceJupiter:
  dw Asset_SolarVoiceJupiterPart1Packed
  db 57,56
  dw Asset_SolarVoiceJupiterPart2Packed
  db 57,56
  dw Asset_SolarVoiceJupiterPart3Packed
  db 57,56
  dw 0

SolarVoiceSaturn:
  dw Asset_SolarVoiceSaturnPart1Packed
  db 57,56
  dw Asset_SolarVoiceSaturnPart2Packed
  db 57,56
  dw Asset_SolarVoiceSaturnPart3Packed
  db 57,56
  dw 0

SolarVoiceUranus:
  dw Asset_SolarVoiceUranusPart1Packed
  db 37,33
  dw Asset_SolarVoiceUranusPart2Packed
  db 37,33
  dw Asset_SolarVoiceUranusPart3Packed
  db 37,33
  dw Asset_SolarVoiceUranusPart4Packed
  db 37,33
  dw 0

SolarVoiceNeptune:
  dw Asset_SolarVoiceNeptunePart1Packed
  db 57,56
  dw Asset_SolarVoiceNeptunePart2Packed
  db 57,56
  dw Asset_SolarVoiceNeptunePart3Packed
  db 57,56
  dw 0

SolarVoicePluto:
  dw Asset_SolarVoicePlutoPart1Packed
  db 57,56
  dw Asset_SolarVoicePlutoPart2Packed
  db 57,56
  dw Asset_SolarVoicePlutoPart3Packed
  db 57,56
  dw 0

Asset_SolarVoiceSunPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-sun-1.voxpcm.zx0"

Asset_SolarVoiceSunPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-sun-2.voxpcm.zx0"

Asset_SolarVoiceMercuryPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-mercury-1.voxpcm.zx0"

Asset_SolarVoiceMercuryPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-mercury-2.voxpcm.zx0"

Asset_SolarVoiceMercuryPart3Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-mercury-3.voxpcm.zx0"

Asset_SolarVoiceVenusPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-venus-1.voxpcm.zx0"

Asset_SolarVoiceVenusPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-venus-2.voxpcm.zx0"

Asset_SolarVoiceVenusPart3Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-venus-3.voxpcm.zx0"

Asset_SolarVoiceVenusPart4Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-venus-4.voxpcm.zx0"

Asset_SolarVoiceEarthPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-earth-1.voxpcm.zx0"

Asset_SolarVoiceEarthPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-earth-2.voxpcm.zx0"

Asset_SolarVoiceMoonPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-moon-1.voxpcm.zx0"

Asset_SolarVoiceMoonPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-moon-2.voxpcm.zx0"

Asset_SolarVoiceMarsPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-mars-1.voxpcm.zx0"

Asset_SolarVoiceMarsPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-mars-2.voxpcm.zx0"

Asset_SolarVoiceMarsPart3Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-mars-3.voxpcm.zx0"

Asset_SolarVoiceJupiterPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-jupiter-1.voxpcm.zx0"

Asset_SolarVoiceJupiterPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-jupiter-2.voxpcm.zx0"

Asset_SolarVoiceJupiterPart3Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-jupiter-3.voxpcm.zx0"

Asset_SolarVoiceSaturnPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-saturn-1.voxpcm.zx0"

Asset_SolarVoiceSaturnPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-saturn-2.voxpcm.zx0"

Asset_SolarVoiceSaturnPart3Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-saturn-3.voxpcm.zx0"

Asset_SolarVoiceUranusPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-uranus-1.voxpcm.zx0"

Asset_SolarVoiceUranusPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-uranus-2.voxpcm.zx0"

Asset_SolarVoiceUranusPart3Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-uranus-3.voxpcm.zx0"

Asset_SolarVoiceUranusPart4Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-uranus-4.voxpcm.zx0"

Asset_SolarVoiceNeptunePart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-neptune-1.voxpcm.zx0"

Asset_SolarVoiceNeptunePart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-neptune-2.voxpcm.zx0"

Asset_SolarVoiceNeptunePart3Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-neptune-3.voxpcm.zx0"

Asset_SolarVoicePlutoPart1Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-pluto-1.voxpcm.zx0"

Asset_SolarVoicePlutoPart2Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-pluto-2.voxpcm.zx0"

Asset_SolarVoicePlutoPart3Packed:
  incbin "@project/solar-system-encyclopedia-assets/voice-pluto-3.voxpcm.zx0"

