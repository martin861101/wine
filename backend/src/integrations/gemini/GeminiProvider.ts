import { env } from "../../config/env";
import type { AIProvider, AIRequest, AIResponse } from "./AIProvider";

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error("Gemini provider requires GEMINI_API_KEY");
    }
    this.apiKey = env.GEMINI_API_KEY;
    this.model = env.GEMINI_MODEL;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const parts: Array<{ text: string }> = [];
    if (request.system) {
      parts.push({ text: `System: ${request.system}\n` });
    }
    parts.push({ text: request.prompt });

    const body = {
      system_instruction: request.system ? { parts: [{ text: request.system }] } : undefined,
      contents: [{ parts }],
      generationConfig: {
        temperature: request.temperature ?? 0.4,
        maxOutputTokens: request.maxOutputTokens ?? 800,
        ...(request.json ? { responseMimeType: "application/json" } : {}),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new GeminiError("Gemini rate limit reached. Try again shortly.", 429);
      }
      throw new GeminiError(`Gemini API error: HTTP ${response.status}`, response.status);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      promptFeedback?: unknown;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

    if (!text.trim()) {
      throw new GeminiError("Gemini returned an empty response.", 502);
    }
    return { text: text.trim(), model: this.model };
  }
}

export class GeminiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "GeminiError";
    this.statusCode = statusCode;
  }
}
