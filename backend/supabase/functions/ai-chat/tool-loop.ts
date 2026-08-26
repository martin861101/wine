import { HttpError } from "../_shared/http.ts";

import type { GeminiContent, GeminiPart } from "./gemini.ts";
import type { AIAction, ToolContext } from "./tools/registry.ts";

type ModelCall = (contents: GeminiContent[], allowTools: boolean) => Promise<GeminiContent>;
type ToolCall = (
  name: string,
  args: unknown,
  context: ToolContext,
) => Promise<{ response: Record<string, unknown>; action?: AIAction }>;

export type ToolLoopResult = {
  reply: string;
  actions: AIAction[];
  toolNames: string[];
};

function textFrom(content: GeminiContent): string {
  return content.parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function callsFrom(content: GeminiContent) {
  return content.parts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
}

export async function runToolLoop(
  initialContents: GeminiContent[],
  context: ToolContext,
  callModel: ModelCall,
  callTool: ToolCall,
): Promise<ToolLoopResult> {
  const contents = [...initialContents];
  const actions: AIAction[] = [];
  const toolNames = new Set<string>();

  for (let round = 0; round < 4; round += 1) {
    const content = await callModel(contents, true);
    const text = textFrom(content);
    const calls = callsFrom(content);
    if (!calls.length) {
      if (!text) {
        throw new HttpError("Books returned an empty answer.", 502, {
          retryable: true,
          category: "provider_empty_text",
        });
      }
      return { reply: text, actions, toolNames: [...toolNames] };
    }

    if (calls.length > 4) {
      throw new HttpError("Books requested too many actions at once.", 502, {
        retryable: true,
        category: "tool_call_limit",
      });
    }

    contents.push(content);
    const responseParts: GeminiPart[] = [];
    for (const call of calls) {
      const name = call.name;
      toolNames.add(name);
      try {
        const result = await callTool(name, call.args, context);
        if (result.action && actions.length < 6) actions.push(result.action);
        responseParts.push({ functionResponse: { name, response: result.response } });
      } catch (error) {
        console.error("AI chat tool execution failed.", {
          toolName: name,
          errorType: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        responseParts.push({
          functionResponse: {
            name,
            response: { ok: false, error: "The action could not be completed." },
          },
        });
      }
    }
    contents.push({ role: "user", parts: responseParts });
  }

  const finalContent = await callModel(contents, false);
  const finalText = textFrom(finalContent);
  if (callsFrom(finalContent).length || !finalText) {
    throw new HttpError(
      "Books needs another moment to finish that answer. Please try again.",
      502,
      {
        retryable: true,
        category: "tool_loop_exhausted",
      },
    );
  }
  return { reply: finalText, actions, toolNames: [...toolNames] };
}
