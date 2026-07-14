export const manifest = {
  defaults: {
    projectName: "amy-project",
    sourceLang: "amy",
    memoryProfile: "colecovision_legacy_sdcc",
    selectedLibs: [],
    selectedBundles: [],
    selectedCompression: [],
    selectedAssets: []
  },
  libs: [
    {
      id: "include/coleco_bios.inc",
      label: "Coleco BIOS equates",
      detail: "BIOS call addresses and VRAM table constants"
    },
    {
      id: "include/coleco_io.inc",
      label: "Coleco I/O ports",
      detail: "VDP/PSG/SGM ports"
    },
    {
      id: "include/coleco_macros.inc",
      label: "Coleco macros",
      detail: "Small helper macros used by demos"
    },
    {
      id: "src/alexis_lib/coleco_vdp.asm",
      label: "Amy Coleco VDP",
      detail: "Compatibility include for all split Amy VDP helper modules"
    },
    {
      id: "src/alexis_lib/coleco_vdp_core.asm",
      label: "Amy VDP: Core",
      detail: "Register writes, VRAM fill, name-table base, and BIOS-backed VRAM transfer helpers"
    },
    {
      id: "src/alexis_lib/coleco_vdp_modes.asm",
      label: "Amy VDP: Modes",
      detail: "Graphics mode setup plus Mode 2 color/pattern table duplication helpers"
    },
    {
      id: "src/alexis_lib/coleco_vdp_screen.asm",
      label: "Amy VDP: Screen",
      detail: "Simple screen on/off helpers for slideshow and bootstrap flows"
    },
    {
      id: "src/alexis_lib/coleco_text.asm",
      label: "Amy Coleco Text",
      detail: "Compatibility include for all split Amy text helper modules"
    },
    {
      id: "src/alexis_lib/coleco_text_core.asm",
      label: "Amy Text: Core",
      detail: "Name-table clear, default ASCII font load, and coordinate-to-name-address helpers"
    },
    {
      id: "src/alexis_lib/coleco_text_io.asm",
      label: "Amy Text: IO",
      detail: "Put/get/fill/print helpers for name-table text and tiles"
    },
    {
      id: "src/alexis_lib/coleco_sprite.asm",
      label: "Amy Coleco Sprites",
      detail: "Compatibility include for all split Amy sprite helper modules"
    },
    {
      id: "src/alexis_lib/coleco_sprite_config.asm",
      label: "Amy Sprites: Config",
      detail: "Sprite size and zoom mode helpers"
    },
    {
      id: "src/alexis_lib/coleco_sprite_table.asm",
      label: "Amy Sprites: Table",
      detail: "Sprite shadow-table count, clear, and upload helpers"
    },
    {
      id: "src/alexis_lib/coleco_sprite_collision.asm",
      label: "Amy Sprites: Collision",
      detail: "lib4ksa-style sprite collision helpers"
    },
    {
      id: "src/alexis_lib/coleco_math.asm",
      label: "Amy Math (Umbrella)",
      detail: "Compatibility include for all split Amy math helper modules"
    },
    {
      id: "src/alexis_lib/coleco_math_sqrt.asm",
      label: "Amy Math: Sqrt",
      detail: "Unsigned 16-bit square root helper"
    },
    {
      id: "src/alexis_lib/coleco_math_format.asm",
      label: "Amy Math: Format",
      detail: "AMY_U16_TO_ASCII5 — u16 ASCII formatter. U8/i8/fx8.8/u32/i32 formatters are in split files auto-detected by the compiler"
    },
    {
      id: "src/alexis_lib/coleco_math_compare.asm",
      label: "Amy Math: Compare",
      detail: "Explicit signed/unsigned compare helpers for u8, u16, and u32"
    },
    {
      id: "src/alexis_lib/coleco_math_u32.asm",
      label: "Amy Math: U32",
      detail: "Legacy umbrella — all u32 operations. Amy programs use auto-detected granular files (zero/copy/inc/add/sub/mul/div)"
    },
    {
      id: "src/alexis_lib/coleco_math_u16_div.asm",
      label: "Amy Math: U16/I16 Divide",
      detail: "Granular unsigned and signed 16-bit divide helpers for compound `/=`"
    },
    {
      id: "src/alexis_lib/coleco_math_u32_mul.asm",
      label: "Amy Math: U32 Multiply",
      detail: "Granular unsigned 32-bit multiply helper for compound `*=`"
    },
    {
      id: "src/alexis_lib/coleco_math_u32_div.asm",
      label: "Amy Math: U32 Divide",
      detail: "Granular unsigned 32-bit divide helper for compound `/=`"
    },
    {
      id: "src/alexis_lib/coleco_math_fx.asm",
      label: "Amy Math: Fixed 8.8",
      detail: "Fixed-point 8.8 add/sub helpers"
    },
    {
      id: "src/alexis_lib/coleco_math_fx_mul.asm",
      label: "Amy Math: Fixed 8.8 Multiply",
      detail: "Granular fixed 8.8 multiply helper for compound `*=`"
    },
    {
      id: "src/alexis_lib/coleco_math_fx_div.asm",
      label: "Amy Math: Fixed 8.8 Divide",
      detail: "Granular fixed 8.8 divide helper for compound `/=`"
    }
  ],
  bundles: [
    {
      id: "cvdevkit_sdcc/lib4ksa",
      label: "lib4ksa SDCC foundation",
      path: "src/vendor/cvdevkit_sdcc/lib4ksa/",
      detail: "CRT/NMI, VDP, sprites, sound, RLE, music, collision, memcpy, random"
    },
    {
      id: "cvdevkit_sdcc/getput11",
      label: "getput11 SDCC helpers",
      path: "src/vendor/cvdevkit_sdcc/getput11/",
      detail: "Text, frames, screen modes, graphics loaders, score, random/math, wipe effects"
    }
  ],
  compression: [
    { id: "src/compression/zx0_vram.asm", label: "ZX0 -> VRAM", detail: "HL=src, DE=vram dest, call zx0_decompress", codecId: "zx0" },
    { id: "src/compression/zx7_vram.asm", label: "ZX7 -> VRAM", detail: "HL=src, DE=vram dest, call zx7_decompress", codecId: "zx7" },
    { id: "src/compression/bitbuster_vram.asm", label: "BitBuster -> VRAM", detail: "Warrior routine", codecId: "bitbuster12" },
    { id: "src/compression/dan1_vram.asm", label: "DAN1 -> VRAM", detail: "Warrior routine", codecId: "dan1" },
    { id: "src/compression/dan2_vram.asm", label: "DAN2 -> VRAM", detail: "Original Amy Bienvenu / NewColeco routine", codecId: "dan2" },
    { id: "src/compression/dan3_vram.asm", label: "DAN3 -> VRAM", detail: "Warrior routine", codecId: "dan3" },
    { id: "src/compression/lzf_vram.asm", label: "LZF -> VRAM", detail: "Warrior routine", codecId: "lzf" },
    { id: "src/compression/mdkrle_vram.asm", label: "MDK RLE -> VRAM", detail: "Warrior routine", codecId: "mdkrle" },
    { id: "src/compression/pletter_vram.asm", label: "Pletter -> VRAM", detail: "Warrior routine", codecId: "pletter" }
  ],
  assets: [
    { id: "assets/compressed/barbarian/pattern.zx0", label: "Barbarian pattern (ZX0)", detail: "slideshow sample", codecId: "zx0" },
    { id: "assets/compressed/barbarian/color.zx0", label: "Barbarian color (ZX0)", detail: "slideshow sample", codecId: "zx0" },
    { id: "assets/compressed/warrior/pattern.zx0", label: "Warrior pattern (ZX0)", detail: "incbin sample", codecId: "zx0" },
    { id: "assets/compressed/warrior/color.zx0", label: "Warrior color (ZX0)", detail: "incbin sample", codecId: "zx0" },
    { id: "assets/compressed/barbarian/color.zx7", label: "Barbarian color (ZX7)", detail: "slideshow sample", codecId: "zx7" },
    { id: "assets/compressed/warrior/color.zx7", label: "Warrior color (ZX7)", detail: "incbin sample", codecId: "zx7" },
    { id: "assets/compressed/warrior/pattern.zx7", label: "Warrior pattern (ZX7)", detail: "incbin sample", codecId: "zx7" },
    { id: "assets/compressed/warrior/color.zx0", label: "Warrior color (ZX0)", detail: "incbin sample", codecId: "zx0" }
  ],
  assembler: {
    amysCvAssemblyDefaultPath: "../AmysCVAssembly/AmysCVAssemblerPro.html",
    notes: [
      "This studio generates a single Z80 ASM file for now.",
      "Compile with AmysCVAssembly by opening the HTML and drag-dropping the generated .asm."
    ]
  },
  deterministicSources: {
    assembler: "C:/Users/Amy/Documents/git/AmysCVAssembly/AmysCVAssemblerPro-v2.html",
    compression: "C:/Users/Amy/Documents/git/RetroCompress-Lite/js",
    soundAsm: "C:/Users/Amy/Documents/git/AmysCVSoundStudio/asmCodec.js"
  }
};
