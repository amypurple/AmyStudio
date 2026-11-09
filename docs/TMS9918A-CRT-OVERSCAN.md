# TMS9918A CRT overscan

This note separates the TMS9918A video signal from the behaviour of a consumer CRT. They are related, but they are not interchangeable.

## TMS9918A picture areas

- The programmable active picture is 256 by 192 pixels.
- Register 7 bits 0-3 select the backdrop colour. The VDP emits this colour around the active picture when display timing is in a visible border interval.
- An NTSC scan contains 342 pixel-clock periods and an NTSC frame contains 262 scan lines. The complete signal also contains horizontal and vertical blanking, synchronisation and colour-burst intervals; these are not drawable pixels.
- The Texas Instruments horizontal timing diagram identifies the active display, right border, blanking, sync, colour burst, left blanking and left border as distinct intervals.
- The status interrupt flag is set after the final line of the 192-line active display, not after the complete analogue frame.

GearColeco offers useful display crops rather than exposing every composite-signal interval:

| Presentation | Horizontal | Vertical, NTSC | Meaning |
| --- | ---: | ---: | --- |
| Active only | 256 | 192 | No border |
| Top and bottom | 256 | 240 | 24 backdrop lines above and below |
| Full 284 | 284 | 240 | 14 backdrop pixels left/right and 24 lines above/below |
| Full 320 | 320 | 240 | 32 backdrop pixels left/right and 24 lines above/below |

For PAL, GearColeco uses 48 backdrop lines above and below, producing 288 displayed lines. The 284- and 320-wide choices are emulator presentation windows; they are not claims that the complete analogue scan has only 284 or 320 clock periods.

## What CRT overscan means

A consumer television normally enlarges and positions the raster so that its edges fall behind the cabinet mask. Manufacturing tolerances and service adjustments vary between sets. Therefore there is no single exact number of ColecoVision pixels that every CRT hides.

The historical design context nevertheless gives us a useful nominal value. A discussion relaying information from TMS9918 designer Richard F. Miller explains that all 256 pixels are technically generated, while the roughly 10% overscan common to televisions of the period cut approximately **8 active pixels from each side**. This matches the practical rule used by TMS9918 programmers: keep essential text and objects away from the extreme left and right columns even though a monitor or a better-adjusted television may reveal them.

The Amy Studio CRT view consequently applies these operations in order:

1. Build a 284-wide GearColeco-style raster: 14 backdrop pixels, 256 active pixels and 14 backdrop pixels.
2. Add 24 backdrop lines above and below for NTSC, or 48 for PAL.
3. For the nominal period-TV profile, discard the 14-pixel generated border and approximately 8 active pixels on each horizontal side. About 240 of the 256 active columns remain visible.
4. Apply a two-axis spherical approximation: horizontal strips bend the vertical edges, then vertical strips bow horizontal lines near the sides. Clip the result with a rounded glass/mask boundary.
5. Add subdued 192-line beam attenuation, a faint consumer-TV shadow/slot-mask pattern, edge vignetting and subtle analogue left-edge ringing. The mask is intentionally weaker than a modern close-up CRT shader because the capture represents normal viewing distance.

The last three effects are visual approximations. They must never alter the emulator framebuffer, VRAM, debugger hashes or deterministic tests.

## Early Clock is not CRT overscan

Sprite attribute colour bit 7 is `EC`, the TMS9918A **Early Clock** bit. It moves that sprite 32 active pixels to the left. It exists so a sprite can enter or leave the left side smoothly despite the unsigned 0-255 X coordinate. Pixels shifted before active X=0 are clipped; they do not become visible in the border merely because an emulator or television exposes more overscan.

The optional left-edge glow in Amy Studio represents composite-video ringing or horizontal phase error. It is deliberately subtle and is not an emulation of `EC`.

## Sources

- [Texas Instruments TMS9918A/TMS9928A/TMS9929A Video Display Processors Data Manual, November 1982](https://www.bitsavers.org/components/ti/TMS9900/TMS9918A_TMS9928A_TMS9929A_Video_Display_Processors_Data_Manual_Nov82.pdf), especially figures 5-8 and 5-9.
- [ColecoVision Technical Manual](https://www.colecovisionzone.com/downloads/cv_Technical_Manual.pdf), video-output circuitry and TMS9918A connections.
- [Sean Young's TMS9918A description](https://github.com/cbmeeks/TMS9918/blob/master/tms9918a.txt), active area, backdrop and Early Clock behaviour.
- [MSX Resource Center discussion of information from TMS9918 designer Richard F. Miller](https://www.msx.org/nl/node/8871), including the period-TV estimate of about eight active pixels lost on each horizontal side.
- [GearColeco Libretro documentation](https://docs.libretro.com/library/gearcoleco/), user-facing overscan choices.
- [Libretro CRT-Royale documentation](https://docs.libretro.com/shader/crt_royale/), distinction between spherical, cylindrical and flat CRT geometry and between shadow, slot and aperture-grille masks.
- GearColeco source in `studio/vendor/Gearcoleco-main/src/definitions.h` and `TMS9918A.cpp`, which defines the 14/32 horizontal and 24/48 vertical presentation borders used above.
