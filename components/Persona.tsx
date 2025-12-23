import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio } from 'lucide-react';
import { Button } from './Button';

interface PersonaProps {
  comment?: string;
  isThinking: boolean;
  onDictateResult: (text: string) => void;
}

export const Persona: React.FC<PersonaProps> = ({ comment, isThinking, onDictateResult }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          onDictateResult(finalTranscript + ' ');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
         // Auto-restart if we want continuous, but let's keep it manual toggle for control
         if (isListening) {
             // recognitionRef.current.start(); 
         } else {
             setIsListening(false);
         }
      };
    }
  }, [onDictateResult, isListening]);

  // Toggle Dictation
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Text to Speech
  useEffect(() => {
    if (!comment || isMuted || isThinking) return;

    // Simple browser TTS for immediate feedback
    const utterance = new SpeechSynthesisUtterance(comment);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.cancel(); // Stop previous
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [comment, isMuted, isThinking]);

  return (
    <div className="flex flex-col items-center mb-8 animate-fade-in">
      
      {/* Visual Avatar */}
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        {/* Outer Glow Rings */}
        <div className={`absolute inset-0 rounded-full border border-indigo-500/30 transition-all duration-1000 ${isThinking ? 'scale-110 opacity-50' : 'scale-100 opacity-20'}`}></div>
        <div className={`absolute inset-0 rounded-full border border-indigo-400/20 transition-all duration-1000 delay-150 ${isThinking ? 'scale-125 opacity-40' : 'scale-95 opacity-10'}`}></div>
        
        {/* Core Orb */}
        <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center z-10 transition-all duration-500 ${isThinking ? 'animate-pulse' : ''}`}>
           {isListening ? (
               <Mic className="text-white animate-pulse" size={24} />
           ) : (
               <Radio className={`text-white/80 ${isThinking ? 'animate-spin' : ''}`} size={24} />
           )}
        </div>

        {/* Status Indicator */}
        <div className="absolute -bottom-2 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-full text-[9px] font-mono uppercase tracking-widest text-zinc-400">
            {isThinking ? 'Analyzing' : isListening ? 'Listening' : 'Online'}
        </div>
      </div>

      {/* Mentor Dialogue Bubble */}
      {comment && (
        <div className="relative max-w-2xl">
           <div className="glass-panel p-4 rounded-xl border-indigo-500/20 text-center relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-zinc-800 border-t border-l border-zinc-700 rotate-45"></div>
              <p className="text-zinc-300 font-medium text-sm md:text-base leading-relaxed">
                "{comment}"
              </p>
           </div>
           
           {/* Controls */}
           <div className="flex justify-center gap-2 mt-3">
             <button 
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 transition-colors"
                title={isMuted ? "Unmute Mentor" : "Mute Mentor"}
             >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
             </button>
             
             {recognitionRef.current && (
                 <button 
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-colors flex items-center gap-2 ${isListening ? 'bg-rose-500/10 text-rose-500' : 'hover:bg-zinc-800 text-zinc-500'}`}
                    title="Toggle Dictation"
                 >
                    {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                    {isListening && <span className="text-[10px] font-bold">REC</span>}
                 </button>
             )}
           </div>
        </div>
      )}

    </div>
  );
};