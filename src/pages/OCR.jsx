import React, { useState } from 'react';
import { Upload, X, FileText, Loader2, Copy, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Header from '../components/Header';

const OCR = () => {
    const { settings } = useAppContext();
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [imageLang, setImageLang] = useState('kannada'); // Default for OCR as per user code

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const handleExtract = async () => {
        if (!selectedImage) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Encode image to Base64
            const reader = new FileReader();
            reader.readAsDataURL(selectedImage);

            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                const ngrokBaseUrl = import.meta.env.VITE_NGROK_BASE_URL || 'https://your-ngrok-url.ngrok-free.app';
                const apiUrl = `${ngrokBaseUrl}/ocr/infer`;

                const payload = {
                    "image_b64": base64String,
                    "prompt": "<image>",
                    "language": imageLang,
                    "temperature": 0.0,
                    "max_tokens": 8192
                };

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error(`API Error: ${response.status}`);
                    }

                    const data = await response.json();
                    if (data.success) {
                        setResult(data);
                    } else {
                        throw new Error(data.error || 'Failed to extract text');
                    }

                } catch (apiErr) {
                    setError(apiErr.message);
                } finally {
                    setIsProcessing(false);
                }
            };

            reader.onerror = () => {
                setError('Failed to read image file');
                setIsProcessing(false);
            };

        } catch (err) {
            setError(err.message);
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 px-4 pb-10 flex flex-col items-center">
            <Header />

            <div className="max-w-4xl w-full space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        OCR Text Extraction
                    </h2>
                    <p className="text-slate-400">Upload an image to extract text from it.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Upload Section */}
                    <div className="space-y-4">
                        <div
                            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 min-h-[300px]
                            ${selectedImage ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            {previewUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={previewUrl} alt="Preview" className="max-h-[250px] rounded-lg object-contain shadow-lg" />
                                    <button
                                        onClick={() => {
                                            setSelectedImage(null);
                                            setPreviewUrl(null);
                                            setResult(null);
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                        <Upload size={24} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium text-slate-200">Drop image here</p>
                                        <p className="text-sm text-slate-500">or click to upload</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={handleImageSelect}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Language Script</label>
                                <select
                                    value={imageLang}
                                    onChange={(e) => setImageLang(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-sm"
                                >
                                    <option value="kannada">Kannada</option>
                                    <option value="hindi">Hindi</option>
                                    <option value="english">English</option>
                                </select>
                            </div>

                            <button
                                onClick={handleExtract}
                                disabled={!selectedImage || isProcessing}
                                className={`
                                    w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300
                                    ${!selectedImage || isProcessing
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'}
                                `}
                            >
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                {isProcessing ? 'Extracting...' : 'Extract Text'}
                            </button>
                        </div>
                    </div>

                    {/* Result Section */}
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Extracted Text</h3>
                            {result && (
                                <button
                                    onClick={() => navigator.clipboard.writeText(result.text)}
                                    className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                                    title="Copy text"
                                >
                                    <Copy size={16} />
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="flex-1 flex items-center justify-center text-red-300 text-center p-4">
                                <div>
                                    <p className="font-bold mb-1">Error</p>
                                    <p className="text-sm opacity-80">{error}</p>
                                </div>
                            </div>
                        )}

                        {result ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <p className="whitespace-pre-wrap text-slate-200 leading-relaxed text-sm lg:text-base font-light">
                                    {result.text}
                                </p>
                                <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-500 flex justify-between">
                                    <span>Time: {result.processing_time?.toFixed(2)}s</span>
                                    {result.success && <span className="text-green-400 flex items-center gap-1"><Check size={12} /> Success</span>}
                                </div>
                            </div>
                        ) : (
                            !error && (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-3">
                                    <FileText size={48} className="opacity-20" />
                                    <p className="text-sm">Extracted text will appear here</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OCR;
