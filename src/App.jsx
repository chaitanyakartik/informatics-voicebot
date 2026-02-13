import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import VoiceBot from './VoiceBot';
import SpeechToText from './pages/SpeechToText';
import TextToSpeech from './pages/TextToSpeech';
import OCR from './pages/OCR';
import OCRInplacePage from './features/ocr_inplace/OCRInplacePage';
import Translation from './pages/Translation';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<VoiceBot />} />
            <Route path="/stt" element={<SpeechToText />} />
            <Route path="/tts" element={<TextToSpeech />} />
            <Route path="/ocr" element={<OCR />} />
            <Route path="/ocr-inplace" element={<OCRInplacePage />} />
            <Route path="/translation" element={<Translation />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
