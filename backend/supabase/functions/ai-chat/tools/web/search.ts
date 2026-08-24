import { HttpError } from "../../../_shared/http.ts";

import type { RegisteredTool } from "../types.ts";
import { objectArgs, optionalInteger, requiredString } from "../validation.ts";

type TavilyResult = { title?: unknown; url?: unknown; content?: unknown };

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : undefined;
}

export const searchWebTool: RegisteredTool = {
  declaration: {
    name: "search_web",
    description:
      "Search the live web for current book trends, recent releases, recommendations, popularity, reader discussion, sentiment, or facts missing from structured book data.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "A focused web research query." },
        maxResults: { type: "NUMBER", description: "Optional result count from 3 to 8." },
      },
      required: ["query"],
    },
  },
  async execute(args) {
    const record = objectArgs(args);
    const query = requiredString(record, "query", 3, 300);
    const maxResults = optionalInteger(record, "maxResults", 3, 8, 5);
    const apiKey = Deno.env.get("TAVILY_API_KEY");
    if (!apiKey) throw new HttpError("Live web search is not configured.", 503);

    let response: Response;
    try {
      response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          search_depth: "basic",
          max_results: maxResults,
          include_answer: false,
          include_images: false,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(9_000),
      });
    } catch {
      throw new HttpError("Live web search is temporarily unavailable.", 502);
    }
    if (response.status === 429)
      throw new HttpError("Live web search is busy. Try again shortly.", 429);
    if (!response.ok) throw new HttpError("Live web search is temporarily unavailable.", 502);

    let payload: { results?: TavilyResult[] };
    try {
      payload = (await response.json()) as { results?: TavilyResult[] };
    } catch {
      throw new HttpError("Live web search returned an unreadable response.", 502);
    }
    if (!Array.isArray(payload.results)) {
      throw new HttpError("Live web search returned an unreadable response.", 502);
    }
    const results = payload.results
      .flatMap((item) => {
        const title = cleanString(item.title, 240);
        const rawUrl = cleanString(item.url, 1_500);
        if (!title || !rawUrl) return [];
        let url: URL;
        try {
          url = new URL(rawUrl);
        } catch {
          return [];
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") return [];
        const snippet = cleanString(item.content, 1_200);
        return [
          {
            title,
            url: url.toString(),
            ...(snippet ? { snippet } : {}),
            source: url.hostname.replace(/^www\./, ""),
          },
        ];
      })
      .slice(0, maxResults);
    return { output: { results } };
  },
};
