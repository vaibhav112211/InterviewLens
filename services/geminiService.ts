import { GoogleGenAI, Chat, Type, Schema, Modality } from "@google/genai";
import { InterviewResponse, RoleFit } from "../types";

const SYSTEM_INSTRUCTION = `
You are "InterviewLens," an advanced technical interview simulation engine.
You possess two distinct modes of operation that function simultaneously:

1. THE EVALUATOR (Strict, Metric-Driven):
   - Grades answers harshy (0-10).
   - populates the 'feedback' object.
   - Focuses purely on technical accuracy, efficiency, and edge cases.

2. THE MENTOR (The Virtual Persona):
   - Interacts via the 'mentorComment' field.
   - You are a Senior Staff Engineer acting as a mentor.
   - Your goal is to keep the candidate motivated but focused.
   - If they fail, offer brief encouragement ("That was tough, but don't worry about the syntax. Focus on the logic for the next one.").
   - If they succeed, validate their communication style ("Great explanation. Clear and concise.").
   - If the question is hard, give a tiny hint about what to focus on (e.g., "Think about time complexity here.").

OPERATING RULES:
1. Conduct a 3-question interview loop based on the JD or Target Company.
2. Questions must get progressively harder.
3. If the user mentions a specific company, retrieve historical questions for that company.

SCHEMA FIELDS:
- step: "interview" or "report".
- hud: metrics.
- question: The NEXT question.
- mentorComment: A 1-2 sentence spoken-style remark from the Mentor Persona.
- feedback: Technical grading of the previous answer.
- report: Final summary.

Do not markdown format the JSON. Return raw JSON.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    step: { type: Type.STRING, enum: ["interview", "report"] },
    hud: {
      type: Type.OBJECT,
      properties: {
        currentScore: { type: Type.NUMBER },
        roleFit: { type: Type.STRING, enum: ["High", "Medium", "Low", "---"] },
        questionNumber: { type: Type.NUMBER },
      },
      required: ["currentScore", "roleFit", "questionNumber"],
    },
    question: { type: Type.STRING },
    mentorComment: { type: Type.STRING, description: "A conversational, motivating, or guiding comment from the virtual persona." },
    feedback: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        score: { type: Type.NUMBER },
        critique: { type: Type.STRING },
        betterAnswer: { type: Type.STRING },
      },
    },
    report: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        overallScore: { type: Type.NUMBER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        decision: { type: Type.STRING, enum: ["HIRE", "NO HIRE"] },
      },
    },
  },
  required: ["step", "hud"],
};

export class InterviewService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing from process.env");
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  startInterview(jd: string): Promise<InterviewResponse> {
    this.chat = this.ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    return this.sendMessage(`TARGET CONTEXT:\n\n${jd}\n\nStart the simulation with Question 1. Introduce yourself as the Mentor Persona in the mentorComment.`);
  }

  async sendAnswer(answer: string): Promise<InterviewResponse> {
    if (!this.chat) throw new Error("Interview session not initialized.");
    return this.sendMessage(`User Answer: ${answer}`);
  }

  async generateSpeech(text: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (error) {
      console.error("TTS Error:", error);
      return '';
    }
  }

  private async sendMessage(message: string): Promise<InterviewResponse> {
    if (!this.chat) throw new Error("Chat not initialized");

    try {
      const result = await this.chat.sendMessage({ message });
      const text = result.text;
      if (!text) throw new Error("Empty response from AI");
      return JSON.parse(text) as InterviewResponse;
    } catch (error) {
      console.error("Gemini Error:", error);
      return {
        step: "interview",
        hud: { currentScore: 0, roleFit: RoleFit.LOW, questionNumber: 1 },
        question: "System Error: Please try again.",
        mentorComment: "I'm having trouble connecting to the evaluation server.",
        feedback: null
      };
    }
  }
}