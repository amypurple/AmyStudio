; ALEXIS-Z80 canonical ColecoVision memory constants
; Source profile: tools/memory/colecovision-memory.json

ROM_BASE            EQU $8000
ROM_HEADER_START    EQU $8000
ROM_HEADER_END      EQU $8023
ROM_CODE_START      EQU $8024

RAM_BASE            EQU $7000
RAM_LEGACY_CLEAR    EQU $7000
RAM_LEGACY_CLEAR_SZ EQU $03B8
RAM_LEGACY_CLEAR_END EQU $73B7

_buffer32           EQU $7000
snd_addr            EQU $7020   ; PTR_TO_LST_OF_SND_ADDRS — set before calling SOUND_INIT
snd_areas           EQU $702B   ; devkit sound data areas start here (coincides with USER_RAM_RESUME, different purpose)
_no_nmi             EQU $7080
_vdp_status         EQU $7081
_nmi_flag           EQU $7082
_joypad_1           EQU $7083
_keypad_1           EQU $7084
_joypad_2           EQU $7085
_keypad_2           EQU $7086
spinner_enabled     EQU $7087
AMY_SPRITE_COUNT EQU $7091
AMY_SPRITE_TABLE EQU $7092
AMY_TINYSOUND_SLOT_1 EQU $7112
AMY_TINYSOUND_SLOT_2 EQU $7122

legacy_random_seed  EQU $73C8
_spinner_1          EQU $73EB
_spinner_2          EQU $73EC

BIOS_JOYPAD_1_RAW   EQU $73EE
BIOS_JOYPAD_2_RAW   EQU $73EF
BIOS_KEYPAD_1_RAW   EQU $73F0
BIOS_KEYPAD_2_RAW   EQU $73F1
AMY_FRAME_COUNTER EQU $73BA

VDP_SPR_PAT_SHADOW  EQU $73F4
VDP_NAME_SHADOW     EQU $73F6
VDP_PATTERN_SHADOW  EQU $73F8
VDP_COLOR_SHADOW    EQU $73FA

VRAM_PATTERN        EQU $0000
VRAM_NAME           EQU $1800
VRAM_SPR_ATTR       EQU $1B00
VRAM_COLOR          EQU $2000
VRAM_SPR_PAT        EQU $3800
