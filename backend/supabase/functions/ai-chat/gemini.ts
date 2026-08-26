import { HttpError } from "../_shared/http.ts";

export type GeminiFunctionCall = { name: string; args: Record<string, unknown> };
export type GeminiPart = {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: { name: string; response: Record<string, unknown> };
};
export type GeminiContent = { role: "model" | "user"; parts: GeminiPart[] };

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type GeminiCallOptions = {
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  allowTools?: boolean;
  systemInstruction?: string;
  functionDeclarations?: ReadonlyArray<unknown>;
};

type SafeProviderError = {
  providerCode?: string;
  providerStatus?: string;
  isJson: boolean;
  readFailed?: boolean;
};

const defaultTimeoutMs = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function providerRequestId(response: Response): string | undefined {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("x-goog-request-id") ??
    response.headers.get("x-guploader-uploadid") ??
    undefined
  );
}

async function parseProviderError(response: Response): Promise<SafeProviderError> {
  let raw = "";
  try {
    raw = await response.text();
  } catch {
    return { isJson: false, readFailed: true };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.error)) return { isJson: true };
    return {
      isJson: true,
      ...(typeof parsed.error.code === "number" ? { providerCode: String(parsed.error.code) } : {}),
      ...(typeof parsed.error.status === "string"
        ? { providerStatus: parsed.error.status.slice(0, 80) }
        : {}),
    };
  } catch {
    return { isJson: false };
  }
}

function providerError(
  message: string,
  status: number,
  options: {
    retryable: boolean;
    category: string;
    upstreamStatus?: number | undefined;
    upstreamRequestId?: string | undefined;
  },
): HttpError {
  const error = new HttpError(message, status, options);
  error.name = "GeminiProviderError";
  return error;
}

function timeoutError(): HttpError {
  return providerError("Books took too long to answer. Please try again.", 504, {
    retryable: true,
    category: "provider_timeout",
  });
}

function responseErrorOptions(category: string, requestId?: string) {
  return {
    retryable: true,
    category,
    upstreamRequestId: requestId,
  };
}

function validatePart(value: unknown, requestId?: string): GeminiPart | null {
  if (!isRecord(value)) {
    throw providerError(
      "Books returned an invalid answer.",
      502,
      responseErrorOptions("provider_malformed_response", requestId),
    );
  }

  const normalized: GeminiPart = {};
  if ("text" in value) {
    if (typeof value.text !== "string") {
      throw providerError(
        "Books returned an invalid answer.",
        502,
        responseErrorOptions("provider_malformed_response", requestId),
      );
    }
    normalized.text = value.text;
  }

  if ("functionCall" in value) {
    if (!isRecord(value.functionCall)) {
      throw providerError(
        "Books returned an invalid tool request.",
        502,
        responseErrorOptions("provider_malformed_function_call", requestId),
      );
    }
    const name = value.functionCall.name;
    const args = value.functionCall.args ?? {};
    if (typeof name !== "string" || !name.trim() || name.length > 128 || !isRecord(args)) {
      throw providerError(
        "Books returned an invalid tool request.",
        502,
        responseErrorOptions("provider_malformed_function_call", requestId),
      );
    }
    normalized.functionCall = { name: name.trim(), args };
  }

  return normalized.text !== undefined || normalized.functionCall ? normalized : null;
}

function validateGeminiResponse(value: unknown, requestId?: string): GeminiContent {
  if (!isRecord(value) || !Array.isArray(value.candidates) || !value.candidates.length) {
    throw providerError("Books returned an empty answer.", 502, {
      retryable: true,
      category: "provider_empty_candidates",
      upstreamRequestId: requestId,
    });
  }
  const first = value.candidates[0];
  if (!isRecord(first) || !isRecord(first.content) || !Array.isArray(first.content.parts)) {
    throw providerError("Books returned an invalid answer.", 502, {
      retryable: true,
      category: "provider_malformed_response",
      upstreamRequestId: requestId,
    });
  }
  const parts = first.content.parts
    .map((part) => validatePart(part, requestId))
    .filter((part): part is GeminiPart => !!part);
  if (!parts.length) {
    throw providerError("Books returned an empty answer.", 502, {
      retryable: true,
      category: "provider_empty_parts",
      upstreamRequestId: requestId,
    });
  }
  return { role: "model", parts };
}

export async function callGemini(
  apiKey: string,
  model: string,
  contents: GeminiContent[],
  options: GeminiCallOptions = {},
): Promise<GeminiContent> {
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const fetchImpl = options.fetchImpl ?? fetch;
  const allowTools = options.allowTools ?? true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: options.systemInstruction ?? "" }] },
            contents,
            ...(allowTools && options.functionDeclarations?.length
              ? {
                  tools: [{ functionDeclarations: options.functionDeclarations }],
                  toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                }
              : {}),
            generationConfig: { temperature: 0.55, maxOutputTokens: 650 },
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw timeoutError();
      }
      throw providerError("Books could not reach the reading desk. Please try again.", 502, {
        retryable: true,
        category: "provider_network",
      });
    }

    const requestId = providerRequestId(response);
    if (!response.ok) {
      const parsedError = await parseProviderError(response);
      if (controller.signal.aborted) throw timeoutError();
      if (parsedError.readFailed) {
        throw providerError("Books could not read the upstream response. Please try again.", 502, {
          retryable: true,
          category: "provider_response_read",
          upstreamStatus: response.status,
          upstreamRequestId: requestId,
        });
      }
      const categorySuffix = parsedError.isJson
        ? (parsedError.providerStatus ?? parsedError.providerCode ?? "json")
        : "non_json";
      if (response.status === 429) {
        throw providerError("Books is busy dog-earing a page. Try again shortly.", 429, {
          retryable: true,
          category: `provider_rate_limited${categorySuffix ? `:${categorySuffix}` : ""}`,
          upstreamStatus: response.status,
          upstreamRequestId: requestId,
        });
      }
      if (response.status === 401 || response.status === 403) {
        throw providerError("The AI service is temporarily unavailable.", 503, {
          retryable: false,
          category: "provider_authentication",
          upstreamStatus: response.status,
          upstreamRequestId: requestId,
        });
      }
      if (response.status >= 500) {
        throw providerError("Books could not answer right now. Please try again.", 502, {
          retryable: true,
          category: "provider_upstream_5xx",
          upstreamStatus: response.status,
          upstreamRequestId: requestId,
        });
      }
      throw providerError("Books could not answer that request right now.", 502, {
        retryable: false,
        category: `provider_rejected${categorySuffix ? `:${categorySuffix}` : ""}`,
        upstreamStatus: response.status,
        upstreamRequestId: requestId,
      });
    }

    let raw: string;
    try {
      raw = await response.text();
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw timeoutError();
      }
      throw providerError("Books could not read the upstream response. Please try again.", 502, {
        retryable: true,
        category: "provider_response_read",
        upstreamStatus: response.status,
        upstreamRequestId: requestId,
      });
    }

    if (controller.signal.aborted) throw timeoutError();
    let result: unknown;
    try {
      result = JSON.parse(raw) as unknown;
    } catch {
      throw providerError("Books returned an invalid answer.", 502, {
        retryable: true,
        category: "provider_invalid_json",
        upstreamStatus: response.status,
        upstreamRequestId: requestId,
      });
    }
    return validateGeminiResponse(result, requestId);
  } finally {
    clearTimeout(timeout);
  }
}
