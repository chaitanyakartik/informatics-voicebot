
// Sarvam API Helper Functions

const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY;

// Map application language codes to Sarvam language codes
const LANGUAGE_MAP = {
    'eng_Latn': 'en-IN',
    'hin_Deva': 'hi-IN',
    'kan_Knda': 'kn-IN',
    'english': 'en-IN',
    'hindi': 'hi-IN',
    'kannada': 'kn-IN'
};

// Map to Sarvam speaker IDs (using defaults for now)
const SPEAKER_MAP = {
    'hi-IN': 'meera', // Example speaker
    'kn-IN': 'aravind', // Example speaker
    'en-IN': 'meera' // Example speaker
};

/**
 * Perform Text-to-Speech using Sarvam AI
 * @param {string} text - The text to convert to speech
 * @param {string} languageCode - The language code (e.g., 'eng_Latn', 'hin_Deva')
 * @returns {Promise<Blob>} - The audio blob
 */
export const sarvamTTS = async (text, languageCode) => {
    if (!SARVAM_API_KEY) {
        throw new Error('Sarvam API Key is missing');
    }

    // Auto-detect language from text content
    let targetLanguage = 'en-IN';
    // Hindi (Devanagari)
    if (/\p{Script=Devanagari}/u.test(text)) {
        targetLanguage = 'hi-IN';
    }
    // Kannada (Kannada script)
    else if (/\p{Script=Kannada}/u.test(text)) {
        targetLanguage = 'kn-IN';
    }
    // Optionally, fallback to provided languageCode if detection fails
    else if (languageCode && LANGUAGE_MAP[languageCode]) {
        targetLanguage = LANGUAGE_MAP[languageCode];
    }

    // Remove special characters that may break TTS
    const cleanedText = text.replace(/[\*\(\)<>\[\]\{\}\^\$\|`~#@!%&_=+;:'"\\]/g, '');

    const payload = {
        text: cleanedText,
        target_language_code: targetLanguage,
        speaker: "ishita",
        model: "bulbul:v3",
        pace: 1.1,
        speech_sample_rate: 16000,
        output_audio_codec: "wav",
        enable_preprocessing: true
    };

    try {
        const response = await fetch('https://api.sarvam.ai/text-to-speech/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': SARVAM_API_KEY
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Sarvam TTS failed: ${response.status} ${errorText}`);
        }

        const audioBlob = await response.blob();
        return audioBlob;

    } catch (error) {
        console.error('Sarvam TTS Error:', error);
        throw error;
    }
};

/**
 * Perform Speech-to-Text using Sarvam AI
 * @param {Blob} audioBlob - The audio blob to transcribe
 * @param {string} languageCode - The language ID or code
 * @returns {Promise<string>} - The transcribed text
 */
export const sarvamSTT = async (audioBlob, languageCode) => {
    if (!SARVAM_API_KEY) {
        throw new Error('Sarvam API Key is missing');
    }

    // Determine model based on language? Use 'saaras:v1' or 'saaras:v3'
    // User example: model="saaras:v3"

    const formData = new FormData();
    // Ensure we send a valid file
    // Sarvam might expect a specific filename/extension.
    formData.append('file', new File([audioBlob], 'recording.wav', { type: 'audio/wav' }));
    formData.append('model', 'saaras:v3'); // Updated to v3 per user request
    formData.append('mode', 'transcribe'); // Required for v3

    try {
        const response = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: {
                'api-subscription-key': SARVAM_API_KEY
                // Content-Type is set automatically by browser with boundary for FormData
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Sarvam STT failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data.transcript || '';
    } catch (error) {
        console.error('Sarvam STT Error:', error);
        throw error;
    }
};
