; -----------------------------------------------------------------------------
; Nibble decompressor to VRAM
; Inspired by Amy/Daniel Bienvenu's legacy DAN0nibble depacker.
;
; Modern Studio stream layout:
;   u16 dataOffset   ; little-endian, relative to compressed stream start
;   control stream   ; RLE commands and bit-buffer bytes
;   data stream
;
; Control commands:
;   00      raw 256 values
;   01-7F   raw 1..127 values
;   80      repeat one value 256 times
;   81      end
;   82-FF   repeat one value 2..127 times
;
; Value coding:
;   bit 0        literal byte from data stream
;   bits 1 nnnn  byte from 1..16 bytes before current data stream pointer
;
; IN: HL -> compressed source in ROM/RAM
;     DE -> destination VRAM address
;
; A is the control bit-buffer, like ZX7/DAN getbit routines. Unlike ZX7/DAN,
; this container keeps packet command bytes in the same control area while A
; may already contain pending bits for the next packet. Therefore command and
; output-byte use of A is protected with PUSH AF / POP AF, not AF'.
; -----------------------------------------------------------------------------

nibble_decompress:
    ld c,$bf
    out (c),e
    set 6,d
    out (c),d

    push hl
    ld c,(hl)
    inc hl
    ld b,(hl)
    inc hl
    ex (sp),hl
    add hl,bc
    ex de,hl
    pop hl

    ld a,$80

nibble_main_loop:
    push af
    ld a,(hl)
    inc hl
    bit 7,a
    jr z,nibble_raw_packet

    sub $81
    jr z,nibble_done
    inc a
    ld b,a
    pop af
    call nibble_read_value
nibble_run_loop:
    push af
    ld a,c
    out ($be),a
    pop af
    djnz nibble_run_loop
    jr nibble_main_loop

nibble_raw_packet:
    ld b,a
    pop af
nibble_raw_loop:
    call nibble_read_value
    push af
    ld a,c
    out ($be),a
    pop af
    djnz nibble_raw_loop
    jr nibble_main_loop

nibble_done:
    pop af
    ret

nibble_read_value:
    call nibble_get_bit
    jr c,nibble_read_backref
    push af
    ld a,(de)
    ld c,a
    inc de
    pop af
    ret

nibble_read_backref:
    push bc
    ld c,0
    call nibble_getnibble_c
    inc c
    push hl
    ld h,d
    ld l,e
    ld b,0
    or a
    sbc hl,bc
    ex af,af'
    ld a,(hl)
    pop hl
    pop bc
    ld c,a
    ex af,af'
    ret

nibble_getnibble_c:
    call nibble_getbit_c
    call nibble_getbit_c
    call nibble_getbit_c
nibble_getbit_c:
    call nibble_get_bit
    rl c
    ret
nibble_get_bit:
    add a,a
    ret nz
    ld a,(hl)
    inc hl
    rla
    ret