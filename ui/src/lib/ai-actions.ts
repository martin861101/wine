import { z } from "zod";

export const aiDestinationSchema = z.enum([
  "home",
  "current-read",
  "events",
  "reviews",
  "membership",
  "poll",
  "contact",
]);
export const aiWidgetSchema = z.enum(["event", "poll", "current_read", "reviews", "suggest_book"]);
export const aiMoodSchema = z.enum(["default", "cosy", "romance", "mystery", "fantasy", "night"]);
export const aiEffectSchema = z.enum([
  "book_reveal",
  "page_flutter",
  "wine_cheers",
  "sparkle",
  "celebration",
]);

const bookSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(240),
  authors: z.array(z.string().max(160)).max(8),
  cover: z.string().url().max(1000).optional(),
  description: z.string().max(800).optional(),
  publishedDate: z.string().max(40).optional(),
  categories: z.array(z.string().max(100)).max(12),
  isbn: z.string().max(20).optional(),
  pageCount: z.number().int().positive().max(20_000).optional(),
  sourceUrl: z.string().url().startsWith("https://").max(1000).optional(),
});

export const aiActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NAVIGATE"), destination: aiDestinationSchema }).strict(),
  z
    .object({
      type: z.literal("SHOW_BOOK"),
      bookId: z.string().min(1).max(160),
      book: bookSchema,
      blind: z.boolean().optional(),
      tease: z.string().min(1).max(260).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SHOW_AUDIO"),
      title: z.string().min(1).max(180),
      author: z.string().max(140).optional(),
      url: z.string().url().startsWith("https://open.spotify.com/").max(1000),
      provider: z.literal("spotify"),
    })
    .strict(),
  z.object({ type: z.literal("OPEN_WIDGET"), widget: aiWidgetSchema }).strict(),
  z.object({ type: z.literal("SET_MOOD"), mood: aiMoodSchema }).strict(),
  z
    .object({
      type: z.literal("SHOW_TOAST"),
      message: z.string().min(1).max(160),
      toastType: z.enum(["info", "success", "book"]),
    })
    .strict(),
  z.object({ type: z.literal("TRIGGER_EFFECT"), effect: aiEffectSchema }).strict(),
]);

export type AIAction = z.infer<typeof aiActionSchema>;
export type AIMood = z.infer<typeof aiMoodSchema>;

export function parseAIActions(value: unknown): AIAction[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).flatMap((action) => {
    const parsed = aiActionSchema.safeParse(action);
    return parsed.success ? [parsed.data] : [];
  });
}

export const AI_ACTION_EVENT = "wine-and-chapters:ai-action";

export function dispatchAIAction(action: AIAction): void {
  window.dispatchEvent(new CustomEvent<AIAction>(AI_ACTION_EVENT, { detail: action }));
}
