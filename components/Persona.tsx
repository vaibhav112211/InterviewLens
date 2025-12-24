import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, RotateCcw, Square, Activity } from 'lucide-react';

interface PersonaProps {
  comment?: string;
  isThinking: boolean;
  onDictateResult: (text: string) => void;
  onGenerateAudio: (text: string) => Promise<string>;
  
  // Live API Props
  isLiveMode?: boolean;
  liveStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
  liveVolume?: number; // 0-100 (ish)
  onToggleLive?: () => void;
}

// 1. Decode Base64 to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// 2. Manual PCM Decoder (Int16 -> Float32)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const Persona: React.FC<PersonaProps> = ({ 
    comment, 
    isThinking, 
    onDictateResult, 
    onGenerateAudio,
    isLiveMode = false,
    liveStatus = 'disconnected',
    liveVolume = 0,
    onToggleLive
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAudioBuffer, setCurrentAudioBuffer] = useState<AudioBuffer | null>(null);
  
  const [isBlinking, setIsBlinking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null); 
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const mouthRef = useRef<HTMLDivElement>(null);
  const ignoreRestartRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  
  const onDictateResultRef = useRef(onDictateResult);
  
  useEffect(() => {
    onDictateResultRef.current = onDictateResult;
  }, [onDictateResult]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Handle External Live Volume (Visualizer)
  useEffect(() => {
    if (isLiveMode && mouthRef.current) {
        // Map live volume (0-100) to height (4px - 20px)
        const volume = Math.max(0, liveVolume - 5); // noise floor
        const height = 4 + (volume / 5);
        mouthRef.current.style.height = `${Math.min(24, height)}px`;
        mouthRef.current.style.borderRadius = height > 6 ? '8px' : '999px';
    }
  }, [isLiveMode, liveVolume]);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      // Don't blink if speaking (either live or cached)
      const speaking = isPlayingAudio || (isLiveMode && liveVolume > 10);
      if (!isListening && !isThinking && !speaking) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 4000); 
    return () => clearInterval(blinkInterval);
  }, [isListening, isThinking, isPlayingAudio, isLiveMode, liveVolume]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setHasSpeechSupport(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          onDictateResultRef.current(finalTranscript + ' ');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        if (event.error === 'audio-capture' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setIsListening(false);
            ignoreRestartRef.current = true;
            if (event.error === 'audio-capture') {
                setErrorMessage("Microphone not found");
            } else if (event.error === 'not-allowed') {
                setErrorMessage("Mic permission denied");
            } else {
                setErrorMessage("Voice service unavailable");
            }
        }
      };
      
      recognition.onend = () => {
         if (ignoreRestartRef.current) {
             ignoreRestartRef.current = false;
             return;
         }
         setIsListening(prev => {
             if (prev) {
                 try { recognition.start(); return true; } catch (e) { return false; }
             }
             return false;
         });
      };

      recognitionRef.current = recognition;
    } else {
        setHasSpeechSupport(false);
    }
    
    return () => {
      stopPlayback();
      if (recognitionRef.current) {
          ignoreRestartRef.current = true; 
          try { recognitionRef.current.stop(); } catch(e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const toggleListening = async () => {
    setErrorMessage(null);
    if (isListening) {
      ignoreRestartRef.current = true;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      stopPlayback(); // Stop audio if we start listening
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        ignoreRestartRef.current = false;
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e: any) {
        setIsListening(false);
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
             setErrorMessage("Mic permission denied");
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
             setErrorMessage("Microphone not found");
        } else {
             setErrorMessage("Mic access failed");
        }
      }
    }
  };

  const stopPlayback = () => {
    if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
        sourceRef.current = null;
    }
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
    }
    setIsPlayingAudio(false);
    if (mouthRef.current && !isLiveMode) {
        mouthRef.current.style.height = '4px';
        mouthRef.current.style.borderRadius = '999px';
    }
  };

  const playBuffer = async (buffer: AudioBuffer) => {
    stopPlayback(); // Ensure stop before play

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 32;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyserRef.current = analyser;

    source.onended = () => {
        setIsPlayingAudio(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (mouthRef.current) {
            mouthRef.current.style.height = '4px';
            mouthRef.current.style.borderRadius = '999px';
        }
        sourceRef.current = null;
    };

    sourceRef.current = source;
    setIsPlayingAudio(true);
    source.start();

    // Animation
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const animateMouth = () => {
        if (!analyserRef.current || !mouthRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        const binCount = dataArray.length;
        for (let i = 0; i < binCount; i++) {
            sum += dataArray[i];
        }
        const average = sum / binCount;
        const volume = Math.max(0, average - 10);
        const height = 4 + (volume / 6); 
        
        mouthRef.current.style.height = `${Math.min(20, height)}px`;
        mouthRef.current.style.borderRadius = height > 6 ? '8px' : '999px';

        animationFrameRef.current = requestAnimationFrame(animateMouth);
    };
    animateMouth();
  };

  // Effect: Handle new comment -> Generate Audio -> Play
  // DISABLED IN LIVE MODE
  useEffect(() => {
    if (!comment || isLiveMode) return;
    
    // Stop any existing playback and listening
    stopPlayback();
    if (isListening) {
        ignoreRestartRef.current = true;
        recognitionRef.current?.stop();
        setIsListening(false);
    }

    let isMounted = true;
    setCurrentAudioBuffer(null); // Reset cache for new comment

    const fetchAndPlay = async () => {
      try {
        const base64Audio = await onGenerateAudio(comment);
        if (!isMounted || !base64Audio) return;
        
        // Decode
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
        
        if (isMounted) {
            setCurrentAudioBuffer(audioBuffer);
            // Only auto-play if not muted
            if (!isMutedRef.current) {
                playBuffer(audioBuffer);
            }
        }
      } catch (error) {
        console.error("Audio generation failed", error);
        if (isMounted) setIsPlayingAudio(false);
      }
    };
    
    fetchAndPlay();
    
    return () => {
        isMounted = false;
        stopPlayback();
    };
  }, [comment, onGenerateAudio, isLiveMode]); 

  const handleReplay = () => {
      if (currentAudioBuffer) {
          playBuffer(currentAudioBuffer);
      }
  };

  const handleStop = () => {
      stopPlayback();
  };

  // Determine States for Visuals
  const isSpeakingVisual = isPlayingAudio || (isLiveMode && liveVolume > 10);
  const isListeningVisual = isListening || (isLiveMode && liveStatus === 'connected' && liveVolume <= 10); 
  // In live mode, if volume is low, we assume we are listening to user, but we don't have explicit user-speaking event from API besides mic input.
  // Actually, let's keep it simple: Robot speaks if volume > 10. Robot listens if Connected & !Speaking.

  return (
    <div className="flex flex-col items-center mb-8 animate-fade-in relative">
      
      {/* Live Mode Toggle (Floating or Top) */}
      {onToggleLive && (
        <button 
            onClick={onToggleLive}
            className={`absolute -top-2 right-0 md:-right-12 p-2 rounded-full border transition-all shadow-sm ${isLiveMode ? 'bg-indigo-500 border-indigo-400 text-white animate-pulse' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-indigo-500'}`}
            title={isLiveMode ? "End Live Conversation" : "Start Live Conversation"}
        >
            <Activity size={16} />
        </button>
      )}

      {/* Visual Avatar - The Robot Face - Always kept dark as it is a "Screen" */}
      <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
        {/* Outer Glow Rings */}
        <div className={`absolute inset-0 rounded-full border border-indigo-500/30 transition-all duration-1000 ${isThinking || isSpeakingVisual ? 'scale-110 opacity-50' : 'scale-100 opacity-20'}`}></div>
        <div className={`absolute inset-0 rounded-full border border-indigo-400/20 transition-all duration-1000 delay-150 ${isThinking || isSpeakingVisual ? 'scale-125 opacity-40' : 'scale-95 opacity-10'}`}></div>
        
        {/* Robot Head Container */}
        <div className={`relative w-20 h-20 rounded-[20px] bg-zinc-950 border-2 ${isListeningVisual ? 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.5)]'} flex flex-col items-center justify-center z-10 transition-all duration-500 overflow-hidden`}>
           
           {/* Screen Scanlines Effect */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,99,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
           
           {/* The Face */}
           <div className={`flex flex-col items-center gap-2 z-30 transition-all duration-300 ${(isThinking || liveStatus === 'connecting') ? 'animate-pulse opacity-80' : 'opacity-100'}`}>
              
              {/* Eyes */}
              <div className="flex gap-4">
                 {/* Left Eye */}
                 <div 
                    className={`w-3.5 h-5 rounded-full transition-all duration-300 transform 
                    ${isListeningVisual ? 'bg-rose-400 shadow-[0_0_12px_#fb7185]' : 'bg-cyan-300 shadow-[0_0_12px_#67e8f9]'}
                    ${isBlinking ? 'scale-y-[0.1]' : 'scale-y-100'}
                    `}
                 ></div>
                 {/* Right Eye */}
                 <div 
                    className={`w-3.5 h-5 rounded-full transition-all duration-300 transform 
                    ${isListeningVisual ? 'bg-rose-400 shadow-[0_0_12px_#fb7185]' : 'bg-cyan-300 shadow-[0_0_12px_#67e8f9]'}
                    ${isBlinking ? 'scale-y-[0.1]' : 'scale-y-100'}
                    `}
                 ></div>
              </div>

              {/* Mouth */}
              <div className="h-4 flex items-center justify-center">
                {(isSpeakingVisual) ? (
                    <div 
                        ref={mouthRef}
                        className="w-8 bg-cyan-300 shadow-[0_0_10px_#67e8f9] rounded-full"
                        style={{ height: '4px' }}
                    ></div>
                ) : isListeningVisual ? (
                    <div className="w-2 h-2 rounded-full border-[1.5px] border-rose-400 shadow-[0_0_5px_#fb7185]"></div>
                ) : (
                    <div className="w-6 h-2 border-b-[2.5px] border-cyan-300 rounded-[50%] shadow-[0_4px_4px_-2px_#67e8f9]"></div>
                )}
              </div>

           </div>
        </div>

        {/* Status Badge */}
        <div className={`absolute -bottom-3 px-2 py-0.5 border rounded-full text-[9px] font-mono uppercase tracking-widest z-40 shadow-lg ${errorMessage || liveStatus === 'error' ? 'bg-red-900/90 border-red-800 text-red-200' : 'bg-zinc-100 dark:bg-zinc-900/90 border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
            {errorMessage ? 'Error' : 
             liveStatus === 'connecting' ? 'Connecting...' :
             isLiveMode ? 'Live Feed' :
             isThinking ? 'Processing' : 
             isPlayingAudio ? 'Speaking' : 
             isListening ? 'Listening' : 'Online'}
        </div>
      </div>

      {/* Mentor Dialogue Bubble */}
      {/* Hide standard text bubbles if in Live Mode to keep UI clean, unless there is an error */}
      {(!isLiveMode || errorMessage) && comment && (
        <div className="relative max-w-2xl">
           <div className="glass-panel p-4 rounded-xl border-indigo-500/20 text-center relative shadow-sm">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-zinc-800 border-t border-l border-zinc-200 dark:border-zinc-700 rotate-45"></div>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium text-sm md:text-base leading-relaxed">
                "{comment}"
              </p>
           </div>
           
           {/* Controls */}
           <div className="flex flex-col items-center gap-2 mt-3">
             <div className="flex justify-center gap-2">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${isMuted ? 'text-zinc-400 dark:text-zinc-600' : 'text-indigo-500 dark:text-indigo-400'}`}
                    title={isMuted ? "Unmute Mentor" : "Mute Mentor"}
                >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                
                {/* Replay Button */}
                {!isPlayingAudio && currentAudioBuffer && !isListening && (
                    <button
                        onClick={handleReplay}
                        className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                        title="Replay Audio"
                    >
                        <RotateCcw size={16} />
                    </button>
                )}

                {/* Stop Button */}
                {isPlayingAudio && (
                     <button
                        onClick={handleStop}
                        className="p-2 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                        title="Stop Audio"
                    >
                        <Square size={16} fill="currentColor" />
                    </button>
                )}

                {hasSpeechSupport && (
                    <button 
                        onClick={toggleListening}
                        disabled={!!errorMessage && errorMessage !== "Microphone not found" && errorMessage !== "Mic permission denied"}
                        className={`p-2 rounded-full transition-colors flex items-center gap-2 ${isListening ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500'} ${errorMessage ? 'opacity-50' : ''}`}
                        title={errorMessage ? errorMessage : "Toggle Dictation"}
                    >
                        {isListening ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
                        {isListening && <span className="text-[10px] font-bold">REC</span>}
                    </button>
                )}
             </div>
             
             {errorMessage && (
                 <button 
                    onClick={() => { toggleListening(); }}
                    className="flex items-center gap-1.5 text-red-500 dark:text-red-400 text-[10px] font-mono animate-fade-in hover:underline cursor-pointer"
                 >
                     <AlertCircle size={10} /> {errorMessage} (Click to Retry)
                 </button>
             )}
           </div>
        </div>
      )}
      
      {isLiveMode && (
         <div className="mt-4 text-center animate-fade-in">
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                {liveStatus === 'connected' ? 'Live Conversation Active' : liveStatus}
            </p>
            <p className="text-zinc-400 dark:text-zinc-600 text-[10px] mt-1">Speak naturally • Interrupt anytime</p>
         </div>
      )}

    </div>
  );
};