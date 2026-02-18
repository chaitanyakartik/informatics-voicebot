import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import VoiceBot from './VoiceBot';
import SpeechToText from './pages/SpeechToText';
import TextToSpeech from './pages/TextToSpeech';
import OCR from './pages/OCR';
import OCRInplacePage from './features/ocr_inplace/OCRInplacePage';
import Translation from './pages/Translation';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
    </AuthProvider>
  );
}

export default App;
