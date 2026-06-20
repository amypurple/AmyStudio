; -----------------------------------------------------------------------------
; ALEXIS fixed-point 16.16 helpers umbrella
; Splits the fixed32 runtime into core, helper, arithmetic, sqrt, and random.
; -----------------------------------------------------------------------------

    include "src/alexis_lib/coleco_math_fx16_core.asm"
    include "src/alexis_lib/coleco_math_fx16_mul_helpers.asm"
    include "src/alexis_lib/coleco_math_fx16_mult.asm"
    include "src/alexis_lib/coleco_math_fx16_div.asm"
    include "src/alexis_lib/coleco_math_fx16_sqrt.asm"
    include "src/alexis_lib/coleco_math_fx16_random.asm"
