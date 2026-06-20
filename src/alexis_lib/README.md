# ALEXIS Native Libraries

This folder contains small AmysCVAssembly-ready routines used directly by ALEXIS-generated projects.

These files are intentionally separate from `src/vendor/cvdevkit_sdcc/`:

- `src/vendor/cvdevkit_sdcc/` preserves the historical SDCC libraries.
- `src/alexis_lib/` contains simplified native routines with stable ALEXIS names.

## Libraries

- `coleco_vdp.asm`
  - compatibility umbrella include for all split VDP helper modules below
- `coleco_vdp_core.asm`
  - `Alexis_VdpWriteReg`
  - `Alexis_FillVram`
  - `Alexis_LoadSequentialNameTable`
  - `Alexis_SetDefaultNameTable`
  - `Alexis_PutVram`
  - `Alexis_GetVram`
- `coleco_vdp_modes.asm`
  - `Alexis_SetBitmapGraphicsMode`
  - `Alexis_SetGraphicsMode2Text`
  - `Alexis_SetGraphicsMode1Text`
  - `Alexis_SetGraphicsMode3Multicolor`
  - `Alexis_FillMode2TextColorFirstThird`
  - `Alexis_DuplicateColorThirds`
  - `Alexis_FillMode2TextColor`
  - `Alexis_FillMode2TextColorFull`
  - `Alexis_DuplicatePatternThirds`
- `coleco_vdp_screen.asm`
  - `Alexis_ScreenOffNoNmi`
  - `Alexis_ScreenOnNmi`
- `coleco_text.asm`
  - compatibility umbrella include for all split text helper modules below
- `coleco_text_core.asm`
  - `Alexis_ClearNameTable`
  - `Alexis_LoadDefaultAscii`
  - `Alexis_TextCalcNameAddress`
- `coleco_text_io.asm`
  - `Alexis_PutCharAt`
  - `Alexis_GetCharAt`
  - `Alexis_FillAt`
  - `Alexis_PrintAt`
- `coleco_sound.asm`
  - `Alexis_SetSoundTable`
  - `Alexis_PlaySound`
  - `Alexis_MuteAll`
- `coleco_music.asm`
  - `Alexis_NextSong`
  - `Alexis_PlaySong`
  - `Alexis_UpdateMusic`
  - `Alexis_StopSong`
- `coleco_sprite.asm`
  - compatibility umbrella include for all split sprite helper modules below
- `coleco_sprite_config.asm`
  - `Alexis_SetSprites8x8`
  - `Alexis_SetSprites16x16`
  - `Alexis_SetSpritesSimple`
  - `Alexis_SetSpritesDouble`
- `coleco_sprite_table.asm`
  - `Alexis_SetSpriteCount`
  - `Alexis_ClearSprites`
  - `Alexis_UpdateSprites`
- `coleco_sprite_collision.asm`
  - `Alexis_CheckCollisionRaw`
  - `Alexis_CheckSpriteCollisionBox`
- `coleco_math.asm`
  - compatibility umbrella include for all split math modules below
- `coleco_math_sqrt.asm`
  - `Alexis_U16Sqrt`
- `coleco_math_format.asm`
  - `Alexis_U8ToAscii3`
  - `Alexis_U8ToAscii2`
  - `Alexis_U16ToAscii5`
  - `Alexis_U32ToAscii10`
  - `Alexis_Fx8_8FracToHundredths`
  - `Alexis_Fx8_8ToAscii6`
- `coleco_math_compare.asm`
  - `Alexis_CmpU8`
  - `Alexis_CmpS8`
  - `Alexis_CmpU16`
  - `Alexis_CmpS16`
  - `Alexis_CmpU32Mem`
  - `Alexis_CmpS32Mem`
- `coleco_math_u32.asm`
  - `Alexis_U24Zero`
  - `Alexis_U32Zero`
  - `Alexis_U32Copy`
  - `Alexis_U32Inc`
  - `Alexis_U32Add`
  - `Alexis_U32Sub`
- `coleco_math_fx.asm`
  - `Alexis_Fx8_8Add`
  - `Alexis_Fx8_8Sub`

The VDP routines are inspired by `getput11/gpscrmo0.s`, `getput11/gpscrmo1.s`, `getput11/gpscrmo2.s`, and the Warrior/Barbarian slideshow utility code.
The text routines are inspired by `getput11/gpcls.s`, `gp9print.s`, `gp9putat.s`, `gp9filat.s`, `gpascii0.s`, `gpascii1.s`, `gpchar.s`, and `gplascii.s`.
The sound routines are ported from `lib4ksa/sndtbl.s`, `sound.s`, and `mute.s`.
The music routines are adapted from `lib4ksa/music.s`.
The sprite routines are adapted from `lib4ksa/sprites0.s`, `sprites1.s`, `sprites2.s`, `sprites3.s`, and `getput11/gpupdats.s`.
The first math routines are adapted from `getput11/gpsqrt16.s`, `getput11/gputoa0.s`, and `lib4ksa/utoa.s`, then repackaged behind an ALEXIS-native register ABI.
