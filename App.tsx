import React, { useState, useRef, useCallback, useEffect } from 'react';
import { InterviewService } from './services/geminiService';
import { InterviewResponse, InterviewStep, RoleFit } from './types';
import { WelcomeScreen } from './components/WelcomeScreen';
import { InterviewInterface } from './components/InterviewInterface';
import { ReportCard } from './components/ReportCard';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [step, setStep] = useState<InterviewStep>(InterviewStep.WELCOME);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  const [data, setData] = useState<InterviewResponse>({
    step: 'interview',
    hud: { currentScore: 0, roleFit: RoleFit.PENDING, questionNumber: 0 },
    question: '',
    feedback: null,
    report: null
  });

  // Persist the service instance
  const interviewService = useRef(new InterviewService());

  // --- Theme Logic ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme(current => {
      if (current === 'system') return 'light';
      if (current === 'light') return 'dark';
      return 'system';
    });
  };
  // -------------------

  const handleStart = async (jd: string) => {
    setIsLoading(true);
    try {
      const response = await interviewService.current.startInterview(jd);
      setData(response);
      setStep(InterviewStep.INTERVIEW);
    } catch (error) {
      console.error("Failed to start interview", error);
      alert("Failed to initialize interview. Please check your API Key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    setIsLoading(true);
    try {
      const response = await interviewService.current.sendAnswer(answer);
      setData(response);
      
      if (response.step === 'report' && response.report) {
        setStep(InterviewStep.REPORT);
      }
    } catch (error) {
      console.error("Failed to submit answer", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAudio = useCallback(async (text: string) => {
    return interviewService.current.generateSpeech(text);
  }, []);

  const handleRestart = () => {
    setStep(InterviewStep.WELCOME);
    setData({
      step: 'interview',
      hud: { currentScore: 0, roleFit: RoleFit.PENDING, questionNumber: 0 },
      question: '',
      feedback: null,
      report: null
    });
    interviewService.current = new InterviewService();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      
      {/* Decorative Top Border */}
      <div className="fixed top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent z-50"></div>
      
      {/* Theme Switcher */}
      <button 
        onClick={cycleTheme}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-full glass-panel border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all shadow-lg"
        title={`Current Theme: ${theme.toUpperCase()}`}
      >
        {theme === 'light' && <Sun size={18} />}
        {theme === 'dark' && <Moon size={18} />}
        {theme === 'system' && <Monitor size={18} />}
      </button>

      {step === InterviewStep.WELCOME && (
        <WelcomeScreen onStart={handleStart} isLoading={isLoading} />
      )}

      {step === InterviewStep.INTERVIEW && (
        <InterviewInterface 
          data={data} 
          onSubmitAnswer={handleAnswer} 
          isLoading={isLoading}
          onGenerateAudio={handleGenerateAudio}
        />
      )}

      {step === InterviewStep.REPORT && data.report && (
        <ReportCard report={data.report} onRestart={handleRestart} />
      )}
      
      {/* Footer */}
      <div className="fixed bottom-4 right-6 text-[10px] text-zinc-400 dark:text-zinc-600 font-mono tracking-wider">
        SYSTEM: ONLINE | v1.1.0
      </div>
    </div>
  );
};

export default App;