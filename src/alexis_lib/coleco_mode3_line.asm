; -----------------------------------------------------------------------------
; ALEXIS Mode 3 multicolor horizontal span, Bresenham line, and filled box.
;
; Clipping strategy
; -----------------
; AMY_MODE3_HLINE / AMY_MODE3_BOX: axis-aligned clamping (x to 0..63,
;   y to 0..47). Axis-aligned clamping is geometrically correct for
;   horizontal spans and for box rows.
;
; AMY_MODE3_LINE (Bresenham): calls AMY_MODE3_PSET (bounds-checked) per
;   pixel. Off-screen pixels are silently skipped; on-screen pixels of a
;   partially clipped line are drawn correctly. Endpoint clamping would
;   change the slope and must NOT be used for diagonal lines.
;   Cohen-Sutherland segment clipping can be added later as an optimisation
;   if line drawing proves hot on a real workload; the per-pixel check here
;   is the geometrically correct baseline.
;
; AMY_MODE3_PSET_FAST (called by HLINE for the degenerate single-pixel case)
;   is the unchecked entry; the bounds check is done by HLINE before the call.
; -----------------------------------------------------------------------------

; -----------------------------------------------------------------------
; AMY_MODE3_HLINE — horizontal pixel span
; Input: B=x1, D=x2, C=y, A=color nibble
; Clips: x clamped 0..63, row rejected if y>=48.
; Two-pixels-per-byte fast path for even-aligned interior; RMW half-bytes
; at odd start and even-only end.
; -----------------------------------------------------------------------
AMY_MODE3_HLINE:
    ; Save color and precompute packed nibble pair
    ld (AMY_MODE3_HLINE_COLOR),a
    ld e,a
    add a,a
    add a,a
    add a,a
    add a,a                         ; A = color << 4
    or e                            ; A = (color<<4) | color
    ld (AMY_MODE3_HLINE_PACKED),a
    ; Reject if y out of range
    ld a,c
    cp 48
    ret nc
    ; Clamp x2 to 63
    ld a,d
    cp 64
    jr c,AMY_MODE3_HLINE_X2OK
    ld d,63
AMY_MODE3_HLINE_X2OK:
    ; Reject if x1 entirely off-screen
    ld a,b
    cp 64
    ret nc
    ; Degenerate / order check
    ld a,b                          ; A = x1
    cp d                            ; compare x1 with x2
    jr z,AMY_MODE3_HLINE_SINGLE     ; x1 == x2: single pixel
    ret nc                          ; x1 > x2: nothing to draw
    ; x1 < x2. Compute initial VRAM address.
    call AMY_MODE3_CALC_COLOR_ADDRESS   ; B=x1, C=y -> HL; B, C preserved
    ; Handle odd x1: RMW low nibble, preserve high nibble
    bit 0,b
    jr z,AMY_MODE3_HLINE_LOOP
    call AMY_VPEEK                  ; A = existing byte
    and $F0                         ; keep high nibble (even neighbour)
    ld e,a
    ld a,(AMY_MODE3_HLINE_COLOR)
    or e                            ; set low nibble = color
    call AMY_VPOKE                  ; HL preserved; E clobbered
    inc b                           ; cur_x = x1+1 (now even)
    ld a,l
    add a,8
    ld l,a                          ; advance address to next pair
    ; Check: is cur_x already at x2?
    ld a,b
    cp d
    jr z,AMY_MODE3_HLINE_LAST_EVEN
    ret nc                          ; cur_x > x2 (safety; cannot occur after valid entry)
AMY_MODE3_HLINE_LOOP:
    ; cur_x (B) is even. Decide full pair vs single high-nibble at end.
    ld a,b
    inc a                           ; A = cur_x+1
    cp d                            ; compare with x2
    jr z,AMY_MODE3_HLINE_FULL_PAIR  ; cur_x+1 == x2: full pair is the last
    jr nc,AMY_MODE3_HLINE_LAST_EVEN ; cur_x+1 > x2  →  cur_x == x2: high nibble only
    ; cur_x+1 < x2: full pair, then continue
AMY_MODE3_HLINE_FULL_PAIR:
    ld a,(AMY_MODE3_HLINE_PACKED)
    call AMY_VPOKE                  ; HL preserved; E clobbered
    inc b
    inc b                           ; cur_x += 2
    ld a,l
    add a,8
    ld l,a                          ; advance to next byte pair
    ld a,b
    cp d
    jr c,AMY_MODE3_HLINE_LOOP       ; cur_x < x2: more pairs
    jr z,AMY_MODE3_HLINE_LAST_EVEN  ; cur_x == x2: high nibble tail
    ret                             ; cur_x > x2: done
AMY_MODE3_HLINE_LAST_EVEN:
    ; cur_x (B) == x2, cur_x is even: set high nibble, preserve low nibble.
    call AMY_VPEEK                  ; A = existing byte
    and $0F                         ; keep low nibble (odd neighbour)
    ld e,a
    ld a,(AMY_MODE3_HLINE_COLOR)
    add a,a
    add a,a
    add a,a
    add a,a                         ; A = color << 4
    or e
    call AMY_VPOKE
    ret
AMY_MODE3_HLINE_SINGLE:
    ; x1 == x2: degrade to single pixel (bounds already verified above)
    ld a,(AMY_MODE3_HLINE_COLOR)
    jp AMY_MODE3_PSET_FAST          ; B=x, C=y, A=color; tail call

; -----------------------------------------------------------------------
; AMY_MODE3_LINE — Bresenham line with per-pixel bounds-checked plot
; Input: A=color, B=x1, C=y1, D=x2, E=y2
; When dy=0: tail-calls AMY_MODE3_HLINE (axis-aligned clipping).
; Otherwise: Bresenham, calling AMY_MODE3_PSET per pixel.
; -----------------------------------------------------------------------
AMY_MODE3_LINE:
    ld (AMY_MODE3_LINE_COLOR),a
    ld a,b
    ld (AMY_MODE3_LINE_X1),a
    ld a,c
    ld (AMY_MODE3_LINE_Y1),a
    ld a,d
    ld (AMY_MODE3_LINE_X2),a
    ld a,e
    ld (AMY_MODE3_LINE_Y2),a
    ; dy == 0: route to hline (B=x1, D=x2, C=y, A=color — registers unchanged)
    ld a,c
    cp e
    jr nz,AMY_MODE3_LINE_BRESENHAM
    ld a,(AMY_MODE3_LINE_COLOR)
    jp AMY_MODE3_HLINE              ; tail call; B,C,D still set from entry
AMY_MODE3_LINE_BRESENHAM:
    ; B=x1, C=y1, D=x2, E=y2 still in registers (only scratch writes since entry)
    ; Compute SX (sign of dx)
    ld a,b
    cp d
    jr z,AMY_MODE3_LINE_SX_ZERO
    ld a,1
    jr c,AMY_MODE3_LINE_SX_DONE
    ld a,$FF
    jr AMY_MODE3_LINE_SX_DONE
AMY_MODE3_LINE_SX_ZERO:
    xor a
AMY_MODE3_LINE_SX_DONE:
    ld (AMY_MODE3_LINE_SX),a
    ; Compute SY (sign of dy)
    ld a,c
    cp e
    jr z,AMY_MODE3_LINE_SY_ZERO
    ld a,1
    jr c,AMY_MODE3_LINE_SY_DONE
    ld a,$FF
    jr AMY_MODE3_LINE_SY_DONE
AMY_MODE3_LINE_SY_ZERO:
    xor a
AMY_MODE3_LINE_SY_DONE:
    ld (AMY_MODE3_LINE_SY),a
    ; DX = |x2 - x1|
    ld a,d
    sub b
    jr nc,AMY_MODE3_LINE_DX_DONE
    neg
AMY_MODE3_LINE_DX_DONE:
    ld (AMY_MODE3_LINE_DX),a
    ; DY = |y2 - y1|
    ld a,e
    sub c
    jr nc,AMY_MODE3_LINE_DY_DONE
    neg
AMY_MODE3_LINE_DY_DONE:
    ld (AMY_MODE3_LINE_DY),a
    ; Choose major axis: x-major if DY < DX, else y-major
    ld a,(AMY_MODE3_LINE_DX)
    ld b,a
    ld a,(AMY_MODE3_LINE_DY)
    cp b
    jr c,AMY_MODE3_LINE_XMAJOR
    jr AMY_MODE3_LINE_YMAJOR

; ---- internal: plot (X1,Y1) with stored color ----
AMY_MODE3_LINE_PLOT:
    ld a,(AMY_MODE3_LINE_X1)
    ld b,a
    ld a,(AMY_MODE3_LINE_Y1)
    ld c,a
    ld a,(AMY_MODE3_LINE_COLOR)
    jp AMY_MODE3_PSET               ; tail call; PSET returns to caller of PLOT

AMY_MODE3_LINE_XMAJOR:
    ; ERR = 2*DY - DX
    ld a,(AMY_MODE3_LINE_DY)
    ld l,a
    ld h,0
    add hl,hl
    ld a,(AMY_MODE3_LINE_DX)
    ld e,a
    ld d,0
    or a
    sbc hl,de
    ld (AMY_MODE3_LINE_ERR),hl
AMY_MODE3_LINE_XLOOP:
    call AMY_MODE3_LINE_PLOT
    ld a,(AMY_MODE3_LINE_X1)
    ld b,a
    ld a,(AMY_MODE3_LINE_X2)
    cp b
    ret z                           ; done when X1 reaches X2
    ld hl,(AMY_MODE3_LINE_ERR)
    bit 7,h
    jr nz,AMY_MODE3_LINE_XSMALL
    ; ERR >= 0: step Y, adjust ERR by 2*(DY-DX)
    ld a,(AMY_MODE3_LINE_DY)
    ld l,a
    ld h,0
    ld a,(AMY_MODE3_LINE_DX)
    ld e,a
    ld d,0
    or a
    sbc hl,de
    add hl,hl
    ld (AMY_MODE3_LINE_TMP),hl
    ld hl,(AMY_MODE3_LINE_ERR)
    ld de,(AMY_MODE3_LINE_TMP)
    add hl,de
    ld (AMY_MODE3_LINE_ERR),hl
    ld a,(AMY_MODE3_LINE_Y1)
    ld b,a
    ld a,(AMY_MODE3_LINE_SY)
    add a,b
    ld (AMY_MODE3_LINE_Y1),a
    jr AMY_MODE3_LINE_XSTEP
AMY_MODE3_LINE_XSMALL:
    ; ERR < 0: add 2*DY to ERR
    ld a,(AMY_MODE3_LINE_DY)
    ld l,a
    ld h,0
    add hl,hl
    ld de,(AMY_MODE3_LINE_ERR)
    add hl,de
    ld (AMY_MODE3_LINE_ERR),hl
AMY_MODE3_LINE_XSTEP:
    ld a,(AMY_MODE3_LINE_X1)
    ld b,a
    ld a,(AMY_MODE3_LINE_SX)
    add a,b
    ld (AMY_MODE3_LINE_X1),a
    jr AMY_MODE3_LINE_XLOOP

AMY_MODE3_LINE_YMAJOR:
    ; ERR = 2*DX - DY
    ld a,(AMY_MODE3_LINE_DX)
    ld l,a
    ld h,0
    add hl,hl
    ld a,(AMY_MODE3_LINE_DY)
    ld e,a
    ld d,0
    or a
    sbc hl,de
    ld (AMY_MODE3_LINE_ERR),hl
AMY_MODE3_LINE_YLOOP:
    call AMY_MODE3_LINE_PLOT
    ld a,(AMY_MODE3_LINE_Y1)
    ld b,a
    ld a,(AMY_MODE3_LINE_Y2)
    cp b
    ret z                           ; done when Y1 reaches Y2
    ld hl,(AMY_MODE3_LINE_ERR)
    bit 7,h
    jr nz,AMY_MODE3_LINE_YSMALL
    ; ERR >= 0: step X, adjust ERR by 2*(DX-DY)
    ld a,(AMY_MODE3_LINE_DX)
    ld l,a
    ld h,0
    ld a,(AMY_MODE3_LINE_DY)
    ld e,a
    ld d,0
    or a
    sbc hl,de
    add hl,hl
    ld (AMY_MODE3_LINE_TMP),hl
    ld hl,(AMY_MODE3_LINE_ERR)
    ld de,(AMY_MODE3_LINE_TMP)
    add hl,de
    ld (AMY_MODE3_LINE_ERR),hl
    ld a,(AMY_MODE3_LINE_X1)
    ld b,a
    ld a,(AMY_MODE3_LINE_SX)
    add a,b
    ld (AMY_MODE3_LINE_X1),a
    jr AMY_MODE3_LINE_YSTEP
AMY_MODE3_LINE_YSMALL:
    ; ERR < 0: add 2*DX to ERR
    ld a,(AMY_MODE3_LINE_DX)
    ld l,a
    ld h,0
    add hl,hl
    ld de,(AMY_MODE3_LINE_ERR)
    add hl,de
    ld (AMY_MODE3_LINE_ERR),hl
AMY_MODE3_LINE_YSTEP:
    ld a,(AMY_MODE3_LINE_Y1)
    ld b,a
    ld a,(AMY_MODE3_LINE_SY)
    add a,b
    ld (AMY_MODE3_LINE_Y1),a
    jr AMY_MODE3_LINE_YLOOP

; -----------------------------------------------------------------------
; AMY_MODE3_BOX — filled rectangle (hline loop)
; Input: A=color, B=x1, C=y1, D=x2, E=y2
; Clips x via HLINE; y clamped to 0..47, sorted.
; -----------------------------------------------------------------------
AMY_MODE3_BOX:
    ld (AMY_MODE3_BOX_COLOR),a
    ld a,b
    ld (AMY_MODE3_BOX_X1),a
    ; Clamp y1 to 47
    ld a,c
    cp 48
    jr c,AMY_MODE3_BOX_Y1OK
    ld c,47
AMY_MODE3_BOX_Y1OK:
    ; Clamp y2 to 47
    ld a,e
    cp 48
    jr c,AMY_MODE3_BOX_Y2OK
    ld e,47
AMY_MODE3_BOX_Y2OK:
    ; Sort: ensure C (y1) <= E (y2)
    ld a,c
    cp e
    jr c,AMY_MODE3_BOX_Y_SORTED
    jr z,AMY_MODE3_BOX_Y_SORTED
    ld a,c
    ld c,e
    ld e,a                          ; swap: C = smaller, E = larger
AMY_MODE3_BOX_Y_SORTED:
    ld a,e
    ld (AMY_MODE3_BOX_Y2),a         ; save y2 (E clobbered by VPOKE inside HLINE)
AMY_MODE3_BOX_LOOP:
    ld a,(AMY_MODE3_BOX_X1)
    ld b,a
    ld a,(AMY_MODE3_BOX_COLOR)
    call AMY_MODE3_HLINE            ; B=x1, D=x2, C=cur_y, A=color
    ; HLINE preserves C (cur_y) and D (x2)
    inc c                           ; next row
    ld a,(AMY_MODE3_BOX_Y2)
    cp c                            ; y2 >= cur_y?
    jr nc,AMY_MODE3_BOX_LOOP
    ret
