export interface AIRequest {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
}

export interface AIResponse {
  text: string;
  model: string;
}

export interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}
