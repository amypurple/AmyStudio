import { Directive, Instruction, Operand } from './parserCore.js';

function optimizerLog(message, level = 'info') {
  if (typeof globalThis.__amyscvassembly_log === 'function') {
    globalThis.__amyscvassembly_log(message, level);
  }
}

const Z80_OPCODES = new Proxy({}, {
  get(_target, prop) {
    return (globalThis.__amyscvassembly_opcodes || {})[prop];
  },
  has(_target, prop) {
    return prop in (globalThis.__amyscvassembly_opcodes || {});
  }
});

export class Z80Optimizer {
            constructor(assembler, config = {}) {
                this.assembler = assembler;
                this.symbolTable = assembler.symbolTable;
                this.config = config;
                this.stats = {
                    jpToJr: 0,
                    ldToXor: 0,
                    deadCodeRemoved: 0,
                    localDeadCodeRemoved: 0,
                    peepholeOpts: 0,
                    callMerge: 0,
                    callRetToJp: 0,
                    rstOptimized: 0,
                    rstVectorsUsed: 0,
                    routinesInlined: 0,
                    ixFramesStripped: 0,
                    inlinePasses: 0,
                    bytesSaved: 0,
                    djnzExpanded: 0,
                    jrExpanded: 0
                };
                this.rstMappings = {}; // Track which routines are mapped to which RST vectors
            }

            snapshotTokens(tokens) {
                return tokens.map(token => {
                    if (token instanceof Instruction) {
                        const ops = (token.operands || []).map(op => `${op.type}:${op.value}`).join(',');
                        return `I|${token.label || ''}|${token.mnemonic}|${ops}`;
                    }
                    if (token instanceof Directive) {
                        const ops = (token.operands || []).map(op => `${op.type}:${op.value}`).join(',');
                        return `D|${token.label || ''}|${token.name}|${ops}`;
                    }
                    return `O|${String(token)}`;
                }).join('\n');
            }

            estimateTokenByteSize(token) {
                if (token instanceof Instruction) {
                    const key = this.assembler.getOpcodeKey(token);
                    const opcode = Z80_OPCODES[key];
                    let size = opcode ? opcode.length : 1;
                    if (key && (key.includes('imm8') || key.includes('rel8') || key.includes('offset'))) size += 1;
                    if (key && key.includes('imm16')) size += 2;
                    return size;
                }
                if (token instanceof Directive) {
                    const name = String(token.name || '').toUpperCase();
                    if (name === 'DB' || name === 'DEFB') return (token.operands || []).length;
                    if (name === 'DW' || name === 'DEFW') return (token.operands || []).length * 2;
                }
                return 0;
            }

            isSafeInlineRoutine(labelName, routine) {
                const bodyTokens = routine.tokens.slice(0, -1);
                if (!bodyTokens.length) return false;
                if (bodyTokens.length > 6) return false;

                let bodyBytes = 0;
                for (let idx = 0; idx < bodyTokens.length; idx++) {
                    const token = bodyTokens[idx];
                    if (idx > 0 && token.label) return false;
                    bodyBytes += this.estimateTokenByteSize(token);
                    if (token instanceof Instruction) {
                        const mnem = token.mnemonic.toLowerCase();
                        if (['call', 'jp', 'jr', 'djnz', 'ret', 'reti', 'retn', 'rst', 'halt'].includes(mnem)) {
                            return false;
                        }
                        const operandText = (token.operands || []).map(op => String(op.value || '').toLowerCase()).join(',');
                        if (operandText.includes('ix') || operandText.includes('iy') || operandText.includes('sp')) {
                            return false;
                        }
                    }
                }

                return bodyBytes <= 8;
            }

            // Phase 1: Optimizations that don't depend on accurate final addresses
            optimizePhase1(tokens) {
                let optimized = tokens;

                // Routine inlining (configurable) - iterative passes
                // Must run BEFORE dead code elimination since inlining creates dead routines
                if (this.config.inlineRoutines) {
                    optimized = this.inlineSingleCallRoutines(optimized);
                }

                // Dead code elimination (configurable)
                if (this.config.deadCode) {
                    optimized = this.eliminateDeadCode(optimized);
                }

                // RST vector optimization (configurable)
                if (this.config.rstVectors) {
                    optimized = this.optimizeRstVectors(optimized);
                }

                // Peephole optimizations
                if (this.config.peephole) {
                    const maxPeepholePasses = 8;
                    for (let pass = 0; pass < maxPeepholePasses; pass++) {
                        const before = this.snapshotTokens(optimized);
                        const afterTokens = this.peepholeOptimize(optimized);
                        const after = this.snapshotTokens(afterTokens);
                        optimized = afterTokens;
                        if (after === before) break;
                    }
                }

                return optimized;
            }

            // Phase 2: Address-dependent optimizations (requires accurate symbol table)
            optimizePhase2(tokens) {
                let optimized = tokens;

                // Instruction optimizations (JP→JR, LD A,0→XOR A)
                // These need accurate addresses from symbol table
                optimized = this.optimizeInstructions(optimized);

                return optimized;
            }

            instructionUsesPriorFlags(token) {
                if (!(token instanceof Instruction)) return false;
                const mnem = token.mnemonic.toLowerCase();
                if ((mnem === 'jr' || mnem === 'jp' || mnem === 'call') &&
                    token.operands.length > 1 &&
                    token.operands[0].type === 'condition') {
                    return true;
                }
                if (mnem === 'ret' &&
                    token.operands.length === 1 &&
                    token.operands[0].type === 'condition') {
                    return true;
                }
                if (mnem === 'push' &&
                    token.operands.length === 1 &&
                    token.operands[0].type === 'register_pair' &&
                    String(token.operands[0].value).toLowerCase() === 'af') {
                    return true;
                }
                if (mnem === 'ex' &&
                    token.operands.length === 2 &&
                    token.operands[0].type === 'register_pair' &&
                    token.operands[1].type === 'register_pair' &&
                    String(token.operands[0].value).toLowerCase() === 'af' &&
                    String(token.operands[1].value).toLowerCase() === "af'") {
                    return true;
                }
                if (['adc', 'sbc', 'daa', 'rla', 'rra', 'ccf'].includes(mnem)) {
                    return true;
                }
                if ((mnem === 'rl' || mnem === 'rr') && token.operands.length >= 1) {
                    return true;
                }
                return false;
            }

            instructionFullyClobbersFlags(token) {
                if (!(token instanceof Instruction)) return false;
                const mnem = token.mnemonic.toLowerCase();
                if (['add', 'sub', 'and', 'xor', 'or', 'cp', 'neg'].includes(mnem)) {
                    return true;
                }
                if (['rlca', 'rrca', 'rlc', 'rrc', 'sla', 'sra', 'srl'].includes(mnem)) {
                    return true;
                }
                if (mnem === 'pop' &&
                    token.operands.length === 1 &&
                    token.operands[0].type === 'register_pair' &&
                    String(token.operands[0].value).toLowerCase() === 'af') {
                    return true;
                }
                if (mnem === 'ex' &&
                    token.operands.length === 2 &&
                    token.operands[0].type === 'register_pair' &&
                    token.operands[1].type === 'register_pair' &&
                    String(token.operands[0].value).toLowerCase() === 'af' &&
                    String(token.operands[1].value).toLowerCase() === "af'") {
                    return true;
                }
                return false;
            }


            instructionUsesPriorCarryFlag(token) {
                if (!(token instanceof Instruction)) return false;
                const mnem = token.mnemonic.toLowerCase();
                const ops = token.operands || [];
                if ((mnem === 'jr' || mnem === 'jp' || mnem === 'call' || mnem === 'ret') &&
                    ops.length > 0 &&
                    ops[0].type === 'condition') {
                    const cond = String(ops[0].value).toLowerCase();
                    return cond === 'c' || cond === 'nc';
                }
                if (['adc', 'sbc', 'rla', 'rra', 'rl', 'rr', 'ccf', 'daa'].includes(mnem)) {
                    return true;
                }
                if (mnem === 'push' &&
                    ops.length === 1 &&
                    ops[0].type === 'register_pair' &&
                    String(ops[0].value).toLowerCase() === 'af') {
                    return true;
                }
                if (mnem === 'ex' &&
                    ops.length === 2 &&
                    ops[0].type === 'register_pair' &&
                    ops[1].type === 'register_pair' &&
                    String(ops[0].value).toLowerCase() === 'af' &&
                    String(ops[1].value).toLowerCase() === "af'") {
                    return true;
                }
                return false;
            }

            instructionFullyClobbersCarryFlag(token) {
                if (!(token instanceof Instruction)) return false;
                const mnem = token.mnemonic.toLowerCase();
                if (['add', 'sub', 'and', 'xor', 'or', 'cp', 'neg', 'scf'].includes(mnem)) {
                    return true;
                }
                if (['rlca', 'rrca', 'rlc', 'rrc', 'sla', 'sra', 'srl'].includes(mnem)) {
                    return true;
                }
                if (mnem === 'pop' &&
                    token.operands.length === 1 &&
                    token.operands[0].type === 'register_pair' &&
                    String(token.operands[0].value).toLowerCase() === 'af') {
                    return true;
                }
                if (mnem === 'ex' &&
                    token.operands.length === 2 &&
                    token.operands[0].type === 'register_pair' &&
                    token.operands[1].type === 'register_pair' &&
                    String(token.operands[0].value).toLowerCase() === 'af' &&
                    String(token.operands[1].value).toLowerCase() === "af'") {
                    return true;
                }
                return false;
            }

            isCarryDeadBeforeNextUse(tokens, startIdx) {
                const startToken = tokens[startIdx];
                if (startToken instanceof Instruction && startToken.label) {
                    return false;
                }
                for (let lookahead = startIdx + 1; lookahead < tokens.length; lookahead++) {
                    const candidate = tokens[lookahead];
                    if (candidate instanceof Directive && candidate.name === 'ORG') {
                        return false;
                    }
                    if (!(candidate instanceof Instruction)) {
                        continue;
                    }
                    if (candidate.label) {
                        return false;
                    }
                    if (this.instructionUsesPriorCarryFlag(candidate)) {
                        return false;
                    }
                    if (this.instructionFullyClobbersCarryFlag(candidate)) {
                        return true;
                    }
                    const mnem = candidate.mnemonic.toLowerCase();
                    if ((mnem === 'ret' || mnem === 'reti' || mnem === 'retn') && candidate.operands.length === 0) {
                        return true;
                    }
                    if ((mnem === 'jp' || mnem === 'jr') && candidate.operands.length === 1) {
                        return true;
                    }
                }
                return false;
            }

            getRegisterPairMembers(regName) {
                const members = {
                    af: ['a'],
                    bc: ['b', 'c'],
                    de: ['d', 'e'],
                    hl: ['h', 'l'],
                    ix: ['ixh', 'ixl'],
                    iy: ['iyh', 'iyl']
                };
                return members[String(regName || '').toLowerCase()] || [];
            }

            getContainingRegisterPair(regName) {
                const pairs = {
                    a: 'af',
                    b: 'bc',
                    c: 'bc',
                    d: 'de',
                    e: 'de',
                    h: 'hl',
                    l: 'hl',
                    ixh: 'ix',
                    ixl: 'ix',
                    iyh: 'iy',
                    iyl: 'iy'
                };
                return pairs[String(regName || '').toLowerCase()] || null;
            }

            registerNameTouchesTarget(registerName, targetName) {
                const reg = String(registerName || '').toLowerCase();
                const target = String(targetName || '').toLowerCase();
                if (!reg || !target) return false;
                if (reg === target) return true;

                const targetMembers = this.getRegisterPairMembers(target);
                if (targetMembers.length > 0 && targetMembers.includes(reg)) {
                    return true;
                }

                const containingPair = this.getContainingRegisterPair(target);
                return containingPair !== null && reg === containingPair;
            }

            registerNameWritesTarget(registerName, targetName) {
                const reg = String(registerName || '').toLowerCase();
                const target = String(targetName || '').toLowerCase();
                if (!reg || !target) return false;
                if (reg === target) return true;

                const containingPair = this.getContainingRegisterPair(target);
                return containingPair !== null && reg === containingPair;
            }

            instructionTouchesRegister(token, regName) {
                if (!(token instanceof Instruction)) return false;
                const target = String(regName || '').toLowerCase();
                for (const op of token.operands || []) {
                    if (op.type === 'register' || op.type === 'register_pair') {
                        const v = String(op.value).toLowerCase();
                        if (this.registerNameTouchesTarget(v, target)) return true;
                    } else if (op.type === 'memory' && typeof op.value === 'string') {
                        const v = String(op.value).toLowerCase().replace(/\s+/g, '');
                        if (this.registerNameTouchesTarget(v, target)) return true;
                        const indexedBase = v.match(/^(ix|iy|sp)(?:[+\-].+)?$/);
                        if (indexedBase && this.registerNameTouchesTarget(indexedBase[1], target)) return true;
                    }
                }
                return false;
            }

            instructionWritesRegister(token, regName) {
                if (!(token instanceof Instruction)) return false;
                const target = String(regName || '').toLowerCase();
                const aliasMembers = {
                    af: new Set(['af', 'a']),
                    bc: new Set(['bc', 'b', 'c']),
                    de: new Set(['de', 'd', 'e']),
                    hl: new Set(['hl', 'h', 'l']),
                    ix: new Set(['ix', 'ixh', 'ixl']),
                    iy: new Set(['iy', 'iyh', 'iyl']),
                    sp: new Set(['sp'])
                };
                const members = aliasMembers[target] || new Set([target]);
                const operandWritesTarget = (op) =>
                    !!op &&
                    (op.type === 'register' || op.type === 'register_pair') &&
                    this.registerNameWritesTarget(String(op.value).toLowerCase(), target);
                const writesA = () => members.has('a') || members.has('af');
                const mnem = token.mnemonic.toLowerCase();
                const ops = token.operands || [];

                if (mnem === 'ld' || mnem === 'pop' || mnem === 'in') {
                    return operandWritesTarget(ops[0]);
                }

                if (['inc', 'dec', 'set', 'res', 'rl', 'rr', 'rlc', 'rrc', 'sla', 'sra', 'srl', 'sll'].includes(mnem)) {
                    return operandWritesTarget(ops[0]);
                }

                if (mnem === 'add' || mnem === 'adc' || mnem === 'sbc') {
                    return operandWritesTarget(ops[0]) || (ops.length < 2 && writesA());
                }

                if (['sub', 'and', 'or', 'xor', 'neg', 'cpl', 'daa', 'rla', 'rra', 'rlca', 'rrca'].includes(mnem)) {
                    return writesA();
                }

                if (mnem === 'cp' || mnem === 'scf' || mnem === 'ccf' || mnem === 'out') {
                    return false;
                }

                if (mnem === 'ex') {
                    return operandWritesTarget(ops[0]) || operandWritesTarget(ops[1]);
                }

                if (mnem === 'exx') {
                    return members.has('bc') || members.has('b') || members.has('c') ||
                        members.has('de') || members.has('d') || members.has('e') ||
                        members.has('hl') || members.has('h') || members.has('l');
                }

                if (['ldi', 'ldir', 'ldd', 'lddr'].includes(mnem)) {
                    return members.has('bc') || members.has('b') || members.has('c') ||
                        members.has('de') || members.has('d') || members.has('e') ||
                        members.has('hl') || members.has('h') || members.has('l');
                }

                if (['ini', 'ind', 'inir', 'indr', 'outi', 'outd', 'otir', 'otdr'].includes(mnem)) {
                    return members.has('bc') || members.has('b') || members.has('c') ||
                        members.has('hl') || members.has('h') || members.has('l');
                }

                if (mnem === 'djnz') {
                    return members.has('bc') || members.has('b');
                }

                return false;
            }

            instructionFullyOverwritesRegister(token, regName) {
                if (!(token instanceof Instruction)) return false;
                const target = String(regName || '').toLowerCase();
                const mnem = token.mnemonic.toLowerCase();
                const ops = token.operands || [];

                const operandFullyOverwritesTarget = (op) =>
                    !!op &&
                    (op.type === 'register' || op.type === 'register_pair') &&
                    this.registerNameWritesTarget(String(op.value).toLowerCase(), target);

                if (mnem === 'ld' || mnem === 'pop' || mnem === 'in') {
                    return operandFullyOverwritesTarget(ops[0]);
                }

                if (mnem === 'xor' &&
                    target === 'a' &&
                    ops.length === 1 &&
                    ops[0].type === 'register' &&
                    String(ops[0].value).toLowerCase() === 'a') {
                    return true;
                }

                return false;
            }

            areFlagsDeadBeforeNextUse(tokens, startIdx) {
                const startToken = tokens[startIdx];
                if (startToken instanceof Instruction && startToken.label) {
                    return false;
                }
                for (let lookahead = startIdx + 1; lookahead < tokens.length; lookahead++) {
                    const candidate = tokens[lookahead];
                    if (candidate instanceof Directive && candidate.name === 'ORG') {
                        return false;
                    }
                    if (!(candidate instanceof Instruction)) {
                        continue;
                    }
                    if (candidate.label) {
                        return false;
                    }
                    if (this.instructionUsesPriorFlags(candidate)) {
                        return false;
                    }
                    if (this.instructionFullyClobbersFlags(candidate)) {
                        return true;
                    }
                    const mnem = candidate.mnemonic.toLowerCase();
                    if ((mnem === 'ret' || mnem === 'reti' || mnem === 'retn') && candidate.operands.length === 0) {
                        return true;
                    }
                    if ((mnem === 'jp' || mnem === 'jr') && candidate.operands.length === 1) {
                        return true;
                    }
                }
                return false;
            }

            isRegisterDeadBeforeNextUse(tokens, startIdx, regName) {
                const startToken = tokens[startIdx];
                const target = String(regName || '').toLowerCase();
                if (startToken instanceof Instruction && startToken.label) {
                    return false;
                }
                for (let lookahead = startIdx + 1; lookahead < tokens.length; lookahead++) {
                    const candidate = tokens[lookahead];
                    if (candidate instanceof Directive && candidate.name === 'ORG') {
                        return false;
                    }
                    if (!(candidate instanceof Instruction)) {
                        continue;
                    }
                    if (candidate.label) {
                        return false;
                    }
                    if (this.instructionUsesPriorFlags(candidate) && target === 'a') {
                        // A few flag-reading ops also implicitly consume A; stay conservative.
                        return false;
                    }
                    if (this.instructionFullyOverwritesRegister(candidate, target)) {
                        return true;
                    }
                    if (this.instructionTouchesRegister(candidate, target)) {
                        return false;
                    }
                    const mnem = candidate.mnemonic.toLowerCase();
                    if ((mnem === 'ret' || mnem === 'reti' || mnem === 'retn') && candidate.operands.length === 0) {
                        return true;
                    }
                    if ((mnem === 'jp' || mnem === 'jr') && candidate.operands.length === 1) {
                        return true;
                    }
                }
                return false;
            }

            canReplaceLdAZeroWithXor(tokens, startIdx) {
                return this.areFlagsDeadBeforeNextUse(tokens, startIdx);
            }

            eliminateDeadCode(tokens) {
                const reachable = new Set();
                const labels = new Map(); // label → token index
                let startLabelIdx = -1;

                // Find all labels and locate "Start" label (ColecoVision entry point)
                tokens.forEach((token, idx) => {
                    if (token.label) {
                        labels.set(token.label, idx);
                        if (token.label.toLowerCase() === 'start') {
                            startLabelIdx = idx;
                        }
                    }
                });

                // Preserve ColecoVision header (everything before Start label)
                // This includes RST vectors, NMI handler, cartridge header, etc.
                // Calls/jumps from this preserved area must also keep their targets alive:
                // Amy's generated NMI can call user frame hooks that live after Start.
                const headerReferencedLabels = new Set();
                if (startLabelIdx !== -1) {
                    for (let i = 0; i < startLabelIdx; i++) {
                        const token = tokens[i];
                        reachable.add(i);
                        if (!(token instanceof Instruction)) continue;
                        const mnem = token.mnemonic.toLowerCase();
                        if (!['call', 'jp', 'jr'].includes(mnem)) continue;
                        const lastOp = token.operands[token.operands.length - 1];
                        if (lastOp?.type === 'symbol') {
                            headerReferencedLabels.add(lastOp.value);
                        }
                    }
                }

                // Find all labels referenced in DW/DEFW directives (jump tables, data pointers)
                // These are conservatively marked as reachable since they're used indirectly
                const dwReferencedLabels = new Set();
                tokens.forEach(token => {
                    if (token instanceof Directive &&
                        (token.name === 'DW' || token.name === 'DEFW')) {
                        for (const operand of token.operands) {
                            if (operand.type === 'symbol') {
                                dwReferencedLabels.add(operand.value);
                            }
                        }
                    }
                });

                // Mark reachable code starting from Start label
                const entryPoint = startLabelIdx !== -1 ? startLabelIdx : 0;
                this.markReachableFrom(entryPoint, tokens, reachable, labels);

                // Mark all labels referenced by preserved header/NMI code as reachable.
                for (const labelName of headerReferencedLabels) {
                    if (labels.has(labelName)) {
                        this.markReachableFrom(labels.get(labelName), tokens, reachable, labels);
                    }
                }

                // Mark all DW-referenced labels as reachable (jump tables, etc.)
                for (const labelName of dwReferencedLabels) {
                    if (labels.has(labelName)) {
                        this.markReachableFrom(labels.get(labelName), tokens, reachable, labels);
                    }
                }

                if (headerReferencedLabels.size > 0) {
                    optimizerLog('  Preserved ' + headerReferencedLabels.size + ' label(s) referenced by header/NMI code', 'debug');
                }

                if (dwReferencedLabels.size > 0) {
                    optimizerLog(`  Preserved ${dwReferencedLabels.size} label(s) from DW directives (jump tables)`, 'debug');
                }

                // Remove unreachable code (only after Start label)
                const optimized = [];
                let removedCount = 0;
                let bytesSaved = 0;

                tokens.forEach((token, idx) => {
                    if (reachable.has(idx)) {
                        optimized.push(token);
                    } else if (token instanceof Directive) {
                        // Always keep directives (DB, DW, ORG, etc.)
                        optimized.push(token);
                    } else if (token instanceof Instruction) {
                        // Count actual instruction bytes removed
                        const key = this.assembler.getOpcodeKey(token);
                        const opcode = Z80_OPCODES[key];
                        let instrSize = 1; // Default

                        if (opcode) {
                            instrSize = opcode.length;
                            if (key.includes('imm8') || key.includes('rel8') || key.includes('offset')) instrSize++;
                            if (key.includes('imm16')) instrSize += 2;
                        }

                        bytesSaved += instrSize;
                        removedCount++;
                    }
                    // Don't keep unreachable labels - they'll be orphaned
                });

                this.stats.deadCodeRemoved = removedCount;
                this.stats.bytesSaved += bytesSaved;

                if (removedCount > 0) {
                    optimizerLog(`  Dead code elimination: removed ${removedCount} instruction(s), saved ${bytesSaved} bytes`, 'info');
                }

                return optimized;
            }

            markReachableFrom(startIdx, tokens, reachable, labels) {
                if (startIdx >= tokens.length) return;
                if (reachable.has(startIdx)) return; // Already visited

                for (let i = startIdx; i < tokens.length; i++) {
                    if (reachable.has(i)) break; // Already explored this path - prevents infinite loops
                    const token = tokens[i];

                    reachable.add(i);

                    if (token instanceof Instruction) {
                        const mnem = token.mnemonic.toLowerCase();

                        // Track jumps and calls
                        if (['jp', 'jr'].includes(mnem)) {
                            const lastOp = token.operands[token.operands.length - 1];
                            if (lastOp.type === 'symbol' && labels.has(lastOp.value)) {
                                // Recursively mark jump target
                                this.markReachableFrom(labels.get(lastOp.value), tokens, reachable, labels);
                            }

                            // Unconditional jump ends current flow
                            if (token.operands.length === 1) {
                                break;
                            }
                        } else if (mnem === 'call') {
                            // CALL doesn't end flow - it returns!
                            const lastOp = token.operands[token.operands.length - 1];
                            if (lastOp.type === 'symbol' && labels.has(lastOp.value)) {
                                // Recursively mark call target
                                this.markReachableFrom(labels.get(lastOp.value), tokens, reachable, labels);
                            }
                            // Continue to next instruction after CALL
                        } else if (['ret', 'reti', 'retn'].includes(mnem)) {
                            // Return ends sequential flow (unless conditional)
                            if (token.operands.length === 0) {
                                break;
                            }
                        }
                    }
                }
            }


            // Inline routines that are called only once (iterative)
            inlineSingleCallRoutines(tokens) {
                const MAX_PASSES = 10; // Prevent infinite loops
                let currentTokens = tokens;
                let totalInlined = 0;

                for (let pass = 0; pass < MAX_PASSES; pass++) {
                    const result = this.inlinePass(currentTokens);

                    if (result.inlinedCount === 0) {
                        // No more inlining possible
                        break;
                    }

                    currentTokens = result.tokens;
                    totalInlined += result.inlinedCount;
                    this.stats.inlinePasses++;

                    optimizerLog(`  Inline pass ${pass + 1}: inlined ${result.inlinedCount} routine(s)`, 'debug');
                }

                if (totalInlined > 0) {
                    this.stats.routinesInlined = totalInlined;
                    // Each inline saves CALL (3 bytes) + RET (1 byte) = 4 bytes
                    this.stats.bytesSaved += totalInlined * 4;
                    optimizerLog(`  Routine inlining: inlined ${totalInlined} routine(s) in ${this.stats.inlinePasses} pass(es), saved ${totalInlined * 4} bytes`, 'info');
                }

                return currentTokens;
            }

            // Single pass of routine inlining
            inlinePass(tokens) {
                // Step 1: Build label map and find all routines (label followed by code ending in RET)
                const labels = new Map(); // label name → token index
                const routines = new Map(); // label name → { startIdx, endIdx, tokens[], isLeaf, size }

                tokens.forEach((token, idx) => {
                    if (token.label) {
                        labels.set(token.label, idx);
                    }
                });

                // Step 2: Identify routines (sequences ending in RET/RETI/RETN)
                for (const [labelName, startIdx] of labels) {
                    // Skip labels in ROM header area ($8000-$8030)
                    const labelAddr = this.symbolTable[labelName];
                    if (labelAddr !== undefined && labelAddr >= 0x8000 && labelAddr <= 0x8030) {
                        continue;
                    }

                    // Find the end of this routine (next RET, RETI, RETN, or unconditional JP)
                    let endIdx = -1;
                    let isLeaf = true;
                    let hasConditionalRet = false;
                    const routineTokens = [];

                    for (let i = startIdx; i < tokens.length; i++) {
                        const token = tokens[i];

                        // Stop if we hit another label (except on the first token)
                        if (i > startIdx && token.label) {
                            break;
                        }

                        routineTokens.push(token);

                        if (token instanceof Instruction) {
                            const mnem = token.mnemonic.toLowerCase();

                            // Check if routine calls other routines (not a leaf)
                            if (mnem === 'call') {
                                isLeaf = false;
                            }

                            // Check for conditional returns (makes inlining complex)
                            if (['ret', 'reti', 'retn'].includes(mnem) && token.operands.length > 0) {
                                hasConditionalRet = true;
                            }

                            // Found end of routine
                            if (['ret', 'reti', 'retn'].includes(mnem) && token.operands.length === 0) {
                                endIdx = i;
                                break;
                            }

                            // Unconditional JP also ends a routine (tail call)
                            if (mnem === 'jp' && token.operands.length === 1) {
                                // This is a tail-jump, not a returnable routine
                                break;
                            }
                        }
                    }

                    // Only consider valid routines that end with unconditional RET
                    if (endIdx !== -1 && !hasConditionalRet && routineTokens.length > 0) {
                        routines.set(labelName, {
                            startIdx,
                            endIdx,
                            tokens: routineTokens,
                            isLeaf,
                            size: routineTokens.length
                        });
                    }
                }

                // Step 3: Count CALL references to each routine
                const callCounts = new Map(); // label name → count
                const callSites = new Map(); // label name → [token indices of CALL instructions]

                tokens.forEach((token, idx) => {
                    if (token instanceof Instruction && token.mnemonic.toLowerCase() === 'call') {
                        // Only unconditional calls for now
                        if (token.operands.length === 1) {
                            const target = token.operands[0];
                            if (target.type === 'symbol') {
                                const name = target.value;
                                callCounts.set(name, (callCounts.get(name) || 0) + 1);
                                if (!callSites.has(name)) {
                                    callSites.set(name, []);
                                }
                                callSites.get(name).push(idx);
                            }
                        }
                    }
                });

                // Step 4: Find leaf routines called exactly once
                const inlineCandidates = [];

                for (const [labelName, routine] of routines) {
                    const count = callCounts.get(labelName) || 0;

                    // Only inline if:
                    // - Called exactly once
                    // - Is a leaf routine (doesn't call other routines) OR we're doing iterative passes
                    // - Not too large (arbitrary limit to prevent code bloat)
                    if (count === 1 && routine.size <= 20) {
                        // Check that routine is not referenced by JP (only CALL)
                        let hasJpRef = false;
                        tokens.forEach(token => {
                            if (token instanceof Instruction &&
                                ['jp', 'jr'].includes(token.mnemonic.toLowerCase())) {
                                const target = token.operands[token.operands.length - 1];
                                if (target.type === 'symbol' && target.value === labelName) {
                                    hasJpRef = true;
                                }
                            }
                        });

                        if (!hasJpRef && this.isSafeInlineRoutine(labelName, routine)) {
                            inlineCandidates.push({
                                labelName,
                                routine,
                                callSiteIdx: callSites.get(labelName)[0]
                            });
                        }
                    }
                }

                if (inlineCandidates.length === 0) {
                    return { tokens, inlinedCount: 0 };
                }

                // Step 5: Perform inlining (process in reverse order to maintain indices)
                // Sort by call site index descending so we don't invalidate indices
                inlineCandidates.sort((a, b) => b.callSiteIdx - a.callSiteIdx);

                let newTokens = [...tokens];
                let inlinedCount = 0;

                for (const candidate of inlineCandidates) {
                    const { labelName, routine, callSiteIdx } = candidate;

                    // Get the routine body (without the label on first token, without final RET)
                    const bodyTokens = routine.tokens.slice(0, -1).map(t => {
                        // Clone token without the label (label stays at original location for now)
                        if (t.label === labelName) {
                            // Clone without label
                            if (t instanceof Instruction) {
                                return new Instruction(null, t.mnemonic, [...t.operands], t.lineNumber);
                            } else if (t instanceof Directive) {
                                return new Directive(null, t.name, [...t.operands], t.lineNumber);
                            }
                        }
                        return t;
                    });

                    // Replace CALL with routine body
                    // The CALL instruction is at callSiteIdx
                    newTokens.splice(callSiteIdx, 1, ...bodyTokens);

                    // Mark original routine for removal by adding a special marker
                    // We'll remove it in a cleanup pass
                    // For now, just mark the routine's label with a prefix
                    const routineStart = routine.startIdx;
                    if (newTokens[routineStart] && newTokens[routineStart].label === labelName) {
                        // Add comment to mark as inlined (will be removed by dead code elimination)
                        // Actually, let's just leave it - dead code elimination will remove it
                    }

                    inlinedCount++;
                    optimizerLog(`    Inlined routine '${labelName}' (${routine.size} tokens) at call site`, 'debug');
                }

                return { tokens: newTokens, inlinedCount };
            }

            // NEW: Simple RST optimization - just replace CALL with RST, header patching is post-compilation
            optimizeRstVectors(tokens) {
                // Step 1: Scan for CALL instructions to BIOS addresses ($0000-$1FFF)
                const callFrequency = new Map(); // address → count

                for (let idx = 0; idx < tokens.length; idx++) {
                    const token = tokens[idx];
                    if (token instanceof Instruction && token.mnemonic.toLowerCase() === 'call') {
                        const target = token.operands[0];
                        if (target.type === 'immediate' && target.value >= 0x0000 && target.value <= 0x1FFF) {
                            const addr = target.value;
                            callFrequency.set(addr, (callFrequency.get(addr) || 0) + 1);
                        }
                    }
                }

                // Step 2: Find top 3 most-called BIOS routines (we have 6 RST slots but reserve $38)
                const topCalls = Array.from(callFrequency.entries())
                    .filter(([addr, count]) => count >= 2) // Need at least 2 calls to be worth it
                    .sort((a, b) => b[1] - a[1]) // Sort by frequency (highest first)
                    .slice(0, 3); // Take top 3

                if (topCalls.length === 0) {
                    optimizerLog('  RST optimization skipped: No frequently-called BIOS routines found', 'debug');
                    return tokens;
                }

                // Step 3: Assign RST vectors to top routines
                const rstVectors = [0x08, 0x10, 0x18]; // Use first 3 available vectors
                const rstMap = new Map(); // BIOS address → RST code

                topCalls.forEach(([addr, count], idx) => {
                    rstMap.set(addr, rstVectors[idx]);
                    optimizerLog(`  RST $${rstVectors[idx].toString(16).toUpperCase()}: CALL $${addr.toString(16).toUpperCase()} (${count} uses, saves ${count * 2} bytes)`, 'info');
                });

                // Store RST mapping for post-compilation header patching
                this.rstMapping = rstMap; // Will be used by patchRomHeader()

                // Step 4: Replace CALL with RST in token array
                const optimized = [];
                let replacedCount = 0;

                for (let idx = 0; idx < tokens.length; idx++) {
                    const token = tokens[idx];
                    if (token instanceof Instruction && token.mnemonic.toLowerCase() === 'call') {
                        const target = token.operands[0];
                        if (target.type === 'immediate' && rstMap.has(target.value)) {
                            // Replace CALL with RST
                            const rstCode = rstMap.get(target.value);
                            const rstInstr = new Instruction(
                                token.label,
                                'rst',
                                [new Operand('immediate', rstCode)],
                                token.lineNumber
                            );
                            optimized.push(rstInstr);
                            replacedCount++;
                            this.stats.rstOptimized++;
                            this.stats.bytesSaved += 2; // CALL (3 bytes) → RST (1 byte)
                        } else {
                            optimized.push(token);
                        }
                    } else {
                        optimized.push(token);
                    }
                }

                optimizerLog(`  RST optimization: ${rstMap.size} vector(s) assigned, ${replacedCount} CALL(s) replaced with RST`, 'success');
                this.stats.rstVectorsUsed = rstMap.size;
                return optimized;
            }

            resolve8BitImmediate(operand) {
                if (!operand) return null;
                if (operand.type === 'immediate' &&
                    typeof operand.value === 'number' &&
                    operand.value >= 0 &&
                    operand.value <= 0xFF) {
                    return operand.value;
                }
                if (operand.type === 'symbol') {
                    try {
                        const value = this.assembler.evaluateExpression(operand);
                        if (typeof value === 'number' && value >= 0 && value <= 0xFF) {
                            return value;
                        }
                    } catch (e) {
                        return null;
                    }
                }
                return null;
            }

            optimizeInstructions(tokens) {
                const optimized = [];
                let pc = this.assembler.firstOrg || 0;
                const newSymbolTable = {};

                // DEBUG: Log initial PC
                optimizerLog(`  Optimizer starting PC: 0x${pc.toString(16)} (firstOrg: ${this.assembler.firstOrg ? '0x' + this.assembler.firstOrg.toString(16) : 'null'})`, 'debug');

                for (let idx = 0; idx < tokens.length; idx++) {
                    const token = tokens[idx];
                    // Handle ORG directives to update PC
                    if (token instanceof Directive && token.name === 'ORG') {
                        pc = this.assembler.evaluateExpression(token.operands[0]);
                        optimized.push(token);
                        if (token.label) { newSymbolTable[token.label] = pc; }
                        continue;
                    }

                    if (!(token instanceof Instruction)) {
                        optimized.push(token);
                        if (token.label) {
                            if (token instanceof Directive &&
                                (token.name === 'EQU' || token.name === 'DEFL' || token.name === 'SET')) {
                                // EQU defines an absolute value — store the value, not the current PC
                                const equVal = token.operands.length > 0
                                    ? this.assembler.evaluateExpression(token.operands[0])
                                    : undefined;
                                newSymbolTable[token.label] = equVal !== undefined ? equVal : pc;
                            } else {
                                newSymbolTable[token.label] = pc;
                            }
                        }

                        // Update PC for directives that emit data
                        if (token instanceof Directive) {
                            if (token.name === 'DB' || token.name === 'DEFB' || token.name === 'BYTE') {
                                // Count bytes: strings count their length, everything else is 1 byte each
                                for (const op of token.operands) {
                                    if (op.type === 'string') {
                                        pc += op.value.length;
                                    } else {
                                        pc += 1;
                                    }
                                }
                            } else if (token.name === 'DW' || token.name === 'DEFW' || token.name === 'WORD') {
                                pc += token.operands.length * 2;
                            } else if (token.name === 'DS' || token.name === 'DEFS' || token.name === 'BLOCK') {
                                const size = this.assembler.evaluateExpression(token.operands[0]);
                                pc += size;
                            } else if (token.name === 'DEFM' || token.name === 'ASCII' || token.name === 'TEXT') {
                                for (const op of token.operands) {
                                    if (op.type === 'string') {
                                        pc += op.value.length;
                                    } else {
                                        pc += 1;
                                    }
                                }
                            } else if (token.name === 'INCBIN') {
                                // INCBIN size is complex - use stored value if available
                                if (token.incbinSize !== undefined) {
                                    pc += token.incbinSize;
                                }
                            }
                        }
                        continue;
                    }

                    const mnem = token.mnemonic.toLowerCase();

                    // Optimization 1: JP → JR (part of peephole optimizations)
                    // Safe here because phase 2 rebuilds the symbol table iteratively until
                    // address shifts stabilize, and the relaxer below can expand back to long
                    // form when a branch falls out of range.
                    if (this.config.peephole && this.config.branchShortening && mnem === 'jp' && token.operands.length > 0) {
                        const lastOp = token.operands[token.operands.length - 1];
                        const targetLabel = lastOp.type === 'symbol'
                            ? lastOp.value
                            : (lastOp.value !== null && lastOp.value !== undefined ? `$${lastOp.value.toString(16)}` : '?');

                        // Only optimize direct jumps (not JP (HL), JP (IX), etc.)
                        if (lastOp.type === 'symbol' || lastOp.type === 'immediate') {
                            // Check if this is a conditional jump we can convert
                            // JR only supports: Z, NZ, C, NC (NOT: PE, PO, P, M)
                            let canConvert = true;
                            let rejectReason = '';
                            if (token.operands.length === 2) {
                                // Conditional jump - check if condition is supported by JR
                                const condition = token.operands[0].value.toLowerCase();
                                const validConditions = ['z', 'nz', 'c', 'nc'];
                                if (!validConditions.includes(condition)) {
                                    canConvert = false;
                                    rejectReason = `unsupported condition '${condition}'`;
                                }
                            }

                            if (canConvert) {
                                // CRITICAL: Never optimize JP in ColecoVision ROM header + NMI region ($8000-$8023)
                                // Header ($8000-$8020): Fixed 3-byte RST vector slots
                                // NMI ($8021-$8023): 3-byte NMI handler (must stay 3 bytes)
                                // Title ($8024+): Cartridge title - converting JP→JR here would shift title data
                                if (pc >= 0x8000 && pc <= 0x8023) {
                                    // Skip optimization in header + NMI region
                                    optimizerLog(`  [JP→JR] Line ${token.lineNumber}: JP ${targetLabel} at $${pc.toString(16)} - SKIP (in ROM header region)`, 'debug');
                                } else {
                                    // Use NEW symbol table if target has been processed, otherwise use old
                                    const targetAddr = lastOp.type === 'symbol' && newSymbolTable[lastOp.value] !== undefined
                                        ? newSymbolTable[lastOp.value]
                                        : this.resolveAddress(lastOp);

                                    // Calculate offset for JR (relative to PC after JR instruction)
                                    const pcAfterJr = pc + 2; // JR is 2 bytes
                                    const offset = (targetAddr !== null && targetAddr !== undefined)
                                        ? targetAddr - pcAfterJr
                                        : null;

                                    // Use size 2 (JR size) for range check
                                    if (targetAddr !== null && targetAddr !== undefined && this.canUseRelativeJump(pc, targetAddr, 2)) {
                                        // Convert JP to JR
                                        const jrToken = new Instruction(
                                            token.label,
                                            'jr',
                                            token.operands,
                                            token.lineNumber
                                        );
                                        optimized.push(jrToken);
                                        this.stats.jpToJr++;
                                        this.stats.bytesSaved++;
                                        optimizerLog(`  [JP→JR] Line ${token.lineNumber}: JP ${targetLabel} → JR (PC=$${pc.toString(16)}, target=$${targetAddr.toString(16)}, offset=${offset}) ✓`, 'debug');
                                        pc += 2; // JR is 2 bytes (saves 1 byte)
                                        continue;
                                    } else {
                                        optimizerLog(`  [JP→JR] Line ${token.lineNumber}: JP ${targetLabel} at $${pc.toString(16)} - OUT OF RANGE (target=$${targetAddr !== null && targetAddr !== undefined ? targetAddr.toString(16) : '?'}, offset=${offset !== null ? offset : '?'}, need -126 to +129)`, 'debug');
                                    }
                                }
                            } else {
                                optimizerLog(`  [JP→JR] Line ${token.lineNumber}: JP ${targetLabel} - SKIP (${rejectReason})`, 'debug');
                            }
                        } else {
                            optimizerLog(`  [JP→JR] Line ${token.lineNumber}: JP indirect - SKIP (operand type: ${lastOp.type})`, 'debug');
                        }
                    }

                    // Relaxation 1: DJNZ → DEC B + JP NZ (when target is out of JR range)
                    if (this.config.peephole && mnem === 'djnz' && token.operands.length === 1) {
                        const targetOp = token.operands[0];
                        if (targetOp.type === 'symbol' || targetOp.type === 'immediate') {
                            const targetAddr = targetOp.type === 'symbol' && newSymbolTable[targetOp.value] !== undefined
                                ? newSymbolTable[targetOp.value]
                                : this.resolveAddress(targetOp);
                            if (targetAddr !== undefined && !this.canUseRelativeJump(pc, targetAddr, 2)) {
                                const pcAfter = pc + 2;
                                const offset = targetAddr - pcAfter;
                                // Emit DEC B (1 byte) + JP NZ target (3 bytes)
                                const decB = new Instruction(token.label, 'dec', [new Operand('register', 'b')], token.lineNumber);
                                const jpNz = new Instruction(null, 'jp', [new Operand('condition', 'nz'), targetOp], token.lineNumber);
                                optimized.push(decB);
                                optimized.push(jpNz);
                                if (token.label) { newSymbolTable[token.label] = pc; }
                                this.stats.djnzExpanded++;
                                // Net +1 byte vs DJNZ (was 2, now 4)
                                pc += 4;
                                optimizerLog(`  [DJNZ→DEC+JP] Line ${token.lineNumber}: DJNZ ${typeof targetOp.value === 'string' ? targetOp.value : (targetOp.value !== null && targetOp.value !== undefined ? '$' + targetOp.value.toString(16) : '?')} expanded (PC=$${(pc-4).toString(16)}, target=$${targetAddr !== null && targetAddr !== undefined ? targetAddr.toString(16) : '?'}, offset=${offset})`, 'debug');
                                continue;
                            }
                        }
                    }

                    // Relaxation 2: JR → JP (when target is out of JR range)
                    if (this.config.peephole && mnem === 'jr' && token.operands.length >= 1) {
                        const lastOp = token.operands[token.operands.length - 1];
                        if (lastOp.type === 'symbol' || lastOp.type === 'immediate') {
                            const targetAddr = lastOp.type === 'symbol' && newSymbolTable[lastOp.value] !== undefined
                                ? newSymbolTable[lastOp.value]
                                : this.resolveAddress(lastOp);
                            if (targetAddr !== undefined && !this.canUseRelativeJump(pc, targetAddr, 2)) {
                                const pcAfter = pc + 2;
                                const offset = targetAddr - pcAfter;
                                const jpToken = new Instruction(token.label, 'jp', token.operands, token.lineNumber);
                                optimized.push(jpToken);
                                if (token.label) { newSymbolTable[token.label] = pc; }
                                this.stats.jrExpanded++;
                                // Net +1 byte vs JR (was 2, now 3)
                                pc += 3;
                                const targetLabel = typeof lastOp.value === 'string'
                                    ? lastOp.value
                                    : (lastOp.value !== null && lastOp.value !== undefined
                                        ? '$' + lastOp.value.toString(16)
                                        : '?');
                                optimizerLog(`  [JR→JP] Line ${token.lineNumber}: JR ${targetLabel} expanded (PC=$${(pc-3).toString(16)}, target=$${targetAddr !== null && targetAddr !== undefined ? targetAddr.toString(16) : '?'}, offset=${offset})`, 'debug');
                                continue;
                            }
                        }
                    }

                    // Optimization 2: LD A,0 → XOR A (part of peephole optimizations)
                    if (this.config.peephole && this.config.aZeroToXor && mnem === 'ld' && token.operands.length === 2) {
                        const dest = token.operands[0];
                        const src = token.operands[1];

                        if (dest.type === 'register' &&
                            dest.value.toLowerCase() === 'a' &&
                            src.type === 'immediate' &&
                            src.value === 0) {
                            if (!this.canReplaceLdAZeroWithXor(tokens, idx)) {
                                optimized.push(token);
                                if (token.label) { newSymbolTable[token.label] = pc; }
                                pc += 2;
                                continue;
                            }

                            // Replace with XOR A
                            const newToken = new Instruction(
                                token.label,
                                'xor',
                                [new Operand('register', 'a')],
                                token.lineNumber
                            );
                            optimized.push(newToken);
                            if (token.label) { newSymbolTable[token.label] = pc; }
                            this.stats.ldToXor++;
                            this.stats.bytesSaved++; // XOR A is 1 byte vs LD A,0 is 2 bytes
                            pc += 1; // XOR A
                            continue;
                        }
                    }

                    // Deliberately avoid rebuilding DEC B + JP NZ back into DJNZ here.
                    // The relaxer above can expand out-of-range DJNZ into DEC+JP, but
                    // recreating DJNZ during iterative address optimization makes branch
                    // reach unstable near the ±128 boundary and can reintroduce pass-3
                    // failures after later size shifts. Keeping the long form is safer.

                    // No optimization applied, keep original
                    optimized.push(token);
                    if (token.label) { newSymbolTable[token.label] = pc; }

                    // Update PC for next instruction
                    const key = this.assembler.getOpcodeKey(token);
                    const opcode = Z80_OPCODES[key];
                    if (opcode) {
                        let size = opcode.length;
                        // Add operand sizes
                        if (key.includes('imm8') || key.includes('rel8')) size++;
                        if (key.includes('imm16')) size += 2;
                        pc += size;
                    } else {
                        pc += 1; // Conservative estimate
                    }
                }

                this.symbolTable = newSymbolTable;
                return optimized;
            }
            canUseRelativeJump(currentPC, targetAddr, instrSize) {
                // JR displacement is a signed 8-bit value added to PC after the instruction.
                // Valid encoding range: exactly -128..+127.
                // Offsets +128/+129 would wrap to -128/-127 in the byte — wrong target.
                const pcAfter = currentPC + instrSize;
                const offset = targetAddr - pcAfter;
                return offset >= -128 && offset <= 127;
            }

            resolveAddress(operand) {
                if (operand.type === 'immediate') {
                    return operand.value;
                } else if (operand.type === 'symbol' || operand.type === 'label') {
                    const addr = this.symbolTable[operand.value];
                    if (addr !== undefined) {
                        return addr;
                    }
                }
                return null;
            }

            mergeCalledRoutines(tokens) {
                // Find patterns where a CALL is immediately followed by RET
                // and the called routine is only called from this one location
                // We can inline the routine and eliminate the CALL/RET overhead

                // Step 1: Analyze all CALL instructions and their targets
                const callMap = new Map(); // target label → array of call indices
                const labels = new Map(); // label → token index

                tokens.forEach((token, idx) => {
                    if (token.label) {
                        labels.set(token.label, idx);
                    }
                    if (token instanceof Instruction && token.mnemonic.toLowerCase() === 'call') {
                        const target = token.operands[0];
                        if (target.type === 'symbol' || target.type === 'label') {
                            if (!callMap.has(target.value)) {
                                callMap.set(target.value, []);
                            }
                            callMap.set(target.value, [...callMap.get(target.value), idx]);
                        }
                    }
                });

                // Step 2: Find routines that are only called once
                const optimized = [];
                const inlinedRoutines = new Set();

                for (let i = 0; i < tokens.length; i++) {
                    const token = tokens[i];

                    // Check if this is a CALL instruction
                    if (token instanceof Instruction && token.mnemonic.toLowerCase() === 'call') {
                        const target = token.operands[0];
                        if (target.type === 'symbol' || target.type === 'label') {
                            const targetLabel = target.value;
                            const callCount = callMap.get(targetLabel) || [];

                            // Only optimize if called exactly once
                            if (callCount.length === 1 && labels.has(targetLabel)) {
                                const routineStartIdx = labels.get(targetLabel);

                                // Extract routine instructions until RET
                                const routineInstructions = [];
                                let routineEndIdx = routineStartIdx;
                                let foundRet = false;

                                for (let j = routineStartIdx; j < tokens.length; j++) {
                                    const routineToken = tokens[j];

                                    // Skip the label itself
                                    if (j === routineStartIdx && routineToken.label) {
                                        continue;
                                    }

                                    // Stop at next label (new routine)
                                    if (j > routineStartIdx && routineToken.label) {
                                        break;
                                    }

                                    if (routineToken instanceof Instruction) {
                                        const mnem = routineToken.mnemonic.toLowerCase();

                                        if (mnem === 'ret' || mnem === 'reti' || mnem === 'retn') {
                                            foundRet = true;
                                            routineEndIdx = j;
                                            break;
                                        }

                                        routineInstructions.push(routineToken);
                                    }
                                }

                                // Inline if we found a simple routine with RET
                                if (foundRet && routineInstructions.length > 0 && routineInstructions.length <= 10) {
                                    // Check that routine doesn't contain jumps/calls to itself (recursive)
                                    const hasRecursion = routineInstructions.some(instr => {
                                        if (['call', 'jp', 'jr'].includes(instr.mnemonic.toLowerCase())) {
                                            const op = instr.operands[instr.operands.length - 1];
                                            return op.value === targetLabel;
                                        }
                                        return false;
                                    });

                                    if (!hasRecursion) {
                                        // Inline the routine instructions
                                        optimizerLog(`  Inlining routine '${targetLabel}' (${routineInstructions.length} instructions)`, 'debug');

                                        for (const instr of routineInstructions) {
                                            optimized.push(new Instruction(null, instr.mnemonic, instr.operands, instr.lineNumber));
                                        }

                                        inlinedRoutines.add(targetLabel);
                                        this.stats.callMerge++;
                                        // Save 3 bytes for CALL + 1 byte for RET
                                        this.stats.bytesSaved += 4;
                                        continue; // Skip the original CALL
                                    }
                                }
                            }
                        }
                    }

                    // Keep token if not a routine that was inlined
                    if (token.label && inlinedRoutines.has(token.label)) {
                        // Skip the routine label and its instructions
                        let j = i + 1;
                        while (j < tokens.length) {
                            const nextToken = tokens[j];
                            if (nextToken.label) break; // Next routine
                            if (nextToken instanceof Instruction) {
                                const mnem = nextToken.mnemonic.toLowerCase();
                                if (mnem === 'ret' || mnem === 'reti' || mnem === 'retn') {
                                    i = j; // Skip to after RET
                                    break;
                                }
                            }
                            j++;
                        }
                    } else {
                        optimized.push(token);
                    }
                }

                return optimized;
            }

            peepholeOptimize(tokens) {
                const optimized = [];
                const SHORT_LOCAL_REUSE_WINDOW = 5;
                const SHORT_PUSH_POP_WINDOW = 12;
                const labeledPlainRetStubs = new Set();
                for (let s = 0; s < tokens.length; s++) {
                    const token = tokens[s];
                    if (token instanceof Instruction &&
                        token.label &&
                        token.mnemonic.toLowerCase() === 'ret' &&
                        token.operands.length === 0) {
                        labeledPlainRetStubs.add(token.label);
                        continue;
                    }
                    if (token instanceof Directive &&
                        token.name === 'LABEL' &&
                        token.label &&
                        s + 1 < tokens.length) {
                        const nextToken = tokens[s + 1];
                        if (nextToken instanceof Instruction &&
                            nextToken.mnemonic.toLowerCase() === 'ret' &&
                            nextToken.operands.length === 0) {
                            labeledPlainRetStubs.add(token.label);
                        }
                    }
                }
                const isSameHlReload = (instA, instB) => {
                    if (!(instA instanceof Instruction) || !(instB instanceof Instruction)) return false;
                    if (instA.mnemonic.toLowerCase() !== 'ld' || instB.mnemonic.toLowerCase() !== 'ld') return false;
                    if (instA.operands.length !== 2 || instB.operands.length !== 2) return false;
                    if (instA.operands[0].type !== 'register_pair' || instB.operands[0].type !== 'register_pair') return false;
                    if (instA.operands[0].value.toLowerCase() !== 'hl' || instB.operands[0].value.toLowerCase() !== 'hl') return false;
                    const srcA = instA.operands[1];
                    const srcB = instB.operands[1];
                    if (srcA.type !== srcB.type) return false;
                    return srcA.value === srcB.value;
                };
                const usesHlMemoryWithoutChangingHl = (inst) => {
                    if (!(inst instanceof Instruction)) return false;
                    const ops = inst.operands || [];
                    const hasHlMem = ops.some(op => op.type === 'memory' && String(op.value).toLowerCase() === 'hl');
                    if (!hasHlMem) return false;
                    const m = inst.mnemonic.toLowerCase();
                    if (m === 'inc' || m === 'dec') {
                        return ops.length === 1 && ops[0].type === 'memory' && String(ops[0].value).toLowerCase() === 'hl';
                    }
                    if (m === 'ld') {
                        const dest = ops[0];
                        return !(dest.type === 'register_pair' && dest.value.toLowerCase() === 'hl') &&
                            !(dest.type === 'register' && ['h', 'l'].includes(dest.value.toLowerCase()));
                    }
                    if (['add', 'adc', 'sub', 'sbc', 'and', 'or', 'xor', 'cp', 'bit', 'res', 'set', 'sla', 'sra', 'srl', 'sll', 'rl', 'rr', 'rlc', 'rrc'].includes(m)) {
                        return true;
                    }
                    return false;
                };
                const instructionTouchesRegister = (inst, regName) => {
                    if (!(inst instanceof Instruction)) return false;
                    const target = String(regName || '').toLowerCase();
                    const aliasMembers = {
                        af: new Set(['af', 'a']),
                        bc: new Set(['bc', 'b', 'c']),
                        de: new Set(['de', 'd', 'e']),
                        hl: new Set(['hl', 'h', 'l']),
                        ix: new Set(['ix', 'ixh', 'ixl']),
                        iy: new Set(['iy', 'iyh', 'iyl']),
                        sp: new Set(['sp'])
                    };
                    const members = aliasMembers[target] || new Set([target]);
                    for (const op of inst.operands || []) {
                        if (op.type === 'register' || op.type === 'register_pair') {
                            const v = String(op.value).toLowerCase();
                            if (members.has(v)) return true;
                        } else if (op.type === 'memory' && typeof op.value === 'string') {
                            const v = String(op.value).toLowerCase().replace(/\s+/g, '');
                            if (members.has(v)) return true;
                            const indexedBase = v.match(/^(ix|iy|sp)(?:[+\-].+)?$/);
                            if (indexedBase && members.has(indexedBase[1])) return true;
                        }
                    }
                    return false;
                };
                const instructionTouchesMemorySymbol = (inst, symbolName) => {
                    if (!(inst instanceof Instruction) || typeof symbolName !== 'string') return false;
                    const target = symbolName.toLowerCase();
                    for (const op of inst.operands || []) {
                        if (op.type === 'memory' && typeof op.value === 'string') {
                            if (String(op.value).toLowerCase() === target) return true;
                        }
                    }
                    return false;
                };
                const instructionCanClobberRegister = (inst, regName) => {
                    if (!(inst instanceof Instruction)) return false;
                    const m = inst.mnemonic.toLowerCase();
                    if (['call', 'rst', 'inir', 'indr', 'otir', 'otdr', 'ldi', 'ldir', 'ldd', 'lddr', 'ini', 'ind', 'outi', 'outd'].includes(m)) {
                        return true;
                    }
                    return instructionTouchesRegister(inst, regName);
                };
                const instructionMayInvalidateTrackedRegister = (inst, regName) => {
                    if (!(inst instanceof Instruction)) return false;
                    if (inst.label) return true;
                    return instructionCanClobberRegister(inst, regName);
                };
                const instructionSafeBetweenPushPop = (inst, savedPair) => {
                    if (!(inst instanceof Instruction) || inst.label) return false;
                    const m = inst.mnemonic.toLowerCase();
                    if (['call', 'rst', 'ret', 'reti', 'retn', 'jp', 'jr', 'djnz', 'halt', 'push', 'pop', 'ex', 'exx'].includes(m)) {
                        return false;
                    }
                    return !instructionCanClobberRegister(inst, savedPair);
                };
                const isUnconditionalFlowStop = (inst) => {
                    if (!(inst instanceof Instruction)) return false;
                    const m = inst.mnemonic.toLowerCase();
                    if (['ret', 'reti', 'retn'].includes(m) && inst.operands.length === 0) return true;
                    if ((m === 'jp' || m === 'jr') && inst.operands.length === 1) return true;
                    return false;
                };
                const isLocalAnalysisBarrier = (inst) => {
                    if (!(inst instanceof Instruction)) return false;
                    const m = inst.mnemonic.toLowerCase();
                    return ['call', 'rst', 'ret', 'reti', 'retn', 'jp', 'jr', 'djnz', 'halt'].includes(m);
                };
                const getBranchConditionName = (inst) => {
                    if (!(inst instanceof Instruction)) return null;
                    const m = inst.mnemonic.toLowerCase();
                    if (!['jr', 'jp', 'call', 'ret'].includes(m)) return null;
                    if (!inst.operands || inst.operands.length === 0) return null;
                    const op = inst.operands[0];
                    if (!op || !['condition', 'register'].includes(op.type)) return null;
                    const cond = String(op.value || '').toLowerCase();
                    return ['z', 'nz', 'c', 'nc', 'po', 'pe', 'p', 'm'].includes(cond) ? cond : null;
                };
                const isOverwrittenBeforeAnyReadInBlock = (tokens, startIdx, regName) => {
                    const startToken = tokens[startIdx];
                    const target = String(regName || '').toLowerCase();
                    if (startToken instanceof Instruction && startToken.label) {
                        return false;
                    }
                    for (let lookahead = startIdx + 1; lookahead < tokens.length; lookahead++) {
                        const candidate = tokens[lookahead];
                        if (candidate instanceof Directive && candidate.name === 'ORG') {
                            return false;
                        }
                        if (!(candidate instanceof Instruction)) {
                            continue;
                        }
                        if (candidate.label) {
                            return false;
                        }
                        if (isLocalAnalysisBarrier(candidate)) {
                            return false;
                        }
                        if (this.instructionFullyOverwritesRegister(candidate, target)) {
                            return true;
                        }
                        if (this.instructionTouchesRegister(candidate, target)) {
                            return false;
                        }
                    }
                    return false;
                };
                const isDeadOrClobberedBeforeAnyReadInBlock = (tokens, startIdx, regName) => {
                    const startToken = tokens[startIdx];
                    const target = String(regName || '').toLowerCase();
                    if (startToken instanceof Instruction && startToken.label) {
                        return false;
                    }
                    for (let lookahead = startIdx + 1; lookahead < tokens.length; lookahead++) {
                        const candidate = tokens[lookahead];
                        if (candidate instanceof Directive && candidate.name === 'ORG') {
                            return false;
                        }
                        if (!(candidate instanceof Instruction)) {
                            continue;
                        }
                        if (candidate.label) {
                            return false;
                        }
                        const candidateMnem = candidate.mnemonic.toLowerCase();
                        if (['call', 'rst'].includes(candidateMnem)) {
                            return true;
                        }
                        if (this.instructionFullyOverwritesRegister(candidate, target)) {
                            return true;
                        }
                        if (this.instructionTouchesRegister(candidate, target)) {
                            return false;
                        }
                        if ((candidateMnem === 'ret' || candidateMnem === 'reti' || candidateMnem === 'retn') && candidate.operands.length === 0) {
                            return true;
                        }
                        if ((candidateMnem === 'jp' || candidateMnem === 'jr') && candidate.operands.length === 1) {
                            return true;
                        }
                        if (['djnz', 'halt'].includes(candidateMnem)) {
                            return false;
                        }
                    }
                    return false;
                };
                const getInstructionSize = (inst) => {
                    if (!(inst instanceof Instruction)) return 0;
                    const key = this.assembler.getOpcodeKey(inst);
                    const opcode = Z80_OPCODES[key];
                    let instrSize = 1;
                    if (opcode) {
                        instrSize = opcode.length;
                        if (key.includes('imm8') || key.includes('rel8') || key.includes('offset')) instrSize++;
                        if (key.includes('imm16')) instrSize += 2;
                    }
                    return instrSize;
                };
                const isLdRegImm = (inst, regName) =>
                    inst instanceof Instruction &&
                    inst.mnemonic.toLowerCase() === 'ld' &&
                    inst.operands.length === 2 &&
                    inst.operands[0].type === 'register' &&
                    String(inst.operands[0].value).toLowerCase() === regName &&
                    inst.operands[1].type === 'immediate';
                const isLdMemA = (inst, symbolName = null) =>
                    inst instanceof Instruction &&
                    inst.mnemonic.toLowerCase() === 'ld' &&
                    inst.operands.length === 2 &&
                    inst.operands[0].type === 'memory' &&
                    (symbolName === null || String(inst.operands[0].value).toLowerCase() === String(symbolName).toLowerCase()) &&
                    inst.operands[1].type === 'register' &&
                    String(inst.operands[1].value).toLowerCase() === 'a';
                const isLdAFromMem = (inst, symbolName = null) =>
                    inst instanceof Instruction &&
                    inst.mnemonic.toLowerCase() === 'ld' &&
                    inst.operands.length === 2 &&
                    inst.operands[0].type === 'register' &&
                    String(inst.operands[0].value).toLowerCase() === 'a' &&
                    inst.operands[1].type === 'memory' &&
                    (symbolName === null || String(inst.operands[1].value).toLowerCase() === String(symbolName).toLowerCase());
                const parseSymbolOffset = (value) => {
                    if (typeof value !== 'string') return null;
                    const compact = String(value).replace(/\s+/g, '');
                    const direct = compact.match(/^(.+)\+([0-9]+)$/);
                    if (direct) {
                        return { base: direct[1], offset: Number.parseInt(direct[2], 10) };
                    }
                    return { base: compact, offset: 0 };
                };
                const parseIndexedDisplacement = (value) => {
                    if (typeof value !== 'string') return null;
                    const compact = String(value).replace(/\s+/g, '').toLowerCase();
                    // Memory operand values are stored WITHOUT outer parens ("ix-2"),
                    // but accept parenthesised form too for safety.
                    const match = compact.match(/^\(?(ix|iy)([+\-]\d+)\)?$/);
                    if (!match) return null;
                    return { base: match[1], offset: Number.parseInt(match[2], 10) };
                };
                const memorySupportsImmediateByteStore = (value) => {
                    if (typeof value !== 'string') return false;
                    const compact = String(value).replace(/\s+/g, '').toLowerCase();
                    return compact === 'hl' || /^\(?(ix|iy)[+\-]\d+\)?$/.test(compact);
                };
                // Returns true if instruction writes to (base+offset), e.g. writesIndexedOffset(inst,'ix',-2).
                const writesIndexedOffset = (inst, base, offset) => {
                    if (!(inst instanceof Instruction)) return false;
                    const m = inst.mnemonic.toLowerCase();
                    // Only 'ld dest,src' writes to dest when dest is memory.
                    // Other memory-modifying instructions (sla, set, res, inc, dec) also write.
                    const isMemDest = (op) => {
                        if (!op || op.type !== 'memory') return false;
                        const parsed = parseIndexedDisplacement(String(op.value || '').replace(/\s+/g, '').toLowerCase());
                        return !!(parsed && parsed.base === base && parsed.offset === offset);
                    };
                    if (m === 'ld') return isMemDest(inst.operands[0]);
                    // set/res: target is operands[1]
                    if ((m === 'set' || m === 'res') && inst.operands.length >= 2) return isMemDest(inst.operands[1]);
                    // Other memory-modifying ops: target is operands[0]
                    if (['sla','sra','srl','sll','rl','rr','rlc','rrc','inc','dec'].includes(m)) return isMemDest(inst.operands[0]);
                    return false;
                };
                // Returns true if instruction reads from (base+offset).
                const readsIndexedOffset = (inst, base, offset) => {
                    if (!(inst instanceof Instruction)) return false;
                    const m = inst.mnemonic.toLowerCase();
                    // Conservative: calls may read any local via inline code — treat as read.
                    if (['call', 'rst'].includes(m)) return true;
                    const isMemSrc = (op, isLdDest) => {
                        if (!op || op.type !== 'memory') return false;
                        if (isLdDest) return false; // destination in ld = write, not read
                        const parsed = parseIndexedDisplacement(String(op.value || '').replace(/\s+/g, '').toLowerCase());
                        return !!(parsed && parsed.base === base && parsed.offset === offset);
                    };
                    if (m === 'ld' && inst.operands.length === 2) {
                        return isMemSrc(inst.operands[1], false);  // source is operands[1]
                    }
                    // For all other instructions any memory operand is a read (or read-modify-write)
                    for (const op of inst.operands || []) {
                        if (isMemSrc(op, false)) return true;
                    }
                    return false;
                };
                const isLdRegA = (inst, regName) =>
                    inst instanceof Instruction &&
                    inst.mnemonic.toLowerCase() === 'ld' &&
                    inst.operands.length === 2 &&
                    inst.operands[0].type === 'register' &&
                    String(inst.operands[0].value).toLowerCase() === regName &&
                    inst.operands[1].type === 'register' &&
                    String(inst.operands[1].value).toLowerCase() === 'a';
                const isLdPairImm16 = (inst, pairName) =>
                    inst instanceof Instruction &&
                    inst.mnemonic.toLowerCase() === 'ld' &&
                    inst.operands.length === 2 &&
                    inst.operands[0].type === 'register_pair' &&
                    String(inst.operands[0].value).toLowerCase() === pairName &&
                    inst.operands[1].type === 'immediate';
                const pairByteLayout = {
                    bc: { high: 'b', low: 'c' },
                    de: { high: 'd', low: 'e' },
                    hl: { high: 'h', low: 'l' }
                };
                const instructionWritesDe = (inst) => {
                    if (!(inst instanceof Instruction)) return false;
                    const m = inst.mnemonic.toLowerCase();
                    if (['call', 'rst', 'reti', 'retn', 'ldir', 'lddr', 'cpir', 'cpdr', 'inir', 'indr', 'otir', 'otdr', 'exx'].includes(m)) {
                        return true;
                    }
                    if ((m === 'pop' || m === 'push' || m === 'inc' || m === 'dec') &&
                        inst.operands.length === 1) {
                        const op = inst.operands[0];
                        if ((op.type === 'register_pair' && String(op.value).toLowerCase() === 'de') ||
                            (op.type === 'register' && ['d', 'e'].includes(String(op.value).toLowerCase()))) {
                            return m !== 'push';
                        }
                    }
                    if (m === 'ex' && inst.operands.length === 2) {
                        const left = String(inst.operands[0].value).toLowerCase();
                        const right = String(inst.operands[1].value).toLowerCase();
                        if ((left === 'de' && right === 'hl') || (left === 'hl' && right === 'de')) return true;
                    }
                    if ((m === 'ld' || m === 'lea') && inst.operands.length >= 1) {
                        const dst = inst.operands[0];
                        if ((dst.type === 'register_pair' && String(dst.value).toLowerCase() === 'de') ||
                            (dst.type === 'register' && ['d', 'e'].includes(String(dst.value).toLowerCase()))) {
                            return true;
                        }
                    }
                    return false;
                };
                const instructionWritesB = (inst) => {
                    if (!(inst instanceof Instruction)) return false;
                    const m = inst.mnemonic.toLowerCase();
                    if (['call', 'rst', 'reti', 'retn', 'ldir', 'lddr', 'cpir', 'cpdr', 'inir', 'indr', 'otir', 'otdr', 'exx'].includes(m)) {
                        return true;
                    }
                    if ((m === 'pop' || m === 'inc' || m === 'dec') && inst.operands.length === 1) {
                        const op = inst.operands[0];
                        if ((op.type === 'register_pair' && String(op.value).toLowerCase() === 'bc') ||
                            (op.type === 'register' && String(op.value).toLowerCase() === 'b')) {
                            return true;
                        }
                    }
                    if ((m === 'ld' || m === 'lea') && inst.operands.length >= 1) {
                        const dst = inst.operands[0];
                        if ((dst.type === 'register_pair' && String(dst.value).toLowerCase() === 'bc') ||
                            (dst.type === 'register' && String(dst.value).toLowerCase() === 'b')) {
                            return true;
                        }
                    }
                    return false;
                };
                const instructionWritesC = (inst) => {
                    if (!(inst instanceof Instruction)) return false;
                    const m = inst.mnemonic.toLowerCase();
                    if (['call', 'rst', 'reti', 'retn', 'ldir', 'lddr', 'cpir', 'cpdr', 'inir', 'indr', 'otir', 'otdr', 'exx'].includes(m)) {
                        return true;
                    }
                    if ((m === 'pop' || m === 'inc' || m === 'dec') && inst.operands.length === 1) {
                        const op = inst.operands[0];
                        if ((op.type === 'register_pair' && String(op.value).toLowerCase() === 'bc') ||
                            (op.type === 'register' && String(op.value).toLowerCase() === 'c')) {
                            return true;
                        }
                    }
                    if ((m === 'ld' || m === 'lea') && inst.operands.length >= 1) {
                        const dst = inst.operands[0];
                        if ((dst.type === 'register_pair' && String(dst.value).toLowerCase() === 'bc') ||
                            (dst.type === 'register' && String(dst.value).toLowerCase() === 'c')) {
                            return true;
                        }
                    }
                    return false;
                };
                const cloneInstruction = (inst, labelOverride = inst?.label || null) =>
                    new Instruction(labelOverride, inst.mnemonic, inst.operands, inst.lineNumber, inst.sourceLine);
                const tryBuildPairImmediateFromByteLoads = (firstInst, secondInst) => {
                    if (!firstInst || !secondInst) return null;
                    if (!isLdRegImm(firstInst, String(firstInst.operands?.[0]?.value || '').toLowerCase()) ||
                        !isLdRegImm(secondInst, String(secondInst.operands?.[0]?.value || '').toLowerCase())) {
                        return null;
                    }
                    const firstReg = String(firstInst.operands[0].value).toLowerCase();
                    const secondReg = String(secondInst.operands[0].value).toLowerCase();
                    for (const [pair, layout] of Object.entries(pairByteLayout)) {
                        const regs = new Set([layout.high, layout.low]);
                        if (!regs.has(firstReg) || !regs.has(secondReg) || firstReg === secondReg) continue;
                        const firstValue = Number(firstInst.operands[1].value) & 0xFF;
                        const secondValue = Number(secondInst.operands[1].value) & 0xFF;
                        const hi = firstReg === layout.high ? firstValue : secondValue;
                        const lo = firstReg === layout.low ? firstValue : secondValue;
                        return { pair, imm16: (hi << 8) | lo };
                    }
                    return null;
                };
                const isLdAFromHlMemory = (inst) =>
                    inst instanceof Instruction &&
                    inst.mnemonic.toLowerCase() === 'ld' &&
                    inst.operands.length === 2 &&
                    inst.operands[0].type === 'register' &&
                    String(inst.operands[0].value).toLowerCase() === 'a' &&
                    inst.operands[1].type === 'memory' &&
                    String(inst.operands[1].value).toLowerCase() === 'hl';
                const isLdDeMemoryFromA = (inst) =>
                    inst instanceof Instruction &&
                    inst.mnemonic.toLowerCase() === 'ld' &&
                    inst.operands.length === 2 &&
                    inst.operands[0].type === 'memory' &&
                    String(inst.operands[0].value).toLowerCase() === 'de' &&
                    inst.operands[1].type === 'register' &&
                    String(inst.operands[1].value).toLowerCase() === 'a';
                const isIncPair = (inst, pairName) =>
                    inst instanceof Instruction &&
                    inst.mnemonic.toLowerCase() === 'inc' &&
                    inst.operands.length === 1 &&
                    inst.operands[0].type === 'register_pair' &&
                    String(inst.operands[0].value).toLowerCase() === pairName;
                const isPlain8BitRegisterName = (name) =>
                    ['a', 'b', 'c', 'd', 'e', 'h', 'l'].includes(String(name || '').toLowerCase());
                const findKnownHalfRegisterImmediate = (halfReg, pairName) => {
                    const half = String(halfReg || '').toLowerCase();
                    const pair = String(pairName || '').toLowerCase();
                    const layout = pairByteLayout[pair];
                    for (let lookback = optimized.length - 1; lookback >= 0; lookback--) {
                        const prev = optimized[lookback];
                        if (!(prev instanceof Instruction)) continue;
                        const prevMnemonic = prev.mnemonic.toLowerCase();
                        if (prev.label || ['call', 'jp', 'jr', 'djnz', 'ret', 'reti', 'retn'].includes(prevMnemonic)) break;
                        if (prevMnemonic === 'ld' &&
                            prev.operands.length === 2 &&
                            prev.operands[0].type === 'register' &&
                            String(prev.operands[0].value).toLowerCase() === half &&
                            prev.operands[1].type === 'immediate') {
                            return Number(prev.operands[1].value) & 0xFF;
                        }
                        if (layout &&
                            prevMnemonic === 'ld' &&
                            prev.operands.length === 2 &&
                            prev.operands[0].type === 'register_pair' &&
                            String(prev.operands[0].value).toLowerCase() === pair &&
                            prev.operands[1].type === 'immediate') {
                            const imm16 = Number(prev.operands[1].value) & 0xFFFF;
                            return half === layout.high ? (imm16 >> 8) & 0xFF : imm16 & 0xFF;
                        }
                        if (this.instructionWritesRegister(prev, pair)) break;
                    }
                    return null;
                };
                const findKnownHLowAfterPageSafeIncs = (maxWindow = 32) => {
                    let lowDelta = 0;
                    for (let lookback = optimized.length - 1; lookback >= 0 && optimized.length - lookback <= maxWindow; lookback--) {
                        const prev = optimized[lookback];
                        if (!(prev instanceof Instruction)) continue;
                        const prevMnemonic = prev.mnemonic.toLowerCase();
                        if (prev.label || isLocalAnalysisBarrier(prev) || ['ex', 'exx'].includes(prevMnemonic)) break;
                        if (prevMnemonic === 'inc' &&
                            prev.operands.length === 1 &&
                            prev.operands[0].type === 'register_pair' &&
                            String(prev.operands[0].value).toLowerCase() === 'hl') {
                            lowDelta++;
                            continue;
                        }
                        if (prevMnemonic === 'ld' && prev.operands.length === 2) {
                            const dst = prev.operands[0];
                            const src = prev.operands[1];
                            if (dst.type === 'register' && String(dst.value).toLowerCase() === 'l' && src.type === 'immediate') {
                                const base = this.resolve8BitImmediate(src);
                                if (base === null || base + lowDelta > 0xFF) return null;
                                return base + lowDelta;
                            }
                            if (dst.type === 'register_pair' && String(dst.value).toLowerCase() === 'hl' && src.type === 'immediate') {
                                const base = Number(src.value) & 0xFF;
                                if (base + lowDelta > 0xFF) return null;
                                return base + lowDelta;
                            }
                        }
                        if (this.instructionWritesRegister(prev, 'l') || this.instructionWritesRegister(prev, 'hl')) break;
                    }
                    return null;
                };
                const findKnown8BitRegisterImmediate = (regName, maxWindow = 32) => {
                    const reg = String(regName || '').toLowerCase();
                    if (!isPlain8BitRegisterName(reg)) return null;
                    const containingPair = this.getContainingRegisterPair(reg);
                    const layout = containingPair ? pairByteLayout[containingPair] : null;
                    for (let lookback = optimized.length - 1; lookback >= 0 && optimized.length - lookback <= maxWindow; lookback--) {
                        const prev = optimized[lookback];
                        if (!(prev instanceof Instruction)) continue;
                        const prevMnemonic = prev.mnemonic.toLowerCase();
                        if (prev.label || isLocalAnalysisBarrier(prev) || ['ex', 'exx'].includes(prevMnemonic)) break;
                        if (prevMnemonic === 'ld' &&
                            prev.operands.length === 2 &&
                            prev.operands[0].type === 'register' &&
                            String(prev.operands[0].value).toLowerCase() === reg &&
                            prev.operands[1].type === 'immediate') {
                            const value = this.resolve8BitImmediate(prev.operands[1]);
                            return value === null ? null : value;
                        }
                        if (reg === 'a' &&
                            prevMnemonic === 'xor' &&
                            prev.operands.length === 1 &&
                            prev.operands[0].type === 'register' &&
                            String(prev.operands[0].value).toLowerCase() === 'a') {
                            return 0;
                        }
                        if (layout &&
                            prevMnemonic === 'ld' &&
                            prev.operands.length === 2 &&
                            prev.operands[0].type === 'register_pair' &&
                            String(prev.operands[0].value).toLowerCase() === containingPair &&
                            prev.operands[1].type === 'immediate') {
                            const imm16 = Number(prev.operands[1].value) & 0xFFFF;
                            return reg === layout.high ? (imm16 >> 8) & 0xFF : imm16 & 0xFF;
                        }
                        if (this.instructionWritesRegister(prev, reg)) break;
                    }
                    return null;
                };
                const findRegisterWithKnownImmediate = (value, excludedReg = null) => {
                    const target = Number(value) & 0xFF;
                    const excluded = String(excludedReg || '').toLowerCase();
                    // Prefer non-A registers so the rewrite is visually less surprising in flag-heavy code.
                    const candidates = ['b', 'c', 'd', 'e', 'h', 'l', 'a'];
                    for (const reg of candidates) {
                        if (reg === excluded) continue;
                        const known = findKnown8BitRegisterImmediate(reg);
                        if (known === target) return reg;
                    }
                    return null;
                };

                let liveDeImmediate = null;
                let liveBImmediate = null;
                let liveCImmediate = null;

                for (let i = 0; i < tokens.length; i++) {
                    const token = tokens[i];

                    if (!(token instanceof Instruction)) {
                        liveDeImmediate = null;
                        liveBImmediate = null;
                        liveCImmediate = null;
                        optimized.push(token);
                        continue;
                    }

                    if (token.label) {
                        liveDeImmediate = null;
                        liveBImmediate = null;
                        liveCImmediate = null;
                    }

                    const mnem = token.mnemonic.toLowerCase();

                    // === PHASE 1.5i2: Remove dead A transfer in register/immediate copies ===
                    //   ld a,src
                    //   ld dst,a
                    // becomes:
                    //   ld dst,src
                    //
                    // This preserves flags and dst. It deliberately changes A by leaving
                    // its previous value intact, so it is valid only when A is dead after
                    // the second load. Avoid memory operands and special I/R transfers.
                    if (this.config.localValueReuse &&
                        mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'a' &&
                        i + 1 < tokens.length) {
                        const src = token.operands[1];
                        const nextToken = tokens[i + 1];
                        const srcIsDirect8 =
                            src.type === 'immediate' ||
                            (src.type === 'symbol' && this.resolve8BitImmediate(src) !== null);
                        if (nextToken instanceof Instruction &&
                            !nextToken.label &&
                            nextToken.mnemonic.toLowerCase() === 'ld' &&
                            nextToken.operands.length === 2 &&
                            nextToken.operands[0].type === 'register' &&
                            isPlain8BitRegisterName(nextToken.operands[0].value) &&
                            String(nextToken.operands[0].value).toLowerCase() !== 'a' &&
                            nextToken.operands[1].type === 'register' &&
                            String(nextToken.operands[1].value).toLowerCase() === 'a' &&
                            (
                                srcIsDirect8 ||
                                (src.type === 'register' &&
                                    isPlain8BitRegisterName(src.value) &&
                                    String(src.value).toLowerCase() !== 'a')
                            ) &&
                            this.isRegisterDeadBeforeNextUse(tokens, i + 1, 'a')) {
                            const replacement = new Instruction(
                                token.label,
                                'ld',
                                [nextToken.operands[0], new Operand(src.type, src.value)],
                                token.lineNumber,
                                token.sourceLine
                            );
                            optimized.push(replacement);
                            i += 1;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(token) + getInstructionSize(nextToken) - getInstructionSize(replacement);
                            optimizerLog(`  Folded dead A transfer into direct LD at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5i3: Narrow 16-bit immediate load when half is known ===
                    //   ld de,$0800
                    //   ...
                    //   ld de,$1000
                    // becomes:
                    //   ld de,$0800
                    //   ...
                    //   ld d,$10
                    //
                    // This preserves flags and final pair value. It is only valid when
                    // the untouched half-register is proven to already hold the desired
                    // byte and no instruction in between can clobber the pair.
                    if (this.config.localValueReuse &&
                        mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[1].type === 'immediate' &&
                        !token.label) {
                        const pair = String(token.operands[0].value).toLowerCase();
                        const layout = pairByteLayout[pair];
                        if (layout) {
                            const imm16 = Number(token.operands[1].value) & 0xFFFF;
                            const high = (imm16 >> 8) & 0xFF;
                            const low = imm16 & 0xFF;
                            const knownLow = findKnownHalfRegisterImmediate(layout.low, pair);
                            const knownHigh = findKnownHalfRegisterImmediate(layout.high, pair);
                            let replacementReg = null;
                            let replacementValue = null;
                            if (knownLow === low && knownHigh !== high) {
                                replacementReg = layout.high;
                                replacementValue = high;
                            } else if (knownHigh === high && knownLow !== low) {
                                replacementReg = layout.low;
                                replacementValue = low;
                            }
                            if (replacementReg) {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register', replacementReg), new Operand('immediate', replacementValue)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 1;
                                optimizerLog(`  Narrowed LD ${pair.toUpperCase()},imm16 to LD ${replacementReg.toUpperCase()},imm8 using known half-register at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5i4: Replace LD L,next with INC HL when page-safe ===
                    // LD L,n and INC HL both preserve flags only if INC HL does not carry
                    // into H. This recovers sequential RAM stores after page-local address
                    // narrowing, while rejecting L=$FF -> $00 page crossing.
                    if (this.config.localValueReuse &&
                        isLdRegImm(token, 'l') &&
                        !token.label) {
                        const currentLow = findKnownHLowAfterPageSafeIncs();
                        const nextLow = this.resolve8BitImmediate(token.operands[1]);
                        if (currentLow !== null &&
                            nextLow !== null &&
                            currentLow < 0xFF &&
                            nextLow === ((currentLow + 1) & 0xFF)) {
                            optimized.push(new Instruction(
                                token.label,
                                'inc',
                                [new Operand('register_pair', 'hl')],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Replaced LD L,${nextLow} with page-safe INC HL at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5j: Fold byte-copy step into LDI + BC restore ===
                    //   ld a,(hl)
                    //   ld (de),a
                    //   inc hl
                    //   inc de
                    // becomes:
                    //   ldi
                    //   inc bc
                    //
                    // LDI has the same net HL/DE movement and copies the same byte, but
                    // temporarily decrements BC and changes flags. INC BC restores BC and
                    // does not affect flags, so this is only valid when flags are dead
                    // before their next use.
                    if (this.config.localValueReuse &&
                        isLdAFromHlMemory(token) &&
                        i + 3 < tokens.length &&
                        isLdDeMemoryFromA(tokens[i + 1]) &&
                        isIncPair(tokens[i + 2], 'hl') &&
                        isIncPair(tokens[i + 3], 'de') &&
                        !tokens[i + 1].label &&
                        !tokens[i + 2].label &&
                        !tokens[i + 3].label &&
                        this.areFlagsDeadBeforeNextUse(tokens, i + 3)) {
                        optimized.push(new Instruction(
                            token.label,
                            'ldi',
                            [],
                            token.lineNumber,
                            token.sourceLine
                        ));
                        optimized.push(new Instruction(
                            null,
                            'inc',
                            [new Operand('register_pair', 'bc')],
                            tokens[i + 3].lineNumber,
                            tokens[i + 3].sourceLine
                        ));
                        i += 3;
                        this.stats.peepholeOpts++;
                        this.stats.bytesSaved += 1;
                        optimizerLog(`  Folded byte copy step into LDI + INC BC at line ${token.lineNumber}`, 'debug');
                        continue;
                    }

                    if (isLdPairImm16(token, 'de') && !token.label) {
                        const immValue = Number(token.operands[1].value);
                        if (liveDeImmediate === 1 && immValue === 2) {
                            optimized.push(new Instruction(
                                token.label,
                                'inc',
                                [new Operand('register_pair', 'de')],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            liveDeImmediate = 2;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Folded LD DE,2 into INC DE with DE already 1 at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                        if (liveDeImmediate !== null && liveDeImmediate === immValue) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(token);
                            optimizerLog(`  Removed duplicate LD DE,imm16 at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                        liveDeImmediate = immValue;
                    } else if (instructionWritesDe(token)) {
                        liveDeImmediate = null;
                    }
                    if ((this.config.speculativeValueReuse || this.config.blockCopyBcZeroReuse) &&
                        isLdPairImm16(token, 'bc') && !token.label) {
                        const immValue = Number(token.operands[1].value) & 0xFFFF;
                        const hi = (immValue >> 8) & 0xFF;
                        const lo = immValue & 0xFF;
                        if (hi === 0 && liveBImmediate === 0) {
                            optimized.push(new Instruction(token.label, 'ld', [
                                new Operand('register', 'c'),
                                new Operand('immediate', lo)
                            ], token.lineNumber, token.sourceLine));
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Reduced LD BC,imm16 to LD C,imm8 with B already zero at line ${token.lineNumber}`, 'debug');
                            liveCImmediate = lo;
                            continue;
                        }
                        liveBImmediate = hi;
                        liveCImmediate = lo;
                    } else if (this.config.speculativeValueReuse && isLdRegImm(token, 'b')) {
                        liveBImmediate = Number(token.operands[1].value) & 0xFF;
                    } else if (this.config.speculativeValueReuse && isLdRegImm(token, 'c')) {
                        liveCImmediate = Number(token.operands[1].value) & 0xFF;
                    } else if ((this.config.speculativeValueReuse || this.config.blockCopyBcZeroReuse) && (mnem === 'ldir' || mnem === 'lddr')) {
                        // On completion, block-copy leaves BC == 0. Preserve that
                        // fact so later LD BC,00nn loads can collapse to LD C,nn.
                        liveBImmediate = 0;
                        liveCImmediate = 0;
                    }
                    if (!isLdPairImm16(token, 'bc') &&
                        !isLdRegImm(token, 'b') &&
                        !(mnem === 'ldir' || mnem === 'lddr') &&
                        instructionMayInvalidateTrackedRegister(token, 'b')) {
                        liveBImmediate = null;
                    }
                    if (!isLdPairImm16(token, 'bc') &&
                        !isLdRegImm(token, 'c') &&
                        !(mnem === 'ldir' || mnem === 'lddr') &&
                        instructionMayInvalidateTrackedRegister(token, 'c')) {
                        liveCImmediate = null;
                    }

                    if (this.config.speculativeValueReuse &&
                        isLdRegImm(token, 'a') &&
                        !token.label &&
                        liveCImmediate !== null &&
                        (Number(token.operands[1].value) & 0xFF) === liveCImmediate) {
                        optimized.push(new Instruction(token.label, 'ld', [
                            new Operand('register', 'a'),
                            new Operand('register', 'c')
                        ], token.lineNumber, token.sourceLine));
                        this.stats.peepholeOpts++;
                        this.stats.bytesSaved += 1;
                        optimizerLog(`  Reduced LD A,imm8 to LD A,C with C already holding the value at line ${token.lineNumber}`, 'debug');
                        continue;
                    }

                    // Experimental: strip IX stack-frame scaffolding when a routine sets it up
                    // and then never touches IX/SP in its real body.
                    if (this.config.stripIxFrames &&
                        mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        String(token.operands[0].value).toLowerCase() === 'ix' &&
                        i + 5 < tokens.length) {
                        const t1 = tokens[i + 1];
                        const t2 = tokens[i + 2];
                        if (t1 instanceof Instruction &&
                            t2 instanceof Instruction &&
                            !t1.label &&
                            !t2.label &&
                            t1.mnemonic.toLowerCase() === 'ld' &&
                            t1.operands.length === 2 &&
                            t1.operands[0].type === 'register_pair' &&
                            String(t1.operands[0].value).toLowerCase() === 'ix' &&
                            t1.operands[1].type === 'immediate' &&
                            Number(t1.operands[1].value) === 0 &&
                            t2.mnemonic.toLowerCase() === 'add' &&
                            t2.operands.length === 2 &&
                            t2.operands[0].type === 'register_pair' &&
                            String(t2.operands[0].value).toLowerCase() === 'ix' &&
                            t2.operands[1].type === 'register_pair' &&
                            String(t2.operands[1].value).toLowerCase() === 'sp') {

                            let routineEnd = -1;
                            for (let j = i + 3; j < tokens.length; j++) {
                                const candidate = tokens[j];
                                if (j > i + 3 && candidate.label) {
                                    routineEnd = j - 1;
                                    break;
                                }
                            }
                            if (routineEnd === -1) routineEnd = tokens.length - 1;

                            if (routineEnd >= i + 5) {
                                const ep0 = tokens[routineEnd - 2];
                                const ep1 = tokens[routineEnd - 1];
                                const ep2 = tokens[routineEnd];
                                const hasCanonicalEpilogue =
                                    ep0 instanceof Instruction &&
                                    ep1 instanceof Instruction &&
                                    ep2 instanceof Instruction &&
                                    !ep0.label &&
                                    !ep1.label &&
                                    !ep2.label &&
                                    ep0.mnemonic.toLowerCase() === 'ld' &&
                                    ep0.operands.length === 2 &&
                                    ep0.operands[0].type === 'register_pair' &&
                                    String(ep0.operands[0].value).toLowerCase() === 'sp' &&
                                    ep0.operands[1].type === 'register_pair' &&
                                    String(ep0.operands[1].value).toLowerCase() === 'ix' &&
                                    ep1.mnemonic.toLowerCase() === 'pop' &&
                                    ep1.operands.length === 1 &&
                                    ep1.operands[0].type === 'register_pair' &&
                                    String(ep1.operands[0].value).toLowerCase() === 'ix' &&
                                    ep2.mnemonic.toLowerCase() === 'ret' &&
                                    ep2.operands.length === 0;

                                if (hasCanonicalEpilogue) {
                                    let touchesFrameState = false;
                                    for (let j = i + 3; j <= routineEnd - 3; j++) {
                                        const candidate = tokens[j];
                                        if (!(candidate instanceof Instruction)) continue;
                                        if (instructionTouchesRegister(candidate, 'ix') || instructionTouchesRegister(candidate, 'sp')) {
                                            touchesFrameState = true;
                                            break;
                                        }
                                    }

                                    if (!touchesFrameState) {
                                        const firstBody = tokens[i + 3];
                                        if (firstBody instanceof Instruction) {
                                            optimized.push(cloneInstruction(firstBody, token.label || firstBody.label || null));
                                            for (let j = i + 4; j <= routineEnd - 3; j++) {
                                                optimized.push(tokens[j]);
                                            }
                                            optimized.push(ep2);
                                            i = routineEnd;
                                            this.stats.peepholeOpts++;
                                            this.stats.ixFramesStripped++;
                                            this.stats.bytesSaved += 10;
                                            optimizerLog(`  Stripped unused IX frame from routine at line ${token.lineNumber}`, 'debug');
                                            continue;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Disabled: local dead-code removal after unconditional flow stops.
                    // It is too risky for hand-written/runtime entry trampolines that use
                    // sequential bytes as alternate entry paths (for example tiny-sound
                    // stubs where a JP init is followed by a second entry that falls into
                    // the play routine). Global reachability DCE still runs separately.

                    // === PHASE 1.1b: Remove redundant HL reload before repeated (HL) ops ===
                    // Example:
                    //   ld hl,sym
                    //   sla (hl)
                    //   ld hl,sym
                    //   sla (hl)
                    // Keep the first load when the previous optimized instruction used (hl)
                    // without changing HL, and the current load reloads the exact same address.
                    if (mnem === 'ld' && optimized.length >= 2 && !token.label) {
                        const prev = optimized[optimized.length - 1];
                        const prevPrev = optimized[optimized.length - 2];
                        if (prev instanceof Instruction &&
                            prevPrev instanceof Instruction &&
                            !prev.label &&
                            isSameHlReload(prevPrev, token) &&
                            usesHlMemoryWithoutChangingHl(prev)) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 3;
                            optimizerLog(`  Removed redundant LD HL reload before repeated (HL) op at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.1c: Remove redundant HL reload after net-zero HL byte-walk ===
                    // Example:
                    //   ld hl,sym
                    //   sla (hl)
                    //   inc hl
                    //   rl (hl)
                    //   dec hl
                    //   ld hl,sym
                    // Keep the first load; HL is already restored to the same address.
                    if (mnem === 'ld' && optimized.length >= 4 && !token.label) {
                        const prev = optimized[optimized.length - 1];
                        const prevPrev = optimized[optimized.length - 2];
                        const prevPrevPrev = optimized[optimized.length - 3];
                        const prevPrevPrevPrev = optimized[optimized.length - 4];
                        const isIncHl =
                            prevPrev instanceof Instruction &&
                            prevPrev.mnemonic.toLowerCase() === 'inc' &&
                            prevPrev.operands.length === 1 &&
                            prevPrev.operands[0].type === 'register_pair' &&
                            String(prevPrev.operands[0].value).toLowerCase() === 'hl';
                        const isDecHl =
                            prev instanceof Instruction &&
                            prev.mnemonic.toLowerCase() === 'dec' &&
                            prev.operands.length === 1 &&
                            prev.operands[0].type === 'register_pair' &&
                            String(prev.operands[0].value).toLowerCase() === 'hl';
                        if (isDecHl &&
                            isIncHl &&
                            prevPrevPrev instanceof Instruction &&
                            prevPrevPrevPrev instanceof Instruction &&
                            !prev.label &&
                            !prevPrev.label &&
                            !prevPrevPrev.label &&
                            !prevPrevPrevPrev.label &&
                            isSameHlReload(prevPrevPrevPrev, token) &&
                            usesHlMemoryWithoutChangingHl(prevPrevPrev)) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 3;
                            optimizerLog(`  Removed redundant LD HL reload after INC/DEC HL byte-walk at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Arithmetic/logical instructions are not safe to remove as "no-ops".
                    // Even when the data result is unchanged, flags and carry are often
                    // intentionally consumed by following code (e.g. SBC A,0 in 16-bit decrements).

                    // === PHASE 1.1d: Stack-local int8 *= 2 via direct indexed shift ===
                    // Example:
                    //   ld a,(ix+off)
                    //   add a,a
                    //   ld (ix+off),a
                    // ->
                    //   sla (ix+off)
                    // This is a real size win on indexed stack locals.
                    if (mnem === 'ld' && i + 2 < tokens.length && !token.label) {
                        const mid = tokens[i + 1];
                        const last = tokens[i + 2];
                        if (mid instanceof Instruction &&
                            last instanceof Instruction &&
                            !mid.label &&
                            !last.label &&
                            isLdAFromMem(token) &&
                            typeof token.operands[1]?.value === 'string' &&
                            /^\(?(ix)[+\-].+\)?$/i.test(String(token.operands[1].value).replace(/\s+/g, '')) &&
                            mid.mnemonic.toLowerCase() === 'add' &&
                            mid.operands.length === 2 &&
                            mid.operands[0].type === 'register' &&
                            String(mid.operands[0].value).toLowerCase() === 'a' &&
                            mid.operands[1].type === 'register' &&
                            String(mid.operands[1].value).toLowerCase() === 'a' &&
                            isLdMemA(last, token.operands[1].value)) {
                            optimized.push(new Instruction(
                                token.label,
                                'sla',
                                [new Operand('memory', token.operands[1].value)],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            i += 2;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 3;
                            optimizerLog(`  Folded indexed LD/ADD/STORE into SLA ${token.operands[1].value} at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.1e: Dead A reload from ix-indexed slot after immediate store ===
                    // Pattern:
                    //   ld (ix+N),a
                    //   ld a,(ix+N)   ← dead: A already holds this value
                    // Memory operand values are stored WITHOUT outer parens: "ix-2" not "(ix-2)".
                    if (mnem === 'ld' && !token.label && optimized.length >= 1 &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'a' &&
                        token.operands[1].type === 'memory') {
                        const memVal1e = String(token.operands[1].value).replace(/\s+/g, '').toLowerCase();
                        if (/^(ix|iy)[+\-]\d+$/.test(memVal1e)) {
                            const prev = optimized[optimized.length - 1];
                            if (prev instanceof Instruction && !prev.label &&
                                isLdMemA(prev, memVal1e)) {
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 3;
                                optimizerLog(`  Removed dead LD A,(ix+N) after LD (ix+N),A at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.1f: Dead HL reload after 16-bit store via A to ix-indexed slot ===
                    // Pattern:
                    //   ld a,l
                    //   ld (ix+N),a
                    //   ld a,h
                    //   ld (ix+N+1),a
                    //   ld l,(ix+N)      ← dead: L still has original value
                    //   ld h,(ix+N+1)    ← dead: H still has original value
                    // Memory operand values are stored WITHOUT outer parens: "ix-2" not "(ix-2)".
                    if (mnem === 'ld' && !token.label &&
                        i + 1 < tokens.length && optimized.length >= 4 &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'l' &&
                        token.operands[1].type === 'memory') {
                        const memValL = String(token.operands[1].value).replace(/\s+/g, '').toLowerCase();
                        const ixMatchL = memValL.match(/^(ix|iy)([+\-]\d+)$/);
                        if (ixMatchL && ixMatchL[1] === 'ix') {
                            const offsetL = Number.parseInt(ixMatchL[2], 10);
                            const next = tokens[i + 1];
                            if (next instanceof Instruction && !next.label &&
                                next.mnemonic.toLowerCase() === 'ld' &&
                                next.operands.length === 2 &&
                                next.operands[0].type === 'register' &&
                                String(next.operands[0].value).toLowerCase() === 'h' &&
                                next.operands[1].type === 'memory') {
                                const memValH = String(next.operands[1].value).replace(/\s+/g, '').toLowerCase();
                                const ixMatchH = memValH.match(/^(ix|iy)([+\-]\d+)$/);
                                if (ixMatchH && ixMatchH[1] === 'ix' &&
                                    Number.parseInt(ixMatchH[2], 10) === offsetL + 1) {
                                    const p3 = optimized[optimized.length - 1];
                                    const p2 = optimized[optimized.length - 2];
                                    const p1 = optimized[optimized.length - 3];
                                    const p0 = optimized[optimized.length - 4];
                                    const p0Match = p0 instanceof Instruction && !p0.label &&
                                        p0.mnemonic.toLowerCase() === 'ld' &&
                                        p0.operands.length === 2 &&
                                        p0.operands[0].type === 'register' &&
                                        String(p0.operands[0].value).toLowerCase() === 'a' &&
                                        p0.operands[1].type === 'register' &&
                                        String(p0.operands[1].value).toLowerCase() === 'l';
                                    const p1Match = p1 instanceof Instruction && !p1.label && isLdMemA(p1, memValL);
                                    const p2Match = p2 instanceof Instruction && !p2.label &&
                                        p2.mnemonic.toLowerCase() === 'ld' &&
                                        p2.operands.length === 2 &&
                                        p2.operands[0].type === 'register' &&
                                        String(p2.operands[0].value).toLowerCase() === 'a' &&
                                        p2.operands[1].type === 'register' &&
                                        String(p2.operands[1].value).toLowerCase() === 'h';
                                    const p3Match = p3 instanceof Instruction && !p3.label && isLdMemA(p3, memValH);
                                    if (p0Match && p1Match && p2Match && p3Match) {
                                        i++;
                                        this.stats.peepholeOpts++;
                                        this.stats.bytesSaved += 6;
                                        optimizerLog(`  Removed dead HL reload after ix16 store at line ${token.lineNumber}`, 'debug');
                                        continue;
                                    }
                                }
                            }
                        }
                    }

                    // Pattern: coordinate temporaries built as const + var and then copied to D/E
                    //   ld a,CONSTX
                    //   ld (TMPX),a
                    //   ld a,(SRCX)
                    //   ld b,a
                    //   ld a,(TMPX)
                    //   add a,b
                    //   ld (TMPX),a
                    //   ld a,CONSTY
                    //   ld (TMPY),a
                    //   ld a,(SRCY)
                    //   ld b,a
                    //   ld a,(TMPY)
                    //   add a,b
                    //   ld (TMPY),a
                    //   ld a,(TMPY)
                    //   ld d,a
                    //   ld a,(TMPX)
                    //   ld e,a
                    // ->
                    //   ld a,(SRCY)
                    //   add a,CONSTY
                    //   ld d,a
                    //   ld a,(SRCX)
                    //   add a,CONSTX
                    //   ld e,a
                    if (i + 17 < tokens.length && !token.label) {
                        const t1 = token, t2 = tokens[i + 1], t3 = tokens[i + 2], t4 = tokens[i + 3], t5 = tokens[i + 4], t6 = tokens[i + 5], t7 = tokens[i + 6];
                        const t8 = tokens[i + 7], t9 = tokens[i + 8], t10 = tokens[i + 9], t11 = tokens[i + 10], t12 = tokens[i + 11], t13 = tokens[i + 12], t14 = tokens[i + 13];
                        const t15 = tokens[i + 14], t16 = tokens[i + 15], t17 = tokens[i + 16], t18 = tokens[i + 17];
                        if ([t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12,t13,t14,t15,t16,t17,t18].every(t => t instanceof Instruction && !t.label) &&
                            isLdRegImm(t1, 'a') &&
                            isLdMemA(t2) &&
                            isLdAFromMem(t3) &&
                            isLdRegA(t4, 'b') &&
                            isLdAFromMem(t5, t2.operands[0].value) &&
                            t6.mnemonic.toLowerCase() === 'add' && t6.operands.length === 2 && t6.operands[0].type === 'register' && String(t6.operands[0].value).toLowerCase() === 'a' && t6.operands[1].type === 'register' && String(t6.operands[1].value).toLowerCase() === 'b' &&
                            isLdMemA(t7, t2.operands[0].value) &&
                            isLdRegImm(t8, 'a') &&
                            isLdMemA(t9) &&
                            isLdAFromMem(t10) &&
                            isLdRegA(t11, 'b') &&
                            isLdAFromMem(t12, t9.operands[0].value) &&
                            t13.mnemonic.toLowerCase() === 'add' && t13.operands.length === 2 && t13.operands[0].type === 'register' && String(t13.operands[0].value).toLowerCase() === 'a' && t13.operands[1].type === 'register' && String(t13.operands[1].value).toLowerCase() === 'b' &&
                            isLdMemA(t14, t9.operands[0].value) &&
                            isLdAFromMem(t15, t9.operands[0].value) &&
                            isLdRegA(t16, 'd') &&
                            isLdAFromMem(t17, t2.operands[0].value) &&
                            isLdRegA(t18, 'e')) {
                            optimized.push(new Instruction(t10.label, 'ld', [new Operand('register', 'a'), new Operand('memory', t10.operands[1].value)], t10.lineNumber, t10.sourceLine));
                            optimized.push(new Instruction(null, 'add', [new Operand('register', 'a'), new Operand('immediate', t8.operands[1].value)], t13.lineNumber, t13.sourceLine));
                            optimized.push(new Instruction(null, 'ld', [new Operand('register', 'd'), new Operand('register', 'a')], t16.lineNumber, t16.sourceLine));
                            optimized.push(new Instruction(null, 'ld', [new Operand('register', 'a'), new Operand('memory', t3.operands[1].value)], t3.lineNumber, t3.sourceLine));
                            optimized.push(new Instruction(null, 'add', [new Operand('register', 'a'), new Operand('immediate', t1.operands[1].value)], t6.lineNumber, t6.sourceLine));
                            optimized.push(new Instruction(null, 'ld', [new Operand('register', 'e'), new Operand('register', 'a')], t18.lineNumber, t18.sourceLine));
                            i += 17;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 12;
                            optimizerLog(`  Folded transient draw-coordinate temporaries into direct D/E loads at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.2: Redundant Loads ===
                    // Narrow 3-instruction fold:
                    //   LD rH,n / XOR A / LD rL,A  ->  XOR A / LD rr,nn
                    // Safe because LD does not affect flags and XOR A neither reads nor
                    // writes the pair high byte. Keep this conservative: only XOR A,
                    // only BC/DE/HL, no labels on the moved/removed instructions.
                    if (mnem === 'ld' && i + 2 < tokens.length && token.operands.length === 2 && !token.label) {
                        const mid = tokens[i + 1];
                        const last = tokens[i + 2];
                        if (mid instanceof Instruction &&
                            last instanceof Instruction &&
                            !mid.label &&
                            !last.label &&
                            mid.mnemonic.toLowerCase() === 'xor' &&
                            mid.operands.length === 1 &&
                            mid.operands[0].type === 'register' &&
                            mid.operands[0].value.toLowerCase() === 'a' &&
                            last.mnemonic.toLowerCase() === 'ld' &&
                            last.operands.length === 2) {

                            const dest1 = token.operands[0];
                            const src1 = token.operands[1];
                            const dest3 = last.operands[0];
                            const src3 = last.operands[1];
                            const pairMap = {
                                b: { high: 'b', low: 'c', pair: 'bc' },
                                d: { high: 'd', low: 'e', pair: 'de' },
                                h: { high: 'h', low: 'l', pair: 'hl' }
                            };
                            const reg1 = dest1.type === 'register' ? dest1.value.toLowerCase() : null;
                            const reg3 = dest3.type === 'register' ? dest3.value.toLowerCase() : null;
                            const pairInfo = reg1 ? pairMap[reg1] : null;
                            const value1 = this.resolve8BitImmediate(src1);

                            if (pairInfo &&
                                reg1 === pairInfo.high &&
                                reg3 === pairInfo.low &&
                                src3.type === 'register' &&
                                src3.value.toLowerCase() === 'a' &&
                                value1 !== null) {
                                const combined = ((value1 & 0xFF) << 8);
                                optimized.push(mid);
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [
                                        new Operand('register_pair', pairInfo.pair),
                                        new Operand('immediate', combined)
                                    ],
                                    token.lineNumber
                                ));
                                i += 2;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved++;
                                optimizerLog(`  Folded LD ${reg1.toUpperCase()},n / XOR A / LD ${reg3.toUpperCase()},A into XOR A / LD ${pairInfo.pair.toUpperCase()},nn at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.2h: Remove redundant LD H,0 by short lookback ===
                    // Aggressive+: this relies on local H/HL dataflow. It is not Safe/Balanced
                    // because high-byte clears are often part of argument setup code.
                    if (this.config.speculativeValueReuse &&
                        isLdRegImm(token, 'h') &&
                        Number(token.operands[1].value) === 0 &&
                        !token.label) {
                        let hKnownZero = false;
                        for (let lookback = optimized.length - 1; lookback >= 0 && optimized.length - lookback <= 8; lookback--) {
                            const prev = optimized[lookback];
                            if (!(prev instanceof Instruction) || prev.label || isLocalAnalysisBarrier(prev)) break;
                            if (isLdRegImm(prev, 'h') && Number(prev.operands[1].value) === 0) {
                                hKnownZero = true;
                                break;
                            }
                            if (prev.mnemonic.toLowerCase() === 'ld' &&
                                prev.operands.length === 2 &&
                                prev.operands[0].type === 'register_pair' &&
                                String(prev.operands[0].value).toLowerCase() === 'hl' &&
                                prev.operands[1].type === 'immediate' &&
                                ((Number(prev.operands[1].value) >> 8) & 0xFF) === 0) {
                                hKnownZero = true;
                                break;
                            }
                            if (this.instructionWritesRegister(prev, 'h')) break;
                        }
                        if (hKnownZero) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Removed redundant LD H,0 with H already zero at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Remove redundant `ld d,0` when D is already known zero.
                    // This targets repeated byte-to-word setup and is safe because
                    // LD r,n does not affect flags. Keep the proof local, but allow
                    // a wider window than the original 8 instructions: generated
                    // address setup often preserves D=0 across several E-only
                    // updates and HL arithmetic operations.
                    if (isLdRegImm(token, 'd') &&
                        Number(token.operands[1].value) === 0 &&
                        !token.label) {
                        let dKnownZero = false;
                        for (let lookback = optimized.length - 1; lookback >= 0 && optimized.length - lookback <= 32; lookback--) {
                            const prev = optimized[lookback];
                            if (!(prev instanceof Instruction) || prev.label || isLocalAnalysisBarrier(prev)) break;
                            if (isLdRegImm(prev, 'd') && Number(prev.operands[1].value) === 0) {
                                dKnownZero = true;
                                break;
                            }
                            if (prev.mnemonic.toLowerCase() === 'ld' &&
                                prev.operands.length === 2 &&
                                prev.operands[0].type === 'register_pair' &&
                                String(prev.operands[0].value).toLowerCase() === 'de' &&
                                prev.operands[1].type === 'immediate' &&
                                ((Number(prev.operands[1].value) >> 8) & 0xFF) === 0) {
                                dKnownZero = true;
                                break;
                            }
                            if (this.instructionWritesRegister(prev, 'd')) break;
                        }
                        if (dKnownZero) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Removed redundant LD D,0 with D already zero at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // General local value reuse: LD dst,n -> LD dst,src when another
                    // 8-bit register is locally proven to already hold n. Both forms leave
                    // flags unchanged; keep this at Balanced+ because it is value tracking.
                    if (this.config.localValueReuse &&
                        mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        ['immediate', 'symbol'].includes(token.operands[1].type) &&
                        !token.label) {
                        const dstReg = String(token.operands[0].value).toLowerCase();
                        const value = this.resolve8BitImmediate(token.operands[1]);
                        if (isPlain8BitRegisterName(dstReg) && value !== null) {
                            const srcReg = findRegisterWithKnownImmediate(value, dstReg);
                            if (srcReg) {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register', dstReg), new Operand('register', srcReg)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 1;
                                optimizerLog('  Replaced LD ' + dstReg.toUpperCase() + ',n with LD ' + dstReg.toUpperCase() + ',' + srcReg.toUpperCase() + ' because ' + srcReg.toUpperCase() + ' already has ' + (value & 0xFF) + ' at line ' + token.lineNumber, 'debug');
                                continue;
                            }
                        }
                    }

                    // Replace a full HL reload with an L-only reload when H is already
                    // locally proven to hold the same high byte. LD L,n is one byte
                    // shorter than LD HL,nn and, like LD HL,nn, does not affect flags.
                    if (isLdPairImm16(token, 'hl') && !token.label) {
                        const imm16 = Number(token.operands[1].value) & 0xFFFF;
                        const high = (imm16 >> 8) & 0xFF;
                        const low = imm16 & 0xFF;
                        const knownH = findKnownHalfRegisterImmediate('h', 'hl');
                        if (knownH === high) {
                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register', 'l'), new Operand('immediate', low)],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Replaced LD HL,nn with LD L,n because H already matches at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Fold `ld a,n; ld (hl),a` into `ld (hl),n` only when A is
                    // explicitly overwritten before any later read or flow barrier.
                    // The replacement is one byte shorter but does not preserve A.
                    if (this.config.localValueReuse &&
                        isLdRegImm(token, 'a') &&
                        !token.label &&
                        i + 1 < tokens.length) {
                        const next = tokens[i + 1];
                        const value = this.resolve8BitImmediate(token.operands[1]);
                        if (value !== null &&
                            next instanceof Instruction &&
                            !next.label &&
                            next.mnemonic.toLowerCase() === 'ld' &&
                            next.operands.length === 2 &&
                            next.operands[0].type === 'memory' &&
                            String(next.operands[0].value).toLowerCase().replace(/\s+/g, '') === 'hl' &&
                            next.operands[1].type === 'register' &&
                            String(next.operands[1].value).toLowerCase() === 'a' &&
                            isOverwrittenBeforeAnyReadInBlock(tokens, i + 1, 'a')) {
                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [next.operands[0], token.operands[1]],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Folded LD A,n / LD (HL),A into LD (HL),n at line ${token.lineNumber}`, 'debug');
                            i++;
                            continue;
                        }
                    }

                    // Pair merge: LD rH,n / LD rL,n -> LD rr,nn for BC/DE/HL
                    // Also accepts the reverse order (low then high) when adjacent.
                    if (mnem === 'ld' && i + 1 < tokens.length && token.operands.length === 2) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction &&
                            next.mnemonic.toLowerCase() === 'ld' &&
                            next.operands.length === 2 &&
                            !next.label) {

                            const dest1 = token.operands[0];
                            const src1 = token.operands[1];
                            const dest2 = next.operands[0];
                            const src2 = next.operands[1];
                            const pairMap = {
                                b: { high: 'b', low: 'c', pair: 'bc' },
                                c: { high: 'b', low: 'c', pair: 'bc' },
                                d: { high: 'd', low: 'e', pair: 'de' },
                                e: { high: 'd', low: 'e', pair: 'de' },
                                h: { high: 'h', low: 'l', pair: 'hl' },
                                l: { high: 'h', low: 'l', pair: 'hl' }
                            };
                            const reg1 = dest1.type === 'register' ? dest1.value.toLowerCase() : null;
                            const reg2 = dest2.type === 'register' ? dest2.value.toLowerCase() : null;
                            const pairInfo = reg1 ? pairMap[reg1] : null;
                            const value1 = this.resolve8BitImmediate(src1);
                            const value2 = this.resolve8BitImmediate(src2);

                            if (pairInfo &&
                                dest2.type === 'register' &&
                                ((reg1 === pairInfo.high && reg2 === pairInfo.low) ||
                                 (reg1 === pairInfo.low && reg2 === pairInfo.high)) &&
                                value1 !== null &&
                                value2 !== null) {
                                const highValue = reg1 === pairInfo.high ? value1 : value2;
                                const lowValue = reg1 === pairInfo.low ? value1 : value2;
                                const combined = ((highValue & 0xFF) << 8) | (lowValue & 0xFF);
                                const mergedToken = new Instruction(
                                    token.label,
                                    'ld',
                                    [
                                        new Operand('register_pair', pairInfo.pair),
                                        new Operand('immediate', combined)
                                    ],
                                    token.lineNumber
                                );
                                optimized.push(mergedToken);
                                i++;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved++;
                                optimizerLog(`  Merged LD ${reg1.toUpperCase()},n / LD ${reg2.toUpperCase()},n into LD ${pairInfo.pair.toUpperCase()},nn at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // Short-range duplicate immediate load elimination:
                    //   ld r,imm
                    //   [small run that may read r but does not rewrite it]
                    //   ld r,imm
                    // -> second load is redundant
                    if (mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[1].type === 'immediate' &&
                        !token.label &&
                        (token.operands[0].type === 'register' || token.operands[0].type === 'register_pair')) {
                        const targetType = token.operands[0].type;
                        const targetValue = String(token.operands[0].value).toLowerCase();
                        const immValue = token.operands[1].value;
                        let removedDuplicate = false;

                        for (let back = optimized.length - 1, scanned = 0; back >= 0 && scanned < SHORT_LOCAL_REUSE_WINDOW; back--, scanned++) {
                            const prev = optimized[back];
                            if (!(prev instanceof Instruction)) continue;
                            if (prev.label) break;
                            if (this.instructionWritesRegister(prev, targetValue)) break;
                            if (prev.mnemonic.toLowerCase() === 'ld' &&
                                prev.operands.length === 2 &&
                                prev.operands[0].type === targetType &&
                                String(prev.operands[0].value).toLowerCase() === targetValue &&
                                prev.operands[1].type === 'immediate' &&
                                prev.operands[1].value === immValue) {
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += getInstructionSize(token);
                                optimizerLog(`  Removed short-range duplicate LD ${targetValue.toUpperCase()},${immValue} at line ${token.lineNumber}`, 'debug');
                                removedDuplicate = true;
                                break;
                            }
                        }

                        if (removedDuplicate) {
                            continue;
                        }
                    }

                    // Short-range duplicate register-to-register load elimination:
                    //   ld dst,src
                    //   [small run that does not rewrite dst or src]
                    //   ld dst,src
                    // -> second load is redundant. LD r,r does not affect flags.
                    if (this.config.localValueReuse &&
                        mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'register' &&
                        !token.label) {
                        const dstReg = String(token.operands[0].value).toLowerCase();
                        const srcReg = String(token.operands[1].value).toLowerCase();
                        let removedDuplicateRegLoad = false;

                        if (isPlain8BitRegisterName(dstReg) &&
                            isPlain8BitRegisterName(srcReg) &&
                            dstReg !== srcReg) {
                            for (let back = optimized.length - 1, scanned = 0; back >= 0 && scanned < SHORT_LOCAL_REUSE_WINDOW; back--, scanned++) {
                                const prev = optimized[back];
                                if (!(prev instanceof Instruction)) continue;
                                if (prev.label || isLocalAnalysisBarrier(prev)) break;
                                if (prev.mnemonic.toLowerCase() === 'ld' &&
                                    prev.operands.length === 2 &&
                                    prev.operands[0].type === 'register' &&
                                    prev.operands[1].type === 'register' &&
                                    String(prev.operands[0].value).toLowerCase() === dstReg &&
                                    String(prev.operands[1].value).toLowerCase() === srcReg) {
                                    this.stats.peepholeOpts++;
                                    this.stats.bytesSaved += getInstructionSize(token);
                                    optimizerLog(`  Removed short-range duplicate LD ${dstReg.toUpperCase()},${srcReg.toUpperCase()} at line ${token.lineNumber}`, 'debug');
                                    removedDuplicateRegLoad = true;
                                    break;
                                }
                                if (this.instructionWritesRegister(prev, dstReg) || this.instructionWritesRegister(prev, srcReg)) break;
                            }
                        }

                        if (removedDuplicateRegLoad) {
                            continue;
                        }
                    }
                    // Fold:
                    //   ld rr,nn
                    //   ld a,rLow
                    //   ld (sym+0),a
                    //   ld a,rHigh
                    //   ld (sym+1),a
                    // -> ld rr,nn / ld (sym),rr
                    if (this.config.hazardousValueReuse &&
                        mnem === 'ld' && i + 4 < tokens.length && token.operands.length === 2) {
                        const t2 = tokens[i + 1];
                        const t3 = tokens[i + 2];
                        const t4 = tokens[i + 3];
                        const t5 = tokens[i + 4];
                        if (t2 instanceof Instruction &&
                            t3 instanceof Instruction &&
                            t4 instanceof Instruction &&
                            t5 instanceof Instruction &&
                            !t2.label &&
                            !t3.label &&
                            !t4.label &&
                            !t5.label &&
                            token.operands[0].type === 'register_pair' &&
                            token.operands[1].type === 'immediate' &&
                            t2.mnemonic.toLowerCase() === 'ld' &&
                            t2.operands.length === 2 &&
                            t2.operands[0].type === 'register' &&
                            String(t2.operands[0].value).toLowerCase() === 'a' &&
                            t2.operands[1].type === 'register' &&
                            isLdMemA(t3) &&
                            t4.mnemonic.toLowerCase() === 'ld' &&
                            t4.operands.length === 2 &&
                            t4.operands[0].type === 'register' &&
                            String(t4.operands[0].value).toLowerCase() === 'a' &&
                            t4.operands[1].type === 'register' &&
                            isLdMemA(t5)) {
                            const pairName = String(token.operands[0].value).toLowerCase();
                            const pairMap = {
                                bc: { low: 'c', high: 'b' },
                                de: { low: 'e', high: 'd' },
                                hl: { low: 'l', high: 'h' }
                            };
                            const pairInfo = pairMap[pairName];
                            const leftTarget = parseSymbolOffset(t3.operands[0].value);
                            const rightTarget = parseSymbolOffset(t5.operands[0].value);
                            if (pairInfo &&
                                String(t2.operands[1].value).toLowerCase() === pairInfo.low &&
                                String(t4.operands[1].value).toLowerCase() === pairInfo.high &&
                                leftTarget &&
                                rightTarget &&
                                leftTarget.base === rightTarget.base &&
                                leftTarget.offset === 0 &&
                                rightTarget.offset === 1) {
                                optimized.push(token);
                                optimized.push(new Instruction(
                                    null,
                                    'ld',
                                    [
                                        new Operand('memory', leftTarget.base),
                                        new Operand('register_pair', pairName)
                                    ],
                                    t3.lineNumber,
                                    t3.sourceLine
                                ));
                                i += 4;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 5;
                                optimizerLog(`  Folded LD ${pairName.toUpperCase()},nn / byte stores into LD (${leftTarget.base}),${pairName.toUpperCase()} at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // Fold:
                    //   ld a,rLow
                    //   ld (sym+0),a
                    //   ld a,rHigh
                    //   ld (sym+1),a
                    //   [ld rr,(sym)]
                    // -> ld (sym),rr
                    if (this.config.hazardousValueReuse &&
                        mnem === 'ld' && i + 3 < tokens.length && token.operands.length === 2) {
                        const t2 = tokens[i + 1];
                        const t3 = tokens[i + 2];
                        const t4 = tokens[i + 3];
                        const t5 = i + 4 < tokens.length ? tokens[i + 4] : null;
                        if (t2 instanceof Instruction &&
                            t3 instanceof Instruction &&
                            t4 instanceof Instruction &&
                            !t2.label &&
                            !t3.label &&
                            !t4.label &&
                            token.operands[0].type === 'register' &&
                            String(token.operands[0].value).toLowerCase() === 'a' &&
                            token.operands[1].type === 'register' &&
                            isLdMemA(t2) &&
                            t3.mnemonic.toLowerCase() === 'ld' &&
                            t3.operands.length === 2 &&
                            t3.operands[0].type === 'register' &&
                            String(t3.operands[0].value).toLowerCase() === 'a' &&
                            t3.operands[1].type === 'register' &&
                            isLdMemA(t4)) {
                            const regLow = String(token.operands[1].value).toLowerCase();
                            const regHigh = String(t3.operands[1].value).toLowerCase();
                            const pairByRegs = {
                                'c:b': 'bc',
                                'e:d': 'de',
                                'l:h': 'hl'
                            };
                            const pairName = pairByRegs[`${regLow}:${regHigh}`];
                            const leftTarget = parseSymbolOffset(t2.operands[0].value);
                            const rightTarget = parseSymbolOffset(t4.operands[0].value);
                            const hasImmediateReload = t5 instanceof Instruction &&
                                !t5.label &&
                                t5.mnemonic.toLowerCase() === 'ld' &&
                                t5.operands.length === 2 &&
                                t5.operands[0].type === 'register_pair' &&
                                String(t5.operands[0].value).toLowerCase() === pairName &&
                                t5.operands[1].type === 'memory' &&
                                String(t5.operands[1].value) === leftTarget?.base;
                            if (pairName &&
                                leftTarget &&
                                rightTarget &&
                                leftTarget.base === rightTarget.base &&
                                leftTarget.offset === 0 &&
                                rightTarget.offset === 1) {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [
                                        new Operand('memory', leftTarget.base),
                                        new Operand('register_pair', pairName)
                                    ],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                i += hasImmediateReload ? 4 : 3;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += hasImmediateReload ? 7 : 5;
                                optimizerLog(`  Folded split-byte ${pairName.toUpperCase()} store${hasImmediateReload ? ' and removed immediate reload' : ''} at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // LD A,n followed by LD A,m → keep second only
                    if (mnem === 'ld' && i + 1 < tokens.length && token.operands.length === 2) {
                        const next = tokens[i + 1];

                        if (next instanceof Instruction &&
                            next.mnemonic.toLowerCase() === 'ld' &&
                            next.operands.length === 2) {

                            const dest1 = token.operands[0];
                            const dest2 = next.operands[0];

                            // Same destination register?
                            if (dest1.type === 'register' &&
                                dest2.type === 'register' &&
                                dest1.value.toLowerCase() === dest2.value.toLowerCase()) {

                                const src1 = token.operands[1];
                                const src2 = next.operands[1];

                                // Both immediate loads?
                                // Guard: skip if the first LD carries a label (it may be a
                                // jump target; removing it would orphan the label).
                                if (src1.type === 'immediate' && src2.type === 'immediate' && !token.label) {
                                    // First load is redundant, skip it
                                    this.stats.peepholeOpts++;
                                    this.stats.bytesSaved += 2;
                                    optimizerLog(`  Removed redundant LD ${dest1.value.toUpperCase()},${src1.value} at line ${token.lineNumber}`, 'debug');
                                    continue; // Skip first LD
                                }
                            }
                        }
                    }

                    // === PHASE 1.3: INC/DEC Cancellation ===
                    // INC rr followed by DEC rr → remove both (16-bit pairs only).
                    // 8-bit INC/DEC set S, Z, H, P/V flags; canceling them would change
                    // the flags visible to following code.  16-bit INC/DEC leave all flags
                    // unchanged, so the pair is always a true no-op.
                    if (['inc', 'dec'].includes(mnem) && i + 1 < tokens.length && token.operands.length === 1) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction && next.operands.length === 1) {
                            const nextMnem = next.mnemonic.toLowerCase();
                            const opposite = mnem === 'inc' ? 'dec' : 'inc';

                            if (nextMnem === opposite) {
                                const op1 = token.operands[0];
                                const op2 = next.operands[0];

                                // Only cancel 16-bit register pairs (flags unaffected).
                                const sixteenBitRegs = new Set(['bc', 'de', 'hl', 'sp', 'ix', 'iy']);
                                if (op1.type === op2.type &&
                                    op1.value === op2.value &&
                                    sixteenBitRegs.has(op1.value.toLowerCase()) &&
                                    !token.label && !next.label) {
                                    // Remove both instructions
                                    i++; // Skip next instruction
                                    this.stats.peepholeOpts++;
                                    this.stats.bytesSaved += 2; // 1 byte each (or 2 for IX/IY)
                                    optimizerLog(`  Removed ${mnem.toUpperCase()}/${opposite.toUpperCase()} pair at line ${token.lineNumber}`, 'debug');
                                    continue;
                                }
                            }
                        }
                    }

                    // === PHASE 1.3z: exact local byte-load cleanups ===
                    if (mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'immediate' &&
                        i + 1 < tokens.length) {
                        const next = tokens[i + 1];
                        const destReg = String(token.operands[0].value).toLowerCase();
                        const imm8 = Number(token.operands[1].value) & 0xFF;

                        // LD B,0; XOR A -> XOR A; LD B,A. Same final A/B/flags, one byte shorter.
                        if (!token.label && destReg === 'b' && imm8 === 0 &&
                            next instanceof Instruction &&
                            !next.label &&
                            next.mnemonic.toLowerCase() === 'xor' &&
                            next.operands.length === 1 &&
                            next.operands[0].type === 'register' &&
                            String(next.operands[0].value).toLowerCase() === 'a') {
                            optimized.push(new Instruction(token.label, 'xor', [new Operand('register', 'a')], token.lineNumber, token.sourceLine));
                            optimized.push(new Instruction(null, 'ld', [new Operand('register', 'b'), new Operand('register', 'a')], next.lineNumber, next.sourceLine));
                            i++;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Reordered LD B,0/XOR A into XOR A/LD B,A at line ${token.lineNumber}`, 'debug');
                            continue;
                        }

                        // LD high,n; LD low,m -> LD pair,nn. LDs do not affect flags.
                        const pairParts = { b: ['bc', 'c'], d: ['de', 'e'], h: ['hl', 'l'] };
                        const pairInfo = pairParts[destReg];
                        if (pairInfo &&
                            next instanceof Instruction &&
                            !next.label &&
                            next.mnemonic.toLowerCase() === 'ld' &&
                            next.operands.length === 2 &&
                            next.operands[0].type === 'register' &&
                            next.operands[1].type === 'immediate' &&
                            String(next.operands[0].value).toLowerCase() === pairInfo[1]) {
                            const low8 = Number(next.operands[1].value) & 0xFF;
                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register_pair', pairInfo[0]), new Operand('immediate', ((imm8 << 8) | low8) & 0xFFFF)],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            i++;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Folded LD ${destReg.toUpperCase()},n / LD ${pairInfo[1].toUpperCase()},m into LD ${pairInfo[0].toUpperCase()},nn at line ${token.lineNumber}`, 'debug');
                            continue;
                        }

                        // LD high,n; neutral LD A,...; LD low,m -> LD pair,nn; neutral LD A,...
                        if (pairInfo && i + 2 < tokens.length) {
                            const mid = tokens[i + 1];
                            const after = tokens[i + 2];
                            const midIsNeutralLoadA = mid instanceof Instruction &&
                                !mid.label &&
                                mid.mnemonic.toLowerCase() === 'ld' &&
                                mid.operands.length === 2 &&
                                mid.operands[0].type === 'register' &&
                                String(mid.operands[0].value).toLowerCase() === 'a' &&
                                !instructionCanClobberRegister(mid, pairInfo[0]);
                            if (midIsNeutralLoadA &&
                                after instanceof Instruction &&
                                !after.label &&
                                after.mnemonic.toLowerCase() === 'ld' &&
                                after.operands.length === 2 &&
                                after.operands[0].type === 'register' &&
                                after.operands[1].type === 'immediate' &&
                                String(after.operands[0].value).toLowerCase() === pairInfo[1]) {
                                const low8 = Number(after.operands[1].value) & 0xFF;
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register_pair', pairInfo[0]), new Operand('immediate', ((imm8 << 8) | low8) & 0xFFFF)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                optimized.push(mid);
                                i += 2;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 1;
                                optimizerLog(`  Folded split LD ${destReg.toUpperCase()}/${pairInfo[1].toUpperCase()} into LD ${pairInfo[0].toUpperCase()},nn at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // Consecutive identical HL reloads are pure duplicates.
                    if (mnem === 'ld' && i + 1 < tokens.length) {
                        const next = tokens[i + 1];
                        if (isSameHlReload(token, next) && !next.label) {
                            optimized.push(token);
                            i++;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(next);
                            optimizerLog(`  Removed consecutive duplicate LD HL at line ${next.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Delayed identical HL reloads are redundant when every instruction
                    // in between uses (HL) without changing HL itself.
                    if (mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register_pair' &&
                        String(token.operands[0].value).toLowerCase() === 'hl' &&
                        !token.label) {
                        const buffered = [];
                        let duplicateIndex = -1;
                        for (let j = i + 1; j < tokens.length && j <= i + SHORT_LOCAL_REUSE_WINDOW; j++) {
                            const mid = tokens[j];
                            if (!(mid instanceof Instruction) || mid.label) break;
                            if (isSameHlReload(token, mid)) {
                                duplicateIndex = j;
                                break;
                            }
                            if (isLocalAnalysisBarrier(mid) || !usesHlMemoryWithoutChangingHl(mid)) break;
                            buffered.push(mid);
                        }
                        if (duplicateIndex !== -1 && buffered.length > 0) {
                            optimized.push(token);
                            for (const mid of buffered) optimized.push(mid);
                            i = duplicateIndex;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(tokens[duplicateIndex]);
                            optimizerLog(`  Removed delayed duplicate LD HL at line ${tokens[duplicateIndex].lineNumber}`, 'debug');
                            continue;
                        }
                    }
                    // Dead address setup in direct zero-store codegen:
                    //   LD HL,sym; XOR A; LD (sym),A
                    // The direct store does not read HL. Remove the setup only if HL is
                    // overwritten by plain straight-line code before any later read.
                    if (mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register_pair' &&
                        String(token.operands[0].value).toLowerCase() === 'hl' &&
                        token.operands[1].type === 'symbol' &&
                        !token.label &&
                        i + 2 < tokens.length) {
                        const t1 = tokens[i + 1];
                        const t2 = tokens[i + 2];
                        if (t1 instanceof Instruction && t2 instanceof Instruction &&
                            !t1.label && !t2.label &&
                            t1.mnemonic.toLowerCase() === 'xor' &&
                            t1.operands.length === 1 &&
                            t1.operands[0].type === 'register' &&
                            String(t1.operands[0].value).toLowerCase() === 'a' &&
                            isLdMemA(t2, token.operands[1].value)) {
                            let hlOverwritten = false;
                            for (let j = i + 3; j < tokens.length && j <= i + SHORT_LOCAL_REUSE_WINDOW; j++) {
                                const look = tokens[j];
                                if (!(look instanceof Instruction) || look.label || isLocalAnalysisBarrier(look)) break;
                                if (this.instructionFullyOverwritesRegister(look, 'hl')) {
                                    hlOverwritten = true;
                                    break;
                                }
                                if (instructionTouchesRegister(look, 'hl')) break;
                            }
                            if (hlOverwritten) {
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += getInstructionSize(token);
                                optimizerLog(`  Removed unused direct-store LD HL at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // Exact absdiff constant compare staging. Preserve A from the left operand.
                    if (isLdAFromMem(token) && i + 4 < tokens.length) {
                        const t1 = tokens[i + 1];
                        const t2 = tokens[i + 2];
                        const t3 = tokens[i + 3];
                        const t4 = tokens[i + 4];
                        if ([t1, t2, t3, t4].every(t => t instanceof Instruction && !t.label) &&
                            t1.mnemonic.toLowerCase() === 'push' && t1.operands.length === 1 &&
                            t1.operands[0].type === 'register_pair' && String(t1.operands[0].value).toLowerCase() === 'af' &&
                            t2.mnemonic.toLowerCase() === 'ld' && t2.operands.length === 2 &&
                            t2.operands[0].type === 'register' && String(t2.operands[0].value).toLowerCase() === 'a' &&
                            ['immediate', 'symbol'].includes(t2.operands[1].type) &&
                            t3.mnemonic.toLowerCase() === 'ld' && t3.operands.length === 2 &&
                            t3.operands[0].type === 'register' && String(t3.operands[0].value).toLowerCase() === 'b' &&
                            t3.operands[1].type === 'register' && String(t3.operands[1].value).toLowerCase() === 'a' &&
                            t4.mnemonic.toLowerCase() === 'pop' && t4.operands.length === 1 &&
                            t4.operands[0].type === 'register_pair' && String(t4.operands[0].value).toLowerCase() === 'af') {
                            const after = tokens[i + 5];
                            if (after instanceof Instruction && !after.label &&
                                after.mnemonic.toLowerCase() === 'cp' && after.operands.length === 1 &&
                                after.operands[0].type === 'register' && String(after.operands[0].value).toLowerCase() === 'b') {
                                optimized.push(token);
                                optimized.push(new Instruction(t2.label, 'ld', [new Operand('register', 'b'), t2.operands[1]], t2.lineNumber, t2.sourceLine));
                                optimized.push(after);
                                i += 5;
                                this.stats.peepholeOpts += 2;
                                this.stats.bytesSaved += getInstructionSize(t1) + getInstructionSize(t4) + 1;
                                optimizerLog(`  Folded absdiff constant compare staging at line ${t1.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // U8-to-16 staging: second LD H,0 is redundant if H is still known zero.
                    if (isLdRegImm(token, 'h') &&
                        !token.label &&
                        (Number(token.operands[1].value) & 0xFF) === 0 &&
                        i >= 4) {
                        const p1 = tokens[i - 1];
                        const p2 = tokens[i - 2];
                        const p3 = tokens[i - 3];
                        const p4 = tokens[i - 4];
                        if (p1 instanceof Instruction && p2 instanceof Instruction && p3 instanceof Instruction && p4 instanceof Instruction &&
                            !p1.label && !p2.label && !p3.label && !p4.label &&
                            p1.mnemonic.toLowerCase() === 'ld' && p1.operands.length === 2 &&
                            p1.operands[0].type === 'register' && String(p1.operands[0].value).toLowerCase() === 'l' &&
                            p1.operands[1].type === 'register' && String(p1.operands[1].value).toLowerCase() === 'a' &&
                            p2.mnemonic.toLowerCase() === 'ld' && p2.operands.length === 2 &&
                            p2.operands[0].type === 'register' && String(p2.operands[0].value).toLowerCase() === 'a' &&
                            p3.mnemonic.toLowerCase() === 'push' && p3.operands.length === 1 &&
                            p3.operands[0].type === 'register_pair' && String(p3.operands[0].value).toLowerCase() === 'hl' &&
                            isLdRegImm(p4, 'h') && (Number(p4.operands[1].value) & 0xFF) === 0) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(token);
                            optimizerLog(`  Removed redundant second LD H,0 at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Exact compare staging: LD A,(HL); LD D,A; LD E,n; LD A,D; CP E.
                    // Remove the D round-trip only when D is dead after the compare.
                    if (isLdAFromHlMemory(token) && i + 4 < tokens.length) {
                        const t1 = tokens[i + 1];
                        const t2 = tokens[i + 2];
                        const t3 = tokens[i + 3];
                        const t4 = tokens[i + 4];
                        if ([t1, t2, t3, t4].every(t => t instanceof Instruction && !t.label) &&
                            t1.mnemonic.toLowerCase() === 'ld' && t1.operands.length === 2 &&
                            t1.operands[0].type === 'register' && String(t1.operands[0].value).toLowerCase() === 'd' &&
                            t1.operands[1].type === 'register' && String(t1.operands[1].value).toLowerCase() === 'a' &&
                            t2.mnemonic.toLowerCase() === 'ld' && t2.operands.length === 2 &&
                            t2.operands[0].type === 'register' && String(t2.operands[0].value).toLowerCase() === 'e' &&
                            t2.operands[1].type === 'immediate' &&
                            t3.mnemonic.toLowerCase() === 'ld' && t3.operands.length === 2 &&
                            t3.operands[0].type === 'register' && String(t3.operands[0].value).toLowerCase() === 'a' &&
                            t3.operands[1].type === 'register' && String(t3.operands[1].value).toLowerCase() === 'd' &&
                            t4.mnemonic.toLowerCase() === 'cp' && t4.operands.length === 1 &&
                            t4.operands[0].type === 'register' && String(t4.operands[0].value).toLowerCase() === 'e' &&
                            isDeadOrClobberedBeforeAnyReadInBlock(tokens, i + 4, 'd')) {
                            optimized.push(token);
                            optimized.push(t2);
                            optimized.push(t4);
                            i += 4;
                            this.stats.peepholeOpts += 2;
                            this.stats.bytesSaved += getInstructionSize(t1) + getInstructionSize(t3);
                            optimizerLog(`  Removed dead D compare staging at line ${t1.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.4: remove dead CP 0 when flags are provably dead ===
                    // CP 0 only affects flags. If no later instruction reads those flags
                    // before a full overwrite or block exit, the compare is dead.
                    if (this.config.deadCp0Removal &&
                        mnem === 'cp' && token.operands.length === 1) {
                        const operand = token.operands[0];

                        if (operand.type === 'immediate' &&
                            operand.value === 0 &&
                            !token.label &&
                            this.areFlagsDeadBeforeNextUse(tokens, i)) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Removed dead CP 0 at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.4a: CP 0 -> OR A before simple Z/C flag tests ===
                    // CP 0 and OR A both preserve A, set Z from A, and clear C. They do
                    // not agree on every flag (notably N/H/PV), so only fold when the
                    // very next instruction consumes Z/NZ/C/NC directly.
                    if (mnem === 'cp' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'immediate' &&
                        Number(token.operands[0].value) === 0 &&
                        !token.label &&
                        i + 1 < tokens.length) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction &&
                            !next.label &&
                            ['z', 'nz', 'c', 'nc'].includes(getBranchConditionName(next))) {
                            optimized.push(new Instruction(
                                token.label,
                                'or',
                                [new Operand('register', 'a')],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Replaced CP 0 with OR A before ${next.mnemonic.toUpperCase()} ${next.operands[0].value.toUpperCase()} at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.4b: Replace +/- 1 arithmetic with INC/DEC when Carry is dead ===
                    // SUB 1 and DEC A differ only in carry behavior; ADD A,1 and INC A
                    // have the same caveat. Fold only when carry is provably overwritten
                    // or unreachable before any carry consumer.
                    if (this.config.flagLivenessPeepholes &&
                        !token.label &&
                        this.isCarryDeadBeforeNextUse(tokens, i)) {
                        if (mnem === 'sub' &&
                            token.operands.length === 1 &&
                            token.operands[0].type === 'immediate' &&
                            Number(token.operands[0].value) === 1) {
                            optimized.push(new Instruction(
                                token.label,
                                'dec',
                                [new Operand('register', 'a')],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Replaced SUB 1 with DEC A after proving carry dead at line ${token.lineNumber}`, 'debug');
                            continue;
                        }

                        if (mnem === 'add' &&
                            token.operands.length === 2 &&
                            token.operands[0].type === 'register' &&
                            token.operands[0].value.toLowerCase() === 'a' &&
                            token.operands[1].type === 'immediate' &&
                            Number(token.operands[1].value) === 1) {
                            optimized.push(new Instruction(
                                token.label,
                                'inc',
                                [new Operand('register', 'a')],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Replaced ADD A,1 with INC A after proving carry dead at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5: Fold PUSH AF / LD A,n / LD B,A / POP AF / ALU B ===
                    // Generic int8 expression lowering often preserves the left operand in A
                    // while loading a constant RHS through A and then copying it to B:
                    //   push af / ld a,n / ld b,a / pop af / op b
                    // This can be folded safely to the immediate form of the ALU op.
                    // Do not fold SUB 1 -> DEC A or ADD A,1 -> INC A here because those
                    // instructions do not preserve the same carry-flag behaviour on Z80.
                    // A narrower generic case is also useful for SUB:
                    //   push af / ld a,src / ld b,a / pop af / sub b -> ld b,src / sub b
                    // Keep this conservative and only fold when src is a plain operand that
                    // LD A,src can mirror directly as LD B,src.
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[0].value.toLowerCase() === 'af' &&
                        i + 4 < tokens.length) {
                        const loadA = tokens[i + 1];
                        const copyToB = tokens[i + 2];
                        const popAf = tokens[i + 3];
                        const aluOp = tokens[i + 4];

                        if (loadA instanceof Instruction &&
                            copyToB instanceof Instruction &&
                            popAf instanceof Instruction &&
                            aluOp instanceof Instruction &&
                            !loadA.label && !copyToB.label && !popAf.label && !aluOp.label &&
                            loadA.mnemonic.toLowerCase() === 'ld' &&
                            loadA.operands.length === 2 &&
                            loadA.operands[0].type === 'register' &&
                            loadA.operands[0].value.toLowerCase() === 'a' &&
                            copyToB.mnemonic.toLowerCase() === 'ld' &&
                            copyToB.operands.length === 2 &&
                            copyToB.operands[0].type === 'register' &&
                            copyToB.operands[0].value.toLowerCase() === 'b' &&
                            copyToB.operands[1].type === 'register' &&
                            copyToB.operands[1].value.toLowerCase() === 'a' &&
                            popAf.mnemonic.toLowerCase() === 'pop' &&
                            popAf.operands.length === 1 &&
                            popAf.operands[0].type === 'register_pair' &&
                            popAf.operands[0].value.toLowerCase() === 'af') {

                            const aluMnem = aluOp.mnemonic.toLowerCase();
                            let replacement = null;

                            if (loadA.operands[1].type === 'immediate') {
                                const immOperand = new Operand('immediate', loadA.operands[1].value);

                                if ((aluMnem === 'sub' || aluMnem === 'and' || aluMnem === 'or' || aluMnem === 'xor' || aluMnem === 'cp') &&
                                    aluOp.operands.length === 1 &&
                                    aluOp.operands[0].type === 'register' &&
                                    aluOp.operands[0].value.toLowerCase() === 'b') {
                                    replacement = new Instruction(token.label, aluMnem, [immOperand], token.lineNumber, '');
                                } else if ((aluMnem === 'add' || aluMnem === 'adc' || aluMnem === 'sbc') &&
                                    aluOp.operands.length === 2 &&
                                    aluOp.operands[0].type === 'register' &&
                                    aluOp.operands[0].value.toLowerCase() === 'a' &&
                                    aluOp.operands[1].type === 'register' &&
                                    aluOp.operands[1].value.toLowerCase() === 'b') {
                                    replacement = new Instruction(
                                        token.label,
                                        aluMnem,
                                        [new Operand('register', 'a'), immOperand],
                                        token.lineNumber,
                                        ''
                                    );
                                }

                                if (replacement) {
                                    optimized.push(replacement);
                                    i += 4;
                                    this.stats.peepholeOpts++;
                                    this.stats.bytesSaved += 4;
                                    optimizerLog(`  Folded PUSH/LD/LD/POP/${aluMnem.toUpperCase()} B to immediate form at line ${token.lineNumber}`, 'debug');
                                    continue;
                                }
                            }

                            const mirroredSource = loadA.operands[1];
                            const canMirrorLdAToB =
                                mirroredSource.type === 'register' ||
                                (mirroredSource.type === 'memory' && String(mirroredSource.value).toLowerCase() === 'hl');
                            if (canMirrorLdAToB &&
                                aluMnem === 'sub' &&
                                aluOp.operands.length === 1 &&
                                aluOp.operands[0].type === 'register' &&
                                aluOp.operands[0].value.toLowerCase() === 'b' &&
                                !instructionTouchesRegister(loadA, 'b')) {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register', 'b'), new Operand(loadA.operands[1].type, loadA.operands[1].value)],
                                    token.lineNumber,
                                    ''
                                ));
                                optimized.push(new Instruction(aluOp.label, 'sub', [new Operand('register', 'b')], aluOp.lineNumber, aluOp.sourceLine));
                                i += 4;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 3;
                                optimizerLog(`  Folded PUSH/LD A,src/LD B,A/POP AF/SUB B into LD B,src/SUB B at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5b: Fold self-add-by-1 storeback to INC (HL) ===
                    // Amy often emits byte increments as:
                    //   ld a,(var)
                    //   ld b,a
                    //   ld a,1
                    //   add a,b
                    //   ld (var),a
                    // This is equivalent to:
                    //   ld hl,var
                    //   inc (hl)
                    // Preserve semantics only for the +1 case and only when the same
                    // memory cell is loaded then stored back with no labels in between.
                    if (this.config.hazardousValueReuse &&
                        mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].type === 'memory' &&
                        typeof token.operands[1].value === 'string' &&
                        i + 4 < tokens.length) {
                        const copyToB = tokens[i + 1];
                        const loadOne = tokens[i + 2];
                        const addAB = tokens[i + 3];
                        const storeBack = tokens[i + 4];

                        if (!parseIndexedDisplacement(token.operands[1].value) &&
                            copyToB instanceof Instruction &&
                            loadOne instanceof Instruction &&
                            addAB instanceof Instruction &&
                            storeBack instanceof Instruction &&
                            !copyToB.label && !loadOne.label && !addAB.label && !storeBack.label &&
                            copyToB.mnemonic.toLowerCase() === 'ld' &&
                            copyToB.operands.length === 2 &&
                            copyToB.operands[0].type === 'register' &&
                            copyToB.operands[0].value.toLowerCase() === 'b' &&
                            copyToB.operands[1].type === 'register' &&
                            copyToB.operands[1].value.toLowerCase() === 'a' &&
                            loadOne.mnemonic.toLowerCase() === 'ld' &&
                            loadOne.operands.length === 2 &&
                            loadOne.operands[0].type === 'register' &&
                            loadOne.operands[0].value.toLowerCase() === 'a' &&
                            loadOne.operands[1].type === 'immediate' &&
                            loadOne.operands[1].value === 1 &&
                            addAB.mnemonic.toLowerCase() === 'add' &&
                            addAB.operands.length === 2 &&
                            addAB.operands[0].type === 'register' &&
                            addAB.operands[0].value.toLowerCase() === 'a' &&
                            addAB.operands[1].type === 'register' &&
                            addAB.operands[1].value.toLowerCase() === 'b' &&
                            storeBack.mnemonic.toLowerCase() === 'ld' &&
                            storeBack.operands.length === 2 &&
                            storeBack.operands[0].type === 'memory' &&
                            typeof storeBack.operands[0].value === 'string' &&
                            storeBack.operands[1].type === 'register' &&
                            storeBack.operands[1].value.toLowerCase() === 'a' &&
                            storeBack.operands[0].value === token.operands[1].value) {

                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register_pair', 'hl'), new Operand('symbol', token.operands[1].value)],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            optimized.push(new Instruction(
                                null,
                                'inc',
                                [new Operand('memory', 'hl')],
                                addAB.lineNumber,
                                addAB.sourceLine
                            ));
                            i += 4;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 6;
                            optimizerLog(`  Folded LD/LD/LD/ADD/LD self-increment into LD HL,symbol / INC (HL) at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5c: Fold self-add-by-immediate storeback ===
                    // General byte pattern:
                    //   ld a,(var)
                    //   ld b,a
                    //   ld a,n
                    //   add a,b
                    //   ld (var),a
                    // can be rewritten as:
                    //   ld hl,var
                    //   ld a,n
                    //   add a,(hl)
                    //   ld (hl),a
                    // This is smaller and preserves the ADD flags.
                    if (this.config.hazardousValueReuse &&
                        mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].type === 'memory' &&
                        typeof token.operands[1].value === 'string' &&
                        i + 4 < tokens.length) {
                        const copyToB = tokens[i + 1];
                        const loadImm = tokens[i + 2];
                        const addAB = tokens[i + 3];
                        const storeBack = tokens[i + 4];

                        if (!parseIndexedDisplacement(token.operands[1].value) &&
                            copyToB instanceof Instruction &&
                            loadImm instanceof Instruction &&
                            addAB instanceof Instruction &&
                            storeBack instanceof Instruction &&
                            !copyToB.label && !loadImm.label && !addAB.label && !storeBack.label &&
                            copyToB.mnemonic.toLowerCase() === 'ld' &&
                            copyToB.operands.length === 2 &&
                            copyToB.operands[0].type === 'register' &&
                            copyToB.operands[0].value.toLowerCase() === 'b' &&
                            copyToB.operands[1].type === 'register' &&
                            copyToB.operands[1].value.toLowerCase() === 'a' &&
                            loadImm.mnemonic.toLowerCase() === 'ld' &&
                            loadImm.operands.length === 2 &&
                            loadImm.operands[0].type === 'register' &&
                            loadImm.operands[0].value.toLowerCase() === 'a' &&
                            loadImm.operands[1].type === 'immediate' &&
                            addAB.mnemonic.toLowerCase() === 'add' &&
                            addAB.operands.length === 2 &&
                            addAB.operands[0].type === 'register' &&
                            addAB.operands[0].value.toLowerCase() === 'a' &&
                            addAB.operands[1].type === 'register' &&
                            addAB.operands[1].value.toLowerCase() === 'b' &&
                            storeBack.mnemonic.toLowerCase() === 'ld' &&
                            storeBack.operands.length === 2 &&
                            storeBack.operands[0].type === 'memory' &&
                            typeof storeBack.operands[0].value === 'string' &&
                            storeBack.operands[1].type === 'register' &&
                            storeBack.operands[1].value.toLowerCase() === 'a' &&
                            storeBack.operands[0].value === token.operands[1].value) {

                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register_pair', 'hl'), new Operand('symbol', token.operands[1].value)],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            optimized.push(new Instruction(
                                null,
                                'ld',
                                [new Operand('register', 'a'), new Operand('immediate', loadImm.operands[1].value)],
                                loadImm.lineNumber,
                                loadImm.sourceLine
                            ));
                            optimized.push(new Instruction(
                                null,
                                'add',
                                [new Operand('register', 'a'), new Operand('memory', 'hl')],
                                addAB.lineNumber,
                                addAB.sourceLine
                            ));
                            optimized.push(new Instruction(
                                null,
                                'ld',
                                [new Operand('memory', 'hl'), new Operand('register', 'a')],
                                storeBack.lineNumber,
                                storeBack.sourceLine
                            ));
                            i += 4;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 3;
                            optimizerLog(`  Folded LD/LD/LD/ADD/LD self-add-immediate into HL-memory form at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5d: Fold LD A,(mem) / INC|DEC A / LD (mem),A ===
                    // Common in numeric helper code:
                    //   ld a,(symbol)
                    //   inc a
                    //   ld (symbol),a
                    // can be rewritten as:
                    //   ld hl,symbol
                    //   inc (hl)
                    // and likewise for DEC.
                    if (this.config.hazardousValueReuse &&
                        mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].type === 'memory' &&
                        typeof token.operands[1].value === 'string' &&
                        i + 2 < tokens.length) {
                        const incDecA = tokens[i + 1];
                        const storeBack = tokens[i + 2];

                        if (!parseIndexedDisplacement(token.operands[1].value) &&
                            incDecA instanceof Instruction &&
                            storeBack instanceof Instruction &&
                            !incDecA.label && !storeBack.label &&
                            (incDecA.mnemonic.toLowerCase() === 'inc' || incDecA.mnemonic.toLowerCase() === 'dec') &&
                            incDecA.operands.length === 1 &&
                            incDecA.operands[0].type === 'register' &&
                            incDecA.operands[0].value.toLowerCase() === 'a' &&
                            storeBack.mnemonic.toLowerCase() === 'ld' &&
                            storeBack.operands.length === 2 &&
                            storeBack.operands[0].type === 'memory' &&
                            typeof storeBack.operands[0].value === 'string' &&
                            storeBack.operands[1].type === 'register' &&
                            storeBack.operands[1].value.toLowerCase() === 'a' &&
                            storeBack.operands[0].value === token.operands[1].value) {

                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register_pair', 'hl'), new Operand('symbol', token.operands[1].value)],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            optimized.push(new Instruction(
                                null,
                                incDecA.mnemonic.toLowerCase(),
                                [new Operand('memory', 'hl')],
                                incDecA.lineNumber,
                                incDecA.sourceLine
                            ));
                            i += 2;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 3;
                            optimizerLog(`  Folded LD/INC|DEC/LD self-update into LD HL,symbol / ${incDecA.mnemonic.toUpperCase()} (HL) at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // NOTE: Do not fold "bit 7,a" sign tests into RLA-based branches.
                    // Although the branch condition can be mapped to carry, RLA mutates A
                    // while BIT does not. That makes the rewrite globally unsafe in math
                    // helpers and other code paths that rely on A remaining unchanged.

                    // === PHASE 1.5f: Fold LD A,src / LD dst,A into direct LD dst,src ===
                    // Common register shuffle patterns in numeric helpers:
                    //   ld a,h
                    //   ld l,a
                    // become:
                    //   ld l,h
                    // Same for other 8-bit registers, excluding A as destination.
                    if (mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].type === 'register' &&
                        this.isRegisterDeadBeforeNextUse(tokens, i, 'a') &&
                        i + 1 < tokens.length) {
                        const nextToken = tokens[i + 1];
                        if (nextToken instanceof Instruction &&
                            !nextToken.label &&
                            nextToken.mnemonic.toLowerCase() === 'ld' &&
                            nextToken.operands.length === 2 &&
                            nextToken.operands[0].type === 'register' &&
                            nextToken.operands[1].type === 'register' &&
                            nextToken.operands[1].value.toLowerCase() === 'a') {
                            const srcReg = token.operands[1].value.toLowerCase();
                            const dstReg = nextToken.operands[0].value.toLowerCase();
                            if (dstReg !== 'a' && dstReg !== srcReg) {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register', dstReg), new Operand('register', srcReg)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                i += 1;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 1;
                                optimizerLog(`  Folded LD A,${srcReg.toUpperCase()} / LD ${dstReg.toUpperCase()},A into LD ${dstReg.toUpperCase()},${srcReg.toUpperCase()} at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5g: Fold LD A,n / LD r,A into LD r,n ===
                    // Example:
                    //   ld a,0
                    //   ld b,a
                    // becomes:
                    //   ld b,0
                    if (isLdRegImm(token, 'a') && i + 1 < tokens.length) {
                        const nextToken = tokens[i + 1];
                        if (nextToken instanceof Instruction &&
                            !nextToken.label &&
                            this.isRegisterDeadBeforeNextUse(tokens, i, 'a') &&
                            nextToken.mnemonic.toLowerCase() === 'ld' &&
                            nextToken.operands.length === 2 &&
                            nextToken.operands[0].type === 'register' &&
                            nextToken.operands[1].type === 'register' &&
                            nextToken.operands[1].value.toLowerCase() === 'a') {
                            const dstReg = nextToken.operands[0].value.toLowerCase();
                            if (dstReg !== 'a') {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register', dstReg), token.operands[1]],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                i += 1;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 1;
                                optimizerLog(`  Folded LD A,imm / LD ${dstReg.toUpperCase()},A into LD ${dstReg.toUpperCase()},imm at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5h: Fold LD A,(sym) / XOR n / LD (sym),A into HL-based update ===
                    // Example:
                    //   ld a,(AMY_FX16_SIGN)
                    //   xor 1
                    //   ld (AMY_FX16_SIGN),a
                    // becomes:
                    //   ld hl,AMY_FX16_SIGN
                    //   ld a,(hl)
                    //   xor 1
                    //   ld (hl),a
                    if (this.config.hazardousValueReuse &&
                        isLdAFromMem(token) &&
                        i + 2 < tokens.length) {
                        const xorToken = tokens[i + 1];
                        const storeBack = tokens[i + 2];
                        const symbolName = token.operands[1].value;
                        if (xorToken instanceof Instruction &&
                            !xorToken.label &&
                            xorToken.mnemonic.toLowerCase() === 'xor' &&
                            xorToken.operands.length === 1 &&
                            xorToken.operands[0].type === 'immediate' &&
                            typeof symbolName === 'string' &&
                            symbolName.toLowerCase() !== 'hl' &&
                            symbolName.toLowerCase() !== 'de' &&
                            symbolName.toLowerCase() !== 'bc' &&
                            !symbolName.includes('ix') &&
                            !symbolName.includes('iy') &&
                            isLdMemA(storeBack, symbolName)) {
                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register_pair', 'hl'), new Operand('symbol', symbolName)],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            optimized.push(new Instruction(
                                null,
                                'ld',
                                [new Operand('register', 'a'), new Operand('memory', 'hl')],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            optimized.push(cloneInstruction(xorToken, null));
                            optimized.push(new Instruction(
                                null,
                                'ld',
                                [new Operand('memory', 'hl'), new Operand('register', 'a')],
                                storeBack.lineNumber,
                                storeBack.sourceLine
                            ));
                            i += 2;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Folded LD/XOR/LD self-toggle on ${symbolName} into HL-based update at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Pattern: LD B,A / LD A,n / ADD A,B -> ADD A,n when B dies afterwards
                    if (mnem === 'ld' &&
                        i + 2 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'b' &&
                        String(token.operands[1].value).toLowerCase() === 'a' &&
                        !token.label) {
                        const loadImmA = tokens[i + 1];
                        const addB = tokens[i + 2];
                        if (isLdRegImm(loadImmA, 'a') &&
                            addB instanceof Instruction &&
                            !loadImmA.label &&
                            !addB.label &&
                            addB.mnemonic.toLowerCase() === 'add' &&
                            addB.operands.length === 2 &&
                            addB.operands[0].type === 'register' &&
                            String(addB.operands[0].value).toLowerCase() === 'a' &&
                            addB.operands[1].type === 'register' &&
                            String(addB.operands[1].value).toLowerCase() === 'b' &&
                            this.isRegisterDeadBeforeNextUse(tokens, i + 2, 'b')) {
                            optimized.push(new Instruction(
                                token.label,
                                'add',
                                [new Operand('register', 'a'), new Operand('immediate', loadImmA.operands[1].value)],
                                addB.lineNumber,
                                addB.sourceLine
                            ));
                            i += 2;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Folded LD B,A / LD A,imm / ADD A,B into ADD A,imm at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5h2: Fold LD A,imm / LD (IX+d),A into LD (IX+d),imm ===
                    if (isLdRegImm(token, 'a') &&
                        i + 1 < tokens.length) {
                        const nextToken = tokens[i + 1];
                        if (nextToken instanceof Instruction &&
                            !nextToken.label &&
                            nextToken.mnemonic.toLowerCase() === 'ld' &&
                            nextToken.operands.length === 2 &&
                            nextToken.operands[0].type === 'memory' &&
                            typeof nextToken.operands[0].value === 'string' &&
                            parseIndexedDisplacement(nextToken.operands[0].value) &&
                            nextToken.operands[1].type === 'register' &&
                            nextToken.operands[1].value.toLowerCase() === 'a') {
                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [nextToken.operands[0], token.operands[1]],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            i += 1;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Folded LD A,imm / LD ${nextToken.operands[0].value},A into direct indexed immediate store at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5h2a: Fold IX-addressed store through HL into direct indexed store ===
                    // Patterns:
                    //   push ix / pop hl / ld de,disp / add hl,de / ld (hl),a
                    //   push af / push ix / pop hl / ld de,disp / add hl,de / pop af / ld (hl),a
                    // ->
                    //   ld (ix+disp),a
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[0].value.toLowerCase() === 'ix' &&
                        i + 4 < tokens.length &&
                        !token.label) {
                        const popHl = tokens[i + 1];
                        const ldDe = tokens[i + 2];
                        const addHlDe = tokens[i + 3];
                        const store = tokens[i + 4];
                        if (popHl instanceof Instruction &&
                            ldDe instanceof Instruction &&
                            addHlDe instanceof Instruction &&
                            store instanceof Instruction &&
                            !popHl.label && !ldDe.label && !addHlDe.label && !store.label &&
                            popHl.mnemonic.toLowerCase() === 'pop' &&
                            popHl.operands.length === 1 &&
                            popHl.operands[0].type === 'register_pair' &&
                            popHl.operands[0].value.toLowerCase() === 'hl' &&
                            isLdPairImm16(ldDe, 'de') &&
                            addHlDe.mnemonic.toLowerCase() === 'add' &&
                            addHlDe.operands.length === 2 &&
                            addHlDe.operands[0].type === 'register_pair' &&
                            addHlDe.operands[0].value.toLowerCase() === 'hl' &&
                            addHlDe.operands[1].type === 'register_pair' &&
                            addHlDe.operands[1].value.toLowerCase() === 'de' &&
                            store.mnemonic.toLowerCase() === 'ld' &&
                            store.operands.length === 2 &&
                            store.operands[0].type === 'memory' &&
                            String(store.operands[0].value).toLowerCase() === '(hl)' &&
                            store.operands[1].type === 'register' &&
                            store.operands[1].value.toLowerCase() === 'a') {
                            const disp = Number.parseInt(ldDe.operands[1].value, 10);
                            if (Number.isFinite(disp) && disp >= -128 && disp <= 127) {
                                optimized.push(new Instruction(
                                    null,
                                    'ld',
                                    [new Operand('memory', `(ix${disp >= 0 ? '+' : ''}${disp})`), new Operand('register', 'a')],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                i += 4;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 4;
                                optimizerLog(`  Folded IX local store via HL into direct indexed store at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5h2c: Remove immediate reload of L/H from the same IX locals ===
                    // Pattern:
                    //   ld a,l
                    //   ld (ix+d0),a
                    //   ld a,h
                    //   ld (ix+d1),a
                    //   ld l,(ix+d0)
                    //   ld h,(ix+d1)
                    // ->
                    //   ld a,l
                    //   ld (ix+d0),a
                    //   ld a,h
                    //   ld (ix+d1),a
                    if (mnem === 'ld' &&
                        !token.label &&
                        i + 5 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'a' &&
                        token.operands[1].type === 'register' &&
                        String(token.operands[1].value).toLowerCase() === 'l') {
                        const storeL = tokens[i + 1];
                        const loadAFromH = tokens[i + 2];
                        const storeH = tokens[i + 3];
                        const reloadL = tokens[i + 4];
                        const reloadH = tokens[i + 5];
                        if (storeL instanceof Instruction &&
                            loadAFromH instanceof Instruction &&
                            storeH instanceof Instruction &&
                            reloadL instanceof Instruction &&
                            reloadH instanceof Instruction &&
                            !storeL.label && !loadAFromH.label && !storeH.label && !reloadL.label && !reloadH.label &&
                            storeL.mnemonic.toLowerCase() === 'ld' &&
                            storeL.operands.length === 2 &&
                            storeL.operands[0].type === 'memory' &&
                            storeL.operands[1].type === 'register' &&
                            String(storeL.operands[1].value).toLowerCase() === 'a' &&
                            loadAFromH.mnemonic.toLowerCase() === 'ld' &&
                            loadAFromH.operands.length === 2 &&
                            loadAFromH.operands[0].type === 'register' &&
                            String(loadAFromH.operands[0].value).toLowerCase() === 'a' &&
                            loadAFromH.operands[1].type === 'register' &&
                            String(loadAFromH.operands[1].value).toLowerCase() === 'h' &&
                            storeH.mnemonic.toLowerCase() === 'ld' &&
                            storeH.operands.length === 2 &&
                            storeH.operands[0].type === 'memory' &&
                            storeH.operands[1].type === 'register' &&
                            String(storeH.operands[1].value).toLowerCase() === 'a' &&
                            reloadL.mnemonic.toLowerCase() === 'ld' &&
                            reloadL.operands.length === 2 &&
                            reloadL.operands[0].type === 'register' &&
                            String(reloadL.operands[0].value).toLowerCase() === 'l' &&
                            reloadL.operands[1].type === 'memory' &&
                            reloadH.mnemonic.toLowerCase() === 'ld' &&
                            reloadH.operands.length === 2 &&
                            reloadH.operands[0].type === 'register' &&
                            String(reloadH.operands[0].value).toLowerCase() === 'h' &&
                            reloadH.operands[1].type === 'memory') {
                            const storeLDisp = parseIndexedDisplacement(storeL.operands[0].value);
                            const storeHDisp = parseIndexedDisplacement(storeH.operands[0].value);
                            const reloadLDisp = parseIndexedDisplacement(reloadL.operands[1].value);
                            const reloadHDisp = parseIndexedDisplacement(reloadH.operands[1].value);
                            if (storeLDisp &&
                                storeHDisp &&
                                reloadLDisp &&
                                reloadHDisp &&
                                storeLDisp.base === 'ix' &&
                                storeHDisp.base === 'ix' &&
                                reloadLDisp.base === 'ix' &&
                                reloadHDisp.base === 'ix' &&
                                storeLDisp.offset === reloadLDisp.offset &&
                                storeHDisp.offset === reloadHDisp.offset) {
                                optimized.push(cloneInstruction(token));
                                optimized.push(cloneInstruction(storeL, null));
                                optimized.push(cloneInstruction(loadAFromH, null));
                                optimized.push(cloneInstruction(storeH, null));
                                i += 5;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 4;
                                optimizerLog(`  Removed redundant IX-local reload of HL at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[0].value.toLowerCase() === 'af' &&
                        i + 6 < tokens.length &&
                        !token.label) {
                        const pushIx = tokens[i + 1];
                        const popHl = tokens[i + 2];
                        const ldDe = tokens[i + 3];
                        const addHlDe = tokens[i + 4];
                        const popAf = tokens[i + 5];
                        const store = tokens[i + 6];
                        if (pushIx instanceof Instruction &&
                            popHl instanceof Instruction &&
                            ldDe instanceof Instruction &&
                            addHlDe instanceof Instruction &&
                            popAf instanceof Instruction &&
                            store instanceof Instruction &&
                            !pushIx.label && !popHl.label && !ldDe.label && !addHlDe.label && !popAf.label && !store.label &&
                            pushIx.mnemonic.toLowerCase() === 'push' &&
                            pushIx.operands.length === 1 &&
                            pushIx.operands[0].type === 'register_pair' &&
                            pushIx.operands[0].value.toLowerCase() === 'ix' &&
                            popHl.mnemonic.toLowerCase() === 'pop' &&
                            popHl.operands.length === 1 &&
                            popHl.operands[0].type === 'register_pair' &&
                            popHl.operands[0].value.toLowerCase() === 'hl' &&
                            isLdPairImm16(ldDe, 'de') &&
                            addHlDe.mnemonic.toLowerCase() === 'add' &&
                            addHlDe.operands.length === 2 &&
                            addHlDe.operands[0].type === 'register_pair' &&
                            addHlDe.operands[0].value.toLowerCase() === 'hl' &&
                            addHlDe.operands[1].type === 'register_pair' &&
                            addHlDe.operands[1].value.toLowerCase() === 'de' &&
                            popAf.mnemonic.toLowerCase() === 'pop' &&
                            popAf.operands.length === 1 &&
                            popAf.operands[0].type === 'register_pair' &&
                            popAf.operands[0].value.toLowerCase() === 'af' &&
                            store.mnemonic.toLowerCase() === 'ld' &&
                            store.operands.length === 2 &&
                            store.operands[0].type === 'memory' &&
                            String(store.operands[0].value).toLowerCase() === '(hl)' &&
                            store.operands[1].type === 'register' &&
                            store.operands[1].value.toLowerCase() === 'a') {
                            const disp = Number.parseInt(ldDe.operands[1].value, 10);
                            if (Number.isFinite(disp) && disp >= -128 && disp <= 127) {
                                optimized.push(new Instruction(
                                    null,
                                    'ld',
                                    [new Operand('memory', `(ix${disp >= 0 ? '+' : ''}${disp})`), new Operand('register', 'a')],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                i += 6;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 6;
                                optimizerLog(`  Folded preserved-A IX local store via HL into direct indexed store at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5h2b: Fold IX-addressed load through HL into direct indexed load ===
                    // Pattern:
                    //   push ix / pop hl / ld de,disp / add hl,de / ld a,(hl)
                    // ->
                    //   ld a,(ix+disp)
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[0].value.toLowerCase() === 'ix' &&
                        i + 4 < tokens.length &&
                        !token.label) {
                        const popHl = tokens[i + 1];
                        const ldDe = tokens[i + 2];
                        const addHlDe = tokens[i + 3];
                        const load = tokens[i + 4];
                        if (popHl instanceof Instruction &&
                            ldDe instanceof Instruction &&
                            addHlDe instanceof Instruction &&
                            load instanceof Instruction &&
                            !popHl.label && !ldDe.label && !addHlDe.label && !load.label &&
                            popHl.mnemonic.toLowerCase() === 'pop' &&
                            popHl.operands.length === 1 &&
                            popHl.operands[0].type === 'register_pair' &&
                            popHl.operands[0].value.toLowerCase() === 'hl' &&
                            isLdPairImm16(ldDe, 'de') &&
                            addHlDe.mnemonic.toLowerCase() === 'add' &&
                            addHlDe.operands.length === 2 &&
                            addHlDe.operands[0].type === 'register_pair' &&
                            addHlDe.operands[0].value.toLowerCase() === 'hl' &&
                            addHlDe.operands[1].type === 'register_pair' &&
                            addHlDe.operands[1].value.toLowerCase() === 'de' &&
                            load.mnemonic.toLowerCase() === 'ld' &&
                            load.operands.length === 2 &&
                            load.operands[0].type === 'register' &&
                            load.operands[0].value.toLowerCase() === 'a' &&
                            load.operands[1].type === 'memory' &&
                            String(load.operands[1].value).toLowerCase() === '(hl)') {
                            const disp = Number.parseInt(ldDe.operands[1].value, 10);
                            if (Number.isFinite(disp) && disp >= -128 && disp <= 127) {
                                optimized.push(new Instruction(
                                    null,
                                    'ld',
                                    [new Operand('register', 'a'), new Operand('memory', `(ix${disp >= 0 ? '+' : ''}${disp})`)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                i += 4;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 4;
                                optimizerLog(`  Folded IX local load via HL into direct indexed load at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5h3: Remove LD A,(IX+d) immediately after LD (IX+d),A ===
                    if (token instanceof Instruction &&
                        token.mnemonic.toLowerCase() === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'memory' &&
                        typeof token.operands[0].value === 'string' &&
                        parseIndexedDisplacement(token.operands[0].value) &&
                        token.operands[1].type === 'register' &&
                        token.operands[1].value.toLowerCase() === 'a' &&
                        i + 1 < tokens.length) {
                        const nextToken = tokens[i + 1];
                        if (nextToken instanceof Instruction &&
                            !nextToken.label &&
                            nextToken.mnemonic.toLowerCase() === 'ld' &&
                            nextToken.operands.length === 2 &&
                            nextToken.operands[0].type === 'register' &&
                            nextToken.operands[0].value.toLowerCase() === 'a' &&
                            nextToken.operands[1].type === 'memory' &&
                            nextToken.operands[1].value === token.operands[0].value) {
                            optimized.push(cloneInstruction(token));
                            i += 1;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 3;
                            optimizerLog(`  Removed redundant reload of ${token.operands[0].value} into A immediately after store at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5h3a: Remove short delayed reload of A from the same IX/IY local ===
                    // Pattern:
                    //   ld (ix+d),a
                    //   ld d,n
                    //   ld e,n
                    //   ld a,(ix+d)   ← redundant: A is still the stored value
                    // This deliberately stays local: no labels/control flow, no memory writes,
                    // no A touch, and no IX/IY base mutation between the store and reload.
                    if (this.config.localValueReuse &&
                        token instanceof Instruction &&
                        token.mnemonic.toLowerCase() === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'memory' &&
                        typeof token.operands[0].value === 'string' &&
                        parseIndexedDisplacement(token.operands[0].value) &&
                        token.operands[1].type === 'register' &&
                        token.operands[1].value.toLowerCase() === 'a' &&
                        !token.label) {
                        const storedMem = token.operands[0].value;
                        const carried = [];
                        let foundReloadAt = -1;
                        for (let lookahead = i + 1; lookahead < Math.min(tokens.length, i + 5); lookahead++) {
                            const candidate = tokens[lookahead];
                            if (!(candidate instanceof Instruction) || candidate.label) break;
                            const candidateMnem = candidate.mnemonic.toLowerCase();
                            if (isLdAFromMem(candidate, storedMem)) {
                                foundReloadAt = lookahead;
                                break;
                            }
                            if (['call', 'jp', 'jr', 'djnz', 'ret', 'reti', 'retn', 'rst', 'halt'].includes(candidateMnem)) break;
                            if (this.instructionTouchesRegister(candidate, 'a') ||
                                this.instructionWritesRegister(candidate, 'ix') ||
                                this.instructionWritesRegister(candidate, 'iy')) {
                                break;
                            }
                            const writesMemory = (candidate.operands || []).some((op, opIndex) => {
                                if (!op || op.type !== 'memory') return false;
                                if (candidateMnem === 'ld') return opIndex === 0;
                                return ['inc', 'dec', 'set', 'res', 'rl', 'rr', 'rlc', 'rrc', 'sla', 'sra', 'srl', 'sll'].includes(candidateMnem);
                            });
                            if (writesMemory) break;
                            carried.push(candidate);
                        }
                        if (foundReloadAt !== -1) {
                            optimized.push(cloneInstruction(token));
                            for (const candidate of carried) {
                                optimized.push(cloneInstruction(candidate, null));
                            }
                            i = foundReloadAt;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(tokens[foundReloadAt]);
                            optimizerLog(`  Removed delayed redundant reload of ${storedMem} into A after store at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5h3b: Remove dead adjacent overwrite of the same 8-bit register ===
                    // Pattern:
                    //   ld r,src1
                    //   ld r,src2
                    // ->
                    //   ld r,src2
                    if (mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        i + 1 < tokens.length &&
                        !token.label) {
                        const nextToken = tokens[i + 1];
                        const dst = String(token.operands[0].value).toLowerCase();
                        const src = String(token.operands[1].value).toLowerCase();
                        if (nextToken instanceof Instruction &&
                            !nextToken.label &&
                            nextToken.mnemonic.toLowerCase() === 'ld' &&
                            nextToken.operands.length === 2 &&
                            nextToken.operands[0].type === 'register' &&
                            String(nextToken.operands[0].value).toLowerCase() === dst &&
                            src !== 'i' &&
                            src !== 'r') {
                            i += 0;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(token);
                            optimizerLog(`  Removed dead adjacent overwrite of register ${dst} at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5h4: Remove immediate HL reload after storing HL into IX locals ===
                    // Pattern:
                    //   ld a,l
                    //   ld (ix+d1),a
                    //   ld a,h
                    //   ld (ix+d2),a
                    //   ld l,(ix+d1)
                    //   ld h,(ix+d2)
                    // If the reload happens immediately, HL already contains the same value.
                    if (isLdRegA(token, 'l') &&
                        i + 5 < tokens.length) {
                        const storeLo = tokens[i + 1];
                        const ldAH = tokens[i + 2];
                        const storeHi = tokens[i + 3];
                        const reloadLo = tokens[i + 4];
                        const reloadHi = tokens[i + 5];
                        const loDisp = storeLo instanceof Instruction && storeLo.mnemonic.toLowerCase() === 'ld' &&
                            storeLo.operands.length === 2 &&
                            storeLo.operands[0].type === 'memory' &&
                            typeof storeLo.operands[0].value === 'string' &&
                            parseIndexedDisplacement(storeLo.operands[0].value) &&
                            storeLo.operands[1].type === 'register' &&
                            storeLo.operands[1].value.toLowerCase() === 'a'
                            ? storeLo.operands[0].value : null;
                        const hiDisp = storeHi instanceof Instruction && storeHi.mnemonic.toLowerCase() === 'ld' &&
                            storeHi.operands.length === 2 &&
                            storeHi.operands[0].type === 'memory' &&
                            typeof storeHi.operands[0].value === 'string' &&
                            parseIndexedDisplacement(storeHi.operands[0].value) &&
                            storeHi.operands[1].type === 'register' &&
                            storeHi.operands[1].value.toLowerCase() === 'a'
                            ? storeHi.operands[0].value : null;
                        if (loDisp &&
                            ldAH instanceof Instruction &&
                            !storeLo.label && !ldAH.label && !storeHi.label && !reloadLo.label && !reloadHi.label &&
                            ldAH.mnemonic.toLowerCase() === 'ld' &&
                            ldAH.operands.length === 2 &&
                            ldAH.operands[0].type === 'register' &&
                            ldAH.operands[0].value.toLowerCase() === 'a' &&
                            ldAH.operands[1].type === 'register' &&
                            ldAH.operands[1].value.toLowerCase() === 'h' &&
                            hiDisp &&
                            reloadLo instanceof Instruction &&
                            reloadLo.mnemonic.toLowerCase() === 'ld' &&
                            reloadLo.operands.length === 2 &&
                            reloadLo.operands[0].type === 'register' &&
                            reloadLo.operands[0].value.toLowerCase() === 'l' &&
                            reloadLo.operands[1].type === 'memory' &&
                            reloadLo.operands[1].value === loDisp &&
                            reloadHi instanceof Instruction &&
                            reloadHi.mnemonic.toLowerCase() === 'ld' &&
                            reloadHi.operands.length === 2 &&
                            reloadHi.operands[0].type === 'register' &&
                            reloadHi.operands[0].value.toLowerCase() === 'h' &&
                            reloadHi.operands[1].type === 'memory' &&
                            reloadHi.operands[1].value === hiDisp) {
                            optimized.push(cloneInstruction(token));
                            optimized.push(cloneInstruction(storeLo));
                            optimized.push(cloneInstruction(ldAH));
                            optimized.push(cloneInstruction(storeHi));
                            i += 5;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(reloadLo) + getInstructionSize(reloadHi);
                            optimizerLog(`  Removed redundant immediate HL reload from ${loDisp}/${hiDisp} after indexed store at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.5i: Merge adjacent byte loads into BC/DE/HL immediate loads ===
                    // Examples:
                    //   ld h,0 / ld l,0 -> ld hl,0
                    //   ld c,7 / ld b,0 -> ld bc,7
                    //   ld e,$34 / ld d,$12 -> ld de,$1234
                    if (mnem === 'ld' &&
                        i + 1 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'immediate') {
                        const nextToken = tokens[i + 1];
                        if (nextToken instanceof Instruction && !nextToken.label) {
                            const pairLoad = tryBuildPairImmediateFromByteLoads(token, nextToken);
                            if (pairLoad) {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register_pair', pairLoad.pair), new Operand('immediate', pairLoad.imm16)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                i += 1;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 1;
                                optimizerLog(`  Merged adjacent LD byte immediates into LD ${pairLoad.pair.toUpperCase()},imm16 at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5k: Fold LD BC,00nn into LD C,nn when B is already zero ===
                    if (token instanceof Instruction &&
                        token.mnemonic.toLowerCase() === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[0].value.toLowerCase() === 'bc' &&
                        token.operands[1].type === 'immediate') {
                        const imm = Number(token.operands[1].value);
                        if ((imm & 0xFF00) === 0) {
                            let bKnownZero = false;
                            for (let lookback = optimized.length - 1; lookback >= 0; lookback--) {
                                const prev = optimized[lookback];
                                if (!(prev instanceof Instruction)) continue;
                                const prevMnemonic = prev.mnemonic.toLowerCase();
                                if (prev.label || ['call', 'jp', 'jr', 'djnz', 'ret', 'reti', 'retn'].includes(prevMnemonic)) break;
                                if (prevMnemonic === 'ldir' || prevMnemonic === 'lddr') {
                                    bKnownZero = true;
                                    break;
                                }
                                if (instructionCanClobberRegister(prev, 'bc')) break;
                                if (prevMnemonic === 'ld' &&
                                    prev.operands.length === 2 &&
                                    prev.operands[0].type === 'register' &&
                                    prev.operands[0].value.toLowerCase() === 'b' &&
                                    prev.operands[1].type === 'immediate' &&
                                    Number(prev.operands[1].value) === 0) {
                                    bKnownZero = true;
                                    break;
                                }
                            }
                            if (bKnownZero) {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register', 'c'), new Operand('immediate', imm & 0xFF)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 1;
                                optimizerLog(`  Folded LD BC,00nn into LD C,nn with B already zero at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.5l: Fold LD H,0 into LD H,D when D is already zero ===
                    // Aggressive+: one-byte fold. D must be a locally trustworthy zero source.
                    if (this.config.speculativeValueReuse &&
                        isLdRegImm(token, 'h') &&
                        Number(token.operands[1].value) === 0) {
                        let dKnownZero = false;
                        for (let lookback = optimized.length - 1; lookback >= 0; lookback--) {
                            const prev = optimized[lookback];
                            if (!(prev instanceof Instruction)) continue;
                            if (prev.mnemonic.toLowerCase() === 'ld' &&
                                prev.operands.length === 2 &&
                                prev.operands[0].type === 'register' &&
                                prev.operands[0].value.toLowerCase() === 'd' &&
                                prev.operands[1].type === 'immediate' &&
                                Number(prev.operands[1].value) === 0) {
                                dKnownZero = true;
                                break;
                            }
                            if (instructionCanClobberRegister(prev, 'de')) break;
                        }
                        if (dKnownZero) {
                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register', 'h'), new Operand('register', 'd')],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Folded LD H,0 into LD H,D with D already zero at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.6: Fold PUSH HL / LD HL,nn / EX DE,HL / POP HL ===
                    // Common int16 expression lowering preserves HL while materializing a
                    // constant into DE through HL:
                    //   push hl / ld hl,nn / ex de,hl / pop hl
                    // This is equivalent to LD DE,nn and preserves flags.
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[0].value.toLowerCase() === 'hl' &&
                        i + 3 < tokens.length) {
                        const loadImm16 = tokens[i + 1];
                        const exDeHl = tokens[i + 2];
                        const popHl = tokens[i + 3];

                        if (loadImm16 instanceof Instruction &&
                            exDeHl instanceof Instruction &&
                            popHl instanceof Instruction &&
                            !loadImm16.label && !exDeHl.label && !popHl.label &&
                            loadImm16.mnemonic.toLowerCase() === 'ld' &&
                            loadImm16.operands.length === 2 &&
                            loadImm16.operands[0].type === 'register_pair' &&
                            loadImm16.operands[0].value.toLowerCase() === 'hl' &&
                            loadImm16.operands[1].type === 'immediate' &&
                            exDeHl.mnemonic.toLowerCase() === 'ex' &&
                            exDeHl.operands.length === 2 &&
                            exDeHl.operands[0].type === 'register_pair' &&
                            exDeHl.operands[0].value.toLowerCase() === 'de' &&
                            exDeHl.operands[1].type === 'register_pair' &&
                            exDeHl.operands[1].value.toLowerCase() === 'hl' &&
                            popHl.mnemonic.toLowerCase() === 'pop' &&
                            popHl.operands.length === 1 &&
                            popHl.operands[0].type === 'register_pair' &&
                            popHl.operands[0].value.toLowerCase() === 'hl') {

                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register_pair', 'de'), new Operand('immediate', loadImm16.operands[1].value)],
                                token.lineNumber,
                                ''
                            ));
                            i += 3;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 3;
                            optimizerLog(`  Folded PUSH/LD/EX/POP to LD DE,nn at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.7: Drop redundant PUSH/LD-immediate/POP preservation ===
                    // If a saved register pair is wrapped around a single immediate load that
                    // does not touch that pair, the save/restore is pointless:
                    //   push hl / ld d,n / pop hl  => ld d,n
                    //   push bc / ld e,n / pop bc  => ld e,n
                    // This also catches wider immediate loads such as LD DE,nn when the saved
                    // pair is different.
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        i + 2 < tokens.length) {
                        const mid = tokens[i + 1];
                        const pop = tokens[i + 2];

                        if (mid instanceof Instruction &&
                            pop instanceof Instruction &&
                            !mid.label && !pop.label &&
                            pop.mnemonic.toLowerCase() === 'pop' &&
                            pop.operands.length === 1 &&
                            pop.operands[0].type === 'register_pair' &&
                            pop.operands[0].value.toLowerCase() === token.operands[0].value.toLowerCase() &&
                            mid.mnemonic.toLowerCase() === 'ld' &&
                            mid.operands.length === 2 &&
                            mid.operands[1].type === 'immediate') {

                            const savedPair = token.operands[0].value.toLowerCase();
                            const touchedRegs = new Set();
                            const target = mid.operands[0];

                            if (target.type === 'register') {
                                touchedRegs.add(target.value.toLowerCase());
                            } else if (target.type === 'register_pair') {
                                const pair = target.value.toLowerCase();
                                touchedRegs.add(pair);
                                if (pair === 'af') {
                                    touchedRegs.add('a');
                                } else if (pair === 'bc') {
                                    touchedRegs.add('b');
                                    touchedRegs.add('c');
                                } else if (pair === 'de') {
                                    touchedRegs.add('d');
                                    touchedRegs.add('e');
                                } else if (pair === 'hl') {
                                    touchedRegs.add('h');
                                    touchedRegs.add('l');
                                } else if (pair === 'ix') {
                                    touchedRegs.add('ixh');
                                    touchedRegs.add('ixl');
                                } else if (pair === 'iy') {
                                    touchedRegs.add('iyh');
                                    touchedRegs.add('iyl');
                                }
                            }

                            const savedMembers = new Set([savedPair]);
                            if (savedPair === 'af') {
                                savedMembers.add('a');
                            } else if (savedPair === 'bc') {
                                savedMembers.add('b');
                                savedMembers.add('c');
                            } else if (savedPair === 'de') {
                                savedMembers.add('d');
                                savedMembers.add('e');
                            } else if (savedPair === 'hl') {
                                savedMembers.add('h');
                                savedMembers.add('l');
                            } else if (savedPair === 'ix') {
                                savedMembers.add('ixh');
                                savedMembers.add('ixl');
                            } else if (savedPair === 'iy') {
                                savedMembers.add('iyh');
                                savedMembers.add('iyl');
                            }

                            const touchesSaved = [...touchedRegs].some(reg => savedMembers.has(reg));
                            if (!touchesSaved) {
                                optimized.push(new Instruction(token.label, mid.mnemonic, mid.operands, mid.lineNumber, mid.sourceLine));
                                i += 2;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 2;
                                optimizerLog(`  Removed redundant PUSH/POP around LD immediate at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.7a2: Remove AF preservation around indexed byte store ===
                    //   push af / ld e,a / ld d,0 / ld hl,base / add hl,de / pop af / ld (hl),a
                    // A is never modified in the address setup. Only remove POP AF when
                    // the restored flags are dead before the next flag use.
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        String(token.operands[0].value).toLowerCase() === 'af' &&
                        i + 6 < tokens.length) {
                        const t1 = tokens[i + 1];
                        const t2 = tokens[i + 2];
                        const t3 = tokens[i + 3];
                        const t4 = tokens[i + 4];
                        const t5 = tokens[i + 5];
                        const t6 = tokens[i + 6];
                        if ([t1, t2, t3, t4, t5, t6].every(t => t instanceof Instruction && !t.label) &&
                            t1.mnemonic.toLowerCase() === 'ld' &&
                            t1.operands.length === 2 &&
                            t1.operands[0].type === 'register' &&
                            String(t1.operands[0].value).toLowerCase() === 'e' &&
                            t1.operands[1].type === 'register' &&
                            String(t1.operands[1].value).toLowerCase() === 'a' &&
                            isLdRegImm(t2, 'd') &&
                            this.resolve8BitImmediate(t2.operands[1]) === 0 &&
                            t3.mnemonic.toLowerCase() === 'ld' &&
                            t3.operands.length === 2 &&
                            t3.operands[0].type === 'register_pair' &&
                            String(t3.operands[0].value).toLowerCase() === 'hl' &&
                            ['immediate', 'symbol'].includes(t3.operands[1].type) &&
                            t4.mnemonic.toLowerCase() === 'add' &&
                            t4.operands.length === 2 &&
                            t4.operands[0].type === 'register_pair' &&
                            String(t4.operands[0].value).toLowerCase() === 'hl' &&
                            t4.operands[1].type === 'register_pair' &&
                            String(t4.operands[1].value).toLowerCase() === 'de' &&
                            t5.mnemonic.toLowerCase() === 'pop' &&
                            t5.operands.length === 1 &&
                            t5.operands[0].type === 'register_pair' &&
                            String(t5.operands[0].value).toLowerCase() === 'af' &&
                            isLdMemA(t6) &&
                            String(t6.operands[0].value).toLowerCase() === 'hl' &&
                            this.areFlagsDeadBeforeNextUse(tokens, i + 5)) {
                            optimized.push(cloneInstruction(t1, token.label));
                            optimized.push(cloneInstruction(t2, null));
                            optimized.push(cloneInstruction(t3, null));
                            optimized.push(cloneInstruction(t4, null));
                            optimized.push(cloneInstruction(t6, null));
                            i += 6;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(token) + getInstructionSize(t5);
                            optimizerLog(`  Removed redundant PUSH AF / POP AF around indexed byte store at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }
                    // === PHASE 1.7b: Remove redundant PUSH/POP around short inert runs ===
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair') {
                        const savedPair = token.operands[0].value.toLowerCase();
                        const buffered = [];
                        let popIndex = -1;

                        for (let j = i + 1; j < tokens.length && j <= i + SHORT_PUSH_POP_WINDOW; j++) {
                            const midTok = tokens[j];
                            if (!(midTok instanceof Instruction) || midTok.label) break;

                            if (midTok.mnemonic.toLowerCase() === 'pop' &&
                                midTok.operands.length === 1 &&
                                midTok.operands[0].type === 'register_pair' &&
                                midTok.operands[0].value.toLowerCase() === savedPair) {
                                popIndex = j;
                                break;
                            }

                            if (!instructionSafeBetweenPushPop(midTok, savedPair)) break;
                            buffered.push(midTok);
                        }

                        if (popIndex !== -1 && buffered.length > 0) {
                            for (let k = 0; k < buffered.length; k++) {
                                const midTok = buffered[k];
                                optimized.push(new Instruction(
                                    k === 0 ? token.label : midTok.label,
                                    midTok.mnemonic,
                                    midTok.operands,
                                    midTok.lineNumber,
                                    midTok.sourceLine
                                ));
                            }
                            i = popIndex;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Removed redundant PUSH ${savedPair.toUpperCase()} / POP ${savedPair.toUpperCase()} around inert instructions at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.8: PUSH/POP Cancellation ===
                    // PUSH AF around a short run of AF-inert immediate loads is redundant:
                    //   push af / ld bc,nn / ld de,nn / pop af  => ld bc,nn / ld de,nn
                    // Restrict this to LD immediate instructions that do not target A or AF.
                    if (mnem === 'push' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[0].value.toLowerCase() === 'af') {
                        const buffered = [];
                        let popIndex = -1;

                        for (let j = i + 1; j < tokens.length && j <= i + SHORT_PUSH_POP_WINDOW; j++) {
                            const midTok = tokens[j];
                            if (!(midTok instanceof Instruction) || midTok.label) {
                                break;
                            }

                            if (midTok.mnemonic.toLowerCase() === 'pop' &&
                                midTok.operands.length === 1 &&
                                midTok.operands[0].type === 'register_pair' &&
                                midTok.operands[0].value.toLowerCase() === 'af') {
                                popIndex = j;
                                break;
                            }

                            if (midTok.mnemonic.toLowerCase() !== 'ld' ||
                                midTok.operands.length !== 2 ||
                                midTok.operands[1].type !== 'immediate') {
                                break;
                            }

                            const target = midTok.operands[0];
                            if (target.type === 'register' && target.value.toLowerCase() === 'a') break;
                            if (target.type === 'register_pair' && target.value.toLowerCase() === 'af') break;

                            buffered.push(midTok);
                        }

                        if (popIndex !== -1 && buffered.length > 0) {
                            for (let k = 0; k < buffered.length; k++) {
                                const midTok = buffered[k];
                                optimized.push(new Instruction(
                                    k === 0 ? token.label : midTok.label,
                                    midTok.mnemonic,
                                    midTok.operands,
                                    midTok.lineNumber,
                                    midTok.sourceLine
                                ));
                            }
                            i = popIndex;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Removed redundant PUSH AF / POP AF around AF-inert loads at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.8c: Fold short-range byte immediates into BC/DE/HL immediate loads ===
                    if (mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'immediate') {
                        const firstReg = token.operands[0].value.toLowerCase();
                        if (['b', 'c', 'd', 'e', 'h', 'l'].includes(firstReg)) {
                            let didReplace = false;
                            for (let j = i + 1; j < tokens.length && j <= i + 4; j++) {
                                const next = tokens[j];
                                if (!(next instanceof Instruction) || next.label) break;
                                const pairLoad = tryBuildPairImmediateFromByteLoads(token, next);
                                if (!pairLoad) {
                                    if (instructionCanClobberRegister(next, 'bc') ||
                                        instructionCanClobberRegister(next, 'de') ||
                                        instructionCanClobberRegister(next, 'hl')) {
                                        break;
                                    }
                                    continue;
                                }
                                if (instructionCanClobberRegister(next, pairLoad.pair)) break;
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register_pair', pairLoad.pair), new Operand('immediate', pairLoad.imm16)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                for (let k = i + 1; k < j; k++) {
                                    optimized.push(tokens[k]);
                                }
                                i = j;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved++;
                                optimizerLog(`  Folded short-range LD byte immediates into LD ${pairLoad.pair.toUpperCase()},imm16 at line ${token.lineNumber}`, 'debug');
                                didReplace = true;
                                break;
                            }
                            if (didReplace) {
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.8b: Remove immediate temp store/reload when A is still live ===
                    // Conservative form used by small UI routines:
                    //   ld a,n
                    //   ld (temp),a
                    //   [optional single instruction that touches neither A nor temp]
                    //   ld a,(temp)
                    //   [optional ld r,a]
                    // Since LD (temp),A does not change A, the reload is redundant while A
                    // stays live. Keep the temp store for any later consumers; only remove
                    // the immediate reload.
                    if (mnem === 'ld' &&
                        token.operands.length === 2 &&
                        !token.label &&
                        token.operands[0].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].type === 'immediate' &&
                        i + 2 < tokens.length) {
                        const storeTemp = tokens[i + 1];
                        if (storeTemp instanceof Instruction &&
                            !storeTemp.label &&
                            storeTemp.mnemonic.toLowerCase() === 'ld' &&
                            storeTemp.operands.length === 2 &&
                            storeTemp.operands[0].type === 'memory' &&
                            typeof storeTemp.operands[0].value === 'string' &&
                            storeTemp.operands[1].type === 'register' &&
                            storeTemp.operands[1].value.toLowerCase() === 'a') {
                            const tempName = storeTemp.operands[0].value;
                            let mid = null;
                            let loadIndex = i + 2;
                            let loadTemp = tokens[loadIndex];
                            if (!(loadTemp instanceof Instruction &&
                                !loadTemp.label &&
                                loadTemp.mnemonic.toLowerCase() === 'ld' &&
                                loadTemp.operands.length === 2 &&
                                loadTemp.operands[0].type === 'register' &&
                                loadTemp.operands[0].value.toLowerCase() === 'a' &&
                                loadTemp.operands[1].type === 'memory' &&
                                typeof loadTemp.operands[1].value === 'string' &&
                                loadTemp.operands[1].value === tempName)) {
                                mid = loadTemp;
                                loadIndex = i + 3;
                                loadTemp = tokens[loadIndex];
                            }

                            if (loadTemp instanceof Instruction &&
                                !loadTemp.label &&
                                loadTemp.mnemonic.toLowerCase() === 'ld' &&
                                loadTemp.operands.length === 2 &&
                                loadTemp.operands[0].type === 'register' &&
                                loadTemp.operands[0].value.toLowerCase() === 'a' &&
                                loadTemp.operands[1].type === 'memory' &&
                                typeof loadTemp.operands[1].value === 'string' &&
                                loadTemp.operands[1].value === tempName &&
                                (!mid || (
                                    mid instanceof Instruction &&
                                    !mid.label &&
                                    !instructionTouchesRegister(mid, 'a') &&
                                    !instructionTouchesMemorySymbol(mid, tempName)
                                ))) {
                                const copyAfter = tokens[loadIndex + 1];
                                const hasCopyAfter = copyAfter instanceof Instruction &&
                                    !copyAfter.label &&
                                    copyAfter.mnemonic.toLowerCase() === 'ld' &&
                                    copyAfter.operands.length === 2 &&
                                    copyAfter.operands[0].type === 'register' &&
                                    copyAfter.operands[1].type === 'register' &&
                                    copyAfter.operands[1].value.toLowerCase() === 'a';

                                optimized.push(token);
                                optimized.push(storeTemp);
                                if (mid) optimized.push(mid);
                                if (hasCopyAfter) optimized.push(copyAfter);

                                i = hasCopyAfter ? loadIndex + 1 : loadIndex;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 3;
                                optimizerLog(`  Removed redundant immediate temp reload from ${tempName} at line ${loadTemp.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.9: PUSH/POP Cancellation ===
                    // PUSH r followed by POP r → remove both
                    if (mnem === 'push' && i + 1 < tokens.length) {
                        const next = tokens[i + 1];

                        if (next instanceof Instruction &&
                            next.mnemonic.toLowerCase() === 'pop' &&
                            token.operands.length === 1 &&
                            next.operands.length === 1) {

                            const reg1 = token.operands[0];
                            const reg2 = next.operands[0];

                            // Guard: either instruction might carry a label (jump target).
                            // Removing a labeled instruction silently drops the label.
                            if (reg1.value.toLowerCase() === reg2.value.toLowerCase() &&
                                !token.label && !next.label) {
                                // Skip both instructions
                                i++; // Skip POP
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 2; // 1 byte each
                                optimizerLog(`  Removed PUSH/POP pair at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.10: CALL + RET → JP (tail call elimination) ===
                    // Unconditional CALL immediately followed by unconditional RET can be
                    // replaced by JP: the callee returns directly to our caller, and JP
                    // avoids the push/pop of the return address.  The resulting JP is then
                    // eligible for the phase-2 JP→JR optimizer.
                    if (mnem === 'call' && token.operands.length === 1 && i + 1 < tokens.length) {
                        const next = tokens[i + 1];
                        const next2 = i + 2 < tokens.length ? tokens[i + 2] : null;
                        const isDirectRet =
                            next instanceof Instruction &&
                            next.mnemonic.toLowerCase() === 'ret' &&
                            next.operands.length === 0;
                        const isLabelThenRet =
                            next instanceof Directive &&
                            next.name === 'LABEL' &&
                            next2 instanceof Instruction &&
                            next2.mnemonic.toLowerCase() === 'ret' &&
                            next2.operands.length === 0;
                        if (isDirectRet || isLabelThenRet) {
                            const jpToken = new Instruction(token.label, 'jp', token.operands, token.lineNumber);
                            optimized.push(jpToken);
                            i += isLabelThenRet ? 2 : 1; // consume label+RET or RET
                            this.stats.callRetToJp++;
                            this.stats.bytesSaved++;
                            optimizerLog(`  CALL+RET → JP at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.10a: LD D,n / LD E,n -> LD DE,nn ===
                    if (mnem === 'ld' &&
                        i + 1 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'd' &&
                        token.operands[1].type === 'immediate' &&
                        !token.label) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction &&
                            !next.label &&
                            next.mnemonic.toLowerCase() === 'ld' &&
                            next.operands.length === 2 &&
                            next.operands[0].type === 'register' &&
                            String(next.operands[0].value).toLowerCase() === 'e' &&
                            next.operands[1].type === 'immediate') {
                            const hi = Number(token.operands[1].value) & 0xFF;
                            const lo = Number(next.operands[1].value) & 0xFF;
                            optimized.push(new Instruction(token.label, 'ld', [
                                new Operand('register_pair', 'de'),
                                new Operand('immediate', (hi << 8) | lo)
                            ], token.lineNumber, token.sourceLine));
                            i += 1;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Folded LD D,imm / LD E,imm into LD DE,imm16 at line ${token.lineNumber}`, 'debug');
                            liveDeImmediate = (hi << 8) | lo;
                            continue;
                        }
                    }

                    // === PHASE 1.10aa: remove redundant EX DE,HL / EX DE,HL ===
                    if (mnem === 'ex' &&
                        !token.label &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[1].type === 'register_pair' &&
                        ((String(token.operands[0].value).toLowerCase() === 'de' && String(token.operands[1].value).toLowerCase() === 'hl') ||
                         (String(token.operands[0].value).toLowerCase() === 'hl' && String(token.operands[1].value).toLowerCase() === 'de')) &&
                        i + 1 < tokens.length) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction &&
                            !next.label &&
                            next.mnemonic.toLowerCase() === 'ex' &&
                            next.operands.length === 2 &&
                            next.operands[0].type === 'register_pair' &&
                            next.operands[1].type === 'register_pair') {
                            const nextLeft = String(next.operands[0].value).toLowerCase();
                            const nextRight = String(next.operands[1].value).toLowerCase();
                            if ((nextLeft === 'de' && nextRight === 'hl') || (nextLeft === 'hl' && nextRight === 'de')) {
                                i += 1;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 2;
                                optimizerLog(`  Removed redundant EX DE,HL pair at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.10b: remove dead OR A before later flag-clobbering arithmetic ===
                    // Example:
                    //   or a
                    //   ld a,(mem)
                    //   add a,imm
                    // -> OR A is dead because ADD does not use prior flags and overwrites them.
                    if (this.config.deadOrARemoval &&
                        mnem === 'or' &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'a' &&
                        !token.label) {
                        if (this.areFlagsDeadBeforeNextUse(tokens, i)) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Removed dead OR A at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === Original Peephole Patterns ===

                    // Pattern 1: LD A,A (or any register to itself) - no-op
                    if (mnem === 'ld' && token.operands.length === 2 && !token.label) {
                        const dest = token.operands[0];
                        const src = token.operands[1];

                        if (dest.type === 'register' &&
                            src.type === 'register' &&
                            dest.value.toLowerCase() === src.value.toLowerCase()) {

                            // Skip this no-op instruction
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved++;
                            optimizerLog(`  Removed LD ${dest.value.toUpperCase()},${src.value.toUpperCase()} no-op at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Pattern 1b: LD B,imm overwritten before any read within the same block
                    // Example:
                    //   ld b,0
                    //   ...
                    //   ld b,a
                    // The immediate load is dead as long as no instruction reads/touches B
                    // and no control-flow barrier intervenes.
                    if (isLdRegImm(token, 'b') &&
                        !token.label &&
                        isOverwrittenBeforeAnyReadInBlock(tokens, i, 'b')) {
                        this.stats.peepholeOpts++;
                        this.stats.bytesSaved += getInstructionSize(token);
                        optimizerLog(`  Removed dead LD B,imm overwritten before use at line ${token.lineNumber}`, 'debug');
                        continue;
                    }

                    // Pattern 1c: INC/DEC rr overwritten before any read within the same block
                    // Example:
                    //   inc de
                    //   ...
                    //   pop de
                    // or
                    //   inc hl
                    //   ld hl,symbol
                    // The increment/decrement is dead as long as the pair is overwritten
                    // before any read and no control-flow barrier intervenes.
                    if ((mnem === 'inc' || mnem === 'dec') &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        ['bc', 'de', 'hl'].includes(String(token.operands[0].value).toLowerCase()) &&
                        !token.label) {
                        const pairName = String(token.operands[0].value).toLowerCase();
                        if (isOverwrittenBeforeAnyReadInBlock(tokens, i, pairName)) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(token);
                            optimizerLog(`  Removed dead ${mnem.toUpperCase()} ${pairName.toUpperCase()} overwritten before use at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Pattern 1e: LD A,r / LD (mem),A / LD A,r -> remove duplicate reload.
                    // LD (mem),A does not alter A, r, or flags.
                    if (mnem === 'ld' &&
                        i + 2 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'a' &&
                        token.operands[1].type === 'register' &&
                        !token.label) {
                        const storeA = tokens[i + 1];
                        const reloadA = tokens[i + 2];
                        if (storeA instanceof Instruction && reloadA instanceof Instruction &&
                            !storeA.label && !reloadA.label &&
                            isLdMemA(storeA) &&
                            reloadA.mnemonic.toLowerCase() === 'ld' &&
                            reloadA.operands.length === 2 &&
                            reloadA.operands[0].type === 'register' &&
                            reloadA.operands[1].type === 'register' &&
                            String(reloadA.operands[0].value).toLowerCase() === 'a' &&
                            String(reloadA.operands[1].value).toLowerCase() === String(token.operands[1].value).toLowerCase()) {
                            optimized.push(token);
                            optimized.push(storeA);
                            i += 2;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Removed duplicate LD A,${String(token.operands[1].value).toUpperCase()} after memory store at line ${reloadA.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Pattern 1d: HL -> BC -> DE copy where BC is only a transient.
                    //   ld b,h
                    //   ld c,l
                    //   ld d,b
                    //   ld e,c
                    // -> ld d,h
                    //    ld e,l
                    // Safe only when BC dies before any later read.
                    if (mnem === 'ld' &&
                        i + 3 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'register' &&
                        String(token.operands[0].value).toLowerCase() === 'b' &&
                        String(token.operands[1].value).toLowerCase() === 'h' &&
                        !token.label) {
                        const loadC = tokens[i + 1];
                        const loadD = tokens[i + 2];
                        const loadE = tokens[i + 3];
                        if (loadC instanceof Instruction && loadD instanceof Instruction && loadE instanceof Instruction &&
                            !loadC.label && !loadD.label && !loadE.label &&
                            loadC.mnemonic.toLowerCase() === 'ld' &&
                            loadD.mnemonic.toLowerCase() === 'ld' &&
                            loadE.mnemonic.toLowerCase() === 'ld' &&
                            loadC.operands.length === 2 &&
                            loadD.operands.length === 2 &&
                            loadE.operands.length === 2 &&
                            loadC.operands[0].type === 'register' &&
                            loadC.operands[1].type === 'register' &&
                            String(loadC.operands[0].value).toLowerCase() === 'c' &&
                            String(loadC.operands[1].value).toLowerCase() === 'l' &&
                            loadD.operands[0].type === 'register' &&
                            loadD.operands[1].type === 'register' &&
                            String(loadD.operands[0].value).toLowerCase() === 'd' &&
                            String(loadD.operands[1].value).toLowerCase() === 'b' &&
                            loadE.operands[0].type === 'register' &&
                            loadE.operands[1].type === 'register' &&
                            String(loadE.operands[0].value).toLowerCase() === 'e' &&
                            String(loadE.operands[1].value).toLowerCase() === 'c' &&
                            isDeadOrClobberedBeforeAnyReadInBlock(tokens, i + 3, 'bc')) {
                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('register', 'd'), new Operand('register', 'h')],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            optimized.push(new Instruction(
                                null,
                                'ld',
                                [new Operand('register', 'e'), new Operand('register', 'l')],
                                loadE.lineNumber,
                                loadE.sourceLine
                            ));
                            i += 3;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Folded transient HL->BC->DE copy into direct HL->DE copy at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Pattern 2: Identity swap (LD A,B followed by LD B,A)
                    if (mnem === 'ld' && i + 1 < tokens.length) {
                        const next = tokens[i + 1];

                        if (next instanceof Instruction &&
                            next.mnemonic.toLowerCase() === 'ld' &&
                            token.operands.length === 2 &&
                            next.operands.length === 2) {

                            const dest1 = token.operands[0];
                            const src1 = token.operands[1];
                            const dest2 = next.operands[0];
                            const src2 = next.operands[1];

                            if (dest1.type === 'register' &&
                                src1.type === 'register' &&
                                dest2.type === 'register' &&
                                src2.type === 'register' &&
                                dest1.value.toLowerCase() === src2.value.toLowerCase() &&
                                src1.value.toLowerCase() === dest2.value.toLowerCase() &&
                                !next.label) {

                                // Keep first LD, skip second
                                optimized.push(token);
                                i++; // Skip next instruction
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved++;
                                optimizerLog(`  Removed identity swap at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // Pattern 2b: Adjacent PUSH rr / POP ss transfer for plain 16-bit pairs
                    //   push hl
                    //   pop de
                    // -> ld d,h / ld e,l
                    if (mnem === 'push' &&
                        i + 1 < tokens.length &&
                        token.operands.length === 1 &&
                        token.operands[0].type === 'register_pair' &&
                        !token.label) {
                        const next = tokens[i + 1];
                        const srcPair = String(token.operands[0].value).toLowerCase();
                        const pairRegs = pairByteLayout[srcPair];
                        if (pairRegs &&
                            next instanceof Instruction &&
                            !next.label &&
                            next.mnemonic.toLowerCase() === 'pop' &&
                            next.operands.length === 1 &&
                            next.operands[0].type === 'register_pair') {
                            const dstPair = String(next.operands[0].value).toLowerCase();
                            const dstRegs = pairByteLayout[dstPair];
                            if (dstRegs && dstPair !== srcPair) {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ld',
                                    [new Operand('register', dstRegs.high), new Operand('register', pairRegs.high)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                optimized.push(new Instruction(
                                    null,
                                    'ld',
                                    [new Operand('register', dstRegs.low), new Operand('register', pairRegs.low)],
                                    next.lineNumber,
                                    next.sourceLine
                                ));
                                i += 1;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 2;
                                optimizerLog(`  Folded adjacent PUSH ${srcPair.toUpperCase()} / POP ${dstPair.toUpperCase()} into register transfers at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // Pattern 2c: LD A,n / LD (HL|IX+d|IY+d),A -> LD (..),n when A dies here
                    if (isLdRegImm(token, 'a') &&
                        i + 1 < tokens.length &&
                        !token.label &&
                        this.isRegisterDeadBeforeNextUse(tokens, i, 'a')) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction &&
                            !next.label &&
                            isLdMemA(next) &&
                            memorySupportsImmediateByteStore(next.operands[0].value)) {
                            optimized.push(new Instruction(
                                token.label,
                                'ld',
                                [new Operand('memory', next.operands[0].value), new Operand('immediate', token.operands[1].value)],
                                token.lineNumber,
                                token.sourceLine
                            ));
                            i += 1;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Folded LD A,imm / LD ${String(next.operands[0].value).toUpperCase()},A into direct memory immediate store at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Pattern 2d: LD A,n / LD HL|H|L,addrpart / LD (HL),A -> address setup / LD (HL),n
                    // This recovers direct byte stores after source-level address setup
                    // avoids PUSH/POP around A. Only allow a single LD address setup that
                    // does not touch A, and only when A is dead after the store.
                    if (isLdRegImm(token, 'a') &&
                        i + 2 < tokens.length &&
                        !token.label) {
                        const addressSetup = tokens[i + 1];
                        const store = tokens[i + 2];
                        if (addressSetup instanceof Instruction &&
                            store instanceof Instruction &&
                            !addressSetup.label &&
                            !store.label &&
                            addressSetup.mnemonic.toLowerCase() === 'ld' &&
                            addressSetup.operands.length === 2 &&
                            ((addressSetup.operands[0].type === 'register_pair' && addressSetup.operands[0].value.toLowerCase() === 'hl') ||
                             (addressSetup.operands[0].type === 'register' && ['h', 'l'].includes(addressSetup.operands[0].value.toLowerCase()))) &&
                            !instructionTouchesRegister(addressSetup, 'a') &&
                            isLdMemA(store) &&
                            String(store.operands[0].value).toLowerCase() === 'hl' &&
                            memorySupportsImmediateByteStore(store.operands[0].value) &&
                            this.isRegisterDeadBeforeNextUse(tokens, i + 2, 'a')) {
                            optimized.push(addressSetup);
                            optimized.push(new Instruction(
                                store.label,
                                'ld',
                                [new Operand('memory', store.operands[0].value), new Operand('immediate', token.operands[1].value)],
                                store.lineNumber,
                                store.sourceLine
                            ));
                            i += 2;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 1;
                            optimizerLog(`  Folded LD A,imm / address setup / LD (HL),A into direct memory immediate store at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // ========================================
                    // Priority 1: Value Reuse
                    // ========================================

                    // Pattern: LD B,n / CP B -> CP n
                    // Keep this as a separate adjacent fold to complement the broader
                    // single-intervening-instruction rule below.
                    if (mnem === 'ld' && i + 1 < tokens.length && token.operands.length === 2 && !token.label) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction &&
                            !next.label &&
                            token.operands[0].type === 'register' &&
                            token.operands[0].value.toLowerCase() === 'b' &&
                            token.operands[1].type === 'immediate' &&
                            next.mnemonic.toLowerCase() === 'cp' &&
                            next.operands.length === 1 &&
                            next.operands[0].type === 'register' &&
                            next.operands[0].value.toLowerCase() === 'b') {
                            optimized.push(new Instruction(
                                next.label,
                                'cp',
                                [new Operand('immediate', token.operands[1].value)],
                                next.lineNumber,
                                next.sourceLine
                            ));
                            i++;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved++;
                            optimizerLog(`  Folded adjacent LD B,imm / CP B into CP imm at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Pattern: LD B,n / <A-producing instruction> / ALU ... ,B  -> immediate ALU form
                    // Example:
                    //   ld b,7
                    //   ld a,(var)
                    //   cp b
                    // becomes:
                    //   ld a,(var)
                    //   cp 7
                    // Restrict this to a single intervening instruction that does not touch B.
                    if (mnem === 'ld' && i + 2 < tokens.length && token.operands.length === 2 && !token.label) {
                        const dest1 = token.operands[0];
                        const src1 = token.operands[1];
                        const mid = tokens[i + 1];
                        const alu = tokens[i + 2];
                        if (dest1.type === 'register' &&
                            dest1.value.toLowerCase() === 'b' &&
                            src1.type === 'immediate' &&
                            mid instanceof Instruction &&
                            alu instanceof Instruction &&
                            !mid.label &&
                            !alu.label &&
                            !instructionTouchesRegister(mid, 'b')) {
                            const immOperand = new Operand('immediate', src1.value);
                            const aluMnem = alu.mnemonic.toLowerCase();
                            let replacement = null;
                            if ((aluMnem === 'sub' || aluMnem === 'and' || aluMnem === 'or' || aluMnem === 'xor' || aluMnem === 'cp') &&
                                alu.operands.length === 1 &&
                                alu.operands[0].type === 'register' &&
                                alu.operands[0].value.toLowerCase() === 'b') {
                                replacement = new Instruction(alu.label, aluMnem, [immOperand], alu.lineNumber, alu.sourceLine);
                            } else if ((aluMnem === 'add' || aluMnem === 'adc' || aluMnem === 'sbc') &&
                                alu.operands.length === 2 &&
                                alu.operands[0].type === 'register' &&
                                alu.operands[0].value.toLowerCase() === 'a' &&
                                alu.operands[1].type === 'register' &&
                                alu.operands[1].value.toLowerCase() === 'b') {
                                replacement = new Instruction(
                                    alu.label,
                                    aluMnem,
                                    [new Operand('register', 'a'), immOperand],
                                    alu.lineNumber,
                                    alu.sourceLine
                                );
                            }

                            if (replacement) {
                                optimized.push(mid);
                                optimized.push(replacement);
                                i += 2;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved++;
                                optimizerLog(`  Folded LD B,imm through single-instruction A setup into immediate ${aluMnem.toUpperCase()} at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.8d: Remove immediate IX local reload after storing HL bytes ===
                    // Example:
                    //   ld a,l
                    //   ld (ix-3),a
                    //   ld a,h
                    //   ld (ix-2),a
                    //   ld l,(ix-3)
                    //   ld h,(ix-2)
                    // HL already still holds the value just stored.
                    // If this is immediately followed by the IX epilogue, the local store itself
                    // is also dead because the function returns HL directly.
                    if (mnem === 'ld' &&
                        i + 5 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].value.toLowerCase() === 'l' &&
                        !token.label) {
                        const t2 = tokens[i + 1];
                        const t3 = tokens[i + 2];
                        const t4 = tokens[i + 3];
                        const t5 = tokens[i + 4];
                        const t6 = tokens[i + 5];
                        if (t2 instanceof Instruction && t3 instanceof Instruction &&
                            t4 instanceof Instruction && t5 instanceof Instruction && t6 instanceof Instruction &&
                            !t2.label && !t3.label && !t4.label && !t5.label && !t6.label &&
                            isLdMemA(t2) &&
                            t3.mnemonic.toLowerCase() === 'ld' &&
                            t3.operands.length === 2 &&
                            t3.operands[0].type === 'register' &&
                            t3.operands[1].type === 'register' &&
                            t3.operands[0].value.toLowerCase() === 'a' &&
                            t3.operands[1].value.toLowerCase() === 'h' &&
                            isLdMemA(t4) &&
                            t5.mnemonic.toLowerCase() === 'ld' &&
                            t5.operands.length === 2 &&
                            t5.operands[0].type === 'register' &&
                            t5.operands[0].value.toLowerCase() === 'l' &&
                            t5.operands[1].type === 'memory' &&
                            t6.mnemonic.toLowerCase() === 'ld' &&
                            t6.operands.length === 2 &&
                            t6.operands[0].type === 'register' &&
                            t6.operands[0].value.toLowerCase() === 'h' &&
                            t6.operands[1].type === 'memory') {
                            const storeLo = parseIndexedDisplacement(t2.operands[0].value);
                            const storeHi = parseIndexedDisplacement(t4.operands[0].value);
                            const loadLo = parseIndexedDisplacement(t5.operands[1].value);
                            const loadHi = parseIndexedDisplacement(t6.operands[1].value);
                            if (storeLo && storeHi && loadLo && loadHi &&
                                storeLo.base === 'ix' && storeHi.base === 'ix' &&
                                loadLo.base === 'ix' && loadHi.base === 'ix' &&
                                loadLo.offset === storeLo.offset &&
                                loadHi.offset === storeHi.offset) {
                                const ep1 = tokens[i + 6];
                                const ep2 = tokens[i + 7];
                                const ep3 = tokens[i + 8];
                                if (ep1 instanceof Instruction &&
                                    ep2 instanceof Instruction &&
                                    ep3 instanceof Instruction &&
                                    !ep1.label && !ep2.label && !ep3.label &&
                                    ep1.mnemonic.toLowerCase() === 'ld' &&
                                    ep1.operands.length === 2 &&
                                    ep1.operands[0].type === 'register_pair' &&
                                    ep1.operands[0].value.toLowerCase() === 'sp' &&
                                    ep1.operands[1].type === 'register_pair' &&
                                    ep1.operands[1].value.toLowerCase() === 'ix' &&
                                    ep2.mnemonic.toLowerCase() === 'pop' &&
                                    ep2.operands.length === 1 &&
                                    ep2.operands[0].type === 'register_pair' &&
                                    ep2.operands[0].value.toLowerCase() === 'ix' &&
                                    ep3.mnemonic.toLowerCase() === 'ret') {
                                    optimized.push(ep1, ep2, ep3);
                                    i += 8;
                                    this.stats.peepholeOpts++;
                                    this.stats.bytesSaved += 18;
                                    optimizerLog(`  Removed dead tail IX local store/reload of HL before epilogue at line ${token.lineNumber}`, 'debug');
                                    continue;
                                }
                                optimized.push(token, t2, t3, t4);
                                i += 5;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 6;
                                optimizerLog(`  Removed redundant IX local reload of HL at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.8d1: Remove dead tail IX local store/reload of A before epilogue ===
                    // Pattern:
                    //   ld (ix+d),a
                    //   ld a,(ix+d)
                    //   ld sp,ix
                    //   pop ix
                    //   ret
                    if (mnem === 'ld' &&
                        i + 4 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'memory' &&
                        typeof token.operands[0].value === 'string' &&
                        parseIndexedDisplacement(token.operands[0].value) &&
                        token.operands[1].type === 'register' &&
                        token.operands[1].value.toLowerCase() === 'a' &&
                        !token.label) {
                        const t2 = tokens[i + 1];
                        const t3 = tokens[i + 2];
                        const t4 = tokens[i + 3];
                        const t5 = tokens[i + 4];
                        if (t2 instanceof Instruction &&
                            t3 instanceof Instruction &&
                            t4 instanceof Instruction &&
                            t5 instanceof Instruction &&
                            !t2.label && !t3.label && !t4.label && !t5.label &&
                            isLdAFromMem(t2, token.operands[0].value) &&
                            t3.mnemonic.toLowerCase() === 'ld' &&
                            t3.operands.length === 2 &&
                            t3.operands[0].type === 'register_pair' &&
                            t3.operands[0].value.toLowerCase() === 'sp' &&
                            t3.operands[1].type === 'register_pair' &&
                            t3.operands[1].value.toLowerCase() === 'ix' &&
                            t4.mnemonic.toLowerCase() === 'pop' &&
                            t4.operands.length === 1 &&
                            t4.operands[0].type === 'register_pair' &&
                            t4.operands[0].value.toLowerCase() === 'ix' &&
                            t5.mnemonic.toLowerCase() === 'ret') {
                            optimized.push(t3, t4, t5);
                            i += 4;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(token) + getInstructionSize(t2);
                            optimizerLog(`  Removed dead tail IX local store/reload of A before epilogue at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.8d3: Drop dead initial IX local copy of HL before direct use ===
                    // Pattern:
                    //   ld a,l
                    //   ld (ix+d1),a
                    //   ld a,h
                    //   ld (ix+d2),a
                    //   push hl
                    //   ...
                    // If the stored local is never read before being overwritten later, the
                    // initial copy is dead. This matches helpers like AddTwo where a local is
                    // only used as a source-level name for a value already in HL.
                    if (mnem === 'ld' &&
                        i + 4 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].value.toLowerCase() === 'l' &&
                        !token.label) {
                        const t2 = tokens[i + 1];
                        const t3 = tokens[i + 2];
                        const t4 = tokens[i + 3];
                        const t5 = tokens[i + 4];
                        if (t2 instanceof Instruction && t3 instanceof Instruction && t4 instanceof Instruction && t5 instanceof Instruction &&
                            !t2.label && !t3.label && !t4.label && !t5.label &&
                            isLdMemA(t2) &&
                            t3.mnemonic.toLowerCase() === 'ld' &&
                            t3.operands.length === 2 &&
                            t3.operands[0].type === 'register' &&
                            t3.operands[1].type === 'register' &&
                            t3.operands[0].value.toLowerCase() === 'a' &&
                            t3.operands[1].value.toLowerCase() === 'h' &&
                            isLdMemA(t4) &&
                            t5.mnemonic.toLowerCase() === 'push' &&
                            t5.operands.length === 1 &&
                            t5.operands[0].type === 'register_pair' &&
                            t5.operands[0].value.toLowerCase() === 'hl') {
                            const storeLo = parseIndexedDisplacement(t2.operands[0].value);
                            const storeHi = parseIndexedDisplacement(t4.operands[0].value);
                            if (storeLo && storeHi &&
                                storeLo.base === 'ix' && storeHi.base === 'ix') {
                                let readBeforeOverwrite = false;
                                let overwriteSeen = false;
                                for (let j = i + 5; j < tokens.length; j++) {
                                    const look = tokens[j];
                                    if (!(look instanceof Instruction) || look.label) break;
                                    if (readsIndexedOffset(look, storeLo.base, storeLo.offset) ||
                                        readsIndexedOffset(look, storeHi.base, storeHi.offset)) {
                                        readBeforeOverwrite = true;
                                        break;
                                    }
                                    if (writesIndexedOffset(look, storeLo.base, storeLo.offset) ||
                                        writesIndexedOffset(look, storeHi.base, storeHi.offset)) {
                                        overwriteSeen = true;
                                        break;
                                    }
                                }
                                if (overwriteSeen && !readBeforeOverwrite) {
                                    optimized.push(t5);
                                    i += 4;
                                    this.stats.peepholeOpts++;
                                    this.stats.bytesSaved += getInstructionSize(token) + getInstructionSize(t2) + getInstructionSize(t3) + getInstructionSize(t4);
                                    optimizerLog(`  Removed dead initial IX local HL copy before overwrite at line ${token.lineNumber}`, 'debug');
                                    continue;
                                }
                            }
                        }
                    }

                    // === PHASE 1.8d4: Collapse dead IX byte-local accumulator temp before return ===
                    // Matches functions like:
                    //   Sum = N
                    //   add Sum by N
                    //   add Sum by N
                    //   return Sum
                    // where the byte local is dead and A/B already carry the result.
                    if (mnem === 'ld' &&
                        i + 12 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].type === 'memory' &&
                        !token.label) {
                        const t2 = tokens[i + 1];
                        const t3 = tokens[i + 2];
                        const t4 = tokens[i + 3];
                        const t5 = tokens[i + 4];
                        const t6 = tokens[i + 5];
                        const t7 = tokens[i + 6];
                        const t8 = tokens[i + 7];
                        const t9 = tokens[i + 8];
                        const t10 = tokens[i + 9];
                        const t11 = tokens[i + 10];
                        const t12 = tokens[i + 11];
                        const t13 = tokens[i + 12];
                        if ([t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12,t13].every((t) => t instanceof Instruction && !t.label) &&
                            isLdMemA(t2) &&
                            isLdAFromMem(t3, token.operands[1].value) &&
                            t4.mnemonic.toLowerCase() === 'ld' &&
                            t4.operands.length === 2 &&
                            t4.operands[0].type === 'register' &&
                            t4.operands[0].value.toLowerCase() === 'b' &&
                            t4.operands[1].type === 'register' &&
                            t4.operands[1].value.toLowerCase() === 'a' &&
                            isLdAFromMem(t5, t2.operands[0].value) &&
                            t6.mnemonic.toLowerCase() === 'add' &&
                            t6.operands.length === 2 &&
                            t6.operands[0].type === 'register' &&
                            t6.operands[0].value.toLowerCase() === 'a' &&
                            t6.operands[1].type === 'register' &&
                            t6.operands[1].value.toLowerCase() === 'b' &&
                            isLdMemA(t7) &&
                            isLdAFromMem(t8, t2.operands[0].value) &&
                            isLdAFromMem(t9, t7.operands[0].value) &&
                            t10.mnemonic.toLowerCase() === 'add' &&
                            t10.operands.length === 2 &&
                            t10.operands[0].type === 'register' &&
                            t10.operands[0].value.toLowerCase() === 'a' &&
                            t10.operands[1].type === 'register' &&
                            t10.operands[1].value.toLowerCase() === 'b' &&
                            isLdMemA(t11) &&
                            isLdAFromMem(t12, t11.operands[0].value) &&
                            t13.mnemonic.toLowerCase() === 'ld' &&
                            t13.operands.length === 2 &&
                            t13.operands[0].type === 'register_pair' &&
                            t13.operands[0].value.toLowerCase() === 'sp' &&
                            t13.operands[1].type === 'register_pair' &&
                            t13.operands[1].value.toLowerCase() === 'ix') {
                            const localSlot = t2.operands[0].value;
                            if (t7.operands[0].value === localSlot &&
                                t11.operands[0].value === localSlot) {
                                optimized.push(token, t4, t6, t10);
                                i += 11;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 18;
                                optimizerLog(`  Collapsed dead IX byte-local accumulator temp before epilogue at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // === PHASE 1.8d2: Drop dead tail store/reload before IX-frame epilogue ===
                    // Patterns:
                    //   ld a,l
                    //   ld (ix+d1),a
                    //   ld a,h
                    //   ld (ix+d2),a
                    //   ld l,(ix+d1)
                    //   ld h,(ix+d2)
                    //   ld sp,ix
                    //   pop ix
                    //   ret
                    // and
                    //   ld (ix+d),a
                    //   ld a,(ix+d)
                    //   ld sp,ix
                    //   pop ix
                    //   ret
                    // The local is dead at function exit; the return register already holds the value.
                    if (mnem === 'ld' &&
                        i + 8 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register' &&
                        token.operands[1].type === 'register' &&
                        token.operands[0].value.toLowerCase() === 'a' &&
                        token.operands[1].value.toLowerCase() === 'l' &&
                        !token.label) {
                        const t2 = tokens[i + 1];
                        const t3 = tokens[i + 2];
                        const t4 = tokens[i + 3];
                        const t5 = tokens[i + 4];
                        const t6 = tokens[i + 5];
                        const t7 = tokens[i + 6];
                        const t8 = tokens[i + 7];
                        const t9 = tokens[i + 8];
                        if (t2 instanceof Instruction && t3 instanceof Instruction && t4 instanceof Instruction &&
                            t5 instanceof Instruction && t6 instanceof Instruction && t7 instanceof Instruction &&
                            t8 instanceof Instruction && t9 instanceof Instruction &&
                            !t2.label && !t3.label && !t4.label && !t5.label && !t6.label && !t7.label && !t8.label && !t9.label &&
                            isLdMemA(t2) &&
                            t3.mnemonic.toLowerCase() === 'ld' &&
                            t3.operands.length === 2 &&
                            t3.operands[0].type === 'register' &&
                            t3.operands[1].type === 'register' &&
                            t3.operands[0].value.toLowerCase() === 'a' &&
                            t3.operands[1].value.toLowerCase() === 'h' &&
                            isLdMemA(t4) &&
                            t5.mnemonic.toLowerCase() === 'ld' &&
                            t5.operands.length === 2 &&
                            t5.operands[0].type === 'register' &&
                            t5.operands[0].value.toLowerCase() === 'l' &&
                            t5.operands[1].type === 'memory' &&
                            t6.mnemonic.toLowerCase() === 'ld' &&
                            t6.operands.length === 2 &&
                            t6.operands[0].type === 'register' &&
                            t6.operands[0].value.toLowerCase() === 'h' &&
                            t6.operands[1].type === 'memory' &&
                            t7.mnemonic.toLowerCase() === 'ld' &&
                            t7.operands.length === 2 &&
                            t7.operands[0].type === 'register_pair' &&
                            t7.operands[0].value.toLowerCase() === 'sp' &&
                            t7.operands[1].type === 'register_pair' &&
                            t7.operands[1].value.toLowerCase() === 'ix' &&
                            t8.mnemonic.toLowerCase() === 'pop' &&
                            t8.operands.length === 1 &&
                            t8.operands[0].type === 'register_pair' &&
                            t8.operands[0].value.toLowerCase() === 'ix' &&
                            t9.mnemonic.toLowerCase() === 'ret') {
                            const storeLo = parseIndexedDisplacement(t2.operands[0].value);
                            const storeHi = parseIndexedDisplacement(t4.operands[0].value);
                            const loadLo = parseIndexedDisplacement(t5.operands[1].value);
                            const loadHi = parseIndexedDisplacement(t6.operands[1].value);
                            if (storeLo && storeHi && loadLo && loadHi &&
                                storeLo.base === 'ix' && storeHi.base === 'ix' &&
                                loadLo.base === 'ix' && loadHi.base === 'ix' &&
                                loadLo.offset === storeLo.offset &&
                                loadHi.offset === storeHi.offset) {
                                optimized.push(t7, t8, t9);
                                i += 8;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += 18;
                                optimizerLog(`  Removed dead tail HL local store/reload before epilogue at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }
                    if (mnem === 'ld' &&
                        i + 4 < tokens.length &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'memory' &&
                        typeof token.operands[0].value === 'string' &&
                        parseIndexedDisplacement(token.operands[0].value) &&
                        token.operands[1].type === 'register' &&
                        token.operands[1].value.toLowerCase() === 'a' &&
                        !token.label) {
                        const t2 = tokens[i + 1];
                        const t3 = tokens[i + 2];
                        const t4 = tokens[i + 3];
                        const t5 = tokens[i + 4];
                        if (t2 instanceof Instruction && t3 instanceof Instruction && t4 instanceof Instruction && t5 instanceof Instruction &&
                            !t2.label && !t3.label && !t4.label && !t5.label &&
                            t2.mnemonic.toLowerCase() === 'ld' &&
                            t2.operands.length === 2 &&
                            t2.operands[0].type === 'register' &&
                            t2.operands[0].value.toLowerCase() === 'a' &&
                            t2.operands[1].type === 'memory' &&
                            t2.operands[1].value === token.operands[0].value &&
                            t3.mnemonic.toLowerCase() === 'ld' &&
                            t3.operands.length === 2 &&
                            t3.operands[0].type === 'register_pair' &&
                            t3.operands[0].value.toLowerCase() === 'sp' &&
                            t3.operands[1].type === 'register_pair' &&
                            t3.operands[1].value.toLowerCase() === 'ix' &&
                            t4.mnemonic.toLowerCase() === 'pop' &&
                            t4.operands.length === 1 &&
                            t4.operands[0].type === 'register_pair' &&
                            t4.operands[0].value.toLowerCase() === 'ix' &&
                            t5.mnemonic.toLowerCase() === 'ret') {
                            optimized.push(t3, t4, t5);
                            i += 4;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += getInstructionSize(token) + getInstructionSize(t2);
                            optimizerLog(`  Removed dead tail A local store/reload before epilogue at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // === PHASE 1.8e: Remove dead LD SP,HL before later frame restore ===
                    // Experimental only. This is unsafe for Amy stack-frame locals on
                    // ColecoVision if an NMI can push into the unreserved frame window.
                    if (this.config.hazardousValueReuse &&
                        mnem === 'ld' &&
                        token.operands.length === 2 &&
                        token.operands[0].type === 'register_pair' &&
                        token.operands[1].type === 'register_pair' &&
                        token.operands[0].value.toLowerCase() === 'sp' &&
                        token.operands[1].value.toLowerCase() === 'hl' &&
                        !token.label) {
                        let canRemove = false;
                        for (let j = i + 1; j < tokens.length && j <= i + 12; j++) {
                            const next = tokens[j];
                            if (!(next instanceof Instruction) || next.label) break;
                            if (next.mnemonic.toLowerCase() === 'ld' &&
                                next.operands.length === 2 &&
                                next.operands[0].type === 'register_pair' &&
                                next.operands[0].value.toLowerCase() === 'sp' &&
                                next.operands[1].type === 'register_pair' &&
                                ['ix', 'sp'].includes(next.operands[1].value.toLowerCase())) {
                                canRemove = true;
                                break;
                            }
                            if (instructionTouchesRegister(next, 'sp') ||
                                ['push', 'pop', 'call', 'rst', 'ret', 'reti', 'retn', 'jp', 'jr', 'djnz', 'halt'].includes(next.mnemonic.toLowerCase())) {
                                break;
                            }
                        }
                        if (canRemove) {
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved++;
                            optimizerLog(`  Removed dead LD SP,HL before later frame restore at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // Pattern: LD A,n followed by LD r,n → LD A,n; LD r,A (if r != A)
                    // Only optimize for 8-bit registers and immediate values
                    if (mnem === 'ld' && i + 1 < tokens.length && token.operands.length === 2) {
                        const dest1 = token.operands[0];
                        const src1 = token.operands[1];

                        // First instruction loads immediate into register
                        if (dest1.type === 'register' && src1.type === 'immediate') {
                            const next = tokens[i + 1];

                            if (next instanceof Instruction &&
                                next.mnemonic.toLowerCase() === 'ld' &&
                                next.operands.length === 2) {

                                const dest2 = next.operands[0];
                                const src2 = next.operands[1];

                                // Second instruction loads SAME immediate into different register
                                if (dest2.type === 'register' &&
                                    src2.type === 'immediate' &&
                                    src1.value === src2.value &&
                                    dest1.value.toLowerCase() !== dest2.value.toLowerCase()) {

                                    // Check that both are 8-bit registers (not 16-bit pairs)
                                    const is8bit = (reg) => {
                                        const r = reg.toLowerCase();
                                        return ['a', 'b', 'c', 'd', 'e', 'h', 'l', 'ixh', 'ixl', 'iyh', 'iyl'].includes(r);
                                    };

                                    if (is8bit(dest1.value) && is8bit(dest2.value)) {
                                        // Replace: LD r2,n → LD r2,r1
                                        optimized.push(token); // Keep first LD

                                        const newNext = new Instruction(
                                            next.label,
                                            'ld',
                                            [dest2, new Operand('register', dest1.value)],
                                            next.lineNumber
                                        );
                                        optimized.push(newNext);

                                        i++; // Skip original next
                                        this.stats.peepholeOpts++;
                                        this.stats.bytesSaved++; // LD r,n (2 bytes) → LD r,r (1 byte)
                                        optimizerLog(`  Value reuse: LD ${dest2.value},${src2.value} → LD ${dest2.value},${dest1.value} at line ${next.lineNumber}`, 'debug');
                                        continue;
                                    }
                                }
                            }
                        }
                    }

                    // Pattern: short-range 16-bit immediate byte reuse into A
                    // Example:
                    //   ld bc,$000E
                    //   ld hl,label
                    //   ld a,$0E
                    // -> ld a,c
                    if (this.config.localValueReuse &&
                        mnem === 'ld' && token.operands.length === 2) {
                        const dest1 = token.operands[0];
                        const src1 = token.operands[1];
                        if (dest1.type === 'register_pair' && src1.type === 'immediate') {
                            const pair = dest1.value.toLowerCase();
                            const lowRegMap = { bc: 'c', de: 'e', hl: 'l' };
                            const highRegMap = { bc: 'b', de: 'd', hl: 'h' };
                            const lowReg = lowRegMap[pair];
                            const highReg = highRegMap[pair];
                            if (lowReg && highReg) {
                                const lowByte = src1.value & 0xFF;
                                const highByte = (src1.value >> 8) & 0xFF;
                                let didReplace = false;
                                for (let j = i + 1; j < tokens.length && j <= i + SHORT_LOCAL_REUSE_WINDOW; j++) {
                                    const next = tokens[j];
                                    if (!(next instanceof Instruction) || next.label) break;
                                    if (instructionCanClobberRegister(next, pair)) break;
                                    if (next.mnemonic.toLowerCase() === 'ld' &&
                                        next.operands.length === 2 &&
                                        next.operands[0].type === 'register' &&
                                        next.operands[0].value.toLowerCase() === 'a' &&
                                        next.operands[1].type === 'immediate') {
                                        const nextImm = next.operands[1].value & 0xFF;
                                        let replacementReg = null;
                                        if (nextImm === lowByte) replacementReg = lowReg;
                                        else if (nextImm === highByte) replacementReg = highReg;
                                        if (replacementReg) {
                                            optimized.push(token);
                                            for (let k = i + 1; k < j; k++) {
                                                optimized.push(tokens[k]);
                                            }
                                            optimized.push(new Instruction(
                                                next.label,
                                                'ld',
                                                [new Operand('register', 'a'), new Operand('register', replacementReg)],
                                                next.lineNumber,
                                                next.sourceLine
                                            ));
                                            i = j;
                                            this.stats.peepholeOpts++;
                                            this.stats.bytesSaved++;
                                            optimizerLog(`  Short-range value reuse: LD ${pair.toUpperCase()},imm + LD A,byte -> LD A,${replacementReg.toUpperCase()} at line ${next.lineNumber}`, 'debug');
                                            didReplace = true;
                                            break;
                                        }
                                    }
                                }
                                if (didReplace) {
                                    continue;
                                }
                            }
                        }
                    }

                    // Pattern: LD rr,nn followed by LD A,high/low(nn) → LD rr,nn; LD A,r
                    // Example:
                    //   ld bc,$0006
                    //   ld a,$06
                    // becomes:
                    //   ld bc,$0006
                    //   ld a,c
                    // and:
                    //   ld bc,$0106
                    //   ld a,$01
                    // becomes:
                    //   ld bc,$0106
                    //   ld a,b
                    // This is profitable for BC/DE/HL only, where the low byte is directly
                    // addressable as C/E/L. Skip IX/IY/SP because their low halves are not
                    // plain 8-bit registers in normal Z80 encoding.
                    if (this.config.localValueReuse &&
                        mnem === 'ld' && i + 1 < tokens.length && token.operands.length === 2) {
                        const dest1 = token.operands[0];
                        const src1 = token.operands[1];
                        const next = tokens[i + 1];

                        if (next instanceof Instruction &&
                            !next.label &&
                            dest1.type === 'register_pair' &&
                            src1.type === 'immediate' &&
                            next.mnemonic.toLowerCase() === 'ld' &&
                            next.operands.length === 2 &&
                            next.operands[0].type === 'register' &&
                            next.operands[0].value.toLowerCase() === 'a' &&
                            next.operands[1].type === 'immediate') {

                            const pair = dest1.value.toLowerCase();
                            const lowRegMap = { bc: 'c', de: 'e', hl: 'l' };
                            const highRegMap = { bc: 'b', de: 'd', hl: 'h' };
                            const lowReg = lowRegMap[pair];
                            const highReg = highRegMap[pair];
                            if (lowReg && highReg) {
                                const lowByte = src1.value & 0xFF;
                                const highByte = (src1.value >> 8) & 0xFF;
                                const nextImm = next.operands[1].value & 0xFF;
                                let replacementReg = null;
                                if (nextImm === lowByte) replacementReg = lowReg;
                                else if (nextImm === highByte) replacementReg = highReg;

                                if (replacementReg) {
                                    optimized.push(token);
                                    optimized.push(new Instruction(
                                        next.label,
                                        'ld',
                                        [new Operand('register', 'a'), new Operand('register', replacementReg)],
                                        next.lineNumber,
                                        next.sourceLine
                                    ));
                                    i++;
                                    this.stats.peepholeOpts++;
                                    this.stats.bytesSaved++;
                                    optimizerLog(`  Value reuse: LD ${dest1.value},${src1.value} + LD A,byte → LD A,${replacementReg.toUpperCase()} at line ${next.lineNumber}`, 'debug');
                                    continue;
                                }
                            }
                        }
                    }

                    // ========================================
                    // Phase 1.7: NOP Removal
                    // ========================================
                    if (mnem === 'nop' && !token.label) {
                        // NOPs are not generally safe to remove on Z80/ColecoVision:
                        // they may encode VDP/PSG timing gaps, preserve ABI/layout
                        // expectations between entry points, or act as intentional
                        // cycle padding in hand-tuned routines. Keep them unless a
                        // future explicit "removable nop" annotation exists.
                        optimized.push(token);
                        continue;
                    }

                    // ========================================
                    // Phase 1.8: Double EX Cancellation
                    // ========================================
                    if ((mnem === 'ex' || mnem === 'exx') && i + 1 < tokens.length) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction && !next.label) {
                            const nextMnem = next.mnemonic.toLowerCase();
                            if (nextMnem === mnem) {
                                const sameOps = mnem === 'exx' ||
                                    (token.operands.length === 2 && next.operands.length === 2 &&
                                     token.operands[0].value.toLowerCase() === next.operands[0].value.toLowerCase() &&
                                     token.operands[1].value.toLowerCase() === next.operands[1].value.toLowerCase());
                                if (sameOps && !token.label) {
                                    i++;
                                    this.stats.peepholeOpts++;
                                    this.stats.bytesSaved += 2;
                                    optimizerLog(`  Double EX cancelled at line ${token.lineNumber}`, 'debug');
                                    continue;
                                }
                            }
                        }
                    }

                    // ========================================
                    // Phase 1.8a: Short-range EX ... EX cancellation
                    // ========================================
                    if (mnem === 'ex' &&
                        token.operands.length === 2 &&
                        !token.label) {
                        const buffered = [];
                        let cancelIndex = -1;
                        for (let j = i + 1; j < tokens.length && j <= i + 4; j++) {
                            const midTok = tokens[j];
                            if (!(midTok instanceof Instruction) || midTok.label) break;
                            const midMnem = midTok.mnemonic.toLowerCase();
                            if (midMnem === 'ex' &&
                                midTok.operands.length === 2 &&
                                String(midTok.operands[0].value).toLowerCase() === String(token.operands[0].value).toLowerCase() &&
                                String(midTok.operands[1].value).toLowerCase() === String(token.operands[1].value).toLowerCase()) {
                                cancelIndex = j;
                                break;
                            }
                            if (midMnem === 'exx' ||
                                isUnconditionalFlowStop(midTok) ||
                                ['call', 'rst', 'reti', 'retn', 'jp', 'jr', 'djnz'].includes(midMnem) ||
                                instructionCanClobberRegister(midTok, 'de') ||
                                instructionCanClobberRegister(midTok, 'hl')) {
                                break;
                            }
                            buffered.push(midTok);
                        }

                        if (cancelIndex !== -1 && buffered.length > 0) {
                            for (const midTok of buffered) optimized.push(midTok);
                            i = cancelIndex;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved += 2;
                            optimizerLog(`  Cancelled short-range EX pair around inert instructions at line ${token.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // ========================================
                    // Phase 1.9: Duplicate Flag Instructions
                    // ========================================
                    if (['scf', 'di', 'ei'].includes(mnem) && i + 1 < tokens.length) {
                        const next = tokens[i + 1];
                        if (next instanceof Instruction &&
                            next.mnemonic.toLowerCase() === mnem && !next.label) {
                            optimized.push(token);
                            i++;
                            this.stats.peepholeOpts++;
                            this.stats.bytesSaved++;
                            optimizerLog(`  Duplicate ${mnem.toUpperCase()} removed at line ${next.lineNumber}`, 'debug');
                            continue;
                        }
                    }

                    // ========================================
                    // Phase 1.10r: Jump to labeled plain-RET stub
                    // ========================================
                    if ((mnem === 'jp' || mnem === 'jr') && token.operands.length >= 1) {
                        const lastOp = token.operands[token.operands.length - 1];
                        if (lastOp &&
                            lastOp.type === 'symbol' &&
                            labeledPlainRetStubs.has(lastOp.value)) {
                            if (token.operands.length === 1) {
                                optimized.push(new Instruction(token.label, 'ret', [], token.lineNumber, token.sourceLine));
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += (mnem === 'jp' ? 2 : 1);
                                optimizerLog(`  Replaced ${mnem.toUpperCase()} ${lastOp.value} with RET at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                            if (token.operands.length === 2 &&
                                token.operands[0].type === 'condition') {
                                optimized.push(new Instruction(
                                    token.label,
                                    'ret',
                                    [new Operand('condition', token.operands[0].value)],
                                    token.lineNumber,
                                    token.sourceLine
                                ));
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += (mnem === 'jp' ? 2 : 1);
                                optimizerLog(`  Replaced ${mnem.toUpperCase()} ${token.operands[0].value},${lastOp.value} with RET ${token.operands[0].value} at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // ========================================
                    // Phase 1.10: Jump to Next Instruction
                    // ========================================
                    if ((mnem === 'jp' || mnem === 'jr') && !token.label) {
                        const lastOp = token.operands[token.operands.length - 1];
                        if (lastOp && lastOp.type === 'symbol' && token.operands.length === 1) {
                            let nextMeaningful = null;
                            for (let j = i + 1; j < tokens.length; j++) {
                                if (tokens[j] instanceof Instruction || tokens[j] instanceof Directive) {
                                    nextMeaningful = tokens[j];
                                    break;
                                }
                            }
                            if (nextMeaningful && nextMeaningful.label === lastOp.value) {
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved += (mnem === 'jp' ? 3 : 2);
                                optimizerLog(`  Jump-to-next removed (${mnem.toUpperCase()} ${lastOp.value}) at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // ========================================
                    // Phase 1.11: 16-bit Constant Folding
                    // ========================================
                    {
                        const sixteenBitRegs = new Set(['bc','de','hl','sp','ix','iy']);
                        if (mnem === 'ld' && token.operands.length === 2 &&
                            token.operands[0].type === 'register' &&
                            sixteenBitRegs.has(token.operands[0].value.toLowerCase()) &&
                            token.operands[1].type === 'immediate' &&
                            i + 1 < tokens.length) {
                            const next = tokens[i + 1];
                            if (next instanceof Instruction && !next.label &&
                                ['inc','dec'].includes(next.mnemonic.toLowerCase()) &&
                                next.operands.length === 1 &&
                                next.operands[0].type === 'register' &&
                                next.operands[0].value.toLowerCase() === token.operands[0].value.toLowerCase()) {
                                const delta = next.mnemonic.toLowerCase() === 'inc' ? 1 : -1;
                                const newVal = (token.operands[1].value + delta) & 0xFFFF;
                                const folded = new Instruction(token.label, 'ld',
                                    [token.operands[0], new Operand('immediate', newVal)],
                                    token.lineNumber);
                                optimized.push(folded);
                                i++;
                                this.stats.peepholeOpts++;
                                this.stats.bytesSaved++;
                                optimizerLog(`  16-bit fold: LD ${token.operands[0].value},${token.operands[1].value} + ${next.mnemonic.toUpperCase()} → LD ${token.operands[0].value},${newVal} at line ${token.lineNumber}`, 'debug');
                                continue;
                            }
                        }
                    }

                    // ========================================
                    // Phase 1.12: Jump-Over-Jump
                    // ========================================
                    {
                        const invertMap = {z:'nz',nz:'z',c:'nc',nc:'c',pe:'po',po:'pe',p:'m',m:'p'};
                        if (mnem === 'jp' && token.operands.length === 2 &&
                            token.operands[0].type === 'condition' &&
                            i + 1 < tokens.length) {
                            const skipLabel = token.operands[1].value;
                            const nextTok = tokens[i + 1];
                            if (nextTok instanceof Instruction && !nextTok.label &&
                                (nextTok.mnemonic.toLowerCase() === 'jp' || nextTok.mnemonic.toLowerCase() === 'jr') &&
                                nextTok.operands.length === 1) {
                                let afterTok = null;
                                for (let j = i + 2; j < tokens.length; j++) {
                                    if (tokens[j].label || tokens[j] instanceof Instruction || tokens[j] instanceof Directive) {
                                        afterTok = tokens[j];
                                        break;
                                    }
                                }
                                if (afterTok && afterTok.label === skipLabel) {
                                    const cond = token.operands[0].value.toLowerCase();
                                    const inv = invertMap[cond];
                                    if (inv) {
                                        const newJp = new Instruction(token.label, 'jp',
                                            [new Operand('condition', inv), nextTok.operands[0]],
                                            token.lineNumber);
                                        optimized.push(newJp);
                                        i++;
                                        this.stats.peepholeOpts++;
                                        const saved = nextTok.mnemonic.toLowerCase() === 'jp' ? 3 : 2;
                                        this.stats.bytesSaved += saved;
                                        optimizerLog(`  Jump-over-jump: JP ${cond},${skipLabel} + ${nextTok.mnemonic.toUpperCase()} → JP ${inv},${nextTok.operands[0].value} at line ${token.lineNumber}`, 'debug');
                                        continue;
                                    }
                                }
                            }
                        }
                    }

                    // No optimization, keep instruction
                    optimized.push(token);
                }

                return optimized;
            }
        }

