import React, { useState } from 'react';
import { ArrowRightLeft, Languages, Loader2, Play, Volume2, Copy } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Header from '../components/Header';
import { translateText, runTTS } from '../audioServices';

const Translation = () => {
    const { settings } = useAppContext();
    const [sourceText, setSourceText] = useState('');
    const [translatedText, setTranslatedText] = useState('');

    // NSDL/Bhashini codes
    const [sourceLang, setSourceLang] = useState('eng_Latn');
    const [targetLang, setTargetLang] = useState('kan_Knda');

    const [isTranslating, setIsTranslating] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState(null);

    const languages = [
        { code: 'eng_Latn', name: 'English' },
        { code: 'hin_Deva', name: 'Hindi' },
        { code: 'kan_Knda', name: 'Kannada' },
        // Add more if supported backend allows
    ];

    const handleTranslate = async () => {
        if (!sourceText.trim()) return;

        setIsTranslating(true);
        setError(null);
        setTranslatedText('');

        try {
            const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';
            const result = await translateText(sourceText, sourceLang, targetLang, ngrokBaseUrl);
            setTranslatedText(result);
        } catch (err) {
            console.error('Translation failed:', err);
            setError('Translation failed. Please check connection.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSwapLanguages = () => {
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        setSourceText(translatedText);
        setTranslatedText(sourceText);
    };

    const handleSpeak = async (text, langCode) => {
        if (!text) return;

        setIsSpeaking(true);
        try {
            const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';
            // Map codes to simple names 'english', 'hindi', 'kannada' for runTTS
            const langMap = {
                'eng_Latn': 'english',
                'hin_Deva': 'hindi',
                'kan_Knda': 'kannada'
            };
            const ttsLang = langMap[langCode] || 'english';

            const { audio, errors } = await runTTS(text, ttsLang, ngrokBaseUrl);

            if (audio) {
                const blob = new Blob([audio], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const sound = new Audio(url);
                await sound.play();
            } else {
                throw new Error('No audio generated');
            }

        } catch (err) {
            console.error('TTS Playback failed:', err);
        } finally {
            setIsSpeaking(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 px-4 pb-10 flex flex-col items-center">
            <Header />

            <div className="max-w-5xl w-full space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Language Translation
                    </h2>
                    <p className="text-slate-400">Translate text between English, Hindi, and Kannada.</p>
                </div>

                {/* Language Controls */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
                    <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 w-full md:w-48"
                    >
                        {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>

                    <button
                        onClick={handleSwapLanguages}
                        className="p-2 hover:bg-white/10 rounded-full text-blue-400 transition-transform hover:rotate-180 duration-300"
                    >
                        <ArrowRightLeft size={20} />
                    </button>

                    <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 w-full md:w-48"
                    >
                        {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                </div>

                {/* Translation Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Source */}
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Source</div>
                        <textarea
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="Enter text to translate..."
                            className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-6 text-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-shadow"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleSpeak(sourceText, sourceLang)}
                                disabled={!sourceText}
                                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-blue-400"
                                title="Listen"
                            >
                                <Volume2 size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Target */}
                    <div className="space-y-2 relative">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Translation</div>
                        <div className="w-full h-64 bg-[#0f172a] border border-white/10 rounded-2xl p-6 text-lg text-slate-200 overflow-y-auto">
                            {isTranslating ? (
                                <div className="h-full flex items-center justify-center text-blue-400 gap-2">
                                    <Loader2 className="animate-spin" /> Translating...
                                </div>
                            ) : translatedText ? (
                                <p className="whitespace-pre-wrap leading-relaxed animate-fade-in">{translatedText}</p>
                            ) : (
                                <p className="text-slate-600 italic">Translation will appear here</p>
                            )}
                        </div>

                        {translatedText && (
                            <div className="flex justify-end gap-2 absolute bottom-2 right-2">
                                <button
                                    onClick={() => navigator.clipboard.writeText(translatedText)}
                                    className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white"
                                    title="Copy"
                                >
                                    <Copy size={20} />
                                </button>
                                <button
                                    onClick={() => handleSpeak(translatedText, targetLang)}
                                    className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-blue-400"
                                    title="Listen"
                                >
                                    <Volume2 size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleTranslate}
                        disabled={!sourceText || isTranslating}
                        className={`
                            px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 transition-all duration-300 shadow-xl
                            ${!sourceText || isTranslating
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 hover:shadow-blue-500/25'}
                        `}
                    >
                        {isTranslating ? <Loader2 className="animate-spin" /> : <Languages />}
                        Translate
                    </button>
                </div>

                {error && (
                    <div className="text-center text-red-400 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Translation;
