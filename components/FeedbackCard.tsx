import React from 'react';
import { Feedback } from '../types';
import { CheckCircle2, AlertTriangle, GitPullRequest, FileCheck } from 'lucide-react';

interface FeedbackCardProps {
  feedback: Feedback;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback }) => {
  const isPassing = feedback.score >= 7;

  return (
    <div className="glass-panel rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 mb-8 animate-fade-in-down shadow-lg">
        {/* Header */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${isPassing ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'}`}>
                   {isPassing ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div>
                    <h3 className="text-zinc-800 dark:text-zinc-200 font-medium text-sm flex items-center gap-2">
                        Review Status: <span className={isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{isPassing ? 'Approved' : 'Needs Improvement'}</span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Automated Code Review</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-950/50 px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Score</span>
                <div className={`text-lg font-bold font-mono leading-none ${isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {feedback.score}<span className="text-xs text-zinc-400 dark:text-zinc-600 font-normal">/10</span>
                </div>
            </div>
        </div>

        {/* Content Body */}
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
            {/* Critique Section */}
            <div className="p-6 bg-rose-50/[0.5] dark:bg-rose-500/[0.02]">
                <div className="flex items-center gap-2 mb-3 text-rose-500 dark:text-rose-400/80 font-mono text-[10px] uppercase tracking-wider font-bold">
                    <GitPullRequest size={12} />
                    Critique & Gaps
                </div>
                <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">
                        {feedback.critique}
                    </p>
                </div>
            </div>

            {/* Better Answer Section */}
            <div className="p-6 bg-emerald-50/[0.5] dark:bg-emerald-500/[0.02]">
                 <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400/80 font-mono text-[10px] uppercase tracking-wider font-bold">
                    <FileCheck size={12} />
                    Reference Solution
                </div>
                <div className="relative group pl-4 border-l-2 border-emerald-500/20">
                    <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed italic">
                        "{feedback.betterAnswer}"
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};