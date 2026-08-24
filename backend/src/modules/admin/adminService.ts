import { db } from "../../db/db";
import { sendEmail } from "../../integrations/email";
import { AppError } from "../../lib/errors";
import { clubBooksService } from "../club-books/clubBooksService";

type Row = Record<string, unknown>;
export type BroadcastAudience = "MEMBERS" | "SUBSCRIBERS" | "ALL";

function isoDate(value: unknown): string {
  return new Date(String(value)).toISOString();
}

export const adminService = {
  async overview() {
    const [membersResult, subscribersResult, booksResult, eventsResult, currentBook] =
      await Promise.all([
        db.query(
          `SELECT id, email, first_name, last_name, role, email_verified, approved, region, created_at
           FROM users ORDER BY created_at DESC LIMIT 250`,
        ),
        db.query(
          `SELECT id, email, subscribed, created_at
           FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 250`,
        ),
        db.query(
          `SELECT id, title, author, cover_url, created_at
           FROM books ORDER BY created_at DESC LIMIT 100`,
        ),
        db.query(
          `SELECT id, title, event_date, start_time, venue_name, capacity, status
           FROM events ORDER BY event_date DESC, start_time DESC LIMIT 100`,
        ),
        clubBooksService.getCurrent().catch(() => null),
      ]);

    const members = (membersResult.rows as Row[]).map((row) => ({
      id: String(row.id),
      email: String(row.email),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      role: String(row.role),
      emailVerified: Boolean(row.email_verified),
      approved: Boolean(row.approved),
      region: row.region ? String(row.region) : null,
      createdAt: isoDate(row.created_at),
    }));

    const subscribers = (subscribersResult.rows as Row[]).map((row) => ({
      id: String(row.id),
      email: String(row.email),
      subscribed: Boolean(row.subscribed),
      createdAt: isoDate(row.created_at),
    }));

    const books = (booksResult.rows as Row[]).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      author: row.author ? String(row.author) : null,
      coverUrl: row.cover_url ? String(row.cover_url) : null,
      createdAt: isoDate(row.created_at),
    }));

    const events = (eventsResult.rows as Row[]).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      eventDate: String(row.event_date),
      startTime: String(row.start_time),
      venueName: String(row.venue_name),
      capacity: Number(row.capacity),
      status: String(row.status),
    }));

    return {
      members,
      subscribers,
      books,
      events,
      currentBook,
      stats: {
        members: members.length,
        approvedMembers: members.filter((member) => member.approved).length,
        subscribers: subscribers.filter((subscriber) => subscriber.subscribed).length,
        books: books.length,
        events: events.length,
      },
    };
  },

  async updateMember(
    id: string,
    input: { approved?: boolean; role?: "ADMIN" | "MEMBER" },
    actorId?: string,
  ) {
    if (actorId === id && (input.approved === false || input.role === "MEMBER")) {
      throw new AppError("You cannot remove your own administrator access.", 400);
    }
    const result = await db.query(
      `UPDATE users SET
         approved = COALESCE($1, approved),
         role = COALESCE($2::user_role, role),
         updated_at = now()
       WHERE id = $3
       RETURNING id, email, first_name, last_name, role, email_verified, approved, region, created_at`,
      [input.approved ?? null, input.role ?? null, id],
    );
    const row = result.rows[0] as Row | undefined;
    if (!row) throw new AppError("Member not found.", 404);
    return {
      id: String(row.id),
      email: String(row.email),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      role: String(row.role),
      emailVerified: Boolean(row.email_verified),
      approved: Boolean(row.approved),
      region: row.region ? String(row.region) : null,
      createdAt: isoDate(row.created_at),
    };
  },

  async subscribe(email: string) {
    const normalized = email.trim().toLowerCase();
    await db.query(
      `INSERT INTO newsletter_subscribers (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET subscribed = true, updated_at = now()`,
      [normalized],
    );
    return { message: "You're on the list. Look out for our next letter." };
  },

  async broadcast(input: { audience: BroadcastAudience; subject: string; body: string }) {
    const result = await db.query(
      `SELECT email FROM users WHERE approved = true AND email_verified = true
       AND $1 IN ('MEMBERS', 'ALL')
       UNION
       SELECT email FROM newsletter_subscribers WHERE subscribed = true
       AND $1 IN ('SUBSCRIBERS', 'ALL')`,
      [input.audience],
    );
    const recipients = (result.rows as Row[]).map((row) => String(row.email));
    let sent = 0;
    let failed = 0;

    for (const email of recipients) {
      try {
        await sendEmail({
          to: email,
          subject: input.subject,
          text: input.body,
          html: `<div style="white-space:pre-wrap">${input.body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</div>`,
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error(`[admin:broadcast] delivery failed for ${email}`, error);
      }
    }

    return { audience: input.audience, recipients: recipients.length, sent, failed };
  },
};
