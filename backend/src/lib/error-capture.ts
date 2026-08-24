// Preserve the original server error when the HTTP layer converts it to a
// generic response, so logs still contain the useful stack and cause chain.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;
const CAUSE_DEPTH_LIMIT = 5;
const DESCRIPTION_LENGTH_LIMIT = 8_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === "string" ? current : safeStringify(current));
      break;
    }

    const label = depth === 0 ? "" : "caused by: ";
    const { status, statusCode } = current as Error & {
      status?: unknown;
      statusCode?: unknown;
    };
    const value = status ?? statusCode;
    const suffix = typeof value === "number" ? ` (status ${value})` : "";
    parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${suffix}`);
    current = current.cause;
  }

  return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const expanded = args.map((argument) => {
    if (!(argument instanceof Error)) return argument;
    record(argument);
    return describeError(argument);
  });
  originalConsoleError(...expanded);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }

  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
