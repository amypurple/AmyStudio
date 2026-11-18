; Amy FujiNet support for the FujiNet-ColecoVision cartridge.
;
; The cartridge serves the program at $8000-$F7FF and a mailbox at
; $F800-$FFFF. The cartridge edge has no /WR line, so the console sends bytes
; by READING hotspots:
;   $FD00+reg   select register reg
;   $FE00+val   store val in the selected register
;   $FF00+byte  append byte to the transmit stream (320 bytes)
; Registers: DEVICE 0, CMD 1, NPARAM 2, DATA_RST 5, SEQ $10.
; The transmit stream is NPARAM x {size 1/2/4, little-endian value}, then the
; payload. The reply is read in place at $F800-$FBFF. Status page:
;   $FC00 ACKSEQ, $FC02 transport error, $FC03 $06 ACK / $15 NAK,
;   $FC04/$FC05 reply length, $FC09/$FC0A "FN", $FC0B protocol version 1.
;
; Rules every routine here follows:
; - Only single-byte reads touch $FD00-$FFFF: one read is one event.
; - Nothing writes $8000-$FFFF. On hardware a write fires the hotspot.
; - Each mailbox primitive keeps its body between AMY_OPTIMIZER_TIMING markers
;   placed right after its entry label, so no optimizer profile can drop a
;   read whose value looks unused. Inside a region there are only relative
;   branches, so the bytes match across profiles.
; - Wrappers outside the regions never address the mailbox directly.
;
; Wrapper ABI: A = unit (1-8, devices $71-$78), HL = source or destination,
; BC = length. Returns A = 0 success / 1 failure and HL = byte count.
; IX and IY are preserved.

; Returns A = 1 when a FujiNet cartridge answers, else 0.
AMY_FNC_PRESENT:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_PRESENT:
    ld a,($FC09)
    cp $46
    jr nz,AMY_FNC_PRESENT_NO
    ld a,($FC0A)
    cp $4E
    jr nz,AMY_FNC_PRESENT_NO
    ld a,($FC0B)
    cp $01
    jr z,AMY_FNC_PRESENT_DONE
AMY_FNC_PRESENT_NO:
    xor a
AMY_FNC_PRESENT_DONE:
AMY_OPTIMIZER_TIMING_END_FNC_PRESENT:
    ret

; A = device, C = command. Rewinds the transmit stream and selects both.
; Clobbers A, B, DE.
AMY_FNC_BEGIN:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_BEGIN:
    ld b,a
    ld de,$FD05
    ld a,(de)
    ld d,$FE
    ld e,$00
    ld a,(de)
    ld de,$FD00
    ld a,(de)
    ld d,$FE
    ld e,b
    ld a,(de)
    ld de,$FD01
    ld a,(de)
    ld d,$FE
    ld e,c
    ld a,(de)
AMY_OPTIMIZER_TIMING_END_FNC_BEGIN:
    ret

; A = byte to transmit. Preserves BC, DE, HL.
AMY_FNC_TXBYTE:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_TXBYTE:
    push de
    ld d,$FF
    ld e,a
    ld a,(de)
    pop de
AMY_OPTIMIZER_TIMING_END_FNC_TXBYTE:
    ret

; HL = source, BC = count (0 allowed). Returns HL past the block.
; Clobbers A, BC, DE.
AMY_FNC_TXBLOCK:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_TXBLOCK:
    ld d,$FF
AMY_FNC_TXBLOCK_LOOP:
    ld a,b
    or c
    jr z,AMY_FNC_TXBLOCK_DONE
    ld e,(hl)
    ld a,(de)
    inc hl
    dec bc
    jr AMY_FNC_TXBLOCK_LOOP
AMY_FNC_TXBLOCK_DONE:
AMY_OPTIMIZER_TIMING_END_FNC_TXBLOCK:
    ret

; A = parameter count. Runs the transaction and waits for the cartridge.
; Fails at once without a FujiNet cartridge. The wait (about 100 s) outlasts
; the cartridge's own 90 s network timeout, so a late reply is never taken for
; the next one. Returns A = 0 and HL = reply length on ACK, A = 1 and HL = 0
; otherwise. Clobbers BC, DE.
AMY_FNC_COMMIT:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_COMMIT:
    ld c,a
    ld a,($FC09)
    cp $46
    jr nz,AMY_FNC_COMMIT_FAIL
    ld a,($FC0A)
    cp $4E
    jr nz,AMY_FNC_COMMIT_FAIL
    ld de,$FD02
    ld a,(de)
    ld d,$FE
    ld e,c
    ld a,(de)
    ld a,($FC00)
    inc a
    jr nz,AMY_FNC_COMMIT_SEQ
    inc a
AMY_FNC_COMMIT_SEQ:
    ld h,a
    ld de,$FD10
    ld a,(de)
    ld d,$FE
    ld e,h
    ld a,(de)
    ld b,110
AMY_FNC_COMMIT_OUTER:
    ld de,0
AMY_FNC_COMMIT_POLL:
    ld a,($FC00)
    cp h
    jr z,AMY_FNC_COMMIT_DONE
    dec de
    ld a,d
    or e
    jr nz,AMY_FNC_COMMIT_POLL
    djnz AMY_FNC_COMMIT_OUTER
AMY_FNC_COMMIT_FAIL:
    ld hl,0
    ld a,1
    jr AMY_FNC_COMMIT_EXIT
AMY_FNC_COMMIT_DONE:
    ld a,($FC02)
    or a
    jr nz,AMY_FNC_COMMIT_FAIL
    ld a,($FC03)
    cp $06
    jr nz,AMY_FNC_COMMIT_FAIL
    ld hl,($FC04)
    xor a
AMY_FNC_COMMIT_EXIT:
AMY_OPTIMIZER_TIMING_END_FNC_COMMIT:
    ret

; A = reply offset. Returns HL = the reply word there. Clobbers A.
AMY_FNC_REPLY_WORD:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_REPLY_WORD:
    ld l,a
    ld h,$F8
    ld a,(hl)
    inc hl
    ld h,(hl)
    ld l,a
AMY_OPTIMIZER_TIMING_END_FNC_REPLY_WORD:
    ret

; A = reply offset. Returns A = the reply byte there. Clobbers HL.
AMY_FNC_REPLY_BYTE:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_REPLY_BYTE:
    ld l,a
    ld h,$F8
    ld a,(hl)
AMY_OPTIMIZER_TIMING_END_FNC_REPLY_BYTE:
    ret

; HL = reply offset. Returns HL = its address in the reply window.
AMY_FNC_WINDOW:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_WINDOW:
    ld a,h
    and $03
    add a,$F8
    ld h,a
AMY_OPTIMIZER_TIMING_END_FNC_WINDOW:
    ret

; HL = reply offset, DE = destination, BC = count already clamped to the
; reply. Clobbers A, BC, DE, HL.
AMY_FNC_RXCOPY:
AMY_OPTIMIZER_TIMING_BEGIN_FNC_RXCOPY:
    ld a,b
    or c
    jr z,AMY_FNC_RXCOPY_DONE
    ld a,h
    and $03
    add a,$F8
    ld h,a
    ldir
AMY_FNC_RXCOPY_DONE:
AMY_OPTIMIZER_TIMING_END_FNC_RXCOPY:
    ret

; A = unit 1-8. Returns A = device $71-$78, or carry for any other unit.
AMY_FNC_UNIT:
    or a
    jr z,AMY_FNC_UNIT_BAD
    cp 9
    jr nc,AMY_FNC_UNIT_BAD
    add a,$70
    or a
    ret
AMY_FNC_UNIT_BAD:
    scf
    ret

; A = device, C = command with no parameters. Returns A = status, HL = reply length.
AMY_FNC_SIMPLE:
    call AMY_FNC_BEGIN
    xor a
    jp AMY_FNC_COMMIT

; A = unit, HL = devicespec, BC = capacity, D = mode, E = translation.
AMY_FNC_OPEN:
    push af
    call AMY_FN_TEXT_LENGTH
    push hl
    ld hl,316
    call AMY_FN_MIN_BC_HL
    pop hl
    pop af
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    push bc
    push hl
    push de
    ld c,$4F
    call AMY_FNC_BEGIN
    pop de
    ld a,1
    call AMY_FNC_TXBYTE
    ld a,d
    call AMY_FNC_TXBYTE
    ld a,1
    call AMY_FNC_TXBYTE
    ld a,e
    call AMY_FNC_TXBYTE
    pop hl
    pop bc
    call AMY_FNC_TXBLOCK
    ld a,2
    jp AMY_FNC_COMMIT

; A = unit.
AMY_FNC_CLOSE:
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    ld c,$43
    jp AMY_FNC_SIMPLE

; A = unit, HL = 4-byte FujiNetStatus destination.
AMY_FNC_STATUS:
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    push hl
    ld c,$53
    call AMY_FNC_SIMPLE
    pop de
    or a
    jp nz,AMY_FN_FAIL
    ld hl,0
    ld bc,4
    call AMY_FNC_RXCOPY
    xor a
    ld h,a
    ld l,a
    ret

; A = unit, HL = destination, BC = most bytes to take. Never waits for data:
; returns HL = 0 when nothing is waiting, and A = 1 when the channel has
; ended (end of file or an error) with nothing left.
AMY_FNC_READ:
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    push hl
    push bc
    push af
    ld c,$53
    call AMY_FNC_SIMPLE
    or a
    jr nz,AMY_FNC_READ_FAIL
    xor a
    call AMY_FNC_REPLY_WORD
    ld a,h
    or l
    jr nz,AMY_FNC_READ_WAITING
    ld a,3
    call AMY_FNC_REPLY_BYTE
    cp 2
    jr nc,AMY_FNC_READ_FAIL
    pop af
    pop bc
    pop hl
    xor a
    ld h,a
    ld l,a
    ret
AMY_FNC_READ_WAITING:
    pop af
    pop bc
    call AMY_FN_MIN_BC_HL
    ld hl,1024
    call AMY_FN_MIN_BC_HL
    pop hl
    ld e,a
    ld a,b
    or c
    jr nz,AMY_FNC_READ_REQUEST
    ld h,a
    ld l,a
    ret
AMY_FNC_READ_REQUEST:
    push hl
    push bc
    ld a,e
    ld c,$52
    call AMY_FNC_BEGIN
    pop bc
    push bc
    ld a,2
    call AMY_FNC_TXBYTE
    ld a,c
    call AMY_FNC_TXBYTE
    ld a,b
    call AMY_FNC_TXBYTE
    ld a,1
    call AMY_FNC_COMMIT
    pop bc
    pop de
    or a
    jp nz,AMY_FN_FAIL
    call AMY_FN_MIN_BC_HL
    push bc
    ld hl,0
    call AMY_FNC_RXCOPY
    pop hl
    xor a
    ret
AMY_FNC_READ_FAIL:
    pop af
    pop bc
    pop hl
    jp AMY_FN_FAIL

; A = unit, HL = source, BC = count. Sends 317-byte transactions.
AMY_FNC_WRITE:
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    ld e,a
AMY_FNC_WRITE_LOOP:
    ld a,b
    or c
    jr z,AMY_FNC_WRITE_OK
    push de
    push bc
    push hl
    ld hl,317
    call AMY_FN_MIN_BC_HL
    ld a,e
    push bc
    ld c,$57
    call AMY_FNC_BEGIN
    pop bc
    ld a,2
    call AMY_FNC_TXBYTE
    ld a,c
    call AMY_FNC_TXBYTE
    ld a,b
    call AMY_FNC_TXBYTE
    pop hl
    push bc
    call AMY_FNC_TXBLOCK
    ld a,1
    push hl
    call AMY_FNC_COMMIT
    pop de
    pop bc
    pop hl
    or a
    jr nz,AMY_FNC_WRITE_FAIL
    sbc hl,bc
    ld b,h
    ld c,l
    ex de,hl
    pop de
    jr AMY_FNC_WRITE_LOOP
AMY_FNC_WRITE_FAIL:
    pop de
    jp AMY_FN_FAIL
AMY_FNC_WRITE_OK:
    xor a
    ld h,a
    ld l,a
    ret

; A = unit. Selects the JSON parser and parses what the channel received.
AMY_FNC_JSON:
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    push af
    ld c,$FC
    call AMY_FNC_BEGIN
    ld a,1
    call AMY_FNC_TXBYTE
    ld a,1
    call AMY_FNC_TXBYTE
    ld a,1
    call AMY_FNC_TXBYTE
    ld a,1
    call AMY_FNC_TXBYTE
    ld a,2
    call AMY_FNC_COMMIT
    or a
    jr nz,AMY_FNC_JSON_FAIL
    pop af
    ld c,$50
    jp AMY_FNC_SIMPLE
AMY_FNC_JSON_FAIL:
    pop af
    jp AMY_FN_FAIL

; A = unit, E = HTTP channel mode (0 body, 1 collect headers, 2 get headers,
; 3 set headers, 4 post data).
AMY_FNC_HTTP_MODE:
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    push de
    ld c,$4D
    call AMY_FNC_BEGIN
    pop de
    ld a,1
    call AMY_FNC_TXBYTE
    xor a
    call AMY_FNC_TXBYTE
    ld a,1
    call AMY_FNC_TXBYTE
    ld a,e
    call AMY_FNC_TXBYTE
    ld a,2
    jp AMY_FNC_COMMIT

; A = unit, HL = query text, BC = capacity. Sends the query and a 0.
AMY_FNC_QUERY:
    push af
    call AMY_FN_TEXT_LENGTH
    push hl
    ld hl,319
    call AMY_FN_MIN_BC_HL
    pop hl
    pop af
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    push hl
    push bc
    ld c,$51
    call AMY_FNC_BEGIN
    pop bc
    pop hl
    call AMY_FNC_TXBLOCK
    xor a
    call AMY_FNC_TXBYTE
    xor a
    jp AMY_FNC_COMMIT

; A = unit, HL = destination, BC = capacity. Reads everything waiting and
; keeps what fits: a value left half-read would shift every later query.
; Returns A = status, HL = bytes kept (trailing CR/LF dropped, 0 added when
; there is room).
AMY_FNC_DRAIN:
    call AMY_FNC_UNIT
    jp c,AMY_FN_FAIL
    push ix
    push hl
    push bc
    ld hl,0
    push hl
    push af
    ld ix,0
    add ix,sp
AMY_FNC_DRAIN_LOOP:
    ld a,(ix+1)
    ld c,$53
    call AMY_FNC_SIMPLE
    or a
    jr nz,AMY_FNC_DRAIN_FAIL
    xor a
    call AMY_FNC_REPLY_WORD
    ld a,h
    or l
    jr z,AMY_FNC_DRAIN_END
    ld b,h
    ld c,l
    ld hl,1024
    call AMY_FN_MIN_BC_HL
    ld a,(ix+1)
    push bc
    ld c,$52
    call AMY_FNC_BEGIN
    pop bc
    ld a,2
    call AMY_FNC_TXBYTE
    ld a,c
    call AMY_FNC_TXBYTE
    ld a,b
    call AMY_FNC_TXBYTE
    ld a,1
    call AMY_FNC_COMMIT
    or a
    jr nz,AMY_FNC_DRAIN_FAIL
    ld b,h
    ld c,l
    ld l,(ix+4)
    ld h,(ix+5)
    ld e,(ix+2)
    ld d,(ix+3)
    or a
    sbc hl,de
    call AMY_FN_MIN_BC_HL
    ld a,b
    or c
    jr z,AMY_FNC_DRAIN_LOOP
    ld l,(ix+6)
    ld h,(ix+7)
    add hl,de
    ex de,hl
    ld l,(ix+2)
    ld h,(ix+3)
    add hl,bc
    ld (ix+2),l
    ld (ix+3),h
    ld hl,0
    call AMY_FNC_RXCOPY
    jr AMY_FNC_DRAIN_LOOP
AMY_FNC_DRAIN_END:
    ld l,(ix+6)
    ld h,(ix+7)
    ld c,(ix+2)
    ld b,(ix+3)
    ld e,(ix+4)
    ld d,(ix+5)
    call AMY_FN_FINISH_TEXT
    pop af
    pop bc
    pop bc
    pop bc
    pop ix
    xor a
    ret
AMY_FNC_DRAIN_FAIL:
    pop af
    pop bc
    pop bc
    pop bc
    pop ix
    jp AMY_FN_FAIL

; HL = creator, D = app, E = key, A = mode (0 read, 1 write).
AMY_FNC_APPKEY_OPEN:
    push af
    push de
    push hl
    ld a,$70
    ld c,$DC
    call AMY_FNC_BEGIN
    pop hl
    pop de
    ld a,l
    call AMY_FNC_TXBYTE
    ld a,h
    call AMY_FNC_TXBYTE
    ld a,d
    call AMY_FNC_TXBYTE
    ld a,e
    call AMY_FNC_TXBYTE
    pop af
    call AMY_FNC_TXBYTE
    xor a
    call AMY_FNC_TXBYTE
    xor a
    jp AMY_FNC_COMMIT

; HL = destination, BC = capacity. Reads the key opened for reading.
; A key that was never written reads as 0 bytes.
AMY_FNC_APPKEY_READ:
    push hl
    push bc
    ld a,$70
    ld c,$DD
    call AMY_FNC_SIMPLE
    pop bc
    pop de
    or a
    jp nz,AMY_FN_FAIL
    ld a,h
    or a
    jr nz,AMY_FNC_APPKEY_READ_SIZED
    ld a,l
    cp 2
    jr nc,AMY_FNC_APPKEY_READ_SIZED
    xor a
    ld h,a
    ld l,a
    ret
AMY_FNC_APPKEY_READ_SIZED:
    dec hl
    dec hl
    call AMY_FN_MIN_BC_HL
    xor a
    call AMY_FNC_REPLY_WORD
    call AMY_FN_MIN_BC_HL
    ld hl,64
    call AMY_FN_MIN_BC_HL
    push bc
    ld hl,2
    call AMY_FNC_RXCOPY
    pop hl
    xor a
    ret

; HL = source, BC = count (at most 64 are stored). Writes the key opened for writing.
AMY_FNC_APPKEY_WRITE:
    push hl
    ld hl,64
    call AMY_FN_MIN_BC_HL
    push bc
    ld a,$70
    ld c,$DE
    call AMY_FNC_BEGIN
    pop bc
    pop hl
    call AMY_FNC_TXBLOCK
    xor a
    jp AMY_FNC_COMMIT

; HL = 7-byte FujiNetTime destination (century, year, month, day, hour,
; minute, second) in the FujiNet's time zone.
AMY_FNC_TIME:
    push hl
    ld a,$45
    ld c,$54
    call AMY_FNC_BEGIN
    ld a,1
    call AMY_FNC_TXBYTE
    xor a
    call AMY_FNC_TXBYTE
    ld a,1
    call AMY_FNC_COMMIT
    pop de
    or a
    jp nz,AMY_FN_FAIL
    ld hl,0
    ld bc,7
    call AMY_FNC_RXCOPY
    xor a
    ld h,a
    ld l,a
    ret

; L = field offset, H = field width, DE = destination, BC = capacity.
; Copies one text field of the extended adapter configuration.
AMY_FNC_ADAPTER:
    push hl
    push de
    push bc
    ld a,$70
    ld c,$C4
    call AMY_FNC_SIMPLE
    pop bc
    pop de
    pop hl
    or a
    jp nz,AMY_FN_FAIL
    push de
    push bc
    ld a,h
    ld h,0
    push hl
    ld l,a
    call AMY_FN_MIN_BC_HL
    pop hl
    call AMY_FNC_WINDOW
    call AMY_FN_COPY_STRING
    ld b,h
    ld c,l
    pop de
    pop hl
    call AMY_FN_FINISH_TEXT
    xor a
    ret
