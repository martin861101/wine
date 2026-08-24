export type PersistedMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  sequence: number;
};

export type ModelContent = {
  role: "model" | "user";
  parts: Array<{ text: string }>;
};

// Temporary Phase 1 bound: up to 39 completed prior messages plus the current
// persisted user message. Rolling token summaries are intentionally deferred.
export const RECENT_MESSAGE_LIMIT = 40;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a valid UUID.`);
  }
  return value;
}

export function buildModelContents(
  priorMessages: PersistedMessage[],
  currentUserMessage: PersistedMessage,
): ModelContent[] {
  const ordered = [...priorMessages]
    .filter((message) => message.id !== currentUserMessage.id)
    .sort((left, right) => left.sequence - right.sequence);

  return [...ordered, currentUserMessage].map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}
