import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Copy, RefreshCcw, Loader2 } from 'lucide-react';
import { WAVRecorder, transcribeAudio } from '../audioServices';
import { useAppContext } from '../context/AppContext';
import Header from '../components/Header';
import { fixBytecodes } from '../geminiUtils';

const SpeechToText = () => {
    const { selectedLanguage, settings } = useAppContext();
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState(null);

    const wavRecorderRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const recordingStartTimeRef = useRef(null);

    const startRecording = async () => {
        try {
            setError(null);
            wavRecorderRef.current = new WAVRecorder();
            await wavRecorderRef.current.startRecording();

            setIsRecording(true);
            recordingStartTimeRef.current = Date.now();
            setRecordingTime(0);

            const updateTimer = () => {
                if (wavRecorderRef.current?.isRecording) {
                    const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
                    setRecordingTime(elapsed);
                    recordingTimerRef.current = requestAnimationFrame(updateTimer);
                }
            };
            recordingTimerRef.current = requestAnimationFrame(updateTimer);
        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = async () => {
        if (!wavRecorderRef.current) return;

        if (recordingTimerRef.current) {
            cancelAnimationFrame(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        try {
            setIsRecording(false);
            setIsProcessing(true);

            const audioBlob = await wavRecorderRef.current.stopRecording();

            const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';
            const modelMap = { 'english': 'en', 'kannada': 'ka' };
            const modelId = modelMap[selectedLanguage] || 'en';

            const text = await transcribeAudio(audioBlob, modelId, ngrokBaseUrl);
            const cleanedText = fixBytecodes(text);
            setTranscription(cleanedText);

        } catch (err) {
            console.error('Transcription failed:', err);
            setError(err.message || 'Transcription failed');
        } finally {
            setIsProcessing(false);
            setRecordingTime(0);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(transcription);
    };

    return (
        <div className="min-h-screen pt-24 px-4 pb-10 flex flex-col items-center">
            <Header />

            <div className="max-w-3xl w-full space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Speech to Text ({selectedLanguage === 'english' ? 'English' : 'Kannada'})
                    </h2>
                    <p className="text-slate-400">Convert your voice into text instantly.</p>
                </div>

                {/* Recording Visualizer / Area */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden backdrop-blur-sm">

                    {error && (
                        <div className="absolute top-4 left-4 right-4 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Timer */}
                    {isRecording && (
                        <div className="absolute top-4 right-6 font-mono text-xl text-red-400 animate-pulse">
                            {recordingTime.toFixed(1)}s
                        </div>
                    )}

                    {/* Main Button */}
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessing}
                        className={`
              w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.3)]
              ${isRecording
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 scale-110 animate-pulse'
                                : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:scale-105'}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              border border-white/10
            `}
                    >
                        {isProcessing ? (
                            <Loader2 size={48} className="animate-spin" />
                        ) : isRecording ? (
                            <Square size={40} fill="currentColor" />
                        ) : (
                            <Mic size={48} />
                        )}
                    </button>

                    <p className="mt-8 text-slate-400 font-light">
                        {isProcessing ? 'Processing audio...' : isRecording ? 'Listening...' : 'Tap to start recording'}
                    </p>
                </div>

                {/* Result Area */}
                {transcription && (
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Transcription</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setTranscription('')} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                                    <RefreshCcw size={16} />
                                </button>
                                <button onClick={handleCopy} className="p-2 hover:bg-white/5 rounded-full text-blue-400 hover:text-blue-300 transition-colors" title="Copy text">
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-black/40 rounded-xl border border-white/5 min-h-[100px] text-lg leading-relaxed text-slate-200 whitespace-pre-wrap">
                            {transcription}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpeechToText;
