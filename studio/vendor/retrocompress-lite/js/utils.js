/**
 * Utility Functions for RetroCompress Lite
 * Common functions used throughout the application
 */

/**
 * Calculate CRC-32 checksum
 * @param {Uint8Array} data - Data to calculate checksum for
 * @returns {number} CRC-32 checksum
 */
export function calculateCrc32(data) {
    const crcTable = new Uint32Array(256);
    const polynomial = 0xEDB88320;
    
    // Build CRC table
    for (let i = 0; i < 256; i++) {
        let crc = i;
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? polynomial : 0);
        }
        crcTable[i] = crc;
    }
    
    // Calculate CRC
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
    }
    
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Convert array to hexadecimal string
 * @param {Uint8Array} arr - Array to convert
 * @param {number} maxBytes - Maximum number of bytes to display
 * @returns {string} Hexadecimal representation
 */
export function arrayToHex(arr, maxBytes = 64) {
    if (!arr || arr.length === 0) return '';
    
    const bytes = Math.min(arr.length, maxBytes);
    const hexString = Array.from(arr.slice(0, bytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
        
    return arr.length > maxBytes ? hexString + '...' : hexString;
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 bytes';
    
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Download data as a file
 * @param {Uint8Array} data - Data to download
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type of the file
 */
export function downloadBlob(data, filename, mimeType = 'application/octet-stream') {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Validate that data is a proper Uint8Array
 * @param {*} data - Data to validate
 * @returns {boolean} True if valid Uint8Array
 */
export function validateByteArray(data) {
    return data instanceof Uint8Array && data.length > 0;
}

/**
 * Compare two byte arrays for equality
 * @param {Uint8Array} arr1 - First array
 * @param {Uint8Array} arr2 - Second array
 * @returns {boolean} True if arrays are equal
 */
export function compareByteArrays(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    
    return true;
}

/**
 * Create a progress callback for long-running operations
 * @param {Function} updateCallback - Callback to update progress
 * @returns {Function} Progress callback function
 */
export function createProgressCallback(updateCallback) {
    let lastUpdate = 0;
    const updateInterval = 100; // Update every 100ms max
    
    return (current, total) => {
        const now = Date.now();
        if (now - lastUpdate > updateInterval) {
            const percentage = Math.round((current / total) * 100);
            updateCallback(percentage);
            lastUpdate = now;
        }
    };
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Log performance timing and return result and duration
 * @param {string} operation - Name of the operation
 * @param {Function} func - Function to time
 * @returns {Promise<{result: *, duration: number}>} Result of the function and the time taken in ms
 */
export async function timeOperation(operation, func) {
    const start = performance.now();
    try {
        const result = await func();
        const end = performance.now();
        const duration = end - start;
        console.log(`${operation} took ${duration.toFixed(2)}ms`);
        return { result, duration };
    } catch (error) {
        const end = performance.now();
        console.error(`${operation} failed after ${(end - start).toFixed(2)}ms:`, error);
        throw error;
    }
}

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Safe JSON parsing with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
export function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('JSON parsing failed:', error);
        return defaultValue;
    }
}

/**
 * Check if running in development mode
 * @returns {boolean} True if in development mode
 */
export function isDevelopment() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

/**
 * Detect browser capabilities
 * @returns {Object} Browser capability information
 */
export function detectBrowserCapabilities() {
    return {
        supportsFileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
        supportsWorkers: !!window.Worker,
        supportsModules: 'noModule' in HTMLScriptElement.prototype,
        supportsES6: (() => {
            try {
                new Function("(a = 0) => a");
                return true;
            } catch (err) {
                return false;
            }
        })()
    };
}

/**
 * Memory usage estimation for arrays
 * @param {Uint8Array} arr - Array to estimate
 * @returns {number} Estimated memory usage in bytes
 */
export function estimateMemoryUsage(arr) {
    if (!arr) return 0;
    return arr.length * arr.BYTES_PER_ELEMENT;
}

/**
 * Check if file size is within limits
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size
 * @returns {boolean} True if within limits
 */
export function isFileSizeValid(size, maxSize = 256 * 1024) {
    return size > 0 && size <= maxSize;
}