import React from 'react';
import { ReportData } from '../types';
import { Check, X, Award, AlertTriangle, RotateCcw, Download } from 'lucide-react';
import { Button } from './Button';

interface ReportCardProps {
  report: ReportData;
  onRestart: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onRestart }) => {
  const isHired = report.decision === 'HIRE';
  const scorePercent = (report.overallScore / 10) * 100;

  return (
    <div className="max-w-4xl mx-auto pt-10 px-4 pb-20 animate-fade-in">
      
      <div className="glass-panel rounded-lg overflow-hidden border border-zinc-800 shadow-2xl">
        {/* Header Section */}
        <div className="bg-zinc-900 p-10 border-b border-zinc-800 text-center relative overflow-hidden">
            
            <h1 className={`text-5xl font-bold mb-2 tracking-tighter ${isHired ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {report.decision}
            </h1>
            <p className="text-zinc-500 font-mono uppercase tracking-widest text-[10px] mb-8">
                Official Assessment Record
            </p>

            <div className="inline-flex flex-col items-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-zinc-800" />
                        <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="6" fill="transparent" 
                            strokeDasharray={377}
                            strokeDashoffset={377 - (377 * scorePercent) / 100}
                            className={`${isHired ? 'text-emerald-500' : 'text-zinc-500'} transition-all duration-1000 ease-out`} 
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-3xl font-bold font-mono text-white">{report.overallScore.toFixed(1)}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">Overall</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
            <div className="p-8 bg-zinc-950/30">
                <h3 className="flex items-center gap-2 text-emerald-400 font-bold mb-6 text-[11px] font-mono uppercase tracking-wider">
                    <Award size={14} /> Notable Strengths
                </h3>
                <ul className="space-y-4">
                    {report.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 group">
                            <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Check size={10} />
                            </div>
                            <span className="text-zinc-400 text-sm leading-relaxed">{s}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="p-8 bg-zinc-950/30">
                <h3 className="flex items-center gap-2 text-rose-400 font-bold mb-6 text-[11px] font-mono uppercase tracking-wider">
                    <AlertTriangle size={14} /> Areas for Improvement
                </h3>
                <ul className="space-y-4">
                    {report.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-3 group">
                             <div className="mt-0.5 w-4 h-4 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <X size={10} />
                            </div>
                            <span className="text-zinc-400 text-sm leading-relaxed">{w}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        <div className="bg-zinc-900 p-5 flex justify-center gap-3 border-t border-zinc-800">
            <Button onClick={onRestart} variant="secondary">
                 <RotateCcw size={14} /> NEW SIMULATION
            </Button>
             <Button onClick={() => window.print()} variant="secondary" className="hidden md:flex">
                 <Download size={14} /> EXPORT PDF
            </Button>
        </div>
      </div>
    </div>
  );
};