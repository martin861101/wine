import { db, withTransaction } from "../../db/db";
import { AppError } from "../../lib/errors";

export type RsvpStatus = "ATTENDING" | "MAYBE" | "DECLINED" | "WAITLIST";

export interface EventInput {
  title: string;
  description?: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  venueName: string;
  venueAddress?: string;
  theme?: string;
  coverImage?: string;
  capacity: number;
  contributionAmount?: number;
  rsvpDeadline?: string;
  paymentDeadline?: string;
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED";
}

function mapEventRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    eventDate: row.event_date ? String(row.event_date) : "",
    startTime: String(row.start_time),
    endTime: row.end_time ? String(row.end_time) : null,
    venueName: String(row.venue_name),
    venueAddress: row.venue_address ? String(row.venue_address) : null,
    theme: row.theme ? String(row.theme) : null,
    coverImage: row.cover_image ? String(row.cover_image) : null,
    capacity: Number(row.capacity),
    contributionAmount: row.contribution_amount ? Number(row.contribution_amount) : null,
    rsvpDeadline: row.rsvp_deadline ? String(row.rsvp_deadline) : null,
    paymentDeadline: row.payment_deadline ? String(row.payment_deadline) : null,
    status: String(row.status),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export const eventsService = {
  async create(input: EventInput): Promise<ReturnType<typeof mapEventRow>> {
    const result = await db.query(
      `INSERT INTO events (
         title, description, event_date, start_time, end_time, venue_name, venue_address,
         theme, cover_image, capacity, contribution_amount, rsvp_deadline, payment_deadline, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        input.title,
        input.description ?? null,
        input.eventDate,
        input.startTime,
        input.endTime ?? null,
        input.venueName,
        input.venueAddress ?? null,
        input.theme ?? null,
        input.coverImage ?? null,
        input.capacity,
        input.contributionAmount ?? null,
        input.rsvpDeadline ?? null,
        input.paymentDeadline ?? null,
        input.status ?? "PUBLISHED",
      ],
    );
    return mapEventRow(result.rows[0] as Record<string, unknown>);
  },

  async update(id: string, input: Partial<EventInput>): Promise<ReturnType<typeof mapEventRow>> {
    const current = await db.query("SELECT * FROM events WHERE id = $1", [id]);
    const existing = current.rows[0] as Record<string, unknown> | undefined;
    if (!existing) throw new AppError("Event not found", 404);

    const result = await db.query(
      `UPDATE events SET
         title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5,
         venue_name = $6, venue_address = $7, theme = $8, cover_image = $9, capacity = $10,
         contribution_amount = $11, rsvp_deadline = $12, payment_deadline = $13, status = $14,
         updated_at = now()
       WHERE id = $15 RETURNING *`,
      [
        input.title ?? existing.title,
        input.description ?? existing.description,
        input.eventDate ?? existing.event_date,
        input.startTime ?? existing.start_time,
        input.endTime ?? existing.end_time,
        input.venueName ?? existing.venue_name,
        input.venueAddress ?? existing.venue_address,
        input.theme ?? existing.theme,
        input.coverImage ?? existing.cover_image,
        input.capacity ?? existing.capacity,
        input.contributionAmount ?? existing.contribution_amount,
        input.rsvpDeadline ?? existing.rsvp_deadline,
        input.paymentDeadline ?? existing.payment_deadline,
        input.status ?? existing.status,
        id,
      ],
    );
    return mapEventRow(result.rows[0] as Record<string, unknown>);
  },

  async remove(id: string): Promise<void> {
    const result = await db.query("DELETE FROM events WHERE id = $1 RETURNING id", [id]);
    if (!result.rowCount || result.rowCount === 0) throw new AppError("Event not found", 404);
  },

  async getById(id: string) {
    const result = await db.query("SELECT * FROM events WHERE id = $1", [id]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Event not found", 404);
    return mapEventRow(row);
  },

  async list(opts?: { includePast?: boolean }) {
    const result = await db.query(
      `SELECT * FROM events
       WHERE status = 'PUBLISHED' AND (event_date >= CURRENT_DATE OR $1 = true)
       ORDER BY event_date ASC`,
      [opts?.includePast ?? false],
    );
    return result.rows.map((row: Record<string, unknown>) => mapEventRow(row));
  },

  async upcoming() {
    const result = await db.query(
      `SELECT * FROM events
       WHERE status = 'PUBLISHED' AND event_date >= CURRENT_DATE
       ORDER BY event_date ASC, start_time ASC
       LIMIT 1`,
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? mapEventRow(row) : null;
  },

  async getWithStats(id: string, currentUserId?: string) {
    const event = await this.getById(id);
    const rsvps = await rsvpService.countForEvent(id);
    const attending = await rsvpService.countStatus(id, "ATTENDING");
    const myRsvp = currentUserId ? await rsvpService.getForUser(id, currentUserId) : null;
    return {
      ...event,
      rsvpCount: rsvps.total,
      attendingCount: attending,
      capacityRemaining: Math.max(0, event.capacity - rsvps.attending),
      myRsvp: myRsvp ? { status: myRsvp.status, guestCount: myRsvp.guest_count } : null,
    };
  },
};

export const rsvpService = {
  async getForUser(eventId: string, userId: string) {
    const result = await db.query(
      `SELECT * FROM event_rsvps WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId],
    );
    return result.rows[0] as Record<string, unknown> | undefined;
  },

  async countForEvent(eventId: string) {
    const result = await db.query(
      `SELECT
         COUNT(*)::int AS total,
         COALESCE(SUM(CASE WHEN status = 'ATTENDING' THEN guest_count ELSE 0 END), 0)::int AS attending
       FROM event_rsvps WHERE event_id = $1`,
      [eventId],
    );
    return result.rows[0] as { total: number; attending: number };
  },

  async countStatus(eventId: string, status: string) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM event_rsvps WHERE event_id = $1 AND status = $2`,
      [eventId, status],
    );
    return Number((result.rows[0] as { count?: number }).count ?? 0);
  },

  async rsvp(eventId: string, userId: string, status: RsvpStatus, guestCount = 1) {
    if (guestCount < 1) throw new AppError("Guest count must be at least 1.", 400);

    const event = await eventsService.getById(eventId);
    if (event.status !== "PUBLISHED") throw new AppError("This event is not open for RSVP.", 400);
    if (event.rsvpDeadline && new Date(event.rsvpDeadline) < new Date()) {
      throw new AppError("The RSVP deadline for this event has passed.", 400);
    }

    const existing = await this.getForUser(eventId, userId);

    if (status === "DECLINED" || status === "MAYBE") {
      await db.query(
        `INSERT INTO event_rsvps (event_id, user_id, status, guest_count)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (event_id, user_id)
         DO UPDATE SET status = EXCLUDED.status, guest_count = EXCLUDED.guest_count, updated_at = now()`,
        [eventId, userId, status, guestCount],
      );
      return { status };
    }

    // Capacity enforcement must be atomic to avoid overbooking.
    return withTransaction(async (client) => {
      const lock = await client.query("SELECT capacity FROM events WHERE id = $1 FOR UPDATE", [
        eventId,
      ]);
      const capacity = Number((lock.rows[0] as { capacity?: number }).capacity ?? 0);

      const totals = await client.query(
        `SELECT COALESCE(SUM(guest_count), 0)::int AS attending
         FROM event_rsvps WHERE event_id = $1 AND status = 'ATTENDING'`,
        [eventId],
      );
      let attending = Number((totals.rows[0] as { attending?: number }).attending ?? 0);

      if (existing && String(existing.status) === "ATTENDING") {
        attending -= Number(existing.guest_count ?? 0);
      }
      if (attending + guestCount > capacity) {
        throw new AppError("Sorry — this event has reached capacity.", 409, "EVENT_FULL");
      }

      const inserted = await client.query(
        `INSERT INTO event_rsvps (event_id, user_id, status, guest_count)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (event_id, user_id)
         DO UPDATE SET status = EXCLUDED.status, guest_count = EXCLUDED.guest_count, updated_at = now()
         RETURNING status`,
        [eventId, userId, status, guestCount],
      );
      return { status: String((inserted.rows[0] as { status: string }).status) };
    });
  },

  async remove(eventId: string, userId: string): Promise<void> {
    await db.query(`DELETE FROM event_rsvps WHERE event_id = $1 AND user_id = $2`, [
      eventId,
      userId,
    ]);
  },

  async attendees(eventId: string) {
    const result = await db.query(
      `SELECT r.status, r.guest_count, u.id, u.first_name, u.last_name,
              p.avatar_url, p.display_name
       FROM event_rsvps r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE r.event_id = $1 AND r.status = 'ATTENDING'
       ORDER BY r.created_at ASC`,
      [eventId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      userId: String(row.id),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      displayName: row.display_name ? String(row.display_name) : null,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      status: String(row.status),
      guestCount: Number(row.guest_count),
    }));
  },
};
