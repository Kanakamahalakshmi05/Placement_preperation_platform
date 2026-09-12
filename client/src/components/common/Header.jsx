import React from 'react';
import { Cpu, ShieldCheck, Sparkles } from 'lucide-react';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-violet-600 rounded-xl shadow-lg shadow-brand-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-brand-500 bg-clip-text text-transparent">
                PrepAI Placement Platform
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full">
                Phase 1 Active
              </span>
            </div>
            <p className="text-xs text-slate-400">AI-Powered Placement Preparation & Interview System</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-semibold">Phase 1 Verified</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Gemini AI Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
