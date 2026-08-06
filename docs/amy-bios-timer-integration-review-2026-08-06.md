# Amy and ColecoVision BIOS TIMER Integration Review

Date: 2026-08-06

## Decision

Keep Amy's existing named static timers as the normal language feature. They preserve the useful commercial behavior of OS-7 timers without exposing its dynamic list allocation, movable auxiliary storage, numeric handles, or unsafe main/NMI mutation windows.

```basic
timer EnemyStep every 5 ticks
timer DoorClose after 120 ticks stopped

start timer DoorClose
if timer EnemyStep then MoveEnemies
if timer DoorClose then CloseDoor
```

Do not silently translate these statements to BIOS `StartTimer`, `TestTimer`, or `StopTimer`. That would change RAM ownership and introduce dynamic allocation whose safety depends on exactly when the main program and NMI touch the list.

## Historical model

The official OS-7 interface stores `TimerList` at `$73D3` and `TimerAux` at `$73D5`. Each list entry is three bytes:

- byte 0 contains byte/word, end-of-list, inactive, repeating, and expired flags;
- bytes 1-2 contain an 8-bit counter/reload, a 16-bit one-shot count, or a pointer to four bytes of auxiliary storage for a repeating 16-bit timer.

The direct vectors are `InitTimers=$1FC7`, `StopTimer=$1FCA`, `StartTimer=$1FCD`, `TestTimer=$1FD0`, and `RunTimers=$1FD3`. Parameter-block wrappers exist at `$1F9A-$1FA3`.

Commercial ROMs typically initialize list and auxiliary RAM, call `RunTimers` from their frame/NMI path, start one-shot or repeating timers from game code, and poll expiration with `TestTimer`. The commercial audit found this complete shape in 30 of 163 unique ROM images. Cabbage Patch Kids Picture Show was observed executing the complete lifecycle under GearColeco.

## Commercial allocation patterns

Only the BIOS pointer words have fixed addresses. Timer records and repeating-word auxiliary data live in cartridge-owned RAM selected by each game:

| Game | Timer list | Auxiliary start | Observed start |
|---|---:|---:|---|
| Cabbage Patch Kids Picture Show | `$703E` | `$7045` | repeating, 1 tick |
| Linking Logic | `$70D4` | `$70D8` | repeating, 1 tick |
| Sammy Lightfoot | `$7046` | `$707E` | repeating, 15 ticks |
| Threshold | `$7043` | `$706A` | repeating, 1 tick |
| Tunnels & Trolls demo | `$70C2` | `$0000` | one-shot, 240 ticks |

Sammy Lightfoot was observed testing timer index 11, demonstrating that some games maintained many concurrent BIOS records. Tunnels & Trolls could pass no auxiliary area because its observed timer was a one-shot word timer and therefore needed no movable repeating-word storage.

This confirms that Amy must account for timer bytes through its normal user-RAM allocator. Reserving one universal BIOS data range would waste RAM and could collide with imported game layouts.

## Amy memory ownership

Amy allocates each named timer in generated user RAM below `$73B8`:

| State | Bytes | Purpose |
|---|---:|---|
| count | 2 | remaining VBlank ticks |
| reload | 2 | repeating interval |
| signal | 1 | pending expiration |
| active | 1 | update enabled |

The BIOS-owned pointers at `$73D3-$73D6` are not initialized, cleared, or used by Amy timers. This separation permits BIOS routines and Amy runtime state to exist in the same memory map without accidental overlap. It does **not** make an isolated inline `call RunTimers` valid: custom ASM must initialize and own a BIOS timer list before calling any BIOS timer operation.

## NMI contract

Amy updates declared timers once in its generated NMI. A tick means one processed VBlank, normally 60 Hz NTSC or 50 Hz PAL. Timers pause when NMI is disabled or when a guarded critical section intentionally skips normal NMI work. This matches the BIOS model, where time advances only when the cartridge calls `RunTimers`.

Expiration is a consumed boolean signal, like the BIOS expired flag. If several periods pass before game code tests a repeating timer, they coalesce into one pending event rather than queueing an unbounded number of callbacks.

`start timer` and `stop timer` now make the timer inactive before changing its 16-bit count or signal. A restart reactivates only after all state is coherent. This closes a race where NMI could previously decrement a half-written count or set a signal between `stop timer` clearing the signal and disabling the timer.

## What not to expose by default

- Numeric timer indexes returned by a dynamic allocator.
- User callbacks executed directly from NMI.
- Implicit calls to BIOS `RunTimers` when no BIOS list was initialized.
- Mutable runtime periods in the first version; named intervals remain constants.
- Claims that ticks are wall-clock time when NMI work can be intentionally paused.

## Possible later improvements

1. Reduce each static timer from six RAM bytes to three or four by keeping the constant reload value in ROM and packing active/signal flags. This is an internal ABI change and needs ROM-size plus compatibility measurements.
2. Add region-aware duration syntax only if its rounding behavior is specified, for example seconds converted to 60 NTSC or 50 PAL ticks.
3. Add an explicit advanced BIOS-timer interoperability feature only when a real imported program requires numeric handles and dynamic timer lifetimes.
4. Add debugger visibility for named timer count, active, and pending state.

## Verification

- `node tools/test-amy-timer-codegen.mjs`
- `node tools/test-amy-timer-rom.mjs off`
- `node tools/test-amy-timer-rom.mjs safe`
- `node tools/test-amy-timer-rom.mjs balanced`
- `node tools/test-amy-timer-rom.mjs aggressive`
- `node tools/test-amy-timer-rom.mjs experimental`
- `node tools/test-amy-timer-safety-rom.mjs <profile>`

The visual ROM test reaches Timer Lab's PASS state. The safety ROM adds 17 assertions for early/periodic expiration, one-shot behavior, pending-signal clearing, active restart, independent timers, NMI-off pause semantics, and one-tick intervals.
