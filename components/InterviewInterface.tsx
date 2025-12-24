import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InterviewResponse } from '../types';
import { HUD } from './HUD';
import { FeedbackCard } from './FeedbackCard';
import { Button } from './Button';
import { Persona } from './Persona';
import { LiveClient, LiveStatus } from '../services/liveClient';
import { MessageSquare, ArrowUpRight, Terminal, Code2, Sparkles, Mic2 } from 'lucide-react';

interface InterviewInterfaceProps {
  data: InterviewResponse;
  onSubmitAnswer: (answer: string) => void;
  isLoading: boolean;
  onGenerateAudio: (text: string) => Promise<string>;
}

export const InterviewInterface: React.FC<InterviewInterfaceProps> = ({ data, onSubmitAnswer, isLoading, onGenerateAudio }) => {
  const [answer, setAnswer] = useState('');
  
  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('disconnected');
  const [liveVolume, setLiveVolume] = useState(0);
  const liveClientRef = useRef<LiveClient | null>(null);

  useEffect(() => {
    return () => {
        if (liveClientRef.current) {
            liveClientRef.current.disconnect();
        }
    };
  }, []);

  const toggleLiveMode = useCallback(() => {
    if (isLiveMode) {
        // Disconnect
        liveClientRef.current?.disconnect();
        setIsLiveMode(false);
        setLiveStatus('disconnected');
    } else {
        // Connect
        setIsLiveMode(true);
        if (!liveClientRef.current) {
            liveClientRef.current = new LiveClient();
        }
        // Use the current question as context for the connection
        const context = data.question ? `Current Question: ${data.question}` : "Start of Interview";
        
        liveClientRef.current.connect(
            context,
            (status) => setLiveStatus(status),
            (level, source) => {
                // If user speaks, volume is low for robot (eyes might glow red in Persona via logic).
                // If AI speaks, volume drives robot mouth.
                if (source === 'ai') {
                    setLiveVolume(level);
                } else {
                    // When user speaks, ensure mouth is closed (volume 0) 
                    setLiveVolume(0);
                }
            },
            (err) => alert(err)
        );
    }
  }, [isLiveMode, data.question]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmitAnswer(answer);
      setAnswer('');
    }
  };

  const handleDictation = useCallback((text: string) => {
      setAnswer(prev => prev + text);
  }, []);

  const lineCount = answer.split('\n').length;
  // Ensure at least 15 lines displayed for the line number gutter
  const lineNumbers = Array.from({ length: Math.max(15, lineCount) }, (_, i) => i + 1);

  return (
    <div className="max-w-5xl mx-auto pt-8 px-4 pb-24">
      
      {/* The Virtual Persona - Mentor */}
      <Persona 
        comment={data.mentorComment} 
        isThinking={isLoading} 
        onDictateResult={handleDictation}
        onGenerateAudio={onGenerateAudio}
        
        // Live Mode Props
        isLiveMode={isLiveMode}
        liveStatus={liveStatus}
        liveVolume={liveVolume}
        onToggleLive={toggleLiveMode}
      />

      <HUD metrics={data.hud} />

      {/* When in Live Mode, we dim the text interface to focus on voice */}
      <div className={`transition-all duration-500 ${isLiveMode ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
          {data.feedback && (
            <FeedbackCard feedback={data.feedback} />
          )}

          {data.question && (
            <div className="flex flex-col gap-6 animate-fade-in-up">
              
              {/* Problem Statement Panel */}
              <div className="glass-panel rounded-lg p-6 md:p-8 border-l-2 border-l-indigo-500 relative overflow-hidden group border-y border-r border-zinc-200 dark:border-zinc-800">
                 {/* Decorative Background Element */}
                 <div className="absolute -right-6 -top-6 text-indigo-500/5 group-hover:text-indigo-500/10 transition-colors duration-500">
                    <MessageSquare size={140} />
                 </div>
                 
                 <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-4">
                      <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold uppercase tracking-wider border border-indigo-500/10">
                        Question 0{data.hud.questionNumber}
                      </span>
                      <div className="h-px bg-indigo-500/10 flex-1"></div>
                   </div>

                   <h3 className="text-lg md:text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4 leading-tight">
                     Problem Description
                   </h3>
                   
                   <div className="prose prose-zinc dark:prose-invert max-w-none prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-p:leading-7 prose-p:text-sm">
                      <p>{data.question}</p>
                   </div>
                 </div>
              </div>

              {/* Solution Editor Panel */}
              <div className="glass-panel rounded-lg overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
                
                {/* Editor Toolbar */}
                <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1.5 ml-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                        </div>
                        <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-800"></div>
                        <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 flex items-center gap-2 bg-white dark:bg-zinc-950 py-0.5 px-2 rounded border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
                           <Terminal size={10} className="text-indigo-500 dark:text-indigo-400" /> 
                           solution.txt
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Sparkles size={10} /> AI Enhanced</span>
                        <span className="flex items-center gap-1"><Code2 size={10} /> Plain Text</span>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="relative bg-white dark:bg-zinc-950 flex flex-1 min-h-[350px]">
                    {/* Line Numbers */}
                    <div className="hidden md:block w-10 py-6 text-right pr-3 text-zinc-400 dark:text-zinc-700 font-mono text-xs select-none bg-zinc-50/50 dark:bg-zinc-950/50 border-r border-zinc-100 dark:border-zinc-900">
                        {lineNumbers.map((num) => (
                            <div key={num} className="leading-relaxed">{num}</div>
                        ))}
                    </div>
                    
                    {/* Textarea */}
                    <textarea
                        className="flex-1 bg-transparent border-none p-6 text-zinc-800 dark:text-zinc-300 focus:ring-0 font-mono text-sm resize-none leading-relaxed outline-none w-full placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        placeholder="// Type your solution, explanation, or simply dictate your answer..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                        spellCheck={false}
                    />
                    
                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <div className="relative">
                               <div className="w-12 h-12 border-2 border-zinc-200 dark:border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
                            </div>
                            <div className="mt-4 text-zinc-500 font-mono text-xs tracking-widest animate-pulse">ANALYZING RESPONSE...</div>
                        </div>
                    )}
                </div>

                {/* Editor Footer / Actions */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-4 text-[10px] text-zinc-500 dark:text-zinc-600 font-mono">
                       <span className="hidden md:inline">Ln {lineCount}, Col {answer.length}</span>
                       <span>UTF-8</span>
                    </div>
                    <Button type="button" isLoading={isLoading} disabled={!answer.trim()} onClick={handleSubmit}>
                        SUBMIT SOLUTION <ArrowUpRight size={14} />
                    </Button>
                </div>
              </div>
            </div>
          )}
      </div>

    </div>
  );
};