# ColecoVision Official Memory Map

Source: Coleco Industries Programmer's Manual Rev.5.
All addresses and symbol names are official Coleco Industries names.
Values confirmed against working hardware/emulator — do not alter without hardware verification.

---

## ROM Layout — $8000 to $8024

The cartridge ROM begins at $8000. The first 36 bytes are the fixed header.

| Address | Symbol              | Notes |
|---------|---------------------|-------|
| `$8000` | `CARTRIDGE` / `CONTROLLER_MAP` | ROM base; controller map starts here |
| `$8002` | `LOCAL_SPR_TBL`     | local sprite table pointer |
| `$8004` | `SPRITE_ORDER`      | sprite order table pointer |
| `$8006` | `WORK_BUFFER`       | work buffer pointer |
| `$800A` | `START_GAME`        | cartridge entry point |
| `$800C` | `RST_8H_RAM`        | RST $08 handler |
| `$800F` | `RST_10H_RAM`       | RST $10 handler |
| `$8012` | `RST_18H_RAM`       | RST $18 handler |
| `$8015` | `RST_20H_RAM`       | RST $20 handler |
| `$8018` | `RST_28H_RAM`       | RST $28 handler |
| `$801B` | `RST_30H_RAM`       | RST $30 handler |
| `$801E` | `IRQ_INT_VECT`      | IRQ/INT vector |
| `$8021` | `NMI_INT_VECT`      | NMI vector |
| `$8024` | *(code start)*      | first byte of cartridge code |

---

## BIOS ROM Internals — below $1F61

These are internal BIOS routines and data tables, not part of the official jump table.
Use only from inline ASM with full understanding of register conventions.

| Address | Symbol           | Notes |
|---------|------------------|-------|
| `$0024` | `GAME_NAME`      | game name string in BIOS ROM |
| `$0069` | `AMERICA`        | |
| `$006A` | `ASCII_TABLE`    | ASCII tile data table |
| `$006C` | `NUMBER_TABLE`   | |
| `$00FC` | `FREQ_SWEEP`     | |
| `$012F` | `ATN_SWEEP`      | |
| `$0190` | `DECLSN`         | decimal least-significant nibble |
| `$019B` | `DECMSN`         | decimal most-significant nibble |
| `$01A6` | `MSNTOLSN`       | MSN to LSN conversion |
| `$01B1` | `ADDB16`         | 16-bit BCD add |
| `$01D5` | `LEAVE_EFFECT`   | |
| `$02EE` | `EXPOWER`        | exponent/power routine |
| `$1D43` | `CTRL_PORT_PTR`  | controller port pointer |
| `$1D47` | `DATA_PORT_PTR`  | data port pointer |
| `$1D6C` | `ENLRG`          | internal enlarge routine |
| `$1F6E` | `PUT_VRAM` *(internal)* | internal PUT_VRAM helper — jump table entry is at `$1FBE` |

---

## BIOS Jump Table — $1F61 to $1FFD

Every entry is a 3-byte `JP nn` vector. The table fills exactly to $1FFF (53 entries × 3 bytes).

Symbols ending in **P** are Pascal variants: they decode parameters from the Pascal
call parameter-passing area (`PARAM_AREA` at `$73BA`) instead of from registers.

| Address | Symbol               | Notes |
|---------|----------------------|-------|
| `$1F61` | `PLAY_SONGS`         | |
| `$1F64` | `ACTIVATEP`          | Pascal variant |
| `$1F67` | `PUTOBJP`            | Pascal variant |
| `$1F6A` | `REFLECT_VERTICAL`   | |
| `$1F6D` | `REFLECT_HORIZONTAL` | |
| `$1F70` | `ROTATE_90`          | |
| `$1F73` | `ENLARGE`            | |
| `$1F76` | `CONTROLLER_SCAN`    | |
| `$1F79` | `DECODER`            | |
| `$1F7C` | `GAME_OPT`           | |
| `$1F7F` | `LOAD_ASCII`         | |
| `$1F82` | `FILL_VRAM`          | |
| `$1F85` | `MODE_1`             | |
| `$1F88` | `UPDATE_SPINNER`     | |
| `$1F8B` | `INIT_TABLEP`        | Pascal variant |
| `$1F8E` | `GET_VRAMP`          | Pascal variant |
| `$1F91` | `PUT_VRAMP`          | Pascal variant |
| `$1F94` | `INIT_SPR_ORDERP`    | Pascal variant |
| `$1F97` | `WR_SPR_NM_TBLP`     | Pascal variant |
| `$1F9A` | `INIT_TIMERP`        | Pascal variant |
| `$1F9D` | `FREE_SIGNALP`       | Pascal variant |
| `$1FA0` | `REQUEST_SIGNALP`    | Pascal variant |
| `$1FA3` | `TEST_SIGNALP`       | Pascal variant |
| `$1FA6` | `WRITE_REGISTERP`    | Pascal variant |
| `$1FA9` | `WRITE_VRAMP`        | Pascal variant |
| `$1FAC` | `READ_VRAMP`         | Pascal variant |
| `$1FAF` | `INIT_WRITERP`       | Pascal variant |
| `$1FB2` | `SOUND_INITP`        | Pascal variant |
| `$1FB5` | `PLAY_ITP`           | Pascal variant |
| `$1FB8` | `INIT_TABLE`         | |
| `$1FBB` | `GET_VRAM`           | |
| `$1FBE` | `PUT_VRAM`           | |
| `$1FC1` | `INIT_SPR_ORDER`     | |
| `$1FC4` | `WR_SPR_NM_TBL`      | |
| `$1FC7` | `INIT_TIMER`         | |
| `$1FCA` | `FREE_SIGNAL`        | |
| `$1FCD` | `REQUEST_SIGNAL`     | |
| `$1FD0` | `TEST_SIGNAL`        | |
| `$1FD3` | `TIME_MGR`           | |
| `$1FD6` | `TURN_OFF_SOUND`     | |
| `$1FD9` | `WRITE_REGISTER`     | |
| `$1FDC` | `READ_REGISTER`      | |
| `$1FDF` | `WRITE_VRAM`         | |
| `$1FE2` | `READ_VRAM`          | |
| `$1FE5` | `INIT_WRITER`        | |
| `$1FE8` | `WRITER`             | |
| `$1FEB` | `POLLER`             | The OCR transcription `$1FE8` is an `8`/`B` recognition error; the photographed jump table and production BIOS both confirm `$1FEB` |
| `$1FEE` | `SOUND_INIT`         | |
| `$1FF1` | `PLAY_IT`            | |
| `$1FF4` | `SOUND_MAN`          | |
| `$1FF7` | `ACTIVATE`           | |
| `$1FFA` | `PUTOBJ`             | |
| `$1FFD` | `RAND_GEN`           | |

### `WRITE_VRAM` and `READ_VRAM` reality

The raw BIOS `WRITE_VRAM` / `READ_VRAM` routines use:
- `HL` = RAM source/destination
- `DE` = VRAM address
- `BC` = byte count

Important practical note:
- `A` is not the count parameter for BIOS `WRITE_VRAM`
- many legacy helper wrappers still load `A` for their own local logic, but the BIOS copy count itself is driven by `BC`

Known BIOS issue:
- `WRITE_VRAM` and `READ_VRAM` have the classic count bug when both `B` and `C` are non-zero
- patched helper wrappers in this repo compensate for that in general-case paths
- small byte-sized compile-time counts can often bypass that wrapper safely when the compiler can prove the count stays within the non-buggy case

---

## CRAM Reference — $7000 to $73FF

Official symbol names from Rev.5 Table 10-1.
Amy's runtime uses `$7020–$73B7` for user variables; OS-reserved areas are preserved.

### User RAM boundary

| Address | Symbol            | Notes |
|---------|-------------------|-------|
| `$7000` | `USER_RAM_START`  | base of user RAM |

### OS Sound Pointer Area — $7020

| Address | Symbol                    | Amy devkit | Notes |
|---------|---------------------------|------------|-------|
| `$7020` | `PTR_TO_LST_OF_SND_ADDRS` | `snd_addr` | pointer to `LST_OF_SND_ADDRS` in ROM; must be set before calling `SOUND_INIT` (word) |
| `$7022` | `PTR_TO_S_ON_0`           |            | channel 0 data area pointer (word) |
| `$7024` | `PTR_TO_S_ON_1`           |            | channel 1 data area pointer (word) |
| `$7026` | `PTR_TO_S_ON_2`           |            | channel 2 data area pointer (word) |
| `$7028` | `PTR_TO_S_ON_3`           |            | channel 3 data area pointer (word) |
| `$702A` | `SAVE_CTRL`               |            | noise channel control shadow; set to $FF by `SOUND_INIT` |
| `$702B` | `USER_RAM_RESUME`         | `snd_areas`| OS boundary: first byte of user RAM after OS-reserved area. Amy devkit places sound data areas here — same address, different meaning. |

### Stack

| Address | Symbol  | Notes |
|---------|---------|-------|
| `$73B9` | `STACK` | top of stack |

### Pascal Parameter Area — $73BA

| Address | Symbol         | Notes |
|---------|----------------|-------|
| `$73BA` | `PARAM_AREA`   | Pascal call parameter passing area |
| `$73BB` | `PARAM_AREA_1` | |
| `$73BC` | `PARAM_AREA_2` | |
| `$73BD` | `PARAM_AREA_3` | |

### VDP State — $73C3

| Address | Symbol            | Notes |
|---------|-------------------|-------|
| `$73C3` | `VDP_MODE_WORD`   | |
| `$73C5` | `VDP_STATUS_BYTE` | |
| `$73C6` | `DEFER_WRITES`    | |
| `$73C7` | `MUX_SPRITES`     | |
| `$73C8` | `RAND_NUM`        | |

### Queue — $73CA

| Address | Symbol              | Notes |
|---------|---------------------|-------|
| `$73CA` | `QUEUE_SIZE`        | |
| `$73CB` | `QUEUE_HEAD`        | |
| `$73CC` | `QUEUE_TAIL`        | |
| `$73CD` | `HEAD_ADDRESS`      | word |
| `$73CE` | `HEAD_ADDRESS_1`    | |
| `$73CF` | `TAIL_ADDRESS`      | word |
| `$73D0` | `TAIL_ADDRESS_1`    | |
| `$73D1` | `BUFFER`            | word |
| `$73D2` | `BUFFER_1`          | |
| `$73D3` | `TIMER_TABLE_BAS`   | word |
| `$73D4` | `TIMER_TABLE_BAS_1` | |
| `$73D5` | `NEXT_TIMER_DATA`   | word |
| `$73D6` | `NEXT_TIMER_DATA_1` | |

### Controller Debounce Buffer — $73D7

The official BIOS `POLLER` entry at `$1FEB` uses this 20-byte area when called
once per vertical retrace. It requires two matching samples before accepting a
changed FIRE, joystick, spinner, ARM, or keypad state. This debounces the state;
it does not by itself turn a held value into a one-shot press event.

Player 0:

| Address | Symbol         | Notes |
|---------|----------------|-------|
| `$73D7` | `DBNCE_BUFF`   | alias: `FIRE_OLD` (Player 0) |
| `$73D8` | `FIRE_STATE_0` | |
| `$73D9` | `JOY_OLD_0`    | |
| `$73DA` | `JOY_STATE_0`  | |
| `$73DB` | `SPIN_OLD_0`   | |
| `$73DC` | `SPIN_STATE_0` | |
| `$73DD` | `ARM_OLD_0`    | |
| `$73DE` | `ARM_STATE_0`  | |
| `$73DF` | `KBD_OLD_0`    | |
| `$73E0` | `KBD_STATE_0`  | |

Player 1:

| Address | Symbol         | Notes |
|---------|----------------|-------|
| `$73E1` | `FIRE_OLD_1`   | |
| `$73E2` | `FIRE_STATE_1` | |
| `$73E3` | `JOY_OLD_1`    | |
| `$73E4` | `JOY_STATE_1`  | |
| `$73E5` | `SPIN_OLD_1`   | |
| `$73E6` | `SPIN_STATE_1` | |
| `$73E7` | `ARM_OLD_1`    | |
| `$73E8` | `ARM_STATE_1`  | |
| `$73E9` | `KBD_OLD_1`    | |
| `$73EA` | `KBD_STATE_1`  | |

### Spinner and Strobe — $73EB

| Address | Symbol        | Notes |
|---------|---------------|-------|
| `$73EB` | `SPIN_SW0_CT` | |
| `$73EC` | `SPIN_SW1_CT` | |
| `$73ED` | `STROBE_FLG`  | |
| `$73EE` | `S0_C0`       | |
| `$73EF` | `S0_C1`       | |
| `$73F0` | `S1_C0`       | |
| `$73F1` | `S1_C1`       | |

### VRAM Address Shadow Table — $73F2

These hold the 16-bit VRAM base addresses mirroring the active VDP register settings.

| Address | Symbol              | Amy alias            | Notes |
|---------|---------------------|----------------------|-------|
| `$73F2` | `VRAM_ADDR_TABLE` / `SPRITENAMTBL` | — | base of shadow table |
| `$73F3` | `SPRITENAMTBL_1`    | —                    | |
| `$73F4` | `SPRITEGENTBL`      | `VDP_SPR_PAT_SHADOW` | sprite pattern table base |
| `$73F5` | `SPRITEGENTBL_1`    | —                    | |
| `$73F6` | `PATTERNAMTBL`      | `VDP_NAME_SHADOW`    | name table base |
| `$73F7` | `PATTERNAMTBL_1`    | —                    | |
| `$73F8` | `PATTERNGENTBL`     | `VDP_PATTERN_SHADOW` | pattern generator base |
| `$73F9` | `PATTERNGENTBL_1`   | —                    | |
| `$73FA` | `COLORTABLE`        | `VDP_COLOR_SHADOW`   | color table base |
| `$73FB` | `COLORTABLE_1`      | —                    | |

### Scratch — $73FC

| Address | Symbol          | Notes |
|---------|-----------------|-------|
| `$73FC` | `SAVE_TEMP`     | word |
| `$73FD` | `SAVE_TEMP_1`   | |
| `$73FE` | `SAVED_COUNT`   | word |
| `$73FF` | `SAVED_COUNT_1` | |
