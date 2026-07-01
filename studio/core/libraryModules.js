const splitLibraryCatalog = {
  "src/alexis_lib/coleco_math.asm": [
    { path: "src/alexis_lib/coleco_random.asm", symbols: ["AMY_RANDOM_U8"] },
    { path: "src/alexis_lib/coleco_math_sqrt.asm", symbols: ["AMY_U16_SQRT"] },
    { path: "src/alexis_lib/coleco_math_u32_zero.asm", symbols: ["AMY_U32_ZERO"] },
    { path: "src/alexis_lib/coleco_math_u32_copy.asm", symbols: ["AMY_U32_COPY"] },
    { path: "src/alexis_lib/coleco_math_u32_inc.asm",  symbols: ["AMY_U32_INC"] },
    { path: "src/alexis_lib/coleco_math_u32_add.asm",  symbols: ["AMY_U32_ADD"] },
    { path: "src/alexis_lib/coleco_math_u32_sub.asm",  symbols: ["AMY_U32_SUB"] },
    { path: "src/alexis_lib/coleco_math_u32_mul.asm",  symbols: ["AMY_U32_MUL"], deps: ["src/alexis_lib/coleco_math_u32_add.asm"] },
    { path: "src/alexis_lib/coleco_math_u32_div.asm",  symbols: ["AMY_U32_DIV"], deps: ["src/alexis_lib/coleco_math_u32_sub.asm", "src/alexis_lib/coleco_math_compare_u32.asm"] },
    { path: "src/alexis_lib/coleco_math_u16_div.asm",  symbols: ["AMY_U16_DIV", "AMY_I16_DIV", "AMY_I16_MOD"] },
    { path: "src/alexis_lib/coleco_math_compare_small.asm", symbols: ["AMY_CMP_U8", "AMY_CMP_S8", "AMY_CMP_U16", "AMY_CMP_S16"] },
    { path: "src/alexis_lib/coleco_math_compare_u32.asm", symbols: ["AMY_CMP_U32_MEM"] },
    { path: "src/alexis_lib/coleco_math_compare_s32.asm", symbols: ["AMY_CMP_S32_MEM"] },
    { path: "src/alexis_lib/coleco_math_fx.asm", symbols: ["AMY_FX8_8_ADD", "AMY_FX8_8_SUB"] },
    { path: "src/alexis_lib/coleco_math_fx_mul.asm", symbols: ["AMY_FX8_8_MUL"], deps: ["src/alexis_lib/coleco_math_fx16_mul_helpers.asm"] },
    { path: "src/alexis_lib/coleco_math_fx_div.asm", symbols: ["AMY_FX8_8_DIV"], deps: ["src/alexis_lib/coleco_math_u32_div.asm"] },
    {
      path: "src/alexis_lib/coleco_math_fx16_core.asm",
      symbols: ["AMY_FX16_16_ADD", "AMY_FX16_16_SUB", "AMY_FX16_16_NEG", "AMY_FX16_16_ABS"],
      deps: [
        "src/alexis_lib/coleco_math_u32_add.asm",
        "src/alexis_lib/coleco_math_u32_sub.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_mul_helpers.asm",
      symbols: ["AMY_U_MULT32", "AMY_U64_ADD", "AMY_U8_MUL16", "AMY_U16_MUL32_TO_TMP"],
      deps: ["src/alexis_lib/coleco_math_fx16_core.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_mult.asm",
      symbols: ["AMY_FX16_16_MULT"],
      deps: [
        "src/alexis_lib/coleco_math_fx16_core.asm",
        "src/alexis_lib/coleco_math_fx16_mul_helpers.asm",
        "src/alexis_lib/coleco_math_u32_add.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_div.asm",
      symbols: ["AMY_FX16_16_DIV"],
      deps: [
        "src/alexis_lib/coleco_math_fx16_core.asm",
        "src/alexis_lib/coleco_math_u32_zero.asm",
        "src/alexis_lib/coleco_math_u32_inc.asm",
        "src/alexis_lib/coleco_math_compare_u32.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_sqrt.asm",
      symbols: ["AMY_FX16_16_SQRT", "AMY_FX16_48_CMP", "AMY_FX16_48_COPY", "AMY_FX16_48_ADD", "AMY_FX16_48_SUB", "AMY_FX16_48_SHR1", "AMY_FX16_48_SHR2", "AMY_FX16_48_SHL1", "AMY_FX16_48_INC", "AMY_FX16_48_IS_ZERO"],
      deps: [
        "src/alexis_lib/coleco_math_fx16_core.asm",
        "src/alexis_lib/coleco_math_u32_zero.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_random.asm",
      symbols: ["AMY_FX16_16_RND"],
      deps: ["src/alexis_lib/coleco_math_fx16_core.asm"]
    },
    { path: "src/alexis_lib/coleco_math_format.asm",    symbols: ["AMY_U16_TO_ASCII5"] },
    { path: "src/alexis_lib/coleco_math_format_u8.asm", symbols: ["AMY_U8_TO_ASCII3", "AMY_U8_TO_ASCII2"] },
    { path: "src/alexis_lib/coleco_math_format_i16.asm", symbols: ["AMY_I16_TO_ASCII6"], deps: ["src/alexis_lib/coleco_math_format.asm"] },
    {
      path: "src/alexis_lib/coleco_math_format_u32.asm",
      symbols: ["AMY_U32_TO_ASCII10"],
      deps: ["src/alexis_lib/coleco_math_u32_copy.asm", "src/alexis_lib/coleco_math_u32_sub.asm", "src/alexis_lib/coleco_math_compare_u32.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_format_i32.asm",
      symbols: ["AMY_I32_TO_ASCII11"],
      deps: ["src/alexis_lib/coleco_math_format_u32.asm", "src/alexis_lib/coleco_math_u32_copy.asm", "src/alexis_lib/coleco_math_u32_inc.asm", "src/alexis_lib/coleco_math_u32_sub.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_format_fx.asm",
      symbols: ["AMY_FX8_8_FRAC_TO_HUNDREDTHS", "AMY_FX8_8_TO_ASCII6", "AMY_SFX8_8_TO_ASCII7"],
      deps: ["src/alexis_lib/coleco_math_format_u8.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_format_fx16.asm",
      symbols: ["AMY_FX16_16_FRAC_TO_HUNDREDTHS", "AMY_FX16_16_FRAC_TO_TEN_THOUSANDTHS", "AMY_FX16_16_TO_ASCII9", "AMY_FX16_16_TO_ASCII11"],
      deps: [
        "src/alexis_lib/coleco_math_format.asm",
        "src/alexis_lib/coleco_math_format_u8.asm",
        "src/alexis_lib/coleco_math_fx16_core.asm",
        "src/alexis_lib/coleco_math_fx16_mul_helpers.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_core.asm",
      symbols: ["AMY_FP5_ZERO_MEM", "AMY_FP5_COPY_MEM", "AMY_FP5_LOAD_MEM_TO_FPA1", "AMY_FP5_STORE_FPA1_TO_MEM", "AMY_FP5_LOAD_MEM_TO_FPA2", "AMY_FP5_STORE_FPA2_TO_MEM", "AMY_FP5_ABS_MEM", "AMY_FP5_HALF_FPA2", "AMY_FP5_U16_TO_FPA1", "AMY_FP5_I16_TO_FPA1", "AMY_FP5_U16_DE_TO_FPA1", "AMY_FP5_I16_DE_TO_FPA1", "AMY_FP5_LOAD_U16_MEM_TO_FPA1", "AMY_FP5_LOAD_I16_MEM_TO_FPA1", "AMY_FP5_LOAD_U16_MEM_TO_FPA2", "AMY_FP5_LOAD_I16_MEM_TO_FPA2", "AMY_FP5_COPY_FPA1_TO_FPA2", "AMY_FP5_COPY_FPA2_TO_FPA1", "AMY_FP5_FPA1", "AMY_FP5_FPA2"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_random.asm",
      symbols: ["AMY_FP5_RND"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_basic_arith.asm",
      symbols: ["AMY_FP5_ADD_FPA1_TO_FPA2", "AMY_FP5_SUB_FPA1_FROM_FPA2", "AMY_FP5_CMP_FPA1_FPA2"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_bridge.asm",
      symbols: ["AMY_FP5_TO_FX16_16", "AMY_FX16_16_TO_FP5", "AMY_UFX16_16_TO_FP5"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_basic_arith.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_format_helpers.asm",
      symbols: ["AMY_FP5_FMT_CLEAR32_HL", "AMY_FP5_FMT_CLEAR40_HL", "AMY_FP5_FMT_SHIFT32_LEFT_HL", "AMY_FP5_FMT_SHIFT32_RIGHT_HL", "AMY_FP5_FMT_ADD_REM32_TO_TMP40", "AMY_FP5_FMT_CMP_TMP40_DEN32", "AMY_FP5_FMT_SUB_DEN32_FROM_TMP40", "AMY_FP5_FMT_COPY_TMP40_TO_REM32", "AMY_FP5_FMT_MASK_REM32", "AMY_FP5_FMT_BUILD_DEN32"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_format_exact.asm",
      symbols: ["AMY_FP5_TO_ASCII16"],
      deps: ["src/alexis_lib/coleco_math_fp5_bridge.asm", "src/alexis_lib/coleco_math_fp5_format_helpers.asm", "src/alexis_lib/coleco_math_fp5_basic_arith.asm", "src/alexis_lib/coleco_math_format.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_mul.asm",
      symbols: ["AMY_FP5_MUL_FPA1_FPA2"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_div64.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_div64.asm",
      symbols: ["AMY_FP5_64_COPY", "AMY_FP5_64_ADD", "AMY_FP5_64_SUB", "AMY_FP5_64_CMP", "AMY_FP5_64_SHR1", "AMY_FP5_64_SHR2", "AMY_FP5_64_SHL1", "AMY_FP5_64_INC", "AMY_FP5_64_IS_ZERO"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_div.asm",
      symbols: ["AMY_FP5_DIV_FPA1_FPA2"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_format_helpers.asm", "src/alexis_lib/coleco_math_fp5_div64.asm", "src/alexis_lib/coleco_math_u32_inc.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_sqrt.asm",
      symbols: ["AMY_FP5_SQRT_MEM"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_div64.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_trans.asm",
      symbols: ["AMY_FP5_LOG_MEM", "AMY_FP5_EXP_MEM"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_basic_arith.asm", "src/alexis_lib/coleco_math_fp5_mul.asm"]
    }
  ],
  "src/alexis_lib/coleco_math_compare.asm": [
    { path: "src/alexis_lib/coleco_math_compare_small.asm", symbols: ["AMY_CMP_U8", "AMY_CMP_S8", "AMY_CMP_U16", "AMY_CMP_S16"] },
    { path: "src/alexis_lib/coleco_math_compare_u32.asm", symbols: ["AMY_CMP_U32_MEM"] },
    { path: "src/alexis_lib/coleco_math_compare_s32.asm", symbols: ["AMY_CMP_S32_MEM"] }
  ],
  "src/alexis_lib/coleco_math_fx16.asm": [
    {
      path: "src/alexis_lib/coleco_math_fx16_core.asm",
      symbols: ["AMY_FX16_16_ADD", "AMY_FX16_16_SUB", "AMY_FX16_16_NEG", "AMY_FX16_16_ABS"],
      deps: [
        "src/alexis_lib/coleco_math_u32_add.asm",
        "src/alexis_lib/coleco_math_u32_sub.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_mul_helpers.asm",
      symbols: ["AMY_U_MULT32", "AMY_U64_ADD", "AMY_U8_MUL16", "AMY_U16_MUL32_TO_TMP"],
      deps: ["src/alexis_lib/coleco_math_fx16_core.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_mult.asm",
      symbols: ["AMY_FX16_16_MULT"],
      deps: [
        "src/alexis_lib/coleco_math_fx16_core.asm",
        "src/alexis_lib/coleco_math_fx16_mul_helpers.asm",
        "src/alexis_lib/coleco_math_u32_add.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_div.asm",
      symbols: ["AMY_FX16_16_DIV"],
      deps: [
        "src/alexis_lib/coleco_math_fx16_core.asm",
        "src/alexis_lib/coleco_math_u32_zero.asm",
        "src/alexis_lib/coleco_math_u32_inc.asm",
        "src/alexis_lib/coleco_math_compare_u32.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_sqrt.asm",
      symbols: ["AMY_FX16_16_SQRT", "AMY_FX16_48_CMP", "AMY_FX16_48_COPY", "AMY_FX16_48_ADD", "AMY_FX16_48_SUB", "AMY_FX16_48_SHR1", "AMY_FX16_48_SHR2", "AMY_FX16_48_SHL1", "AMY_FX16_48_INC", "AMY_FX16_48_IS_ZERO"],
      deps: [
        "src/alexis_lib/coleco_math_fx16_core.asm",
        "src/alexis_lib/coleco_math_u32_zero.asm"
      ]
    },
    {
      path: "src/alexis_lib/coleco_math_fx16_random.asm",
      symbols: ["AMY_FX16_16_RND"],
      deps: ["src/alexis_lib/coleco_math_fx16_core.asm"]
    }
  ],
  "src/alexis_lib/coleco_math_u32.asm": [
    { path: "src/alexis_lib/coleco_math_u32_zero.asm", symbols: ["AMY_U32_ZERO"] },
    { path: "src/alexis_lib/coleco_math_u32_copy.asm", symbols: ["AMY_U32_COPY"] },
    { path: "src/alexis_lib/coleco_math_u32_inc.asm",  symbols: ["AMY_U32_INC"] },
    { path: "src/alexis_lib/coleco_math_u32_add.asm",  symbols: ["AMY_U32_ADD"] },
    { path: "src/alexis_lib/coleco_math_u32_sub.asm",  symbols: ["AMY_U32_SUB"] },
    { path: "src/alexis_lib/coleco_math_u32_mul.asm",  symbols: ["AMY_U32_MUL"], deps: ["src/alexis_lib/coleco_math_u32_add.asm"] },
    { path: "src/alexis_lib/coleco_math_u32_div.asm",  symbols: ["AMY_U32_DIV"], deps: ["src/alexis_lib/coleco_math_u32_sub.asm", "src/alexis_lib/coleco_math_compare_u32.asm"] }
  ],
  "src/alexis_lib/coleco_math_fp5_arith.asm": [
    {
      path: "src/alexis_lib/coleco_math_fp5_mul.asm",
      symbols: ["AMY_FP5_MUL_FPA1_FPA2"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_div64.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_div64.asm",
      symbols: ["AMY_FP5_64_COPY", "AMY_FP5_64_ADD", "AMY_FP5_64_SUB", "AMY_FP5_64_CMP", "AMY_FP5_64_SHR1", "AMY_FP5_64_SHR2", "AMY_FP5_64_SHL1", "AMY_FP5_64_INC", "AMY_FP5_64_IS_ZERO"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_div.asm",
      symbols: ["AMY_FP5_DIV_FPA1_FPA2"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_format_helpers.asm", "src/alexis_lib/coleco_math_fp5_div64.asm", "src/alexis_lib/coleco_math_u32_inc.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_sqrt.asm",
      symbols: ["AMY_FP5_SQRT_MEM"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_div64.asm"]
    },
    {
      path: "src/alexis_lib/coleco_math_fp5_trans.asm",
      symbols: ["AMY_FP5_LOG_MEM", "AMY_FP5_EXP_MEM"],
      deps: ["src/alexis_lib/coleco_math_fp5_core.asm", "src/alexis_lib/coleco_math_fp5_basic_arith.asm", "src/alexis_lib/coleco_math_fp5_mul.asm"]
    }
  ],
  "src/alexis_lib/coleco_vdp.asm": [
    { path: "src/alexis_lib/coleco_vdp_core.asm", symbols: ["AMY_VDP_WRITE_REG", "AMY_FILL_VRAM", "AMY_LOAD_SEQUENTIAL_NAME_TABLE", "AMY_SET_DEFAULT_NAME_TABLE", "AMY_PUT_VRAM", "AMY_GET_VRAM"] },
    {
      path: "src/alexis_lib/coleco_vdp_modes.asm",
      symbols: ["AMY_SET_BITMAP_GRAPHICS_MODE", "AMY_SET_GRAPHICS_MODE2_TEXT", "AMY_SET_GRAPHICS_MODE1_TEXT", "AMY_SET_GRAPHICS_MODE3_MULTICOLOR", "AMY_FILL_MODE2_TEXT_COLOR_FIRST_THIRD", "AMY_DUPLICATE_COLOR_THIRDS", "AMY_FILL_MODE2_TEXT_COLOR", "AMY_FILL_MODE2_TEXT_COLOR_FULL", "AMY_DUPLICATE_PATTERN_THIRDS"],
      deps: ["src/alexis_lib/coleco_vdp_core.asm"]
    },
    { path: "src/alexis_lib/coleco_vdp_screen.asm", symbols: ["AMY_SCREEN_OFF_NO_NMI", "AMY_SCREEN_ON_NMI"] },
    { path: "src/alexis_lib/coleco_vdp_screen_ext.asm", symbols: ["AMY_SCREEN_ON_NO_NMI"] },
    { path: "src/alexis_lib/coleco_nmi.asm", symbols: ["AMY_DISABLE_NMI", "AMY_ENABLE_NMI"] },
    { path: "src/alexis_lib/coleco_vdp_rw.asm", symbols: ["AMY_COPY_BYTES_TO_VRAM", "AMY_VPOKE", "AMY_VPEEK"] },
    { path: "src/alexis_lib/coleco_vdp_merge.asm", symbols: ["AMY_MERGE_BYTES_TO_VRAM"] },
    {
      path: "src/alexis_lib/coleco_vdp_screen_pages.asm",
      symbols: ["AMY_SET_SCREEN_PAGES", "AMY_SWAP_SCREEN_PAGES"]
    },
    { path: "src/alexis_lib/coleco_mode1_scratch.asm", symbols: ["AMY_MODE1_GEOMETRY_SCRATCH"] },
    {
      path: "src/alexis_lib/coleco_mode1_pset.asm",
      symbols: ["AMY_MODE1_CALC_ADDRESS_MASK", "AMY_MODE1_PSET", "AMY_MODE1_PRESET", "AMY_MODE1_PSET_COLOR", "AMY_MODE1_PLOT_CLIP", "AMY_MODE1_PLOT_COLOR_CLIP", "AMY_MODE1_PLOT_BCMAYBE_COLOR", "AMY_MODE1_LINE_PLOT_CURRENT"],
      deps: ["src/alexis_lib/coleco_vdp_rw.asm", "src/alexis_lib/coleco_mode1_scratch.asm"]
    },
    {
      path: "src/alexis_lib/coleco_mode3_pixel.asm",
      symbols: ["AMY_MODE3_CALC_COLOR_ADDRESS", "AMY_MODE3_PSET", "AMY_MODE3_PSET_FAST", "AMY_MODE3_PGET"],
      deps: ["src/alexis_lib/coleco_vdp_rw.asm"]
    },
    { path: "src/alexis_lib/coleco_mode3_scratch.asm", symbols: ["AMY_MODE3_HLINE_COLOR", "AMY_MODE3_HLINE_PACKED", "AMY_MODE3_LINE_X1", "AMY_MODE3_BOX_X1"] },
    {
      path: "src/alexis_lib/coleco_mode3_line.asm",
      symbols: ["AMY_MODE3_HLINE", "AMY_MODE3_LINE", "AMY_MODE3_BOX"],
      deps: ["src/alexis_lib/coleco_mode3_pixel.asm", "src/alexis_lib/coleco_mode3_scratch.asm"]
    },
    {
      path: "src/alexis_lib/coleco_pattern_transform.asm",
      symbols: ["AMY_REFLECT_PATTERN_VERTICAL", "AMY_REFLECT_PATTERN_HORIZONTAL", "AMY_ROTATE_PATTERN_90"]
    },
    {
      path: "src/alexis_lib/coleco_mode1_line.asm",
      symbols: ["AMY_MODE1_LINE_CORE", "AMY_MODE1_LINE", "AMY_MODE1_LINE_COLOR"],
      deps: ["src/alexis_lib/coleco_mode1_pset.asm"]
    },
    {
      path: "src/alexis_lib/coleco_mode1_circle.asm",
      symbols: ["AMY_MODE1_CIRCLE_PLOT_POINTS", "AMY_MODE1_CIRCLE_CORE", "AMY_MODE1_CIRCLE", "AMY_MODE1_CIRCLE_COLOR"],
      deps: ["src/alexis_lib/coleco_mode1_pset.asm"]
    }
  ],
  "src/alexis_lib/coleco_text.asm": [
    { path: "src/alexis_lib/coleco_text_core.asm", symbols: ["AMY_CLEAR_NAME_TABLE", "AMY_LOAD_DEFAULT_ASCII", "AMY_TEXT_CALC_NAME_ADDRESS"] },
    {
      path: "src/alexis_lib/coleco_text_io.asm",
      symbols: ["AMY_PUT_CHAR_AT", "AMY_GET_CHAR_AT", "AMY_FILL_AT", "AMY_PRINT_AT"],
      deps: ["src/alexis_lib/coleco_text_core.asm", "src/alexis_lib/coleco_vdp_core.asm"]
    },
    { path: "src/alexis_lib/coleco_text_wipe.asm", symbols: ["AMY_WIPE_SCREEN_UP", "AMY_WIPE_SCREEN_DOWN"] },
    { path: "src/alexis_lib/coleco_bitmap_wipe.asm", symbols: ["AMY_WIPE_BITMAP_UP", "AMY_WIPE_BITMAP_DOWN"] },
    {
      path: "src/alexis_lib/coleco_text_put.asm",
      symbols: ["AMY_PUT_AT"],
      deps: ["src/alexis_lib/coleco_text_core.asm"]
    },
    {
      path: "src/alexis_lib/coleco_text_fp5.asm",
      symbols: ["AMY_PRINT_FP5_AT"],
      deps: ["src/alexis_lib/coleco_text_io.asm"]
    },
    { path: "src/alexis_lib/coleco_text_ascii_style.asm", symbols: ["AMY_LOAD_DEFAULT_ASCII_STYLE"] }
  ],
  "src/alexis_lib/coleco_sprite.asm": [
    { path: "src/alexis_lib/coleco_sprite_config.asm", symbols: ["AMY_SET_SPRITES8X8", "AMY_SET_SPRITES16X16", "AMY_SET_SPRITES_SIMPLE", "AMY_SET_SPRITES_DOUBLE"] },
    { path: "src/alexis_lib/coleco_sprite_table.asm", symbols: ["AMY_SET_SPRITE_COUNT", "AMY_CLEAR_SPRITES", "AMY_UPDATE_SPRITES"] },
    { path: "src/alexis_lib/coleco_sprite_collision.asm", symbols: ["AMY_CHECK_COLLISION_RAW", "AMY_CHECK_SPRITE_COLLISION_BOX"] },
    { path: "src/alexis_lib/coleco_sprite_set.asm", symbols: ["AMY_SET_SPRITE", "AMY_HIDE_SPRITE"] },
    { path: "src/alexis_lib/coleco_sprite_partial.asm", symbols: ["AMY_UPDATE_SPRITES_PARTIAL"] }
  ]
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asmBodyReferencesSymbol(asmBody, symbol) {
  return new RegExp(`\\b${escapeRegex(symbol)}\\b`).test(asmBody);
}

function buildDirectModuleCatalog() {
  const direct = new Map();
  for (const modules of Object.values(splitLibraryCatalog)) {
    for (const module of modules) {
      direct.set(module.path, module);
    }
  }
  return direct;
}

export function resolveSelectedLibModules(paths, asmBody) {
  return resolveSelectedLibModulesDetailed(paths, asmBody).paths;
}

export function resolveSelectedLibModulesDetailed(paths, asmBody) {
  const resolved = new Set();
  const replacements = [];
  const directCatalog = buildDirectModuleCatalog();
  for (const path of paths || []) {
    const modules = splitLibraryCatalog[path];
    if (!modules) {
      const directModule = directCatalog.get(path);
      if (!directModule) {
        resolved.add(path);
        continue;
      }
      const pending = [directModule];
      const chosen = new Set();
      while (pending.length) {
        const module = pending.pop();
        if (chosen.has(module.path)) continue;
        chosen.add(module.path);
        resolved.add(module.path);
        for (const depPath of module.deps || []) {
          const dep = directCatalog.get(depPath);
          if (dep && !chosen.has(dep.path)) pending.push(dep);
          else if (!dep) {
            chosen.add(depPath);
            resolved.add(depPath);
          }
        }
      }
      continue;
    }
    const matched = modules.filter((module) => module.symbols.some((symbol) => asmBodyReferencesSymbol(asmBody, symbol)));
    if (!matched.length) {
      replacements.push({
        umbrella: path,
        resolved: []
      });
      continue;
    }
    const moduleMap = new Map(modules.map((module) => [module.path, module]));
    const pending = [...matched];
    const chosen = new Set();
    while (pending.length) {
      const module = pending.pop();
      if (chosen.has(module.path)) continue;
      chosen.add(module.path);
      resolved.add(module.path);
      for (const depPath of module.deps || []) {
        const dep = moduleMap.get(depPath);
        if (dep && !chosen.has(dep.path)) pending.push(dep);
        else if (!dep) {
          chosen.add(depPath);
          resolved.add(depPath);
        }
      }
    }
    replacements.push({
      umbrella: path,
      resolved: [...chosen].sort()
    });
  }
  return {
    paths: [...resolved],
    replacements
  };
}

export function getSplitLibraryCatalog() {
  return splitLibraryCatalog;
}
