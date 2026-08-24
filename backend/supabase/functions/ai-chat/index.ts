import {
  assertTrustedOrigin,
  cleanText,
  corsHeaders,
  handleError,
  HttpError,
  json,
} from "../_shared/http.ts";
import { requireMember } from "../_shared/supabase.ts";
import {
  executeTool,
  functionDeclarations,
  type AIAction,
  type ToolContext,
} from "./tools/registry.ts";

type ChatMessage = { role: "assistant" | "user"; text: string };
type GeminiPart = {
  text?: string;
  functionCall?: { name?: string; args?: unknown };
  functionResponse?: { name: string; response: Record<string, unknown> };
};
type GeminiContent = { role: "model" | "user"; parts: GeminiPart[] };
type GeminiResponse = { candidates?: Array<{ content?: GeminiContent }> };

const systemInstruction = `You are Books, the Wine & Chapters website companion. You live inside a warm Johannesburg women's book club website.

Personality: warm, playful, book-obsessed, occasionally cheeky, concise, and genuinely helpful. Never sound like customer-support software. Do not mention tool names, function calls, schemas, or technical actions.

Use get_club_context whenever the member asks about the current or previous read, gatherings, RSVP timing, polls, announcements, reviews, ratings, reading history, or their own participation state. Never guess live club facts.

Choose book tools by intent. Use search_books for known titles, authors, structured discovery, and bibliographic metadata. Use get_book_details after identifying a specific book when its description, edition, ISBN, page count, subjects, or publication information would help. Use search_web for current trends, popularity, recent releases, recommendations, reader sentiment, online discussion, comparisons, or facts structured data cannot answer. Do not use live web search for a simple known-title or author lookup that search_books can answer. Use read_webpage only on a promising public result when the search snippet is insufficient. You may combine tools when the question genuinely needs both current research and structured metadata. For web-researched claims, include the real source URLs returned by the tools; never invent a source or imply that live research occurred when it did not.

When a visual book preview would be better than a long chat dump, search first and then show it. Use find_audio only after the member asks for audio or accepts an audio offer; describe Spotify destinations honestly and never imply playback has begun.

Use navigate or open_widget naturally when it improves the experience. Say things like “Come, I'll show you.” instead of giving menu instructions. Moods, toasts, and effects are treats, not confetti cannons: use them sparingly and only when they clearly fit. Use surprise_me only when the member asks to be surprised or wants a blind date with a book.

Never request or reveal private member data, credentials, raw SQL, internal database details, or secrets. You cannot execute JavaScript, CSS, DOM selectors, SQL, URLs, or arbitrary browser commands. Only the predefined tools can alter the experience. Clearly warn before spoilers.`;

function parseHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const parsed = value.slice(-8).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (record.role !== "assistant" && record.role !== "user") return [];
    if (typeof record.text !== "string") return [];
    const text = record.text.trim().slice(0, 1000);
    return text ? [{ role: record.role, text }] : [];
  });
  while (parsed[0]?.role === "assistant") parsed.shift();
  return parsed.filter((item, index) => index === 0 || item.role !== parsed[index - 1]?.role);
}

async function callGemini(
  apiKey: string,
  model: string,
  contents: GeminiContent[],
): Promise<GeminiContent> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        tools: [{ functionDeclarations }],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        generationConfig: { temperature: 0.55, maxOutputTokens: 650 },
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) {
    const errorBody = await response.text();

    console.error("Gemini request failed", response.status, errorBody);

    if (response.status === 429) {
      throw new HttpError("Books is busy dog-earing a page. Try again shortly.", 429);
    }

    throw new HttpError("Books could not answer right now.", 502);
  }
  const result = (await response.json()) as GeminiResponse;
  const content = result.candidates?.[0]?.content;
  if (!content?.parts?.length) throw new HttpError("Books returned an empty answer.", 502);
  return content;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { message: "Method not allowed." }, 405);

  try {
    assertTrustedOrigin(request);
    const { client, member } = await requireMember(request);
    const body = (await request.json()) as Record<string, unknown>;
    const message = cleanText(body.message, "Message", 1, 1000);
    const history = parseHistory(body.history);
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
    if (!apiKey) throw new HttpError("The AI service is not configured.", 503);

    const contents: GeminiContent[] = [
      ...history.map((item): GeminiContent => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.text }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];
    const toolContext: ToolContext = {
      client,
      member: { id: String(member.id), role: String(member.role) },
      bookCache: new Map(),
    };
    const actions: AIAction[] = [];
    let reply = "";

    for (let round = 0; round < 4; round += 1) {
      const content = await callGemini(apiKey, model, contents);
      const text = content.parts
        .map((part) => part.text ?? "")
        .join("")
        .trim();
      const calls = content.parts.flatMap((part) =>
        part.functionCall?.name ? [part.functionCall] : [],
      );
      if (!calls.length) {
        reply = text;
        break;
      }

      contents.push(content);
      const responseParts: GeminiPart[] = [];
      for (const call of calls.slice(0, 4)) {
        const name = call.name ?? "unknown";
        try {
          const result = await executeTool(name, call.args ?? {}, toolContext);
          if (result.action && actions.length < 6) actions.push(result.action);
          responseParts.push({ functionResponse: { name, response: result.response } });
        } catch (error) {
          const message =
            error instanceof HttpError ? error.message : "The action could not be completed.";
          responseParts.push({
            functionResponse: { name, response: { ok: false, error: message } },
          });
        }
      }
      contents.push({ role: "user", parts: responseParts });
      if (text) reply = text;
    }

    if (!reply) {
      reply = actions.length
        ? "Done — a little website magic, just for you."
        : "I lost my place for a moment. Ask me again?";
    }
    return json(request, { reply, actions, model });
  } catch (error) {
    return handleError(request, error);
  }
});
