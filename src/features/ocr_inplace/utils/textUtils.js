
// Unicode Ranges
const KANNADA_BLOCK_START = 0x0C80;
const KANNADA_BLOCK_END = 0x0CFF;
const DEVANAGARI_BLOCK_START = 0x0900;
const DEVANAGARI_BLOCK_END = 0x097F;

export const LANGUAGE_CODES = {
    KANNADA: 'kan_Knda',
    HINDI: 'hin_Deva',
    ENGLISH: 'eng_Latn'
};

export const detectLanguage = (text) => {
    if (!text) return LANGUAGE_CODES.ENGLISH;

    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode >= KANNADA_BLOCK_START && charCode <= KANNADA_BLOCK_END) {
            return LANGUAGE_CODES.KANNADA;
        }
        if (charCode >= DEVANAGARI_BLOCK_START && charCode <= DEVANAGARI_BLOCK_END) {
            return LANGUAGE_CODES.HINDI;
        }
    }
    return LANGUAGE_CODES.ENGLISH;
};

// Segments text into mixed language chunks if needed
// For now, simpler implementation: returns array of { text, lang }
export const segmentText = (text) => {
    // TODO: Implement finer-grained segmentation if strict mixed-line handling is needed.
    // Current spec implementation: Line-level detection is often sufficient if lines aren't heavily mixed.
    // But spec says "Mixed-language lines MUST be segmented".

    // Simple implementation: split by space and re-group?
    // Or just checking the whole line dominant language for MVP?
    // "Mixed-language lines MUST be segmented by language." implies strictness.

    const segments = [];
    let currentSegment = '';
    let currentLang = null;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charCode = text.charCodeAt(i);
        let charLang = LANGUAGE_CODES.ENGLISH; // Default to English/Neutral

        if (charCode >= KANNADA_BLOCK_START && charCode <= KANNADA_BLOCK_END) {
            charLang = LANGUAGE_CODES.KANNADA;
        } else if (charCode >= DEVANAGARI_BLOCK_START && charCode <= DEVANAGARI_BLOCK_END) {
            charLang = LANGUAGE_CODES.HINDI;
        } else if (/\s/.test(char) || /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(char)) {
            // Punctuation/Spaces inherit current language or default to previous
            charLang = currentLang || LANGUAGE_CODES.ENGLISH;
        }

        if (currentLang === null) {
            currentLang = charLang;
        }

        if (charLang !== currentLang && charLang !== LANGUAGE_CODES.ENGLISH && currentLang === LANGUAGE_CODES.ENGLISH) {
            // If transitioning from Neutral (English/Punctuation) to Specific, assume specific covers previous neutral?
            // Actually, safer to just switch.
            if (currentSegment) {
                segments.push({ text: currentSegment, lang: currentLang });
            }
            currentSegment = char;
            currentLang = charLang;
        } else if (charLang !== currentLang && charLang !== LANGUAGE_CODES.ENGLISH) {
            // Switch between specific languages
            if (currentSegment) {
                segments.push({ text: currentSegment, lang: currentLang });
            }
            currentSegment = char;
            currentLang = charLang;
        } else if (charLang === LANGUAGE_CODES.ENGLISH && currentLang !== LANGUAGE_CODES.ENGLISH) {
            // Specific to Neutral. Keep adding to specific until a DIFFERENT specific appears?
            // "if target language == English -> DO NOT translate."
            // We should keep neutral chars with the previous dominant language to avoid fragmenting words.
            currentSegment += char;
        } else {
            currentSegment += char;
            currentLang = charLang;
        }
    }

    if (currentSegment) {
        segments.push({ text: currentSegment, lang: currentLang });
    }

    return segments;
};
