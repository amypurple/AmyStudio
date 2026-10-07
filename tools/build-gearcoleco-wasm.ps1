param(
    [string]$EmsdkRoot = $env:EMSDK,
    [string]$GearRoot = "",
    [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $GearRoot) {
    $GearRoot = Join-Path $repoRoot "studio/vendor/Gearcoleco-main"
}

if (-not $OutputDir) {
    $OutputDir = Join-Path $repoRoot "studio/vendor/gearcoleco-test-core"
}

if (-not $EmsdkRoot) {
    $EmsdkRoot = Join-Path $env:TEMP "amy-studio-emsdk"
}

$emscriptenRoot = Join-Path $EmsdkRoot "upstream/emscripten"
$empp = Join-Path $emscriptenRoot "em++.bat"
$emcc = Join-Path $emscriptenRoot "emcc.bat"
if (-not (Test-Path -LiteralPath $empp) -or -not (Test-Path -LiteralPath $emcc)) {
    throw "Emscripten 4.0.10 is required. Install it under '$EmsdkRoot' or pass -EmsdkRoot."
}

$sourceRoot = Join-Path $GearRoot "src"
$dependencies = Join-Path $GearRoot "platforms/shared/dependencies"
$wrapper = Join-Path $repoRoot "tools/gearcoleco-wasm/wasm_api.cpp"
if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot "GearcolecoCore.cpp")) -or
    -not (Test-Path -LiteralPath (Join-Path $dependencies "miniz/miniz.c"))) {
    throw "GearColeco sources were not found under '$GearRoot'. Pass -GearRoot with a GearColeco 1.7.0 source checkout."
}

$sources = @(
    "Adam.cpp",
    "AdamMedia.cpp",
    "AdamNet.cpp",
    "Audio.cpp",
    "AY8910.cpp",
    "Cartridge.cpp",
    "ColecoVisionIOPorts.cpp",
    "GearcolecoCore.cpp",
    "Input.cpp",
    "Mapper.cpp",
    "Memory.cpp",
    "opcodes.cpp",
    "opcodes_cb.cpp",
    "opcodes_ed.cpp",
    "Processor.cpp",
    "SP0256Voice.cpp",
    "sp0256/sp0256.c",
    "TraceLogger.cpp",
    "TMS9918A.cpp",
    "F18A.cpp",
    "F18A_enhancements.cpp",
    "F18AGPU.cpp",
    "VgmRecorder.cpp",
    "audio/Blip_Buffer.cpp",
    "audio/Effects_Buffer.cpp",
    "audio/Sms_Apu.cpp",
    "audio/Multi_Buffer.cpp"
) | ForEach-Object { Join-Path $sourceRoot $_ }

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$outputJs = Join-Path $OutputDir "gearcoleco-test-core.js"
$minizObject = Join-Path $OutputDir "miniz.o"

& $emcc `
    (Join-Path $dependencies "miniz/miniz.c") `
    "-I$(Join-Path $dependencies 'miniz')" `
    "-O3" `
    "-DNDEBUG" `
    "-c" `
    "-o" `
    $minizObject
if ($LASTEXITCODE -ne 0) {
    throw "GearColeco miniz build failed with exit code $LASTEXITCODE."
}

$exported = @(
    "_malloc",
    "_free",
    "_gcw_create",
    "_gcw_destroy",
    "_gcw_seed_rng",
    "_gcw_load_bios",
    "_gcw_load_adam_firmware",
    "_gcw_start_adam",
    "_gcw_reset_adam",
    "_gcw_get_adam_boot_mode",
    "_gcw_get_machine",
    "_gcw_get_adam_mioc",
    "_gcw_get_adam_net_summary",
    "_gcw_get_adam_printer_data",
    "_gcw_clear_adam_printer_data",
    "_gcw_load_adam_media",
    "_gcw_read_adam_media",
    "_gcw_eject_adam_media",
    "_gcw_adam_key",
    "_gcw_set_adam_serial_profile",
    "_gcw_set_adam_sound_expansion",
    "_gcw_set_adam_serial_loopback",
    "_gcw_set_adam_serial_carrier",
    "_gcw_set_adam_serial_hayes",
    "_gcw_set_adam_serial_timing",
    "_gcw_inject_adam_serial_rx",
    "_gcw_read_adam_serial_tx",
    "_gcw_debug_adam_port_in",
    "_gcw_debug_adam_port_out",
    "_gcw_load_rom",
    "_gcw_reset",
    "_gcw_set_video_chip",
    "_gcw_get_video_chip",
    "_gcw_set_sp0256_enabled",
    "_gcw_set_voice_module_type",
    "_gcw_run_frame",
    "_gcw_step_instruction",
    "_gcw_profile_begin",
    "_gcw_profile_run_batch",
    "_gcw_profile_get_results",
    "_gcw_profile_cancel",
    "_gcw_set_controller_mask",
    "_gcw_sync_controller_mask",
    "_gcw_set_spinner",
    "_gcw_save_state_size",
    "_gcw_save_state",
    "_gcw_load_state",
    "_gcw_get_framebuffer",
    "_gcw_get_framebuffer_width",
    "_gcw_get_framebuffer_height",
    "_gcw_get_audio_buffer",
    "_gcw_get_audio_sample_count",
    "_gcw_get_audio_sample_rate",
    "_gcw_get_pc",
    "_gcw_get_rom_bank",
    "_gcw_get_cartridge_type",
    "_gcw_get_sp",
    "_gcw_get_cpu_state",
    "_gcw_disassemble",
    "_gcw_get_master_clock",
    "_gcw_get_last_step_interrupt",
    "_gcw_get_region",
    "_gcw_read_ram",
    "_gcw_read_adam_main_ram",
    "_gcw_read_adam_expansion_ram",
    "_gcw_read_vram",
    "_gcw_get_vdp_registers",
    "_gcw_set_execute_breakpoint",
    "_gcw_clear_execute_breakpoint",
    "_gcw_clear_all_breakpoints"
)

$arguments = @(
    $minizObject,
    $sources,
    $wrapper,
    "-I$sourceRoot",
    "-I$(Join-Path $sourceRoot 'audio')",
    "-I$(Join-Path $dependencies 'miniz')",
    "-std=c++11",
    "-O3",
    "-DNDEBUG",
    "-DGEARCOLECO_DETERMINISTIC_STATE",
    "-DGEARCOLECO_DISABLE_VGMRECORDER",
    "-fno-exceptions",
    "-sMODULARIZE=1",
    "-sEXPORT_ES6=1",
    "-sALLOW_MEMORY_GROWTH=1",
    "-sENVIRONMENT=web,node",
    "-sFILESYSTEM=0",
    "-sEXPORTED_FUNCTIONS=$($exported | ConvertTo-Json -Compress)",
    "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAPU16','HEAP16']",
    "-o",
    $outputJs
)

& $empp @arguments
if ($LASTEXITCODE -ne 0) {
    throw "GearColeco WASM build failed with exit code $LASTEXITCODE."
}
Remove-Item -LiteralPath $minizObject -Force

$versionFile = Join-Path $OutputDir "BUILD.txt"
@(
    "emscripten=4.0.10"
    "gearcoleco=1.7.0"
    "debugger=enabled"
    "performance_batching=disabled"
    "save_state_header=deterministic"
    "random_seed=wrapper_to_core"
    "master_cycle_counter=enabled"
    "stack_pointer=enabled"
    "cpu_state=enabled"
    "native_disassembler=enabled"
    "megacart_debug=active_rom_bank,cartridge_type"
    "sp0256_core=rom_microsequencer_lpc12"
    "sp0256_voice_modules=lundy_43_44_45,eve_48_49_4a_4b"
    "video_chips=tms9918a,f18a_v1.9"
    "adam=firmware,adamnet,keyboard,ddp,disk,media_export,printer,64k_expansion_ram"
    "adam_reset=eos_computer,os7_cartridge_on_adam_hardware"
    "adam_serial=adamlink,eve_orphanware,microinnovations,offline,loopback,hayes,scripted_rx,tx_capture,debug_inspector,selectable_8n1_timing,scn2651_txrdy_txemt,savestate_v112"
    "adam_video_compatibility=startup_unterminated_overlapping_sprite_table"
) | Set-Content -LiteralPath $versionFile -Encoding ascii

Write-Host "Built $outputJs"
