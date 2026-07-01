; -----------------------------------------------------------------------------
; ALEXIS fp5 exact decimal formatting helpers
; -----------------------------------------------------------------------------

AMY_FP5_FMT_CURSOR     EQU AMY_BUFFER32+23
AMY_FP5_FMT_FRAC_COUNT EQU AMY_BUFFER32+25

; Convert 5-byte float at HL into fixed-width ASCII.
; Current output shape: "sddddd.fffffffff"
; Input: HL = source pointer
;        DE = destination buffer (16 bytes)
; Notes:
;   Integer part comes from the proven fp5 -> signed 16.16 bridge. Fractional
;   digits are then peeled one by one by repeatedly multiplying the remaining
;   fp5 fraction by 10, extracting the integer digit, and subtracting it back.
AMY_FP5_TO_ASCII16:
    push hl
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    pop hl
    rla
    jr nc,AMY_FP5_TO_ASCII16_POS
    ld a,$2D
    jr AMY_FP5_TO_ASCII16_STORE_SIGN
AMY_FP5_TO_ASCII16_POS:
    ld a,$20
AMY_FP5_TO_ASCII16_STORE_SIGN:
    ld (de),a
    inc de

    ld (AMY_FP5_FMT_CURSOR),de
    call AMY_FP5_LOAD_MEM_TO_FPA2
    ld hl,AMY_FP5_FPA2+3
    ld a,(hl)
    and $7F
    ld (hl),a
    ; Keep the full reload: low-byte-only reloads assembled but broke runtime formatting.
    ld hl,AMY_FP5_FPA2
    ld de,AMY_FP5_FPA1
    call AMY_FP5_TO_FX16_16
    ld de,(AMY_FP5_FMT_CURSOR)

    ld hl,(AMY_FP5_FPA1+2)
    call AMY_U16_TO_ASCII5
    inc de
    ld a,$2E
    ld (de),a
    inc de

    ld (AMY_FP5_FMT_CURSOR),de
    ld hl,(AMY_FP5_FPA1+2)
    call AMY_FP5_U16_TO_FPA1
    call AMY_FP5_SUB_FPA1_FROM_FPA2

    ld a,9
    ld (AMY_FP5_FMT_FRAC_COUNT),a
AMY_FP5_TO_ASCII16_FRAC_LOOP:
    call AMY_FP5_COPY_FPA2_TO_FPA1
    ld hl,AMY_FP5_FPA2
    call AMY_FP5_ZERO_MEM
    ld a,10
AMY_FP5_TO_ASCII16_MUL10_LOOP:
    push af
    call AMY_FP5_ADD_FPA1_TO_FPA2
    pop af
    dec a
    jr nz,AMY_FP5_TO_ASCII16_MUL10_LOOP

    ld hl,AMY_FP5_FPA2
    ld de,AMY_FP5_FMT_INT32
    call AMY_FP5_TO_FX16_16
    ld de,(AMY_FP5_FMT_CURSOR)

    ld a,(AMY_FP5_FMT_INT32+2)
    cp 10
    jr c,AMY_FP5_TO_ASCII16_DIGIT_READY
    ld a,9
AMY_FP5_TO_ASCII16_DIGIT_READY:
    add a,$30
    ld (de),a
    inc de
    ld (AMY_FP5_FMT_CURSOR),de

    sub $30
    ld l,a
    ld h,0
    call AMY_FP5_U16_TO_FPA1
    call AMY_FP5_SUB_FPA1_FROM_FPA2
    ld hl,AMY_FP5_FMT_FRAC_COUNT
    dec (hl)
    jr nz,AMY_FP5_TO_ASCII16_FRAC_LOOP
    ret
