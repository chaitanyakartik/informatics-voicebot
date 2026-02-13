import React, { createContext, useState, useEffect, useContext } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [selectedLanguage, setSelectedLanguage] = useState('english');
    const [settings, setSettings] = useState({
        useTTS: true,
        backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
    });

    // Load state from localStorage on mount
    useEffect(() => {
        const savedLanguage = localStorage.getItem('voiceBotLanguage');
        if (savedLanguage) setSelectedLanguage(savedLanguage);

        const savedSettings = localStorage.getItem('voiceBotSettings');
        if (savedSettings) setSettings(JSON.parse(savedSettings));
    }, []);

    // Sync with localStorage
    const handleLanguageChange = (lang) => {
        setSelectedLanguage(lang);
        localStorage.setItem('voiceBotLanguage', lang);
    };

    const handleSettingsChange = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('voiceBotSettings', JSON.stringify(newSettings));
    };

    // UI Translations (Moved from VoiceBot for global access)
    const uiTranslations = {
        english: {
            title: "Karnataka AI Voice Assistant",
            welcomeTitle: "How can I help you today?",
            welcomeText: "Tap the orb below to ask about government schemes, services, or general information.",
            tapToSpeak: "Tap to Speak",
            startTyping: "Type a message...",
            send: "Send",
            listening: "Listening...",
            transcribing: "Transcribing...",
            thinking: "Thinking...",
            speaking: "Speaking...",
            pages: {
                home: "Voice Assistant",
                stt: "Speech to Text",
                tts: "Text to Speech",
                ocr: "OCR",
                ocrInplace: "OCR Inplace",
                translation: "Translation"
            }
        },
        kannada: {
            title: "ಕರ್ನಾಟಕ AI ಧ್ವನಿ ಸಹಾಯಕ",
            welcomeTitle: "ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ?",
            welcomeText: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು, ಸೇವೆಗಳು ಅಥವಾ ಸಾಮಾನ್ಯ ಮಾಹಿತಿಯ ಬಗ್ಗೆ ಕೇಳಲು ಕೆಳಗಿನ ಗೋಳವನ್ನು ಸ್ಪರ್ಶಿಸಿ.",
            tapToSpeak: "ಮಾತನಾಡಲು ಸ್ಪರ್ಶಿಸಿ",
            startTyping: "ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ...",
            send: "ಕಳುಹಿಸಿ",
            listening: "ಆಲಿಸಲಾಗುತ್ತಿದೆ...",
            transcribing: "ಲಿಪ್ಯಂತರ ಮಾಡಲಾಗುತ್ತಿದೆ...",
            thinking: "ಯೋಚಿಸಲಾಗುತ್ತಿದೆ...",
            speaking: "ಮಾತನಾಡಲಾಗುತ್ತಿದೆ...",
            pages: {
                home: "ಧ್ವನಿ ಸಹಾಯಕ",
                stt: "ಮಾತು ಪಠ್ಯಕ್ಕೆ",
                tts: "ಪಠ್ಯ ಧ್ವನಿಗೆ",
                ocr: "ಒಸಿಆರ್",
                ocrInplace: "ಚಿತ್ರದಲ್ಲಿನ ಪಠ್ಯ",
                translation: "ಅನುವಾದ"
            }
        }
    };

    const t = uiTranslations[selectedLanguage] || uiTranslations.english;

    return (
        <AppContext.Provider value={{
            selectedLanguage,
            setSelectedLanguage: handleLanguageChange,
            settings,
            setSettings: handleSettingsChange,
            t,
            uiTranslations
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
