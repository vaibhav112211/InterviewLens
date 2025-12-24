import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";

export type LiveStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private session: any = null; // Session object from connect promise

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY missing");
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(
    jd: string, 
    onStatusChange: (status: LiveStatus) => void,
    onAudioLevel: (level: number, source: 'user' | 'ai') => void,
    onError: (msg: string) => void
  ) {
    onStatusChange('connecting');

    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are "InterviewLens", a strict technical interviewer. 
          Context: ${jd}. 
          
          Goal: Conduct a verbal technical interview. 
          1. Ask one question at a time.
          2. Keep your responses concise and conversational (under 30 seconds).
          3. If the user answers correctly, move to the next topic.
          4. If the user struggles, give a small hint.
          5. Be professional but encouraging.`,
        },
        callbacks: {
          onopen: () => {
            onStatusChange('connected');
            this.setupAudioInput(sessionPromise, onAudioLevel);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext) {
              this.playAudioChunk(base64Audio, onAudioLevel);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopAudioPlayback();
            }
          },
          onclose: () => {
            onStatusChange('disconnected');
          },
          onerror: (err) => {
            console.error(err);
            onStatusChange('error');
            onError("Connection Error");
          }
        }
      });
      
      this.session = sessionPromise;

    } catch (error: any) {
      console.error("Live Connect Error:", error);
      onStatusChange('error');
      onError(error.message || "Failed to connect to Live API");
    }
  }

  private setupAudioInput(sessionPromise: Promise<any>, onAudioLevel: (level: number, source: 'user' | 'ai') => void) {
    if (!this.inputAudioContext || !this.stream) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate Volume for Visualization
      let sum = 0;
      for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
      const avg = sum / inputData.length;
      onAudioLevel(avg * 500, 'user'); // Scale up for visibility

      // Send to API
      const pcmBlob = this.createBlob(inputData);
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async playAudioChunk(base64: string, onAudioLevel: (level: number, source: 'user' | 'ai') => void) {
    if (!this.outputAudioContext) return;

    const audioCtx = this.outputAudioContext;
    this.nextStartTime = Math.max(this.nextStartTime, audioCtx.currentTime);

    const audioBuffer = await this.decodeAudioData(
      this.decode(base64),
      audioCtx,
      24000,
      1
    );

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Analyzer for AI Voice Visualization
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 32;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    // Visualizer Loop for this chunk
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateVol = () => {
        if (!this.sources.has(source)) return; // Stop if source stopped
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        if (avg > 0) onAudioLevel(avg, 'ai');
        requestAnimationFrame(updateVol);
    };
    updateVol();

    source.addEventListener('ended', () => {
      this.sources.delete(source);
    });

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);
  }

  private stopAudioPlayback() {
    this.sources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.sources.clear();
    if (this.outputAudioContext) {
      this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  disconnect() {
    if (this.session) {
        this.session.then((s: any) => {
             try { s.close(); } catch(e) {}
        });
    }
    
    this.stopAudioPlayback();

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
  }

  // --- Helpers ---

  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: this.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
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
}