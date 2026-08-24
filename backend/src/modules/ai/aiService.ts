import { z } from "zod";
import { db } from "../../db/db";
import { AppError } from "../../lib/errors";
import { getAIProvider } from "../../integrations/gemini";

function getProvider() {
  const provider = getAIProvider();
  if (!provider) {
    throw new AppError(
      "AI features are not configured. Ask an admin to set GEMINI_API_KEY.",
      503,
      "AI_NOT_CONFIGURED",
    );
  }
  return provider;
}

async function loadBook(bookId: string) {
  const result = await db.query(
    `SELECT id, title, author, subtitle, description FROM books WHERE id = $1`,
    [bookId],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new AppError("Book not found", 404);
  return {
    title: String(row.title),
    author: row.author ? String(row.author) : "Unknown",
    subtitle: row.subtitle ? String(row.subtitle) : null,
    description: row.description ? String(row.description) : "",
  };
}

function bookContext(book: {
  title: string;
  author: string;
  subtitle: string | null;
  description: string;
}) {
  return [
    `Title: ${book.title}`,
    book.subtitle ? `Subtitle: ${book.subtitle}` : null,
    `Author: ${book.author}`,
    book.description ? `Synopsis: ${book.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export const aiService = {
  async bookSummary(bookId: string) {
    const book = await loadBook(bookId);
    const provider = getProvider();
    const response = await provider.generate({
      system:
        "You are the Wine & Chapters book club AI assistant. Write a concise, warm, spoiler-free summary of the book for a women's book club newsletter.",
      prompt: `Summarise the following book in under 200 words:\n\n${bookContext(book)}`,
      maxOutputTokens: 400,
    });
    return { summary: response.text, model: response.model };
  },

  async discussionQuestions(bookId: string, count = 6) {
    const book = await loadBook(bookId);
    const provider = getProvider();
    const response = await provider.generate({
      system:
        "You are the Wine & Chapters book club AI assistant. Generate thoughtful, spoiler-free discussion questions that encourage deep conversation about the book.",
      prompt: `Create ${count} discussion questions for our book club about:\n\n${bookContext(book)}\n\nReturn each question on its own line starting with a number.`,
      maxOutputTokens: 500,
    });
    const questions = response.text
      .split("\n")
      .map((line) => line.replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean);
    return { questions, model: response.model };
  },

  async reviewAssist(input: { title?: string; body: string; goal?: string }) {
    const provider = getProvider();
    const goal =
      input.goal ??
      "Improve grammar, structure the thoughts clearly, and make it more expressive while keeping the reviewer's voice.";
    const response = await provider.generate({
      system:
        "You are a gentle book review editor for a women's book club. Improve the review without inventing new opinions, and do not publish anything. Keep the member's voice.",
      prompt: `Improve this book review:\n\nTitle: ${input.title ?? "(none)"}\n\nReview:\n${input.body}\n\nGoal: ${goal}\n\nReturn the improved review text only.`,
      maxOutputTokens: 600,
    });
    return { improved: response.text, model: response.model };
  },

  async eventTheme(input: { occasion?: string; description?: string }) {
    const provider = getProvider();
    const response = await provider.generate({
      system:
        "You are the Wine & Chapters event curator. Suggest an elegant, cohesive theme for a book club meetup with wine pairing and dress code suggestions.",
      prompt: `Suggest a meetup theme${input.occasion ? ` for a ${input.occasion}` : ""}.${
        input.description ? ` Context: ${input.description}` : ""
      }\n\nReturn the theme name, a short concept (2-3 sentences), one wine pairing, and a dress code suggestion.`,
      maxOutputTokens: 350,
    });
    return { suggestion: response.text, model: response.model };
  },

  async bookComparison(bookIds: string[]) {
    if (!bookIds || bookIds.length < 2) {
      throw new AppError("Choose at least two books to compare.", 400);
    }
    const books = [];
    for (const id of bookIds) {
      books.push(await loadBook(id));
    }
    const provider = getProvider();
    const response = await provider.generate({
      system:
        "You are the Wine & Chapters book club AI assistant. Compare the given books across themes, tone, and reading experience.",
      prompt: `Compare these books for our book club:\n\n${books
        .map((b, i) => `Book ${i + 1}:\n${bookContext(b)}`)
        .join("\n\n")}\n\nProvide a balanced comparison under 300 words.`,
      maxOutputTokens: 500,
    });
    return { comparison: response.text, model: response.model };
  },

  async discuss(bookId: string, userMessage: string) {
    const book = await loadBook(bookId);
    const provider = getProvider();
    const response = await provider.generate({
      system:
        "You are the Wine & Chapters AI discussion companion. Help members explore the book they're currently reading. Be warm, thoughtful, and spoiler-aware — if the member asks about spoilers, say the answer may contain spoilers.",
      prompt: `The member is asking about the current club read.\n\n${bookContext(book)}\n\nMember question: ${userMessage}`,
      maxOutputTokens: 600,
    });
    return { reply: response.text, model: response.model };
  },
};
