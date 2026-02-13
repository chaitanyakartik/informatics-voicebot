import React, { useState, useRef } from 'react';
import { Play, Square, Loader2, Volume2, Trash2, Languages } from 'lucide-react';
import { runTTS, translateText } from '../audioServices';
import { useAppContext } from '../context/AppContext';
import Header from '../components/Header';

const TextToSpeech = () => {
    const { selectedLanguage } = useAppContext();
    const [text, setText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingLang, setProcessingLang] = useState(null); // 'default', 'hin_Deva', 'kan_Knda'
    const [audioUrl, setAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState(null);
    const [translatedText, setTranslatedText] = useState(null);

    const audioRef = useRef(null);

    const handleSpeak = async (targetLangCode = null) => {
        if (!text.trim()) return;

        setIsProcessing(true);
        setProcessingLang(targetLangCode || 'default');
        setError(null);
        setAudioUrl(null);
        setTranslatedText(null);

        try {
            const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';

            let textToSpeak = text;
            let ttsLang = selectedLanguage;

            if (targetLangCode) {
                // Translation flow: Assume Source is English -> Target
                try {
                    const translation = await translateText(text, 'eng_Latn', targetLangCode, ngrokBaseUrl);
                    textToSpeak = translation;
                    setTranslatedText(translation);

                    // Map target code to TTS language
                    const langMap = {
                        'hin_Deva': 'hindi',
                        'kan_Knda': 'kannada'
                    };
                    ttsLang = langMap[targetLangCode];
                } catch (e) {
                    console.error("Translation failed", e);
                    throw new Error(`Translation failed: ${e.message}`);
                }
            }

            const { audio, errors } = await runTTS(textToSpeak, ttsLang, ngrokBaseUrl);

            if (errors && errors.length > 0) {
                console.warn('TTS Errors:', errors);
            }

            if (audio) {
                const blob = new Blob([audio], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            } else {
                throw new Error('Failed to generate audio');
            }

        } catch (err) {
            console.error('Process Failed:', err);
            setError(err.message || 'Failed to process request. Please try again.');
        } finally {
            setIsProcessing(false);
            setProcessingLang(null);
        }
    };

    // Auto-play when audio is ready
    React.useEffect(() => {
        if (audioUrl && audioRef.current) {
            audioRef.current.play().catch(e => console.warn('Auto-play failed:', e));
            setIsPlaying(true);
        }
    }, [audioUrl]);

    return (
        <div className="min-h-screen pt-24 px-4 pb-10 flex flex-col items-center">
            <Header />

            <div className="max-w-3xl w-full space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Text to Speech
                    </h2>
                    <p className="text-slate-400">Type text and hear it spoken.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={`Enter text here...`}
                        className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-lg"
                    />

                    <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
                        <button
                            onClick={() => { setText(''); setTranslatedText(null); setAudioUrl(null); }}
                            className="text-slate-500 hover:text-red-400 transition-colors text-sm flex items-center gap-1 order-2 md:order-1"
                            disabled={!text}
                        >
                            <Trash2 size={16} /> Clear
                        </button>

                        <div className="flex items-center gap-3 order-1 md:order-2">
                            {/* Standard Speak Button */}
                            <button
                                onClick={() => handleSpeak(null)}
                                disabled={!text || isProcessing}
                                className={`
                      px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all duration-300
                      ${!text || isProcessing
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95'}
                    `}
                            >
                                {isProcessing && processingLang === 'default' ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
                                {isProcessing && processingLang === 'default' ? 'Generating...' : 'Speak'}
                            </button>

                            {/* Vertical Divider */}
                            <div className="h-8 w-px bg-white/10 mx-1"></div>

                            {/* Translation Speak Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSpeak('hin_Deva')}
                                    disabled={!text || isProcessing}
                                    className={`
                          px-4 py-3 rounded-full font-medium flex items-center gap-2 transition-all duration-300 border border-white/10
                          ${!text || isProcessing
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white hover:border-pink-500/30'}
                        `}
                                    title="Translate to Hindi & Speak"
                                >
                                    {isProcessing && processingLang === 'hin_Deva' ? <Loader2 size={18} className="animate-spin text-pink-400" /> : <span className="text-xs font-bold bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded">HI</span>}
                                    <span className="text-sm">Speak</span>
                                </button>

                                <button
                                    onClick={() => handleSpeak('kan_Knda')}
                                    disabled={!text || isProcessing}
                                    className={`
                          px-4 py-3 rounded-full font-medium flex items-center gap-2 transition-all duration-300 border border-white/10
                          ${!text || isProcessing
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white hover:border-orange-500/30'}
                        `}
                                    title="Translate to Kannada & Speak"
                                >
                                    {isProcessing && processingLang === 'kan_Knda' ? <Loader2 size={18} className="animate-spin text-orange-400" /> : <span className="text-xs font-bold bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">KA</span>}
                                    <span className="text-sm">Speak</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Translation Result Display */}
                {translatedText && (
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 animate-fade-in text-center">
                        <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">Translated Text</p>
                        <p className="text-lg text-blue-100 font-light">{translatedText}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-center animate-fade-in">
                        {error}
                    </div>
                )}

                {/* Audio Player */}
                {audioUrl && (
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl animate-fade-in flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (audioRef.current) {
                                    if (isPlaying) audioRef.current.pause();
                                    else audioRef.current.play();
                                }
                            }}
                            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors"
                        >
                            {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                        </button>

                        <div className="flex-1">
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => setIsPlaying(false)}
                                controls
                                className="w-full h-10 opacity-80 hover:opacity-100 transition-opacity invert hue-rotate-180"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TextToSpeech;

