import React, { useState, useRef, useEffect } from 'react';
import { Mic, Settings, X, Loader2, StopCircle, Trash2, Download, RotateCcw } from 'lucide-react';
import { WAVRecorder, runTTS, calculateWAVDuration, transcribeAudio, translateText } from './audioServices';
import { fixBytecodes } from './geminiUtils';
import gokLogo from './assets/gok_logo.png';
import cegLogo from './assets/ceg_logo.png';

// Global audio store to prevent GC and survive re-renders
const audioStore = new Map(); // messageId -> { blob, url }

// Chat Bubble Component
// UI Translation Dictionary
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
    speaking: "Speaking..."
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
    speaking: "ಮಾತನಾಡಲಾಗುತ್ತಿದೆ..."
  }
};

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

        {/* Source Reference */}
        {!isUser && message.source_reference && message.source_reference !== 'N/A' && (
          <div className="mt-2 pt-2 border-t border-white/10 text-xs text-blue-300/70 italic flex gap-1">
            <span>Source:</span> <span className="text-blue-300">{message.source_reference}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Settings Modal Component
const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Backend URL</label>
            <input
              type="text"
              value={settings.backendUrl}
              onChange={(e) => onSettingsChange({ ...settings, backendUrl: e.target.value })}
              placeholder="http://localhost:8000"
              className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-200 placeholder-slate-600"
            />
            <p className="text-xs text-slate-500 mt-1">
              URL of the Gemini wrapper service
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
              <div>
                <p className="font-medium text-slate-200">Enable Text-to-Speech</p>
                <p className="text-xs text-slate-500">Play bot responses using backend TTS</p>
              </div>
              <button
                onClick={() => onSettingsChange({ ...settings, useTTS: !settings.useTTS })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${settings.useTTS ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${settings.useTTS ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main VoiceBot Component
const VoiceBot = () => {
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(''); // 'transcribing', 'llm', 'tts'
  const [textInput, setTextInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    useTTS: true,
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  });
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [chatHistory, setChatHistory] = useState([]); // Store backend chat context

  // Removed audioBlobsRef in favor of module-level audioStore

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
    const savedSettings = localStorage.getItem('voiceBotSettings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    const savedHistory = localStorage.getItem('voiceBotHistory');
    if (savedHistory) setMessages(JSON.parse(savedHistory));

    const savedLanguage = localStorage.getItem('voiceBotLanguage');
    if (savedLanguage) setSelectedLanguage(savedLanguage);
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

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('voiceBotSettings', JSON.stringify(newSettings));
  };

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

  // Toggle recording on/off with click
  const toggleRecording = async () => {
    if (isRecordingRef.current) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    if (isRecordingRef.current) return; // Prevent double-start

    try {
      console.log('🎙️ Starting recording...');
      wavRecorderRef.current = new WAVRecorder();
      await wavRecorderRef.current.startRecording();

      isRecordingRef.current = true;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setRecordingTime(0);

      // Use requestAnimationFrame for smooth, accurate timer
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
    if (!isRecordingRef.current) return; // Prevent double-stop

    console.log('🛑 Stopping recording...');

    // Cancel timer immediately
    if (recordingTimerRef.current) {
      cancelAnimationFrame(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const finalDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
    isRecordingRef.current = false;
    setIsRecording(false);

    console.log('⏱️ Final duration:', finalDuration.toFixed(2) + 's');

    // Check minimum duration BEFORE trying to stop recorder
    if (finalDuration < 0.5) {
      console.warn('⚠️ Recording too short');

      // Clean up recorder
      if (wavRecorderRef.current) {
        try {
          wavRecorderRef.current.isRecording = false;
          if (wavRecorderRef.current.mediaStream) {
            wavRecorderRef.current.mediaStream.getTracks().forEach(t => t.stop());
          }
          if (wavRecorderRef.current.audioContext) {
            await wavRecorderRef.current.audioContext.close();
          }
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }

      setMessages(prev => [...prev, {
        text: `⚠️ Recording too short (${finalDuration.toFixed(1)}s). Please hold for at least 0.5 seconds.`,
        isUser: false,
        timestamp: Date.now()
      }]);
      setRecordingTime(0);
      return;
    }

    // Try to process recording
    try {
      const audioBlob = await wavRecorderRef.current.stopRecording();
      setRecordingTime(0);
      await handleSendAudio(audioBlob);
    } catch (error) {
      console.error('❌ Recording stop error:', error);
      setRecordingTime(0);
      setMessages(prev => [...prev, {
        text: `Error: ${error.message}`,
        isUser: false,
        timestamp: Date.now()
      }]);
    }
  };

  const handleSendAudio = async (audioBlob) => {
    setIsProcessing(true);
    setProcessingStage('transcribing');

    try {
      const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';

      // Map language name to model_id
      const modelMap = {
        'english': 'en',
        'kannada': 'ka'
      };
      const modelId = modelMap[selectedLanguage] || 'en';

      const transcription = await transcribeAudio(audioBlob, modelId, ngrokBaseUrl);

      setMessages(prev => [...prev, {
        text: transcription,
        isUser: true,
        timestamp: Date.now()
      }]);

      const cleanedTranscription = fixBytecodes(transcription);
      console.log('🧹 Cleaned Transcription:', cleanedTranscription);

      if (!cleanedTranscription || !cleanedTranscription.trim()) {
        console.warn('⚠️ Empty transcription, skipping LLM call.');
        setMessages(prev => [...prev, {
          text: "Could not hear anything. Please try again.",
          isUser: false,
          timestamp: Date.now(),
          source_reference: 'System'
        }]);
        setProcessingStage('');
        return;
      }

      setProcessingStage('llm');
      await handleLLMResponse(cleanedTranscription);

    } catch (error) {
      console.error('❌ ASR error:', error);
      const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';
      setMessages(prev => [...prev, {
        text: `Error: ${error.message}. Is the ASR server running on ${ngrokBaseUrl}/asr/transcribe?`,
        isUser: false,
        timestamp: Date.now()
      }]);
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
        console.log(`🤖 Calling Backend (Attempt ${attempt + 1}/${maxRetries}) with text:`, text);

        const response = await fetch(`${settings.backendUrl}/infomatics_bot/generate_response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            chat_history: chatHistory,
            metadata: { language: selectedLanguage }
          })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log('✅ Backend Response:', data);
        lastResponse = data;

        if (data.error) throw new Error(data.error);

        // Update chat history from backend if provided
        if (data.chat_history) {
          setChatHistory(data.chat_history);
        }

        // PARSING LOGIC:
        let finalAnswer = data.answer;
        let finalSource = data.source_reference;

        if (typeof finalAnswer === 'string') {
          finalAnswer = finalAnswer.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        }

        if (typeof finalAnswer === 'string') {
          // Robust JSON extraction: Find first '{' and last '}'
          const firstBrace = finalAnswer.indexOf('{');
          const lastBrace = finalAnswer.lastIndexOf('}');

          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = finalAnswer.substring(firstBrace, lastBrace + 1);
            try {
              const parsed = JSON.parse(potentialJson);
              if (parsed.answer) {
                finalAnswer = parsed.answer;
                finalSource = parsed.source_reference || finalSource;
                console.log('✅ Successfully extracted JSON from mixed text');
              }
            } catch (e) {
              console.warn('⚠️ Found braces but failed to parse JSON, using raw text', e);
            }
          }
        }

        if (finalAnswer) {
          return {
            answer: finalAnswer,
            source_reference: finalSource || 'N/A'
          };
        }

        console.warn('⚠️ Invalid response structure (missing answer). Retrying...');

      } catch (error) {
        console.error(`❌ Attempt ${attempt + 1} failed:`, error);
        lastError = error;
      }
    }

    console.error('❌ All retries failed. Returning raw response or error.');

    if (lastResponse) {
      return {
        answer: typeof lastResponse === 'string' ? lastResponse : JSON.stringify(lastResponse, null, 2),
        source_reference: 'Error: Invalid Format'
      };
    }

    return {
      answer: `Backend Error: ${lastError ? lastError.message : 'Unknown error'}`,
      source_reference: 'System Error'
    };
  };

  const handleTranslate = async (message, targetLangCode) => {
    if (processingStage !== '') return;
    setIsProcessing(true);
    setProcessingStage('transcribing');

    try {
      const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'http://localhost:8001';

      const sourceLang = message.language || 'eng_Latn';

      if (sourceLang === targetLangCode) {
        console.log('⚠️ Source and target languages are the same.');
        setIsProcessing(false);
        setProcessingStage('');
        return;
      }

      const translatedText = await translateText(message.text, sourceLang, targetLangCode, ngrokBaseUrl);

      const ttsLangMap = {
        'eng_Latn': 'english',
        'hin_Deva': 'hindi',
        'kan_Knda': 'kannada'
      };
      const ttsLang = ttsLangMap[targetLangCode] || 'english';

      const langNameMap = {
        'eng_Latn': 'English',
        'hin_Deva': 'Hindi',
        'kan_Knda': 'Kannada'
      };
      const sourceLangName = langNameMap[sourceLang] || sourceLang;

      const messageId = Date.now();
      const newMessage = {
        text: translatedText,
        source_reference: `Translated from ${sourceLangName}`,
        isUser: false,
        timestamp: messageId,
        audioUrl: null,
        language: targetLangCode
      };
      setMessages(prev => [...prev, newMessage]);

      if (settings.useTTS) {
        setProcessingStage('tts');
        const { audio, errors } = await runTTS(translatedText, ttsLang, ngrokBaseUrl);

        if (audio) {
          const blob = new Blob([audio], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(blob);

          audioStore.set(messageId, { blob, url: audioUrl });

          setTimeout(() => {
            setMessages(prev => prev.map(msg =>
              msg.timestamp === messageId
                ? { ...msg, audioUrl }
                : msg
            ));
          }, 500);
        } else {
          console.error('❌ TTS failed for translation:', errors);
        }
      }

    } catch (error) {
      console.error('❌ Translation error:', error);
      alert(`Translation failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
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
        const { audio, errors } = await runTTS(answer, selectedLanguage, ngrokBaseUrl);

        if (errors && errors.length > 0) {
          console.warn('⚠️ TTS warnings:', errors);
        }

        if (audio) {
          const audioDuration = calculateWAVDuration(audio);
          console.log('🕐 Stitched Audio duration:', audioDuration.toFixed(2), 'seconds');

          const blob = new Blob([audio], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(blob);

          audioStore.set(messageId, { blob, url: audioUrl });
          console.log('🔊 Audio blob created, will attach after 0.5s');

          const delayMs = 500;
          setTimeout(() => {
            console.log('⏰ Delay complete, attaching audio URL now');
            setMessages(prev => prev.map(msg =>
              msg.timestamp === messageId && !msg.isUser
                ? { ...msg, audioUrl }
                : msg
            ));
          }, delayMs);

        } else {
          console.error('❌ TTS failed:', errors);
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(answer);
            window.speechSynthesis.speak(utterance);
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        text: `Error: ${error.message}`,
        isUser: false,
        timestamp: Date.now(),
        audioUrl: null
      }]);
    } finally {
      setProcessingStage('');
    }
  };

  const handleSendText = async () => {
    if (!textInput.trim()) return;

    setMessages(prev => [...prev, {
      text: textInput,
      isUser: true,
      timestamp: Date.now()
    }]);
    setTextInput('');

    setIsProcessing(true);
    const cleanedInput = fixBytecodes(textInput);
    await handleLLMResponse(cleanedInput);
    setIsProcessing(false);
  };

  const getStatusText = () => {
    const t = uiTranslations[selectedLanguage] || uiTranslations.english;
    if (isRecording) return t.listening;
    if (processingStage === 'transcribing') return t.transcribing;
    if (processingStage === 'llm') return t.thinking;
    if (processingStage === 'tts') return t.speaking;
    return t.tapToSpeak;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 relative overflow-hidden font-sans selection:bg-blue-500/30">

      {/* Background Decor */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl opacity-30 animate-pulse delay-1000"></div>

      {/* Header */}
      <div className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-[#020617]/50 h-20 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-4">
          <img src={gokLogo} alt="Government of Karnataka" className="h-14 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
          <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>
          <h1 className="text-xl font-semibold tracking-tight text-white hidden md:block">
            {uiTranslations[selectedLanguage]?.title || uiTranslations.english.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Glass Tabs for Language */}
          <div className="flex bg-black/40 rounded-full p-1 border border-white/10">
            <button
              onClick={() => { setSelectedLanguage('english'); localStorage.setItem('voiceBotLanguage', 'english'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${selectedLanguage === 'english' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-white'}`}
            >
              English
            </button>
            <button
              onClick={() => { setSelectedLanguage('kannada'); localStorage.setItem('voiceBotLanguage', 'kannada'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${selectedLanguage === 'kannada' ? 'bg-gradient-to-r from-red-600 to-yellow-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-slate-400 hover:text-white'}`}
            >
              ಕನ್ನಡ
            </button>
          </div>

          <button
            onClick={clearConversation}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 mr-2"
            title="Reset Chat"
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />

      {/* Chat Container */}
      <div
        ref={chatContainerRef}
        className="h-screen overflow-y-auto scroll-smooth w-full"
      >
        <div className="pt-28 pb-48 px-4 md:px-20 max-w-5xl mx-auto space-y-2">
          {messages.length === 0 && !isRecording && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-gradient-to-b from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 relative">
                <div className="absolute inset-0 border border-blue-500/30 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }}></div>
                <Mic size={40} className="text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200">
                {uiTranslations[selectedLanguage]?.welcomeTitle || uiTranslations.english.welcomeTitle}
              </h2>
              <p className="text-slate-400 max-w-md">
                {uiTranslations[selectedLanguage]?.welcomeText || uiTranslations.english.welcomeText}
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatBubble
              key={`${msg.timestamp}-${idx}`}
              message={msg}
              isUser={msg.isUser}
              onTranslate={handleTranslate}
            />
          ))}

          {isProcessing && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl rounded-bl-sm flex items-center gap-3 backdrop-blur-md">
                <Loader2 size={18} className="animate-spin text-blue-400" />
                <span className="text-sm text-blue-200/80 animate-pulse">{getStatusText()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interaction Area (Footer) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">

        {/* Gradient — only behind the mic area, not the whole screen */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none"></div>

        {/* Mic column — centered */}
        <div className="relative z-50 flex flex-col items-center pb-6 pt-4 gap-4 pointer-events-auto">

          {/* Text Input */}
          <div className="flex items-center gap-2 w-full max-w-md px-4">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              disabled={isProcessing || isRecording}
              placeholder={uiTranslations[selectedLanguage]?.startTyping || uiTranslations.english.startTyping}
              className="flex-1 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
            />
            <button
              onClick={handleSendText}
              disabled={isProcessing || isRecording || !textInput.trim()}
              className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm transition-colors"
            >
              {uiTranslations[selectedLanguage]?.send || uiTranslations.english.send}
            </button>
          </div>

          {/* Status & Timer */}
          <div className="h-6 flex items-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-2 text-red-400 font-mono text-sm bg-red-950/30 px-3 py-1 rounded-full border border-red-900/50">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {recordingTime.toFixed(1)}s
              </div>
            )}
            {!isRecording && isProcessing && (
              <span className="text-blue-300 text-sm font-medium tracking-wide animate-pulse">{getStatusText()}</span>
            )}
            {!isRecording && !isProcessing && (
              <span className="text-slate-500 text-sm font-medium tracking-wide opacity-0 transition-opacity duration-700 delay-500" style={{ opacity: 1 }}>
                {uiTranslations[selectedLanguage]?.tapToSpeak || uiTranslations.english.tapToSpeak}
              </span>
            )}
          </div>

          {/* THE ORB - Main Interaction Button */}
          <div className="relative group">
            {/* Ripple Animation Ring when recording */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping opacity-50"></div>
            )}

            {/* Spinning Ring when processing */}
            {/* Spinning Ring when processing */}
            {isProcessing && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-28 h-28 rounded-full border-[3px] border-transparent border-t-blue-400 border-r-purple-400 animate-spin"></div>
              </div>
            )}

            {/* Button Itself */}
            <button
              onClick={toggleRecording}
              disabled={isProcessing}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform ${isRecording
                ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)] scale-110'
                : isProcessing
                  ? 'bg-[#0f172a] shadow-none border border-white/10 scale-95 cursor-wait'
                  : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:shadow-[0_0_70px_rgba(79,70,229,0.7)] hover:scale-105'
                }`}
            >
              {isRecording ? (
                <div className="flex gap-1 h-8 items-end justify-center">
                  {/* Audio Visualizer Bars (Fake) */}
                  <div className="w-1.5 bg-white/90 rounded-full visualizer-bar" style={{ animationDelay: '0s' }}></div>
                  <div className="w-1.5 bg-white/90 rounded-full visualizer-bar" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 bg-white/90 rounded-full visualizer-bar" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 bg-white/90 rounded-full visualizer-bar" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 bg-white/90 rounded-full visualizer-bar" style={{ animationDelay: '0s' }}></div>
                </div>
              ) : isProcessing ? (
                <Loader2 size={32} className="text-blue-400 animate-spin" />
              ) : (
                <Mic size={36} className="text-white drop-shadow-md" />
              )}
            </button>
          </div>

        </div>

        {/* Branding — pinned bottom-right, independent of mic */}
        <div className="absolute bottom-4 right-6 z-50 pointer-events-auto flex flex-col items-end opacity-60 hover:opacity-100 transition-opacity">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Powered By</p>
          <div className="flex items-center gap-2">
            <img src={cegLogo} alt="Centre for e-Governance" className="h-12 w-auto grayscale contrast-125 brightness-150" />
            <div className="w-[1px] h-5 bg-slate-700"></div>
            <span className="text-xs font-semibold text-slate-400">Centre for e-Governance</span>
          </div>
          {messages.length > 0 && (
            <div className="mt-2 flex gap-4">
              <button onClick={exportConversation} className="text-[10px] text-slate-600 hover:text-slate-400">Export Chat</button>
              <button onClick={clearConversation} className="text-[10px] text-red-900/60 hover:text-red-500">Reset</button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default VoiceBot;