import React, { useState, useRef, useEffect } from 'react';
import { Mic, Loader2, Download, RotateCcw } from 'lucide-react';
import { WAVRecorder, runTTS, calculateWAVDuration, transcribeAudio, translateText } from './audioServices';
import { fixBytecodes } from './geminiUtils';
import { useAppContext } from './context/AppContext';
import Header from './components/Header';


// Global audio store to prevent GC and survive re-renders
const audioStore = new Map(); // messageId -> { blob, url }

const ChatBubble = ({ message, isUser, onTranslate }) => {
  const audioRef = useRef(null);
  const [audioError, setAudioError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Robust auto-play when audio becomes available
  useEffect(() => {
    if (!isUser && message.audioUrl && audioRef.current) {
      const audio = audioRef.current;

      const playWhenReady = async () => {
        try {
          audio.currentTime = 0;
          await audio.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn('⚠️ Auto-play blocked:', err);
        }
      };

      // Wait for canplaythrough so there's no decode stutter
      const timer = setTimeout(() => {
        if (audio.readyState >= 3) {
          // Already buffered enough, play immediately
          playWhenReady();
        } else {
          audio.addEventListener('canplaythrough', playWhenReady, { once: true });
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        audio.removeEventListener('canplaythrough', playWhenReady);
      };
    }
  }, [message.audioUrl, isUser]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-fade-in w-full`}>
      <div
        className={`max-w-[85%] px-6 py-4 rounded-2xl shadow-lg backdrop-blur-md transition-all duration-300 ${isUser
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm shadow-blue-900/20'
          : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm shadow-black/20'
          }`}
      >
        <p className="text-base leading-relaxed whitespace-pre-wrap break-words font-light">
          {message.text}
        </p>

        {/* Translation Buttons */}
        {!isUser && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/10 transition-opacity duration-300">
            {['eng_Latn', 'hin_Deva', 'kan_Knda'].map((langCode) => (
              <button
                key={langCode}
                onClick={() => onTranslate(message, langCode)}
                className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded-full text-slate-300 transition-colors uppercase tracking-wider border border-white/5"
                title={`Translate to ${langCode === 'eng_Latn' ? 'English' : langCode === 'hin_Deva' ? 'Hindi' : 'Kannada'}`}
              >
                {langCode === 'eng_Latn' ? 'EN' : langCode === 'hin_Deva' ? 'HI' : 'KA'}
              </button>
            ))}
          </div>
        )}

        {/* Audio player */}
        {!isUser && message.audioUrl && (
          <div className="mt-3">
            <audio
              ref={audioRef}
              src={audioStore.get(message.timestamp)?.url || message.audioUrl}
              controls
              playsInline
              className="w-full h-8 opacity-80 hover:opacity-100 transition-opacity invert hue-rotate-180"
              style={{ maxWidth: '100%', minWidth: '200px' }}
              onError={(e) => {
                console.error('❌ Audio error:', e);
                setAudioError(true);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {audioError && (
              <p className="text-xs text-red-400 mt-1">Audio playback failed</p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-slate-400 opacity-60">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>


      </div>
    </div>
  );
};

// Main VoiceBot Component
const VoiceBot = () => {
  const { selectedLanguage, settings, setSettings, t } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(''); // 'transcribing', 'llm', 'tts'
  const [textInput, setTextInput] = useState('');

  const [recordingTime, setRecordingTime] = useState(0);
  const [chatHistory, setChatHistory] = useState([]); // Store backend chat context

  const wavRecorderRef = useRef(null);
  const chatContainerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('voiceBotHistory');
    if (savedHistory) setMessages(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('voiceBotHistory', JSON.stringify(messages));
    }
  }, [messages]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      audioStore.forEach(({ url }) => URL.revokeObjectURL(url));
      audioStore.clear();
    };
  }, []);

  const exportConversation = () => {
    const data = {
      exportDate: new Date().toISOString(),
      totalMessages: messages.length,
      messages: messages.map(m => ({
        text: m.text,
        isUser: m.isUser,
        timestamp: m.timestamp,
        time: new Date(m.timestamp).toLocaleString()
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-bot-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearConversation = () => {
    if (window.confirm('Clear conversation history?')) {
      setMessages([]);
      setChatHistory([]); // Clear backend history context
      localStorage.removeItem('voiceBotHistory');
      // Clean up audio blobs
      audioStore.forEach(({ url }) => URL.revokeObjectURL(url));
      audioStore.clear();
    }
  };

  const toggleRecording = async () => {
    if (isRecordingRef.current) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    if (isRecordingRef.current) return;
    try {
      console.log('🎙️ Starting recording...');
      wavRecorderRef.current = new WAVRecorder();
      await wavRecorderRef.current.startRecording();

      isRecordingRef.current = true;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setRecordingTime(0);

      const updateTimer = () => {
        if (isRecordingRef.current) {
          const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
          setRecordingTime(elapsed);
          recordingTimerRef.current = requestAnimationFrame(updateTimer);
        }
      };
      recordingTimerRef.current = requestAnimationFrame(updateTimer);

    } catch (error) {
      console.error('❌ Recording start failed:', error);
      isRecordingRef.current = false;
      setIsRecording(false);
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;
    console.log('🛑 Stopping recording...');

    if (recordingTimerRef.current) {
      cancelAnimationFrame(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const finalDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
    isRecordingRef.current = false;
    setIsRecording(false);

    if (finalDuration < 0.5) {
      console.warn('⚠️ Recording too short');
      if (wavRecorderRef.current) {
        try {
          wavRecorderRef.current.isRecording = false;
          if (wavRecorderRef.current.mediaStream) wavRecorderRef.current.mediaStream.getTracks().forEach(t => t.stop());
          if (wavRecorderRef.current.audioContext) await wavRecorderRef.current.audioContext.close();
        } catch (e) { console.error(e); }
      }
      setMessages(prev => [...prev, { text: `⚠️ Recording too short (${finalDuration.toFixed(1)}s).`, isUser: false, timestamp: Date.now() }]);
      setRecordingTime(0);
      return;
    }

    try {
      const audioBlob = await wavRecorderRef.current.stopRecording();
      setRecordingTime(0);
      await handleSendAudio(audioBlob);
    } catch (error) {
      console.error('❌ Recording stop error:', error);
      setRecordingTime(0);
      setMessages(prev => [...prev, { text: `Error: ${error.message}`, isUser: false, timestamp: Date.now() }]);
    }
  };

  const handleSendAudio = async (audioBlob) => {
    setIsProcessing(true);
    setProcessingStage('transcribing');

    try {
      const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';
      const modelMap = { 'english': 'en', 'kannada': 'ka' };
      const modelId = modelMap[selectedLanguage] || 'en';

      const transcription = await transcribeAudio(audioBlob, modelId, ngrokBaseUrl);

      setMessages(prev => [...prev, { text: transcription, isUser: true, timestamp: Date.now() }]);

      const cleanedTranscription = fixBytecodes(transcription);
      if (!cleanedTranscription || !cleanedTranscription.trim()) {
        setMessages(prev => [...prev, { text: "Could not hear anything.", isUser: false, timestamp: Date.now(), source_reference: 'System' }]);
        setProcessingStage('');
        return;
      }

      setProcessingStage('llm');
      await handleLLMResponse(cleanedTranscription);

    } catch (error) {
      console.error('❌ ASR error:', error);
      setMessages(prev => [...prev, { text: `Error: ${error.message}`, isUser: false, timestamp: Date.now() }]);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const callLLM = async (text) => {
    const maxRetries = 2;
    let lastError = null;
    let lastResponse = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${settings.backendUrl}/infomatics_bot/generate_response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, chat_history: chatHistory, metadata: { language: "None" } })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        lastResponse = data;
        if (data.error) throw new Error(data.error);
        if (data.chat_history) setChatHistory(data.chat_history);

        let finalAnswer = data.answer;
        let finalSource = data.source_reference;

        if (typeof finalAnswer === 'string') {
          finalAnswer = finalAnswer.replace(/```json\n?/g, '').replace(/```/g, '').trim();
          const firstBrace = finalAnswer.indexOf('{');
          const lastBrace = finalAnswer.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
              const parsed = JSON.parse(finalAnswer.substring(firstBrace, lastBrace + 1));
              if (parsed.answer) {
                finalAnswer = parsed.answer;
                finalSource = parsed.source_reference || finalSource;
              }
            } catch (e) { }
          }
        }

        if (finalAnswer) return { answer: finalAnswer, source_reference: finalSource || 'N/A' };
      } catch (error) { lastError = error; }
    }

    if (lastResponse) return { answer: typeof lastResponse === 'string' ? lastResponse : JSON.stringify(lastResponse, null, 2), source_reference: 'Error: Invalid Format' };
    return { answer: `Backend Error: ${lastError ? lastError.message : 'Unknown error'}`, source_reference: 'System Error' };
  };

  const handleTranslate = async (message, targetLangCode) => {
    if (processingStage !== '') return;
    setIsProcessing(true);
    setProcessingStage('transcribing');

    try {
      const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';
      const sourceLang = message.language || 'eng_Latn';
      if (sourceLang === targetLangCode) { setIsProcessing(false); setProcessingStage(''); return; }

      const translatedText = await translateText(message.text, sourceLang, targetLangCode, ngrokBaseUrl);

      const messageId = Date.now();
      const newMessage = {
        text: translatedText,
        source_reference: `Translated from ${sourceLang}`,
        isUser: false,
        timestamp: messageId,
        audioUrl: null,
        language: targetLangCode
      };
      setMessages(prev => [...prev, newMessage]);

      if (settings.useTTS) {
        setProcessingStage('tts');
        const ttsLangMap = { 'eng_Latn': 'english', 'hin_Deva': 'hindi', 'kan_Knda': 'kannada' };
        const ttsLang = ttsLangMap[targetLangCode] || 'english';
        const { audio } = await runTTS(translatedText, ttsLang, ngrokBaseUrl);

        if (audio) {
          const blob = new Blob([audio], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(blob);
          audioStore.set(messageId, { blob, url: audioUrl });
          setTimeout(() => {
            setMessages(prev => prev.map(msg => msg.timestamp === messageId ? { ...msg, audioUrl } : msg));
          }, 500);
        }
      }
    } catch (error) { alert(`Translation failed: ${error.message}`); } finally { setIsProcessing(false); setProcessingStage(''); }
  };

  const handleLLMResponse = async (userText) => {
    try {
      const { answer, source_reference } = await callLLM(userText);
      const messageId = Date.now();
      const newMessage = {
        text: answer,
        source_reference,
        isUser: false,
        timestamp: messageId,
        audioUrl: null,
        language: selectedLanguage === 'english' ? 'eng_Latn' : selectedLanguage === 'kannada' ? 'kan_Knda' : 'hin_Deva'
      };
      setMessages(prev => [...prev, newMessage]);

      if (settings.useTTS) {
        setProcessingStage('tts');
        const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';
        const { audio } = await runTTS(answer, selectedLanguage, ngrokBaseUrl);

        if (audio) {
          const blob = new Blob([audio], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(blob);
          audioStore.set(messageId, { blob, url: audioUrl });
          setTimeout(() => {
            setMessages(prev => prev.map(msg => msg.timestamp === messageId && !msg.isUser ? { ...msg, audioUrl } : msg));
          }, 500);
        } else if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: `Error: ${error.message}`, isUser: false, timestamp: Date.now() }]);
    } finally { setProcessingStage(''); }
  };

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    setMessages(prev => [...prev, { text: textInput, isUser: true, timestamp: Date.now() }]);
    setTextInput('');
    setIsProcessing(true);
    const cleanedInput = fixBytecodes(textInput);
    await handleLLMResponse(cleanedInput);
    setIsProcessing(false);
  };

  const getStatusText = () => {
    if (isRecording) return t.listening;
    if (processingStage === 'transcribing') return t.transcribing;
    if (processingStage === 'llm') return t.thinking;
    if (processingStage === 'tts') return t.speaking;
    return t.tapToSpeak;
  };

  return (
    <div className="pt-24 min-h-screen">
      <Header
        actions={
          <>
            <button
              onClick={exportConversation}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300"
              title="Export Chat"
            >
              <Download size={20} />
            </button>

            <button
              onClick={clearConversation}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 mr-2"
              title="Reset Chat"
            >
              <RotateCcw size={20} />
            </button>


          </>
        }
      />



      {/* Chat Container */}
      <div
        ref={chatContainerRef}
        className="h-[calc(100vh-6rem)] overflow-y-auto scroll-smooth w-full"
      >
        <div className="pb-48 px-4 md:px-20 max-w-5xl mx-auto space-y-2">
          {messages.length === 0 && !isRecording && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-gradient-to-b from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 relative">
                <div className="absolute inset-0 border border-blue-500/30 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }}></div>
                <Mic size={40} className="text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200">
                {t.welcomeTitle}
              </h2>
              <p className="text-slate-400 max-w-md">
                {t.welcomeText}
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatBubble
              key={msg.timestamp || idx}
              message={msg}
              isUser={msg.isUser}
              onTranslate={handleTranslate}
            />
          ))}

          {isProcessing && (
            <div className="flex justify-start mb-6 animate-fade-in">
              <div className="bg-white/5 border border-white/10 text-slate-400 px-6 py-4 rounded-2xl rounded-bl-sm flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span className="text-sm font-light tracking-wide">{getStatusText()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 w-full p-4 md:p-6 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent z-40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto relative flex items-center gap-4">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder={t.startTyping}
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-xl shadow-lg transition-all"
            disabled={isRecording || isProcessing}
          />

          <button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`
              p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center
              ${isRecording
                ? 'bg-red-500 text-white animate-pulse shadow-red-900/40 ring-4 ring-red-500/20'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 active:scale-95 shadow-blue-900/40 hover:shadow-blue-600/40'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isRecording ? <div className="w-6 h-6 rounded-sm bg-white" /> : <Mic size={24} />}
          </button>
        </div>
        <p className="text-center text-xs text-slate-500 mt-4 font-light tracking-wide">
          {getStatusText()}
        </p>
      </div>
    </div>
  );
};

export default VoiceBot;