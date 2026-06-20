; -----------------------------------------------------------------------------
; ALEXIS core ColecoVision VDP helpers
; -----------------------------------------------------------------------------

AMY_BUFFER32    EQU $7000

; Write one VDP register.
; Input: B = register number, C = value
AMY_VDP_WRITE_REG:
    jp WRITE_REGISTER

; Fill a VRAM range.
; Input: HL = VRAM offset, DE = byte count, A = fill value
AMY_FILL_VRAM:
    jp FILL_VRAM

; Fill the 32x24 name table with tile numbers $00..$FF repeated D times.
; For Graphics II picture pages, call with D=3 for 768 entries.
AMY_LOAD_SEQUENTIAL_NAME_TABLE:
    ld a,$00
    out (VDP_CTRL_PORT),a
    ld a,$58
    out (VDP_CTRL_PORT),a
AMY_LOAD_SEQUENTIAL_NAME_TABLE_REPEAT:
    ld b,0
    xor a
AMY_LOAD_SEQUENTIAL_NAME_TABLE_BYTE:
    out (VDP_DATA_PORT),a
    nop
    inc a
    djnz AMY_LOAD_SEQUENTIAL_NAME_TABLE_BYTE
    dec d
    jr nz,AMY_LOAD_SEQUENTIAL_NAME_TABLE_REPEAT
    ret

; Select the default NAME table and update the BIOS/getput11 shadow.
; Input: HL = VRAM base address
AMY_SET_DEFAULT_NAME_TABLE:
    push hl
    push ix
    push iy
    ld a,2
    call INIT_TABLE
    pop iy
    pop ix
    pop hl
    ld ($73F6),hl
    ret

; Copy BC bytes from HL into VRAM destination DE. Legacy alias for AMY_COPY_BYTES_TO_VRAM.
AMY_PUT_VRAM:
    jp AMY_COPY_BYTES_TO_VRAM

; Read BC bytes from VRAM source DE into RAM destination HL.
; Patches the BIOS READ_VRAM count bug: if C != 0, add 1 to B.
AMY_GET_VRAM:
    ld a,c
    or a
    jp z,READ_VRAM
    inc b
    jp READ_VRAM
