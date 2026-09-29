import React, { useState, useEffect } from 'react';

export default function GovHeaderStrip() {
  const [currentTime, setCurrentTime] = useState('');
  const [fontSize, setFontSize] = useState('normal'); // 'small' | 'normal' | 'large'
  const [lang, setLang] = useState('EN');

  useEffect(() => {
    // Ensure dark root is set for consistent dark glass theme
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFontChange = (size) => {
    setFontSize(size);
    const root = document.documentElement;
    if (size === 'small') root.style.fontSize = '14px';
    else if (size === 'large') root.style.fontSize = '17px';
    else root.style.fontSize = '16px';
  };

  return (
    <div className="w-full select-none text-xs font-sans">
      {/* 1. National Sovereign Tricolor Line with subtle glow */}
      <div 
        className="h-[3px] w-full shadow-sm" 
        style={{
          background: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%, #138808 100%)'
        }}
      />

      {/* 2. Official Central Government Strip */}
      <div className="bg-slate-950/80 backdrop-blur-md text-slate-300 border-b border-white/5 py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Emblem Authority */}
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold shadow-xs">
              🏛️
            </span>
            <div className="flex items-center space-x-1.5 text-[11px]">
              <span className="font-bold text-white tracking-wide">
                भारत सरकार
              </span>
              <span className="text-slate-600">|</span>
              <span className="font-semibold text-slate-200">
                Government of India
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-400 hidden md:inline truncate max-w-xs lg:max-w-md">
                Ministry of Electronics & IT (MeitY)
              </span>
            </div>
          </div>

          {/* Right: Live Clock & Controls */}
          <div className="flex items-center space-x-3 text-[11px]">
            {/* Live Clock with Live Beacon */}
            <div className="flex items-center space-x-1.5 text-slate-400 hidden sm:flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-[10px] text-slate-300">
                {currentTime}
              </span>
            </div>

            <span className="text-slate-700 hidden sm:inline">|</span>

            {/* Font Resizer */}
            <div className="flex items-center space-x-0.5 bg-slate-900/90 px-1 py-0.5 rounded border border-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => handleFontChange('small')}
                title="Decrease font size"
                className={`px-1.5 py-0.5 rounded hover:text-white transition ${
                  fontSize === 'small' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'
                }`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => handleFontChange('normal')}
                title="Normal font size"
                className={`px-1.5 py-0.5 rounded hover:text-white transition ${
                  fontSize === 'normal' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => handleFontChange('large')}
                title="Increase font size"
                className={`px-1.5 py-0.5 rounded hover:text-white transition ${
                  fontSize === 'large' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'
                }`}
              >
                A+
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center space-x-1 text-[11px] font-medium bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/10">
              <button
                type="button"
                onClick={() => setLang('EN')}
                className={`transition ${lang === 'EN' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                English
              </button>
              <span className="text-slate-600">/</span>
              <button
                type="button"
                onClick={() => setLang('HI')}
                className={`transition ${lang === 'HI' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                हिन्दी
              </button>
            </div>

            {/* SIH Badge */}
            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider">
              SIH 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
