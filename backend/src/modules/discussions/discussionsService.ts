import { withTransaction, db } from "../../db/db";
import { AppError } from "../../lib/errors";

type Row = Record<string, unknown>;

function isoDate(value: unknown): string {
  return new Date(String(value)).toISOString();
}

function author(row: Row, prefix: string) {
  return {
    id: String(row[`${prefix}_id`]),
    firstName: String(row[`${prefix}_first_name`]),
    lastName: String(row[`${prefix}_last_name`]),
  };
}

function mapComment(row: Row) {
  return {
    id: String(row.id),
    body: String(row.body),
    createdAt: isoDate(row.created_at),
    author: author(row, "author"),
  };
}

export const discussionsService = {
  async list() {
    const threadsResult = await db.query(
      `SELECT t.id, t.title, t.body, t.created_at, t.updated_at,
              u.id AS author_id, u.first_name AS author_first_name, u.last_name AS author_last_name
       FROM discussion_threads t
       JOIN users u ON u.id = t.author_id
       ORDER BY t.updated_at DESC, t.created_at DESC
       LIMIT 50`,
    );
    const threads = threadsResult.rows as Row[];
    if (threads.length === 0) return [];

    const threadIds = threads.map((row) => String(row.id));
    const commentsResult = await db.query(
      `SELECT c.id, c.thread_id, c.body, c.created_at,
              u.id AS author_id, u.first_name AS author_first_name, u.last_name AS author_last_name
       FROM discussion_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.thread_id = ANY($1::uuid[])
       ORDER BY c.created_at ASC`,
      [threadIds],
    );

    const commentsByThread = new Map<string, ReturnType<typeof mapComment>[]>();
    for (const row of commentsResult.rows as Row[]) {
      const threadId = String(row.thread_id);
      const comments = commentsByThread.get(threadId) ?? [];
      comments.push(mapComment(row));
      commentsByThread.set(threadId, comments);
    }

    return threads.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      createdAt: isoDate(row.created_at),
      updatedAt: isoDate(row.updated_at),
      author: author(row, "author"),
      comments: commentsByThread.get(String(row.id)) ?? [],
    }));
  },

  async createThread(authorId: string, input: { title: string; body: string }) {
    const result = await db.query(
      `INSERT INTO discussion_threads (author_id, title, body)
       VALUES ($1, $2, $3)
       RETURNING id, created_at, updated_at`,
      [authorId, input.title, input.body],
    );
    const row = result.rows[0] as Row;
    return {
      id: String(row.id),
      createdAt: isoDate(row.created_at),
      updatedAt: isoDate(row.updated_at),
    };
  },

  async createComment(authorId: string, threadId: string, body: string) {
    return withTransaction(async (client) => {
      const thread = await client.query(
        "SELECT id FROM discussion_threads WHERE id = $1 FOR UPDATE",
        [threadId],
      );
      if (!thread.rowCount) throw new AppError("That discussion no longer exists.", 404);

      const result = await client.query(
        `INSERT INTO discussion_comments (thread_id, author_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, created_at`,
        [threadId, authorId, body],
      );
      await client.query("UPDATE discussion_threads SET updated_at = now() WHERE id = $1", [
        threadId,
      ]);

      const row = result.rows[0] as Row;
      return { id: String(row.id), createdAt: isoDate(row.created_at) };
    });
  },
};
