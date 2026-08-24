import { HttpError } from "../../../_shared/http.ts";

import type { RegisteredTool } from "../types.ts";
import { objectArgs, requiredString } from "../validation.ts";
import { assertSafeWebUrl } from "./safety.ts";

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_TEXT_CHARS = 12_000;
const SUPPORTED_CONTENT_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];

async function responseText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new HttpError("Page is too large to read.", 413);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new HttpError("Page is too large to read.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "“",
    ldquo: "“",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    raquo: "”",
    rdquo: "”",
    rsquo: "’",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#")) {
      const hex = code[1]?.toLowerCase() === "x";
      const number = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(number) && number > 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : " ";
    }
    return named[code.toLowerCase()] ?? " ";
  });
}

function readableHtml(html: string): { title?: string; text: string } {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]
    ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 240)
    : undefined;
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<(script|style|svg|canvas|template|noscript|nav|header|footer|form|aside)\b[\s\S]*?<\/\1>/gi,
      " ",
    )
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/article|\/section|\/blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(withoutNoise)
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
  return { ...(title ? { title } : {}), text };
}

async function fetchPage(initialUrl: string): Promise<{ response: Response; url: URL }> {
  let url = await assertSafeWebUrl(initialUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
          "User-Agent": "WineAndChaptersReader/1.0",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new HttpError("Page could not be read.", 502);
    }
    if (response.status >= 300 && response.status < 400) {
      if (redirects === MAX_REDIRECTS) throw new HttpError("Page has too many redirects.", 502);
      const location = response.headers.get("location");
      if (!location) throw new HttpError("Page could not be read.", 502);
      url = await assertSafeWebUrl(new URL(location, url).toString());
      continue;
    }
    return { response, url };
  }
  throw new HttpError("Page could not be read.", 502);
}

export const readWebpageTool: RegisteredTool = {
  declaration: {
    name: "read_webpage",
    description:
      "Read a selected public web-search result when its snippet is insufficient. Returns only concise readable text and source metadata.",
    parameters: {
      type: "OBJECT",
      properties: { url: { type: "STRING", description: "Public HTTP or HTTPS result URL." } },
      required: ["url"],
    },
  },
  async execute(args) {
    const url = requiredString(objectArgs(args), "url", 8, 1_500);
    const { response, url: finalUrl } = await fetchPage(url);
    if (!response.ok) throw new HttpError("Page could not be read.", 502);
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!contentType || !SUPPORTED_CONTENT_TYPES.includes(contentType)) {
      throw new HttpError("Page content type is not supported.", 415);
    }
    const raw = await responseText(response);
    const readable =
      contentType === "text/plain"
        ? { text: raw.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS) }
        : readableHtml(raw);
    if (!readable.text) throw new HttpError("Page could not be read.", 502);
    return {
      output: {
        ...readable,
        url: finalUrl.toString(),
        source: finalUrl.hostname.replace(/^www\./, ""),
      },
    };
  },
};
