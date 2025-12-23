import React, { useState, useRef } from 'react';
import { InterviewService } from './services/geminiService';
import { InterviewResponse, InterviewStep, RoleFit } from './types';
import { WelcomeScreen } from './components/WelcomeScreen';
import { InterviewInterface } from './components/InterviewInterface';
import { ReportCard } from './components/ReportCard';

const App: React.FC = () => {
  const [step, setStep] = useState<InterviewStep>(InterviewStep.WELCOME);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<InterviewResponse>({
    step: 'interview',
    hud: { currentScore: 0, roleFit: RoleFit.PENDING, questionNumber: 0 },
    question: '',
    feedback: null,
    report: null
  });

  // Persist the service instance
  const interviewService = useRef(new InterviewService());

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

  const handleRestart = () => {
    setStep(InterviewStep.WELCOME);
    setData({
      step: 'interview',
      hud: { currentScore: 0, roleFit: RoleFit.PENDING, questionNumber: 0 },
      question: '',
      feedback: null,
      report: null
    });
    // Re-instantiate to clear chat history
    interviewService.current = new InterviewService();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <div className="fixed top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent z-50"></div>
      
      {step === InterviewStep.WELCOME && (
        <WelcomeScreen onStart={handleStart} isLoading={isLoading} />
      )}

      {step === InterviewStep.INTERVIEW && (
        <InterviewInterface 
          data={data} 
          onSubmitAnswer={handleAnswer} 
          isLoading={isLoading} 
        />
      )}

      {step === InterviewStep.REPORT && data.report && (
        <ReportCard report={data.report} onRestart={handleRestart} />
      )}
      
      {/* Footer */}
      <div className="fixed bottom-4 right-6 text-[10px] text-zinc-600 font-mono tracking-wider">
        SYSTEM: ONLINE | v1.0.0
      </div>
    </div>
  );
};

export default App;