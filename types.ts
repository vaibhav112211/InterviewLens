export enum InterviewStep {
  WELCOME = 'WELCOME',
  INTERVIEW = 'INTERVIEW',
  REPORT = 'REPORT',
}

export enum RoleFit {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  PENDING = '---'
}

export interface Feedback {
  score: number;
  critique: string;
  betterAnswer: string;
}

export interface HUDMetrics {
  currentScore: number;
  roleFit: RoleFit;
  questionNumber: number;
}

export interface ReportData {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  decision: 'HIRE' | 'NO HIRE';
}

export interface InterviewResponse {
  step: 'interview' | 'report';
  hud: HUDMetrics;
  question?: string;
  mentorComment?: string; // New field for the Persona's voice
  feedback?: Feedback | null;
  report?: ReportData | null;
}