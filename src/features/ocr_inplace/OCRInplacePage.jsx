
import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Loader2, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import Header from '../../components/Header';
import { uploadToOCR, translateText } from './services/api';
import { detectLanguage, segmentText, LANGUAGE_CODES } from './utils/textUtils';
import { computeMedianColor } from './utils/renderingUtils';

const OCRInplacePage = () => {
    const { t } = useAppContext();
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressStep, setProgressStep] = useState('');
    const [error, setError] = useState(null);
    const [ocrResult, setOcrResult] = useState(null);
    const [targetLang, setTargetLang] = useState(LANGUAGE_CODES.ENGLISH);

    // Canvas Refs
    const canvasRef = useRef(null);
    const originalImageRef = useRef(null);

    // Initial Image Load
    useEffect(() => {
        if (selectedImage && canvasRef.current) {
            const img = new Image();
            img.src = URL.createObjectURL(selectedImage);
            img.onload = () => {
                originalImageRef.current = img;
                const canvas = canvasRef.current;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
            };
        }
    }, [selectedImage]);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setOcrResult(null);
            setError(null);
            setProgressStep('');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setOcrResult(null);
            setError(null);
            setProgressStep('');
        }
    };

    const processImage = async () => {
        if (!selectedImage) return;
        setIsProcessing(true);
        setError(null);

        try {
            // Step 1: Layout OCR
            setProgressStep('Analyzing layout...');
            const ocrData = await uploadToOCR(selectedImage);

            if (!ocrData.success) {
                throw new Error('OCR failed to extract layout');
            }

            setOcrResult(ocrData);

            // Step 2: Translation & Rendering
            await renderTranslatedImage(ocrData, targetLang);

        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to process image');
        } finally {
            setIsProcessing(false);
            setProgressStep('');
        }
    };

    const renderTranslatedImage = async (data, targetLanguage) => {
        if (!originalImageRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = originalImageRef.current;

        // Reset Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        setProgressStep('Translating & Rendering...');

        const pages = data.pages || [];
        const renderItems = [];

        // Pre-calculation and Translation Phase
        for (const page of pages) {
            for (const line of page.lines) {
                const { bbox, text } = line;

                const detectedLang = detectLanguage(text);
                let textToRender = text;

                if (targetLanguage !== detectedLang) {
                    const segments = segmentText(text);
                    const translatedSegments = await Promise.all(segments.map(async (seg) => {
                        if (seg.lang === LANGUAGE_CODES.ENGLISH && targetLanguage !== LANGUAGE_CODES.ENGLISH) {
                            return await translateText(seg.text, seg.lang, targetLanguage);
                        } else if (seg.lang !== LANGUAGE_CODES.ENGLISH) {
                            return await translateText(seg.text, seg.lang, targetLanguage);
                        }
                        return seg.text;
                    }));
                    textToRender = translatedSegments.join(' ');
                }

                renderItems.push({ bbox, text: textToRender });
            }
        }

        // Pass 1: Render Backgrounds (to handle overlaps without erasing text)
        renderItems.forEach(item => {
            const [x1, y1, x2, y2] = item.bbox;
            const w = x2 - x1;
            const h = y2 - y1;
            const bgColor = computeMedianColor(ctx, x1, y1, w, h);
            ctx.fillStyle = bgColor;
            // Fill a slightly larger area to ensure coverage, or exact?
            // Exact is safer to avoid unnecessary overlap, but maybe +1px to avoid thin lines.
            ctx.fillRect(x1, y1, w, h);
        });

        // Pass 2: Render Text
        renderItems.forEach(item => {
            renderText(ctx, item.text, item.bbox);
        });
    };

    // Improved Text Rendering with Wrapping and Padding
    const renderText = (ctx, text, bbox) => {
        const [x1, y1, x2, y2] = bbox;
        const w = x2 - x1;
        const h = y2 - y1;

        const padding = 2; // Keep text slightly away from edges
        const maxWidth = w - (padding * 2);
        const maxHeight = h - (padding * 2);

        ctx.fillStyle = 'black'; // TODO: match text color from original? defaults to black for now
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        // Heuristic: start with height-based font size
        let fontSize = Math.min(h * 0.8, 100);
        const minFontSize = 8;
        const fontFamily = '"Noto Sans", "Inter", sans-serif';

        // Helper to check fit
        const checkFit = (size) => {
            ctx.font = `${size}px ${fontFamily}`;
            const words = text.split(' ');
            let lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = ctx.measureText(currentLine + " " + word).width;
                if (width < maxWidth) {
                    currentLine += " " + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);

            const totalHeight = lines.length * (size * 1.2);
            return { fits: totalHeight <= maxHeight, lines };
        };

        // Decrease font size until it fits
        let linesToRender = [text];
        while (fontSize >= minFontSize) {
            const result = checkFit(fontSize);
            if (result.fits) {
                linesToRender = result.lines;
                break;
            }
            fontSize -= 1;
        }

        // If still doesn't fit at minFontSize, just use minFontSize and crop/overflow (or maybe ellipsis)
        if (fontSize < minFontSize) {
            fontSize = minFontSize;
            const result = checkFit(minFontSize);
            linesToRender = result.lines;
        }

        ctx.font = `${fontSize}px ${fontFamily}`;

        // Center Vertically
        const totalTextHeight = linesToRender.length * (fontSize * 1.2);
        const startY = y1 + ((h - totalTextHeight) / 2);

        linesToRender.forEach((line, i) => {
            // Center Horizontally
            const lineWidth = ctx.measureText(line).width;
            const startX = x1 + ((w - lineWidth) / 2);
            ctx.fillText(line.trim(), startX, startY + (i * fontSize * 1.2));
        });
    };

    const handleDownload = () => {
        if (canvasRef.current) {
            const link = document.createElement('a');
            link.download = `ocr-inplace-${Date.now()}.png`;
            link.href = canvasRef.current.toDataURL();
            link.click();
        }
    };

    // Check if re-render is needed when target lang changes
    useEffect(() => {
        if (ocrResult) {
            // Debounce or just trigger
            const timer = setTimeout(() => {
                renderTranslatedImage(ocrResult, targetLang);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [targetLang]);

    return (
        <div className="min-h-screen pt-24 px-4 pb-10 flex flex-col items-center">
            <Header />

            <div className="max-w-6xl w-full space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        OCR Inplace Translation
                    </h2>
                    <p className="text-slate-400">Upload an image to translate text while preserving layout.</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap justify-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                        <option value={LANGUAGE_CODES.ENGLISH}>Translate to English</option>
                        <option value={LANGUAGE_CODES.KANNADA}>Translate to Kannada</option>
                        <option value={LANGUAGE_CODES.HINDI}>Translate to Hindi</option>
                    </select>

                    <button
                        onClick={processImage}
                        disabled={!selectedImage || isProcessing}
                        className={`
                            px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all
                            ${!selectedImage || isProcessing
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg'}
                        `}
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        {isProcessing ? progressStep || 'Processing...' : 'Process Image'}
                    </button>

                    {ocrResult && (
                        <button
                            onClick={handleDownload}
                            className="px-6 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-500 shadow-lg flex items-center gap-2"
                        >
                            <Download size={18} />
                            Download
                        </button>
                    )}
                </div>

                {/* Main Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Upload / Preview */}
                    <div className="space-y-4">
                        <h3 className="text-slate-400 font-medium uppercase tracking-wider text-sm">Original</h3>
                        <div
                            className={`relative border-2 border-dashed rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all duration-300 min-h-[400px]
                            ${selectedImage ? 'border-blue-500/50 bg-black/20' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Original" className="max-w-full max-h-[600px] object-contain" />
                                    <button
                                        onClick={() => {
                                            setSelectedImage(null);
                                            setPreviewUrl(null);
                                            setOcrResult(null);
                                            // clear canvas
                                        }}
                                        className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                                    >
                                        <X size={16} />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center space-y-4 p-8">
                                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                        <Upload size={24} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium text-slate-200">Drop image here</p>
                                        <p className="text-sm text-slate-500">or click to upload</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Canvas Result */}
                    <div className="space-y-4">
                        <h3 className="text-slate-400 font-medium uppercase tracking-wider text-sm">Processed Result</h3>
                        <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-black/20 min-h-[400px] flex items-center justify-center">
                            <canvas
                                ref={canvasRef}
                                className="max-w-full max-h-[600px] object-contain"
                            />
                            {!selectedImage && (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                                    <p>Result will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center gap-3">
                        <AlertCircle size={20} />
                        <p>{error}</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default OCRInplacePage;
