import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import type { BookResult } from "../../_shared/open-library.ts";

export const destinations = [
  "home",
  "current-read",
  "events",
  "reviews",
  "membership",
  "poll",
  "contact",
] as const;
export const widgets = ["event", "poll", "current_read", "reviews", "suggest_book"] as const;
export const moods = ["default", "cosy", "romance", "mystery", "fantasy", "night"] as const;
export const toastTypes = ["info", "success", "book"] as const;
export const effects = [
  "book_reveal",
  "page_flutter",
  "wine_cheers",
  "sparkle",
  "celebration",
] as const;

export type Destination = (typeof destinations)[number];
export type Widget = (typeof widgets)[number];
export type Mood = (typeof moods)[number];
export type ToastType = (typeof toastTypes)[number];
export type Effect = (typeof effects)[number];

export type BookPreview = {
  id: string;
  title: string;
  authors: string[];
  cover?: string;
  description?: string;
  publishedDate?: string;
  categories: string[];
  isbn?: string;
  pageCount?: number;
  sourceUrl?: string;
};

export type AIAction =
  | { type: "NAVIGATE"; destination: Destination }
  | { type: "SHOW_BOOK"; bookId: string; book: BookPreview; blind?: boolean; tease?: string }
  | { type: "SHOW_AUDIO"; title: string; author?: string; url: string; provider: "spotify" }
  | { type: "OPEN_WIDGET"; widget: Widget }
  | { type: "SET_MOOD"; mood: Mood }
  | { type: "SHOW_TOAST"; message: string; toastType: ToastType }
  | { type: "TRIGGER_EFFECT"; effect: Effect };

export type ToolContext = {
  client: SupabaseClient;
  member: { id: string; role: string };
  bookCache: Map<string, BookResult>;
};

export type ToolResult = {
  output: Record<string, unknown>;
  action?: AIAction;
};

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolHandler = (args: unknown, context: ToolContext) => Promise<ToolResult> | ToolResult;

export type RegisteredTool = {
  declaration: FunctionDeclaration;
  execute: ToolHandler;
};
