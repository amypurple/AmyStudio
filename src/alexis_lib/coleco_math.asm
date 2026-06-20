; -----------------------------------------------------------------------------
; ALEXIS native ColecoVision math helpers
; Compatibility umbrella include. New projects should prefer the narrower
; split modules below so unused numeric families do not bloat the ROM.
; -----------------------------------------------------------------------------
; Include order: dependencies first (u32/compare before format).

    include "src/alexis_lib/coleco_math_sqrt.asm"
    include "src/alexis_lib/coleco_math_u32.asm"
    include "src/alexis_lib/coleco_math_compare_small.asm"
    include "src/alexis_lib/coleco_math_compare_u32.asm"
    include "src/alexis_lib/coleco_math_compare_s32.asm"
    include "src/alexis_lib/coleco_math_fx.asm"
    include "src/alexis_lib/coleco_math_fx16.asm"
    include "src/alexis_lib/coleco_math_format.asm"
    include "src/alexis_lib/coleco_math_format_u32.asm"
    include "src/alexis_lib/coleco_math_format_i32.asm"
    include "src/alexis_lib/coleco_math_format_fx.asm"
    include "src/alexis_lib/coleco_math_format_fx16.asm"
