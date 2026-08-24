import { env } from "../../config/env";
import type { AIProvider } from "./AIProvider";
import { GeminiProvider } from "./GeminiProvider";

export function getAIProvider(): AIProvider | null {
  if (env.GEMINI_API_KEY) {
    return new GeminiProvider();
  }
  return null;
}
