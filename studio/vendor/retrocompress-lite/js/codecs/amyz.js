/**
 * AMYZ Compression Codec (2026)
 * Format by Amy (AmyPurple), continuing her DAN1-DAN3 line, with Claude.
 * Ideas from ZX0 (Einar Saukas: optimal parser, implicit-state grammar, repeat offset)
 * and Exomizer (Magnus Lind: adaptive offset buckets).
 *
 * Stream: ZX0-style grammar, 4-bit bucket index, contiguous buckets from offset 1 (SPEC.md).
 * Modes:
 *  - table mode: the table is 15 bytes, byte k = widths[k] + 1; the decoder computes the bases
 *    (z80/amyz_vram.asm). The fit tries three start tables and keeps the smallest result.
 *  - tiny mode: no table; the fixed "log2" table widths[k] = k (offset = 2^k + k bits),
 *    read by z80/amyzt_vram.asm without any table.
 * Needs amyz_core.js next to this file.
 *
 * API:
 *   fitGroupAMYZ([data...])     -> {widths, table (15 B), streams, size}  (table mode)
 *   compressTable(data, table)  -> stream ;  decompressTable(z, table) -> data
 *   compressTiny(data)          -> stream ;  decompressTiny(z) -> data
 *   expandTable(t15)            -> 45-byte expanded table for the fast decoders
 *                                  (z80/amyzf_vram.asm, z80/amyzf_ram.asm)
 *
 * Expanded table (45 bytes), entry k = 0..14 at offset 3k:
 *   byte 3k, 3k+1 : (1 - base[k]) mod 65536, little endian
 *   byte 3k+2     : widths[k]
 * with base[0] = 1, base[k+1] = base[k] + 2^widths[k].
 */
import { optimize, chainToTokens, encodeTokens, decodeStream, widthsToBases, fitGroup } from './amyz_core.js';

export const LOG2_WIDTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
// start tables for the fit: the classic default, the log2 table, and a table fitted on the whole corpus
const STARTS = [
    [0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    LOG2_WIDTHS,
    [0, 2, 1, 0, 3, 4, 4, 5, 5, 7, 3, 3, 8, 10, 13],
];
const tab = (w) => ({ widths: Array.from(w), bases: widthsToBases(Array.from(w)) });
const asU8 = (d) => (d instanceof Uint8Array ? d : new Uint8Array(d));

export const table15 = (widths) => Uint8Array.from(widths, (w) => w + 1);
export const widthsOf = (t15) => Array.from(t15.subarray ? t15.subarray(0, 15) : t15.slice(0, 15), (b) => b - 1);

function encodeWith(d, t) { return encodeTokens(d, d.length ? chainToTokens(optimize(d, t)) : [], t); }

export function fitGroupAMYZ(datas) {
    datas = datas.map(asU8); let best = null;
    for (const s of STARTS) {
        const r = fitGroup(datas, 8, tab(s));
        if (best === null || r.size < best.size) best = r;
    }
    return { widths: best.widths, table: table15(best.widths), streams: best.streams, size: best.size };
}
export const compressTable = (data, t15) => encodeWith(asU8(data), tab(widthsOf(t15)));
export const decompressTable = (z, t15) => { const t = tab(widthsOf(t15)); return decodeStream(asU8(z), t.widths, t.bases, 0); };
export const compressTiny = (data) => encodeWith(asU8(data), tab(LOG2_WIDTHS));
export const decompressTiny = (z) => { const t = tab(LOG2_WIDTHS); return decodeStream(asU8(z), t.widths, t.bases, 0); };

export function expandTable(t15) {
    const w = widthsOf(asU8(t15)); const out = new Uint8Array(45); let base = 1;
    for (let k = 0; k < 15; k++) {
        const v = (1 - base) & 0xffff;
        out[3 * k] = v & 0xff; out[3 * k + 1] = v >> 8; out[3 * k + 2] = w[k];
        base += 2 ** w[k];
    }
    return out;
}

export class AMYZCodec {
    /** options.table (15 B): table mode; options.tiny: tiny mode; neither: self-contained, 15-byte table + stream */
    async compress(data, options = {}) {
        if (options.tiny) return compressTiny(data);
        if (options.table) return compressTable(data, options.table);
        const g = fitGroupAMYZ([data]); const out = new Uint8Array(15 + g.streams[0].length);
        out.set(g.table, 0); out.set(g.streams[0], 15); return out;
    }
    async decompress(data, options = {}) {
        const z = asU8(data);
        if (options.tiny) return decompressTiny(z);
        if (options.table) return decompressTable(z, options.table);
        return decompressTable(z.subarray(15), z.subarray(0, 15));
    }
    static fitGroup(datas) { return fitGroupAMYZ(datas); }
}
export default AMYZCodec;
