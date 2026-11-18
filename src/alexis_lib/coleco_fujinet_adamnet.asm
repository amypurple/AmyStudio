; Amy FujiNet support for the Coleco ADAM over AdamNet, after fujinet-lib bus/adam.
;
; EOS keeps the AdamNet device table at $FEC3 (count) and $FEC4 (21-byte
; DCBs; byte 16 low nibble = device). A transfer stores the buffer (+1) and
; length (+3), then the command in byte 0 (1 STATUS, 3 WRITE, 4 READ). The
; AdamNet master replaces it with a completion code of $80 or more ($80 done,
; $9B timeout, $8C NAK); +3 then holds the length received and +20 the node
; status, whose bit 5 means the FujiNet accepted a command that then failed.
; The FujiNet answers as N1 $09, N2 $0A, Fuji $0F and clock $03.
;
; A command is one packet: [command, parameters..., data...], built in
; AMY_FUJINET_PACKET. Offsets 0-259 hold packets and replies; 260-266 are
; scratch for AMY_FNA_DRAIN. A READ carries its length, and the FujiNet
; answers with exactly that many bytes. A bare DCB read would stream up to
; 1024 bytes into the buffer, so these routines never issue one for data.
;
; Wrapper ABI: A = unit (1-2), HL = source or destination, BC = length.
; Returns A = 0 success / 1 failure and HL = byte count.
; IX and IY are preserved.

; A = device. Returns IX = its DCB, or carry when EOS lists no such device.
; Clobbers A, BC, DE.
AMY_FNA_FIND_DCB:
    ld c,a
    ld a,($FEC3)
    or a
    jr z,AMY_FNA_FIND_DCB_NONE
    ld b,a
    ld ix,$FEC4
    ld de,21
AMY_FNA_FIND_DCB_LOOP:
    ld a,(ix+16)
    and $0F
    cp c
    ret z
    add ix,de
    djnz AMY_FNA_FIND_DCB_LOOP
AMY_FNA_FIND_DCB_NONE:
    scf
    ret

; IX = DCB, A = command, HL = buffer, DE = length, B = attempts.
; Retries only on AdamNet timeouts ($9B). Returns A = completion code.
; Clobbers B, C.
AMY_FNA_DCB_IO:
AMY_OPTIMIZER_TIMING_BEGIN_FNA_DCB_IO:
    ld c,a
AMY_FNA_DCB_IO_RETRY:
    ld (ix+3),e
    ld (ix+4),d
    ld (ix+1),l
    ld (ix+2),h
    ld (ix+0),c
AMY_FNA_DCB_IO_WAIT:
    ld a,(ix+0)
    cp $80
    jr c,AMY_FNA_DCB_IO_WAIT
    cp $9B
    jr nz,AMY_FNA_DCB_IO_DONE
    djnz AMY_FNA_DCB_IO_RETRY
AMY_FNA_DCB_IO_DONE:
AMY_OPTIMIZER_TIMING_END_FNA_DCB_IO:
    ret

; Returns A = 1 when EOS lists the FujiNet device ($0F), else 0.
AMY_FNA_PRESENT:
    push ix
    ld a,$0F
    call AMY_FNA_FIND_DCB
    pop ix
    ld a,0
    ret c
    inc a
    ret

; A = unit 1-2. Returns A = device $09-$0A, or carry for any other unit.
AMY_FNA_UNIT:
    or a
    jr z,AMY_FNA_UNIT_BAD
    cp 3
    jr nc,AMY_FNA_UNIT_BAD
    add a,8
    or a
    ret
AMY_FNA_UNIT_BAD:
    scf
    ret

; A = device, BC = packet length. Writes AMY_FUJINET_PACKET.
; Returns IX = DCB, carry on failure. Clobbers A, BC, DE, HL.
AMY_FNA_SEND:
    push bc
    call AMY_FNA_FIND_DCB
    pop de
    ret c
    ld hl,AMY_FUJINET_PACKET
    ld a,3
    ld b,20
    call AMY_FNA_DCB_IO
    cp $80
    ret z
    scf
    ret

; IX = DCB. Waits until the FujiNet has carried out the command just written
; (AdamNet completes a write on delivery). Carry when it failed.
AMY_FNA_READY:
    ld bc,400
AMY_FNA_READY_LOOP:
    push bc
    ld a,1
    ld hl,0
    ld de,0
    ld b,1
    call AMY_FNA_DCB_IO
    pop bc
    cp $80
    jr z,AMY_FNA_READY_DONE
    dec bc
    ld a,b
    or c
    jr nz,AMY_FNA_READY_LOOP
    scf
    ret
AMY_FNA_READY_DONE:
    ld a,(ix+20)
    and $20
    ret z
    scf
    ret

; IX = DCB, HL = destination, DE = length. Reads the reply to the command just
; written. Returns A = completion code, HL = bytes received, carry unless $80.
AMY_FNA_RECV:
    ld a,4
    ld b,200
    call AMY_FNA_DCB_IO
    cp $9B
    jr nz,AMY_FNA_RECV_DONE
    ld a,4
    ld b,200
    call AMY_FNA_DCB_IO
AMY_FNA_RECV_DONE:
    ld l,(ix+3)
    ld h,(ix+4)
    cp $80
    ret z
    scf
    ret

; A = device, BC = packet length; the caller pushed IX. Sends the packet,
; waits for the command to finish and restores IX. A = status, HL = 0.
AMY_FNA_COMMAND:
    call AMY_FNA_SEND
    jr c,AMY_FNA_COMMAND_FAIL
    call AMY_FNA_READY
    jr c,AMY_FNA_COMMAND_FAIL
    pop ix
    xor a
    ld h,a
    ld l,a
    ret
AMY_FNA_COMMAND_FAIL:
    pop ix
    jp AMY_FN_FAIL

; A = device, C = command with no parameters; the caller pushed IX.
AMY_FNA_SIMPLE:
    ld hl,AMY_FUJINET_PACKET
    ld (hl),c
    ld bc,1
    jp AMY_FNA_COMMAND

; A = device. Leaves the 4-byte STATUS reply in AMY_FUJINET_PACKET.
; Returns IX = DCB, carry on failure.
AMY_FNA_STATUS4:
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$53
    ld bc,1
    call AMY_FNA_SEND
    ret c
    ld hl,AMY_FUJINET_PACKET
    ld de,4
    jp AMY_FNA_RECV

; A = unit, HL = devicespec, BC = capacity, D = mode, E = translation.
AMY_FNA_OPEN:
    push af
    call AMY_FN_TEXT_LENGTH
    push hl
    ld hl,256
    call AMY_FN_MIN_BC_HL
    pop hl
    pop af
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    push af
    push bc
    ld a,$4F
    ld (AMY_FUJINET_PACKET),a
    ld a,d
    ld (AMY_FUJINET_PACKET+1),a
    ld a,e
    ld (AMY_FUJINET_PACKET+2),a
    ld de,AMY_FUJINET_PACKET+3
    ld a,b
    or c
    jr z,AMY_FNA_OPEN_SEND
    ldir
AMY_FNA_OPEN_SEND:
    pop bc
    inc bc
    inc bc
    inc bc
    pop af
    jp AMY_FNA_COMMAND

; A = unit.
AMY_FNA_CLOSE:
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    ld c,$43
    jp AMY_FNA_SIMPLE

; A = unit, HL = 4-byte FujiNetStatus destination.
AMY_FNA_STATUS:
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    push hl
    call AMY_FNA_STATUS4
    pop de
    pop ix
    jp c,AMY_FN_FAIL
    ld hl,AMY_FUJINET_PACKET
    ld bc,4
    ldir
    xor a
    ld h,a
    ld l,a
    ret

; A = unit, HL = destination, BC = most bytes to take. Never waits for data:
; returns HL = 0 when nothing is waiting, and A = 1 when the channel has
; ended (end of file or an error) with nothing left.
AMY_FNA_READ:
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    push hl
    push bc
    push af
    call AMY_FNA_STATUS4
    jr c,AMY_FNA_READ_FAIL
    ld hl,(AMY_FUJINET_PACKET)
    ld a,h
    or l
    jr nz,AMY_FNA_READ_WAITING
    ld a,(AMY_FUJINET_PACKET+3)
    cp 2
    jr nc,AMY_FNA_READ_FAIL
    pop af
    pop bc
    pop hl
    pop ix
    xor a
    ld h,a
    ld l,a
    ret
AMY_FNA_READ_WAITING:
    pop af
    pop bc
    call AMY_FN_MIN_BC_HL
    ld hl,1024
    call AMY_FN_MIN_BC_HL
    ld e,a
    ld a,b
    or c
    jr z,AMY_FNA_READ_NONE
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$52
    inc hl
    ld (hl),c
    inc hl
    ld (hl),b
    push bc
    ld a,e
    ld bc,3
    call AMY_FNA_SEND
    pop de
    pop hl
    jr c,AMY_FNA_READ_FAIL1
    push de
    call AMY_FNA_RECV
    pop bc
    jr c,AMY_FNA_READ_FAIL1
    call AMY_FN_MIN_BC_HL
    ld h,b
    ld l,c
    pop ix
    xor a
    ret
AMY_FNA_READ_NONE:
    pop hl
    pop ix
    xor a
    ld h,a
    ld l,a
    ret
AMY_FNA_READ_FAIL:
    pop af
    pop bc
    pop hl
AMY_FNA_READ_FAIL1:
    pop ix
    jp AMY_FN_FAIL

; A = unit, HL = source, BC = count. Sends 256-byte packets.
AMY_FNA_WRITE:
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    ld e,a
AMY_FNA_WRITE_LOOP:
    ld a,b
    or c
    jr z,AMY_FNA_WRITE_OK
    push bc
    push hl
    ld hl,256
    call AMY_FN_MIN_BC_HL
    pop hl
    push bc
    ld a,e
    push af
    ld de,AMY_FUJINET_PACKET+1
    ldir
    pop af
    pop bc
    push bc
    push hl
    push af
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$57
    inc bc
    call AMY_FNA_SEND
    jr c,AMY_FNA_WRITE_FAIL
    call AMY_FNA_READY
    jr c,AMY_FNA_WRITE_FAIL
    pop af
    ld e,a
    pop hl
    pop bc
    ex (sp),hl
    or a
    sbc hl,bc
    ld b,h
    ld c,l
    pop hl
    jr AMY_FNA_WRITE_LOOP
AMY_FNA_WRITE_FAIL:
    pop af
    pop hl
    pop bc
    pop bc
    pop ix
    jp AMY_FN_FAIL
AMY_FNA_WRITE_OK:
    pop ix
    xor a
    ld h,a
    ld l,a
    ret

; A = unit. Selects the JSON parser and parses what the channel received.
AMY_FNA_JSON:
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    push af
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$FC
    inc hl
    ld (hl),1
    inc hl
    ld (hl),1
    ld bc,3
    call AMY_FNA_SEND
    jr c,AMY_FNA_JSON_FAIL
    call AMY_FNA_READY
    jr c,AMY_FNA_JSON_FAIL
    pop af
    ld c,$50
    jp AMY_FNA_SIMPLE
AMY_FNA_JSON_FAIL:
    pop af
    pop ix
    jp AMY_FN_FAIL

; A = unit, E = HTTP channel mode (0 body, 1 collect headers, 2 get headers,
; 3 set headers, 4 post data).
AMY_FNA_HTTP_MODE:
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$4D
    inc hl
    ld (hl),0
    inc hl
    ld (hl),e
    ld bc,3
    jp AMY_FNA_COMMAND

; A = unit, HL = query text, BC = capacity.
AMY_FNA_QUERY:
    push af
    call AMY_FN_TEXT_LENGTH
    push hl
    ld hl,255
    call AMY_FN_MIN_BC_HL
    pop hl
    pop af
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    push af
    ld a,$51
    ld (AMY_FUJINET_PACKET),a
    ld de,AMY_FUJINET_PACKET+1
    push bc
    ld a,b
    or c
    jr z,AMY_FNA_QUERY_SEND
    ldir
AMY_FNA_QUERY_SEND:
    pop bc
    inc bc
    pop af
    jp AMY_FNA_COMMAND

; A = unit, HL = destination, BC = capacity. Reads everything waiting and
; keeps what fits: a value left half-read would shift every later query.
; Returns A = status, HL = bytes kept (trailing CR/LF dropped, 0 added when
; there is room).
AMY_FNA_DRAIN:
    call AMY_FNA_UNIT
    jp c,AMY_FN_FAIL
    push ix
    ld (AMY_FUJINET_PACKET+260),a
    ld (AMY_FUJINET_PACKET+263),bc
    ld (AMY_FUJINET_PACKET+265),hl
    ld hl,0
    ld (AMY_FUJINET_PACKET+261),hl
AMY_FNA_DRAIN_LOOP:
    ld a,(AMY_FUJINET_PACKET+260)
    call AMY_FNA_STATUS4
    jr c,AMY_FNA_DRAIN_FAIL
    ld hl,(AMY_FUJINET_PACKET)
    ld a,h
    or l
    jr z,AMY_FNA_DRAIN_END
    ld b,h
    ld c,l
    ld hl,256
    call AMY_FN_MIN_BC_HL
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$52
    inc hl
    ld (hl),c
    inc hl
    ld (hl),b
    push bc
    ld a,(AMY_FUJINET_PACKET+260)
    ld bc,3
    call AMY_FNA_SEND
    pop de
    jr c,AMY_FNA_DRAIN_FAIL
    push de
    ld hl,AMY_FUJINET_PACKET
    call AMY_FNA_RECV
    pop bc
    jr c,AMY_FNA_DRAIN_FAIL
    call AMY_FN_MIN_BC_HL
    ld hl,(AMY_FUJINET_PACKET+263)
    ld de,(AMY_FUJINET_PACKET+261)
    or a
    sbc hl,de
    call AMY_FN_MIN_BC_HL
    ld a,b
    or c
    jr z,AMY_FNA_DRAIN_LOOP
    ld hl,(AMY_FUJINET_PACKET+265)
    add hl,de
    ex de,hl
    ld hl,(AMY_FUJINET_PACKET+261)
    add hl,bc
    ld (AMY_FUJINET_PACKET+261),hl
    ld hl,AMY_FUJINET_PACKET
    ldir
    jr AMY_FNA_DRAIN_LOOP
AMY_FNA_DRAIN_END:
    pop ix
    ld hl,(AMY_FUJINET_PACKET+265)
    ld bc,(AMY_FUJINET_PACKET+261)
    ld de,(AMY_FUJINET_PACKET+263)
    call AMY_FN_FINISH_TEXT
    xor a
    ret
AMY_FNA_DRAIN_FAIL:
    pop ix
    jp AMY_FN_FAIL

; HL = creator, D = app, E = key, A = mode (0 read, 1 write).
AMY_FNA_APPKEY_OPEN:
    push ix
    ld (AMY_FUJINET_PACKET+1),hl
    ld (AMY_FUJINET_PACKET+5),a
    ld a,d
    ld (AMY_FUJINET_PACKET+3),a
    ld a,e
    ld (AMY_FUJINET_PACKET+4),a
    ld a,$DC
    ld (AMY_FUJINET_PACKET),a
    xor a
    ld (AMY_FUJINET_PACKET+6),a
    ld a,$0F
    ld bc,7
    jp AMY_FNA_COMMAND

; HL = destination, BC = capacity. Reads the key opened for reading.
; The FujiNet NAKs ($8C) a key that was never written: that reads as 0 bytes.
AMY_FNA_APPKEY_READ:
    push ix
    push hl
    push bc
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$DD
    ld a,$0F
    ld bc,1
    call AMY_FNA_SEND
    jr c,AMY_FNA_APPKEY_READ_FAIL
    ld hl,AMY_FUJINET_PACKET
    ld de,64
    call AMY_FNA_RECV
    jr nc,AMY_FNA_APPKEY_READ_COPY
    cp $8C
    jr nz,AMY_FNA_APPKEY_READ_FAIL
    ld hl,0
AMY_FNA_APPKEY_READ_COPY:
    pop bc
    pop de
    pop ix
    call AMY_FN_MIN_BC_HL
    ld hl,64
    call AMY_FN_MIN_BC_HL
    push bc
    ld hl,AMY_FUJINET_PACKET
    ld a,b
    or c
    jr z,AMY_FNA_APPKEY_READ_DONE
    ldir
AMY_FNA_APPKEY_READ_DONE:
    pop hl
    xor a
    ret
AMY_FNA_APPKEY_READ_FAIL:
    pop bc
    pop hl
    pop ix
    jp AMY_FN_FAIL

; HL = source, BC = count (at most 64 are stored). Writes the key opened for writing.
AMY_FNA_APPKEY_WRITE:
    push ix
    push hl
    ld hl,64
    call AMY_FN_MIN_BC_HL
    pop hl
    push bc
    ld de,AMY_FUJINET_PACKET+1
    ld a,b
    or c
    jr z,AMY_FNA_APPKEY_WRITE_SEND
    ldir
AMY_FNA_APPKEY_WRITE_SEND:
    pop bc
    inc bc
    ld a,$DE
    ld (AMY_FUJINET_PACKET),a
    ld a,$0F
    jp AMY_FNA_COMMAND

; HL = 7-byte FujiNetTime destination (century, year, month, day, hour,
; minute, second) in the FujiNet's time zone.
AMY_FNA_TIME:
    push ix
    push hl
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$54
    inc hl
    ld (hl),0
    ld a,$03
    ld bc,2
    call AMY_FNA_SEND
    jr c,AMY_FNA_TIME_FAIL
    ld hl,AMY_FUJINET_PACKET
    ld de,7
    call AMY_FNA_RECV
    jr c,AMY_FNA_TIME_FAIL
    pop de
    pop ix
    ld hl,AMY_FUJINET_PACKET
    ld bc,7
    ldir
    xor a
    ld h,a
    ld l,a
    ret
AMY_FNA_TIME_FAIL:
    pop hl
    pop ix
    jp AMY_FN_FAIL

; L = field offset, H = field width, DE = destination, BC = capacity.
; Copies one text field of the extended adapter configuration.
AMY_FNA_ADAPTER:
    push ix
    push hl
    push de
    push bc
    ld hl,AMY_FUJINET_PACKET
    ld (hl),$C4
    ld a,$0F
    ld bc,1
    call AMY_FNA_SEND
    jr c,AMY_FNA_ADAPTER_FAIL
    ld hl,AMY_FUJINET_PACKET
    ld de,240
    call AMY_FNA_RECV
    jr c,AMY_FNA_ADAPTER_FAIL
    pop bc
    pop de
    pop hl
    pop ix
    push de
    push bc
    ld a,h
    ld h,0
    push hl
    ld l,a
    call AMY_FN_MIN_BC_HL
    pop hl
    push de
    ld de,AMY_FUJINET_PACKET
    add hl,de
    pop de
    call AMY_FN_COPY_STRING
    ld b,h
    ld c,l
    pop de
    pop hl
    call AMY_FN_FINISH_TEXT
    xor a
    ret
AMY_FNA_ADAPTER_FAIL:
    pop bc
    pop de
    pop hl
    pop ix
    jp AMY_FN_FAIL
