import React from 'react';
import { X } from 'lucide-react';

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

export default SettingsModal;
