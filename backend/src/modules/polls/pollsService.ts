import { db, withTransaction } from "../../db/db";
import { AppError } from "../../lib/errors";

export type PollType = "BOOK_BALLOT" | "MONTHLY_POLL" | "GENERAL";
export type PollStatus = "DRAFT" | "ACTIVE" | "CLOSED";

export interface PollInput {
  type: PollType;
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  hideResults?: boolean;
  status?: PollStatus;
  options: Array<{
    label: string;
    bookId?: string | null | undefined;
    imageUrl?: string | null | undefined;
  }>;
}

function mapPollRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    startsAt: new Date(String(row.starts_at)).toISOString(),
    endsAt: row.ends_at ? new Date(String(row.ends_at)).toISOString() : null,
    hideResults: Boolean(row.hide_results),
    status: String(row.status),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function effectiveStatus(poll: ReturnType<typeof mapPollRow>): PollStatus {
  if (poll.status === "CLOSED") return "CLOSED";
  if (poll.endsAt && new Date(poll.endsAt) < new Date()) return "CLOSED";
  if (poll.status === "DRAFT") return "DRAFT";
  return "ACTIVE";
}

export const pollsService = {
  async create(input: PollInput, createdBy: string) {
    if (!input.options || input.options.length < 2) {
      throw new AppError("A poll needs at least two options.", 400);
    }
    return withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO polls (type, title, description, starts_at, ends_at, hide_results, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          input.type,
          input.title,
          input.description ?? null,
          input.startsAt ?? new Date().toISOString(),
          input.endsAt ?? null,
          input.hideResults ?? false,
          input.status ?? "ACTIVE",
          createdBy,
        ],
      );
      const poll = mapPollRow(inserted.rows[0] as Record<string, unknown>);
      for (let i = 0; i < input.options.length; i++) {
        const option = input.options[i];
        if (!option) continue;
        await client.query(
          `INSERT INTO poll_options (poll_id, label, book_id, image_url, sort_order)
           VALUES ($1,$2,$3,$4,$5)`,
          [poll.id, option.label, option.bookId ?? null, option.imageUrl ?? null, i],
        );
      }
      return poll;
    });
  },

  async getById(id: string) {
    const result = await db.query("SELECT * FROM polls WHERE id = $1", [id]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Poll not found", 404);
    return mapPollRow(row);
  },

  async listActive() {
    const result = await db.query(
      `SELECT * FROM polls
       WHERE status = 'ACTIVE' AND (ends_at IS NULL OR ends_at > now())
       ORDER BY created_at DESC`,
    );
    return result.rows.map((row: Record<string, unknown>) => mapPollRow(row));
  },

  async getOptions(pollId: string) {
    const result = await db.query(
      `SELECT po.*, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover_url
       FROM poll_options po
       LEFT JOIN books b ON b.id = po.book_id
       WHERE po.poll_id = $1
       ORDER BY po.sort_order ASC`,
      [pollId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      pollId: String(row.poll_id),
      label: String(row.label),
      bookId: row.book_id ? String(row.book_id) : null,
      bookTitle: row.book_title ? String(row.book_title) : null,
      bookAuthor: row.book_author ? String(row.book_author) : null,
      bookCoverUrl: row.book_cover_url ? String(row.book_cover_url) : null,
      imageUrl: row.image_url ? String(row.image_url) : null,
      sortOrder: Number(row.sort_order),
    }));
  },

  async getResults(pollId: string, currentUserId: string) {
    const poll = await this.getById(pollId);
    const options = await this.getOptions(pollId);

    const votes = await db.query(
      `SELECT option_id, COUNT(*)::int AS count
       FROM poll_votes WHERE poll_id = $1
       GROUP BY option_id`,
      [pollId],
    );
    const voteMap = new Map(
      votes.rows.map((row: Record<string, unknown>) => [String(row.option_id), Number(row.count)]),
    );

    const myVote = await db.query(
      `SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2`,
      [pollId, currentUserId],
    );

    const total = options.reduce((sum, o) => sum + (voteMap.get(o.id) ?? 0), 0);
    const status = effectiveStatus(poll);

    // If results are hidden and the poll is still open, only the voter sees their own selection.
    const showResults = !poll.hideResults || status === "CLOSED";

    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      type: poll.type,
      status,
      endsAt: poll.endsAt,
      hideResults: poll.hideResults,
      showResults,
      totalVotes: showResults ? total : 0,
      myVoteId: myVote.rows[0] ? String((myVote.rows[0] as { option_id: string }).option_id) : null,
      options: options.map((o) => {
        const count = voteMap.get(o.id) ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return {
          ...o,
          count: showResults ? count : 0,
          percentage: showResults ? pct : 0,
        };
      }),
    };
  },

  async vote(pollId: string, optionId: string, userId: string) {
    const poll = await this.getById(pollId);
    const status = effectiveStatus(poll);
    if (status === "CLOSED") throw new AppError("This poll has closed.", 400);
    if (status === "DRAFT") throw new AppError("This poll is not open for voting.", 400);

    const option = await db.query(`SELECT 1 FROM poll_options WHERE id = $1 AND poll_id = $2`, [
      optionId,
      pollId,
    ]);
    if (!option.rowCount || option.rowCount === 0) {
      throw new AppError("That option does not belong to this poll.", 400);
    }

    const inserted = await db.query(
      `INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1,$2,$3)
       ON CONFLICT (poll_id, user_id) DO NOTHING
       RETURNING id`,
      [pollId, optionId, userId],
    );
    if (!inserted.rowCount)
      throw new AppError("You've already voted in this poll.", 409, "ALREADY_VOTED");
    return { voted: true, optionId };
  },
};
