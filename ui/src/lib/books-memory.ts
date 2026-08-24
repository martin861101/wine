export const booksGreeting = {
  id: "books-greeting",
  role: "assistant" as const,
  text: "Hi, I’m Miss Books. Ask me about books, discussion prompts or a wine pairing.",
  status: "complete" as const,
  requestId: null,
};

export function activeConversationStorageKey(memberId: string): string {
  return `books-ai:conversation:${memberId}`;
}
