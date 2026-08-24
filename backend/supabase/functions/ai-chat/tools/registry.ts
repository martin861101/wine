import { HttpError } from "../../_shared/http.ts";

import { findAudioTool } from "./audio.ts";
import { getBookDetailsTool, searchBooksTool, showBookTool, surpriseMeTool } from "./books.ts";
import { getClubContextTool } from "./club-context.ts";
import type { AIAction, RegisteredTool, ToolContext } from "./types.ts";
import {
  navigateTool,
  openWidgetTool,
  setMoodTool,
  showToastTool,
  triggerEffectTool,
} from "./ui-actions.ts";
import { readWebpageTool } from "./web/read.ts";
import { searchWebTool } from "./web/search.ts";

const registeredTools = [
  getClubContextTool,
  searchBooksTool,
  getBookDetailsTool,
  searchWebTool,
  readWebpageTool,
  showBookTool,
  findAudioTool,
  navigateTool,
  openWidgetTool,
  setMoodTool,
  showToastTool,
  triggerEffectTool,
  surpriseMeTool,
] as const;

const registry = new Map<string, RegisteredTool>(
  registeredTools.map((tool) => [tool.declaration.name, tool]),
);

export const functionDeclarations = registeredTools.map((tool) => tool.declaration);

export async function executeTool(
  name: string,
  args: unknown,
  context: ToolContext,
): Promise<{ response: Record<string, unknown>; action?: AIAction }> {
  const tool = registry.get(name);
  if (!tool) throw new HttpError("Unknown assistant tool.");
  const result = await tool.execute(args, context);
  return {
    response: { ok: true, ...result.output },
    ...(result.action ? { action: result.action } : {}),
  };
}

export type { AIAction, ToolContext } from "./types.ts";
