
const NGROK_BASE_URL = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';

export const uploadToOCR = async (imageBlob) => {
    try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
        });
        reader.readAsDataURL(imageBlob);
        const base64Image = await base64Promise;

        const response = await fetch(`${NGROK_BASE_URL}/ocr/layout-ocr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_b64: base64Image
            })
        });

        if (!response.ok) {
            throw new Error(`OCR API call failed: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('OCR Error:', error);
        throw error;
    }
};

export const translateText = async (text, sourceLang, targetLang) => {
    try {
        if (!text || !text.trim()) return text;
        if (sourceLang === targetLang) return text;

        const response = await fetch(`${NGROK_BASE_URL}/translation/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source_language: sourceLang,
                target_language: targetLang,
                text: text
            })
        });

        if (!response.ok) {
            throw new Error(`Translation API call failed: ${response.status}`);
        }

        const data = await response.json();
        return data.translated_text || data.text || text;
    } catch (error) {
        console.error('Translation Error:', error);
        // Fallback to original text on error
        return text;
    }
};
