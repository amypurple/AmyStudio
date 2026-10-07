/*
 * Amy Studio GearColeco browser test API.
 *
 * This wraps the GearColeco core directly. The ROM test recorder must not
 * depend on EmulatorJS internals or on a debugger-disabled CDN core.
 */

#include <cstdlib>
#include <cstring>
#include "GearcolecoCore.h"
#include "Memory.h"
#include "Processor.h"
#include "Video.h"
#include "Audio.h"
#include "Adam.h"
#include "AdamNet.h"
#include "AdamMedia.h"

#if defined(__EMSCRIPTEN__)
#include <emscripten/emscripten.h>
#define GCW_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define GCW_EXPORT
#endif

bool g_mcp_stdio_mode = true;

namespace
{
    GearcolecoCore* g_core = NULL;
    u32 g_seed = 0;
    u32 g_controller_masks[2] = {0, 0};
    u8 g_frame_buffer[GC_RESOLUTION_WIDTH_WITH_OVERSCAN *
                      GC_RESOLUTION_HEIGHT_WITH_OVERSCAN * 2];
    s16 g_audio_buffer[GC_AUDIO_BUFFER_SIZE];
    int g_audio_sample_count = 0;
    int g_last_step_interrupt = 0;

    struct ProfileInterrupt
    {
        int type;
        u16 entry_sp;
        u16 return_address;
    };

    struct ProfileState
    {
        bool active;
        bool complete;
        int completion_kind;
        u32 target_start;
        u32 target_end;
        int target_bank;
        u16 entry_sp;
        u16 return_address;
        u16 exits[512];
        u32 exit_count;
        ProfileInterrupt interrupts[8];
        u32 interrupt_depth;
        u64 inclusive_cycles;
        u64 in_range_cycles;
        u64 interrupt_cycles;
        u64 nmi_cycles;
        u64 irq_cycles;
        u32 instructions;
    };

    ProfileState g_profile = {};

    int LogicalBank(u16 address)
    {
        return address < 0xC000 ? 0 : static_cast<int>(g_core->GetMemory()->GetRomBank()) + 1;
    }

    bool IsProfileBank(int bank, u16 address)
    {
        return bank < 0 || LogicalBank(address) == bank;
    }

    bool IsProfileExit(u16 address)
    {
        if (!IsProfileBank(g_profile.target_bank, address)) return false;
        for (u32 index = 0; index < g_profile.exit_count; ++index)
        {
            if (g_profile.exits[index] == address)
                return true;
        }
        return false;
    }

    const GC_Keys kControllerKeys[] = {
        Key_Up,
        Key_Down,
        Key_Left,
        Key_Right,
        Key_Right_Button,
        Key_Left_Button,
        Keypad_2,
        Keypad_1,
        Keypad_Asterisk,
        Keypad_Hash,
        Keypad_3,
        Keypad_4,
        Keypad_5,
        Keypad_6,
        Keypad_7,
        Keypad_8,
        Keypad_0,
        Keypad_9,
        Key_Blue,
        Key_Purple
    };

    const int kControllerKeyCount =
        static_cast<int>(sizeof(kControllerKeys) / sizeof(kControllerKeys[0]));

    bool IsReady()
    {
        return g_core != NULL;
    }

    void ResetControllerMasks()
    {
        g_controller_masks[0] = 0;
        g_controller_masks[1] = 0;
    }
}

extern "C"
{
    GCW_EXPORT int gcw_create(u32 seed)
    {
        delete g_core;
        g_core = NULL;

        g_seed = seed;
        srand(g_seed);
        g_core = new GearcolecoCore();
        g_core->Init(GC_PIXEL_RGB565);
        g_core->SetRandomSeed(g_seed);
        memset(g_frame_buffer, 0, sizeof(g_frame_buffer));
        memset(g_audio_buffer, 0, sizeof(g_audio_buffer));
        ResetControllerMasks();
        return 1;
    }

    GCW_EXPORT void gcw_destroy()
    {
        delete g_core;
        g_core = NULL;
        ResetControllerMasks();
    }

    GCW_EXPORT void gcw_seed_rng(u32 seed)
    {
        g_seed = seed;
        srand(g_seed);
        if (IsReady())
            g_core->SetRandomSeed(g_seed);
    }

    GCW_EXPORT int gcw_load_bios(const u8* buffer, u32 size)
    {
        if (!IsReady())
            return 0;
        return g_core->GetMemory()->LoadBiosFromBuffer(buffer, size) ? 1 : 0;
    }

    GCW_EXPORT int gcw_load_adam_firmware(
        const u8* os7, u32 os7_size,
        const u8* eos, u32 eos_size,
        const u8* smartwriter, u32 smartwriter_size)
    {
        if (!IsReady() || !os7 || !eos || !smartwriter)
            return 0;
        return g_core->LoadAdamFirmware(
            os7, static_cast<int>(os7_size),
            eos, static_cast<int>(eos_size),
            smartwriter, static_cast<int>(smartwriter_size)) ? 1 : 0;
    }

    GCW_EXPORT int gcw_start_adam(int boot_mode)
    {
        if (!IsReady() || boot_mode < GC_ADAM_BOOT_COMPUTER || boot_mode > GC_ADAM_BOOT_CARTRIDGE)
            return 0;
        srand(g_seed);
        g_core->SetRandomSeed(g_seed);
        return g_core->StartAdam(static_cast<GC_AdamBootMode>(boot_mode)) ? 1 : 0;
    }

    GCW_EXPORT int gcw_reset_adam(int boot_mode)
    {
        if (!IsReady() || g_core->GetMachine() != GC_MACHINE_ADAM ||
            boot_mode < GC_ADAM_BOOT_COMPUTER || boot_mode > GC_ADAM_BOOT_CARTRIDGE)
            return 0;

        if (boot_mode == GC_ADAM_BOOT_CARTRIDGE)
        {
            if (!g_core->GetCartridge()->IsReady())
                return 0;
            g_core->ResetAdamCartridge();
        }
        else
        {
            g_core->ResetAdamComputer();
        }
        ResetControllerMasks();
        return g_core->GetAdamBootMode() == static_cast<GC_AdamBootMode>(boot_mode) ? 1 : 0;
    }

    GCW_EXPORT int gcw_get_adam_boot_mode()
    {
        if (!IsReady() || g_core->GetMachine() != GC_MACHINE_ADAM)
            return -1;
        return static_cast<int>(g_core->GetAdamBootMode());
    }

    GCW_EXPORT int gcw_get_machine()
    {
        return IsReady() ? static_cast<int>(g_core->GetMachine()) : -1;
    }

    GCW_EXPORT int gcw_get_adam_mioc()
    {
        if (!IsReady() || g_core->GetMachine() != GC_MACHINE_ADAM)
            return -1;
        return g_core->GetAdam()->GetMIOC();
    }

    GCW_EXPORT u32 gcw_get_adam_net_summary(u32* output, u32 count)
    {
        const u32 serial_base = 12 + (GC_ADAM_DEBUG_DCB_COUNT * 5);
        const u32 required = serial_base + 16;
        if (!IsReady() || !output || count < required || g_core->GetMachine() != GC_MACHINE_ADAM)
            return 0;
        GC_AdamDebugState state = {};
        if (!g_core->GetAdamDebugState(&state))
            return 0;
        output[0] = static_cast<u32>(state.controller_state);
        output[1] = state.pcb_address;
        output[2] = state.pcb_command_status;
        output[3] = state.configured_dcb_count;
        output[4] = state.transfer_active ? 1u : 0u;
        output[5] = state.transfer_command;
        output[6] = state.transfer_error;
        output[7] = state.transfer_device;
        output[8] = state.transfer_block;
        output[9] = state.transfer_buffer;
        output[10] = state.transfer_length;
        output[11] = static_cast<u32>(state.cycles_until_event);
        for (u32 index = 0; index < GC_ADAM_DEBUG_DCB_COUNT; ++index)
        {
            const GC_AdamDebugDCB& dcb = state.dcbs[index];
            const u32 base = 12 + (index * 5);
            output[base] = dcb.command_status;
            output[base + 1] = dcb.device;
            output[base + 2] = dcb.block;
            output[base + 3] = dcb.buffer;
            output[base + 4] = dcb.length;
        }
        output[serial_base] = static_cast<u32>(state.serial_profile);
        output[serial_base + 1] = static_cast<u32>(state.sound_expansion);
        output[serial_base + 2] = state.serial_loopback ? 1u : 0u;
        output[serial_base + 3] = state.serial_carrier ? 1u : 0u;
        output[serial_base + 4] = state.serial_hayes ? 1u : 0u;
        output[serial_base + 5] = static_cast<u32>(state.serial_rx_size);
        output[serial_base + 6] = static_cast<u32>(state.serial_tx_size);
        output[serial_base + 7] = static_cast<u32>(state.hayes_command_length);
        for (u32 index = 0; index < 8; ++index)
            output[serial_base + 8 + index] = state.serial_registers[index];
        return required;
    }

    GCW_EXPORT u32 gcw_get_adam_printer_data(u8* output, u32 capacity)
    {
        if (!IsReady() || g_core->GetMachine() != GC_MACHINE_ADAM)
            return 0;
        AdamNet* adam_net = g_core->GetAdam()->GetAdamNet();
        if (!adam_net)
            return 0;
        const int size = adam_net->GetPrinterSize();
        if (!output || capacity < static_cast<u32>(size))
            return static_cast<u32>(size);
        if (size > 0)
            memcpy(output, adam_net->GetPrinterData(), static_cast<size_t>(size));
        return static_cast<u32>(size);
    }

    GCW_EXPORT void gcw_clear_adam_printer_data()
    {
        if (!IsReady() || g_core->GetMachine() != GC_MACHINE_ADAM)
            return;
        AdamNet* adam_net = g_core->GetAdam()->GetAdamNet();
        if (adam_net)
            adam_net->ClearPrinter();
    }

    GCW_EXPORT int gcw_load_adam_media(
        int slot, int type, const u8* data, u32 size, int write_protected)
    {
        if (!IsReady() || !data || slot < 0 || slot >= GC_ADAM_MEDIA_SLOT_COUNT ||
            type < GC_ADAM_MEDIA_DATA_PACK || type > GC_ADAM_MEDIA_DISK)
            return 0;
        return g_core->LoadAdamMediaFromBuffer(
            static_cast<GC_AdamMediaSlot>(slot), static_cast<GC_AdamMediaType>(type),
            data, size, write_protected != 0) ? 1 : 0;
    }

    GCW_EXPORT void gcw_eject_adam_media(int slot)
    {
        if (IsReady() && slot >= 0 && slot < GC_ADAM_MEDIA_SLOT_COUNT)
            g_core->EjectAdamMedia(static_cast<GC_AdamMediaSlot>(slot));
    }

    GCW_EXPORT u32 gcw_read_adam_media(int slot, u8* output, u32 capacity)
    {
        if (!IsReady() || slot < 0 || slot >= GC_ADAM_MEDIA_SLOT_COUNT)
            return 0;
        AdamMedia* media = g_core->GetAdamMedia(static_cast<GC_AdamMediaSlot>(slot));
        if (!media || !media->IsInserted())
            return 0;
        const size_t size = media->GetSize();
        if (!output || capacity < size)
            return static_cast<u32>(size);
        memcpy(output, media->GetData(), size);
        return static_cast<u32>(size);
    }

    GCW_EXPORT int gcw_adam_key(int key, int pressed)
    {
        if (!IsReady() || key < 0 || key >= GC_ADAM_KEY_COUNT)
            return 0;
        if (pressed)
            g_core->AdamKeyPressed(static_cast<GC_AdamKey>(key));
        else
            g_core->AdamKeyReleased(static_cast<GC_AdamKey>(key));
        return 1;
    }

    GCW_EXPORT int gcw_set_adam_serial_profile(int profile)
    {
        if (!IsReady() || profile < GC_ADAM_SERIAL_NONE || profile >= GC_ADAM_SERIAL_PROFILE_COUNT)
            return 0;
        g_core->GetAdam()->SetSerialProfile(static_cast<GC_AdamSerialProfile>(profile));
        return 1;
    }

    GCW_EXPORT int gcw_set_adam_sound_expansion(int expansion)
    {
        if (!IsReady() || expansion < GC_ADAM_SOUND_NONE || expansion >= GC_ADAM_SOUND_EXPANSION_COUNT)
            return 0;
        g_core->GetAdam()->SetSoundExpansion(static_cast<GC_AdamSoundExpansion>(expansion));
        return 1;
    }

    GCW_EXPORT int gcw_set_adam_serial_loopback(int enabled)
    {
        if (!IsReady())
            return 0;
        g_core->GetAdam()->SetSerialLoopback(enabled != 0);
        return 1;
    }

    GCW_EXPORT int gcw_set_adam_serial_carrier(int present)
    {
        if (!IsReady())
            return 0;
        g_core->GetAdam()->SetSerialCarrier(present != 0);
        return 1;
    }

    GCW_EXPORT int gcw_set_adam_serial_hayes(int enabled)
    {
        if (!IsReady() || !g_core->GetAdam())
            return 0;
        g_core->GetAdam()->SetSerialHayes(enabled != 0);
        return 1;
    }

    GCW_EXPORT int gcw_set_adam_serial_timing(int baud, int frame_bits)
    {
        if (!IsReady() || !g_core->GetAdam()) return 0;
        g_core->GetAdam()->SetSerialTiming(baud, frame_bits);
        return 1;
    }

    GCW_EXPORT int gcw_inject_adam_serial_rx(const u8* data, u32 size)
    {
        if (!IsReady() || (!data && size > 0))
            return 0;
        return g_core->GetAdam()->InjectSerialReceive(data, static_cast<int>(size)) ? 1 : 0;
    }

    GCW_EXPORT u32 gcw_read_adam_serial_tx(u8* data, u32 capacity, int consume)
    {
        if (!IsReady())
            return 0;
        return static_cast<u32>(g_core->GetAdam()->ReadSerialTransmit(
            data, static_cast<int>(capacity), consume != 0));
    }

    GCW_EXPORT int gcw_debug_adam_port_in(int port)
    {
        if (!IsReady() || port < 0 || port > 0xFF)
            return -1;
        return g_core->GetAdam()->In(static_cast<u8>(port));
    }

    GCW_EXPORT int gcw_debug_adam_port_out(int port, int value)
    {
        if (!IsReady() || port < 0 || port > 0xFF || value < 0 || value > 0xFF)
            return 0;
        g_core->GetAdam()->Out(static_cast<u8>(port), static_cast<u8>(value));
        return 1;
    }

    GCW_EXPORT int gcw_load_rom(const u8* buffer, u32 size, int region)
    {
        if (!IsReady() || !buffer || size == 0)
            return 0;

        srand(g_seed);
        g_core->SetRandomSeed(g_seed);
        if (!g_core->LoadROMFromBuffer(buffer, static_cast<int>(size)))
            return 0;

        if (region == Region_NTSC || region == Region_PAL)
        {
            Cartridge::ForceConfiguration config;
            config.type = g_core->GetCartridge()->GetType();
            config.region = region == Region_PAL
                ? Cartridge::CartridgePAL
                : Cartridge::CartridgeNTSC;
            srand(g_seed);
            g_core->SetRandomSeed(g_seed);
            g_core->ResetROM(&config);
        }

        ResetControllerMasks();
        return 1;
    }

    GCW_EXPORT int gcw_reset(int preserve_ram)
    {
        if (!IsReady())
            return 0;

        srand(g_seed);
        g_core->SetRandomSeed(g_seed);
        if (preserve_ram)
            g_core->ResetROMPreservingRAM();
        else
            g_core->ResetROM();
        ResetControllerMasks();
        return 1;
    }

    GCW_EXPORT int gcw_run_frame()
    {
        if (!IsReady())
            return -1;

        GearcolecoCore::GC_Debug_Run debug = {};
        debug.stop_on_breakpoint = true;
        g_audio_sample_count = 0;
        const bool breakpoint_hit = g_core->RunToVBlank(
            g_frame_buffer,
            g_audio_buffer,
            &g_audio_sample_count,
            &debug);
        return breakpoint_hit ? 1 : 0;
    }
    GCW_EXPORT int gcw_step_instruction()
    {
        if (!IsReady())
            return -1;

        Processor::ProcessorState* cpu_state = g_core->GetProcessor()->GetState();
        const u16 pc_before = cpu_state->PC->GetValue();
        const u16 sp_before = cpu_state->SP->GetValue();
        const bool nmi_requested = *cpu_state->NMI;
        const bool irq_requested = *cpu_state->INT && *cpu_state->IFF1;
        g_last_step_interrupt = 0;
        GearcolecoCore::GC_Debug_Run step_debug = {};
        step_debug.step_debugger = true;
        step_debug.stop_on_breakpoint = false;
        g_audio_sample_count = 0;
        g_core->RunToVBlank(
            g_frame_buffer,
            g_audio_buffer,
            &g_audio_sample_count,
            &step_debug);
        const u16 pc_after = g_core->GetProcessor()->GetState()->PC->GetValue();
        const u16 sp_after = g_core->GetProcessor()->GetState()->SP->GetValue();
        if (sp_after == static_cast<u16>(sp_before - 2))
        {
            if (nmi_requested && pc_after == 0x0066) g_last_step_interrupt = 1;
            else if (irq_requested && pc_after == 0x0038) g_last_step_interrupt = 2;
        }
        return 0;
    }


    GCW_EXPORT int gcw_profile_begin(
        u32 target_start,
        u32 target_end,
        int target_bank,
        u16 entry_sp,
        u16 return_address,
        const u16* exits,
        u32 exit_count)
    {
        if (!IsReady() || target_start > 0xFFFF || target_end <= target_start)
            return 0;

        memset(&g_profile, 0, sizeof(g_profile));
        g_profile.active = true;
        g_profile.target_start = target_start;
        g_profile.target_end = target_end;
        g_profile.target_bank = target_bank;
        g_profile.entry_sp = entry_sp;
        g_profile.return_address = return_address;
        g_profile.exit_count = exit_count < 512 ? exit_count : 512;
        if (g_profile.exit_count > 0 && exits)
        {
            memcpy(g_profile.exits, exits, g_profile.exit_count * sizeof(u16));
        }
        return 1;
    }

    GCW_EXPORT int gcw_profile_run_batch(u32 max_instructions)
    {
        if (!IsReady() || !g_profile.active)
            return -1;

        for (u32 index = 0; index < max_instructions && g_profile.active; ++index)
        {
            Processor::ProcessorState* cpu_state = g_core->GetProcessor()->GetState();
            const u16 pc_before = cpu_state->PC->GetValue();
            const u16 sp_before = cpu_state->SP->GetValue();
            const u64 cycles_before = g_core->GetMasterClockCycles();
            const bool nmi_requested = *cpu_state->NMI;
            const bool irq_requested = *cpu_state->INT && *cpu_state->IFF1;
            g_last_step_interrupt = 0;
            GearcolecoCore::GC_Debug_Run step_debug = {};
            step_debug.step_debugger = true;
            step_debug.stop_on_breakpoint = false;
            g_core->RunToVBlank(
                g_frame_buffer,
                g_audio_buffer,
                &g_audio_sample_count,
                &step_debug);

            const u16 pc_after = cpu_state->PC->GetValue();
            const u16 sp_after = cpu_state->SP->GetValue();
            if (sp_after == static_cast<u16>(sp_before - 2))
            {
                if (nmi_requested && pc_after == 0x0066) g_last_step_interrupt = 1;
                else if (irq_requested && pc_after == 0x0038) g_last_step_interrupt = 2;
            }
            const u64 cycles_after = g_core->GetMasterClockCycles();
            if (cycles_after < cycles_before)
            {
                g_profile.active = false;
                return -2;
            }

            const u64 delta = cycles_after - cycles_before;
            ++g_profile.instructions;
            g_profile.inclusive_cycles += delta;
            if (IsProfileBank(g_profile.target_bank, pc_before) &&
                pc_before >= g_profile.target_start && pc_before < g_profile.target_end)
                g_profile.in_range_cycles += delta;

            if (g_last_step_interrupt != 0 && g_profile.interrupt_depth < 8)
            {
                ProfileInterrupt& interrupt =
                    g_profile.interrupts[g_profile.interrupt_depth++];
                interrupt.type = g_last_step_interrupt;
                interrupt.entry_sp = sp_after;
                interrupt.return_address = pc_before;
            }

            const bool executing_interrupt = g_profile.interrupt_depth > 0;
            if (executing_interrupt)
            {
                ProfileInterrupt& interrupt =
                    g_profile.interrupts[g_profile.interrupt_depth - 1];
                g_profile.interrupt_cycles += delta;
                if (interrupt.type == 1)
                    g_profile.nmi_cycles += delta;
                else
                    g_profile.irq_cycles += delta;

                if (sp_after == static_cast<u16>(interrupt.entry_sp + 2) &&
                    pc_after == interrupt.return_address)
                {
                    --g_profile.interrupt_depth;
                }
            }

            if (!executing_interrupt && g_profile.interrupt_depth == 0)
            {
                if (sp_after == static_cast<u16>(g_profile.entry_sp + 2) &&
                    pc_after == g_profile.return_address)
                {
                    g_profile.complete = true;
                    g_profile.completion_kind = 1;
                    g_profile.active = false;
                }
                else if (sp_after == g_profile.entry_sp &&
                         pc_after != g_profile.target_start &&
                         IsProfileExit(pc_after))
                {
                    g_profile.complete = true;
                    g_profile.completion_kind = 2;
                    g_profile.active = false;
                }
            }
        }

        return g_profile.complete ? 1 : 0;
    }

    GCW_EXPORT u32 gcw_profile_get_results(u32* output, u32 size)
    {
        if (!output || size < 13)
            return 0;

        output[0] = g_profile.instructions;
        output[1] = static_cast<u32>(g_profile.inclusive_cycles);
        output[2] = static_cast<u32>(g_profile.inclusive_cycles >> 32);
        output[3] = static_cast<u32>(g_profile.in_range_cycles);
        output[4] = static_cast<u32>(g_profile.in_range_cycles >> 32);
        output[5] = static_cast<u32>(g_profile.interrupt_cycles);
        output[6] = static_cast<u32>(g_profile.interrupt_cycles >> 32);
        output[7] = static_cast<u32>(g_profile.nmi_cycles);
        output[8] = static_cast<u32>(g_profile.nmi_cycles >> 32);
        output[9] = static_cast<u32>(g_profile.irq_cycles);
        output[10] = static_cast<u32>(g_profile.irq_cycles >> 32);
        output[11] = static_cast<u32>(g_profile.completion_kind);
        output[12] = g_profile.active ? 1 : 0;
        return 13;
    }

    GCW_EXPORT void gcw_profile_cancel()
    {
        g_profile.active = false;
    }


    GCW_EXPORT int gcw_set_controller_mask(int controller, u32 mask)
    {
        if (!IsReady() || controller < 0 || controller > 1)
            return 0;

        const u32 previous = g_controller_masks[controller];
        const GC_Controllers port = static_cast<GC_Controllers>(controller);
        for (int bit = 0; bit < kControllerKeyCount; ++bit)
        {
            const u32 bit_mask = static_cast<u32>(1) << bit;
            if ((previous & bit_mask) == (mask & bit_mask))
                continue;
            if (mask & bit_mask)
                g_core->KeyPressed(port, kControllerKeys[bit]);
            else
                g_core->KeyReleased(port, kControllerKeys[bit]);
        }

        g_controller_masks[controller] = mask;
        return 1;
    }

    GCW_EXPORT int gcw_sync_controller_mask(int controller, u32 mask)
    {
        if (!IsReady() || controller < 0 || controller > 1)
            return 0;
        g_controller_masks[controller] = mask;
        return 1;
    }

    GCW_EXPORT int gcw_set_spinner(int controller, int movement)
    {
        if (!IsReady() || controller < 0 || controller > 1)
            return 0;
        if (controller == 0)
            g_core->Spinner1(movement);
        else
            g_core->Spinner2(movement);
        return 1;
    }

    GCW_EXPORT u32 gcw_save_state_size()
    {
        if (!IsReady())
            return 0;
        size_t size = 0;
        return g_core->SaveState(NULL, size, false)
            ? static_cast<u32>(size)
            : 0;
    }

    GCW_EXPORT u32 gcw_save_state(u8* output, u32 capacity)
    {
        if (!IsReady() || !output || capacity == 0)
            return 0;
        size_t size = capacity;
        return g_core->SaveState(output, size, false)
            ? static_cast<u32>(size)
            : 0;
    }

    GCW_EXPORT int gcw_load_state(const u8* input, u32 size)
    {
        if (!IsReady() || !input || size == 0)
            return 0;
        const bool loaded = g_core->LoadState(input, size);
        if (loaded)
            ResetControllerMasks();
        return loaded ? 1 : 0;
    }

    GCW_EXPORT const u8* gcw_get_framebuffer()
    {
        return g_frame_buffer;
    }
    GCW_EXPORT const s16* gcw_get_audio_buffer()
    {
        return g_audio_buffer;
    }

    GCW_EXPORT int gcw_get_audio_sample_count()
    {
        return g_audio_sample_count;
    }

    GCW_EXPORT int gcw_get_audio_sample_rate()
    {
        return GC_AUDIO_SAMPLE_RATE;
    }

    GCW_EXPORT int gcw_get_framebuffer_width()
    {
        if (!IsReady())
            return 0;
        GC_RuntimeInfo info;
        g_core->GetRuntimeInfo(info);
        return info.screen_width;
    }

    GCW_EXPORT int gcw_get_framebuffer_height()
    {
        if (!IsReady())
            return 0;
        GC_RuntimeInfo info;
        g_core->GetRuntimeInfo(info);
        return info.screen_height;
    }

    GCW_EXPORT u16 gcw_get_pc()
    {
        if (!IsReady())
            return 0;
        return g_core->GetProcessor()->GetState()->PC->GetValue();
    }

    GCW_EXPORT int gcw_get_rom_bank()
    {
        if (!IsReady() || !g_core->GetMemory())
            return -1;
        return static_cast<int>(g_core->GetMemory()->GetRomBank());
    }

    GCW_EXPORT int gcw_get_cartridge_type()
    {
        if (!IsReady() || !g_core->GetCartridge())
            return -1;
        return static_cast<int>(g_core->GetCartridge()->GetType());
    }

    GCW_EXPORT u16 gcw_get_sp()
    {
        if (!IsReady())
            return 0;
        return g_core->GetProcessor()->GetState()->SP->GetValue();
    }


    GCW_EXPORT u32 gcw_get_cpu_state(u16* output, u32 size)
    {
        if (!IsReady() || !output || size < 16)
            return 0;
        Processor::ProcessorState* state = g_core->GetProcessor()->GetState();
        output[0] = state->AF->GetValue();
        output[1] = state->BC->GetValue();
        output[2] = state->DE->GetValue();
        output[3] = state->HL->GetValue();
        output[4] = state->AF2->GetValue();
        output[5] = state->BC2->GetValue();
        output[6] = state->DE2->GetValue();
        output[7] = state->HL2->GetValue();
        output[8] = state->IX->GetValue();
        output[9] = state->IY->GetValue();
        output[10] = state->SP->GetValue();
        output[11] = state->PC->GetValue();
        output[12] = state->WZ->GetValue();
        output[13] = static_cast<u16>((*state->I << 8) | *state->R);
        output[14] = static_cast<u16>((*state->InterruptMode & 3) |
            (*state->IFF1 ? 0x0100 : 0) | (*state->IFF2 ? 0x0200 : 0) |
            (*state->Halt ? 0x0400 : 0));
        output[15] = 0;
        return 16;
    }

    GCW_EXPORT int gcw_set_sp0256_enabled(int enabled)
    {
        if (!IsReady())
            return 0;
        g_core->GetAudio()->EnableSP0256(enabled != 0);
        return 1;
    }

    GCW_EXPORT int gcw_set_video_chip(int chip)
    {
        if (!IsReady() || chip < GC_VIDEO_CHIP_AUTO || chip > GC_VIDEO_CHIP_F18A)
            return 0;
        g_core->SetVideoChip(static_cast<GC_VideoChip>(chip));
        return 1;
    }

    GCW_EXPORT int gcw_get_video_chip()
    {
        return IsReady() ? static_cast<int>(g_core->GetVideoChip()) : -1;
    }

    GCW_EXPORT int gcw_set_voice_module_type(int type)
    {
        if (!IsReady() || type < 0 || type > 2)
            return 0;
        g_core->GetAudio()->SetVoiceModuleType(type);
        return 1;
    }

    GCW_EXPORT u32 gcw_disassemble(u16 address, u8* output, u32 size)
    {
        const u32 required = 73;
        if (!IsReady() || !output || size < required)
            return 0;
        GC_Disassembler_Record record;
        memset(&record, 0, sizeof(record));
        g_core->GetProcessor()->PopulateDisassemblerRecord(&record, address);
        output[0] = static_cast<u8>(record.size);
        output[1] = record.jump ? 1 : 0;
        for (int index = 0; index < 7; ++index)
            output[2 + index] = record.opcodes[index];
        memcpy(output + 9, record.name, 63);
        output[72] = 0;
        return required;
    }
    GCW_EXPORT u32 gcw_get_master_clock(u32* output, u32 size)
    {
        if (!IsReady() || !output || size < 2)
            return 0;
        const u64 cycles = g_core->GetMasterClockCycles();
        output[0] = static_cast<u32>(cycles & 0xFFFFFFFFULL);
        output[1] = static_cast<u32>(cycles >> 32);
        return 2;
    }

    GCW_EXPORT int gcw_get_last_step_interrupt()
    {
        return g_last_step_interrupt;
    }

    GCW_EXPORT int gcw_get_region()
    {
        if (!IsReady())
            return Region_NTSC;
        GC_RuntimeInfo info;
        g_core->GetRuntimeInfo(info);
        return info.region;
    }

    GCW_EXPORT u32 gcw_read_ram(u16 address, u8* output, u32 size)
    {
        if (!IsReady() || !output)
            return 0;
        const u32 available = 0x10000u - static_cast<u32>(address);
        const u32 count = size < available ? size : available;
        for (u32 index = 0; index < count; ++index)
            output[index] = g_core->GetMemory()->DebugRetrieve(
                static_cast<u16>(address + index));
        return count;
    }

    GCW_EXPORT u32 gcw_read_adam_main_ram(u16 address, u8* output, u32 size)
    {
        if (!IsReady() || !output)
            return 0;
        u8* ram = g_core->GetAdam()->GetMainRAM();
        if (!ram)
            return 0;
        const u32 available = 0x10000u - static_cast<u32>(address);
        const u32 count = size < available ? size : available;
        memcpy(output, ram + address, count);
        return count;
    }

    GCW_EXPORT u32 gcw_read_adam_expansion_ram(u16 address, u8* output, u32 size)
    {
        if (!IsReady() || !output)
            return 0;
        u8* ram = g_core->GetAdam()->GetExpansionRAM();
        if (!ram)
            return 0;
        const u32 available = 0x10000u - static_cast<u32>(address);
        const u32 count = size < available ? size : available;
        memcpy(output, ram + address, count);
        return count;
    }

    GCW_EXPORT u32 gcw_read_vram(u16 address, u8* output, u32 size)
    {
        if (!IsReady() || !output || address >= 0x4000)
            return 0;
        const u32 available = 0x4000u - static_cast<u32>(address);
        const u32 count = size < available ? size : available;
        memcpy(output, g_core->GetVideo()->GetVRAM() + address, count);
        return count;
    }

    GCW_EXPORT u32 gcw_get_vdp_registers(u8* output, u32 size)
    {
        if (!IsReady() || !output)
            return 0;
        const u32 count = size < 8 ? size : 8;
        memcpy(output, g_core->GetVideo()->GetRegisters(), count);
        return count;
    }

    GCW_EXPORT int gcw_set_execute_breakpoint(u16 address)
    {
        if (!IsReady())
            return 0;
        return g_core->GetProcessor()->AddBreakpoint(address) ? 1 : 0;
    }

    GCW_EXPORT int gcw_clear_execute_breakpoint(u16 address)
    {
        if (!IsReady())
            return 0;
        g_core->GetProcessor()->RemoveBreakpoint(
            Processor::GC_BREAKPOINT_TYPE_ROMRAM,
            address);
        return 1;
    }

    GCW_EXPORT int gcw_clear_all_breakpoints()
    {
        if (!IsReady())
            return 0;
        g_core->GetProcessor()->ResetBreakpoints();
        return 1;
    }
}
