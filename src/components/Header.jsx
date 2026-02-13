import React, { useState, useRef, useEffect } from 'react';
import { Settings, Download, RotateCcw, ChevronDown, Monitor, FileText, Mic, Languages, Image as ImageIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import gokLogo from '../assets/gok_logo.png';
import cegLogo from '../assets/ceg_logo.png';

const Header = ({ actions }) => {
    const { selectedLanguage, setSelectedLanguage, t } = useAppContext();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const location = useLocation();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on navigation
    useEffect(() => {
        setDropdownOpen(false);
    }, [location]);

    const navItems = [
        { name: t.pages.home, path: '/', icon: <Monitor size={16} /> },
        { name: t.pages.stt, path: '/stt', icon: <Mic size={16} /> },
        { name: t.pages.tts, path: '/tts', icon: <FileText size={16} /> },
        { name: t.pages.ocr, path: '/ocr', icon: <ImageIcon size={16} /> },
        { name: t.pages.translation, path: '/translation', icon: <Languages size={16} /> },
    ];

    return (
        <div className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-[#020617]/50 h-20 flex items-center justify-between px-6 lg:px-12">
            {/* Left Side: Logos and Title */}
            <div className="flex items-center gap-4">
                <img src={gokLogo} alt="Government of Karnataka" className="h-14 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>
                <h1 className="text-xl font-semibold tracking-tight text-white hidden md:block">
                    {t.title}
                </h1>
            </div>

            {/* Right Side: Controls and Navigation */}
            <div className="flex items-center gap-4">
                {/* Powered By CEG */}
                <div className="flex flex-col items-end mr-2 hidden lg:flex opacity-80">
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 leading-none mb-1">Powered By</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-400">Centre for e-Governance</span>
                        <img src={cegLogo} alt="Centre for e-Governance" className="h-8 w-auto grayscale contrast-125 brightness-150" />
                    </div>
                </div>
                <div className="h-8 w-[1px] bg-white/10 hidden lg:block mr-2"></div>

                {/* Language Selector */}
                <div className="flex bg-black/40 rounded-full p-1 border border-white/10">
                    <button
                        onClick={() => setSelectedLanguage('english')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${selectedLanguage === 'english' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-white'}`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => setSelectedLanguage('kannada')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${selectedLanguage === 'kannada' ? 'bg-gradient-to-r from-red-600 to-yellow-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-slate-400 hover:text-white'}`}
                    >
                        ಕನ್ನಡ
                    </button>
                </div>

                {/* Page Specific Actions (Export, Clear, etc) */}
                {actions}

                {/* Navigation Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className={`p-2 rounded-full transition-colors flex items-center justify-center ${dropdownOpen ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                        title="Menu"
                    >
                        <ChevronDown size={20} className={`transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in overflow-hidden z-[60]">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5 ${location.pathname === item.path ? 'text-blue-400 bg-white/5' : 'text-slate-300'}`}
                                >
                                    {item.icon}
                                    <span>{item.name}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Header;
