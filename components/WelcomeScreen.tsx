import React, { useState } from 'react';
import { Button } from './Button';
import { Briefcase, Terminal, Cpu, ChevronRight, Building2, Code } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: (jd: string) => void;
  isLoading: boolean;
}

const PRESET_COMPANIES = [
  { name: 'Google', color: 'hover:border-blue-500/50 hover:bg-blue-500/10' },
  { name: 'Meta', color: 'hover:border-blue-400/50 hover:bg-blue-400/10' },
  { name: 'Amazon', color: 'hover:border-orange-500/50 hover:bg-orange-500/10' },
  { name: 'Netflix', color: 'hover:border-red-500/50 hover:bg-red-500/10' },
  { name: 'Microsoft', color: 'hover:border-sky-500/50 hover:bg-sky-500/10' },
  { name: 'Apple', color: 'hover:border-zinc-400/50 hover:bg-zinc-400/10' },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, isLoading }) => {
  const [jd, setJd] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jd.trim()) {
      onStart(jd);
    }
  };

  const handleCompanySelect = (companyName: string) => {
    const prompt = `TARGET COMPANY: ${companyName}\nROLE: Senior Software Engineer\n\nPlease simulate a rigorous technical interview specifically asking questions known to be asked by ${companyName}. Mimic their specific interview style.`;
    onStart(prompt);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-5xl w-full animate-fade-in grid md:grid-cols-12 gap-8">
        
        {/* Left Column: Branding (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">System Online</span>
          </div>
          
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tighter">
              Interview<span className="text-zinc-600">Lens</span>
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
              Precision technical interview simulation. Train on real-world questions from top tech companies.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-900">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="p-2 rounded-md bg-zinc-900/50 border border-zinc-800">
                <Cpu size={18} className="text-indigo-400" />
              </div>
              <span className="text-sm font-medium">Gemini 2.5 Core Analysis</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-500">
               <div className="p-2 rounded-md bg-zinc-900/50 border border-zinc-800">
                <Terminal size={18} className="text-indigo-400" />
              </div>
              <span className="text-sm font-medium">Company-Specific Question Bank</span>
            </div>
          </div>
        </div>

        {/* Right Column: Input Panel (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-6">
          
          {/* Company Quick Select */}
          <div className="glass-panel rounded-xl p-6 border border-zinc-800">
             <div className="flex items-center gap-2 mb-4 text-zinc-400 font-mono text-xs uppercase tracking-wider font-bold">
                <Building2 size={12} />
                <span>Quick Start: Top Companies</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRESET_COMPANIES.map((company) => (
                  <button
                    key={company.name}
                    onClick={() => handleCompanySelect(company.name)}
                    disabled={isLoading}
                    className={`group relative p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 text-left transition-all duration-300 ${company.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-zinc-200 group-hover:text-white">{company.name}</span>
                      <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0" />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Simulate Loop</span>
                  </button>
                ))}
              </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="h-px bg-zinc-800 flex-1"></div>
            <span className="text-[10px] text-zinc-600 font-mono uppercase">OR Custom JD</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
          </div>

          {/* JD Input */}
          <div className="glass-panel rounded-xl p-6 border border-zinc-800 relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-4 text-zinc-400 font-mono text-xs uppercase tracking-wider font-bold">
              <Code size={12} />
              <span>Custom Configuration</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <textarea
                  className="w-full h-32 bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 text-zinc-300 focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono text-xs leading-relaxed resize-none placeholder:text-zinc-700"
                  placeholder="// Paste Job Description (JD) here..."
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" className="w-full md:w-auto" isLoading={isLoading} disabled={!jd.trim()}>
                  INITIALIZE CUSTOM <ChevronRight size={14} />
                </Button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};