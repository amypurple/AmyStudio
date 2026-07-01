/**
 * Codec Configuration System for RetroCompress Lite
 * This file defines all available codecs and their metadata
 */

export const CODEC_CONFIG = {
    formats: {
        mdkrle: {
            name: 'MDK-RLE',
            author: 'Marcel de Kogel',
            year: '1998',
            description: 'Classic RLE format with optimized raw/run packet encoding for Z80.',
            extensions: ['.mdk', '.rle'],
            module: './codecs/mdkrle.js',
            className: 'MdkRLECodec',
            enabled: true,
            category: 'rle'
        },
        lzf: {
            name: "LZF-ZX-Spectrum",
            author: "Marc Lehmann, Tom Dalby",
            year: "2005‑2020",
            description: "Modified LZF algorithm optimized for ZX Spectrum screen compression with END marker (0xFF) support.",
            extensions: [".lzf"],
            module: "./codecs/lzf.js",
            className: "LZFCodec",
            enabled: true,
            category: "lz77",
            notes: "Features END marker (0xFF) for stream termination instead of requiring uncompressed size."
        },
        dan3: {
            name: 'DAN3',
            author: 'Amy Bienvenu (NewColeco)',
            year: '2018',
            description: 'LZ77 variant like DAN1, using a different encoding scheme.',
            extensions: ['.dan3'],
            module: './codecs/dan3.js',
            className: 'DAN3Codec',
            enabled: true,
            category: 'lz77'
        },
        dan1: {
            name: 'DAN1',
            author: 'Amy Bienvenu (NewColeco)',
            year: '2016',
            description: 'LZ77 variant made for ColecoVision and other 8-bit systems.',
            extensions: ['.dan1'],
            module: './codecs/dan1.js',
            className: 'DAN1Codec',
            enabled: true,
            category: 'lz77'
        },
        dan2: {
            name: 'DAN2',
            author: 'Daniel Bienvenu aka NewColeco',
            year: '2017',
            description: 'DAN1-derived LZ77 stream with a variable high-offset bit width header.',
            extensions: ['.dan2'],
            module: './codecs/dan2.js',
            className: 'DAN2Codec',
            enabled: true,
            category: 'lz77'
        },
        pletter: {
            name: 'Pletter v0.5',
            author: 'Sander Zuidema, XL2S Entertainment',
            year: '2008',
            description: 'LZ77-style compressor, somewhat an improved Bitbuster, use on MSX.',
            extensions: ['.plet5'],
            module: './codecs/pletter.js',
            className: 'PletterCodec',
            enabled: true,
            category: 'lz77'
        },
        bitbuster12: {
            name: 'BitBuster 1.2',
            author: 'Arjan Bakker (MrBaker), Team Bomba',
            year: '2003',
            description: 'Started in 2002, v1.2 in Nov 2003, in response to frustration with POPCOM (MSX).',
            extensions: ['.pck'],
            module: './codecs/bitbuster12.js',
            className: 'BitBusterV12Codec',
            enabled: true,
            category: 'lz77'
        },
        zx7: {
            name: 'ZX7',
            author: 'Einar Saukas',
            year: '2012',
            description: 'Optimal LZ77 achieving best-in-class compression for ZX Spectrum',
            extensions: ['.zx7'],
            module: './codecs/zx7.js',
            className: 'ZX7Codec',
            enabled: true,
            category: 'lz77'
        },
        zx0: {
            name: 'ZX0',
            author: 'Einar Saukas (& Urusergi)',
            year: '2021',
            description: 'Main new LZ77 compressor superseding ZX7 (smaller/faster)',
            extensions: ['.zx0'],
            module: './codecs/zx0.js',
            className: 'ZX0Codec',
            enabled: true,
            category: 'lz77'
        },
        aplib: {
            name: "aPLib",
            author: "Jørgen Ibsen",
            year: "1998",
            description: "Beam-search encoder with reuse seeding & near-match bias.",
            extensions: [".apl", ".aplib"],
            module: "./codecs/aplib.js",
            className: "APLibCodec",
            enabled: true,
            category: "lzss"
        },         
    },
    
    // Add new codec categories here for easy organization
    categories: {
        rle: 'RLE Family',
        lz77: 'LZ77 Family',
        arithmetic: 'Arithmetic Coding',
        dictionary: 'Dictionary Based'
    },
    
    // Global settings
    settings: {
        maxFileSize: 256 * 1024, // 256KB
        enableDebugMode: false,
        defaultCompressionOrder: ['zx0', 'dan3', 'dan2', 'dan1', 'zx7', 'pletter', 'bitbuster12', 'lzf', 'mdkrle']
    }
};

/**
 * Dynamically load all enabled codecs
 * @returns {Promise<Object>} Object containing loaded codec instances
 */
export async function loadCodecs() {
    const codecs = {};
    const loadPromises = [];
    
    for (const [codecId, config] of Object.entries(CODEC_CONFIG.formats)) {
        if (!config.enabled) {
            console.log(`Skipping disabled codec: ${codecId}`);
            continue;
        }
        
        const loadPromise = loadCodec(codecId, config)
            .then(codec => {
                if (codec) {
                    codecs[codecId] = codec;
                    console.log(`✅ Loaded codec: ${config.name}`);
                } else {
                    console.warn(`❌ Failed to load codec: ${codecId}`);
                }
            })
            .catch(error => {
                console.error(`❌ Error loading codec ${codecId}:`, error);
            });
            
        loadPromises.push(loadPromise);
    }
    
    // Wait for all codecs to load (or fail)
    await Promise.all(loadPromises);
    
    console.log(`Loaded ${Object.keys(codecs).length} out of ${Object.keys(CODEC_CONFIG.formats).filter(k => CODEC_CONFIG.formats[k].enabled).length} codecs`);
    return codecs;
}

/**
 * Load a single codec module
 * @param {string} codecId - The codec identifier
 * @param {Object} config - The codec configuration
 * @returns {Promise<Object|null>} The codec instance or null if failed
 */
async function loadCodec(codecId, config) {
    try {
        const module = await import(config.module);
        const CodecClass = module[config.className];
        
        if (!CodecClass) {
            throw new Error(`Class ${config.className} not found in ${config.module}`);
        }
        
        const codecInstance = new CodecClass();
        
        // Validate codec interface
        if (!validateCodecInterface(codecInstance)) {
            throw new Error(`Codec ${codecId} does not implement required interface`);
        }
        
        return codecInstance;
        
    } catch (error) {
        console.error(`Failed to load codec ${codecId}:`, error);
        return null;
    }
}

/**
 * Validate that a codec implements the required interface
 * @param {Object} codec - The codec instance to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateCodecInterface(codec) {
    const requiredMethods = ['compress', 'decompress'];
    
    for (const method of requiredMethods) {
        if (typeof codec[method] !== 'function') {
            console.error(`Codec missing required method: ${method}`);
            return false;
        }
    }
    
    return true;
}

/**
 * Get file extension for a codec
 * @param {string} codecId - The codec identifier
 * @returns {string} The primary file extension
 */
export function getFileExtension(codecId) {
    const config = CODEC_CONFIG.formats[codecId];
    return config?.extensions[0] || '.compressed';
}

/**
 * Detect compression format from filename
 * @param {string} fileName - The filename to analyze
 * @returns {string|null} The detected codec ID or null
 */
export function detectCompressionFormat(fileName) {
    const ext = '.' + fileName.toLowerCase().split('.').pop();
    
    for (const [codecId, config] of Object.entries(CODEC_CONFIG.formats)) {
        if (config.extensions.includes(ext)) {
            return codecId;
        }
    }
    
    return null;
}

/**
 * Get list of all codec IDs
 * @returns {string[]} Array of codec identifiers
 */
export function getCodecList() {
    return Object.keys(CODEC_CONFIG.formats);
}

/**
 * Get enabled codecs in preferred order
 * @returns {string[]} Array of enabled codec IDs in processing order
 */
export function getEnabledCodecsInOrder() {
    const enabledCodecs = Object.keys(CODEC_CONFIG.formats).filter(
        id => CODEC_CONFIG.formats[id].enabled
    );
    
    // Sort by default order, then alphabetically for any not in default order
    const defaultOrder = CODEC_CONFIG.settings.defaultCompressionOrder;
    
    return enabledCodecs.sort((a, b) => {
        const indexA = defaultOrder.indexOf(a);
        const indexB = defaultOrder.indexOf(b);
        
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        } else if (indexA !== -1) {
            return -1;
        } else if (indexB !== -1) {
            return 1;
        } else {
            return a.localeCompare(b);
        }
    });
}

/**
 * Add a new codec configuration (for runtime codec loading)
 * @param {string} codecId - Unique identifier for the codec
 * @param {Object} config - Codec configuration object
 */
export function addCodecConfig(codecId, config) {
    if (CODEC_CONFIG.formats[codecId]) {
        console.warn(`Codec ${codecId} already exists, overwriting...`);
    }
    
    // Validate required config fields
    const required = ['name', 'author', 'year', 'description', 'extensions', 'module', 'className'];
    for (const field of required) {
        if (!config[field]) {
            throw new Error(`Missing required config field: ${field}`);
        }
    }
    
    CODEC_CONFIG.formats[codecId] = {
        enabled: true,
        category: 'custom',
        ...config
    };
    
    console.log(`Added codec configuration: ${codecId}`);
}

/**
 * Enable or disable a codec
 * @param {string} codecId - The codec identifier
 * @param {boolean} enabled - Whether to enable the codec
 */
export function setCodecEnabled(codecId, enabled) {
    if (CODEC_CONFIG.formats[codecId]) {
        CODEC_CONFIG.formats[codecId].enabled = enabled;
        console.log(`Codec ${codecId} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
        console.warn(`Codec ${codecId} not found`);
    }
}

/**
 * Get codec information
 * @param {string} codecId - The codec identifier
 * @returns {Object|null} Codec configuration or null if not found
 */
export function getCodecInfo(codecId) {
    return CODEC_CONFIG.formats[codecId] || null;
}

/**
 * Enable or disable a codec for compression testing
 * @param {string} codecId - The codec identifier
 * @param {boolean} enabled - Whether to enable the codec
 * @returns {boolean} Success status
 */
export function toggleCodec(codecId, enabled = null) {
    if (CODEC_CONFIG.formats[codecId]) {
        // If enabled is null, toggle current state
        if (enabled === null) {
            CODEC_CONFIG.formats[codecId].enabled = !CODEC_CONFIG.formats[codecId].enabled;
        } else {
            CODEC_CONFIG.formats[codecId].enabled = enabled;
        }
        
        const newState = CODEC_CONFIG.formats[codecId].enabled;
        console.log(`Codec ${codecId} ${newState ? 'enabled' : 'disabled'} for compression testing`);
        return true;
    } else {
        console.warn(`Codec ${codecId} not found`);
        return false;
    }
}

/**
 * Get the enabled state of a codec
 * @param {string} codecId - The codec identifier
 * @returns {boolean} Whether the codec is enabled
 */
export function isCodecEnabled(codecId) {
    return CODEC_CONFIG.formats[codecId]?.enabled || false;
}

/**
 * Get count of enabled codecs
 * @returns {number} Number of enabled codecs
 */
export function getEnabledCodecCount() {
    return Object.values(CODEC_CONFIG.formats).filter(config => config.enabled).length;
}

/**
 * Enable all codecs
 */
export function enableAllCodecs() {
    for (const codecId in CODEC_CONFIG.formats) {
        CODEC_CONFIG.formats[codecId].enabled = true;
    }
    console.log('All codecs enabled for compression testing');
}

/**
 * Disable all codecs
 */
export function disableAllCodecs() {
    for (const codecId in CODEC_CONFIG.formats) {
        CODEC_CONFIG.formats[codecId].enabled = false;
    }
    console.log('All codecs disabled for compression testing');
}
