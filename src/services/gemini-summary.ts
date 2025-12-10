/**
 * Gemini AI Summary Service
 * Generates call summaries and key points using Google Gemini API
 */

import {
  CallSession,
  CallSummary,
  DEFAULT_GEMINI_CONFIG,
  GeminiSummaryConfig,
} from '../types/call-summary';
import { CallTranslationPrefs } from './call-translation-prefs';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface ParsedSummary {
  summary: string;
  keyPoints: string[];
  actionItems?: string[];
  topics?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

class GeminiSummaryService {
  private static instance: GeminiSummaryService;
  private config: GeminiSummaryConfig = DEFAULT_GEMINI_CONFIG;
  private apiKey: string | null = null;

  private constructor() {}

  static getInstance(): GeminiSummaryService {
    if (!GeminiSummaryService.instance) {
      GeminiSummaryService.instance = new GeminiSummaryService();
    }
    return GeminiSummaryService.instance;
  }

  private async loadApiKey(): Promise<void> {
    const key = await CallTranslationPrefs.getGeminiKey();
    this.apiKey = key || null;
  }

  setConfig(config: Partial<GeminiSummaryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async isConfigured(): Promise<boolean> {
    await this.loadApiKey();
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  private buildPrompt(transcript: string, callType: string, duration: number): string {
    const durationMins = Math.round(duration / 60000);
    
    return `You are an AI assistant that analyzes call transcripts and provides structured summaries.

CALL INFORMATION:
- Type: ${callType} call
- Duration: ${durationMins} minutes
- This is a multilingual conversation with real-time translation

TRANSCRIPT:
${transcript}

TASK:
Analyze the above transcript and provide a structured summary in JSON format. Focus on:
1. A concise summary (2-3 sentences) of what was discussed
2. Key points (3-5 bullet points of important information)
3. Any action items or follow-ups mentioned
4. Main topics discussed
5. Overall sentiment of the conversation

RESPOND ONLY WITH VALID JSON in this exact format:
{
  "summary": "Brief 2-3 sentence summary of the conversation",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": ["Action 1", "Action 2"],
  "topics": ["Topic 1", "Topic 2"],
  "sentiment": "positive" | "neutral" | "negative"
}

If the transcript is too short or unclear, still provide your best analysis based on available information.`;
  }

  async generateSummary(session: CallSession): Promise<CallSummary> {
    await this.loadApiKey();

    const transcript = this.formatTranscriptForPrompt(session);
    
    if (!transcript || transcript.length < 10) {
      return this.createEmptySummary(session);
    }

    const duration = (session.endTime || Date.now()) - session.startTime;
    const prompt = this.buildPrompt(transcript, session.type, duration);

    try {
      const response = await this.callGeminiAPI(prompt);
      const parsed = this.parseGeminiResponse(response);
      
      return this.buildCallSummary(parsed, session);
    } catch (error) {
      console.error('[GeminiService] Summary generation failed:', error);
      throw error;
    }
  }

  private formatTranscriptForPrompt(session: CallSession): string {
    if (!session.transcripts || session.transcripts.length === 0) {
      return '';
    }

    const finalTranscripts = session.transcripts.filter(t => t.isFinal);
    
    if (finalTranscripts.length === 0) {
      return '';
    }

    const lines: string[] = [];
    let currentSpeaker = '';

    for (const t of finalTranscripts) {
      const speaker = t.speakerName || (t.speaker === 'local' ? 'Speaker A' : 'Speaker B');
      const text = t.sourceText;
      const translation = t.translatedText;

      if (speaker !== currentSpeaker) {
        currentSpeaker = speaker;
        lines.push(`\n[${speaker}]:`);
      }

      if (translation && translation !== text) {
        lines.push(`"${text}" → "${translation}"`);
      } else {
        lines.push(`"${text}"`);
      }
    }

    return lines.join('\n').trim();
  }

  private async callGeminiAPI(prompt: string): Promise<GeminiResponse> {
    const url = `${GEMINI_API_BASE}/${this.config.model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey!,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    return response.json();
  }

  private parseGeminiResponse(response: GeminiResponse): ParsedSummary {
    if (response.error) {
      throw new Error(`Gemini API error: ${response.error.message}`);
    }

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text.trim();
    
    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      
      return {
        summary: parsed.summary || 'No summary available.',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : undefined,
        topics: Array.isArray(parsed.topics) ? parsed.topics : undefined,
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) 
          ? parsed.sentiment 
          : 'neutral',
      };
    } catch (parseError) {
      console.warn('[GeminiService] Failed to parse JSON, extracting manually');
      return this.extractSummaryManually(text);
    }
  }

  private extractSummaryManually(text: string): ParsedSummary {
    // Fallback extraction when JSON parsing fails
    const lines = text.split('\n').filter(l => l.trim());
    
    return {
      summary: lines.slice(0, 3).join(' ').substring(0, 500),
      keyPoints: lines
        .filter(l => l.match(/^[-•*]\s/))
        .map(l => l.replace(/^[-•*]\s/, '').trim())
        .slice(0, 5),
      sentiment: 'neutral',
    };
  }

  private buildCallSummary(parsed: ParsedSummary, session: CallSession): CallSummary {
    const wordCount = session.transcripts
      .filter(t => t.isFinal)
      .reduce((count, t) => count + (t.sourceText?.split(/\s+/).length || 0), 0);

    // Calculate speaker stats
    const speakerStats: Record<string, { wordCount: number; speakingTime: number }> = {};
    
    for (const t of session.transcripts.filter(t => t.isFinal)) {
      const speaker = t.speakerName || t.speaker;
      if (!speakerStats[speaker]) {
        speakerStats[speaker] = { wordCount: 0, speakingTime: 0 };
      }
      speakerStats[speaker].wordCount += t.sourceText?.split(/\s+/).length || 0;
    }

    // Collect unique language pairs
    const langPairs = new Map<string, { source: string; target: string }>();
    for (const t of session.transcripts) {
      const key = `${t.sourceLang}-${t.targetLang}`;
      if (!langPairs.has(key)) {
        langPairs.set(key, { source: t.sourceLang, target: t.targetLang || t.sourceLang });
      }
    }

    return {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      actionItems: parsed.actionItems,
      topics: parsed.topics,
      sentiment: parsed.sentiment,
      languagesUsed: Array.from(langPairs.values()),
      wordCount,
      speakerStats,
      generatedAt: Date.now(),
    };
  }

  private createEmptySummary(session: CallSession): CallSummary {
    return {
      summary: 'This call had minimal or no transcribed content available for summarization.',
      keyPoints: ['Call was too short or no speech was detected'],
      languagesUsed: [{ source: session.sourceLang, target: session.targetLang }],
      wordCount: 0,
      generatedAt: Date.now(),
    };
  }

  async generateQuickSummary(text: string): Promise<string> {
    await this.loadApiKey();
    
    if (!(await this.isConfigured())) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Summarize this conversation in 1-2 sentences:\n\n${text}`;
    
    const response = await this.callGeminiAPI(prompt);
    const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return resultText?.trim() || 'Unable to generate summary.';
  }
}

export const geminiSummaryService = GeminiSummaryService.getInstance();
export default geminiSummaryService;
