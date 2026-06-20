export class Instruction {
    constructor(label, mnemonic, operands, lineNumber = 0, sourceLine = '') {
        this.label = label;
        this.mnemonic = mnemonic;
        this.operands = operands;
        this.lineNumber = lineNumber;
        this.sourceLine = sourceLine;
    }
}

export class Directive {
    constructor(label, name, operands, lineNumber = 0, sourceLine = '') {
        this.label = label;
        this.name = name;
        this.operands = operands;
        this.lineNumber = lineNumber;
        this.sourceLine = sourceLine;
    }
}

export class Operand {
    constructor(type, value, isShadow = false) {
        this.type = type;
        this.value = value;
        this.isShadow = isShadow; // Track if shadow register notation was used (A', B', BC', etc.)
    }
}

// Enhanced Number Parser with multiple format support
export class NumberParser {
    constructor() {
        this.defaultRadix = 10;
        this.syntaxModes = {
            intel: true,
            motorola: true,
            c: true,
            ibm: true
        };
    }

    parseNumber(str) {
        if (!str) return null;

        // Remove whitespace
        str = str.trim();
        if (!str) return null;

        // Reject expressions with operators - these should be evaluated as expressions
        // Check for operators outside of quotes (but allow negative numbers with leading -)
        // Include: arithmetic (+, *, /), bitwise (&, |, ^, ~, <<, >>), comparison (==, !=, <, >, <=, >=)
        if (/[\+\*\/\&\|\^\~\<\>\=\!]/.test(str) || (/-/.test(str.substring(1)))) {
            return null;  // This is an expression, not a simple number
        }

        // Try different number formats
        
        // Motorola/Intel: $hex (must have at least one hex digit after $)
        // Note: $ alone means "current PC" and should be treated as a symbol, not a number
        if (str.startsWith('$') && str.length > 1 && /^[0-9a-fA-F]+$/.test(str.substring(1))) {
            return parseInt(str.substring(1), 16);
        }
        
        // C style: 0x/0X hex, 0b binary, 0 octal
        if (str.startsWith('0x') || str.startsWith('0X')) {
            return parseInt(str, 16);
        }
        if (str.startsWith('0b') || str.startsWith('0B')) {
            return parseInt(str.substring(2), 2);
        }
        if (str.startsWith('0') && str.length > 1 && /^[0-7]+$/.test(str.substring(1))) {
            return parseInt(str, 8);
        }
        
        // Intel suffix: hex with H, binary with B, octal with O/Q
        if (/^[0-9a-fA-F]+[hH]$/.test(str)) {
            return parseInt(str.slice(0, -1), 16);
        }
        if (/^[01]+[bB]$/.test(str)) {
            return parseInt(str.slice(0, -1), 2);
        }
        if (/^[0-7]+[oOqQ]$/.test(str)) {
            return parseInt(str.slice(0, -1), 8);
        }
        
        // Motorola prefix: %binary, @octal
        if (str.startsWith('%')) {
            return parseInt(str.substring(1), 2);
        }
        if (str.startsWith('@')) {
            return parseInt(str.substring(1), 8);
        }
        
        // IBM style: x'hex', h'hex', o'oct', b'bin'
        // Require at least one digit to avoid matching shadow registers like b', h'
        const ibmMatch = str.match(/^([xhobXHOB])'([^']+)'?$/);
        if (ibmMatch) {
            const [, prefix, value] = ibmMatch;
            switch (prefix.toLowerCase()) {
                case 'x':
                case 'h':
                    return parseInt(value, 16);
                case 'o':
                    return parseInt(value, 8);
                case 'b':
                    return parseInt(value, 2);
            }
        }
        
        // ASCII/Character constants
        if (str.startsWith("'") && str.endsWith("'") && str.length >= 3) {
            const chars = str.slice(1, -1);
            let result = 0;
            for (let i = 0; i < chars.length; i++) {
                result = (result << 8) | chars.charCodeAt(i);
            }
            return result;
        }
        
        // Default decimal (allow negative numbers)
        if (/^-?\d+$/.test(str)) {
            return parseInt(str, this.defaultRadix);
        }
        
        return null;
    }
}

// Enhanced Lexer with temporary symbol support
export class Lexer {
    constructor(code) {
        this.code = code;
        this.tokens = [];
        this.numberParser = new NumberParser();
        this.directives = ['CPU', 'FNAME', 'EQU', 'EVAL', 'CONSTANT', 'ORG', 'DW', 'DEFW', 'WORD', 'DS', 'DEFS', 'BLOCK', 'DB', 'DEFB', 'DEFM', 'ASCII', 'TEXT', 'BYTE', 'INCLUDE', 'INCBIN', 'MACRO', 'ENDM', 'REPT', 'ENDR', 'IF', 'IFDEF', 'IFNDEF', 'ENDIF', 'ELSE', 'ELIF', 'COND', 'ENDC', 'SECTION', 'ENDSECTION', 'RADIX', 'INTSYNTAX', 'RELAXED', 'PADDING', 'END', 'PUBLIC', 'GLOBAL', 'GLOBL', 'ENTRY', 'EXTERN', 'EXT', 'EXTRN', 'CSEG', 'DSEG', 'ASEG', 'COMMON', 'AREA', 'MODULE', 'TIMES', 'ALIGN', 'ASSERT', 'STRUCT', 'ENDSTRUCT', 'PRINT', 'FAIL', 'STOP', 'LET', 'REPEAT', 'REND', 'WHILE', 'WEND', 'ENDW', 'SWITCH', 'CASE', 'DEFAULT', 'ENDSWITCH'];
        this.tempSymbolCounters = {
            named: 0,
            plus: 0,
            minus: 0,
            slash: 0
        };
    }

    parse_operands(operands_str) {
        const operands = [];
        if (!operands_str) return operands;

        // Improved parsing to handle parentheses properly
        const parts = [];
        let current = '';
        let depth = 0;
        let inQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < operands_str.length; i++) {
            const char = operands_str[i];
            
            if (inQuotes) {
                if (char === quoteChar) {
                    inQuotes = false;
                    quoteChar = '';
                } 
                current += char;
            } else {
                if (char === '(') {
                    depth++;
                    current += char;
                } else if (char === ')') {
                    depth--;
                    current += char;
                } else if (char === ',' && depth === 0) {
                    if (current.trim()) {
                        parts.push(current.trim());
                    }
                    current = '';
                } else if ((char === '"' || char === "'") && (i === 0 || operands_str[i-1] !== '\\')) {
                    // Check if this is a shadow register suffix (A', B', BC', etc.)
                    // Don't enter quote mode if the previous char was alphanumeric
                    const prevChar = i > 0 ? operands_str[i-1] : '';
                    if (char === "'" && /[A-Za-z0-9]/.test(prevChar)) {
                        // This is a shadow register suffix, not a string delimiter
                        current += char;
                    } else {
                        inQuotes = true;
                        quoteChar = char;
                        current += char;
                    }
                } else {
                    current += char;
                }
            }
        }
        
        if (current.trim()) {
            parts.push(current.trim());
        }
        
        for (let part of parts) {
            part = part.trim();
            if (!part) continue;

            // Special case: INCBIN-style named parameters like "SKIP 128" or "READ 64"
            // These need to be split into two operands: keyword + value
            // But normal expressions like "($ - test1) == 256" should NOT be split
            // Strategy: Only split if it starts with an INCBIN keyword (SKIP, READ, FSIZE)
            if (part.includes(' ') && !part.startsWith('"') && !part.startsWith("'")) {
                const trimmed = part.trim();
                const firstWord = trimmed.split(/\s+/)[0].toUpperCase();

                // Only split if it starts with a known INCBIN parameter keyword
                if (firstWord === 'SKIP' || firstWord === 'READ' || firstWord === 'FSIZE') {
                    // Split by spaces and recursively parse each sub-part
                    const subParts = trimmed.split(/\s+/);
                    for (const subPart of subParts) {
                        if (!subPart) continue;

                        // Parse each sub-part
                        const subNum = this.numberParser.parseNumber(subPart);
                        if (subPart.includes('-') && subNum === null) {
                            log(`DEBUG: Failed to parse "${subPart}" as number`, 'debug');
                        }
                        if (subNum !== null) {
                            operands.push(new Operand('immediate', subNum));
                        } else {
                            operands.push(new Operand('symbol', subPart));
                        }
                    }
                    continue; // Skip normal processing for this part
                }
                // Otherwise, treat the whole thing as a single symbol expression
                // This preserves expressions like "($ - test1) == 256"
            }

            // Try to parse as number first
            const numValue = this.numberParser.parseNumber(part);
            if (numValue !== null) {
                operands.push(new Operand('immediate', numValue));
                continue;
            }
            
            // Check for registers (including shadow register notation A', B', etc.)
            // Shadow registers are documentation-only - they compile to same opcodes as normal registers
            // Use after EXX or EX AF,AF' to indicate you're working with alternate bank
            if (/^(A|B|C|D|E|H|L|I|R|IXH|IXL|IYH|IYL)(\')?$/i.test(part)) {
                // Strip the ' suffix - shadow registers compile to same opcode
                const isShadow = part.endsWith("'");
                const regName = part.replace(/'$/, '').toUpperCase();
                operands.push(new Operand('register', regName, isShadow));
                continue;
            }

            // Register pairs (including shadow notation BC', DE', HL')
            if (/^(AF|BC|DE|HL|SP|IX|IY)(\')?$/i.test(part)) {
                // Strip the ' suffix - shadow registers compile to same opcode
                // Exception: AF' is kept as-is for EX AF,AF' instruction
                const upperPart = part.toUpperCase();
                const isShadow = part.endsWith("'") && upperPart !== "AF'"; // AF' is valid syntax for EX AF,AF'
                const pairName = (upperPart === "AF'") ? upperPart : upperPart.replace(/'$/, '');
                operands.push(new Operand('register_pair', pairName, isShadow));
                continue;
            }
            
            if (/^(NZ|Z|NC|C|PO|PE|P|M)$/i.test(part)) {
                operands.push(new Operand('condition', part.toUpperCase()));
                continue;
            }
            
            // Memory operands or parenthesized expressions
            if (part.startsWith('(') && part.endsWith(')')) {
                const innerContent = part.slice(1, -1);

                // Check if this contains operators (NOT valid for memory addressing)
                // Note: + and - are OK for address offsets like (symbol+1), (IX+d)
                // But &, |, ^, *, /, %, <<, >>, ==, !=, >=, <=, <, > indicate it's an expression to evaluate
                // Note: < and > can also be low/high byte operators, but that's fine - they still indicate an expression
                // IMPORTANT: Check this BEFORE parseNumber, because parseNumber might parse partial expression
                const hasExpressionOps = /[\&\|\^\*\/\%\<\>]|<<|>>|==|!=|>=|<=/.test(innerContent);

                if (hasExpressionOps) {
                    // This is a parenthesized expression like (str_buffer & 0xff) or ($8000 >= $8000), not memory access
                    // Strip parentheses and treat as symbol expression
                    operands.push(new Operand('symbol', innerContent));
                } else {
                    // Try to parse as a plain number for direct memory addressing like ($C000)
                    const innerNum = this.numberParser.parseNumber(innerContent);
                    if (innerNum !== null) {
                        operands.push(new Operand('memory', innerNum));
                    } else {
                        // It's a symbol inside parentheses - valid indirect addressing like (HL), (IX+d), (addr+offset)
                        operands.push(new Operand('memory', innerContent));
                    }
                }
                continue;
            }
            
            // Single character constants (both " and ') - convert to immediate ASCII value
            if ((part.startsWith('"') && part.endsWith('"') && part.length === 3) ||
                (part.startsWith("'") && part.endsWith("'") && part.length === 3)) {
                const charValue = part.charCodeAt(1); // Get ASCII value
                operands.push(new Operand('immediate', charValue));
                continue;
            }

            // Multi-character string literals
            if ((part.startsWith('"') && part.endsWith('"')) ||
                (part.startsWith("'") && part.endsWith("'"))) {
                operands.push(new Operand('string', part.slice(1, -1)));
                continue;
            }

            // Everything else is a symbol
            operands.push(new Operand('symbol', part));
        }
        return operands;
    }

    tokenize() {
        const lines = this.code.split('\n');
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            let trimmedLine = line.split(';')[0].trim();
            if (!trimmedLine) continue;

            // Match tokens, handling shadow register notation (A', B', BC', DE', HL', AF')
            // The pattern handles: regular tokens, quoted strings, and shadow registers with trailing '
            // Order matters: try shadow registers first, then quoted strings, then other tokens
            const parts = trimmedLine.match(/[A-Za-z][A-Za-z0-9]*'|"[^"]*"|'[^']*'|[^\s"']+/g) || [];
            if (parts.length === 0) continue;

            let label = null;
            let mnemonic = parts[0];
            let operands_str = parts.slice(1).join(' ');

            // Handle temporary symbols and labels
            if (parts[0].endsWith(':')) {
                label = parts[0].slice(0, -1);
                
                // Process temporary symbols
                if (label.startsWith('$$')) {
                    // Named temporary symbol
                    label = `__temp_named_${this.tempSymbolCounters.named}_${label.substring(2)}`;
                } else if (label === '+' || label === '-' || label === '/') {
                    // Nameless temporary symbol
                    if (label === '+') {
                        label = `__temp_plus_${this.tempSymbolCounters.plus}`;
                        this.tempSymbolCounters.plus++;
                    } else if (label === '-') {
                        label = `__temp_minus_${this.tempSymbolCounters.minus}`;
                        this.tempSymbolCounters.minus++;
                    } else if (label === '/') {
                        label = `__temp_slash_${this.tempSymbolCounters.slash}`;
                        this.tempSymbolCounters.slash++;
                    }
                }
                
                mnemonic = parts.length > 1 ? parts[1] : null;
                operands_str = parts.slice(2).join(' ');
            } 
            else if (parts.length > 1) {
                // Check if second part is a directive (with or without dot prefix)
                let checkMnemonic = parts[1].toUpperCase();
                if (checkMnemonic.startsWith('.')) {
                    checkMnemonic = checkMnemonic.substring(1);
                }
                if (this.directives.includes(checkMnemonic)) {
                    label = parts[0];
                    mnemonic = parts[1];
                    operands_str = parts.slice(2).join(' ');
                }
            }

            if (!mnemonic) {
                if (label) this.tokens.push(new Directive(label, 'LABEL', [], lineNum + 1, line));
                continue;
            }

            // Handle SDCC-style directives with dot prefix (.area, .module, .globl, .ds)
            let mnemonic_upper = mnemonic.toUpperCase();
            if (mnemonic_upper.startsWith('.')) {
                mnemonic_upper = mnemonic_upper.substring(1); // Remove leading dot
            }

            // Special handling for INCBIN: reconstruct operands with proper comma separation
            // INCBIN uses named parameters like: INCBIN "file", SKIP 10, READ 20, FSIZE label
            // We need to ensure commas separate each parameter pair correctly
            let finalOperandsStr = operands_str || '';
            if (mnemonic_upper === 'INCBIN') {
                // Reconstruct from parts to ensure commas are preserved
                // parts[1] onwards contains the operands
                const operandParts = parts.slice(1);
                finalOperandsStr = operandParts.join(' ');
            }

            const operands = this.parse_operands(finalOperandsStr);

            if (this.directives.includes(mnemonic_upper)) {
                this.tokens.push(new Directive(label, mnemonic_upper, operands, lineNum + 1, line));
            } else {
                this.tokens.push(new Instruction(label, mnemonic.toLowerCase(), operands, lineNum + 1, line));
            }
        }
        return this.tokens;
    }
}

