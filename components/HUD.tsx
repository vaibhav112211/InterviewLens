import React from 'react';
import { HUDMetrics, RoleFit } from '../types';
import { Activity, Target, Layers } from 'lucide-react';

interface HUDProps {
  metrics: HUDMetrics;
}

export const HUD: React.FC<HUDProps> = ({ metrics }) => {
  const getFitColor = (fit: RoleFit) => {
    switch (fit) {
      case RoleFit.HIGH: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case RoleFit.MEDIUM: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case RoleFit.LOW: return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/10';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 5) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreWidth = (score: number) => {
    return `${Math.min(100, (score / 10) * 100)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Current Score */}
      <div className="glass-panel p-5 rounded-lg flex flex-col justify-between min-h-[90px] border-zinc-800">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest font-bold">
            <Activity size={12} /> Performance
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tighter ${getScoreColor(metrics.currentScore)}`}>
            {metrics.currentScore.toFixed(1)}
          </div>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreColor(metrics.currentScore).replace('text-', 'bg-')}`}
            style={{ width: getScoreWidth(metrics.currentScore) }}
          ></div>
        </div>
      </div>

      {/* Role Fit */}
      <div className="glass-panel p-5 rounded-lg flex flex-col justify-between min-h-[90px] border-zinc-800">
         <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest font-bold mb-3">
          <Target size={12} /> Role Fit Forecast
        </div>
        <div className="flex items-center">
            <span className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider w-full text-center border ${getFitColor(metrics.roleFit)}`}>
            {metrics.roleFit}
            </span>
        </div>
      </div>

      {/* Question Progress */}
      <div className="glass-panel p-5 rounded-lg flex flex-col justify-between min-h-[90px] border-zinc-800">
         <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest font-bold">
                <Layers size={12} /> Progress
            </div>
             <div className="text-xl font-bold font-mono text-zinc-300">
                {metrics.questionNumber}<span className="text-sm text-zinc-600">/3</span>
             </div>
        </div>
        <div className="flex gap-1">
            {[1, 2, 3].map((step) => (
                <div 
                    key={step}
                    className={`h-1.5 flex-1 rounded-sm transition-colors duration-300 ${step <= metrics.questionNumber ? 'bg-indigo-500' : 'bg-zinc-800'}`}
                ></div>
            ))}
        </div>
      </div>
    </div>
  );
};