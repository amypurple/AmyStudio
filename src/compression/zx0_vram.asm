; -----------------------------------------------------------------------------
; ZX0 standard decompressor — to VRAM (TMS9918A/TMS9928A)
; HL = source (compressed in RAM)
; DE = destination (VRAM address)
; Uses VDP ports: DATA=0xBE, ADDR=0xBF
; Notes:
; - Keeps original zx0_decompress parsing/offset logic.
; - Protects bit-buffer in A during VRAM copies with EX AF,AF'.
; - Adds NOPs after address writes and around read/write transitions.
; - Some NOPs have already been judged non-essential and are commented out
;   instead of deleted, so timing experiments stay visible in source history.
;
; Potential future micro-optimizations to evaluate carefully:
; - keep proving whether the literal-path OUTI spacing still needs a NOP once
;   the surrounding loop cost is counted on real hardware
; - look for a cheaper VRAM source/destination retarget pattern in zx0_cpy_loop
;   before touching the Elias/offset logic, which is already correct and fragile
; -----------------------------------------------------------------------------

zx0_decompress:
        ld      bc, $ffff               ; preserve default offset 1 (as in RAM version)
        push    bc
        ld      a, $80

; -------------------- Literals --------------------
zx0s_literals:
        call    zx0s_elias             ; obtain length -> BC
        push    bc

        ; Set VRAM write address once for the literal run
        ex      af,af'                  ; protect bit-buffer (A) in AF'
        ld      c, $bf
        out     (c), e                  ; low dest byte
        set     6, d
        out     (c), d                  ; high | 0x40 (write)
        res     6, d
        ; nop                          ; judged redundant: large setup cost follows before first OUTI
        ; nop                          ; judged redundant: large setup cost follows before first OUTI

        ; Copy BC bytes from (HL) -> VRAM(DE)
        ; Use per-byte loop to avoid clobbering C (BC is our counter)
        pop     bc
        ld      a, c
        ld      c, b
        inc     c
        ld      b, a
zx0_lit_loop:
        push    bc
        ld      c, $be
zx0_lit_loop2:
        outi
        ; nop                          ; judged redundant: OUTI + INC DE + JR already leave wide spacing
        inc     de
        jr      nz, zx0_lit_loop2
        pop     bc
        dec     c
        jr      nz, zx0_lit_loop

        ex      af,af'                  ; restore bit-buffer A/flags

        add     a, a                    ; copy from last offset or new offset?
        jr      c, zx0s_new_offset

        call    zx0s_elias             ; obtain length -> BC

; -------------------- Copy from last/new offset --------------------
zx0s_copy:
        ; RAM version:
        ;   ex (sp),hl   ; HL <- last offset, SP now has source
        ;   push hl
        ;   add hl, de   ; HL = dest - offset
        ;   ldir         ; copy
        ;   pop hl
        ;   ex (sp),hl   ; restore source
        ;
        ; VRAM version: per-byte VRAM read->write with safe timing
        ex      (sp), hl                ; HL = last offset, SP holds source
        push    hl                      ; save offset
        add     hl, de                  ; HL = VRAM source address = dest - offset

        ex      af,af'                  ; protect bit-buffer
        set     6, d                    ; we’ll use D|0x40 when writing the dest high byte

zx0_cpy_loop:
        ; --- Set VRAM read address from HL ---
        push    bc                      ; preserve length (C will be used as port)
        ld      c, $bf
        out     (c), l
        nop
        out     (c), h                  ; read mode: bit6=0 (H as-is)
        inc     hl
        nop
        nop
        in      a, ($be)           ; A = *VRAM(HL_read) ; VDP auto-inc not used here

        nop
        nop
        nop

        ; --- Set VRAM write address from DE ---
        out     (c), e
        nop
        out     (c), d                  ; write mode since we pre-set bit6 in D
        inc     de
        nop
        nop

        ; --- Write fetched byte to VRAM ---
        out     ($be), a
        pop     bc                      ; restore BC = remaining length

        dec     bc
        ld      a, b
        or      c
        jr      nz, zx0_cpy_loop

        res     6, d
        ex      af,af'                  ; restore bit-buffer

        pop     hl                      ; restore offset
        ex      (sp), hl                ; restore compressed source pointer

        add     a, a                    ; copy from literals or new offset?
        jr      nc, zx0s_literals

; -------------------- New offset --------------------
zx0s_new_offset:
        pop     bc                      ; discard last offset
        ld      c, $fe                  ; prepare negative offset
        call    zx0s_elias_loop        ; obtain offset MSB
        inc     c
        ret     z                       ; check end marker
        ld      b, c
        ld      c, (hl)                 ; obtain offset LSB
        inc     hl
        rr      b                       ; last offset bit becomes first length bit
        rr      c
        push    bc                      ; preserve new offset
        ld      bc, 1                   ; obtain length
        call    nc, zx0s_elias_backtrack
        inc     bc
        jr      zx0s_copy

; -------------------- Elias helpers (unchanged) --------------------
zx0s_elias:
        ld      bc, 1
zx0s_elias_loop:
        add     a, a
        jr      nz, zx0s_elias_skip
        ld      a, (hl)                 ; load another group of 8 bits
        inc     hl
        rla
zx0s_elias_skip:
        ret     c
zx0s_elias_backtrack:
        add     a, a
        rl      c
        rl      b
        jr      zx0s_elias_loop
; -----------------------------------------------------------------------------
