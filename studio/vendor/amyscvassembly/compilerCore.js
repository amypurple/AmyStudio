import { Directive, Instruction, Lexer, NumberParser, Operand } from "./parserCore.js";
import { Z80Optimizer } from "./optimizerCore.js?v=20260707-async-example-index";

let compiledBinary = null;
let outputFilename = "build/output.col";
let compileLog = [];
const compilerUiState = {
  optimizerEnabled: false,
  optimizerConfig: null,
  targetPlatform: "raw"
};

function log(message, level = "info") {
  compileLog.push({ level, message: String(message) });
}

globalThis.__amyscvassembly_log = log;

const emptyClassList = { add() {}, remove() {} };
const document = {
  getElementById(id) {
    if (id === "optimizer-toggle") return { checked: compilerUiState.optimizerEnabled };
    if (id === "target-platform") return { value: compilerUiState.targetPlatform };
    return { checked: false, value: "", textContent: "", classList: emptyClassList };
  }
};

function getPlatformConfig() {
  return { description: "Raw binary", packager: { mode: null } };
}

function validateColecoHeader() {
  return { valid: true, usesDefaultScreen: false };
}

function extractFilename(path) {
  return String(path || "").replace(/\\/g, "/").split("/").pop() || "output";
}

const DEBUG_MODE = false;
const defaultOptimizerConfig = {
  peephole: true,
  deadCode: false,
  branchShortening: false,
  aZeroToXor: false,
  rstVectors: false,
  inlineRoutines: false
};
const symbolsOutput = { innerHTML: "" };
function formatAssemblerOperand(operand) {
  if (!operand) return "";
  const value = operand.value ?? "";
  if (operand.type === "memory") {
    return `(${value})`;
  }
  if (operand.type === "string") {
    return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return String(value);
}

function serializeAssemblerToken(token) {
  if (token instanceof Instruction) {
    const label = token.label ? `${token.label}:` : "";
    const mnemonic = String(token.mnemonic || "");
    const operands = (token.operands || []).map(formatAssemblerOperand).join(",");
    const body = operands ? `${mnemonic} ${operands}` : mnemonic;
    if (label && body) return `${label}\n    ${body}`;
    if (label) return label;
    return body ? `    ${body}` : "";
  }
  if (token instanceof Directive) {
    const label = token.label ? `${token.label}:` : "";
    const bareLabel = token.label ? String(token.label) : "";
    const name = String(token.name || "").toLowerCase();
    if (name === "label") {
      return label;
    }
    const operands = (token.operands || []).map(formatAssemblerOperand).join(",");
    const body = operands ? `${name} ${operands}` : name;
    if (bareLabel && body) return `${bareLabel} ${body}`;
    if (label) return label;
    return body ? `    ${body}` : "";
  }
  return String(token || "");
}

function serializeAssemblerTokens(tokens) {
  return (tokens || []).map(serializeAssemblerToken).filter(line => line !== "").join("\n") + "\n";
}

const Z80_OPCODES = {
            'nop': [0x00], 'ld_bc,imm16': [0x01], 'ld_(bc),a': [0x02], 'inc_bc': [0x03], 'inc_b': [0x04], 'dec_b': [0x05], 'ld_b,imm8': [0x06], 'rlca': [0x07],
            'ex_af,af': [0x08], 'ex_af,af\'': [0x08], 'add_hl,bc': [0x09], 'ld_a,(bc)': [0x0A], 'dec_bc': [0x0B], 'inc_c': [0x0C], 'dec_c': [0x0D], 'ld_c,imm8': [0x0E], 'rrca': [0x0F],
            'djnz_rel8': [0x10], 'ld_de,imm16': [0x11], 'ld_(de),a': [0x12], 'inc_de': [0x13], 'inc_d': [0x14], 'dec_d': [0x15], 'ld_d,imm8': [0x16], 'rla': [0x17],
            'jr_rel8': [0x18], 'add_hl,de': [0x19], 'ld_a,(de)': [0x1A], 'dec_de': [0x1B], 'inc_e': [0x1C], 'dec_e': [0x1D], 'ld_e,imm8': [0x1E], 'rra': [0x1F],
            'jr_nz,rel8': [0x20], 'ld_hl,imm16': [0x21], 'ld_(imm16),hl': [0x22], 'inc_hl': [0x23], 'inc_h': [0x24], 'dec_h': [0x25], 'ld_h,imm8': [0x26], 'daa': [0x27],
            'jr_z,rel8': [0x28], 'add_hl,hl': [0x29], 'ld_hl,(imm16)': [0x2A], 'dec_hl': [0x2B], 'inc_l': [0x2C], 'dec_l': [0x2D], 'ld_l,imm8': [0x2E], 'cpl': [0x2F],
            'jr_nc,rel8': [0x30], 'ld_sp,imm16': [0x31], 'ld_(imm16),a': [0x32], 'inc_sp': [0x33], 'inc_(hl)': [0x34], 'dec_(hl)': [0x35], 'ld_(hl),imm8': [0x36], 'scf': [0x37],
            'jr_c,rel8': [0x38], 'add_hl,sp': [0x39], 'ld_a,(imm16)': [0x3A], 'dec_sp': [0x3B], 'inc_a': [0x3C], 'dec_a': [0x3D], 'ld_a,imm8': [0x3E], 'ccf': [0x3F],
            'ld_b,b': [0x40], 'ld_b,c': [0x41], 'ld_b,d': [0x42], 'ld_b,e': [0x43], 'ld_b,h': [0x44], 'ld_b,l': [0x45], 'ld_b,(hl)': [0x46], 'ld_b,a': [0x47],
            'ld_c,b': [0x48], 'ld_c,c': [0x49], 'ld_c,d': [0x4A], 'ld_c,e': [0x4B], 'ld_c,h': [0x4C], 'ld_c,l': [0x4D], 'ld_c,(hl)': [0x4E], 'ld_c,a': [0x4F],
            'ld_d,b': [0x50], 'ld_d,c': [0x51], 'ld_d,d': [0x52], 'ld_d,e': [0x53], 'ld_d,h': [0x54], 'ld_d,l': [0x55], 'ld_d,(hl)': [0x56], 'ld_d,a': [0x57],
            'ld_e,b': [0x58], 'ld_e,c': [0x59], 'ld_e,d': [0x5A], 'ld_e,e': [0x5B], 'ld_e,h': [0x5C], 'ld_e,l': [0x5D], 'ld_e,(hl)': [0x5E], 'ld_e,a': [0x5F],
            'ld_h,b': [0x60], 'ld_h,c': [0x61], 'ld_h,d': [0x62], 'ld_h,e': [0x63], 'ld_h,h': [0x64], 'ld_h,l': [0x65], 'ld_h,(hl)': [0x66], 'ld_h,a': [0x67],
            'ld_l,b': [0x68], 'ld_l,c': [0x69], 'ld_l,d': [0x6A], 'ld_l,e': [0x6B], 'ld_l,h': [0x6C], 'ld_l,l': [0x6D], 'ld_l,(hl)': [0x6E], 'ld_l,a': [0x6F],
            'ld_(hl),b': [0x70], 'ld_(hl),c': [0x71], 'ld_(hl),d': [0x72], 'ld_(hl),e': [0x73], 'ld_(hl),h': [0x74], 'ld_(hl),l': [0x75], 'halt': [0x76], 'ld_(hl),a': [0x77],
            'ld_a,b': [0x78], 'ld_a,c': [0x79], 'ld_a,d': [0x7A], 'ld_a,e': [0x7B], 'ld_a,h': [0x7C], 'ld_a,l': [0x7D], 'ld_a,(hl)': [0x7E], 'ld_a,a': [0x7F],
            'add_a,b': [0x80], 'add_a,c': [0x81], 'add_a,d': [0x82], 'add_a,e': [0x83], 'add_a,h': [0x84], 'add_a,l': [0x85], 'add_a,(hl)': [0x86], 'add_a,a': [0x87],
            'adc_a,b': [0x88], 'adc_a,c': [0x89], 'adc_a,d': [0x8A], 'adc_a,e': [0x8B], 'adc_a,h': [0x8C], 'adc_a,l': [0x8D], 'adc_a,(hl)': [0x8E], 'adc_a,a': [0x8F],
            'sub_b': [0x90], 'sub_c': [0x91], 'sub_d': [0x92], 'sub_e': [0x93], 'sub_h': [0x94], 'sub_l': [0x95], 'sub_(hl)': [0x96], 'sub_a': [0x97],
            'sbc_a,b': [0x98], 'sbc_a,c': [0x99], 'sbc_a,d': [0x9A], 'sbc_a,e': [0x9B], 'sbc_a,h': [0x9C], 'sbc_a,l': [0x9D], 'sbc_a,(hl)': [0x9E], 'sbc_a,a': [0x9F],
            'and_b': [0xA0], 'and_c': [0xA1], 'and_d': [0xA2], 'and_e': [0xA3], 'and_h': [0xA4], 'and_l': [0xA5], 'and_(hl)': [0xA6], 'and_a': [0xA7],
            'xor_b': [0xA8], 'xor_c': [0xA9], 'xor_d': [0xAA], 'xor_e': [0xAB], 'xor_h': [0xAC], 'xor_l': [0xAD], 'xor_(hl)': [0xAE], 'xor_a': [0xAF],
            'or_b': [0xB0], 'or_c': [0xB1], 'or_d': [0xB2], 'or_e': [0xB3], 'or_h': [0xB4], 'or_l': [0xB5], 'or_(hl)': [0xB6], 'or_a': [0xB7],
            'cp_b': [0xB8], 'cp_c': [0xB9], 'cp_d': [0xBA], 'cp_e': [0xBB], 'cp_h': [0xBC], 'cp_l': [0xBD], 'cp_(hl)': [0xBE], 'cp_a': [0xBF],
            'ret_nz': [0xC0], 'pop_bc': [0xC1], 'jp_nz,imm16': [0xC2], 'jp_imm16': [0xC3], 'call_nz,imm16': [0xC4], 'push_bc': [0xC5], 'add_a,imm8': [0xC6], 'rst_00h': [0xC7],
            'ret_z': [0xC8], 'ret': [0xC9], 'jp_z,imm16': [0xCA], 'cb_prefix': [0xCB], 'call_z,imm16': [0xCC], 'call_imm16': [0xCD], 'adc_a,imm8': [0xCE], 'rst_08h': [0xCF],
            'ret_nc': [0xD0], 'pop_de': [0xD1], 'jp_nc,imm16': [0xD2], 'out_(imm8),a': [0xD3], 'call_nc,imm16': [0xD4], 'push_de': [0xD5], 'sub_imm8': [0xD6], 'rst_10h': [0xD7],
            'ret_c': [0xD8], 'exx': [0xD9], 'jp_c,imm16': [0xDA], 'in_a,(imm8)': [0xDB], 'call_c,imm16': [0xDC], 'dd_prefix': [0xDD], 'sbc_a,imm8': [0xDE], 'rst_18h': [0xDF],
            'ret_po': [0xE0], 'pop_hl': [0xE1], 'jp_po,imm16': [0xE2], 'ex_(sp),hl': [0xE3], 'call_po,imm16': [0xE4], 'push_hl': [0xE5], 'and_imm8': [0xE6], 'rst_20h': [0xE7],
            'ret_pe': [0xE8], 'jp_(hl)': [0xE9], 'jp_pe,imm16': [0xEA], 'ex_de,hl': [0xEB], 'call_pe,imm16': [0xEC], 'ed_prefix': [0xED], 'xor_imm8': [0xEE], 'rst_28h': [0xEF],
            'ret_p': [0xF0], 'pop_af': [0xF1], 'jp_p,imm16': [0xF2], 'di': [0xF3], 'call_p,imm16': [0xF4], 'push_af': [0xF5], 'or_imm8': [0xF6], 'rst_30h': [0xF7],
            'ret_m': [0xF8], 'ld_sp,hl': [0xF9], 'jp_m,imm16': [0xFA], 'ei': [0xFB], 'call_m,imm16': [0xFC], 'fd_prefix': [0xFD], 'cp_imm8': [0xFE], 'rst_38h': [0xFF],
            
            // Enhanced RST instructions
            'rst_0': [0xC7], 'rst_8': [0xCF], 'rst_16': [0xD7], 'rst_24': [0xDF], 'rst_32': [0xE7], 'rst_40': [0xEF], 'rst_48': [0xF7], 'rst_56': [0xFF],
            
            // ED prefix opcodes (complete set)
            'in_b,(c)': [0xED, 0x40], 'out_(c),b': [0xED, 0x41], 'sbc_hl,bc': [0xED, 0x42], 'ld_(imm16),bc': [0xED, 0x43], 'neg': [0xED, 0x44], 'retn': [0xED, 0x45], 'im_0': [0xED, 0x46], 'ld_i,a': [0xED, 0x47],
            'in_c,(c)': [0xED, 0x48], 'out_(c),c': [0xED, 0x49], 'adc_hl,bc': [0xED, 0x4A], 'ld_bc,(imm16)': [0xED, 0x4B], 'neg_undoc1': [0xED, 0x4C], 'reti': [0xED, 0x4D], 'im_0/1': [0xED, 0x4E], 'ld_r,a': [0xED, 0x4F],
            'in_d,(c)': [0xED, 0x50], 'out_(c),d': [0xED, 0x51], 'sbc_hl,de': [0xED, 0x52], 'ld_(imm16),de': [0xED, 0x53], 'neg_undoc2': [0xED, 0x54], 'retn_undoc1': [0xED, 0x55], 'im_1': [0xED, 0x56], 'ld_a,i': [0xED, 0x57],
            'in_e,(c)': [0xED, 0x58], 'out_(c),e': [0xED, 0x59], 'adc_hl,de': [0xED, 0x5A], 'ld_de,(imm16)': [0xED, 0x5B], 'neg_undoc3': [0xED, 0x5C], 'reti_undoc': [0xED, 0x5D], 'im_2': [0xED, 0x5E], 'ld_a,r': [0xED, 0x5F],
            'in_h,(c)': [0xED, 0x60], 'out_(c),h': [0xED, 0x61], 'sbc_hl,hl': [0xED, 0x62], 'ld_(imm16),hl_alt': [0xED, 0x63], 'neg_undoc4': [0xED, 0x64], 'retn_undoc2': [0xED, 0x65], 'im_0_alt': [0xED, 0x66], 'rrd': [0xED, 0x67],
            'in_l,(c)': [0xED, 0x68], 'out_(c),l': [0xED, 0x69], 'adc_hl,hl': [0xED, 0x6A], 'ld_hl,(imm16)_alt': [0xED, 0x6B], 'neg_undoc5': [0xED, 0x6C], 'retn_undoc3': [0xED, 0x6D], 'im_0/1_alt': [0xED, 0x6E], 'rld': [0xED, 0x6F],
            'in_(c)': [0xED, 0x70], 'out_(c),0': [0xED, 0x71], 'sbc_hl,sp': [0xED, 0x72], 'ld_(imm16),sp': [0xED, 0x73], 'neg_undoc6': [0xED, 0x74], 'retn_undoc4': [0xED, 0x75], 'im_1_alt': [0xED, 0x76], 'nop_ed1': [0xED, 0x77],
            'in_a,(c)': [0xED, 0x78], 'out_(c),a': [0xED, 0x79], 'adc_hl,sp': [0xED, 0x7A], 'ld_sp,(imm16)': [0xED, 0x7B], 'neg_undoc7': [0xED, 0x7C], 'reti_undoc2': [0xED, 0x7D], 'im_2_alt': [0xED, 0x7E], 'nop_ed2': [0xED, 0x7F],
            'ldi': [0xED, 0xA0], 'cpi': [0xED, 0xA1], 'ini': [0xED, 0xA2], 'outi': [0xED, 0xA3],
            'ldd': [0xED, 0xA8], 'cpd': [0xED, 0xA9], 'ind': [0xED, 0xAA], 'outd': [0xED, 0xAB],
            'ldir': [0xED, 0xB0], 'cpir': [0xED, 0xB1], 'inir': [0xED, 0xB2], 'otir': [0xED, 0xB3],
            'lddr': [0xED, 0xB8], 'cpdr': [0xED, 0xB9], 'indr': [0xED, 0xBA], 'otdr': [0xED, 0xBB],
            
            // CB prefix opcodes - Rotate and shift instructions
            'rlc_b': [0xCB, 0x00], 'rlc_c': [0xCB, 0x01], 'rlc_d': [0xCB, 0x02], 'rlc_e': [0xCB, 0x03], 'rlc_h': [0xCB, 0x04], 'rlc_l': [0xCB, 0x05], 'rlc_(hl)': [0xCB, 0x06], 'rlc_a': [0xCB, 0x07],
            'rrc_b': [0xCB, 0x08], 'rrc_c': [0xCB, 0x09], 'rrc_d': [0xCB, 0x0A], 'rrc_e': [0xCB, 0x0B], 'rrc_h': [0xCB, 0x0C], 'rrc_l': [0xCB, 0x0D], 'rrc_(hl)': [0xCB, 0x0E], 'rrc_a': [0xCB, 0x0F],
            'rl_b': [0xCB, 0x10], 'rl_c': [0xCB, 0x11], 'rl_d': [0xCB, 0x12], 'rl_e': [0xCB, 0x13], 'rl_h': [0xCB, 0x14], 'rl_l': [0xCB, 0x15], 'rl_(hl)': [0xCB, 0x16], 'rl_a': [0xCB, 0x17],
            'rr_b': [0xCB, 0x18], 'rr_c': [0xCB, 0x19], 'rr_d': [0xCB, 0x1A], 'rr_e': [0xCB, 0x1B], 'rr_h': [0xCB, 0x1C], 'rr_l': [0xCB, 0x1D], 'rr_(hl)': [0xCB, 0x1E], 'rr_a': [0xCB, 0x1F],
            'sla_b': [0xCB, 0x20], 'sla_c': [0xCB, 0x21], 'sla_d': [0xCB, 0x22], 'sla_e': [0xCB, 0x23], 'sla_h': [0xCB, 0x24], 'sla_l': [0xCB, 0x25], 'sla_(hl)': [0xCB, 0x26], 'sla_a': [0xCB, 0x27],
            'sra_b': [0xCB, 0x28], 'sra_c': [0xCB, 0x29], 'sra_d': [0xCB, 0x2A], 'sra_e': [0xCB, 0x2B], 'sra_h': [0xCB, 0x2C], 'sra_l': [0xCB, 0x2D], 'sra_(hl)': [0xCB, 0x2E], 'sra_a': [0xCB, 0x2F],
            'sll_b': [0xCB, 0x30], 'sll_c': [0xCB, 0x31], 'sll_d': [0xCB, 0x32], 'sll_e': [0xCB, 0x33], 'sll_h': [0xCB, 0x34], 'sll_l': [0xCB, 0x35], 'sll_(hl)': [0xCB, 0x36], 'sll_a': [0xCB, 0x37],
            'srl_b': [0xCB, 0x38], 'srl_c': [0xCB, 0x39], 'srl_d': [0xCB, 0x3A], 'srl_e': [0xCB, 0x3B], 'srl_h': [0xCB, 0x3C], 'srl_l': [0xCB, 0x3D], 'srl_(hl)': [0xCB, 0x3E], 'srl_a': [0xCB, 0x3F],
            
            // CB prefix - Bit test instructions
            'bit_0,b': [0xCB, 0x40], 'bit_0,c': [0xCB, 0x41], 'bit_0,d': [0xCB, 0x42], 'bit_0,e': [0xCB, 0x43], 'bit_0,h': [0xCB, 0x44], 'bit_0,l': [0xCB, 0x45], 'bit_0,(hl)': [0xCB, 0x46], 'bit_0,a': [0xCB, 0x47],
            'bit_1,b': [0xCB, 0x48], 'bit_1,c': [0xCB, 0x49], 'bit_1,d': [0xCB, 0x4A], 'bit_1,e': [0xCB, 0x4B], 'bit_1,h': [0xCB, 0x4C], 'bit_1,l': [0xCB, 0x4D], 'bit_1,(hl)': [0xCB, 0x4E], 'bit_1,a': [0xCB, 0x4F],
            'bit_2,b': [0xCB, 0x50], 'bit_2,c': [0xCB, 0x51], 'bit_2,d': [0xCB, 0x52], 'bit_2,e': [0xCB, 0x53], 'bit_2,h': [0xCB, 0x54], 'bit_2,l': [0xCB, 0x55], 'bit_2,(hl)': [0xCB, 0x56], 'bit_2,a': [0xCB, 0x57],
            'bit_3,b': [0xCB, 0x58], 'bit_3,c': [0xCB, 0x59], 'bit_3,d': [0xCB, 0x5A], 'bit_3,e': [0xCB, 0x5B], 'bit_3,h': [0xCB, 0x5C], 'bit_3,l': [0xCB, 0x5D], 'bit_3,(hl)': [0xCB, 0x5E], 'bit_3,a': [0xCB, 0x5F],
            'bit_4,b': [0xCB, 0x60], 'bit_4,c': [0xCB, 0x61], 'bit_4,d': [0xCB, 0x62], 'bit_4,e': [0xCB, 0x63], 'bit_4,h': [0xCB, 0x64], 'bit_4,l': [0xCB, 0x65], 'bit_4,(hl)': [0xCB, 0x66], 'bit_4,a': [0xCB, 0x67],
            'bit_5,b': [0xCB, 0x68], 'bit_5,c': [0xCB, 0x69], 'bit_5,d': [0xCB, 0x6A], 'bit_5,e': [0xCB, 0x6B], 'bit_5,h': [0xCB, 0x6C], 'bit_5,l': [0xCB, 0x6D], 'bit_5,(hl)': [0xCB, 0x6E], 'bit_5,a': [0xCB, 0x6F],
            'bit_6,b': [0xCB, 0x70], 'bit_6,c': [0xCB, 0x71], 'bit_6,d': [0xCB, 0x72], 'bit_6,e': [0xCB, 0x73], 'bit_6,h': [0xCB, 0x74], 'bit_6,l': [0xCB, 0x75], 'bit_6,(hl)': [0xCB, 0x76], 'bit_6,a': [0xCB, 0x77],
            'bit_7,b': [0xCB, 0x78], 'bit_7,c': [0xCB, 0x79], 'bit_7,d': [0xCB, 0x7A], 'bit_7,e': [0xCB, 0x7B], 'bit_7,h': [0xCB, 0x7C], 'bit_7,l': [0xCB, 0x7D], 'bit_7,(hl)': [0xCB, 0x7E], 'bit_7,a': [0xCB, 0x7F],
            
            // CB prefix - Bit reset instructions
            'res_0,b': [0xCB, 0x80], 'res_0,c': [0xCB, 0x81], 'res_0,d': [0xCB, 0x82], 'res_0,e': [0xCB, 0x83], 'res_0,h': [0xCB, 0x84], 'res_0,l': [0xCB, 0x85], 'res_0,(hl)': [0xCB, 0x86], 'res_0,a': [0xCB, 0x87],
            'res_1,b': [0xCB, 0x88], 'res_1,c': [0xCB, 0x89], 'res_1,d': [0xCB, 0x8A], 'res_1,e': [0xCB, 0x8B], 'res_1,h': [0xCB, 0x8C], 'res_1,l': [0xCB, 0x8D], 'res_1,(hl)': [0xCB, 0x8E], 'res_1,a': [0xCB, 0x8F],
            'res_2,b': [0xCB, 0x90], 'res_2,c': [0xCB, 0x91], 'res_2,d': [0xCB, 0x92], 'res_2,e': [0xCB, 0x93], 'res_2,h': [0xCB, 0x94], 'res_2,l': [0xCB, 0x95], 'res_2,(hl)': [0xCB, 0x96], 'res_2,a': [0xCB, 0x97],
            'res_3,b': [0xCB, 0x98], 'res_3,c': [0xCB, 0x99], 'res_3,d': [0xCB, 0x9A], 'res_3,e': [0xCB, 0x9B], 'res_3,h': [0xCB, 0x9C], 'res_3,l': [0xCB, 0x9D], 'res_3,(hl)': [0xCB, 0x9E], 'res_3,a': [0xCB, 0x9F],
            'res_4,b': [0xCB, 0xA0], 'res_4,c': [0xCB, 0xA1], 'res_4,d': [0xCB, 0xA2], 'res_4,e': [0xCB, 0xA3], 'res_4,h': [0xCB, 0xA4], 'res_4,l': [0xCB, 0xA5], 'res_4,(hl)': [0xCB, 0xA6], 'res_4,a': [0xCB, 0xA7],
            'res_5,b': [0xCB, 0xA8], 'res_5,c': [0xCB, 0xA9], 'res_5,d': [0xCB, 0xAA], 'res_5,e': [0xCB, 0xAB], 'res_5,h': [0xCB, 0xAC], 'res_5,l': [0xCB, 0xAD], 'res_5,(hl)': [0xCB, 0xAE], 'res_5,a': [0xCB, 0xAF],
            'res_6,b': [0xCB, 0xB0], 'res_6,c': [0xCB, 0xB1], 'res_6,d': [0xCB, 0xB2], 'res_6,e': [0xCB, 0xB3], 'res_6,h': [0xCB, 0xB4], 'res_6,l': [0xCB, 0xB5], 'res_6,(hl)': [0xCB, 0xB6], 'res_6,a': [0xCB, 0xB7],
            'res_7,b': [0xCB, 0xB8], 'res_7,c': [0xCB, 0xB9], 'res_7,d': [0xCB, 0xBA], 'res_7,e': [0xCB, 0xBB], 'res_7,h': [0xCB, 0xBC], 'res_7,l': [0xCB, 0xBD], 'res_7,(hl)': [0xCB, 0xBE], 'res_7,a': [0xCB, 0xBF],
            
            // CB prefix - Bit set instructions
            'set_0,b': [0xCB, 0xC0], 'set_0,c': [0xCB, 0xC1], 'set_0,d': [0xCB, 0xC2], 'set_0,e': [0xCB, 0xC3], 'set_0,h': [0xCB, 0xC4], 'set_0,l': [0xCB, 0xC5], 'set_0,(hl)': [0xCB, 0xC6], 'set_0,a': [0xCB, 0xC7],
            'set_1,b': [0xCB, 0xC8], 'set_1,c': [0xCB, 0xC9], 'set_1,d': [0xCB, 0xCA], 'set_1,e': [0xCB, 0xCB], 'set_1,h': [0xCB, 0xCC], 'set_1,l': [0xCB, 0xCD], 'set_1,(hl)': [0xCB, 0xCE], 'set_1,a': [0xCB, 0xCF],
            'set_2,b': [0xCB, 0xD0], 'set_2,c': [0xCB, 0xD1], 'set_2,d': [0xCB, 0xD2], 'set_2,e': [0xCB, 0xD3], 'set_2,h': [0xCB, 0xD4], 'set_2,l': [0xCB, 0xD5], 'set_2,(hl)': [0xCB, 0xD6], 'set_2,a': [0xCB, 0xD7],
            'set_3,b': [0xCB, 0xD8], 'set_3,c': [0xCB, 0xD9], 'set_3,d': [0xCB, 0xDA], 'set_3,e': [0xCB, 0xDB], 'set_3,h': [0xCB, 0xDC], 'set_3,l': [0xCB, 0xDD], 'set_3,(hl)': [0xCB, 0xDE], 'set_3,a': [0xCB, 0xDF],
            'set_4,b': [0xCB, 0xE0], 'set_4,c': [0xCB, 0xE1], 'set_4,d': [0xCB, 0xE2], 'set_4,e': [0xCB, 0xE3], 'set_4,h': [0xCB, 0xE4], 'set_4,l': [0xCB, 0xE5], 'set_4,(hl)': [0xCB, 0xE6], 'set_4,a': [0xCB, 0xE7],
            'set_5,b': [0xCB, 0xE8], 'set_5,c': [0xCB, 0xE9], 'set_5,d': [0xCB, 0xEA], 'set_5,e': [0xCB, 0xEB], 'set_5,h': [0xCB, 0xEC], 'set_5,l': [0xCB, 0xED], 'set_5,(hl)': [0xCB, 0xEE], 'set_5,a': [0xCB, 0xEF],
            'set_6,b': [0xCB, 0xF0], 'set_6,c': [0xCB, 0xF1], 'set_6,d': [0xCB, 0xF2], 'set_6,e': [0xCB, 0xF3], 'set_6,h': [0xCB, 0xF4], 'set_6,l': [0xCB, 0xF5], 'set_6,(hl)': [0xCB, 0xF6], 'set_6,a': [0xCB, 0xF7],
            'set_7,b': [0xCB, 0xF8], 'set_7,c': [0xCB, 0xF9], 'set_7,d': [0xCB, 0xFA], 'set_7,e': [0xCB, 0xFB], 'set_7,h': [0xCB, 0xFC], 'set_7,l': [0xCB, 0xFD], 'set_7,(hl)': [0xCB, 0xFE], 'set_7,a': [0xCB, 0xFF],
            
            // DD prefix opcodes - IX operations
            'add_ix,bc': [0xDD, 0x09], 'add_ix,de': [0xDD, 0x19], 'ld_ix,imm16': [0xDD, 0x21], 'ld_(imm16),ix': [0xDD, 0x22], 
            'inc_ix': [0xDD, 0x23], 'inc_ixh': [0xDD, 0x24], 'dec_ixh': [0xDD, 0x25], 'ld_ixh,imm8': [0xDD, 0x26], 
            'add_ix,ix': [0xDD, 0x29], 'ld_ix,(imm16)': [0xDD, 0x2A], 'dec_ix': [0xDD, 0x2B], 'inc_ixl': [0xDD, 0x2C], 
            'dec_ixl': [0xDD, 0x2D], 'ld_ixl,imm8': [0xDD, 0x2E], 'inc_(ix+offset)': [0xDD, 0x34], 'dec_(ix+offset)': [0xDD, 0x35],
            'ld_(ix+offset),imm8': [0xDD, 0x36], 'add_ix,sp': [0xDD, 0x39], 'ld_b,ixh': [0xDD, 0x44], 'ld_b,ixl': [0xDD, 0x45], 
            'ld_b,(ix+offset)': [0xDD, 0x46], 'ld_c,ixh': [0xDD, 0x4C], 'ld_c,ixl': [0xDD, 0x4D], 'ld_c,(ix+offset)': [0xDD, 0x4E],
            'ld_d,ixh': [0xDD, 0x54], 'ld_d,ixl': [0xDD, 0x55], 'ld_d,(ix+offset)': [0xDD, 0x56], 'ld_e,ixh': [0xDD, 0x5C], 
            'ld_e,ixl': [0xDD, 0x5D], 'ld_e,(ix+offset)': [0xDD, 0x5E], 'ld_ixh,b': [0xDD, 0x60], 'ld_ixh,c': [0xDD, 0x61], 
            'ld_ixh,d': [0xDD, 0x62], 'ld_ixh,e': [0xDD, 0x63], 'ld_ixh,ixh': [0xDD, 0x64], 'ld_ixh,ixl': [0xDD, 0x65], 
            'ld_h,(ix+offset)': [0xDD, 0x66], 'ld_ixh,a': [0xDD, 0x67], 'ld_ixl,b': [0xDD, 0x68], 'ld_ixl,c': [0xDD, 0x69], 
            'ld_ixl,d': [0xDD, 0x6A], 'ld_ixl,e': [0xDD, 0x6B], 'ld_ixl,ixh': [0xDD, 0x6C], 'ld_ixl,ixl': [0xDD, 0x6D], 
            'ld_l,(ix+offset)': [0xDD, 0x6E], 'ld_ixl,a': [0xDD, 0x6F], 'ld_(ix+offset),b': [0xDD, 0x70], 'ld_(ix+offset),c': [0xDD, 0x71],
            'ld_(ix+offset),d': [0xDD, 0x72], 'ld_(ix+offset),e': [0xDD, 0x73], 'ld_(ix+offset),h': [0xDD, 0x74], 'ld_(ix+offset),l': [0xDD, 0x75],
            'ld_(ix+offset),a': [0xDD, 0x77], 'ld_a,ixh': [0xDD, 0x7C], 'ld_a,ixl': [0xDD, 0x7D], 'ld_a,(ix+offset)': [0xDD, 0x7E],
            'add_a,ixh': [0xDD, 0x84], 'add_a,ixl': [0xDD, 0x85], 'add_a,(ix+offset)': [0xDD, 0x86], 'adc_a,ixh': [0xDD, 0x8C], 
            'adc_a,ixl': [0xDD, 0x8D], 'adc_a,(ix+offset)': [0xDD, 0x8E], 'sub_ixh': [0xDD, 0x94], 'sub_ixl': [0xDD, 0x95], 
            'sub_(ix+offset)': [0xDD, 0x96], 'sbc_a,ixh': [0xDD, 0x9C], 'sbc_a,ixl': [0xDD, 0x9D], 'sbc_a,(ix+offset)': [0xDD, 0x9E],
            'and_ixh': [0xDD, 0xA4], 'and_ixl': [0xDD, 0xA5], 'and_(ix+offset)': [0xDD, 0xA6], 'xor_ixh': [0xDD, 0xAC], 
            'xor_ixl': [0xDD, 0xAD], 'xor_(ix+offset)': [0xDD, 0xAE], 'or_ixh': [0xDD, 0xB4], 'or_ixl': [0xDD, 0xB5], 
            'or_(ix+offset)': [0xDD, 0xB6], 'cp_ixh': [0xDD, 0xBC], 'cp_ixl': [0xDD, 0xBD], 'cp_(ix+offset)': [0xDD, 0xBE],
            'pop_ix': [0xDD, 0xE1], 'ex_(sp),ix': [0xDD, 0xE3], 'push_ix': [0xDD, 0xE5], 'jp_(ix)': [0xDD, 0xE9], 'ld_sp,ix': [0xDD, 0xF9],

            // DD CB prefix opcodes - IX+offset bit operations (4-byte: DD CB offset opcode)
            // Format: [0xDD, 0xCB, final_opcode] - offset byte inserted between CB and opcode during generation
            'rlc_(ix+offset)': [0xDD, 0xCB, 0x06], 'rrc_(ix+offset)': [0xDD, 0xCB, 0x0E],
            'rl_(ix+offset)': [0xDD, 0xCB, 0x16], 'rr_(ix+offset)': [0xDD, 0xCB, 0x1E],
            'sla_(ix+offset)': [0xDD, 0xCB, 0x26], 'sra_(ix+offset)': [0xDD, 0xCB, 0x2E],
            'sll_(ix+offset)': [0xDD, 0xCB, 0x36], 'srl_(ix+offset)': [0xDD, 0xCB, 0x3E],
            'bit_0,(ix+offset)': [0xDD, 0xCB, 0x46], 'bit_1,(ix+offset)': [0xDD, 0xCB, 0x4E],
            'bit_2,(ix+offset)': [0xDD, 0xCB, 0x56], 'bit_3,(ix+offset)': [0xDD, 0xCB, 0x5E],
            'bit_4,(ix+offset)': [0xDD, 0xCB, 0x66], 'bit_5,(ix+offset)': [0xDD, 0xCB, 0x6E],
            'bit_6,(ix+offset)': [0xDD, 0xCB, 0x76], 'bit_7,(ix+offset)': [0xDD, 0xCB, 0x7E],
            'res_0,(ix+offset)': [0xDD, 0xCB, 0x86], 'res_1,(ix+offset)': [0xDD, 0xCB, 0x8E],
            'res_2,(ix+offset)': [0xDD, 0xCB, 0x96], 'res_3,(ix+offset)': [0xDD, 0xCB, 0x9E],
            'res_4,(ix+offset)': [0xDD, 0xCB, 0xA6], 'res_5,(ix+offset)': [0xDD, 0xCB, 0xAE],
            'res_6,(ix+offset)': [0xDD, 0xCB, 0xB6], 'res_7,(ix+offset)': [0xDD, 0xCB, 0xBE],
            'set_0,(ix+offset)': [0xDD, 0xCB, 0xC6], 'set_1,(ix+offset)': [0xDD, 0xCB, 0xCE],
            'set_2,(ix+offset)': [0xDD, 0xCB, 0xD6], 'set_3,(ix+offset)': [0xDD, 0xCB, 0xDE],
            'set_4,(ix+offset)': [0xDD, 0xCB, 0xE6], 'set_5,(ix+offset)': [0xDD, 0xCB, 0xEE],
            'set_6,(ix+offset)': [0xDD, 0xCB, 0xF6], 'set_7,(ix+offset)': [0xDD, 0xCB, 0xFE],

            // FD prefix opcodes - IY operations
            'add_iy,bc': [0xFD, 0x09], 'add_iy,de': [0xFD, 0x19], 'ld_iy,imm16': [0xFD, 0x21], 'ld_(imm16),iy': [0xFD, 0x22], 
            'inc_iy': [0xFD, 0x23], 'inc_iyh': [0xFD, 0x24], 'dec_iyh': [0xFD, 0x25], 'ld_iyh,imm8': [0xFD, 0x26],
            'add_iy,iy': [0xFD, 0x29], 'ld_iy,(imm16)': [0xFD, 0x2A], 'dec_iy': [0xFD, 0x2B], 'inc_iyl': [0xFD, 0x2C], 
            'dec_iyl': [0xFD, 0x2D], 'ld_iyl,imm8': [0xFD, 0x2E], 'inc_(iy+offset)': [0xFD, 0x34], 'dec_(iy+offset)': [0xFD, 0x35],
            'ld_(iy+offset),imm8': [0xFD, 0x36], 'add_iy,sp': [0xFD, 0x39], 'ld_b,iyh': [0xFD, 0x44], 'ld_b,iyl': [0xFD, 0x45], 
            'ld_b,(iy+offset)': [0xFD, 0x46], 'ld_c,iyh': [0xFD, 0x4C], 'ld_c,iyl': [0xFD, 0x4D], 'ld_c,(iy+offset)': [0xFD, 0x4E],
            'ld_d,iyh': [0xFD, 0x54], 'ld_d,iyl': [0xFD, 0x55], 'ld_d,(iy+offset)': [0xFD, 0x56], 'ld_e,iyh': [0xFD, 0x5C], 
            'ld_e,iyl': [0xFD, 0x5D], 'ld_e,(iy+offset)': [0xFD, 0x5E], 'ld_iyh,b': [0xFD, 0x60], 'ld_iyh,c': [0xFD, 0x61], 
            'ld_iyh,d': [0xFD, 0x62], 'ld_iyh,e': [0xFD, 0x63], 'ld_iyh,iyh': [0xFD, 0x64], 'ld_iyh,iyl': [0xFD, 0x65], 
            'ld_h,(iy+offset)': [0xFD, 0x66], 'ld_iyh,a': [0xFD, 0x67], 'ld_iyl,b': [0xFD, 0x68], 'ld_iyl,c': [0xFD, 0x69], 
            'ld_iyl,d': [0xFD, 0x6A], 'ld_iyl,e': [0xFD, 0x6B], 'ld_iyl,iyh': [0xFD, 0x6C], 'ld_iyl,iyl': [0xFD, 0x6D], 
            'ld_l,(iy+offset)': [0xFD, 0x6E], 'ld_iyl,a': [0xFD, 0x6F], 'ld_(iy+offset),b': [0xFD, 0x70], 'ld_(iy+offset),c': [0xFD, 0x71],
            'ld_(iy+offset),d': [0xFD, 0x72], 'ld_(iy+offset),e': [0xFD, 0x73], 'ld_(iy+offset),h': [0xFD, 0x74], 'ld_(iy+offset),l': [0xFD, 0x75],
            'ld_(iy+offset),a': [0xFD, 0x77], 'ld_a,iyh': [0xFD, 0x7C], 'ld_a,iyl': [0xFD, 0x7D], 'ld_a,(iy+offset)': [0xFD, 0x7E],
            'add_a,iyh': [0xFD, 0x84], 'add_a,iyl': [0xFD, 0x85], 'add_a,(iy+offset)': [0xFD, 0x86], 'adc_a,iyh': [0xFD, 0x8C], 
            'adc_a,iyl': [0xFD, 0x8D], 'adc_a,(iy+offset)': [0xFD, 0x8E], 'sub_iyh': [0xFD, 0x94], 'sub_iyl': [0xFD, 0x95], 
            'sub_(iy+offset)': [0xFD, 0x96], 'sbc_a,iyh': [0xFD, 0x9C], 'sbc_a,iyl': [0xFD, 0x9D], 'sbc_a,(iy+offset)': [0xFD, 0x9E],
            'and_iyh': [0xFD, 0xA4], 'and_iyl': [0xFD, 0xA5], 'and_(iy+offset)': [0xFD, 0xA6], 'xor_iyh': [0xFD, 0xAC], 
            'xor_iyl': [0xFD, 0xAD], 'xor_(iy+offset)': [0xFD, 0xAE], 'or_iyh': [0xFD, 0xB4], 'or_iyl': [0xFD, 0xB5], 
            'or_(iy+offset)': [0xFD, 0xB6], 'cp_iyh': [0xFD, 0xBC], 'cp_iyl': [0xFD, 0xBD], 'cp_(iy+offset)': [0xFD, 0xBE],
            'pop_iy': [0xFD, 0xE1], 'ex_(sp),iy': [0xFD, 0xE3], 'push_iy': [0xFD, 0xE5], 'jp_(iy)': [0xFD, 0xE9], 'ld_sp,iy': [0xFD, 0xF9],

            // FD CB prefix opcodes - IY+offset bit operations (4-byte: FD CB offset opcode)
            // Format: [0xFD, 0xCB, final_opcode] - offset byte inserted between CB and opcode during generation
            'rlc_(iy+offset)': [0xFD, 0xCB, 0x06], 'rrc_(iy+offset)': [0xFD, 0xCB, 0x0E],
            'rl_(iy+offset)': [0xFD, 0xCB, 0x16], 'rr_(iy+offset)': [0xFD, 0xCB, 0x1E],
            'sla_(iy+offset)': [0xFD, 0xCB, 0x26], 'sra_(iy+offset)': [0xFD, 0xCB, 0x2E],
            'sll_(iy+offset)': [0xFD, 0xCB, 0x36], 'srl_(iy+offset)': [0xFD, 0xCB, 0x3E],
            'bit_0,(iy+offset)': [0xFD, 0xCB, 0x46], 'bit_1,(iy+offset)': [0xFD, 0xCB, 0x4E],
            'bit_2,(iy+offset)': [0xFD, 0xCB, 0x56], 'bit_3,(iy+offset)': [0xFD, 0xCB, 0x5E],
            'bit_4,(iy+offset)': [0xFD, 0xCB, 0x66], 'bit_5,(iy+offset)': [0xFD, 0xCB, 0x6E],
            'bit_6,(iy+offset)': [0xFD, 0xCB, 0x76], 'bit_7,(iy+offset)': [0xFD, 0xCB, 0x7E],
            'res_0,(iy+offset)': [0xFD, 0xCB, 0x86], 'res_1,(iy+offset)': [0xFD, 0xCB, 0x8E],
            'res_2,(iy+offset)': [0xFD, 0xCB, 0x96], 'res_3,(iy+offset)': [0xFD, 0xCB, 0x9E],
            'res_4,(iy+offset)': [0xFD, 0xCB, 0xA6], 'res_5,(iy+offset)': [0xFD, 0xCB, 0xAE],
            'res_6,(iy+offset)': [0xFD, 0xCB, 0xB6], 'res_7,(iy+offset)': [0xFD, 0xCB, 0xBE],
            'set_0,(iy+offset)': [0xFD, 0xCB, 0xC6], 'set_1,(iy+offset)': [0xFD, 0xCB, 0xCE],
            'set_2,(iy+offset)': [0xFD, 0xCB, 0xD6], 'set_3,(iy+offset)': [0xFD, 0xCB, 0xDE],
            'set_4,(iy+offset)': [0xFD, 0xCB, 0xE6], 'set_5,(iy+offset)': [0xFD, 0xCB, 0xEE],
            'set_6,(iy+offset)': [0xFD, 0xCB, 0xF6], 'set_7,(iy+offset)': [0xFD, 0xCB, 0xFE],
        };
globalThis.__amyscvassembly_opcodes = Z80_OPCODES;

function isIxIyDisplacementOperandText(value) {
    return typeof value === 'string' && /\b(?:ix|iy)\b\s*[+-]/i.test(value);
}


        class Assembler {
            constructor(files) {
                this.files = files;
                this.macroTable = {};
                this.symbolTable = {};
                this.constantTable = {}; // Separate table for SET/EQU values
                this.structTable = {}; // Structure definitions (STRUCT/ENDSTRUCT)
                this.fileMap = [];
                this.symbolInfo = {};
                this.pc = 0;
                this.output = [];
                this.firstOrg = null;                
                this.currentPass = 0;
                this.currentFile = '';
                this.currentLine = 0;
                this.currentInstruction = null;
                this.fileStartAddress = 0;
                this.compilationStats = {
                    totalSize: 0,
                    codeSize: 0,
                    dataSize: 0,
                    symbolCount: 0,
                    fileCount: 0
                };
                this.conditionalStack = []; // For nested IF/ENDIF
                this.tempSymbolCounters = {
                    named: 0,
                    plus: 0,
                    minus: 0,
                    slash: 0
                };
                this.lastNonTempSymbol = '';
                this.macroCounter = 0; // For unique macro labels with \@
                this.numberParser = new NumberParser();
                this.currentSection = 'CODE'; // Track current section: 'CODE', 'DATA', or 'BSS'
                this.sectionPCs = { CODE: 0, DATA: 0, BSS: 0 }; // Track PC for each section
                this.listingLines = []; // For .LST file generation
                this.sourceLines = [];   // Store original source lines
                this.errorCount = 0;     // Track errors for listing
                this.lineToAddressMap = new Map(); // Map source line numbers to assembled addresses
                this.breakpointsToInject = new Set(); // Breakpoints to inject as ld b,b (0x40)
                // v2.1: LET variables and STOP flag
                this.variableTable = {}; // Mutable variables (LET directive)
                this.stopRequested = false; // STOP directive flag

                // Pro version: Segment management for .REL output
                this.outputMode = 'binary'; // 'binary' or 'rel'
                this.segments = {
                    code: { base: 0, size: 0, bytes: [], relocations: [] },
                    data: { base: 0, size: 0, bytes: [], relocations: [] },
                    common: { blocks: {} },
                    absolute: { bytes: [] }
                };
                this.currentSegment = 'code';
                this.publicSymbols = new Set();
                this.externalSymbols = new Set();
                this.externalRefs = []; // {symbol, location, addressType}
                this.relocations = []; // {location, type, segment}
                this.moduleName = '';
            }

            setBreakpoints(breakpointsSet) {
                // Convert 0-based breakpoint line numbers to 1-based for assembly
                this.breakpointsToInject.clear();
                for (const lineNum of breakpointsSet) {
                    this.breakpointsToInject.add(lineNum + 1); // Convert to 1-based
                }
            }

            // Post-compilation ROM patcher: Patch RST vector trampolines in ColecoVision header
            patchRstVectors(rom, rstMapping) {
                // ColecoVision RST vector locations in ROM header
                const rstOffsets = {
                    0x08: 0x0C, // RST $08 at offset $0C (address $800C)
                    0x10: 0x0F, // RST $10 at offset $0F (address $800F)
                    0x18: 0x12, // RST $18 at offset $12 (address $8012)
                    0x20: 0x15, // RST $20 at offset $15 (address $8015)
                    0x28: 0x18, // RST $28 at offset $18 (address $8018)
                    0x30: 0x1B  // RST $30 at offset $1B (address $801B)
                    // RST $38 at $1E is RESERVED - never patch!
                };

                // Create a copy of ROM to modify
                const patched = new Uint8Array(rom);

                // For each RST vector in the mapping, patch the ROM header
                for (const [biosAddr, rstCode] of rstMapping.entries()) {
                    const offset = rstOffsets[rstCode];
                    if (offset === undefined) {
                        log(`  WARNING: Invalid RST code $${rstCode.toString(16).toUpperCase()}`, 'warn');
                        continue;
                    }

                    // Generate JP opcode: C3 + low byte + high byte
                    patched[offset] = 0xC3; // JP opcode
                    patched[offset + 1] = biosAddr & 0xFF; // Low byte
                    patched[offset + 2] = (biosAddr >> 8) & 0xFF; // High byte

                    log(`  Patched RST $${rstCode.toString(16).toUpperCase()} at offset $${offset.toString(16).toUpperCase()}: JP $${biosAddr.toString(16).toUpperCase()}`, 'debug');
                }

                // Also patch RST $38 with RETI if it's still RET+NOP+NOP
                const rst38Offset = 0x1E;
                if (patched[rst38Offset] === 0xC9 && patched[rst38Offset + 1] === 0x00) {
                    // Replace RET+NOP with RETI (ED 4D)
                    patched[rst38Offset] = 0xED;
                    patched[rst38Offset + 1] = 0x4D;
                    // Keep third byte as NOP (or leave as-is)
                    log(`  Patched RST $38 with RETI (reserved for spinner interrupt)`, 'debug');
                }

                return patched;
            }

            buildImage({ mode = 'range', base = null, size = null, fill = 0xFF } = {}) {
                const src = new Uint8Array(this.output);

                // If no packaging requested, return raw output
                if (!mode && !base && !size) {
                    return src;
                }

                // CRITICAL: this.output is now relative to firstOrg, not absolute addresses
                // So src[0] corresponds to address firstOrg, src[n] corresponds to address firstOrg+n
                const first = (this.firstOrg !== null) ? this.firstOrg : 0;
                const last  = first + src.length; // Last address in output buffer

                if (mode !== 'range') { // 'auto' or anything else → derive from ORGs
                    if (base == null) base = first;
                    if (size == null) size = Math.max(0, last - base);
                } else {
                // range mode: require base/size; if missing, fall back to first/last
                    if (base == null) base = first;
                    if (size == null) size = Math.max(0, last - base);
                }

                const out = new Uint8Array(size).fill(fill & 0xFF);

                // Copy the intersection of [base, base+size) from src into out[0..size)
                // Convert absolute addresses to buffer positions
                const srcStart = Math.max(0, base - first); // Position in src buffer
                const srcEnd   = Math.min(src.length, (base + size) - first);
                if (srcEnd > srcStart) {
                    out.set(src.subarray(srcStart, srcEnd), 0);
                }
                return out;
            }


            async assemble(mainFile) {
                try {
                    // Reset state for new compilation
                    this.fileMap = [];
                    this.currentFile = mainFile;
                    this.currentPass = 1;
                    log(`--- Pass 1: Conditional processing and macro expansion for ${mainFile} ---`);
                    const pass1_source = await this.expandMacrosAndConditionals(mainFile);

                    // Store all source lines for listing generation
                    this.sourceLines = pass1_source.split('\n');

                    const lexer = new Lexer(pass1_source);
                    let tokens = lexer.tokenize();
                    
                    // CPU directive is optional - default to Z80 if not specified
                    const cpuDirective = tokens.find(t => t.name === 'CPU');
                    if (cpuDirective && cpuDirective.operands[0].value.toUpperCase() !== 'Z80') {
                        throw new Error("Only Z80 CPU is supported (CPU directive found but not set to 'Z80')");
                    }
                    // If no CPU directive, we default to Z80 (zmac-compatible behavior)
                    
                    const fnameDirective = tokens.find(t => t.name === 'FNAME');
                    if (fnameDirective) {
                        outputFilename = fnameDirective.operands[0].value;
                    }

                    this.currentPass = 2;
                    log('--- Pass 2: Building symbol table ---');
                    this.buildSymbolTable(tokens);

                    // Pass 2.5: Code optimization (if enabled)
                    // Read current checkbox state (don't rely on old variable)
                    const isOptimizerEnabled = document.getElementById('optimizer-toggle').checked;
                    let optimizer = null; // Declare outside if block so it's accessible later
                    if (isOptimizerEnabled) {
                        log('--- Pass 2.5: Optimizing code ---');
                        const activeOptimizerConfig = compilerUiState.optimizerConfig || defaultOptimizerConfig;
                        optimizer = new Z80Optimizer(this, activeOptimizerConfig);

                        // Phase 1: Optimizations that don't depend on final addresses
                        tokens = optimizer.optimizePhase1(tokens);

                        // Rebuild symbol table after phase 1 (dead code, RST, peephole)
                        this.symbolTable = {};
                        this.constantTable = {};
                        this.symbolInfo = {};
                        this.fileMap = [];
                        this.pc = 0;
                        this.firstOrg = null;  // Reset firstOrg for symbol table rebuild
                        this.sectionPCs = { CODE: 0, DATA: 0, BSS: 0 };  // Reset section PCs
                        this.currentSection = 'CODE';  // Reset to CODE section
                        this.lastNonTempSymbol = '';  // Reset for local label resolution
                        this.buildSymbolTable(tokens);

                        // Update optimizer's symbol table reference
                        optimizer.symbolTable = this.symbolTable;

                        // Phase 2: Address-dependent optimizations (JP→JR, LD A,0→XOR A)
                        // Use iterative approach: JP→JR changes addresses, so we need to
                        // rebuild symbol table and re-optimize until no more changes occur
                        // Save original tokens from Phase 1 (before any JP→JR conversions)
                        const symbolsBefore = {...this.symbolTable};
                        let iteration = 0;
                        const maxIterations = 10; // Safety limit

                        do {
                            // Reset per-iteration counters
                            optimizer.stats.jpToJr = 0;
                            optimizer.stats.ldToXor = 0;
                            optimizer.stats.djnzExpanded = 0;
                            optimizer.stats.jrExpanded = 0;
                            // Optimize based on current tokens (first iteration uses phase1 output)
                            tokens = optimizer.optimizePhase2(tokens);

                            // Rebuild symbol table after optimizations
                            this.symbolTable = {};
                            this.constantTable = {};
                            this.symbolInfo = {};
                            this.fileMap = [];
                            this.pc = 0;
                            this.firstOrg = null;  // Reset firstOrg for symbol table rebuild
                            this.sectionPCs = { CODE: 0, DATA: 0, BSS: 0 };  // Reset section PCs
                            this.currentSection = 'CODE';  // Reset to CODE section
                            this.lastNonTempSymbol = '';  // Reset for local label resolution
                            this.buildSymbolTable(tokens);

                            // Update optimizer's symbol table reference
                            optimizer.symbolTable = this.symbolTable;

                            iteration++;
                            const relaxed = optimizer.stats.djnzExpanded + optimizer.stats.jrExpanded;
                            log(`  Iteration ${iteration}: ${optimizer.stats.jpToJr} JP→JR conversions${relaxed > 0 ? `, ${relaxed} JR/DJNZ expanded` : ''}`, 'debug');
                        } while ((optimizer.stats.jpToJr > 0 || optimizer.stats.djnzExpanded > 0 || optimizer.stats.jrExpanded > 0) && iteration < maxIterations);

                        // Show address shifts for labels that moved
                        log(`Address mapping (labels that moved):`, 'debug');
                        const movedLabels = [];
                        for (const label in this.symbolTable) {
                            if (symbolsBefore[label] !== undefined && symbolsBefore[label] !== this.symbolTable[label]) {
                                const shift = this.symbolTable[label] - symbolsBefore[label];
                                movedLabels.push(`${label}: $${symbolsBefore[label].toString(16)} → $${this.symbolTable[label].toString(16)} (${shift >= 0 ? '+' : ''}${shift})`);
                            }
                        }
                        if (movedLabels.length > 0) {
                            movedLabels.slice(0, 10).forEach(line => log(`  ${line}`, 'debug'));
                            if (movedLabels.length > 10) {
                                log(`  ... and ${movedLabels.length - 10} more labels`, 'debug');
                            }
                        } else {
                            log(`  No labels moved`, 'debug');
                        }

                        // Log optimization statistics
                        const s = optimizer.stats;
                        this.compilationStats.optimizer = {
                            enabled: true,
                            jpToJr: s.jpToJr,
                            ldToXor: s.ldToXor,
                            deadCodeRemoved: s.deadCodeRemoved,
                            peepholeOpts: s.peepholeOpts,
                            callMerge: s.callMerge,
                            callRetToJp: s.callRetToJp,
                            rstOptimized: s.rstOptimized,
                            rstVectorsUsed: s.rstVectorsUsed,
                            routinesInlined: s.routinesInlined,
                            inlinePasses: s.inlinePasses,
                            djnzExpanded: s.djnzExpanded,
                            jrExpanded: s.jrExpanded,
                            bytesSaved: s.bytesSaved
                        };
                        log(`Optimizations applied:`, 'success');
                        if (s.jpToJr > 0) log(`  JP→JR: ${s.jpToJr} conversion${s.jpToJr > 1 ? 's' : ''}`, 'info');
                        if (s.ldToXor > 0) log(`  LD A,0→XOR A: ${s.ldToXor} conversion${s.ldToXor > 1 ? 's' : ''}`, 'info');
                        if (s.callRetToJp > 0) log(`  CALL+RET→JP: ${s.callRetToJp} tail call${s.callRetToJp > 1 ? 's' : ''} eliminated`, 'info');
                        if (s.deadCodeRemoved > 0) log(`  Dead code: ${s.deadCodeRemoved} instruction${s.deadCodeRemoved > 1 ? 's' : ''} removed`, 'info');
                        if (s.peepholeOpts > 0) log(`  Peephole: ${s.peepholeOpts} optimization${s.peepholeOpts > 1 ? 's' : ''}`, 'info');
                        if (s.routinesInlined > 0) log(`  Inline routines: ${s.routinesInlined} routine${s.routinesInlined > 1 ? 's' : ''} expanded in ${s.inlinePasses} pass${s.inlinePasses > 1 ? 'es' : ''}`, 'info');
                        if (s.rstOptimized > 0) log(`  RST vectors: ${s.rstVectorsUsed} vector${s.rstVectorsUsed > 1 ? 's' : ''} repurposed, ${s.rstOptimized} call${s.rstOptimized > 1 ? 's' : ''} → RST`, 'info');
                        if (s.djnzExpanded > 0) log(`  DJNZ→DEC+JP: ${s.djnzExpanded} relaxed`, 'info');
                        if (s.jrExpanded > 0) log(`  JR→JP: ${s.jrExpanded} relaxed`, 'info');
                        log(`  Estimated local wins: ${s.bytesSaved} bytes before final layout`, 'success');

                        // Update bytes saved display
                        const bytesSavedDisplay = document.getElementById('bytes-saved-display');
                        if (s.bytesSaved > 0) {
                            bytesSavedDisplay.textContent = `~${s.bytesSaved}B local`;
                            bytesSavedDisplay.classList.remove('hidden');
                        } else {
                            bytesSavedDisplay.classList.add('hidden');
                        }
                    } else {
                        this.compilationStats.optimizer = {
                            enabled: false,
                            jpToJr: 0,
                            ldToXor: 0,
                            deadCodeRemoved: 0,
                            peepholeOpts: 0,
                            callMerge: 0,
                            callRetToJp: 0,
                            rstOptimized: 0,
                            rstVectorsUsed: 0,
                            routinesInlined: 0,
                            inlinePasses: 0,
                            bytesSaved: 0
                        };
                        // Optimizer disabled - hide bytes saved display
                        const bytesSavedDisplay = document.getElementById('bytes-saved-display');
                        bytesSavedDisplay.classList.add('hidden');
                    }

                    this.currentPass = 3;
                    this.optimizedSource = serializeAssemblerTokens(tokens);
                    log('--- Pass 3: Generating binary code ---');
                    this.generateCode(tokens);

                    // Pro version: Check output mode
                    if (this.outputMode === 'rel') {
                        // Generate .REL file instead of binary
                        log('Generating relocatable object file (.REL)...', 'info');
                        compiledBinary = this.generateRelFile();

                        log(`Relocatable object file generated: ${compiledBinary.length} bytes`, 'success');
                        log(`  Module: ${this.moduleName || 'MODULE'}`, 'info');
                        log(`  Public symbols: ${this.publicSymbols.size}`, 'info');
                        log(`  External references: ${this.externalRefs.length}`, 'info');
                        log(`  Code size: ${this.output.length} bytes`, 'info');
                        log(`  Relocations: ${this.relocations.length}`, 'info');

                        this.displaySymbolTable();
                        return compiledBinary;
                    }

                    // --- Packaging step: Platform-driven configuration ---
                    const platformConfig = getPlatformConfig();
                    const cfg = platformConfig.packager || { mode: null };

                    if (cfg.mode) {
                        compiledBinary = this.buildImage(cfg);
                        log(`Packaged for ${document.getElementById('target-platform').value}: ${platformConfig.description}`, 'info');
                    } else {
                        compiledBinary = this.buildImage();
                        log('Generated raw binary (no packaging)', 'info');
                    }

                    // Post-compilation ROM patching: Patch RST vectors if optimizer created mapping
                    if (isOptimizerEnabled && optimizer && optimizer.rstMapping && optimizer.rstMapping.size > 0) {
                        compiledBinary = this.patchRstVectors(compiledBinary, optimizer.rstMapping);
                    }

                    // Platform-specific validation
                    if (platformConfig.validateHeader === 'coleco') {
                        const headerInfo = validateColecoHeader(compiledBinary);
                        if (headerInfo.valid) {
                            log(`Valid ColecoVision ROM: ${headerInfo.usesDefaultScreen ? 'With' : 'Without'} default title screen`, 'success');
                        }

                        // DEBUG: Dump first 33 bytes of ROM header
                        log(`  DEBUG: ColecoVision ROM Header ($8000-$8020):`, 'debug');
                        const headerBytes = [];
                        for (let i = 0; i < 33 && i < compiledBinary.length; i++) {
                            headerBytes.push(compiledBinary[i].toString(16).padStart(2, '0').toUpperCase());
                        }
                        // Display in rows of 16 bytes
                        for (let row = 0; row < 3; row++) {
                            const start = row * 16;
                            const end = Math.min(start + 16, headerBytes.length);
                            const addr = (0x8000 + start).toString(16).toUpperCase().padStart(4, '0');
                            const bytes = headerBytes.slice(start, end).join(' ');
                            log(`    $${addr}: ${bytes}`, 'debug');
                        }
                        // Decode RST vectors
                        log(`  DEBUG: RST Vector Contents:`, 'debug');
                        const rstLocs = [
                            { addr: 0x0C, name: 'RST $08' },
                            { addr: 0x0F, name: 'RST $10' },
                            { addr: 0x12, name: 'RST $18' },
                            { addr: 0x15, name: 'RST $20' },
                            { addr: 0x18, name: 'RST $28' },
                            { addr: 0x1B, name: 'RST $30' },
                            { addr: 0x1E, name: 'RST $38' }
                        ];
                        rstLocs.forEach(rst => {
                            if (rst.addr + 2 < compiledBinary.length) {
                                const b1 = compiledBinary[rst.addr].toString(16).padStart(2, '0').toUpperCase();
                                const b2 = compiledBinary[rst.addr + 1].toString(16).padStart(2, '0').toUpperCase();
                                const b3 = compiledBinary[rst.addr + 2].toString(16).padStart(2, '0').toUpperCase();
                                log(`    ${rst.name} ($${(0x8000 + rst.addr).toString(16).toUpperCase()}): ${b1} ${b2} ${b3}`, 'debug');
                            }
                        });
                    }

                    // --- Size metrics calculation ---
                    const src = new Uint8Array(this.output);
                    
                    if (cfg.mode) {
                        // Packaged binary metrics
                        const base = cfg.base || (this.firstOrg ?? 0);
                        const size = cfg.size || Math.max(0, src.length - base);
                        const end = Math.min(src.length, base + size);
                        const payloadUsed = Math.max(0, end - base);
                        const windowFree = Math.max(0, size - payloadUsed);
                        
                        this.compilationStats.totalSize = compiledBinary.length;
                        this.compilationStats.windowBase = base;
                        this.compilationStats.windowSize = size;
                        this.compilationStats.payloadUsed = payloadUsed;
                        this.compilationStats.windowFree = windowFree;
                        
                        log(
                            `Assembly successful! ROM window ${base.toString(16).toUpperCase()}..${(base+size-1).toString(16).toUpperCase()} | ` +
                            `payload used: ${payloadUsed} bytes | free: ${windowFree} bytes | packaged: ${compiledBinary.length} bytes.`,
                            'success'
                        );
                    } else {
                        // Raw binary metrics
                        this.compilationStats.totalSize = compiledBinary.length;
                        this.compilationStats.rawSize = compiledBinary.length;
                        
                        log(
                            `Assembly successful! Raw binary: ${compiledBinary.length} bytes | ` +
                            `Range: ${(this.firstOrg ?? 0).toString(16).toUpperCase()}-${((this.firstOrg ?? 0) + compiledBinary.length - 1).toString(16).toUpperCase()}`,
                            'success'
                        );
                    }

                    // Common stats
                    this.compilationStats.symbolCount = Object.keys(this.symbolInfo).length;
                    this.compilationStats.fileCount = this.fileMap.length;
                    
                    this.displaySymbolTable();
                    return compiledBinary;

                } catch (e) {
                    log(`Assembly failed on pass ${this.currentPass} in file '${this.currentFile}': ${e.message}`, 'error');
                    console.error(e);
                    return null;
                }
            }
            
            async expandMacrosAndConditionals(filename, visited = new Set()) {
                if (visited.has(filename)) throw new Error(`Circular include detected: ${filename}`);
                visited.add(filename);

                let source = this.findFile(filename);
                if (source instanceof Uint8Array) source = new TextDecoder().decode(source);

                const lines = source.split('\n');
                let expandedSource = '';
                let inMacro = false;
                let currentMacro = null;
                let inStruct = false;
                let currentStruct = null;
                let conditionalStack = [];
                let currentConditionState = true;

                // Pre-collect EQU constants for TIMES directive (Pass 1 needs them)
                if (!this.constantTable) this.constantTable = {};
                // Also pre-collect LET variables
                if (!this.variableTable) this.variableTable = {};

                for (let i = 0; i < lines.length; i++) {
                    const trimmed = lines[i].trim();
                    if (!trimmed || trimmed.startsWith(';')) continue;

                    // Match both formats:
                    // LABEL EQU value
                    // LABEL: EQU value
                    // .equ LABEL, value (TASM style)
                    const equMatch = trimmed.match(/^\.?equ\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(.+)$/i) ||
                                     trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:?\s+\.?equ\s+(.+)$/i);

                    if (equMatch) {
                        const constName = equMatch[1];
                        const constExpr = equMatch[2].trim().replace(/;.*$/, '').trim();
                        try {
                            const constValue = this.evaluateExpressionSimple(constExpr);
                            this.constantTable[constName] = constValue;
                        } catch (e) {
                            // Skip constants that can't be evaluated yet
                        }
                    }
                    // Note: LET variables are collected in the block-aware loop below (lines 3504+)
                }

                // ============================================
                // v2.1 PRE-PROCESS: LET variables, REPEAT/ENDR, WHILE/WEND, SWITCH/CASE
                // ============================================
                // First pass: Pre-process LET directives so variables are available during block expansion
                // BUT skip LET lines inside REPEAT/WHILE blocks - those are handled during expansion
                let blockDepth = 0;
                for (const line of lines) {
                    const upperTrimmed = line.trim().toUpperCase();
                    // Track block nesting
                    if (upperTrimmed.startsWith('REPEAT ') || upperTrimmed === 'REPEAT' ||
                        upperTrimmed.startsWith('WHILE ')) {
                        blockDepth++;
                    }
                    if (upperTrimmed === 'REND' || upperTrimmed === 'ENDR' ||
                        upperTrimmed.startsWith('REND ') || upperTrimmed.startsWith('ENDR ') ||
                        upperTrimmed === 'WEND' || upperTrimmed === 'ENDW' ||
                        upperTrimmed.startsWith('WEND ') || upperTrimmed.startsWith('ENDW ')) {
                        blockDepth--;
                    }
                    // Only process LET lines that are NOT inside a loop block
                    // AND only for FIRST assignment (initialization), not updates
                    if (blockDepth === 0) {
                        const letMatch = line.trim().match(/^LET\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/i);
                        if (letMatch) {
                            const varName = letMatch[1];
                            // Only pre-process if variable not already defined (initial assignment)
                            // This allows ASSERT to check values before later LET updates
                            if (this.variableTable[varName] === undefined) {
                                const varExpr = letMatch[2].trim().replace(/;.*$/, '').trim();
                                try {
                                    this.variableTable[varName] = this.evaluateExpressionSimple(varExpr);
                                } catch (e) {
                                    // Variable might depend on others defined later, continue
                                }
                            }
                        }
                    }
                }

                let processedLines = this.expandRepeatBlocks(lines);
                processedLines = this.expandWhileBlocks(processedLines);
                processedLines = this.expandSwitchBlocks(processedLines);

                for (let lineIdx = 0; lineIdx < processedLines.length; lineIdx++) {
                    const line = processedLines[lineIdx];
                    const trimmed = line.trim();
                    const parts = trimmed.split(/\s+/);
                    let mnemonic = parts.length > 0 ? parts[0].toLowerCase() : '';
                    // Strip leading dot for TASM-style directives (.MACRO, .ENDM, etc.)
                    if (mnemonic.startsWith('.')) {
                        mnemonic = mnemonic.substring(1);
                    }

                    // Skip lines if we're in a false conditional branch
                    // BUT don't skip if it's a user-defined macro (check macroTable first)
                    const isBuiltInDirective = ['if', 'else', 'elif', 'endif'].includes(mnemonic) && !this.macroTable[mnemonic];
                    if (!currentConditionState && !isBuiltInDirective && mnemonic !== 'macro') {
                        continue;
                    }

                    if (inMacro) {
                        if (mnemonic === 'endm') {
                            inMacro = false;
                            this.macroTable[currentMacro.name] = currentMacro;
                            log(`Defined macro: ${currentMacro.name}`);
                            currentMacro = null;
                        } else {
                            currentMacro.body.push(line);
                        }
                    } else if (inStruct) {
                        if (mnemonic === 'endstruct' || mnemonic === 'ends') {
                            inStruct = false;
                            this.structTable[currentStruct.name] = currentStruct;
                            log(`Defined structure: ${currentStruct.name} (size: ${currentStruct.size} bytes)`);
                            currentStruct = null;
                        } else {
                            // Parse field definition: fieldName DB/DW/DS/BLOCK size
                            const fieldMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+(DB|DW|DS|DEFB|DEFW|DEFS|BLOCK)\s+(.+)$/i);
                            if (fieldMatch) {
                                const fieldName = fieldMatch[1];
                                const fieldType = fieldMatch[2].toUpperCase();
                                const fieldSize = fieldMatch[3].split(';')[0].trim(); // Strip comments!

                                let fieldBytes = 0;
                                if (fieldType === 'DB' || fieldType === 'DEFB') {
                                    // DB: 1 byte per element
                                    try {
                                        const count = this.evaluateExpressionSimple(fieldSize);
                                        fieldBytes = count;
                                    } catch (e) {
                                        fieldBytes = 1; // Default to 1 byte if can't evaluate
                                    }
                                } else if (fieldType === 'DW' || fieldType === 'DEFW') {
                                    // DW: 2 bytes per element
                                    try {
                                        const count = this.evaluateExpressionSimple(fieldSize);
                                        fieldBytes = count * 2;
                                    } catch (e) {
                                        fieldBytes = 2; // Default to 2 bytes
                                        log(`  Field ${fieldName} DW ${fieldSize} -> FAILED, using default 2 bytes: ${e.message}`, 'warn');
                                    }
                                } else if (fieldType === 'DS' || fieldType === 'DEFS' || fieldType === 'BLOCK') {
                                    // DS/BLOCK: reserve N bytes
                                    // DS n or DS n, fill - extract just the count (first argument)
                                    try {
                                        const dsSizeExpr = fieldSize.split(',')[0].trim();
                                        fieldBytes = this.evaluateExpressionSimple(dsSizeExpr);
                                    } catch (e) {
                                        fieldBytes = 1;
                                    }
                                }

                                currentStruct.fields.push({
                                    name: fieldName,
                                    offset: currentStruct.size,
                                    size: fieldBytes
                                });
                                currentStruct.size += fieldBytes;
                            }
                        }
                    } else if (mnemonic === 'struct') {
                        inStruct = true;
                        const structName = parts[1];
                        currentStruct = { name: structName, fields: [], size: 0 };
                    } else if (mnemonic === 'macro') {
                        inMacro = true;
                        // Normalize macro name to lowercase for case-insensitive matching
                        const macroName = parts[1].toLowerCase();
                        currentMacro = { name: macroName, params: parts.slice(2).join('').split(','), body: [] };
                    } else if (this.macroTable[mnemonic]) {
                        // Check macros BEFORE built-in directives to allow macro overrides
                        const macro = this.macroTable[mnemonic];
                        const args = trimmed.substring(mnemonic.length).split(',').map(s => s.trim());
                        let macroBody = macro.body.join('\n');

                        // Replace \@ with unique macro counter
                        // Closing macros (ENDIF, ENDWHILE, NEXT, etc.) reuse the current counter
                        // Opening macros increment to get a new unique value
                        // Macros that shouldn't increment the counter:
                        // - Closing macros (endif, endwhile, next, endif_button)
                        // - Variable/utility macros that don't use \@ (var_byte, load_var, inc_var, etc.)
                        const nonIncrementingMacros = [
                            'endif', 'endwhile', 'next', 'endif_button', 'endswitch',
                            'var_byte', 'var_word', 'var_array',
                            'inc_var', 'dec_var', 'load_var', 'store_var', 'copy_var',
                            'vdp_write_reg', 'vram_set_write', 'vram_set_read', 'vram_write_byte', 'vram_read_byte',
                            'sprite_set_pos', 'sprite_set_pattern', 'sprite_hide',
                            'psg_write', 'psg_mute_all',
                            'fill_ram', 'copy_ram',
                            'wait_vblank', 'disable_interrupts', 'enable_interrupts', 'nop_delay'
                        ];
                        if (!nonIncrementingMacros.includes(mnemonic)) {
                            this.macroCounter++;
                        }
                        macroBody = macroBody.replace(/\\@/g, this.macroCounter);

                        // Replace \1, \2, \3, etc. with corresponding arguments
                        // Match backslash followed by digit(s), not followed by another digit
                        macroBody = macroBody.replace(/\\(\d+)/g, (match, num) => {
                            const index = parseInt(num) - 1; // \1 is args[0]
                            return args[index] !== undefined ? args[index] : match;
                        });

                        // Replace named parameters with their argument values
                        // Support both numbered (\1) and named (paramName) parameters
                        if (macro.params) {
                            for (let i = 0; i < macro.params.length; i++) {
                                const paramName = macro.params[i].trim();
                                if (paramName && args[i] !== undefined) {
                                    // Use word boundaries to match whole parameter names only
                                    const regex = new RegExp(`\\b${paramName}\\b`, 'g');
                                    macroBody = macroBody.replace(regex, args[i]);
                                }
                            }
                        }

                        expandedSource += `; === MACRO EXPANSION: ${mnemonic} ===\n`;
                        expandedSource += macroBody + '\n';
                        expandedSource += `; === END MACRO: ${mnemonic} ===\n`;
                    } else if (mnemonic === 'times') {
                        // TIMES directive: repeat next instruction N times (gasm80 compatible)
                        // Parse: TIMES count instruction
                        // Need to find where count expression ends and instruction begins
                        const afterTimes = trimmed.substring(mnemonic.length).trim();

                        // Find the instruction part (DB, DW, NOP, etc.)
                        // Look for known directives or Z80 mnemonics
                        const instructionMatch = afterTimes.match(/\b(DB|DW|DS|DEFB|DEFW|DEFS|LD|NOP|ADD|SUB|AND|OR|XOR|CP|INC|DEC|PUSH|POP|CALL|RET|JP|JR|DJNZ)\b/i);

                        let countExpr, restOfLine;
                        if (instructionMatch) {
                            const instructionStart = instructionMatch.index;
                            countExpr = afterTimes.substring(0, instructionStart).trim();
                            restOfLine = afterTimes.substring(instructionStart).trim();
                        } else {
                            // No instruction found, assume everything after first token is the instruction
                            const spaceIdx = afterTimes.indexOf(' ');
                            if (spaceIdx > 0) {
                                countExpr = afterTimes.substring(0, spaceIdx).trim();
                                restOfLine = afterTimes.substring(spaceIdx).trim();
                            } else {
                                throw new Error(`TIMES directive at line ${lineIdx + 1}: Missing instruction after count`);
                            }
                        }

                        // Evaluate the count expression
                        let count = 0;
                        try {
                            count = parseInt(this.evaluateExpressionSimple(countExpr));
                        } catch (e) {
                            throw new Error(`TIMES directive at line ${lineIdx + 1}: Invalid count expression '${countExpr}' - ${e.message}`);
                        }

                        if (count < 0) {
                            throw new Error(`TIMES directive at line ${lineIdx + 1}: Negative count (${count}) not allowed`);
                        }

                        if (count > 65536) {
                            throw new Error(`TIMES directive at line ${lineIdx + 1}: Count too large (${count}), maximum is 65536`);
                        }

                        // Expand the instruction 'count' times
                        expandedSource += `; === TIMES ${count}: ${restOfLine} ===\n`;
                        for (let t = 0; t < count; t++) {
                            expandedSource += restOfLine + '\n';
                        }
                        expandedSource += `; === END TIMES ===\n`;
                    } else if (mnemonic === 'if') {
                        const condExpr = parts.slice(1).join(' ');
                        const condResult = this.evaluateCondition(condExpr);
                        conditionalStack.push({
                            condition: condResult,
                            hasElse: false,
                            line: lineIdx + 1
                        });
                        currentConditionState = this.calculateCurrentConditionState(conditionalStack);
                    } else if (mnemonic === 'ifdef') {
                        // IFDEF: Check if symbol is defined
                        const symbolName = parts.slice(1).join(' ').trim();
                        const isDefined = this.constantTable.hasOwnProperty(symbolName) ||
                                         this.symbolTable.hasOwnProperty(symbolName);
                        conditionalStack.push({
                            condition: isDefined,
                            hasElse: false,
                            line: lineIdx + 1
                        });
                        currentConditionState = this.calculateCurrentConditionState(conditionalStack);
                    } else if (mnemonic === 'ifndef') {
                        // IFNDEF: Check if symbol is NOT defined
                        const symbolName = parts.slice(1).join(' ').trim();
                        const isDefined = this.constantTable.hasOwnProperty(symbolName) ||
                                         this.symbolTable.hasOwnProperty(symbolName);
                        conditionalStack.push({
                            condition: !isDefined,
                            hasElse: false,
                            line: lineIdx + 1
                        });
                        currentConditionState = this.calculateCurrentConditionState(conditionalStack);
                    } else if (mnemonic === 'else') {
                        if (conditionalStack.length === 0) {
                            throw new Error(`ELSE without matching IF at line ${lineIdx + 1}`);
                        }
                        const current = conditionalStack[conditionalStack.length - 1];
                        if (current.hasElse) {
                            throw new Error(`Multiple ELSE clauses for IF at line ${current.line}`);
                        }
                        current.hasElse = true;
                        current.condition = !current.condition;
                        currentConditionState = this.calculateCurrentConditionState(conditionalStack);
                    } else if (mnemonic === 'elif') {
                        if (conditionalStack.length === 0) {
                            throw new Error(`ELIF without matching IF at line ${lineIdx + 1}`);
                        }
                        const condExpr = parts.slice(1).join(' ');
                        const condResult = this.evaluateCondition(condExpr);
                        const current = conditionalStack[conditionalStack.length - 1];
                        current.condition = condResult;
                        currentConditionState = this.calculateCurrentConditionState(conditionalStack);
                    } else if (mnemonic === 'endif') {
                        if (conditionalStack.length === 0) {
                            throw new Error(`ENDIF without matching IF at line ${lineIdx + 1}`);
                        }
                        conditionalStack.pop();
                        currentConditionState = this.calculateCurrentConditionState(conditionalStack);
                    } else if (mnemonic === 'include') {
                        const includeFile = parts.slice(1).join(' ').replace(/"/g, '');
                        const includedContent = await this.expandMacrosAndConditionals(includeFile, new Set(visited));
                        expandedSource += `; === INCLUDED FILE: ${includeFile} ===\n`;
                        expandedSource += includedContent + '\n';
                        expandedSource += `; === END OF ${includeFile} ===\n`;
                    } else {
                        // Check if this is a structure instance declaration
                        // Case 1: "label: StructType" or "label StructType" (with label)
                        // Case 2: "StructType" (unlabeled instance)
                        const structInstanceMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:?\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s|$)/);
                        if (structInstanceMatch && this.structTable[structInstanceMatch[2]]) {
                            // Labeled structure instance
                            const label = structInstanceMatch[1];
                            const structType = structInstanceMatch[2];
                            expandedSource += `${label}: STRUCT ${structType}\n`;
                        } else {
                            // Check for unlabeled structure instance: just "StructType"
                            const unlabeledMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:\s|$)/);
                            if (unlabeledMatch && this.structTable[unlabeledMatch[1]]) {
                                // Unlabeled structure instance
                                const structType = unlabeledMatch[1];
                                expandedSource += `STRUCT ${structType}\n`;
                            } else {
                                expandedSource += line + '\n';
                            }
                        }
                    }
                }

                if (inMacro) throw new Error(`Macro definition for ${currentMacro.name} was not closed with ENDM.`);
                if (conditionalStack.length > 0) {
                    throw new Error(`Unclosed IF directive at line ${conditionalStack[0].line}`);
                }
                
                return expandedSource;
            }

            calculateCurrentConditionState(conditionalStack) {
                return conditionalStack.length === 0 || conditionalStack.every(c => c.condition);
            }

            // ============================================
            // v2.1 REPEAT/ENDR Block Expansion
            // ============================================
            expandRepeatBlocks(lines) {
                const MAX_ITERATIONS = 65536;
                let result = [];
                let i = 0;

                while (i < lines.length) {
                    const line = lines[i];
                    const trimmed = line.trim();
                    const upperTrimmed = trimmed.toUpperCase();

                    // Check for REPEAT directive
                    if (upperTrimmed.startsWith('REPEAT ') || upperTrimmed === 'REPEAT') {
                        // Parse: REPEAT count [, counterVar]
                        const afterRepeat = trimmed.substring(6).trim();
                        let countExpr, counterVar = null;

                        // Check for counter variable: REPEAT count, varName
                        const commaIdx = afterRepeat.indexOf(',');
                        if (commaIdx > 0) {
                            countExpr = afterRepeat.substring(0, commaIdx).trim();
                            counterVar = afterRepeat.substring(commaIdx + 1).trim().replace(/;.*$/, '').trim();
                        } else {
                            countExpr = afterRepeat.replace(/;.*$/, '').trim();
                        }

                        let count = 0;
                        try {
                            count = Math.floor(this.evaluateExpressionSimple(countExpr));
                        } catch (e) {
                            throw new Error(`REPEAT at line ${i + 1}: Cannot evaluate count '${countExpr}' - ${e.message}`);
                        }

                        if (count < 0 || count > MAX_ITERATIONS) {
                            throw new Error(`REPEAT at line ${i + 1}: Invalid count ${count} (must be 0-${MAX_ITERATIONS})`);
                        }

                        // Find matching REND/ENDR (handle nesting)
                        let depth = 1;
                        let endIdx = i + 1;
                        while (depth > 0 && endIdx < lines.length) {
                            const checkLine = lines[endIdx].trim().toUpperCase();
                            if (checkLine.startsWith('REPEAT ') || checkLine === 'REPEAT') depth++;
                            if (checkLine === 'REND' || checkLine === 'ENDR' ||
                                checkLine.startsWith('REND ') || checkLine.startsWith('ENDR ')) depth--;
                            endIdx++;
                        }
                        endIdx--; // Point to REND/ENDR

                        if (depth !== 0) {
                            throw new Error(`REPEAT at line ${i + 1}: Missing REND/ENDR`);
                        }

                        // Extract body lines
                        const bodyLines = lines.slice(i + 1, endIdx);

                        // Expand the body 'count' times
                        result.push(`; === REPEAT ${count}${counterVar ? ', ' + counterVar : ''} ===`);
                        for (let iter = 0; iter < count; iter++) {
                            // Replace counter variable if specified
                            for (const bodyLine of bodyLines) {
                                let processedLine = bodyLine;

                                // Replace counter variable with current iteration value
                                if (counterVar) {
                                    const regex = new RegExp(`\\b${counterVar}\\b`, 'g');
                                    processedLine = processedLine.replace(regex, iter.toString());
                                }

                                // Process LET directives to update variables during expansion
                                const letMatch = processedLine.trim().match(/^LET\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/i);
                                if (letMatch) {
                                    const varName = letMatch[1];
                                    const varExpr = letMatch[2].trim().replace(/;.*$/, '').trim();
                                    try {
                                        this.variableTable[varName] = this.evaluateExpressionSimple(varExpr);
                                    } catch (e) {
                                        // Continue anyway, might be evaluated later
                                    }
                                    // Don't substitute variables in LET lines - they're processed for variable table only
                                    // Skip outputting LET lines since the variable is now in variableTable
                                    continue;
                                }

                                // Replace variables in the line with their current values
                                if (this.variableTable) {
                                    for (const [varName, varValue] of Object.entries(this.variableTable)) {
                                        const varRegex = new RegExp(`\\b${varName}\\b`, 'g');
                                        processedLine = processedLine.replace(varRegex, varValue.toString());
                                    }
                                }

                                result.push(processedLine);
                            }
                        }
                        result.push(`; === END REPEAT ===`);

                        i = endIdx + 1; // Skip past REND/ENDR
                    } else {
                        result.push(line);
                        i++;
                    }
                }

                // Recursively expand nested REPEATs that were inside outer REPEATs
                if (result.some(l => l.trim().toUpperCase().startsWith('REPEAT '))) {
                    return this.expandRepeatBlocks(result);
                }

                return result;
            }

            // ============================================
            // v2.1 WHILE/WEND Block Expansion
            // ============================================
            expandWhileBlocks(lines) {
                const MAX_ITERATIONS = 10000;
                let result = [];
                let i = 0;

                while (i < lines.length) {
                    const line = lines[i];
                    const trimmed = line.trim();
                    const upperTrimmed = trimmed.toUpperCase();

                    // Check for WHILE directive
                    if (upperTrimmed.startsWith('WHILE ')) {
                        // Parse: WHILE condition
                        const condition = trimmed.substring(5).trim().replace(/;.*$/, '').trim();

                        // Find matching WEND/ENDW (handle nesting)
                        let depth = 1;
                        let endIdx = i + 1;
                        while (depth > 0 && endIdx < lines.length) {
                            const checkLine = lines[endIdx].trim().toUpperCase();
                            if (checkLine.startsWith('WHILE ')) depth++;
                            if (checkLine === 'WEND' || checkLine === 'ENDW' || checkLine === 'WENDM' ||
                                checkLine.startsWith('WEND ') || checkLine.startsWith('ENDW ')) depth--;
                            endIdx++;
                        }
                        endIdx--; // Point to WEND

                        if (depth !== 0) {
                            throw new Error(`WHILE at line ${i + 1}: Missing WEND/ENDW`);
                        }

                        // Extract body lines
                        const bodyLines = lines.slice(i + 1, endIdx);

                        // Expand while condition is true
                        result.push(`; === WHILE ${condition} ===`);
                        let iterations = 0;

                        while (this.evaluateCondition(condition) && iterations < MAX_ITERATIONS) {
                            for (const bodyLine of bodyLines) {
                                // Process LET directives to update variables during expansion
                                const letMatch = bodyLine.trim().match(/^LET\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/i) ||
                                                 bodyLine.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+LET\s+(.+)$/i);
                                if (letMatch) {
                                    const varName = letMatch[1];
                                    const varExpr = letMatch[2].trim().replace(/;.*$/, '').trim();
                                    try {
                                        this.variableTable[varName] = this.evaluateExpressionSimple(varExpr);
                                    } catch (e) {
                                        // Continue anyway, might be evaluated later
                                    }
                                    // Don't output LET lines - they're processed for variable table only
                                    continue;
                                }

                                // Replace variables in the line with their current values
                                let processedLine = bodyLine;
                                if (this.variableTable) {
                                    for (const [varName, varValue] of Object.entries(this.variableTable)) {
                                        const varRegex = new RegExp(`\\b${varName}\\b`, 'g');
                                        processedLine = processedLine.replace(varRegex, varValue.toString());
                                    }
                                }
                                result.push(processedLine);
                            }
                            iterations++;
                        }

                        if (iterations >= MAX_ITERATIONS) {
                            throw new Error(`WHILE at line ${i + 1}: Exceeded ${MAX_ITERATIONS} iterations (infinite loop?)`);
                        }

                        result.push(`; === END WHILE (${iterations} iterations) ===`);
                        i = endIdx + 1; // Skip past WEND
                    } else {
                        result.push(line);
                        i++;
                    }
                }

                return result;
            }

            // ============================================
            // v2.1 SWITCH/CASE Block Expansion
            // ============================================
            expandSwitchBlocks(lines) {
                let result = [];
                let i = 0;

                while (i < lines.length) {
                    const line = lines[i];
                    const trimmed = line.trim();
                    const upperTrimmed = trimmed.toUpperCase();

                    // Check for SWITCH directive
                    if (upperTrimmed.startsWith('SWITCH ')) {
                        // Parse: SWITCH expression
                        const switchExpr = trimmed.substring(6).trim().replace(/;.*$/, '').trim();

                        // Find matching ENDSWITCH (handle nesting)
                        let depth = 1;
                        let endIdx = i + 1;
                        while (depth > 0 && endIdx < lines.length) {
                            const checkLine = lines[endIdx].trim().toUpperCase();
                            if (checkLine.startsWith('SWITCH ')) depth++;
                            if (checkLine === 'ENDSWITCH' || checkLine === 'ENDS' ||
                                checkLine.startsWith('ENDSWITCH ')) depth--;
                            endIdx++;
                        }
                        endIdx--; // Point to ENDSWITCH

                        if (depth !== 0) {
                            throw new Error(`SWITCH at line ${i + 1}: Missing ENDSWITCH`);
                        }

                        // Convert SWITCH/CASE to IF/ELIF/ELSE
                        result.push(`; === SWITCH ${switchExpr} ===`);
                        let isFirst = true;
                        let j = i + 1;

                        while (j < endIdx) {
                            const caseLine = lines[j].trim();
                            const caseUpper = caseLine.toUpperCase();

                            if (caseUpper.startsWith('CASE ')) {
                                // Extract case value
                                const caseValue = caseLine.substring(4).trim().replace(/;.*$/, '').trim();
                                if (isFirst) {
                                    result.push(`IF ${switchExpr} == ${caseValue}`);
                                    isFirst = false;
                                } else {
                                    result.push(`ELIF ${switchExpr} == ${caseValue}`);
                                }
                            } else if (caseUpper === 'DEFAULT' || caseUpper.startsWith('DEFAULT ')) {
                                result.push(`ELSE`);
                            } else if (caseUpper === 'BREAK' || caseUpper.startsWith('BREAK ')) {
                                // BREAK is implicit in IF/ELIF structure - skip it
                            } else {
                                result.push(lines[j]);
                            }
                            j++;
                        }

                        result.push(`ENDIF`);
                        result.push(`; === END SWITCH ===`);
                        i = endIdx + 1; // Skip past ENDSWITCH
                    } else {
                        result.push(line);
                        i++;
                    }
                }

                return result;
            }

            evaluateCondition(expr) {
                try {
                    // Simple condition evaluation
                    // Replace symbols with their values
                    let evalExpr = expr;

                    // Handle defined() function
                    evalExpr = evalExpr.replace(/defined\s*\(\s*([^)]+)\s*\)/g, (match, symbol) => {
                        return (this.constantTable[symbol] !== undefined ||
                                this.symbolTable[symbol] !== undefined ||
                                (this.variableTable && this.variableTable[symbol] !== undefined)) ? '1' : '0';
                    });

                    // Replace variables first (v2.1 LET)
                    if (this.variableTable) {
                        for (const [symbol, value] of Object.entries(this.variableTable)) {
                            const regex = new RegExp(`\\b${symbol}\\b`, 'g');
                            evalExpr = evalExpr.replace(regex, value);
                        }
                    }

                    // Replace symbols with their constant values
                    for (const [symbol, value] of Object.entries(this.constantTable)) {
                        const regex = new RegExp(`\\b${symbol}\\b`, 'g');
                        evalExpr = evalExpr.replace(regex, value);
                    }

                    // Try to parse numbers
                    evalExpr = evalExpr.replace(/\$[0-9a-fA-F]+/g, (match) => {
                        return parseInt(match.substring(1), 16).toString();
                    });

                    // Basic expression evaluation
                    const result = new Function(`return ${evalExpr}`)();
                    return Boolean(result);
                } catch (e) {
                    log(`Warning: Could not evaluate condition '${expr}', assuming false`, 'warn');
                    return false;
                }
            }

            evaluateExpressionSimple(expr) {
                // Simple expression evaluator for Pass 1 (before full symbol table exists)
                // Only handles constants and basic math - no labels
                try {
                    let evalExpr = expr.trim();

                    // Replace variables from variableTable first (v2.1 LET)
                    if (this.variableTable) {
                        for (const [symbol, value] of Object.entries(this.variableTable)) {
                            const regex = new RegExp(`\\b${symbol}\\b`, 'g');
                            evalExpr = evalExpr.replace(regex, value);
                        }
                    }

                    // Replace hex numbers ($FF or 0xFF format)
                    evalExpr = evalExpr.replace(/\$([0-9a-fA-F]+)/g, (match, hex) => {
                        return '0x' + hex;
                    });

                    // Replace binary numbers (0b format or %format)
                    evalExpr = evalExpr.replace(/0b([01]+)/gi, (match, bin) => {
                        return parseInt(bin, 2).toString();
                    });
                    evalExpr = evalExpr.replace(/%([01]+)/g, (match, bin) => {
                        return parseInt(bin, 2).toString();
                    });

                    // Parse octal (@377)
                    evalExpr = evalExpr.replace(/@([0-7]+)/g, (match, oct) => parseInt(oct, 8));

                    // Replace constants from constantTable
                    for (const [symbol, value] of Object.entries(this.constantTable)) {
                        const regex = new RegExp(`\\b${symbol}\\b`, 'g');
                        evalExpr = evalExpr.replace(regex, value);
                    }

                    // ============================================
                    // v2.1 MATH FUNCTIONS - Process iteratively to handle nesting
                    // ============================================
                    const DEG_TO_RAD = Math.PI / 180;
                    const RAD_TO_DEG = 180 / Math.PI;

                    // Helper to evaluate inner expression with nesting support
                    const evalInner = (inner) => {
                        try {
                            return new Function(`return ${inner}`)();
                        } catch (e) {
                            return parseFloat(inner);
                        }
                    };

                    // Process functions iteratively until no more changes
                    let prevExpr = '';
                    let maxIter = 20;
                    while (evalExpr !== prevExpr && maxIter-- > 0) {
                        prevExpr = evalExpr;

                        // Trig functions first (often innermost)
                        evalExpr = evalExpr.replace(/\bSIN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.sin(evalInner(a) * DEG_TO_RAD));
                        evalExpr = evalExpr.replace(/\bCOS\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.cos(evalInner(a) * DEG_TO_RAD));
                        evalExpr = evalExpr.replace(/\bTAN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.tan(evalInner(a) * DEG_TO_RAD));
                        evalExpr = evalExpr.replace(/\bASIN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.asin(evalInner(a)) * RAD_TO_DEG);
                        evalExpr = evalExpr.replace(/\bACOS\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.acos(evalInner(a)) * RAD_TO_DEG);
                        evalExpr = evalExpr.replace(/\bATAN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.atan(evalInner(a)) * RAD_TO_DEG);

                        // Log/Exp functions
                        evalExpr = evalExpr.replace(/\bLOG10\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.log10(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bLOG2\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.log2(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bLOG\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.log(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bEXP\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.exp(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bSQRT\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.sqrt(evalInner(a)));

                        // Other single-arg math functions
                        evalExpr = evalExpr.replace(/\bABS\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.abs(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bFLOOR\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.floor(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bCEIL\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.ceil(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bROUND\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.round(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bSGN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.sign(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bINT\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.trunc(evalInner(a)));
                        evalExpr = evalExpr.replace(/\bFRAC\s*\(\s*([^()]+)\s*\)/gi, (m, a) => evalInner(a) % 1);

                        // Two-argument functions
                        evalExpr = evalExpr.replace(/\bMIN\s*\(\s*([^(),]+)\s*,\s*([^()]+)\s*\)/gi,
                            (m, a, b) => Math.min(evalInner(a), evalInner(b)));
                        evalExpr = evalExpr.replace(/\bMAX\s*\(\s*([^(),]+)\s*,\s*([^()]+)\s*\)/gi,
                            (m, a, b) => Math.max(evalInner(a), evalInner(b)));
                        evalExpr = evalExpr.replace(/\bPOW\s*\(\s*([^(),]+)\s*,\s*([^()]+)\s*\)/gi,
                            (m, a, b) => Math.pow(evalInner(a), evalInner(b)));
                        evalExpr = evalExpr.replace(/\bATAN2\s*\(\s*([^(),]+)\s*,\s*([^()]+)\s*\)/gi,
                            (m, y, x) => Math.atan2(evalInner(y), evalInner(x)) * RAD_TO_DEG);

                        // RND - random number
                        evalExpr = evalExpr.replace(/\bRND\s*\(\s*([^()]+)\s*\)/gi,
                            (m, a) => Math.floor(Math.random() * evalInner(a)));
                    }

                    // Evaluate the expression
                    const result = new Function(`return ${evalExpr}`)();
                    return result;
                } catch (e) {
                    throw new Error(`Cannot evaluate expression '${expr}': ${e.message}`);
                }
            }

            processTemporarySymbol(label) {
                if (label.startsWith('$')) {
                    // Named temporary symbol
                    return `__temp_named_${this.tempSymbolCounters.named}_${label.substring(2)}`;
                } else if (label === '+' || label === '-' || label === '/') {
                    // Nameless temporary symbol
                    if (label === '+') {
                        const newLabel = `__temp_plus_${this.tempSymbolCounters.plus}`;
                        this.tempSymbolCounters.plus++;
                        return newLabel;
                    } else if (label === '-') {
                        const newLabel = `__temp_minus_${this.tempSymbolCounters.minus}`;
                        this.tempSymbolCounters.minus++;
                        return newLabel;
                    } else if (label === '/') {
                        const newLabel = `__temp_slash_${this.tempSymbolCounters.slash}`;
                        this.tempSymbolCounters.slash++;
                        return newLabel;
                    }
                } else if (label.startsWith('.')) {
                    // Composed temporary symbol
                    return `${this.lastNonTempSymbol}${label}`;
                }
                return label;
            }

            resolveTemporarySymbolReference(symbol) {
                // Handle references to temporary symbols in expressions
                if (symbol === '+' || symbol === '++' || symbol === '+++') {
                    const lookAhead = symbol.length;
                    // Find the next plus symbol
                    for (let i = this.tempSymbolCounters.plus; i < this.tempSymbolCounters.plus + 10; i++) {
                        const candidate = `__temp_plus_${i}`;
                        if (this.symbolTable[candidate] !== undefined) {
                            return candidate;
                        }
                    }
                } else if (symbol === '-' || symbol === '--' || symbol === '---') {
                    const lookBack = symbol.length;
                    // Find the previous minus symbol
                    for (let i = this.tempSymbolCounters.minus - 1; i >= Math.max(0, this.tempSymbolCounters.minus - 10); i--) {
                        const candidate = `__temp_minus_${i}`;
                        if (this.symbolTable[candidate] !== undefined) {
                            return candidate;
                        }
                    }
                } else if (symbol.startsWith('.')) {
                    // Composed local label reference
                    // CRITICAL: Use lastNonTempSymbol as the primary parent function
                    // This is more reliable than searching by PC, especially when PC jumps around due to ORG directives

                    // Step 1: Try using lastNonTempSymbol first
                    if (this.lastNonTempSymbol) {
                        const composedLabel = `${this.lastNonTempSymbol}${symbol}`;
                        if (this.symbolTable[composedLabel] !== undefined) {
                            log(`DEBUG: Resolved local label '${symbol}' to '${composedLabel}' (parent: ${this.lastNonTempSymbol}) at PC ${this.pc}`, 'debug');
                            return composedLabel;
                        } else {
                            log(`DEBUG: Composed label '${composedLabel}' not found in symbol table, returning as-is at PC ${this.pc}`, 'debug');
                            return composedLabel;  // Return it anyway, will be caught as undefined later if it doesn't exist
                        }
                    }

                    // Step 2: Fallback - Find the parent function (nearest CODE label before current PC)
                    let parentFunction = null;
                    let parentAddress = -1;

                    for (const [symName, symAddr] of Object.entries(this.symbolTable)) {
                        // Skip dot-prefixed symbols and composed local labels (containing dots)
                        if (symName.startsWith('.') || symName.startsWith('__') || symName.includes('.')) continue;

                        // CRITICAL: Only consider CODE labels, not data labels or constants
                        const symInfo = this.symbolInfo[symName];
                        if (!symInfo || symInfo.category !== 'code') continue;

                        // Skip symbols after current PC
                        if (symAddr > this.pc) continue;

                        // Find the closest one before PC
                        if (symAddr > parentAddress) {
                            parentAddress = symAddr;
                            parentFunction = symName;
                        }
                    }

                    if (parentFunction) {
                        const composedLabel = `${parentFunction}${symbol}`;
                        log(`DEBUG: Fallback resolved local label '${symbol}' to '${composedLabel}' (parent by PC search: ${parentFunction}) at PC ${this.pc}`, 'debug');
                        return composedLabel;
                    }

                    // Last resort: return as-is
                    log(`DEBUG: Could not resolve local label '${symbol}', returning as-is at PC ${this.pc}`, 'debug');
                    return symbol;
                }
                return symbol;
            }

            trackFileStart(filename, address) {
                this.fileStartAddress = address;
                this.currentFile = filename;
            }

            trackFileEnd(filename, address, type = 'code') {
                const size = address - this.fileStartAddress;
                this.fileMap.push({
                    filename: filename,
                    startAddr: this.fileStartAddress,
                    endAddr: address,
                    size: size,
                    type: type
                });
                
                if (type === 'code') {
                    this.compilationStats.codeSize += size;
                } else {
                    this.compilationStats.dataSize += size;
                }
            }

            buildSymbolTable(tokens) {
                this.pc = 0;
                this.symbolTable = {};
                this.constantTable = {};
                this.symbolInfo = {};
                this.fileMap = [];
                let currentSourceFile = 'main';

                // Track ROM output position separately from PC for BSS (RAM) sections
                let romPC = 0;          // Where we are in actual ROM output
                let inBSSSection = false;  // True when in BSS (RAM) section

                // Create SIZEOF symbols for all defined structures
                for (const structName in this.structTable) {
                    const structDef = this.structTable[structName];
                    this.symbolTable[`SIZEOF_${structName}`] = structDef.size;
                    this.constantTable[`SIZEOF_${structName}`] = structDef.size;
                    this.symbolInfo[`SIZEOF_${structName}`] = {
                        value: structDef.size,
                        lineNumber: 0,
                        filename: currentSourceFile,
                        type: 'constant'
                    };
                }

                for (let i = 0; i < tokens.length; i++) {
                    const token = tokens[i];
                    this.currentInstruction = token;
                    this.currentLine = token.lineNumber || 0;

                    try {
                        if (token.label) {
                            const processedLabel = this.processTemporarySymbol(token.label);

                            if (this.symbolTable[processedLabel] !== undefined) {
                               log(`Warning: Redefining label '${processedLabel}' at line ${this.currentLine}`, 'warn');
                            }

                            // Determine symbol category: constant, data, or code
                            let symbolType = 'label';
                            let symbolCategory = 'code'; // default to code

                            if (token instanceof Directive && ['EQU', 'EVAL', 'CONSTANT'].includes(token.name)) {
                                symbolType = 'constant';
                                symbolCategory = 'constant';
                            } else if (token instanceof Directive && ['DB', 'DW', 'DS', 'DEFB', 'DEFW', 'DEFS'].includes(token.name)) {
                                symbolType = 'label';
                                symbolCategory = 'data';
                            } else if (token instanceof Instruction) {
                                symbolType = 'label';
                                symbolCategory = 'code';
                            } else {
                                // Label on its own line - peek at next token to determine category
                                const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
                                if (nextToken instanceof Directive && ['DB', 'DW', 'DS', 'DEFB', 'DEFW', 'DEFS'].includes(nextToken.name)) {
                                    symbolCategory = 'data';
                                } else if (nextToken instanceof Instruction) {
                                    // Only CODE if followed by actual instruction
                                    symbolCategory = 'code';
                                } else {
                                    // EQU, SECTION, or other directives - keep current section's category
                                    // In BSS section, treat as data; otherwise as code
                                    symbolCategory = inBSSSection ? 'data' : 'code';
                                }
                            }

                            // CRITICAL: If we encounter a CODE label (followed by instruction) while in BSS section, implicitly return to CODE
                            // Only trigger for labels that are actually followed by instructions
                            if (inBSSSection && symbolCategory === 'code') {
                                const oldPC = this.pc;
                                inBSSSection = false;
                                this.currentSection = 'CODE';  // Return to CODE section
                                this.pc = (this.firstOrg || 0) + romPC;
                                if (this.currentLine <= 900) {
                                    log(`DEBUG SECTION: Line ${this.currentLine}, CODE label '${processedLabel}' - returning to CODE, PC ${oldPC} -> ${this.pc}, romPC=${romPC}`, 'debug');
                                }
                            }

                            this.symbolTable[processedLabel] = this.pc;

                            this.symbolInfo[processedLabel] = {
                                address: this.pc,
                                file: currentSourceFile,
                                lineNumber: this.currentLine,
                                type: symbolType,
                                category: symbolCategory,  // 'code', 'data', or 'constant'
                                size: 0
                            };

                            // Track last non-temporary symbol for composed temporary symbols
                            // CRITICAL: Only track CODE labels, not DATA labels or constants
                            if (!token.label.startsWith('.') && !['+', '-', '/'].includes(token.label)) {
                                if (symbolCategory === 'code') {
                                    const oldLast = this.lastNonTempSymbol;
                                    this.lastNonTempSymbol = processedLabel;
                                    // DEBUG: Commented out verbose logging
                                    // if (this.currentLine >= 800 && this.currentLine <= 880) {
                                    //     log(`DEBUG LAST: Line ${this.currentLine}, updated lastNonTempSymbol: '${oldLast}' -> '${processedLabel}' (category: ${symbolCategory})`, 'debug');
                                    // }
                                } else {
                                    // DEBUG: Commented out verbose logging
                                    // if (this.currentLine >= 800 && this.currentLine <= 880) {
                                    //     log(`DEBUG LAST: Line ${this.currentLine}, NOT updating lastNonTempSymbol for '${processedLabel}' (category: ${symbolCategory})`, 'debug');
                                    // }
                                }
                            }
                        }

                        if (token instanceof Directive) {
                            switch (token.name) {
                                case 'ORG':
                                    const newPC = this.evaluateExpression(token.operands[0]);
                                    const wasInBSS = (this.currentSection === 'BSS');

                                    // Initialize sectionPCs on first ORG
                                    if (this.firstOrg === null) {
                                        this.firstOrg = newPC;
                                        this.sectionPCs.CODE = newPC;
                                        this.sectionPCs.DATA = newPC;
                                        this.sectionPCs.BSS = newPC;
                                    }

                                    // Auto-detect BSS section: backward ORG or ORG to address < romPC
                                    // This provides backwards compatibility for code without explicit SECTION directives
                                    if (newPC < this.pc || (this.firstOrg !== null && newPC < this.firstOrg + romPC)) {
                                        // Entering BSS section (RAM variables)
                                        inBSSSection = true;
                                        this.currentSection = 'BSS';  // Auto-detect BSS on backward ORG
                                        if (!wasInBSS && this.currentLine <= 900) {
                                            log(`DEBUG SECTION: Line ${this.currentLine}, entering BSS section (auto-detected), PC ${this.pc} -> ${newPC}, romPC stays at ${romPC}`, 'debug');
                                        }
                                    } else if (inBSSSection && newPC >= this.firstOrg) {
                                        // Leaving BSS section, returning to CODE
                                        inBSSSection = false;
                                        this.currentSection = 'CODE';  // Return to CODE on forward ORG
                                        romPC = newPC - (this.firstOrg || 0);
                                        if (this.currentLine <= 900) {
                                            log(`DEBUG SECTION: Line ${this.currentLine}, leaving BSS section, PC ${this.pc} -> ${newPC}, romPC updated to ${romPC}`, 'debug');
                                        }
                                    }

                                    if (!inBSSSection) {
                                        romPC = newPC - (this.firstOrg || 0);
                                    }

                                    this.pc = newPC;
                                    this.sectionPCs[this.currentSection] = newPC;
                                    this.trackFileStart(currentSourceFile, this.pc);
                                    break;
                                case 'EQU':
                                    // Handle both formats:
                                    // Traditional: LABEL EQU value (token.label exists, operands[0] = value)
                                    // TASM-style: .equ LABEL, value (no token.label, operands[0] = LABEL, operands[1] = value)
                                    let equLabel, equValueOperand;
                                    if (token.label) {
                                        // Traditional format: LABEL EQU value
                                        equLabel = token.label;
                                        equValueOperand = token.operands[0];
                                    } else if (token.operands.length >= 2) {
                                        // TASM format: .equ LABEL, value
                                        equLabel = token.operands[0].value;
                                        equValueOperand = token.operands[1];
                                    } else {
                                        throw new Error("EQU directive requires a label.");
                                    }

                                    const equValue = this.evaluateExpression(equValueOperand);
                                    const processedEquLabel = this.processTemporarySymbol(equLabel);
                                    this.symbolTable[processedEquLabel] = equValue;
                                    this.constantTable[processedEquLabel] = equValue;
                                    this.symbolInfo[processedEquLabel] = {
                                        address: equValue,
                                        file: currentSourceFile,
                                        lineNumber: this.currentLine,
                                        type: 'constant',
                                        size: 0
                                    };
                                    break;
                                case 'EVAL':
                                    if (!token.label) throw new Error(`${token.name} directive requires a label.`);
                                    const setValue = this.evaluateExpression(token.operands[0]);
                                    const processedSetLabel = this.processTemporarySymbol(token.label);
                                    this.constantTable[processedSetLabel] = setValue;
                                    this.symbolInfo[processedSetLabel] = {
                                        address: setValue,
                                        file: currentSourceFile,
                                        lineNumber: this.currentLine,
                                        type: 'variable',
                                        size: 0
                                    };
                                    break;
                                case 'CONSTANT':
                                    // KCPSM-style constant definition
                                    if (token.operands.length < 2) throw new Error("CONSTANT directive requires name and value.");
                                    const constName = token.operands[0].value;
                                    const constValue = this.evaluateExpression(token.operands[1]);
                                    this.constantTable[constName] = constValue;
                                    this.symbolInfo[constName] = {
                                        address: constValue,
                                        file: currentSourceFile,
                                        lineNumber: this.currentLine,
                                        type: 'constant',
                                        size: 0
                                    };
                                    break;
                                case 'DB': case 'DEFB': case 'DEFM': case 'ASCII': case 'TEXT': case 'BYTE':
                                    const dbSize = token.operands.reduce((sum, op) =>
                                        sum + ((op.type === 'string') ? op.value.length : 1), 0);
                                    this.pc += dbSize;
                                    if (!inBSSSection) romPC += dbSize;
                                    break;
                                case 'DW': case 'DEFW': case 'WORD':
                                    const dwSize = token.operands.length * 2;
                                    this.pc += dwSize;
                                    if (!inBSSSection) romPC += dwSize;
                                    break;
                                case 'DS': case 'DEFS':
                                    // DS/DEFS: Reserve space
                                    // DS n - only in BSS (uninitialized RAM)
                                    // DS n, fill - allowed anywhere (fills with byte value)
                                    {
                                        const dsSize = this.evaluateExpression(token.operands[0]);
                                        const hasFillValue = token.operands.length > 1;

                                        if (!hasFillValue && this.currentSection !== 'BSS') {
                                            log(`ERROR: DS directive at line ${this.currentLine} without fill value can only be used in BSS section`, 'error');
                                            throw new Error(`DS directive at line ${this.currentLine} without fill value can only be used in BSS section (RAM). Use 'DS ${dsSize}, 0' to fill with zeros in ROM, or 'SECTION BSS' for uninitialized RAM.`);
                                        }
                                        if (dsSize > 65536) {
                                            log(`ERROR: DS directive at line ${this.currentLine} (Pass 2) has suspiciously large size: ${dsSize}`, 'error');
                                            throw new Error(`DS size too large: ${dsSize} (max 65536). Check operand: ${token.operands[0].value}`);
                                        }
                                        this.pc += dsSize;
                                        if (!inBSSSection) romPC += dsSize;
                                    }
                                    break;
                                case 'BLOCK':
                                    // BLOCK count [, fill] - reserve space filled with value (default 0)
                                    // Similar to DS but fill value defaults to 0 instead of requiring BSS
                                    {
                                        const blockSize = this.evaluateExpression(token.operands[0]);
                                        this.pc += blockSize;
                                        if (!inBSSSection) romPC += blockSize;
                                    }
                                    break;
                                case 'INCBIN':
                                    // Enhanced INCBIN supporting multiple styles:
                                    // Style 1 (positional): INCBIN "file.bin" [, offset [, length]]
                                    // Style 2 (WLA-DX): INCBIN "file.bin", SKIP n, READ n, FSIZE label
                                    const incbinFilename = token.operands[0].value;
                                    const incbinFullData = this.findFile(incbinFilename);

                                    // Parse optional parameters
                                    let incbinSkip = 0;
                                    let incbinRead = incbinFullData.length;
                                    let incbinFsizeLabel = null;

                                    // Check if using named parameters (SKIP, READ, FSIZE) or positional
                                    const hasNamedParams = token.operands.length > 1 &&
                                        token.operands.slice(1).some(op =>
                                            op.type === 'symbol' && ['SKIP', 'READ', 'FSIZE'].includes(op.value.toUpperCase())
                                        );

                                    if (hasNamedParams) {
                                        // WLA-DX style named parameters
                                        for (let i = 1; i < token.operands.length; i++) {
                                            const operand = token.operands[i];
                                            if (operand.type === 'symbol') {
                                                const paramName = operand.value.toUpperCase();
                                                if (paramName === 'SKIP' && i + 1 < token.operands.length) {
                                                    const skipValue = this.evaluateExpression(token.operands[i + 1]);
                                                    incbinSkip = skipValue < 0 ? incbinFullData.length + skipValue : skipValue;
                                                    i++; // Skip next operand (value)
                                                } else if (paramName === 'READ' && i + 1 < token.operands.length) {
                                                    const readValue = this.evaluateExpression(token.operands[i + 1]);
                                                    incbinRead = readValue < 0 ? incbinFullData.length + readValue - incbinSkip : readValue;
                                                    i++; // Skip next operand (value)
                                                } else if (paramName === 'FSIZE' && i + 1 < token.operands.length) {
                                                    incbinFsizeLabel = token.operands[i + 1].value;
                                                    i++; // Skip next operand (label name)
                                                }
                                            }
                                        }
                                    } else {
                                        // Positional style: INCBIN "file", offset, length
                                        if (token.operands.length > 1) {
                                            incbinSkip = this.evaluateExpression(token.operands[1]);
                                        }
                                        if (token.operands.length > 2) {
                                            incbinRead = this.evaluateExpression(token.operands[2]);
                                        } else if (token.operands.length > 1) {
                                            // If only offset given, read from offset to end
                                            incbinRead = incbinFullData.length - incbinSkip;
                                        }
                                    }

                                    // Validate range
                                    if (incbinSkip < 0 || incbinSkip >= incbinFullData.length) {
                                        throw new Error(`INCBIN SKIP value ${incbinSkip} is out of range for file ${incbinFilename} (size: ${incbinFullData.length})`);
                                    }
                                    if (incbinRead < 0) {
                                        throw new Error(`INCBIN READ value ${incbinRead} is invalid (after negative offset calculation)`);
                                    }
                                    if (incbinSkip + incbinRead > incbinFullData.length) {
                                        incbinRead = incbinFullData.length - incbinSkip;
                                    }

                                    // Create FSIZE symbol if requested
                                    if (incbinFsizeLabel) {
                                        this.symbolTable[incbinFsizeLabel] = incbinRead;
                                        this.symbolInfo[incbinFsizeLabel] = {
                                            value: incbinRead,
                                            lineNumber: this.currentLine,
                                            filename: this.currentFile,
                                            type: 'constant'
                                        };
                                    }

                                    const incbinStartAddr = this.pc;
                                    this.pc += incbinRead;
                                    if (!inBSSSection) romPC += incbinRead;
                                    // Store size on token so the optimizer can track PC across INCBINs
                                    token.incbinSize = incbinRead;

                                    // Track binary file inclusion with range info
                                    this.fileMap.push({
                                        filename: incbinFilename,
                                        startAddr: incbinStartAddr,
                                        endAddr: this.pc,
                                        size: incbinRead,
                                        type: 'binary',
                                        skip: incbinSkip,
                                        totalSize: incbinFullData.length
                                    });
                                    break;
                                case 'RADIX':
                                    this.numberParser.defaultRadix = this.evaluateExpression(token.operands[0]);
                                    break;
                                case 'SECTION':
                                    // Handle SECTION directive: CODE, DATA, BSS (v2.0.0)
                                    if (token.operands.length > 0) {
                                        const sectionName = token.operands[0].value.toUpperCase();
                                        const validSections = ['CODE', 'DATA', 'BSS'];

                                        if (!validSections.includes(sectionName)) {
                                            throw new Error(`SECTION directive at line ${this.currentLine}: Invalid section '${sectionName}'. Valid sections: CODE, DATA, BSS`);
                                        }

                                        // Save current section's PC before switching
                                        this.sectionPCs[this.currentSection] = this.pc;

                                        // Track if we're leaving BSS section
                                        const wasInBSS = inBSSSection;

                                        // Switch to new section
                                        this.currentSection = sectionName;
                                        inBSSSection = (sectionName === 'BSS');

                                        // If this section hasn't been used yet (PC still at initial ORG),
                                        // continue from current position instead of jumping back
                                        if (this.sectionPCs[sectionName] === this.firstOrg && sectionName !== 'CODE') {
                                            this.sectionPCs[sectionName] = this.pc;
                                        }

                                        // When returning to CODE from BSS, calculate PC from romPC
                                        // (BSS doesn't contribute to ROM, so CODE continues from where it left off in ROM)
                                        if (wasInBSS && sectionName === 'CODE') {
                                            this.pc = (this.firstOrg || 0) + romPC;
                                            this.sectionPCs['CODE'] = this.pc;
                                        } else {
                                            this.pc = this.sectionPCs[sectionName];
                                        }

                                        log(`Switched to ${this.currentSection} section (PC: $${this.pc.toString(16)}, CODE PC: $${this.sectionPCs.CODE.toString(16)}, BSS PC: $${this.sectionPCs.BSS.toString(16)}, romPC: ${romPC})`, 'info');
                                    } else {
                                        throw new Error(`SECTION directive at line ${this.currentLine}: Requires a section name (CODE, DATA, or BSS)`);
                                    }
                                    break;
                                case 'ALIGN':
                                    // ALIGN directive: pad PC to next alignment boundary
                                    // Syntax: ALIGN boundary
                                    // Example: ALIGN 128  (align to next 128-byte boundary)
                                    const alignBoundary = this.evaluateExpression(token.operands[0]);
                                    if (alignBoundary <= 0 || alignBoundary > 65536) {
                                        throw new Error(`ALIGN directive at line ${this.currentLine}: Invalid alignment ${alignBoundary} (must be 1-65536)`);
                                    }
                                    // Calculate padding needed
                                    const alignPadding = (alignBoundary - (this.pc % alignBoundary)) % alignBoundary;
                                    this.pc += alignPadding;
                                    if (!inBSSSection) romPC += alignPadding;
                                    break;
                                case 'ASSERT':
                                    // ASSERT directive: validate condition at compile time
                                    // Syntax: ASSERT expression [, "error message"]
                                    if (token.operands.length === 0) {
                                        throw new Error(`ASSERT directive at line ${this.currentLine}: Missing expression`);
                                    }

                                    const assertCondition = this.evaluateExpression(token.operands[0]);

                                    if (!assertCondition) {
                                        // Get custom error message if provided
                                        let assertMsg = 'Assertion failed';
                                        if (token.operands.length > 1 && token.operands[1].type === 'string') {
                                            assertMsg = token.operands[1].value;
                                        }
                                        throw new Error(`ASSERT failed at line ${this.currentLine}: ${assertMsg}`);
                                    }
                                    // ASSERT passes - no PC change, no output
                                    break;
                                case 'STRUCT':
                                    // Structure definitions are processed in Pass 1 (macro expansion)
                                    // But structure instances are handled here in Pass 2
                                    // Syntax: labelName StructType (labeled) or StructType (unlabeled)
                                    if (token.operands.length > 0) {
                                        const structType = token.operands[0].value;
                                        const structDef = this.structTable[structType];

                                        if (structDef) {
                                            // Create field offset symbols only if labeled: labelName.fieldName = PC + offset
                                            if (token.label) {
                                                const baseAddr = this.pc;
                                                for (const field of structDef.fields) {
                                                    const fieldSymbol = `${token.label}.${field.name}`;
                                                    this.symbolTable[fieldSymbol] = baseAddr + field.offset;
                                                    this.symbolInfo[fieldSymbol] = {
                                                        address: baseAddr + field.offset,
                                                        file: currentSourceFile,
                                                        lineNumber: this.currentLine,
                                                        type: 'struct_field',
                                                        size: field.size,
                                                        structType: structType
                                                    };
                                                }
                                            }

                                            // SIZEOF symbol already created at start of Pass 2

                                            // Advance PC by structure size (labeled or unlabeled)
                                            this.pc += structDef.size;
                                            if (!inBSSSection) romPC += structDef.size;
                                        } else {
                                            throw new Error(`Undefined structure type: ${structType} at line ${this.currentLine}`);
                                        }
                                    }
                                    // If no operands, it's just the definition (already processed in Pass 1)
                                    break;
                                case 'ENDSTRUCT':
                                    // Structure end - already processed in Pass 1
                                    break;
                                // ============================================
                                // v2.1 DIRECTIVES: PRINT, FAIL, STOP, LET
                                // ============================================
                                case 'PRINT':
                                    // PRINT directive: output messages during assembly
                                    // Syntax: PRINT "message" | PRINT "text", expr | PRINT {hex} expr
                                    if (this.currentPass === 2) {
                                        let printOutput = '';
                                        let printFormat = 'dec'; // default format

                                        for (const operand of token.operands) {
                                            const opVal = operand.value;
                                            // Check for format specifiers (can be string or symbol type)
                                            if (opVal === '{hex}') { printFormat = 'hex'; continue; }
                                            if (opVal === '{bin}') { printFormat = 'bin'; continue; }
                                            if (opVal === '{dec}') { printFormat = 'dec'; continue; }

                                            if (operand.type === 'string') {
                                                printOutput += opVal;
                                            } else {
                                                // Evaluate expression (preserveFloat=true to show fractional values)
                                                const val = this.evaluateExpression(operand, true);
                                                switch (printFormat) {
                                                    case 'hex': printOutput += '$' + Math.floor(val).toString(16).toUpperCase(); break;
                                                    case 'bin': printOutput += '%' + Math.floor(val).toString(2); break;
                                                    default: printOutput += val.toString();
                                                }
                                            }
                                        }
                                        log(`[PRINT] ${printOutput}`, 'info');
                                    }
                                    break;
                                case 'FAIL':
                                    // FAIL directive: stop assembly with error message
                                    // Syntax: FAIL "error message" | FAIL
                                    {
                                        const failMsg = token.operands.length > 0 && token.operands[0].type === 'string'
                                            ? token.operands[0].value
                                            : 'Assembly stopped by FAIL directive';
                                        throw new Error(`FAIL at line ${this.currentLine}: ${failMsg}`);
                                    }
                                case 'STOP':
                                    // STOP directive: stop assembly without error
                                    // Syntax: STOP
                                    log(`Assembly stopped by STOP directive at line ${this.currentLine}`, 'warn');
                                    this.stopRequested = true;
                                    return; // Exit buildSymbolTable early
                                case 'LET':
                                    // LET directive: define or update mutable variable
                                    // Syntax: LET name = value | name LET value
                                    {
                                        let letLabel, letValue;
                                        if (token.label) {
                                            // Format: name LET value
                                            letLabel = token.label;
                                            letValue = this.evaluateExpression(token.operands[0]);
                                        } else if (token.operands.length >= 1) {
                                            // Format: LET name = value
                                            // The tokenizer may parse "name = value" as a single symbol operand
                                            const operandStr = token.operands[0].value || token.operands[0].toString();
                                            if (typeof operandStr === 'string' && operandStr.includes('=')) {
                                                // Split on first =
                                                const eqIndex = operandStr.indexOf('=');
                                                letLabel = operandStr.substring(0, eqIndex).trim();
                                                const valueExpr = operandStr.substring(eqIndex + 1).trim();
                                                letValue = this.evaluateExpressionSimple(valueExpr);
                                            } else if (token.operands.length >= 2) {
                                                // Alternative: two operands (name, value)
                                                letLabel = token.operands[0].value;
                                                letValue = this.evaluateExpression(token.operands[1]);
                                            } else {
                                                throw new Error(`LET directive at line ${this.currentLine}: requires 'name = value' format`);
                                            }
                                        } else {
                                            throw new Error(`LET directive at line ${this.currentLine}: requires name and value`);
                                        }
                                        // Store in variableTable (mutable, unlike constantTable)
                                        this.variableTable[letLabel] = letValue;
                                        // Also update symbolTable for expression evaluation
                                        this.symbolTable[letLabel] = letValue;
                                        this.symbolInfo[letLabel] = {
                                            address: letValue,
                                            file: currentSourceFile,
                                            lineNumber: this.currentLine,
                                            type: 'variable',
                                            size: 0
                                        };
                                    }
                                    break;

                                // Pro version: Symbol visibility directives
                                case 'PUBLIC': case 'GLOBAL': case 'GLOBL': case 'ENTRY':
                                    // Mark symbols as public (exported)
                                    // SDCC uses .globl, traditional uses PUBLIC/GLOBAL
                                    for (const operand of token.operands) {
                                        const symbolName = operand.value;
                                        this.publicSymbols.add(symbolName);
                                    }
                                    break;

                                case 'EXTERN': case 'EXT': case 'EXTRN':
                                    // Mark symbols as external (imported)
                                    for (const operand of token.operands) {
                                        const symbolName = operand.value;
                                        this.externalSymbols.add(symbolName);
                                    }
                                    break;

                                // Pro version: Segment directives
                                case 'CSEG':
                                    this.currentSegment = 'code';
                                    break;

                                case 'DSEG':
                                    this.currentSegment = 'data';
                                    break;

                                case 'ASEG':
                                    this.currentSegment = 'absolute';
                                    break;

                                case 'COMMON':
                                    // COMMON /name/ directive
                                    if (token.operands.length > 0) {
                                        const blockName = token.operands[0].value;
                                        this.currentSegment = 'common';
                                        if (!this.segments.common.blocks[blockName]) {
                                            this.segments.common.blocks[blockName] = { size: 0, bytes: [] };
                                        }
                                    }
                                    break;

                                // SDCC-style directives
                                case 'AREA':
                                    // .area directive (SDCC syntax)
                                    if (token.operands.length > 0) {
                                        let areaName = token.operands[0].value.toString();

                                        // Handle area attributes like _CODE, _DATA, _HEADER(ABS)
                                        const isAbsolute = areaName.includes('(ABS)');
                                        areaName = areaName.replace(/\(ABS\)/i, '').trim();

                                        // Map SDCC area names to our segment types
                                        if (areaName === '_CODE' || areaName === 'CODE') {
                                            this.currentSegment = 'code';
                                        } else if (areaName === '_DATA' || areaName === 'DATA' || areaName === '_BSS' || areaName === 'BSS') {
                                            this.currentSegment = 'data';
                                        } else if (isAbsolute || areaName === '_HEADER' || areaName === 'HEADER') {
                                            this.currentSegment = 'absolute';
                                        } else {
                                            // Unknown area - default to code segment
                                            this.currentSegment = 'code';
                                            log(`Warning: Unknown area '${areaName}', defaulting to code segment`, 'warn');
                                        }
                                    }
                                    break;

                                case 'MODULE':
                                    // .module directive (SDCC module name)
                                    if (token.operands.length > 0) {
                                        this.moduleName = token.operands[0].value.toString();
                                    }
                                    break;
                            }
                        } else if (token instanceof Instruction) {
                            // CRITICAL: Instructions should not appear in BSS sections
                            // If we encounter one, implicitly return to CODE
                            if (inBSSSection) {
                                inBSSSection = false;
                                this.currentSection = 'CODE';
                                this.pc = (this.firstOrg || 0) + romPC;
                            }

                            const key = this.getOpcodeKey(token);
                            const opcode = Z80_OPCODES[key];
                            let instrSize = 0;
                            if (opcode) {
                                // Check for DD CB / FD CB instructions (4 bytes: prefix, CB, offset, opcode)
                                const isDDCB = opcode.length >= 2 && opcode[0] === 0xDD && opcode[1] === 0xCB;
                                const isFDCB = opcode.length >= 2 && opcode[0] === 0xFD && opcode[1] === 0xCB;

                                if (isDDCB || isFDCB) {
                                    // DD CB / FD CB instructions are 4 bytes: prefix + CB + offset + opcode
                                    instrSize = 4;
                                } else {
                                    instrSize = opcode.length;
                                    if (key.includes('imm8') || key.includes('rel8')) instrSize += 1;
                                    if (key.includes('imm16')) instrSize += 2;
                                    if (key.includes('offset')) instrSize += 1; // IX/IY offset
                                }
                                this.pc += instrSize;
                            } else {
                                // Fallback size estimation for unknown opcodes
                                instrSize = 1;
                                if (token.mnemonic.startsWith('ld')) instrSize++;
                                if (token.operands.some(op =>
                                    op.type === 'immediate' && op.value > 255 ||
                                    op.type === 'symbol' ||
                                    (op.type === 'memory' && (typeof op.value === 'number' || (typeof op.value === 'string' && !['bc','de','hl','sp','c'].includes(op.value.toLowerCase()))))
                                )) instrSize += 1;
                                this.pc += instrSize;
                                log(`Using estimated size ${instrSize} for opcode: ${token.mnemonic} ${token.operands.map(o=>o.value).join(',')} at line ${this.currentLine}`, 'warn');
                            }
                            romPC += instrSize;
                        }
                    } catch (error) {
                        // Add context to the error
                        const contextMsg = `Line ${this.currentLine}: ${token.mnemonic || token.name || 'directive'} - ${error.message}`;
                        throw new Error(contextMsg);
                    }
                }
                
                // Calculate symbol sizes (distance to next symbol)
                const sortedSymbols = Object.keys(this.symbolInfo)
                    .filter(name => this.symbolInfo[name].type === 'label')
                    .sort((a, b) => this.symbolInfo[a].address - this.symbolInfo[b].address);
                
                for (let i = 0; i < sortedSymbols.length - 1; i++) {
                    const currentSym = sortedSymbols[i];
                    const nextSym = sortedSymbols[i + 1];
                    this.symbolInfo[currentSym].size = this.symbolInfo[nextSym].address - this.symbolInfo[currentSym].address;
                }
                
                log('Symbol table built successfully.');
            }

            findFile(filename) {
                if (this.files[filename]) return this.files[filename];
                
                // Try case-insensitive lookup
                const lowercaseFilename = filename.toLowerCase();
                const foundFile = Object.keys(this.files).find(f => f.toLowerCase() === lowercaseFilename);
                if (foundFile) {
                    return this.files[foundFile];
                }
                throw new Error(`File not found: "${filename}". Available files: ${Object.keys(this.files).join(', ')}`);
            }

            buildMemoryMapReport() {
                let output = '';
                output += '=== COMPILATION SUMMARY ===\n';
                output += `Total Size: ${this.compilationStats.totalSize} bytes\n`;
                output += `Code Size: ${this.compilationStats.codeSize} bytes\n`;
                output += `Data Size: ${this.compilationStats.dataSize} bytes\n`;
                output += `Symbol Count: ${this.compilationStats.symbolCount}\n`;
                output += `File Count: ${this.compilationStats.fileCount}\n\n`;
                
                // Show different info based on packaging mode
                if (this.compilationStats.windowBase !== undefined) {
                    output += `ROM Window Base: ${this.compilationStats.windowBase.toString(16).toUpperCase()}\n`;
                    output += `ROM Window Size: ${this.compilationStats.windowSize} bytes\n`;
                    output += `Payload Used:    ${this.compilationStats.payloadUsed} bytes\n`;
                    output += `Window Free:     ${this.compilationStats.windowFree} bytes\n\n`;
                } else if (this.compilationStats.rawSize !== undefined) {
                    output += `Raw Binary Size: ${this.compilationStats.rawSize} bytes\n`;
                    output += `Address Range: ${(this.firstOrg ?? 0).toString(16).toUpperCase()}-${((this.firstOrg ?? 0) + this.output.length - 1).toString(16).toUpperCase()}\n\n`;
                }
                
                output += '=== FILE MAP ===\n';
                output += 'Filename                 Start    End      Size     Type\n';
                output += '--------------------------------------------------------\n';
                for (const file of this.fileMap) {
                    output += `${file.filename.padEnd(25)}${file.startAddr.toString(16).toUpperCase().padStart(4, '0')}   ${file.endAddr.toString(16).toUpperCase().padStart(4, '0')}   ${file.size.toString().padStart(6)}   ${file.type}\n`;
                }
                
                output += '\n=== SYMBOL TABLE ===\n';
                output += 'Symbol                   Address  File         Line Type      Size\n';
                output += '----------------------------------------------------------------\n';
                
                const sortedSymbols = Object.keys(this.symbolInfo).sort((a, b) => 
                    this.symbolInfo[a].address - this.symbolInfo[b].address);
                
                for (const symbol of sortedSymbols) {
                    const info = this.symbolInfo[symbol];
                    const addr = (info.address !== undefined ? info.address : info.value || 0);
                    const file = info.file || info.filename || 'N/A';
                    const size = info.size !== undefined ? info.size : '';
                    output += `${symbol.padEnd(25)}${addr.toString(16).toUpperCase().padStart(4, '0')}   ${file.padEnd(12)} ${info.lineNumber.toString().padStart(4)} ${info.type.padEnd(9)} ${size}\n`;
                }

                return output;
            }

            displaySymbolTable() {
                symbolsOutput.innerHTML = this.buildMemoryMapReport();
            }

            generateCode(tokens) {
                this.pc = 0;
                this.output = [];
                this.lastNonTempSymbol = '';  // Reset for Pass 3
                const shadowRegisterUsages = []; // Track shadow register usage for consolidated warning
                let inBSSSection = false;  // Track if we're in BSS section (for label fill logic)

                for (const token of tokens) {
                    this.currentInstruction = token;
                    this.currentLine = token.lineNumber || 0;

                    // Track state for listing generation
                    let startPC = this.pc;  // Will be updated after label processing
                    const startOutputLen = this.output.length;  // Track output buffer position
                    let hasError = false;
                    let errorMsg = '';

                    try {
                        if (token.label) {
                            const processedLabel = this.processTemporarySymbol(token.label);

                            // Don't set PC for EQU/EVAL/CONSTANT directives - they don't represent code addresses
                            const isConstantDirective = token instanceof Directive &&
                                                       ['EQU', 'EVAL', 'CONSTANT'].includes(token.name);

                            if (!isConstantDirective) {
                                const oldPC = this.pc;
                                const targetPC = this.symbolTable[processedLabel];

                                // DEBUG: Commented out verbose logging
                                // if (this.currentLine <= 900) {
                                //     log(`DEBUG PC: Line ${this.currentLine}, label '${processedLabel}': PC ${oldPC} -> ${targetPC} (${targetPC > oldPC ? '+' : ''}${targetPC - oldPC})`, 'debug');
                                // }

                                this.pc = targetPC;

                                if (this.pc - oldPC > 1000) {
                                    log(`DEBUG: Large PC jump at label '${processedLabel}' line ${this.currentLine}: ${oldPC} -> ${this.pc} (+${this.pc - oldPC} bytes)`, 'debug');
                                }

                                if (this.pc > 100000) {
                                    log(`ERROR: Label '${processedLabel}' at line ${this.currentLine} has suspiciously large address: ${this.pc}`, 'error');
                                    throw new Error(`Label address too large: ${processedLabel} = ${this.pc}. Check symbol table.`);
                                }

                                // Pro version: In .REL mode, don't fill with zeros - linker handles placement
                                // CRITICAL: Output buffer is relative to firstOrg
                                // Only fill forward to match ROM output. BSS/RAM sections don't add to output.
                                // Don't fill when in BSS section - those labels are in RAM, not ROM
                                if (this.outputMode !== 'rel' && this.firstOrg !== null && !inBSSSection) {
                                    const targetOutputPos = this.pc - this.firstOrg;
                                    // Only fill if PC is ahead of current output AND we're in ROM space (PC >= firstOrg)
                                    if (this.pc >= this.firstOrg && targetOutputPos > this.output.length) {
                                        while(this.output.length < targetOutputPos) this.output.push(0);
                                    }
                                }
                            }

                            // Update startPC after label processing for correct PC increment calculation
                            startPC = this.pc;

                            // CRITICAL: Update lastNonTempSymbol in Pass 3 the same way as Pass 2
                            // This ensures that subsequent .loop labels compose with the correct parent
                            if (!token.label.startsWith('.') && !['+', '-', '/'].includes(token.label)) {
                                const symInfo = this.symbolInfo[processedLabel];
                                if (symInfo && symInfo.category === 'code') {
                                    const oldLast = this.lastNonTempSymbol;
                                    this.lastNonTempSymbol = processedLabel;
                                    if (this.currentLine >= 800 && this.currentLine <= 880) {
                                        // log(`DEBUG LAST P3: Line ${this.currentLine}, updated lastNonTempSymbol: '${oldLast}' -> '${processedLabel}' (category: ${symInfo.category})`, 'debug');
                                    }
                                } else if (this.currentLine >= 800 && this.currentLine <= 880) {
                                    // log(`DEBUG LAST P3: Line ${this.currentLine}, NOT updating for '${processedLabel}' (category: ${symInfo ? symInfo.category : 'no info'})`, 'debug');
                                }
                            }
                        }

                        if (token instanceof Directive) {
                            switch (token.name) {
                                case 'ORG':
                                    const oldPC = this.pc;
                                    const oldOutputLen = this.output.length;
                                    const newPC = this.evaluateExpression(token.operands[0]);

                                    // CRITICAL: Set firstOrg BEFORE filling buffer
                                    if (this.firstOrg === null) {
                                        this.firstOrg = newPC;
                                        // Initialize all section PCs to the first ORG address
                                        this.sectionPCs.CODE = newPC;
                                        this.sectionPCs.DATA = newPC;
                                        this.sectionPCs.BSS = newPC;
                                    }

                                    // Auto-detect BSS section based on ORG address
                                    // If ORG goes backward or to RAM area, it's BSS
                                    if (newPC < this.pc || newPC < this.firstOrg) {
                                        this.currentSection = 'BSS';
                                    } else if (newPC >= this.firstOrg) {
                                        this.currentSection = 'CODE';
                                    }

                                    this.pc = newPC;
                                    this.sectionPCs[this.currentSection] = newPC;

                                    // DEBUG: Log all ORG directives
                                    if (this.currentLine <= 900) {
                                        // log(`DEBUG ORG: Line ${this.currentLine}, PC ${oldPC} -> ${this.pc} (${this.pc > oldPC ? '+' : ''}${this.pc - oldPC}), section=${this.currentSection}, output.length was ${oldOutputLen}, firstOrg=${this.firstOrg}`, 'debug');
                                    }

                                    // Pro version: In .REL mode, don't fill with zeros - linker handles placement
                                    // CRITICAL: Output buffer is relative to firstOrg
                                    // Only fill forward when PC increases (ROM sections)
                                    // When PC decreases (e.g., jumping to RAM), this is a BSS section for address allocation only
                                    if (this.outputMode !== 'rel' && this.pc > oldPC) {
                                        const targetOutputPos = this.pc - this.firstOrg;
                                        while (this.output.length < targetOutputPos) this.output.push(0);
                                    }

                                    // DEBUG: Log output buffer fill
                                    if (this.currentLine <= 900 && this.output.length > oldOutputLen) {
                                        // log(`DEBUG ORG: Filled output buffer from ${oldOutputLen} to ${this.output.length} with zeros`, 'debug');
                                    }
                                    break;
                                case 'DB': case 'DEFB': case 'DEFM': case 'ASCII': case 'TEXT': case 'BYTE':
                                    // DB/DW are for ROM data - always generate bytes
                                    token.operands.forEach(op => {
                                        if (op.type === 'string') {
                                            for (let i = 0; i < op.value.length; i++) this.output.push(op.value.charCodeAt(i));
                                        } else {
                                            this.output.push(this.evaluateExpression(op) & 0xFF);
                                        }
                                    });
                                    break;
                                case 'DW': case 'DEFW': case 'WORD':
                                    // DB/DW are for ROM data - always generate bytes
                                    token.operands.forEach(op => {
                                        const val = this.evaluateExpression(op);

                                        // Pro version: Track relocation for symbol references
                                        if (this.needsRelocation(op)) {
                                            // In .REL mode, use output buffer position; in binary mode, use PC
                                            const location = this.outputMode === 'rel' ? this.output.length : this.pc;
                                            this.trackRelocation(op.value, location, true);
                                        }

                                        this.output.push(val & 0xFF);
                                        this.output.push((val >> 8) & 0xFF);
                                    });
                                    break;
                                case 'DS': case 'DEFS':
                                    // DS/DEFS: Reserve space
                                    // DS n - only in BSS (uninitialized RAM, no output)
                                    // DS n, fill - allowed anywhere (fills with byte value)
                                    {
                                        const dsSize = this.evaluateExpression(token.operands[0]);
                                        const hasFillValue = token.operands.length > 1;

                                        if (!hasFillValue && this.currentSection !== 'BSS') {
                                            log(`ERROR: DS directive at line ${this.currentLine} without fill value can only be used in BSS section`, 'error');
                                            throw new Error(`DS directive at line ${this.currentLine} without fill value can only be used in BSS section (RAM). Use 'DS ${dsSize}, 0' to fill with zeros in ROM, or 'SECTION BSS' for uninitialized RAM.`);
                                        }
                                        if (dsSize > 65536) {
                                            log(`ERROR: DS directive at line ${this.currentLine} has suspiciously large size: ${dsSize}`, 'error');
                                            throw new Error(`DS size too large: ${dsSize} (max 65536). Check operand: ${token.operands[0].value}`);
                                        }

                                        if (hasFillValue) {
                                            // Fill with specified byte value (for ROM)
                                            const fillValue = this.evaluateExpression(token.operands[1]) & 0xFF;
                                            for (let i = 0; i < dsSize; i++) {
                                                this.output.push(fillValue);
                                            }
                                        }
                                        // In BSS, just advance PC without output
                                        this.pc += dsSize;
                                    }
                                    break;
                                case 'BLOCK':
                                    // BLOCK count [, fill] - reserve space filled with value (default 0)
                                    {
                                        const blockSize = this.evaluateExpression(token.operands[0]);
                                        const fillValue = token.operands.length > 1
                                            ? this.evaluateExpression(token.operands[1]) & 0xFF
                                            : 0;
                                        for (let i = 0; i < blockSize; i++) {
                                            this.output.push(fillValue);
                                        }
                                        this.pc += blockSize;
                                    }
                                    break;
                                case 'INCBIN':
                                    // Enhanced INCBIN supporting multiple styles (same as Pass 2)
                                    const incbinFilename_p3 = token.operands[0].value;
                                    const incbinFullData_p3 = this.findFile(incbinFilename_p3);

                                    // Parse optional parameters
                                    let incbinSkip_p3 = 0;
                                    let incbinRead_p3 = incbinFullData_p3.length;

                                    // Check if using named parameters or positional
                                    const hasNamedParams_p3 = token.operands.length > 1 &&
                                        token.operands.slice(1).some(op =>
                                            op.type === 'symbol' && ['SKIP', 'READ', 'FSIZE'].includes(op.value.toUpperCase())
                                        );

                                    if (hasNamedParams_p3) {
                                        // WLA-DX style named parameters
                                        for (let i = 1; i < token.operands.length; i++) {
                                            const operand = token.operands[i];
                                            if (operand.type === 'symbol') {
                                                const paramName = operand.value.toUpperCase();
                                                if (paramName === 'SKIP' && i + 1 < token.operands.length) {
                                                    const skipValue = this.evaluateExpression(token.operands[i + 1]);
                                                    incbinSkip_p3 = skipValue < 0 ? incbinFullData_p3.length + skipValue : skipValue;
                                                    i++;
                                                } else if (paramName === 'READ' && i + 1 < token.operands.length) {
                                                    const readValue = this.evaluateExpression(token.operands[i + 1]);
                                                    incbinRead_p3 = readValue < 0 ? incbinFullData_p3.length + readValue - incbinSkip_p3 : readValue;
                                                    i++;
                                                } else if (paramName === 'FSIZE') {
                                                    i++; // Skip label name (already processed in Pass 2)
                                                }
                                            }
                                        }
                                    } else {
                                        // Positional style: INCBIN "file", offset, length
                                        if (token.operands.length > 1) {
                                            incbinSkip_p3 = this.evaluateExpression(token.operands[1]);
                                        }
                                        if (token.operands.length > 2) {
                                            incbinRead_p3 = this.evaluateExpression(token.operands[2]);
                                        } else if (token.operands.length > 1) {
                                            // If only offset given, read from offset to end
                                            incbinRead_p3 = incbinFullData_p3.length - incbinSkip_p3;
                                        }
                                    }

                                    // Clamp to valid range
                                    if (incbinSkip_p3 + incbinRead_p3 > incbinFullData_p3.length) {
                                        incbinRead_p3 = incbinFullData_p3.length - incbinSkip_p3;
                                    }

                                    // Extract and include the specified byte range
                                    const incbinSlice = incbinFullData_p3.slice(incbinSkip_p3, incbinSkip_p3 + incbinRead_p3);
                                    this.output.push(...incbinSlice);
                                    break;
                                case 'SECTION':
                                    // Handle SECTION directive: CODE, DATA, BSS (v2.0.0)
                                    if (token.operands.length > 0) {
                                        const sectionName = token.operands[0].value.toUpperCase();
                                        const validSections = ['CODE', 'DATA', 'BSS'];

                                        if (!validSections.includes(sectionName)) {
                                            throw new Error(`SECTION directive at line ${this.currentLine}: Invalid section '${sectionName}'. Valid sections: CODE, DATA, BSS`);
                                        }

                                        // DEBUG: Log section switch
                                        const oldSection = this.currentSection;
                                        const oldPC = this.pc;
                                        const oldOutputLen = this.output.length;

                                        // Save current section's PC before switching
                                        this.sectionPCs[this.currentSection] = this.pc;

                                        // Switch to new section
                                        this.currentSection = sectionName;

                                        // If this section hasn't been used yet (PC still at initial ORG),
                                        // continue from current position instead of jumping back
                                        if (this.sectionPCs[sectionName] === this.firstOrg && sectionName !== 'CODE') {
                                            this.sectionPCs[sectionName] = this.pc;
                                        }
                                        this.pc = this.sectionPCs[sectionName];

                                        // Track BSS section state for label fill logic
                                        inBSSSection = (sectionName === 'BSS');
                                    } else {
                                        throw new Error(`SECTION directive at line ${this.currentLine}: Requires a section name (CODE, DATA, or BSS)`);
                                    }
                                    break;
                                case 'ALIGN':
                                    // ALIGN directive: pad output with zeros to next alignment boundary
                                    const alignBoundary_p3 = this.evaluateExpression(token.operands[0]);
                                    const alignPadding_p3 = (alignBoundary_p3 - (this.pc % alignBoundary_p3)) % alignBoundary_p3;
                                    // Output padding bytes (0xFF for ROM, 0x00 for clarity in listing)
                                    for (let p = 0; p < alignPadding_p3; p++) {
                                        this.output.push(0xFF);  // Fill with 0xFF (common for ROM padding)
                                    }
                                    this.pc += alignPadding_p3;
                                    break;
                                case 'ASSERT':
                                    // ASSERT directive: skip in Pass 3
                                    // Assertions are validated in Pass 2 when LET variables reflect source order
                                    // By Pass 3, LET variables have final values which would cause false failures
                                    break;
                                case 'STRUCT':
                                    // Structure instance in Pass 3: reserve space (output zeros)
                                    if (token.operands.length > 0) {
                                        const structType_p3 = token.operands[0].value;
                                        const structDef_p3 = this.structTable[structType_p3];

                                        if (structDef_p3) {
                                            // Output zeros for structure size (labeled or unlabeled)
                                            for (let i = 0; i < structDef_p3.size; i++) {
                                                this.output.push(0x00);
                                            }
                                            this.pc += structDef_p3.size;
                                        }
                                    }
                                    break;
                                case 'ENDSTRUCT':
                                    // Structure end - no output
                                    break;
                            }
                        } else if (token instanceof Instruction) {
                            // Set current instruction for debug logging
                            this.currentInstruction = token;

                            // Collect shadow register usage for consolidated warning
                            const shadowOps = token.operands.filter(o => o.isShadow);
                            if (shadowOps.length > 0) {
                                const instrStr = `${token.mnemonic} ${token.operands.map(o => {
                                    if (o.type === 'memory') return `(${o.value})`;
                                    return o.isShadow ? o.value + "'" : o.value;
                                }).join(', ')}`;
                                shadowRegisterUsages.push({
                                    line: token.lineNumber,
                                    registers: shadowOps.map(o => o.value + "'"),
                                    instruction: instrStr
                                });
                            }

                            const key = this.getOpcodeKey(token);
                            const opcode = Z80_OPCODES[key];
                            if (!opcode) {
                                const errorMsg = `Unknown instruction: ${token.mnemonic} ${token.operands.map(o => {
                                    if (o.type === 'memory') return `(${o.value})`;
                                    return o.value;
                                }).join(', ')} [Generated key: ${key}]`;
                                throw new Error(errorMsg);
                            }

                            // Check for DD CB / FD CB instructions (special byte order: prefix, CB, offset, opcode)
                            const isDDCB = opcode.length >= 2 && opcode[0] === 0xDD && opcode[1] === 0xCB;
                            const isFDCB = opcode.length >= 2 && opcode[0] === 0xFD && opcode[1] === 0xCB;

                            if (isDDCB || isFDCB) {
                                // DD CB / FD CB instructions: output prefix, CB, then offset, then final opcode
                                this.output.push(opcode[0]); // DD or FD
                                this.output.push(0xCB);      // CB prefix

                                // Extract and output the offset
                                const offsetOperand = token.operands.find(o => o.type === 'memory' && typeof o.value === 'string');
                                if (offsetOperand) {
                                    const match = offsetOperand.value.match(/(?:IX|IY)\s*([+-])\s*(.+)/i);
                                    if (match && match[1] && match[2]) {
                                        const sign = match[1] === '-' ? -1 : 1;
                                        const offsetValue = this.evaluateExpression({type: 'symbol', value: match[2]});
                                        const signedOffset = sign * offsetValue;
                                        this.output.push(signedOffset & 0xFF);
                                    } else {
                                        this.output.push(0); // No offset
                                    }
                                } else {
                                    this.output.push(0); // No offset
                                }

                                this.output.push(opcode[2]); // Final opcode byte
                            } else {
                                this.output.push(...opcode);
                            }

                            // Handle operands (skip for DD CB / FD CB as already handled)
                            if (!(isDDCB || isFDCB)) {
                                // IMPORTANT: For IX/IY+offset instructions, process offset FIRST
                                // This handles keys like 'ld_(ix+offset),imm8' which need both offset AND imm8 bytes
                                if (key.includes('offset')) {
                                    // IX/IY displacement - output offset byte before any imm8 data
                                    const offsetOperand = token.operands.find(o => o.type === 'memory' && typeof o.value === 'string');
                                    if (offsetOperand) {
                                        // Extract offset from formats like: IX+5, IY-10, IX+SYMBOL, IX (zero offset)
                                        const match = offsetOperand.value.match(/(?:IX|IY)\s*([+-])\s*(.+)/i) ||
                                                      offsetOperand.value.match(/(?:IX|IY)\s*$/i);
                                        if (match && match[1] && match[2]) {
                                            // Has explicit offset: IX+5 or IY-SYMBOL
                                            const sign = match[1] === '-' ? -1 : 1;
                                            const offsetValue = this.evaluateExpression({type: 'symbol', value: match[2]});
                                            const signedOffset = sign * offsetValue;
                                            this.output.push(signedOffset & 0xFF);
                                        } else {
                                            // No offset or just IX/IY - use 0
                                            this.output.push(0);
                                        }
                                    }
                                }

                                // Now handle immediate values (imm16, imm8, rel8)
                                if (key.includes('imm16')) {
                                     const operand = token.operands.find(o => o.type === 'symbol' || o.type === 'immediate' || (o.type === 'memory' && (typeof o.value === 'number' || (typeof o.value === 'string' && !['bc','de','hl','sp','c'].includes(o.value.toLowerCase())))));
                                     if (!operand) throw new Error(`No 16-bit operand found for instruction: ${token.mnemonic}`);

                                     let val;
                                     let symbolForRelocation = null;

                                     if (operand.type === 'memory') {
                                         if (typeof operand.value === 'number') {
                                             val = operand.value;
                                         } else {
                                             // Memory operand with symbol - evaluate the symbol inside the parentheses
                                             symbolForRelocation = {type: 'symbol', value: operand.value};
                                             val = this.evaluateExpression(symbolForRelocation);
                                         }
                                     } else {
                                         val = this.evaluateExpression(operand);
                                         if (operand.type === 'symbol') {
                                             symbolForRelocation = operand;
                                         }
                                     }

                                     // Pro version: Track relocation for symbol references
                                     if (symbolForRelocation && this.needsRelocation(symbolForRelocation)) {
                                         // In .REL mode, use output buffer position; in binary mode, use PC
                                         const location = this.outputMode === 'rel' ? this.output.length : (this.pc + opcode.length);
                                         this.trackRelocation(symbolForRelocation.value, location, true);
                                     }

                                     this.output.push(val & 0xFF);
                                     this.output.push((val >> 8) & 0xFF);
                                } else if (key.includes('imm8')) {
                                    const operand = token.operands.find(o => {
                                        if (o.type === 'symbol' || o.type === 'immediate') return true;
                                        if (o.type === 'memory') {
                                            if (typeof o.value === 'number') return true;
                                            if (typeof o.value === 'string') {
                                                const valLower = o.value.toLowerCase();
                                                // Exclude register indirect addressing and IX/IY with offset
                                                if (['bc','de','hl','sp','c','ix','iy'].includes(valLower)) return false;
                                                // Exclude IX/IY+offset patterns - these are not immediate operands
                                                if (isIxIyDisplacementOperandText(o.value)) return false;
                                                return true;
                                            }
                                        }
                                        return false;
                                    });
                                    if (!operand) throw new Error(`No 8-bit operand found for instruction: ${token.mnemonic}`);

                                    let val;
                                    if (operand.type === 'memory') {
                                        if (typeof operand.value === 'number') {
                                            val = operand.value;
                                        } else {
                                            // Memory operand with symbol - evaluate the symbol inside the parentheses
                                            val = this.evaluateExpression({type: 'symbol', value: operand.value});
                                        }
                                    } else {
                                        val = this.evaluateExpression(operand);
                                    }
                                    this.output.push(val & 0xFF);
                                } else if (key.includes('rel8')) {
                                    const operand = token.operands.find(o => o.type === 'symbol' || o.type === 'immediate');
                                    const targetAddr = this.evaluateExpression(operand);
                                    // Calculate current address: PC + instruction size (opcode bytes + 1 displacement byte)
                                    const instrSize = opcode.length + 1;

                                    // Pro version: In .REL mode, use output buffer position for relative jumps
                                    // In binary mode, use absolute PC
                                    let currentAddr, adjustedTargetAddr;
                                    if (this.outputMode === 'rel') {
                                        // Use output buffer positions (0-based)
                                        currentAddr = this.output.length + instrSize;
                                        // Target is also relative to segment start
                                        adjustedTargetAddr = targetAddr - (this.firstOrg || 0);
                                    } else {
                                        // Binary mode: use absolute addresses
                                        currentAddr = this.pc + instrSize;
                                        adjustedTargetAddr = targetAddr;
                                    }

                                    // log(`DEBUG DJNZ: mnemonic=${token.mnemonic}, PC=${this.pc}, instrSize=${instrSize}, currentAddr=${currentAddr}, targetAddr=${targetAddr}, adjustedTargetAddr=${adjustedTargetAddr}`, 'debug');
                                    let offset = adjustedTargetAddr - currentAddr;
                                    if (offset < -128 || offset > 127) throw new Error(`Relative jump out of range for ${token.mnemonic}: offset ${offset} (target: ${adjustedTargetAddr}, current: ${currentAddr})`);
                                    if (offset < 0) offset += 256;
                                    this.output.push(offset);
                                }
                            }
                        }
                        if (this.output.length > 100000) {
                            log(`WARNING: Output buffer is suspiciously large: ${this.output.length} bytes at line ${this.currentLine}`, 'warn');
                        }
                        // CRITICAL: PC must stay absolute, not track output buffer length
                        // Increment PC by the number of bytes generated for this instruction
                        const bytesGenerated = this.output.length - startOutputLen;
                        // DEBUG: Commented out verbose logging
                        // if (this.currentLine <= 100) {
                        //     log(`DEBUG PC INC: Line ${this.currentLine}, startPC=${startPC}, startOutputLen=${startOutputLen}, output.length=${this.output.length}, bytesGenerated=${bytesGenerated}`, 'debug');
                        // }
                        if (bytesGenerated > 0) {
                            const oldPC = this.pc;
                            this.pc = startPC + bytesGenerated;

                            // Track line-to-address mapping for breakpoints
                            // Store the address where this line's code starts
                            if (this.currentLine > 0 && !this.lineToAddressMap.has(this.currentLine)) {
                                this.lineToAddressMap.set(this.currentLine, startPC);
                            }
                        }
                    } catch (error) {
                        // Capture error for listing
                        hasError = true;
                        errorMsg = error.message;
                        this.errorCount++;

                        // Add context to the error
                        const contextMsg = `Line ${this.currentLine}: ${token.mnemonic || 'directive'} ${(token.operands || []).map(o => o.value).join(', ')} - ${error.message}`;
                        throw new Error(contextMsg);
                    } finally {
                        // Create listing entry after processing token
                        // Use buffer positions, not absolute PC values
                        const bytesGenerated = this.output.slice(startOutputLen, this.output.length);

                        // For ORG and other PC-changing directives, show the new PC, not the old one
                        let displayAddress = startPC;
                        if (token instanceof Directive && token.name === 'ORG') {
                            displayAddress = this.pc; // Show the ORG target address
                        }

                        const listingEntry = {
                            lineNum: token.lineNumber || 0,
                            address: displayAddress,
                            bytes: Array.from(bytesGenerated),
                            sourceLine: token.sourceLine || '',
                            label: token.label || '',
                            hasError: hasError,
                            errorMsg: errorMsg
                        };
                        this.listingLines.push(listingEntry);
                    }
                }

                // Display consolidated shadow register warning with details
                if (shadowRegisterUsages.length > 0) {
                    const uniqueRegs = [...new Set(shadowRegisterUsages.flatMap(u => u.registers))].sort();
                    log(`Shadow register notation used (${shadowRegisterUsages.length} instances). This is documentation-only - ensure EXX/EX AF,AF' was called appropriately.`, 'warn');
                    // Show details for each usage
                    shadowRegisterUsages.forEach(usage => {
                        log(`  Line ${usage.line}: ${usage.instruction}`, 'warn');
                    });
                }
            }

            exportSymbolTable() {
                const data = {
                    compilationStats: this.compilationStats,
                    fileMap: this.fileMap,
                    symbolTable: this.symbolTable,
                    constantTable: this.constantTable,
                    symbolInfo: this.symbolInfo,
                    timestamp: new Date().toISOString()
                };
                return JSON.stringify(data, null, 2);
            }

            generateListingFile() {
                let output = '';

                if (DEBUG_MODE) console.log(`DEBUG: generateListingFile() called, sourceLines.length = ${this.sourceLines.length}, listingLines.length = ${this.listingLines.length}`);

                // Create a map of line numbers to listing entries
                const listingMap = {};
                for (const entry of this.listingLines) {
                    listingMap[entry.lineNum] = entry;
                }

                // Iterate through ALL source lines
                for (let i = 0; i < this.sourceLines.length; i++) {
                    const lineNum = String(i + 1).padStart(4, '0');
                    const sourceLine = this.sourceLines[i];
                    const entry = listingMap[i + 1];

                    // Check if this is a directive that doesn't generate code (ORG, EQU, SET, etc.)
                    const isNonCodeDirective = /^\s*\.?(org|equ|set|if|else|endif|macro|endm|include)\b/i.test(sourceLine);

                    // Check if line is blank or only whitespace/comment
                    const isBlankLine = sourceLine.trim() === '' || sourceLine.trim().startsWith(';');

                    if (isBlankLine) {
                        // Blank line: just line number and spaces
                        output += `${lineNum}   ${' '.repeat(4)}             ${sourceLine}\n`;
                    } else if (!entry || isNonCodeDirective || (entry && entry.bytes.length === 0)) {
                        // Non-code directive or no bytes: show address but no bytes
                        const address = entry ? entry.address.toString(16).toUpperCase().padStart(4, '0') : '    ';
                        output += `${lineNum}   ${address}             ${sourceLine}\n`;
                    } else {
                        // Has bytes: show address and bytes
                        const address = entry.address.toString(16).toUpperCase().padStart(4, '0');

                        // Format bytes WITHOUT spaces (like TASM: "000000000000" not "00 00 00 00")
                        const hexBytes = entry.bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');

                        // Pad bytes to 12 characters (fits 6 bytes)
                        const bytesStr = hexBytes.padEnd(12, ' ');

                        output += `${lineNum}   ${address} ${bytesStr} ${sourceLine}\n`;
                    }

                    // If there's an error, add error message on next line
                    if (entry && entry.hasError) {
                        const errorLine = `${sourceLine.split(/\s+/)[0]} line ${lineNum}: ${entry.errorMsg}`;
                        output += errorLine + '\n';
                    }
                }

                // Add final summary line
                output += `tasm: Number of errors = ${this.errorCount}\n`;

                return output;
            }

            generateDebuggerSymbolFile() {
                const symbols = [];
                const seen = new Set();

                const addSymbol = (name, value) => {
                    if (!name || seen.has(name)) return;
                    if (!Number.isFinite(value)) return;
                    if (name.startsWith('_')) return;
                    if (name.includes('@@')) return;
                    if (/^[\d$@]/.test(name)) return;
                    seen.add(name);
                    symbols.push([name, value & 0xffff]);
                };

                for (const [name, value] of Object.entries(this.symbolTable || {})) {
                    addSymbol(name, value);
                }

                for (const [name, value] of Object.entries(this.constantTable || {})) {
                    addSymbol(name, value);
                }

                symbols.sort((a, b) => {
                    const byAddress = a[1] - b[1];
                    if (byAddress !== 0) return byAddress;
                    return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
                });

                return symbols
                    .map(([name, value]) => `${name}: equ $${value.toString(16).toUpperCase().padStart(4, '0')}`)
                    .join('\n');
            }

            generateSymbolFile(breakpointsSet = null, sourceLines = null) {
                // Generate BlueMSX/openMSX-compatible symbol file (.sym)
                // Format: label: equ 0xHEX
                // Compatible with: BlueMSX, openMSX
                // TESTED AND CONFIRMED WORKING with BlueMSX 2026-01-09

                let output = '; Amy\'s ColecoVision Assembler - Symbol File\n';
                output += `; Generated: ${new Date().toISOString()}\n`;
                output += '; Format: openMSX/BlueMSX compatible with WLA-DX breakpoints\n';
                output += ';\n';
                output += '; Compatible with: BlueMSX, openMSX, Gearcoleco\n';
                output += '; Usage: Load in debugger (Tools > Debugger > Load Symbols)\n\n';

                // Add WLA-DX format [breakpoints] section for automatic loading (Gearcoleco)
                // Also add comments for manual reference
                if (breakpointsSet && breakpointsSet.size > 0) {
                    const breakpointAddresses = [];
                    const sortedBreakpoints = Array.from(breakpointsSet).sort((a, b) => a - b);

                    // First, add comment section for reference
                    output += '; === Breakpoints ===\n';
                    for (const lineNum of sortedBreakpoints) {
                        // Breakpoint line numbers are 0-based from CodeMirror, but lineToAddressMap uses 1-based
                        const lineNum1Based = lineNum + 1;
                        let address = this.lineToAddressMap.get(lineNum1Based);
                        let labelInfo = '';
                        let resolvedFrom = '';

                        // If no direct address mapping, try to resolve from label on this line
                        if (address === undefined && sourceLines && sourceLines[lineNum]) {
                            const line = sourceLines[lineNum].trim();
                            const labelMatch = line.match(/^(\w+):/);
                            if (labelMatch) {
                                const label = labelMatch[1];
                                const labelAddr = this.symbolTable[label];
                                if (labelAddr !== undefined) {
                                    address = labelAddr;
                                    labelInfo = ` (${label})`;
                                    resolvedFrom = ' [resolved from label]';
                                }
                            }
                        } else if (address !== undefined && sourceLines && sourceLines[lineNum]) {
                            // Already have address, just get label for display
                            const line = sourceLines[lineNum].trim();
                            const labelMatch = line.match(/^(\w+):/);
                            if (labelMatch) {
                                labelInfo = ` (${labelMatch[1]})`;
                            }
                        }

                        if (address !== undefined) {
                            breakpointAddresses.push(address);
                            output += `; Line ${lineNum + 1} -> 0x${address.toString(16).toUpperCase()}${labelInfo}${resolvedFrom}\n`;
                        } else {
                            output += `; Line ${lineNum + 1} -> (no code at this line - breakpoint ignored)\n`;
                        }
                    }
                    output += '\n';

                    // Add WLA-DX [breakpoints] section for automatic loading
                    if (breakpointAddresses.length > 0) {
                        output += '[breakpoints]\n';
                        for (const address of breakpointAddresses) {
                            // WLA-DX format: bank:address (00:XXXX for ColecoVision - single bank)
                            output += `00:${address.toString(16).toUpperCase().padStart(4, '0')}\n`;
                        }
                        output += '\n';
                    }
                }

                // Combine symbolTable and constantTable for complete symbol list
                const allSymbols = {};

                // Add address labels from symbolTable
                for (const [name, value] of Object.entries(this.symbolTable)) {
                    allSymbols[name] = value;
                }

                // Add constants from constantTable
                for (const [name, value] of Object.entries(this.constantTable)) {
                    allSymbols[name] = value;
                }

                // Filter and collect all symbols
                const symbols = [];

                for (const [name, value] of Object.entries(allSymbols)) {
                    // Skip internal symbols starting with underscore
                    if (name.startsWith('_')) continue;
                    // Skip macro-generated internal symbols
                    if (name.includes('@@')) continue;
                    // Skip temporary labels (starting with digit or special chars)
                    if (/^[\d$@]/.test(name)) continue;

                    symbols.push([name, value]);
                }

                // Sort alphabetically (case-insensitive)
                symbols.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));

                // Generate symbols in openMSX format: label: equ 0xHEX
                for (const [name, value] of symbols) {
                    // Convert to lowercase for better compatibility
                    const labelName = name.toLowerCase();
                    // Format as hexadecimal with 0x prefix (no zero-padding needed)
                    const hexValue = '0x' + value.toString(16).toLowerCase();
                    output += `${labelName}: equ ${hexValue}\n`;
                }

                return output;
            }

            getOpcodeKey(instruction) {
                const mnemonic = instruction.mnemonic.toLowerCase();

                // Handle EX AF,AF' specifically
                if (mnemonic === 'ex' && instruction.operands.length === 2 &&
                    instruction.operands[0].type === 'register_pair' && 
                    instruction.operands[0].value.toUpperCase() === 'AF' &&
                    instruction.operands[1].type === 'register_pair' && 
                    instruction.operands[1].value.toUpperCase() === "AF'") {
                    return 'ex_af,af\'';
                }

                // Handle IM instructions
                if (mnemonic === 'im' && instruction.operands.length === 1) {
                    return `im_${instruction.operands[0].value}`;
                }

                // Handle RST instructions
                if (mnemonic === 'rst' && instruction.operands.length === 1) {
                    const rstValue = this.evaluateExpression(instruction.operands[0]);
                    const rstMap = {0: '00h', 8: '08h', 16: '10h', 24: '18h', 32: '20h', 40: '28h', 48: '30h', 56: '38h'};
                    if (rstMap[rstValue]) {
                        return `rst_${rstMap[rstValue]}`;
                    }
                    return `rst_${rstValue}`;
                }

                if (instruction.operands.length === 0) return mnemonic;

                // Handle special undocumented IN (C) instruction  
                if (mnemonic === 'in' && instruction.operands.length === 1 && 
                    instruction.operands[0].type === 'memory' && 
                    typeof instruction.operands[0].value === 'string' &&
                    instruction.operands[0].value.toLowerCase() === 'c') {
                    return 'in_(c)';
                }

                // Handle OUT (C),0 instruction
                if (mnemonic === 'out' && instruction.operands.length === 2 &&
                    instruction.operands[0].type === 'memory' && 
                    typeof instruction.operands[0].value === 'string' &&
                    instruction.operands[0].value.toLowerCase() === 'c' &&
                    instruction.operands[1].type === 'immediate' &&
                    instruction.operands[1].value === 0) {
                    return 'out_(c),0';
                }

                // Handle JP (IX), JP (IY), JP (HL)
                if (mnemonic === 'jp' && instruction.operands.length === 1 && 
                    instruction.operands[0].type === 'memory') {
                    const memVal = instruction.operands[0].value;
                    if (typeof memVal === 'string') {
                        const reg = memVal.toLowerCase();
                        if (reg === 'ix') return 'jp_(ix)';
                        if (reg === 'iy') return 'jp_(iy)';
                        if (reg === 'hl') return 'jp_(hl)';
                    }
                }

                // Handle conditional jumps and calls
                if ((mnemonic === 'jp' || mnemonic === 'jr' || mnemonic === 'call' || mnemonic === 'ret') && 
                    instruction.operands.length > 0 && instruction.operands[0].type === 'condition') {
                    const condition = instruction.operands[0].value.toLowerCase();
                    if (instruction.operands.length === 1) {
                        return `${mnemonic}_${condition}`;
                    } else {
                        const addrType = (mnemonic === 'jr') ? 'rel8' : 'imm16';
                        return `${mnemonic}_${condition},${addrType}`;
                    }
                }

                const opTypes = instruction.operands.map(op => {
                    switch(op.type) {
                        case 'register': return op.value.toLowerCase();
                        case 'register_pair':
                            // Handle AF' correctly for EX AF,AF'
                            if (op.value.toUpperCase() === "AF'") return "af'";
                            // Strip ' suffix from shadow register pairs (BC', DE', HL')
                            // These compile to the same opcodes as normal registers
                            return op.value.replace(/'$/, '').toLowerCase();
                        case 'condition': return op.value.toLowerCase();
                        case 'memory': 
                            // Handle memory operands - check if it's a known register or immediate address
                            if (typeof op.value === 'string') {
                                const memValue = op.value.toLowerCase();
                                // Handle IX/IY with displacement
                                if (/\bix\b\s*[+-]/i.test(op.value)) {
                                    return '(ix+offset)';
                                }
                                if (/\biy\b\s*[+-]/i.test(op.value)) {
                                    return '(iy+offset)';
                                }
                                if (['bc', 'de', 'hl', 'sp', 'c', 'ix', 'iy'].includes(memValue)) {
                                    return `(${memValue})`;
                                } else {
                                    // Special case for IN/OUT instructions - ports are 8-bit
                                    if (['in', 'out'].includes(mnemonic)) {
                                        return '(imm8)';
                                    }
                                    // Memory operand with symbol/address - treat as (imm16) for opcode lookup
                                    return '(imm16)';
                                }
                            } else {
                                // Numeric memory operand
                                if (['in', 'out'].includes(mnemonic)) {
                                    return '(imm8)';
                                }
                                return '(imm16)';
                            }
                        case 'immediate':
                        case 'symbol':
                            // Special handling for the first operand of bit/res/set
                            if (['bit', 'res', 'set'].includes(mnemonic) && instruction.operands.indexOf(op) === 0) {
                                const val = this.evaluateExpression(op);
                                if (val < 0 || val > 7) {
                                    throw new Error(`Bit position must be 0-7 for ${mnemonic}, got ${val}`);
                                }
                                return String(val);
                            }                          
                            if (mnemonic.startsWith('jr') || mnemonic === 'djnz') return 'rel8';
                            if (mnemonic === 'jp' || mnemonic === 'call') {
                                if (instruction.operands[0].type === 'memory') {
                                    const memVal = instruction.operands[0].value;
                                    if (typeof memVal === 'string') {
                                        return `(${memVal.toLowerCase()})`;
                                    } else {
                                        return '(imm16)';
                                    }
                                }
                                return 'imm16';
                            }
                            if (mnemonic === 'ld') {
                                const dest = instruction.operands[0];
                                if (dest.type === 'register_pair') return 'imm16';
                                if (dest.type === 'memory') {
                                    if (typeof dest.value === 'string') {
                                        const destLower = dest.value.toLowerCase();
                                        // Check for register indirect or IX/IY with displacement
                                        const isRegisterIndirect = ['bc','de','hl','ix','iy'].includes(destLower);
                                        const isIxIyDisplacement = isIxIyDisplacementOperandText(dest.value);
                                        if (!isRegisterIndirect && !isIxIyDisplacement) return 'imm16';
                                    } else {
                                        return 'imm16'; // Numeric memory operand
                                    }
                                }
                                return 'imm8';
                            }
                            if (['add', 'adc', 'sub', 'sbc', 'and', 'or', 'xor', 'cp', 'out', 'in'].includes(mnemonic)) {
                                return 'imm8';
                            }
                            if (['rst'].includes(mnemonic)) {
                                // RST is special - it's actually encoded in the opcode itself
                                return op.value.toString(16).padStart(2, '0') + 'h';
                            }
                            return 'imm16';
                        default: return 'unknown';
                    }
                }).join(',');
                
                return `${mnemonic}_${opTypes}`;
            }

            evaluateExpression(operand, preserveFloat = false) {
                try {
                    if (operand.type === 'immediate') return operand.value;
                    // Check if register/condition name is actually a LET variable
                    // (e.g., 'c' could be parsed as register C but actually be a variable)
                    if ((operand.type === 'register' || operand.type === 'condition') && this.variableTable) {
                        const varName = operand.value.toLowerCase();
                        if (this.variableTable[varName] !== undefined) {
                            const result = this.variableTable[varName];
                            return preserveFloat ? result : Math.floor(result);
                        }
                    }
                    if (operand.type !== 'symbol') {
                        if (this.currentPass < 3) return 0;
                        throw new Error(`Cannot evaluate expression for operand type: ${operand.type}`);
                    }

                    let expr = String(operand.value);
                    const originalExpr = expr; // Keep original for error reporting

                    // Handle temporary symbol references
                    expr = this.resolveTemporarySymbolReference(expr);

                    // Check if it's a direct opcode reference
                    const opcode = Z80_OPCODES[expr.toLowerCase()];
                    if (opcode) {
                        return opcode[opcode.length - 1];
                    }

                    // IMPORTANT: Parse hex/bin/oct numbers FIRST, before replacing $ with PC
                    // This allows $702b to be treated as hex, not $ (PC) followed by 702b
                    let parsedExpr = expr;
                    parsedExpr = parsedExpr.replace(/\b0x([0-9a-fA-F]+)/gi, (match, hex) => parseInt(hex, 16));
                    parsedExpr = parsedExpr.replace(/\$([0-9a-fA-F]+)\b/g, (match, hex) => parseInt(hex, 16));
                    parsedExpr = parsedExpr.replace(/\b([0-9a-fA-F]+)h\b/gi, (match, hex) => parseInt(hex, 16));
                    parsedExpr = parsedExpr.replace(/\b%([01]+)\b/g, (match, bin) => parseInt(bin, 2));
                    parsedExpr = parsedExpr.replace(/\b([01]+)b\b/gi, (match, bin) => parseInt(bin, 2));
                    parsedExpr = parsedExpr.replace(/\b@([0-7]+)\b/g, (match, oct) => parseInt(oct, 8));

                    // NOW replace $ with PC (for expressions like $ or $+5 where $ is alone)
                    parsedExpr = parsedExpr.replace(/\$/g, this.pc);
                    // Don't replace * - it's the multiplication operator, not PC symbol
                    // (If we need * as PC symbol in the future, we'll need context-aware replacement)

                    // Replace variables first (v2.1 LET - highest priority for mutable values)
                    if (this.variableTable) {
                        const sortedVars = Object.keys(this.variableTable).sort((a, b) => b.length - a.length);
                        for (const varName of sortedVars) {
                            const escapedVar = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const regex = new RegExp(`\\b${escapedVar}\\b`, 'gi');
                            parsedExpr = parsedExpr.replace(regex, this.variableTable[varName]);
                        }
                    }

                    // Replace constants (higher priority than symbols)
                    const sortedConstants = Object.keys(this.constantTable).sort((a, b) => b.length - a.length);
                    for (const constant of sortedConstants) {
                        // Escape special regex characters in constant name
                        const escapedConstant = constant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`\\b${escapedConstant}\\b`, 'gi');  // Added 'i' flag for case-insensitive
                        parsedExpr = parsedExpr.replace(regex, this.constantTable[constant]);
                    }

                    // Replace symbols (case-insensitive for Z80 assembly compatibility)
                    const sortedSymbols = Object.keys(this.symbolTable).sort((a, b) => b.length - a.length);

                    for (const symbol of sortedSymbols) {
                        // First try exact match (case-insensitive) - fastest and most reliable
                        if (parsedExpr.toLowerCase() === symbol.toLowerCase()) {
                            parsedExpr = this.symbolTable[symbol].toString();
                            continue;
                        }

                        // Escape special regex characters in symbol name
                        const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // For symbols starting with dot (local labels), don't use word boundary at start
                        const boundaryStart = symbol.startsWith('.') ? '' : '\\b';
                        const regex = new RegExp(`${boundaryStart}${escapedSymbol}\\b`, 'gi');  // Added 'i' flag for case-insensitive
                        parsedExpr = parsedExpr.replace(regex, this.symbolTable[symbol]);
                    }

                    // Replace character constants with their ASCII values (supports both ' and ")
                    // Matches: 'X' or "X" where X is any single character
                    parsedExpr = parsedExpr.replace(/['"](.)['"]/g, (match, char) => {
                        return char.charCodeAt(0).toString();
                    });

                    // Enhanced expression operators: HIGH(), LOW(), <, >
                    // HIGH(value) or >value - Extract high byte (bits 8-15)
                    // LOW(value) or <value - Extract low byte (bits 0-7)

                    // Handle HIGH() function
                    parsedExpr = parsedExpr.replace(/HIGH\s*\(\s*([^)]+)\s*\)/gi, (match, inner) => {
                        try {
                            const innerVal = new Function(`return ${inner}`)();
                            return ((innerVal >> 8) & 0xFF).toString();
                        } catch (e) {
                            return match; // Leave as-is if can't evaluate yet
                        }
                    });

                    // Handle LOW() function
                    parsedExpr = parsedExpr.replace(/LOW\s*\(\s*([^)]+)\s*\)/gi, (match, inner) => {
                        try {
                            const innerVal = new Function(`return ${inner}`)();
                            return (innerVal & 0xFF).toString();
                        } catch (e) {
                            return match; // Leave as-is if can't evaluate yet
                        }
                    });

                    // ============================================
                    // v2.1 MATH FUNCTIONS - Process iteratively to handle nesting
                    // ============================================
                    const DEG_TO_RAD = Math.PI / 180;
                    const RAD_TO_DEG = 180 / Math.PI;

                    // Helper to evaluate inner expression with nesting support
                    const evalInner = (inner) => {
                        try {
                            return new Function(`return ${inner}`)();
                        } catch (e) {
                            return parseFloat(inner);
                        }
                    };

                    // Process functions iteratively until no more changes
                    let prevParsedExpr = '';
                    let maxIterations = 20;
                    while (parsedExpr !== prevParsedExpr && maxIterations-- > 0) {
                        prevParsedExpr = parsedExpr;

                        // Trig functions first (often innermost)
                        parsedExpr = parsedExpr.replace(/\bSIN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.sin(evalInner(a) * DEG_TO_RAD));
                        parsedExpr = parsedExpr.replace(/\bCOS\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.cos(evalInner(a) * DEG_TO_RAD));
                        parsedExpr = parsedExpr.replace(/\bTAN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.tan(evalInner(a) * DEG_TO_RAD));
                        parsedExpr = parsedExpr.replace(/\bASIN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.asin(evalInner(a)) * RAD_TO_DEG);
                        parsedExpr = parsedExpr.replace(/\bACOS\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.acos(evalInner(a)) * RAD_TO_DEG);
                        parsedExpr = parsedExpr.replace(/\bATAN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.atan(evalInner(a)) * RAD_TO_DEG);

                        // Log/Exp functions
                        parsedExpr = parsedExpr.replace(/\bLOG10\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.log10(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bLOG2\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.log2(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bLOG\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.log(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bEXP\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.exp(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bSQRT\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.sqrt(evalInner(a)));

                        // Other single-arg math functions
                        parsedExpr = parsedExpr.replace(/\bABS\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.abs(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bFLOOR\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.floor(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bCEIL\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.ceil(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bROUND\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.round(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bSGN\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.sign(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bINT\s*\(\s*([^()]+)\s*\)/gi, (m, a) => Math.trunc(evalInner(a)));
                        parsedExpr = parsedExpr.replace(/\bFRAC\s*\(\s*([^()]+)\s*\)/gi, (m, a) => evalInner(a) % 1);

                        // Two-argument functions
                        parsedExpr = parsedExpr.replace(/\bMIN\s*\(\s*([^(),]+)\s*,\s*([^()]+)\s*\)/gi,
                            (m, a, b) => Math.min(evalInner(a), evalInner(b)));
                        parsedExpr = parsedExpr.replace(/\bMAX\s*\(\s*([^(),]+)\s*,\s*([^()]+)\s*\)/gi,
                            (m, a, b) => Math.max(evalInner(a), evalInner(b)));
                        parsedExpr = parsedExpr.replace(/\bPOW\s*\(\s*([^(),]+)\s*,\s*([^()]+)\s*\)/gi,
                            (m, a, b) => Math.pow(evalInner(a), evalInner(b)));
                        parsedExpr = parsedExpr.replace(/\bATAN2\s*\(\s*([^(),]+)\s*,\s*([^()]+)\s*\)/gi,
                            (m, y, x) => Math.atan2(evalInner(y), evalInner(x)) * RAD_TO_DEG);

                        // RND - random number
                        parsedExpr = parsedExpr.replace(/\bRND\s*\(\s*([^()]+)\s*\)/gi,
                            (m, a) => Math.floor(Math.random() * evalInner(a)));
                    }

                    // Handle > operator (high byte) - must be at start or after non-letter
                    // >$1234 -> high byte of 0x1234
                    parsedExpr = parsedExpr.replace(/(^|[^a-zA-Z])>([0-9x]+)/gi, (match, prefix, num) => {
                        try {
                            const val = parseInt(num, num.startsWith('0x') || num.startsWith('0X') ? 16 : 10);
                            return prefix + ((val >> 8) & 0xFF).toString();
                        } catch (e) {
                            return match;
                        }
                    });

                    // Handle < operator (low byte) - must be at start or after non-letter
                    // <$1234 -> low byte of 0x1234
                    parsedExpr = parsedExpr.replace(/(^|[^a-zA-Z])<([0-9x]+)/gi, (match, prefix, num) => {
                        try {
                            const val = parseInt(num, num.startsWith('0x') || num.startsWith('0X') ? 16 : 10);
                            return prefix + (val & 0xFF).toString();
                        } catch (e) {
                            return match;
                        }
                    });

                    // Pro version: Check if remaining symbol is EXTERN (after symbol table replacement)
                    // If the expression still contains letters and it's an EXTERN symbol, return 0
                    const trimmedExpr = parsedExpr.trim();
                    if (this.outputMode === 'rel' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedExpr)) {
                        // Check all external symbols (case-insensitive for safety)
                        for (const extSym of this.externalSymbols) {
                            if (extSym.toUpperCase() === trimmedExpr.toUpperCase()) {
                                // External symbol - return 0 as placeholder
                                return 0;
                            }
                        }
                    }

                    // Parse numbers with different bases (for simple number values)
                    const numValue = this.numberParser.parseNumber(parsedExpr);
                    if (numValue !== null) {
                        return numValue;
                    }

                    try {

                        // Now check for undefined symbols (after hex parsing)
                        if (/[a-zA-Z_]/.test(parsedExpr)) {
                            if (this.currentPass < 3) return 0;
                            throw new Error(`Undefined symbol in expression: ${originalExpr} (evaluated to: ${parsedExpr})`);
                        }

                        // Allow arithmetic operators: + - * / ( )
                        // Allow bitwise operators: & | ^ ~ << >>
                        // Allow comparison operators: == != < > <= >=
                        // Allow modulo: %
                        const sanitizedExpr = parsedExpr.replace(/[^\d\+\-\*\/\(\)\s\.\&\|\^\~\<\>\%\=\!]/g, '');
                        if (sanitizedExpr.trim() !== parsedExpr.trim()) {
                             if (this.currentPass < 3) return 0;
                             throw new Error(`Invalid characters in expression: ${originalExpr} (cleaned: ${sanitizedExpr})`);
                        }
                        const result = new Function(`return ${sanitizedExpr}`)();
                        return preserveFloat ? result : Math.floor(result);
                    } catch (e) {
                        if (this.currentPass < 3) return 0;
                        throw new Error(`Invalid expression: ${originalExpr} (sanitized: ${expr})`);
                    }
                } catch (error) {
                    // Add context about current instruction if available
                    if (this.currentInstruction) {
                        const instStr = this.currentInstruction.mnemonic || this.currentInstruction.name || 'unknown';
                        throw new Error(`${error.message} in instruction '${instStr}' at line ${this.currentLine}`);
                    }
                    throw error;
                }
            }

            // Pro version: Track relocation for a symbol reference
            trackRelocation(symbolName, location, isWord = true) {
                if (this.outputMode !== 'rel') return; // Only track in .REL mode

                // Determine address type based on symbol
                let addressType;
                if (this.externalSymbols.has(symbolName)) {
                    // External symbol - will be resolved at link time
                    this.externalRefs.push({
                        symbol: symbolName,
                        location: location,
                        addressType: this.getSegmentAddressType()
                    });
                    // Don't add to relocations - linker will patch this directly
                    return;
                } else if (this.symbolTable[symbolName] !== undefined) {
                    // Local symbol - needs relocation
                    addressType = this.getSegmentAddressType();
                } else {
                    // Symbol not yet defined (forward reference)
                    // Will be resolved in later pass
                    return;
                }

                this.relocations.push({
                    location: location,
                    addressType: addressType,
                    segment: this.currentSegment,
                    isWord: isWord
                });
            }

            // Pro version: Get address type for current segment
            getSegmentAddressType() {
                switch (this.currentSegment) {
                    case 'code': return 0x01;
                    case 'data': return 0x02;
                    case 'common': return 0x03;
                    case 'absolute': return 0x00;
                    default: return 0x01; // Default to CODE
                }
            }

            // Pro version: Check if an operand contains a symbol that needs relocation
            needsRelocation(operand) {
                if (this.outputMode !== 'rel') return false;
                if (operand.type !== 'symbol') return false;

                const expr = String(operand.value);

                // Check if expression contains any symbols (not just numbers/operators)
                // Simple heuristic: if it contains letters, it likely has a symbol
                return /[a-zA-Z_]/.test(expr);
            }

            // Pro version: Generate .REL file from assembled code
            generateRelFile() {
                const writer = new BitStreamWriter();

                // Add extended format header if using extended format
                if (this.useExtendedRelFormat) {
                    // Linkstor80 extended format header: "LNKSTOR" signature
                    // This is a special 16-byte sequence that LINK-80 ignores
                    const extendedHeader = [
                        0x85, 0xD3, 0x13, 0x92, 0xD4, 0xD5, 0x13, 0xD4,
                        0xA5, 0x00, 0x00, 0x13, 0x8F, 0xFF, 0xF0, 0x9E
                    ];
                    for (const byte of extendedHeader) {
                        writer.writeBits(byte, 8);
                    }
                    log('ℹ️  Generated extended format .REL file (Linkstor80-compatible)', 'info');
                }

                // Control code 2: Program Name
                this.writeSpecialItem(writer, 0x02, null, null, this.moduleName || 'MODULE');

                // Control code 0: Entry Symbol declarations (PUBLIC symbols)
                for (const symbolName of this.publicSymbols) {
                    this.writeSpecialItem(writer, 0x00, null, null, symbolName);
                }

                // Control code 11: Set Location Counter to CODE segment
                this.writeSpecialItem(writer, 0x0B, 0x01, 0x0000, null);

                // Write CODE segment bytes with relocations
                let codePos = 0;
                while (codePos < this.output.length) {
                    // Check if there's a relocation at this position
                    const relocation = this.relocations.find(r => r.location === codePos);

                    if (relocation && relocation.isWord) {
                        // Write relocatable word
                        const value = this.output[codePos] | (this.output[codePos + 1] << 8);
                        writer.writeBit(1); // Relocatable
                        writer.writeBits(relocation.addressType, 2);
                        writer.writeBits(value, 16);
                        codePos += 2;
                    } else {
                        // Write absolute byte
                        writer.writeBit(0); // Absolute
                        writer.writeBits(this.output[codePos], 8);
                        codePos++;
                    }
                }

                // Control code 13: Define Program Size
                this.writeSpecialItem(writer, 0x0D, 0x01, this.output.length, null);

                // Control code 7: Define Entry Points (PUBLIC symbol values)
                for (const symbolName of this.publicSymbols) {
                    if (this.symbolTable[symbolName] !== undefined) {
                        const value = this.symbolTable[symbolName];
                        this.writeSpecialItem(writer, 0x07, 0x01, value, symbolName);
                    }
                }

                // Control code 6: Chain External references
                for (const extRef of this.externalRefs) {
                    this.writeSpecialItem(writer, 0x06, extRef.addressType, extRef.location, extRef.symbol);
                }

                // Control code 14: End Program
                writer.writeBit(1);
                writer.writeBits(0x00, 2); // Special item
                writer.writeBits(0x0E, 4); // Control code 14

                // Control code 15: End File
                writer.writeBit(1);
                writer.writeBits(0x00, 2); // Special item
                writer.writeBits(0x0F, 4); // Control code 15

                return writer.getBytes();
            }

            // Pro version: Write a special LINK item to .REL file
            writeSpecialItem(writer, controlCode, addressType, value, symbolName) {
                writer.writeBit(1); // Relocatable item
                writer.writeBits(0x00, 2); // Special LINK item
                writer.writeBits(controlCode, 4);

                if (addressType !== null && addressType !== undefined) {
                    writer.writeBits(addressType, 2);
                }

                if (value !== null && value !== undefined) {
                    writer.writeBits(value, 16);
                }

                if (symbolName !== null && symbolName !== undefined) {
                    this.writeSymbolName(writer, symbolName);
                }
            }

            // Write symbol name in either standard (6-char max) or extended format
            writeSymbolName(writer, symbolName) {
                const useExtended = this.useExtendedRelFormat || false;

                if (!useExtended) {
                    // Standard LINK-80 format: Max 6 characters, 3-bit length
                    if (symbolName.length > 6) {
                        const truncated = symbolName.substring(0, 6);
                        log(`⚠️  Warning: Symbol "${symbolName}" truncated to "${truncated}" (LINK-80 format)`, 'warn');
                        symbolName = truncated;
                    }
                    const len = symbolName.length;
                    writer.writeBits(len, 3);
                    for (let i = 0; i < len; i++) {
                        writer.writeBits(symbolName.charCodeAt(i), 8);
                    }
                } else {
                    // Extended format (Linkstor80-compatible)
                    const len = symbolName.length;

                    if (len <= 7) {
                        // Use standard 3-bit length for short symbols (0-7 chars)
                        writer.writeBits(len, 3);
                        for (let i = 0; i < len; i++) {
                            writer.writeBits(symbolName.charCodeAt(i), 8);
                        }
                    } else {
                        // Use extended format: 3-bit marker (111) + FFh + length bytes + symbol
                        writer.writeBits(0x07, 3); // 111 = signals extended format follows
                        writer.writeBits(0xFF, 8); // Escape marker

                        // Write length in minimal bytes (little-endian)
                        if (len <= 255) {
                            writer.writeBits(len, 8);
                        } else if (len <= 65535) {
                            writer.writeBits(len & 0xFF, 8);
                            writer.writeBits((len >> 8) & 0xFF, 8);
                        } else {
                            // Limit to 65535 characters
                            writer.writeBits(0xFF, 8);
                            writer.writeBits(0xFF, 8);
                        }

                        // Write symbol characters
                        const maxLen = Math.min(len, 65535);
                        for (let i = 0; i < maxLen; i++) {
                            writer.writeBits(symbolName.charCodeAt(i), 8);
                        }

                        log(`ℹ️  Extended symbol: "${symbolName}" (${len} chars)`, 'info');
                    }
                }
            }
        }

export { Assembler };

export async function assembleAmysCVAssembly(files, mainFile = "main.asm", options = {}) {
  compileLog = [];
  compiledBinary = null;
  outputFilename = options.outputFilename || "build/output.col";
  compilerUiState.optimizerEnabled = !!options.optimizerEnabled;
  compilerUiState.optimizerConfig = {
    ...defaultOptimizerConfig,
    ...(options.optimizerConfig || {})
  };
  compilerUiState.targetPlatform = options.targetPlatform || "raw";
  const assembler = new Assembler(files);
  assembler.outputMode = options.outputMode || "binary";
  assembler.moduleName = options.moduleName || extractFilename(mainFile).replace(/\.(asm|z80|s)$/i, "").toUpperCase();
  const binary = await assembler.assemble(mainFile);
  return {
    ok: !!binary,
    binary,
    outputFilename,
    symbols: assembler.symbolTable,
    symbolInfo: assembler.symbolInfo,
    stats: assembler.compilationStats,
    fileMap: assembler.fileMap,
    memoryMap: assembler.buildMemoryMapReport(),
    listing: assembler.generateListingFile(),
    symbolsText: assembler.generateDebuggerSymbolFile(),
    optimizedAsm: assembler.optimizedSource || "",
    log: compileLog.map((entry) => `[${entry.level}] ${entry.message}`).join("\n")
  };
}
